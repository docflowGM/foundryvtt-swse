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
import { ActivationLimitEngine, LimitType } from "/systems/foundryvtt-swse/scripts/engine/abilities/ActivationLimitEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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

  return Array.from(keys);
}

export class ReactionEngine {
  /**
   * Get available reactions for a defender in a given attack context
   *
   * Phase 1: Returns metadata only. Does not execute handlers.
   *
   * @param {Actor} defender - The defending actor
   * @param {Object} attackContext - Context of the attack
   *   - attacker: Actor
   *   - weapon: Item
   *   - attackType: 'melee' | 'ranged'
   *   - damageTypes: string[]
   *   - trigger: 'ON_ATTACK_DECLARED'
   * @returns {Object[]} Array of available reaction metadata
   */
  static getAvailableReactions(defender, attackContext = {}) {
    if (!defender) {
      return [];
    }

    // Get defender reaction keys from derived data and owned ability metadata.
    // Talent/feat cleanup phases surface reaction-capable abilities via
    // abilityMeta rather than mutating permanent derived data.
    const reactionKeys = collectActorReactionKeys(defender);
    if (!Array.isArray(reactionKeys) || reactionKeys.length === 0) {
      return [];
    }

    const available = [];

    for (const reactionKey of reactionKeys) {
      const reactionDef = ReactionRegistry.getReaction(reactionKey);

      if (!reactionDef) {
        console.warn(`ReactionEngine: Reaction "${reactionKey}" not found in registry`);
        continue;
      }

      // Check if reaction's trigger matches
      if (reactionDef.trigger !== attackContext.trigger) {
        continue;
      }

      // Evaluate conditions
      if (!this._evaluateConditions(reactionDef.conditions, attackContext)) {
        continue;
      }

      // Passed all checks - reaction is available
      available.push({
        key: reactionDef.key,
        label: reactionDef.label,
        description: reactionDef.description,
        trigger: reactionDef.trigger
      });
    }

    return available;
  }

