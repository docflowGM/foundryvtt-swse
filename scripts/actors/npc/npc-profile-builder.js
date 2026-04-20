/**
 * NPC Profile Builder
 *
 * Constructs NPC context view-model for sheet rendering.
 * Phase 1 scope: build stable fields that make NPC UI explicit and mode-aware.
 *
 * Returns fully serializable object safe for AppV2 structuredClone.
 */

import { getNpcMode, getNpcKind, isNpcStatblockMode, isNpcProgressionMode, usesFlatStatblockAttacks } from './npc-mode-adapter.js';

export class NpcProfileBuilder {
  /**
   * Build NPC profile context for sheet rendering.
   *
   * @param {Actor} actor - NPC actor
   * @returns {Object} Serializable context fields
   */
  static buildContext(actor) {
    if (!actor || actor.type !== 'npc') {
      return this._getEmptyContext();
    }

    const npcMode = getNpcMode(actor);
    const npcKind = getNpcKind(actor);

    return {
      // Mode + subtype (stable, canonical)
      npcKind,
      npcMode,
      isStatblockMode: npcMode === 'statblock',
      isProgressionMode: npcMode === 'progression',

      // Subtype checks
      isHeroicNpc: npcKind === 'heroic',
      isNonheroicNpc: npcKind === 'nonheroic',
      isBeastNpc: npcKind === 'beast',
      isFollowerNpc: npcKind === 'follower',
      isMountNpc: npcKind === 'mount',

      // Attack authority (for combat tab)
      usesFlatStatblockAttacks: isNpcStatblockMode(actor),

      // Follower metadata
      followerOwner: this._getFollowerOwnerSummary(actor),
      followerTemplate: actor.system?.npcProfile?.template || actor.system?.followerType || null,

      // Beast metadata
      beastKind: actor.system?.npcProfile?.beastKind || null,

      // Mount metadata (phase 4 placeholder)
      mountRider: actor.system?.npcProfile?.mount?.riderActorId || null,
      mountBattleTrained: actor.system?.npcProfile?.mount?.battleTrained || false,

      // Progression summary
      progressionSummary: this._getProgressionSummary(actor)
    };
  }

  /**
   * Get follower owner summary for display.
   * @private
   */
  static _getFollowerOwnerSummary(actor) {
    if (!actor || !actor.flags?.swse?.follower?.ownerId) {
      return null;
    }

    const ownerId = actor.flags.swse.follower.ownerId;
    const grantingTalent = actor.flags.swse.follower.grantingTalent;

    return {
      ownerId,
      grantingTalentName: grantingTalent?.name || null
    };
  }

  /**
   * Get progression summary for display in progression-aware UI.
   * @private
   */
  static _getProgressionSummary(actor) {
    if (!actor || !isNpcProgressionMode(actor)) {
      return null;
    }

    const classes = actor.items?.filter(i => i.type === 'class') || [];
    const heroicLevel = classes
      .filter(c => c.system?.isNonheroic !== true)
      .reduce((sum, c) => sum + (Number(c.system?.level) || 0), 0);
    const nonheroicLevel = classes
      .filter(c => c.system?.isNonheroic === true)
      .reduce((sum, c) => sum + (Number(c.system?.level) || 0), 0);

    return {
      heroicLevel: heroicLevel || 0,
      nonheroicLevel: nonheroicLevel || 0,
      totalLevel: (heroicLevel || 0) + (nonheroicLevel || 0)
    };
  }

  /**
   * Return empty/safe context when actor is invalid.
   * @private
   */
  static _getEmptyContext() {
    return {
      npcKind: 'heroic',
      npcMode: 'statblock',
      isStatblockMode: true,
      isProgressionMode: false,
      isHeroicNpc: true,
      isNonheroicNpc: false,
      isBeastNpc: false,
      isFollowerNpc: false,
      isMountNpc: false,
      usesFlatStatblockAttacks: false,
      followerOwner: null,
      followerTemplate: null,
      beastKind: null,
      mountRider: null,
      mountBattleTrained: false,
      progressionSummary: null
    };
  }
}
