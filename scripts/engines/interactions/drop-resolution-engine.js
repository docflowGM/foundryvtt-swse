/**
 * DropResolutionEngine
 *
 * PHASE 3: Pure drop classification and mutationPlan generation
 *
 * Responsibility:
 * - Accept drop data from sheet
 * - Normalize compendium/UUID sources
 * - Classify by document type and item type
 * - Build declarative mutationPlan
 * - Include UI target tab for post-drop feedback
 * - Return plan + tab only (no mutations)
 *
 * Architecture:
 * - Tab-agnostic (drop classification independent of sheet location)
 * - Type-aware (talents, feats, weapons, armor, gear, force powers, actors)
 * - Duplicate-aware (silent skip for duplicates)
 * - Stack-aware (gear quantity handling)
 * - Sovereign (returns data only, never mutates)
 * - UI-informed (includes uiTargetTab for tab highlighting)
 *
 * Usage:
 *   const result = await DropResolutionEngine.resolve({ actor, dropData });
 *   if (result) {
 *     await ActorEngine.apply(actor, result.mutationPlan);
 *     sheet._pulseTab(result.uiTargetTab);  // UI feedback
 *   }
 */

export class DropResolutionEngine {
  /**
   * Main entry point: resolve drop to mutationPlan + UI feedback
   *
   * @param {Object} config
   * @param {Actor} config.actor - target actor
   * @param {Object} config.dropData - drag event data
   * @returns {Promise<Object|null>} { mutationPlan, uiTargetTab } or null if invalid/duplicate
   */
  static async resolve({ actor, dropData }) {
    if (!actor) {
      console.warn('DropResolutionEngine.resolve: no actor provided');
      return null;
    }

    if (!dropData?.type) {
      console.warn('DropResolutionEngine.resolve: invalid dropData');
      return null;
    }

    try {
      // Normalize drop source (compendium or UUID)
      const normalized = await this._normalizeDrop(dropData);
      if (!normalized) return null;

      // Route by document type
      if (normalized.type === 'Item') {
        return this._handleItemDrop(actor, normalized.document);
      }

      if (normalized.type === 'Actor') {
        return this._handleActorDrop(actor, normalized.document);
      }

      // Reject invalid document types
      return null;

    } catch (err) {
      console.error('DropResolutionEngine.resolve failed:', err);
      return null;
    }
  }

  /**
   * Normalize drop from compendium pack or UUID
   *
   * @private
   * @param {Object} dropData
   * @returns {Promise<Object|null>} { type: 'Item'|'Actor', document }
   */
  static async _normalizeDrop(dropData) {
    try {
      // From compendium pack
      if (dropData.pack) {
        const pack = game.packs.get(dropData.pack);
        if (!pack) return null;

        const document = await pack.getDocument(dropData.id);
        if (!document) return null;

        return {
          type: document.documentName,
          document: document
        };
      }

      // From actor sheet or UUID
      if (dropData.uuid) {
        const document = await fromUuid(dropData.uuid);
        if (!document) return null;

        return {
          type: document.documentName,
          document: document
        };
      }

      // Legacy type field
      if (dropData.type === 'Item' && dropData.data) {
        return {
          type: 'Item',
          document: dropData.data
        };
      }

      return null;

    } catch (err) {
      console.warn('DropResolutionEngine._normalizeDrop failed:', err);
      return null;
    }
  }

  /**
   * Route item drop to type-specific handler
   *
   * @private
   * @param {Actor} actor
   * @param {Item} item
   * @returns {Object|null} { mutationPlan, uiTargetTab } or null
   */
  static _handleItemDrop(actor, item) {
    const itemType = item.type;

    // Route to handler by type
    const handler = DROP_RULES[itemType];
    if (!handler) {
      console.warn(`No drop handler for item type: ${itemType}`);
      return null;
    }

    return handler(actor, item);
  }

