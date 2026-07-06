import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function selectedChoiceFromItem(item) {
  const system = item?.system ?? {};
  const meta = system.abilityMeta ?? {};
  const choiceMeta = system.choiceMeta ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? meta.selectedChoice ?? meta.selectedChoices;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object') {
    const value = entry.value ?? entry.id ?? entry.group ?? entry.weapon ?? entry.weaponGroup ?? entry.label ?? entry.name;
    if (String(value ?? '').trim()) return String(value).trim();
  }
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() ?? '';
}

function selectedChoicePatch(item) {
  const choice = selectedChoiceFromItem(item);
  if (!choice) return {};
  return {
    'system.selectedChoice': choice,
    'system.choiceMeta.selectedChoice': choice,
    'system.abilityMeta.selectedChoice': choice,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function autofireAssaultRule(item) {
  const choice = selectedChoiceFromItem(item);
  return {
    type: 'ATTACK_OPTION',
    id: 'autofireAssault',
    label: 'Autofire Assault',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresAutofire: true,
    requiresFeatSelectedChoiceMatch: ['Weapon Focus'],
    selectedChoice: Boolean(choice),
    requiresContextFlags: ['sameAutofireAreaAsLastTurn'],
    excludesOptions: ['autofireSweep', 'burstFire'],
    attackMode: 'autofire',
    areaAttack: true,
    sameAreaAsLastTurnRequired: true,
    baseAutofirePenaltyExpected: -5,
    effectiveAutofirePenalty: -2,
    attackModifier: 3,
    bracedAutofireOnlyOrControlledBurstEffectivePenalty: -1,
    bracedAutofireOnlyOrControlledBurstAttackModifier: 4,
    conditionalAttackModifiers: [{
      ifAnyContextFlag: ['bracedAutofireOnlyWeapon', 'controlledBurstTalent', 'controlledBurst'],
      replacesAttackModifier: 4,
      effectiveAutofirePenalty: -1
    }],
    damageExtraWeaponDice: 1,
    damageOnHitOnly: true,
    damageOnMiss: 'halfWithoutExtraDie',
    criticalDoublesDamage: false,
    incompatibleWith: ['Autofire Sweep', 'Burst Fire'],
    summary: 'When you target the same area with autofire that you targeted with autofire on your last turn, reduce the normal autofire penalty to -2, or -1 with a braced autofire-only weapon or Controlled Burst, and add +1 weapon die on a hit. Cannot be used with Autofire Sweep or Burst Fire.',
    source: 'Autofire Assault'
  };
}

function autofireSweepRule(item) {
  const choice = selectedChoiceFromItem(item);
  return {
    type: 'ATTACK_OPTION',
    id: 'autofireSweep',
    label: 'Autofire Sweep',
    control: 'toggle',
    requiresAttackType: 'ranged',
    requiresAutofire: true,
    requiresFeatSelectedChoiceMatch: ['Weapon Focus'],
    selectedChoice: Boolean(choice),
    excludesOptions: ['autofireAssault', 'burstFire'],
    attackMode: 'autofire',
    areaAttack: true,
    areaShape: 'cone',
    arcDegrees: 180,
    coneLengthSquares: 6,
    originRequirement: 'visiblePointInPointBlankRange',
    pointBlankRangeRequired: true,
    gmManagedTargets: true,
    damageOnMiss: 'half',
    criticalDoublesDamage: false,
    compatibleTalents: ['Improved Suppression Fire'],
    incompatibleWith: ['Autofire Assault', 'Burst Fire'],
    targetEffectsOnHit: [{
      type: 'autofire-sweep-area-metadata',
      sourceName: 'Autofire Sweep',
      areaShape: 'cone',
      arcDegrees: 180,
      coneLengthSquares: 6,
      originRequirement: 'visiblePointInPointBlankRange',
      pointBlankRangeRequired: true,
      gmManagedTargets: true,
      damageOnMiss: 'half',
      criticalDoublesDamage: false,
      compatibleTalents: ['Improved Suppression Fire'],
      manualResolution: true
    }],
    summary: 'When making autofire with a Weapon Focus weapon, attack all targets in a 6-square 180-degree cone. The cone origin can be any square in line of sight within point-blank range. Cannot be used with Autofire Assault or Burst Fire; compatible with Improved Suppression Fire.',
    source: 'Autofire Sweep'
  };
}

function rulesForFeat(item) {
  const name = compact(item?.name);
  if (name === 'autofireassault') return [autofireAssaultRule(item)];
  if (name === 'autofiresweep') return [autofireSweepRule(item)];
  return [];
}

async function normalizeAutofireWeaponFeat(item, options = {}) {
  if (options?.swseWeaponAutofireNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rulesToAdd = rulesForFeat(item);
  if (!rulesToAdd.length) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const normalizedRuleIds = ['autofireAssault', 'autofireSweep'];
  const nextRules = withoutExistingRules(currentRules, normalizedRuleIds);
  nextRules.push(...rulesToAdd);

  const patch = {
    'system.executionModel': 'ACTIVE',
    'system.subType': 'ATTACK_OPTION',
    'system.abilityMeta.mechanicsMode': 'selected_attack_option',
    'system.abilityMeta.applicationScope': 'weapon_focus_autofire_attack',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules,
    ...selectedChoicePatch(item)
  };

  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  const modelChanged = item.system?.executionModel !== 'ACTIVE'
    || item.system?.subType !== 'ATTACK_OPTION'
    || item.system?.abilityMeta?.mechanicsMode !== 'selected_attack_option'
    || item.system?.abilityMeta?.applicationScope !== 'weapon_focus_autofire_attack'
    || item.system?.abilityMeta?.requiresRuntimeContext !== true
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'WeaponAutofire.normalization',
      swseWeaponAutofireNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[WeaponAutofireNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerWeaponAutofireFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeAutofireWeaponFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeAutofireWeaponFeat(item, options));
  SWSELogger.log('[WeaponAutofireNormalization] Hooks registered');
}

export default registerWeaponAutofireFeatNormalizationHooks;
