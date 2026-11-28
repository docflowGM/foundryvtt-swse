/**
 * Attack chat outcome normalization (V2 realignment 3E, F-CMB-007).
 *
 * Previously installed as a runtime monkey-patch of SWSEChat.postRoll by scripts/patches/combat-ui-behavior-hotfix.js. It is now an ordinary
 * step inside SWSEChat.postRoll. Behavior is unchanged: for attack payloads it resolves the target and its defense, derives hit/miss and
 * critical from the natural d20 (1 always misses, 20 always hits and is a critical) or the total vs the defense, hides the defense value from
 * viewers who may not see it, and mirrors the result into the workflow context.
 * Pure leaf: reads game/canvas only, imports nothing.
 */

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor
    ?? null;
}

function tokenActorFromId(id) {
  if (!id) return null;
  return canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor ?? null;
}

function defenseValue(actor, defenseType = 'reflex') {
  if (!actor) return null;
  const key = String(defenseType || 'reflex').toLowerCase() === 'fort' ? 'fortitude' : String(defenseType || 'reflex').toLowerCase();
  if (key === 'dc') return null;
  const value = actor.system?.defenses?.[key]?.total
    ?? actor.system?.derived?.defenses?.[key]?.total
    ?? actor.system?.defenses?.[key]?.value
    ?? actor.system?.derived?.defenses?.[key]?.value
    ?? null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function canSeeDefense(actor) {
  return game?.user?.isGM === true || actor?.isOwner === true;
}

function resolveTargetForChat(context = {}, flags = {}) {
  const targetContext = context.targetContext ?? flags?.swse?.workflowContext?.targetContext ?? {};
  return context.target?.actor
    ?? context.target
    ?? tokenActorFromId(targetContext.tokenId)
    ?? actorFromId(targetContext.actorId)
    ?? actorFromId(flags?.swse?.workflowContext?.targetId)
    ?? actorFromId(context.targetId)
    ?? null;
}

function d20Result(roll) {
  return roll?.dice?.find?.(die => Number(die.faces) === 20)?.results?.[0]?.result
    ?? roll?.dice?.[0]?.results?.[0]?.result
    ?? null;
}

export function normalizeAttackChatPayload(payload = {}) {
  const context = payload.context ?? {};
  if (context.type !== 'attack') return payload;

  const roll = payload.roll;
  const natural = Number(d20Result(roll));
  const target = resolveTargetForChat(context, payload.flags ?? {});
  const defenseType = context.targetContext?.defenseType || payload.flags?.swse?.workflowContext?.attack?.defense || context.targetDefense || 'reflex';
  const resolvedDefense = Number.isFinite(Number(context.dc)) ? Number(context.dc) : defenseValue(target, defenseType);
  const hiddenDefense = target && !canSeeDefense(target);

  let isHit = context.success ?? context.passed ?? null;
  if (natural === 1) isHit = false;
  else if (natural === 20) isHit = true;
  else if (Number.isFinite(resolvedDefense)) isHit = Number(roll?.total) >= resolvedDefense;

  let isCritical = context.isCritical === true;
  if (natural === 1) isCritical = false;
  else if (natural === 20) isCritical = true;
  else if (isHit === false) isCritical = false;

  const outcomeLabel = natural === 1
    ? 'Miss'
    : isCritical
      ? 'Critical Hit'
      : isHit === true
        ? 'Hit'
        : isHit === false
          ? 'Miss'
          : (context.outcomeLabel || '');

  const patchedWorkflow = foundry.utils.mergeObject({ ...(payload.flags?.swse?.workflowContext ?? {}) }, {
    targetId: target?.id ?? payload.flags?.swse?.workflowContext?.targetId ?? null,
    targetName: target?.name ?? payload.flags?.swse?.workflowContext?.targetName ?? '',
    isCritical,
    damage: {
      ...(payload.flags?.swse?.workflowContext?.damage ?? {}),
      hit: isHit,
      crit: isCritical,
      natural1: natural === 1,
      natural20: natural === 20
    },
    attack: {
      ...(payload.flags?.swse?.workflowContext?.attack ?? {}),
      defense: defenseType
    }
  }, { inplace: false, recursive: true });

  const patchedContext = {
    ...context,
    target,
    targetName: target?.name ?? context.targetName ?? '',
    dc: hiddenDefense ? null : resolvedDefense,
    passed: isHit,
    success: isHit,
    isCritical,
    outcomeLabel,
    targetContext: {
      ...(context.targetContext ?? {}),
      actorId: target?.id ?? context.targetContext?.actorId ?? null,
      defenseType,
      defenseValue: hiddenDefense ? null : resolvedDefense,
      defenseHidden: hiddenDefense === true
    },
    workflowContext: patchedWorkflow
  };

  return {
    ...payload,
    context: patchedContext,
    flags: {
      ...(payload.flags ?? {}),
      swse: {
        ...(payload.flags?.swse ?? {}),
        workflowContext: patchedWorkflow
      }
    }
  };
}
