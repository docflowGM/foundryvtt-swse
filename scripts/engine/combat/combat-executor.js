/**
 * CombatExecutor — Complete execution flow for combat actions
 *
 * Handles:
 * - Attack roll execution with modifiers
 * - Defense resolution
 * - Damage calculation and application
 * - Animation feedback
 * - Chat message generation
 * - Force Point expenditure
 * - Critical success/failure tracking
 *
 * Routes all mutations through ActorEngine and SWSEChat.
 */

import { CombatEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

export class CombatExecutor {
  /**
   * Execute attack roll with all modifiers
   * @param {Actor} actor - Attacking actor
   * @param {string} actionKey - Action identifier
   * @param {Object} options - Roll options
   * @param {string} options.range - Range category
   * @param {string} options.cover - Target cover
   * @param {string} options.concealment - Concealment level
   * @param {boolean} options.aim - Did character spend action aiming?
   * @param {boolean} options.force - Spend Force Point?
   * @param {number} options.misc - Additional bonus
   * @returns {Object} Attack result with roll data
   */
  static async executeAttack(actor, actionKey, options = {}) {
    try {
      // Get action data
      const actionData = actor.flags?.swse?.combatActions?.[actionKey];
      if (!actionData) {
        throw new Error(`Action not found: ${actionKey}`);
      }

      // Check Force Point expenditure
      let usedForce = false;
      if (options.force) {
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) {
          throw new Error("No Force Points available");
        }
        usedForce = true;
      }

      // Call CombatEngine for actual roll
      const result = await CombatEngine.rollAttack(actor, actionKey, options);

      // Generate chat message via SWSEChat
      if (result) {
        await this._generateAttackChatMessage(actor, actionData, result, options);
      }

      // Spend Force Point if used
      if (usedForce) {
        const currentFP = SchemaAdapters.getForcePoints(actor);
        const plan = {
          update: {
            "system.forcePoints.value": Math.max(0, currentFP - 1)
          }
        };
        await ActorEngine.apply(actor, plan);
      }

      // Apply animations if element available
      if (result.element) {
        const isCrit = result.roll?.total >= (actionData.critRange || 20);
        const isFumble = result.roll?.total <= 1;
        AnimationEngine.animateRollResult(
          result.element,
          { total: result.roll?.total, isCritical: isCrit, isFumble },
          () => console.log("Roll animation complete")
        );
      }

      return result;
    } catch (err) {
      console.error("Attack execution failed:", err);
      ui?.notifications?.error?.(`Attack failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Execute initiative roll
   * @param {Actor} actor - Actor rolling initiative
   * @param {Object} options - Roll options
   * @param {boolean} options.useForce - Spend Force Point?
   * @returns {Object} Initiative result
   */
  static async executeInitiative(actor, options = {}) {
    try {
      // Check Force Point
      let usedForce = false;
      if (options.useForce) {
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) {
          throw new Error("No Force Points available");
        }
        usedForce = true;
      }

      // Execute initiative roll via CombatEngine
      const result = await CombatEngine.rollInitiative(actor, options);

      // Generate chat message
      await this._generateInitiativeChatMessage(actor, result);

      // Spend Force Point if used
      if (usedForce) {
        const currentFP = SchemaAdapters.getForcePoints(actor);
        const plan = {
          update: {
            "system.forcePoints.value": Math.max(0, currentFP - 1)
          }
        };
        await ActorEngine.apply(actor, plan);
      }

      // Trigger Sentinel for initiative tracking
      if (game.combat) {
        Hooks.callAll("swse-initiative-rolled", actor, result);
      }

      return result;
    } catch (err) {
      console.error("Initiative execution failed:", err);
      ui?.notifications?.error?.(`Initiative failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Resolve attack hit/miss against target defense
   * @param {Actor} attacker - Attacking actor
   * @param {Actor} target - Target actor
   * @param {number} attackRoll - Attack roll total
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result (hit/miss, damage if hit)
   */
  static async resolveHit(attacker, target, attackRoll, options = {}) {
    try {
      if (!target) {
        throw new Error("No target specified");
      }

      // Get target defense
      const targetDefense = target.system?.defense?.total || 10;

      // Determine if hit
      const isHit = attackRoll >= targetDefense;

      // If miss, just generate chat message
      if (!isHit) {
        await SWSEChat.createMissMessage(
          attacker,
          target,
          attackRoll,
          targetDefense
        );
        return { hit: false, roll: attackRoll, defense: targetDefense };
      }

      // If hit, calculate damage
      const damageResult = await this._calculateDamage(attacker, options);

      // Apply damage to target
      const targetHp = SchemaAdapters.getHP(target);
      const newHp = Math.max(0, targetHp - damageResult.total);

      const plan = {
        update: SchemaAdapters.setHPUpdate(newHp)
      };

      await ActorEngine.apply(target, plan);

      // Generate hit + damage message
      await SWSEChat.createHitMessage(
        attacker,
        target,
        attackRoll,
        targetDefense,
        damageResult
      );

      return {
        hit: true,
        roll: attackRoll,
        defense: targetDefense,
        damage: damageResult.total,
        targetHp: newHp
      };
    } catch (err) {
      console.error("Hit resolution failed:", err);
      ui?.notifications?.error?.(`Hit resolution failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Calculate damage for attack
   * @param {Actor} attacker - Attacking actor
   * @param {Object} options - Damage options
   * @param {string} options.weaponId - Weapon item ID
   * @param {string} options.damageType - Type of damage
   * @param {number} options.bonus - Additional damage bonus
   * @returns {Object} Damage result with breakdown
   */
  static async _calculateDamage(attacker, options = {}) {
    try {
      const { weaponId = null, bonus = 0 } = options;

      let baseDamage = 0;
      let damageType = "physical";

      // Get damage from weapon if specified
      if (weaponId) {
        const weapon = attacker.items.get(weaponId);
        if (weapon) {
          baseDamage = weapon.system?.damage?.roll || 0;
          damageType = weapon.system?.damage?.type || "physical";
        }
      }

      // Add character bonuses
      const abilityBonus = attacker.system?.abilityScores?.str?.mod || 0;

      const total = baseDamage + abilityBonus + bonus;

      return {
        base: baseDamage,
        ability: abilityBonus,
        bonus,
        total: Math.max(0, total),
        type: damageType
      };
    } catch (err) {
      console.error("Damage calculation failed:", err);
      return { base: 0, ability: 0, bonus: 0, total: 0, type: "physical" };
    }
  }

  /**
   * Generate attack roll chat message
   * @private
   */
  static async _generateAttackChatMessage(actor, actionData, result, options) {
    try {
      const content = `
        <div class="swse-chat-roll">
          <h3>${actor.name} uses ${actionData.name}</h3>
          <div class="roll-result">
            <strong>Attack Roll:</strong> ${result.roll?.total || 0}
          </div>
          ${options.aim ? '<div class="roll-modifier">+2 from aiming</div>' : ''}
          ${options.force ? '<div class="role-modifier force-point">Force Point spent</div>' : ''}
          ${options.misc ? `<div class="roll-modifier">+${options.misc} misc bonus</div>` : ''}
        </div>
      `;

      await SWSEChat.postHTML({
        actor,
        content
      });
    } catch (err) {
      console.error("Chat message generation failed:", err);
    }
  }

  /**
   * Generate initiative roll chat message
   * @private
   */
  static async _generateInitiativeChatMessage(actor, result) {
    try {
      const content = `
        <div class="swse-chat-roll">
          <h3>${actor.name} rolls initiative</h3>
          <div class="roll-result">
            <strong>Initiative:</strong> ${result.total || 0}
            <span class="roll-formula">(d20 + Mod)</span>
          </div>
        </div>
      `;

      await SWSEChat.postHTML({
        actor,
        content
      });
    } catch (err) {
      console.error("Initiative chat message failed:", err);
    }
  }
}
