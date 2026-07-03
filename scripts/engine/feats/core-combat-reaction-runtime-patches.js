import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";

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
      actor?.system?.abilities?.[candidate]?.mod,
      actor?.system?.abilities?.[candidate]?.modifier,
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

function actorHpValue(actor) {
  const candidates = [
    actor?.system?.attributes?.hp?.value,
    actor?.system?.health?.value,
    actor?.system?.hp?.value,
    actor?.system?.wounds?.hp?.value,
    actor?.system?.derived?.hp?.value
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getPropertyByPath(object, path) {
  if (!object || !path) return undefined;
  const getter = globalThis.foundry?.utils?.getProperty;
  if (typeof getter === 'function') return getter(object, path);
  return String(path).split('.').reduce((value, key) => value?.[key], object);
}

function updateHasHpChange(changes = {}) {
  const keys = [
    'system.attributes.hp.value',
    'system.health.value',
    'system.hp.value',
    'system.wounds.hp.value',
    'system.derived.hp.value'
  ];
  return keys.some(key => getPropertyByPath(changes, key) !== undefined);
}

async function postCleaveAvailableMessage({ attacker, target, context = {} }) {
  if (!attacker || !target) return null;
  const actorName = attacker.name ?? 'Actor';
  const targetName = target.name ?? 'target';
  return createChatMessage({
    speaker: ChatMessage.getSpeaker?.({ actor: attacker }) ?? { alias: actorName },
    content: `<div class="swse-chat-card swse-cleave-prompt"><h3>Cleave Available</h3><p><strong>${actorName}</strong> reduced <strong>${targetName}</strong> to 0 HP. You may make one immediate extra melee attack against a different opponent within reach using the same weapon and attack bonus.</p><p><em>GM/player activation: choose a valid target and roll the extra attack manually if applicable.</em></p></div>`,
    flags: {
      'foundryvtt-swse': {
        cleavePrompt: true,
        actorId: attacker.id ?? attacker._id ?? null,
        targetId: target.id ?? target._id ?? null,
        context
      }
    }
  });
}

function findEligibleCleaveAttackers(target, context = {}) {
  const explicitAttacker = context.attacker ?? context.sourceActor ?? context.actor ?? null;
  if (explicitAttacker && CoreCombatReactionFeatActions.canUseCleave(explicitAttacker, { ...context, targetDropped: true, targetReducedToZero: true })) {
    return [explicitAttacker];
  }
  return [];
}

function emitTargetDropped(target, context = {}) {
  if (!target) return;
  const event = {
    target,
    targetActor: target,
    previousHp: context.previousHp ?? null,
    currentHp: context.currentHp ?? actorHpValue(target),
    source: context.source ?? 'CoreCombatReactionFeatActions',
    ...context
  };
  Hooks.callAll?.('swse.targetDroppedToZero', event);
  Hooks.callAll?.('swse.targetDropped', event);
  for (const attacker of findEligibleCleaveAttackers(target, event)) {
    Hooks.callAll?.('swse.cleaveAvailable', { attacker, target, context: event });
    if (event.postChat !== false) postCleaveAvailableMessage({ attacker, target, context: event });
  }
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

  static getReactionMax(actor) {
    return this.getAttacksOfOpportunityPerRound(actor);
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

  static notifyTargetDropped(target, context = {}) {
    emitTargetDropped(target, context);
  }
}

function patchReactionMaximum() {
  const originalGetReactionMax = ActionEconomyPersistence.getReactionMax.bind(ActionEconomyPersistence);
  ActionEconomyPersistence.getReactionMax = function patchedGetReactionMax(actor) {
    const raw = Number(originalGetReactionMax(actor));
    const base = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
    if (!CoreCombatReactionFeatActions.hasCombatReflexes(actor)) return base;
    return Math.max(base, CoreCombatReactionFeatActions.getReactionMax(actor));
  };
}

function registerCleaveHpHooks() {
  Hooks.on('updateActor', (actor, changes = {}, options = {}) => {
    if (options?.swseSkipCleaveHpWatcher === true) return;
    if (!updateHasHpChange(changes)) return;
    const previousHp = Number(options?.swsePreviousHp ?? options?.previousHp ?? options?.oldHp);
    const currentHp = actorHpValue(actor);
    if (!Number.isFinite(currentHp)) return;
    const hadPositiveHp = Number.isFinite(previousHp) ? previousHp > 0 : true;
    if (hadPositiveHp && currentHp <= 0) {
      emitTargetDropped(actor, {
        previousHp: Number.isFinite(previousHp) ? previousHp : null,
        currentHp,
        attacker: options?.attacker ?? options?.sourceActor ?? null,
        attackType: options?.attackType,
        weapon: options?.weapon,
        source: 'updateActor.hpWatcher',
        postChat: options?.postCleaveChat
      });
    }
  });

  Hooks.on('swse.damageApplied', (event = {}) => {
    const target = event.targetActor ?? event.target ?? event.actor ?? null;
    const previousHp = Number(event.previousHp ?? event.beforeHp ?? event.hpBefore);
    const currentHp = Number(event.currentHp ?? event.afterHp ?? event.hpAfter ?? actorHpValue(target));
    if (!target || !Number.isFinite(currentHp)) return;
    if ((Number.isFinite(previousHp) ? previousHp > 0 : true) && currentHp <= 0) {
      emitTargetDropped(target, {
        ...event,
        target,
        previousHp: Number.isFinite(previousHp) ? previousHp : null,
        currentHp,
        source: 'swse.damageApplied'
      });
    }
  });
}

export function registerCoreCombatReactionRuntimePatches() {
  if (registered) return;
  registered = true;

  patchReactionMaximum();
  registerCleaveHpHooks();

  globalThis.SWSE ??= {};
  globalThis.SWSE.CoreCombatReactionFeatActions = CoreCombatReactionFeatActions;
  if (globalThis.game?.swse) game.swse.CoreCombatReactionFeatActions = CoreCombatReactionFeatActions;
}

export default registerCoreCombatReactionRuntimePatches;
