/**
 * Pending Species Context Builder
 *
 * Creates canonical pending species context for progression and legacy chargen.
 * Bridges Species Grant Ledger into both systems during character creation.
 *
 * Purpose: Transform selected species into a fully-normalized pending context that
 * can be consumed by progression engine, legacy chargen, and prerequisite checks.
 *
 * Usage:
 *   const pending = await buildPendingSpeciesContext(actor, speciesIdentity);
 *   // pending contains: identity, abilities, movements, traits, grants, entitlements
 *   // Ready for progression engine, chargen mutation, and prerequisite visibility
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SpeciesGrantLedgerBuilder } from '/systems/foundryvtt-swse/scripts/species/species-grant-ledger-builder.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { computeStartingFeatsRequired } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shared/species-patch.js';

/**
 * @typedef {Object} PendingSpeciesContext
 * @property {Object} identity - Species identity info
 * @property {string} identity.id - Stable ID
 * @property {string} identity.name - Display name
 * @property {string} identity.source - Content source
 * @property {Object} identity.doc - Original Foundry document (if available)
 *
 * @property {Object} physical - Physical characteristics
 * @property {string} physical.size - Size category
 * @property {Object} physical.movements - Movement modes {walk, swim, fly, ...}
 *
 * @property {Object} abilities - Ability score adjustments
 * @property {number} abilities.str
 * @property {number} abilities.dex
 * @property {number} abilities.con
 * @property {number} abilities.int
 * @property {number} abilities.wis
 * @property {number} abilities.cha
 *
 * @property {Array} traits - Classified traits from ledger
 *
 * @property {Object} entitlements - Species-based character entitlements
 * @property {number} entitlements.featsRequired - Based on species+actorType
 * @property {Array} entitlements.languages - Known languages
 * @property {Array} entitlements.skills - Trained skills (if applicable)
 * @property {number} entitlements.bonusSpeed - Speed modifier (if any)
 *
 * @property {Object} ledger - Full normalized Species Grant Ledger
 *
 * @property {Object} metadata
 * @property {number} metadata.createdAt - Timestamp
 * @property {string} metadata.source - "progression"|"chargen"
 */

/**
 * Build a complete pending species context for progression/chargen.
 *
 * This is the canonical bridge between:
 * - Phase 1: Species Grant Ledger (compendium + traits JSON)
 * - Phase 2: Progression engine (pending state)
 * - Phase 2: Legacy chargen (local mutations)
 * - Future: Actor grants and sheet rendering
 *
 * @param {Actor} actor - Current actor (may be null for new character)
 * @param {string|Object} speciesIdentity - Species name, ID, or document
 * @param {Object} options - Configuration
 * @param {string} options.source - Where this context came from ("progression"|"chargen")
 * @returns {Promise<PendingSpeciesContext|null>} Normalized context or null
 */
export async function buildPendingSpeciesContext(actor, speciesIdentity, options = {}) {
  const { source = 'progression' } = options;

  try {
    // PHASE 4: Special handling for Near-Human with customization package
    if (typeof speciesIdentity === 'object' && speciesIdentity.speciesName === 'Near-Human') {
      const nearHumanPackage = speciesIdentity;
      SWSELogger.log('[PendingSpeciesContext] Detected Near-Human package - delegating to customization handler');
      return await _buildNearHumanContext(actor, nearHumanPackage, options);
    }

    // Step 1: Resolve species identity to registry entry
    const speciesEntry = await _resolveSpeciesEntry(speciesIdentity);
    if (!speciesEntry) {
      SWSELogger.warn('[PendingSpeciesContext] Could not resolve species identity:', speciesIdentity);
      return null;
    }

    // Step 2: Build full Species Grant Ledger via canonical builder
    const ledger = await SpeciesGrantLedgerBuilder.build(speciesEntry);
    if (!ledger) {
      SWSELogger.warn('[PendingSpeciesContext] Failed to build ledger for:', speciesEntry.name);
      return null;
    }

    // Step 3: Extract entitlements (feats, languages, bonuses)
    const actorType = actor?.type ?? 'character';
    const isDroid = actor?.system?.isDroid ?? false;
    const entitlements = _extractEntitlements(speciesEntry.name, actorType, isDroid, ledger);

    // Step 4: Build complete context
    const context = {
      identity: {
        id: speciesEntry.id,
        name: speciesEntry.name,
        source: speciesEntry.source || 'Unknown',
        doc: speciesEntry, // Keep original for reference
      },

      physical: {
        size: ledger.physical?.size || 'Medium',
        movements: ledger.physical?.movements || { walk: 6 },
      },

      abilities: {
        str: ledger.abilities?.str ?? 0,
        dex: ledger.abilities?.dex ?? 0,
        con: ledger.abilities?.con ?? 0,
        int: ledger.abilities?.int ?? 0,
        wis: ledger.abilities?.wis ?? 0,
        cha: ledger.abilities?.cha ?? 0,
      },

      traits: ledger.traits || [],

      entitlements,

      ledger, // Full ledger for downstream use

      metadata: {
        createdAt: Date.now(),
        source,
        actorType,
      },
    };

    SWSELogger.log('[PendingSpeciesContext] Built context for:', {
      species: speciesEntry.name,
      source,
      actorType,
      featsRequired: entitlements.featsRequired,
      hasTraits: context.traits?.length ?? 0,
    });

    return context;
  } catch (err) {
    SWSELogger.error('[PendingSpeciesContext] Error building context:', err);
    return null;
  }
}

