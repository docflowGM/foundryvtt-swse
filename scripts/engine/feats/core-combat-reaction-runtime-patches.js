let registered = false;

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function abilityMod(actor, ability) {
  const key = normalizeKey(ability);
  const aliases = {
    dexterity: ['dexterity', 'dex', 'dexterity-modifier', 'dex-modifier', 'dexmod'],
    strength: ['strength', 'str', 'strength-modifier', 'str-modifier', 'strmod']
  };
  const candidates = aliases[key] ?? [key];
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const values = [
      actor?.system?.abilities?.[normalized]?.mod,
      actor?.system?.abilities?.[normalized]?.modifier,
      actor?.system?.abilities?.[normalized]?.value,
      actor?.system?.attributes?.[normalized]?.mod,
      actor?.system?.stats?.[normalized]?.mod
    ];
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return 0;
}

function hasReactionRule(actor, ruleKey) {
  const wanted = normalizeKey(ruleKey);
  return actorItems(actor).some(item => {
    const rules = item?.system?.abilityMeta?.reactionRules;
    if (!rules) return false;
    const list = Array.isArray(rules) ? rules : Object.values(rules).flat();
    return list.some(rule => normalizeKey(rule?.key ?? rule?.id ?? rule?.reactionKey ?? rule?.registryKey) === wanted);
  });
}

export class CoreCombatReactionFeatActions {
  static hasCleave(actor) {
    return actorHasFeat(actor, 'cleave') || hasReactionRule(actor, 'cleaveExtraAttack');
  }

  static hasCombatReflexes(actor) {
    return actorHasFeat(actor, 'combat reflexes') || hasReactionRule(actor, 'combatReflexesOpportunityAttack');
  }

  static getAttacksOfOpportunityPerRound(actor) {
    const base = 1;
    if (!this.hasCombatReflexes(actor)) return base;
    return Math.max(base, base + Math.max(0, abilityMod(actor, 'dexterity')));
  }

  static canMakeOpportunityAttackWhileFlatFooted(actor) {
    return this.hasCombatReflexes(actor);
  }

  static canUseCleave(actor, context = {}) {
    if (!this.hasCleave(actor)) return false;
    if (context.alreadyUsedThisRound === true || context.cleaveUsedThisRound === true) return false;
    const attackType = normalizeKey(context.attackType ?? context.rangeType ?? '');
    if (attackType && attackType !== 'melee') return false;
    if (context.targetReducedToZero === false || context.targetDropped === false) return false;
    if (context.sameTarget === true) return false;
    if (context.targetWithinReach === false) return false;
    return true;
  }

  static describeCleave(actor, context = {}) {
    const available = this.canUseCleave(actor, context);
    return {
      available,
      label: 'Cleave: Extra Melee Attack',
      oncePerRound: true,
      sameWeapon: true,
      sameAttackBonus: true,
      targetMustBeDifferent: true,
      targetMustBeWithinReach: true,
      reason: available
        ? 'Cleave is available.'
        : 'Cleave is unavailable for the supplied context.'
    };
  }
}

export function registerCoreCombatReactionRuntimePatches() {
  if (registered) return;
  registered = true;

  globalThis.SWSE ??= {};
  globalThis.SWSE.CoreCombatReactionFeatActions = CoreCombatReactionFeatActions;
  if (globalThis.game?.swse) globalThis.game.swse.CoreCombatReactionFeatActions = CoreCombatReactionFeatActions;
}

export default registerCoreCombatReactionRuntimePatches;
