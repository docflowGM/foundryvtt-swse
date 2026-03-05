/**
 * PASSIVE Execution Model - Runtime Adapter
 *
 * Scaffolding for PASSIVE ability registration and dispatch.
 * Handles routing of passive abilities to their respective subsystems.
 *
 * Integration points (TODO):
 * - handleModifier: ModifierEngine
 * - handleRule: RuleRegistry
 * - handleDerived: DerivedStatBuilder
 * - handleAura: AuraEngine
 * - handleTriggered: event surface
 */

import { PASSIVE_SUBTYPES } from "./passive-types.js";
import { PassiveContractValidator } from "./passive-contract.js";
import { ModifierSource } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PassiveAdapter {

  /**
   * Register a passive ability on an actor.
   * Validates contract, then dispatches to appropriate handler.
   *
   * PHASE 1: Enforce strict PASSIVE contract (MODIFIER only)
   * PHASE 6: No auto-migration - only activate if executionModel === "PASSIVE"
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @throws {Error} If validation fails
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "PASSIVE") return;

    // PHASE 6: Enforce no auto-migration
    // Only activate if explicitly set to "PASSIVE"
    if (ability.system.executionModel !== "PASSIVE") {
      return;
    }

    // PHASE 1: Validate strict contract
    PassiveContractValidator.validate(ability);

    // PHASE 1: MODIFIER only in Phase 1
    if (ability.system.subType !== PASSIVE_SUBTYPES.MODIFIER) {
      throw new Error(
        `PASSIVE Phase 1 only supports MODIFIER subtype. Got: ${ability.system.subType}`
      );
    }

    this.handleModifier(actor, ability);
  }

  /**
   * Handle MODIFIER subtype integration with ModifierEngine.
   *
   * PHASE 2: Define PASSIVE MODIFIER schema
   *   - modifiers: array of modifier objects
   *     - target: (skill.*, defense.*, hp.max, speed.*, etc.)
   *     - type: (untyped, competence, enhancement, morale, insight, circumstance, penalty, dodge)
   *     - value: numeric value
   *     - stacking: rule (stack, highestOnly, stackUnlessSameSource)
   *     - conditions: optional prerequisite checks
   *
   * PHASE 3: Integrate with ModifierEngine
   *   - Transform ability.system.abilityMeta.modifiers into canonical Modifier format
   *   - Include sourceId (ability.id), sourceType (ModifierSource.CUSTOM)
   *   - Apply stacking rules via ModifierEngine
   *   - Inject via ModifierEngine.applyAll() during actor preparation
   *
   * PHASE 5: Guard against UNLOCK mixing
   *   - Reject if ability.system.grants is present
   *   - Must not have both modifiers and grants
   *
   * PHASE 7: Logging discipline
   *   - Only throw for invalid config
   *   - No spam logs
   *   - Debug logs for injection only
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @throws {Error} If configuration is invalid or UNLOCK mixing detected
   */
  static handleModifier(actor, ability) {
    // PHASE 5: Guard against UNLOCK mixing
    if (ability.system.grants) {
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} cannot have 'grants' field. ` +
        `Modifiers are state mutations (PASSIVE), not access grants (UNLOCK). ` +
        `Use separate UNLOCK ability for capability grants.`
      );
    }

    // PHASE 2F: Safety check - no trigger field
    if (ability.system.trigger) {
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} cannot have 'trigger' field. ` +
        `Use TRIGGERED subtype for reactive abilities.`
      );
    }

    // PHASE 2F: Safety check - no formula field
    if (ability.system.formula) {
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} cannot have 'formula' field. ` +
        `PASSIVE modifiers use fixed numeric values only.`
      );
    }

    // PHASE 2F: Safety check - no progressionHistory mutation
    if (ability.system.abilityMeta?.modifiesProgressionHistory) {
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} cannot modify progressionHistory. ` +
        `Use PROGRESSION execution model for level-based grants.`
      );
    }

    // Get modifier metadata
    const meta = ability.system.abilityMeta;
    if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} missing or invalid modifiers array`
      );
    }

    // PHASE 3: Transform to canonical Modifier format
    const canonicalModifiers = [];
    for (const rawModifier of meta.modifiers) {
      try {
        const canonical = this._transformToCanonicalModifier(
          rawModifier,
          ability.id,
          ability.name
        );
        canonicalModifiers.push(canonical);
      } catch (err) {
        throw new Error(
          `PASSIVE MODIFIER ${ability.name} transformation failed: ${err.message}`
        );
      }
    }

    // PHASE 7: Debug logging (no spam)
    if (canonicalModifiers.length > 0) {
      swseLogger.debug(
        `[PassiveAdapter] MODIFIER ${ability.name} ` +
        `registering ${canonicalModifiers.length} modifiers for ${actor.name}`
      );
    }

    // PHASE 4: Wire into actor preparation
    // Store modifiers on actor for ModifierEngine.getAllModifiers() to pick up
    if (!actor._passiveModifiers) {
      actor._passiveModifiers = {};
    }
    actor._passiveModifiers[ability.id] = canonicalModifiers;
  }

  /**
   * Transform PASSIVE MODIFIER schema to canonical Modifier format.
   * Validates and converts raw modifier data for ModifierEngine consumption.
   *
   * PHASE 2: Validate schema
   * PHASE 3: Transform to canonical shape
   *
   * @private
   * @param {Object} rawModifier - Raw modifier from ability metadata
   * @param {string} sourceId - Ability ID
   * @param {string} sourceName - Ability name
   * @returns {Object} Canonical Modifier object
   * @throws {Error} If validation fails
   */
  static _transformToCanonicalModifier(rawModifier, sourceId, sourceName) {
    // PHASE 2: Validate required fields
    if (!rawModifier.target) {
      throw new Error("Modifier missing 'target' field");
    }
    if (typeof rawModifier.value !== 'number') {
      throw new Error(`Modifier value must be numeric, got: ${typeof rawModifier.value}`);
    }

    // PHASE 2: Validate stacking type
    const stackingType = rawModifier.type || 'untyped';
    const validTypes = ['untyped', 'competence', 'enhancement', 'morale', 'insight', 'circumstance', 'penalty', 'dodge'];
    if (!validTypes.includes(stackingType)) {
      throw new Error(
        `Invalid modifier type '${stackingType}'. ` +
        `Must be one of: ${validTypes.join(', ')}`
      );
    }

    // PHASE 3: Transform to canonical Modifier shape
    return {
      id: `${sourceId}_${rawModifier.target}`,
      source: ModifierSource.CUSTOM,  // PHASE 3: PASSIVE modifiers are CUSTOM source
      sourceId: sourceId,
      sourceName: sourceName,
      target: rawModifier.target,
      type: stackingType,
      value: rawModifier.value,
      enabled: rawModifier.enabled !== false,  // Default to enabled
      priority: rawModifier.priority || 500,  // Default priority (middle of 0-1000 range)
      conditions: rawModifier.conditions || [],
      description: rawModifier.description || `${sourceName} modifier`
    };
  }

  // PHASE 1: MODIFIER only - other subtypes deferred to future phases
  // - RULE: Phase 2 (integrate with RuleRegistry)
  // - DERIVED_OVERRIDE: Phase 3 (integrate with DerivedStatBuilder)
  // - AURA: Phase 4 (integrate with AuraEngine)
  // - TRIGGERED: Phase 5 (integrate with event surface)
  // All other subtypes are rejected at validation time.
}
