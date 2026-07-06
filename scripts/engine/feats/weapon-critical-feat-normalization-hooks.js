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

function hasRule(rules, id, type) {
  const wanted = String(id ?? '');
  const wantedType = String(type ?? '').toUpperCase();
  return asArray(rules).some(rule => String(rule?.id ?? rule?.key ?? '') === wanted && String(rule?.type ?? '').toUpperCase() === wantedType);
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

function criticalStrikeRule(item) {
  const choice = selectedChoiceFromItem(item);
  return {
    type: 'ATTACK_OPTION',
    id: 'criticalStrike',
    label: 'Critical Strike',
    control: 'toggle',
    requiresAttackType: 'melee',
    requiresFeatSelectedChoiceMatch: ['Weapon Focus'],
    selectedChoice: Boolean(choice),
    criticalThreatNaturalMin: 19,
    requiresSwiftActions: 2,
    swiftActionsRequired: 2,
    consecutiveSwiftActions: true,
    expiresOn: ['attackResolved', 'lineOfSightLost', 'otherActionTaken'],
    notes: 'Spend two consecutive Swift Actions in the same round. The next qualifying melee attack increases critical threat range by 1, but non-natural-20 threats are not automatic hits.',
    source: 'Critical Strike',
    summary: 'Spend two consecutive swift actions to increase the critical threat range of the next qualifying melee attack by 1.'
  };
}

async function normalizeCriticalStrikeFeat(item, options = {}) {
  if (options?.swseWeaponCriticalNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  if (compact(item.name) !== 'criticalstrike') return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = [...currentRules];
  const rule = criticalStrikeRule(item);
  if (!hasRule(nextRules, rule.id, rule.type)) nextRules.push(rule);

  const patch = {
    'system.executionModel': 'ACTIVE',
    'system.subType': 'ATTACK_OPTION',
    'system.abilityMeta.mechanicsMode': 'selected_attack_option',
    'system.abilityMeta.applicationScope': 'weapon_focus_melee_attack',
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules,
    ...selectedChoicePatch(item)
  };

  const rulesChanged = nextRules.length !== currentRules.length;
  const modelChanged = item.system?.executionModel !== 'ACTIVE'
    || item.system?.subType !== 'ATTACK_OPTION'
    || item.system?.abilityMeta?.mechanicsMode !== 'selected_attack_option'
    || item.system?.abilityMeta?.applicationScope !== 'weapon_focus_melee_attack'
    || item.system?.abilityMeta?.requiresRuntimeContext !== true
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'WeaponCritical.normalization',
      swseWeaponCriticalNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[WeaponCriticalNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerWeaponCriticalFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeCriticalStrikeFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeCriticalStrikeFeat(item, options));
  SWSELogger.log('[WeaponCriticalNormalization] Hooks registered');
}

export default registerWeaponCriticalFeatNormalizationHooks;
