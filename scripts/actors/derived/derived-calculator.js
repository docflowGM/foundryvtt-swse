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
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { BABCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/bab-calculator.js";
import { DefenseCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { DerivedOverrideEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/derived-override-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { MutationIntegrityLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/mutation-integrity-layer.js";
import { getEffectiveHalfLevel, getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { CANONICAL_SKILL_DEFS, normalizeSkillMap } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { SkillRules } from "/systems/foundryvtt-swse/scripts/engine/skills/SkillRules.js";
import { isRankedModeEnabled, deriveTrainedFromRanks } from "/systems/foundryvtt-swse/scripts/engine/skills/ranked-skills-engine.js";
import { getDamageThresholdSizeBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

export class DerivedCalculator {

  /**
   * Resolve class levels from the canonical progression ledger when present,
   * with an embedded class-item fallback for newly-created/migrating actors.
   *
   * Several V2 chargen paths now materialize class items before the older
   * system.progression.classLevels ledger is populated.  BAB and defense class
   * bonuses must not show as zero during that window; class items are already
   * the sheet-visible source for class/level identity, so use them as the
   * authoritative fallback for derived calculations.
   *
   * @param {Actor} actor
   * @param {Array} classLevels
   * @returns {Array<{class:string, level:number}>}
   */
  static _resolveClassLevels(actor, classLevels = []) {
    const normalizeEntry = (entry = {}) => {
      const className = entry.class
        ?? entry.name
        ?? entry.className
        ?? entry.classId
        ?? entry.id
        ?? null;
      const level = Number(entry.level ?? entry.value ?? entry.levels ?? 0) || 0;
      if (!className || level <= 0) return null;
      return { class: String(className), level };
    };

    const fromProgression = Array.isArray(classLevels)
      ? classLevels.map(normalizeEntry).filter(Boolean)
      : [];
    if (fromProgression.length > 0) return fromProgression;

    const classItems = Array.from(actor?.items ?? []).filter((item) => item?.type === 'class');
    const fromItems = classItems.map((item) => {
      const system = item?.system ?? {};
      const className = system.className
        ?? system.class_name
        ?? system.name
        ?? system.classId
        ?? item?.name
        ?? null;
      const level = Number(system.level ?? system.levels ?? system.value ?? 0) || 0;
      if (!className || level <= 0) return null;
      return { class: String(className), level };
    }).filter(Boolean);

    return fromItems;
  }

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
      const classLevels = this._resolveClassLevels(actor, prog.classLevels || []);

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
      // Canonical stored abilities path is system.attributes.<key>.{base, racial, temp, enhancement}
      // system.attributes is canonical; system.abilities is a read-only compatibility mirror.
      // Derived computes totals and modifiers, written to system.derived.attributes.<key>
      updates['system.derived.attributes'] = {};
      const attributes = actor.system.attributes || actor.system.abilities || {};
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
      const sizeMod = sizeTable[String(actor.system?.size || 'medium').toLowerCase()] || 0;
      const speciesGrapple = actor.system?.speciesCombatBonuses?.grapple || actor.system?.speciesTraitBonuses?.combat?.grapple || 0;
      const grappleBonus = bab.total + strMod + sizeMod + speciesGrapple;
      updates['system.derived.grappleBonus'] = grappleBonus;

      // Defenses
      if (defenses.fortitude) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].fortitude = {
          base: defenses.fortitude.base,
          total: defenses.fortitude.total,
          adjustment: defenseAdjustments.fort,
          stateBonus: defenses.fortitude.stateBonus ?? 0,
          classBonus: defenses.fortitude.classBonus ?? 0,
          heroicLevel: defenses.fortitude.heroicLevel ?? 0,
          levelContribution: defenses.fortitude.levelContribution ?? defenses.fortitude.heroicLevel ?? 0,
          speciesBonus: defenses.fortitude.speciesBonus ?? 0,
          miscBonus: defenses.fortitude.miscBonus ?? 0,
          armorBonus: defenses.fortitude.armorBonus ?? 0,
          abilityKey: defenses.fortitude.abilityKey ?? 'con',
          abilityMod: defenses.fortitude.abilityMod ?? 0,
          conditionPenalty: defenses.fortitude.conditionPenalty ?? 0
        };
      }
      if (defenses.reflex) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].reflex = {
          base: defenses.reflex.base,
          total: defenses.reflex.total,
          adjustment: defenseAdjustments.ref,
          stateBonus: defenses.reflex.stateBonus ?? 0,
          classBonus: defenses.reflex.classBonus ?? 0,
          heroicLevel: defenses.reflex.heroicLevel ?? 0,
          levelContribution: defenses.reflex.levelContribution ?? defenses.reflex.armorContribution ?? defenses.reflex.heroicLevel ?? 0,
          speciesBonus: defenses.reflex.speciesBonus ?? 0,
          miscBonus: defenses.reflex.miscBonus ?? 0,
          armorBonus: defenses.reflex.armorBonus ?? 0,
          armorContribution: defenses.reflex.armorContribution ?? 0,
          sizeModifier: defenses.reflex.sizeModifier ?? 0,
          abilityKey: defenses.reflex.abilityKey ?? 'dex',
          abilityMod: defenses.reflex.abilityMod ?? 0,
          conditionPenalty: defenses.reflex.conditionPenalty ?? 0
        };
      }
      if (defenses.will) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].will = {
          base: defenses.will.base,
          total: defenses.will.total,
          adjustment: defenseAdjustments.will,
          stateBonus: defenses.will.stateBonus ?? 0,
          classBonus: defenses.will.classBonus ?? 0,
          heroicLevel: defenses.will.heroicLevel ?? 0,
          levelContribution: defenses.will.levelContribution ?? defenses.will.heroicLevel ?? 0,
          speciesBonus: defenses.will.speciesBonus ?? 0,
          miscBonus: defenses.will.miscBonus ?? 0,
          armorBonus: defenses.will.armorBonus ?? 0,
          abilityKey: defenses.will.abilityKey ?? 'wis',
          abilityMod: defenses.will.abilityMod ?? 0,
          conditionPenalty: defenses.will.conditionPenalty ?? 0
        };
      }
      if (defenses.flatFooted) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].flatFooted = {
          base: defenses.flatFooted.base,
          total: defenses.flatFooted.total,
          adjustment: defenseAdjustments.ref,
          stateBonus: defenses.flatFooted.stateBonus ?? 0,
          classBonus: defenses.flatFooted.classBonus ?? 0,
          heroicLevel: defenses.flatFooted.heroicLevel ?? 0,
          levelContribution: defenses.flatFooted.levelContribution ?? defenses.flatFooted.armorContribution ?? defenses.flatFooted.heroicLevel ?? 0,
          speciesBonus: defenses.flatFooted.speciesBonus ?? 0,
          miscBonus: defenses.flatFooted.miscBonus ?? 0,
          armorBonus: defenses.flatFooted.armorBonus ?? 0,
          armorContribution: defenses.flatFooted.armorContribution ?? 0,
          sizeModifier: defenses.flatFooted.sizeModifier ?? 0,
          abilityKey: defenses.flatFooted.abilityKey ?? 'dex',
          abilityMod: defenses.flatFooted.abilityMod ?? 0,
          conditionPenalty: defenses.flatFooted.conditionPenalty ?? 0
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
      const skillData = CANONICAL_SKILL_DEFS;

      const normalizedSkills = normalizeSkillMap(actor.system.skills);
      // Half-level is derived from the level-split authority, not a persisted system field.
      // system.halfLevel can be absent/stale during Foundry prepareData/update cycles,
      // which caused trained skills to miss the +1 at level 2 and similar level-up flows.
      const halfLevel = getEffectiveHalfLevel(actor);
      const isDroid = actor?.type === 'droid' || actor.system.isDroid || false;
      const droidUntrainedSkills = ['acrobatics', 'climb', 'jump', 'perception'];
      const hasForceIntuition = this._hasTalentNamed(actor, 'Force Intuition');
      const hasForceDeception = this._hasTalentNamed(actor, 'Force Deception');
      const hasForceTreatment = this._hasTalentNamed(actor, 'Force Treatment');

      // Get occupation bonus from actor flags
      let occupationBonus = null;
      if (actor.flags?.swse?.occupationBonus) {
        occupationBonus = actor.flags.swse.occupationBonus;
      }

      // PHASE 4: Get species skill bonuses from canonical Phase 3 actor state
      // Phase 3 stores passive bonuses in flags.swse.speciesPassiveBonuses as {target: [{value, type, trait, conditions}]}
      // Extract skill bonuses and sum them by skill key
      const speciesPassiveBonuses = actor.flags?.swse?.speciesPassiveBonuses || {};
      const speciesSkillBonuses = {};
      for (const [target, bonuses] of Object.entries(speciesPassiveBonuses)) {
        if (Array.isArray(bonuses)) {
          for (const bonus of bonuses) {
            // Sum bonuses by skill key (target could be "athleticism", "piloting", etc.)
            if (!speciesSkillBonuses[target]) {
              speciesSkillBonuses[target] = 0;
            }
            speciesSkillBonuses[target] += bonus.value || 0;
          }
        }
      }

      // GM/compendium-granted special ability items can carry the same passive skill
      // bonus shape as species flags. This lets a GM drag a reusable ability such as
      // "Empathy" or "Soothing Pheromones" onto any actor without changing species.
      for (const item of actor.items || []) {
        const itemBonuses = item?.flags?.swse?.passiveSkillBonuses || item?.system?.specialAbility?.passiveSkillBonuses || [];
        if (!Array.isArray(itemBonuses)) continue;
        for (const bonus of itemBonuses) {
          const target = bonus?.target;
          if (!target) continue;
          if (!speciesSkillBonuses[target]) speciesSkillBonuses[target] = 0;
          speciesSkillBonuses[target] += Number(bonus.value || 0);
        }
      }

      for (const [skillKey, skillDef] of Object.entries(skillData)) {
        const skill = normalizedSkills[skillKey];

        // Phase 3C: Canonical skill schema = {trained, miscMod, focused, selectedAbility}.
        // Legacy compendium droids may contribute static numeric totals; honor those instead
        // of re-deriving from partial schema to avoid crashes and noisy warnings.
        if (skill.legacyStaticTotal === true && Number.isFinite(Number(skill.legacyTotal))) {
          updates['system.derived.skills'][skillKey] = {
            label: skillKey,
            ability: skill.selectedAbility || skillDef.defaultAbility,
            total: Number(skill.legacyTotal),
            trained: skill.trained || false,
            focused: skill.focused || false,
            miscMod: Number.isFinite(Number(skill.miscMod)) ? Number(skill.miscMod) : 0,
            armorPenalty: 0,
            conditionPenalty: 0,
            featBonus: 0,
            speciesBonus: 0,
            stateBonus: 0,
            untrained: skillDef.untrained !== false
          };
          continue;
        }

        // Phase 3C: Canonical skill schema = {trained, miscMod, focused, selectedAbility}
        // Derived uses these to compute skill totals. Schema is initialized by progression.
        // Get ability modifier
        const abilityKey = skill.selectedAbility || skillDef.defaultAbility;
        const abilityMod = (isDroid && abilityKey === 'con')
          ? 0
          : ((updates['system.derived.attributes']?.[abilityKey]?.mod) || 0);

        // Calculate total bonus
        const skillMiscMod = Number.isFinite(Number(skill.miscMod)) ? Number(skill.miscMod) : 0;
        let total = abilityMod + skillMiscMod;

        // Add species trait bonus
        const speciesBonus = speciesSkillBonuses[skillKey] || 0;
        total += speciesBonus;

        // Add training/rank bonus
        // Under ranked mode: use ranks directly; under standard mode: use trained +5 bonus.
        // Logic Upgrade: Skill Swap selects one currently-untrained non-UTF droid skill
        // during progression. Treat that chosen skill as trained for derived totals.
        const logicUpgradeSkillSwap = this._hasLogicUpgradeSkillSwapForSkill(actor, skillKey);
        const rankedMode = isRankedModeEnabled();
        let isTrained = Boolean(
          skill.trained ||
          logicUpgradeSkillSwap ||
          (hasForceIntuition && skillKey === 'initiative') ||
          (hasForceDeception && skillKey === 'deception') ||
          (hasForceTreatment && skillKey === 'treatInjury')
        ); // Standard mode: stored, feat-backed, or talent-backed training
        if (rankedMode) {
          const ranks = skill.ranks || 0;
          total += ranks;
          isTrained = Boolean(
            deriveTrainedFromRanks(ranks) ||
            logicUpgradeSkillSwap ||
            (hasForceIntuition && skillKey === 'initiative') ||
            (hasForceDeception && skillKey === 'deception') ||
            (hasForceTreatment && skillKey === 'treatInjury')
          ); // Derived trained status
        } else {
          // Standard mode: use traditional trained +5 bonus
          if (isTrained) {
            total += 5;
          }
        }

        // Add half level (gated by disableHalfLevelSkillBonus rule)
        if (SkillRules.isHalfLevelSkillBonusEnabled()) {
          total += halfLevel;
        }

        // Add skill focus bonus
        if (skill.focused) {
          total += 5;
        }

        // Apply occupation bonus (only to untrained checks)
        let hasOccupationBonus = false;
        if (!isTrained && occupationBonus?.skills?.includes(skillKey)) {
          total += occupationBonus.value || 2;
          hasOccupationBonus = true;
        }

        // Add feat/equipment/other modifiers from ModifierEngine (SSOT integration).
        // Skill Focus can be represented both by system.skills.<key>.focused and by
        // a passive modifier item. If both are present, suppress the duplicate +5.
        const rawFeatBonus = modifierMap[`skill.${skillKey}`] || 0;
        const featBonus = (skill.focused && rawFeatBonus >= 5 && this._hasSkillFocusModifierForSkill(actor, skillKey))
          ? rawFeatBonus - 5
          : rawFeatBonus;
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
                const scopedModifier = {
                  ...modifier,
                  mechanicsMode: modifier.mechanicsMode || meta.mechanicsMode,
                  applicationScope: modifier.applicationScope || meta.applicationScope,
                  staticSheetPolicy: modifier.staticSheetPolicy || meta.staticSheetPolicy,
                  requiresRuntimeContext: modifier.requiresRuntimeContext ?? meta.requiresRuntimeContext,
                  requiresSelectedChoice: modifier.requiresSelectedChoice ?? meta.requiresSelectedChoice,
                  predicateRequirements: modifier.predicateRequirements || meta.predicateRequirements || []
                };

                if (!ModifierEngine.isModifierAllowedInContext(actor, scopedModifier, skillContext, { staticSheet: true })) {
                  continue;
                }

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
          trained: isTrained || false,
          baseTrained: skill.trained || false,
          logicUpgradeSkillSwap: logicUpgradeSkillSwap || false,
          focused: skill.focused || false,
          miscMod: Number.isFinite(Number(skill.miscMod)) ? Number(skill.miscMod) : 0,
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

      const applyUseTheForceSkillSubstitution = (targetKey, markerKey) => {
        const targetSkill = updates['system.derived.skills']?.[targetKey];
        const useTheForceSkill = updates['system.derived.skills']?.useTheForce;
        const targetTotal = Number(targetSkill?.total);
        const useTheForceTotal = Number(useTheForceSkill?.total);
        if (!targetSkill || !Number.isFinite(targetTotal) || !Number.isFinite(useTheForceTotal)) return false;
        if (useTheForceTotal <= targetTotal) return false;

        updates['system.derived.skills'][targetKey] = {
          ...targetSkill,
          total: useTheForceTotal,
          [markerKey]: true,
          substitutedFromSkill: 'useTheForce',
          substitutedBaseTotal: targetTotal
        };
        return true;
      };

      if (hasForceDeception) {
        applyUseTheForceSkillSubstitution('deception', 'forceDeceptionSubstitution');
      }
      if (hasForceTreatment) {
        applyUseTheForceSkillSubstitution('treatInjury', 'forceTreatmentSubstitution');
      }

      // Initiative is a skill in SWSE.  The early derived.initiative seed keeps
      // legacy consumers alive during this compute pass, but the final canonical
      // value must mirror the fully computed Initiative skill total so quick
      // stats, sheet rolls, and the Skills tab agree.
      const initiativeSkill = updates['system.derived.skills']?.initiative;
      if (initiativeSkill && Number.isFinite(Number(initiativeSkill.total))) {
        let initiativeTotal = Number(initiativeSkill.total);
        let substitutedFromUseTheForce = false;
        const useTheForceSkill = updates['system.derived.skills']?.useTheForce;
        const useTheForceTotal = Number(useTheForceSkill?.total);
        if (hasForceIntuition && Number.isFinite(useTheForceTotal) && useTheForceTotal > initiativeTotal) {
          initiativeTotal = useTheForceTotal;
          substitutedFromUseTheForce = true;
          updates['system.derived.skills'].initiative = {
            ...initiativeSkill,
            total: initiativeTotal,
            forceIntuitionSubstitution: true,
            substitutedFromSkill: 'useTheForce',
            substitutedBaseTotal: Number(initiativeSkill.total)
          };
        }

        updates['system.derived.initiative'] = {
          dexModifier: dexMod,
          adjustment: initiativeAdjustment,
          skillTotal: initiativeTotal,
          total: initiativeTotal,
          forceIntuitionSubstitution: substitutedFromUseTheForce
        };
      }

      
      // ========================================
      // Damage Threshold (Hardened Safe Setting Access)
      // ========================================
      try {

        const safeGet = (key, fallback) => HouseRuleService.getSafe(key, fallback);

        const enableEnhanced = safeGet('enableEnhancedMassiveDamage', false);
        const modifyFormula = safeGet('modifyDamageThresholdFormula', false);

        const fortitudeTotal = (updates['system.derived.defenses']?.fortitude?.total) ?? 10;
        const willTotal = (updates['system.derived.defenses']?.will?.total) ?? actor?.system?.derived?.defenses?.will?.total ?? 10;
        const thresholdFeatRules = MetaResourceFeatResolver.getDamageThresholdRules(actor);
        const thresholdDefenseBase = thresholdFeatRules.useWillAsBase
          ? (thresholdFeatRules.useBestFortitudeOrWill ? Math.max(fortitudeTotal, willTotal) : willTotal)
          : fortitudeTotal;
        const damageThresholdAdjustment = (modifierMap['defense.damageThreshold'] || 0) + (thresholdFeatRules.flatBonus || 0);
        let damageThreshold = thresholdDefenseBase + getDamageThresholdSizeBonus(actor) + damageThresholdAdjustment;

        if (enableEnhanced && modifyFormula) {

          const formulaType =
            safeGet('damageThresholdFormulaType', 'fullLevel');

          const computedHeroicLevel =
            heroicLevel || actor.system.level || 1;

          const sizeMod = getDamageThresholdSizeBonus(actor);

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

  static _hasTalentNamed(actor, talentName) {
    const target = String(talentName || '').trim().toLowerCase();
    if (!target || !actor?.items) return false;
    return Array.from(actor.items).some(item => item?.type === 'talent' && String(item?.name || '').trim().toLowerCase() === target);
  }


  static _hasLogicUpgradeSkillSwapForSkill(actor, skillKey) {
    const target = String(skillKey || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!target || target === 'usetheforce') return false;
    if (!actor?.items) return false;
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const item of actor.items) {
      if (String(item?.name || '').toLowerCase() !== 'logic upgrade: skill swap') continue;
      const choice = item.system?.selectedChoice ?? item.system?.selectedChoices;
      const candidates = [];
      const visit = (value) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(visit);
        if (typeof value === 'object') {
          for (const key of ['id', 'value', 'skill', 'skillKey', 'label', 'name']) visit(value[key]);
          return;
        }
        candidates.push(value);
      };
      visit(choice);
      if (candidates.some(candidate => normalize(candidate) === target)) return true;
    }
    return false;
  }

  static _hasSkillFocusModifierForSkill(actor, skillKey) {
    const target = String(skillKey || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!target || !actor?.items) return false;
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const item of actor.items) {
      const name = String(item?.name || '').toLowerCase();
      if (!name.includes('skill focus')) continue;
      const candidates = [
        item.system?.skill,
        item.system?.skillKey,
        item.system?.selectedSkill,
        item.system?.choice,
        item.system?.selectedChoice,
        item.flags?.swse?.skill,
        item.flags?.swse?.selectedSkill,
        item.flags?.foundryvttSwse?.skill,
      ];
      const meta = item.system?.abilityMeta || {};
      if (Array.isArray(meta.modifiers)) {
        for (const mod of meta.modifiers) {
          const targets = Array.isArray(mod.target) ? mod.target : [mod.target];
          candidates.push(...targets.map(t => String(t || '').replace(/^skill\./i, '')));
        }
      }
      if (candidates.some(candidate => normalize(candidate) === target)) return true;
      const paren = name.match(/skill focus\s*\(([^)]+)\)/i);
      if (paren && normalize(paren[1]) === target) return true;
    }
    return false;
  }

}
