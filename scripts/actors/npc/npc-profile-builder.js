/**
 * NPC Profile Builder
 *
 * Constructs NPC context view-model for sheet rendering.
 * Phase 2 scope: build stable fields that make NPC UI explicit and mode-aware.
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

    // Resolve owner data for followers
    const ownerData = this._resolveOwnerData(actor);
    const hasOwner = !!ownerData;

    // Resolve rider data for mounts
    const riderData = this._resolveRiderData(actor);
    const hasRider = !!riderData;

    // Resolve progression summary
    const progressionSummary = this._getProgressionSummary(actor);

    // Determine which panels to show
    const showProgressionPanel = npcMode === 'progression';
    const showOwnerPanel = npcKind === 'follower' && hasOwner;
    const showBeastPanel = npcKind === 'beast';
    const showMountPanel = npcKind === 'mount';
    const showRelationshipsTab = showOwnerPanel || showMountPanel;

    // Generate descriptions
    const profileDescription = this._getProfileDescription(npcKind, npcMode);
    const authorityDescription = this._getAuthorityDescription(npcMode, npcKind);

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

      // Panel visibility
      showProgressionPanel,
      showOwnerPanel,
      showBeastPanel,
      showMountPanel,
      showRelationshipsTab,

      // Follower metadata
      hasOwner,
      ownerSummary: ownerData,
      followerTemplate: actor.system?.npcProfile?.template || actor.system?.followerType || null,

      // Mount metadata
      hasRider,
      riderSummary: riderData,

      // Beast metadata
      beastKind: actor.system?.npcProfile?.beastKind || null,

      // Progression summary
      progressionSummary,

      // Descriptions
      profileDescription,
      authorityDescription
    };
  }

  /**
   * Resolve owner data for follower NPCs.
   * @private
   */
  static _resolveOwnerData(actor) {
    if (!actor || actor.system?.npcProfile?.kind !== 'follower') {
      // Check legacy follower flag
      const ownerId = actor?.flags?.swse?.follower?.ownerId;
      if (!ownerId) {
        return null;
      }

      const owner = game.actors?.get(ownerId);
      if (!owner) {
        return null;
      }

      return {
        name: owner.name || 'Unknown Owner',
        talent: actor.flags?.swse?.follower?.grantingTalent || null,
        template: actor.system?.followerType || null,
        provenance: 'Legacy follower flag'
      };
    }

    // New canonical npcProfile path
    const ownerId = actor.system?.npcProfile?.owner?.actorId;
    if (!ownerId) {
      return null;
    }

    const owner = game.actors?.get(ownerId);
    if (!owner) {
      return null;
    }

    const grantingTalent = actor.system?.npcProfile?.owner?.talent;

    return {
      name: owner.name || 'Unknown Owner',
      talent: grantingTalent?.name || null,
      template: actor.system?.npcProfile?.template || null,
      provenance: 'NPC profile contract'
    };
  }

  /**
   * Resolve rider data for mount NPCs.
   * @private
   */
  static _resolveRiderData(actor) {
    if (!actor || actor.system?.npcProfile?.kind !== 'mount') {
      return null;
    }

    const riderId = actor.system?.npcProfile?.mount?.riderActorId;
    if (!riderId) {
      return null;
    }

    const rider = game.actors?.get(riderId);
    if (!rider) {
      return null;
    }

    return {
      name: rider.name || 'Unknown Rider',
      notes: actor.system?.npcProfile?.mount?.riderNotes || null
    };
  }

  /**
   * Get progression summary for display.
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

    const totalLevels = (heroicLevel || 0) + (nonheroicLevel || 0);

    // Only return if there's actual progression data
    if (totalLevels === 0) {
      return null;
    }

    return {
      heroicLevels: heroicLevel || 0,
      nonheroicLevels: nonheroicLevel || 0,
      totalLevels
    };
  }

  /**
   * Generate profile description text.
   * @private
   */
  static _getProfileDescription(npcKind, npcMode) {
    const modeText = npcMode === 'progression' ? 'progression-based' : 'statblock';

    switch (npcKind) {
      case 'heroic':
        return `This is a heroic ${modeText} NPC.`;
      case 'nonheroic':
        return `This is a nonheroic ${modeText} NPC with limited advancement.`;
      case 'beast':
        return `This is a beast or creature operating in ${modeText} mode.`;
      case 'follower':
        return `This is a follower or minion in ${modeText} mode, bound to an owner.`;
      case 'mount':
        return `This is a mount or steed in ${modeText} mode, available for riding.`;
      default:
        return `This NPC operates in ${modeText} mode.`;
    }
  }

  /**
   * Generate authority description text.
   * @private
   */
  static _getAuthorityDescription(npcMode, npcKind) {
    if (npcMode === 'statblock') {
      return 'This NPC uses published statblock values as the primary authority for abilities and bonuses.';
    }

    if (npcMode === 'progression') {
      if (npcKind === 'follower') {
        return 'This follower uses progression-driven calculations scaled to the owner\'s level.';
      }
      return 'This NPC uses progression-driven calculations for abilities and bonuses.';
    }

    return 'Authority mode unknown.';
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
      showProgressionPanel: false,
      showOwnerPanel: false,
      showBeastPanel: false,
      showMountPanel: false,
      showRelationshipsTab: false,
      hasOwner: false,
      ownerSummary: null,
      followerTemplate: null,
      hasRider: false,
      riderSummary: null,
      beastKind: null,
      progressionSummary: null,
      profileDescription: 'NPC data unavailable.',
      authorityDescription: 'Unknown authority.'
    };
  }
}
