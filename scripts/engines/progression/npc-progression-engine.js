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
   * Creates or updates a heroic class item to track levels through the progression system.
   * This allows proper derived calculation through DerivedCalculator.
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

    // Find or create heroic class item
    // For now, use first non-nonheroic class, or create "Heroic" generic class
    let heroicClass = actor.items.find(item =>
      item.type === 'class' && item.system.isNonheroic !== true
    );

    const itemsToCreate = [];
    const stateUpdates = {
      'system.level': newLevel,
      // Mark NPC as in progression mode (not statblock)
      'flags.foundryvtt-swse.npcLevelUp.mode': 'progression'
    };

    if (heroicClass) {
      // Update existing heroic class level
      stateUpdates[`items.${heroicClass.id}.system.level`] = (heroicClass.system.level || 1) + 1;
    } else {
      // Create new generic heroic class item
      const newHeroicClass = {
        name: 'Heroic',
        type: 'class',
        system: {
          level: 1,
          isNonheroic: false,
          hitDie: '1d6',
          babProgression: 'medium',
          fortSave: 'slow',
          refSave: 'slow',
          willSave: 'slow',
          classSkills: [],
          defenseBonus: 0,
          reputation: 0,
          baseClass: false,
          forceSensitive: false,
          defenses: {
            fortitude: 0,
            reflex: 0,
            will: 0
          },
          talentTrees: [],
          levelProgression: [],
          startingFeatures: [],
          trainedSkills: 0
        }
      };
      itemsToCreate.push(newHeroicClass);
    }

    // Heroic progression:
    // - Update/create heroic class item
    // - Increment actor level
    // - Let derived data recalculate feats/talents slots
    return {
      xpDelta: 0,
      featsAdded: [],
      talentsAdded: [],
      itemsToCreate,
      featsRemoved: [],
      talentsRemoved: [],
      stateUpdates
    };
  }

  /**
   * Build progression packet for nonheroic NPC level-up
   * Nonheroic track: skills and limited feats only (no talents)
   *
   * IMPORTANT: Nonheroic levels are tracked via class items with isNonheroic=true.
   * This allows the derived calculators to properly compute BAB, defenses, HP, etc.
   * per SWSE nonheroic rules.
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

    // Find or create nonheroic class item
    const nonheroicClass = actor.items.find(item =>
      item.type === 'class' && item.system.isNonheroic === true
    );

    const itemsToCreate = [];
    const stateUpdates = {
      'system.level': newLevel,
      // Mark NPC as in progression mode (not statblock)
      'flags.foundryvtt-swse.npcLevelUp.mode': 'progression'
    };

    if (nonheroicClass) {
      // Update existing nonheroic class level
      // Include in stateUpdates so it gets applied atomically
      stateUpdates[`items.${nonheroicClass.id}.system.level`] = (nonheroicClass.system.level || 1) + 1;
    } else {
      // Create new nonheroic class item (generic "Nonheroic" class)
      const newNonheroicClass = {
        name: 'Nonheroic',
        type: 'class',
        system: {
          level: 1,
          isNonheroic: true,
          hitDie: '1d4',
          babProgression: 'slow',
          fortSave: 'slow',
          refSave: 'slow',
          willSave: 'slow',
          classSkills: [],
          defenseBonus: 0,
          reputation: 0,
          baseClass: false,
          forceSensitive: false,
          defenses: {
            fortitude: 0,
            reflex: 0,
            will: 0
          },
          talentTrees: [],
          levelProgression: [],
          startingFeatures: [],
          trainedSkills: 0
        }
      };
      itemsToCreate.push(newNonheroicClass);
    }

    // Nonheroic progression:
    // - Update/create nonheroic class item
    // - Increment actor level
    // - Recalculate based on class (may grant feats, skills)
    // - NO talents (enforced by isNonheroic flag)
    return {
      xpDelta: 0,
      featsAdded: [],
      talentsAdded: [],
      itemsToCreate,
      featsRemoved: [],
      talentsRemoved: [],
      stateUpdates
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
