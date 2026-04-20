/**
 * PASSIVE Execution Model - Runtime Adapter
 *
 * Scaffolding for PASSIVE ability registration and dispatch.
 * Handles routing of passive abilities to their respective subsystems.
 *
 * Integration points (planned):
 * - handleModifier: ModifierEngine
 * - handleRule: RuleRegistry
 * - handleDerived: DerivedStatBuilder
 * - handleAura: AuraEngine
 * - handleTriggered: event surface
 */

import { PASSIVE_SUBTYPES } from "./passive-types.js";
import { PassiveContractValidator } from "./passive-contract.js";
import { ModifierSource } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { ConditionEvaluator } from "./condition-evaluator.js";
import { RuleRegistry } from "./rule-registry.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PassiveAdapter {

  /**
   * Register a passive ability on an actor.
   * Validates contract, then dispatches to appropriate handler.
   *
   * PHASE 1: Enforce strict PASSIVE contract (MODIFIER only)
   * PHASE 6: No auto-migration - only activate if executionModel === "PASSIVE"
   * PHASE 4E: Accept optional ruleCollector for deterministic RULE aggregation
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {RuleCollector} ruleCollector - Optional collector for RULE aggregation
   * @throws {Error} If validation fails
   */
  static register(actor, ability, ruleCollector = null) {
    if (ability.system.executionModel !== "PASSIVE") return;

    // PHASE 6: Enforce no auto-migration
    // Only activate if explicitly set to "PASSIVE"
    if (ability.system.executionModel !== "PASSIVE") {
      return;
    }

    // PHASE 4: Validate strict contract (supports MODIFIER, DERIVED_OVERRIDE, RULE)
    PassiveContractValidator.validate(ability);

    // PHASE 4: Route to appropriate handler
    const subType = ability.system.subType;
    if (subType === PASSIVE_SUBTYPES.MODIFIER) {
      this.handleModifier(actor, ability);
    } else if (subType === 'DERIVED_OVERRIDE') {
      this.handleDerivedOverride(actor, ability);
    } else if (subType === 'RULE') {
      this.handleRule(actor, ability, ruleCollector);
    } else if (subType === PASSIVE_SUBTYPES.STATE) {
      this.handleState(actor, ability);
    } else {
      throw new Error(
        `PASSIVE ${subType} not supported. Use: MODIFIER, DERIVED_OVERRIDE, RULE, STATE`
      );
    }
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

  /**
   * Handle DERIVED_OVERRIDE subtype integration.
   *
   * PHASE 3: Derived stat overrides (ADD-only)
   *   - overrides: array of override objects
   *     - target: defense.*, hp.*, bab.*, initiative.*, speed.*
   *     - operation: ADD only (REPLACE deferred to Phase 4+)
   *     - value: {type, ability?, amount?}
   *     - conditions: optional prerequisite checks
   *
   * Applied post-calculation in DerivedCalculator.
   * Does not modify calculation logic, only augments output.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @throws {Error} If configuration is invalid
   */
  static handleDerivedOverride(actor, ability) {
    // Guard against UNLOCK mixing
    if (ability.system.grants) {
      throw new Error(
        `PASSIVE DERIVED_OVERRIDE ${ability.name} cannot have 'grants' field. ` +
        `Use separate UNLOCK ability for capability grants.`
      );
    }

    // Guard against other execution models
    if (ability.system.trigger) {
      throw new Error(
        `PASSIVE DERIVED_OVERRIDE ${ability.name} cannot have 'trigger' field. ` +
        `Use TRIGGERED subtype for reactive abilities.`
      );
    }

    if (ability.system.formula) {
      throw new Error(
        `PASSIVE DERIVED_OVERRIDE ${ability.name} cannot have 'formula' field. ` +
        `DERIVED_OVERRIDE uses structured value specifications only.`
      );
    }

    // Get override metadata
    const meta = ability.system.abilityMeta;
    if (!meta?.overrides || !Array.isArray(meta.overrides)) {
      throw new Error(
        `PASSIVE DERIVED_OVERRIDE ${ability.name} missing or invalid overrides array`
      );
    }

    // PHASE 3: Validate all overrides are ADD (no REPLACE in Phase 3)
    for (const override of meta.overrides) {
      if (override.operation && override.operation !== 'ADD') {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE ${ability.name}: Phase 3 only supports ADD operation. ` +
          `Got: ${override.operation} on target ${override.target}`
        );
      }

      // Guard against dangerous targets
      const dangerousTargets = [
        'attributes.str.base',
        'attributes.dex.base',
        'attributes.con.base',
        'attributes.int.base',
        'attributes.wis.base',
        'attributes.cha.base',
        'level',
        'progression',
        'credits'
      ];

      if (dangerousTargets.some(t => override.target?.startsWith(t))) {
        throw new Error(
          `PASSIVE DERIVED_OVERRIDE ${ability.name} cannot modify ${override.target}. ` +
          `Overrides can only modify derived stats, not base values.`
        );
      }
    }

    // Store overrides on actor for DerivedCalculator to pick up
    if (!actor._derivedOverrides) {
      actor._derivedOverrides = {};
    }
    actor._derivedOverrides[ability.id] = meta.overrides;

    if (meta.overrides.length > 0) {
      swseLogger.debug(
        `[PassiveAdapter] DERIVED_OVERRIDE ${ability.name} ` +
        `registering ${meta.overrides.length} overrides for ${actor.name}`
      );
    }
  }

  /**
   * Handle RULE subtype integration with RuleCollector.
   *
   * PHASE 4: Boolean rule tokens (resolution hints)
   *   - rules: array of rule objects
   *     - type: IGNORE_COVER, CANNOT_BE_FLANKED, TREAT_SKILL_AS_TRAINED
   *     - conditions: optional prerequisite checks
   *
   * PHASE 4E: Rules aggregated via RuleCollector during prepare cycle.
   * Produces frozen snapshots (actor._ruleSet, actor._ruleParams).
   * Resolution logic (combat, skill checks, etc.) queries frozen storage via ResolutionContext.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   * @param {RuleCollector} ruleCollector - Collector for this prepare cycle
   * @throws {Error} If configuration is invalid or mixing detected
   */
  static handleRule(actor, ability, ruleCollector = null) {
    // Guard against UNLOCK mixing
    if (ability.system.grants) {
      throw new Error(
        `PASSIVE RULE ${ability.name} cannot have 'grants' field. ` +
        `Use separate UNLOCK ability for capability grants.`
      );
    }

    // Guard against other execution models
    if (ability.system.trigger) {
      throw new Error(
        `PASSIVE RULE ${ability.name} cannot have 'trigger' field. ` +
        `Use TRIGGERED subtype for reactive abilities.`
      );
    }

    if (ability.system.formula) {
      throw new Error(
        `PASSIVE RULE ${ability.name} cannot have 'formula' field. ` +
        `Rules are declarative boolean states, not formulas.`
      );
    }

    // Guard against numeric injection
    if (ability.system.abilityMeta?.modifiers) {
      throw new Error(
        `PASSIVE RULE ${ability.name} cannot have 'modifiers'. ` +
        `Use MODIFIER subtype for numeric effects.`
      );
    }

    if (ability.system.abilityMeta?.overrides) {
      throw new Error(
        `PASSIVE RULE ${ability.name} cannot have 'overrides'. ` +
        `Use DERIVED_OVERRIDE subtype for derived stat augmentation.`
      );
    }

    // Get rule metadata
    const meta = ability.system.abilityMeta;
    if (!meta?.rules || !Array.isArray(meta.rules)) {
      throw new Error(
        `PASSIVE RULE ${ability.name} missing or invalid rules array`
      );
    }

    // Process each rule
    for (const rule of meta.rules) {
      try {
        // Check conditions if present
        if (rule.conditions?.length) {
          if (!ConditionEvaluator.evaluateAll(actor, rule.conditions)) {
            // Conditions not met, skip this rule
            continue;
          }
        }

        // PHASE 4E: Add rule to collector (if provided)
        // Collector deduplicates and handles param extraction
        if (ruleCollector) {
          ruleCollector.add(rule);
        }
      } catch (err) {
        throw new Error(
          `PASSIVE RULE ${ability.name} error processing rule ${rule.type}: ${err.message}`
        );
      }
    }

    // Log registration
    if (meta.rules.length > 0) {
      swseLogger.debug(
        `[PassiveAdapter] RULE ${ability.name} ` +
        `registering ${meta.rules.length} rules for ${actor.name}`
      );
    }
  }

  /**
   * Handle STATE subtype integration.
   *
   * PHASE 4: State-dependent predicates (conditional passive modifiers)
   *   - Validated in PassiveContractValidator
   *   - Currently a stub; full implementation deferred to Phase 5+
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static handleState(actor, ability) {
    // PHASE 4: Stub implementation - validate structure only
    const meta = ability.system.abilityMeta;
    if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
      throw new Error(
        `PASSIVE STATE ${ability.name} missing or invalid modifiers array`
      );
    }

    // Future phases: integrate with ConditionEvaluator and state tracking
    swseLogger.debug(
      `[PassiveAdapter] STATE ${ability.name} ` +
      `registered for ${actor.name} (${meta.modifiers.length} state predicates)`
    );
  }

  // PHASE 4: Deferred subtypes
  // - AURA: Phase 5 (integrate with AuraEngine)
  // - TRIGGERED: Phase 6 (integrate with event surface)
  // All other subtypes are rejected at validation time.
}
