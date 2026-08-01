import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ReactionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js";
import { mergeCombatWorkflowContextIntoRollOptions, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { resolveDamagePacketType } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { AmmoSystem } from "/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js";
import { prepareCoreAttackOptionRollContext, spendCoreAttackOptionCosts } from "/systems/foundryvtt-swse/scripts/engine/feats/core-attack-option-action-economy.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { damageContextForReaction, damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";
// Canonical roll math — both this file and weapons-engine.js delegate here so
// tooltips/breakdowns always reflect the same formula as actual rolls.
import {
  resolveAttackBonus,
  resolveDamageBonus,
  getTargetActorFromOptions,
  rapidAlchemyState,
  weaponMatchesId
} from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { buildLedgerFromComponents, buildInvocationLedgerEntry } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/modifier-breakdown-builder.js";
import { AttackRollDiagnostics } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-roll-diagnostics.js";
import { resolveVehicleAttackBonus, resolveAbstractCrewAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-math.js";
import { resolveAttackDomain } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-domain-router.js";

// ============================================
// FILE: rolls/attacks.js (Upgraded for SWSE v13+)
// - Uses new Active Effects engine
// - Uses updated Actor data model
// - Integrates CT penalties, attack penalties, cover, etc.
// - Performance optimized, fail-safe, RAW-accurate
//
// Attack/damage bonus math lives in combat-roll-math.js (resolveAttackBonus /
// resolveDamageBonus). weapons-engine.js calls the same resolvers for
// tooltips, so breakdowns and rolls always agree.
// ============================================

function hasFightingDefensivelyEffect(actor) {
  return Array.from(actor?.effects ?? []).some(effect => effect?.flags?.swse?.combatAction === 'fighting-defensively');
}

async function clearRapidAlchemyDamageBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending || !weaponMatchesId(weapon, state.weaponId)) return;
  await actor?.setFlag?.('swse', 'rapidAlchemy', { ...state, sacrificePending: false, consumedAt: Date.now() });
}

function forceItemState(weapon) {
  return weapon?.getFlag?.('swse', 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? null;
}

function firstWeaponDamageDieFormula(weapon) {
  const formula = String(weapon?.system?.damage ?? weapon?.system?.damageFormula ?? '1d6');
  const match = formula.match(/(\d*)d(\d+)/i);
  if (!match) return '';
  return `1d${match[2]}`;
}

function forceItemExtraDamageFormula(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.empowered?.actorId ?? '') !== String(actor?.id ?? '')) return '';
  return firstWeaponDamageDieFormula(weapon);
}

function getFightingDefensivelyAttackPenalty(actor, options = {}) {
  const active = options?.fightingDefensively === true || hasFightingDefensivelyEffect(actor);
  if (!active) return 0;
  const preparedPenalty = Number(actor?.system?.attackPenalty ?? 0) || 0;
  return preparedPenalty <= -5 ? 0 : -5;
}

