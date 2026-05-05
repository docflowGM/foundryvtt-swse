/**
 * Character Generation Finalizer
 *
 * Single boundary where character snapshot is converted to actual Actor with Items.
 * This is the ONLY place where:
 * - Documents are created
 * - ActiveEffects are applied
 * - Validation is expected
 *
 * All other chargen logic operates on immutable snapshots and patches.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { EffectSanitizer } from "/systems/foundryvtt-swse/scripts/core/effect-sanitizer.js";
import { createActor, createItemInActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { emitChargenComplete } from "/systems/foundryvtt-swse/scripts/core/hooks-emitter.js";
import { withTraceContext, generateTraceId, TraceMetrics } from "/systems/foundryvtt-swse/scripts/core/correlation-id.js";
import { validateActorSchema, validateImportData } from "/systems/foundryvtt-swse/scripts/core/schema-validator.js";
import { ForceProvenanceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-provenance-engine.js";

export class ChargenFinalizer {

  /**
   * Finalize character from snapshot
   * Converts pending character data into an actual Actor with all items and effects
   *
   * @param {Object} snapshot - Character data snapshot from chargen
   * @param {Actor} actor - Actor to update (or null to create new)
   * @returns {Promise<Actor>} - The finalized actor
   * @throws {Error} if validation fails
   */
  static async finalize(snapshot, actor = null) {
    // Generate trace ID for this chargen operation
    const traceId = generateTraceId('chargen');
    TraceMetrics.recordStart(traceId, 'chargen');

    return withTraceContext(traceId, async () => {
      try {
        SWSELogger.log('[CHARGEN FINALIZER] Starting character finalization');
        TraceMetrics.recordStep(traceId, 'validate-snapshot');

        if (!snapshot) {
          throw new Error('Character snapshot is required for finalization');
        }

        // Validate snapshot structure
        validateImportData(snapshot);

        // Step 1: Create or update actor with basic data
        TraceMetrics.recordStep(traceId, 'build-actor-data');
        const actorData = this._buildActorData(snapshot);
        let finalActor = actor;

        if (!actor) {
          SWSELogger.log('[CHARGEN FINALIZER] Creating new character actor');
          TraceMetrics.recordStep(traceId, 'create-actor');
          finalActor = await createActor(actorData, { temporary: false });
        } else {
          SWSELogger.log('[CHARGEN FINALIZER] Updating existing actor through ActorEngine');
          TraceMetrics.recordStep(traceId, 'update-actor');
          // SOVEREIGNTY: Route actor update through ActorEngine
          await ActorEngine.updateActor(finalActor, actorData);
        }

        if (!finalActor) {
          throw new Error('Failed to create or update actor');
        }

        // Validate actor schema
        validateActorSchema(finalActor, finalActor.type);

        // Step 2: Create items with sanitized effects
        TraceMetrics.recordStep(traceId, 'create-items');
        const itemsToCreate = this._buildItemsData(snapshot);
        if (itemsToCreate.length > 0) {
          SWSELogger.log(`[CHARGEN FINALIZER] Creating ${itemsToCreate.length} items`);

          // Sanitize effects on all items before creation
          const sanitizedItems = itemsToCreate.map(item => {
            const sanitized = foundry.utils.deepClone(item);
            if (sanitized.effects) {
              sanitized.effects = EffectSanitizer.sanitizeEffects(sanitized.effects);
            }
            return sanitized;
          });

          // PHASE 8: Use ActorEngine for atomic item creation
          await ActorEngine.createEmbeddedDocuments(finalActor, 'Item', sanitizedItems);
        }

        // Step 3: Validate final actor
        TraceMetrics.recordStep(traceId, 'validate-actor');
        try {
          await finalActor.validate();
          SWSELogger.log('[CHARGEN FINALIZER] Actor validation passed');
        } catch (validationError) {
          SWSELogger.error('[CHARGEN FINALIZER] Validation failed:', validationError);
          throw new Error(`Character validation failed: ${validationError.message}`);
        }

        SWSELogger.log('[CHARGEN FINALIZER] Character finalization complete');

        // Step 4: Fire chargen completion hook
        TraceMetrics.recordStep(traceId, 'emit-hook');
        emitChargenComplete(finalActor, snapshot);

        TraceMetrics.recordComplete(traceId);
        return finalActor;

    } catch (error) {
      SWSELogger.error('[CHARGEN FINALIZER] Finalization failed:', error);
      throw error;
    }
    });
  }

  /**
   * Build actor data from snapshot
   * @private
   */
  static _buildActorData(snapshot) {
    const actorData = {
      type: snapshot.type || 'character',
      name: snapshot.characterName || 'New Character',
      system: {}
    };

    // Copy system data from snapshot
    if (snapshot.systemData) {
      Object.assign(actorData.system, snapshot.systemData);
    }

    // Phase 1: Store structured talent slots
    if (snapshot.talentSlots) {
      if (!actorData.system.progression) {
        actorData.system.progression = {};
      }
      actorData.system.progression.talentSlots = foundry.utils.deepClone(snapshot.talentSlots);
      SWSELogger.log(`[CHARGEN FINALIZER] Stored ${snapshot.talentSlots.length} talent slots in actor`);
    }

    // Phase 2: Store unlocked domains (REPLACES Phase 1 unlockedTrees)
    // Authority is now derived, not persisted as static tree lists
    if (snapshot.unlockedDomains && snapshot.unlockedDomains.length > 0) {
      if (!actorData.system.progression) {
        actorData.system.progression = {};
      }
      actorData.system.progression.unlockedDomains = foundry.utils.deepClone(snapshot.unlockedDomains);
      SWSELogger.log(
        `[CHARGEN FINALIZER] Stored unlocked domains: ${snapshot.unlockedDomains.join(', ')}`
      );
    }

    // Phase 1.5: Store structured feat slots
    if (snapshot.featSlots) {
      if (!actorData.system.progression) {
        actorData.system.progression = {};
      }
      actorData.system.progression.featSlots = foundry.utils.deepClone(snapshot.featSlots);
      SWSELogger.log(`[CHARGEN FINALIZER] Stored ${snapshot.featSlots.length} feat slots in actor`);
    }

    return actorData;
  }

  /**
   * Build items array from snapshot
   * @private
   */
  static _buildItemsData(snapshot) {
    const items = [];

    // Add feats
    if (snapshot.selectedFeats && Array.isArray(snapshot.selectedFeats)) {
      for (const feat of snapshot.selectedFeats) {
        if (feat) {
          items.push(feat);
        }
      }
    }

    // Add talents
    if (snapshot.selectedTalents && Array.isArray(snapshot.selectedTalents)) {
      for (const talent of snapshot.selectedTalents) {
        if (talent) {
          items.push(talent);
        }
      }
    }

    // Add Force powers with provenance metadata
    if (snapshot.selectedForcePowers && Array.isArray(snapshot.selectedForcePowers)) {
      const powerWithProvenance = this._enrichForcePowersWithProvenance(
        snapshot.selectedForcePowers,
        snapshot.selectedFeats
      );

      for (const power of powerWithProvenance) {
        if (power) {
          items.push(power);
        }
      }
    }

    // Add equipment/items
    if (snapshot.equipment && Array.isArray(snapshot.equipment)) {
      for (const item of snapshot.equipment) {
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Enrich force powers with provenance metadata during chargen finalization
   * Determines grant source (Force Sensitivity vs Force Training) and marks appropriately
   *
   * @param {Array} powers - Selected force power items
   * @param {Array} selectedFeats - Selected feat items (to determine grant source)
   * @returns {Array} Powers with provenance metadata added
   * @private
   */
  static _enrichForcePowersWithProvenance(powers, selectedFeats = []) {
    if (!Array.isArray(powers) || powers.length === 0) {
      return powers;
    }

    try {
      const feats = selectedFeats || [];
      const hasForceSensitivity = feats.some(f => f.name?.toLowerCase().includes('force sensitivity'));
      const forceTrainingFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

      // Determine the ability modifier for Force Training powers
      const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
      const configuredAbility = forceAbility === 'charisma' ? 'cha' : 'wis';

      let powerIndex = 0;
      const enriched = [];

      // First power goes to Force Sensitivity (if it exists)
      if (hasForceSensitivity && powerIndex < powers.length) {
        const power = foundry.utils.deepClone(powers[powerIndex]);
        if (!power.system) {
          power.system = {};
        }
        power.system.provenance = ForceProvenanceEngine.createProvenanceMetadata(
          'force-sensitivity',
          'fs-chargen',
          'baseline',
          true // isLocked: FS powers are immutable
        );
        enriched.push(power);
        powerIndex++;
      }

      // Remaining powers go to Force Training (if it exists)
      if (forceTrainingFeats.length > 0 && powerIndex < powers.length) {
        // All remaining powers are attributed to Force Training
        // They represent baseline + modifier-driven powers
        for (let i = powerIndex; i < powers.length; i++) {
          const power = foundry.utils.deepClone(powers[i]);
          if (!power.system) {
            power.system = {};
          }

          // Determine subtype: first power is baseline, rest are modifier-extra
          const isContinuationFromFS = i === powerIndex && !hasForceSensitivity;
          const subtypeIndex = i - (hasForceSensitivity ? 1 : 0);
          const subtype = subtypeIndex === 0 ? 'baseline' : 'modifier-extra';

          power.system.provenance = ForceProvenanceEngine.createProvenanceMetadata(
            'force-training',
            'ft-0-chargen',
            subtype,
            false
          );
          enriched.push(power);
        }
      } else if (powerIndex < powers.length) {
        // No FS or FT feats, but powers were selected (shouldn't happen in normal flow)
        // Mark as unknown-legacy to be conservative
        for (let i = powerIndex; i < powers.length; i++) {
          const power = foundry.utils.deepClone(powers[i]);
          if (!power.system) {
            power.system = {};
          }
          power.system.provenance = ForceProvenanceEngine.createProvenanceMetadata(
            'unknown-legacy',
            'unknown-legacy',
            'unknown-legacy',
            false
          );
          enriched.push(power);
        }
      }

      return enriched;
    } catch (e) {
      SWSELogger.warn('[CHARGEN FINALIZER] Error enriching force powers with provenance', e);
      // Fallback: return powers as-is without provenance
      return powers;
    }
  }
}
