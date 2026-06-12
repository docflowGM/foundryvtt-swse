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
    } else if (subType === PASSIVE_SUBTYPES.RESOURCE) {
      this.handleResource(actor, ability);
    } else {
      throw new Error(
        `PASSIVE ${subType} not supported. Use: MODIFIER, DERIVED_OVERRIDE, RULE, STATE, RESOURCE`
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
      // Legacy data can carry resource-only metadata under PASSIVE/MODIFIER.
      // It is valid content, but it is not a numeric modifier. Treat it as a
      // no-op resource note so actor preparation does not spam warnings.
      if (meta?.resourceRules && typeof meta.resourceRules === 'object') {
        this.handleResource(actor, ability);
        return;
      }
      throw new Error(
        `PASSIVE MODIFIER ${ability.name} missing or invalid modifiers array`
      );
    }

    // PHASE 3: Transform to canonical Modifier format
    const canonicalModifiers = [];
    const rawModifiers = this._getEffectiveModifierDefinitions(ability, meta.modifiers);
    for (const rawModifier of rawModifiers) {
      try {
        const canonical = this._transformToCanonicalModifier(
          rawModifier,
          ability.id,
          ability.name,
          ability
        );
        if (canonical) canonicalModifiers.push(canonical);
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

  static _isImprovedDefensesAbility(ability = null) {
    const nameKey = String(ability?.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const choiceKey = String(ability?.system?.choiceMeta?.choiceKind || ability?.system?.choiceMeta?.choiceKey || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return nameKey === 'improved_defenses' || choiceKey === 'improved_defenses';
  }

  static _getEffectiveModifierDefinitions(ability, modifiers = []) {
    if (!this._isImprovedDefensesAbility(ability)) return modifiers;

    const choiceBackedDefenseModifier = modifiers.find((modifier) => {
      const config = modifier?.targetFromSelectedChoice;
      const prefix = typeof config === 'string' ? config : config?.prefix;
      return prefix === 'defense.';
    });

    if (!choiceBackedDefenseModifier) return modifiers;

    return ['fortitude', 'reflex', 'will'].map((defense) => ({
      ...choiceBackedDefenseModifier,
      target: `defense.${defense}`,
      targetFromSelectedChoice: undefined,
      description: `${ability?.name || 'Improved Defenses'}: +1 to all defenses`
    }));
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
  static _transformToCanonicalModifier(rawModifier, sourceId, sourceName, ability = null) {
    // PHASE 6: Choice-backed feats may derive their modifier target from
    // item.system.selectedChoice (for example Skill Focus -> skill.<chosen>,
    // Improved Defenses -> defense.<chosen>). If the item has not been
    // resolved yet, skip the modifier instead of applying a fake/global bonus.
    const resolvedTarget = this._resolveModifierTarget(rawModifier, ability);

    // PHASE 2: Validate required fields
    if (!resolvedTarget) {
      if (rawModifier.targetFromSelectedChoice) return null;
      throw new Error("Modifier missing 'target' field");
    }
    if (typeof rawModifier.value !== 'number') {
      throw new Error(`Modifier value must be numeric, got: ${typeof rawModifier.value}`);
    }

    // PHASE 2: Validate stacking type
    const stackingType = rawModifier.type || 'untyped';
    const validTypes = ['untyped', 'competence', 'enhancement', 'morale', 'insight', 'armor', 'equipment', 'restriction', 'circumstance', 'penalty', 'dodge'];
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
      target: resolvedTarget,
      type: stackingType,
      value: rawModifier.value,
      enabled: rawModifier.enabled !== false,  // Default to enabled
      priority: rawModifier.priority || 500,  // Default priority (middle of 0-1000 range)
      conditions: rawModifier.conditions || [],
      predicates: Array.isArray(rawModifier.predicates) ? rawModifier.predicates : [],
      mechanicsMode: rawModifier.mechanicsMode || ability?.system?.abilityMeta?.mechanicsMode || 'passive',
      applicationScope: rawModifier.applicationScope || ability?.system?.abilityMeta?.applicationScope || 'static_actor',
      staticSheetPolicy: rawModifier.staticSheetPolicy || ability?.system?.abilityMeta?.staticSheetPolicy || 'include',
      requiresRuntimeContext: rawModifier.requiresRuntimeContext ?? ability?.system?.abilityMeta?.requiresRuntimeContext ?? false,
      requiresSelectedChoice: rawModifier.requiresSelectedChoice ?? ability?.system?.abilityMeta?.requiresSelectedChoice ?? false,
      selectedChoice: ability?.system?.selectedChoice || ability?.system?.selectedChoices || null,
      choiceResolved: !!(ability?.system?.selectedChoice || ability?.system?.selectedChoices || rawModifier.targetFromSelectedChoice),
      predicateRequirements: rawModifier.predicateRequirements || ability?.system?.abilityMeta?.predicateRequirements || [],
      conditionSummary: rawModifier.conditionSummary || ability?.system?.abilityMeta?.conditionSummary || '',
      description: rawModifier.description || `${sourceName} modifier`
    };
  }


  /**
   * Resolve a modifier target, including selected-choice driven targets.
   *
   * Supported schema:
   * abilityMeta.modifiers[].targetFromSelectedChoice = { prefix: "skill." }
   * abilityMeta.modifiers[].targetFromSelectedChoice = { prefix: "defense." }
   *
   * @private
   * @param {Object} rawModifier
   * @param {Object|null} ability
   * @returns {string|null}
   */
  static _resolveModifierTarget(rawModifier, ability = null) {
    if (!rawModifier?.targetFromSelectedChoice) return rawModifier?.target || null;

    const selected = ability?.system?.selectedChoice || ability?.system?.selectedChoices;
    const config = rawModifier.targetFromSelectedChoice;
    const entry = this._selectChoiceEntry(selected, config);
    if (!entry) return null;

    const rawValue = this._choiceTargetValue(entry, config);
    const key = this._normalizeChoiceTargetKey(rawValue);
    if (!key) return null;

    const prefix = typeof config === 'string' ? config : (config.prefix || '');
    const suffix = typeof config === 'object' ? (config.suffix || '') : '';
    return `${prefix}${key}${suffix}`;
  }

  static _selectChoiceEntry(selected, config = {}) {
    const index = typeof config === 'object' && Number.isInteger(config.index) ? config.index : 0;
    if (Array.isArray(selected)) return selected[index] ?? selected[0] ?? null;
    return selected || null;
  }

  static _choiceTargetValue(entry, config = {}) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;

    if (typeof config === 'object' && config.property) {
      const propertyValue = entry?.[config.property];
      if (Array.isArray(propertyValue)) {
        const index = Number.isInteger(config.index) ? config.index : 0;
        return propertyValue[index] ?? propertyValue[0] ?? '';
      }
      if (propertyValue !== undefined && propertyValue !== null) return propertyValue;
    }

    if (Array.isArray(entry.targets)) {
      const index = typeof config === 'object' && Number.isInteger(config.index) ? config.index : 0;
      return entry.targets[index] ?? entry.targets[0] ?? '';
    }

    return entry.value || entry.id || entry.skill || entry.defense || entry.group || entry.weapon || entry.label || entry.name;
  }

  /**
   * Normalize a selected choice for derived modifier targets.
   *
   * @private
   * @param {string} value
   * @returns {string}
   */
  static _normalizeChoiceTargetKey(value) {
    const raw = String(value || '').trim();
    const compact = raw.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
    const canonical = {
      gatherinformation: 'gatherInformation',
      knowledgebureaucracy: 'knowledgeBureaucracy',
      knowledgegalacticlore: 'knowledgeGalacticLore',
      knowledgegalactichistory: 'knowledgeGalacticLore',
      knowledgelifesciences: 'knowledgeLifeSciences',
      knowledgephysicalsciences: 'knowledgePhysicalSciences',
      knowledgesocialsciences: 'knowledgeSocialSciences',
      knowledgetactics: 'knowledgeTactics',
      knowledgetechnology: 'knowledgeTechnology',
      treatinjury: 'treatInjury',
      usecomputer: 'useComputer',
      usetheforce: 'useTheForce'
    };
    if (canonical[compact]) return canonical[compact];
    return raw
      .replace(/&/g, ' and ')
      .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => String(chr || '').toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^./, chr => chr.toLowerCase());
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
    // Progression-owned grant metadata is not a runtime boolean rule. Older
    // content may still be typed PASSIVE/RULE with no rule tokens; accept it as
    // a no-op note instead of aborting actor ability registration.
    const meta = ability.system.abilityMeta;
    const rules = Array.isArray(meta?.rules) ? meta.rules : (meta?.rule ? [meta.rule] : []);
    const isProgressionOwnedGrant = !rules.length && (
      meta?.mechanicsMode === 'grant_unlock'
      || String(meta?.applicationScope || '').includes('picker')
      || String(meta?.applicationScope || '').includes('progression')
      || String(meta?.implementationStatus || '').includes('selection')
    );
    if (isProgressionOwnedGrant) {
      this.handleState(actor, ability);
      return;
    }

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
    if (!rules.length) {
      throw new Error(
        `PASSIVE RULE ${ability.name} missing or invalid rules array`
      );
    }

    // Process each rule
    for (const rule of rules) {
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
    if (rules.length > 0) {
      swseLogger.debug(
        `[PassiveAdapter] RULE ${ability.name} ` +
        `registering ${rules.length} rules for ${actor.name}`
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
    // PHASE 4: Stub implementation - validate structure only.
    // Metadata-only STATE entries are intentionally accepted as no-ops so a
    // single feat/talent that exposes future automation hooks cannot break actor
    // preparation, chargen finalization, or sheet rendering.
    const meta = ability.system.abilityMeta;
    const modifiers = Array.isArray(meta?.modifiers) ? meta.modifiers : [];

    if (!actor._passiveStateNotes) actor._passiveStateNotes = {};
    actor._passiveStateNotes[ability.id] = {
      id: ability.id,
      name: ability.name,
      status: meta?.status || null,
      description: meta?.description || '',
      hasExecutableStateModifiers: modifiers.length > 0
    };

    // Future phases: integrate with ConditionEvaluator and state tracking
    swseLogger.debug(
      `[PassiveAdapter] STATE ${ability.name} ` +
      `registered for ${actor.name} (${modifiers.length} state predicates)`
    );
  }


  /**
   * Handle RESOURCE subtype integration.
   * Resource passives are consumed by dedicated resource/metadata resolvers
   * such as Force Point spending rules. They do not inject sheet modifiers.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static handleResource(actor, ability) {
    const meta = ability.system?.abilityMeta ?? {};
    if (!actor._passiveResourceNotes) actor._passiveResourceNotes = {};
    actor._passiveResourceNotes[ability.id] = {
      id: ability.id,
      name: ability.name,
      status: meta.status || null,
      description: meta.description || '',
      resourceRules: meta.resourceRules || {}
    };

    swseLogger.debug(
      `[PassiveAdapter] RESOURCE ${ability.name} registered for ${actor.name}`
    );
  }

  // PHASE 4: Deferred subtypes
  // - AURA: Phase 5 (integrate with AuraEngine)
  // - TRIGGERED: Phase 6 (integrate with event surface)
  // All other subtypes are rejected at validation time.
}
