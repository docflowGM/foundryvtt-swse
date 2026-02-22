/**
 * DroidEngine
 *
 * PHASE 6B-2: Atomic Configuration Planning for Droid Sheet
 *
 * Contract:
 * - All droid configuration changes route through buildConfigurationPlan()
 * - Plan is pure computation (no mutations)
 * - ActorEngine.updateActor() applies plan atomically (1 transaction per UI action)
 * - Derived recalculation (hardpoints, credits, etc.) computed inline
 * - No direct actor.update() from sheets
 *
 * Descriptor Types:
 * - { type: "update-field", field: "system.droidSystems.degree", value: "..." }
 * - { type: "update-field", field: "system.droidSystems.size", value: "..." }
 * - { type: "update-field", field: "system.droidSystems.locomotion.id", value: "..." }
 * - { type: "update-field", field: "system.droidSystems.processor.id", value: "..." }
 * - { type: "update-field", field: "system.droidSystems.armor.id", value: "..." }
 * - { type: "update-field", field: "system.droidSystems.credits.total", value: ... }
 * - { type: "update-field", field: "system.droidSystems.credits.spent", value: ... }
 * - { type: "toggle-mod", modIndex: number, enabled: boolean }
 * - { type: "remove-mod", modIndex: number }
 * - { type: "add-mod" } (creates new mod)
 * - { type: "remove-appendage", appendageIndex: number }
 * - { type: "add-appendage" } (creates new appendage)
 * - { type: "remove-sensor", sensorIndex: number }
 * - { type: "add-sensor" } (creates new sensor)
 * - { type: "remove-weapon", weaponIndex: number }
 * - { type: "add-weapon" } (creates new weapon)
 * - { type: "remove-accessory", accessoryIndex: number }
 * - { type: "add-accessory" } (creates new accessory)
 */

import { swseLogger } from '../utils/logger.js';

