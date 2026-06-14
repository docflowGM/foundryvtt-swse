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

import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

export class DropResolutionEngine {
  static _recentDropKeys = new Map();

  /**
   * Suppress rapid duplicate drops (e.g. double-fire on some browsers).
   * Keyed by actor id + item uuid; entries expire after 1 second.
   */
  static _isDuplicateDropEvent(actor, dropData, normalized) {
    const key = `${actor?.id}::${normalized?.document?.uuid ?? dropData?.uuid ?? dropData?.id ?? '?'}`;
    const now = Date.now();
    // Prune stale entries
    for (const [k, t] of this._recentDropKeys) {
      if (now - t > 1000) this._recentDropKeys.delete(k);
    }
    if (this._recentDropKeys.has(key)) return true;
    this._recentDropKeys.set(key, now);
    return false;
  }

  /**
   * Main entry point: resolve drop to mutationPlan + UI feedback
   *
   * @param {Object} config
   * @param {Actor} config.actor - target actor
   * @param {Object} config.dropData - drag event data
   * @returns {Promise<Object|null>} { mutationPlan, uiTargetTab } or null if invalid/duplicate
   */
  static async resolve({ actor, dropData, acquisition = null } = {}) {
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

      if (this._isDuplicateDropEvent(actor, dropData, normalized)) {
        console.debug('DropResolutionEngine.resolve: duplicate drop event suppressed');
        return null;
      }

      // Route by document type
      if (normalized.type === 'Item') {
        return this._handleItemDrop(actor, normalized.document, { acquisition });
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
   * Public helper for sheet-level drop intercepts that need to inspect the
   * dropped document before resolving the final mutation plan.
   *
   * @param {Object} dropData
   * @returns {Promise<Document|null>}
   */
  static async resolveDroppedDocument(dropData) {
    const normalized = await this._normalizeDrop(dropData);
    return normalized?.document || null;
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
  static _handleItemDrop(actor, item, context = {}) {
    const itemType = item.type;

    // Route to handler by type
    const handler = DROP_RULES[itemType];
    if (!handler) {
      console.warn(`No drop handler for item type: ${itemType}`);
      return null;
    }

    return handler(actor, item, context);
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

function handleTalent(actor, item, context = {}) {
  // Talents are unique per name (no duplicates)
  const exists = actor.items.some(i => i.type === 'talent' && i.name === item.name);
  if (exists) {
    console.debug(`Drop skipped: talent "${item.name}" already exists`);
    return null;
  }

  return {
    mutationPlan: _createItemMutation(item, context.acquisition),
    uiTargetTab: 'talents'  // Highlight talents tab
  };
}

function handleFeat(actor, item, context = {}) {
  // Feats are unique unless flagged repeatable
  const repeatable = item.system?.repeatable === true;

  if (!repeatable) {
    const exists = ActorAbilityBridge.hasFeat(actor, item.name);
    if (exists) {
      console.debug(`Drop skipped: feat "${item.name}" already exists (non-repeatable)`);
      return null;
    }
  }

  return {
    mutationPlan: _createItemMutation(item, context.acquisition),
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

function _displayName(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return String(value.name ?? value.label ?? value.id ?? '').trim();
}

function _normalizeKey(value) {
  return _displayName(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function handleLanguage(actor, item) {
  const langName = item.name ?? item.system?.name ?? item.system?.label ?? '';
  if (!langName) return null;

  // Known languages live on actor.system.languages. Dropping a language should
  // update that known-language list, not create an inert inventory item.
  const existing = Array.isArray(actor.system?.languages) ? actor.system.languages : [];
  const alreadyKnown = existing.some(l => _normalizeKey(l) === _normalizeKey(langName));
  if (alreadyKnown) {
    console.debug(`Drop skipped: language "${langName}" already known`);
    return null;
  }

  return {
    mutationPlan: {
      update: {
        'system.languages': [...existing.map(_displayName).filter(Boolean), langName]
      }
    },
    uiTargetTab: 'overview'
  };
}

function handleWeaponUpgrade(actor, item) {
  // Lightsaber crystals, accessories, and other weapon upgrades go to inventory
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'
  };
}

function handleEquipment(actor, item) {
  // Equipment (generic) goes to inventory
  return {
    mutationPlan: _createItemMutation(item),
    uiTargetTab: 'inventory'  // Highlight inventory tab
  };
}

/**
 * Handle species drop: overwrite actor's race/species.
 * Sets system.race to the dropped species name and stores the pack ID as a flag.
 */
function handleSpecies(actor, item) {
  const speciesName = item.name ?? item.system?.canonicalName ?? '';
  if (!speciesName) {
    console.warn('Drop rejected: species item has no name');
    return null;
  }

  return {
    mutationPlan: {
      update: {
        'system.race': speciesName,
        'system.species': speciesName,
        'system.speciesCustomName': '',
        'flags.foundryvtt-swse.species.id': item.id ?? item._id ?? null,
        'flags.foundryvtt-swse.species.name': speciesName,
        'flags.foundryvtt-swse.species.img': item.img ?? null,
      }
    },
    uiTargetTab: 'overview'
  };
}

/**
 * Handle class drop: add 1 level of the dropped class to the actor.
 * - If the actor already has that class item, increments its system.level.
 * - If not, creates a new class item at level 1.
 * - Increments system.level and updates system.progression.classLevels.
 */
function handleClass(actor, item) {
  const className = item.name ?? item.system?.class_name ?? item.system?.name ?? '';
  const classKey = _normalizeKey(className);
  const classId = _normalizeKey(item.system?.classId ?? item.system?.id ?? className) || classKey;
  if (!className) {
    console.warn('Drop rejected: class item has no name');
    return null;
  }

  const existingClassLevels = Array.isArray(actor.system?.progression?.classLevels)
    ? actor.system.progression.classLevels
    : [];
  const matchingProgressionEntries = existingClassLevels.filter(entry =>
    _normalizeKey(entry?.class) === classKey || _normalizeKey(entry?.classId) === classId
  );
  const existingProgressionEntry = matchingProgressionEntries[0] ?? null;

  const currentLevel = Math.max(
    Number(actor.system?.level ?? 0) || 0,
    existingClassLevels.reduce((sum, entry) => sum + (Number(entry?.level ?? 0) || 0), 0),
    1
  );
  const newLevel = currentLevel + 1;

  // Find existing class item on the actor by stable semantic identity. Do not
  // key primarily on dropped compendium document IDs; they differ from owned IDs
  // and can create duplicate "Jedi 3 / Jedi 4" style tracks.
  const existingClassItem = actor.items.find(i =>
    i.type === 'class' && (
      _normalizeKey(i.system?.classId) === classId ||
      _normalizeKey(i.name) === classKey
    )
  );

  const existingClassLevel = Math.max(
    Number(existingClassItem?.system?.level ?? 0) || 0,
    ...matchingProgressionEntries.map(entry => Number(entry?.level ?? 0) || 0),
    0
  );
  const newClassLevel = existingClassLevel + 1;

  const updatedClassLevels = (() => {
    const replacement = {
      ...(existingProgressionEntry ?? {}),
      class: existingProgressionEntry?.class || className,
      classId: existingProgressionEntry?.classId || classId,
      level: newClassLevel
    };
    const rows = [];
    let inserted = false;
    for (const entry of existingClassLevels) {
      const matches = _normalizeKey(entry?.class) === classKey || _normalizeKey(entry?.classId) === classId;
      if (!matches) {
        rows.push(entry);
        continue;
      }
      // Collapse duplicate rows for the same class into one canonical row.
      if (!inserted) {
        rows.push(replacement);
        inserted = true;
      }
    }
    if (!inserted) rows.push(replacement);
    return rows;
  })();

  const mutationPlan = {
    update: {
      'system.level': newLevel,
      'system.progression.classLevels': updatedClassLevels,
      'system.progression.lastLeveledClass': {
        characterLevel: newLevel,
        classId,
        className,
        classLevel: newClassLevel,
        timestamp: new Date().toISOString()
      }
    }
  };

  if (existingClassItem) {
    mutationPlan.updateEmbedded = [{
      _id: existingClassItem.id,
      update: {
        'system.level': newClassLevel,
        'system.classId': existingClassItem.system?.classId || classId
      }
    }];
  } else {
    const source = item.toObject?.() ?? item;
    mutationPlan.createEmbedded = [{
      type: 'Item',
      data: {
        ...source,
        system: {
          ...(source.system ?? {}),
          level: 1,
          classId
        }
      }
    }];
  }

  return {
    mutationPlan,
    uiTargetTab: 'overview'
  };
}

/**
 * Shared helper: create item mutation with embedded format
 *
 * @private
 * @param {Item} item
 * @returns {Object} mutationPlan with createEmbedded
 */
function _createItemMutation(item, acquisition = null) {
  const data = item.toObject?.() ?? foundry.utils.deepClone(item);

  if (acquisition && typeof acquisition === 'object') {
    data.system = { ...(data.system ?? {}) };
    data.system.acquisition = {
      ...(data.system.acquisition ?? {}),
      ...acquisition
    };

    data.flags = foundry.utils.mergeObject(data.flags ?? {}, {
      'foundryvtt-swse': {
        acquisition: data.system.acquisition
      }
    }, { inplace: false, insertKeys: true, overwrite: true });
  }

  return {
    createEmbedded: [
      {
        type: 'Item',
        data
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
  // Core item types
  talent: handleTalent,
  feat: handleFeat,
  weapon: handleWeapon,
  armor: handleArmor,
  gear: handleGear,
  energyShield: handleEnergyShield,
  equipment: handleEquipment,
  weaponUpgrade: handleWeaponUpgrade,
  // Force
  forcePower: handleForcePower,       // legacy camelCase key (kept for safety)
  'force-power': handleForcePower,    // actual pack type
  'force-regimen': handleForcePower,  // treat regimens same as powers
  // Language
  language: handleLanguage,
  // Identity
  species: handleSpecies,
  class: handleClass,
  // Internal — not droppable
  classFeature: handleClassFeature,
  'class-feature': handleClassFeature,
};
