/**
 * NPC Progression Engine
 *
 * Builds progression packets for NPC level-up and stat block restoration.
 * All mutations route through ActorEngine.applyProgression() for unified governance.
 *
 * This is a THIN TRANSLATION layer:
 * Dialog → Packet → ActorEngine.applyProgression() → DerivedCalculator → ModifierEngine
 *
 * NPCs follow the same progression system as characters:
 * - Heroic track: full feat/talent/feat slots
 * - Nonheroic track: limited progression (skills/feats only, no talents)
 * - Statblock restoration: revert to pre-levelup snapshot
 */

import { SWSELogger } from '../../utils/logger.js';
import { SnapshotManager } from './utils/snapshot-manager.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export class NpcProgressionEngine {

  /**
   * Build progression packet for heroic NPC level-up
   * Heroic track: same as PC progression (feats, talents, items)
   *
   * @param {Actor} actor - The NPC actor
   * @param {Object} options - Level-up options
   * @returns {Promise<Object>} progressionPacket for ActorEngine.applyProgression()
   */
  static async buildHeroicLevelPacket(actor, options = {}) {
    if (!actor) {
      throw new Error('NpcProgressionEngine.buildHeroicLevelPacket: no actor');
    }

    SWSELogger.debug('[NpcProgressionEngine] Building heroic level packet for', actor.name);

    const currentLevel = actor.system.level || 1;
    const newLevel = currentLevel + 1;

    // Create snapshot before modification if requested
    if (options.createSnapshot !== false) {
      await SnapshotManager.createSnapshot(
        actor,
        `Before Heroic Level-Up to ${newLevel}`
      );
    }

    // For now, heroic NPC level-up is minimal:
    // - Increment level
    // - No XP scaling (NPCs don't use XP by default)
    // - Let derived data recalculate feats/talents slots
    return {
      xpDelta: 0,
      featsAdded: [],
      talentsAdded: [],
      itemsToCreate: [],
      featsRemoved: [],
      talentsRemoved: [],
      stateUpdates: {
        'system.level': newLevel
      }
    };
  }

  /**
   * Build progression packet for nonheroic NPC level-up
   * Nonheroic track: skills and limited feats only (no talents)
   *
   * @param {Actor} actor - The NPC actor
   * @param {Object} options - Level-up options
   * @returns {Promise<Object>} progressionPacket for ActorEngine.applyProgression()
   */
  static async buildNonheroicLevelPacket(actor, options = {}) {
    if (!actor) {
      throw new Error('NpcProgressionEngine.buildNonheroicLevelPacket: no actor');
    }

    SWSELogger.debug('[NpcProgressionEngine] Building nonheroic level packet for', actor.name);

    const currentLevel = actor.system.level || 1;
    const newLevel = currentLevel + 1;

    // Create snapshot before modification if requested
    if (options.createSnapshot !== false) {
      await SnapshotManager.createSnapshot(
        actor,
        `Before Nonheroic Level-Up to ${newLevel}`
      );
    }

    // Nonheroic progression:
    // - Increment level
    // - Recalculate based on class (may grant feats, skills)
    // - NO talents (enforced by class data or this logic)
    return {
      xpDelta: 0,
      featsAdded: [],
      talentsAdded: [],
      itemsToCreate: [],
      featsRemoved: [],
      talentsRemoved: [],
      stateUpdates: {
        'system.level': newLevel,
        // Mark NPC as nonheroic in flags for UI/logic checks
        'flags.foundryvtt-swse.npcProgression': 'nonheroic'
      }
    };
  }

  /**
   * Revert NPC to pre-levelup snapshot (statblock restoration)
   * Restores complete actor state including items, effects, attributes
   *
   * @param {Actor} actor - The NPC actor
   * @param {Object} options - Restoration options
   * @returns {Promise<void>}
   */
  static async revertToSnapshot(actor, options = {}) {
    if (!actor) {
      throw new Error('NpcProgressionEngine.revertToSnapshot: no actor');
    }

    SWSELogger.debug('[NpcProgressionEngine] Reverting to snapshot for', actor.name);

    const snapshot = SnapshotManager.getLatestSnapshot(actor);

    if (!snapshot) {
      SWSELogger.warn(`No snapshot available for ${actor.name}`);
      ui.notifications.warn('No previous snapshot found.');
      return;
    }

    // Restore through SnapshotManager (routes through ActorEngine)
    const restored = await SnapshotManager.restoreSnapshot(
      actor,
      snapshot.timestamp
    );

    if (!restored) {
      SWSELogger.error('Failed to restore snapshot for', actor.name);
      ui.notifications.error('Failed to restore NPC to snapshot.');
      throw new Error('Snapshot restoration failed');
    }

    SWSELogger.log(`Restored ${actor.name} to snapshot: "${snapshot.label}"`);
  }

  /**
   * Apply a progression packet to an NPC
   * Unified mutation point: all NPC progression goes through ActorEngine
   *
   * @param {Actor} actor - The NPC actor
   * @param {Object} progressionPacket - Packet from buildHeroicLevelPacket() or buildNonheroicLevelPacket()
   * @param {Object} options - Application options
   * @returns {Promise<void>}
   */
  static async applyProgression(actor, progressionPacket, options = {}) {
    if (!actor) {
      throw new Error('NpcProgressionEngine.applyProgression: no actor');
    }
    if (!progressionPacket) {
      throw new Error('NpcProgressionEngine.applyProgression: no progressionPacket');
    }

    SWSELogger.debug('[NpcProgressionEngine] Applying progression packet to', actor.name);

    // Route through ActorEngine for atomic, governed mutation
    await ActorEngine.applyProgression(actor, progressionPacket);

    SWSELogger.log(`Progression applied to ${actor.name}:`, {
      newLevel: progressionPacket.stateUpdates?.['system.level'],
      itemsAdded: progressionPacket.itemsToCreate?.length || 0
    });
  }

  /**
   * Check if NPC has a snapshot available for revert
   * @param {Actor} actor - The NPC actor
   * @returns {boolean} true if snapshots exist
   */
  static hasSnapshot(actor) {
    if (!actor) return false;
    const snapshots = SnapshotManager.getSnapshots(actor);
    return snapshots && snapshots.length > 0;
  }

  /**
   * Get snapshot info for display
   * @param {Actor} actor - The NPC actor
   * @returns {Object|null} Latest snapshot info or null
   */
  static getSnapshotInfo(actor) {
    if (!actor) return null;
    const snapshot = SnapshotManager.getLatestSnapshot(actor);
    if (!snapshot) return null;

    return {
      label: snapshot.label,
      timestamp: snapshot.timestamp,
      level: snapshot.level,
      date: new Date(snapshot.timestamp).toLocaleString()
    };
  }
}

export default NpcProgressionEngine;
