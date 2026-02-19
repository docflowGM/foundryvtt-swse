// scripts/actors/engine/actor-engine.js
import { swseLogger } from '../../utils/logger.js';
import { applyActorUpdateAtomic } from '../../utils/actor-utils.js';
import { MutationInterceptor } from '../../core/mutation/MutationInterceptor.js';

/**
 * ActorEngine
 * Centralized actor mutation and recalculation pipeline.
 * Modernized for Foundry VTT v13+, avoids deprecated actor.data access.
 */
export const ActorEngine = {
  /**
   * Perform any derived-stat recalculation.
   * Runs after every validated update. Non-blocking.
   */
  async recalcAll(actor) {
    try {
      if (!actor) {throw new Error('recalcAll() called with no actor');}

      const systemData = actor.system;
      if (!systemData) {
        swseLogger.warn(`ActorEngine.recalcAll: Actor ${actor.name} has no system data.`);
        return;
      }

      // Future recalculations go here.
      swseLogger.debug(`Recalculating derived data for: ${actor.name}`);

      // If system implements a prepareDerivedData hook, call it safely.
      if (typeof actor.prepareDerivedData === 'function') {
        actor.prepareDerivedData();
      }

      // Optionally refresh effects, bonuses, etc.
      if (typeof actor.prepareSynthetics === 'function') {
        actor.prepareSynthetics();
      }

    } catch (err) {
      swseLogger.error('ActorEngine.recalcAll failed:', err);
    }
  },

  /**
   * Apply a template or module of predefined data to the actor,
   * then rebuild its derived values.
   */
  async applyTemplate(actor, templateData) {
    try {
      if (!actor) {throw new Error('applyTemplate() called with no actor');}

      await this.updateActor(actor, templateData);
      await this.recalcAll(actor);

    } catch (err) {
      swseLogger.error(`ActorEngine.applyTemplate failed on ${actor?.name ?? 'unknown actor'}`, err);
    }
  },

  /**
   * updateActor()
   * PHASE 3: Single mutation authority for all actor field updates.
   *
   * Enforced contract:
   * 1. Set mutation context (authorizes actor.update() call)
   * 2. Apply atomic update to actor
   * 3. Trigger single recalculation
   * 4. Clear mutation context
   *
   * This is the ONLY legal path to actor mutations.
   */
  async updateActor(actor, updateData, options = {}) {
    try {
      if (!actor) {throw new Error('updateActor() called with no actor');}

      if (!updateData || typeof updateData !== 'object') {
        throw new Error(`Invalid updateData passed to updateActor for ${actor.name}`);
      }

      swseLogger.debug(`ActorEngine.updateActor → ${actor.name}`, {
        updateData,
        options
      });

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext('ActorEngine.updateActor');
      try {
        // Perform safe atomic update (now authorized)
        const result = await applyActorUpdateAtomic(actor, updateData, options);

        // Kick off a recalculation pass (async, not awaited)
        setTimeout(() => {
          try {
            this.recalcAll(actor);
          } catch (e) {
            swseLogger.warn(`ActorEngine.recalcAll threw during async pass for ${actor.name}`, e);
          }
        }, 0);

        return result;
      } finally {
        // Always clear context, even on error
        MutationInterceptor.clearContext();
      }

    } catch (err) {
      swseLogger.error(`ActorEngine.updateActor failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        updateData
      });
      throw err;
    }
  },

  /**
   * Update embedded documents (e.g. owned Items) while preserving the ActorEngine lifecycle.
   *
   * PHASE 3: Single mutation authority for all embedded document updates.
   * v2 contract: any actor-affecting state change (including embedded Items) must route through ActorEngine.
   *
   * @param {Actor} actor
   * @param {string} embeddedName - Embedded collection name, e.g. "Item"
   * @param {object[]} updates - update objects (must include _id)
   * @param {object} [options={}] - forwarded to updateEmbeddedDocuments
   */
  async updateEmbeddedDocuments(actor, embeddedName, updates, options = {}) {
    try {
      if (!actor) {throw new Error('updateEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('updateEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(updates)) {throw new Error('updateEmbeddedDocuments() requires updates array');}

      swseLogger.debug(`ActorEngine.updateEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        updates,
        options
      });

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext(`ActorEngine.updateEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.updateEmbeddedDocuments(embeddedName, updates, options);

        setTimeout(() => {
          try {
            this.recalcAll(actor);
          } catch (e) {
            swseLogger.warn(`ActorEngine.recalcAll threw during async pass for ${actor.name}`, e);
          }
        }, 0);

        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      swseLogger.error(`ActorEngine.updateEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        embeddedName,
        updates
      });
      throw err;
    }
  },

  /**
   * Convenience wrapper for updating owned Items through ActorEngine.
   * @param {Actor} actor
   * @param {object[]} updates
   * @param {object} [options={}]
   */
  async updateOwnedItems(actor, updates, options = {}) {
    return this.updateEmbeddedDocuments(actor, 'Item', updates, options);
  },

  /**
   * Create embedded documents while preserving the ActorEngine lifecycle.
   * PHASE 3: Only legal way to create embedded documents.
   */
  async createEmbeddedDocuments(actor, embeddedName, data, options = {}) {
    try {
      if (!actor) {throw new Error('createEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('createEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(data)) {throw new Error('createEmbeddedDocuments() requires data array');}

      swseLogger.debug(`ActorEngine.createEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: data.length
      });

      MutationInterceptor.setContext(`ActorEngine.createEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.createEmbeddedDocuments(embeddedName, data, options);
        setTimeout(() => this.recalcAll(actor), 0);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      swseLogger.error(`ActorEngine.createEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * Delete embedded documents while preserving the ActorEngine lifecycle.
   * PHASE 3: Only legal way to delete embedded documents.
   */
  async deleteEmbeddedDocuments(actor, embeddedName, ids, options = {}) {
    try {
      if (!actor) {throw new Error('deleteEmbeddedDocuments() called with no actor');}
      if (!embeddedName) {throw new Error('deleteEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(ids)) {throw new Error('deleteEmbeddedDocuments() requires ids array');}

      swseLogger.debug(`ActorEngine.deleteEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: ids.length
      });

      MutationInterceptor.setContext(`ActorEngine.deleteEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.deleteEmbeddedDocuments(embeddedName, ids, options);
        setTimeout(() => this.recalcAll(actor), 0);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      swseLogger.error(`ActorEngine.deleteEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * applyDelta(actor, delta)
   *
   * v2 Progression Contract: The ONLY legal way to apply ProgressionCompiler output.
   *
   * Enforces strict guarantees:
   * - No derived writes (illegal boundary violation)
   * - No async computation (math belongs in prepareDerivedData)
   * - No conditional branching (resolver is deterministic)
   *
   * @param {Actor} actor
   * @param {ProgressionDelta} delta - { set, add, delete }
   * @throws if delta violates v2 constraints
   */
  async applyDelta(actor, delta) {
    try {
      if (!actor) {throw new Error('applyDelta() called with no actor');}
      if (!delta) {return;} // noop

      // ---- GUARDRAIL 1: Reject derived writes ----
      if (delta.derived) {
        throw new Error(
          'ARCHITECTURE VIOLATION: Progression attempted to write to derived fields. ' +
          'Math computation belongs in prepareDerivedData(), not progression.'
        );
      }

      // ---- GUARDRAIL 2: Validate delta structure ----
      if (delta.set && typeof delta.set !== 'object') {
        throw new Error('Invalid delta.set: must be object { path: value }');
      }
      if (delta.add && typeof delta.add !== 'object') {
        throw new Error('Invalid delta.add: must be object with feature arrays');
      }
      if (delta.delete && typeof delta.delete !== 'object') {
        throw new Error('Invalid delta.delete: must be object with feature arrays');
      }

      swseLogger.debug(`ActorEngine.applyDelta → ${actor.name}`, { delta });

      // ---- Phase 4: Apply SET operations (field updates) ----
      const updates = {};
      if (delta.set) {
        for (const [path, value] of Object.entries(delta.set)) {
          if (path.startsWith('system.derived')) {
            throw new Error(`ILLEGAL: applyDelta cannot write ${path} (derived field)`);
          }
          updates[path] = value;
        }
      }

      // Apply field updates atomically
      if (Object.keys(updates).length > 0) {
        await this.updateActor(actor, updates);
      }

      // ---- Phase 4: Apply ADD operations (create items) ----
      if (delta.add?.talents && delta.add.talents.length > 0) {
        const talentItems = delta.add.talents.map(talentId => ({
          type: 'talent',
          name: talentId, // Will be enriched by sheet
          system: {
            ssotId: talentId // Pointer to SSOT, not rules
          }
        }));
        await this.createEmbeddedDocuments(actor, 'Item', talentItems);
      }

      if (delta.add?.feats && delta.add.feats.length > 0) {
        const featItems = delta.add.feats.map(featId => ({
          type: 'feat',
          name: featId,
          system: {
            ssotId: featId
          }
        }));
        await this.createEmbeddedDocuments(actor, 'Item', featItems);
      }

      if (delta.add?.skills && delta.add.skills.length > 0) {
        const skillUpdates = {};
        for (const skillId of delta.add.skills) {
          // Skills are ranks in system.skills, not items
          skillUpdates[`system.progression.skills.${skillId}`] = 1;
        }
        await this.updateActor(actor, skillUpdates);
      }

      // ---- Phase 4: Apply DELETE operations (remove items) ----
      if (delta.delete?.talents && delta.delete.talents.length > 0) {
        const talentsToDelete = actor.items
          .filter(item => item.type === 'talent' && delta.delete.talents.includes(item.system.ssotId))
          .map(item => item.id);
        if (talentsToDelete.length > 0) {
          await this.deleteEmbeddedDocuments(actor, 'Item', talentsToDelete);
        }
      }

      if (delta.delete?.feats && delta.delete.feats.length > 0) {
        const featsToDelete = actor.items
          .filter(item => item.type === 'feat' && delta.delete.feats.includes(item.system.ssotId))
          .map(item => item.id);
        if (featsToDelete.length > 0) {
          await this.deleteEmbeddedDocuments(actor, 'Item', featsToDelete);
        }
      }

      swseLogger.log(`ActorEngine.applyDelta completed for ${actor.name}`);

    } catch (err) {
      swseLogger.error(`ActorEngine.applyDelta failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        delta
      });
      throw err;
    }
  },

  // ============================================================================
  // PHASE 3 BATCH 2: COMBAT AUTHORITY APIS
  // ============================================================================

  /**
   * applyDamage() — PHASE 3 Combat Authority
   *
   * ONLY legal way to reduce actor HP in combat.
   *
   * Contract:
   * - Combat produces DamagePacket (declarative)
   * - ActorEngine applies modifiers & computes final damage
   * - ConditionTrack shifts handled atomically
   * - Single mutation, single recalc
   *
   * @param {Actor} actor - target actor
   * @param {Object} damagePacket - {
   *   amount: number,           // Raw damage amount
   *   type: string,             // 'kinetic', 'energy', 'burn', etc.
   *   source: string,           // 'laser-attack', 'force-power', etc.
   *   modifiersApplied: boolean,// Have ModifierEngine modifiers been applied?
   *   conditionShift: boolean,  // Should condition track shift?
   *   targetActor: Actor        // (optional, for logging)
   * }
   */
  async applyDamage(actor, damagePacket) {
    try {
      if (!actor) {throw new Error('applyDamage() called with no actor');}
      if (!damagePacket) {throw new Error('applyDamage() called with no damagePacket');}
      if (typeof damagePacket.amount !== 'number' || damagePacket.amount < 0) {
        throw new Error(`Invalid damage amount: ${damagePacket.amount}`);
      }

      swseLogger.debug(`ActorEngine.applyDamage → ${actor.name}`, {
        amount: damagePacket.amount,
        type: damagePacket.type,
        source: damagePacket.source
      });

      // ========================================
      // Compute final damage (apply armor, abilities, etc.)
      // ========================================
      let finalDamage = damagePacket.amount;

      // TODO: Apply ModifierEngine for damage reduction
      // const modifiers = await ModifierEngine.getDamageModifiers(actor, damagePacket.type);
      // finalDamage = ModifierEngine.applyModifiers(finalDamage, modifiers);

      // ========================================
      // Apply damage & condition logic atomically
      // ========================================
      const currentHP = actor.system.attributes?.hp?.value || 0;
      const maxHP = actor.system.attributes?.hp?.max || 100;
      const newHP = Math.max(0, currentHP - finalDamage);

      // Check if condition shift needed (at threshold)
      const conditionThreshold = Math.floor(maxHP / 4); // Quarter health
      const wasAboveThreshold = currentHP > conditionThreshold;
      const isNowBelowThreshold = newHP <= conditionThreshold;
      const shouldShiftCondition = damagePacket.conditionShift &&
                                   wasAboveThreshold &&
                                   isNowBelowThreshold;

      // Build single atomic update
      const updates = {
        'system.attributes.hp.value': newHP
      };

      if (shouldShiftCondition) {
        // Shift condition track within same mutation
        const currentCondition = actor.system.progression?.conditionTrack || 0;
        updates['system.progression.conditionTrack'] = Math.max(0, currentCondition + 1);
      }

      // Apply all updates in one mutation
      await this.updateActor(actor, updates);

      swseLogger.log(`Damage applied to ${actor.name}: ${finalDamage}HP (final: ${newHP}/${maxHP})`, {
        source: damagePacket.source,
        conditionShifted: shouldShiftCondition
      });

      return {
        applied: finalDamage,
        newHP,
        conditionShifted: shouldShiftCondition
      };

    } catch (err) {
      swseLogger.error(`ActorEngine.applyDamage failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        damagePacket
      });
      throw err;
    }
  },

  /**
   * applyHealing() — Restore actor HP
   *
   * Use outside of combat for healing.
   * In combat, use applyDamage with negative amounts.
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - HP to restore
   * @param {string} source - healing source
   */
  async applyHealing(actor, amount, source = 'healing') {
    try {
      if (!actor) {throw new Error('applyHealing() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid healing amount: ${amount}`);
      }

      swseLogger.debug(`ActorEngine.applyHealing → ${actor.name}`, {
        amount,
        source
      });

      const currentHP = actor.system.attributes?.hp?.value || 0;
      const maxHP = actor.system.attributes?.hp?.max || 100;
      const newHP = Math.min(maxHP, currentHP + amount);
      const actualHealing = newHP - currentHP;

      if (actualHealing === 0) {
        swseLogger.debug(`${actor.name} healing had no effect (already at max HP)`);
        return { applied: 0, newHP };
      }

      await this.updateActor(actor, {
        'system.attributes.hp.value': newHP
      });

      swseLogger.log(`Healing applied to ${actor.name}: +${actualHealing}HP (now: ${newHP}/${maxHP})`, {
        source
      });

      return {
        applied: actualHealing,
        newHP
      };

    } catch (err) {
      swseLogger.error(`ActorEngine.applyHealing failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount,
        source
      });
      throw err;
    }
  },

  /**
   * applyConditionShift() — Shift condition track
   *
   * Shifts actor's condition track by +1 or -1.
   * Triggers derived recalculation for condition penalties.
   *
   * @param {Actor} actor - target actor
   * @param {number} direction - +1 (worse) or -1 (better)
   * @param {string} source - reason for shift
   */
  async applyConditionShift(actor, direction, source = 'manual') {
    try {
      if (!actor) {throw new Error('applyConditionShift() called with no actor');}
      if (direction !== 1 && direction !== -1) {
        throw new Error(`Invalid shift direction: ${direction} (must be +1 or -1)`);
      }

      swseLogger.debug(`ActorEngine.applyConditionShift → ${actor.name}`, {
        direction,
        source
      });

      const currentCondition = actor.system.progression?.conditionTrack || 0;
      const newCondition = Math.max(0, currentCondition + direction);

      if (newCondition === currentCondition) {
        swseLogger.debug(`${actor.name} condition shift had no effect (at boundary)`);
        return { applied: 0, newCondition };
      }

      await this.updateActor(actor, {
        'system.progression.conditionTrack': newCondition
      });

      const directionLabel = direction > 0 ? 'worsened' : 'improved';
      swseLogger.log(`Condition ${directionLabel} for ${actor.name} (now: ${newCondition})`, {
        source
      });

      return {
        applied: direction,
        newCondition
      };

    } catch (err) {
      swseLogger.error(`ActorEngine.applyConditionShift failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        direction,
        source
      });
      throw err;
    }
  },

  /**
   * updateActionEconomy() — Update action economy state
   *
   * Used by combatants to mark actions as used/available.
   * Single mutation for action state changes.
   *
   * @param {Actor} actor - target actor
   * @param {Object} actionEconomy - { swift, move, standard, fullRound, reaction }
   */
  async updateActionEconomy(actor, actionEconomy) {
    try {
      if (!actor) {throw new Error('updateActionEconomy() called with no actor');}
      if (!actionEconomy || typeof actionEconomy !== 'object') {
        throw new Error('updateActionEconomy() requires actionEconomy object');
      }

      swseLogger.debug(`ActorEngine.updateActionEconomy → ${actor.name}`, {
        swift: actionEconomy.swift,
        move: actionEconomy.move,
        standard: actionEconomy.standard,
        fullRound: actionEconomy.fullRound,
        reaction: actionEconomy.reaction
      });

      await this.updateActor(actor, {
        'system.actionEconomy': actionEconomy
      });

      swseLogger.log(`Action economy updated for ${actor.name}`, {
        actionEconomy
      });

      return { updated: true, actionEconomy };

    } catch (err) {
      swseLogger.error(`ActorEngine.updateActionEconomy failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        actionEconomy
      });
      throw err;
    }
  }

};
