/**
 * Vehicle Import Normalizer (Phase 4)
 *
 * Normalizes vehicle data from compendium imports to ensure compatibility with:
 * - vehicle-derived-builder contracts (defenses as {base, total, adjustment, stateBonus})
 * - vehicle-context-builder expectations (crew, subsystems, shields, cargo, weapons)
 * - house rule engine expectations (subsystem detail, power data, pilot/commander/turn phase)
 *
 * Handles legacy (pre-migration) and modern (post-migration) vehicle data shapes.
 * Safe coercion with fallback defaults prevents render failures.
 *
 * Usage:
 *   const normalizedVehicle = normalizeVehicleImportData(actor.system);
 *   Object.assign(actor.system, normalizedVehicle);
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Safe numeric coercion with fallback
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Safe string coercion
 */
function safeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Normalize defense value: coerce legacy or modern formats into v2 contract
 * Accepts: number, {base, total}, {value}, or {base, total, adjustment, stateBonus}
 * Returns: {base, total, adjustment, stateBonus}
 */
function normalizeDefenseValue(rawValue, baseDefault = 10) {
  // Already properly formed
  if (rawValue && typeof rawValue === 'object' && 'total' in rawValue && 'base' in rawValue) {
    return {
      base: safeNumber(rawValue.base, baseDefault),
      total: safeNumber(rawValue.total, baseDefault),
      adjustment: safeNumber(rawValue.adjustment, rawValue.total - rawValue.base),
      stateBonus: safeNumber(rawValue.stateBonus, 0)
    };
  }

  // Legacy format: just a number
  if (typeof rawValue === 'number') {
    const total = rawValue;
    const base = baseDefault;
    return {
      base,
      total,
      adjustment: total - base,
      stateBonus: 0
    };
  }

  // Partial object: {value} or other shape
  if (rawValue && typeof rawValue === 'object') {
    const total = safeNumber(rawValue.value ?? rawValue.total, baseDefault);
    const base = safeNumber(rawValue.base, baseDefault);
    return {
      base,
      total,
      adjustment: total - base,
      stateBonus: safeNumber(rawValue.stateBonus, 0)
    };
  }

  // Fallback: use base as default
  return {
    base: baseDefault,
    total: baseDefault,
    adjustment: 0,
    stateBonus: 0
  };
}

/**
 * Normalize all vehicle defenses from system
 * Handles both old (defenses.reflex, system.reflexDefense) and new formats
 */
function normalizeDefenses(system) {
  const defenses = {};

  // REFLEX: Try modern format first (system.reflexDefense), then legacy (system.defenses.reflex)
  const refValue = system.reflexDefense ?? system.defenses?.reflex ?? 10;
  defenses.ref = normalizeDefenseValue(refValue, 10);

  // FORTITUDE
  const fortValue = system.fortitudeDefense ?? system.defenses?.fortitude ?? 10;
  defenses.fort = normalizeDefenseValue(fortValue, 10);

  // WILL
  const willValue = system.willDefense ?? system.defenses?.will ?? 10;
  defenses.will = normalizeDefenseValue(willValue, 10);

  // FLAT-FOOTED
  const ffValue = system.flatFooted ?? system.defenses?.flat_footed ?? 10;
  defenses.flatFooted = normalizeDefenseValue(ffValue, 10);

  return defenses;
}

/**
 * Normalize HP/hull coercion: system.hp (modern) > system.hull (legacy) > bare number
 * Returns {value, max, temp}
 */
function normalizeHp(system) {
  let value = 0;
  let max = 1;
  let temp = 0;

  // Modern format: system.hp with {value, max, temp}
  if (system.hp && typeof system.hp === 'object') {
    value = safeNumber(system.hp.value, 0);
    max = safeNumber(system.hp.max, 1);
    temp = safeNumber(system.hp.temp, 0);
  }
  // Legacy format: system.hull with {value, max}
  else if (system.hull && typeof system.hull === 'object') {
    value = safeNumber(system.hull.value, 0);
    max = safeNumber(system.hull.max, 1);
    temp = 0;
  }
  // Bare number in system.hit_points (pre-migration legacy)
  else if (typeof system.hit_points === 'number') {
    value = system.hit_points;
    max = system.hit_points;
    temp = 0;
  }

  // Safety: ensure max > 0 to prevent division by zero in derived builders
  if (!Number.isFinite(max) || max <= 0) {
    max = 1;
  }

  return { value, max, temp };
}

/**
 * Normalize crew structure
 * Handles legacy crew_size string and modern crew.occupied/total format
 */
