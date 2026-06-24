/**
 * Stock Droid Normalizer
 * Converts legacy stock droid compendium records into a stable normalized shim format.
 * This allows stock droids to be treated as published statblocks for play,
 * while preserving provenance and avoiding false claims about builder reconstruction.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LONG_KEYS = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma'
};

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return null;
  const match = String(value).match(/-?\d+/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function numberOrDefault(value, fallback = 0) {
  const number = numberOrNull(value);
  return number === null ? fallback : number;
}

function deepClone(value) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  } catch (_err) { /* no-op */ }
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function abilityScoreFromBlock(block, fallback = null) {
  if (block === undefined || block === null) return fallback;
  if (typeof block === 'number' || typeof block === 'string') return numberOrNull(block) ?? fallback;
  if (typeof block !== 'object') return fallback;
  const explicit = numberOrNull(block.total ?? block.value ?? block.score);
  if (explicit !== null) return explicit;
  const base = numberOrNull(block.base);
  if (base === null) return fallback;
  return base
    + numberOrDefault(block.racial ?? block.species, 0)
    + numberOrDefault(block.enhancement ?? block.misc, 0)
    + numberOrDefault(block.temp, 0);
}

function abilityMod(score) {
  return Math.floor((Number(score || 0) - 10) / 2);
}

function normalizeAbilityBlock(score) {
  const total = Number(score);
  const safeTotal = Number.isFinite(total) ? total : 10;
  return { total: safeTotal, mod: abilityMod(safeTotal) };
}

function normalizeSystemText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s+/g, ', ')
    .trim();
}

function splitListRespectingParens(value) {
  const text = String(value || '');
  const out = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      const entry = current.trim();
      if (entry) out.push(entry);
      current = '';
      continue;
    }
    current += char;
  }
  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeDroidSystems(rawSystems = {}, rawText = '', sourceSystem = {}) {
  const base = deepClone(rawSystems && typeof rawSystems === 'object' ? rawSystems : {}) || {};
  base.degree ??= sourceSystem.droidDegreeKey || sourceSystem.degree || '';
  base.size ??= String(sourceSystem.size || 'medium').toLowerCase();
  base.stateMode ??= 'STOCK';
  base.buildHistory ??= [];
  base.appendages ??= [];
  base.sensors ??= [];
  base.weapons ??= [];
  base.accessories ??= [];
  base.integratedSystems ??= [];
  base.locomotionSystems ??= [];
  base.processors ??= [];
  base.credits ??= { spent: Number(sourceSystem.costNumeric ?? sourceSystem.cost ?? 0) || 0, total: Number(sourceSystem.costNumeric ?? sourceSystem.cost ?? 0) || 0 };

  const text = normalizeSystemText(rawText || sourceSystem.droidSystemText || sourceSystem.droidSystemsText || '');
  if (!text) return base;

  base.sourceText = text;
  const entries = splitListRespectingParens(text);
  const appendageSlotNames = ['leftArm', 'rightArm'];
  for (const rawEntry of entries) {
    const entry = normalizeSystemText(rawEntry);
    const lower = entry.toLowerCase();
    const id = slug(entry.replace(/^\d+\s+/, '').replace(/\(([^)]+)\)/g, '$1'));
    const count = numberOrNull(entry.match(/^\s*(\d+)/)?.[1]) ?? 1;

    if (lower.includes('locomotion') || ['walking', 'wheeled', 'tracked', 'hovering', 'flying'].some(term => lower === term || lower.startsWith(`${term} `))) {
      const mode = lower.includes('wheeled') ? 'wheeled'
        : lower.includes('tracked') ? 'tracked'
          : lower.includes('hover') ? 'hovering'
            : lower.includes('fly') ? 'flying'
              : 'walking';
      base.locomotion ||= { id: mode, name: titleCase(`${mode} locomotion`), speed: numberOrDefault(sourceSystem.speed, 6), sourceText: entry };
      const extraMatch = entry.match(/\(([^)]+)\)/);
      if (extraMatch?.[1]) {
        base.locomotionSystems.push({ id: slug(extraMatch[1]), name: titleCase(extraMatch[1]), sourceText: entry });
      }
      continue;
    }

    if (lower.includes('processor')) {
      if (!base.processor?.id && lower.includes('heuristic')) {
        base.processor = { id: 'heuristic-processor', name: 'Heuristic Processor', active: true, slotKey: 'primaryProcessor', sourceText: entry };
      } else if (!base.processor?.id && lower.includes('basic')) {
        base.processor = { id: 'basic-processor', name: 'Basic Processor', active: true, slotKey: 'primaryProcessor', sourceText: entry };
      } else {
        base.processors.push({ id, name: titleCase(entry), sourceText: entry });
      }
      continue;
    }

    if (lower.includes('appendage') || lower.includes('mount')) {
      const appendageType = lower.includes('claw') ? 'claw'
        : lower.includes('tool') ? 'tool'
          : lower.includes('instrument') ? 'instrument'
            : lower.includes('probe') ? 'probe'
              : 'hand';
      for (let i = 0; i < Math.max(1, count); i += 1) {
        base.appendages.push({
          id: appendageType,
          name: titleCase(entry.replace(/^\d+\s+/, '').replace(/s$/, '')),
          appendageType,
          location: appendageSlotNames[i] || `appendage-${base.appendages.length + 1}`,
          sourceText: entry
        });
      }
      continue;
    }

    if (lower.includes('sensor') || lower.includes('darkvision') || lower.includes('low-light') || lower.includes('vision')) {
      base.sensors.push({ id, name: titleCase(entry), sourceText: entry });
      continue;
    }

    if (lower.includes('comlink') || lower.includes('vocabulator') || lower.includes('translator')) {
      base.integratedSystems.push({ id, name: titleCase(entry), category: 'communication', sourceText: entry });
      continue;
    }

    base.accessories.push({ id, name: titleCase(entry), sourceText: entry });
  }

  base.processor ??= { id: 'heuristic-processor', name: 'Heuristic Processor', active: true, slotKey: 'primaryProcessor', sourceText: 'Default stock droid processor assumption' };
  base.locomotion ??= { id: 'walking', name: 'Walking Locomotion', speed: numberOrDefault(sourceSystem.speed, 6), sourceText: 'Default stock droid locomotion assumption' };
  if (!Array.isArray(base.appendages) || base.appendages.length === 0) {
    base.appendages = [
      { id: 'hand', name: 'Hand Appendage', appendageType: 'hand', location: 'leftArm', sourceText: 'Default stock droid appendage assumption' },
      { id: 'hand', name: 'Hand Appendage', appendageType: 'hand', location: 'rightArm', sourceText: 'Default stock droid appendage assumption' }
    ];
  }
  return base;
}

