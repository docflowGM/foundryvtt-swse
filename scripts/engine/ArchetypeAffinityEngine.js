/**
 * ArchetypeAffinityEngine
 *
 * JavaScript port of the Python archetype engine (Steps 2-6).
 *
 * Implements:
 *  - STEP 2: Archetype affinity scoring & suggestion weighting
 *  - STEP 3: Archetype dataset validation
 *  - STEP 3.5: Explanation generation
 *  - STEP 4.5: Persistence + drift detection
 *  - STEP 5-6: Prestige hinting & Foundry bridge
 *
 * Key principles:
 * ✅ Read-only (never mutates archetype data)
 * ✅ Name-based resolution (safe across refactors)
 * ✅ Soft, non-exclusive archetypes (softmax normalization)
 * ✅ Deterministic, testable (pure functions)
 */

import { SWSELogger } from '../utils/logger.js';

// Lazy-loaded archetype data (to avoid JSON import issues in Foundry)
let CLASS_ARCHETYPES = null;

/**
 * Load archetype data from JSON file
 * @returns {Promise<Object>} Archetype data
 */
export async function loadArchetypeData() {
  if (CLASS_ARCHETYPES) {
    return CLASS_ARCHETYPES;
  }

  try {
    const response = await fetch('systems/foundryvtt-swse/data/class-archetypes.json');
    CLASS_ARCHETYPES = await response.json();
    return CLASS_ARCHETYPES;
  } catch (err) {
    SWSELogger.error('[ArchetypeAffinityEngine] Failed to load archetype data:', err);
    return { classes: {} };
  }
}

// ─────────────────────────────────────────────────────────────
// CONFIG & CONSTANTS
// ─────────────────────────────────────────────────────────────

const REQUIRED_ARCHETYPE_FIELDS = [
  'name',
  'status',
  'mechanicalBias',
  'roleBias',
  'attributeBias',
  'talentKeywords',
  'featKeywords',
  'notes'
];

const ACTIVE_STATUS = 'active';
const PRESTIGE_HINT_THRESHOLD = 0.30;
const SECONDARY_HINT_THRESHOLD = 0.18;

// Prestige path mapping (design-owned, explicit)
export const PRESTIGE_MAP = {
  'Jedi Guardian': ['Jedi Knight', 'Elite Trooper'],
  'Aggressive Duelist': ['Weapon Master', 'Duelist'],
  'Force Adept': ['Jedi Master', 'Mystic Advisor'],
  'Balanced Knight': ['Jedi Knight', 'Diplomatic Envoy'],
  'Guardian Defender': ['Jedi Knight', 'Elite Trooper']
};

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Canonical name normalization for safe matching
 * @param {string} name
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  return (name || '').toLowerCase().trim();
}

/**
 * Converts nested class->archetypes structure into flat dict
 * @param {Object} data - Raw archetype data
 * @param {boolean} includeStubs - Include stub archetypes
 * @returns {Object} Flattened archetypes
 */
function flattenArchetypes(data, includeStubs = false) {
  const flat = {};
  const classes = data.classes || {};

  for (const [classKey, classData] of Object.entries(classes)) {
    const archetypes = classData.archetypes || {};

    for (const [archetypeKey, archetypeData] of Object.entries(archetypes)) {
      const status = archetypeData.status;

      if (!includeStubs && status !== ACTIVE_STATUS) {
        continue;
      }

      const name = archetypeData.name || archetypeKey;
      const nameKey = normalizeName(name);
      flat[nameKey] = archetypeData;
    }
  }

  return flat;
}

/**
 * Softmax normalization for affinity distribution
 * @param {Object} scores - Raw scores { archetype: score }
 * @returns {Object} Normalized scores summing to ~1.0
 */
