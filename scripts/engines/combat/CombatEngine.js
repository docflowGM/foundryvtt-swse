
import { RollEngine } from '../roll-engine.js';
import { SWSEInitiative } from './SWSEInitiative.js';
import { DamageEngine } from './damage-engine.js';
import { ThresholdEngine } from './threshold-engine.js';
import { DamageResolutionEngine } from './damage-resolution-engine.js';
import { ScaleEngine } from './scale-engine.js';
import { SubsystemEngine } from './starship/subsystem-engine.js';
import { EnhancedShields } from './starship/enhanced-shields.js';
import { VehicleTurnController } from './starship/vehicle-turn-controller.js';
import { VehicleDogfighting } from './subsystems/vehicle/vehicle-dogfighting.js';
import { VehicleCollisions } from './subsystems/vehicle/vehicle-collisions.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { CombatUIAdapter } from './ui/CombatUIAdapter.js';

export class CombatEngine {

  /* -------------------------------------------- */
  /* BUILD VIEW MODEL                             */
  /* -------------------------------------------- */

  static buildCombatState(actor) {
    return {
      initiative: actor.system.skills?.initiative ?? {},
      hp: actor.system.hp ?? {},
      condition: actor.system.conditionTrack ?? {},
      effects: actor.effects ?? []
    };
  }

  /* -------------------------------------------- */
  /* INITIATIVE (Skill-based) — PHASE 1 Consolidated */
  /* -------------------------------------------- */

  /**
   * SINGLE ORCHESTRATION AUTHORITY for initiative rolls.
   *
   * All initiative rolls MUST route through this method.
   * This ensures:
   *   - Consistent Force Point handling
   *   - Unified tie resolution
   *   - Single chat message flow
   *   - Combat Tracker consistency
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {boolean} options.useForce - Spend Force Point on roll
   * @returns {Object} { roll, total, usedForce, forceBonus, baseMod }
   */
  static async rollInitiative(actor, options = {}) {
    return SWSEInitiative.rollInitiative(actor, options);
  }

  /* -------------------------------------------- */
  /* ATTACK RESOLUTION PIPELINE (Full Orchestration) */
  /* -------------------------------------------- */

