import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function normalizeKey(value) {
  return String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch (_err) { return []; }
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.itemType,
    system.sourceType,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties,
    Array.isArray(system.qualities) ? system.qualities.join(' ') : system.qualities
  ];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function attackType(weapon, context = {}) {
  const explicit = normalizeKey(context.attackType ?? context.rangeType ?? context.weaponType ?? context.workflowContext?.attackType);
  if (explicit.includes('ranged')) return 'ranged';
  if (explicit.includes('melee')) return 'melee';
  const text = weaponText(weapon);
  if (/ranged|pistol|rifle|blaster|slugthrower|sporting/.test(text)) return 'ranged';
  if (/melee|lightsaber|unarmed|blade/.test(text)) return 'melee';
  return 'unknown';
}

function rangeBand(context = {}) {
  const raw = normalizeKey(context.rangeBand ?? context.rangeCategory ?? context.range ?? context.workflowContext?.rangeBand);
  if (raw === 'pointblank' || raw === 'point-blank' || raw === 'close') return 'point-blank';
  return raw;
}

function textMatchesAny(haystack, values = []) {
  const wanted = (Array.isArray(values) ? values : [values]).map(normalizeKey).filter(Boolean);
  return wanted.some(value => String(haystack || '').includes(value));
}

function actorWeaponProficiencies(actor) {
  const prof = actor?.system?.proficiencies?.weapon;
  const values = [];
  if (Array.isArray(prof)) values.push(...prof);
  else if (prof instanceof Set) values.push(...prof);
  else if (prof && typeof prof === 'object') values.push(...Object.entries(prof).filter(([, enabled]) => enabled === true || enabled?.value === true).map(([key]) => key));
  return values.map(normalizeKey).filter(Boolean);
}

function weaponIsProficient(actor, weapon) {
  const proficiencies = actorWeaponProficiencies(actor);
  if (!proficiencies.length) return false;
  const text = weaponText(weapon);
  if (text.includes('pistol') && proficiencies.some(p => p.includes('pistol'))) return true;
  if (text.includes('rifle') && proficiencies.some(p => p.includes('rifle'))) return true;
  if (text.includes('simple') && proficiencies.some(p => p.includes('simple'))) return true;
  if (text.includes('slugthrower') && text.includes('pistol') && proficiencies.some(p => p.includes('pistol'))) return true;
  if (text.includes('slugthrower') && text.includes('rifle') && proficiencies.some(p => p.includes('rifle'))) return true;
  if (text.includes('sporting') && text.includes('pistol') && proficiencies.some(p => p.includes('pistol'))) return true;
  if (text.includes('sporting') && text.includes('rifle') && proficiencies.some(p => p.includes('rifle'))) return true;
  return false;
}

function ruleApplies(rule, actor, weapon, context = {}) {
  if (!rule || rule.enabled === false) return false;
  if (rule.requiresAttackType && attackType(weapon, context) !== String(rule.requiresAttackType).toLowerCase()) return false;
  if (rule.requiresWeaponText && !textMatchesAny(weaponText(weapon), rule.requiresWeaponText)) return false;
  if (rule.requiresRangeBand) {
    const allowed = (Array.isArray(rule.requiresRangeBand) ? rule.requiresRangeBand : [rule.requiresRangeBand]).map(value => value === 'pointblank' ? 'point-blank' : normalizeKey(value));
    if (!allowed.includes(rangeBand(context))) return false;
  }
  if (rule.requiresAim && context.aim !== true && context.isAiming !== true && context.workflowContext?.aim !== true) return false;
  if (rule.requiresProficientWeapon && !weaponIsProficient(actor, weapon)) return false;
  return true;
}

function collectSportHunterRules(actor) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    if (normalizeKey(item.name) !== 'sport-hunter') continue;
    const itemRules = item?.system?.abilityMeta?.rules;
    if (Array.isArray(itemRules)) rules.push(...itemRules.filter(rule => rule?.type === 'SPORT_HUNTER_WEAPON_MUTATOR'));
  }
  return rules;
}

function applySportHunter(result, actor, weapon, context = {}) {
  const rules = collectSportHunterRules(actor);
  if (!rules.length) return result;
  for (const rule of rules) {
    if (!ruleApplies(rule, actor, weapon, context)) continue;
    const label = rule.label || 'Sport Hunter';
    const extraDice = Number(rule.damageExtraWeaponDice ?? 0);
    if (Number.isFinite(extraDice) && extraDice !== 0) {
      result.damageExtraWeaponDice = (result.damageExtraWeaponDice || 0) + extraDice;
      result.damageDiceStepBonus = (result.damageDiceStepBonus || 0) + extraDice;
      result.breakdown ??= [];
      result.breakdown.push({ label, value: extraDice, type: 'damageExtraWeaponDice' });
    }
    const dieSteps = Number(rule.damageDieStepIncreases ?? 0);
    if (Number.isFinite(dieSteps) && dieSteps !== 0) {
      result.damageDieStepIncreases = (result.damageDieStepIncreases || 0) + dieSteps;
      result.breakdown ??= [];
      result.breakdown.push({ label, value: dieSteps, type: 'damageDieStepIncrease' });
    }
    const attack = Number(rule.attackBonus ?? 0);
    if (Number.isFinite(attack) && attack !== 0) {
      result.attackBonus = (result.attackBonus || 0) + attack;
      result.breakdown ??= [];
      result.breakdown.push({ label, value: attack, type: 'attack' });
    }
    if (rule.damageDiceReroll) {
      result.flags ??= {};
      result.damageDiceRerolls ??= [];
      result.damageDiceRerolls.push({ ...rule.damageDiceReroll, sourceName: 'Sport Hunter', sourceRule: rule.id });
      result.flags.damageDiceRerollOnes = true;
      result.breakdown ??= [];
      result.breakdown.push({ label, value: 0, type: 'damageDiceReroll' });
    }
  }
  return result;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseSportHunterPatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedSportHunterCollectAttackModifiers(actor, weapon, options = {}) {
    const result = original(actor, weapon, options) ?? {};
    try {
      return applySportHunter(result, actor, weapon, options);
    } catch (err) {
      SWSELogger.warn('[SportHunterRuntime] Failed to apply Sport Hunter weapon mutators', { error: err });
      return result;
    }
  };

  CombatOptionResolver.__swseSportHunterPatched = true;
}

export function registerSportHunterRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[SportHunterRuntime] Runtime patches registered');
}

export default registerSportHunterRuntimePatches;