function softmax(scores) {
  if (Object.keys(scores).length === 0) {
    return {};
  }

  const maxScore = Math.max(...Object.values(scores));
  const expScores = {};

  for (const [key, value] of Object.entries(scores)) {
    expScores[key] = Math.exp(value - maxScore);
  }

  const total = Object.values(expScores).reduce((a, b) => a + b, 0);

  const result = {};
  for (const [key, value] of Object.entries(expScores)) {
    result[key] = value / total;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// STEP 3: VALIDATION (CI-SAFE)
// ─────────────────────────────────────────────────────────────

/**
 * Validates archetype data integrity
 * Fails hard on missing fields or invalid status in active archetypes
 * @param {Object} archetypes - Flattened archetypes
 * @returns {Object} { valid: boolean, errors: [], stats: {} }
 */
export function validateArchetypes(archetypes) {
  const errors = [];
  let activeCount = 0;
  let stubCount = 0;

  for (const [key, archetype] of Object.entries(archetypes)) {
    const status = archetype.status;

    if (status === 'stub') {
      stubCount++;
      continue;
    }

    if (status !== ACTIVE_STATUS) {
      errors.push(
        `[INVALID STATUS] ${archetype.name || key} → ${status} (expected 'active' or 'stub')`
      );
      continue;
    }

    activeCount++;

    // Check required fields
    const missing = REQUIRED_ARCHETYPE_FIELDS.filter(field => !(field in archetype));
    if (missing.length > 0) {
      errors.push(
        `[MISSING FIELDS] ${archetype.name || key} → [${missing.join(', ')}]`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: { activeCount, stubCount, totalCount: activeCount + stubCount }
  };
}

// ─────────────────────────────────────────────────────────────
// STEP 2: AFFINITY SCORING ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * Calculates archetype affinity based on character state
 * @param {Object} archetypes - Flattened archetypes
 * @param {Object} characterState - { feats, talents, attributes }
 * @returns {Object} Normalized affinity scores
 */
export function calculateArchetypeAffinity(archetypes, characterState) {
  const affinity = {};

  const feats = (characterState.feats || []).map(normalizeName);
  const talents = (characterState.talents || []).map(normalizeName);
  const attributes = characterState.attributes || {};

  for (const archetype of Object.values(archetypes)) {
    let score = 0.0;

    // Feat keyword alignment
    for (const kw of archetype.featKeywords || []) {
      if (feats.includes(normalizeName(kw))) {
        score += 1.0;
      }
    }

    // Talent keyword alignment
    for (const kw of archetype.talentKeywords || []) {
      if (talents.includes(normalizeName(kw))) {
        score += 1.5;
      }
    }

    // Attribute bias alignment
    for (const [attr, weight] of Object.entries(archetype.attributeBias || {})) {
      if (attr in attributes) {
        score += attributes[attr] * weight * 0.01;
      }
    }

    if (score > 0) {
      affinity[normalizeName(archetype.name)] = score;
    }
  }

  return softmax(affinity);
}

/**
 * Applies archetype bias to suggestion scores
 * @param {Object} baseSuggestions - { name: baseScore }
 * @param {Object} archetypeAffinity - { archetype: affinityScore }
 * @param {Object} archetypes - Flattened archetypes
 * @returns {Object} Weighted suggestion scores
 */
export function weightSuggestions(baseSuggestions, archetypeAffinity, archetypes) {
  const weighted = {};

  for (const [suggestion, baseScore] of Object.entries(baseSuggestions)) {
    let multiplier = 1.0;
    const sNorm = normalizeName(suggestion);

    for (const archetype of Object.values(archetypes)) {
      const nameKey = normalizeName(archetype.name);
      const affinity = archetypeAffinity[nameKey] || 0;

      const featMatches = (archetype.featKeywords || []).map(normalizeName).includes(sNorm);
      const talentMatches = (archetype.talentKeywords || []).map(normalizeName).includes(sNorm);

      if (featMatches || talentMatches) {
        multiplier += affinity * 0.75;
      }
    }

    weighted[suggestion] = Math.round(baseScore * multiplier * 10000) / 10000;
  }

  return weighted;
}

// ─────────────────────────────────────────────────────────────
// STEP 3.5: EXPLANATION GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generates human-readable explanation for a suggestion
 * @param {string} suggestionName
 * @param {Object} archetypeAffinity
 * @param {Object} archetypes
 * @param {number} maxArchetypes - Max archetypes to reference
 * @returns {string} Explanation text
 */
export function explainSuggestion(
  suggestionName,
  archetypeAffinity,
  archetypes,
  maxArchetypes = 2
) {
  if (Object.keys(archetypeAffinity).length === 0) {
    return 'This option is a solid general choice for your character.';
  }

  // Sort archetypes by affinity
  const ranked = Object.entries(archetypeAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxArchetypes);

  const explanations = [];

  for (const [archetypeName, score] of ranked) {
    for (const archetype of Object.values(archetypes)) {
      if (normalizeName(archetype.name) === archetypeName) {
        explanations.push(
          `${archetype.name}–style build (${archetype.notes})`
        );
        break;
      }
    }
  }

  if (explanations.length === 0) {
    return 'This option aligns with your current build direction.';
  }

  if (explanations.length === 1) {
    return `This fits well with your ${explanations[0]}.`;
  }

  return `This fits well with your ${explanations.join(' and ')}.`;
}

/**
 * Batch explanation generation
 * @param {Object} suggestions - { name: score }
 * @param {Object} archetypeAffinity
 * @param {Object} archetypes
 * @returns {Object} { name: explanation }
 */
export function explainSuggestionBatch(suggestions, archetypeAffinity, archetypes) {
  const explanations = {};

  for (const suggestion of Object.keys(suggestions)) {
    explanations[suggestion] = explainSuggestion(
      suggestion,
      archetypeAffinity,
      archetypes
    );
  }

  return explanations;
}

// ─────────────────────────────────────────────────────────────
// STEP 4.5: PERSISTENCE & DRIFT DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Creates a persistable affinity snapshot
 * Storage: actor.flags.swse.archetypeAffinity
 * @param {Object} characterState
 * @param {Object} archetypeAffinity
 * @param {string} engineVersion
 * @returns {Object} Snapshot object
 */
export function buildAffinitySnapshot(
  characterState,
  archetypeAffinity,
  engineVersion = '1.0'
) {
  const relevantState = {
    feats: [...(characterState.feats || [])].sort(),
    talents: [...(characterState.talents || [])].sort(),
    attributes: characterState.attributes || {}
  };

  const stateHash = hashState(relevantState);

  return {
    version: engineVersion,
    stateHash,
    affinity: archetypeAffinity,
    sourceState: relevantState,
    timestamp: Date.now()
  };
}

/**
 * Detects if affinity needs recomputation
 * @param {Object} storedSnapshot
 * @param {Object} currentCharacterState
 * @returns {boolean} True if recomputation needed
 */
export function affinityNeedsRecompute(storedSnapshot, currentCharacterState) {
  if (!storedSnapshot) {
    return true;
  }

  const relevantState = {
    feats: [...(currentCharacterState.feats || [])].sort(),
    talents: [...(currentCharacterState.talents || [])].sort(),
    attributes: currentCharacterState.attributes || {}
  };

  const currentHash = hashState(relevantState);
  return currentHash !== storedSnapshot.stateHash;
}

/**
 * Simple SHA1-like hash for state comparison
 * (Uses a simple deterministic approach suitable for change detection)
 * @param {Object} data
 * @returns {string} Hash string
 */
function hashState(data) {
  // Use JSON stringify with sorted keys for deterministic hashing
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16);
}

// ─────────────────────────────────────────────────────────────
// STEP 5-6: PRESTIGE HINTING & FOUNDRY BRIDGE
// ─────────────────────────────────────────────────────────────

/**
 * Generates non-forcing prestige path hints
 * @param {Object} archetypeAffinity
 * @param {Object} archetypes
 * @param {Object} prestigeMap
 * @returns {Array<Object>} Prestige hints
 */
export function generatePrestigeHints(archetypeAffinity, archetypes, prestigeMap = PRESTIGE_MAP) {
  const hints = [];

  for (const [archetypeName, affinity] of Object.entries(archetypeAffinity)) {
    if (affinity < SECONDARY_HINT_THRESHOLD) {
      continue;
    }

    // Find matching prestige options
    let prestigeOptions = null;
    for (const [mapKey, mapOptions] of Object.entries(prestigeMap)) {
      if (normalizeName(mapKey) === archetypeName) {
        prestigeOptions = mapOptions;
        break;
      }
    }

    if (!prestigeOptions) {
      continue;
    }

    const strength = affinity >= PRESTIGE_HINT_THRESHOLD ? 'primary' : 'secondary';

    hints.push({
      archetype: archetypeName,
      affinity: Math.round(affinity * 1000) / 1000,
      strength,
      prestigeOptions,
      explanation: buildPrestigeExplanation(
        archetypeName,
        affinity,
        prestigeOptions,
        archetypes
      )
    });
  }

  return hints.sort((a, b) => b.affinity - a.affinity);
}

/**
 * Builds prestige explanation text
 * @param {string} archetypeName
 * @param {number} affinity
 * @param {Array<string>} prestigeOptions
 * @param {Object} archetypes
 * @returns {string} Explanation text
 */
function buildPrestigeExplanation(archetypeName, affinity, prestigeOptions, archetypes) {
  let notes = 'your current build direction';

  for (const archetype of Object.values(archetypes)) {
    if (normalizeName(archetype.name) === archetypeName) {
      notes = archetype.notes;
      break;
    }
  }

  const prestigeList = prestigeOptions.join(', ');

  if (affinity >= PRESTIGE_HINT_THRESHOLD) {
    return (
      `Your build strongly reflects a ${archetypeName.replace(/\b\w/g, c => c.toUpperCase())} style ` +
      `(${notes}). You may want to consider prestige paths like ${prestigeList}.`
    );
  }

  return (
    `Parts of your build align with a ${archetypeName.replace(/\b\w/g, c => c.toUpperCase())} approach ` +
    `(${notes}). Prestige options such as ${prestigeList} could become relevant.`
  );
}

/**
 * Exports Foundry-ready integration contract
 * Storage: actor.flags.swse.buildGuidance
 * @param {Object} archetypeAffinity
 * @param {Array<Object>} prestigeHints
 * @returns {Object} Foundry payload
 */
export function exportFoundryContract(archetypeAffinity, prestigeHints) {
  return {
    archetypeAffinity,
    prestigeHints,
    meta: {
      engine: 'SWSE Archetype Engine',
      version: '1.0',
      nonForcing: true,
      timestamp: Date.now()
    }
  };
}

// ─────────────────────────────────────────────────────────────
// ACTOR INTEGRATION
// ─────────────────────────────────────────────────────────────

/**
 * Initialize archetype affinity on an actor
 * Called during character creation or first access
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function initializeActorAffinity(actor) {
  try {
    if (!actor.system.flags) {
      actor.system.flags = {};
    }
    if (!actor.system.flags.swse) {
      actor.system.flags.swse = {};
    }

    // Initialize if not already present
    if (!actor.system.flags.swse.archetypeAffinity) {
      actor.system.flags.swse.archetypeAffinity = {
        version: '1.0',
        affinity: {},
        stateHash: null,
        timestamp: Date.now()
      };

      await actor.update({
        'system.flags.swse.archetypeAffinity': actor.system.flags.swse.archetypeAffinity
      });

      SWSELogger.log('[ArchetypeAffinityEngine] Initialized affinity for', actor.name);
    }
  } catch (err) {
    SWSELogger.error('[ArchetypeAffinityEngine] Error initializing actor affinity:', err);
  }
}

/**
 * Calculate and cache affinity for an actor
 * Stores at actor.flags.swse.archetypeAffinity
 * @param {Actor} actor
 * @returns {Promise<Object>} Updated affinity object
 */
export async function recalculateActorAffinity(actor) {
  try {
    await initializeActorAffinity(actor);

    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);

    // Build character state from actor
    const characterState = extractCharacterState(actor);

    // Calculate affinity
    const affinity = calculateArchetypeAffinity(archetypes, characterState);

    // Create snapshot
    const snapshot = buildAffinitySnapshot(characterState, affinity);

    // Generate prestige hints
    const prestigeHints = generatePrestigeHints(affinity, archetypes);

    // Export Foundry contract
    const buildGuidance = exportFoundryContract(affinity, prestigeHints);

    // Update actor flags
    await actor.update({
      'system.flags.swse.archetypeAffinity': snapshot,
      'system.flags.swse.buildGuidance': buildGuidance
    });

    SWSELogger.log(`[ArchetypeAffinityEngine] Recalculated affinity for ${actor.name}`);

    return { affinity, snapshot, buildGuidance };
  } catch (err) {
    SWSELogger.error('[ArchetypeAffinityEngine] Error recalculating affinity:', err);
    return { affinity: {}, snapshot: null, buildGuidance: null };
  }
}

/**
 * Get current affinity for an actor (with recomputation if needed)
 * @param {Actor} actor
 * @returns {Promise<Object>} { affinity, needsUpdate: boolean }
 */
export async function getActorAffinity(actor) {
  try {
    await initializeActorAffinity(actor);

    const stored = actor.system.flags.swse.archetypeAffinity;
    const characterState = extractCharacterState(actor);

    const needsRecompute = affinityNeedsRecompute(stored, characterState);

    if (needsRecompute) {
      const result = await recalculateActorAffinity(actor);
      return {
        affinity: result.affinity,
        needsUpdate: true,
        reason: 'Character state changed'
      };
    }

    return {
      affinity: stored.affinity || {},
      needsUpdate: false,
      reason: 'Using cached affinity'
    };
  } catch (err) {
    SWSELogger.error('[ArchetypeAffinityEngine] Error getting actor affinity:', err);
    return { affinity: {}, needsUpdate: false, error: err.message };
  }
}

/**
 * Extract character state from actor
 * @param {Actor} actor
 * @returns {Object} { feats, talents, attributes }
 */
export function extractCharacterState(actor) {
  const feats = [];
  const talents = [];

  // Get feats
  for (const item of actor.items) {
    if (item.type === 'feat') {
      feats.push(item.name);
    } else if (item.type === 'talent') {
      talents.push(item.name);
    }
  }

  // Get attributes (SWSE uses STR, DEX, CON, INT, WIS, CHA)
  const attributes = {};
  const attrMap = {
    'STR': 'strength',
    'DEX': 'dexterity',
    'CON': 'constitution',
    'INT': 'intelligence',
    'WIS': 'wisdom',
    'CHA': 'charisma'
  };

  for (const [abbr, name] of Object.entries(attrMap)) {
    const attr = actor.system.attributes?.[abbr];
    if (attr) {
      attributes[abbr] = attr.value || attr.total || 10;
    }
  }

  return { feats, talents, attributes };
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Initialize and validate archetype data
 * Must be called after Foundry is ready
 * @returns {Promise<Object>} Validation result
 */
export async function initializeArchetypeData() {
  try {
    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);
    const validation = validateArchetypes(archetypes);

    if (!validation.valid) {
      SWSELogger.warn('[ArchetypeAffinityEngine] Validation errors:');
      validation.errors.forEach(e => SWSELogger.warn(' -', e));
    }

    SWSELogger.log(
      `[ArchetypeAffinityEngine] Loaded ${validation.stats.activeCount} active archetypes ` +
      `(${validation.stats.stubCount} stubs)`
    );

    return { ...validation, archetypes };
  } catch (err) {
    SWSELogger.error('[ArchetypeAffinityEngine] Error initializing archetype data:', err);
    return { valid: false, errors: [err.message], stats: {}, archetypes: {} };
  }
}

// Lazy initialization (will be called on first use or by setup hook)
export let ARCHETYPE_DATA = { valid: false, errors: [], stats: {}, archetypes: {} };
