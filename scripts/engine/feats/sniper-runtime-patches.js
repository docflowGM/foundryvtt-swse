import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";

let registered = false;

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasSniper(actor) {
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === 'sniper');
}

function hasSniperRule(actor) {
  return actorItems(actor).some(item => {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) return false;
    const rules = item?.system?.abilityMeta?.rules;
    return Array.isArray(rules) && rules.some(rule => rule?.type === 'IGNORE_SOFT_COVER' && String(rule?.source ?? '').toLowerCase() === 'sniper');
  });
}

function isRangedAttack(weapon, context = {}) {
  const explicit = normalizeKey(context.attackType ?? context.rangeType ?? context.weaponType ?? '');
  if (explicit) return explicit.includes('ranged');
  const system = weapon?.system ?? {};
  const text = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.range,
    system.rangeType
  ].map(normalizeKey).filter(Boolean).join(' ');
  return /ranged|pistol|rifle|carbine|blaster|bowcaster|bow|launcher|thrown/.test(text);
}

function coverContext(options = {}) {
  const ctx = options.targetContext ?? {};
  const flags = new Set([
    ...(Array.isArray(options.flags) ? options.flags : []),
    ...(Array.isArray(options.contextFlags) ? options.contextFlags : []),
    ...(Array.isArray(ctx.flags) ? ctx.flags : []),
    ...(Array.isArray(ctx.contextFlags) ? ctx.contextFlags : [])
  ].map(value => String(value)));

  const typeText = [
    options.coverType,
    options.coverSourceType,
    options.coverSource,
    ctx.coverType,
    ctx.coverSourceType,
    ctx.coverSource,
    ctx.coverKind
  ].map(normalizeKey).filter(Boolean).join(' ');

  const soft = options.softCover === true
    || options.softCoverFromCreature === true
    || options.softCoverFromCharacter === true
    || options.softCoverFromDroid === true
    || ctx.softCover === true
    || ctx.softCoverFromCreature === true
    || ctx.softCoverFromCharacter === true
    || ctx.softCoverFromDroid === true
    || flags.has('softCover')
    || flags.has('softCoverFromCreature')
    || flags.has('softCoverFromCharacter')
    || flags.has('softCoverFromDroid')
    || typeText.includes('soft')
    || typeText.includes('creature')
    || typeText.includes('character')
    || typeText.includes('droid');

  const rawBonus = Number(ctx.coverBonus ?? options.coverBonus ?? options.modifiers?.coverBonus ?? 0);
  const coverBonus = Number.isFinite(rawBonus) && rawBonus !== 0 ? Math.abs(rawBonus) : soft ? 5 : 0;

  return { soft, coverBonus };
}

function addBreakdown(result, label, value, type) {
  result.breakdown ??= [];
  if (!result.breakdown.some(entry => entry?.label === label && entry?.type === type)) {
    result.breakdown.push({ label, value, type });
  }
}

function applySniper(result, actor, weapon, options = {}) {
  if (!actor || !weapon || !isRangedAttack(weapon, options)) return result;
  if (!actorHasSniper(actor) && !hasSniperRule(actor)) return result;

  const cover = coverContext(options);
  if (!cover.soft || cover.coverBonus <= 0) return result;

  result.flags ??= {};
  if (result.flags['swse.sniper.softCoverSuppressed'] === true) return result;

  result.flags['swse.sniper.softCoverSuppressed'] = true;
  result.flags['suppresses.softCoverFromCreature'] = true;
  result.flags['suppresses.softCover'] = true;
  result.attackBonus = Number(result.attackBonus ?? 0) + cover.coverBonus;
  addBreakdown(result, 'Sniper: Ignore Soft Cover', cover.coverBonus, 'attack');

  return result;
}

export function registerSniperRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options);
    return applySniper(result, actor, weapon, options);
  };
}

export default registerSniperRuntimePatches;