/**
 * Resolve species identity to a registry entry.
 * Accepts: string (name/id), document object, or registry entry.
 *
 * @private
 */
async function _resolveSpeciesEntry(speciesIdentity) {
  // Already a registry entry
  if (speciesIdentity && speciesIdentity.id && speciesIdentity.name) {
    return speciesIdentity;
  }

  // String: lookup in registry
  if (typeof speciesIdentity === 'string') {
    // Try direct ID lookup first
    const byId = SpeciesRegistry.getById(speciesIdentity);
    if (byId) return byId;

    // Try name lookup
    const all = SpeciesRegistry.getAll() || [];
    return all.find(s => s.name?.toLowerCase() === speciesIdentity.toLowerCase()) || null;
  }

  // Document object: extract identity
  if (speciesIdentity && typeof speciesIdentity === 'object') {
    const name = speciesIdentity.name;
    if (name) {
      return _resolveSpeciesEntry(name);
    }
  }

  return null;
}

/**
 * Extract species-based entitlements from ledger and identity.
 * Computes feats, languages, and special bonuses.
 *
 * @private
 */
function _extractEntitlements(speciesName, actorType, isDroid, ledger) {
  const entitlements = {
    featsRequired: computeStartingFeatsRequired({
      isHuman: speciesName === 'Human',
      isNPC: actorType === 'npc',
      isDroid,
    }),
    languages: [],
    skills: [],
    bonusSpeed: 0,
  };

  // Languages from ledger
  if (ledger.languages && Array.isArray(ledger.languages)) {
    entitlements.languages = [...ledger.languages];
  }

  // Trained skills (if any species grant them)
  if (ledger.skills && Array.isArray(ledger.skills)) {
    entitlements.skills = [...ledger.skills];
  }

  // Movement bonus (if any)
  if (ledger.physical?.movements?.walk) {
    // Calculate speed bonus vs standard 6 (30 ft)
    const standard = 6;
    const actual = ledger.physical.movements.walk;
    if (actual > standard) {
      entitlements.bonusSpeed = actual - standard;
    }
  }

  return entitlements;
}

/**
 * Apply pending species context to actor's system data (for chargen/progression).
 * Non-destructive: prepares data without persisting to actor.
 *
 * Used by chargen to mutate this.characterData without actor persistence.
 * Used by progression to build patches for later application.
 *
 * @param {Object} targetSystem - System data object to mutate (characterData, system)
 * @param {PendingSpeciesContext} context - Pending context from buildPendingSpeciesContext
 * @returns {Object} Mutated target (same reference)
 */
export function applyPendingSpeciesContext(targetSystem, context) {
  if (!targetSystem || !context) return targetSystem;

  // Identity
  targetSystem.species = context.identity.name;
  targetSystem.speciesSource = context.identity.source;

  // Physical
  targetSystem.size = context.physical.size;
  if (context.physical.movements?.walk) {
    targetSystem.speed = context.physical.movements.walk;
  }

  // Abilities (as modifiers)
  if (!targetSystem.abilities) targetSystem.abilities = {};
  for (const [key, value] of Object.entries(context.abilities)) {
    if (!targetSystem.abilities[key]) {
      targetSystem.abilities[key] = {};
    }
    targetSystem.abilities[key].racial = value;
  }

  // Entitlements
  targetSystem.featsRequired = context.entitlements.featsRequired;
  targetSystem.languages = context.entitlements.languages;

  // Size-based modifiers (ref defense, stealth)
  const sizeModifiers = _computeSizeModifiers(context.physical.size);
  if (sizeModifiers) {
    targetSystem.sizeModifiers = sizeModifiers;
  }

  return targetSystem;
}

/**
 * Compute size-based defense and skill modifiers per SWSE rules.
 *
 * @private
 */
function _computeSizeModifiers(size) {
  const modifiers = {
    'Fine': { reflex: 8, stealth: 16 },
    'Diminutive': { reflex: 4, stealth: 12 },
    'Tiny': { reflex: 2, stealth: 8 },
    'Small': { reflex: 1, stealth: 5 },
    'Medium': { reflex: 0, stealth: 0 },
    'Large': { reflex: -1, stealth: -5 },
    'Huge': { reflex: -2, stealth: -10 },
    'Gargantuan': { reflex: -5, stealth: -12 },
    'Colossal': { reflex: -10, stealth: -16 },
  };

  return modifiers[size] || modifiers['Medium'];
}

/**
 * Build a grants object for progression engine from pending context.
 * Extracts grants that should be materialized during species confirmation.
 *
 * @param {PendingSpeciesContext} context
 * @returns {Object} Grants structure for progression system
 */
export function extractGrantsFromPendingSpecies(context) {
  if (!context) return {};

  const grants = {};

  // Feats from traits (if any trait provides feat grants)
  const traitFeats = (context.traits || [])
    .filter(t => t.classification === 'grant' && t.grants?.some(g => g.grantType === 'feat'))
    .flatMap(t => t.grants || [])
    .filter(g => g.grantType === 'feat');

  if (traitFeats.length > 0) {
    grants.feats = traitFeats.map(f => f.target);
  }

  // Languages
  if (context.entitlements.languages?.length > 0) {
    grants.languages = context.entitlements.languages;
  }

  // Skills (if species provides any trained skills)
  if (context.entitlements.skills?.length > 0) {
    grants.skills = context.entitlements.skills;
  }

  // Natural weapons
  if (context.ledger?.naturalWeapons?.length > 0) {
    grants.naturalWeapons = context.ledger.naturalWeapons;
  }

  return grants;
}
