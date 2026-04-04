/**
 * ReactionRegistry
 *
 * Metadata registry for all reaction types.
 * Schema is talent-agnostic but flexible enough to support all SWSE reaction patterns.
 *
 * Governance:
 * - No direct ChatMessage.create()
 * - No state mutation
 * - Pure data structure + handler declarations
 * - Handlers are defined but not called here
 */

export class ReactionRegistry {
  /**
   * Master registry of all reactions
   * Each entry maps to a talent or universal reaction
   */
  static registry = {
    // DEFENSIVE REACTIONS
    block: {
      key: 'block',
      label: 'Block',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Reduce incoming damage',

      conditions: {
        validAttackTypes: ['melee', 'ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    deflect: {
      key: 'deflect',
      label: 'Deflect',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Deflect ranged attack',

      conditions: {
        validAttackTypes: ['ranged'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    // COUNTERATTACK REACTIONS
    counterattack: {
      key: 'counterattack',
      label: 'Counterattack',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Make an attack roll against attacker',

      conditions: {
        validAttackTypes: ['melee'],
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    // FORCE REACTIONS
    forceReflection: {
      key: 'forceReflection',
      label: 'Force Reflection',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Reflect Force-based attack',

      conditions: {
        validAttackTypes: null,
        validDamageTypes: ['force'],
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 1,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    },

    // MOVEMENT REACTIONS
    evasion: {
      key: 'evasion',
      label: 'Evasion',
      trigger: 'ON_ATTACK_DECLARED',
      description: 'Avoid area effect damage',

      conditions: {
        validAttackTypes: null,
        validDamageTypes: null,
        requiresWeaponTag: null,
        requiresTalents: null,
        requiresDefense: null
      },

      usage: {
        perRound: true,
        perEncounter: false,
        maxPerRound: 1
      },

      cost: {
        action: 'reaction',
        forcePoints: 0,
        talentResources: null
      },

      handler: async (context) => {
        return {
          modifiedDamage: null,
          additionalRoll: null,
          resultMessage: null
        };
      }
    }
  };

  /**
   * Get reaction definition by key
   * @param {string} reactionKey
   * @returns {Object|null}
   */
  static getReaction(reactionKey) {
    return this.registry[reactionKey] || null;
  }

  /**
   * Get all registered reaction keys
   * @returns {string[]}
   */
  static getReactionKeys() {
    return Object.keys(this.registry);
  }

  /**
   * Check if reaction exists
   * @param {string} reactionKey
   * @returns {boolean}
   */
  static hasReaction(reactionKey) {
    return reactionKey in this.registry;
  }

  /**
   * Register a new reaction (for talent system integration)
   * Must follow schema structure
   * @param {string} key
   * @param {Object} definition
   */
  static registerReaction(key, definition) {
    if (!key || typeof key !== 'string') {
      throw new Error('ReactionRegistry: Reaction key must be non-empty string');
    }

    if (!definition || typeof definition !== 'object') {
      throw new Error('ReactionRegistry: Reaction definition must be object');
    }

    // Validate required fields
    const required = ['label', 'trigger', 'conditions', 'usage', 'cost', 'handler'];
    for (const field of required) {
      if (!(field in definition)) {
        throw new Error(`ReactionRegistry: Missing required field "${field}" in reaction "${key}"`);
      }
    }

    this.registry[key] = definition;
  }

  /**
   * Get reactions that match a trigger
   * @param {string} trigger - Trigger type (e.g., 'ON_ATTACK_DECLARED')
   * @returns {Object[]}
   */
  static getReactionsByTrigger(trigger) {
    return Object.values(this.registry).filter(r => r.trigger === trigger);
  }
}