  /**
   * Handle actor drop: create linked reference only
   *
   * @private
   * @param {Actor} actor - target actor
   * @param {Actor} droppedActor - dropped actor
   * @returns {Object|null} { mutationPlan, uiTargetTab } or null
   */
  static _handleActorDrop(actor, droppedActor) {
    // Reject vehicle cross-drops
    if (droppedActor.type === 'vehicle' || actor.type === 'vehicle') {
      console.debug('Drop rejected: vehicle transfer not allowed');
      return null;
    }

    // Reject self-drop
    if (droppedActor.id === actor.id) {
      console.debug('Drop rejected: cannot drop actor onto itself');
      return null;
    }

    // Check if already linked
    const relationships = actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === droppedActor.uuid);
    if (alreadyLinked) {
      console.debug(`Drop skipped: ${droppedActor.name} already linked`);
      return null;
    }

    // Build linked reference (no embedding)
    const newRelationship = {
      uuid: droppedActor.uuid,
      name: droppedActor.name,
      type: droppedActor.type
    };

    return {
      mutationPlan: {
        update: {
          'system.relationships': [...relationships, newRelationship]
        }
      },
      uiTargetTab: 'other'  // UI feedback: highlight "Other" tab
    };
  }
}

/**
 * DROP_RULES: Type-to-handler mapping
 *
 * Each handler is a pure function: (actor, item) => { mutationPlan, uiTargetTab } | null
 * Handlers check for duplicates and return null for skip, or { mutationPlan, uiTargetTab } for create.
 */

function handleTalent(actor, item) {
  // Talents are unique per name (no duplicates)
  const exists = actor.items.some(i => i.type === 'talent' && i.name === item.name);
  if (exists) {
    console.debug(`Drop skipped: talent "${item.name}" already exists`);
    return null;
  }

  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'talents'  // Highlight talents tab
  };
}

function handleFeat(actor, item) {
  // Feats are unique unless flagged repeatable
  const repeatable = item.system?.repeatable === true;

  if (!repeatable) {
    const exists = actor.items.some(i => i.type === 'feat' && i.name === item.name);
    if (exists) {
      console.debug(`Drop skipped: feat "${item.name}" already exists (non-repeatable)`);
      return null;
    }
  }

  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'talents'  // Highlight talents tab (feats usually on talents tab)
  };
}

function handleWeapon(actor, item) {
  // Weapons allow multiples (separate entries)
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'combat'  // Highlight combat tab
  };
}

function handleArmor(actor, item) {
  // Armor allows multiples (separate entries)
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'  // Highlight inventory tab
  };
}

function handleGear(actor, item) {
  // Gear is stack-aware
  if (item.system?.stackable) {
    // Find existing gear by name
    const existing = actor.items.find(
      i => i.type === 'gear' && i.name === item.name
    );

    if (existing) {
      // Increment quantity instead of creating new
      return {
        mutationPlan: {
          updateEmbedded: [
            {
              _id: existing.id,
              update: {
                'system.quantity': (existing.system?.quantity ?? 1) + 1
              }
            }
          ]
        },
        uiTargetTab: 'inventory'  // Highlight inventory tab
      };
    }
  }

  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'  // Highlight inventory tab
  };
}

function handleEnergyShield(actor, item) {
  // Energy shields create separate entries (only one is active)
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'  // Highlight inventory tab
  };
}

function handleForcePower(actor, item) {
  // Force powers are always allowed as separate entries (never blocked)
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'force'  // Highlight force tab
  };
}

function handleClassFeature(actor, item) {
  // Class features are internal-only, not droppable
  console.debug(`Drop rejected: class features are not droppable`);
  return null;
}

function handleEquipment(actor, item) {
  // Equipment (generic) goes to inventory
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'  // Highlight inventory tab
  };
}

/**
 * Shared helper: create item mutation with embedded format
 *
 * @private
 * @param {Item} item
 * @returns {Object} mutationPlan with createEmbedded
 */
function _createItemMutation(item) {
  return {
    createEmbedded: [
      {
        type: 'Item',
        data: item.toObject()
      }
    ]
  };
}

/**
 * DROP_RULES mapping
 *
 * Associates item type → handler function
 * Returns { mutationPlan, uiTargetTab } or null
 */
const DROP_RULES = {
  talent: handleTalent,
  feat: handleFeat,
  weapon: handleWeapon,
  armor: handleArmor,
  gear: handleGear,
  energyShield: handleEnergyShield,
  forcePower: handleForcePower,
  classFeature: handleClassFeature,
  equipment: handleEquipment
};
