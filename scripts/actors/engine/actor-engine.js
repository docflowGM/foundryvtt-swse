// scripts/actors/engine/actor-engine.js
import { swseLogger } from '../../utils/logger.js';
import { applyActorUpdateAtomic } from '../../utils/actor-utils.js';
import { MutationInterceptor } from '../../core/mutation/MutationInterceptor.js';
import { determineLevelFromXP } from '../../engine/progression/xp-engine.js';
import { DerivedCalculator } from '../derived/derived-calculator.js';
import { ModifierEngine } from '../../engine/modifiers/ModifierEngine.js';

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
  },

  /**
   * spendForcePoints() — Reduce actor's force points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to spend
   */
  async spendForcePoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('spendForcePoints() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid force point amount: ${amount}`);
      }

      const currentFP = actor.system.forcePoints?.value || 0;
      const newFP = Math.max(0, currentFP - amount);
      const actualSpent = currentFP - newFP;

      if (actualSpent === 0) {
        swseLogger.debug(`${actor.name} has no force points to spend`);
        return { spent: 0, remaining: newFP };
      }

      await this.updateActor(actor, {
        'system.forcePoints.value': newFP
      });

      swseLogger.log(`Force points spent: ${actor.name} used ${actualSpent}FP (now: ${newFP})`, {
        amount: actualSpent
      });

      return { spent: actualSpent, remaining: newFP };

    } catch (err) {
      swseLogger.error(`ActorEngine.spendForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * spendDestinyPoints() — Reduce actor's destiny points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to spend
   */
  async spendDestinyPoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('spendDestinyPoints() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid destiny point amount: ${amount}`);
      }

      const currentDP = actor.system.destinyPoints?.value || 0;
      const newDP = Math.max(0, currentDP - amount);
      const actualSpent = currentDP - newDP;

      if (actualSpent === 0) {
        swseLogger.debug(`${actor.name} has no destiny points to spend`);
        return { spent: 0, remaining: newDP };
      }

      await this.updateActor(actor, {
        'system.destinyPoints.value': newDP
      });

      swseLogger.log(`Destiny points spent: ${actor.name} used ${actualSpent}DP (now: ${newDP})`, {
        amount: actualSpent
      });

      return { spent: actualSpent, remaining: newDP };

    } catch (err) {
      swseLogger.error(`ActorEngine.spendDestinyPoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * resetSecondWind() — Reset second wind used flag
   *
   * @param {Actor} actor - target actor
   */
  async resetSecondWind(actor) {
    try {
      if (!actor) {throw new Error('resetSecondWind() called with no actor');}

      await this.updateActor(actor, {
        'system.secondWind.used': false
      });

      swseLogger.log(`Second wind reset for ${actor.name}`);
      return { reset: true };

    } catch (err) {
      swseLogger.error(`ActorEngine.resetSecondWind failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      throw err;
    }
  },

  /**
   * applyProgression() — ATOMIC PROGRESSION TRANSACTION
   *
   * Single transaction for all progression mutations:
   * 1. Compute new level internally
   * 2. Build full mutation plan (memory)
   * 3. Apply root state update (1 mutation)
   * 4. Apply embedded batch changes (2 mutations max: delete, create)
   * 5. Emit hooks (read-only observers)
   * 6. Explicit single recomputation
   *
   * @param {Actor} actor - target actor
   * @param {Object} progressionPacket - Atomic progression packet containing:
   *   - xpDelta: number (XP to add)
   *   - featsAdded: string[] (feat IDs to add)
   *   - featsRemoved: string[] (feat IDs to remove for respec)
   *   - talentsAdded: string[] (talent IDs to add)
   *   - talentsRemoved: string[] (talent IDs to remove)
   *   - trainedSkills: {skillKey: boolean} (skills to mark trained)
   *   - itemsToCreate: Object[] (raw item data to create)
   *   - stateUpdates: {path: value} (progression state updates)
   * @returns {Promise<{success, newLevel, leveledUp, mutationCount, itemsCreated, itemsDeleted}>}
   */
  async applyProgression(actor, progressionPacket) {
    try {
      if (!actor) {throw new Error('applyProgression() called with no actor');}
      if (!progressionPacket || typeof progressionPacket !== 'object') {
        throw new Error('applyProgression() requires progressionPacket object');
      }

      // ====================================================================
      // PHASE 1: COMPUTE NEW LEVEL (INTERNALLY)
      // ====================================================================
      const currentXP = actor.system.xp?.total || 0;
      const newXPTotal = currentXP + (progressionPacket.xpDelta || 0);
      const oldLevel = determineLevelFromXP(currentXP);
      const newLevel = determineLevelFromXP(newXPTotal);
      const leveledUp = newLevel > oldLevel;

      swseLogger.log(`[PROGRESSION] Applying progression to ${actor.name}:`, {
        xpDelta: progressionPacket.xpDelta,
        leveledUp: leveledUp ? `${oldLevel} → ${newLevel}` : 'no level change',
        featsAdded: progressionPacket.featsAdded?.length || 0,
        talentsAdded: progressionPacket.talentsAdded?.length || 0,
        itemsToCreate: progressionPacket.itemsToCreate?.length || 0
      });

      // ====================================================================
      // PHASE 2: BUILD FULL MUTATION PLAN (MEMORY)
      // ====================================================================
      const rootUpdates = {
        'system.xp.total': newXPTotal,
        ...(progressionPacket.stateUpdates || {})
      };

      const itemsToDelete = actor.items
        .filter(item =>
          progressionPacket.featsRemoved?.includes(item.id) ||
          progressionPacket.talentsRemoved?.includes(item.id)
        )
        .map(i => i.id);

      const itemsToCreate = progressionPacket.itemsToCreate || [];

      // ====================================================================
      // PHASE 3: SET STRICT MUTATION CONTEXT
      // ====================================================================
      // blockNestedMutations prevents hooks from triggering additional mutations
      MutationInterceptor.setContext({
        operation: 'applyProgression',
        source: 'ActorEngine.applyProgression',
        suppressRecalc: true,           // Blocks prepareDerivedData()
        blockNestedMutations: true      // Blocks additional ActorEngine calls
      });

      try {
        // ====================================================================
        // PHASE 4A: APPLY ROOT UPDATE (Mutation #1)
        // ====================================================================
        if (Object.keys(rootUpdates).length > 0) {
          swseLogger.debug(`[PROGRESSION] Applying ${Object.keys(rootUpdates).length} root updates`);
          await actor.update(rootUpdates, { diff: false });
        }

        // ====================================================================
        // PHASE 4B: DELETE ITEMS (Mutation #2, only if needed)
        // ====================================================================
        if (itemsToDelete.length > 0) {
          swseLogger.debug(`[PROGRESSION] Deleting ${itemsToDelete.length} items`);
          await actor.deleteEmbeddedDocuments('Item', itemsToDelete);
        }

        // ====================================================================
        // PHASE 4C: CREATE ITEMS (Mutation #3, only if needed)
        // ====================================================================
        const createdItems = [];
        if (itemsToCreate.length > 0) {
          swseLogger.debug(`[PROGRESSION] Creating ${itemsToCreate.length} items`);
          const created = await actor.createEmbeddedDocuments('Item', itemsToCreate);
          createdItems.push(...created.map(i => i.id));
        }

        // ====================================================================
        // PHASE 5: EMIT PROGRESSION HOOKS (NO MUTATIONS)
        // ====================================================================
        // Hooks called AFTER mutations, BEFORE recalc
        // blockNestedMutations prevents listeners from triggering new mutations
        if (leveledUp) {
          Hooks.call('swseProgressionLevelUp', {
            actor,
            fromLevel: oldLevel,
            toLevel: newLevel,
            xpGained: progressionPacket.xpDelta
          });
        }

        Hooks.call('swseProgressionApplied', {
          actor,
          packet: progressionPacket,
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          newLevel
        });

        // ====================================================================
        // PHASE 6: EXPLICIT DETERMINISTIC RECOMPUTATION (ONCE)
        // ====================================================================
        // CRITICAL: No sheet rendering, no lifecycle hooks
        // Direct state computation
        swseLogger.debug(`[PROGRESSION] Triggering derived recalculation`);

        // Step 1: Compute all derived values
        await DerivedCalculator.computeAll(actor);

        // Step 2: Apply all modifiers
        await ModifierEngine.applyAll(actor);

        swseLogger.log(`[PROGRESSION] ✅ Progression applied to ${actor.name}:`, {
          mutationCount: (itemsToDelete.length > 0 ? 1 : 0) + (itemsToCreate.length > 0 ? 1 : 0) + 1,
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          newXPTotal,
          newLevel
        });

        // ====================================================================
        // RETURN RESULTS
        // ====================================================================
        return {
          success: true,
          newLevel,
          leveledUp,
          fromLevel: oldLevel,
          mutationCount: (itemsToDelete.length > 0 ? 1 : 0) +
                          (itemsToCreate.length > 0 ? 1 : 0) +
                          (Object.keys(rootUpdates).length > 0 ? 1 : 0),
          itemsCreated: createdItems.length,
          itemsDeleted: itemsToDelete.length,
          xpTotal: actor.system.xp?.total,
          createdItemIds: createdItems,
          timestamp: new Date().toISOString()
        };

      } finally {
        // ====================================================================
        // PHASE 7: CLEAR MUTATION CONTEXT
        // ====================================================================
        MutationInterceptor.clearContext();
      }

    } catch (err) {
      swseLogger.error(`ActorEngine.applyProgression failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        packet: progressionPacket
      });
      throw err;
    }
  },

  // ============================================================================
  // PHASE 5: TALENT EFFECT ORCHESTRATION
  // ============================================================================

  /**
   * applyTalentEffect() — COORDINATED TALENT EFFECT MUTATIONS
   *
   * Executes a pre-computed talent effect plan.
   *
   * Contract:
   * - Plan is pre-computed (from TalentEffectEngine)
   * - Each actor mutation is individually governed
   * - Derived recalculation happens per-actor
   * - No cross-actor atomicity (domain-level coordination only)
   * - If any mutation fails, error is thrown (no automatic rollback)
   *
   * @param {Object} plan - Effect plan from TalentEffectEngine.build*Plan()
   * @param {Object} [options={}] - Optional execution options
   * @returns {Promise<{success, effect, damageAmount, roll, results}>}
   */
  async applyTalentEffect(plan, options = {}) {
    try {
      if (!plan) {
        throw new Error('applyTalentEffect() called with no plan');
      }

      if (!plan.success) {
        // Plan computation failed; return failure as-is
        return {
          success: false,
          reason: plan.reason,
          effect: plan.effect
        };
      }

      if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
        throw new Error('applyTalentEffect() plan has no mutations');
      }

      swseLogger.log(`[TALENT EFFECT] Applying ${plan.effect} with ${plan.mutations.length} mutations`, {
        damageAmount: plan.damageAmount,
        roll: plan.roll?.result
      });

      const results = [];
      const appliedMutations = [];

      // ====================================================================
      // PHASE 1: Apply each mutation through ActorEngine
      // ====================================================================
      for (let i = 0; i < plan.mutations.length; i++) {
        const mutation = plan.mutations[i];

        try {
          // Set context for this mutation
          // Each mutation is individually governed (not wrapped together)
          MutationInterceptor.setContext({
            operation: 'applyTalentEffect',
            effect: plan.effect,
            mutationIndex: i,
            totalMutations: plan.mutations.length
          });

          // Execute mutation based on type
          if (mutation.type === 'update') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: update ${mutation.actor.name}`, {
              data: mutation.data
            });

            await this.updateActor(mutation.actor, mutation.data);

            results.push({
              actor: mutation.actor.id,
              type: 'update',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'setFlag') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: setFlag ${mutation.actor.name}`, {
              scope: mutation.scope,
              key: mutation.key,
              value: mutation.value
            });

            await mutation.actor.setFlag(mutation.scope, mutation.key, mutation.value);

            results.push({
              actor: mutation.actor.id,
              type: 'setFlag',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'unsetFlag') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: unsetFlag ${mutation.actor.name}`, {
              scope: mutation.scope,
              key: mutation.key
            });

            await mutation.actor.unsetFlag(mutation.scope, mutation.key);

            results.push({
              actor: mutation.actor.id,
              type: 'unsetFlag',
              success: true
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'createEmbedded') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: createEmbedded ${mutation.actor.name}`, {
              embeddedName: mutation.embeddedName,
              count: mutation.data.length
            });

            await this.createEmbeddedDocuments(
              mutation.actor,
              mutation.embeddedName,
              mutation.data
            );

            results.push({
              actor: mutation.actor.id,
              type: 'createEmbedded',
              success: true,
              count: mutation.data.length
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'deleteEmbedded') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: deleteEmbedded ${mutation.actor.name}`, {
              embeddedName: mutation.embeddedName,
              count: mutation.ids.length
            });

            await this.deleteEmbeddedDocuments(
              mutation.actor,
              mutation.embeddedName,
              mutation.ids
            );

            results.push({
              actor: mutation.actor.id,
              type: 'deleteEmbedded',
              success: true,
              count: mutation.ids.length
            });

            appliedMutations.push(mutation);

          } else if (mutation.type === 'updateOwnedItems') {
            swseLogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: updateOwnedItems ${mutation.actor.name}`, {
              itemCount: mutation.items.length
            });

            await this.updateOwnedItems(mutation.actor, mutation.items);

            results.push({
              actor: mutation.actor.id,
              type: 'updateOwnedItems',
              success: true,
              count: mutation.items.length
            });

            appliedMutations.push(mutation);

          } else {
            throw new Error(`Unknown mutation type: ${mutation.type}`);
          }

        } catch (mutationErr) {
          swseLogger.error(`[TALENT EFFECT] Mutation ${i + 1} failed: ${mutation.type} on ${mutation.actor.name}`, {
            error: mutationErr,
            appliedSoFar: appliedMutations.length,
            totalMutations: plan.mutations.length
          });

          // Report which mutations succeeded, which failed
          results.push({
            actor: mutation.actor.id,
            type: mutation.type,
            success: false,
            error: mutationErr.message
          });

          // Throw to prevent partial execution
          throw new Error(
            `Talent effect ${plan.effect} failed at mutation ${i + 1}: ${mutationErr.message}`
          );

        } finally {
          // Always clear context
          MutationInterceptor.clearContext();
        }
      }

      // ====================================================================
      // PHASE 2: All mutations succeeded
      // ====================================================================
      swseLogger.log(`[TALENT EFFECT] ✅ ${plan.effect} applied successfully`, {
        mutationCount: plan.mutations.length,
        damageAmount: plan.damageAmount,
        resultSummary: results.map(r => `${r.type}:${r.success ? 'OK' : 'FAIL'}`)
      });

      return {
        success: true,
        effect: plan.effect,
        damageAmount: plan.damageAmount,
        roll: plan.roll,
        results: results,
        mutationCount: plan.mutations.length,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      swseLogger.error(`ActorEngine.applyTalentEffect failed`, {
        error: err,
        effect: plan?.effect,
        plan: plan
      });

      // Return error result (do not throw; let caller decide)
      return {
        success: false,
        effect: plan?.effect,
        reason: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

};
