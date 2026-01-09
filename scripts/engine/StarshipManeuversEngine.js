/**
 * StarshipManeuversEngine.js
 *
 * Handles retrieval, filtering, and management of Starship Maneuvers
 * for pilots and gunners during Starship Scale combat.
 */

export class StarshipManeuversEngine {
  /**
   * List of all available Starship Maneuvers (27 total)
   */
  static ALL_MANEUVERS = [
    'Ackbar Slash',
    'Afterburn',
    'Angle Deflector Shields',
    'Attack Formation Zeta Nine',
    'Attack Pattern Delta',
    'Corellian Slip',
    'Counter',
    'Darklighter Spin',
    'Devastating Hit',
    'Engine Hit',
    'Evasive Action',
    'Explosive Shot',
    'Howlrunner Formation',
    'I Have You Now',
    'Intercept',
    'Overwhelming Assault',
    'Segnor\'s Loop',
    'Shield Hit',
    'Skim the Surface',
    'Skywalker Loop',
    'Snap Roll',
    'Strike Formation',
    'Tallon Roll',
    'Target Lock',
    'Target Sense',
    'Thruster Hit',
    'Wotan Weave'
  ];

  /**
   * Get all Starship Maneuvers available to an actor
   * Requires Starship Tactics feat to be learned
   *
   * @param {Actor} actor - The actor to get maneuvers for
   * @returns {Object} Object containing maneuvers array and metadata
   */
  static getManeuversForActor(actor) {
    // Check if actor has Starship Tactics feat
    const hasStartshipTactics = this._hasStartshipTacticsFeat(actor);
    if (!hasStartshipTactics) {
      return {
        maneuvers: [],
        organized: {
          attackPatterns: [],
          dogfight: [],
          force: [],
          gunner: [],
          general: []
        },
        total: 0,
        hasStartshipTactics: false,
        message: 'Requires Starship Tactics feat'
      };
    }

    // Get all maneuver items from the actor
    const maneuverItems = actor.items.filter(item => item.type === 'maneuver');

    // Convert items to ability-like objects for display
    const maneuvers = maneuverItems.map(item => ({
      id: item.id,
      _id: item.id,
      name: item.name,
      img: item.img,
      talentName: item.name,
      description: item.system?.description || '',
      actionType: item.system?.actionType || 'standard',
      tags: item.system?.tags || [],
      spent: item.system?.spent || false,
      inSuite: item.system?.inSuite || false,
      mechanics: item.system?.mechanics || null
    }));

    // Organize by descriptor type
    const organized = this._organizeByDescriptor(maneuvers);

    return {
      maneuvers: maneuvers,
      organized: organized,
      total: maneuvers.length,
      hasStartshipTactics: true
    };
  }

  /**
   * Get maneuvers that a crew member can use while assigned to a ship
   * Filters for Pilot and Gunner category maneuvers
   *
   * @param {Actor} crewMember - The crew member actor
   * @param {String} position - The crew position (pilot, gunner, etc)
   * @returns {Object} Filtered maneuvers based on position
   */
  static getCrewManeuvers(crewMember, position) {
    const allManeuvers = this.getManeuversForActor(crewMember);

    if (!allManeuvers.hasStartshipTactics) {
      return allManeuvers;
    }

    // Filter by position
    let filtered = allManeuvers.maneuvers;

    if (position === 'gunner') {
      // Gunners can only use [Gunner] descriptor maneuvers
      filtered = filtered.filter(m => m.tags && m.tags.includes('gunner'));
    } else if (position === 'pilot' || position === 'copilot') {
      // Pilots/Copilots can use anything except [Gunner] exclusive maneuvers
      filtered = filtered.filter(m => !m.tags || !m.tags.includes('gunner') || m.tags.includes('pilot'));
    }

    return {
      maneuvers: filtered,
      organized: this._organizeByDescriptor(filtered),
      total: filtered.length,
      hasStartshipTactics: true,
      position: position
    };
  }

