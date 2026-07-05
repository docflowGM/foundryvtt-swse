import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ModifierType, ModifierSource, createModifier } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeDefenseTarget(target) {
  const key = String(target ?? '').trim().toLowerCase();
  if (!key) return null;
  if (key === 'fort' || key === 'fortitude' || key === 'defense.fortitude') return 'defense.fortitude';
  if (key === 'ref' || key === 'reflex' || key === 'defense.reflex') return 'defense.reflex';
  if (key === 'will' || key === 'defense.will') return 'defense.will';
  if (key === 'damage-threshold' || key === 'damagethreshold' || key === 'defense.damageThreshold') return 'defense.damageThreshold';
  return key.startsWith('defense.') ? key : `defense.${key}`;
}

function collectStaticDefenseFeatModifiers(actor) {
  const modifiers = [];
  for (const feat of Array.from(actor?.items ?? [])) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    const rules = asArray(feat?.system?.abilityMeta?.defenseRules);
    for (const rule of rules) {
      if (rule?.type !== 'STATIC_DEFENSE_BONUS') continue;
      const target = normalizeDefenseTarget(rule.target ?? rule.defense ?? rule.appliesTo);
      const value = Number(rule.value ?? rule.bonus ?? 0);
      if (!target || !Number.isFinite(value) || value === 0) continue;
      try {
        modifiers.push(createModifier({
          source: ModifierSource.FEAT,
          sourceId: feat.id,
          sourceName: feat.name || rule.source || rule.label || 'Defense Feat',
          target,
          type: ModifierType.UNTYPED,
          value,
          enabled: true,
          description: rule.summary || `${feat.name || 'Defense Feat'} ${value > 0 ? '+' : ''}${value}`,
          staticSheetPolicy: 'include'
        }));
      } catch (err) {
        SWSELogger.warn('[DefenseFeatRuntime] Failed to create static defense feat modifier', { feat: feat?.name, rule, error: err });
      }
    }
  }
  return modifiers;
}

export function registerDefenseFeatRuntimePatches() {
  if (registered) return;
  registered = true;

  if (ModifierEngine.__swseDefenseFeatRuntimePatched === true) return;
  const original = ModifierEngine._getFeatModifiers?.bind(ModifierEngine);
  if (typeof original !== 'function') {
    SWSELogger.warn('[DefenseFeatRuntime] ModifierEngine._getFeatModifiers unavailable; defense feat runtime patch not installed');
    return;
  }

  ModifierEngine._getFeatModifiers = function patchedGetFeatModifiers(actor) {
    const base = asArray(original(actor));
    return [
      ...base,
      ...collectStaticDefenseFeatModifiers(actor)
    ];
  };

  ModifierEngine.__swseDefenseFeatRuntimePatched = true;
  SWSELogger.log('[DefenseFeatRuntime] Runtime patches registered');
}

export default registerDefenseFeatRuntimePatches;
