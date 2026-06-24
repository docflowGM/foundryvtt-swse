/**
 * Stock Droid Importer Engine
 * Handles import of stock droid statblocks from packs/droids.db.
 *
 * Strategy:
 * - Treat stock droids as published statblocks, not exact Garage builds.
 * - Import published totals into live actor fields so the sheet is immediately usable.
 * - Preserve normalized source totals in flags for later comparison/conversion.
 * - Populate droidSystems with parsed/source-backed installed systems when available,
 *   and safe baseline systems otherwise, so the Systems tab is not an empty husk.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidNormalizer } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-normalizer.js";
import { DroidTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/droid-template-data-loader.js";

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function deepClone(value) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  } catch (_err) { /* no-op */ }
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function abilityActorBlock(total, key) {
  const score = Number(total);
  const safeScore = Number.isFinite(score) ? score : (key === 'con' ? 0 : 10);
  return {
    base: safeScore,
    racial: 0,
    enhancement: 0,
    temp: 0,
    total: safeScore,
    mod: Math.floor((safeScore - 10) / 2)
  };
}

function buildAbilityMaps(totals = {}) {
  const attributes = {};
  const abilities = {};
  for (const key of ABILITY_KEYS) {
    const total = totals.abilities?.[key]?.total;
    const block = abilityActorBlock(total, key);
    attributes[key] = {
      base: block.base,
      racial: 0,
      enhancement: 0,
      temp: 0
    };
    abilities[key] = block;
  }
  return { attributes, abilities };
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanAttackName(value) {
  return String(value || '')
    .replace(/^and\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildWeaponItemsFromAttacks(totals = {}) {
  const attacks = totals.attacks || {};
  const byKey = new Map();
  const add = (attack, mode) => {
    const name = cleanAttackName(attack?.name);
    if (!name || /^unarmed$/i.test(name) || /^by weapon$/i.test(name)) return;
    const key = `${mode}:${slug(name)}`;
    const profile = {
      name,
      mode,
      damage: attack?.damage || '',
      attackBonus: Number(attack?.bonus ?? 0) || 0
    };
    const existing = byKey.get(key);
    if (existing) {
      const profiles = existing.system.weaponProfiles || [];
      const profileKey = `${profile.attackBonus}:${profile.damage}`;
      if (!profiles.some(item => `${item.attackBonus}:${item.damage}` === profileKey)) profiles.push(profile);
      existing.system.weaponProfiles = profiles;
      return;
    }
    byKey.set(key, {
      name,
      type: 'weapon',
      img: 'icons/svg/sword.svg',
      system: {
        integrated: true,
        droidPartId: slug(name),
        attackBonus: profile.attackBonus,
        damage: profile.damage,
        range: mode,
        weaponProfile: profile,
        weaponProfiles: [profile],
        description: `Published stock droid ${mode} attack.`
      },
      flags: {
        swse: {
          integrated: true,
          stockDroidAttack: true,
          droidPartId: slug(name)
        }
      }
    });
  };
  for (const attack of attacks.melee || []) add(attack, 'melee');
  for (const attack of attacks.ranged || []) add(attack, 'ranged');
  return Array.from(byKey.values());
}

export class StockDroidImporterEngine {
  /**
   * Import a stock droid template from packs/droids.db as a playable statblock actor.
   * @param {string} droidId - Droid ID in the droids pack
   * @param {Object|null} customData - Optional custom data (name, portrait, notes, biography)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importDroidTemplate(droidId, customData = null) {
    try {
      SWSELogger.log(`[StockDroidImporterEngine] Importing stock droid: ${droidId}`);

      const rawRecord = await DroidTemplateDataLoader.getDroidActorDocument(droidId);
      if (!rawRecord) {
        SWSELogger.error(`[StockDroidImporterEngine] Droid actor not found: ${droidId}`);
        return null;
      }

      const normalized = StockDroidNormalizer.normalizeStockDroidRecord(rawRecord);
      const newActorData = this.buildActorDataFromNormalized(normalized, customData);
      const actor = await Actor.create(newActorData);

      SWSELogger.log(`[StockDroidImporterEngine] Stock droid imported successfully: ${actor.name} (${actor.id})`);
      return actor;
    } catch (err) {
      SWSELogger.error(`[StockDroidImporterEngine] Error importing stock droid:`, err);
      return null;
    }
  }

  /**
   * Public builder used by store/DroidFactory as well as this importer.
   * @param {Object} normalized - Normalized shim from StockDroidNormalizer
   * @param {Object|null} customData - Custom overrides
   * @returns {Object} Actor create data
   */
  static buildActorDataFromNormalized(normalized, customData = null) {
    return this._buildActorFromStatblock(normalized, customData);
  }

  static _buildActorFromStatblock(normalized, customData = null) {
    const source = normalized.source || {};
    const identity = normalized.identity || {};
    const totals = normalized.publishedTotals || {};
    const timestamp = Date.now();
    const { attributes, abilities } = buildAbilityMaps(totals);
    const droidSystems = deepClone(totals.droidSystems || {}) || {};
    const weaponItems = buildWeaponItemsFromAttacks(totals);

    const actorData = {
      type: 'droid',
      name: customData?.name || source.name || 'Stock Droid',
      img: customData?.portrait || source.img || 'icons/svg/upgrade.svg',
      system: {
        droidDegree: identity.degree || '',
        degree: identity.degree || '',
        droidDegreeKey: identity.degreeKey || '',
        droidRole: identity.role || '',
        droidRoleLabel: identity.roleLabel || '',
        race: 'Droid',
        species: 'Droid',
        size: String(identity.size || 'medium').toLowerCase(),
        category: 'Droid',
        cost: identity.cost || 0,
        costNumeric: identity.cost || 0,
        cl: identity.challengeLevel ?? null,
        challengeLevel: identity.challengeLevel ?? null,

        hp: {
          value: totals.hp?.value ?? totals.hp?.max ?? 1,
          max: totals.hp?.max ?? totals.hp?.value ?? 1,
          temp: 0,
          bonus: 0
        },
        attributes,
        abilities,
        speed: totals.speed || 6,
        initiative: totals.initiative || 0,
        bab: totals.bab || 0,
        baseAttackBonus: totals.bab || 0,
        damageThreshold: totals.threshold || totals.defenses?.fortitude || 10,
        damageReduction: totals.damageReduction || 0,
        defenses: {
          fortitude: { base: 10, misc: 0, total: totals.defenses?.fortitude || 10, ability: 0, class: 0, armorMastery: 0, modifier: 0 },
          reflex: { base: 10, misc: 0, total: totals.defenses?.reflex || 10, ability: 0, class: 0, armorMastery: 0, armor: 0, modifier: 0 },
          will: { base: 10, misc: 0, total: totals.defenses?.will || 10, ability: 0, class: 0, armorMastery: 0, modifier: 0 },
          flatFooted: { total: totals.defenses?.flatFooted || totals.defenses?.reflex || 10 }
        },
        skills: deepClone(totals.skills || {}),
        droidSystems,
        stockAttacks: deepClone(totals.attacks || { melee: [], ranged: [] }),
        languages: deepClone(totals.languages || []),
        forcePoints: { value: totals.forcePoints || 0, max: totals.forcePoints || 0, die: '1d6', diceType: 'd6' },
        destinyPoints: { value: 0, max: 0 },
        darkSideScore: totals.darkSideScore || 0,
        credits: 0,
        biography: this._buildBiography(customData, normalized)
      },
      items: weaponItems,
      prototypeToken: {
        name: customData?.name || source.name || 'Stock Droid',
        texture: { src: customData?.portrait || source.img || 'icons/svg/upgrade.svg' },
        bar1: { attribute: 'hp' },
        bar2: { attribute: 'defenses.reflex' }
      },
      flags: {
        swse: {
          stockDroidImport: {
            sourceId: source.compendiumId,
            sourceName: source.name,
            sourcePack: source.sourcePack || '',
            importMode: 'statblock',
            confidence: normalized.confidence,
            importedAt: timestamp,
            warnings: normalized.warnings || [],
            publishedTotals: {
              hp: deepClone(totals.hp),
              abilities: deepClone(totals.abilities),
              defenses: deepClone(totals.defenses),
              speed: totals.speed,
              initiative: totals.initiative,
              bab: totals.bab,
              threshold: totals.threshold,
              damageReduction: totals.damageReduction,
              attacks: deepClone(totals.attacks),
              skills: deepClone(totals.skills),
              droidSystems: deepClone(droidSystems)
            }
          }
        }
      }
    };

    return actorData;
  }

  static _buildBiography(customData, normalized = null) {
    const parts = [];
    if (customData?.notes) parts.push(customData.notes);
    if (customData?.biography) parts.push(customData.biography);
    const sourceText = normalized?.publishedTotals?.droidSystems?.sourceText;
    if (sourceText) parts.push(`<p><strong>Droid Systems:</strong> ${sourceText}</p>`);
    return parts.filter(t => t && String(t).trim()).join('\n\n');
  }
}

export default StockDroidImporterEngine;
