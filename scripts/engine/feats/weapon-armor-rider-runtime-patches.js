import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const key = value => String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
const items = actor => { try { return Array.from(actor?.items ?? []); } catch (_err) { return []; } };
const hasFeat = (actor, name) => items(actor).some(item => item?.type === 'feat' && item?.system?.disabled !== true && `${key(item.name)} ${key(item.system?.slug)}`.includes(key(name)));
const active = (context, id) => !!((context?.combatOptions ?? context?.attackOptions ?? {})[id]);

function abilityScore(actor, ability) {
  const k = String(ability || '').toLowerCase().slice(0, 3);
  for (const value of [actor?.system?.abilities?.[k]?.value, actor?.system?.attributes?.[k]?.value, actor?.system?.stats?.[k]?.value]) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 10;
}

function weaponText(weapon) {
  const s = weapon?.system ?? {};
  return [weapon?.name, s.weaponType, s.weaponGroup, s.group, s.category, s.type, s.subtype, s.size, s.weaponSize, s.effectiveSize, s.traits?.join?.(' '), s.properties?.join?.(' '), s.qualities?.join?.(' '), s.weaponQualities?.join?.(' ')]
    .map(key).filter(Boolean).join(' ');
}

function attackType(weapon, context = {}) {
  const explicit = key(context.attackType ?? context.rangeType ?? context.weaponType ?? context.workflowContext?.attackType);
  if (explicit.includes('ranged')) return 'ranged';
  if (explicit.includes('melee')) return 'melee';
  const text = weaponText(weapon);
  if (/ranged|pistol|rifle|blaster|bowcaster/.test(text)) return 'ranged';
  if (/melee|lightsaber|unarmed|blade/.test(text)) return 'melee';
  return 'unknown';
}

function isLightMeleeOrLightsaber(weapon, context = {}) {
  const text = weaponText(weapon);
  return text.includes('lightsaber') || text.includes('light-melee') || text.includes('light-weapon') || text.includes('knife') || text.includes('dagger') || ((text.includes('tiny') || text.includes('small')) && attackType(weapon, context) === 'melee');
}

function areaAttack(weapon, context = {}) {
  if (context.areaAttack === true || context.isAreaAttack === true || context.attackMode === 'area') return true;
  const s = weapon?.system ?? {};
  return s.areaAttack === true || s.isAreaAttack === true || s.burst === true || s.splash === true || /area|burst|splash|cone|line|radius|explosive|grenade/.test(weaponText(weapon));
}

function add(result, field, delta, label, type = field) {
  if (!delta) return;
  result[field] = Number(result[field] ?? 0) + delta;
  result.breakdown ??= [];
  result.breakdown.push({ label, value: delta, type });
}

function addDice(result, delta, label) {
  add(result, 'damageExtraWeaponDice', delta, label, 'damageExtraWeaponDice');
  result.damageDiceStepBonus = Number(result.damageDiceStepBonus ?? 0) + delta;
}

function flag(result, name, value = true) {
  result.flags ??= {};
  result.flags[name] = value;
}

function extraDice(context, result) {
  return Math.max(0, Number(context.extraDamageDice ?? context.workflowContext?.extraDamageDice ?? 0), Number(result.damageExtraWeaponDice ?? result.damageDiceStepBonus ?? 0));
}

function extraDiceTrigger(context, result) {
  return active(context, 'rapidShot') || active(context, 'rapidStrike') || context.sneakAttack === true || context.workflowContext?.sneakAttack === true || extraDice(context, result) > 0;
}

function applyImprovedRapidStrike(result, actor, weapon, context) {
  if (!hasFeat(actor, 'Improved Rapid Strike') || !active(context, 'rapidStrike') || attackType(weapon, context) !== 'melee' || !isLightMeleeOrLightsaber(weapon, context)) return;
  const targetPenalty = abilityScore(actor, 'dex') >= 13 ? -5 : -10;
  add(result, 'attackBonus', targetPenalty - (-2), 'Improved Rapid Strike replaces Rapid Strike attack penalty', 'attack');
  addDice(result, 1, 'Improved Rapid Strike replaces Rapid Strike damage dice');
  if (active(context, 'mightySwing')) {
    addDice(result, -1, 'Improved Rapid Strike suppresses Mighty Swing extra die');
    flag(result, 'mightySwingSuppressedByImprovedRapidStrike');
  }
  flag(result, 'improvedRapidStrike');
}

