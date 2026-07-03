import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dualWeaponMasteryLevel(name) {
  const normalized = normalizeName(name);
  if (normalized === 'dual weapon mastery iii' || normalized === 'dual weapon mastery 3') return 3;
  if (normalized === 'dual weapon mastery ii' || normalized === 'dual weapon mastery 2') return 2;
  if (normalized === 'dual weapon mastery i' || normalized === 'dual weapon mastery 1') return 1;
  return 0;
}

function roman(level) {
  return ['I', 'II', 'III'][Math.max(0, Math.min(2, level - 1))] ?? '';
}

function slugForLevel(level) {
  return `dual-weapon-mastery-${['i', 'ii', 'iii'][Math.max(0, Math.min(2, level - 1))]}`;
}

function penaltyForLevel(level) {
  if (level >= 3) return 0;
  if (level === 2) return -2;
  if (level === 1) return -5;
  return -10;
}

function hasDwmRule(item, level) {
  const rules = item?.system?.abilityMeta?.rules;
  if (!Array.isArray(rules)) return false;
  return rules.some(rule => rule?.type === 'DUAL_WEAPON_MASTERY_PENALTY' && Number(rule?.level ?? 0) === level);
}

async function normalizeDualWeaponMastery(item, options = {}) {
  if (options?.swseDualWeaponMasteryNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const level = dualWeaponMasteryLevel(item.name);
  if (!level) return false;

  const patch = { _id: item.id };
  const slug = slugForLevel(level);
  if (item.system?.slug !== slug) patch['system.slug'] = slug;
  if (item.system?.executionModel !== 'PASSIVE') patch['system.executionModel'] = 'PASSIVE';
  if (item.system?.subType !== 'RULE') patch['system.subType'] = 'RULE';
  if (item.system?.abilityMeta?.mechanicsMode !== 'passive_rule') patch['system.abilityMeta.mechanicsMode'] = 'passive_rule';
  if (!hasDwmRule(item, level)) {
    patch['system.abilityMeta.rules'] = [
      ...(Array.isArray(item.system?.abilityMeta?.rules) ? item.system.abilityMeta.rules : []),
      {
        type: 'DUAL_WEAPON_MASTERY_PENALTY',
        level,
        penalty: penaltyForLevel(level),
        appliesTo: ['twoWeapon', 'doubleWeapon'],
        requiresProficiency: true,
        source: `Dual Weapon Mastery ${roman(level)}`,
        label: `Dual Weapon Mastery ${roman(level)}: ${penaltyForLevel(level) === 0 ? 'No' : penaltyForLevel(level)} two-weapon penalty`
      }
    ];
  }

  if (Object.keys(patch).length <= 1) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [patch], {
      source: 'DualWeaponMastery.normalization',
      swseDualWeaponMasteryNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[DualWeaponMasteryNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerDualWeaponMasteryNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeDualWeaponMastery(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeDualWeaponMastery(item, options));
  SWSELogger.log('[DualWeaponMasteryNormalization] Hooks registered');
}

export default registerDualWeaponMasteryNormalizationHooks;
