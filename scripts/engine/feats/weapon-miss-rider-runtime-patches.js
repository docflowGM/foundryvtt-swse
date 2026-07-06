import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const key = value => String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
const items = actor => { try { return Array.from(actor?.items ?? []); } catch (_err) { return []; } };

function weaponText(weapon) {
  const s = weapon?.system ?? {};
  return [weapon?.name, s.weaponType, s.weaponGroup, s.group, s.category, s.type, s.subtype, s.traits?.join?.(' '), s.properties?.join?.(' '), s.qualities?.join?.(' '), s.weaponQualities?.join?.(' ')]
    .map(key).filter(Boolean).join(' ');
}

function textMatchesAny(haystack, values = []) {
  const wanted = (Array.isArray(values) ? values : [values]).map(key).filter(Boolean);
  if (!wanted.length) return false;
  return wanted.some(value => String(haystack || '').includes(value));
}

function attackType(weapon, context = {}) {
  const explicit = key(context.attackType ?? context.rangeType ?? context.weaponType ?? context.workflowContext?.attackType);
  if (explicit.includes('ranged')) return 'ranged';
  if (explicit.includes('melee')) return 'melee';
  const text = weaponText(weapon);
  if (/ranged|pistol|rifle|blaster|bowcaster|thrown|bug/.test(text)) return 'ranged';
  if (/melee|lightsaber|unarmed|blade/.test(text)) return 'melee';
  return 'unknown';
}

function ruleAppliesToWeapon(rule, weapon, context = {}) {
  if (!rule || rule.enabled === false) return false;
  if (rule.requiresAttackType && attackType(weapon, context) !== String(rule.requiresAttackType).toLowerCase()) return false;
  if (rule.requiresWeaponText && !textMatchesAny(weaponText(weapon), rule.requiresWeaponText)) return false;
  if (rule.weaponText && !textMatchesAny(weaponText(weapon), rule.weaponText)) return false;
  return true;
}

function collectMissRiders(actor, weapon, context = {}) {
  const effects = [];
  const breakdown = [];
  for (const item of items(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    const rules = item?.system?.abilityMeta?.rules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      if (rule?.type !== 'MISS_RIDER') continue;
      if (!ruleAppliesToWeapon(rule, weapon, context)) continue;
      const missEffects = Array.isArray(rule.targetEffectsOnMiss) ? rule.targetEffectsOnMiss : Array.isArray(rule.effects) ? rule.effects : [];
      if (!missEffects.length) continue;
      effects.push(...missEffects.map(effect => ({ ...effect, sourceName: item.name, sourceRule: rule.id || rule.type })));
      breakdown.push({ label: rule.label || item.name, value: 0, type: 'missRider' });
    }
  }
  return { effects, breakdown };
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseMissRidersPatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
    const result = original(actor, weapon, context) ?? {};
    try {
      const miss = collectMissRiders(actor, weapon, context);
      if (miss.effects.length) {
        result.targetEffectsOnMiss ??= [];
        result.targetEffectsOnMiss.push(...miss.effects);
        result.breakdown ??= [];
        result.breakdown.push(...miss.breakdown);
        result.flags ??= {};
        result.flags.hasMissRiders = true;
      }
    } catch (err) {
      SWSELogger.warn('[WeaponMissRiderRuntime] Failed to collect miss riders', { error: err });
    }
    return result;
  };

  CombatOptionResolver.__swseMissRidersPatched = true;
}

export function registerWeaponMissRiderRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[WeaponMissRiderRuntime] Runtime patches registered');
}

export default registerWeaponMissRiderRuntimePatches;