export function getTargetReflex(actor = null) {
  if (!actor) return null;
  // Canonical derived total first — system.defenses.* is legacy/stored
  // configuration (may retain a stale total from a previous sheet version
  // or an import) and must only be used as a compatibility fallback when no
  // derived total exists yet.
  const value = actor.system?.derived?.defenses?.reflex?.total
    ?? actor.system?.defenses?.reflex?.total
    ?? actor.system?.defenses?.reflex?.value
    ?? null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDefenseKey(value = 'reflex') {
  const key = String(value || 'reflex').toLowerCase();
  if (key === 'fort' || key === 'fortitude') return 'fortitude';
  if (key === 'will') return 'will';
  if (key === 'dc') return 'dc';
  return 'reflex';
}

export function getTargetDefense(actor = null, defenseType = 'reflex') {
  if (!actor) return null;
  const key = normalizeDefenseKey(defenseType);
  if (key === 'dc') return null;
  if (key === 'reflex') return getTargetReflex(actor);
  const value = actor.system?.derived?.defenses?.[key]?.total
    ?? actor.system?.defenses?.[key]?.total
    ?? actor.system?.defenses?.[key]?.value
    ?? null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveTargetContext(options = {}, fallbackTarget = null) {
  const ctx = options.targetContext ?? null;
  const mode = String(ctx?.mode || '').toLowerCase();
  if (mode === 'manual') {
    const value = Number(ctx?.defenseValue);
    return { target: null, targetName: ctx?.label || 'Manual Target', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: Number.isFinite(value) ? value + Number(ctx?.coverBonus || 0) : null, mode: 'manual' };
  }
  if (mode === 'none') {
    return { target: null, targetName: 'GM adjudication', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: null, mode: 'none' };
  }
  const target = fallbackTarget;
  const defenseType = normalizeDefenseKey(ctx?.defenseType || 'reflex');
  const base = getTargetDefense(target, defenseType);
  return { target, targetName: target?.name ?? '', defenseType, defenseValue: base, mode: target ? 'token' : 'none' };
}

function buildReactionContextForAttack(attacker, defender, weapon, attackTotal) {
  if (!attacker || !defender) return null;

  const damageContext = damageContextForReaction({ weapon });

  const available = ReactionEngine.getAvailableReactions(defender, {
    attacker,
    weapon,
    attackType: damageContext.attackType,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    sonicCannotBeDeflected: damageContext.sonicCannotBeDeflected,
    trigger: 'ON_ATTACK_DECLARED'
  });

  if (!available.length) return null;

  return {
    attacker,
    attackerId: attacker.id,
    defender,
    defenderId: defender.id,
    defenderName: defender.name,
    timerLabel: '6.0 s',
    reason: `Incoming ${damageContext.attackType} attack total ${attackTotal}.`,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    reactions: available.map(reaction => ({
      ...reaction,
      available: true,
      sublabel: reaction.key === 'block' || reaction.key === 'deflect' ? `DC ${attackTotal} · UTF` : ''
    }))
  };
}

function getPrimaryDamageDieFormula(baseFormula) {
  const match = String(baseFormula ?? '').match(/(?:^|[^\d])(\d*)d(\d+)/i);
  if (!match) return null;
  const sides = Number(match[2]);
  return Number.isFinite(sides) && sides > 0 ? `d${sides}` : null;
}

function buildExtraWeaponDiceFormula(baseFormula, extraDice) {
  const count = Number(extraDice ?? 0);
  if (!Number.isFinite(count) || count <= 0) return '';
  const die = getPrimaryDamageDieFormula(baseFormula);
  if (!die) return '';
  return ` + ${count}${die}`;
}

const DAMAGE_DIE_LADDER = [2, 3, 4, 6, 8, 10, 12];

function stepDamageDieFormula(baseFormula, steps = 0) {
  const count = Number(steps ?? 0);
  if (!Number.isFinite(count) || count === 0) return String(baseFormula ?? '1d6');
  return String(baseFormula ?? '1d6').replace(/(\d*)d(\d+)/gi, (match, diceCount, sidesText) => {
    const sides = Number(sidesText);
    const index = DAMAGE_DIE_LADDER.indexOf(sides);
    if (index < 0) return match;
    const nextIndex = Math.max(0, Math.min(DAMAGE_DIE_LADDER.length - 1, index + count));
    return `${diceCount || '1'}d${DAMAGE_DIE_LADDER[nextIndex]}`;
  });
}

/**
 * Roll an attack with a weapon using SWSE rules.
 *
 * Cost/commit stages for this workflow:
 * - On declaration: core attack-option action costs (spendCoreAttackOptionCosts).
 * - On declaration: ammunition (AmmoSystem.spendForWorkflow), after action costs.
 * - On successful roll execution: both costs are kept; the catch block below
 *   rolls both back if anything in the try block throws (including the
 *   attack roll itself failing), so a formula/roll error cannot leave costs
 *   spent for an attack that never happened.
 * - Hit/damage resolution is a separate workflow (rollDamage) and is not
 *   gated by this function's cost transaction.
 */
export async function rollAttack(actor, weapon, options = {}) {
  const rollOptions = prepareCoreAttackOptionRollContext(mergeCombatWorkflowContextIntoRollOptions(options, options?.combatContext ?? options?.workflowContext ?? null));
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? rollOptions, {
    actor,
    weapon,
    target: rollOptions.target ?? null,
    targetId: rollOptions.targetId ?? rollOptions.targetContext?.actorId ?? null,
    damageMode: rollOptions.damageMode ?? null,
    damageType: rollOptions.damageType ?? null,
    isStun: rollOptions.stun === true || rollOptions.damageMode === 'stun',
    isIon: rollOptions.ion === true,
    contextTags: rollOptions.damageMode === 'stun' || rollOptions.stun === true ? ['stun'] : []
  });
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const actionOptionSpend = await spendCoreAttackOptionCosts(actor, weapon, rollOptions);
  if (actionOptionSpend?.allowed === false || actionOptionSpend?.permitted === false) {
    ui?.notifications?.warn?.(actionOptionSpend.reason || 'Selected attack option action cost could not be paid.');
    return null;
  }
  let ammoSpend = null;

  try {
  ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options: rollOptions,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  const sequencePenalty = Number(rollOptions.sequencePenalty ?? 0);
  // attack-domain-router.js decides which existing math authority this
  // attack belongs to (character / vehicle-actor-gunner / vehicle-abstract-
  // crew) from normalized actor/item/context — not from which UI button
  // fired it — so a generic or future attack initiator can't silently rout
  // a vehicle actor through the character formula (the pre-Phase-3 defect)
  // just because it didn't go through crew-skill-router.js. The router only
  // selects an authority; the math still lives in combat-roll-math.js /
  // vehicle-attack-math.js exactly as before.
  const domainResolution = resolveAttackDomain({
    actor,
    item: weapon,
    operator: rollOptions.operator ?? null,
    vehicle: rollOptions.vehicleActor ?? null,
    sourceContext: { vehicleActor: rollOptions.vehicleActor ?? null, abstractCrewQuality: rollOptions.abstractCrewQuality ?? null }
  });
  for (const warning of domainResolution.warnings ?? []) {
    console.warn(`[SWSE] Attack domain routing: ${warning}`);
  }
  if (!domainResolution.ok) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.('Attack could not be resolved: no valid attack-domain context (' + domainResolution.reason + ').');
    return null;
  }
  const attackDomain = domainResolution.domain;
  const isVehicleAttack = attackDomain !== 'character';
  let attackBonusResolution;
  if (attackDomain === 'vehicle-actor-gunner') {
    const { gunnerActor, vehicleActor } = domainResolution.normalizedContext;
    attackBonusResolution = await resolveVehicleAttackBonus(gunnerActor, vehicleActor, weapon, rollOptions);
  } else if (attackDomain === 'vehicle-abstract-crew') {
    const { vehicleActor, crewQuality } = domainResolution.normalizedContext;
    attackBonusResolution = await resolveAbstractCrewAttackBonus(vehicleActor, weapon, crewQuality, rollOptions);
  } else {
    // Action-linked talent bonuses (TalentActionLinker) are keyed off the
    // action ID — prefer the caller-supplied actionId, falling back to the
    // one already derived onto workflowContext, so an attack fired through a
    // real action-card/full-attack-sequence path picks up its linked talent
    // bonus. A plain "Roll Attack" click with no options still resolves to
    // null here, unchanged from before.
    const resolvedActionId = rollOptions.actionId ?? workflowContext?.actionId ?? null;
    attackBonusResolution = resolveAttackBonus(actor, weapon, resolvedActionId, rollOptions);
  }
  if (isVehicleAttack) {
    for (const warning of attackBonusResolution.warnings ?? []) {
      console.warn(`[SWSE] Vehicle attack formula (${attackDomain}): ${warning}`);
    }
    if (attackBonusResolution.error) {
      if (ammoSpend?.spent) await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
      await actionOptionSpend?.rollback?.();
      ui?.notifications?.error?.(attackBonusResolution.error === 'invalid-vehicle-actor'
        ? 'Vehicle attack could not be resolved: the vehicle actor is missing or invalid, so its Intelligence modifier cannot be sourced.'
        : 'Vehicle attack could not be resolved: no valid gunner/operator actor.');
      return null;
    }
  }
  const fightingDefensivelyPenalty = getFightingDefensivelyAttackPenalty(actor, rollOptions);
  const atkBonus = attackBonusResolution.total + fightingDefensivelyPenalty + Number(rollOptions.customModifier || 0) + Number(rollOptions.situationalBonus || 0) + sequencePenalty;
  // Component ledger: baseline (resolver) components plus invocation-only
  // additions, clearly separated so a tooltip never claims an invocation-only
  // modifier is part of the static weapon baseline. Vehicle attacks already
  // arrive in full ledger shape from the vehicle resolvers; character
  // attacks are adapted from the legacy {label: value} map.
  const attackLedgerDomain = isVehicleAttack ? 'vehicle.attack' : 'combat.attack';
  const attackComponentLedger = [
    ...(isVehicleAttack ? attackBonusResolution.ledger : buildLedgerFromComponents(attackBonusResolution.components, 'combat.attack', 'baseline')),
    buildInvocationLedgerEntry('fighting-defensively', 'Fighting Defensively', fightingDefensivelyPenalty, attackLedgerDomain),
    buildInvocationLedgerEntry('custom-modifier', 'Custom Modifier', rollOptions.customModifier, attackLedgerDomain),
    buildInvocationLedgerEntry('situational-bonus', 'Situational Bonus', rollOptions.situationalBonus, attackLedgerDomain),
    buildInvocationLedgerEntry('sequence-penalty', 'Sequence Penalty', sequencePenalty, attackLedgerDomain)
  ].filter(Boolean);

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });

  const targetContextOptions = optionModifiers.targetDefenseType && !rollOptions.targetContext
    ? { ...rollOptions, targetContext: { defenseType: optionModifiers.targetDefenseType } }
    : rollOptions;
  const resolvedTarget = resolveTargetContext(targetContextOptions, getTargetActorFromOptions(rollOptions));
  const target = resolvedTarget.target;
  const targetReflex = resolvedTarget.defenseValue;
  const d20 = roll?.dice?.[0]?.results?.[0]?.result ?? null;
  const criticalThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  const critMultiplier = Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0);
  // AttackOutcomeResolver is the single authority for hit/critical/natural-1/
  // natural-20 interpretation — chat, damage workflow, rerolls, and reactions
  // all read from this same outcome object rather than re-deriving it.
  const outcome = AttackOutcomeResolver.resolve({
    naturalD20: d20,
    total: roll.total,
    targetDefense: targetReflex,
    criticalThreshold,
    critMultiplier
  });
  const isHit = outcome.hit;
  const isCritical = outcome.critical;
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, roll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, roll, {
    ...rollOptions,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target,
    // Carried through so a reroll can build a fresh, non-merged
    // AttackOutcomeResolver verdict instead of only replacing the total.
    targetDefense: targetReflex,
    criticalThreshold,
    critMultiplier
  });

  const damageWorkflowContext = summarizeCombatWorkflowContext(workflowContext, {
    actor,
    weapon,
    target,
    targetId: target?.id ?? null,
    targetName: resolvedTarget.targetName ?? target?.name ?? '',
    isCritical,
    critMultiplier,
    hit: isHit,
    natural1: outcome.automaticMiss,
    natural20: outcome.automaticHit,
    defense: resolvedTarget.defenseType ?? workflowContext?.attack?.defense ?? null
  });

  const attackMessage = rollOptions.suppressChat ? null : await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: {
      attackRoll: true,
      weaponId: weapon.id,
      attackRerollOptions,
      workflowContext: damageWorkflowContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      actionOptionSpend,
      // Reroll-supersession state (Phase 3 rolling-system alignment): a
      // successful reroll (meta-resource-feat-resolver.js
      // resolveAttackRerollButton) flips authoritative to false and stamps
      // superseded/supersededBy here.
      authoritative: true,
      superseded: false,
      supersededBy: null,
      revision: 0,
      // Full-attack/multi-attack sequence identity (Phase 4). Present only
      // when the caller declared a sequence (e.g. Double/Triple Attack via
      // combat-feature-handlers.js); null for an ordinary single attack.
      // Lets a reroll of one message in a sequence be proven independent of
      // its siblings, which already post as separate messages on this path.
      sequenceId: rollOptions.sequenceId ?? null,
      attackInstanceId: rollOptions.attackInstanceId ?? null,
      sequenceIndex: rollOptions.sequenceIndex ?? null,
      sequenceLength: rollOptions.sequenceLength ?? null
    } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      workflowContext: damageWorkflowContext,
      actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
      actionName: workflowContext?.actionName ?? null,
      attackRerollOptions,
      target,
      targetName: resolvedTarget.targetName ?? target?.name ?? '',
      targetContext: resolvedTarget,
      targetDefense: resolvedTarget.defenseType === 'dc' ? 'DC' : resolvedTarget.defenseType === 'fortitude' ? 'Fortitude' : resolvedTarget.defenseType === 'will' ? 'Will' : 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier,
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      sourceElement: rollOptions?.sourceElement ?? null,
      companionSource: rollOptions?.companionSource ?? null,
      sheet: rollOptions?.sheet ?? null,
      showRollCompanion: rollOptions?.showRollCompanion !== false
    }
  });

  if (outcome.automaticMiss) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (outcome.automaticHit) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  const attackResult = {
    roll,
    message: attackMessage,
    attackDomain,
    total: roll.total,
    atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    critThreat: isCritical,
    outcome,
    componentLedger: attackComponentLedger,
    concealmentMiss: false,
    concealmentMissChance: 0,
    confirmationRoll: null,
    d20,
    target,
    targetReflex,
    resolvedTarget,
    weaponId: weapon.id,
    weapon,
    critMultiplier,
    reactionContext,
    attackRerollOptions,
    workflowContext: damageWorkflowContext,
    actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
    actionData: rollOptions.actionData ?? null,
    // Full-attack/multi-attack sequence identity (Phase 4 rolling-system
    // alignment): stable ids threaded through from the declaring caller
    // (e.g. combat-feature-handlers.js#executeCombatFeatureMultiattack) so
    // one attack in a sequence can be identified/rerolled independently of
    // its siblings. Both are null for an ordinary single attack.
    sequenceId: rollOptions.sequenceId ?? null,
    attackInstanceId: rollOptions.attackInstanceId ?? null,
    sequenceIndex: rollOptions.sequenceIndex ?? null,
    sequenceLength: rollOptions.sequenceLength ?? null,
    targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
    targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
  };
  roll.swseAttackContext = {
    attackBonus: atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    natural1: outcome.automaticMiss,
    natural20: outcome.automaticHit,
    critMultiplier: attackResult.critMultiplier,
    targetDefenseValue: targetReflex,
    targetDefenseType: resolvedTarget.defenseType ?? null,
    defenseAdjustment: 0,
    workflowContext: damageWorkflowContext,
    actionId: attackResult.actionId
  };
  attackResult.ammoSpend = ammoSpend;
  attackResult.actionOptionSpend = actionOptionSpend;

  AttackRollDiagnostics.record({
    domain: 'combat.attack',
    // attackType now mirrors attack-domain-router.js's own vocabulary
    // ('character' | 'vehicle-actor-gunner' | 'vehicle-abstract-crew') so a
    // diagnostics snapshot shows exactly which resolver was selected and,
    // via domainReason/domainWarnings, why — rather than re-deriving a
    // coarser vehicle/character guess independently here.
    attackType: attackDomain,
    resolverSelected: domainResolution.resolver,
    domainReason: domainResolution.reason,
    domainWarnings: domainResolution.warnings,
    messageId: attackMessage?.id ?? null,
    messageRevision: attackMessage?.getFlag?.('swse', 'revision') ?? 0,
    messageAuthoritative: attackMessage?.getFlag?.('swse', 'authoritative') ?? null,
    messageSuperseded: attackMessage?.getFlag?.('swse', 'superseded') ?? null,
    actor,
    vehicleActor: rollOptions?.vehicleActor ?? (actor?.type === 'vehicle' ? actor : null),
    operator: rollOptions?.operator ?? rollOptions?.gunner ?? (actor?.type !== 'vehicle' ? actor : null),
    crewStation: rollOptions?.crewStation ?? null,
    item: weapon,
    target,
    naturalD20: d20,
    finalTotal: roll.total,
    formula: rollFormula,
    componentLedger: attackComponentLedger,
    forcePointReceipt: null,
    transactions: { ammoSpend, actionOptionSpend },
    outcome,
    damageWorkflowMetadata: damageWorkflowContext
  });

  return attackResult;
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    await actionOptionSpend?.rollback?.();
    throw err;
  }
}