  /**
   * Full attack resolution orchestration.
   *
   * @param {Object} params
   * @param {Actor} params.attacker - Attacking actor
   * @param {Actor} params.target - Target actor
   * @param {Item} params.weapon - Weapon item
   * @param {Object} params.attackRoll - Pre-rolled attack (from SWSERoll)
   * @param {Object} params.options - Additional options
   * @param {number} params.options.coverBonus - Defense bonus from cover
   * @param {number} params.options.concealmentMissChance - Miss chance from concealment
   * @param {number} params.options.flankingBonus - Attack bonus from flanking
   * @param {Function} params.options.onPreHitResolution - Hook for plugin modification
   * @returns {Object} Attack resolution result
   */
  static async resolveAttack({
    attacker,
    target,
    weapon,
    attackRoll,
    options = {}
  }) {

    if (!attacker || !target || !weapon || !attackRoll) {
      return { success: false, reason: "Invalid attacker/target/weapon/roll" };
    }

    /* PHASE 2b: SUBSYSTEM PENALTY INTEGRATION (Vehicle only) */
    let subsystemPenalty = 0;
    if (attacker.type === "vehicle") {
      const penalties = SubsystemEngine.getAggregatePenalties(attacker);

      /* Block attack if weapons offline */
      if (penalties.weaponsOffline) {
        const blockedResult = {
          hit: false,
          blocked: true,
          reason: "Weapons subsystem is offline. No attacks possible.",
          attackRoll,
          context: {
            attacker,
            target,
            weapon,
            defenseType: 'reflex',
            defenseValue: target.system.defenses?.reflex?.total ?? 10
          },
          attacker,
          target,
          weapon
        };
        await CombatUIAdapter.handleAttackResult(blockedResult);
        return blockedResult;
      }

      /* Apply attack penalty from damaged subsystems */
      subsystemPenalty = penalties.attackPenalty ?? 0;
    }

    /* HIT RESOLUTION CONTEXT */
    const context = {
      attacker,
      target,
      weapon,
      roll: attackRoll,
      totalAttack: attackRoll.total + subsystemPenalty,
      defenseType: 'reflex',
      defenseValue: target.system.defenses?.reflex?.total ?? 10,
      modifiers: options.modifiers || {},
      hit: options.precomputedHit ?? null,
      subsystemPenalty
    };

    /* APPLY COVER BONUS */
    if (options.coverBonus !== undefined) {
      context.modifiers.coverBonus = options.coverBonus;
      context.defenseValue += options.coverBonus;
    }

    /* PRE-HIT HOOK (Allow plugins to modify context) */
    if (options.onPreHitResolution) {
      await options.onPreHitResolution(context);
    }
    Hooks.callAll('swse.preHitResolution', context);

    /* RESOLVE HIT */
    if (context.hit === null) {
      const d20 = attackRoll.dice?.[0]?.results?.[0]?.result ?? 0;
      if (d20 === 1) {
        context.hit = false;
      } else if (d20 === 20) {
        context.hit = true;
      } else {
        context.hit = context.totalAttack >= context.defenseValue;
      }
    }

    /* CONCEALMENT MISS CHANCE */
    if (context.hit && options.concealmentMissChance && options.concealmentMissChance > 0) {
      const roll = Math.random() * 100;
      if (roll < options.concealmentMissChance) {
        context.hit = false;
      }
    }

    if (!context.hit) {
      const missResult = {
        hit: false,
        attackRoll,
        context,
        attacker,
        target,
        weapon
      };

      /* DELEGATE UI HANDLING TO ADAPTER (Phase 1.5 consolidation) */
      await CombatUIAdapter.handleAttackResult(missResult);

      return missResult;
    }

    /* DAMAGE */
    // PHASE 2: Read from structured v2 schema only
    const damageFormula = weapon.system.combat?.damage?.dice ?? "1d6";

    // Guard: Detect legacy weapon schema
    if (weapon.system.schemaVersion !== 2 && weapon.system.damage && !weapon.system.combat?.damage?.dice) {
      throw new Error(`[CombatEngine] Legacy weapon schema detected for "${weapon.name}". Weapons must use v2 structured schema.`);
    }

    const damageBonus = options.damageBonus ?? 0;
    const fullDamageFormula = damageBonus > 0 ? `${damageFormula} + ${damageBonus}` : damageFormula;
    const damageRoll = await RollEngine.safeRoll(fullDamageFormula);
    let damage = damageRoll.total;

    /* SCALE */
    const scaleResult = ScaleEngine.scaleDamage(damage, attacker, target);
    damage = scaleResult.damage;

    /* SHIELDS (Vehicle only) */
    if (target.type === "vehicle") {
      const zone = options.shieldZone || "fore";
      const shieldResult = await EnhancedShields.applyDamageToZone(target, zone, damage);
      damage = shieldResult.overflow;
    }

    /* HP */
    const damageResult = await DamageEngine.applyDamage(target, damage);

    /* THRESHOLD */
    const thresholdResult = ThresholdEngine.evaluateThreshold({
      target,
      damage
    });

    await ThresholdEngine.applyResult(thresholdResult);

    /* SUBSYSTEM ESCALATION (Vehicle) */
    if (target.type === "vehicle" && thresholdResult.thresholdExceeded) {
      await SubsystemEngine.escalate(target, damage);
    }

    const result = {
      hit: true,
      attackRoll,
      damageRoll,
      damage,
      damageApplied: damageResult,
      threshold: thresholdResult,
      context,
      attacker,
      target,
      weapon
    };

    /* DELEGATE UI HANDLING TO ADAPTER (Phase 1.5 consolidation) */
    await CombatUIAdapter.handleAttackResult(result);

    return result;
  }

  /* -------------------------------------------- */
  /* VEHICLE TURN FLOW                            */
  /* -------------------------------------------- */

  static async startVehicleTurn(vehicle) {
    return VehicleTurnController.startTurn(vehicle);
  }

  static async advanceVehiclePhase(vehicle) {
    return VehicleTurnController.advancePhase(vehicle);
  }

  /* -------------------------------------------- */
  /* VEHICLE COMBAT SUBSYSTEMS (Phase 2c)        */
  /* -------------------------------------------- */

  /**
   * Initiate a dogfight between two vehicles.
   * Delegates to VehicleDogfighting subsystem.
   *
   * @param {Actor} attacker - Initiating vehicle
   * @param {Actor} target - Target vehicle
   * @returns {Promise<Object>} Dogfight result
   */
  static async initiateDogfight(attacker, target) {
    return VehicleDogfighting.initiateDogfight(attacker, target);
  }

