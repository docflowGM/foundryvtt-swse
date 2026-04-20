/**
 * Vehicle Weapon Import Normalizer (Phase: Vehicle Weapons Importer)
 *
 * Parses and normalizes vehicle weapon data from compendium imports.
 * Handles:
 * - Structured weapon objects (modern format)
 * - Semi-structured text (legacy format)
 * - Creates mount-aware normalized summaries
 * - Preserves raw source data for compatibility
 * - Optionally creates embedded weapon items
 *
 * Execution flow:
 * 1. extractVehicleWeaponSources() - Find weapon data in vehicle system
 * 2. parseVehicleWeaponEntry() - Parse individual entries (text or object)
 * 3. buildVehicleWeaponMountSummary() - Create mount-aware context for sheet
 * 4. buildVehicleWeaponItemData() - Create embedded item data if needed
 * 5. normalizeVehicleWeaponImportData() - Orchestrate full pipeline
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Safe string coercion
 */
function safeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

/**
 * Safe number coercion
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse fire arc from text
 * "Forward", "front", "fore" → "forward"
 * "Aft", "rear" → "aft"
 * "Port", "left" → "port"
 * "Starboard", "right" → "starboard"
 * "Turret", "omni", "all" → "turret"
 */
function parseArcFromText(text) {
  if (!text) return 'unknown';

  const lower = safeString(text).toLowerCase();

  if (lower.includes('forward') || lower.includes('front') || lower.includes('fore')) {
    return 'forward';
  }
  if (lower.includes('aft') || lower.includes('rear')) {
    return 'aft';
  }
  if (lower.includes('port') || lower.includes('left')) {
    return 'port';
  }
  if (lower.includes('starboard') || lower.includes('right')) {
    return 'starboard';
  }
  if (lower.includes('turret') || lower.includes('omni') || lower.includes('all') || lower.includes('360')) {
    return 'turret';
  }

  return 'unknown';
}

/**
 * Parse fire control from text
 * "Manual", "pilot", "hand" → "manual"
 * "Auto", "autofire", "automatic" → "autofire"
 * "Battery", "linked" → "battery"
 */
function parseFireControlFromText(text) {
  if (!text) return null;

  const lower = safeString(text).toLowerCase();

  if (lower.includes('auto')) return 'autofire';
  if (lower.includes('battery') || lower.includes('linked')) return 'battery';
  if (lower.includes('manual') || lower.includes('pilot') || lower.includes('hand')) return 'manual';

  return null;
}

/**
 * Parse linked group from text
 * "2 Double Laser Cannons (battery)" → "Double Laser Cannons"
 * "Port and Starboard Blaster Cannons" → "Blaster Cannons"
 * "(linked)" or "(battery)" suffix → base name is group
 */
function parseLinkedGroupFromText(text, baseName) {
  if (!text) return null;

  const lower = safeString(text).toLowerCase();

  // If text explicitly mentions battery/linked with a count, group might be the weapon type
  if ((lower.includes('battery') || lower.includes('linked')) && baseName) {
    return baseName;
  }

  // If text mentions port/starboard together, might be grouped
  if ((lower.includes('port') && lower.includes('starboard')) || lower.includes('both sides')) {
    return baseName || null;
  }

  return null;
}

/**
 * Parse attack bonus from text
 * "+8", "8", "-2" → "+8", "+0", "-2"
 */
function parseAttackSummaryFromText(text) {
  if (!text) return null;

  const match = safeString(text).match(/([+-]?\d+)/);
  if (match) {
    const bonus = parseInt(match[1]);
    return bonus >= 0 ? `+${bonus}` : `${bonus}`;
  }

  return null;
}

/**
 * Parse damage from text
 * "4d10", "2d10x2", "d10" → "4d10", "2d10x2", "1d10"
 */
