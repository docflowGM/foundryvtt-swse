/**
 * ArchetypeDefinitions
 *
 * ⚠️ Resolver-only module: MUST NOT define archetype facts.
 *
 * Runtime SSOT:
 *   - /data/class-archetypes.json
 *
 * Generic fallback:
 *   - /data/generic-archetypes.json
 *
 * Default weights:
 *   - /data/default-archetype-weights.json
 */

import { SWSELogger } from '../utils/logger.js';
import CLASS_ARCHETYPES from '../../data/class-archetypes.json' with { type: 'json' };
import GENERIC_ARCHETYPES from '../../data/generic-archetypes.json' with { type: 'json' };
import DEFAULT_WEIGHTS from '../../data/default-archetype-weights.json' with { type: 'json' };

export const DEFAULT_ARCHETYPE_WEIGHTS = DEFAULT_WEIGHTS;

function mapSsotArchetypeToLegacy(key, a) {
  return {
    key,
    displayName: a.name,
    description: a.description || '',
    roleBias: a.roleBias || {},
    focusAttributes: a.focusAttributes || Object.keys(a.attributeBias || {}),
    focusSkills: a.focusSkills || [],
    talentKeywords: a.talentKeywords || [],
    philosophyStatement: a.philosophyStatement || '',
    mentorQuote: a.mentorQuote || '',
    warning: a.warning || ''
  };
}

/**
 * Get archetype configuration (class-specific or generic)
 * @param {string|null} className
 * @returns {Object<string, Object>}
 */
export function getArchetypeConfig(className = null) {
  if (!className) {
    SWSELogger.log('[ArchetypeDefinitions] No class specified, returning generic archetypes');
    return { ...GENERIC_ARCHETYPES };
  }

  const classKey = String(className).toLowerCase();
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];

  if (!classBlock?.archetypes) {
    SWSELogger.log(`[ArchetypeDefinitions] Class "${className}" not found, returning generic archetypes`);
    return { ...GENERIC_ARCHETYPES };
  }

  const mapped = {};
  for (const [key, a] of Object.entries(classBlock.archetypes)) {
    mapped[key] = mapSsotArchetypeToLegacy(key, a);
  }

  return mapped;
}

export function getClassArchetypes(className) {
  return Object.values(getArchetypeConfig(className));
}

export function getArchetypeByKey(archetypeKey, className = null) {
  const config = getArchetypeConfig(className);
  return config[archetypeKey] || null;
}

export function listArchetypeKeys(className = null) {
  return Object.keys(getArchetypeConfig(className));
}

export function getArchetypeDisplayName(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.displayName || null;
}

export function getArchetypeDescription(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.description || '';
}

export function getArchetypePhilosophy(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.philosophyStatement || '';
}

export function getArchetypeMentorQuote(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.mentorQuote || '';
}

export function getArchetypeFocusAttributes(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.focusAttributes || [];
}

export function getArchetypeRoleBias(archetypeKey, className = null) {
  const archetype = getArchetypeByKey(archetypeKey, className);
  return archetype?.roleBias || {};
}
