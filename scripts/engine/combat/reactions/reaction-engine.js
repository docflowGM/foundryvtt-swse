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
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
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
    uncannyinstincts: "uncannyInstincts"
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
  if (["unarmedParry", "unarmedCounterstrike", "retaliationJab", "primitiveBlock", "intimidatingDefense", "deepSpaceGambit", "lightsaberEvasion", "preternaturalSenses", "feignHarmlessness", "uncannyInstincts", "block", "deflect"].includes(nameKey)) {
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

// SWSEChat exposes postHTML(), not postMessage(). Presentation failures
// must not roll back a paid mechanical reaction or falsify its result.
function escapeReactionText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
async function postReactionStatus(actor, label, message, {failed=false}={}) {
  const kind=failed?'failure':'success';
  try {
    await SWSEChat.postHTML({
      actor,
      content: `<div class="swse-reaction-result swse-reaction-result--${kind}"><strong>${escapeReactionText(label)}</strong><p>${escapeReactionText(message)}</p></div>`
    });
  } catch (error) {
    SWSELogger.warn('[ReactionEngine] Reaction chat presentation failed', error);
  }
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
    if (reactionDef.trigger !== attackContext.trigger
      || !this._evaluateConditions(reactionDef.conditions, attackContext)
      || excluded) {
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
    const requiredForcePoints = Math.max(declaredForceCost, callerForceCost);

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
          await postReactionStatus(defender,reactionDef.label,
            `Reaction already used this ${cadence}`,{failed:true});
          return {
            success: false,
            error: limitCheck.reason,
            modifiedDamage: null,
            resultMessage: `Reaction already used this ${cadence}`
          };
        }
      }

      // Pay before invoking a handler. A reaction attempt consumes its cost
      // even when the handler's roll fails; do not grant a free effect and
      // then subtract a possibly stale pool value. The canonical spender
      // owns bonus-point allocation and the post-commit Temptation receipt.
      if (requiredForcePoints > 0) {
        const payment = await ActorEngine.spendForcePoints(
          defender, requiredForcePoints,
          { source: 'ReactionEngine.' + resolvedReactionKey }
        );
        if (payment?.spent !== requiredForcePoints) {
          const partiallySpent = Number(payment?.spent ?? 0) > 0;
          const reason = partiallySpent
            ? 'Reaction Force Point payment incomplete; GM review required'
            : 'Insufficient Force Points for this reaction';
          SWSELogger.warn('[ReactionEngine] BLOCKED paid reaction: ' + reason);
          return {
            success: false,
            error: reason,
            modifiedDamage: null,
            resultMessage: reason
          };
        }
      }

      let result = null;

      try {
        const enrichedContext = {
          ...attackContext,
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

      // A paid attempt is still a committed spend if the handler fails.
      // The spender has already emitted its receipt. Do not report a failed
      // handler as a successful reaction or consume its per-round limit.
      if (result?.success === false || result?.error) {
        return {
          success: false,
          error: result?.error ?? result?.message ?? 'Reaction handler failed',
          modifiedDamage: null,
          resultMessage: result?.resultMessage ?? null
        };
      }

      if (limitType) {
        ActivationLimitEngine.recordActivation(defender, resolvedReactionKey, limitType);
      }

      const resultMsg = result?.resultMessage ?? `${reactionDef.label} triggered`;
      await postReactionStatus(defender,reactionDef.label,resultMsg);

      SWSELogger.log(`[ReactionEngine] SUCCESS: "${resolvedReactionKey}" resolved for ${defender.name}`);

      return {
        success: true,
        error: null,
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
