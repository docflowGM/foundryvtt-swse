/**
 * ChargenPersistence - Mid-Chargen Auto-Save Service
 *
 * Implements Phase 8 (relabeled Phase 3) of the chargen architecture gap fix sequence.
 * Addresses Gap #2: No Post-Commit State Persistence to Actor
 *
 * Architecture:
 * - Auto-save after each step exit (optional, configurable)
 * - Checkpoint system for recovery from crashes
 * - Stores progression state in actor flags for later resume
 * - Enables character preview during chargen
 * - Provides recovery mechanism for interrupted sessions
 *
 * How it works:
 * 1. Step calls saveCheckpoint() on exit
 * 2. Current shell state (buildIntent + committedSelections) is serialized
 * 3. Saved to actor.flags.chargen.checkpoint
 * 4. Player can resume from any checkpoint on next session
 */

import { swseLogger } from '../../../utils/logger.js';

export class ChargenPersistence {
  /**
   * Save a checkpoint of the current progression state.
   * Called when a step exits successfully.
   *
   * @param {ProgressionShell} shell - The progression shell
   * @param {string} stepId - ID of step being exited
   * @returns {Promise<boolean>} true if save successful
   */
  static async saveCheckpoint(shell, stepId) {
    if (!shell?.actor) {
      swseLogger.warn('[ChargenPersistence] Cannot save checkpoint: no actor');
      return false;
    }

    try {
      const checkpoint = this._compileCheckpoint(shell, stepId);
      await this._persistCheckpoint(shell.actor, checkpoint);

      swseLogger.log('[ChargenPersistence] Checkpoint saved', {
        stepId,
        actorId: shell.actor.id,
        timestamp: checkpoint.timestamp,
      });

      return true;
    } catch (err) {
      swseLogger.error('[ChargenPersistence] Failed to save checkpoint:', err);
      return false;
    }
  }

  /**
   * Load a checkpoint and restore shell state.
   * Called during shell initialization if a saved checkpoint exists.
   *
   * @param {ProgressionShell} shell - The progression shell
   * @param {Object} checkpoint - Checkpoint data
   * @returns {boolean} true if restore successful
   */
  static restoreCheckpoint(shell, checkpoint) {
    if (!checkpoint) return false;

    try {
      const restoredSelections = checkpoint.draftSelections || checkpoint.buildIntent || {};

      // Restore canonical progression session state first.
      if (shell.progressionSession && restoredSelections && typeof restoredSelections === 'object') {
        shell.progressionSession.draftSelections = {
          ...shell.progressionSession.draftSelections,
          ...restoredSelections,
        };
        shell.progressionSession.currentStepId = checkpoint.currentStepId || checkpoint.lastStepId || shell.progressionSession.currentStepId || null;
      }

      // Restore buildIntent compatibility state.
      if (shell.buildIntent && restoredSelections) {
        for (const [key, value] of Object.entries(restoredSelections)) {
          if (value !== undefined && value !== null) {
            shell.buildIntent.commitSelection('checkpoint-restore', key, value);
          }
        }
      }

      // Restore legacy committedSelections as raw normalized values.
      if (shell.committedSelections && checkpoint.committedSelections) {
        shell.committedSelections.clear();
        for (const [stepId, selection] of Object.entries(checkpoint.committedSelections)) {
          shell.committedSelections.set(stepId, selection);
        }
      }

      swseLogger.log('[ChargenPersistence] Checkpoint restored', {
        stepId: checkpoint.lastStepId,
        actorId: checkpoint.actorId,
        selectionCount: Object.keys(checkpoint.committedSelections || {}).length,
      });

      return true;
    } catch (err) {
      swseLogger.error('[ChargenPersistence] Failed to restore checkpoint:', err);
      return false;
    }
  }

  /**
   * Clear checkpoints (typically after finalization or explicit reset).
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<boolean>}
   */
  static async clearCheckpoints(actor) {
    if (!actor) return false;

    try {
      await actor.setFlag('foundryvtt-swse', 'chargen.checkpoint', null);
      swseLogger.log('[ChargenPersistence] Checkpoints cleared', { actorId: actor.id });
      return true;
    } catch (err) {
      swseLogger.error('[ChargenPersistence] Failed to clear checkpoints:', err);
      return false;
    }
  }

  /**
   * Get the last saved checkpoint for an actor.
   *
   * @param {Actor} actor - The actor
   * @returns {Object|null} Checkpoint data or null if none exists
   */
  static getLastCheckpoint(actor) {
    if (!actor) return null;

    try {
      return actor.getFlag('foundryvtt-swse', 'chargen.checkpoint') || null;
    } catch (err) {
      swseLogger.warn('[ChargenPersistence] Failed to retrieve checkpoint:', err);
      return null;
    }
  }

  /**
   * Check if a checkpoint exists for an actor.
   *
   * @param {Actor} actor - The actor
   * @returns {boolean}
   */
  static hasCheckpoint(actor) {
    return !!this.getLastCheckpoint(actor);
  }

  /**
   * Compile current shell state into a checkpoint.
   * @private
   */
  static _compileCheckpoint(shell, stepId) {
    // Capture all current selections
    const draftSelections = shell.progressionSession?.getAllSelections?.() || {};
    const buildIntent = shell.buildIntent ? shell.buildIntent.getAllSelections() : draftSelections;
    const committedSelections = {};

    if (shell.committedSelections) {
      for (const [key, value] of shell.committedSelections.entries()) {
        committedSelections[key] = value;
      }
    }

    return {
      // Checkpoint metadata
      timestamp: new Date().toISOString(),
      lastStepId: stepId,
      currentStepId: shell.getCurrentStepId?.() || stepId,
      actorId: shell.actor.id,
      mode: shell.mode,

      // Build state
      buildIntent,
      draftSelections,
      committedSelections,

      // Version for future migrations
      version: 2,
    };
  }

  /**
   * Persist checkpoint to actor flags.
   * @private
   */
  static async _persistCheckpoint(actor, checkpoint) {
    // Store under actor flags for persistence across sessions
    // Structure: actor.flags.foundryvtt-swse.chargen.checkpoint
    await actor.setFlag('foundryvtt-swse', 'chargen.checkpoint', checkpoint);
  }

  /**
   * Get checkpoint summary for UI display.
   * Useful for showing "Resume from Species step?" prompts.
   *
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Object} Summary with display info
   *   {
   *     lastStepId: string,
   *     timestamp: string (ISO),
   *     selectionsCount: number,
   *     buildStatus: string (e.g., "Species selected, class pending")
   *   }
   */
  static getCheckpointSummary(checkpoint) {
    if (!checkpoint) return null;

    const buildIntent = checkpoint.buildIntent || {};
    const status = [];

    if (buildIntent.species) status.push('Species selected');
    if (buildIntent.class) status.push('Class selected');
    if (buildIntent.background) status.push('Background selected');
    if (buildIntent.attributes && Object.keys(buildIntent.attributes).length > 0) status.push('Attributes distributed');
    if (buildIntent.feats && buildIntent.feats.length > 0) status.push('Feats selected');
    if (buildIntent.talents && buildIntent.talents.length > 0) status.push('Talents selected');

    return {
      lastStepId: checkpoint.lastStepId,
      timestamp: checkpoint.timestamp,
      selectionsCount: Object.keys(checkpoint.committedSelections || {}).length,
      buildStatus: status.length > 0 ? status.join(', ') : 'No selections yet',
    };
  }
}
