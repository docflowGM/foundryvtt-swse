/**
 * MentorClarificationSystem
 *
 * When multiple archetypes score within 10% of each other:
 * - Mentor presents clarifying question
 * - Player selects response → stored as playerIntent
 * - Intent provides +5 bonus to matching archetype in future scoring
 *
 * Intent values: prefers_ranged, prefers_support, prefers_force, prefers_leadership, prefers_melee, prefers_stealth
 */

import { SWSELogger } from '../utils/logger.js';

const CLARIFICATION_QUESTIONS = {
  ranged_vs_melee: {
    question: "Your path could embrace precision at distance or power in close combat. Which calls to you?",
    responses: [
      { text: "Distance and precision", intent: "prefers_ranged" },
      { text: "Strength in close quarters", intent: "prefers_melee" }
    ]
  },
  support_vs_striker: {
    question: "Do you lead through empowering allies or striking down threats?",
    responses: [
      { text: "Empower allies", intent: "prefers_support" },
      { text: "Strike threats", intent: "prefers_striker" }
    ]
  },
  force_vs_mundane: {
    question: "Does your strength come from the Force or from discipline and skill?",
    responses: [
      { text: "The Force flows through me", intent: "prefers_force" },
      { text: "I rely on skill and training", intent: "prefers_mundane" }
    ]
  },
  leadership_vs_solo: {
    question: "Do you lead others, or trust only yourself?",
    responses: [
      { text: "I inspire others", intent: "prefers_leadership" },
      { text: "I work alone", intent: "prefers_solo" }
    ]
  },
  stealth_vs_aggressive: {
    question: "Move unseen, or strike with overwhelming force?",
    responses: [
      { text: "Shadows and stealth", intent: "prefers_stealth" },
      { text: "Overwhelming force", intent: "prefers_aggressive" }
    ]
  }
};

/**
 * Determine if clarification is needed
 * @param {Object} archetypeScores - { id: score, ... }
 * @param {number} topScore - Highest score
 * @returns {boolean} True if multiple archetypes within 10%
 */
export function needsClarification(archetypeScores, topScore) {
  const threshold = topScore * 0.9; // Within 10%
  const qualified = Object.values(archetypeScores).filter(s => s >= threshold).length;
  return qualified > 1;
}

/**
 * Select appropriate clarification question based on archetype types
 * @param {Array} topArchetypes - [{id, score}, ...] sorted by score
 * @returns {Object} {questionKey, question, responses}
 */
export function selectClarificationQuestion(topArchetypes) {
  if (!topArchetypes || topArchetypes.length < 2) return null;

  const [arch1, arch2] = topArchetypes;

  // Simple heuristic: match archetype names/tags to question types
  const names = [arch1.id, arch2.id].join('|').toLowerCase();

  if (names.includes('ranged') || names.includes('sniper') || names.includes('gunslinger')) {
    if (names.includes('melee') || names.includes('duelist') || names.includes('brawler')) {
      return {
        questionKey: 'ranged_vs_melee',
        ...CLARIFICATION_QUESTIONS.ranged_vs_melee
      };
    }
  }

  if (names.includes('support') || names.includes('medic') || names.includes('leader')) {
    if (names.includes('striker') || names.includes('damage') || names.includes('aggressive')) {
      return {
        questionKey: 'support_vs_striker',
        ...CLARIFICATION_QUESTIONS.support_vs_striker
      };
    }
  }

  if (names.includes('force') || names.includes('jedi') || names.includes('sith')) {
    if (!names.includes('force')) {
      return {
        questionKey: 'force_vs_mundane',
        ...CLARIFICATION_QUESTIONS.force_vs_mundane
      };
    }
  }

  if (names.includes('leader') || names.includes('commander') || names.includes('officer')) {
    if (names.includes('solo') || names.includes('shadow') || names.includes('infiltrator')) {
      return {
        questionKey: 'leadership_vs_solo',
        ...CLARIFICATION_QUESTIONS.leadership_vs_solo
      };
    }
  }

  if (names.includes('stealth') || names.includes('shadow') || names.includes('infiltrator')) {
    if (names.includes('aggressive') || names.includes('heavy') || names.includes('shock')) {
      return {
        questionKey: 'stealth_vs_aggressive',
        ...CLARIFICATION_QUESTIONS.stealth_vs_aggressive
      };
    }
  }

  // Default to support vs striker
  return {
    questionKey: 'support_vs_striker',
    ...CLARIFICATION_QUESTIONS.support_vs_striker
  };
}

/**
 * Store player intent from clarification response
 * @param {Actor} actor - Character actor
 * @param {string} responseIntent - Intent value (prefers_*)
 * @returns {Promise<void>}
 */
export async function storePlayerIntent(actor, responseIntent) {
  if (!actor) return;

  try {
    const flags = await actor.getFlag('foundryvtt-swse', 'playerIntent') || {};
    flags[responseIntent] = {
      selectedAt: Date.now(),
      level: actor.system?.level || 1
    };
    await actor.setFlag('foundryvtt-swse', 'playerIntent', flags);
    SWSELogger.log(`[MentorClarificationSystem] Stored intent: ${responseIntent}`);
  } catch (err) {
    SWSELogger.error('[MentorClarificationSystem] Failed to store intent:', err);
  }
}

/**
 * Get player intent from actor flags
 * @param {Actor} actor - Character actor
 * @returns {Promise<Object>} {intentKey: {selectedAt, level}, ...}
 */
export async function getPlayerIntent(actor) {
  if (!actor) return {};

  try {
    return (await actor.getFlag('foundryvtt-swse', 'playerIntent')) || {};
  } catch (err) {
    SWSELogger.warn('[MentorClarificationSystem] Failed to get intent:', err);
    return {};
  }
}

/**
 * Apply intent bonus to archetype scoring
 * @param {Object} archetypeScores - { id: score, ... }
 * @param {Object} playerIntent - { prefers_*: {...}, ... }
 * @param {Object} archetypeDetails - For tag matching (optional)
 * @returns {Object} Modified scores with bonuses applied
 */
export function applyIntentBonus(archetypeScores, playerIntent = {}, archetypeDetails = {}) {
  const modified = { ...archetypeScores };

  const intentMap = {
    prefers_ranged: ['ranged', 'sniper', 'gunslinger'],
    prefers_melee: ['melee', 'duelist', 'brawler'],
    prefers_support: ['support', 'medic', 'leader'],
    prefers_force: ['force', 'jedi', 'sith'],
    prefers_leadership: ['leader', 'commander', 'officer'],
    prefers_stealth: ['stealth', 'shadow', 'infiltrator'],
    prefers_solo: ['solo', 'rogue', 'infiltrator']
  };

  for (const intent of Object.keys(playerIntent)) {
    const keywords = intentMap[intent] || [];

    for (const [archetypeId, score] of Object.entries(modified)) {
      const idLower = archetypeId.toLowerCase();
      const keywordMatch = keywords.some(kw => idLower.includes(kw));

      if (keywordMatch) {
        modified[archetypeId] = score + 5; // +5 intent bonus
      }
    }
  }

  return modified;
}
