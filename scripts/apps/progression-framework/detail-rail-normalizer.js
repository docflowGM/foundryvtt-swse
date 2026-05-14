/**
 * DETAIL RAIL NORMALIZER
 *
 * Central source of truth for detail panel data across all item types.
 * Implements the data contract for honest, fabrication-free display of item information.
 *
 * KEY PRINCIPLE: Never invent missing data. Use explicit fallbacks.
 * - Descriptions: Show canonical text or "No description available."
 * - Prerequisites: Show structured, text, or "None" (no inference)
 * - Metadata: Show where canonical, omit if absent
 * - Mentor Prose: Show ONLY where it actually exists canonically
 *
 * This normalizer is the bridge between step plugins and detail panel templates.
 * Supports: feats, talents, species, class, background, force powers/techniques/secrets,
 * languages, skills, starship maneuvers, attributes (11 types total).
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { buildSpeciesTags } from '/systems/foundryvtt-swse/scripts/engine/species/species-profile-utils.js';
import { SkillsMechanicsResolver } from './skills-mechanics-resolver.js';

// ============================================================================
// SKILL SHORT DESCRIPTIONS — Curated descriptions for all skills
// ============================================================================

let SKILL_SHORT_DESCRIPTIONS = null;

/**
 * Load skill short descriptions from JSON file (one-time init)
 */
async function loadSkillShortDescriptions() {
  if (SKILL_SHORT_DESCRIPTIONS !== null) {
    return SKILL_SHORT_DESCRIPTIONS;  // Already loaded
  }

  try {
    const response = await fetch('systems/foundryvtt-swse/data/skill-short-descriptions.json');
    if (response.ok) {
      SKILL_SHORT_DESCRIPTIONS = await response.json();
    } else {
      swseLogger.warn('[DetailRailNormalizer] Could not load skill-short-descriptions.json');
      SKILL_SHORT_DESCRIPTIONS = {};
    }
  } catch (err) {
    swseLogger.warn('[DetailRailNormalizer] Failed to load skill descriptions:', err);
    SKILL_SHORT_DESCRIPTIONS = {};
  }

  return SKILL_SHORT_DESCRIPTIONS;
}

/**
 * Get skill short description synchronously (for templates)
 * Pre-load via loadSkillShortDescriptions() first
 */
function getSkillShortDescription(skillKey) {
  if (!SKILL_SHORT_DESCRIPTIONS) {
    return null;
  }
  return SKILL_SHORT_DESCRIPTIONS[skillKey] || null;
}

// ============================================================================
// ATTRIBUTE GUIDANCE — Hardcoded for Attributes (only type with pre-authored prose)
// ============================================================================

const ATTRIBUTE_GUIDANCE = {
  str: {
    label: 'Strength',
    description: 'Raw physical power and martial prowess',
    guidance: 'Strength affects melee combat effectiveness, carrying capacity, and physical dominance. Soldiers and combat-focused characters benefit greatly from high Strength.',
    affects: ['Melee attack rolls', 'Melee damage', 'Carrying capacity', 'Climb and Jump checks'],
  },
  dex: {
    label: 'Dexterity',
    description: 'Agility, reflexes, and hand-eye coordination',
    guidance: 'Dexterity improves initiative, ranged attacks, and your Reflex defense. Scoundrels, pilots, and swift combatants value this highly.',
    affects: ['Initiative', 'Ranged attack rolls', 'Reflex defense', 'Acrobatics and Stealth checks', 'Armor defense bonus'],
  },
  con: {
    label: 'Constitution',
    description: 'Endurance and physical resilience',
    guidance: 'Constitution determines your hit points and Fortitude defense. Every character needs solid Constitution to survive in dangerous situations.',
    affects: ['Hit points', 'Fortitude defense', 'Endurance and survival checks'],
  },
  int: {
    label: 'Intelligence',
    description: 'Intellect, reasoning, and knowledge',
    guidance: 'Intelligence grants extra skill points and improves Knowledge abilities. Tech Specialists and technical experts rely on this as a primary stat.',
    affects: ['Extra skill points per level', 'Knowledge checks', 'Technician and Mechanic ability', 'Science and research'],
  },
  wis: {
    label: 'Wisdom',
    description: 'Perception, intuition, and force affinity',
    guidance: 'Wisdom determines your Will defense and Force affinity. Jedi and Force users need high Wisdom as their primary stat.',
    affects: ['Will defense', 'Force affinity and power', 'Perception checks', 'Insight and awareness'],
  },
  cha: {
    label: 'Charisma',
    description: 'Force of personality and social influence',
    guidance: 'Charisma enhances social interactions, persuasion, and leadership. Essential for social characters, diplomats, and natural leaders.',
    affects: ['Persuasion and Deception', 'Social ability checks', 'Reputation and contacts', 'Leadership and command'],
  },
};

