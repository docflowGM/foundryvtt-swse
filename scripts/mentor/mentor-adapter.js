/**
 * Mentor Adapter Layer
 *
 * Extracts and packages engine output for mentor consumption.
 * Pure presentation data extraction — NO ANALYSIS COMPUTATION.
 *
 * Contract:
 * - Input: BuildIntent, BuildAnalysisEngine output, ArchetypeRegistry data
 * - Output: Structured mentor context ready for voice filtering
 * - Never recomputes analysis, gaps, abilities, or roles
 * - Only translates engine truth to presentation layer
 */

// eslint-disable-next-line
import CLASS_ARCHETYPES from "/systems/foundryvtt-swse/data/class-archetypes.json" with { type: "json" };
import { getArchetypePaths } from "/systems/foundryvtt-swse/scripts/mentor/mentor-archetype-paths.js";

/**
 * Extract mentor context from engine outputs.
 *
 * @param {Object} options
 * @param {Actor} options.actor - The character actor
 * @param {BuildIntent} options.buildIntent - Build intent object with selections
 * @param {Object} options.analysis - BuildAnalysisEngine output with signals and archetype
 * @param {Object} options.mentorMemory - Mentor relationship state (optional)
 *
 * @returns {Object} Mentor context ready for voice filtering
 *   {
 *     actor,
 *     class,
 *     level,
 *     theme,
 *     inferredRole,
 *     archetype: { primary, secondary },
 *     signals: { conflicts: [...], strengths: [...] },
 *     archetypeDescriptions: { primary: {...}, secondary: {...} },
 *     commitmentPath,
 *     buildMechanics: { combatStyle, primaryThemes, prestigeAffinities }
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

  // Extract primary and secondary archetypes from analysis
  const primaryArchetype = analysis?.archetype || null;
  const secondaryArchetype = analysis?.secondaryArchetype || null;

  // Get archetype descriptions from class-archetypes.json
  const archetypeDescriptions = _getArchetypeDescriptions(
    className,
    primaryArchetype,
    secondaryArchetype
  );

  // Extract signals from analysis (do NOT recompute)
  const signals = {
    conflicts: analysis?.conflictSignals || [],
    strengths: analysis?.strengthSignals || [],
  };

  // Get build mechanics from buildIntent (already computed by engine)
  const buildMechanics = {
    combatStyle: buildIntent?.combatStyle || 'mixed',
    primaryThemes: buildIntent?.primaryThemes || [],
    prestigeAffinities: buildIntent?.prestigeAffinities || [],
  };

  // Get committed path from mentor memory
  const committedPath = mentorMemory?.committedPath || null;
  const commitmentStrength = mentorMemory?.commitmentStrength || 0;

  return {
    actor,
    class: className,
    level,
    primaryArchetype,
    secondaryArchetype,
    archetype: archetypeDescriptions,
    signals,
    buildMechanics,
    commitmentPath,
    commitmentStrength,
  };
}

/**
 * Get archetype descriptions from data source.
 * Never synthesizes descriptions — only retrieves.
 *
 * @private
 */
function _getArchetypeDescriptions(className, primaryId, secondaryId) {
  const classKey = String(className || '').toLowerCase().trim();
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];

  if (!classBlock?.archetypes) {
    return { primary: null, secondary: null };
  }

  const primary = classBlock.archetypes[primaryId]
    ? {
        id: primaryId,
        name: classBlock.archetypes[primaryId].name,
        description: classBlock.archetypes[primaryId].notes,
        roleBias: classBlock.archetypes[primaryId].roleBias || {},
        mechanicalBias: classBlock.archetypes[primaryId].mechanicalBias || {},
        attributeBias: classBlock.archetypes[primaryId].attributeBias || {},
        talents: classBlock.archetypes[primaryId].talents || [],
        feats: classBlock.archetypes[primaryId].feats || [],
      }
    : null;

  const secondary = classBlock.archetypes[secondaryId]
    ? {
        id: secondaryId,
        name: classBlock.archetypes[secondaryId].name,
        description: classBlock.archetypes[secondaryId].notes,
        roleBias: classBlock.archetypes[secondaryId].roleBias || {},
        mechanicalBias: classBlock.archetypes[secondaryId].mechanicalBias || {},
        attributeBias: classBlock.archetypes[secondaryId].attributeBias || {},
        talents: classBlock.archetypes[secondaryId].talents || [],
        feats: classBlock.archetypes[secondaryId].feats || [],
      }
    : null;

  return { primary, secondary };
}

/**
 * Extract conflict signal details for mentor explanation.
 * Used to populate "what am I doing wrong" dialogue.
 *
 * @param {Object} signal - Conflict signal from analysis
 * @returns {Object} Signal with mentor-friendly fields
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
 * Used to populate "what am I doing well" dialogue.
 *
 * @param {Object} signal - Strength signal from analysis
 * @returns {Object} Signal with mentor-friendly fields
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

/**
 * Get all archetype options for a class (for path selection dialogue).
 * Pulls directly from data source, no synthesis.
 *
 * @param {string} className
 * @returns {Array} Array of {id, name, description, roleBias, mechanicalBias}
 */
export function getArchetypeOptions(className) {
  const classKey = String(className || '').toLowerCase().trim();
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];

  if (!classBlock?.archetypes) return [];

  return Object.entries(classBlock.archetypes).map(([key, archetype]) => ({
    id: key,
    name: archetype.name,
    description: archetype.notes,
    roleBias: archetype.roleBias || {},
    mechanicalBias: archetype.mechanicalBias || {},
    attributeBias: archetype.attributeBias || {},
  }));
}

export default { getMentorContext, formatConflictSignal, formatStrengthSignal, getArchetypeOptions };