function parseDamageSummaryFromText(text) {
  if (!text) return null;

  // Look for pattern like "Xd10", "d10x2", "2d10x2"
  const match = safeString(text).match(/(\d*)d(\d+)(?:x(\d+))?/i);
  if (match) {
    const diceCount = match[1] || '1';
    const diceType = match[2];
    const multiplier = match[3] ? `x${match[3]}` : '';
    return `${diceCount}d${diceType}${multiplier}`;
  }

  return null;
}

/**
 * Coerce weapon name from various sources
 */
function coerceWeaponName(entry) {
  if (typeof entry === 'object' && entry.name) {
    return safeString(entry.name, 'Weapon');
  }
  if (typeof entry === 'string') {
    return safeString(entry, 'Weapon');
  }
  return 'Weapon';
}

/**
 * Extract weapon sources from vehicle system
 * Returns array of raw weapon entries (objects or strings)
 */
export function extractVehicleWeaponSources(system) {
  const sources = [];

  // Priority 1: system.weapons array (current standard)
  if (Array.isArray(system.weapons)) {
    sources.push(...system.weapons);
  }

  // Priority 2: system.weaponMounts array (legacy variant)
  if (Array.isArray(system.weaponMounts)) {
    sources.push(...system.weaponMounts);
  }

  // Priority 3: system.armament (legacy variant)
  if (Array.isArray(system.armament)) {
    sources.push(...system.armament);
  }

  return sources;
}

/**
 * Parse single vehicle weapon entry
 * Handles structured object or text string
 *
 * @param {Object|String} entry - Weapon entry
 * @param {Number} index - Entry index for fallback key generation
 * @returns {Object} Parsed weapon data
 */
