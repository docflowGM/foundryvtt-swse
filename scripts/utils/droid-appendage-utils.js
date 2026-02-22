/**
 * Droid Appendage Utilities
 * Handles generation of unarmed attacks and other appendage-related functionality
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */

import { DROID_SYSTEMS } from '../data/droid-systems.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

export class DroidAppendageUtils {
  /**
   * Generate an unarmed attack item for a droid appendage
   * @param {Object} appendage - The appendage data
   * @param {string} droidSize - The droid size category
   * @param {Object} droidActor - The droid actor (optional, for actor integration)
   * @returns {Object} - Unarmed attack item data
   */
  static generateUnarmedAttack(appendage, droidSize, droidActor = null) {
    // Don't create attacks for appendages that can't attack
    if (!appendage.createsUnarmedAttack) {
      return null;
    }

    const damageType = appendage.damageType || 'hand';
    const damageTable = DROID_SYSTEMS.unarmedDamageTable[damageType];

    if (!damageTable) {
      console.warn(`No damage table found for appendage type: ${damageType}`);
      return null;
    }

    const sizeDice = damageTable[droidSize];
    if (!sizeDice) {
      return null;  // This size/appendage combination can't attack
    }

    const attackName = `${appendage.name} Attack`;

    return {
      name: attackName,
      type: 'unarmedAttack',
      system: {
        description: `Unarmed attack using ${appendage.name}`,
        baseUnarmedDamage: sizeDice,
        appendageType: damageType,
        appendageId: appendage.id,
        droidSize: droidSize,
        attackType: 'melee',
        simpleWeapon: true
      },
      flags: {
        'foundryvtt-swse': {
          isAppendageUnarmedAttack: true,
          appendageType: damageType,
          appendageId: appendage.id
        }
      }
    };
  }

  /**
   * Get all valid unarmed attacks for a droid based on its appendages and size
   * @param {Array} appendages - Array of appendage objects from droid creation
   * @param {string} droidSize - The droid size category
   * @returns {Array} - Array of unarmed attack item data
   */
  static getAllUnarmedAttacks(appendages, droidSize) {
    const attacks = [];

    for (const appendageRef of appendages) {
      // Find the appendage definition
      const appendageDef = DROID_SYSTEMS.appendages.find(a => a.id === appendageRef.id);
      if (!appendageDef) {continue;}

      // Generate unarmed attack if applicable
      const attack = this.generateUnarmedAttack(appendageDef, droidSize);
      if (attack) {
        // Make attack name unique if multiple of same type
        const sameTypeCount = attacks.filter(a =>
          a.system.appendageType === attack.system.appendageType
        ).length;
        if (sameTypeCount > 0) {
          attack.name = `${attack.name} ${sameTypeCount + 1}`;
        }
        attacks.push(attack);
      }
    }

    return attacks;
  }

  /**
   * Create actual item objects for droid appendage attacks
   * Used when finalizing droid creation or updating appendages
   * PHASE 7: Batched through ActorEngine for atomic governance
   * @param {Object} actor - The droid actor
   * @param {Array} appendages - Array of appendage references
   * @param {string} droidSize - The droid size
   */
  static async createAppendageAttackItems(actor, appendages, droidSize) {
    if (!actor) {return;}

    const attacks = this.getAllUnarmedAttacks(appendages, droidSize);

    // Filter out duplicates and batch create
    const toCreate = [];
    for (const attackData of attacks) {
      // Don't create duplicate attacks
      const existing = actor.items.find(item =>
        item.flags?.['foundryvtt-swse']?.isAppendageUnarmedAttack &&
        item.system?.appendageId === attackData.system.appendageId
      );

      if (!existing) {
        toCreate.push(attackData);
      }
    }

    // Batch create all new attacks in single transaction
    if (toCreate.length > 0) {
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
    }
  }

  /**
   * Get damage dice for an appendage at a specific size
   * @param {string} appendageId - The appendage ID
   * @param {string} droidSize - The droid size category
   * @returns {string|null} - Damage dice string (e.g., "1d4", "2d6") or null
   */
  static getUnarmedDamage(appendageId, droidSize) {
    const damageType = DROID_SYSTEMS.appendages.find(a => a.id === appendageId)?.damageType || appendageId;
    const damageTable = DROID_SYSTEMS.unarmedDamageTable[damageType];

    if (!damageTable) {return null;}
    return damageTable[droidSize] || null;
  }

  /**
   * Get all compatible enhancements for an appendage
   * @param {string} appendageId - The appendage ID
   * @returns {Array} - Array of compatible enhancement definitions
   */
  static getAppendageEnhancements(appendageId) {
    return DROID_SYSTEMS.appendageEnhancements.filter(enhancement => {
      if (!enhancement.requiresAppendage) {return false;}
      const required = Array.isArray(enhancement.requiresAppendage)
        ? enhancement.requiresAppendage
        : [enhancement.requiresAppendage];
      return required.includes(appendageId) || required.includes('any');
    });
  }

  /**
   * Calculate appendage cost using formula or flat cost
   * @param {Object} appendage - The appendage definition
   * @param {number} costFactor - The droid cost factor
   * @returns {number} - Total cost in credits
   */
  static calculateAppendageCost(appendage, costFactor = 1) {
    if (typeof appendage.cost === 'function') {
      return appendage.cost(costFactor);
    }
    return appendage.cost || 0;
  }

  /**
   * Calculate appendage weight using formula or flat weight
   * @param {Object} appendage - The appendage definition
   * @param {number} costFactor - The droid cost factor
   * @returns {number} - Total weight in kg
   */
  static calculateAppendageWeight(appendage, costFactor = 1) {
    if (typeof appendage.weight === 'function') {
      return appendage.weight(costFactor);
    }
    return appendage.weight || 0;
  }
}