  /**
   * Evaluate reaction conditions against attack context
   * Phase 1: Basic condition checking only
   *
   * @private
   * @param {Object} conditions
   * @param {Object} attackContext
   * @returns {boolean}
   */
  static _evaluateConditions(conditions, attackContext) {
    if (!conditions) {
      return true;
    }

    // Check attack type restrictions
    if (conditions.validAttackTypes && Array.isArray(conditions.validAttackTypes)) {
      if (conditions.validAttackTypes.length > 0) {
        if (!conditions.validAttackTypes.includes(attackContext.attackType)) {
          return false;
        }
      }
    }

    // Check damage type restrictions
    if (conditions.validDamageTypes && Array.isArray(conditions.validDamageTypes)) {
      if (conditions.validDamageTypes.length > 0) {
        const attackDamageTypes = attackContext.damageTypes || [];
        const hasValidType = conditions.validDamageTypes.some(dt =>
          attackDamageTypes.includes(dt)
        );
        if (!hasValidType) {
          return false;
        }
      }
    }

    if (conditions.requiresFightingDefensively === true) {
      if (attackContext.fightingDefensively !== true && attackContext.defenderFightingDefensively !== true) {
        return false;
      }
    }

    if (conditions.requiresNotFlatFooted === true) {
      if (attackContext.flatFooted === true || attackContext.defenderFlatFooted === true) {
        return false;
      }
    }

    if (conditions.requiresAttackMissed === true) {
      if (attackContext.attackMissed !== true && attackContext.missed !== true) {
        return false;
      }
    }

    if (conditions.requiresReactionKey && attackContext.reactionKey !== conditions.requiresReactionKey) {
      return false;
    }

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
      if (wanted.length && !wanted.some(value => weaponText.includes(value))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Resolve a reaction - PHASE 5 Enhanced version
   *
   * Pipeline:
   * 1. Validate reaction exists
   * 2. Check frequency limit (once per round)
   * 3. Verify cost available (Force Points if applicable)
   * 4. Call reaction handler
   * 5. Deduct cost
   * 6. Record activation
   * 7. Post result to chat
   *
   * @param {Object} options - Resolution options
   *   - reactionKey: string (Reaction ID)
   *   - defender: Actor (reacting defender)
   *   - attacker: Actor (attacking actor)
   *   - attackContext: Object (attack details)
   *   - forcePointCost: number (optional, default 0)
   *
   * @returns {Promise<Object>} Resolution result
   *   - success: boolean
   *   - error: string | null
   *   - modifiedDamage: number | null
   *   - resultMessage: string | null
   */
  static async resolveReaction(options = {}) {
    const { reactionKey, defender, attacker, attackContext = {}, forcePointCost = 0 } = options;

    // ─── 1. Validate reaction exists ─────────────────────────────────────────
    if (!reactionKey) {
      return {
        success: false,
        error: 'No reaction key provided',
        modifiedDamage: null,
        resultMessage: null
      };
    }

    const reactionDef = ReactionRegistry.getReaction(reactionKey);

    if (!reactionDef) {
      return {
        success: false,
        error: `Reaction "${reactionKey}" not found`,
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

    try {
      // ─── 2. Check frequency limit ────────────────────────────────────────
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
          reactionKey,
          limitType,
          Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 1
        );

        if (!limitCheck.allowed) {
          const cadence = limitType === LimitType.ENCOUNTER ? 'encounter' : 'round';
          SWSELogger.log(`[ReactionEngine] BLOCKED "${reactionKey}": ${limitCheck.reason}`);
          await SWSEChat.postMessage({
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

      // ─── 3. Verify cost ───────────────────────────────────────────────────
      if (forcePointCost > 0) {
        const currentForce = defender.system?.forcePoints?.value ?? 0;
        if (currentForce < forcePointCost) {
          const reason = `Insufficient Force Points (need ${forcePointCost}, have ${currentForce})`;
          SWSELogger.log(`[ReactionEngine] BLOCKED "${reactionKey}": ${reason}`);
          await SWSEChat.postMessage({
            flavor: `❌ ${reactionDef.label}`,
            content: reason,
            actor: defender
          });
          return {
            success: false,
            error: reason,
            modifiedDamage: null,
            resultMessage: reason
          };
        }
      }

      // ─── 4. Call reaction handler ──────────────────────────────────────────
      let result = null;

      try {
        const enrichedContext = {
          ...attackContext,
          defender,
          attacker
        };
        result = await reactionDef.handler(enrichedContext);
      } catch (err) {
        SWSELogger.error(`[ReactionEngine] Handler error for "${reactionKey}":`, err);
        result = {
          error: err.message,
          modifiedDamage: null,
          resultMessage: null
        };
      }

      // ─── 5. Deduct cost ───────────────────────────────────────────────────
      if (forcePointCost > 0) {
        await ActorEngine.updateActor(defender, {
          'system.forcePoints.value': Math.max(0, (defender.system?.forcePoints?.value ?? 0) - forcePointCost)
        });
      }

      // ─── 6. Record activation ──────────────────────────────────────────────
      if (limitType) {
        ActivationLimitEngine.recordActivation(defender, reactionKey, limitType);
      }

      // ─── 7. Post result ────────────────────────────────────────────────────
      const resultMsg = result?.resultMessage ?? `${reactionDef.label} triggered`;
      await SWSEChat.postMessage({
        flavor: `✓ ${reactionDef.label}`,
        content: resultMsg,
        actor: defender
      });

      SWSELogger.log(`[ReactionEngine] SUCCESS: "${reactionKey}" resolved for ${defender.name}`);

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

  /**
   * Reset round-specific reaction state
   * PHASE 5: Reset per-round reaction limits for all combatants
   *
   * Called at the start of each combat round.
   * Allows each actor to use their once-per-round reactions again.
   *
   * @param {Combat} combat
   */
  static resetRoundState(combat) {
    if (!combat) {
      return;
    }

    // Get all actors in combat
    const combatants = combat.combatants ?? [];

    for (const combatant of combatants) {
      const actor = combatant.actor;
      if (!actor) continue;

      // Reset per-round reaction limits
      ActivationLimitEngine.resetRoundLimits(actor);
    }

    SWSELogger.log(`[ReactionEngine] Round state reset for ${combatants.length} combatants`);
  }

  /**
   * Get reactions available for an actor's turn in a combat
   * Phase 1: Simple eligibility check
   *
   * @param {Actor} actor
   * @param {Combat} combat
   * @returns {string[]} Reaction keys available to this actor
   */
  static getActorReactions(actor, combat = null) {
    if (!actor || !actor.system?.derived?.reactions) {
      return [];
    }

    return Array.isArray(actor.system.derived.reactions)
      ? actor.system.derived.reactions
      : [];
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

    const entry = ReactionRegistry.getReaction?.(reactionKey) ?? null;

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
