/**
 * Healing Skill Integration House Rule
 * Implements Treat Injury skill-based HP recovery (First Aid, Long-Term Care, Surgery, etc.)
 * Based on SWSE official rules
 */

import { SWSELogger } from "../utils/logger.js";

const NS = "foundryvtt-swse";

export class HealingMechanics {
  static initialize() {
    SWSELogger.debug("Healing mechanics initialized");
  }

  /**
   * Perform First Aid (DC 15, Full-Round Action, requires Medpac)
   * Heals target by Character Level + (check result - DC)
   * Cannot benefit from additional First Aid for 24 hours
   * @param {Actor} healer - Character with Treat Injury skill
   * @param {Actor} target - Character being healed
   * @param {number} checkResult - Result of Treat Injury check
   * @returns {Promise<Object>} - Result of healing
   */
  static async performFirstAid(healer, target, checkResult) {
    if (!game.settings.get(NS, "healingSkillEnabled")) {
      return { success: false, message: "Healing skill integration disabled" };
    }

    if (!game.settings.get(NS, "firstAidEnabled")) {
      return { success: false, message: "First Aid not enabled in this campaign" };
    }

    const dc = 15;
    const success = checkResult >= dc;

    if (!success) {
      return { success: false, checkResult, dc, message: "First Aid check failed" };
    }

    // Calculate healing
    const healing = this._calculateFirstAidHealing(target, checkResult, dc);

    try {
      // Apply healing
      const currentHP = target.system?.hp?.value || 0;
      const maxHP = target.system?.hp?.max || 0;
      const newHP = Math.min(currentHP + healing, maxHP);

      await target.update({ "system.hp.value": newHP });

      // Mark that this creature received First Aid (24-hour cooldown)
      const now = Date.now();
      await target.setFlag(NS, "lastFirstAid", now);

      return {
        success: true,
        healing,
        checkResult,
        dc,
        newHP,
        maxHP,
        healer,
        target
      };
    } catch (err) {
      SWSELogger.error("First Aid failed", err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Calculate First Aid healing amount
   * @private
   */
  static _calculateFirstAidHealing(target, checkResult, dc) {
    const formula = game.settings.get(NS, "firstAidHealingType");
    const level = target.system?.details?.level || 1;

    switch (formula) {
      case "levelOnly":
        return level;
      case "levelPlusDC":
        return level + Math.max(0, checkResult - dc);
      case "fixed":
        return game.settings.get(NS, "firstAidFixedAmount");
      default:
        return level;
    }
  }

  /**
   * Check if Long-Term Care is available (24-hour limit once per day)
   * @param {Actor} target - Character to check
   * @returns {boolean}
   */
  static canReceiveLongTermCare(target) {
    if (!target) return false;

    const lastCare = target.getFlag(NS, "lastLongTermCare") || 0;
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    return (now - lastCare) >= dayInMs;
  }

  /**
   * Perform Long-Term Care (8 hours continuous)
   * Heals Character Level per day
   * Can tend up to 1 (untrained) or 6 (trained) creatures simultaneously
   * @param {Actor} healer - Character with Treat Injury
   * @param {Array<Actor>} targets - Creatures receiving care
   * @returns {Promise<Object>} - Healing results
   */
  static async performLongTermCare(healer, targets) {
    if (!game.settings.get(NS, "healingSkillEnabled")) {
      return { success: false, message: "Healing skill integration disabled" };
    }

    if (!game.settings.get(NS, "longTermCareEnabled")) {
      return { success: false, message: "Long-Term Care not enabled" };
    }

    if (!Array.isArray(targets)) targets = [targets];

    const maxTargets = game.settings.get(NS, "longTermCareMultipleTargets");
    if (targets.length > maxTargets) {
      return {
        success: false,
        message: `Can only care for ${maxTargets} creatures simultaneously`
      };
    }

    const results = [];

    for (const target of targets) {
      if (!this.canReceiveLongTermCare(target)) {
        results.push({
          target: target.name,
          success: false,
          reason: "Already received Long-Term Care today"
        });
        continue;
      }

      try {
        const healing = this._calculateLongTermCareHealing(target);
        const currentHP = target.system?.hp?.value || 0;
        const maxHP = target.system?.hp?.max || 0;
        const newHP = Math.min(currentHP + healing, maxHP);

        await target.update({ "system.hp.value": newHP });
        await target.setFlag(NS, "lastLongTermCare", Date.now());

        results.push({
          target: target.name,
          success: true,
          healing,
          newHP,
          maxHP
        });
      } catch (err) {
        SWSELogger.error(`Long-Term Care failed for ${target.name}`, err);
        results.push({
          target: target.name,
          success: false,
          reason: err.message
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
      healer,
      targetsCount: targets.length
    };
  }

  /**
   * Calculate Long-Term Care healing
   * @private
   */
  static _calculateLongTermCareHealing(target) {
    const formula = game.settings.get(NS, "longTermCareHealing");
    const level = target.system?.details?.level || 1;
    const conMod = target.system?.attributes?.con?.mod || 0;

    switch (formula) {
      case "characterLevel":
        return level;
      case "conBonus":
        return Math.max(1, conMod) * level;
      case "fixed":
        return game.settings.get(NS, "longTermCareFixedAmount");
      default:
        return level;
    }
  }

  /**
   * Perform Surgery (DC 20, 1 hour, requires Surgery Kit, trained Treat Injury)
   * Heals CON Bonus × Level damage (or removes persistent condition)
   * Failure: creature takes damage equal to Damage Threshold
   * @param {Actor} surgeon - Character performing surgery
   * @param {Actor} patient - Character being operated on
   * @param {number} checkResult - Result of Treat Injury check
   * @returns {Promise<Object>}
   */
  static async performSurgery(surgeon, patient, checkResult) {
    if (!game.settings.get(NS, "healingSkillEnabled")) {
      return { success: false, message: "Healing skill integration disabled" };
    }

    if (!game.settings.get(NS, "performSurgeryEnabled")) {
      return { success: false, message: "Surgery not enabled" };
    }

    const dc = 20;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;
    const failureThreshold = 5; // Fail by 5 or more

    // Calculate healing
    let healing = 0;
    let damageFromFailure = 0;

    if (success) {
      healing = this._calculateSurgeryHealing(patient);
    } else if (game.settings.get(NS, "surgeryFailureDamage") && failureMargin >= failureThreshold) {
      // Calculate damage threshold
      damageFromFailure = patient.system?.traits?.damageThreshold || 5;
    }

    try {
      if (success) {
        // Apply healing
        const currentHP = patient.system?.hp?.value || 0;
        const maxHP = patient.system?.hp?.max || 0;
        const newHP = Math.min(currentHP + healing, maxHP);

        await patient.update({ "system.hp.value": newHP });

        return {
          success: true,
          healing,
          checkResult,
          dc,
          newHP,
          maxHP,
          surgeon,
          patient
        };
      } else {
        // Apply failure damage
        if (damageFromFailure > 0) {
          const currentHP = patient.system?.hp?.value || 0;
          const newHP = Math.max(0, currentHP - damageFromFailure);

          await patient.update({ "system.hp.value": newHP });

          // Check if patient dies
          const isDead = newHP <= -(patient.system?.attributes?.con?.score || 10);

          return {
            success: false,
            failure: true,
            damageFromFailure,
            newHP,
            isDead,
            checkResult,
            dc,
            failureMargin
          };
        } else {
          return {
            success: false,
            failure: true,
            message: "Surgery failed but not catastrophically",
            checkResult,
            dc
          };
        }
      }
    } catch (err) {
      SWSELogger.error("Surgery failed", err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Calculate Surgery healing
   * @private
   */
  static _calculateSurgeryHealing(patient) {
    const formula = game.settings.get(NS, "performSurgeryHealing");
    const level = patient.system?.details?.level || 1;
    const conMod = patient.system?.attributes?.con?.mod || 0;

    switch (formula) {
      case "conBonus":
        return Math.max(1, conMod) * level;
      case "fixed":
        return game.settings.get(NS, "performSurgeryFixedAmount");
      case "automatic":
        return 999; // Will be capped at max HP anyway
      default:
        return Math.max(1, conMod) * level;
    }
  }

  /**
   * Revivify (DC 25, Full-Round Action, trained only)
   * Revives unconscious creature within 1 round of death
   * @param {Actor} medic - Character with trained Treat Injury
   * @param {Actor} corpse - Dead creature
   * @param {number} checkResult - Result of Treat Injury check
   * @returns {Promise<Object>}
   */
  static async performRevivify(medic, corpse, checkResult) {
    if (!game.settings.get(NS, "healingSkillEnabled")) {
      return { success: false, message: "Healing skill integration disabled" };
    }

    if (!game.settings.get(NS, "revivifyEnabled")) {
      return { success: false, message: "Revivify not enabled" };
    }

    const dc = 25;
    const success = checkResult >= dc;

    if (!success) {
      return {
        success: false,
        checkResult,
        dc,
        message: "Revivify check failed - creature remains dead"
      };
    }

    try {
      // Bring back to 1 HP
      await corpse.update({ "system.hp.value": 1 });

      // Apply unconscious condition if available
      const unconsciousEffect = corpse.effects.find(e =>
        e.statuses.includes("unconscious")
      );

      if (!unconsciousEffect) {
        const effect = {
          label: "Unconscious",
          statuses: ["unconscious"]
        };
        await corpse.createEmbeddedDocuments("ActiveEffect", [effect]);
      }

      return {
        success: true,
        checkResult,
        dc,
        revived: true,
        medic,
        corpse
      };
    } catch (err) {
      SWSELogger.error("Revivify failed", err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Perform Critical Care (DC 20, trained only)
   * Multiple Medpac applications in 24 hours with escalating penalties
   * Heals Level + (Check - DC) per application
   * @param {Actor} healer - Trained Treat Injury user
   * @param {Actor} patient - Patient receiving critical care
   * @param {number} checkResult - Result of Treat Injury check
   * @returns {Promise<Object>}
   */
  static async performCriticalCare(healer, patient, checkResult) {
    if (!game.settings.get(NS, "healingSkillEnabled")) {
      return { success: false, message: "Healing skill integration disabled" };
    }

    if (!game.settings.get(NS, "criticalCareEnabled")) {
      return { success: false, message: "Critical Care not enabled" };
    }

    const dc = 20;
    const success = checkResult >= dc;

    // Get care history
    const careHistory = patient.getFlag(NS, "criticalCareHistory") || [];
    const today24hAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Filter out old care
    const recentCare = careHistory.filter(timestamp => timestamp > today24hAgo);

    // Check for overdose risk
    if (!success && recentCare.length > 0) {
      try {
        // Apply overdose damage
        const damageThreshold = patient.system?.traits?.damageThreshold || 5;
        const currentHP = patient.system?.hp?.value || 0;
        const newHP = Math.max(0, currentHP - damageThreshold);

        await patient.update({ "system.hp.value": newHP });

        return {
          success: false,
          overdose: true,
          damageFromOverdose: damageThreshold,
          newHP,
          previousCareAttempts: recentCare.length,
          message: "Patient overdosed from too many Medpac applications!"
        };
      } catch (err) {
        SWSELogger.error("Critical Care overdose damage failed", err);
        return { success: false, message: err.message };
      }
    }

    if (!success) {
      return {
        success: false,
        checkResult,
        dc,
        message: "Critical Care check failed"
      };
    }

    try {
      const healing = this._calculateCriticalCareHealing(patient, checkResult, dc);
      const currentHP = patient.system?.hp?.value || 0;
      const maxHP = patient.system?.hp?.max || 0;
      const newHP = Math.min(currentHP + healing, maxHP);

      await patient.update({ "system.hp.value": newHP });

      // Add to care history
      recentCare.push(Date.now());
      await patient.setFlag(NS, "criticalCareHistory", recentCare);

      return {
        success: true,
        healing,
        checkResult,
        dc,
        newHP,
        maxHP,
        previousCareAttempts: recentCare.length - 1,
        healer,
        patient
      };
    } catch (err) {
      SWSELogger.error("Critical Care failed", err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Calculate Critical Care healing
   * @private
   */
  static _calculateCriticalCareHealing(patient, checkResult, dc) {
    const formula = game.settings.get(NS, "criticalCareHealing");
    const level = patient.system?.details?.level || 1;

    switch (formula) {
      case "levelPlusDC":
        return level + Math.max(0, checkResult - dc);
      case "fixed":
        return game.settings.get(NS, "criticalCareFixedAmount");
      default:
        return level + Math.max(0, checkResult - dc);
    }
  }

  /**
   * Get penalty for multiple Critical Care attempts in 24h
   * Penalty increases by -5 per previous attempt
   * @param {Actor} patient - Patient to check
   * @returns {number} - Penalty to apply
   */
  static getCriticalCarePenalty(patient) {
    if (!patient) return 0;

    const careHistory = patient.getFlag(NS, "criticalCareHistory") || [];
    const today24hAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentCare = careHistory.filter(timestamp => timestamp > today24hAgo);

    // -5 penalty for each previous attempt
    return -5 * recentCare.length;
  }
}