function normalizeCrew(system) {
  const crew = {
    occupied: 0,
    total: 1,
    quality: 'normal',
    passenger: 0
  };

  // Modern format: system.crew with occupied, total, quality
  if (system.crew && typeof system.crew === 'object' && !Array.isArray(system.crew)) {
    crew.occupied = safeNumber(system.crew.occupied, 0);
    crew.total = safeNumber(system.crew.total, 1);
    crew.quality = safeString(system.crew.quality, 'normal');
    crew.passenger = safeNumber(system.crew.passenger, 0);
  }
  // Legacy format: system.crew_size string like "2 skilled" or "1 untrained"
  else if (typeof system.crew === 'string' || typeof system.crew_size === 'string') {
    const crewStr = safeString(system.crew || system.crew_size, '1 normal');
    const match = crewStr.match(/^(\d+)\s*(.*)/i);

    if (match) {
      crew.total = safeNumber(match[1], 1);
      const quality = match[2].toLowerCase();

      if (quality.includes('skilled')) crew.quality = 'skilled';
      else if (quality.includes('expert')) crew.quality = 'expert';
      else if (quality.includes('ace')) crew.quality = 'ace';
      else if (quality.includes('untrained')) crew.quality = 'untrained';
      else crew.quality = 'normal';
    }
  }

  return crew;
}

/**
 * Normalize shields: handle both modern {value, max} and legacy formats
 * Default to {value: 0, max: 0} for ground vehicles
 */
function normalizeShields(system) {
  // Modern format
  if (system.shields && typeof system.shields === 'object') {
    return {
      value: safeNumber(system.shields.value, 0),
      max: safeNumber(system.shields.max, 0)
    };
  }

  // Bare number: system.shields_current or system.shieldPoints
  if (typeof system.shields === 'number') {
    return { value: system.shields, max: system.shields };
  }

  // Default: no shields
  return { value: 0, max: 0 };
}

/**
 * Normalize cargo capacity: handle legacy cargo_capacity and modern cargo
 */
function normalizeCargo(system) {
  // Modern format: system.cargo with value, max, weight
  if (system.cargo && typeof system.cargo === 'object' && !Array.isArray(system.cargo)) {
    return {
      value: safeNumber(system.cargo.value, 0),
      max: safeNumber(system.cargo.max, 1),
      weight: safeNumber(system.cargo.weight, 0),
      unit: safeString(system.cargo.unit, 'ton')
    };
  }

  // Bare number: legacy system.cargo_capacity
  if (typeof system.cargo === 'number') {
    return { value: 0, max: system.cargo, weight: 0, unit: 'ton' };
  }

  if (typeof system.cargo_capacity === 'number') {
    return { value: 0, max: system.cargo_capacity, weight: 0, unit: 'ton' };
  }

  // Default: empty cargo
  return { value: 0, max: 1, weight: 0, unit: 'ton' };
}

/**
 * Normalize weapons array: ensure all entries have minimal required shape
 * Removes corrupted entries (with category/tag names)
 */
function normalizeWeapons(weapons) {
  if (!Array.isArray(weapons)) return [];

  const CORRUPTED_TERMS = [
    'categor', 'add category', 'vehicles', 'planetary', 'ground', 'speeders',
    'starship', 'water', 'air', 'mandalorian', 'web enhancement'
  ];

  return weapons
    .filter(w => {
      // Remove if not object or missing name
      if (!w || typeof w !== 'object' || !w.name) return false;

      // Remove if name contains corrupted terms
      const name = String(w.name).toLowerCase();
      return !CORRUPTED_TERMS.some(term => name.includes(term));
    })
    .map(w => ({
      name: safeString(w.name, 'Weapon'),
      arc: safeString(w.arc, 'Forward'),
      bonus: safeString(w.bonus, '+0'),
      damage: safeString(w.damage, '1d10'),
      range: safeString(w.range, 'Close')
    }));
}

/**
 * Normalize subsystems: ensure proper structure for SubsystemEngine
 * Handles array of subsystems with {name, tier, detail} shape
 */
function normalizeSubsystems(subsystems) {
  if (!Array.isArray(subsystems)) return [];

  return subsystems
    .filter(s => s && typeof s === 'object' && s.name)
    .map(s => ({
      name: safeString(s.name, 'Subsystem'),
      tier: safeNumber(s.tier, 1),
      detail: safeString(s.detail, ''),
      condition: safeNumber(s.condition, 0)
    }));
}

