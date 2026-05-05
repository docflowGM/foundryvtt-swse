/**
 * Mentor Adapter Layer
 *
 * Extracts and structures engine outputs for mentor voice consumption.
 * Pure data extraction and translation — NO ANALYSIS COMPUTATION.
 *
 * Contract:
 * - Input: BuildIntent, BuildAnalysisEngine output, archetype data
 * - Output: Structured context for voice layer composition
 * - Mapper: Applies mapBiasProfileToLanguage for semantic descriptors
 * - Voice layer: Uses descriptors to compose dialogue with personality
 *
 * Key separation:
 * - Adapter provides MEANING (semantic fragments)
 * - Voice layer provides PERSONALITY (how it feels)
 */

// eslint-disable-next-line
import CLASS_ARCHETYPES from "/systems/foundryvtt-swse/data/class-archetypes.json" with { type: "json" };
import { mapBiasProfileToLanguage, getPathDisposition } from "/systems/foundryvtt-swse/scripts/mentor/mentor-language-mapper.js";

/**
 * Extract mentor context from engine outputs.
 *
 * @param {Object} options
 * @param {Actor} options.actor - The character actor
 * @param {BuildIntent} options.buildIntent - Build intent with selections
 * @param {Object} options.analysis - BuildAnalysisEngine output
 * @param {Object} options.mentorMemory - Mentor memory state (optional)
 *
 * @returns {Object} Mentor context for voice composition
 *   {
 *     actor,
 *     class,
 *     level,
 *     identity: {
 *       primary: { name, description, roleDescriptors, mechanicalDescriptors, ... },
 *       secondary: { name, description, roleDescriptors, mechanicalDescriptors, ... }
 *     },
 *     signals: { conflicts, strengths },
 *     buildMechanics: { combatStyle, primaryThemes, prestigeAffinities },
 *     commitment: { path, strength, disposition }
 *   }
 */
export function getMentorContext(options = {}) {
  const { actor, buildIntent = {}, analysis = {}, mentorMemory = {} } = options;

  if (!actor) {
    console.warn('[MentorAdapter] No actor provided to getMentorContext');
    return null;
  }

  const level = actor.system?.level || 1;
  const className = actor.items
    .filter(i => i.type === 'class')
    .map(c => c.name)
    .join(', ') || 'Adventurer';

  // Extract archetype IDs from analysis
  const primaryId = analysis?.archetype || null;
  const secondaryId = analysis?.secondaryArchetype || null;

  // Build identity context with semantic language mapping
  const identity = _buildIdentityContext(
    className,
    primaryId,
    secondaryId
  );

  // Extract signals (do NOT recompute)
  const signals = {
    conflicts: analysis?.conflictSignals || [],
    strengths: analysis?.strengthSignals || [],
  };

  // Get build mechanics from buildIntent (pre-computed by engine)
  const buildMechanics = {
    combatStyle: buildIntent?.combatStyle || 'mixed',
    primaryThemes: buildIntent?.primaryThemes || [],
    prestigeAffinities: buildIntent?.prestigeAffinities || [],
  };

  // Commitment state
  const commitment = {
    path: mentorMemory?.committedPath || null,
    strength: mentorMemory?.commitmentStrength || 0,
    disposition: mentorMemory?.committedPath
      ? getPathDisposition(mentorMemory.committedPath, mentorMemory)
      : 'neutral'
  };

  return {
    actor,
    class: className,
    level,
    identity,
    signals,
    buildMechanics,
    commitment,
  };
}

/**
 * Build identity context with semantic language mappings.
 * Uses mapper to translate bias tags → semantic descriptors.
 * Voice layer uses these fragments to compose personality-driven dialogue.
 *
 * @private
 */
function _buildIdentityContext(className, primaryId, secondaryId) {
  const classKey = String(className || '').toLowerCase().trim();
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];

  if (!classBlock?.archetypes) {
    return { primary: null, secondary: null };
  }

  const primary = classBlock.archetypes[primaryId]
    ? _mapArchetypeToIdentity(primaryId, classBlock.archetypes[primaryId])
    : null;

  const secondary = classBlock.archetypes[secondaryId]
    ? _mapArchetypeToIdentity(secondaryId, classBlock.archetypes[secondaryId])
    : null;

  return { primary, secondary };
}

/**
 * Map an archetype to identity context with semantic language.
 * @private
 */
function _mapArchetypeToIdentity(id, archetype) {
  // Get semantic descriptors from bias profile
  const language = mapBiasProfileToLanguage({
    roleBias: archetype.roleBias || {},
    mechanicalBias: archetype.mechanicalBias || {},
    attributeBias: archetype.attributeBias || {}
  });

  return {
    id,
    name: archetype.name,
    description: archetype.notes,
    status: archetype.status || 'active',
    // Semantic language for voice layer to compose with
    roleDescriptors: language.roleDescriptors,
    mechanicalDescriptors: language.mechanicalDescriptors,
    attributeDescriptors: language.attributeDescriptors,
    summaryDescriptors: language.summaryDescriptors,
    dominantThemes: language.dominantThemes,
    // Raw data for voice layer if needed
    roleBias: archetype.roleBias || {},
    mechanicalBias: archetype.mechanicalBias || {},
    attributeBias: archetype.attributeBias || {},
    talents: archetype.talents || [],
    feats: archetype.feats || []
  };
}

/**
 * Get all archetype options for a class (for path selection).
 * Pulls directly from data source, maps to identity format.
 *
 * @param {string} className
 * @returns {Array} Array of archetype identity contexts
 */
export function getArchetypeOptions(className) {
  const classKey = String(className || '').toLowerCase().trim();
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];

  if (!classBlock?.archetypes) return [];

  return Object.entries(classBlock.archetypes).map(([key, archetype]) =>
    _mapArchetypeToIdentity(key, archetype)
  );
}

/**
 * Extract conflict signal details for mentor interpretation.
 * Mentor voice decides how to frame these.
 *
 * @param {Object} signal - Conflict signal from analysis
 * @returns {Object} Signal with semantic fields
 */
export function formatConflictSignal(signal) {
  if (!signal) return null;

  return {
    id: signal.id,
    category: signal.category,
    severity: signal.severity, // 'critical' | 'important' | 'minor'
    evidence: signal.evidence,
  };
}

/**
 * Extract strength signal details for mentor affirmation.
 * Mentor voice decides how to compose these.
 *
 * @param {Object} signal - Strength signal from analysis
 * @returns {Object} Signal with semantic fields
 */
export function formatStrengthSignal(signal) {
  if (!signal) return null;

  return {
    id: signal.id,
    category: signal.category,
    strength: signal.strength,
    evidence: signal.evidence,
  };
}

export default {
  getMentorContext,
  getArchetypeOptions,
  formatConflictSignal,
  formatStrengthSignal
};
