/**
 * DerivedCalculator — Derived Layer Orchestrator
 *
 * PHASE 2 COMPLETION: The ONLY place in the system where ANY derived values are computed.
 * This is the SOLE authority for all derived calculations.
 *
 * Computes:
 * - Ability modifiers (from base attributes)
 * - HP max, base, and totals
 * - BAB (base attack bonus)
 * - Defense totals (fortitude, reflex, will)
 * - Initiative derived
 * - Force/Destiny points derived
 * - Modifier breakdown for UI
 *
 * Called from actor.prepareDerivedData() after all mutations complete.
 *
 * Contract:
 * - Reads from: actor.system.* (base actor fields) + actor.system.progression.*
 * - Writes ONLY to: actor.system.derived.* (derived outputs, V2 authority)
 * - No mutations, no side effects beyond setting derived values
 * - Pure input → output transformer
 */

import { HPCalculator } from './hp-calculator.js';
import { BABCalculator } from './bab-calculator.js';
import { DefenseCalculator } from './defense-calculator.js';
import { ModifierEngine } from '../../engines/effects/modifiers/ModifierEngine.js';
import { swseLogger } from '../../utils/logger.js';
import { MutationIntegrityLayer } from '../../governance/sentinel/mutation-integrity-layer.js';
import { getLevelSplit } from './level-split.js';