/**
 * Normalize power data structure (for EnhancedEngineer rule)
 * Ensures {allocation, budget, reserve} shape
 */
function normalizePower(system) {
  // Modern format
  if (system.power && typeof system.power === 'object') {
    return {
      allocation: safeNumber(system.power.allocation, 0),
      budget: safeNumber(system.power.budget, 100),
      reserve: safeNumber(system.power.reserve, 0)
    };
  }

  // Default
  return { allocation: 0, budget: 100, reserve: 0 };
}

/**
 * Normalize crew positions: handle station assignments
 * Returns {pilot, copilot, gunner, engineer, shields, commander}
 */
function normalizeCrewPositions(system) {
  const positions = {
    pilot: '',
    copilot: '',
    gunner: '',
    engineer: '',
    shields: '',
    commander: ''
  };

  if (system.crewPositions && typeof system.crewPositions === 'object') {
    for (const [key, value] of Object.entries(system.crewPositions)) {
      if (positions.hasOwnProperty(key)) {
        positions[key] = safeString(value, '');
      }
    }
  }

  return positions;
}

/**
 * Normalize condition track: ensure {current, penalty} shape
 */
function normalizeConditionTrack(system) {
  if (system.conditionTrack && typeof system.conditionTrack === 'object') {
    return {
      current: safeNumber(system.conditionTrack.current, 0),
      penalty: safeNumber(system.conditionTrack.penalty, 0)
    };
  }

  return { current: 0, penalty: 0 };
}

/**
 * Normalize vehicle identity fields: type, size, category, domain
 */
function normalizeIdentity(system) {
  return {
    type: safeString(system.type || system.vehicle_type, 'Vehicle'),
    size: safeString(system.size, 'Medium'),
    category: safeString(system.category, system.type || 'Vehicle'),
    domain: (system.domain || system.category || system.type || 'planetary').includes('ship') ? 'starship' : 'planetary'
  };
}

/**
 * Main vehicle import normalizer
 * Called during vehicle preCreate or import workflow
 * Ensures all downstream contracts are met without breaking on missing fields
 *
 * @param {Object} system - The vehicle system data object (actor.system)
 * @returns {Object} Normalized system data (safe to Object.assign into actor.system)
 */