  /**
   * Attempt to break free from a dogfight.
   * Delegates to VehicleDogfighting subsystem.
   *
   * @param {Actor} attacker - Vehicle attempting to break free
   * @param {Actor} defender - Opponent vehicle
   * @returns {Promise<Object>} Break free result
   */
  static async breakFreeDogfight(attacker, defender) {
    return VehicleDogfighting.breakFree(attacker, defender);
  }

  /**
   * Perform a ramming attack.
   * Delegates to VehicleCollisions subsystem.
   *
   * @param {Actor} attacker - Ramming vehicle
   * @param {Actor} target - Target vehicle
   * @returns {Promise<Object>} Damage result
   */
  static async performRam(attacker, target) {
    return VehicleCollisions.ram(attacker, target);
  }

  /* -------------------------------------------- */
  /* COMBAT PREVIEW AND ROLL                     */
  /* -------------------------------------------- */

  /**
   * Preview attack roll with modifiers (UI preview only).
   *
   * @param {Actor} actor - Attacking actor
   * @param {string} actionKey - Combat action key
   * @param {Object} options - Roll options (range, cover, aim, etc.)
   * @returns {Promise<Object>} Preview with total and breakdown
   */
  static async previewAttack(actor, actionKey, options = {}) {
    const { ModifierEngine } = await import('../../engines/effects/modifiers/ModifierEngine.js').catch(() => ({ ModifierEngine: null }));

    if (!ModifierEngine) {
      return {
        total: 0,
        breakdown: []
      };
    }

    const modifiers = await ModifierEngine.collectModifiers(actor, {
      domain: "attack",
      context: options
    });

    const total = modifiers.reduce((sum, m) => sum + m.value, 0);

    return {
      total,
      breakdown: modifiers.map(m => ({
        label: m.label,
        value: m.value
      }))
    };
  }

  /**
   * Execute combat attack roll with full resolution.
   *
   * @param {Actor} actor - Attacking actor
   * @param {string} actionKey - Combat action key
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Attack result
   */
  static async rollAttack(actor, actionKey, options = {}) {
    // This would be extended with full attack roll logic
    // For now, returns a placeholder
    return {
      success: true,
      actionKey,
      options
    };
  }

  /**
   * Execute a combat action (cards and UI integration).
   *
   * @param {Actor} actor - Acting actor
   * @param {string} actionKey - Combat action key
   * @returns {Promise<void>}
   */
  static async executeAction(actor, actionKey) {
    // Delegate to appropriate action handler
    console.log(`Executing action: ${actionKey} for ${actor.name}`);
  }

  /* -------------------------------------------- */
  /* INITIATIVE PREVIEW AND ROLL                 */
  /* -------------------------------------------- */

  /**
   * Preview initiative roll with modifiers.
   *
   * @param {Actor} actor - Actor rolling initiative
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} Initiative preview with breakdown
   */
  static async previewInitiative(actor, options = {}) {
    const { ModifierEngine } = await import('../../engines/effects/modifiers/ModifierEngine.js').catch(() => ({ ModifierEngine: null }));

    const baseRoll = options.baseRoll ?? null;

    let modifiers = [];
    if (ModifierEngine) {
      modifiers = await ModifierEngine.collectModifiers(actor, {
        domain: "initiative",
        context: options
      });
    }

    const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);

