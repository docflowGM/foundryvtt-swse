/**
 * Stock Droid Normalizer
 * Converts legacy stock droid compendium records into a stable normalized shim format.
 * This allows Phase 1 to treat stock droids as published statblocks for play,
 * while preserving provenance and avoiding false claims about builder reconstruction.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class StockDroidNormalizer {
  /**
   * Normalize a raw stock droid record from packs/droids.db
   * @param {Object} rawRecord - Raw actor document from compendium
   * @returns {Object} Normalized shim with published totals, provenance, confidence
   */
  static normalizeStockDroidRecord(rawRecord) {
    if (!rawRecord) {
      return this._emptyNormalization();
    }

    const normalized = {
      source: this._extractSource(rawRecord),
      identity: this._extractIdentity(rawRecord),
      publishedTotals: this._extractPublishedTotals(rawRecord),
      builderHints: this._extractBuilderHints(rawRecord),
      importCapability: {
        statblockMode: {
          supported: true,
          playReady: true,
          notes: 'Can import as fully playable statblock-backed droid actor'
        },
        playableMode: {
          supported: false,
          confidence: 'low',
          blockers: [
            'Locomotion system cannot be reconstructed from statblock',
            'Processor type cannot be reconstructed from statblock',
            'Armor grade cannot be reconstructed from statblock',
            'Appendages cannot be reconstructed from statblock'
          ]
        }
      },
      warnings: [],
      confidence: 'medium'
    };

    // Generate warnings for ambiguous or missing fields
    this._generateWarnings(normalized, rawRecord);

    return normalized;
  }

  /**
   * Extract source/provenance information
   * @private
   */
  static _extractSource(rawRecord) {
    return {
      compendiumId: rawRecord._id || rawRecord.id || '',
      uuid: rawRecord.uuid || '',
      name: rawRecord.name || 'Unknown Droid',
      img: rawRecord.img || 'systems/foundryvtt-swse/assets/token-default.png',
      sourceBook: '',  // Legacy schema does not preserve this
      page: null
    };
  }

  /**
   * Extract identity fields (degree, size, type, category, summary)
   * @private
   */
  static _extractIdentity(rawRecord) {
    const system = rawRecord.system || {};

    return {
      degree: system.degree || system.droidDegree || '',
      size: system.size || system.droidSize || '',
      type: rawRecord.type || 'droid',
      category: 'stock-droid',
      tags: [],  // Not preserved in legacy
      summary: rawRecord.name || ''
    };
  }

  /**
   * Extract published totals (abilities, defenses, HP, speed, etc.)
   * These are statblock-authoritative values, not builder inputs.
   * @private
   */
  static _extractPublishedTotals(rawRecord) {
    const system = rawRecord.system || {};

    const abilities = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const abilityData = system.abilities?.[key] || system.attributes?.[key] || {};
      abilities[key] = {
        total: abilityData.total || abilityData.base || 10,
        mod: abilityData.mod || Math.floor((abilityData.total || 10 - 10) / 2)
      };
    }

    const defenses = {
      fortitude: system.defenses?.fortitude?.total || 10,
      reflex: system.defenses?.reflex?.total || 10,
      will: system.defenses?.will?.total || 10,
      flatFooted: system.defenses?.flatFooted?.total || 10
    };

    const skills = {};
    if (system.skills) {
      for (const [key, skillData] of Object.entries(system.skills)) {
        skills[key] = {
          trained: Boolean(skillData.trained),
          modifier: skillData.modifier || skillData.mod || 0
        };
      }
    }

    const attacks = [];
    if (Array.isArray(system.attacks)) {
      for (const attack of system.attacks) {
        attacks.push({
          name: attack.name || 'Attack',
          bonus: attack.bonus || 0,
          damage: attack.damage || '1d6',
          range: attack.range || 'melee',
          type: attack.type || 'weapon'
        });
      }
    }

    return {
      abilities,
      defenses,
      hp: {
        max: system.hp || system.HP || 30,
        source: 'published-statblock',
        authoritative: true
      },
      threshold: system.damageThreshold || system.threshold || 0,
      speed: system.speed || 6,
      initiative: system.initiative || 0,
      grapple: system.grapple || 0,
      attacks,
      skills
    };
  }

  /**
   * Extract builder hints (sparse, low confidence)
   * These are HINTS ONLY and should never be treated as canonical builder truth.
   * @private
   */
  static _extractBuilderHints(rawRecord) {
    const system = rawRecord.system || {};

    return {
      locomotionType: null,  // Cannot reliably infer from statblock
      armorGuess: null,      // Cannot reliably infer from statblock
      roleGuess: null        // Cannot reliably infer from statblock
    };
  }

  /**
   * Generate warnings for ambiguous, missing, or problematic fields
   * @private
   */
  static _generateWarnings(normalized, rawRecord) {
    const warnings = normalized.warnings;
    const system = rawRecord.system || {};

    // Check for derived values that are NOT builder inputs
    if (system.defenses) {
      warnings.push({
        level: 'warning',
        code: 'DERIVED_DEFENSE_VALUES',
        message: 'Defenses are derived totals, not base values. These will be used as statblock reference.',
        field: 'system.defenses'
      });
    }

    // Check for ability totals that may include bonuses
    const hasBonuses = Object.values(system.abilities || {}).some(
      a => a.racial || a.enhancement || a.temp
    );
    if (hasBonuses) {
      warnings.push({
        level: 'warning',
        code: 'BAKED_IN_ABILITY_BONUSES',
        message: 'Ability scores appear to include degree/size bonuses. Cannot decompose into base values.',
        field: 'system.abilities'
      });
    }

    // Warn if droidSystems is present but incomplete (legacy schema mismatch)
    if (system.droidSystems && !system.droidSystems.locomotion?.id) {
      warnings.push({
        level: 'info',
        code: 'INCOMPLETE_BUILDER_STATE',
        message: 'Actor has incomplete droidSystems. Treating as statblock import.',
        field: 'system.droidSystems'
      });
    }

    // Warn if critical builder fields are missing
    if (!system.droidSystems) {
      warnings.push({
        level: 'info',
        code: 'NO_BUILDER_STATE',
        message: 'No droidSystems found. This is a statblock-only import; builder state cannot be reconstructed.',
        field: 'system.droidSystems'
      });
    }

    return warnings;
  }

  /**
   * Return empty normalization for null/undefined input
   * @private
   */
  static _emptyNormalization() {
    return {
      source: {
        compendiumId: '',
        uuid: '',
        name: 'Unknown',
        img: 'systems/foundryvtt-swse/assets/token-default.png',
        sourceBook: '',
        page: null
      },
      identity: {
        degree: '',
        size: '',
        type: 'droid',
        category: 'unknown',
        tags: [],
        summary: ''
      },
      publishedTotals: {
        abilities: {
          str: { total: 10, mod: 0 },
          dex: { total: 10, mod: 0 },
          con: { total: 0, mod: -5 },  // Droids always CON 0
          int: { total: 10, mod: 0 },
          wis: { total: 10, mod: 0 },
          cha: { total: 10, mod: 0 }
        },
        defenses: {
          fortitude: 10,
          reflex: 10,
          will: 10,
          flatFooted: 10
        },
        hp: { max: 30, source: 'default', authoritative: false },
        threshold: 0,
        speed: 6,
        initiative: 0,
        grapple: 0,
        attacks: [],
        skills: {}
      },
      builderHints: {
        locomotionType: null,
        armorGuess: null,
        roleGuess: null
      },
      importCapability: {
        statblockMode: {
          supported: false,
          playReady: false,
          notes: 'Invalid or empty source record'
        },
        playableMode: {
          supported: false,
          confidence: 'none',
          blockers: ['Source record is empty']
        }
      },
      warnings: [
        {
          level: 'error',
          code: 'EMPTY_SOURCE_RECORD',
          message: 'Stock droid record is empty or null',
          field: 'source'
        }
      ],
      confidence: 'none'
    };
  }
}

export default StockDroidNormalizer;