export function normalizeVehicleImportData(system) {
  if (!system || typeof system !== 'object') {
    SWSELogger.warn(`[${SYSTEM_ID}] normalizeVehicleImportData called with invalid system data`);
    return {};
  }

  const normalized = {};

  try {
    // ════════════════════════════════════════════════════════════════════════════
    // IDENTITY: Type, size, category, domain
    // ════════════════════════════════════════════════════════════════════════════
    const identity = normalizeIdentity(system);
    normalized.type = identity.type;
    normalized.size = identity.size;
    normalized.category = identity.category;
    normalized.domain = identity.domain;

    // ════════════════════════════════════════════════════════════════════════════
    // DEFENSES: Normalize all vehicle defenses to v2 contract shape
    // ════════════════════════════════════════════════════════════════════════════
    const defenses = normalizeDefenses(system);

    // Apply normalized defenses to system (flat format for derived builder input)
    normalized.reflexDefense = defenses.ref.total;
    normalized.fortitudeDefense = defenses.fort.total;
    normalized.willDefense = defenses.will.total;
    normalized.flatFooted = defenses.flatFooted.total;

    // Store defense objects for context rendering (if needed)
    normalized.defenses = {
      ref: defenses.ref,
      fort: defenses.fort,
      will: defenses.will,
      flatFooted: defenses.flatFooted
    };

    // ════════════════════════════════════════════════════════════════════════════
    // HP/HULL: Normalize from legacy or modern format
    // ════════════════════════════════════════════════════════════════════════════
    const hp = normalizeHp(system);
    normalized.hp = {
      value: hp.value,
      max: Math.max(1, hp.max),
      temp: hp.temp
    };

    // Also preserve legacy hull field (for compatibility)
    normalized.hull = {
      value: hp.value,
      max: Math.max(1, hp.max)
    };

    // ════════════════════════════════════════════════════════════════════════════
    // DAMAGE: Threshold and reduction
    // ════════════════════════════════════════════════════════════════════════════
    normalized.damageThreshold = safeNumber(system.damageThreshold ?? system.damage_threshold, 10);
    normalized.damageReduction = safeNumber(system.damageReduction ?? system.damage_reduction, 0);

    // ════════════════════════════════════════════════════════════════════════════
    // CREW: Normalize crew count, quality, and positions
    // ════════════════════════════════════════════════════════════════════════════
    const crew = normalizeCrew(system);
    normalized.crew = crew;
    normalized.crewPositions = normalizeCrewPositions(system);

    // ════════════════════════════════════════════════════════════════════════════
    // SHIELDS: For starships/capital ships
    // ════════════════════════════════════════════════════════════════════════════
    normalized.shields = normalizeShields(system);

    // ════════════════════════════════════════════════════════════════════════════
    // CARGO: Normalize cargo capacity and contents
    // ════════════════════════════════════════════════════════════════════════════
    normalized.cargo = normalizeCargo(system);

    // ════════════════════════════════════════════════════════════════════════════
    // WEAPONS: Clean corrupted entries, normalize structure
    // ════════════════════════════════════════════════════════════════════════════
    normalized.weapons = normalizeWeapons(system.weapons ?? []);

    // ════════════════════════════════════════════════════════════════════════════
    // SUBSYSTEMS: For house rule engine
    // ════════════════════════════════════════════════════════════════════════════
    normalized.subsystems = normalizeSubsystems(system.subsystems ?? []);

    // ════════════════════════════════════════════════════════════════════════════
    // POWER: For EnhancedEngineer rule surface
    // ════════════════════════════════════════════════════════════════════════════
    normalized.power = normalizePower(system);

    // ════════════════════════════════════════════════════════════════════════════
    // CONDITION TRACK: Vehicle damage condition progression
    // ════════════════════════════════════════════════════════════════════════════
    normalized.conditionTrack = normalizeConditionTrack(system);

    // ════════════════════════════════════════════════════════════════════════════
    // METADATA: Preserve core vehicle metadata
    // ════════════════════════════════════════════════════════════════════════════
    normalized.cost = system.cost ?? { new: 0, used: 0 };
    normalized.sourcebook = safeString(system.sourcebook, '');
    normalized.page = system.page ?? null;
    normalized.description = safeString(system.description, '');

    // Speed fields
    normalized.speed = safeString(system.speed || system.maxVelocity, '12 squares');
    normalized.maxVelocity = safeString(system.maxVelocity, '12 squares');
    normalized.starshipSpeed = safeString(system.starshipSpeed, '');

    // Additional fields
    normalized.hyperdrive_class = safeString(system.hyperdrive_class, '');
    normalized.backup_class = safeString(system.backup_class, '');
    normalized.passengers = safeString(system.passengers, '0');
    normalized.consumables = safeString(system.consumables, '1 month');
    normalized.carried_craft = safeString(system.carried_craft, '');
    normalized.crewNotes = safeString(system.crewNotes || system.crew_notes, '');
    normalized.senses = safeString(system.senses, '');

    // Combat stats
    normalized.armorBonus = safeNumber(system.armorBonus ?? system.armor_bonus, 0);
    normalized.baseAttackBonus = safeString(system.baseAttackBonus ?? system.bab, '+0');
    normalized.initiative = safeString(system.initiative, '+0');
    normalized.maneuver = safeString(system.maneuver, '+0');
    normalized.usePilotLevel = system.usePilotLevel ?? false;

    // Tags (if present)
    normalized.tags = Array.isArray(system.tags) ? system.tags : [];

    // ════════════════════════════════════════════════════════════════════════════
    // LOGGING: Diagnostic output for import verification
    // ════════════════════════════════════════════════════════════════════════════
    SWSELogger.debug(`[${SYSTEM_ID}] Normalized vehicle import: ${identity.type} (${identity.domain}), HP: ${normalized.hp.value}/${normalized.hp.max}, Defenses: Ref ${normalized.reflexDefense}, Fort ${normalized.fortitudeDefense}`);

    return normalized;
  } catch (err) {
    SWSELogger.error(`[${SYSTEM_ID}] Error in normalizeVehicleImportData:`, err.message, err);
    // Return partial result with critical fields only
    return {
      hp: normalizeHp(system),
      hull: {
        value: safeNumber(system.hp?.value ?? system.hull?.value ?? 0, 0),
        max: safeNumber(system.hp?.max ?? system.hull?.max ?? 1, 1)
      }
    };
  }
}

/**
 * Export helper functions for testing/reuse
 */
export {
  normalizeDefenseValue,
  normalizeDefenses,
  normalizeHp,
  normalizeCrew,
  normalizeShields,
  normalizeCargo,
  normalizeWeapons,
  normalizeSubsystems,
  normalizePower,
  normalizeCrewPositions,
  normalizeConditionTrack,
  normalizeIdentity
};
