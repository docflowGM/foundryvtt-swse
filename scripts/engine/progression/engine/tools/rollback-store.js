/**
 * SWSE Rollback Store
 * Multi-state history for progression with rollback capability
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

/**
 * Rollback Store - Maintains history of actor states for undo functionality
 */
export class RollbackStore {
  constructor() {
    this.stack = [];
    this.maxHistory = 5; // Keep last 5 states
  }

  /**
   * Save current actor state to history
   * @param {Actor} actor - Actor to save
   */
  save(actor) {
    if (!actor) {
      swseLogger.warn('RollbackStore: Cannot save null actor');
      return;
    }

    const snapshot = actor.toObject();
    this.stack.push(snapshot);

    // Keep only last N states
    if (this.stack.length > this.maxHistory) {
      this.stack.shift(); // Remove oldest
    }

    swseLogger.log(`RollbackStore: Saved state (${this.stack.length}/${this.maxHistory})`);
  }

  /**
   * Restore actor to previous state
   * @param {Actor} actor - Actor to restore
   * @returns {Promise<boolean>} - True if restore successful
   */
  async restore(actor) {
    if (!actor) {
      swseLogger.warn('RollbackStore: Cannot restore null actor');
      return false;
    }

    if (this.stack.length === 0) {
      swseLogger.warn('RollbackStore: No states to restore');
      ui.notifications?.warn('No previous states available to restore');
      return false;
    }

    const state = this.stack.pop();

    try {
      // Update actor system data
      // PHASE 3: Route through ActorEngine
      await ActorEngine.updateActor(actor, { system: state.system });

      // Delete all current items
      const currentItemIds = actor.items.map(i => i.id);
      if (currentItemIds.length > 0) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', currentItemIds);
      }

      // Recreate items from snapshot
      if (state.items && state.items.length > 0) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', state.items);
      }

      swseLogger.log(`RollbackStore: Restored state (${this.stack.length} remaining)`);
      ui.notifications?.info('Progression rolled back to previous state');

      return true;
    } catch (err) {
      swseLogger.error('RollbackStore: Failed to restore state', err);
      ui.notifications?.error(`Failed to rollback: ${err.message}`);
      return false;
    }
  }

  /**
   * Get the most recent state without removing it
   * @returns {Object|null} - Most recent state snapshot
   */
  peek() {
    if (this.stack.length === 0) {return null;}
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get a specific state from history
   * @param {number} index - Index in history (0 = oldest, -1 = newest)
   * @returns {Object|null} - State snapshot at index
   */
  getState(index) {
    if (index < 0) {
      // Negative index counts from end
      index = this.stack.length + index;
    }

    if (index < 0 || index >= this.stack.length) {
      return null;
    }

    return this.stack[index];
  }

  /**
   * Clear all history
   */
  clear() {
    this.stack = [];
    swseLogger.log('RollbackStore: History cleared');
  }

  /**
   * Get number of states in history
   * @returns {number}
   */
  get length() {
    return this.stack.length;
  }

  /**
   * Check if rollback is available
   * @returns {boolean}
   */
  canRollback() {
    return this.stack.length > 0;
  }

  /**
   * Get history summary
   * @returns {Array} - Array of state summaries
   */
  getSummary() {
    return this.stack.map((state, index) => ({
      index: index,
      level: state.system?.level || 0,
      classes: state.items
        ?.filter(i => i.type === 'class')
        ?.map(i => `${i.name} ${i.system?.level || 1}`) || [],
      timestamp: state._stats?.modifiedTime || 'Unknown'
    }));
  }
}

/**
 * Global rollback store instance
 */
export const globalRollbackStore = new RollbackStore();
