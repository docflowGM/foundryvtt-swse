/**
 * Aid Another Mechanic (SWSE Core Rulebook - RAW)
 *
 * Three contexts:
 * 1. Aid Skill/Ability Check: Roll same check, 10+ grants +2 bonus
 * 2. Aid Attack Roll: Attack Reflex 10, success grants +2 to ally's next attack
 * 3. Suppress Enemy: Attack Reflex 10, success inflicts -2 penalty on enemy's next attack
 *
 * This is a core RAW mechanic always available in SWSE
 */

import { SWSELogger } from "../utils/logger.js";

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class AidAnother {
  /**
   * Initialize Aid Another system - register combat hooks for cleanup
   */
  static initialize() {
    try {
      // Register hook to cleanup expired aid bonuses/penalties at turn changes
      Hooks.on("combatTurn", (combat, updateData, options) => {
        this._cleanupExpiredAids(combat);
      });

      SWSELogger.info("AidAnother | Initialized - Core RAW Mechanic");
    } catch (err) {
      SWSELogger.error("AidAnother initialization failed", err);
    }
  }

  /**
   * Aid a skill check - ally needs to roll same check, 10+ grants +2 bonus
   * @param {Actor} aidingActor - The character providing aid
   * @param {Actor} aidedActor - The character being aided
   * @param {string} skillId - The skill being aided
   * @returns {Promise<Object>} - { success: boolean, bonus: number, roll: Roll }
   */
  static async aidSkillCheck(aidingActor, aidedActor, skillId) {
    try {
      if (!aidingActor || !aidedActor) {
        throw new Error("Missing aiding or aided actor");
      }

      const skillData = aidingActor.system?.skills?.[skillId];
      if (!skillData) {
        throw new Error(`Skill ${skillId} not found on aiding actor`);
      }

      // Roll the skill check
      const bonus = skillData.total || 0;
      const rollFormula = `1d20 + ${bonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const success = roll.total >= 10;
      const aidBonus = success ? 2 : 0;

      // Store the aid effect on the aided actor
      if (success) {
        await this._grantSkillAid(aidedActor, aidingActor.name, skillId, aidBonus);
      }

      // Create chat message
      const skillName = this._getSkillName(skillId);
      const successText = success
        ? `<span style="color: green; font-weight: bold;">SUCCESS! +2 bonus granted!</span>`
        : `<span style="color: orange;">Failed. No bonus granted.</span>`;

      const message = `
        <div style="border: 2px solid #4a90e2; padding: 10px; margin: 5px 0;">
          <h3>Aid Another - Skill Check</h3>
          <p><strong>${aidingActor.name}</strong> aids <strong>${aidedActor.name}</strong> with ${skillName}</p>
          <p><strong>Aid Roll:</strong> ${roll.total} (1d20 + ${bonus})</p>
          <p>${successText}</p>
          ${success ? `<p><em>${aidedActor.name} receives +2 bonus on their next ${skillName} check</em></p>` : ''}
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: aidingActor }),
        content: message
      });

      return { success, bonus: aidBonus, roll, skillId };
    } catch (err) {
      SWSELogger.error("Aid skill check failed", err);
      throw err;
    }
  }

  /**
   * Aid an attack roll - attack Reflex 10, success grants +2 to ally's next attack
   * @param {Actor} aidingActor - The character providing aid
   * @param {Actor} aidedActor - The character being aided
   * @param {Actor} targetActor - The target of the aided attack
   * @param {Item} weapon - Weapon used for the aid action
   * @returns {Promise<Object>} - { success: boolean, roll: Roll }
   */
  static async aidAttackRoll(aidingActor, aidedActor, targetActor, weapon) {
    try {
      if (!aidingActor || !aidedActor || !targetActor) {
        throw new Error("Missing aiding, aided, or target actor");
      }

      // Attack Reflex Defense of 10
      const abilityMod = aidingActor.system?.attributes[weapon?.system?.attackAttribute || "str"]?.mod || 0;
      const bab = aidingActor.system?.bab || 0;
      const lvl = aidingActor.system?.level || 1;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon?.system?.attackBonus || 0;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus;

      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const success = roll.total >= 10;

      // Grant the +2 bonus to the allied attack
      if (success) {
        await this._grantAttackAid(aidedActor, aidingActor.name, targetActor, 2);
      }

      // Create chat message
      const successText = success
        ? `<span style="color: green; font-weight: bold;">SUCCESS! +2 attack bonus granted!</span>`
        : `<span style="color: orange;">Failed (vs DC 10). No bonus granted.</span>`;

      const message = `
        <div style="border: 2px solid #4a90e2; padding: 10px; margin: 5px 0;">
          <h3>Aid Another - Attack Roll</h3>
          <p><strong>${aidingActor.name}</strong> aids <strong>${aidedActor.name}</strong>'s attack on <strong>${targetActor.name}</strong></p>
          <p><strong>Aid Attack:</strong> ${roll.total} vs DC 10 (1d20 + ${totalBonus})</p>
          <p>${successText}</p>
          ${success ? `<p><em>${aidedActor.name} receives +2 on their next attack against ${targetActor.name}</em></p>` : ''}
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: aidingActor }),
        content: message
      });

      return { success, bonus: success ? 2 : 0, roll, targetId: targetActor.id };
    } catch (err) {
      SWSELogger.error("Aid attack roll failed", err);
      throw err;
    }
  }

  /**
   * Suppress an enemy - attack Reflex 10, success inflicts -2 penalty on next attack
   * @param {Actor} suppressingActor - The character providing suppression
   * @param {Actor} targetActor - The character to suppress
   * @param {Item} weapon - Weapon used for suppression
   * @returns {Promise<Object>} - { success: boolean, roll: Roll }
   */
  static async suppressEnemy(suppressingActor, targetActor, weapon) {
    try {
      if (!suppressingActor || !targetActor) {
        throw new Error("Missing suppressing or target actor");
      }

      // Attack target's Reflex Defense of 10
      const abilityMod = suppressingActor.system?.attributes[weapon?.system?.attackAttribute || "dex"]?.mod || 0;
      const bab = suppressingActor.system?.bab || 0;
      const lvl = suppressingActor.system?.level || 1;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon?.system?.attackBonus || 0;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus;

      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const success = roll.total >= 10;

      // Apply the -2 penalty to the enemy
      if (success) {
        await this._applySuppressionPenalty(targetActor, suppressingActor.name, -2);
      }

      // Create chat message
      const successText = success
        ? `<span style="color: green; font-weight: bold;">SUCCESS! -2 attack penalty applied!</span>`
        : `<span style="color: orange;">Failed (vs DC 10). No penalty applied.</span>`;

      const message = `
        <div style="border: 2px solid #e24a4a; padding: 10px; margin: 5px 0;">
          <h3>Suppression</h3>
          <p><strong>${suppressingActor.name}</strong> suppresses <strong>${targetActor.name}</strong></p>
          <p><strong>Suppression Attack:</strong> ${roll.total} vs DC 10 (1d20 + ${totalBonus})</p>
          <p>${successText}</p>
          ${success ? `<p><em>${targetActor.name} takes -2 penalty on their next attack</em></p>` : ''}
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: suppressingActor }),
        content: message
      });

      return { success, penalty: success ? -2 : 0, roll };
    } catch (err) {
      SWSELogger.error("Suppress enemy failed", err);
      throw err;
    }
  }

  /**
   * Grant a skill aid bonus to an actor
   * @private
   */
  static async _grantSkillAid(actor, aidedBy, skillId, bonus) {
    const aidFlags = actor.getFlag("foundryvtt-swse", "skillAids") || {};
    aidFlags[skillId] = {
      bonus,
      grantedBy: aidedBy,
      expiresNextCheck: true
    };
    await actor.setFlag("foundryvtt-swse", "skillAids", aidFlags);
  }

  /**
   * Grant an attack aid bonus to an actor
   * @private
   */
  static async _grantAttackAid(actor, aidedBy, targetActor, bonus) {
    const attackAids = actor.getFlag("foundryvtt-swse", "attackAids") || {};
    if (!attackAids[targetActor.id]) {
      attackAids[targetActor.id] = [];
    }
    attackAids[targetActor.id].push({
      bonus,
      grantedBy: aidedBy,
      expiresNextAttack: true
    });
    await actor.setFlag("foundryvtt-swse", "attackAids", attackAids);
  }

  /**
   * Apply suppression penalty to an actor
   * @private
   */
  static async _applySuppressionPenalty(actor, suppressedBy, penalty) {
    const suppressions = actor.getFlag("foundryvtt-swse", "suppressionPenalties") || {};
    suppressions.penalty = penalty;
    suppressions.appliedBy = suppressedBy;
    suppressions.expiresNextAttack = true;
    await actor.setFlag("foundryvtt-swse", "suppressionPenalties", suppressions);
  }

  /**
   * Cleanup expired aid bonuses/penalties
   * @private
   */
  static async _cleanupExpiredAids(combat) {
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;

      // Clean up after this actor's turn ends
      await actor.unsetFlag("foundryvtt-swse", "skillAids");
      await actor.unsetFlag("foundryvtt-swse", "suppressionPenalties");
    }
  }

  /**
   * Get display name for a skill
   * @private
   */
  static _getSkillName(skillId) {
    const skillNames = {
      // Heroic
      acrobatics: "Acrobatics",
      athletics: "Athletics",
      deception: "Deception",
      insight: "Insight",
      intimidate: "Intimidate",
      medicine: "Medicine",
      perception: "Perception",
      persuasion: "Persuasion",
      piloting: "Piloting",
      stealth: "Stealth",
      survival: "Survival",
      knowledge_bureaucracy: "Knowledge (Bureaucracy)",
      knowledge_galaxies: "Knowledge (Galaxies)",
      knowledge_life_sciences: "Knowledge (Life Sciences)",
      knowledge_physical_sciences: "Knowledge (Physical Sciences)",
      knowledge_social_sciences: "Knowledge (Social Sciences)",
      knowledge_tactics: "Knowledge (Tactics)",
      knowledge_technology: "Knowledge (Technology)",
      mechanics: "Mechanics",
      use_computer: "Use Computer"
    };
    return skillNames[skillId] || skillId.charAt(0).toUpperCase() + skillId.slice(1);
  }

  /**
   * Get all active skill aids for an actor
   * @param {Actor} actor
   * @returns {Object}
   */
  static getSkillAids(actor) {
    return actor?.getFlag("foundryvtt-swse", "skillAids") || {};
  }

  /**
   * Get all active attack aids for an actor targeting a specific foe
   * @param {Actor} actor
   * @param {string} targetId
   * @returns {Array}
   */
  static getAttackAids(actor, targetId) {
    const aids = actor?.getFlag("foundryvtt-swse", "attackAids") || {};
    return aids[targetId] || [];
  }

  /**
   * Get suppression penalty for an actor
   * @param {Actor} actor
   * @returns {number}
   */
  static getSuppressionPenalty(actor) {
    const suppression = actor?.getFlag("foundryvtt-swse", "suppressionPenalties");
    return suppression?.penalty || 0;
  }
}
