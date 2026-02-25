// scripts/actor-engine.js
import { SWSELogger } from '../../core/logger.js';
import { applyActorUpdateAtomic } from '../../utils/actor-utils.js';
import { MutationInterceptor } from '../mutation/MutationInterceptor.js';
import { determineLevelFromXP } from '../../engines/shared/xp-system.js';
import { DerivedCalculator } from '../../actors/derived/derived-calculator.js';
import { ModifierEngine } from '../../engines/effects/modifiers/ModifierEngine.js';
import { MutationApplicationError } from '../mutation/mutation-errors.js';

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
    if (!actor) throw new Error('recalcAll() called with no actor');

    try {
      await DerivedCalculator.computeAll(actor);
      await ModifierEngine.applyAll(actor);
    } catch (err) {
      SWSELogger.error('ActorEngine.recalcAll failed:', err);
    }
  },

  // PHASE 11: Track active migrations to prevent recursion
  _activeMigrations: new Set(),

  /**
   * Track migration context
   * @private
   */
  _markMigrationActive(actorId) {
    this._activeMigrations.add(actorId);
  },

  /**
   * Clear migration context
   * @private
   */
  _clearMigrationActive(actorId) {
    this._activeMigrations.delete(actorId);
  },

  /**
   * Check if actor is currently migrating
   * @private
   */
  _isMigrationActive(actorId) {
    return this._activeMigrations.has(actorId);
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
      SWSELogger.error(`ActorEngine.applyTemplate failed on ${actor?.name ?? 'unknown actor'}`, err);
    }
  },

  /**
   * updateActor()
   * PHASE 3: Single mutation authority for all actor field updates.
   * PHASE 10: Enhanced with transaction metadata for recursive guard support.
   *
   * Enforced contract:
   * 1. Set mutation context (authorizes actor.update() call)
   * 2. Apply atomic update to actor
   * 3. Trigger single recalculation
   * 4. Clear mutation context
   *
   * Transaction metadata support:
   * - options.meta.guardKey: String to prevent re-entrant hook mutations
   * - Example: { guardKey: 'language-sync' } prevents same hook from re-firing
   *
   * This is the ONLY legal path to actor mutations.
   */
  async updateActor(actor, updateData, options = {}) {
    try {
      if (!actor) {throw new Error('updateActor() called with no actor');}

      if (!updateData || typeof updateData !== 'object') {
        throw new Error(`Invalid updateData passed to updateActor for ${actor.name}`);
      }

      SWSELogger.debug(`ActorEngine.updateActor → ${actor.name}`, {
        updateData,
        meta: options.meta,
        guardKey: options.meta?.guardKey
      });

      // ========================================
      // PHASE 10: Extract and propagate metadata
      // ========================================
      const meta = options.meta || {};
      if (meta.guardKey) {
        SWSELogger.debug(`[GUARD] updateActor with guardKey: ${meta.guardKey}`);
      }

      // ========================================
      // PHASE 11: Migration context guard
      // ========================================
      const isMigration = meta.origin === 'migration';
      const isMigrationActive = this._isMigrationActive(actor.id);

      if (isMigration && !isMigrationActive) {
        // Mark migration as active
        this._markMigrationActive(actor.id);
        SWSELogger.debug(`[MIGRATION] Starting migration for ${actor.name}`);
      }

      if (isMigration && isMigrationActive) {
        // Prevent recursive mutations during migration
        SWSELogger.warn(`[MIGRATION] Suppressing recursive mutation during migration for ${actor.name}`);
        return { prevented: true, actor };
      }

      // ========================================
      // PHASE 3: Authorize mutation via context
      // ========================================
      MutationInterceptor.setContext('ActorEngine.updateActor');
      try {
        // Perform safe atomic update (now authorized)
        // Pass metadata through options to Foundry hooks
        const optsWithMeta = {
          ...options,
          meta: meta
        };
        const result = await applyActorUpdateAtomic(actor, updateData, optsWithMeta);
        await this.recalcAll(actor);
        return result;
      } finally {
        // Always clear context, even on error
        MutationInterceptor.clearContext();

        // PHASE 11: Clear migration context if this was a migration
        if (isMigration && !isMigrationActive) {
          this._clearMigrationActive(actor.id);
          SWSELogger.debug(`[MIGRATION] Completed migration for ${actor.name}`);
        }
      }

    } catch (err) {
      SWSELogger.error(`ActorEngine.updateActor failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        updateData,
        meta: options.meta?.guardKey
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

      SWSELogger.debug(`ActorEngine.updateEmbeddedDocuments → ${actor.name}`, {
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
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.updateEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, {
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

      SWSELogger.debug(`ActorEngine.createEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: data.length
      });

      MutationInterceptor.setContext(`ActorEngine.createEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.createEmbeddedDocuments(embeddedName, data, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.createEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
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

      SWSELogger.debug(`ActorEngine.deleteEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        count: ids.length
      });

      MutationInterceptor.setContext(`ActorEngine.deleteEmbeddedDocuments[${embeddedName}]`);
      try {
        const result = await actor.deleteEmbeddedDocuments(embeddedName, ids, options);
        await this.recalcAll(actor);
        return result;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.deleteEmbeddedDocuments failed for ${actor?.name ?? 'unknown actor'}`, err);
      throw err;
    }
  },

  /**
   * Move embedded documents between actors atomically.
   * PHASE 9: Atomic cross-actor item transfer.
   *
   * This is NOT delete + create in sequence.
   * It is a single transaction-level operation.
   *
   * Ensures:
   * - Source item is deleted
   * - Target receives item
   * - One mutation context
   * - One recalculation pass per actor
   * - No partial failure state
   *
   * @param {Actor} sourceActor - Actor to remove item from
   * @param {Actor} targetActor - Actor to add item to
   * @param {string} embeddedName - Collection name (e.g. "Item")
   * @param {string|string[]} ids - Item ID(s) to move
   * @param {object} [options={}] - Forwarded options
   * @returns {Promise<Array>} Created items on target actor
   */
  async moveEmbeddedDocuments(sourceActor, targetActor, embeddedName, ids, options = {}) {
    try {
      if (!sourceActor) {throw new Error('moveEmbeddedDocuments() called without sourceActor');}
      if (!targetActor) {throw new Error('moveEmbeddedDocuments() called without targetActor');}
      if (!embeddedName) {throw new Error('moveEmbeddedDocuments() called without embeddedName');}
      if (!Array.isArray(ids)) {throw new Error('moveEmbeddedDocuments() requires ids array');}

      SWSELogger.debug(`ActorEngine.moveEmbeddedDocuments → ${sourceActor.name} → ${targetActor.name}`, {
        embeddedName,
        count: ids.length
      });

      // Get the items to move before deletion
      const collection = sourceActor.getEmbeddedCollection(embeddedName);
      const itemsToMove = ids.map(id => {
        const doc = collection.get(id);
        if (!doc) throw new Error(`Document ${id} not found in ${embeddedName} collection`);
        return doc.toObject();
      }).filter(obj => obj); // Remove nulls

      if (itemsToMove.length === 0) {
        SWSELogger.warn(`No items to move from ${sourceActor.name}`);
        return [];
      }

      // Clear _id so they can be recreated on target
      itemsToMove.forEach(item => { delete item._id; });

      // Single mutation context for the entire operation
      MutationInterceptor.setContext(`ActorEngine.moveEmbeddedDocuments[${embeddedName}]`);
      try {
        // Delete from source
        await sourceActor.deleteEmbeddedDocuments(embeddedName, ids, options);

        // Create on target
        const created = await targetActor.createEmbeddedDocuments(embeddedName, itemsToMove, options);

        // Recalculate both actors
        await this.recalcAll(sourceActor);
        await this.recalcAll(targetActor);

        return created;
      } finally {
        MutationInterceptor.clearContext();
      }
    } catch (err) {
      SWSELogger.error(`ActorEngine.moveEmbeddedDocuments failed`, {
        error: err,
        sourceActor: sourceActor?.name,
        targetActor: targetActor?.name,
        embeddedName,
        ids
      });
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

      SWSELogger.debug(`ActorEngine.applyDelta → ${actor.name}`, { delta });

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

      SWSELogger.log(`ActorEngine.applyDelta completed for ${actor.name}`);

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyDelta failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        delta
      });
      throw err;
    }
  },

  /**
   * apply(actor, mutationPlan)
   *
   * PHASE 3: Universal mutation acceptor for all domain engines.
   *
   * This is the ONLY method domain engines (DropResolutionEngine, AdoptionEngine, etc.) use
   * to mutate actors. No embedded document creation bypasses this.
   *
   * Contract:
   * - mutationPlan is pure data (no functions, no side effects)
   * - Execution order is strictly controlled and atomic
   * - All operations succeed or all fail (no partial mutations)
   * - Derived recalculation triggered after mutations
   *
   * Execution Order:
   * 0. Adoption (if replaceSystem/replaceEmbedded):
   *    - Delete all existing embedded docs
   *    - Create replacement embedded docs
   *    - Replace system entirely
   * 1. Standard operations (create/update/delete):
   *    - Create embedded documents
   *    - Update embedded documents
   *    - Delete embedded documents
   * 2. System updates (dot-path only)
   * 3. Derived recalculation
   *
   * @param {Actor} actor - target actor
   * @param {Object} mutationPlan - {
   *   replaceSystem?: Object,                   (adoption only)
   *   replaceEmbedded?: Array<{ type, data }>, (adoption only)
   *   _adoptionSource?: string,                (metadata only, for logging)
   *   createEmbedded?: Array<{ type, data }>,
   *   updateEmbedded?: Array<{ _id, update }>,
   *   deleteEmbedded?: Array<{ type, _id }>,
   *   update?: { ... }  (system updates via dot-path)
   * }
   */
  async apply(actor, mutationPlan) {
    try {
      if (!actor) {throw new Error('apply() called with no actor');}
      if (!mutationPlan) {return;} // noop

      const isAdoption = mutationPlan.replaceSystem !== undefined;

      SWSELogger.debug(`ActorEngine.apply → ${actor.name}`, {
        isAdoption,
        mutationPlan: isAdoption ? { adoption: true } : mutationPlan
      });

      // ========================================
      // PHASE 0: ADOPTION (Identity Mutation)
      // ========================================

      if (isAdoption) {
        SWSELogger.info(`[Adoption] ${actor.name} (ID: ${actor.id}) adopting from ${mutationPlan._adoptionSource}`);

        // ---- ADOPTION PHASE 1: Delete all existing embedded documents ----
        if (actor.items?.length > 0) {
          const itemIds = actor.items.map(i => i.id);
          await this.deleteEmbeddedDocuments(actor, 'Item', itemIds);
        }

        if (actor.effects?.length > 0) {
          const effectIds = actor.effects.map(e => e.id);
          await this.deleteEmbeddedDocuments(actor, 'ActiveEffect', effectIds);
        }

        // ---- ADOPTION PHASE 2: Create replacement embedded documents ----
        if (mutationPlan.createEmbedded?.length > 0) {
          // Separate items and effects by embedded type
          const itemsToCreate = [];
          const effectsToCreate = [];

          for (const embedded of mutationPlan.createEmbedded) {
            if (!embedded.type || !embedded.data) {
              throw new Error('Invalid createEmbedded in adoption: missing type or data');
            }

            if (embedded.type === 'Item') {
              itemsToCreate.push(embedded.data);
            } else if (embedded.type === 'ActiveEffect') {
              effectsToCreate.push(embedded.data);
            }
          }

          if (itemsToCreate.length > 0) {
            await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
          }

          if (effectsToCreate.length > 0) {
            await this.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToCreate);
          }
        }

        // ---- ADOPTION PHASE 3: Replace system ----
        if (mutationPlan.replaceSystem && Object.keys(mutationPlan.replaceSystem).length > 0) {
          await this.updateActor(actor, { system: mutationPlan.replaceSystem });
        }
      }

      // ========================================
      // PHASE 1-4: Standard Mutations
      // ========================================

      // ---- PHASE 1: Create Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.createEmbedded?.length > 0) {
        const itemsToCreate = mutationPlan.createEmbedded.map(item => {
          if (!item.type || !item.data) {
            throw new Error('Invalid createEmbedded item: missing type or data');
          }
          return item.data;
        });
        await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
      }

      // ---- PHASE 2: Update Embedded Documents ----
      if (mutationPlan.updateEmbedded?.length > 0) {
        for (const update of mutationPlan.updateEmbedded) {
          if (!update._id || !update.update) {
            throw new Error('Invalid updateEmbedded: missing _id or update');
          }
        }
        await this.updateEmbeddedDocuments(actor, 'Item', mutationPlan.updateEmbedded);
      }

      // ---- PHASE 3: Delete Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.deleteEmbedded?.length > 0) {
        const idsToDelete = mutationPlan.deleteEmbedded.map(item => {
          if (!item._id) {
            throw new Error('Invalid deleteEmbedded: missing _id');
          }
          return item._id;
        });
        await this.deleteEmbeddedDocuments(actor, 'Item', idsToDelete);
      }

      // ---- PHASE 4: Update Actor System (non-adoption) ----
      if (!isAdoption && mutationPlan.update && Object.keys(mutationPlan.update).length > 0) {
        // Guard against derived writes
        for (const path of Object.keys(mutationPlan.update)) {
          if (path.startsWith('system.derived')) {
            throw new Error(
              `ARCHITECTURE VIOLATION: mutationPlan attempted to write to ${path}. ` +
              'Derived fields are computed, not mutated.'
            );
          }
        }
        await this.updateActor(actor, mutationPlan.update);
      }

      if (isAdoption) {
        SWSELogger.log(`[Adoption] Complete: ${actor.name} (ID: ${actor.id})`);
      } else {
        SWSELogger.log(`ActorEngine.apply completed for ${actor.name}`);
      }

    } catch (err) {
      SWSELogger.error(`ActorEngine.apply failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        isAdoption: mutationPlan?.replaceSystem !== undefined,
        mutationPlan: mutationPlan?.replaceSystem ? { adoption: true } : mutationPlan
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

      SWSELogger.debug(`ActorEngine.applyDamage → ${actor.name}`, {
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
        const currentCondition = actor.system.conditionTrack?.current || 0;
        updates['system.conditionTrack.current'] = Math.max(0, currentCondition + 1);
      }

      // Apply all updates in one mutation
      await this.updateActor(actor, updates);

      SWSELogger.log(`Damage applied to ${actor.name}: ${finalDamage}HP (final: ${newHP}/${maxHP})`, {
        source: damagePacket.source,
        conditionShifted: shouldShiftCondition
      });

      return {
        applied: finalDamage,
        newHP,
        conditionShifted: shouldShiftCondition
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyDamage failed for ${actor?.name ?? 'unknown actor'}`, {
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

      SWSELogger.debug(`ActorEngine.applyHealing → ${actor.name}`, {
        amount,
        source
      });

      const currentHP = actor.system.attributes?.hp?.value || 0;
      const maxHP = actor.system.attributes?.hp?.max || 100;
      const newHP = Math.min(maxHP, currentHP + amount);
      const actualHealing = newHP - currentHP;

      if (actualHealing === 0) {
        SWSELogger.debug(`${actor.name} healing had no effect (already at max HP)`);
        return { applied: 0, newHP };
      }

      await this.updateActor(actor, {
        'system.attributes.hp.value': newHP
      });

      SWSELogger.log(`Healing applied to ${actor.name}: +${actualHealing}HP (now: ${newHP}/${maxHP})`, {
        source
      });

      return {
        applied: actualHealing,
        newHP
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyHealing failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount,
        source
      });
      throw err;
    }
  },

  /**
   * setConditionStep() — Set condition track to exact step
   *
   * Sets actor's condition track to specific step (0-5).
   * Used by UI components for direct condition selection.
   *
   * @param {Actor} actor - target actor
   * @param {number} step - condition step (0-5, clamped)
   * @param {string} source - reason for change
   */
  async setConditionStep(actor, step, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionStep() requires actor');}
      if (typeof step !== 'number' || !Number.isFinite(step)) {
        throw new Error(`Invalid condition step: ${step}`);
      }

      const clampedStep = Math.min(5, Math.max(0, step));
      const current = actor.system.conditionTrack?.current || 0;

      if (clampedStep === current) {
        SWSELogger.debug(`${actor.name} condition already at step ${clampedStep}`);
        return { applied: 0, newStep: clampedStep };
      }

      await this.updateActor(actor, {
        'system.conditionTrack.current': clampedStep
      });

      SWSELogger.log(`Condition step updated for ${actor.name}`, {
        from: current,
        to: clampedStep,
        source
      });

      return { applied: 1, newStep: clampedStep };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionStep failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        step,
        source
      });
      throw err;
    }
  },

  /**
   * setConditionPersistent() — Toggle persistent condition flag
   *
   * Marks condition as persistent (cannot be recovered naturally).
   *
   * @param {Actor} actor - target actor
   * @param {boolean} persistent - true for persistent, false to clear
   * @param {string} source - reason for change
   */
  async setConditionPersistent(actor, persistent, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionPersistent() requires actor');}

      const current = actor.system.conditionTrack?.persistent ?? false;

      if (persistent === current) {
        SWSELogger.debug(`${actor.name} persistent condition already ${persistent ? 'set' : 'clear'}`);
        return { applied: 0, persistent };
      }

      await this.updateActor(actor, {
        'system.conditionTrack.persistent': persistent
      });

      SWSELogger.log(`Condition persistent flag updated for ${actor.name}`, {
        persistent,
        source
      });

      return { applied: 1, persistent };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionPersistent failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        persistent,
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

      SWSELogger.debug(`ActorEngine.applyConditionShift → ${actor.name}`, {
        direction,
        source
      });

      const currentCondition = actor.system.conditionTrack?.current || 0;
      const newCondition = Math.max(0, currentCondition + direction);

      if (newCondition === currentCondition) {
        SWSELogger.debug(`${actor.name} condition shift had no effect (at boundary)`);
        return { applied: 0, newCondition };
      }

      await this.updateActor(actor, {
        'system.conditionTrack.current': newCondition
      });

      const directionLabel = direction > 0 ? 'worsened' : 'improved';
      SWSELogger.log(`Condition ${directionLabel} for ${actor.name} (now: ${newCondition})`, {
        source
      });

      return {
        applied: direction,
        newCondition
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyConditionShift failed for ${actor?.name ?? 'unknown actor'}`, {
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

      SWSELogger.debug(`ActorEngine.updateActionEconomy → ${actor.name}`, {
        swift: actionEconomy.swift,
        move: actionEconomy.move,
        standard: actionEconomy.standard,
        fullRound: actionEconomy.fullRound,
        reaction: actionEconomy.reaction
      });

      await this.updateActor(actor, {
        'system.actionEconomy': actionEconomy
      });

      SWSELogger.log(`Action economy updated for ${actor.name}`, {
        actionEconomy
      });

      return { updated: true, actionEconomy };

    } catch (err) {
      SWSELogger.error(`ActorEngine.updateActionEconomy failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        actionEconomy
      });
      throw err;
    }
  },

  /**
   * gainForcePoints() — Restore actor's force points
   *
   * @param {Actor} actor - target actor
   * @param {number} amount - number of points to gain
   */
  async gainForcePoints(actor, amount = 1) {
    try {
      if (!actor) {throw new Error('gainForcePoints() requires actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid force point amount: ${amount}`);
      }

      const currentFP = actor.system.forcePoints?.value || 0;
      const maxFP = actor.system.forcePoints?.max || 10;
      const newFP = Math.min(maxFP, currentFP + amount);
      const actualGain = newFP - currentFP;

      if (actualGain === 0) {
        SWSELogger.debug(`${actor.name} force points already at max`);
        return { gained: 0, current: newFP, max: maxFP };
      }

      await this.updateActor(actor, {
        'system.forcePoints.value': newFP
      });

      SWSELogger.log(`Force points gained: ${actor.name} gained ${actualGain}FP (now: ${newFP}/${maxFP})`, {
        amount: actualGain
      });

      return { gained: actualGain, current: newFP, max: maxFP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.gainForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
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
        SWSELogger.debug(`${actor.name} has no force points to spend`);
        return { spent: 0, remaining: newFP };
      }

      await this.updateActor(actor, {
        'system.forcePoints.value': newFP
      });

      SWSELogger.log(`Force points spent: ${actor.name} used ${actualSpent}FP (now: ${newFP})`, {
        amount: actualSpent
      });

      return { spent: actualSpent, remaining: newFP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.spendForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
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
        SWSELogger.debug(`${actor.name} has no destiny points to spend`);
        return { spent: 0, remaining: newDP };
      }

      await this.updateActor(actor, {
        'system.destinyPoints.value': newDP
      });

      SWSELogger.log(`Destiny points spent: ${actor.name} used ${actualSpent}DP (now: ${newDP})`, {
        amount: actualSpent
      });

      return { spent: actualSpent, remaining: newDP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.spendDestinyPoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  },

  /**
   * applySecondWind() — Use second wind and restore HP
   *
   * Heals actor based on level, reduces second wind uses.
   * Combat-critical atomic operation.
   *
   * @param {Actor} actor - target actor
   * @param {Object} [options={}] - optional healing parameters
   * @returns {Promise<{success, healed, newHP}>}
   */
  async applySecondWind(actor, options = {}) {
    try {
      if (!actor) {throw new Error('applySecondWind() requires actor');}

      // ========================================
      // PHASE A FIX 4: Heroic-only enforcement
      // ========================================
      const isHeroic = actor.type === 'character' ||
                       (actor.type === 'npc' && actor.system.class);

      if (!isHeroic) {
        SWSELogger.warn(`Second Wind attempt on non-heroic actor: ${actor.name}`);
        return {
          success: false,
          reason: `${actor.name} is not a heroic character and cannot use Second Wind`
        };
      }

      // ========================================
      // PHASE B FIX 5: Swift action validation (MOVED FROM UI)
      // ========================================
      if (options.validateCombat !== false) {
        const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
        if (inCombat) {
          const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
          if (!combatant?.resources?.swift) {
            return {
              success: false,
              reason: 'Cannot use Second Wind: no swift action available'
            };
          }
        }
      }

      const uses = actor.system.secondWind?.uses ?? 0;
      if (uses < 1) {
        return { success: false, reason: 'No Second Wind uses remaining' };
      }

      const level = actor.system.level ?? 1;
      let heal = 5 + Math.floor(level / 4) * 5;

      // HOUSERULE: Web Enhancement variant formula
      const webEnhancement = game.settings.get('foundryvtt-swse', 'secondWindWebEnhancement');
      if (webEnhancement) {
        const chaMod = (actor.system.abilities?.cha?.mod ?? 0);
        const d4Roll = Math.floor(Math.random() * 4) + 1; // 1d4
        heal = 5 + chaMod + d4Roll;

        SWSELogger.debug(`Web Enhancement Second Wind: 5 + CHA(${chaMod}) + 1d4(${d4Roll}) = ${heal} HP`);
      }

      // Get authoritative HP source
      const currentHP = (actor.system?.derived?.hp?.value || actor.system?.hp?.value || 0);
      const maxHP = (actor.system?.derived?.hp?.max || actor.system?.hp?.max || 0);
      const newHP = Math.min(currentHP + heal, maxHP);
      const actualHealing = newHP - currentHP;

      // ========================================
      // PHASE B FIX 6: Improved Second Wind houserule
      // ========================================
      const improvements = {
        'system.hp.value': newHP,
        'system.secondWind.uses': Math.max(0, uses - 1)
      };

      const improvedSecondWind = game.settings.get('foundryvtt-swse', 'secondWindImproved');
      if (improvedSecondWind) {
        // Also move up condition track (+1 improvement = -1 on numeric scale)
        const currentCT = actor.system.conditionTrack?.current ?? 0;
        improvements['system.conditionTrack.current'] = Math.max(0, currentCT - 1);

        SWSELogger.debug(`Improved Second Wind enabled: moving condition track from ${currentCT} to ${Math.max(0, currentCT - 1)}`);
      }

      // Batch update: HP restoration + use consumption + optional condition improvement
      await this.updateActor(actor, improvements);

      const resultLog = {
        healed: actualHealing,
        newHP,
        maxHP,
        usesRemaining: Math.max(0, uses - 1)
      };

      if (improvedSecondWind) {
        resultLog.conditionImproved = true;
        resultLog.newCondition = Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1);
      }

      SWSELogger.log(`Second wind used by ${actor.name}`, resultLog);

      return {
        success: true,
        healed: actualHealing,
        newHP,
        usesRemaining: Math.max(0, uses - 1),
        conditionImproved: improvedSecondWind ? true : false,
        newCondition: improvedSecondWind ? Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1) : undefined
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applySecondWind failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err
      });
      throw err;
    }
  },

  /**
   * resetSecondWind() — Reset second wind uses to maximum
   *
   * Called at combat start (or rest) to restore uses.
   * RAW: Once per day, but houserule allows per encounter.
   *
   * @param {Actor} actor - target actor
   * @returns {Promise<{reset, restoredUses, max}>}
   */
  async resetSecondWind(actor) {
    try {
      if (!actor) {throw new Error('resetSecondWind() called with no actor');}

      // PHASE A FIX 3: Write correct field (system.secondWind.uses, not .used phantom)
      const maxUses = actor.system.secondWind?.max ?? 1;

      await this.updateActor(actor, {
        'system.secondWind.uses': maxUses
      });

      SWSELogger.log(`Second wind reset for ${actor.name}`, {
        restoredUses: maxUses,
        max: maxUses
      });

      return {
        reset: true,
        restoredUses: maxUses,
        max: maxUses
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.resetSecondWind failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      throw err;
    }
  },

  /**
   * applySecondWindEdgeOfExhaustion() — Trade condition for extra use
   *
   * PHASE C: Edge of Exhaustion variant rule
   *
   * When out of Second Wind uses, actor may voluntarily accept -1 persistent
   * condition step (worsen condition track) to gain 1 additional use.
   *
   * Requirements:
   * - Uses at 0 (no uses remaining)
   * - Condition track not already at helpless (step 5)
   * - In active combat
   *
   * @param {Actor} actor - target actor
   * @returns {Promise<{success, reason, condition, newCondition}>}
   */
  async applySecondWindEdgeOfExhaustion(actor) {
    try {
      if (!actor) {throw new Error('applySecondWindEdgeOfExhaustion() requires actor');}

      // Check: Must have 0 uses (no regular uses remaining)
      const uses = actor.system.secondWind?.uses ?? 0;
      if (uses > 0) {
        return {
          success: false,
          reason: 'Second Wind uses still available (not at edge of exhaustion)'
        };
      }

      // Check: Heroic only (same as regular Second Wind)
      const isHeroic = actor.type === 'character' ||
                       (actor.type === 'npc' && actor.system.class);

      if (!isHeroic) {
        return {
          success: false,
          reason: `${actor.name} is not heroic and cannot use Edge of Exhaustion`
        };
      }

      // Check: Must be in active combat (combat restriction)
      const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
      if (!inCombat) {
        return {
          success: false,
          reason: 'Edge of Exhaustion can only be used in active combat'
        };
      }

      // Check: Condition track not at helpless (step 5 is the max)
      const ct = actor.system.conditionTrack ?? {};
      const currentCT = Number(ct.current ?? 0);

      if (currentCT >= 5) {
        return {
          success: false,
          reason: 'Cannot accept condition penalty when already at helpless'
        };
      }

      // Trade: Worsen condition by 1, gain 1 Second Wind use
      const newCT = Math.min(5, currentCT + 1);

      await this.updateActor(actor, {
        'system.secondWind.uses': 1,
        'system.conditionTrack.current': newCT
      });

      SWSELogger.log(`${actor.name} accepts Edge of Exhaustion`, {
        trade: 'condition for Second Wind',
        conditionBefore: currentCT,
        conditionAfter: newCT,
        secondWindRestored: 1
      });

      return {
        success: true,
        reason: 'Edge of Exhaustion accepted',
        condition: currentCT,
        newCondition: newCT
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applySecondWindEdgeOfExhaustion failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err
      });
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

      SWSELogger.log(`[PROGRESSION] Applying progression to ${actor.name}:`, {
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
          SWSELogger.debug(`[PROGRESSION] Applying ${Object.keys(rootUpdates).length} root updates`);
          await this.updateActor(actor, rootUpdates, { source: 'ActorEngine.applyProgression' });
        }

        // ====================================================================
        // PHASE 4B: DELETE ITEMS (Mutation #2, only if needed)
        // ====================================================================
        if (itemsToDelete.length > 0) {
          SWSELogger.debug(`[PROGRESSION] Deleting ${itemsToDelete.length} items`);
          await this.deleteEmbeddedDocuments(actor, 'Item', itemsToDelete, { source: 'ActorEngine.applyProgression' });
        }

        // ====================================================================
        // PHASE 4C: CREATE ITEMS (Mutation #3, only if needed)
        // ====================================================================
        const createdItems = [];
        if (itemsToCreate.length > 0) {
          SWSELogger.debug(`[PROGRESSION] Creating ${itemsToCreate.length} items`);
          const created = await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate, { source: 'ActorEngine.applyProgression' });
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
        SWSELogger.debug(`[PROGRESSION] Triggering derived recalculation`);

        // Step 1: Compute all derived values
        await DerivedCalculator.computeAll(actor);

        // Step 2: Apply all modifiers
        await ModifierEngine.applyAll(actor);

        SWSELogger.log(`[PROGRESSION] ✅ Progression applied to ${actor.name}:`, {
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
      SWSELogger.error(`ActorEngine.applyProgression failed for ${actor?.name ?? 'unknown actor'}`, {
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

      SWSELogger.log(`[TALENT EFFECT] Applying ${plan.effect} with ${plan.mutations.length} mutations`, {
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
          // Execute mutation based on type
          if (mutation.type === 'update') {
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: update ${mutation.actor.name}`, {
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
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: setFlag ${mutation.actor.name}`, {
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
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: unsetFlag ${mutation.actor.name}`, {
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
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: createEmbedded ${mutation.actor.name}`, {
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
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: deleteEmbedded ${mutation.actor.name}`, {
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
            SWSELogger.debug(`[TALENT EFFECT] Mutation ${i + 1}: updateOwnedItems ${mutation.actor.name}`, {
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
          SWSELogger.error(`[TALENT EFFECT] Mutation ${i + 1} failed: ${mutation.type} on ${mutation.actor.name}`, {
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
        }
      }

      // ====================================================================
      // PHASE 2: All mutations succeeded
      // ====================================================================
      SWSELogger.log(`[TALENT EFFECT] ✅ ${plan.effect} applied successfully`, {
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
      SWSELogger.error(`ActorEngine.applyTalentEffect failed`, {
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
  },

  /**
   * restoreFromSnapshot() — Atomic snapshot restoration
   *
   * Restores complete actor state from snapshot:
   * 1. Update root actor data (system, name, img, prototypeToken)
   * 2. Delete all current items, then create snapshot items
   * 3. Delete all current effects, then create snapshot effects
   * 4. All in single mutation transaction
   *
   * @param {Actor} actor - target actor
   * @param {Object} snapshot - snapshot object with { system, name, img, prototypeToken, items, effects }
   * @param {Object} [options={}] - mutation options
   */
  async restoreFromSnapshot(actor, snapshot, options = {}) {
    try {
      if (!actor) {throw new Error('restoreFromSnapshot() requires actor');}
      if (!snapshot) {throw new Error('restoreFromSnapshot() requires snapshot');}

      SWSELogger.log(`[SNAPSHOT] Restoring ${actor.name} from snapshot`, {
        systemFieldCount: Object.keys(snapshot.system || {}).length,
        itemCount: (snapshot.items || []).length,
        effectCount: (snapshot.effects || []).length
      });

      // ====================================================================
      // PHASE 1: ROOT UPDATE (system, name, img, prototypeToken)
      // ====================================================================
      const system = foundry.utils.deepClone(snapshot.system ?? {});
      const name = snapshot.name ?? actor.name;
      const img = snapshot.img ?? actor.img;
      const prototypeToken = foundry.utils.deepClone(snapshot.prototypeToken ?? {});

      await this.updateActor(actor, {
        name,
        img,
        system,
        prototypeToken
      }, options);

      // ====================================================================
      // PHASE 2: ITEM RESTORATION (delete all, recreate from snapshot)
      // ====================================================================
      const currentItemIds = actor.items?.map?.(i => i.id) ?? [];
      if (currentItemIds.length > 0) {
        await this.deleteEmbeddedDocuments(actor, 'Item', currentItemIds, options);
      }

      const itemsToCreate = (snapshot.items ?? []).map(i => {
        const copy = foundry.utils.deepClone(i);
        delete copy._id;
        return copy;
      });
      if (itemsToCreate.length > 0) {
        await this.createEmbeddedDocuments(actor, 'Item', itemsToCreate, options);
      }

      // ====================================================================
      // PHASE 3: EFFECT RESTORATION (delete all, recreate from snapshot)
      // ====================================================================
      const currentEffectIds = actor.effects?.map?.(e => e.id) ?? [];
      if (currentEffectIds.length > 0) {
        await this.deleteEmbeddedDocuments(actor, 'ActiveEffect', currentEffectIds, options);
      }

      const effectsToCreate = (snapshot.effects ?? []).map(e => {
        const copy = foundry.utils.deepClone(e);
        delete copy._id;
        return copy;
      });
      if (effectsToCreate.length > 0) {
        await this.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToCreate, options);
      }

      SWSELogger.log(`[SNAPSHOT] ✅ Restoration complete for ${actor.name}`, {
        itemsDeleted: currentItemIds.length,
        itemsCreated: itemsToCreate.length,
        effectsDeleted: currentEffectIds.length,
        effectsCreated: effectsToCreate.length
      });

      return {
        success: true,
        actor,
        itemsDeleted: currentItemIds.length,
        itemsCreated: itemsToCreate.length,
        effectsDeleted: currentEffectIds.length,
        effectsCreated: effectsToCreate.length,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.restoreFromSnapshot failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        snapshotItemCount: (snapshot?.items || []).length
      });
      throw err;
    }
  },

  // ========================================================================
  // PHASE 8: EMBEDDED DOCUMENT PLAN BUILDERS
  // ========================================================================
  // Non-mutating plan builders for embedded document operations
  // Plans are executed atomically through ActorEngine

  /**
   * Build a plan to create embedded documents (Item, ActiveEffect, etc.)
   * PHASE 8: Non-mutating builder — returns plan object for later execution
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} documents - Array of document data to create
   * @returns {Object} Plan object with { success, embeddedName, actor, documents, mutations }
   */
  buildEmbeddedCreatePlan(actor, embeddedName, documents) {
    try {
      if (!actor) {
        return {
          success: false,
          reason: 'buildEmbeddedCreatePlan called with no actor'
        };
      }

      if (!embeddedName) {
        return {
          success: false,
          reason: 'buildEmbeddedCreatePlan called without embeddedName'
        };
      }

      if (!Array.isArray(documents)) {
        return {
          success: false,
          reason: 'buildEmbeddedCreatePlan requires documents array'
        };
      }

      if (documents.length === 0) {
        return {
          success: true,
          embeddedName,
          actor,
          documents: [],
          mutations: []
        };
      }

      // Build mutation for this operation
      const mutation = {
        type: 'createEmbedded',
        embeddedName,
        documents: documents.map(d => foundry.utils.deepClone(d))
      };

      return {
        success: true,
        embeddedName,
        actor,
        documents,
        mutations: [mutation],
        description: `Create ${documents.length} ${embeddedName}(s)`
      };
    } catch (err) {
      SWSELogger.error('buildEmbeddedCreatePlan failed:', err);
      return {
        success: false,
        reason: err.message
      };
    }
  },

  /**
   * Build a plan to delete embedded documents
   * PHASE 8: Non-mutating builder — returns plan object for later execution
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} ids - Array of document IDs to delete
   * @returns {Object} Plan object with { success, embeddedName, actor, ids, mutations }
   */
  buildEmbeddedDeletePlan(actor, embeddedName, ids) {
    try {
      if (!actor) {
        return {
          success: false,
          reason: 'buildEmbeddedDeletePlan called with no actor'
        };
      }

      if (!embeddedName) {
        return {
          success: false,
          reason: 'buildEmbeddedDeletePlan called without embeddedName'
        };
      }

      if (!Array.isArray(ids)) {
        return {
          success: false,
          reason: 'buildEmbeddedDeletePlan requires ids array'
        };
      }

      if (ids.length === 0) {
        return {
          success: true,
          embeddedName,
          actor,
          ids: [],
          mutations: []
        };
      }

      // Build mutation for this operation
      const mutation = {
        type: 'deleteEmbedded',
        embeddedName,
        ids: [...ids]
      };

      return {
        success: true,
        embeddedName,
        actor,
        ids,
        mutations: [mutation],
        description: `Delete ${ids.length} ${embeddedName}(s)`
      };
    } catch (err) {
      SWSELogger.error('buildEmbeddedDeletePlan failed:', err);
      return {
        success: false,
        reason: err.message
      };
    }
  },

  /**
   * Build a plan to replace embedded documents (delete old, create new)
   * PHASE 8: Non-mutating builder — atomic replacement
   *
   * @param {Actor} actor - Target actor
   * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
   * @param {Array} idsToDelete - IDs to delete
   * @param {Array} docsToCreate - Documents to create
   * @returns {Object} Plan object with both delete and create mutations
   */
  buildEmbeddedReplacePlan(actor, embeddedName, idsToDelete, docsToCreate) {
    try {
      if (!actor) {
        return {
          success: false,
          reason: 'buildEmbeddedReplacePlan called with no actor'
        };
      }

      if (!embeddedName) {
        return {
          success: false,
          reason: 'buildEmbeddedReplacePlan called without embeddedName'
        };
      }

      const mutations = [];

      // Add delete mutation if IDs exist
      if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
        mutations.push({
          type: 'deleteEmbedded',
          embeddedName,
          ids: [...idsToDelete]
        });
      }

      // Add create mutation if documents exist
      if (Array.isArray(docsToCreate) && docsToCreate.length > 0) {
        mutations.push({
          type: 'createEmbedded',
          embeddedName,
          documents: docsToCreate.map(d => foundry.utils.deepClone(d))
        });
      }

      if (mutations.length === 0) {
        return {
          success: true,
          embeddedName,
          actor,
          idsToDelete: [],
          docsToCreate: [],
          mutations: []
        };
      }

      return {
        success: true,
        embeddedName,
        actor,
        idsToDelete,
        docsToCreate,
        mutations,
        description: `Replace ${idsToDelete?.length || 0} with ${docsToCreate?.length || 0} ${embeddedName}(s)`
      };
    } catch (err) {
      SWSELogger.error('buildEmbeddedReplacePlan failed:', err);
      return {
        success: false,
        reason: err.message
      };
    }
  },

  /**
   * Build a plan to clone an actor and apply modifications
   * PHASE 8: Non-mutating builder — clone + modifications in one transaction
   *
   * Prevents the dangerous pattern of: const clone = actor.clone(); await clone.update(...)
   * Instead builds a plan for atomic creation+modification
   *
   * @param {Actor} actor - Actor to clone
   * @param {Object} modifications - Changes to apply to the clone
   * @param {Object} options - Clone options
   * @returns {Object} Plan object
   */
  buildCloneActorPlan(actor, modifications = {}, options = {}) {
    try {
      if (!actor) {
        return {
          success: false,
          reason: 'buildCloneActorPlan called with no actor'
        };
      }

      // Clone actor data
      const cloneData = actor.toObject();
      delete cloneData._id;

      // Apply modifications to clone
      const modifiedCloneData = foundry.utils.mergeObject(cloneData, modifications);

      const mutation = {
        type: 'cloneActor',
        originalActorId: actor.id,
        cloneData: modifiedCloneData,
        modifications
      };

      return {
        success: true,
        actor,
        modifications,
        cloneData: modifiedCloneData,
        mutations: [mutation],
        description: `Clone ${actor.name} with modifications`
      };
    } catch (err) {
      SWSELogger.error('buildCloneActorPlan failed:', err);
      return {
        success: false,
        reason: err.message
      };
    }
  },

  /**
   * Execute an embedded operation plan
   * PHASE 8: Atomic execution of pre-built plans
   *
   * @param {Object} plan - Plan object from builder methods
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeEmbeddedPlan(plan, options = {}) {
    try {
      if (!plan) {
        throw new Error('executeEmbeddedPlan called with no plan');
      }

      if (!plan.success) {
        return {
          success: false,
          reason: plan.reason
        };
      }

      if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
        return {
          success: true,
          actor: plan.actor,
          mutations: []
        };
      }

      const results = [];
      const { actor } = plan;

      // Execute mutations in order (delete before create)
      for (const mutation of plan.mutations) {
        try {
          if (mutation.type === 'deleteEmbedded') {
            const result = await this.deleteEmbeddedDocuments(
              actor,
              mutation.embeddedName,
              mutation.ids,
              options
            );
            results.push({
              type: 'deleteEmbedded',
              success: true,
              deleted: mutation.ids.length
            });
          } else if (mutation.type === 'createEmbedded') {
            const result = await this.createEmbeddedDocuments(
              actor,
              mutation.embeddedName,
              mutation.documents,
              options
            );
            results.push({
              type: 'createEmbedded',
              success: true,
              created: (result || []).length
            });
          }
        } catch (mutationErr) {
          SWSELogger.error(`executeEmbeddedPlan mutation failed (${mutation.type}):`, mutationErr);
          throw mutationErr;
        }
      }

      return {
        success: true,
        actor,
        mutations: results
      };
    } catch (err) {
      SWSELogger.error('executeEmbeddedPlan failed:', err);
      throw err;
    }
  },




  /* ============================================================
     BUILD DERIVED STATE (AUTHORITATIVE)
  ============================================================ */

  buildDerivedState(actor) {

    const abilityKeys = ["str","dex","con","int","wis","cha"];

    const abilities = abilityKeys.map(key => {
      const total = actor.system?.abilities?.[key]?.total ?? 10;
      return {
        key,
        label: key.toUpperCase(),
        total,
        mod: Math.floor((total - 10) / 2)
      };
    });

    const currentStep = actor.system?.conditionTrack?.current ?? 0;

    const conditionSteps = Array.from({ length: 5 }).map((_, i) => ({
      index: i,
      active: i <= currentStep
    }));

    return {
      abilities,
      conditionSteps
    };
  },

  /* ============================================================
     APPLY MUTATION PLAN (Deterministic Progression)
  ============================================================ */

  /**
   * Apply a MutationPlan to the actor.
   *
   * Contract:
   * - Input is a validated MutationPlan: { set?, add?, delete? }
   * - Operations apply in strict order: DELETE → SET → ADD
   * - All operations complete or none do (atomic)
   * - Derived data recalculates once after all mutations
   * - Errors throw MutationApplicationError
   *
   * @param {Actor} actor - Target actor
   * @param {Object} mutationPlan - { set?, add?, delete? }
   * @param {Object} options
   * @param {boolean} options.validate - Validate plan before applying (default: true)
   * @param {boolean} options.rederive - Recalculate derived data after (default: true)
   * @param {string} options.source - Source for logging (e.g., 'CharacterGeneratorApp.partial')
   * @returns {Promise<void>}
   * @throws {MutationApplicationError} If any operation fails
   */
  async applyMutationPlan(actor, mutationPlan = {}, options = {}) {
    const {
      validate = true,
      rederive = true,
      source = 'ActorEngine.applyMutationPlan'
    } = options;

    try {
      if (!actor) {
        throw new Error('applyMutationPlan() called with no actor');
      }

      // Import error classes dynamically to avoid circular deps
      const { MutationApplicationError } = await import('../../governance/mutation/mutation-errors.js');

      SWSELogger.debug('ActorEngine.applyMutationPlan', {
        actor: actor.id,
        source,
        hasCreates: !!mutationPlan.create && !!mutationPlan.create.actors && mutationPlan.create.actors.length > 0,
        hasSets: !!mutationPlan.set && Object.keys(mutationPlan.set).length > 0,
        hasAdds: !!mutationPlan.add && Object.keys(mutationPlan.add).length > 0,
        hasDeletes: !!mutationPlan.delete && Object.keys(mutationPlan.delete).length > 0
      });

      // Normalize buckets
      const plan = {
        create: mutationPlan.create || {},
        set: mutationPlan.set || {},
        add: mutationPlan.add || {},
        delete: mutationPlan.delete || {}
      };

      // Phase 1: Validate plan structure (if enabled)
      if (validate) {
        this._validateMutationPlan(plan);
      }

      // Phase 2: Apply operations in strict order
      // CREATE first (create world actors, build tempId→realId map)
      const tempIdMap = {};
      if (plan.create && plan.create.actors && plan.create.actors.length > 0) {
        await this._applyCreateOps(plan.create.actors, tempIdMap, source);
      }

      // Rewrite temporary IDs in add bucket with real IDs
      if (Object.keys(tempIdMap).length > 0 && plan.add && Object.keys(plan.add).length > 0) {
        this._rewriteTemporaryIds(plan.add, tempIdMap);
      }

      // DELETE next (remove stale references)
      await this._applyDeleteOps(actor, plan.delete, source);

      // SET next (modify scalars)
      await this._applySetOps(actor, plan.set, source);

      // ADD last (create new embedded docs)
      await this._applyAddOps(actor, plan.add, source);

      // Phase 3: Recalculate derived data once
      if (rederive) {
        await this.recalcAll(actor);
      }

      SWSELogger.info('ActorEngine.applyMutationPlan: Success', {
        actor: actor.id,
        source
      });

    } catch (error) {
      SWSELogger.error('ActorEngine.applyMutationPlan failed:', {
        actor: actor?.id,
        source,
        error: error.message
      });
      throw error;
    }
  },

  /**
   * Validate mutation plan structure
   * @private
   */
  _validateMutationPlan(plan) {
    // Validate create bucket (PHASE 2)
    if (plan.create && typeof plan.create !== 'object') {
      throw new MutationApplicationError('create bucket must be an object', { operation: 'create' });
    }
    if (plan.create && plan.create.actors) {
      if (!Array.isArray(plan.create.actors)) {
        throw new MutationApplicationError(
          'create.actors must be an array',
          { operation: 'create' }
        );
      }
      for (const spec of plan.create.actors) {
        if (!spec.temporaryId || typeof spec.temporaryId !== 'string') {
          throw new MutationApplicationError(
            'create actor spec must have temporaryId (string)',
            { operation: 'create' }
          );
        }
        if (!spec.data || typeof spec.data !== 'object') {
          throw new MutationApplicationError(
            'create actor spec must have data (object)',
            { operation: 'create', temporaryId: spec.temporaryId }
          );
        }
      }
    }

    // Validate set bucket
    if (plan.set && typeof plan.set !== 'object') {
      throw new MutationApplicationError('set bucket must be an object', { operation: 'set' });
    }

    // Validate add bucket
    if (plan.add && typeof plan.add !== 'object') {
      throw new MutationApplicationError('add bucket must be an object', { operation: 'add' });
    }
    if (plan.add) {
      for (const [collection, ids] of Object.entries(plan.add)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `add bucket "${collection}" must be an array`,
            { operation: 'add', collection }
          );
        }
      }
    }

    // Validate delete bucket
    if (plan.delete && typeof plan.delete !== 'object') {
      throw new MutationApplicationError('delete bucket must be an object', { operation: 'delete' });
    }
    if (plan.delete) {
      for (const [collection, ids] of Object.entries(plan.delete)) {
        if (!Array.isArray(ids)) {
          throw new MutationApplicationError(
            `delete bucket "${collection}" must be an array`,
            { operation: 'delete', collection }
          );
        }
      }
    }
  },

  /**
   * PHASE 2: Apply CREATE operations
   * Creates world actors from specs and builds tempId→realId map.
   * @private
   */
  async _applyCreateOps(actorSpecs, tempIdMap, source) {
    if (!Array.isArray(actorSpecs) || actorSpecs.length === 0) {
      return;
    }

    try {
      for (const spec of actorSpecs) {
        if (!spec || !spec.temporaryId || !spec.data) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyCreateOps', {
          temporaryId: spec.temporaryId,
          type: spec.type || 'unknown'
        });

        // Create actor from spec data
        try {
          const created = await Actor.create(spec.data);
          if (created) {
            // Map temporary ID to real ID
            tempIdMap[spec.temporaryId] = created.id;
            SWSELogger.info('ActorEngine: Created actor', {
              temporaryId: spec.temporaryId,
              realId: created.id,
              type: spec.type
            });
          }
        } catch (createErr) {
          const { MutationApplicationError } = await import('../../governance/mutation/mutation-errors.js');
          throw new MutationApplicationError(
            `Failed to create actor ${spec.temporaryId}: ${createErr.message}`,
            { temporaryId: spec.temporaryId, type: spec.type }
          );
        }
      }
    } catch (error) {
      const { MutationApplicationError } = await import('../../governance/mutation/mutation-errors.js');
      throw new MutationApplicationError(
        `Failed to apply CREATE operations: ${error.message}`,
        { specCount: actorSpecs.length }
      );
    }
  },

  /**
   * PHASE 2: Rewrite temporary IDs to real IDs in add bucket
   * After CREATE phase creates actors, map temp IDs to real IDs.
   * @private
   */
  _rewriteTemporaryIds(addBucket, tempIdMap) {
    if (!addBucket || typeof addBucket !== 'object') {
      return;
    }

    try {
      for (const [collection, ids] of Object.entries(addBucket)) {
        if (!Array.isArray(ids)) {
          continue;
        }

        // Rewrite each ID if it's a temporary ID
        addBucket[collection] = ids.map(id => {
          if (typeof id === 'string' && tempIdMap[id]) {
            const realId = tempIdMap[id];
            SWSELogger.debug('ActorEngine: Rewrote temp ID', {
              temporaryId: id,
              realId
            });
            return realId;
          }
          return id;
        });
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to rewrite temporary IDs: ${error.message}`,
        {}
      );
    }
  },

  /**
   * Apply DELETE operations
   * @private
   */
  async _applyDeleteOps(actor, deleteOps, source) {
    if (!deleteOps || Object.keys(deleteOps).length === 0) {
      return;
    }

    try {
      for (const [collection, ids] of Object.entries(deleteOps)) {
        if (!Array.isArray(ids) || ids.length === 0) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyDeleteOps', {
          actor: actor.id,
          collection,
          count: ids.length
        });

        // TODO: In full implementation, resolve IDs to embedded documents
        // For now, assume IDs are valid
        await this.deleteEmbeddedDocuments(actor, collection, ids, { source });
      }
    } catch (error) {
      const { MutationApplicationError } = await import('../../governance/mutation/mutation-errors.js');
      throw new MutationApplicationError(
        `Failed to delete from ${Object.keys(deleteOps)[0]}: ${error.message}`,
        {
          operation: 'delete',
          collection: Object.keys(deleteOps)[0],
          underlyingError: error
        }
      );
    }
  },

  /**
   * Apply SET operations
   * @private
   */
  async _applySetOps(actor, setOps, source) {
    if (!setOps || Object.keys(setOps).length === 0) {
      return;
    }

    try {
      SWSELogger.debug('ActorEngine._applySetOps', {
        actor: actor.id,
        paths: Object.keys(setOps)
      });

      // Batch all set operations into a single actor.update() call
      await this.updateActor(actor, setOps, { source });

    } catch (error) {
      const { MutationApplicationError } = await import('../../governance/mutation/mutation-errors.js');
      throw new MutationApplicationError(
        `Failed to apply set operations: ${error.message}`,
        {
          operation: 'set',
          paths: Object.keys(setOps),
          underlyingError: error
        }
      );
    }
  },

  /**
   * Apply ADD operations
   * @private
   */
  async _applyAddOps(actor, addOps, source) {
    if (!addOps || Object.keys(addOps).length === 0) {
      return;
    }

    try {
      for (const [collection, documents] of Object.entries(addOps)) {
        if (!Array.isArray(documents) || documents.length === 0) {
          continue;
        }

        SWSELogger.debug('ActorEngine._applyAddOps', {
          actor: actor.id,
          collection,
          count: documents.length
        });

        try {
          const embeddedName =
            collection.charAt(0).toUpperCase() + collection.slice(1, -1);

          await this.createEmbeddedDocuments(actor, embeddedName, documents, { source });
        } catch (err) {
          throw new MutationApplicationError(
            `Failed to add documents to ${collection}: ${err.message}`,
            { operation: 'add', collection }
          );
        }
      }
    } catch (error) {
      throw new MutationApplicationError(
        `Failed to add items: ${error.message}`,
        {
          operation: 'add',
          collections: Object.keys(addOps),
          underlyingError: error
        }
      );
    }
  }
};
