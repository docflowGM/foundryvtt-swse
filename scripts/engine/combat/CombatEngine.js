
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEInitiative } from "/systems/foundryvtt-swse/scripts/engine/combat/SWSEInitiative.js";
import { DamageEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-engine.js";
import { ThresholdEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js";
import { DamageResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js";
import { ScaleEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/scale-engine.js";
import { SubsystemEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/subsystem-engine.js";
import { EnhancedShields } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-shields.js";
import { VehicleTurnController } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/vehicle-turn-controller.js";
import { VehicleDogfighting } from "/systems/foundryvtt-swse/scripts/engine/combat/subsystems/vehicle/vehicle-dogfighting.js";
import { VehicleCollisions } from "/systems/foundryvtt-swse/scripts/engine/combat/subsystems/vehicle/vehicle-collisions.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { CombatUIAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/ui/CombatUIAdapter.js";
import { ReactionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

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

      /* PHASE 4: Fire post-attack hook for reactive PASSIVE/STATE abilities */
      Hooks.callAll('swse.attack-resolved', {
        attacker,
        target,
        weapon,
        hitResult: false,
        roll: attackRoll
      });

      /* DELEGATE UI HANDLING TO ADAPTER (Phase 1.5 consolidation) */
      await CombatUIAdapter.handleAttackResult(missResult);

      return missResult;
    }

    /* ===================================================================
       REACTION ELIGIBILITY (Phase 1)
       Fetch available reactions for defender before damage resolution.
       Reactions flow through chat context to holo template.
       ================================================================= */
    const attackContext = {
      attacker,
      target,
      weapon,
      attackType: weapon.system.combat?.range === 'ranged' ? 'ranged' : 'melee',
      damageTypes: [weapon.system.combat?.damageType || 'kinetic'],
      trigger: 'ON_ATTACK_DECLARED'
    };

    const reactions = await ReactionEngine.getAvailableReactions(target, attackContext);

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

    /* PHASE 4: Fire hook after hit determination, before threshold (allows reactions) */
    Hooks.callAll('swse.attack-resolved', {
      attacker,
      target,
      weapon,
      hitResult: true,
      roll: attackRoll,
      damage
    });

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
      reactions,
      attacker,
      target,
      weapon
    };

    /* PHASE 4: Fire hook after all damage and threshold applied (allows post-damage effects) */
    Hooks.callAll('swse.damage-applied', {
      attacker,
      target,
      weapon,
      damage,
      damageApplied: damageResult,
      threshold: thresholdResult
    });

    /* COUP DE GRACE EVENT EMISSION */
    /* If this was a Coup de Grace attack, emit event for dependent feats (e.g., Sadistic Strike) */
    if (options?.isCoupDeGrace) {
      const targetDead = damageResult?.hpAfter <= 0;

      Hooks.callAll('swse.coupDeGrace', {
        attacker,
        target,
        weapon,
        damage: damageResult?.totalDamage || damage,
        killed: targetDead,
        autoCritical: true,
        doubledDamage: true
      });

      // Chat message for Coup de Grace
      const messageContent = `<b>${attacker.name}</b> delivers a <strong>Coup de Grace</strong> to <b>${target.name}</b>!`;
      const finalContent = targetDead
        ? messageContent + ` <em style="color: red;">Target is dead!</em>`
        : messageContent;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: attacker }),
        content: finalContent,
        type: 'other'
      });
    }

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

  static _resolveAttackWeapon(actor, actionKey) {
    if (!actor || !actionKey) return null;
    if (String(actionKey).startsWith('combat:')) {
      return actor.items?.find?.(item => item.type === 'weapon' && item.system?.equipped === true) ?? null;
    }
    return actor.items?.get?.(actionKey) ?? null;
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
    const { ModifierEngine } = await import("/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js").catch(() => ({ ModifierEngine: null }));

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

    const weapon = this._resolveAttackWeapon(actor, actionKey);
    const combatOptionSummary = weapon
      ? CombatOptionResolver.collectAttackModifiers(actor, weapon, options)
      : { attackBonus: 0, breakdown: [] };

    const total = modifiers.reduce((sum, m) => sum + m.value, 0) + (combatOptionSummary.attackBonus || 0);
    const breakdown = modifiers.map(m => ({
      label: m.label,
      value: m.value
    }));

    for (const entry of combatOptionSummary.breakdown ?? []) {
      if (entry.type === 'attack') {
        breakdown.push({ label: entry.label, value: entry.value });
      }
    }

    return {
      total,
      breakdown,
      attackOptions: weapon ? CombatOptionResolver.getAvailableAttackOptions(actor, weapon, options) : []
    };
  }

  /**
   * Execute combat attack roll with full resolution.
   * Routes attack button clicks to the proven rollAttack() pipeline.
   *
   * @param {Actor} actor - Attacking actor
   * @param {string} actionKey - Combat action key (e.g., from sheet buttons)
   * @param {Object} options - Roll options (range, cover, concealment, aim, force, misc)
   * @returns {Promise<Object>} Attack result
   */
  static async rollAttack(actor, actionKey, options = {}) {
    try {
      if (!actor) {
        throw new Error('rollAttack() called with no actor');
      }

      SWSELogger.debug(`[CombatEngine.rollAttack] Starting attack: ${actionKey}`, {
        actorId: actor.id,
        actionKey,
        options
      });

      // PHASE 1: Resolve the weapon/action from the action key
      // The actionKey can be:
      // - "combat:N" for universal combat actions (e.g., "combat:0" for Attack)
      // - An item ID for a specific weapon
      // - A feat/talent combat action ID

      let weapon = null;

      // Try to find the weapon item
      if (actionKey?.startsWith('combat:')) {
        // Universal combat action - resolve to a weapon
        // For now, use the actor's primary equipped weapon
        weapon = actor.items.find(item =>
          item.type === 'weapon' &&
          item.system?.equipped === true
        );

        if (!weapon) {
          SWSELogger.warn(`[CombatEngine.rollAttack] No equipped weapon found for action ${actionKey}`);
          ui.notifications.warn('No equipped weapon found. Equip a weapon and try again.');
          return { success: false, reason: 'No weapon equipped' };
        }
      } else {
        // Try direct item lookup
        weapon = actor.items.get(actionKey);
        if (!weapon || !weapon.system?.damage) {
          SWSELogger.warn(`[CombatEngine.rollAttack] Action ${actionKey} is not a valid weapon`);
          ui.notifications.warn(`Cannot find weapon for action ${actionKey}`);
          return { success: false, reason: 'Invalid weapon action' };
        }
      }

      SWSELogger.info(`[CombatEngine.rollAttack] Executing attack with ${weapon.name}`, {
        weaponId: weapon.id,
        actorName: actor.name
      });

      // PHASE 2: Roll the attack
      // This delegates to the proven rollAttack() from attacks.js
      const atkRoll = await rollAttack(actor, weapon, options);

      if (!atkRoll) {
        SWSELogger.warn(`[CombatEngine.rollAttack] Attack roll failed for ${weapon.name}`);
        return { success: false, reason: 'Attack roll failed' };
      }

      SWSELogger.info(`[CombatEngine.rollAttack] Attack rolled: ${atkRoll.total}`, {
        weaponName: weapon.name,
        attackTotal: atkRoll.total
      });

      return {
        success: true,
        actionKey,
        roll: atkRoll,
        weapon,
        reason: 'Attack executed'
      };

    } catch (err) {
      SWSELogger.error(`[CombatEngine.rollAttack] Error: ${err.message}`, { error: err });
      ui.notifications.error(`Attack failed: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }

  /**
   * Execute a combat action (cards and UI integration).
   * Routes to appropriate handler based on action key format.
   *
   * @param {Actor} actor - Acting actor
   * @param {string} actionKey - Combat action key
   * @returns {Promise<void>}
   */
  static async executeAction(actor, actionKey) {
    if (!actionKey || !actor) return;

    // Universal combat actions: format "combat:N" (N = index in combat-actions.json)
    if (actionKey.startsWith('combat:')) {
      const actionIndex = parseInt(actionKey.split(':')[1], 10);

      // Coup de Grace is at index 9 in combat-actions.json
      if (actionIndex === 9) {
        return this.executeCoupDeGrace(actor);
      }

      // Future: Add other universal actions here
      console.warn(`Combat action ${actionKey} not yet implemented`);
      return;
    }

    // Item-based actions (weapons, abilities)
    if (actionKey.startsWith('item:')) {
      console.log(`Item action: ${actionKey}`);
      return;
    }

    console.log(`Executing action: ${actionKey} for ${actor.name}`);
  }

  /**
   * Execute Coup de Grace action.
   * Validates target is helpless, then executes automatic critical hit.
   *
   * @param {Actor} actor - Attacking actor
   * @returns {Promise<void>}
   * @private
   */
  static async executeCoupDeGrace(actor) {
    if (!actor) return;

    // Validate combat is active
    if (!game.combat?.started) {
      ui.notifications.warn('Coup de Grace can only be used in combat');
      return;
    }

    // Validate target selection
    const targets = game.user?.targets || [];
    if (targets.size === 0) {
      ui.notifications.warn('Select a target for Coup de Grace');
      return;
    }

    const targetToken = Array.from(targets)[0];
    const target = targetToken?.actor;
    if (!target) return;

    // Validate target is helpless (condition track step 5+)
    const targetCondition = target.system?.conditionTrack?.current ?? 0;
    const isHelpless = targetCondition >= 5; // Helpless is step 5+

    if (!isHelpless) {
      ui.notifications.warn('Coup de Grace can only be used against helpless targets');
      return;
    }

    // Validate equipped weapon
    const weapon = actor.items.find(i => i.type === 'weapon' && i.system?.equipped === true);
    if (!weapon) {
      ui.notifications.warn('Equip a weapon to perform Coup de Grace');
      return;
    }

    // Execute attack with Coup de Grace flag
    await this.resolveAttack({
      attacker: actor,
      target,
      weapon,
      attackRoll: { total: 99999, dice: [] }, // Auto-hit
      options: {
        isCoupDeGrace: true,
        autoCritical: true
      }
    });
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
    const { ModifierEngine } = await import("/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js").catch(() => ({ ModifierEngine: null }));

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
   * @deprecated Legacy duplicate initiative implementation kept only as a
   * reference shim. V2 SSOT requires initiative to route through
   * CombatEngine.rollInitiative() -> SWSEInitiative.
   *
   * This method intentionally delegates to the canonical authority rather
   * than maintaining a second implementation path.
   */
  static async _rollInitiativeLegacyShim(actor, options = {}) {
    SWSELogger.warn?.('[CombatEngine] Deprecated initiative shim invoked; delegating to SWSEInitiative authority.');
    return SWSEInitiative.rollInitiative(actor, options);
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

      // SOVEREIGNTY: Route ActiveEffect creation through ActorEngine
      await ActorEngine.createActiveEffects(actor, [effectData], { source: 'combat-dead-effect' });
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

      // SOVEREIGNTY: Route ActiveEffect creation through ActorEngine
      await ActorEngine.createActiveEffects(actor, [effectData], { source: 'combat-destroyed-effect' });
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

      // SOVEREIGNTY: Route ActiveEffect creation through ActorEngine
      await ActorEngine.createActiveEffects(actor, [effectData], { source: 'combat-unconscious-effect' });
    }
  }
}
