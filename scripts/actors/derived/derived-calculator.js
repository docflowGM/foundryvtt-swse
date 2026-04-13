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

import { HPCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/hp-calculator.js";
import { BABCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/bab-calculator.js";
import { DefenseCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { DerivedOverrideEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/derived-override-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { MutationIntegrityLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/mutation-integrity-layer.js";
import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

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
      // PHASE 4: HP is now mirror-only (ActorEngine.recomputeHP is sole writer of system.hp.max)
      // Do NOT call HPCalculator.calculate() - that is now owned by ActorEngine
      const hp = {
        base: actor.system.hp?.max || 1,
        max: actor.system.hp?.max || 1,
        value: actor.system.hp?.value || actor.system.hp?.max || 1,
        total: actor.system.hp?.max || 1,
        adjustment: 0 // Adjustments are part of ActorEngine.recomputeHP, not derived
      };
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
      // Canonical stored abilities path is system.abilities.<key>.{base, racial, temp}
      // Derived computes totals and modifiers, written to system.derived.attributes.<key>
      updates['system.derived.attributes'] = {};
      const abilities = actor.system.abilities || {};
      for (const [key, ability] of Object.entries(abilities)) {
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
      // Force/Destiny Points (PHASE 10+: REMOVED from derived)
      // ========================================
      // DECISION: Force Points and Destiny Points are stored-authoritative, not derived.
      // - system.forcePoints.value = current FP (user-managed via spend/gain)
      // - system.forcePoints.max = max FP (calculated and stored at chargen/levelup/class-change)
      //
      // Dead fields removed:
      // - system.forcePoints.classBonus (read but never written; no rule or data backing it)
      // - derived.forcePoints (was echoing stale classBonus logic)
      // - derived.destinyPoints (similar dead logic)
      //
      // Sheet reads directly from system.forcePoints.{value,max} (canonical contract).
      // See scripts/data/force-points.js for max FP calculation and lifecycle triggers.

      // HP: Mirror-only pattern (Phase 4)
      // ActorEngine.recomputeHP() is the sole writer of system.hp.max
      // DerivedCalculator mirrors system.hp.max → system.derived.hp for UI compatibility
      updates['system.derived.hp'] = {
        base: hp.base,
        max: hp.max,
        total: hp.max,
        value: hp.value,
        adjustment: 0 // No independent adjustments (all in ActorEngine.recomputeHP)
      };

      // BAB
      if (bab >= 0) {
        updates['system.derived.bab'] = bab;
        updates['system.derived.babAdjustment'] = babAdjustment;
      }

      // ========================================
      // Grapple Bonus Derived (BAB + STR + Size + Species bonuses)
      // ========================================
      const strMod = (updates['system.derived.attributes']?.str?.mod) || 0;
      const sizeTable = { 'fine': -8, 'diminutive': -4, 'tiny': -2, 'small': -1, 'medium': 0, 'large': 4, 'huge': 8, 'gargantuan': 12, 'colossal': 16 };
      const sizeMod = sizeTable[actor.system?.size] || 0;
      const speciesGrapple = actor.system?.speciesCombatBonuses?.grapple || actor.system?.speciesTraitBonuses?.combat?.grapple || 0;
      const grappleBonus = bab.total + strMod + sizeMod + speciesGrapple;
      updates['system.derived.grappleBonus'] = grappleBonus;

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
      if (defenses.flatFooted) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].flatFooted = {
          base: defenses.flatFooted.base,
          total: defenses.flatFooted.total,
          adjustment: defenseAdjustments.ref
        };
      }

      // ========================================
      // Skills Derived (Phase 4: moved from DataModel._prepareSkills)
      // SSOT: system.derived.skills[skillKey].total is the CANONICAL skill modifier
      // ========================================
      // IMPORTANT: This is the SINGLE SOURCE OF TRUTH for skill rolls.
      // system.derived.skills[skillKey].total includes:
      //   - Ability modifier (from derived.attributes[abilityKey].mod)
      //   - Training bonus (+5 if trained)
      //   - Skill focus bonus (+5 if focused)
      //   - Half-level bonus
      //   - Miscellaneous user modifier
      //   - Species skill bonuses
      //   - Feat/talent bonuses (from ModifierEngine)
      //   - PASSIVE/STATE conditional bonuses
      //   - Armor check penalties (if applicable)
      //   - Condition track penalties (from derived.damage.conditionPenalty)
      //
      // Skills rolls call RollCore.execute() with:
      //   baseBonus = derived.skills[skillKey].total
      //   modifierTotal = ModifierEngine.aggregateTarget() (situational mods only)
      //   formula = 1d20 + baseBonus + modifierTotal
      //
      // If derived.skills is missing/uninitialized, rollSkill() logs a warning
      // and returns null (graceful fallback, no recompute).
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
        if (!skill) {
          // PHASE 6: Instrumentation — missing skill in base input
          // This should not happen if template/progression correctly initialized skills
          swseLogger.warn(`[Phase 6] Skill ${skillKey} missing from canonical base input (system.skills)`, {
            actor: actor.name,
            skillKey
          });
          continue;
        }

        // Phase 3C: Canonical skill schema = {trained, miscMod, focused, selectedAbility}
        // Derived uses these to compute skill totals. Schema is initialized by progression.
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

        // Add feat/equipment/other modifiers from ModifierEngine (SSOT integration)
        const featBonus = modifierMap[`skill.${skillKey}`] || 0;
        total += featBonus;

        // PHASE 4: Get state-dependent modifiers for this skill
        let stateBonus = 0;
        try {
          if (actor?.items) {
            const skillContext = { skillName: skillKey };
            for (const item of actor.items) {
              if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
                continue;
              }

              const meta = item.system?.abilityMeta;
              if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
                continue;
              }

              // Apply each modifier in the PASSIVE/STATE item
              for (const modifier of meta.modifiers) {
                // Check if this modifier applies to skill checks or this specific skill
                const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
                const appliesToSkill = targets.some(t =>
                  t === 'skill' ||
                  t === `skill.${skillKey}` ||
                  t === `skill.bonus`
                );

                if (!appliesToSkill) continue;

                // Evaluate predicates (all must be true)
                const predicates = modifier.predicates || [];
                const predicatesMatch = evaluateStatePredicates(actor, predicates, skillContext);

                if (predicatesMatch && modifier.value) {
                  stateBonus += modifier.value;
                }
              }
            }
          }
        } catch (err) {
          swseLogger.error(`Error evaluating PASSIVE/STATE for skill ${skillKey}:`, err);
        }

        total += stateBonus;

        // Apply armor check penalty (if skill is affected by armor)
        let armorPenalty = 0;
        if (skillDef.armorPenalty) {
          armorPenalty = actor.system.derived?.armor?.checkPenalty ||
                         actor.system.armor?.checkPenalty ||
                         0;
          total += armorPenalty;
        }

        // Apply condition track penalty
        const conditionPenalty = actor.system.derived?.damage?.conditionPenalty || 0;
        total += conditionPenalty;

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
          featBonus: featBonus,
          canUseUntrained: canUseUntrained,
          defaultAbility: skillDef.defaultAbility,
          stateBonus: stateBonus,
          armorPenalty: armorPenalty,
          conditionPenalty: conditionPenalty
        };
      }

      
      // ========================================
      // Damage Threshold (Hardened Safe Setting Access)
      // ========================================
      try {

        const safeGet = (key, fallback) =>
          game.settings.settings.has(`foundryvtt-swse.${key}`)
            ? game.settings.get('foundryvtt-swse', key)
            : fallback;

        const enableEnhanced = safeGet('enableEnhancedMassiveDamage', false);
        const modifyFormula = safeGet('modifyDamageThresholdFormula', false);

        const fortitudeTotal = (updates['system.derived.defenses']?.fortitude?.total) ?? 10;
        const rawSizeThresholdBonuses = {
          fine: -10, diminutive: -5, tiny: 0, small: 0,
          medium: 0, large: 5, huge: 10, gargantuan: 20, colossal: 50
        };
        const actorSizeRaw = (actor.system?.size || actor.size || 'medium').toLowerCase();
        let damageThreshold = fortitudeTotal + (rawSizeThresholdBonuses[actorSizeRaw] ?? 0);

        if (enableEnhanced && modifyFormula) {

          const formulaType =
            safeGet('damageThresholdFormulaType', 'fullLevel');

          const computedHeroicLevel =
            heroicLevel || actor.system.level || 1;

          const sizeModifiers = {
            fine: -10, diminutive: -5, tiny: -2, small: -1,
            medium: 0, large: 1, huge: 2, gargantuan: 5, colossal: 10
          };

          const actorSize = (actor.size || 'medium').toLowerCase();
          const sizeMod = sizeModifiers[actorSize] ?? 0;

          if (formulaType === 'halfLevel') {
            damageThreshold =
              damageThreshold +
              Math.floor(computedHeroicLevel / 2) +
              sizeMod;
          } else {
            damageThreshold =
              damageThreshold +
              computedHeroicLevel +
              sizeMod;
          }
        }

        updates['system.derived.damageThreshold'] = damageThreshold;

      } catch (err) {
        swseLogger.error(
          'DerivedCalculator: Error computing damage threshold',
          err
        );
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

      // ========================================
      // PHASE 3: Apply DERIVED_OVERRIDE
      // ========================================
      // Collect and apply derived overrides from PASSIVE DERIVED_OVERRIDE abilities
      // Overrides augment calculated values (ADD-only in Phase 3)
      const derivedOverrides = DerivedOverrideEngine.collectOverrides(actor);
      if (derivedOverrides.length > 0) {
        DerivedOverrideEngine.apply(actor, derivedOverrides, updates);
        swseLogger.debug(
          `[DerivedCalculator] Applied ${derivedOverrides.length} derived overrides to ${actor.name}`
        );
      }

      swseLogger.debug(`DerivedCalculator computed for ${actor.name}`, { updates });

      return updates;
    } catch (err) {
      swseLogger.error(`DerivedCalculator.computeAll failed for ${actor?.name ?? 'unknown'}`, err);
      throw err;
    }
  }
}