export const DroidEngine = {
  /**
   * buildConfigurationPlan()
   *
   * Pure computation phase: clone → apply descriptor → recalc dependent fields
   *
   * @param {Actor} actor - target droid actor
   * @param {Object} descriptor - configuration change descriptor
   * @returns {Object} plan = { actor, updateData: {...} } ready for ActorEngine.updateActor()
   * @throws if descriptor invalid or recalculation fails
   */
  buildConfigurationPlan(actor, descriptor) {
    if (!actor) {
      throw new Error('buildConfigurationPlan() requires actor');
    }
    if (!descriptor || typeof descriptor !== 'object') {
      throw new Error('buildConfigurationPlan() requires descriptor object');
    }

    swseLogger.debug(`DroidEngine.buildConfigurationPlan → ${actor.name}`, {
      descriptorType: descriptor.type
    });

    // ========================================
    // PHASE 1: Clone current droid state
    // ========================================
    const draft = structuredClone(actor.system);
    const droidSystems = draft.droidSystems ??= {};

    try {
      // ========================================
      // PHASE 2: Apply descriptor
      // ========================================
      switch (descriptor.type) {
        case 'update-field': {
          // Generic field update (degree, size, locomotion.id, etc.)
          this._setProperty(droidSystems, descriptor.field, descriptor.value);
          break;
        }

        case 'toggle-mod': {
          // Toggle modification enabled state
          const mods = droidSystems.mods ??= [];
          const idx = descriptor.modIndex;
          if (idx < 0 || idx >= mods.length) {
            throw new Error(`Invalid mod index: ${idx}`);
          }
          mods[idx].enabled = descriptor.enabled ?? !(mods[idx].enabled !== false);
          break;
        }

        case 'remove-mod': {
          // Remove modification by index
          const mods = droidSystems.mods ??= [];
          const idx = descriptor.modIndex;
          if (idx < 0 || idx >= mods.length) {
            throw new Error(`Invalid mod index: ${idx}`);
          }
          mods.splice(idx, 1);
          break;
        }

        case 'add-mod': {
          // Add new modification
          const mods = droidSystems.mods ??= [];
          const newMod = {
            id: `mod_${Date.now()}`,
            name: 'New Modification',
            modifiers: [],
            hardpointsRequired: 1,
            costInCredits: 0,
            enabled: true
          };
          mods.push(newMod);
          break;
        }

        case 'remove-appendage': {
          // Remove appendage by index
          const appendages = droidSystems.appendages ??= [];
          const idx = descriptor.appendageIndex;
          if (idx < 0 || idx >= appendages.length) {
            throw new Error(`Invalid appendage index: ${idx}`);
          }
          appendages.splice(idx, 1);
          break;
        }

        case 'add-appendage': {
          // Add new appendage
          const appendages = droidSystems.appendages ??= [];
          appendages.push({
            id: `app_${Date.now()}`,
            name: 'New Appendage'
          });
          break;
        }

        case 'remove-sensor': {
          // Remove sensor by index
          const sensors = droidSystems.sensors ??= [];
          const idx = descriptor.sensorIndex;
          if (idx < 0 || idx >= sensors.length) {
            throw new Error(`Invalid sensor index: ${idx}`);
          }
          sensors.splice(idx, 1);
          break;
        }

        case 'add-sensor': {
          // Add new sensor
          const sensors = droidSystems.sensors ??= [];
          sensors.push({
            id: `sensor_${Date.now()}`,
            name: 'New Sensor'
          });
          break;
        }

        case 'remove-weapon': {
          // Remove weapon by index
          const weapons = droidSystems.weapons ??= [];
          const idx = descriptor.weaponIndex;
          if (idx < 0 || idx >= weapons.length) {
            throw new Error(`Invalid weapon index: ${idx}`);
          }
          weapons.splice(idx, 1);
          break;
        }

        case 'add-weapon': {
          // Add new weapon
          const weapons = droidSystems.weapons ??= [];
          weapons.push({
            id: `weapon_${Date.now()}`,
            name: 'New Weapon',
            quantity: 1
          });
          break;
        }

        case 'remove-accessory': {
          // Remove accessory by index
          const accessories = droidSystems.accessories ??= [];
          const idx = descriptor.accessoryIndex;
          if (idx < 0 || idx >= accessories.length) {
            throw new Error(`Invalid accessory index: ${idx}`);
          }
          accessories.splice(idx, 1);
          break;
        }

        case 'add-accessory': {
          // Add new accessory
          const accessories = droidSystems.accessories ??= [];
          accessories.push({
            id: `acc_${Date.now()}`,
            name: 'New Accessory'
          });
          break;
        }

        default:
          throw new Error(`Unknown descriptor type: ${descriptor.type}`);
      }

      // ========================================
      // PHASE 3: Recalculate derived fields
      // ========================================
      this._recalculateDerived(droidSystems);

      // ========================================
      // PHASE 4: Return plan (no mutation yet)
      // ========================================
      return {
        actor,
        updateData: {
          system: draft
        }
      };

    } catch (err) {
      swseLogger.error(`DroidEngine.buildConfigurationPlan failed for ${actor.name}`, {
        error: err,
        descriptor
      });
      throw err;
    }
  },

  /**
   * _setProperty()
   *
   * Helper to set nested property by dot-notation path.
   * Only handles system.droidSystems.* paths.
   *
   * @param {Object} droidSystems - root droidSystems object
   * @param {string} field - dot-notation path (system.droidSystems.X.Y.Z stripped to X.Y.Z)
   * @param {*} value - value to set
   */
  _setProperty(droidSystems, field, value) {
    // Strip "system.droidSystems." prefix if present
    let path = field;
    if (path.startsWith('system.droidSystems.')) {
      path = path.substring('system.droidSystems.'.length);
    }

    const keys = path.split('.');
    let obj = droidSystems;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj)) {
        obj[key] = {};
      }
      obj = obj[key];
    }

    obj[keys[keys.length - 1]] = value;
  },

  /**
   * _recalculateDerived()
   *
   * Recompute all dependent fields based on configuration changes:
   * - size → HP max (if droid actor uses this)
   * - armor → defense (if applicable)
   * - processor → skill caps (if applicable)
   * - appendages → available slots
   * - mods (enabled count) → hardpoint usage
   * - credits.spent → derived remaining
   *
   * Pure computation only. No mutations.
   *
   * @param {Object} droidSystems - draft droidSystems to recalculate
   */
  _recalculateDerived(droidSystems) {
    // Ensure credits object
    const credits = droidSystems.credits ??= {
      total: 0,
      spent: 0
    };

    // Validate credits
    if (typeof credits.total !== 'number') {
      credits.total = Number(credits.total) || 0;
    }
    if (typeof credits.spent !== 'number') {
      credits.spent = Number(credits.spent) || 0;
    }

    // Clamp spent to total
    if (credits.spent > credits.total) {
      swseLogger.warn(`Droid credits spent (${credits.spent}) exceeds total (${credits.total}). Clamping.`);
      credits.spent = credits.total;
    }

    // Compute remaining
    credits.remaining = credits.total - credits.spent;

    // Future: Add more derived calculations as droid HP, defense, etc. are defined
    // - size → HP max logic
    // - armor → defense logic
    // - processor → skill caps logic
  }
};