// ============================================================================
// MAIN NORMALIZER
// ============================================================================

/**
 * Initialize the normalizer (load skill descriptions once)
 * Call this once at app startup
 */
export async function initializeDetailRailNormalizer() {
  await loadSkillShortDescriptions();
}

/**
 * Normalize detail panel data for any item type
 * @param {Object} itemData - The item object (species, feat, talent, etc.)
 * @param {string} itemType - The item type ('species', 'feat', 'talent', etc.)
 * @param {Object} context - Additional context (actor, mentorProseSource, etc.)
 * @returns {Object} Normalized data object ready for template
 */
export function normalizeDetailPanelData(itemData, itemType, context = {}) {
  if (!itemData || !itemType) {
    return {
      description: null,
      prerequisites: null,
      metadataTags: [],
      mentorProse: null,
      fallbacks: {
        hasDescription: false,
        hasPrerequisites: false,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: 'unknown',
        prerequisiteSource: 'unknown',
        metadataSource: 'unknown',
        mentorThoughtSource: 'unknown',
      },
    };
  }

  const handler = NORMALIZER_HANDLERS[itemType];
  if (!handler) {
    swseLogger.warn(`[DetailRailNormalizer] Unknown item type: ${itemType}`);
    return getEmptyNormalization();
  }

  try {
    return handler(itemData, context);
  } catch (err) {
    swseLogger.error(`[DetailRailNormalizer] Error normalizing ${itemType}:`, err);
    return getEmptyNormalization();
  }
}

/**
 * Empty/error normalization
 */
function getEmptyNormalization() {
  return {
    description: null,
    prerequisites: null,
    metadataTags: [],
    mentorProse: null,
    fallbacks: {
      hasDescription: false,
      hasPrerequisites: false,
      hasMentorProse: false,
    },
    sourceNotes: {
      descriptionSource: 'unknown',
      prerequisiteSource: 'unknown',
      metadataSource: 'unknown',
      mentorThoughtSource: 'unknown',
    },
  };
}


/**
 * Convert the many Foundry v13 description shapes into safe display text.
 * This intentionally never stringifies arbitrary objects, because that is how
 * `[object Object]` leaked into the chargen detail rail.
 */
export function extractDescriptionText(itemOrData) {
  const candidates = [
    itemOrData?.system?.description?.value,
    itemOrData?.system?.description?.long,
    itemOrData?.system?.description?.short,
    itemOrData?.system?.description?.text,
    itemOrData?.system?.description?.html,
    itemOrData?.system?.description?.plain,
    itemOrData?.system?.description,
    itemOrData?.system?.benefit?.value,
    itemOrData?.system?.benefit,
    itemOrData?.system?.details?.description?.value,
    itemOrData?.system?.details?.description,
    itemOrData?.description?.value,
    itemOrData?.description?.long,
    itemOrData?.description?.short,
    itemOrData?.description?.text,
    itemOrData?.description?.html,
    itemOrData?.description?.plain,
    itemOrData?.description,
    itemOrData?.narrativeDescription,
    itemOrData?.fantasy,
    itemOrData?.text?.description,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDescriptionCandidate(candidate);
    if (normalized) return normalized;
  }

  return '';
}

function normalizeDescriptionCandidate(candidate) {
  if (candidate == null) return '';

  if (typeof candidate === 'string') {
    return cleanDescriptionString(candidate);
  }

  if (typeof candidate === 'number' || typeof candidate === 'boolean') {
    return cleanDescriptionString(String(candidate));
  }

  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      const normalized = normalizeDescriptionCandidate(entry);
      if (normalized) return normalized;
    }
    return '';
  }

  if (typeof candidate === 'object') {
    for (const key of ['value', 'long', 'short', 'text', 'html', 'plain', 'summary', 'description']) {
      const normalized = normalizeDescriptionCandidate(candidate[key]);
      if (normalized) return normalized;
    }
  }

  return '';
}

