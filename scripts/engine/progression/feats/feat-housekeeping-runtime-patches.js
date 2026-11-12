import { FeatStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js';
import { TalentStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js';
import { FeatSlotValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-slot-validator.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { FeatRulesAdapter } from '/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js';
import { FeatRegistry as CompendiumFeatRegistry } from '/systems/foundryvtt-swse/scripts/registries/feat-registry.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';
import { HOUSE_RULE_GRANTS, isFeatTalentRuleKey, isGrantEnabled } from '/systems/foundryvtt-swse/scripts/houserules/house-rule-grant-table.js';
import { HouseRuleFeatGrants } from '/systems/foundryvtt-swse/scripts/houserules/houserule-feat-grants.js';
import { invalidateReconciliationForRuleChange } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js';

const PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.v1');
const TALENT_PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.talent.v1');
const ABILITY_PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.ability.v1');
const HOOK_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.hooks.v1');
const MATERIALIZE_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.materialize.v1');

// One canonical table (house-rule-grant-table.js); this file no longer keeps its own copy.
const HOUSERULE_FEAT_GRANTS = HOUSE_RULE_GRANTS.filter(g => g.type === 'feat');
const HOUSERULE_TALENT_GRANTS = HOUSE_RULE_GRANTS.filter(g => g.type === 'talent');
const HOUSERULE_GRANTS = HOUSE_RULE_GRANTS;

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

function normalizeIdentityKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function namesMatch(a, b) {
  const left = normalizeFeatName(a);
  const right = normalizeFeatName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const stripScope = (value) => value.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  return stripScope(left) === stripScope(right);
}

function isHouseruleGrantEnabled(setting) {
  return isGrantEnabled(setting);
}

export function getHouseruleGrantedFeatNames() {
  return HOUSERULE_FEAT_GRANTS
    .filter(({ setting }) => isHouseruleGrantEnabled(setting))
    .map(({ name }) => name);
}

export function getHouseruleGrantedTalentNames() {
  return HOUSERULE_TALENT_GRANTS
    .filter(({ setting }) => isHouseruleGrantEnabled(setting))
    .map(({ name }) => name);
}

function buildHouseruleGrantedFeatEntries() {
  return getHouseruleGrantedFeatNames().map(name => ({
    name,
    type: 'feat',
    source: 'house-rule',
    grantedBy: 'house-rule',
    system: {
      sourceType: 'house-rule',
      grantedBy: 'house-rule',
      ignorePrerequisites: true,
      houseRuleGranted: true,
    },
    flags: {
      swse: {
        houseRuleGranted: true,
        ignorePrerequisites: true,
      },
    },
  }));
}

function buildHouseruleGrantedTalentEntries() {
  return getHouseruleGrantedTalentNames().map(name => ({
    name,
    type: 'talent',
    source: 'house-rule',
    grantedBy: 'house-rule',
    system: {
      sourceType: 'house-rule',
      grantedBy: 'house-rule',
      ignorePrerequisites: true,
      houseRuleGranted: true,
    },
    flags: {
      swse: {
        houseRuleGranted: true,
        ignorePrerequisites: true,
      },
    },
  }));
}

function mergeHouseruleGrantedFeatsIntoPending(pending = {}) {
  const grants = buildHouseruleGrantedFeatEntries();
  if (!grants.length) return pending || {};

  const out = { ...(pending || {}) };
  const grantedFeats = Array.isArray(out.grantedFeats) ? [...out.grantedFeats] : [];
  const seen = new Set(grantedFeats.map(entry => normalizeFeatName(entry?.name || entry)).filter(Boolean));

  for (const grant of grants) {
    const key = normalizeFeatName(grant.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    grantedFeats.push(grant);
  }

  const existingHouseRuleNames = Array.isArray(out.houseRuleGrantedFeats) ? out.houseRuleGrantedFeats : [];
  const houseRuleGrantedFeats = Array.from(new Set([
    ...existingHouseRuleNames,
    ...grants.map(grant => grant.name),
  ].filter(Boolean)));

  return {
    ...out,
    grantedFeats,
    houseRuleGrantedFeats,
  };
}

function mergeHouseruleGrantedTalentsIntoPending(pending = {}) {
  const grants = buildHouseruleGrantedTalentEntries();
  if (!grants.length) return pending || {};

  const out = { ...(pending || {}) };
  const grantedTalents = Array.isArray(out.grantedTalents) ? [...out.grantedTalents] : [];
  const selectedTalents = Array.isArray(out.selectedTalents) ? [...out.selectedTalents] : [];
  const seen = new Set([
    ...grantedTalents,
    ...selectedTalents,
  ].map(entry => normalizeFeatName(entry?.name || entry)).filter(Boolean));

  for (const grant of grants) {
    const key = normalizeFeatName(grant.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    grantedTalents.push(grant);
    selectedTalents.push(grant);
  }

  const existingHouseRuleNames = Array.isArray(out.houseRuleGrantedTalents) ? out.houseRuleGrantedTalents : [];
  const houseRuleGrantedTalents = Array.from(new Set([
    ...existingHouseRuleNames,
    ...grants.map(grant => grant.name),
  ].filter(Boolean)));

  return {
    ...out,
    grantedTalents,
    selectedTalents,
    houseRuleGrantedTalents,
  };
}

function mergeHouseruleGrantsIntoPending(pending = {}) {
  return mergeHouseruleGrantedTalentsIntoPending(mergeHouseruleGrantedFeatsIntoPending(pending));
}

function actorHasHouseruleGrantedFeat(requiredName) {
  return getHouseruleGrantedFeatNames().some(name => namesMatch(name, requiredName));
}

function actorHasHouseruleGrantedTalent(requiredName) {
  return getHouseruleGrantedTalentNames().some(name => namesMatch(name, requiredName));
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

function getFeatStableId(feat) {
  return String(feat?._id || feat?.id || feat?.name || '');
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

function applyHouseruleGrantStatus(step, legal = []) {
  const grantedIds = new Set();

  for (const feat of step?._allFeats || []) {
    if (!actorHasHouseruleGrantedFeat(feat?.name)) continue;
    const featId = getFeatStableId(feat);
    grantedIds.add(featId);
    feat.isOwned = true;
    feat.isGranted = true;
    feat.isAvailable = false;
    feat.unavailabilityReason = 'Granted by house rule.';
    feat.blockingReasons = [];
    feat.missingPrerequisites = [];
    if (step?._availabilityByFeatId && featId) {
      const previous = step._availabilityByFeatId.get(featId) || {};
      step._availabilityByFeatId.set(featId, {
        ...previous,
        isOwned: true,
        isGranted: true,
        isAvailable: false,
        unavailabilityReason: 'Granted by house rule.',
        blockingReasons: [],
        missingPrerequisites: [],
      });
    }
  }

  if (!grantedIds.size) return legal;
  return (legal || []).filter(feat => !grantedIds.has(getFeatStableId(feat)));
}

function patchRepeatableFeatSelectionUi() {
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

  const originalBuildPendingAbilityData = proto._buildPendingAbilityData;
  proto._buildPendingAbilityData = function patchedBuildPendingAbilityData(shell) {
    const pending = typeof originalBuildPendingAbilityData === 'function'
      ? originalBuildPendingAbilityData.call(this, shell)
      : {};
    return mergeHouseruleGrantsIntoPending(pending);
  };

  const originalGetLegalFeats = proto._getLegalFeats;
  proto._getLegalFeats = async function patchedGetLegalFeats(actor, shell) {
    let legal = typeof originalGetLegalFeats === 'function'
      ? await originalGetLegalFeats.call(this, actor, shell)
      : [];

    legal = applyHouseruleGrantStatus(this, legal);

    const required = getRequiredFeatCount(this, shell);
    const currentSelections = getCurrentSlotSelections(this, shell);
    if (required <= 1 || currentSelections.length >= required) return legal;

    const legalIds = new Set((legal || []).map(getFeatStableId));
    const currentNames = currentSelections.map(entry => entry?.name || entry?.id || entry?._id || entry).filter(Boolean);

    for (const feat of this._allFeats || []) {
      const featId = getFeatStableId(feat);
      if (!featId || legalIds.has(featId)) continue;
      if (actorHasHouseruleGrantedFeat(feat?.name)) continue;
      if (typeof this._isRepeatable !== 'function' || !this._isRepeatable(feat?.name)) continue;
      if (!currentNames.some(name => namesMatch(name, feat?.name))) continue;

      const slotValidation = await FeatSlotValidator.validateFeatForSlot(
        feat,
        { slotType: this._slotType, classId: this._classId, classLookupKeys: this._getCurrentClassLookupKeys?.(shell) || [] },
        actor,
        { quiet: true }
      );
      if (!slotValidation?.valid) continue;

      const status = {
        ...(this._availabilityByFeatId?.get(featId) || {}),
        isAvailable: true,
        isRepeatable: true,
        isOwned: false,
        isGranted: false,
        unavailabilityReason: '',
        blockingReasons: [],
        missingPrerequisites: [],
        slotCompatible: true,
      };
      Object.assign(feat, status);
      this._availabilityByFeatId?.set(featId, status);
      legal.push(feat);
      legalIds.add(featId);
    }

    return legal;
  };

  proto[PATCH_FLAG] = true;
}

function patchHouseruleTalentProgressionOwnership() {
  if (!TalentStep?.prototype || TalentStep.prototype[TALENT_PATCH_FLAG]) return;
  const proto = TalentStep.prototype;

  const originalBuildPendingAbilityData = proto._buildPendingAbilityData;
  proto._buildPendingAbilityData = function patchedTalentPendingAbilityData(shell) {
    const pending = typeof originalBuildPendingAbilityData === 'function'
      ? originalBuildPendingAbilityData.call(this, shell)
      : {};
    return mergeHouseruleGrantsIntoPending(pending);
  };

  const originalGetOwnedTalentKeys = proto._getOwnedTalentKeys;
  proto._getOwnedTalentKeys = function patchedGetOwnedTalentKeys(actor) {
    const keys = new Set(
      typeof originalGetOwnedTalentKeys === 'function'
        ? Array.from(originalGetOwnedTalentKeys.call(this, actor) || [])
        : []
    );

    for (const name of getHouseruleGrantedTalentNames()) {
      const normalized = typeof this?._normalizeTalentKey === 'function'
        ? this._normalizeTalentKey(name)
        : normalizeIdentityKey(name);
      if (normalized) keys.add(normalized);
      const lookup = typeof this?._normalizeTalentLookupKey === 'function'
        ? this._normalizeTalentLookupKey(name)
        : normalizeIdentityKey(name).replace(/-/g, '_');
      if (lookup) keys.add(lookup);
    }

    return keys;
  };

  const originalGetTreeInvestmentCount = proto._getTreeInvestmentCount;
  proto._getTreeInvestmentCount = function patchedGetTreeInvestmentCount(tree, committedTalents = [], actor = null) {
    let count = typeof originalGetTreeInvestmentCount === 'function'
      ? Number(originalGetTreeInvestmentCount.call(this, tree, committedTalents, actor) || 0)
      : 0;

    const treeName = String(tree?.name || tree?.id || '').toLowerCase();
    if (treeName.includes('armor') && actorHasHouseruleGrantedTalent('Armored Defense')) count += 1;
    return count;
  };

  proto[TALENT_PATCH_FLAG] = true;
}

function patchHouseruleFeatOwnership() {
  if (!PrerequisiteChecker || PrerequisiteChecker[PATCH_FLAG]) return;

  const originalActorHasNamedItem = PrerequisiteChecker._actorHasNamedItem;
  PrerequisiteChecker._actorHasNamedItem = function patchedActorHasNamedItem(actor, pending, itemType, requiredName) {
    if (itemType === 'feat' && actorHasHouseruleGrantedFeat(requiredName)) return true;
    if (itemType === 'talent' && actorHasHouseruleGrantedTalent(requiredName)) return true;
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

  const originalCheckTalentOwnership = PrerequisiteChecker.checkTalentOwnership;
  PrerequisiteChecker.checkTalentOwnership = function patchedCheckTalentOwnership(actor, slugOrUuid) {
    if (actorHasHouseruleGrantedTalent(slugOrUuid)) return true;
    return typeof originalCheckTalentOwnership === 'function'
      ? originalCheckTalentOwnership.call(this, actor, slugOrUuid)
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

  const originalGetHouseruleGrantedTalents = PrerequisiteChecker.getHouseruleGrantedTalents;
  PrerequisiteChecker.getHouseruleGrantedTalents = function patchedGetHouseruleGrantedTalents() {
    const existing = typeof originalGetHouseruleGrantedTalents === 'function'
      ? originalGetHouseruleGrantedTalents.call(this)
      : [];
    const merged = new Set([...(existing || []), ...getHouseruleGrantedTalentNames()]);
    return Array.from(merged);
  };

  PrerequisiteChecker[PATCH_FLAG] = true;
}

function patchHouseruleFeatPendingForAbilityEngine() {
  if (!AbilityEngine || AbilityEngine[ABILITY_PATCH_FLAG]) return;

  const originalEvaluateAcquisition = AbilityEngine.evaluateAcquisition;
  AbilityEngine.evaluateAcquisition = function patchedEvaluateAcquisition(actor, candidate, pending = {}) {
    const augmentedPending = mergeHouseruleGrantsIntoPending(pending);
    return typeof originalEvaluateAcquisition === 'function'
      ? originalEvaluateAcquisition.call(this, actor, candidate, augmentedPending)
      : {
          legal: false,
          eligible: false,
          permanentlyBlocked: true,
          missingPrereqs: ['Evaluation unavailable'],
          missing: ['Evaluation unavailable'],
          blockingReasons: ['AbilityEngine.evaluateAcquisition is unavailable'],
          reasons: ['AbilityEngine.evaluateAcquisition is unavailable'],
          unresolved: [],
          advisory: [],
          warnings: [],
          evaluation: {},
        };
  };

  AbilityEngine[ABILITY_PATCH_FLAG] = true;
}

/**
 * World-load pass only. Granting itself (new actor, rule switched on, replacement offers, provenance) is owned by
 * HouseRuleFeatGrants; this file previously ran a SECOND materializer that raced it (and could trigger a spurious
 * "you already own it" replacement dialog). Silent: never offers replacements.
 */
function registerHouseRuleGrantMaterialization() {
  if (globalThis[MATERIALIZE_FLAG]) return;
  globalThis[MATERIALIZE_FLAG] = true;

  Hooks.once('ready', async () => {
    if (!game?.user?.isGM) return;
    for (const actor of game.actors || []) {
      if (actor.type !== 'character') continue;
      await HouseRuleFeatGrants.reconcileActorGrants(actor).catch(err => {
        console.warn('SWSE | House-rule grant pass failed', actor?.name, err);
      });
    }
  });
}

function registerHouseRuleCacheInvalidation() {
  if (globalThis[HOOK_FLAG]) return;
  globalThis[HOOK_FLAG] = true;
  const onChange = (key) => {
    if (HOUSERULE_GRANT_SETTINGS.has(key)) AbilityEngine.clearAcquisitionCache?.();
    // Any feat/talent house rule can change entitlements: drop reconciliation reports and refresh open sheets.
    if (isFeatTalentRuleKey(key)) invalidateReconciliationForRuleChange();
  };
  Hooks.on('swse:houserule-changed', (key) => onChange(key));
  Hooks.on('updateSetting', (setting) => onChange(String(setting?.key || '').split('.').pop()));
}

export function registerFeatHousekeepingRuntimePatches() {
  patchHouseruleFeatOwnership();
  patchHouseruleFeatPendingForAbilityEngine();
  patchRepeatableFeatSelectionUi();
  patchHouseruleTalentProgressionOwnership();
  registerHouseRuleGrantMaterialization();
  registerHouseRuleCacheInvalidation();
}
