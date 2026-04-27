/* ============================================================================
   DISPLAY CONTRACT
   Enforces a standard shape for all entities flowing into the UI
   Every feat, talent, item, class, species, etc. must comply
   ============================================================================ */

export class DisplayContract {
  /**
   * Enforce display contract on any entity
   * Ensures consistent shape for UI rendering
   * @param {Object} entity - Raw entity data
   * @returns {Object} - Normalized entity conforming to contract
   */
  static enforce(entity) {
    if (!entity) {
      return this._createEmpty();
    }

    return {
      // Identity
      id: entity.id || entity._id || `unknown-${Date.now()}`,
      uuid: entity.uuid || null,
      name: entity.name || 'Unnamed',
      type: entity.type || 'generic',

      // Content
      description: entity.description || '',
      benefit: entity.benefit || null,
      prerequisite: entity.prerequisite || entity.prerequisites || null,

      // Classification
      category: entity.category || entity.featType || 'general',
      tags: Array.isArray(entity.tags) ? entity.tags : [],
      source: entity.source || null,

      // Game mechanics
      modifiers: entity.modifiers || [],
      requiresTraining: Boolean(entity.requiresTraining),
      requiresProficiency: Boolean(entity.requiresProficiency),

      // UI presentation (CRITICAL)
      ui: {
        category: entity.ui?.category || entity.category || 'general',
        icon: entity.ui?.icon || this._getDefaultIcon(entity.type),
        rarity: entity.ui?.rarity || 'common',
        displayType: entity.ui?.displayType || 'card',
        color: entity.ui?.color || null,
        badge: entity.ui?.badge || null,
        hideFromPlayer: Boolean(entity.ui?.hideFromPlayer)
      },

      // Source reference
      pack: entity.pack || null,
      source: entity.source || null,

      // Raw system data (for fallback only)
      _raw: entity
    };
  }

  /**
   * Validate entity conforms to contract
   * @param {Object} entity - Entity to validate
   * @returns {boolean}
   */
  static validate(entity) {
    if (!entity) return false;
    return (
      typeof entity.id === 'string' &&
      typeof entity.name === 'string' &&
      Array.isArray(entity.tags) &&
      typeof entity.ui === 'object' &&
      typeof entity.ui.category === 'string' &&
      typeof entity.ui.icon === 'string'
    );
  }

  /**
   * Get default icon based on entity type
   * @private
   * @param {string} type - Entity type (feat, talent, item, class, species, etc.)
   * @returns {string}
   */
  static _getDefaultIcon(type) {
    const iconMap = {
      'feat': '⚔',
      'talent': '◆',
      'item': '◊',
      'class': '▲',
      'species': '●',
      'vehicle': '▶',
      'droid': '◈',
      'power': '✦',
      'skill': '◉',
      'language': '◎',
      'background': '□',
      'generic': '◇'
    };
    return iconMap[type?.toLowerCase()] || '◇';
  }

  /**
   * Create empty entity conforming to contract
   * @private
   * @returns {Object}
   */
  static _createEmpty() {
    return {
      id: 'empty',
      uuid: null,
      name: 'Empty',
      type: 'generic',
      description: '',
      benefit: null,
      prerequisite: null,
      category: 'general',
      tags: [],
      source: null,
      modifiers: [],
      requiresTraining: false,
      requiresProficiency: false,
      ui: {
        category: 'general',
        icon: '◇',
        rarity: 'common',
        displayType: 'card',
        color: null,
        badge: null,
        hideFromPlayer: false
      },
      pack: null,
      _raw: null
    };
  }

  /**
   * Batch enforce contract on multiple entities
   * @param {Array} entities - Array of entities
   * @returns {Array} - Array of normalized entities
   */
  static enforceMany(entities) {
    if (!Array.isArray(entities)) {
      return [];
    }
    return entities.map(e => this.enforce(e));
  }

  /**
   * Merge display overrides into enforced contract
   * Allows per-instance UI customization while maintaining contract
   * @param {Object} enforced - Entity after enforce()
   * @param {Object} overrides - UI overrides to apply
   * @returns {Object}
   */
  static applyOverrides(enforced, overrides) {
    if (!overrides || typeof overrides !== 'object') {
      return enforced;
    }

    return {
      ...enforced,
      ui: {
        ...enforced.ui,
        ...overrides
      }
    };
  }
}