function applyCollateralDamage(result, actor, weapon, context) {
  if (!hasFeat(actor, 'Collateral Damage') || !active(context, 'rapidShot') || attackType(weapon, context) !== 'ranged' || areaAttack(weapon, context)) return;
  flag(result, 'collateralDamageAvailable');
  result.targetEffectsOnHit ??= [];
  result.targetEffectsOnHit.push({ type: 'secondary-attack-prompt', sourceName: 'Collateral Damage', oncePerTurn: true, attackPenalty: -2, targetWithinSquares: 2, damageMultiplier: 0.5, manualTargetResolution: true });
  result.breakdown ??= [];
  result.breakdown.push({ label: 'Collateral Damage available after Rapid Shot damage', value: 0, type: 'hitRider' });
}

function applyHobblingStrike(result, actor, _weapon, context) {
  if (!hasFeat(actor, 'Hobbling Strike') || !active(context, 'hobblingStrike') || !extraDiceTrigger(context, result)) return;
  const dice = Math.max(1, extraDice(context, result));
  addDice(result, -dice, 'Hobbling Strike forgoes extra damage dice');
  result.targetEffectsOnHit ??= [];
  result.targetEffectsOnHit.push({ type: 'speed-penalty', sourceName: 'Hobbling Strike', value: -1, unit: 'squares', duration: 'encounter', manualTargetResolution: true });
  flag(result, 'hobblingStrike');
}

function applyStaggeringAttack(result, actor, _weapon, context) {
  if (!hasFeat(actor, 'Staggering Attack') || !active(context, 'staggeringAttack') || !extraDiceTrigger(context, result)) return;
  const dice = Math.max(1, extraDice(context, result));
  addDice(result, -dice, 'Staggering Attack forgoes extra damage dice');
  result.targetEffectsOnHit ??= [];
  result.targetEffectsOnHit.push({ type: 'forced-movement', sourceName: 'Staggering Attack', squares: dice * 2, provokesOpportunityAttacks: false, manualTargetResolution: true });
  flag(result, 'staggeringAttack');
}

function applySavageAttack(result, actor, _weapon, context) {
  if (!hasFeat(actor, 'Savage Attack')) return;
  const full = context.fullAttack === true || context.isFullAttack === true || context.workflowContext?.fullAttack === true;
  const double = context.doubleAttack === true || context.usesDoubleAttack === true || context.workflowContext?.doubleAttack === true || Number(context.attackIndex ?? 0) > 0;
  const followup = full && double && (context.firstAttackHit === true || context.workflowContext?.firstAttackHit === true) && context.sameTargetAsFirstAttack !== false && context.workflowContext?.sameTargetAsFirstAttack !== false;
  flag(result, 'savageAttackRiderAvailable', full && double);
  if (followup) {
    addDice(result, 1, 'Savage Attack follow-up damage die');
    flag(result, 'savageAttack');
  }
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseWeaponArmorRidersPatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
    const result = original(actor, weapon, context) ?? {};
    try {
      applyImprovedRapidStrike(result, actor, weapon, context);
      applyCollateralDamage(result, actor, weapon, context);
      applySavageAttack(result, actor, weapon, context);
      applyHobblingStrike(result, actor, weapon, context);
      applyStaggeringAttack(result, actor, weapon, context);
    } catch (err) {
      SWSELogger.warn('[WeaponArmorRiderRuntime] Failed to apply rider feats', { error: err });
    }
    return result;
  };
  CombatOptionResolver.__swseWeaponArmorRidersPatched = true;
}

export function registerWeaponArmorRiderRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[WeaponArmorRiderRuntime] Runtime patches registered');
}

export default registerWeaponArmorRiderRuntimePatches;
