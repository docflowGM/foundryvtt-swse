// scripts/houserules/houserules-mechanics.js
import { SWSELogger } from "../utils/logger.js";
import { HouseRuleFeatGrants } from "./houserule-feat-grants.js";
import {
  HouserulesData,
  getFeintSkill,
  getSkillFocusBonus,
  canTakeForceSensitive,
  getForceTrainingAttribute,
  hasBlockDeflectCombined,
  hasDefaultWeaponFinesse,
  getRolePriorityOrder
} from "./houserules-data.js";
import { GrappleMechanics } from "./houserule-grapple.js";
import { RecoveryMechanics } from "./houserule-recovery.js";
import { ConditionTrackMechanics } from "./houserule-condition-track.js";
import { FlankingMechanics } from "./houserule-flanking.js";
import { SkillTrainingMechanics } from "./houserule-skill-training.js";
import { StatusEffectsMechanics } from "./houserule-status-effects.js";
import { HealingMechanics } from "./houserule-healing.js";
import { HealingSkillIntegration } from "./houserule-healing-skill-integration.js";
import { ActorSheetEnhancements } from "./houserule-actor-enhancements.js";

/**
 * HouseruleMechanics
 * Centralized container for rule-altering mechanics.
 * Modernized for Foundry VTT V13+ with strict safety and performance improvements.
 */
export class HouseruleMechanics {
  /**
   * Initialize all mechanics. Called during SWSE startup.
   */
  static initialize() {
    SWSELogger.info("HouseruleMechanics | Initializing…");

    try {
      this._setupCriticalHitVariants();
      this._setupConditionTrackLimits();
      this._setupDiagonalMovement();
      this._setupDeathSystem();
      this._setupFeintSkill();
      this._setupSpaceCombatInitiative();
      HouseRuleFeatGrants.initialize();

      // Initialize new house rules mechanics
      GrappleMechanics.initialize();
      RecoveryMechanics.initialize();
      ConditionTrackMechanics.initialize();
      FlankingMechanics.initialize();
      SkillTrainingMechanics.initialize();
      StatusEffectsMechanics.initialize();
      HealingMechanics.initialize();
      HealingSkillIntegration.initialize();
      ActorSheetEnhancements.initialize();
    } catch (err) {
      SWSELogger.error("HouseruleMechanics initialization failed", err);
    }

    SWSELogger.info("HouseruleMechanics | Ready.");
  }

  // ========================================================================
  //  CRITICAL HIT VARIANTS
  // ========================================================================

  static _setupCriticalHitVariants() {
    Hooks.on("preRollDamage", (item, config, rollData) => {
      try {
        if (!config?.critical) return;

        const variant = game.settings.get("foundryvtt-swse", "criticalHitVariant");
        config.criticalMode = variant || "standard";
      } catch (err) {
        SWSELogger.error("Critical variant application failed", err);
      }
    });
  }

  // ========================================================================
  //  CONDITION TRACK LIMITS
  // ========================================================================

  static _setupConditionTrackLimits() {
    Hooks.on("preUpdateActor", (actor, update, options, userId) => {
      try {
        const cap = game.settings.get("foundryvtt-swse", "conditionTrackCap");
        if (!cap || !update?.system?.conditionTrack?.current) return;

        const current = actor.system.conditionTrack?.current ?? 0;
        const target = update.system.conditionTrack.current;
        const delta = target - current;

        if (delta > cap) {
          update.system.conditionTrack.current = current + cap;
        }
      } catch (err) {
        SWSELogger.error("Condition track cap failed", err);
      }
    });
  }

  // ========================================================================
  //  DIAGONAL MOVEMENT SYSTEM
  // ========================================================================

  static _setupDiagonalMovement() {
    try {
      CONFIG.SWSE.diagonalMovement = game.settings.get(
        "foundryvtt-swse",
        "diagonalMovement"
      );
    } catch (err) {
      SWSELogger.error("Diagonal movement handler failed", err);
    }
  }

  // ========================================================================
  //  DEATH RULE HANDLING
  // ========================================================================

  static _setupDeathSystem() {
    Hooks.on("preUpdateActor", (actor, update, options, userId) => {
      try {
        if (!update?.system?.hp?.value) return;

        const system = game.settings.get("foundryvtt-swse", "deathSystem");
        const newValue = update.system.hp.value;

        if (newValue > 0) return;

        switch (system) {
          case "standard": {
            if (newValue <= -10) update.system.dead = true;
            break;
          }

          case "negativeCon": {
            const con = actor.system.abilities.con.total;
            if (newValue <= -con) update.system.dead = true;
            break;
          }

          case "threeStrikes":
            // handled elsewhere (death save system)
            break;
        }
      } catch (err) {
        SWSELogger.error("Death system handler failed", err);
      }
    });
  }

  // ========================================================================
  //  ABILITY & HP GENERATION
  // ========================================================================

  static calculateAbilityMod(score) {
    return Math.floor((score - 10) / 2);
  }

