/**
 * PROGRESSION Execution Model - Event Processor
 *
 * Routes lifecycle events to PROGRESSION abilities.
 * Validates contracts and scaffolds effect application.
 *
 * PHASE 3: Event routing infrastructure
 *
 * IMPORTANT: This is INFRASTRUCTURE ONLY.
 * - No currency mutation
 * - No formula evaluation
 * - No actual granting
 * - Effects are logged but not processed
 */

import { PROGRESSION_EXECUTION_MODEL } from "./progression-types.js";
import { ProgressionContractValidator } from "./progression-contract.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ProgressionEventProcessor {

  /**
   * Process a lifecycle event on an actor.
   * Routes event to all matching PROGRESSION abilities.
   *
   * @param {Object} actor - The actor document
   * @param {string} eventType - Event type (e.g., "LEVEL_UP")
   * @param {Object} context - Event context (e.g., { classLevel: 5 })
   */
  static async handle(actor, eventType, context = {}) {
    if (!actor?.items) return;

    // Find all PROGRESSION abilities. Wealth is included by name/flag as a
    // compatibility shim for actors created before the compendium metadata was
    // corrected from PASSIVE/STATE to PROGRESSION.
    const progressionAbilities = actor.items.filter(i => this._isProgressionAbility(i));

    if (progressionAbilities.length === 0) return;

    swseLogger.debug(
      `[ProgressionEventProcessor] Processing event "${eventType}" ` +
      `with ${progressionAbilities.length} PROGRESSION abilities ` +
      `on actor ${actor.name}`
    );

    // Process each ability. This must be awaited because effects mutate actors.
    for (const ability of progressionAbilities) {
      try {
        await this._processAbility(actor, ability, eventType, context);
      } catch (err) {
        swseLogger.error(
          `[ProgressionEventProcessor] Error processing PROGRESSION ability ` +
          `${ability.name} on actor ${actor.name}: ${err.message}`
        );
        throw err;
      }
    }
  }

  static _isProgressionAbility(item) {
    return item?.system?.executionModel === PROGRESSION_EXECUTION_MODEL || this._isWealthTalent(item);
  }

  static _isWealthTalent(item) {
    if (item?.type !== "talent") return false;
    const flagId = String(item.flags?.swse?.id ?? "").toLowerCase();
    const sourceId = String(item.flags?.core?.sourceId ?? "").toLowerCase();
    const name = this._normalizeKey(item.name);
    return name === "wealth" || flagId === "swse.talent.wealth" || sourceId.endsWith(".wealth") || sourceId.includes("37bf53b4b2c0e539");
  }

  static _getAbilityMeta(ability) {
    if (this._isWealthTalent(ability)) {
      return {
        ...(ability.system?.abilityMeta ?? {}),
        trigger: "LEVEL_UP",
        effect: {
          type: "GRANT_CREDITS",
          amount: {
            type: "LINEAGE_LEVEL_MULTIPLIER",
            multiplier: 5000
          },
          oncePerLineageLevel: true
        }
      };
    }
    return ability.system?.abilityMeta ?? {};
  }

  static _abilityHistoryKey(ability) {
    if (this._isWealthTalent(ability)) return "swse.talent.wealth";
    return ability.flags?.swse?.id
      ?? ability.flags?.core?.sourceId
      ?? ability.id
      ?? ability.name
      ?? "unknown-progression-ability";
  }

  /**
   * Process a single PROGRESSION ability for an event
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {string} eventType - Event type
   * @param {Object} context - Event context
   */
  static async _processAbility(actor, ability, eventType, context) {
    const meta = this._getAbilityMeta(ability);

    // Validate contract for fully migrated PROGRESSION abilities. Wealth may be
    // present on existing actors with legacy PASSIVE metadata, so validate the
    // synthesized model instead of the raw legacy item.
    try {
      const validationAbility = this._isWealthTalent(ability)
        ? { ...ability, system: { ...(ability.system ?? {}), executionModel: PROGRESSION_EXECUTION_MODEL, abilityMeta: meta } }
        : ability;
      ProgressionContractValidator.validate(validationAbility);
    } catch (err) {
      throw new Error(
        `PROGRESSION ability ${ability.name} contract violation: ${err.message}`
      );
    }

    // Check if this ability triggers on this event
    if (meta.trigger !== eventType) {
      // Not triggered by this event
      return;
    }

    swseLogger.debug(
      `[ProgressionEventProcessor] PROGRESSION ability ${ability.name} ` +
      `triggered by event ${eventType}`
    );

    const effect = meta.effect;
    try {
      await this._processEffect(actor, ability, effect, context);
    } catch (err) {
      swseLogger.error(
        `[ProgressionEventProcessor] Error processing effect for ` +
        `${ability.name}: ${err.message}`
      );
      throw err;
    }
  }

  static _normalizeKey(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  static _levelValue(entry) {
    return Number(entry?.level ?? entry?.levels ?? entry?.value ?? 0) || 0;
  }

  static _entryClassName(entry) {
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    return entry.class
      ?? entry.name
      ?? entry.className
      ?? entry.label
      ?? entry.system?.class?.name
      ?? entry.system?.name
      ?? "";
  }

  static _entryClassId(entry) {
    if (!entry || typeof entry === "string") return "";
    return entry.classId
      ?? entry.id
      ?? entry._id
      ?? entry.system?.classId
      ?? entry.system?.slug
      ?? entry.system?.id
      ?? "";
  }

  /**
   * Compute the total Lineage-eligible level for an actor.
   * Sums levels from all classes that provide Lineage talent tree access.
   *
   * @private
   * @param {Object} actor - The actor document
   * @returns {number} Total Lineage-eligible levels
   */
  static _computeLineageEligibleLevel(actor) {
    const lineageClassKeys = this._getLineageClassKeys();
    const entries = [];

    if (Array.isArray(actor?.system?.progression?.classLevels)) {
      entries.push(...actor.system.progression.classLevels);
    }

    if (Array.isArray(actor?.system?.classes)) {
      entries.push(...actor.system.classes);
    }

    const classItems = actor?.items?.filter?.(i => i.type === "class") ?? [];
    for (const item of classItems) {
      entries.push({
        class: item.name,
        classId: item.system?.classId ?? item.system?.slug ?? item.flags?.swse?.id,
        level: item.system?.level ?? item.system?.levels ?? 0
      });
    }

    // Single-class legacy fallback. It only contributes if no better class-level
    // source is available, because it cannot represent multiclass totals.
    if (entries.length === 0 && actor?.system?.class) {
      const className = typeof actor.system.class === "object"
        ? actor.system.class.name
        : actor.system.class;
      entries.push({ class: className, classId: actor.system.class?.id, level: Number(actor.system.level) || 1 });
    }

    const byKey = new Map();
    for (const entry of entries) {
      const name = this._entryClassName(entry);
      const id = this._entryClassId(entry);
      const level = this._levelValue(entry);
      if (level <= 0) continue;

      const normalizedName = this._normalizeKey(name);
      const normalizedId = this._normalizeKey(id);
      const eligible = lineageClassKeys.has(normalizedName) || lineageClassKeys.has(normalizedId);
      if (!eligible) continue;

      const key = normalizedId || normalizedName;
      byKey.set(key, Math.max(byKey.get(key) ?? 0, level));
    }

    return Array.from(byKey.values()).reduce((sum, level) => sum + level, 0);
  }

  static _getLineageClassKeys() {
    const keys = new Set(["noble", "corporateagent"]);
    const talentTreeClassMap = this._getTalentTreeClassMap();
    const lineageClasses = talentTreeClassMap?.Lineage ?? talentTreeClassMap?.lineage ?? [];
    for (const cls of lineageClasses) {
      keys.add(this._normalizeKey(cls));
    }
    return keys;
  }

  /**
   * Get talent tree class map with fallback for test injection.
   * @private
   */
  static _getTalentTreeClassMap() {
    // Allow tests to inject the map
    if (this._injectedTalentTreeClassMap) {
      return this._injectedTalentTreeClassMap;
    }

    // Try to get from global if already loaded by system
    if (globalThis.talentTreeClassMap) {
      return globalThis.talentTreeClassMap;
    }

    // Built-in fallback for the only currently automated Lineage effect.
    return { Lineage: ["Noble", "Corporate Agent"] };
  }

  /**
   * Process effect application.
   *
   * Routes effect processing based on type.
   * Currently implements GRANT_CREDITS with idempotency.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect definition
   * @param {Object} context - Event context
   */
  static async _processEffect(actor, ability, effect, context) {
    if (!effect || !effect.type) return;

    switch (effect.type) {
      case "GRANT_CREDITS":
        await this._grantCredits(actor, ability, effect, context);
        break;

      case "GRANT_XP":
        // planned: Phase 5 - Implement XP granting
        break;

      case "GRANT_ITEM":
        // planned: Phase 5 - Implement item cloning and granting
        break;

      case "CUSTOM":
        // planned: Phase 5 - Custom effect handlers
        break;

      default:
        swseLogger.warn(
          `[ProgressionEventProcessor] Unknown effect type: ${effect.type}`
        );
    }
  }

  /**
   * Grant credits based on effect amount type.
   * Currently supports LINEAGE_LEVEL_MULTIPLIER.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {Object} effect - The effect definition (has amount field)
   * @param {Object} context - Event context
   */
  static async _grantCredits(actor, ability, effect, context) {
    // Import ActorEngine for mutation
    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");

    if (!effect.amount) {
      // Legacy fallback: formula or value
      if (typeof effect.value === 'number') {
        await this._applyCreditsUpdate(actor, effect.value, ability.name, ActorEngine);
      }
      return;
    }

    if (effect.amount.type !== "LINEAGE_LEVEL_MULTIPLIER") return;

    const multiplier = Number(effect.amount.multiplier) || 0;
    if (multiplier <= 0) return;

    const abilityId = this._abilityHistoryKey(ability);
    const rawProgressionHistory = actor.getFlag?.("swse", "progressionHistory")
      ?? actor.flags?.swse?.progressionHistory
      ?? {};
    const progressionHistory = globalThis.foundry?.utils?.deepClone
      ? globalThis.foundry.utils.deepClone(rawProgressionHistory)
      : JSON.parse(JSON.stringify(rawProgressionHistory));
    const historyEntry = progressionHistory[abilityId] || { levelsGranted: [] };
    const levelsGranted = Array.isArray(historyEntry.levelsGranted)
      ? historyEntry.levelsGranted.map(Number).filter(Number.isFinite)
      : [];

    // Compute current Lineage-eligible level
    const currentLineageLevel = this._computeLineageEligibleLevel(actor);
    let creditsToGrant = 0;
    const newLevelsGranted = [...levelsGranted];

    // Grant for each level that hasn't been granted yet
    for (let level = 1; level <= currentLineageLevel; level++) {
      if (!levelsGranted.includes(level)) {
        creditsToGrant += multiplier;
        newLevelsGranted.push(level);
      }
    }

    if (creditsToGrant <= 0) {
      swseLogger.debug(
        `[ProgressionEventProcessor] GRANT_CREDITS: ${ability.name} ` +
        `no new Lineage levels to grant (already have: ${levelsGranted.join(', ')})`
      );
      return;
    }

    swseLogger.debug(
      `[ProgressionEventProcessor] GRANT_CREDITS: Ability ${ability.name} ` +
      `granting ${creditsToGrant} credits ` +
      `(${newLevelsGranted.length} Lineage levels, multiplier: ${multiplier})`
    );

    await this._applyCreditsUpdate(actor, creditsToGrant, ability.name, ActorEngine);

    progressionHistory[abilityId] = {
      ...historyEntry,
      levelsGranted: Array.from(new Set(newLevelsGranted)).sort((a, b) => a - b),
      lastGrantedAt: new Date().toISOString(),
      lastGrantedCredits: creditsToGrant
    };

    await ActorEngine.updateActor(actor, {
      "flags.swse.progressionHistory": progressionHistory
    });

    await this._notifyCreditsGranted(actor, ability, creditsToGrant, progressionHistory[abilityId].levelsGranted);

    swseLogger.log(
      `[ProgressionEventProcessor] GRANT_CREDITS: ${ability.name} ` +
      `granted ${creditsToGrant} credits. ` +
      `Lineage levels granted: ${progressionHistory[abilityId].levelsGranted.join(', ')}`
    );
  }

  /**
   * Apply credits update through ActorEngine.
   *
   * @private
   * @param {Object} actor - The actor document
   * @param {number} creditsToAdd - Amount of credits to add
   * @param {string} abilityName - Name of the ability for logging
   * @param {Object} ActorEngine - ActorEngine class
   */
  static async _applyCreditsUpdate(actor, creditsToAdd, abilityName, ActorEngine) {
    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const newCredits = currentCredits + creditsToAdd;
    await ActorEngine.updateActor(actor, {
      "system.credits": newCredits
    });
  }

  static async _notifyCreditsGranted(actor, ability, creditsToGrant, levelsGranted) {
    try {
      if (!globalThis.ChatMessage?.create) return;
      const content = `
        <div class="swse-progression-award swse-progression-award--wealth">
          <strong>${ability.name}</strong> granted <strong>${creditsToGrant.toLocaleString()} credits</strong>
          to ${actor.name} for Lineage level${levelsGranted.length === 1 ? "" : "s"} ${levelsGranted.join(", ")}.
        </div>
      `;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name },
        content
      });
    } catch (err) {
      swseLogger.warn(`[ProgressionEventProcessor] Failed to post ${ability.name} credit award chat card`, err);
    }
  }
}
