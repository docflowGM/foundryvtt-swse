/**
 * NaturalWeaponHandler.js
 *
 * Generates and manages embedded weapon items for natural weapons granted by species.
 *
 * Responsibilities:
 * - Create embedded weapon items from naturalWeapon rule specs
 * - Apply proper flags for tracking and cleanup
 * - Remove generated weapons on species change
 * - Ensure weapons integrate with attack system
 */

import { swseLogger } from '../../../utils/logger.js';

export class NaturalWeaponHandler {
  /**
   * Generate embedded weapon items for natural weapons
   * @param {Actor} actor - The actor to add weapons to
   * @param {Array} weaponSpecs - Array of natural weapon specifications
   * @param {string} speciesId - The species ID for tracking
   * @returns {Promise<Array>} Array of created item UUIDs
   */
  static async generateNaturalWeapons(actor, weaponSpecs, speciesId) {
    if (!actor || !Array.isArray(weaponSpecs) || weaponSpecs.length === 0) {
      return [];
    }

    const createdIds = [];

    try {
      // First, remove any existing natural weapons from this species
      await this._removeNaturalWeapons(actor, speciesId);

      // Create new weapons
      for (const spec of weaponSpecs) {
        try {
          const itemData = this._buildWeaponItemData(spec, speciesId);
          const item = await actor.createEmbeddedDocuments('Item', [itemData]);

          if (item && item.length > 0) {
            createdIds.push(item[0].id);
            swseLogger.debug(`[NaturalWeaponHandler] Created natural weapon: ${spec.name} (${item[0].id})`);
          }
        } catch (err) {
          swseLogger.warn(
            `[NaturalWeaponHandler] Failed to create natural weapon ${spec.name}:`,
            err
          );
        }
      }
    } catch (err) {
      swseLogger.error('[NaturalWeaponHandler] Error generating natural weapons:', err);
    }

    return createdIds;
  }

  /**
   * Remove all natural weapons generated from a species
   * @param {Actor} actor
   * @param {string} speciesId - Remove weapons from this species (or all if null)
   * @returns {Promise<Array>} Array of removed item IDs
   */
  static async removeNaturalWeapons(actor, speciesId = null) {
    if (!actor?.items) {
      return [];
    }

    const toRemove = [];

    // Find all items with naturalWeapon flag
    for (const item of actor.items) {
      const flags = item.flags?.swse || {};

      // Check if this is a generated natural weapon
      if (flags.generatedBy !== 'species' || !flags.naturalWeapon) {
        continue;
      }

      // If speciesId provided, only remove from that species
      if (speciesId && flags.speciesId !== speciesId) {
        continue;
      }

      toRemove.push(item.id);
    }

    // Remove items
    if (toRemove.length > 0) {
      try {
        await actor.deleteEmbeddedDocuments('Item', toRemove);
        swseLogger.debug(
          `[NaturalWeaponHandler] Removed ${toRemove.length} natural weapons for species ${speciesId}`
        );
      } catch (err) {
        swseLogger.warn('[NaturalWeaponHandler] Error removing natural weapons:', err);
      }
    }

    return toRemove;
  }

  /**
   * Build Foundry item data for a natural weapon
   * @private
   */
  static _buildWeaponItemData(spec, speciesId) {
    const itemData = {
      name: spec.name || 'Natural Weapon',
      type: 'weapon',
      system: {
        // Basic weapon properties
        proficiency: 'natural', // Always proficient
        rarity: 'natural',

        // Damage
        damage: {
          formula: spec.damage?.formula || '1d4',
          type: spec.damage?.damageType || 'slashing'
        },

        // Critical hit
        critical: {
          range: spec.critical?.range || 20,
          multiplier: spec.critical?.multiplier || 2
        },

        // Combat traits
        properties: this._buildProperties(spec.traits),

        // Attack ability (str, dex, auto)
        attackAbility: spec.attackAbility || 'str',

        // Category
        category: spec.weaponCategory || 'melee'
      },

      // Flags for tracking and cleanup
      flags: {
        swse: {
          generatedBy: 'species',
          speciesId: speciesId,
          ruleId: spec.ruleId,
          traitId: spec.traitId,
          naturalWeapon: true,
          alwaysArmed: spec.traits?.alwaysArmed || true,
          countsAsWeapon: spec.traits?.countsAsWeapon || true
        }
      }
    };

    // Apply scaling if present
    if (spec.scaling?.bySize && spec.scaling.sizeTable) {
      itemData.system.scaling = spec.scaling;
    }

    // Use custom item data if provided
    if (spec.generatedItemData && typeof spec.generatedItemData === 'object') {
      return { ...itemData, ...spec.generatedItemData };
    }

    return itemData;
  }

  /**
   * Build weapon properties array from traits
   * @private
   */
  static _buildProperties(traits) {
    const properties = ['natural']; // All natural weapons have this tag

    if (traits?.finesse) {
      properties.push('finesse');
    }

    if (traits?.light) {
      properties.push('light');
    }

    if (traits?.twoHanded) {
      properties.push('two-handed');
    }

    return properties;
  }

  /**
   * Private helper to remove natural weapons
   * @private
   */
  static async _removeNaturalWeapons(actor, speciesId) {
    return this.removeNaturalWeapons(actor, speciesId);
  }

  /**
   * Check if an actor has natural weapons from a species
   * @param {Actor} actor
   * @param {string} speciesId
   * @returns {Array} Array of natural weapon items
   */
  static getNaturalWeapons(actor, speciesId = null) {
    if (!actor?.items) {
      return [];
    }

    return actor.items.filter(item => {
      const flags = item.flags?.swse || {};

      if (flags.generatedBy !== 'species' || !flags.naturalWeapon) {
        return false;
      }

      if (speciesId && flags.speciesId !== speciesId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if an item is a generated natural weapon
   * @param {Item} item
   * @returns {boolean}
   */
  static isGeneratedNaturalWeapon(item) {
    const flags = item?.flags?.swse || {};
    return flags.generatedBy === 'species' && flags.naturalWeapon === true;
  }
}

export default NaturalWeaponHandler;
