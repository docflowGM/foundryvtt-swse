/**
 * Stock Droid Importer Engine
 * Handles import of stock droid statblocks from packs/droids.db
 *
 * Phase 1 strategy:
 * - Treat stock droids as published statblocks (not builder-native)
 * - Import published totals as play/runtime-facing values
 * - Flag the actor as stock-statblock-backed
 * - Do NOT attempt to reconstruct droidSystems
 * - Produce fully usable droid actors (not reference-only husks)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidNormalizer } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-normalizer.js";
import { DroidTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/droid-template-data-loader.js";

export class StockDroidImporterEngine {
  /**
   * Import a stock droid template from packs/droids.db as a playable statblock actor
   * @param {string} droidId - Droid ID in the droids pack
   * @param {Object|null} customData - Optional custom data (name, portrait, notes, biography)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importDroidTemplate(droidId, customData = null) {
    try {
      SWSELogger.log(`[StockDroidImporterEngine] Importing stock droid: ${droidId}`);

      // Get the raw droid actor document from the droids pack
      const rawRecord = await DroidTemplateDataLoader.getDroidActorDocument(droidId);
      if (!rawRecord) {
        SWSELogger.error(`[StockDroidImporterEngine] Droid actor not found: ${droidId}`);
        return null;
      }

      // Normalize the legacy record into a stable shim format
      const normalized = StockDroidNormalizer.normalizeStockDroidRecord(rawRecord);

      // Create the live actor document (not a raw clone)
      const newActorData = this._buildActorFromStatblock(normalized, customData);

      // Create the actor in the world
      const actor = await Actor.create(newActorData);

      SWSELogger.log(`[StockDroidImporterEngine] Stock droid imported successfully: ${actor.name} (${actor.id})`);

      return actor;
    } catch (err) {
      SWSELogger.error(`[StockDroidImporterEngine] Error importing stock droid:`, err);
      return null;
    }
  }

  /**
   * Build a live actor document from normalized stock droid statblock
   * This creates a playable actor with published totals as runtime authority,
   * while flagging it as stock-statblock-backed (not builder-native)
   *
   * @private
   * @param {Object} normalized - Normalized shim from StockDroidNormalizer
   * @param {Object|null} customData - Custom overrides (name, portrait, etc.)
   * @returns {Object} Actor document data for Actor.create()
   */
  static _buildActorFromStatblock(normalized, customData = null) {
    const source = normalized.source;
    const identity = normalized.identity;
    const totals = normalized.publishedTotals;
    const timestamp = Date.now();

    // Construct the base actor document with live schema fields
    const actorData = {
      type: 'droid',
      name: customData?.name || source.name,
      img: customData?.portrait || source.img,

      system: {
        // Core droid identity (from normalized identity, not builder state)
        // NOTE: We do NOT populate droidSystems because we cannot reconstruct it reliably
        droidDegree: identity.degree,
        size: identity.size || 'Medium',

        // Live actor fields: HP can be populated from statblock
        // (This is play authority, not builder authority)
        hp: {
          value: Math.min(totals.hp.max, totals.hp.max),  // Start at full
          max: totals.hp.max,
          temp: 0,
          bonus: 0
        },

        // Speed from published totals
        speed: totals.speed || 6,

        // Defenses as reference (computed by DerivedCalculator at play time)
        // These published totals will be visible in the sheet as statblock reference
        // but actual defense calculations will be derived from abilities + armor
        defenses: {
          fortitude: {
            base: 10,
            misc: 0,
            total: totals.defenses.fortitude,
            ability: 0,
            class: 0,
            armorMastery: 0,
            modifier: 0
          },
          reflex: {
            base: 10,
            misc: 0,
            total: totals.defenses.reflex,
            ability: 0,
            class: 0,
            armorMastery: 0,
            modifier: 0
          },
          will: {
            base: 10,
            misc: 0,
            total: totals.defenses.will,
            ability: 0,
            class: 0,
            armorMastery: 0,
            modifier: 0
          },
          flatFooted: {
            total: totals.defenses.flatFooted
          }
        },

        // Abilities: Use conservative defaults
        // Published totals are stored in flags for reference, but we cannot reliably
        // decompose them into base/racial/enhancement (bonuses are baked in).
        // DerivedCalculator will recompute from structure.
        attributes: {
          str: {
            base: 10,
            racial: 0,
            enhancement: 0,
            temp: 0
          },
          dex: {
            base: 10,
            racial: 0,
            enhancement: 0,
            temp: 0
          },
          con: {
            // Droids always CON 0
            base: 0,
            racial: 0,
            enhancement: 0,
            temp: 0
          },
          int: {
            base: 10,
            racial: 0,
            enhancement: 0,
            temp: 0
          },
          wis: {
            base: 10,
            racial: 0,
            enhancement: 0,
            temp: 0
          },
          cha: {
            base: 10,
            racial: 0,
            enhancement: 0,
            temp: 0
          }
        },

        // Optional: Biography from customData
        biography: this._buildBiography(customData),

        // droidSystems: intentionally left empty/absent (cannot reconstruct)
        // The sheet will show these as empty, and builder prompts will appear
        // if user tries to edit
      },

      prototypeToken: {
        img: customData?.portrait || source.img
      },

      // Flags: Provenance and normalized data for future use
      flags: {
        swse: {
          stockDroidImport: {
            sourceId: source.compendiumId,
            sourceName: source.name,
            importMode: 'statblock',
            confidence: normalized.confidence,
            importedAt: timestamp,
            warnings: normalized.warnings,
            // Store compact version of published totals for reference
            publishedTotals: {
              hp: totals.hp,
              abilities: totals.abilities,
              defenses: totals.defenses,
              speed: totals.speed,
              attacks: totals.attacks
            }
          }
        }
      }
    };

    return actorData;
  }

  /**
   * Build biography text from customData
   * @private
   */
  static _buildBiography(customData) {
    if (!customData) return '';

    const parts = [];
    if (customData.notes) parts.push(customData.notes);
    if (customData.biography) parts.push(customData.biography);

    return parts.filter(t => t && t.trim()).join('\n\n');
  }
}

export default StockDroidImporterEngine;
