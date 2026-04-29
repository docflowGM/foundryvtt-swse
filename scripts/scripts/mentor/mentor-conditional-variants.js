/**
 * MentorConditionalVariants
 *
 * Supports conditional dialogue variants based on game state.
 * Selects the most specific valid variant, falls back safely to generic lines.
 *
 * Condition types:
 * - high_ability (ability >= 14)
 * - archetype_shift (archetype changed last level)
 * - generalist_fallback (no strong archetype)
 * - prestige_entry (entered prestige class)
 * - multiclass_detected (has multiple classes)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Evaluate if a condition is met
 * @param {string} conditionKey - Condition identifier
 * @param {Actor} actor - Character actor
 * @param {Object} context - {archetype, previousArchetype, level, ...}
 * @returns {boolean} True if condition is met
 */
export function evaluateCondition(conditionKey, actor, context = {}) {
  if (!conditionKey) {return true;} // No condition = always valid

  switch (conditionKey) {
    case 'high_ability': {
      // Any ability >= 14
      const abilities = actor?.system?.abilities || {};
      return Object.values(abilities).some(a => (a.value || a.total || 10) >= 14);
    }

    case 'archetype_shift': {
      // Archetype changed (stored in context from ArchetypeShiftTracker)
      return context.shifted === true;
    }

    case 'generalist_fallback': {
      // No strong archetype (low confidence)
      return context.isGeneralist === true;
    }

    case 'prestige_entry': {
      // Entered prestige class this level
      const previousClass = context.previousClass;
      const currentClass = actor?.system?.class?.key;
      const isPrestige = context.isPrestige === true;

      return previousClass !== currentClass && isPrestige;
    }

    case 'multiclass_detected': {
      // Has multiple classes
      const classes = actor?.items?.filter(i => i.type === 'class') || [];
      return classes.length > 1;
    }

    case 'low_level': {
      // Character level <= 3
      return (actor?.system?.level || 1) <= 3;
    }

    case 'high_level': {
      // Character level >= 10
      return (actor?.system?.level || 1) >= 10;
    }

    default:
      return true;
  }
}

/**
 * Select the most specific valid dialogue variant
 * Conditions can be suffixed to keys: "key:condition1,condition2"
 *
 * @param {Array<string>} dialogueKeys - Possible dialogue keys, prioritized
 * @param {Actor} actor - Character actor
 * @param {Object} context - Game state context
 * @returns {Object} {selectedKey: string, conditions: string[]}
 */
export function selectDialogueVariant(dialogueKeys, actor, context = {}) {
  if (!dialogueKeys || dialogueKeys.length === 0) {
    return { selectedKey: null, conditions: [], fallback: true };
  }

  const priority = [];

  // Parse each key and check conditions
  for (const key of dialogueKeys) {
    const [baseKey, conditionStr] = key.split(':');
    const conditions = conditionStr ? conditionStr.split(',') : [];

    // Check if all conditions are met
    const allConditionsMet = conditions.length === 0 ||
      conditions.every(cond => evaluateCondition(cond.trim(), actor, context));

    if (allConditionsMet) {
      // Prioritize by specificity (more conditions = more specific)
      priority.push({
        key: baseKey,
        conditions,
        specificity: conditions.length
      });
    }
  }

  // Sort by specificity descending (most specific first)
  priority.sort((a, b) => b.specificity - a.specificity);

  if (priority.length > 0) {
    return {
      selectedKey: priority[0].key,
      conditions: priority[0].conditions,
      fallback: false
    };
  }

  // Fallback to generic or first available
  return {
    selectedKey: dialogueKeys[0].split(':')[0],
    conditions: [],
    fallback: true
  };
}

/**
 * Enhance dialogue lookup to support conditional variants
 * @param {Object} dialogueSet - e.g., mentor.dialogues.classPaths["archetype_name"]
 * @param {Array<string>} possibleKeys - Keys to try (high-priority first)
 * @param {Actor} actor - Character actor
 * @param {Object} context - Game state
 * @returns {Object} Selected dialogue object or null
 */
export function resolveDialogueWithConditions(dialogueSet, possibleKeys, actor, context = {}) {
  if (!dialogueSet) {return null;}

  const { selectedKey, fallback } = selectDialogueVariant(possibleKeys, actor, context);

  if (!selectedKey) {return null;}

  // Try exact match
  if (dialogueSet[selectedKey]) {
    return dialogueSet[selectedKey];
  }

  // Fallback to any generic variant
  const keys = Object.keys(dialogueSet);
  if (keys.length > 0 && fallback) {
    return dialogueSet[keys[0]];
  }

  return null;
}

/**
 * Map game state to dialogue keys in priority order
 * @param {Actor} actor - Character actor
 * @param {Object} context - From ArchetypeShiftTracker, ArchetypeAffinityEngine, etc.
 * @returns {Array<string>} Ordered list of keys to try
 */
export function getPriorityDialogueKeys(actor, context = {}) {
  const keys = [];

  // Highest priority: prestige entry
  if (context.isPrestige && context.previousClass !== actor?.system?.class?.key) {
    keys.push('dialogue:prestige_entry,high_ability');
    keys.push('dialogue:prestige_entry');
  }

  // Archetype shift
  if (context.shifted) {
    keys.push('dialogue:archetype_shift,high_ability');
    keys.push('dialogue:archetype_shift');
  }

  // Generalist fallback
  if (context.isGeneralist) {
    keys.push('dialogue:generalist_fallback');
  }

  // Multiclass
  if ((actor?.items?.filter(i => i.type === 'class') || []).length > 1) {
    keys.push('dialogue:multiclass_detected');
  }

  // Generic variants (lowest priority)
  keys.push('dialogue', 'generic');

  return keys;
}

/**
 * Format condition for display
 * @param {string} conditionKey - Condition identifier
 * @returns {string} Human-readable description
 */
export function describeCondition(conditionKey) {
  const descriptions = {
    high_ability: 'Character has ability score >= 14',
    archetype_shift: 'Archetype changed',
    generalist_fallback: 'No strong archetype',
    prestige_entry: 'Entered prestige class',
    multiclass_detected: 'Multiple classes present',
    low_level: 'Character level <= 3',
    high_level: 'Character level >= 10'
  };

  return descriptions[conditionKey] || conditionKey;
}
