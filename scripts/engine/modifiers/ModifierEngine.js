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

import { ModifierType, ModifierSource, createModifier, isValidModifier } from './ModifierTypes.js';
import ModifierUtils from './ModifierUtils.js';
import { EncumbranceEngine } from '../encumbrance/EncumbranceEngine.js';
import { swseLogger } from '../../utils/logger.js';

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

      // Source 7: Custom effects (future)
      // modifiers.push(...this._getCustomModifiers(actor));

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
   * @param {Actor} actor
   * @returns {Object<string, number>} Map of target → total modifier value
   */
  static async aggregateAll(actor) {
    const allModifiers = await this.getAllModifiers(actor);
    const aggregated = {};

    // Group by target
    const byTarget = ModifierUtils.groupByTarget(allModifiers);

    // For each target, resolve stacking and sum
    for (const [target, modsForTarget] of byTarget.entries()) {
      const resolved = ModifierUtils.resolveStacking(modsForTarget);
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
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {number}
   */
  static async aggregateTarget(actor, target) {
    const allModifiers = await this.getAllModifiers(actor);
    return ModifierUtils.calculateModifierTotal(allModifiers, target);
  }

  /**
   * Get detailed modifier breakdown for UI display
   *
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {Object} {total, applied, breakdown}
   */
  static async getModifierDetail(actor, target) {
    const allModifiers = await this.getAllModifiers(actor);
    return ModifierUtils.getModifierDetail(allModifiers, target);
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
   * Apply aggregated modifiers to derived data
   *
   * Writes to:
   * - actor.system.skills[key].total = base + modifier
   * - actor.system.derived.defense.*.total = base + modifier
   * - actor.system.derived.hp.total = base + modifier
   * - actor.system.derived.modifiers = breakdown
   *
   * GUARDRAIL: Only writes to .total fields, never .base fields
   *
   * @param {Actor} actor
   * @param {Object<string, number>} modifierMap - From aggregateAll()
   * @param {Modifier[]} allModifiers - Full modifier array
   */
  static async applyAll(actor, modifierMap, allModifiers = []) {
    if (!actor || !modifierMap) return;

    try {
      // Build modifier breakdown for storage
      const skillTargets = this._getAllSkillTargets(actor);
      const defenseTargets = ['defense.fort', 'defense.reflex', 'defense.will', 'defense.damageThreshold'];
      const allTargets = [...skillTargets, ...defenseTargets, 'hp.max', 'bab.total', 'initiative.total', 'speed.base'];

      const modifierBreakdown = ModifierUtils.buildModifierBreakdown(allModifiers, allTargets);

      // ========================================
      // SKILLS
      // ========================================
      const skills = actor.system?.skills;
      if (skills && typeof skills === 'object') {
        for (const [skillKey, skillData] of Object.entries(skills)) {
          if (!skillData || typeof skillData !== 'object') continue;

          const targetKey = `skill.${skillKey}`;
          const modifier = modifierMap[targetKey] || 0;
          const base = skillData.base || skillData.total || 0;

          // GUARDRAIL: Do NOT mutate base
          skillData.total = Math.max(0, base + modifier);
        }
      }

      // ========================================
      // DEFENSES
      // ========================================
      const derived = actor.system?.derived;
      if (derived && typeof derived === 'object') {
        // Initialize defenses structure if needed
        if (!derived.defenses || typeof derived.defenses !== 'object') {
          derived.defenses = {};
        }

        const defensePaths = {
          fort: 'defense.fort',
          fortitude: 'defense.fort',
          ref: 'defense.reflex',
          reflex: 'defense.reflex',
          will: 'defense.will'
        };

        for (const [defenseKey, targetKey] of Object.entries(defensePaths)) {
          const defense = derived.defenses[defenseKey] || {};
          const modifier = modifierMap[targetKey] || 0;

          // Get base value (from class calculation)
          const base = defense.base || defense.total || 10;

          // GUARDRAIL: Do NOT mutate base
          defense.total = Math.max(1, base + modifier);

          // Store adjustment for UI display
          defense.adjustment = modifier;

          derived.defenses[defenseKey] = defense;
        }

        // ========================================
        // HP
        // ========================================
        if (!derived.hp || typeof derived.hp !== 'object') {
          derived.hp = {};
        }

        const hpModifier = modifierMap['hp.max'] || 0;
        const hpBase = derived.hp.base || 1;

        // GUARDRAIL: Do NOT mutate base
        derived.hp.total = Math.max(1, hpBase + hpModifier);
        derived.hp.adjustment = hpModifier;

        // ========================================
        // BAB (Base Attack Bonus)
        // ========================================
        const babModifier = modifierMap['bab.total'] || 0;
        derived.bab = (derived.bab || 0) + babModifier;
        derived.babAdjustment = babModifier;

        // ========================================
        // INITIATIVE
        // ========================================
        const initiativeModifier = modifierMap['initiative.total'] || 0;
        derived.initiative = (derived.initiative || 0) + initiativeModifier;
        derived.initiativeAdjustment = initiativeModifier;

        // ========================================
        // SPEED
        // ========================================
        const speedModifier = modifierMap['speed.base'] || 0;
        if (derived.speed) {
          const baseSpeed = derived.speed.base || 0;
          derived.speed.total = Math.max(0, baseSpeed + speedModifier);
          derived.speed.adjustment = speedModifier;
        }

        // ========================================
        // STORE MODIFIER BREAKDOWN (for UI)
        // ========================================
        derived.modifiers = {
          all: allModifiers || [],
          breakdown: modifierBreakdown
        };
      }

      swseLogger.debug(`[ModifierEngine] Applied modifiers to ${actor.name}`);
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error applying modifiers to ${actor?.name}:`, err);
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

    // Parse skill bonuses from species
    const speciesData = typeof species === 'object' ? species : {};

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

      if (!encState || encState.state === 'normal') {
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

      // Apply to all skills
      const allSkills = this._getAllSkillTargets(actor);
      for (const skillTarget of allSkills) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.CONDITION,
            sourceId: `condition.step${step}`,
            sourceName: conditionLabel,
            target: skillTarget,
            type: ModifierType.PENALTY,
            value: penalty,
            enabled: true,
            priority: 20, // After other penalties
            description: conditionLabel
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create condition modifier for ${skillTarget}:`, err);
        }
      }

      // Apply to defenses
      for (const defense of ['defense.fort', 'defense.reflex', 'defense.will']) {
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
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getItemModifiers(actor) {
    // Phase 0: Items don't have modifiers yet
    // Phase 1+: Parse armor AC bonuses, etc.
    return [];
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