export function parseVehicleWeaponEntry(entry, index = 0) {
  const parsed = {
    index,
    name: 'Weapon',
    arc: 'unknown',
    fireControl: null,
    linkedGroup: null,
    attackSummary: null,
    damageSummary: null,
    rangeSummary: null,
    crewRole: null,
    rawSource: '',
    parseConfidence: 'fallback' // structured, partial, fallback
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LAYER 1: Structured object input
  // ════════════════════════════════════════════════════════════════════════════
  if (typeof entry === 'object' && entry !== null) {
    parsed.rawSource = JSON.stringify(entry);
    parsed.parseConfidence = 'structured';

    // Extract fields directly
    parsed.name = coerceWeaponName(entry);
    parsed.arc = safeString(entry.arc, 'unknown');
    parsed.fireControl = safeString(entry.fireControl || entry.firecontrol, null) || null;
    parsed.linkedGroup = safeString(entry.linkedGroup || entry.linkedgroup, null) || null;
    parsed.attackSummary = safeString(entry.attackBonus || entry.bonus || entry.attack, null) || null;
    parsed.damageSummary = safeString(entry.damage, null) || null;
    parsed.rangeSummary = safeString(entry.range, null) || null;
    parsed.crewRole = safeString(entry.crewRole || entry.crew, null) || null;

    // Normalize arc if it's a raw value
    if (parsed.arc !== 'unknown') {
      parsed.arc = parseArcFromText(parsed.arc);
    }

    return parsed;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LAYER 2: Semi-structured text parsing
  // ════════════════════════════════════════════════════════════════════════════
  if (typeof entry === 'string' && entry.length > 0) {
    parsed.rawSource = entry;
    parsed.parseConfidence = 'partial';

    // Try to extract structured elements from text like:
    // "Laser Cannon (Forward) +8, 4d10"
    // "2 Double Laser Cannons (turret), +5, 2d10x2"

    const text = entry.trim();

    // Extract parenthetical arc: "(forward)" "(turret)" etc
    const arcMatch = text.match(/\(([^)]+)\)/i);
    if (arcMatch) {
      parsed.arc = parseArcFromText(arcMatch[1]);
    }

    // Extract bonus: "+8" or "+0" or "-2"
    const bonusMatch = text.match(/([+-]\d+)(?:,|\s|$)/);
    if (bonusMatch) {
      const bonus = parseInt(bonusMatch[1]);
      parsed.attackSummary = `+${Math.max(0, bonus)}`;
    }

    // Extract damage: "4d10" "2d10x2" etc
    const damageMatch = text.match(/(\d*d\d+(?:x\d+)?)/i);
    if (damageMatch) {
      parsed.damageSummary = damageMatch[1].toLowerCase();
    }

    // Try to extract weapon name (before parentheses)
    const nameMatch = text.match(/^([^(]+)/);
    if (nameMatch) {
      const name = safeString(nameMatch[1]).replace(/^\d+\s+/, ''); // Remove leading count
      if (name) parsed.name = name;
    }

    // Check for fire control keywords
    parsed.fireControl = parseFireControlFromText(text);

    // Check for linked/battery grouping
    parsed.linkedGroup = parseLinkedGroupFromText(text, parsed.name);

    return parsed;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LAYER 3: Fallback (empty/invalid entry)
  // ════════════════════════════════════════════════════════════════════════════
  parsed.rawSource = typeof entry === 'string' ? entry : '(empty or invalid entry)';
  parsed.parseConfidence = 'fallback';

  return parsed;
}

/**
 * Build vehicle weapon mount summary for sheet rendering
 * Prepares context.vehiclePanels.weaponMountPanel mounts array entry
 */
export function buildVehicleWeaponMountSummary(parsed, index = 0) {
  return {
    key: `mount-${index}`,
    index,
    name: parsed.name || 'Weapon',
    arc: parsed.arc || 'unknown',
    linkedGroup: parsed.linkedGroup,
    fireControl: parsed.fireControl,
    gunner: 'Unassigned',  // planned Phase 3: implement crew assignments
    crewRole: parsed.crewRole || 'gunner',
    attackSummary: parsed.attackSummary,
    damageSummary: parsed.damageSummary,
    rangeSummary: parsed.rangeSummary,
    notes: [],
    rawSource: parsed.rawSource,
    parseConfidence: parsed.parseConfidence
  };
}

/**
 * Build embedded weapon item data from parsed weapon
 * Creates data suitable for Item.create({ type: 'weapon', system: {...} })
 */
export function buildVehicleWeaponItemData(parsed, index = 0, options = {}) {
  // Extract bonus as numeric value if possible
  let bonus = 0;
  if (parsed.attackSummary) {
    const match = safeString(parsed.attackSummary).match(/([+-]?\d+)/);
    bonus = match ? parseInt(match[1]) : 0;
  }

  const itemData = {
    name: parsed.name || `Weapon ${index + 1}`,
    type: 'weapon',
    system: {
      damage: parsed.damageSummary || '1d10',
      damageType: 'energy',
      attackBonus: bonus,
      attackAttribute: 'dex',  // Vehicles typically use DEX
      range: parsed.rangeSummary || 'close',
      bonus: parsed.attackSummary || '+0',  // String form for sheet
      arc: parsed.arc || 'unknown',
      fireControl: parsed.fireControl,
      linkedGroup: parsed.linkedGroup,
      mounted: true,
      vehicleMount: {
        mountKey: `mount-${index}`,
        mountLabel: parsed.name,
        arc: parsed.arc || 'unknown',
        linkedGroup: parsed.linkedGroup,
        fireControl: parsed.fireControl,
        crewRole: parsed.crewRole || 'gunner',
        importSource: 'compendium-vehicle-weapon-import',
        parseConfidence: parsed.parseConfidence,
        rawSource: parsed.rawSource
      }
    }
  };

  // Add import metadata
  if (options.preserveSource) {
    itemData.system.notes = `[Imported from: ${parsed.rawSource}]`;
  }

  return itemData;
}

/**
 * Generate deterministic hash for weapon deduplication
 * Used to prevent duplicate imports on repeated normalizer runs
 */
function generateWeaponHash(parsed) {
  const key = `${parsed.name}|${parsed.arc}|${parsed.attackSummary}`;
  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

/**
 * Detect if weapon already exists on actor (deduplication)
 * Prevents duplicate imports when normalizer is run multiple times
 */
function weaponAlreadyExists(actor, parsed) {
  if (!actor.items) return false;

  // Check for matching weapon by name+arc+bonus
  const key = `${parsed.name}|${parsed.arc}|${parsed.attackSummary}`;

  return actor.items.some(item => {
    if (item.type !== 'weapon') return false;

    const itemKey = `${item.name}|${item.system?.arc || 'unknown'}|${item.system?.bonus || '+0'}`;
    return itemKey === key;
  });
}

/**
 * Main vehicle weapon import normalizer
 * Called from vehicle import workflow to parse and normalize all weapons
 *
 * @param {Actor} actor - Vehicle actor document
 * @param {Object} options - Normalization options
 *   - createItems: {Boolean} Create embedded weapon items (default: true)
 *   - preserveSource: {Boolean} Add raw source to item notes (default: true)
 * @returns {Object} Normalized weapon data {mounts, items, rawSources}
 */
export async function normalizeVehicleWeaponImportData(actor, options = {}) {
  const opts = {
    createItems: options.createItems !== false,
    preserveSource: options.preserveSource !== false,
    ...options
  };

  const result = {
    mounts: [],          // Mount summaries for sheet context
    items: [],           // Item data for embedded weapons
    rawSources: [],      // Original source data
    parseStats: {
      total: 0,
      structured: 0,
      partial: 0,
      fallback: 0,
      itemsCreated: 0,
      deduped: 0
    }
  };

  if (!actor || !actor.system) {
    return result;
  }

  try {
    const sources = extractVehicleWeaponSources(actor.system);
    result.parseStats.total = sources.length;

    // Parse each weapon source
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const parsed = parseVehicleWeaponEntry(source, i);

      // Track parse confidence
      if (parsed.parseConfidence === 'structured') result.parseStats.structured++;
      else if (parsed.parseConfidence === 'partial') result.parseStats.partial++;
      else result.parseStats.fallback++;

      // Create mount summary for sheet rendering
      const mount = buildVehicleWeaponMountSummary(parsed, i);
      result.mounts.push(mount);
      result.rawSources.push(parsed.rawSource);

      // Create embedded item if requested
      if (opts.createItems) {
        // Check for duplicates (deduplication)
        if (weaponAlreadyExists(actor, parsed)) {
          result.parseStats.deduped++;
          SWSELogger.debug(`[${SYSTEM_ID}] Weapon "${parsed.name}" already exists, skipping duplicate import`);
          continue;
        }

        const itemData = buildVehicleWeaponItemData(parsed, i, opts);
        result.items.push(itemData);
        result.parseStats.itemsCreated++;
      }
    }

    SWSELogger.debug(
      `[${SYSTEM_ID}] Vehicle weapon import: ${result.parseStats.total} sources → ` +
      `${result.parseStats.structured} structured, ${result.parseStats.partial} partial, ${result.parseStats.fallback} fallback | ` +
      `${result.parseStats.itemsCreated} items created, ${result.parseStats.deduped} deduped`
    );

    return result;
  } catch (err) {
    SWSELogger.error(`[${SYSTEM_ID}] Error in normalizeVehicleWeaponImportData:`, err.message, err);
    return result;
  }
}

/**
 * Create embedded weapon items on vehicle actor
 * Called after normalizeVehicleWeaponImportData to materialize items
 */
export async function createVehicleWeaponItems(actor, itemDataArray) {
  if (!actor || !Array.isArray(itemDataArray) || itemDataArray.length === 0) {
    return [];
  }

  try {
    const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemDataArray, { source: 'vehicle-weapon-import-normalizer' });
    SWSELogger.debug(`[${SYSTEM_ID}] Created ${created.length} embedded weapon items on vehicle`);
    return created;
  } catch (err) {
    SWSELogger.error(`[${SYSTEM_ID}] Failed to create embedded weapon items:`, err.message);
    return [];
  }
}

/**
 * Export all helper functions for testing
 */
export {
  parseArcFromText,
  parseFireControlFromText,
  parseLinkedGroupFromText,
  parseAttackSummaryFromText,
  parseDamageSummaryFromText,
  coerceWeaponName
};