  /**
   * Check if a specific maneuver is available to an actor
   *
   * @param {Actor} actor - The actor to check
   * @param {String} maneuverName - Name of the maneuver
   * @returns {Boolean} Whether the actor has this maneuver
   */
  static hasManeuver(actor, maneuverName) {
    const maneuvers = this.getManeuversForActor(actor);
    return maneuvers.maneuvers.some(m => m.name === maneuverName);
  }

  /**
   * Get a specific maneuver by name
   *
   * @param {Actor} actor - The actor to get the maneuver for
   * @param {String} maneuverName - Name of the maneuver
   * @returns {Object|null} The maneuver object or null
   */
  static getManeuver(actor, maneuverName) {
    const maneuvers = this.getManeuversForActor(actor);
    return maneuvers.maneuvers.find(m => m.name === maneuverName) || null;
  }

  /**
   * Private: Check if actor has Starship Tactics feat
   */
  static _hasStartshipTacticsFeat(actor) {
    if (!actor?.items) return false;

    // Check for "Starship Tactics" feat in actor's items
    const feats = actor.items.filter(item => item.type === 'feat');
    return feats.some(feat =>
      feat.name === 'Starship Tactics' ||
      feat.name.includes('Starship Tactics')
    );
  }

  /**
   * Private: Filter abilities to only include Starship Maneuvers
   */
  static _filterManeuvers(abilities) {
    if (!abilities) return [];

    // Filter ability cards from talents that are in the maneuvers list
    return abilities.filter(ability => {
      if (!ability.talentName) return false;
      return this.ALL_MANEUVERS.includes(ability.talentName);
    });
  }

  /**
   * Private: Organize maneuvers by descriptor type
   * Groups into: Attack Patterns, Dogfight, Force, Gunner, and General
   */
  static _organizeByDescriptor(maneuvers) {
    const organized = {
      attackPatterns: [],
      dogfight: [],
      force: [],
      gunner: [],
      general: []
    };

    for (const maneuver of maneuvers) {
      const tags = maneuver.tags || [];

      if (tags.includes('attack-pattern')) {
        organized.attackPatterns.push(maneuver);
      } else if (tags.includes('dogfight')) {
        organized.dogfight.push(maneuver);
      } else if (tags.includes('force')) {
        organized.force.push(maneuver);
      } else if (tags.includes('gunner')) {
        organized.gunner.push(maneuver);
      } else {
        organized.general.push(maneuver);
      }
    }

    return organized;
  }

  /**
   * Get count of learned maneuvers from Starship Tactics feats
   *
   * @param {Actor} actor - The actor to check
   * @returns {Number} Number of maneuvers learned
   */
  static getManeuverCount(actor) {
    if (!actor?.items) return 0;

    // 1 + WIS modifier per Starship Tactics feat taken
    const wisValue = actor.system?.attributes?.wis?.value ?? 10;
    const wisModifier = Math.floor((wisValue - 10) / 2);
    const wisBonus = Math.max(1, 1 + wisModifier);

    // Count how many Starship Tactics feats are taken
    const feats = actor.items.filter(item => item.type === 'feat');
    const tacticsFeatCount = feats.filter(feat =>
      feat.name === 'Starship Tactics' ||
      feat.name.includes('Starship Tactics')
    ).length;

    return wisBonus * tacticsFeatCount;
  }

  /**
   * Get all Attack Pattern maneuvers (special rules: only one active at a time)
   *
   * @param {Actor} actor - The actor
   * @returns {Array} All attack pattern maneuvers available
   */
  static getAttackPatterns(actor) {
    const allManeuvers = this.getManeuversForActor(actor);
    return allManeuvers.maneuvers.filter(m =>
      m.tags && m.tags.includes('attack-pattern')
    );
  }

  /**
   * Get all Dogfight maneuvers (special rules: only in dogfights)
   *
   * @param {Actor} actor - The actor
   * @returns {Array} All dogfight maneuvers available
   */
  static getDogfightManeuvers(actor) {
    const allManeuvers = this.getManeuversForActor(actor);
    return allManeuvers.maneuvers.filter(m =>
      m.tags && m.tags.includes('dogfight')
    );
  }
}