    return {
      baseRoll,
      modifierTotal,
      total: baseRoll !== null ? baseRoll + modifierTotal : modifierTotal,
      breakdown: modifiers.map(m => ({
        label: m.label,
        value: m.value
      }))
    };
  }

  /**
   * Roll initiative and update combat tracker.
   *
   * @param {Actor} actor - Actor rolling initiative
   * @param {Object} options - Roll options
   * @returns {Promise<void>}
   */
  static async rollInitiative(actor, options = {}) {
    const combat = game.combat;

    if (!combat) {
      ui.notifications.warn("No active combat.");
      return;
    }

    let combatant = combat.combatants.find(c => c.actorId === actor.id);

    // If actor not yet in combat, create combatant
    if (!combatant) {
      combatant = await combat.createEmbeddedDocuments("Combatant", [{
        actorId: actor.id,
        tokenId: actor.token?.id ?? null,
        sceneId: canvas.scene?.id
      }]).then(res => res[0]);
    }

    // Determine base roll
    const baseRoll = options.baseRoll ??
      (await new Roll("1d20").roll({ async: true })).total;

    // Get modifier preview
    const preview = await this.previewInitiative(actor, {
      ...options,
      baseRoll
    });

    // Update initiative value in tracker
    await combat.setInitiative(combatant.id, preview.total);

    // Optional: Chat Message
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-init-result">
          <strong>Initiative:</strong> ${preview.total}
          <br>
          Base: ${baseRoll}
          <br>
          Modifiers: ${preview.modifierTotal}
        </div>
      `
    });
  }

  /* -------------------------------------------- */
  /* UNIFIED DAMAGE RESOLUTION                    */
  /* -------------------------------------------- */

  /**
   * Unified damage resolution via DamageResolutionEngine.
   * Handles:
   * - Bonus HP application (highest source)
   * - HP reduction
   * - Damage Threshold evaluation
   * - Condition track shifts
   * - Death/Destroy determination
   * - Force Point rescue eligibility
   *
   * All mutations via ActorEngine only.
   *
   * @param {Actor} actor - Target actor
   * @param {number} damage - Total damage to apply
   * @param {Object} context - Additional context
   * @param {string} context.damageType - Damage type
   * @param {Actor} context.source - Attacking actor
   * @param {Object} context.options - Additional options
   * @returns {Promise<Object>} Resolution result
   */
  static async applyDamage(actor, damage, context = {}) {

    const resolution = await DamageResolutionEngine.resolveDamage({
      actor,
      damage,
      ...context
    });

    const plan = {};

    // Apply HP change (correct V2 path)
    plan["system.hp.value"] = resolution.hpAfter;

    // Apply condition track shift (numeric 0-5)
    if (resolution.conditionDelta !== 0) {
      plan["system.conditionTrack.current"] = resolution.conditionAfter;
    }

    // Delegate mutation to ActorEngine (no status flags)
    await ActorEngine.updateActor(actor, plan);

    /* ===================================================================
       Apply death/destroyed via Active Effects (not raw system flags)
       ================================================================= */

    if (resolution.dead) {
      await this._applyDeadEffect(actor);
    }

    if (resolution.destroyed) {
      await this._applyDestroyedEffect(actor);
    }

    if (resolution.unconscious && !resolution.dead && !resolution.destroyed) {
      await this._applyUnconsciousEffect(actor);
    }

    return resolution;
  }

  /**
   * Apply "Dead" active effect (character death state)
   * @private
   */
  static async _applyDeadEffect(actor) {
    if (!actor) return;

    // Check if already dead
    const existingDead = actor.effects.contents.find(e =>
      e.getFlag('foundryvtt-swse', 'effectType') === 'dead'
    );

    if (!existingDead) {
      const effectData = {
        name: 'Dead',
        icon: 'icons/svg/skull.svg',
        type: 'effect',
        disabled: false,
        flags: {
          'foundryvtt-swse': {
            effectType: 'dead',
            persistent: true
          }
        }
      };

      await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }
  }

  /**
   * Apply "Destroyed" active effect (vehicle/droid destruction state)
   * @private
   */
  static async _applyDestroyedEffect(actor) {
    if (!actor) return;

    // Check if already destroyed
    const existingDestroyed = actor.effects.contents.find(e =>
      e.getFlag('foundryvtt-swse', 'effectType') === 'destroyed'
    );

    if (!existingDestroyed) {
      const effectData = {
        name: 'Destroyed',
        icon: 'icons/svg/explosion.svg',
        type: 'effect',
        disabled: false,
        flags: {
          'foundryvtt-swse': {
            effectType: 'destroyed',
            persistent: true
          }
        }
      };

      await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }
  }

  /**
   * Apply "Unconscious" active effect (temporary state)
   * @private
   */
  static async _applyUnconsciousEffect(actor) {
    if (!actor) return;

    // Check if already unconscious
    const existingUnconscious = actor.effects.contents.find(e =>
      e.getFlag('foundryvtt-swse', 'effectType') === 'unconscious'
    );

    if (!existingUnconscious) {
      const effectData = {
        name: 'Unconscious',
        icon: 'icons/svg/sleep.svg',
        type: 'effect',
        disabled: false,
        flags: {
          'foundryvtt-swse': {
            effectType: 'unconscious',
            persistent: false
          }
        }
      };

      await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }
  }
}
