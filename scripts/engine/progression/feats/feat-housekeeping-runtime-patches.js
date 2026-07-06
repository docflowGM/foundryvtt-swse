import { FeatStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js';
import { FeatSlotValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-slot-validator.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

const PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.v1');

function normalizeFeatName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function featNamesMatch(a, b) {
  const left = normalizeFeatName(a);
  const right = normalizeFeatName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const stripScope = (value) => value.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  return stripScope(left) === stripScope(right);
}

export function getHouseruleGrantedFeatNames() {
  const grants = [
    { setting: 'weaponFinesseDefault', name: 'Weapon Finesse' },
    { setting: 'pointBlankShotDefault', name: 'Point Blank Shot' },
    { setting: 'powerAttackDefault', name: 'Power Attack' },
    { setting: 'preciseShotDefault', name: 'Precise Shot' },
    { setting: 'dodgeDefault', name: 'Dodge' },
    { setting: 'armoredDefenseForAll', name: 'Armored Defense' },
  ];

  return grants
    .filter(({ setting }) => HouseRuleService.isEnabled(setting))
    .map(({ name }) => name);
}

function actorHasHouseruleGrantedFeat(requiredName) {
  return getHouseruleGrantedFeatNames().some(name => featNamesMatch(name, requiredName));
}

function getRequiredFeatCount(step, shell = null) {
  try {
    if (typeof step?._getRequiredFeatCount === 'function') return Math.max(0, Number(step._getRequiredFeatCount(shell) || 0));
  } catch (_err) {
    // fall through
  }
  return Math.max(0, Number(step?._requiredFeatCount || 0));
}

function getCurrentSlotSelections(step, shell = null) {
  try {
    if (shell && typeof step?._getCommittedFeatsForSlot === 'function') return step._getCommittedFeatsForSlot(shell) || [];
  } catch (_err) {
    // fall through
  }
  return Array.isArray(step?._selectedFeatIds) ? step._selectedFeatIds : [];
}

function hasRemainingRepeatableSlot(step, featOrId = null, shell = null) {
  const required = getRequiredFeatCount(step, shell);
  if (required <= 1) return false;
  const currentSelections = getCurrentSlotSelections(step, shell);
  if (currentSelections.length >= required) return false;

  const feat = typeof featOrId === 'object'
    ? featOrId
    : (typeof step?._getFeat === 'function' ? step._getFeat(featOrId) : null);
  if (!feat) return false;
  return typeof step?._isRepeatable === 'function' && step._isRepeatable(feat?.name || featOrId);
}

async function patchRepeatableFeatSelectionUi() {
  if (!FeatStep?.prototype || FeatStep.prototype[PATCH_FLAG]) return;
  const proto = FeatStep.prototype;

  const originalIsFeatSelected = proto._isFeatSelected;
  proto._isFeatSelected = function patchedIsFeatSelected(featOrId) {
    const originalResult = typeof originalIsFeatSelected === 'function'
      ? originalIsFeatSelected.call(this, featOrId)
      : false;
    if (!originalResult) return false;
    if (hasRemainingRepeatableSlot(this, featOrId)) return false;
    return true;
  };

  const originalGetLegalFeats = proto._getLegalFeats;
  proto._getLegalFeats = async function patchedGetLegalFeats(actor, shell) {
    const legal = typeof originalGetLegalFeats === 'function'
      ? await originalGetLegalFeats.call(this, actor, shell)
      : [];

    const required = getRequiredFeatCount(this, shell);
    const currentSelections = getCurrentSlotSelections(this, shell);
    if (required <= 1 || currentSelections.length >= required) return legal;

    const legalIds = new Set((legal || []).map(feat => String(feat?._id || feat?.id || feat?.name || '')));
    const currentNames = currentSelections.map(entry => entry?.name || entry?.id || entry?._id || entry).filter(Boolean);

    for (const feat of this._allFeats || []) {
      const featId = String(feat?._id || feat?.id || feat?.name || '');
      if (!featId || legalIds.has(featId)) continue;
      if (typeof this._isRepeatable !== 'function' || !this._isRepeatable(feat?.name)) continue;
      if (!currentNames.some(name => featNamesMatch(name, feat?.name))) continue;

      const slotValidation = await FeatSlotValidator.validateFeatForSlot(
        feat,
        { slotType: this._slotType, classId: this._classId, classLookupKeys: this._getCurrentClassLookupKeys?.(shell) || [] },
        actor,
        { quiet: true }
      );
      if (!slotValidation?.valid) continue;

      feat.isAvailable = true;
      feat.isRepeatable = true;
      feat.unavailabilityReason = '';
      feat.blockingReasons = [];
      feat.missingPrerequisites = [];
      legal.push(feat);
      legalIds.add(featId);
    }

    return legal;
  };

  proto[PATCH_FLAG] = true;
}

function patchHouseruleFeatOwnership() {
  if (!PrerequisiteChecker || PrerequisiteChecker[PATCH_FLAG]) return;

  const originalActorHasNamedItem = PrerequisiteChecker._actorHasNamedItem;
  PrerequisiteChecker._actorHasNamedItem = function patchedActorHasNamedItem(actor, pending, itemType, requiredName) {
    if (itemType === 'feat' && actorHasHouseruleGrantedFeat(requiredName)) return true;
    return typeof originalActorHasNamedItem === 'function'
      ? originalActorHasNamedItem.call(this, actor, pending, itemType, requiredName)
      : false;
  };

  const originalCheckFeatOwnership = PrerequisiteChecker.checkFeatOwnership;
  PrerequisiteChecker.checkFeatOwnership = function patchedCheckFeatOwnership(actor, slugOrUuid) {
    if (actorHasHouseruleGrantedFeat(slugOrUuid)) return true;
    return typeof originalCheckFeatOwnership === 'function'
      ? originalCheckFeatOwnership.call(this, actor, slugOrUuid)
      : false;
  };

  const originalGetHouseruleGrantedFeats = PrerequisiteChecker.getHouseruleGrantedFeats;
  PrerequisiteChecker.getHouseruleGrantedFeats = function patchedGetHouseruleGrantedFeats() {
    const existing = typeof originalGetHouseruleGrantedFeats === 'function'
      ? originalGetHouseruleGrantedFeats.call(this)
      : [];
    const merged = new Set([...(existing || []), ...getHouseruleGrantedFeatNames()]);
    return Array.from(merged);
  };

  PrerequisiteChecker[PATCH_FLAG] = true;
}

export function registerFeatHousekeepingRuntimePatches() {
  patchHouseruleFeatOwnership();
  patchRepeatableFeatSelectionUi();
}
