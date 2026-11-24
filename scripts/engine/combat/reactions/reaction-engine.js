/**
 * ReactionEngine
 *
 * Handles reaction eligibility and resolution.
 * Phase 1: Skeleton only - eligibility checking and plumbing.
 * Phase 5: Added cost validation, frequency checking, effect application.
 *
 * Governance:
 * - No direct ChatMessage.create()
 * - All actor mutations route through ActorEngine
 * - No DOM mutation
 * - Pure eligibility evaluation
 * - Handlers return result objects only
 */

import { ReactionRegistry } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-registry.js";
import { ReactionRuleAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-rule-adapter.js";
import { ActivationLimitEngine, LimitType } from "/systems/foundryvtt-swse/scripts/engine/abilities/ActivationLimitEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { settleForcePointReceipt } from "/systems/foundryvtt-swse/scripts/engine/force/force-point-settlement.js";
import { postNoticeCard } from "/systems/foundryvtt-swse/scripts/chat/notice-card.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { AttackEventAuthority } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/attack-event-authority.js";
import { damageTypesMatch, expandDamageTypeAliases, uniqueDamageTypes } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

function normalizeReactionKey(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const key = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const aliases = {
    block: "block",
    deflect: "deflect",
    counterattack: "counterattack",
    "force-reflection": "forceReflection",
    forcerreflection: "forceReflection",
    evasion: "evasion",
    "unarmed-parry": "unarmedParry",
    unarmedparry: "unarmedParry",
    "unarmed-counterstrike": "unarmedCounterstrike",
    unarmedcounterstrike: "unarmedCounterstrike",
    "retaliation-jab": "retaliationJab",
    retaliationjab: "retaliationJab",
    "primitive-block": "primitiveBlock",
    primitiveblock: "primitiveBlock",
    "intimidating-defense": "intimidatingDefense",
    intimidatingdefense: "intimidatingDefense",
    "deep-space-gambit": "deepSpaceGambit",
    deepspacegambit: "deepSpaceGambit",
    "lightsaber-evasion": "lightsaberEvasion",
    lightsaberevasion: "lightsaberEvasion",
    "preternatural-senses": "preternaturalSenses",
    preternaturalsenses: "preternaturalSenses",
    "feign-harmlessness": "feignHarmlessness",
    feignharmlessness: "feignHarmlessness",
    "uncanny-instincts": "uncannyInstincts",
    uncannyinstincts: "uncannyInstincts",
    "force-fortification": "forceFortification",
    forcefortification: "forceFortification"
  };
  return aliases[key] ?? raw;
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectItemReactionKeys(item) {
  const keys = [];
  const meta = item?.system?.abilityMeta ?? {};
  const push = value => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (typeof value === "object") {
      push(value.key ?? value.id ?? value.reactionKey ?? value.registryKey);
      return;
    }
    const normalized = normalizeReactionKey(value);
    if (normalized) keys.push(normalized);
  };

  push(meta.reactionKey);
  push(meta.reactionKeys);
  push(meta.reactions);
  push(meta.grantedReactions);

  for (const card of [
    ...(Array.isArray(meta.combatActions) ? meta.combatActions : []),
    ...(Array.isArray(meta.actionCards) ? meta.actionCards : []),
    ...(Array.isArray(meta.grantedCombatActions) ? meta.grantedCombatActions : [])
  ]) {
    if (card?.reactionKey) push(card.reactionKey);
    else if (card?.resolutionMode === "reaction") push(card.id ?? card.key ?? card.name);
  }

  const nameKey = normalizeReactionKey(item?.name);
  if (["unarmedParry", "unarmedCounterstrike", "retaliationJab", "primitiveBlock", "intimidatingDefense", "deepSpaceGambit", "lightsaberEvasion", "preternaturalSenses", "feignHarmlessness", "uncannyInstincts", "block", "deflect", "forceFortification"].includes(nameKey)) {
    keys.push(nameKey);
  }

  return keys;
}

function ensureMetadataBackedReactionsRegistered(actor) {
  try {
    return ReactionRuleAdapter.ensureActorReactionRulesRegistered(actor);
  } catch (err) {
    SWSELogger?.warn?.("[ReactionEngine] Failed to register metadata-backed reactions", { error: err?.message ?? err });
    return [];
  }
}

function collectActorReactionKeys(actor) {
  const keys = new Set();
  const derived = actor?.system?.derived?.reactions;
  if (Array.isArray(derived)) {
    for (const key of derived) {
      const normalized = normalizeReactionKey(key);
      if (normalized) keys.add(normalized);
    }
  }

  for (const item of actorItems(actor)) {
    if (item?.system?.disabled === true) continue;
    for (const key of collectItemReactionKeys(item)) {
      if (key) keys.add(key);
    }
  }

  for (const key of ReactionRuleAdapter.collectActorReactionKeys(actor)) {
    if (key) keys.add(key);
  }

  return Array.from(keys);
}

function getRegisteredReactionForActor(actor, reactionKey) {
  const rawKey = String(reactionKey ?? "").trim();
  const normalizedKey = normalizeReactionKey(rawKey);
  if (actor) ensureMetadataBackedReactionsRegistered(actor);
  return ReactionRegistry.getReaction(rawKey)
    ?? ReactionRegistry.getReaction(normalizedKey)
    ?? null;
}

export class ReactionEngine {
  /**
   * Get available reactions for a defender in a given attack context.
   */
  static getAvailableReactions(defender, attackContext = {}) {
    if (!defender) return [];

    ensureMetadataBackedReactionsRegistered(defender);

    const reactionKeys = collectActorReactionKeys(defender);
    if (!Array.isArray(reactionKeys) || reactionKeys.length === 0) return [];

    const available = [];

    for (const reactionKey of reactionKeys) {
      const reactionDef = ReactionRegistry.getReaction(reactionKey) ?? ReactionRegistry.getReaction(normalizeReactionKey(reactionKey));

      if (!reactionDef) {
        console.warn(`ReactionEngine: Reaction "${reactionKey}" not found in registry`);
        continue;
      }

      if (reactionDef.trigger !== attackContext.trigger) continue;
      if (!this._evaluateConditions(reactionDef.conditions, attackContext)) continue;
      // Phase 5D-H: the attacking weapon form's CANNOT_NEGATE_ATTACK relation excludes the negation ability (and, by family, abilities
      // that have it as a prerequisite) by ability identity
      const refused = attackContext.cannotBeNegatedBy ?? [];
      if (refused.length && ((reactionDef.negationAbility && refused.includes(reactionDef.negationAbility))
        || (reactionDef.negationFamily && refused.includes(`talents-with-${reactionDef.negationFamily}-as-prerequisite`)))) continue;

      available.push({
        key: reactionDef.key,
        label: reactionDef.label,
        description: reactionDef.description,
        trigger: reactionDef.trigger
      });
    }

    return available;
  }

  static _evaluateConditions(conditions, attackContext) {
    if (!conditions) return true;

    if (conditions.validAttackTypes && Array.isArray(conditions.validAttackTypes)) {
      if (conditions.validAttackTypes.length > 0 && !conditions.validAttackTypes.includes(attackContext.attackType)) return false;
    }

    const attackDamageTypes = expandDamageTypeAliases(uniqueDamageTypes([
      attackContext.damageTypes,
      attackContext.damageType,
      attackContext.originalDamageTypes
    ]));
    const originalDamageTypes = uniqueDamageTypes(attackContext.originalDamageTypes ?? attackContext.damageTypes ?? attackContext.damageType);

    if (conditions.validDamageTypes && Array.isArray(conditions.validDamageTypes) && conditions.validDamageTypes.length > 0) {
      if (!damageTypesMatch(attackDamageTypes, conditions.validDamageTypes)) return false;
    }

    if (conditions.excludedDamageTypes && Array.isArray(conditions.excludedDamageTypes) && conditions.excludedDamageTypes.length > 0) {
      if (damageTypesMatch(originalDamageTypes, conditions.excludedDamageTypes)) return false;
    }

    if (conditions.rejectSonicDeflection === true && attackContext.sonicCannotBeDeflected === true) return false;

    if (conditions.requiresFightingDefensively === true) {
      if (attackContext.fightingDefensively !== true && attackContext.defenderFightingDefensively !== true) return false;
    }

    if (conditions.requiresNotFlatFooted === true) {
      if (attackContext.flatFooted === true || attackContext.defenderFlatFooted === true) return false;
    }

    if (conditions.requiresAttackMissed === true) {
      if (attackContext.attackMissed !== true && attackContext.missed !== true) return false;
    }

    if (conditions.requiresReactionKey && attackContext.reactionKey !== conditions.requiresReactionKey) return false;

    if (conditions.requiresWeaponText) {
      const wanted = (Array.isArray(conditions.requiresWeaponText) ? conditions.requiresWeaponText : [conditions.requiresWeaponText])
        .map(normalizeText)
        .filter(Boolean);
      const weapon = attackContext.weapon ?? attackContext.item ?? attackContext.attackItem ?? null;
      const weaponText = [
        weapon?.name,
        weapon?.system?.weaponType,
        weapon?.system?.weaponGroup,
        weapon?.system?.category,
        weapon?.system?.type,
        ...(Array.isArray(weapon?.system?.properties) ? weapon.system.properties : [])
      ].map(normalizeText).join(" ");
      if (wanted.length && !wanted.some(value => weaponText.includes(value))) return false;
    }

    return true;
  }

  static async resolveReaction(options = {}) {
    const { reactionKey, defender, attacker, attackContext = {}, forcePointCost = 0 } = options;

    if (!reactionKey) {
      return {
        success: false,
        error: 'No reaction key provided',
        modifiedDamage: null,
        resultMessage: null
      };
    }

    if (!defender) {
      return {
        success: false,
        error: 'No defender provided',
        modifiedDamage: null,
        resultMessage: null
      };
    }

    const reactionDef = getRegisteredReactionForActor(defender, reactionKey);

    if (!reactionDef) {
      return {
        success: false,
        error: `Reaction "${reactionKey}" not found`,
        modifiedDamage: null,
        resultMessage: null
      };
    }

    const resolvedReactionKey = reactionDef.key ?? normalizeReactionKey(reactionKey);

    // Global registry presence is not an actor entitlement. Recheck the
    // same owned/derived reaction keys used by the offer UI before payment:
    // chat buttons can be stale and a reaction key can be submitted directly.
    const ownedKeys = collectActorReactionKeys(defender);
    if (!ownedKeys.some(key => normalizeReactionKey(key) === normalizeReactionKey(resolvedReactionKey))) {
      return {
        success: false,
        error: 'Defender does not own this reaction',
        modifiedDamage: null,
        resultMessage: null
      };
    }
    if (globalThis.game?.user?.isGM !== true && defender.isOwner === false) {
      return {
        success: false,
        error: 'Current user cannot control the defender',
        modifiedDamage: null,
        resultMessage: null
      };
    }
    // The offer UI filters these already, but the execution boundary must
    // repeat them. A stale/wrong attack type or descriptor is not a paid
    // reaction; do not invoke the handler or spend Force Points.
    const refused = attackContext.cannotBeNegatedBy ?? [];
    const excluded = Array.isArray(refused) && refused.length
      && ((reactionDef.negationAbility && refused.includes(reactionDef.negationAbility))
      || (reactionDef.negationFamily && refused.includes(
        `talents-with-${reactionDef.negationFamily}-as-prerequisite`
      )));
    // Block / Deflect / Force Fortification are authorized by the attacker-side VERIFIED attack event (AttackEventAuthority below: attack
    // type, hit/critical, defender, single use). For them the chat dataset is only a lookup key, so it is not re-judged here.
    const eventVerified = ['block', 'deflect', 'forceFortification'].includes(resolvedReactionKey);
    if (!eventVerified && (reactionDef.trigger !== attackContext.trigger
      || !this._evaluateConditions(reactionDef.conditions, attackContext)
      || excluded)) {
      return {
        success: false,
        error: 'Reaction is not eligible for the current attack',
        modifiedDamage: null,
        resultMessage: null
      };
    }

    // The registered rule is the authoritative reaction cost. The optional
    // legacy caller cost may increase it, but cannot waive a printed cost.
    const declaredForceCost = Number(reactionDef.cost?.forcePoints ?? 0);
    const callerForceCost = Number(forcePointCost ?? 0);
    if (![declaredForceCost, callerForceCost].every(
      cost => Number.isSafeInteger(cost) && cost >= 0
    )) {
      return {
        success: false,
        error: 'Invalid reaction Force Point cost',
        modifiedDamage: null,
        resultMessage: null
      };
    }

    // The registered rule is the authoritative cost: a caller that omits (or understates) forcePointCost cannot waive it.
    const effectiveForceCost = Math.max(declaredForceCost, callerForceCost);

    try {
      const usage = reactionDef.usage ?? {};
      const limitType = usage.perEncounter === true
        ? LimitType.ENCOUNTER
        : usage.perRound === true
          ? LimitType.ROUND
          : null;
      const maxUses = usage.perEncounter === true
        ? Number(usage.maxPerEncounter ?? usage.maxPerRound ?? 1)
        : Number(usage.maxPerRound ?? 1);

      if (limitType) {
        const limitCheck = ActivationLimitEngine.canActivate(
          defender,
          resolvedReactionKey,
          limitType,
          Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 1
        );

        if (!limitCheck.allowed) {
          const cadence = limitType === LimitType.ENCOUNTER ? 'encounter' : 'round';
          SWSELogger.log(`[ReactionEngine] BLOCKED "${resolvedReactionKey}": ${limitCheck.reason}`);
          await postNoticeCard({
            flavor: `❌ ${reactionDef.label}`,
            content: `Reaction already used this ${cadence}`,
            actor: defender
          });
          return {
            success: false,
            error: limitCheck.reason,
            modifiedDamage: null,
            resultMessage: `Reaction already used this ${cadence}`
          };
        }
      }

      // Block/Deflect answer a real incoming attack: the chat-button dataset (event id,
      // DC, total) is only a lookup key. Authority is the attacker-side event record,
      // re-read here; nothing client-supplied about the attack survives into the handler.
      let verifiedAttackEvent = null;
      if (['block', 'deflect', 'forceFortification'].includes(resolvedReactionKey)) {
        const verdict = AttackEventAuthority.verify({
          defender,
          attackerId: attackContext.attackerId ?? attacker?.id,
          eventId: attackContext.attackEventId ?? attackContext.eventId,
          reactionKey: resolvedReactionKey
        });
        if (!verdict.valid) {
          SWSELogger.log(`[ReactionEngine] BLOCKED "${resolvedReactionKey}": ${verdict.message}`);
          await postNoticeCard({ flavor: `❌ ${reactionDef.label}`, content: verdict.message, actor: defender });
          return { success: false, error: verdict.message, modifiedDamage: null, resultMessage: verdict.message };
        }
        verifiedAttackEvent = verdict.event;
        if (resolvedReactionKey === 'forceFortification' && !(verifiedAttackEvent.hit === true && verifiedAttackEvent.critical === true)) {
          const message = 'Force Fortification answers a critical hit scored against you';
          await postNoticeCard({ flavor: `❌ ${reactionDef.label}`, content: message, actor: defender });
          return { success: false, error: message, modifiedDamage: null, resultMessage: message };
        }
      }

      // A reaction that costs Force Points is authorized by ForcePointsService and paid
      // only through ActorEngine's exact receipt (no direct balance write here).
      let forcePointReceipt = null;
      if (effectiveForceCost > 0) {   // no caller-supplied 'already paid' marker: payment is always this engine's own receipt
        const spendContext = { useKind: 'ability-option', abilitySourceRef: `reaction:${resolvedReactionKey}`, gmAdjudication: options.gmAdjudication };
        const decision = ForcePointsService.authorizeSpend(defender, { ...spendContext, requestedCount: effectiveForceCost });
        if (!decision.valid || effectiveForceCost !== 1) {
          const reason = decision.valid ? 'Only a single Force Point reaction cost is supported' : decision.message;
          SWSELogger.log(`[ReactionEngine] BLOCKED "${resolvedReactionKey}": ${reason}`);
          await postNoticeCard({ flavor: `❌ ${reactionDef.label}`, content: reason, actor: defender });
          return { success: false, error: reason, modifiedDamage: null, resultMessage: reason };
        }
        try {
          forcePointReceipt = await ActorEngine.spendForcePoints(defender, effectiveForceCost, spendContext);
        } catch (spendError) {
          return { success: false, error: spendError.message, modifiedDamage: null, resultMessage: spendError.message };
        }
      }

      // Single use: claim the event before the (long, interactive) handler runs so a double
      // click or a second client cannot answer the same attack twice.
      if (verifiedAttackEvent && resolvedReactionKey !== 'forceFortification') {
        const claim = await AttackEventAuthority.consume(defender, verifiedAttackEvent.id);
        if (!claim.consumed) {
          if (forcePointReceipt) await ActorEngine.rollbackForcePointSpend(defender, forcePointReceipt);
          return { success: false, error: claim.reason, modifiedDamage: null, resultMessage: claim.reason };
        }
      }

      let result = null;

      try {
        const enrichedContext = {
          ...attackContext,
          ...(verifiedAttackEvent ? {
            attackEventId: verifiedAttackEvent.id,
            verifiedAttackEvent,
            dc: verifiedAttackEvent.attackTotal,
            attackTotal: verifiedAttackEvent.attackTotal
          } : {}),
          defender,
          attacker
        };
        result = await reactionDef.handler(enrichedContext);
      } catch (err) {
        SWSELogger.error(`[ReactionEngine] Handler error for "${resolvedReactionKey}":`, err);
        result = {
          error: err.message,
          modifiedDamage: null,
          resultMessage: null
        };
      }

      if (verifiedAttackEvent && result?.error && resolvedReactionKey !== 'forceFortification') {
        await ActorEngine.releaseAttackEventAsDefender(defender, verifiedAttackEvent.id);
      }

      // Exact receipt lifecycle: a handler that failed gives back exactly what was paid; a handler that completed finalizes the
      // (now non-refundable) spend. The outcome is EXPLICIT: an unresolved settlement is reported, never hidden behind a success.
      let paymentSettlement = forcePointReceipt ? 'settled' : 'none';
      if (forcePointReceipt) {
        const wantRollback = Boolean(result?.error);
        const settled = await settleForcePointReceipt(defender, forcePointReceipt, wantRollback ? 'rollback' : 'finalize');
        if (!settled) {
          paymentSettlement = 'unresolved';
          SWSELogger.error(`[ReactionEngine] Force Point ${wantRollback ? 'compensation' : 'finalization'} unresolved for receipt ${forcePointReceipt.receiptId}; GM reconciliation required`);
        }
      }

      if (limitType && !result?.error) {
        ActivationLimitEngine.recordActivation(defender, resolvedReactionKey, limitType);
      }

      const unresolvedNote = paymentSettlement === 'unresolved'
        ? (result?.error
          ? ' The Force Point paid for this failed reaction could not be returned automatically: GM reconciliation required.'
          : ' The Force Point receipt could not be finalized automatically: GM reconciliation required (the reaction was applied and is not refunded).')
        : '';
      const resultMsg = (result?.resultMessage ?? `${reactionDef.label} triggered`) + unresolvedNote;
      await postNoticeCard({
        flavor: `${paymentSettlement === 'unresolved' ? '⚠' : '✓'} ${reactionDef.label}`,
        content: resultMsg,
        actor: defender
      });

      SWSELogger.log(`[ReactionEngine] SUCCESS: "${resolvedReactionKey}" resolved for ${defender.name}`);

      return {
        success: !result?.error,
        paymentSettlement,
        error: result?.error ? result.error + unresolvedNote : null,
        modifiedDamage: result?.modifiedDamage ?? null,
        resultMessage: resultMsg
      };

    } catch (err) {
      SWSELogger.error(`[ReactionEngine] Unexpected error resolving "${reactionKey}":`, err);
      return {
        success: false,
        error: `Unexpected error: ${err.message}`,
        modifiedDamage: null,
        resultMessage: null
      };
    }
  }

  static resetRoundState(combat) {
    if (!combat) return;

    const combatants = combat.combatants ?? [];

    for (const combatant of combatants) {
      const actor = combatant.actor;
      if (!actor) continue;
      ActivationLimitEngine.resetRoundLimits(actor);
    }

    SWSELogger.log(`[ReactionEngine] Round state reset for ${combatants.length} combatants`);
  }

  static getActorReactions(actor, combat = null) {
    if (!actor) return [];
    ensureMetadataBackedReactionsRegistered(actor);
    return collectActorReactionKeys(actor);
  }

  /* ============================================================
     PHASE 6/7: COMPATIBILITY SHIMS FOR CHAT-DRIVEN REACTIONS
  ============================================================ */

  static async _resolveReactionInternal(options = {}) {
    const normalized = this._swseNormalizeReactionOptions(options);
    const reactionKey = normalized.reactionKey;
    const defender = normalized.defender;
    const attacker = normalized.attacker ?? null;
    const attackContext = normalized.attackContext ?? {};

    const entry = getRegisteredReactionForActor(defender, reactionKey);

    if (!entry) {
      ui?.notifications?.warn?.(`No reaction handler found for ${reactionKey}`);
      return null;
    }

    if (typeof entry.handler === "function") {
      const result = await entry.handler({
        reactionKey,
        defender,
        attacker,
        attackContext
      });

      return await this._finalizeReactionEvent(normalized, result ?? {});
    }

    ui?.notifications?.warn?.(`Reaction ${reactionKey} has no executable handler.`);
    return null;
  }

  /* ============================================================
     PHASE 8/9/10: EVENT-BOUND REACTION FINALIZATION BRIDGE
  ============================================================ */

  static async _finalizeReactionEvent(options = {}, result = {}) {
    const attackContext = options.attackContext ?? {};
    const eventId =
      attackContext.eventId ??
      attackContext.attackEventId ??
      options.eventId ??
      null;

    if (!eventId || !globalThis.SWSEChatEventBridge) return result;

    const state =
      result.eventState ??
      result.state ??
      (result.success === true ? "success" :
       result.success === false ? "failure" :
       "final");

    const resolutionLabel =
      result.resolutionLabel ??
      (state == "success" ? "Reaction Resolved" :
       state == "failure" ? "Reaction Failed" :
       "Final Result");

    const reactionResultText =
      result.reactionResultText ??
      result.resultMessage ??
      result.message ??
      result.summary ??
      "";

    await globalThis.SWSEChatEventBridge.updateMessageCard(eventId, {
      eventState: "final",
      resolutionLabel,
      reactionLabel: "",
      reactionResultText: reactionResultText || resolutionLabel
    });

    return result;
  }

  /* ============================================================
     PHASE 11: REACTION ENGINE SAFETY FALLBACKS
  ============================================================ */

  static _swseNormalizeReactionOptions(options = {}) {
    return {
      reactionKey: options.reactionKey ?? options.key ?? "",
      defender: options.defender ?? options.actor ?? null,
      attacker: options.attacker ?? null,
      attackContext: options.attackContext ?? {},
      sourceMessage: options.sourceMessage ?? null,
      eventId:
        options.eventId ??
        options.attackContext?.eventId ??
        options.attackContext?.attackEventId ??
        null
    };
  }
}