function cleanDescriptionString(value) {
  const cleaned = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned || cleaned === '[object Object]' || cleaned === 'undefined' || cleaned === 'null') {
    return '';
  }

  return cleaned;
}

// ============================================================================
// NORMALIZER HANDLERS (Per Item Type)
// ============================================================================

const NORMALIZER_HANDLERS = {

  /**
   * SPECIES — All data available, Ol' Salty prose exists
   */
  species: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const mentorProse = context.mentorProseSource?.[itemData.name] || null;
    const derivedTags = buildSpeciesTags(itemData).slice(0, 6).map(tag =>
      String(tag)
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
    );

    return {
      description: desc,
      prerequisites: null,  // Species have no prerequisites
      metadataTags: [
        itemData.size && `Size: ${itemData.size}`,
        itemData.speed && `Speed: ${itemData.speed} ft.`,
        ...derivedTags,
      ].filter(Boolean),
      mentorProse,  // Ol' Salty dialogue (canonical source)
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: false,
        hasMentorProse: !!mentorProse,
      },
      sourceNotes: {
        descriptionSource: desc ? 'species.description (item or system)' : 'missing',
        prerequisiteSource: 'n/a',
        metadataSource: 'species.size, species.speed',
        mentorThoughtSource: mentorProse ? 'ol-salty-species-dialogues.json' : 'missing',
      },
    };
  },

  /**
   * CLASS — Description + stats ready, no mentor prose yet
   */
  class: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;

    return {
      description: desc,
      prerequisites: null,  // Classes have no prerequisites in detail panel
      metadataTags: [
        itemData.bab && `BAB: ${itemData.bab}`,
        itemData.hitDie && `Hit Die: ${itemData.hitDie}`,
        itemData.defenseBonus && `Defense: ${itemData.defenseBonus}`,
      ].filter(Boolean),
      mentorProse: null,  // No canonical mentor prose for classes yet
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: false,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'class.fantasy OR class.description' : 'missing',
        prerequisiteSource: 'n/a',
        metadataSource: 'class.bab, class.hitDie, class.defenseBonus',
        mentorThoughtSource: 'none (mentor swap on commit, not prose)',
      },
    };
  },

  /**
   * BACKGROUND — All data available from backgrounds.json
   */
  background: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;

    return {
      description: desc,
      prerequisites: null,  // Backgrounds have no prerequisites
      metadataTags: [
        itemData.category && `Category: ${itemData.category}`,
        itemData.relevantSkills?.length && `Skills: ${itemData.relevantSkills.join(', ')}`,
      ].filter(Boolean),
      mentorProse: null,  // No canonical mentor prose for backgrounds
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: false,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'backgrounds.json narrativeDescription' : 'missing',
        prerequisiteSource: 'n/a',
        metadataSource: 'backgrounds.json category, relevantSkills',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * ATTRIBUTE — Hardcoded guidance exists
   */
  attribute: (itemData, context) => {
    const abilityKey = itemData.ability || itemData.key || null;
    const guidance = abilityKey ? ATTRIBUTE_GUIDANCE[abilityKey] : null;

    if (!guidance) {
      return getEmptyNormalization();
    }

    return {
      description: guidance.description,
      prerequisites: null,
      metadataTags: guidance.affects || [],
      mentorProse: guidance.guidance,  // Hardcoded but canonical
      fallbacks: {
        hasDescription: true,
        hasPrerequisites: false,
        hasMentorProse: true,
      },
      sourceNotes: {
        descriptionSource: 'ATTRIBUTE_GUIDANCE constant',
        prerequisiteSource: 'n/a',
        metadataSource: 'ATTRIBUTE_GUIDANCE.affects',
        mentorThoughtSource: 'ATTRIBUTE_GUIDANCE (hardcoded canonical guidance)',
      },
    };
  },

  /**
   * LANGUAGE — Mostly ready, ~50% description coverage acceptable
   */
  language: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const category = itemData.category || 'Unknown';

    return {
      description: desc,
      prerequisites: null,  // Languages have no prerequisites
      metadataTags: [category],
      mentorProse: null,  // No canonical mentor prose
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: false,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'language.description (item or registry)' : 'missing (~50% coverage acceptable)',
        prerequisiteSource: 'n/a',
        metadataSource: 'language.category',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * FEAT — Text-only prerequisites, no mentor prose
   */
  feat: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = extractPrerequisites(itemData.prerequisiteText || itemData.prerequisiteLine || itemData.system?.prerequisites || itemData.system?.prerequisite);
    const category = itemData.system?.category || itemData.system?.featType || 'General';

    return {
      description: desc,
      prerequisites: prereqs,  // Text-only, not structured
      metadataTags: [
        category,
        ...(context.metadata?.tags || []),
      ].filter(Boolean),
      mentorProse: null,  // No canonical mentor prose for feats
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: prereqs && prereqs.length > 0,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'feat.system.description OR feat.system.benefit' : 'missing',
        prerequisiteSource: prereqs ? 'feat.system.prerequisites (text-only, not structured)' : 'none',
        metadataSource: 'feat.system.category + feat-metadata.json',
        mentorThoughtSource: 'missing (use Ask Mentor for guidance)',
      },
    };
  },

  /**
   * TALENT — Structured prerequisites ready
   */
  talent: (itemData, context) => {
    // Description source precedence: compendium item first, fallback to none
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = itemData.system?.prerequisites || null;

    return {
      description: desc,
      prerequisites: prereqs ? [prereqs] : null,  // Wrap text-only as array for template consistency
      metadataTags: [
        context.treeName && `Tree: ${context.treeName}`,
        ...(context.tags || []),
      ].filter(Boolean),
      mentorProse: null,  // No canonical mentor prose
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: !!prereqs,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'talent.system.description (compendium item)' : 'missing (use talent-tree-descriptions.json if needed)',
        prerequisiteSource: prereqs ? 'talent.system.prerequisites (text-only)' : 'none',
        metadataSource: 'tree name + talent-tree-tags.json',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * FORCE_POWER — Text-only prerequisites, no mentor prose
   */
  force_power: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = itemData.system?.prerequisites ? [itemData.system.prerequisites] : null;

    return {
      description: desc,
      prerequisites: prereqs,
      metadataTags: [
        itemData.system?.discipline && `Discipline: ${itemData.system.discipline}`,
        itemData.system?.level && `Level: ${itemData.system.level}`,
      ].filter(Boolean),
      mentorProse: null,  // Manifestation prose exists but not mentor-specific
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: !!prereqs,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'force-power.system.description' : 'missing (~70% coverage)',
        prerequisiteSource: prereqs ? 'force-power.system.prerequisites (text-only)' : 'none',
        metadataSource: 'force-power.system.discipline, level',
        mentorThoughtSource: 'missing (manifestation prose exists in force-power-descriptions.json but not mentor-specific)',
      },
    };
  },

  /**
   * FORCE_TECHNIQUE — Minimal data, ~40% description coverage
   */
  force_technique: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = itemData.system?.prerequisites ? [itemData.system.prerequisites] : null;

    return {
      description: desc,
      prerequisites: prereqs,
      metadataTags: [
        itemData.system?.tier && `Tier: ${itemData.system.tier}`,
      ].filter(Boolean),
      mentorProse: null,
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: !!prereqs,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'force-technique.system.description' : 'missing (~40% coverage)',
        prerequisiteSource: prereqs ? 'force-technique.system.prerequisites (text-only)' : 'none',
        metadataSource: 'force-technique.system.tier',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * FORCE_SECRET — Minimal data, ~30% description coverage
   */
  force_secret: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = itemData.system?.prerequisites ? [itemData.system.prerequisites] : null;

    return {
      description: desc,
      prerequisites: prereqs,
      metadataTags: [
        itemData.system?.tier && `Tier: ${itemData.system.tier}`,
      ].filter(Boolean),
      mentorProse: null,
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: !!prereqs,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'force-secret.system.description' : 'missing (~30% coverage)',
        prerequisiteSource: prereqs ? 'force-secret.system.prerequisites (text-only)' : 'none',
        metadataSource: 'force-secret.system.tier',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * STARSHIP_MANEUVER — Text-only prerequisites, ~80% description coverage
   */
  starship_maneuver: (itemData, context) => {
    const desc = extractDescriptionText(itemData) || null;
    const prereqs = itemData.system?.prerequisites ? [itemData.system.prerequisites] : null;

    return {
      description: desc,
      prerequisites: prereqs,
      metadataTags: [
        itemData.system?.type && `Type: ${itemData.system.type}`,
      ].filter(Boolean),
      mentorProse: null,
      fallbacks: {
        hasDescription: !!desc,
        hasPrerequisites: !!prereqs,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: desc ? 'starship-maneuver.system.description' : 'missing (~20% coverage)',
        prerequisiteSource: prereqs ? 'starship-maneuver.system.prerequisites (text-only)' : 'none',
        metadataSource: 'starship-maneuver.system.type',
        mentorThoughtSource: 'missing',
      },
    };
  },

  /**
   * SKILL — Informational + mechanical reference (not selectable)
   * Curated short descriptions from skill-short-descriptions.json
   * Mechanical fields: default attribute, trained-only, armor-check penalty
   * No prerequisites, tags, or mentor prose (skills are not gated items)
   */
  skill: (itemData, context) => {
    const skillKey = itemData.key || itemData.id || null;
    const skillName = normalizeSkillDisplayName(itemData.name || itemData.label || skillKey);

    // Load curated short description (canonical source), then fall back to safe source text
    const curatedDesc = getSkillShortDescription(skillKey) || extractDescriptionText(itemData) || null;

    // Get mechanical fields from resolver (single source of truth)
    const trainingLabel = SkillsMechanicsResolver.getTrainingRequirementLabel(itemData);
    const acpLabel = SkillsMechanicsResolver.getArmorCheckPenaltyLabel(skillKey);
    const otherUsesSummary = SkillsMechanicsResolver.getOtherUsesSummary(context.otherUses);

    // Build metadata tags (consistent, non-scattered logic)
    const metadataTags = [
      `Default: ${getAbilityLabel(itemData.ability)}`,
      trainingLabel,
      `Armor Check Penalty: ${acpLabel}`,
      ...(otherUsesSummary ? [`${otherUsesSummary}`] : []),
    ].filter(Boolean);

    return {
      description: curatedDesc,
      prerequisites: null,  // Skills have no prerequisites (not gated items)
      metadataTags,
      mentorProse: null,  // No mentor prose for skills (informational only)
      fallbacks: {
        hasDescription: !!curatedDesc,
        hasPrerequisites: false,
        hasMentorProse: false,
      },
      sourceNotes: {
        descriptionSource: curatedDesc ? 'skill-short-descriptions.json OR skill source description' : 'missing (curated)',
        prerequisiteSource: 'n/a (skills not gated)',
        metadataSource: 'skill.ability + skills-mechanics-resolver (ACP, trained-only)',
        mentorThoughtSource: 'n/a (informational reference)',
      },
      // SKILL-SPECIFIC FIELDS (not shared with feat/talent model)
      mechanics: {
        defaultAbility: itemData.ability,
        defaultAbilityLabel: getAbilityLabel(itemData.ability),
        trainedOnly: SkillsMechanicsResolver.isTrainedOnlySkill(itemData),
        trainedOnlyLabel: trainingLabel,
        armorCheckPenalty: SkillsMechanicsResolver.isAffectedByArmorCheckPenalty(skillKey),
        armorCheckPenaltyLabel: acpLabel,
        otherUses: context.otherUses || null,
      },
    };
  },

};


function normalizeSkillDisplayName(value) {
  if (value && typeof value === 'object') {
    return value.label || value.name || value.value || value.key || 'Skill';
  }
  const text = String(value || '').trim();
  return text && text !== '[object Object]' ? text : 'Skill';
}

/**
 * Get human-readable ability label
 */
function getAbilityLabel(ability) {
  const labels = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  return labels[ability?.toLowerCase?.()] || 'Unknown';
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract prerequisites from various formats
 */
function extractPrerequisites(prereqData) {
  if (!prereqData) return null;

  if (Array.isArray(prereqData)) {
    const filtered = prereqData.filter(p => p && String(p).trim());
    return filtered.length > 0 ? filtered : null;
  }

  if (typeof prereqData === 'string') {
    const trimmed = prereqData.trim();
    return trimmed ? [trimmed] : null;
  }

  return null;
}
