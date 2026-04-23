/**
 * ModifierEngine.js — Unified Modifier Pipeline (Phase 0)
 *
 * Responsibilities:
 * - Collect modifiers from all sources (feats, talents, species, encumbrance, conditions)
 * - Convert all sources to canonical Modifier objects
 * - Aggregate and apply stacking rules
 * - Inject resolved modifiers into derived data
 * - Provide modifier breakdowns for UI display
 *
 * Single source of truth for modifier math.
 */

import { ModifierType, ModifierSource, createModifier, isValidModifier } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import ModifierUtils from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { EncumbranceEngine } from "/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js";
import { WeaponsEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js";
import { StructuredRuleEvaluator } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/StructuredRuleEvaluator.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ConditionEvaluator } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/condition-evaluator.js";

export class ModifierEngine {
  /**
   * Collect all modifiers from every source for an actor
   *
   * Sources:
   * 1. Feats (skillBonuses, defenseModifiers, initiativeBonus)
   * 2. Talents (same as feats)
   * 3. Species (skillBonuses, ability modifiers)
   * 4. Encumbrance (skillPenalties, speedPenalties)
   * 5. Conditions (conditional penalties)
   * 6. Items (equipment/armor bonuses)
   * 7. Custom (user-defined effects)
   *
   * @param {Actor} actor
   * @returns {Modifier[]} Array of all collected modifiers
   */
  static async getAllModifiers(actor) {
    if (!actor) return [];

    const modifiers = [];

    try {
      // Source 1: Feats
      modifiers.push(...this._getFeatModifiers(actor));

      // Source 2: Talents
      modifiers.push(...this._getTalentModifiers(actor));

      // Source 3: Species
      modifiers.push(...this._getSpeciesModifiers(actor));

      // Source 4: Encumbrance
      modifiers.push(...this._getEncumbranceModifiers(actor));

      // Source 5: Conditions
      modifiers.push(...this._getConditionModifiers(actor));

      // Source 6: Items (equipment/armor)
      modifiers.push(...this._getItemModifiers(actor));

      // Source 6b: Weapons (centralized through WeaponsEngine)
      modifiers.push(...this._getWeaponModifiers(actor));

      // Source 7: Droid Modifications (Phase A - droids only)
      if (actor.type === 'droid') {
        modifiers.push(...await this._getDroidModModifiers(actor));
      }

      // Source 7b: Vehicle Modifications (Phase 6 - vehicles only)
      if (actor.type === 'vehicle') {
        modifiers.push(...this._getVehicleModModifiers(actor));
      }

      // Source 8: Custom modifiers (Phase B - user-defined via UI)
      modifiers.push(...this._getCustomModifiers(actor));

      // Source 8b: PASSIVE modifiers (Phase 1 - execution model infrastructure)
      modifiers.push(...this._getPassiveModifiers(actor));

      // Source 9: Active Effects (Phase D - temporary/duration-based)
      modifiers.push(...this._getActiveEffectModifiers(actor));

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers for ${actor.name}`);

      return modifiers;
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error collecting modifiers for ${actor?.name}:`, err);
      return [];
    }
  }

  /**
   * Aggregate all modifiers: collect, group by target, apply stacking
   *
   * PHASE 2: Evaluate conditions during aggregation.
   * Modifiers with unsatisfied conditions are excluded from aggregation.
   *
   * @param {Actor} actor
   * @returns {Object<string, number>} Map of target → total modifier value
   */
  static async aggregateAll(actor) {
    const allModifiers = await this.getAllModifiers(actor);
    const aggregated = {};

    // Group by target
    const byTarget = ModifierUtils.groupByTarget(allModifiers);

    // For each target, evaluate conditions, resolve stacking and sum
    for (const [target, modsForTarget] of byTarget.entries()) {
      // PHASE 2: Filter modifiers based on conditions
      const applicableModifiers = modsForTarget.filter(mod =>
        ConditionEvaluator.evaluateAll(actor, mod.conditions)
      );

      if (applicableModifiers.length === 0) {
        continue; // No applicable modifiers for this target
      }

      const resolved = ModifierUtils.resolveStacking(applicableModifiers);
      const total = ModifierUtils.sumModifiers(resolved);

      if (total !== 0) {
        aggregated[target] = total;
      }
    }

    return aggregated;
  }

  /**
   * Get aggregated modifier value for specific target
   *
   * PHASE 2: Evaluate conditions before calculating total.
   *
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {number}
   */
  static async aggregateTarget(actor, target) {
    const allModifiers = await this.getAllModifiers(actor);
    // PHASE 2: Filter based on conditions
    const applicableModifiers = allModifiers.filter(mod =>
      ConditionEvaluator.evaluateAll(actor, mod.conditions)
    );
    return ModifierUtils.calculateModifierTotal(applicableModifiers, target);
  }

  /**
   * Get detailed modifier breakdown for UI display
   *
   * PHASE 2: Evaluate conditions before breakdown.
   *
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {Object} {total, applied, breakdown}
   */
  static async getModifierDetail(actor, target) {
    const allModifiers = await this.getAllModifiers(actor);
    // PHASE 2: Filter based on conditions
    const applicableModifiers = allModifiers.filter(mod =>
      ConditionEvaluator.evaluateAll(actor, mod.conditions)
    );
    return ModifierUtils.getModifierDetail(applicableModifiers, target);
  }

  /**
   * Build canonical modifier breakdown object for storage
   *
   * Structure stored in system.derived.modifiers:
   * {
   *   "skill.acrobatics": { total: 2, applied: [...], breakdown: [...] },
   *   "defense.reflex": { total: 1, applied: [...], breakdown: [...] }
   * }
   *
   * @param {Actor} actor
   * @param {string[]} targets - Targets to include in breakdown
   * @returns {Object}
   */
  static async buildModifierBreakdown(actor, targets = []) {
    const allModifiers = await this.getAllModifiers(actor);
    return ModifierUtils.buildModifierBreakdown(allModifiers, targets);
  }

  /**
   * PHASE 3: Compute modifier bundle (PURE)
   *
   * Calculates all modifier-derived values without mutating the actor.
   * Returns a bundle that can be applied atomically in DerivedCalculator context.
   *
   * @param {Actor} actor
   * @param {Object<string, number>} modifierMap - From aggregateAll()
   * @param {Modifier[]} allModifiers - Full modifier array
   * @returns {Object} Bundle with computed values:
   *   {
   *     skills: { skillKey: { total: number } },
   *     defenses: { defenseKey: { total: number, adjustment: number } },
   *     hp: { total: number, adjustment: number },
   *     bab: number,
   *     babAdjustment: number,
   *     initiative: number,
   *     initiativeAdjustment: number,
   *     speed: { total: number, adjustment: number } | null,
   *     modifiers: { all: Modifier[], breakdown: Object }
   *   }
   */
  static computeModifierBundle(actor, modifierMap, allModifiers = []) {
    if (!actor || !modifierMap) {
      return {
        skills: {},
        defenses: {},
        hp: { total: 1, adjustment: 0 },
        bab: 0,
        babAdjustment: 0,
        initiative: 0,
        initiativeAdjustment: 0,
        speed: null,
        modifiers: { all: [], breakdown: {} }
      };
    }

    try {
      const bundle = {
        skills: {},
        defenses: {},
        hp: {},
        bab: 0,
        babAdjustment: 0,
        initiative: 0,
        initiativeAdjustment: 0,
        speed: null,
        modifiers: {}
      };

      // Build modifier breakdown for storage
      const skillTargets = this._getAllSkillTargets(actor);
      const defenseTargets = ['defense.fortitude', 'defense.reflex', 'defense.will', 'defense.damageThreshold'];
      const allTargets = [...skillTargets, ...defenseTargets, 'hp.max', 'bab.total', 'initiative.total', 'speed.base'];

      const modifierBreakdown = ModifierUtils.buildModifierBreakdown(allModifiers, allTargets);

      // ========================================
      // SKILLS (Computed Bundle)
      // ========================================
      const derivedSkills = actor.system?.derived?.skills;
      if (derivedSkills && typeof derivedSkills === 'object') {
        for (const [skillKey, skillData] of Object.entries(derivedSkills)) {
          if (!skillData || typeof skillData !== 'object') continue;
          if (Array.isArray(skillData)) continue;
          if (skillKey === 'list') continue;

          const targetKey = `skill.${skillKey}`;
          const modifier = modifierMap[targetKey] || 0;
          const base = Number(skillData.total ?? 0) || 0;

          bundle.skills[skillKey] = {
            total: Math.max(0, base + modifier),
            adjustment: modifier
          };
        }
      }

      // ========================================
      // DEFENSES (Computed Bundle)
      // ========================================
      const derived = actor.system?.derived;
      if (derived && typeof derived === 'object') {
        const defensePaths = {
          fort: 'defense.fortitude',
          fortitude: 'defense.fortitude',
          ref: 'defense.reflex',
          reflex: 'defense.reflex',
          will: 'defense.will'
        };

        for (const [defenseKey, targetKey] of Object.entries(defensePaths)) {
          const defense = derived.defenses?.[defenseKey] || {};
          const modifier = modifierMap[targetKey] || 0;
          const base = defense.base || defense.total || 10;

          bundle.defenses[defenseKey] = {
            total: Math.max(1, base + modifier),
            adjustment: modifier
          };
        }

        // ========================================
        // HP (Computed Bundle)
        // ========================================
        const hpModifier = modifierMap['hp.max'] || 0;
        const hpBase = derived.hp?.base || 1;

        bundle.hp = {
          total: Math.max(1, hpBase + hpModifier),
          adjustment: hpModifier
        };

        // ========================================
        // BAB (Computed Bundle)
        // ========================================
        const babModifier = modifierMap['bab.total'] || 0;
        bundle.bab = (derived.bab || 0) + babModifier;
        bundle.babAdjustment = babModifier;

        // ========================================
        // INITIATIVE (Computed Bundle)
        // ========================================
        const initiativeModifier = modifierMap['initiative.total'] || 0;
        const initiativeBase = Number(derived.initiative?.total ?? derived.initiative ?? 0) || 0;
        bundle.initiative = initiativeBase + initiativeModifier;
        bundle.initiativeAdjustment = initiativeModifier;

        // ========================================
        // SPEED (Computed Bundle)
        // ========================================
        if (derived.speed) {
          const speedModifier = modifierMap['speed.base'] || 0;
          const baseSpeed = derived.speed.base || 0;

          bundle.speed = {
            total: Math.max(0, baseSpeed + speedModifier),
            adjustment: speedModifier
          };
        }
      }

      // ========================================
      // MODIFIER BREAKDOWN (for UI)
      // ========================================
      bundle.modifiers = {
        all: allModifiers || [],
        breakdown: modifierBreakdown
      };

      return bundle;
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error computing modifier bundle for ${actor?.name}:`, err);
      return {
        skills: {},
        defenses: {},
        hp: { total: 1, adjustment: 0 },
        bab: 0,
        babAdjustment: 0,
        initiative: 0,
        initiativeAdjustment: 0,
        speed: null,
        modifiers: { all: [], breakdown: {} }
      };
    }
  }

  /**
   * Apply computed modifier bundle to actor (MUTATION POINT)
   *
   * PHASE 3: This is the ONLY place ModifierEngine mutates actor state.
   * Must be called during DerivedCalculator phase with _isDerivedCalcCycle=true.
   *
   * @param {Actor} actor
   * @param {Object} bundle - From computeModifierBundle()
   */
  static applyComputedBundle(actor, bundle) {
    if (!actor || !bundle) return;

    try {
      // ========================================
      // APPLY SKILLS
      // ========================================
      const derivedSkills = actor.system?.derived?.skills;
      if (derivedSkills && typeof derivedSkills === 'object') {
        for (const [skillKey, computed] of Object.entries(bundle.skills)) {
          if (Array.isArray(derivedSkills[skillKey])) continue;
          derivedSkills[skillKey] ??= {};
          if (typeof computed.total === 'number') {
            derivedSkills[skillKey].total = computed.total;
          }
          if (typeof computed.adjustment === 'number') {
            derivedSkills[skillKey].adjustment = computed.adjustment;
          }
        }
      }

      // ========================================
      // APPLY DEFENSES & OTHER DERIVED
      // ========================================
      const derived = actor.system?.derived;
      if (derived && typeof derived === 'object') {
        // Defenses
        if (!derived.defenses || typeof derived.defenses !== 'object') {
          derived.defenses = {};
        }

        for (const [defenseKey, computed] of Object.entries(bundle.defenses)) {
          if (!derived.defenses[defenseKey]) {
            derived.defenses[defenseKey] = {};
          }
          derived.defenses[defenseKey].total = computed.total;
          derived.defenses[defenseKey].adjustment = computed.adjustment;
        }

        // HP
        if (!derived.hp || typeof derived.hp !== 'object') {
          derived.hp = {};
        }
        derived.hp.total = bundle.hp.total;
        derived.hp.adjustment = bundle.hp.adjustment;

        // BAB
        derived.bab = bundle.bab;
        derived.babAdjustment = bundle.babAdjustment;

        // INITIATIVE
        if (!derived.initiative || typeof derived.initiative !== 'object') {
          derived.initiative = {};
        }
        derived.initiative.total = bundle.initiative;
        derived.initiative.adjustment = bundle.initiativeAdjustment;

        // SPEED
        if (bundle.speed && derived.speed) {
          derived.speed.total = bundle.speed.total;
          derived.speed.adjustment = bundle.speed.adjustment;
        }

        // MODIFIER BREAKDOWN
        derived.modifiers = bundle.modifiers;
      }

      swseLogger.debug(`[ModifierEngine] Applied modifier bundle to ${actor.name}`);
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error applying modifier bundle to ${actor?.name}:`, err);
    }
  }

  /**
   * (DEPRECATED - Phase 3)
   * Apply aggregated modifiers to derived data
   *
   * PHASE 3: This method is deprecated. Use computeModifierBundle() + applyComputedBundle() instead.
   * Kept for backward compatibility. Will be removed in Phase 4.
   *
   * @param {Actor} actor
   * @param {Object<string, number>} modifierMap - From aggregateAll()
   * @param {Modifier[]} allModifiers - Full modifier array
   */
  static async applyAll(actor, modifierMap, allModifiers = []) {
    swseLogger.warn(
      `[ModifierEngine] applyAll() is deprecated. Use computeModifierBundle() + applyComputedBundle() instead.`,
      { actor: actor?.name }
    );

    if (!actor || !modifierMap) return;

    try {
      // Compute pure bundle
      const bundle = this.computeModifierBundle(actor, modifierMap, allModifiers);

      // Apply mutations (only during DerivedCalculator phase)
      this.applyComputedBundle(actor, bundle);

      swseLogger.debug(`[ModifierEngine] Applied modifiers (legacy) to ${actor.name}`);
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error in legacy applyAll for ${actor?.name}:`, err);
    }
  }

  /**
   * ========================================
   * PRIVATE: Modifier Collection Methods
   * ========================================
   */

  /**
   * Collect modifiers from feats
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getFeatModifiers(actor) {
    const modifiers = [];
    const feats = (actor?.items ?? []).filter(i => i.type === 'feat');

    for (const feat of feats) {
      const data = feat.system ?? {};

      // Skip legacy bonuses for PASSIVE execution model (handled by PASSIVE framework)
      if (data.executionModel === 'PASSIVE') {
        continue;
      }

      const featName = feat.name || 'Unknown Feat';
      const featId = feat.id;

      // Parse skill bonuses
      if (data.skillBonuses && typeof data.skillBonuses === 'object') {
        for (const [skillKey, bonusValue] of Object.entries(data.skillBonuses)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.FEAT,
                sourceId: featId,
                sourceName: featName,
                target: `skill.${skillKey}`,
                type: ModifierType.UNTYPED, // Could be inferred from benefit text
                value: bonusValue,
                enabled: true,
                description: `${featName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for feat ${featName} skill ${skillKey}:`, err);
            }
          }
        }
      }

      // Parse defense modifiers
      if (data.defenseModifiers && typeof data.defenseModifiers === 'object') {
        for (const [defense, bonusValue] of Object.entries(data.defenseModifiers)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.FEAT,
                sourceId: featId,
                sourceName: featName,
                target: `defense.${defense}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${featName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for feat ${featName} defense ${defense}:`, err);
            }
          }
        }
      }

      // Parse initiative bonus
      if (typeof data.initiativeBonus === 'number' && data.initiativeBonus !== 0) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.FEAT,
            sourceId: featId,
            sourceName: featName,
            target: 'initiative.total',
            type: ModifierType.UNTYPED,
            value: data.initiativeBonus,
            enabled: true,
            description: `${featName} ${data.initiativeBonus > 0 ? '+' : ''}${data.initiativeBonus}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create modifier for feat ${featName} initiative:`, err);
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from talents
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getTalentModifiers(actor) {
    const modifiers = [];
    const talents = (actor?.items ?? []).filter(i => i.type === 'talent');

    for (const talent of talents) {
      const data = talent.system ?? {};

      // Skip legacy bonuses for PASSIVE execution model (handled by PASSIVE framework)
      if (data.executionModel === 'PASSIVE') {
        continue;
      }

      const talentName = talent.name || 'Unknown Talent';
      const talentId = talent.id;

      // Talents follow same bonus structure as feats
      if (data.skillBonuses && typeof data.skillBonuses === 'object') {
        for (const [skillKey, bonusValue] of Object.entries(data.skillBonuses)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.TALENT,
                sourceId: talentId,
                sourceName: talentName,
                target: `skill.${skillKey}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${talentName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for talent ${talentName}:`, err);
            }
          }
        }
      }

      if (data.defenseModifiers && typeof data.defenseModifiers === 'object') {
        for (const [defense, bonusValue] of Object.entries(data.defenseModifiers)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.TALENT,
                sourceId: talentId,
                sourceName: talentName,
                target: `defense.${defense}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${talentName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for talent ${talentName} defense:`, err);
            }
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from species
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getSpeciesModifiers(actor) {
    const modifiers = [];

    // Species stored in actor.system.species (string or object)
    const species = actor?.system?.species;
    if (!species) return modifiers;

    const speciesName = typeof species === 'string' ? species : species?.name || species?.value || 'Unknown Species';
    const speciesId = `species.${speciesName}`;

    // Parse species data
    const speciesData = typeof species === 'object' ? species : {};

    // Phase 1: Evaluate structured rule elements from species traits (NEW)
    try {
      const allTraits = [
        ...(speciesData.structuralTraits || []),
        ...(speciesData.conditionalTraits || []),
        ...(speciesData.bonusFeats || [])
      ];

      const structuredModifiers = StructuredRuleEvaluator.evaluateSpeciesRules(
        actor,
        allTraits,
        speciesName
      );

      modifiers.push(...structuredModifiers);
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error evaluating structured species rules:`, err);
    }

    // Phase 2: Legacy skill bonuses (DEPRECATED - for backwards compatibility)
    if (speciesData.skillBonuses && typeof speciesData.skillBonuses === 'object') {
      for (const [skillKey, bonusValue] of Object.entries(speciesData.skillBonuses)) {
        if (typeof bonusValue === 'number' && bonusValue !== 0) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.SPECIES,
              sourceId: speciesId,
              sourceName: `${speciesName} (Species)`,
              target: `skill.${skillKey}`,
              type: ModifierType.UNTYPED,
              value: bonusValue,
              enabled: true,
              description: `${speciesName} species +${bonusValue}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create species skill modifier for ${speciesName}:`, err);
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from encumbrance state
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getEncumbranceModifiers(actor) {
    const modifiers = [];

    try {
      const encState = EncumbranceEngine.calculateEncumbrance(actor);

      // Only apply modifiers for heavy load or overloaded states
      if (!encState || (encState.state !== 'heavy' && encState.state !== 'overloaded')) {
        return modifiers;
      }

      // Encumbrance penalty applies to specific skills
      if (encState.skillPenalty !== 0 && Array.isArray(encState.affectedSkills)) {
        const affectedSkills = encState.affectedSkills;
        const penaltyValue = encState.skillPenalty;

        for (const skillKey of affectedSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ENCUMBRANCE,
              sourceId: `encumbrance.${encState.state}`,
              sourceName: `Encumbrance (${encState.label})`,
              target: `skill.${skillKey}`,
              type: ModifierType.PENALTY,
              value: penaltyValue,
              enabled: true,
              priority: 10, // Encumbrance penalties apply early
              description: `${encState.label} ${penaltyValue}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create encumbrance modifier for skill ${skillKey}:`, err);
          }
        }
      }

      // Speed penalty (if applicable)
      if (encState.speedMultiplier !== 1) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ENCUMBRANCE,
            sourceId: `encumbrance.${encState.state}`,
            sourceName: `Encumbrance (${encState.label})`,
            target: 'speed.base',
            type: ModifierType.PENALTY,
            value: Math.round((encState.speedMultiplier - 1) * 100), // As percentage
            enabled: true,
            priority: 10,
            description: `${encState.label} speed`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create encumbrance speed modifier:`, err);
        }
      }

      // Meta-modifier for dexterity loss (special handling in DefenseCalculator)
      if (encState.removeDexToReflex === true) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ENCUMBRANCE,
            sourceId: `encumbrance.${encState.state}`,
            sourceName: `Encumbrance (${encState.label})`,
            target: 'defense.reflex',
            type: ModifierType.DEXTERITY_LOSS,
            value: 0, // Meta-modifier, no numeric value
            enabled: true,
            priority: 5,
            description: 'DEX bonus lost due to encumbrance'
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create encumbrance dexterity loss modifier:`, err);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting encumbrance modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from condition track
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getConditionModifiers(actor) {
    const modifiers = [];

    try {
      const ct = actor?.system?.conditionTrack;
      if (!ct) return modifiers;

      const step = Number(ct.current ?? 0);
      if (step <= 0 || step >= 5) {
        // Step 0 (normal) or 5+ (helpless) don't apply numeric penalties
        return modifiers;
      }

      // Define condition penalties per step (SWSE rules)
      const conditionPenalties = {
        1: -1,   // Step 1: -1 penalty
        2: -2,   // Step 2: -2 penalty
        3: -5,   // Step 3: -5 penalty
        4: -10   // Step 4: -10 penalty
      };

      const penalty = conditionPenalties[step] || 0;
      if (penalty === 0) return modifiers;

      const conditionLabel = `Condition Track (Step ${step})`;

      // NOTE: Condition penalties for skills are now pre-computed in DerivedCalculator
      // and included in system.derived.skills[skillKey].total, so we do NOT apply them
      // here to avoid double-counting. ModifierEngine only applies situational/temporary mods.

      // Apply to defenses
      for (const defense of ['defense.fortitude', 'defense.reflex', 'defense.will']) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.CONDITION,
            sourceId: `condition.step${step}`,
            sourceName: conditionLabel,
            target: defense,
            type: ModifierType.PENALTY,
            value: penalty,
            enabled: true,
            priority: 20,
            description: conditionLabel
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create condition modifier for ${defense}:`, err);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting condition modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from items (equipment, armor, etc.)
   *
   * PHASE 1 IMPLEMENTATION: Armor Modifier Registration
   * This function registers all armor effects as structured modifiers:
   * - Defense bonuses (reflex, fort)
   * - Armor check penalties (to affected skills)
   * - Speed penalties
   * - Max dex bonus enforcement
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getItemModifiers(actor) {
    const modifiers = [];

    if (!actor) return modifiers;

    try {
      // Find equipped armor
      const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system?.equipped);

      if (!equippedArmor) {
        return modifiers; // No armor equipped
      }

      const armorSystem = equippedArmor.system;
      const armorName = equippedArmor.name || 'Unknown Armor';
      const armorId = equippedArmor.id;
      const armorType = (armorSystem.armorType || 'light').toLowerCase();

      // ===== ARMOR PROFICIENCY CHECK =====
      // PHASE 4: Structured proficiency lookup (legacy fallback removed)
      // Proficiency is tracked via actor system flags for each armor type
      const actorProfs = actor?.system?.proficiencies?.armor || {};
      let isProficient = false;

      if (armorType === 'light') {
        isProficient = actorProfs.light === true;
      } else if (armorType === 'medium') {
        isProficient = actorProfs.medium === true;
      } else if (armorType === 'heavy') {
        isProficient = actorProfs.heavy === true;
      }

      // ===== TALENT CHECKS =====
      // PHASE 4: Structured talent identifier lookup (legacy fallback removed)
      // Talents are identified by structured flags on actor system
      const talentFlags = actor?.system?.talentFlags || {};
      let hasArmoredDefense = talentFlags.armoredDefense === true;
      let hasImprovedArmoredDefense = talentFlags.improvedArmoredDefense === true;
      let hasArmorMastery = talentFlags.armorMastery === true;

      // ===== REFLEX DEFENSE BONUS =====
      const baseArmorBonus = armorSystem.defenseBonus || 0;
      const actorLevel = actor?.system?.level || 1;
      if (baseArmorBonus !== 0) {
        // Calculate talent-adjusted armor bonus
        let armorBonusForReflex = baseArmorBonus;
        if (hasImprovedArmoredDefense) {
          // Improved Armored Defense: Use max(level + floor(armor/2), armor)
          armorBonusForReflex = Math.max(baseArmorBonus, actorLevel + Math.floor(baseArmorBonus / 2));
        } else if (hasArmoredDefense) {
          // Armored Defense: Use max(level, armor)
          armorBonusForReflex = Math.max(baseArmorBonus, actorLevel);
        }
        // No talent: Armor bonus is used as-is

        try {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: armorId,
            sourceName: `${armorName} (Armor Bonus)`,
            target: 'defense.reflex',
            type: ModifierType.ARMOR,
            value: armorBonusForReflex,
            enabled: true,
            priority: 30, // After base calculations
            description: `${armorName} provides +${armorBonusForReflex} armor bonus to Reflex Defense`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create armor reflex defense modifier:`, err);
        }
      }

      // ===== FORTITUDE DEFENSE BONUS (Equipment) =====
      // Only apply equipment bonus if proficient
      if (isProficient) {
        const fortBonus = armorSystem.equipmentBonus || armorSystem.fortBonus || 0;
        if (fortBonus !== 0) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: armorId,
              sourceName: `${armorName} (Equipment Bonus)`,
              target: 'defense.fortitude',
              type: ModifierType.EQUIPMENT,
              value: fortBonus,
              enabled: true,
              priority: 30,
              description: `${armorName} provides +${fortBonus} equipment bonus to Fortitude (proficiency)`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create armor fort defense modifier:`, err);
          }
        }
      }

      // ===== MAX DEX BONUS ENFORCEMENT =====
      let maxDex = armorSystem.maxDexBonus ?? null;
      if (Number.isInteger(maxDex)) {
        // Armor Mastery increases max dex by +1
        if (hasArmorMastery) {
          maxDex += 1;
        }

        // Register as a modifier to the defense.dexLimit target
        // This will be consumed by DefenseCalculator to clamp dex modifier
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: armorId,
            sourceName: `${armorName} (Max Dex Limit)`,
            target: 'defense.dexLimit',
            type: ModifierType.RESTRICTION,
            value: maxDex, // Positive number = cap on dex bonus
            enabled: true,
            priority: 50, // Early priority
            description: `${armorName} restricts max Dex bonus to +${maxDex}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create armor max dex modifier:`, err);
        }
      }

      // ===== ARMOR CHECK PENALTY (Skills) =====
      let acpValue = armorSystem.armorCheckPenalty || 0;
      if (!isProficient) {
        // Apply proficiency penalty if not proficient
        const proficiencyPenalty = {
          'light': -2,
          'medium': -5,
          'heavy': -10
        }[armorType] || -2;
        acpValue = acpValue + proficiencyPenalty; // Combine with armor's base penalty
      }

      // Apply ACP to affected skills
      // Skills affected by armor: acrobatics, climb, escapeArtist, jump, sleightOfHand, stealth, swim, useRope
      if (acpValue !== 0) {
        const acpSkills = [
          'acrobatics', 'climb', 'escapeArtist', 'jump', 'sleightOfHand', 'stealth', 'swim', 'useRope'
        ];

        for (const skillKey of acpSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: armorId,
              sourceName: `${armorName} (ACP)`,
              target: `skill.${skillKey}`,
              type: ModifierType.PENALTY,
              value: acpValue, // Negative value
              enabled: true,
              priority: 25, // After other skill modifiers
              description: `${armorName} applies ${acpValue} armor check penalty to ${skillKey}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create armor ACP modifier for skill.${skillKey}:`, err);
          }
        }
      }

      // ===== SPEED PENALTY =====
      let speedPenalty = armorSystem.speedPenalty || 0;
      // Apply SWSE standard speed penalties if not specified
      if (speedPenalty === 0) {
        const baseSpeed = actor.system?.derivedSpeed?.base || actor.system?.speed || 6;
        if (baseSpeed >= 6) {
          if (armorType === 'medium') {
            speedPenalty = -2;
          } else if (armorType === 'heavy') {
            speedPenalty = -4;
          }
        }
      } else {
        // Negate the penalty for modifier (which adds to speed)
        speedPenalty = -speedPenalty;
      }

      if (speedPenalty !== 0) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: armorId,
            sourceName: `${armorName} (Speed Penalty)`,
            target: 'speed.base',
            type: ModifierType.PENALTY,
            value: speedPenalty, // Negative value
            enabled: true,
            priority: 30,
            description: `${armorName} reduces speed by ${Math.abs(speedPenalty)} squares`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create armor speed modifier:`, err);
        }
      }

      // ===== REFLEX DEFENSE EQUIPMENT BONUS (if proficient) =====
      if (isProficient) {
        const reflexEquipmentBonus = armorSystem.equipmentBonus || 0;
        if (reflexEquipmentBonus !== 0) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: armorId,
              sourceName: `${armorName} (Reflex Equipment Bonus)`,
              target: 'defense.reflex',
              type: ModifierType.EQUIPMENT,
              value: reflexEquipmentBonus,
              enabled: true,
              priority: 30,
              description: `${armorName} provides +${reflexEquipmentBonus} equipment bonus to Reflex (proficiency)`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create armor reflex equipment modifier:`, err);
          }
        }
      }

      // ===== PHASE 5: ARMOR UPGRADE MODIFIERS =====
      // Register modifiers from installed upgrades on the armor
      const installedUpgrades = armorSystem.installedUpgrades || [];
      if (Array.isArray(installedUpgrades) && installedUpgrades.length > 0) {
        for (const upgrade of installedUpgrades) {
          if (!upgrade || typeof upgrade !== 'object') continue;

          const upgradeName = upgrade.name || `Upgrade ${upgrade.id}`;
          const upgradeId = upgrade.id;

          // Armor upgrades can modify:
          // - defense.reflex (additional armor bonus)
          // - defense.fort (additional equipment bonus)
          // - skill.* (modify armor check penalty)
          // - speed.base (modify speed penalty)

          // Example upgrade data structure:
          // {
          //   name: "Reinforced Plating",
          //   modifiers: {
          //     reflexBonus: 1,       // +1 reflex defense
          //     fortBonus: 0,         // +0 fort defense
          //     acpModifier: 0,       // no ACP change
          //     speedModifier: 0      // no speed change
          //   }
          // }

          const upgradeModifiers = upgrade.modifiers || {};

          // Reflex bonus from upgrade
          if (typeof upgradeModifiers.reflexBonus === 'number' && upgradeModifiers.reflexBonus !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Reflex Bonus)`,
                target: 'defense.reflex',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.reflexBonus,
                enabled: true,
                priority: 35, // After base armor bonus
                description: `${upgradeName} provides +${upgradeModifiers.reflexBonus} reflex defense`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade reflex modifier for ${upgradeName}:`, err);
            }
          }

          // Fortitude bonus from upgrade
          if (typeof upgradeModifiers.fortBonus === 'number' && upgradeModifiers.fortBonus !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Fort Bonus)`,
                target: 'defense.fortitude',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.fortBonus,
                enabled: true,
                priority: 35,
                description: `${upgradeName} provides +${upgradeModifiers.fortBonus} fortitude defense`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade fort modifier for ${upgradeName}:`, err);
            }
          }

          // ACP modifier from upgrade (affects all ACP-affected skills)
          if (typeof upgradeModifiers.acpModifier === 'number' && upgradeModifiers.acpModifier !== 0) {
            const acpSkills = [
              'acrobatics', 'climb', 'escapeArtist', 'jump', 'sleightOfHand', 'stealth', 'swim', 'useRope'
            ];

            for (const skillKey of acpSkills) {
              try {
                modifiers.push(createModifier({
                  source: ModifierSource.ITEM,
                  sourceId: upgradeId,
                  sourceName: `${upgradeName} (ACP Mod)`,
                  target: `skill.${skillKey}`,
                  type: ModifierType.ENHANCEMENT,
                  value: upgradeModifiers.acpModifier,
                  enabled: true,
                  priority: 35,
                  description: `${upgradeName} modifies armor check penalty by ${upgradeModifiers.acpModifier > 0 ? '+' : ''}${upgradeModifiers.acpModifier}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create upgrade ACP modifier for skill.${skillKey}:`, err);
              }
            }
          }

          // Speed modifier from upgrade
          if (typeof upgradeModifiers.speedModifier === 'number' && upgradeModifiers.speedModifier !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Speed Mod)`,
                target: 'speed.base',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.speedModifier,
                enabled: true,
                priority: 35,
                description: `${upgradeName} modifies speed by ${upgradeModifiers.speedModifier > 0 ? '+' : ''}${upgradeModifiers.speedModifier}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade speed modifier for ${upgradeName}:`, err);
            }
          }
        }
      }

      swseLogger.debug(`[ModifierEngine] Registered ${modifiers.length} armor modifiers for ${armorName} (${armorType}, proficient: ${isProficient})`);

    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting armor item modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect weapon modifiers from equipped weapons
   * Replaces direct weapon calculations in combat-utils.js
   * Integrates WeaponsEngine to register weapon effects as modifiers:
   * - Enhancement bonuses
   * - Proficiency penalties
   * - Two-handed bonuses
   * - Talent-based damage bonuses
   * - Weapon properties (keen, flaming, etc.)
   *
   * @private
   * @param {Actor} actor - Actor with equipped weapons
   * @returns {Modifier[]}
   */
  static _getWeaponModifiers(actor) {
    const modifiers = [];

    try {
      if (!actor) {
        return modifiers;
      }

      // Get all weapon modifiers through WeaponsEngine
      const weaponMods = WeaponsEngine.getWeaponModifiers(actor);
      modifiers.push(...weaponMods);

      swseLogger.debug(`[ModifierEngine] Collected ${weaponMods.length} weapon modifiers for ${actor.name}`);
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting weapon modifiers for ${actor?.name}:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from droid modifications (Phase A)
   * Droids can install hardware modifications that contribute modifiers
   *
   * @private
   * @param {Actor} actor - Must be a droid actor
   * @returns {Modifier[]}
   */
  static async _getDroidModModifiers(actor) {
    const modifiers = [];

    if (actor.type !== 'droid') {
      return modifiers;
    }

    try {
      // PHASE 4 STEP 7: Support both legacy (droidSystems.mods) and new (installedSystems) structures
      const droidSystems = actor?.system?.droidSystems;
      const installedSystems = actor?.system?.installedSystems;

      // Legacy path: droidSystems.mods (builder system)
      if (droidSystems) {
        const mods = Array.isArray(droidSystems.mods) ? droidSystems.mods : [];

        for (const mod of mods) {
          // Skip disabled modifications
          if (mod.enabled === false) {
            continue;
          }

          const modName = mod.name || `Droid Mod ${mod.id}`;
          const modId = mod.id;
          const modArray = Array.isArray(mod.modifiers) ? mod.modifiers : [];

          // Convert each modifier in the modification
          for (const modifierData of modArray) {
            if (!modifierData || typeof modifierData !== 'object') continue;

            const target = String(modifierData.target || '').trim();
            const type = String(modifierData.type || 'untyped').trim().toLowerCase();
            const value = Number(modifierData.value) || 0;

            if (!target) continue;

            try {
              modifiers.push(createModifier({
                source: ModifierSource.DROID_MOD,
                sourceId: modId,
                sourceName: modName,
                target: target,
                type: type,
                value: value,
                enabled: true,
                description: `${modName}: ${target} ${value > 0 ? '+' : ''}${value}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for droid mod ${modName}:`, err);
            }
          }
        }
      }

      // PHASE 4 STEP 7: New path - installedSystems from DROID_SYSTEM_DEFINITIONS
      if (installedSystems && typeof installedSystems === 'object') {
        try {
          const { DROID_SYSTEM_DEFINITIONS, getDroidSystemDefinition } = await import("/systems/foundryvtt-swse/scripts/domain/droids/droid-system-definitions.js");

          for (const [systemId, installed] of Object.entries(installedSystems)) {
            const def = getDroidSystemDefinition(systemId);
            if (!def) {
              continue; // System definition not found
            }

            const systemName = def.name || systemId;
            const effects = Array.isArray(def.effects) ? def.effects : [];

            // Convert system effects into modifiers
            for (const effect of effects) {
              if (!effect || typeof effect !== 'object') continue;

              const target = String(effect.target || '').trim();
              const type = String(effect.type || 'untyped').trim().toLowerCase();
              const value = Number(effect.value) || 0;

              if (!target) continue;

              try {
                modifiers.push(createModifier({
                  source: ModifierSource.DROID_MOD,
                  sourceId: systemId,
                  sourceName: systemName,
                  target: target,
                  type: type,
                  value: value,
                  enabled: true,
                  description: `${systemName}: ${target} ${value > 0 ? '+' : ''}${value}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create modifier for system ${systemName}:`, err);
              }
            }
          }
        } catch (err) {
          swseLogger.warn(`[ModifierEngine] Error processing installed droid systems:`, err);
        }
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers from droid modifications`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting droid mod modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from vehicle systems (Phase 6)
   * Vehicles can install modifications that contribute modifiers
   *
   * @private
   * @param {Actor} actor - Must be a vehicle actor
   * @returns {Modifier[]}
   */
  static async _getVehicleModModifiers(actor) {
    const modifiers = [];

    if (actor.type !== 'vehicle') {
      return modifiers;
    }

    try {
      const installedSystems = actor?.system?.installedSystems;

      if (installedSystems && typeof installedSystems === 'object') {
        try {
          const { VEHICLE_SYSTEM_DEFINITIONS, getVehicleSystemDefinition } = await import("/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-system-definitions.js");

          for (const [systemId, installed] of Object.entries(installedSystems)) {
            const def = getVehicleSystemDefinition(systemId);
            if (!def) {
              continue;
            }

            const systemName = def.name || systemId;
            const effects = Array.isArray(def.effects) ? def.effects : [];

            for (const effect of effects) {
              if (!effect || typeof effect !== 'object') continue;

              const target = String(effect.target || '').trim();
              const type = String(effect.type || 'untyped').trim().toLowerCase();
              const value = Number(effect.value) || 0;

              if (!target) continue;

              try {
                modifiers.push(createModifier({
                  source: ModifierSource.VEHICLE_MOD,
                  sourceId: systemId,
                  sourceName: systemName,
                  target: target,
                  type: type,
                  value: value,
                  enabled: true,
                  description: `${systemName}: ${target} ${value > 0 ? '+' : ''}${value}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create modifier for vehicle system ${systemName}:`, err);
              }
            }
          }
        } catch (err) {
          swseLogger.warn(`[ModifierEngine] Error processing vehicle systems:`, err);
        }
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers from vehicle modifications`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting vehicle mod modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from custom sources (Phase B - UI-managed)
   * Stored in actor.system.customModifiers array
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getCustomModifiers(actor) {
    const modifiers = [];

    try {
      const customMods = Array.isArray(actor?.system?.customModifiers) ? actor.system.customModifiers : [];

      for (const customMod of customMods) {
        // Skip disabled custom modifiers
        if (customMod.enabled === false) {
          continue;
        }

        if (!customMod || typeof customMod !== 'object') continue;

        const customName = customMod.sourceName || customMod.name || 'Custom Modifier';
        const customId = customMod.id;
        const target = String(customMod.target || '').trim();
        const type = String(customMod.type || 'untyped').trim().toLowerCase();
        const value = Number(customMod.value) || 0;

        if (!target) continue;

        try {
          modifiers.push(createModifier({
            source: ModifierSource.CUSTOM,
            sourceId: customId || `custom_${customName}`,
            sourceName: customName,
            target: target,
            type: type,
            value: value,
            enabled: true,
            description: `${customName}: ${target} ${value > 0 ? '+' : ''}${value}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create custom modifier ${customName}:`, err);
        }
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} custom modifiers`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting custom modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from PASSIVE execution model abilities (Phase 1)
   *
   * PASSIVE MODIFIER abilities register themselves in actor._passiveModifiers
   * during PassiveAdapter.handleModifier() execution.
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getPassiveModifiers(actor) {
    const modifiers = [];

    try {
      // PHASE 4: Wire into actor preparation
      // PASSIVE modifiers are stored on actor during registration
      const passiveModifiers = actor?._passiveModifiers || {};

      for (const abilityId in passiveModifiers) {
        const mods = passiveModifiers[abilityId];
        if (Array.isArray(mods)) {
          modifiers.push(...mods);
        }
      }

      if (modifiers.length > 0) {
        swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} PASSIVE modifiers`);
      }

      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting PASSIVE modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from active effects (Phase D)
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getActiveEffectModifiers(actor) {
    const modifiers = [];

    try {
      const effects = Array.isArray(actor?.system?.activeEffects) ? actor.system.activeEffects : [];

      for (const effect of effects) {
        if (effect.enabled === false || !effect.target) continue;

        try {
          modifiers.push(createModifier({
            source: ModifierSource.EFFECT,
            sourceId: effect.id,
            sourceName: `${effect.name} (${effect.roundsRemaining}r)`,
            target: effect.target,
            type: String(effect.type || 'untyped').toLowerCase(),
            value: Number(effect.value) || 0,
            enabled: true,
            description: `${effect.name}: ${effect.roundsRemaining} rounds`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create active effect modifier:`, err);
        }
      }

      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting active effects:`, err);
      return modifiers;
    }
  }

  /**
   * Get all skill target keys for an actor
   * @private
   * @param {Actor} actor
   * @returns {string[]}
   */
  static _getAllSkillTargets(actor) {
    const skills = actor?.system?.skills;
    if (!skills || typeof skills !== 'object') return [];

    return Object.keys(skills)
      .filter(key => skills[key] && typeof skills[key] === 'object')
      .map(key => `skill.${key}`);
  }
}

export default ModifierEngine;