/**
 * Roll damage for a weapon.
 */
export async function rollDamage(actor, weapon, options = {}) {
  const rollOptions = mergeCombatWorkflowContextIntoRollOptions(options, options?.combatContext ?? options?.workflowContext ?? null);
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for damage roll.');
    return null;
  }

  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? rollOptions, {
    actor,
    weapon,
    target: rollOptions.target ?? null,
    isCritical: rollOptions?.critical === true || rollOptions?.isCritical === true,
    damageMode: rollOptions.damageMode ?? null,
    damageType: rollOptions.damageType ?? null,
    isStun: rollOptions.stun === true || rollOptions.damageMode === 'stun',
    isIon: rollOptions.ion === true,
    contextTags: rollOptions.damageMode === 'stun' || rollOptions.stun === true ? ['stun'] : []
  });
  // optionModifiers is still needed for die-formula modifiers (damageDieStepIncreases,
  // damageExtraWeaponDice, criticalDamageDieStepBonus). The flat dmgBonus comes
  // from the canonical resolver which already incorporates optionModifiers.damageBonus.
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const dmgResult = resolveDamageBonus(actor, weapon, rollOptions);
  const dmgBonus = dmgResult.total;

  // A stock-statblock droid's published damage formula already includes its
  // own dice and REPLACES weapon.system.damage (see
  // resolveStockDroidDamageContract() in combat-roll-math.js) — it is a
  // fixed printed value, not subject to die-count/step increases.
  let formula;
  if (dmgResult.flags?.stockDamageFormula) {
    formula = dmgBonus !== 0 ? `${dmgResult.flags.stockDamageFormula} + ${dmgBonus}` : dmgResult.flags.stockDamageFormula;
  } else {
    const criticalStepBonus = (rollOptions?.critical === true || rollOptions?.isCritical === true) ? Number(optionModifiers.criticalDamageDieStepBonus || 0) : 0;
    const base = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', (optionModifiers.damageDieStepIncreases ?? 0) + criticalStepBonus);
    const extraDiceFormula = buildExtraWeaponDiceFormula(base, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
    formula = `${base}${extraDiceFormula} + ${dmgBonus}`;
  }

  const roll = await RollEngine.safeRoll(formula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.damage', context: { weaponId: weapon?.id ?? null } });

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Damage (${formula})`,
    flags: { swse: { damageRoll: true, weaponId: weapon.id, workflowContext } },
    context: { type: 'damage', weaponId: weapon.id, weapon, workflowContext, target: rollOptions.target ?? null, damageType: resolveDamagePacketType({ weapon, workflowContext, options: rollOptions }), sourceElement: rollOptions?.sourceElement ?? null, companionSource: rollOptions?.companionSource ?? null, sheet: rollOptions?.sheet ?? null, showRollCompanion: rollOptions?.showRollCompanion !== false, targetContext: rollOptions?.targetContext ?? null }
  });

  await clearRapidAlchemyDamageBonus(actor, weapon);

  return roll;
}

/**
 * Roll full attack (attack roll + optional crit threat handling)
 */
export async function rollFullAttack(actor, weapon, options = {}) {
  const attack = await rollAttack(actor, weapon, options);
  if (!attack) {return null;}

  const result = { attack, damage: null };

  // AttackOutcomeResolver (inside rollAttack above) already determined
  // critical threat from the natural d20; reuse that verdict instead of
  // re-deriving it here (attack.dice does not exist on the attack result —
  // this previously threw when this codepath ran).
  if (attack.outcome?.criticalThreat) {
    ui.notifications.info('Critical Threat!');
  }

  return result;
}

/* ============= Phase 4: Narration Wrappers ============= */

/**
 * Helper: get first targeted token name
 */
function _firstTargetName() {
  try {
    const t = Array.from(game.user.targets ?? []);
    if (!t.length) return null;
    return t[0]?.name ?? t[0]?.document?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Roll attack + damage together with narration
 * Does NOT reference defenses; narration is supplemental only
 */
export async function rollAttackAndDamageWithNarration(actor, weapon, options = {}) {
  const rollOptions = prepareCoreAttackOptionRollContext(options);
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const targetName = _firstTargetName();
  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? null, { actor, weapon });
  // See rollAttack()'s identical actionId authority order — a plain call
  // with no options still resolves to null here, unchanged from before.
  const resolvedActionId = rollOptions.actionId ?? workflowContext?.actionId ?? null;
  const atkBonus = resolveAttackBonus(actor, weapon, resolvedActionId, rollOptions).total;
  // optionModifiers still needed for die-formula and effect modifiers below.
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const dmgResult = resolveDamageBonus(actor, weapon, rollOptions);
  const dmgBonus = dmgResult.total;
  const actionOptionSpend = await spendCoreAttackOptionCosts(actor, weapon, rollOptions);
  if (actionOptionSpend?.allowed === false || actionOptionSpend?.permitted === false) {
    ui?.notifications?.warn?.(actionOptionSpend.reason || 'Selected attack option action cost could not be paid.');
    return null;
  }
  let ammoSpend = null;

  try {
  ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options: rollOptions,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  const rollFormula = `1d20 + ${atkBonus}`;
  // See rollDamage() above: a stock-statblock droid's published damage
  // formula replaces weapon.system.damage rather than adding to it.
  let dmgFormula;
  if (dmgResult.flags?.stockDamageFormula) {
    dmgFormula = dmgBonus !== 0 ? `${dmgResult.flags.stockDamageFormula} + ${dmgBonus}` : dmgResult.flags.stockDamageFormula;
  } else {
    const dmgBase = stepDamageDieFormula(weapon.system?.damage ?? weapon.damage ?? '1d6', optionModifiers.damageDieStepIncreases ?? 0);
    const dmgExtraDice = buildExtraWeaponDiceFormula(dmgBase, optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
    dmgFormula = `${dmgBase}${dmgExtraDice} + ${dmgBonus}`;
  }

  const attackRoll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });
  const damageRoll = await RollEngine.safeRoll(dmgFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.damage' });

  const atkTotal = attackRoll?.total;
  const dmgTotal = damageRoll?.total;

  // Post attack roll card
  const target = getTargetActorFromOptions(rollOptions);
  const targetReflex = getTargetReflex(target);
  const attackD20 = attackRoll?.dice?.[0]?.results?.[0]?.result ?? null;
  const attackCritThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  const attackCritMultiplier = Math.max(Number(weapon.system?.critMultiplier ?? weapon.system?.criticalMultiplier ?? 2) || 2, Number(optionModifiers.criticalMultiplierMin ?? 0) || 0);
  // Same AttackOutcomeResolver used by rollAttack(), so narration and this
  // combined attack+damage path agree on natural-1/natural-20/critical rules.
  const outcome = AttackOutcomeResolver.resolve({
    naturalD20: attackD20,
    total: attackRoll.total,
    targetDefense: targetReflex,
    criticalThreshold: attackCritThreshold,
    critMultiplier: attackCritMultiplier
  });
  const isHit = outcome.hit;
  const isCritical = outcome.critical;
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, attackRoll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, attackRoll, {
    ...rollOptions,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target,
    targetDefense: targetReflex,
    criticalThreshold: attackCritThreshold,
    critMultiplier: attackCritMultiplier
  });

  await SWSEChat.postRoll({
    roll: attackRoll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: {
      attackRoll: true,
      weaponId: weapon.id,
      attackRerollOptions,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      actionOptionSpend,
      authoritative: true,
      superseded: false,
      supersededBy: null,
      revision: 0
    } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      attackRerollOptions,
      target,
      targetName: target?.name ?? '',
      targetDefense: 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier: attackCritMultiplier,
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || []
    }
  });

  if (outcome.automaticMiss) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (outcome.automaticHit) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  // Post damage roll card
  await SWSEChat.postRoll({
    roll: damageRoll,
    actor,
    flavor: `${weapon.name} Damage`,
    context: { type: 'damage', weaponId: weapon.id, weapon, damageType: weapon.system?.damageType ?? weapon.system?.damage?.type ?? '' }
  });

  // Post supplemental narration (gated by setting)
  if (typeof atkTotal === "number" && typeof dmgTotal === "number") {
    try {
      const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
      await ActionChatEngine.narrationAttack(actor, weapon.name ?? "Weapon", atkTotal, dmgTotal, { targetName });
    } catch {
      // Narration engine not available; continue anyway
    }
  }

  return { attack: attackRoll, damage: damageRoll, outcome, ammoSpend, actionOptionSpend };
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    await actionOptionSpend?.rollback?.();
    throw err;
  }
}
