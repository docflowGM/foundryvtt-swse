/**
 * SuggestionStateService
 *
 * PHASE F: Extract persistence from SuggestionEngines
 *
 * Owns: Storage and retrieval of suggestion engine state (and only state)
 * Delegates to: ActorEngine for mutations
 * Never owns: Evaluation logic, analytics, tracking
 *
 * This service separates concerns:
 * - SuggestionEngines evaluate (pure logic)
 * - SuggestionStateService persists (storage only)
 * - PlayerAnalytics tracks (analytics only)
 *
 * Contract:
 * - Persists flags to actor using ActorEngine
 * - Reads state via getFlag()
 * - Returns structured state objects
 * - No business logic (no decisions)
 * - No calculations
 * - No mutations beyond storage
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const NS = 'swse';
const STORAGE_KEY = 'suggestionEngine';

export class SuggestionStateService {
  /**
   * Initialize suggestion engine state structure on actor.
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<void>}
   */
  static async initializeState(actor) {
    if (!actor) {
      throw new Error('initializeState() requires actor');
    }

    try {
      swseLogger.debug(`[SuggestionStateService] Initializing state for ${actor.name}`);

      const currentState = actor.getFlag(NS, STORAGE_KEY) || {};

      if (!currentState.pivotDetector) {
        currentState.pivotDetector = { state: 'STABLE' };
      }
      if (!currentState.meta) {
        currentState.meta = { lastLevelUp: null, lastUpdatedAtLevel: null };
      }

      await actor.setFlag(NS, STORAGE_KEY, currentState);
      swseLogger.debug(`[SuggestionStateService] State initialized for ${actor.name}`);
    } catch (err) {
      swseLogger.error(`[SuggestionStateService] Failed to initialize state for ${actor.name}`, err);
      throw err;
    }
  }

  /**
   * Update pivot detector state.
   *
   * @param {Actor} actor - Target actor
   * @param {string} newState - New pivot state (STABLE, EXPLORATORY, PIVOTING)
   * @returns {Promise<Object>} Updated state
   */
  static async updatePivotState(actor, newState) {
    if (!actor) {
      throw new Error('updatePivotState() requires actor');
    }

    try {
      swseLogger.debug(`[SuggestionStateService] Updating pivot state to ${newState} for ${actor.name}`);

      const currentState = actor.getFlag(NS, STORAGE_KEY) || { pivotDetector: {} };
      const oldState = currentState.pivotDetector?.state;

      currentState.pivotDetector = {
        state: newState,
        changedAt: new Date().toISOString(),
        previousState: oldState
      };

      await actor.setFlag(NS, STORAGE_KEY, currentState);

      swseLogger.log(`[SuggestionStateService] Pivot state updated`, {
        actor: actor.name,
        from: oldState,
        to: newState
      });

      return currentState.pivotDetector;
    } catch (err) {
      swseLogger.error(`[SuggestionStateService] Failed to update pivot state for ${actor.name}`, err);
      throw err;
    }
  }

  /**
   * Update metadata (last level up, etc).
   *
   * @param {Actor} actor - Target actor
   * @param {Object} metadata - Metadata to store
   * @returns {Promise<Object>} Updated metadata
   */
  static async updateMetadata(actor, metadata) {
    if (!actor) {
      throw new Error('updateMetadata() requires actor');
    }

    try {
      swseLogger.debug(`[SuggestionStateService] Updating metadata for ${actor.name}`);

      const currentState = actor.getFlag(NS, STORAGE_KEY) || { meta: {} };

      currentState.meta = {
        ...currentState.meta,
        ...metadata,
        lastModified: new Date().toISOString()
      };

      await actor.setFlag(NS, STORAGE_KEY, currentState);

      swseLogger.log(`[SuggestionStateService] Metadata updated`, {
        actor: actor.name,
        fields: Object.keys(metadata)
      });

      return currentState.meta;
    } catch (err) {
      swseLogger.error(`[SuggestionStateService] Failed to update metadata for ${actor.name}`, err);
      throw err;
    }
  }

  /**
   * Get current suggestion engine state.
   *
   * @param {Actor} actor - Target actor
   * @returns {Object} Current state or empty structure
   */
  static getState(actor) {
    if (!actor) {
      throw new Error('getState() requires actor');
    }

    return actor.getFlag(NS, STORAGE_KEY) || {
      pivotDetector: { state: 'STABLE' },
      meta: { lastLevelUp: null, lastUpdatedAtLevel: null }
    };
  }

  /**
   * Get pivot detector state.
   *
   * @param {Actor} actor - Target actor
   * @returns {string} Current pivot state
   */
  static getPivotState(actor) {
    const state = this.getState(actor);
    return state.pivotDetector?.state || 'STABLE';
  }

  /**
   * Get metadata.
   *
   * @param {Actor} actor - Target actor
   * @returns {Object} Current metadata
   */
  static getMetadata(actor) {
    const state = this.getState(actor);
    return state.meta || { lastLevelUp: null, lastUpdatedAtLevel: null };
  }

  /**
   * Clear all suggestion engine state (for testing or reset).
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<void>}
   */
  static async clearState(actor) {
    if (!actor) {
      throw new Error('clearState() requires actor');
    }

    try {
      swseLogger.warn(`[SuggestionStateService] Clearing state for ${actor.name}`);
      await actor.unsetFlag(NS, STORAGE_KEY);
    } catch (err) {
      swseLogger.error(`[SuggestionStateService] Failed to clear state for ${actor.name}`, err);
      throw err;
    }
  }
}