export class DerivedCalculator {
  /**
   * Compute all derived values for an actor.
   * Called from prepareDerivedData() during recalculation pass.
   *
   * @param {Actor} actor - the actor being recalculated
   * @returns {Promise<Object>} update object to apply to derived system fields
   */
  static async computeAll(actor) {
    try {
      // PHASE 3 AUDITING: Record derived recalculation
      MutationIntegrityLayer.recordDerivedRecalc();

      const prog = actor.system.progression || {};
      const classLevels = prog.classLevels || [];

      // ========================================
      // PHASE 0: Modifier Pipeline Integration
      // ========================================
      // Collect all modifiers from every source
      const allModifiers = await ModifierEngine.getAllModifiers(actor);

      // Aggregate modifiers: group by target, apply stacking rules
      const modifierMap = await ModifierEngine.aggregateAll(actor);

      // Extract specific adjustments for calculators
      const hpAdjustment = modifierMap['hp.max'] || 0;
      const defenseAdjustments = {
        fort: modifierMap['defense.fortitude'] || 0,
        ref: modifierMap['defense.reflex'] || 0,
        will: modifierMap['defense.will'] || 0
      };
      const babAdjustment = modifierMap['bab.total'] || 0;

      swseLogger.debug(`[DerivedCalculator] Modifier adjustments: HP=${hpAdjustment}, Fort=${defenseAdjustments.fort}, Ref=${defenseAdjustments.ref}, Will=${defenseAdjustments.will}, BAB=${babAdjustment}`);

      // ========================================
      // Compute all derived values (base only)
      // ========================================
      const hp = HPCalculator.calculate(actor, classLevels, { adjustment: hpAdjustment });
      const bab = await BABCalculator.calculate(classLevels, { adjustment: babAdjustment });
      const defenses = await DefenseCalculator.calculate(actor, classLevels, { adjustments: defenseAdjustments });

      // Build update object (all writes go to system.derived.*)
      const updates = {};

      // ========================================
      // Level Split (Heroic vs Nonheroic)
      // ========================================
      const { heroicLevel, nonheroicLevel } = getLevelSplit(actor);
      updates['system.derived.heroicLevel'] = heroicLevel;
      updates['system.derived.nonheroicLevel'] = nonheroicLevel;

      // ========================================
      // Ability Modifiers (Phase 2: moved from DataModel)
      // ========================================
      updates['system.derived.attributes'] = {};
      const attributes = actor.system.attributes || {};
      for (const [key, ability] of Object.entries(attributes)) {
        const total = (ability.base || 10) + (ability.racial || 0) + (ability.enhancement || 0) + (ability.temp || 0);
        const mod = Math.floor((total - 10) / 2);
        updates['system.derived.attributes'][key] = {
          base: ability.base || 10,
          racial: ability.racial || 0,
          enhancement: ability.enhancement || 0,
          temp: ability.temp || 0,
          total: total,
          mod: mod
        };
      }

      // ========================================
      // Initiative Derived (Phase 2: moved from DataModel)
      // ========================================
      const dexMod = (updates['system.derived.attributes']?.dex?.mod) || 0;
      const initiativeAdjustment = modifierMap['initiative.total'] || 0;
      updates['system.derived.initiative'] = {
        dexModifier: dexMod,
        adjustment: initiativeAdjustment,
        total: dexMod + initiativeAdjustment
      };

      // ========================================
      // Force/Destiny Points Derived (Phase 2: moved from DataModel)
      // ========================================
      // Force points: WIS modifier + class levels + bonuses
      const wisMod = (updates['system.derived.attributes']?.wis?.mod) || 0;
      const forceClassBonus = actor.system.forcePoints?.classBonus || 0;
      updates['system.derived.forcePoints'] = {
        wisdom: wisMod,
        classBonus: forceClassBonus,
        total: wisMod + forceClassBonus + (actor.system.forcePoints?.bonus || 0)
      };

      // Destiny points: CHA modifier + class levels + bonuses
      const chaMod = (updates['system.derived.attributes']?.cha?.mod) || 0;
      const destinyClassBonus = actor.system.destinyPoints?.classBonus || 0;
      updates['system.derived.destinyPoints'] = {
        charisma: chaMod,
        classBonus: destinyClassBonus,
        total: chaMod + destinyClassBonus + (actor.system.destinyPoints?.bonus || 0)
      };

      // HP
      if (hp.max > 0) {
        updates['system.derived.hp'] = {
          base: hp.base || hp.max,  // Store base for reference
          max: hp.max,
          total: hp.max,
          value: actor.system.hp?.value || hp.value, // Preserve current HP if set
          adjustment: hpAdjustment
        };
      }

      // BAB
      if (bab >= 0) {
        updates['system.derived.bab'] = bab;
        updates['system.derived.babAdjustment'] = babAdjustment;
      }

      // Defenses
      if (defenses.fortitude) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].fortitude = {
          base: defenses.fortitude.base,
          total: defenses.fortitude.total,
          adjustment: defenseAdjustments.fort
        };
      }
      if (defenses.reflex) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].reflex = {
          base: defenses.reflex.base,
          total: defenses.reflex.total,
          adjustment: defenseAdjustments.ref
        };
      }
      if (defenses.will) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].will = {
          base: defenses.will.base,
          total: defenses.will.total,
          adjustment: defenseAdjustments.will
        };
      }

      // ========================================
      // Skills Derived (Phase 4: moved from DataModel._prepareSkills)
      // ========================================
      updates['system.derived.skills'] = {};
      const skillData = {
        acrobatics: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
        animalHandling: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
        athleticism: { defaultAbility: 'str', untrained: true, armorPenalty: true },
        awareness: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
        climb: { defaultAbility: 'str', untrained: true, armorPenalty: true },
        concentration: { defaultAbility: 'con', untrained: true, armorPenalty: false },
        deception: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
        gatherInformation: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
        initiative: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
        insight: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
        intimidate: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
        jump: { defaultAbility: 'str', untrained: true, armorPenalty: true },
        knowledge: { defaultAbility: 'int', untrained: false, armorPenalty: false },
        mechanics: { defaultAbility: 'int', untrained: false, armorPenalty: false },
        medicine: { defaultAbility: 'wis', untrained: false, armorPenalty: false },
        perception: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
        persuasion: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
        piloting: { defaultAbility: 'dex', untrained: false, armorPenalty: false },
        ride: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
        stealth: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
        survival: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
        swim: { defaultAbility: 'str', untrained: true, armorPenalty: true },
        treatInjury: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
        useComputer: { defaultAbility: 'int', untrained: true, armorPenalty: false },
        useTheForce: { defaultAbility: 'cha', untrained: true, armorPenalty: false }
      };

      const halfLevel = actor.system.halfLevel || 0;
      const isDroid = actor.system.isDroid || false;
      const droidUntrainedSkills = ['acrobatics', 'climb', 'jump', 'perception'];

      // Get occupation bonus from actor flags
      let occupationBonus = null;
      if (actor.flags?.swse?.occupationBonus) {
        occupationBonus = actor.flags.swse.occupationBonus;
      }

      // Get species skill bonuses (computed via SpeciesTraitEngine - currently empty)
      const speciesSkillBonuses = actor.system.speciesSkillBonuses || {};

      for (const [skillKey, skillDef] of Object.entries(skillData)) {
        const skill = actor.system.skills?.[skillKey];
        if (!skill) continue;

        // Get ability modifier
        const abilityKey = skill.selectedAbility || skillDef.defaultAbility;
        const abilityMod = (updates['system.derived.attributes']?.[abilityKey]?.mod) || 0;

        // Calculate total bonus
        let total = abilityMod + (skill.miscMod || 0);

        // Add species trait bonus
        const speciesBonus = speciesSkillBonuses[skillKey] || 0;
        total += speciesBonus;

        // Add training bonus
        if (skill.trained) {
          total += 5;
        }

        // Add half level
        total += halfLevel;

        // Add skill focus bonus
        if (skill.focused) {
          total += 5;
        }

        // Apply occupation bonus (only to untrained checks)
        let hasOccupationBonus = false;
        if (!skill.trained && occupationBonus?.skills?.includes(skillKey)) {
          total += occupationBonus.value || 2;
          hasOccupationBonus = true;
        }

        // Determine if skill can be used untrained
        let canUseUntrained = skillDef.untrained;
        if (isDroid && !skill.trained) {
          canUseUntrained = droidUntrainedSkills.includes(skillKey);
        }

        updates['system.derived.skills'][skillKey] = {
          total: total,
          abilityMod: abilityMod,
          selectedAbility: abilityKey,
          trained: skill.trained || false,
          focused: skill.focused || false,
          miscMod: skill.miscMod || 0,
          speciesBonus: speciesBonus,
          hasOccupationBonus: hasOccupationBonus,
          canUseUntrained: canUseUntrained,
          defaultAbility: skillDef.defaultAbility
        };
      }

      // ========================================
      // Damage Threshold (Phase 5: moved from DataModel._applyEnhancedDamageThreshold)
      // ========================================
      try {
        const enableEnhanced = game.settings?.get('foundryvtt-swse', 'enableEnhancedMassiveDamage');
        const modifyFormula = game.settings?.get('foundryvtt-swse', 'modifyDamageThresholdFormula');

        let damageThreshold = (updates['system.derived.defenses']?.fortitude?.total) ?? 10;

        if (enableEnhanced && modifyFormula) {
          const formulaType = game.settings?.get('foundryvtt-swse', 'damageThresholdFormulaType') ?? 'fullLevel';
          const computedHeroicLevel = heroicLevel || actor.system.level || 1;  // Use computed value or fallback
          const sizeModifiers = {
            'fine': -10, 'diminutive': -5, 'tiny': -2, 'small': -1,
            'medium': 0, 'large': 1, 'huge': 2, 'gargantuan': 5, 'colossal': 10
          };
          const actorSize = (actor.size || 'medium').toLowerCase();
          const sizeMod = sizeModifiers[actorSize] ?? 0;

          if (formulaType === 'halfLevel') {
            damageThreshold = damageThreshold + Math.floor(computedHeroicLevel / 2) + sizeMod;
          } else {
            damageThreshold = damageThreshold + computedHeroicLevel + sizeMod;
          }
        }

        updates['system.derived.damageThreshold'] = damageThreshold;
      } catch (err) {
        swseLogger.error('DerivedCalculator: Error computing damage threshold', err);
        updates['system.derived.damageThreshold'] = 10;
      }

      // ========================================
      // Store modifier breakdown for UI
      // ========================================
      const skillTargets = Object.keys(actor?.system?.skills || {})
        .map(key => `skill.${key}`);
      const allTargets = [
        ...skillTargets,
        'defense.fortitude', 'defense.reflex', 'defense.will',
        'hp.max', 'bab.total', 'initiative.total'
      ];
      const modifierBreakdown = await ModifierEngine.buildModifierBreakdown(actor, allTargets);

      updates['system.derived.modifiers'] = {
        all: allModifiers,
        breakdown: modifierBreakdown
      };

      swseLogger.debug(`DerivedCalculator computed for ${actor.name}`, { updates });

      return updates;
    } catch (err) {
      swseLogger.error(`DerivedCalculator.computeAll failed for ${actor?.name ?? 'unknown'}`, err);
      throw err;
    }
  }
}
