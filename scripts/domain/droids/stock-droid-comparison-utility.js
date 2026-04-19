/**
 * Stock Droid Comparison Utility
 * Compares original stock statblock values against current actor state.
 * Produces a structured diff for display and audit trails.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class StockDroidComparisonUtility {
  /**
   * Compare published stock snapshot vs current actor state
   * @param {Object} publishedSnapshot - Published totals from stock statblock
   * @param {Actor} actor - Current actor
   * @returns {Object} Structured comparison with categories
   */
  static compareStockVsCurrent(publishedSnapshot, actor) {
    if (!publishedSnapshot || !actor) {
      return this._emptyComparison();
    }

    const system = actor.system;
    const comparison = {
      timestamp: Date.now(),
      sourceActorId: actor.id,
      sourceActorName: actor.name,
      categories: {}
    };

    // Identity (degree, size)
    comparison.categories.identity = this._compareIdentity(publishedSnapshot, system);

    // Abilities
    comparison.categories.abilities = this._compareAbilities(publishedSnapshot, system);

    // Defenses
    comparison.categories.defenses = this._compareDefenses(publishedSnapshot, system);

    // HP and Threshold
    comparison.categories.hp = this._compareHP(publishedSnapshot, system);

    // Speed
    comparison.categories.speed = this._compareSpeed(publishedSnapshot, system);

    // Attacks Summary
    comparison.categories.attacks = this._compareAttacks(publishedSnapshot, system);

    // Skills Summary
    comparison.categories.skills = this._compareSkills(publishedSnapshot, system);

    // Droid Systems (if built)
    comparison.categories.systems = this._compareDroidSystems(publishedSnapshot, system);

    return comparison;
  }

  /**
   * Identity comparison: degree, size
   */
  static _compareIdentity(published, system) {
    // Note: degree/size may have changed if converted and edited
    const result = {
      fields: {}
    };

    // Degree doesn't have a clear "current" except in droidSystems.degree
    // For stock imports, this is in system.droidDegree
    result.fields.degree = {
      published: null,  // May not have been in statblock
      current: system.droidDegree || system.droidSystems?.degree || null,
      status: 'unknown'
    };

    result.fields.size = {
      published: null,
      current: system.size || system.droidSystems?.size || null,
      status: 'unknown'
    };

    return result;
  }

  /**
   * Ability scores comparison (STR, DEX, CON, INT, WIS, CHA)
   */
  static _compareAbilities(published, system) {
    const result = {
      fields: {}
    };

    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    for (const abilityKey of abilities) {
      const publishedAbility = published.abilities?.[abilityKey] || {};
      const currentAbility = system.attributes?.[abilityKey] || system.abilities?.[abilityKey] || {};

      const publishedTotal = publishedAbility.total;
      const currentTotal = currentAbility.total || ((currentAbility.base || 0) + (currentAbility.racial || 0) + (currentAbility.enhancement || 0));

      let status = 'unknown';
      if (publishedTotal !== undefined && currentTotal !== undefined) {
        status = publishedTotal === currentTotal ? 'same' : 'changed';
      } else if (publishedTotal !== undefined) {
        status = 'reference-only';
      }

      result.fields[abilityKey] = {
        published: publishedTotal,
        current: currentTotal,
        status
      };
    }

    return result;
  }

  /**
   * Defense comparison (Fortitude, Reflex, Will, Flat-Footed)
   */
  static _compareDefenses(published, system) {
    const result = {
      fields: {}
    };

    const defenseTypes = ['fortitude', 'reflex', 'will', 'flatFooted'];

    for (const defenseType of defenseTypes) {
      const publishedDef = published.defenses?.[defenseType];
      const currentDef = system.defenses?.[defenseType]?.total ||
                        system.derived?.defenses?.[this._mapDefenseName(defenseType)] ||
                        system.defenses?.[defenseType];

      let status = 'unknown';
      if (publishedDef !== undefined && currentDef !== undefined) {
        status = publishedDef === currentDef ? 'same' : 'changed';
      } else if (publishedDef !== undefined) {
        status = 'reference-only';
      }

      result.fields[defenseType] = {
        published: publishedDef,
        current: currentDef,
        status
      };
    }

    return result;
  }

  /**
   * HP and damage threshold comparison
   */
  static _compareHP(published, system) {
    const result = {
      fields: {}
    };

    const publishedHP = published.hp?.max;
    const currentHP = system.hp?.max;
    let hpStatus = 'unknown';
    if (publishedHP !== undefined && currentHP !== undefined) {
      hpStatus = publishedHP === currentHP ? 'same' : 'changed';
    }

    result.fields.hp = {
      published: publishedHP,
      current: currentHP,
      status: hpStatus
    };

    const publishedThreshold = published.threshold;
    const currentThreshold = system.damageThreshold || system.derived?.damage?.threshold;
    let thresholdStatus = 'unknown';
    if (publishedThreshold !== undefined && currentThreshold !== undefined) {
      thresholdStatus = publishedThreshold === currentThreshold ? 'same' : 'changed';
    }

    result.fields.threshold = {
      published: publishedThreshold,
      current: currentThreshold,
      status: thresholdStatus
    };

    return result;
  }

  /**
   * Speed comparison
   */
  static _compareSpeed(published, system) {
    const result = {
      fields: {}
    };

    const publishedSpeed = published.speed;
    const currentSpeed = system.speed;

    let status = 'unknown';
    if (publishedSpeed !== undefined && currentSpeed !== undefined) {
      status = publishedSpeed === currentSpeed ? 'same' : 'changed';
    }

    result.fields.speed = {
      published: publishedSpeed,
      current: currentSpeed,
      status
    };

    return result;
  }

  /**
   * Attacks summary (count and types)
   */
  static _compareAttacks(published, system) {
    const result = {
      summary: {}
    };

    const publishedAttacks = published.attacks || [];
    const currentAttacks = system.attacks || system.droidSystems?.weapons || [];

    result.summary.publishedCount = publishedAttacks.length;
    result.summary.currentCount = currentAttacks.length;
    result.summary.status = publishedAttacks.length === currentAttacks.length ? 'same' : 'changed';

    if (publishedAttacks.length > 0) {
      result.summary.publishedTypes = Array.from(new Set(publishedAttacks.map(a => a.type || 'unknown')));
    }

    return result;
  }

  /**
   * Skills summary (trained count, modifiers)
   */
  static _compareSkills(published, system) {
    const result = {
      summary: {}
    };

    const publishedSkills = published.skills || {};
    const currentSkills = system.skills || {};

    const publishedTrained = Object.values(publishedSkills).filter(s => s.trained).length;
    const currentTrained = Object.values(currentSkills).filter(s => s.trained).length;

    result.summary.publishedTrainedCount = publishedTrained;
    result.summary.currentTrainedCount = currentTrained;
    result.summary.status = publishedTrained === currentTrained ? 'same' : 'changed';

    return result;
  }

  /**
   * Droid systems comparison (if custom droid built)
   */
  static _compareDroidSystems(published, system) {
    const result = {
      hasCustomSystems: !!system.droidSystems?.degree,
      fields: {}
    };

    if (system.droidSystems?.degree) {
      const systems = system.droidSystems;

      result.fields.degree = systems.degree || null;
      result.fields.size = systems.size || null;
      result.fields.locomotion = systems.locomotion?.name || null;
      result.fields.processor = systems.processor?.name || null;
      result.fields.armor = systems.armor?.name || null;
      result.fields.appendages = systems.appendages?.length || 0;
      result.fields.sensors = systems.sensors?.length || 0;
      result.fields.weapons = systems.weapons?.length || 0;
      result.fields.accessories = systems.accessories?.length || 0;
    }

    return result;
  }

  /**
   * Map defense field names to derived property names
   */
  static _mapDefenseName(defenseType) {
    const map = {
      'fortitude': 'fort',
      'reflex': 'ref',
      'will': 'will',
      'flatFooted': 'flatFooted'
    };
    return map[defenseType] || defenseType;
  }

  /**
   * Empty comparison structure
   */
  static _emptyComparison() {
    return {
      timestamp: Date.now(),
      sourceActorId: null,
      sourceActorName: null,
      categories: {
        identity: { fields: {} },
        abilities: { fields: {} },
        defenses: { fields: {} },
        hp: { fields: {} },
        speed: { fields: {} },
        attacks: { summary: {} },
        skills: { summary: {} },
        systems: { hasCustomSystems: false, fields: {} }
      }
    };
  }

  /**
   * Get summary statistics for a comparison
   */
  static getSummary(comparison) {
    if (!comparison) return null;

    const summary = {
      totalFields: 0,
      sameCount: 0,
      changedCount: 0,
      unknownCount: 0,
      referenceOnlyCount: 0
    };

    for (const category of Object.values(comparison.categories)) {
      if (category.fields) {
        for (const field of Object.values(category.fields)) {
          summary.totalFields++;
          if (field.status === 'same') summary.sameCount++;
          else if (field.status === 'changed') summary.changedCount++;
          else if (field.status === 'reference-only') summary.referenceOnlyCount++;
          else summary.unknownCount++;
        }
      }
    }

    return summary;
  }
}

export default StockDroidComparisonUtility;