  static async generateHP(actor, classItem, level) {
    try {
      const method = game.settings.get("foundryvtt-swse", "hpGeneration");
      const maxLevels = game.settings.get("foundryvtt-swse", "maxHPLevels");
      const hitDie = classItem.system.hitDie || 6;
      const conMod = actor.system.abilities.con.mod ?? 0;

      if (level <= maxLevels) return hitDie + conMod;

      const rollEngine = globalThis.SWSE.RollEngine;

      switch (method) {
        case "maximum":
          return hitDie + conMod;

        case "average":
          return Math.floor(hitDie / 2) + 1 + conMod;

        case "average_minimum": {
          const roll = await rollEngine.safeRoll(`1d${hitDie}`).evaluate({
            async: true,
          });
          const avg = Math.floor(hitDie / 2) + 1;
          return Math.max(roll.total, avg) + conMod;
        }

        case "roll":
        default: {
          const roll = await rollEngine.safeRoll(`1d${hitDie}`).evaluate({
            async: true,
          });
          return roll.total + conMod;
        }
      }
    } catch (err) {
      SWSELogger.error("HP generation failed", err);
      return 1;
    }
  }

  // ========================================================================
  //  RANGE, SECOND WIND, CRITICAL DAMAGE
  // ========================================================================

  static getModifiedRange(baseRange) {
    try {
      const mult = game.settings.get(
        "foundryvtt-swse",
        "weaponRangeMultiplier"
      );
      return Math.round(baseRange * mult);
    } catch (err) {
      SWSELogger.error("Range multiplier calculation failed", err);
      return baseRange;
    }
  }

  static isSecondWindImproved() {
    return game.settings.get("foundryvtt-swse", "secondWindImproved");
  }

  static getSecondWindRecovery() {
    return game.settings.get("foundryvtt-swse", "secondWindRecovery");
  }

  static async applyCriticalDamage(baseRoll, mode = "standard") {
    try {
      const rollEngine = globalThis.SWSE.RollEngine;

      switch (mode) {
        case "maxplus": {
          const max = baseRoll.terms.reduce((sum, t) => {
            if (t instanceof Die) return sum + t.number * t.faces;
            return sum + (t.total ?? 0);
          }, 0);

          const extra = await baseRoll.reroll();
          return max + extra.total;
        }

        case "exploding": {
          const explodingFormula = baseRoll.formula.replace(/d(\d+)/g, "d$1x");
          const newRoll = await rollEngine
            .safeRoll(explodingFormula)
            .evaluate({ async: true });
          return newRoll.total;
        }

        case "trackonly":
          return baseRoll.total;

        case "standard":
        default:
          return baseRoll.total * 2;
      }
    } catch (err) {
      SWSELogger.error("Critical damage calculation failed", err);
      return baseRoll.total;
    }
  }

  // ========================================================================
  //  FEINT SKILL
  // ========================================================================

  static _setupFeintSkill() {
    Hooks.on("swse.preSkillRoll", (actor, skillId, context) => {
      try {
        if (skillId !== "feint") return;

        const setting = game.settings.get("foundryvtt-swse", "feintSkill");
        if (setting === "persuasion") context.useSkill = "persuasion";
      } catch (err) {
        SWSELogger.error("Feint skill override failed", err);
      }
    });
  }

  static getSkillFocusBonus(actor, skill) {
    try {
      const variant = game.settings.get(
        "foundryvtt-swse",
        "skillFocusVariant"
      );
      const level = actor.system.level || 1;

      switch (variant) {
        case "scaled":
          return Math.min(5, Math.floor(level / 2));

        case "delayed": {
          const activation = game.settings.get(
            "foundryvtt-swse",
            "skillFocusActivationLevel"
          );
          return level >= activation ? 5 : 0;
        }

        case "normal":
        default:
          return 5;
      }
    } catch (err) {
      SWSELogger.error("Skill Focus bonus calculation failed", err);
      return 5;
    }
  }

  // ========================================================================
  //  FORCE TRAINING, BLOCK/DEFLECT, WEAPON FINESSE
  // ========================================================================

  static getForceTrainingAttribute() {
    return getForceTrainingAttribute();
  }

  static areBlockDeflectCombined() {
    return hasBlockDeflectCombined();
  }

  static hasWeaponFinesseByDefault() {
    return hasDefaultWeaponFinesse();
  }

  static canTakeForceSensitive(actor) {
    return canTakeForceSensitive(actor);
  }

  // ========================================================================
  //  SPACE COMBAT INITIATIVE
  // ========================================================================

  static _setupSpaceCombatInitiative() {
    const system = game.settings.get(
      "foundryvtt-swse",
      "spaceInitiativeSystem"
    );

    if (system !== "shipBased") return;

    Hooks.on("preCreateCombatant", (combatant, data) => {
      try {
        const actor = game.actors.get(data.actorId);
        if (actor?.type === "vehicle") {
          data.flags = foundry.utils.mergeObject(data.flags ?? {}, {
            swse: { shipBasedInitiative: true },
          });
        }
      } catch (err) {
        SWSELogger.error("Ship-based initiative flagging failed", err);
      }
    });
  }

  static getSpaceCombatRoleOrder() {
    return getRolePriorityOrder();
  }

  // ========================================================================
  //  DATA EXPORT
  // ========================================================================

  static get data() {
    return HouserulesData;
  }
}