function normalizeAttackList(attacks, mode) {
  if (!Array.isArray(attacks)) return [];
  return attacks.map(attack => ({
    name: attack?.name || 'Attack',
    bonus: numberOrDefault(attack?.bonus, 0),
    damage: attack?.damage || '1d6',
    range: attack?.range || mode,
    mode,
    type: attack?.type || 'weapon'
  }));
}

function normalizeSkills(skills = {}) {
  const normalized = {};
  for (const [key, skillData] of Object.entries(skills || {})) {
    if (typeof skillData === 'number' || typeof skillData === 'string') {
      normalized[key] = { trained: false, modifier: numberOrDefault(skillData, 0) };
      continue;
    }
    normalized[key] = {
      trained: Boolean(skillData?.trained),
      focused: Boolean(skillData?.focused),
      modifier: numberOrDefault(skillData?.modifier ?? skillData?.mod ?? skillData?.total ?? skillData?.value ?? skillData?.miscMod, 0)
    };
  }
  return normalized;
}

export class StockDroidNormalizer {
  /**
   * Normalize a raw stock droid record from packs/droids.db.
   * @param {Object} rawRecord - Raw actor document from compendium
   * @returns {Object} Normalized shim with published totals, provenance, confidence
   */
  static normalizeStockDroidRecord(rawRecord) {
    if (!rawRecord) return this._emptyNormalization();

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
            'Some published statblocks cannot be decomposed into exact builder purchases',
            'Armor grade and decomposed chassis costs may be ambiguous',
            'Published attack lines are preserved as statblock weapons, not rebuilt as legal purchases'
          ]
        }
      },
      warnings: [],
      confidence: 'medium'
    };

    this._generateWarnings(normalized, rawRecord);
    return normalized;
  }

  static _extractSource(rawRecord) {
    const storeSource = rawRecord.__storeSource || {};
    return {
      compendiumId: rawRecord._id || rawRecord.id || storeSource.documentId || '',
      uuid: rawRecord.uuid || storeSource.uuid || '',
      name: rawRecord.name || 'Unknown Droid',
      img: rawRecord.img || 'systems/foundryvtt-swse/assets/token-default.png',
      sourceBook: rawRecord.system?.sourceBook || rawRecord.system?.source || '',
      page: rawRecord.system?.page || null,
      sourcePack: storeSource.pack || rawRecord.pack || ''
    };
  }

  static _extractIdentity(rawRecord) {
    const system = rawRecord.system || {};
    const degree = system.droidDegree || system.degree || system.droidDegreeKey || '';
    return {
      degree,
      degreeKey: system.droidDegreeKey || String(degree).toLowerCase(),
      size: system.size || system.droidSize || 'medium',
      type: rawRecord.type || 'droid',
      category: 'stock-droid',
      role: system.droidRole || '',
      roleLabel: system.droidRoleLabel || '',
      challengeLevel: numberOrNull(system.cl ?? system.challengeLevel ?? system.CL),
      cost: numberOrNull(system.costNumeric ?? system.cost) ?? 0,
      tags: [],
      summary: rawRecord.name || ''
    };
  }

  static _extractAbility(system, key) {
    const longKey = ABILITY_LONG_KEYS[key];
    const score = abilityScoreFromBlock(system.attributes?.[key], null)
      ?? abilityScoreFromBlock(system.abilities?.[key], null)
      ?? abilityScoreFromBlock(system.baseStats?.abilities?.[key], null)
      ?? abilityScoreFromBlock(system.baseStats?.abilities?.[longKey], null);

    if (score !== null) return normalizeAbilityBlock(score);
    if (key === 'con') return normalizeAbilityBlock(0);
    return normalizeAbilityBlock(10);
  }

  static _extractPublishedTotals(rawRecord) {
    const system = rawRecord.system || {};
    const abilities = {};
    for (const key of ABILITY_KEYS) abilities[key] = this._extractAbility(system, key);

    const defenses = {
      fortitude: numberOrDefault(system.defenses?.fortitude?.total ?? system.defenses?.fort?.total ?? system.fortitudeDefense, 10),
      reflex: numberOrDefault(system.defenses?.reflex?.total ?? system.reflexDefense, 10),
      will: numberOrDefault(system.defenses?.will?.total ?? system.willDefense, 10),
      flatFooted: numberOrDefault(system.defenses?.flatFooted?.total ?? system.flatFooted, 10)
    };

    const hpMax = numberOrDefault(system.hp?.max ?? system.hp?.value ?? system.HP, 30);
    const attacks = Array.isArray(system.attacks)
      ? {
          melee: normalizeAttackList(system.attacks.filter(attack => String(attack?.range || attack?.mode || '').toLowerCase() !== 'ranged'), 'melee'),
          ranged: normalizeAttackList(system.attacks.filter(attack => String(attack?.range || attack?.mode || '').toLowerCase() === 'ranged'), 'ranged')
        }
      : {
          melee: normalizeAttackList(system.attacks?.melee, 'melee'),
          ranged: normalizeAttackList(system.attacks?.ranged, 'ranged')
        };

    return {
      abilities,
      defenses,
      hp: {
        max: hpMax,
        value: numberOrDefault(system.hp?.value, hpMax),
        source: 'published-statblock',
        authoritative: true
      },
      threshold: numberOrDefault(system.damageThreshold ?? system.threshold, defenses.fortitude),
      damageReduction: numberOrDefault(system.damageReduction ?? system.dr, 0),
      speed: numberOrDefault(system.speed, 6),
      initiative: numberOrDefault(system.initiative, 0),
      grapple: numberOrDefault(system.grapple, 0),
      bab: numberOrDefault(system.bab ?? system.baseAttackBonus, 0),
      attacks,
      skills: normalizeSkills(system.skills),
      droidSystems: normalizeDroidSystems(system.droidSystems, system.droidSystemText || rawRecord.flags?.swse?.droidSystemText || '', system),
      languages: Array.isArray(system.languages) ? system.languages : [],
      darkSideScore: numberOrDefault(system.darkSideScore, 0),
      forcePoints: numberOrDefault(system.forcePoints?.max ?? system.forcePoints?.value ?? system.forcePoints, 0)
    };
  }

  static _extractBuilderHints(rawRecord) {
    const system = rawRecord.system || {};
    return {
      locomotionType: system.droidSystems?.locomotion?.id || system.droidSystems?.locomotion?.name || null,
      armorGuess: system.droidSystems?.armor?.name || null,
      roleGuess: system.droidRole || null
    };
  }

  static _generateWarnings(normalized, rawRecord) {
    const warnings = normalized.warnings;
    const system = rawRecord.system || {};

    if (system.defenses || system.reflexDefense || system.fortitudeDefense || system.willDefense) {
      warnings.push({
        level: 'info',
        code: 'STATBLOCK_DEFENSE_VALUES',
        message: 'Published defense totals are preserved as stock statblock authority.',
        field: 'system.defenses'
      });
    }

    if (!system.droidSystems && !(system.droidSystemText || rawRecord.flags?.swse?.droidSystemText)) {
      warnings.push({
        level: 'info',
        code: 'NO_BUILDER_STATE',
        message: 'No exact builder state found. Required baseline systems are synthesized for sheet display; source statblock remains authoritative.',
        field: 'system.droidSystems'
      });
    }

    return warnings;
  }

  static _emptyNormalization() {
    return {
      source: { compendiumId: '', uuid: '', name: 'Unknown', img: 'systems/foundryvtt-swse/assets/token-default.png', sourceBook: '', page: null },
      identity: { degree: '', degreeKey: '', size: 'medium', type: 'droid', category: 'unknown', tags: [], summary: '' },
      publishedTotals: {
        abilities: Object.fromEntries(ABILITY_KEYS.map(key => [key, normalizeAbilityBlock(key === 'con' ? 0 : 10)])),
        defenses: { fortitude: 10, reflex: 10, will: 10, flatFooted: 10 },
        hp: { max: 30, value: 30, source: 'fallback', authoritative: false },
        threshold: 10,
        damageReduction: 0,
        speed: 6,
        initiative: 0,
        grapple: 0,
        bab: 0,
        attacks: { melee: [], ranged: [] },
        skills: {},
        droidSystems: normalizeDroidSystems({}, '', {})
      },
      builderHints: {},
      importCapability: { statblockMode: { supported: false }, playableMode: { supported: false } },
      warnings: [],
      confidence: 'low'
    };
  }
}

export default StockDroidNormalizer;
