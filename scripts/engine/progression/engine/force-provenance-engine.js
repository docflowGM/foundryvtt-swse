/**
 * force-provenance-engine.js
 * Force Power Provenance Tracking and Reconciliation
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Responsibilities:
 * - Track grant source for each force power item
 * - Reconcile entitled vs owned powers by grant source
 * - Calculate owed powers (gap between entitled and owned)
 * - Support immutability rules for Force Sensitivity powers
 * - Generate grant IDs for new force training acquisitions
 *
 * Data Model:
 * - Per-item: system.provenance = { grantSourceType, grantSourceId, grantSubtype, isLocked }
 * - Per-actor: system.forceGrantLedger = { grants: {grantId: {...}}, legacy: {...} }
 * - Grant Ledger tracks: entitled, owned, breakdown by subtype
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ForceProvenanceEngine {
  /**
   * Generate durable grant source ID for a Force Training acquisition
   * Format: ft-<level>-<context> where context is either 'chargen' or hex timestamp
   *
   * @param {number} level - Class level of acquisition (0 for chargen, 1+ for levelup)
   * @param {string} context - 'chargen' or hex timestamp (Date.now().toString(16).slice(-8))
   * @returns {string} Grant source ID, e.g., 'ft-0-chargen' or 'ft-3-6754a23b'
   */
  static generateForceTairingGrantId(level = 0, context = 'chargen') {
    if (context === 'chargen' || context === 'chargen') {
      return `ft-${level}-chargen`;
    }
    return `ft-${level}-${context}`;
  }

  /**
   * Create provenance metadata for a new force power item
   *
   * @param {string} grantSourceType - 'force-sensitivity' | 'force-training' | 'class-level' | 'template'
   * @param {string} grantSourceId - Grant source identifier
   * @param {string} grantSubtype - 'baseline' | 'modifier-extra'
   * @param {boolean} isLocked - true for immutable (Force Sensitivity), false for mutable
   * @returns {Object} Provenance metadata
   */
  static createProvenanceMetadata(
    grantSourceType,
    grantSourceId,
    grantSubtype = 'baseline',
    isLocked = false
  ) {
    return {
      grantSourceType,
      grantSourceId,
      grantSubtype,
      isLocked,
      migratedAt: null,
      legacyIssues: []
    };
  }

  /**
   * Get configured ability modifier for Force Training
   * Returns the modifier for the configured ability (wisdom or charisma)
   *
   * @param {Actor} actor - The actor
   * @returns {number} Ability modifier (can be negative)
   */
  static getConfiguredAbilityMod(actor) {
    if (!actor?.system?.abilities) {
      return 0;
    }

    const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
    const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
    return actor.system.abilities[abilityKey]?.mod ?? 0;
  }

  /**
   * Reconcile force power grants for an actor
   * Computes entitled vs owned for each grant source
   * Caches result in actor.system.forceGrantLedger
   *
   * @param {Actor} actor - The actor
   * @param {string} context - Context for reconciliation (e.g., 'chargen-complete', 'levelup-finalize', 'manual')
   * @returns {Promise<Object>} Force grant ledger with grants and legacy tracking
   */
  static async reconcileForceGrants(actor, context = 'manual') {
    if (!actor) {
      return this._emptyLedger();
    }

    try {
      const ledger = {
        lastReconciled: new Date().toISOString(),
        lastReconciliationContext: context,
        grants: {},
        legacy: {
          unknownPowers: 0,
          issues: []
        }
      };

      // 1. Find all force grant sources (feats on actor)
      const feats = actor.items.filter(i => i.type === 'feat') || [];
      const fsSensitivity = feats.some(f => f.name?.toLowerCase().includes('force sensitivity'));
      const ftFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

      // 2. Calculate entitled for each source
      if (fsSensitivity) {
        ledger.grants['fs-chargen'] = {
          grantSourceType: 'force-sensitivity',
          acquisitionLevel: 0,
          abilityModifier: 0,
          entitled: 1,
          owned: 0,
          breakdown: [{ subtype: 'baseline', count: 1 }]
        };
      }

      const abilityMod = this.getConfiguredAbilityMod(actor);
      for (const ftFeat of ftFeats) {
        const grantId = ftFeat.system?.grantSourceId || 'ft-unknown-legacy';
        const acquiredAtLevel = ftFeat.system?.acquiredAtLevel ?? null;

        ledger.grants[grantId] = {
          grantSourceType: 'force-training',
          acquisitionLevel: acquiredAtLevel,
          abilityModifier: abilityMod,
          entitled: 1 + Math.max(0, abilityMod),
          owned: 0,
          breakdown: [
            { subtype: 'baseline', count: 1 },
            { subtype: 'modifier-extra', count: Math.max(0, abilityMod) }
          ]
        };
      }

      // 3. Count owned powers and assign to grant sources
      const ownedPowers = actor.items.filter(i => i.type === 'forcepower') || [];
      for (const power of ownedPowers) {
        const sourceId = power.system?.provenance?.grantSourceId;

        if (!sourceId) {
          // Power with no provenance metadata (legacy)
          ledger.legacy.unknownPowers++;
          ledger.legacy.issues.push(
            `Power "${power.name}" has no grantSourceId (legacy power, possibly from before provenance tracking)`
          );
        } else if (ledger.grants[sourceId]) {
          ledger.grants[sourceId].owned++;
        } else {
          // Power claims a grant source that no longer exists on actor
          ledger.legacy.unknownPowers++;
          ledger.legacy.issues.push(
            `Power "${power.name}" references non-existent grant source: ${sourceId}`
          );
        }
      }

      // 4. Calculate "owed" (gap between entitled and owned)
      for (const grantId of Object.keys(ledger.grants)) {
        const grant = ledger.grants[grantId];
        grant.owed = Math.max(0, grant.entitled - grant.owned);
      }

      swseLogger.debug('[FORCE PROVENANCE] Reconciliation complete', {
        actor: actor.name,
        grantCount: Object.keys(ledger.grants).length,
        totalEntitled: Object.values(ledger.grants).reduce((sum, g) => sum + g.entitled, 0),
        totalOwned: Object.values(ledger.grants).reduce((sum, g) => sum + g.owned, 0),
        legacyIssues: ledger.legacy.issues.length
      });

      return ledger;
    } catch (e) {
      swseLogger.error('[FORCE PROVENANCE] Reconciliation error', e);
      return this._emptyLedger();
    }
  }

  /**
   * Store reconciliation result in actor
   * Updates actor.system.forceGrantLedger
   *
   * @param {Actor} actor - The actor
   * @param {Object} ledger - Ledger from reconcileForceGrants()
   * @returns {Promise<void>}
   */
  static async storeReconciliation(actor, ledger) {
    try {
      await actor.update({
        'system.forceGrantLedger': ledger
      });
    } catch (e) {
      swseLogger.warn('[FORCE PROVENANCE] Failed to store ledger', e);
    }
  }

  /**
   * Get cached reconciliation from actor
   * Returns stored forceGrantLedger without recalculating
   *
   * @param {Actor} actor - The actor
   * @returns {Object} Cached ledger or empty ledger if none
   */
  static getCachedLedger(actor) {
    if (!actor?.system?.forceGrantLedger) {
      return this._emptyLedger();
    }
    return actor.system.forceGrantLedger;
  }

  /**
   * Get total entitled force power capacity from ledger
   *
   * @param {Object} ledger - Ledger object
   * @returns {number} Sum of all entitled powers across all grant sources
   */
  static getTotalEntitled(ledger) {
    if (!ledger?.grants) {
      return 0;
    }
    return Object.values(ledger.grants).reduce((sum, grant) => sum + (grant.entitled || 0), 0);
  }

  /**
   * Get total owned force powers from ledger
   *
   * @param {Object} ledger - Ledger object
   * @returns {number} Sum of all owned powers across all grant sources
   */
  static getTotalOwned(ledger) {
    if (!ledger?.grants) {
      return 0;
    }
    return Object.values(ledger.grants).reduce((sum, grant) => sum + (grant.owned || 0), 0);
  }

  /**
   * Get total owed (gap) for an actor
   *
   * @param {Object} ledger - Ledger object
   * @returns {number} Sum of owed across all grant sources (entitled - owned)
   */
  static getTotalOwed(ledger) {
    if (!ledger?.grants) {
      return 0;
    }
    return Object.values(ledger.grants).reduce((sum, grant) => sum + (grant.owed || 0), 0);
  }

  /**
   * Get grant source details (for UI display)
   *
   * @param {Object} ledger - Ledger object
   * @param {string} grantSourceId - Grant ID to look up
   * @returns {Object} Grant source details or null if not found
   */
  static getGrantDetails(ledger, grantSourceId) {
    if (!ledger?.grants || !grantSourceId) {
      return null;
    }
    return ledger.grants[grantSourceId] || null;
  }

  /**
   * Check if actor has any legacy/unknown power provenance issues
   *
   * @param {Object} ledger - Ledger object
   * @returns {boolean} true if legacy issues exist
   */
  static hasLegacyIssues(ledger) {
    return (ledger?.legacy?.unknownPowers > 0) || (ledger?.legacy?.issues?.length > 0);
  }

  /**
   * Get legacy issues for display
   *
   * @param {Object} ledger - Ledger object
   * @returns {Array<string>} Array of issue descriptions
   */
  static getLegacyIssues(ledger) {
    return ledger?.legacy?.issues || [];
  }

  /**
   * Empty ledger template
   * @private
   */
  static _emptyLedger() {
    return {
      lastReconciled: null,
      lastReconciliationContext: '',
      grants: {},
      legacy: {
        unknownPowers: 0,
        issues: []
      }
    };
  }

  /**
   * Format grant source human-readable name
   * Used for UI display
   *
   * @param {string} grantSourceId - Grant source ID
   * @param {Object} grant - Grant details (optional)
   * @returns {string} Human-readable name
   */
  static formatGrantSourceName(grantSourceId, grant) {
    if (!grantSourceId) {
      return 'Unknown';
    }

    if (grantSourceId === 'fs-chargen') {
      return 'Force Sensitivity';
    }

    if (grantSourceId === 'ft-unknown-legacy') {
      return 'Force Training (legacy)';
    }

    if (grantSourceId.startsWith('ft-')) {
      const parts = grantSourceId.split('-');
      const level = parts[1];
      const context = parts[2];

      if (context === 'chargen') {
        return 'Force Training (chargen)';
      }

      if (level && !isNaN(level)) {
        return `Force Training (level ${level})`;
      }

      return 'Force Training';
    }

    return grantSourceId;
  }
}
