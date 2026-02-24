/**
 * VehicleDropEngine
 *
 * PHASE 3: Vehicle-specific drop classification (NOT generic DropResolutionEngine).
 *
 * Responsibility:
 * - Accept drop data on vehicle sheet
 * - Route by document type and item type
 * - Classify by vehicle domain (armament, cargo, crew, hangar)
 * - Build declarative mutationPlan
 * - Include UI target tab for post-drop feedback
 * - Return plan + tab only (no mutations)
 *
 * Architecture:
 * - Vehicle-only (separate from character/NPC/droid drops)
 * - Type-aware (vehicleWeapon vs equipment vs actor vs vehicle)
 * - Domain-enforced (armament ≠ cargo ≠ crew ≠ hangar)
 * - Sovereign (returns data only, never mutates)
 * - UI-informed (includes uiTargetTab for tab highlighting)
 *
 * Usage:
 *   const result = await VehicleDropEngine.resolve({ actor, dropData });
 *   if (result) {
 *     await ActorEngine.apply(actor, result.mutationPlan);
 *     sheet._pulseTab(result.uiTargetTab);  // UI feedback
 *   }
 *
 * Domain Separation:
 * - VehicleWeapon → armament system (combat tab)
 * - Equipment/other items → cargo (inventory tab)
 * - Actor (NPC/character/droid) → crew (crew tab)
 * - Vehicle → hangar/wing (hangar tab - future)
 */

export class VehicleDropEngine {
  /**
   * Main entry point: resolve vehicle drop to mutationPlan + UI feedback
   *
   * @param {Object} config
   * @param {Actor} config.actor - target vehicle actor
   * @param {Object} config.dropData - drag event data
   * @returns {Promise<Object|null>} { mutationPlan, uiTargetTab } or null if invalid/duplicate
   */
  static async resolve({ actor, dropData }) {
    if (!actor || actor.type !== 'vehicle') {
      console.warn('VehicleDropEngine.resolve: actor must be a vehicle');
      return null;
    }

    if (!dropData?.type) {
      console.warn('VehicleDropEngine.resolve: invalid dropData');
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
      console.error('VehicleDropEngine.resolve failed:', err);
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
      console.warn('VehicleDropEngine._normalizeDrop failed:', err);
      return null;
    }
  }

  /**
   * Route item drop to domain-specific handler
   *
   * Routing:
   * - vehicleWeapon → armament system
   * - vehicleWeaponRange → armament system
   * - other items → cargo
   *
   * @private
   * @param {Actor} actor - vehicle actor
   * @param {Item} item
   * @returns {Object|null} mutationPlan or null
   */
  static _handleItemDrop(actor, item) {
    const itemType = item.type;

    // ARMAMENT SYSTEM: Vehicle-specific weapons
    if (itemType === 'vehicleWeapon' || itemType === 'vehicleWeaponRange') {
      return this._addWeapon(actor, item);
    }

    // CARGO SYSTEM: Everything else (equipment, other items)
    return this._addCargo(actor, item);
  }

  /**
   * Handle vehicle-to-vehicle drop: add to hangar/wing
   *
   * @private
   * @param {Actor} vehicle - target vehicle
   * @param {Actor} droppedVehicle - dropped vehicle
   * @returns {Object|null} mutationPlan or null
   */
  static _handleActorDrop(vehicle, droppedActor) {
    // Only accept actor drops for crew assignment
    // Crew must be: character, npc, or droid
    // Do NOT accept vehicle-to-vehicle transfers (hangar logic not implemented)
    if (droppedActor.type === 'vehicle') {
      console.debug('Drop rejected: vehicle-to-vehicle transfers not supported');
      return null;
    }

    // Reject self-drop
    if (droppedActor.id === vehicle.id) {
      console.debug('Drop rejected: cannot drop actor onto itself');
      return null;
    }

    // Route to crew assignment
    return this._assignCrew(vehicle, droppedActor);
  }

  /**
   * ARMAMENT SYSTEM: Add weapon to vehicle armament
   *
   * Rules:
   * - All vehicle weapons create separate entries (not stacked)
   * - No duplicate checking (multiple same weapons allowed)
   * - Stored as embedded items with type: vehicleWeapon
   *
   * @private
   * @param {Actor} vehicle
   * @param {Item} weapon
   * @returns {Object} mutationPlan
   */
  static _addWeapon(vehicle, weapon) {
    return {
      mutationPlan: {
        createEmbedded: [
          {
            type: 'Item',
            data: weapon.toObject()
          }
        ]
      },
      uiTargetTab: 'armament'  // Highlight armament tab
    };
  }

  /**
   * CARGO SYSTEM: Add item to vehicle cargo
   *
   * Rules:
   * - Equipment and other items are cargo
   * - Stack if item is stackable (equipment)
   * - Otherwise create separate entry
   * - Capacity checking is display/UI only (no blocking)
   *
   * @private
   * @param {Actor} vehicle
   * @param {Item} item
   * @returns {Object|null} mutationPlan or null
   */
  static _addCargo(vehicle, item) {
    // Reject non-stackable weapons/armor/combat items being added as cargo
    if (['weapon', 'armor', 'forcePower'].includes(item.type)) {
      console.debug(`Drop rejected: ${item.type} not allowed in cargo (use armament or crew)`);
      return null;
    }

    // Check if item is stackable (equipment, gear, etc.)
    if (item.system?.stackable) {
      // Find existing cargo by name
      const existing = vehicle.items.find(
        i => i.type === item.type && i.name === item.name
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
          uiTargetTab: 'cargo'  // Highlight cargo tab
        };
      }
    }

    // Create new cargo entry
    return {
      mutationPlan: {
        createEmbedded: [
          {
            type: 'Item',
            data: item.toObject()
          }
        ]
      },
      uiTargetTab: 'cargo'  // Highlight cargo tab
    };
  }

  /**
   * CREW SYSTEM: Assign actor to vehicle crew
   *
   * Rules:
   * - Actor (character, NPC, droid) can be crew
   * - Crew stored as linked reference (UUID only)
   * - No duplicate crew assignments (silent skip if already aboard)
   * - No cross-mutation of dropped actor
   * - Position assignment is manual (sheet UI only)
   *
   * Current implementation: Store as crew array reference
   * Future: Position validation schema (captain, pilot, gunner, etc.)
   *
   * @private
   * @param {Actor} vehicle
   * @param {Actor} actor
   * @returns {Object|null} mutationPlan or null
   */
  static _assignCrew(vehicle, actor) {
    // Check if actor is already crew
    const crew = vehicle.system?.crew ?? [];
    const alreadyCrew = crew.some(c => c.uuid === actor.uuid);
    if (alreadyCrew) {
      console.debug(`Drop skipped: ${actor.name} already assigned to crew`);
      return null;
    }

    // Build crew reference (UUID only, no embedding)
    const crewMember = {
      uuid: actor.uuid,
      name: actor.name,
      type: actor.type
      // position: null  // To be set via sheet UI
    };

    return {
      mutationPlan: {
        update: {
          'system.crew': [...crew, crewMember]
        }
      },
      uiTargetTab: 'crew'  // Highlight crew tab
    };
  }
}
