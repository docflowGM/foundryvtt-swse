/**
 * mentor-archetype-paths (legacy bridge)
 *
 * ⚠️ This module MUST NOT define archetype facts.
 * Canonical runtime archetypes live in: /data/class-archetypes.json
 *
 * This file preserves the legacy "path" shape expected by mentor modules.
 */

// eslint-disable-next-line
import CLASS_ARCHETYPES from "/systems/foundryvtt-swse/data/class-archetypes.json' with { type: 'json' };

function normalizeClassKey(className) {
  return String(className || '').toLowerCase().trim();
}

function mapSsotArchetypeToPath(key, a) {
  return {
    displayName: a.name,
    description: a.description || '',
    roleBias: a.roleBias || {},
    focusAttributes: a.focusAttributes || Object.keys(a.attributeBias || {}),
    focusSkills: a.focusSkills || [],
    talentKeywords: a.talentKeywords || [],
    warning: a.warning || '',
    philosophyStatement: a.philosophyStatement || '',
    mentorQuote: a.mentorQuote || ''
  };
}

/**
 * Get archetype paths for a class (legacy shape).
 * @param {string} className
 * @returns {Object<string, object>}
 */
export function getArchetypePaths(className) {
  const classKey = normalizeClassKey(className);
  const classBlock = CLASS_ARCHETYPES?.classes?.[classKey];
  if (!classBlock?.archetypes) return {};

  const mapped = {};
  for (const [key, a] of Object.entries(classBlock.archetypes)) {
    mapped[key] = mapSsotArchetypeToPath(key, a);
  }
  return mapped;
}

/**
 * Get a specific archetype path (legacy shape).
 * @param {string} className
 * @param {string} archetypeName
 * @returns {object|null}
 */
export function getArchetype(className, archetypeName) {
  const paths = getArchetypePaths(className);
  return paths[archetypeName] || null;
}

/**
 * Analyze synergies between actor state and an archetype
 * @param {Actor} actor
 * @param {object} archetype
 * @returns {{strong: string[], weak: string[]}}
 */
export function analyzeSynergies(actor, archetype) {
  if (!actor || !archetype) {
    return { strong: [], weak: [] };
  }

  const synergies = { strong: [], weak: [] };

  // Attribute synergies
  const attributes = actor.system.attributes || {};
  for (const attr of archetype.focusAttributes || []) {
    const value = attributes[attr]?.base || 10;
    if (value >= 14) {
      synergies.strong.push(`${attr.toUpperCase()} (${value}) supports this path`);
    } else if (value < 12) {
      synergies.weak.push(`${attr.toUpperCase()} (${value}) is underdeveloped for this path`);
    }
  }

  // Skill synergies
  const skills = actor.system.skills || {};
  for (const skillKey of archetype.focusSkills || []) {
    const skill = skills[skillKey];
    if (skill && skill.trained) {
      synergies.strong.push(`${skill.name || skillKey} reinforces your approach`);
    } else if (skill) {
      synergies.weak.push(`${skill.name || skillKey} is not yet trained`);
    }
  }

  // Talent synergies
  const talents = actor.items
    .filter(i => i.type === 'talent')
    .map(t => t.name);

  for (const talent of talents) {
    for (const keyword of archetype.talentKeywords || []) {
      if (talent.includes(keyword)) {
        synergies.strong.push(`${talent} aligns with this archetype`);
        break;
      }
    }
  }

  return synergies;
}

/**
 * Generate attribute recommendations for an archetype
 * @param {object} archetype
 * @returns {string[]}
 */
export function suggestAttributesForArchetype(archetype) {
  if (!archetype || !archetype.focusAttributes) {
    return [];
  }

  return archetype.focusAttributes.map(attr =>
    `If you continue this path, improving ${attr.toUpperCase()} will matter more.`
  );
}

/**
 * Get role bias multipliers for an archetype (for suggestion engine)
 * @param {object} archetype
 * @returns {object}
 */
export function getArchetypeRoleBias(archetype) {
  return archetype?.roleBias || {};
}
