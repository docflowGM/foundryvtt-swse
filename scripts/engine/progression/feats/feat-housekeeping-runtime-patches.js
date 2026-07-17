import { FeatStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js';
import { TalentStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js';
import { FeatSlotValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-slot-validator.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { FeatRulesAdapter } from '/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js';
import { FeatRegistry as CompendiumFeatRegistry } from '/systems/foundryvtt-swse/scripts/registries/feat-registry.js';
import { TalentRegistry } from '/systems/foundryvtt-swse/scripts/registries/talent-registry.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

const PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.v1');
const TALENT_PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.talent.v1');
const ABILITY_PATCH_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.ability.v1');
const HOOK_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.hooks.v1');
const MATERIALIZE_FLAG = Symbol.for('swse.featHousekeepingRuntimePatches.materialize.v1');

const HOUSERULE_FEAT_GRANTS = [
  { setting: 'weaponFinesseDefault', type: 'feat', name: 'Weapon Finesse', id: '252b67d6e31c377e' },
  { setting: 'pointBlankShotDefault', type: 'feat', name: 'Point Blank Shot', id: '05459ac4d439f229' },
  { setting: 'powerAttackDefault', type: 'feat', name: 'Power Attack', id: '3f76464c43c73f84' },
  { setting: 'preciseShotDefault', type: 'feat', name: 'Precise Shot', id: 'c180eee7d3bc29b2' },
  { setting: 'dodgeDefault', type: 'feat', name: 'Dodge', id: '45366d4f3a5e443d' },
];

const HOUSERULE_TALENT_GRANTS = [
  { setting: 'armoredDefenseForAll', type: 'talent', name: 'Armored Defense', id: '4c236343b01ea763' },
];

const HOUSERULE_GRANTS = [...HOUSERULE_FEAT_GRANTS, ...HOUSERULE_TALENT_GRANTS];
const HOUSERULE_GRANT_SETTINGS = new Set(HOUSERULE_GRANTS.map(entry => entry.setting));

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
  try {
    if (setting === 'weaponFinesseDefault') return FeatRulesAdapter.weaponFinesseDefaultEnabled();
    if (setting === 'pointBlankShotDefault') return FeatRulesAdapter.pointBlankShotDefaultEnabled();
    if (setting === 'powerAttackDefault') return FeatRulesAdapter.powerAttackDefaultEnabled();
    if (setting === 'preciseShotDefault') return FeatRulesAdapter.preciseShotDefaultEnabled();
    if (setting === 'dodgeDefault') return FeatRulesAdapter.dodgeDefaultEnabled();
    if (typeof HouseRuleService.getBoolean === 'function') return HouseRuleService.getBoolean(setting, false);
    if (typeof HouseRuleService.isEnabled === 'function') return HouseRuleService.isEnabled(setting);
    if (typeof HouseRuleService.getSafe === 'function') return HouseRuleService.getSafe(setting, false);
  } catch (_err) {
    // fall through to disabled
  }
  return false;
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

async function resolveGrantItemData(grant) {
  let itemData = {
    name: grant.name,
    type: grant.type,
    img: grant.type === 'talent' ? 'icons/svg/aura.svg' : 'icons/svg/upgrade.svg',
    system: {},
  };

  try {
    const doc = grant.type === 'feat'
      ? await CompendiumFeatRegistry.getDocumentById?.(grant.id)
      : await TalentRegistry.getDocumentById?.(grant.id);
    if (doc?.toObject) itemData = doc.toObject();
  } catch (err) {
    console.warn('SWSE | Could not load house-rule grant from compendium; using fallback item data', grant, err);
  }

  const system = {
    ...(itemData.system || {}),
    sourceType: 'house-rule',
    grantedBy: 'house-rule',
    houseRuleGranted: true,
    houseRuleSetting: grant.setting,
    canonicalGrantId: grant.id,
    canonicalGrantName: grant.name,
  };

  return {
    ...itemData,
    name: itemData.name || grant.name,
    type: itemData.type || grant.type,
    system,
    flags: {
      ...(itemData.flags || {}),
      swse: {
        ...(itemData.flags?.swse || {}),
        id: itemData.flags?.swse?.id || grant.id,
        houseRuleGranted: true,
        houseRuleSetting: grant.setting,
        canonicalGrantId: grant.id,
        canonicalGrantName: grant.name,
      },
      'foundryvtt-swse': {
        ...(itemData.flags?.['foundryvtt-swse'] || {}),
        id: itemData.flags?.['foundryvtt-swse']?.id || grant.id,
        houseRuleGranted: true,
        houseRuleSetting: grant.setting,
        canonicalGrantId: grant.id,
        canonicalGrantName: grant.name,
      },
    },
  };
}

function actorAlreadyHasGrant(actor, grant) {
  const items = actor?.items?.contents || actor?.items || [];
  for (const item of items) {
    if (item?.type !== grant.type) continue;
    const itemNames = [
      item.name,
      item.system?.canonicalGrantName,
      item.flags?.swse?.canonicalGrantName,
      item.flags?.['foundryvtt-swse']?.canonicalGrantName,
    ];
    if (itemNames.some(name => namesMatch(name, grant.name))) return true;
    const ids = [
      item.id,
      item._id,
      item.system?.canonicalGrantId,
      item.flags?.swse?.id,
      item.flags?.swse?.canonicalGrantId,
      item.flags?.['foundryvtt-swse']?.id,
      item.flags?.['foundryvtt-swse']?.canonicalGrantId,
      item.flags?.core?.sourceId,
    ].filter(Boolean).map(value => String(value));
    if (ids.some(value => value.includes(grant.id))) return true;
  }
  return false;
}

async function materializeHouseruleGrantsForActor(actor) {
  if (!actor || actor.type !== 'character') return;
  const toCreate = [];
  for (const grant of HOUSERULE_GRANTS) {
    if (!isHouseruleGrantEnabled(grant.setting)) continue;
    if (actorAlreadyHasGrant(actor, grant)) continue;
    toCreate.push(await resolveGrantItemData(grant));
  }
  if (!toCreate.length) return;
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
}

function registerHouseRuleGrantMaterialization() {
  if (globalThis[MATERIALIZE_FLAG]) return;
  globalThis[MATERIALIZE_FLAG] = true;

  Hooks.on('createActor', (actor, options, userId) => {
    if (game?.user?.id !== userId) return;
    materializeHouseruleGrantsForActor(actor).catch(err => {
      console.warn('SWSE | House-rule grant materialization failed for new actor', err);
    });
  });

  Hooks.once('ready', async () => {
    if (!game?.user?.isGM) return;
    for (const actor of game.actors || []) {
      await materializeHouseruleGrantsForActor(actor).catch(err => {
        console.warn('SWSE | House-rule grant materialization failed', actor?.name, err);
      });
    }
  });

  Hooks.on('updateSetting', (setting, value) => {
    const key = String(setting?.key || '').split('.').pop();
    if (!HOUSERULE_GRANT_SETTINGS.has(key) || value === false) return;
    if (!game?.user?.isGM) return;
    for (const actor of game.actors || []) {
      materializeHouseruleGrantsForActor(actor).catch(err => {
        console.warn('SWSE | House-rule grant materialization failed after setting change', actor?.name, err);
      });
    }
  });
}

function registerHouseRuleCacheInvalidation() {
  if (globalThis[HOOK_FLAG]) return;
  globalThis[HOOK_FLAG] = true;
  Hooks.on('swse:houserule-changed', (key) => {
    if (HOUSERULE_GRANT_SETTINGS.has(key)) AbilityEngine.clearAcquisitionCache?.();
  });
  Hooks.on('updateSetting', (setting) => {
    const key = String(setting?.key || '').split('.').pop();
    if (HOUSERULE_GRANT_SETTINGS.has(key)) AbilityEngine.clearAcquisitionCache?.();
  });
}

export function registerFeatHousekeepingRuntimePatches() {
  patchHouseruleFeatOwnership();
  patchHouseruleFeatPendingForAbilityEngine();
  patchRepeatableFeatSelectionUi();
  patchHouseruleTalentProgressionOwnership();
  registerHouseRuleGrantMaterialization();
  registerHouseRuleCacheInvalidation();
}
