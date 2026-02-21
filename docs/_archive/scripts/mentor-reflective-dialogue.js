/**
 * Mentor Reflective Dialogue System
 *
 * Implements the 7 reflective dialogue topics from the mentor framework:
 * 1. Who am I becoming? - Role reflection & identity
 * 2. What paths are open to me? - Class archetypes & soft commitment
 * 3. What am I doing well? - Synergy reinforcement & trust
 * 4. What am I doing wrong? - Course correction & challenges
 * 5. How should I fight? - Combat role framing
 * 6. What should I be careful of? - Trap & risk awareness
 * 7. What lies ahead? - Future planning & prestige target
 * 8. How would you play this class? - Mentor worldview & philosophy
 *
 * Uses mentor personality profiles to vary voice and approach per mentor.
 * Leverages mentor memory, DSP saturation, and role inference for personalization.
 */

import {
  calculateDspSaturation,
  getDspBand,
  getToneModifier,
  getWarningSeverity
} from '../../../scripts/engine/dsp-saturation.js';

import {
  getMentorMemory,
  setMentorMemory,
  inferRole,
  setCommittedPath,
  setTargetClass,
  updateInferredRole,
  detectPathDivergence
} from '../../../scripts/mentor/mentor-memory.js';

import {
  getArchetypePaths,
  getArchetype,
  analyzeSynergies,
  suggestAttributesForArchetype
} from '../../../scripts/mentor/mentor-archetype-paths.js';

import { MENTOR_PERSONALITIES } from '../../../scripts/mentor/mentor-suggestion-dialogues.js';
import { MENTORS } from '../../../scripts/apps/mentor/mentor-dialogues.js';

/**
 * Generate a reflective dialogue response for a mentor-actor pair
 *
 * @param {Actor} actor - The character
 * @param {string} mentorId - The mentor class key (e.g., "Jedi", "Scout")
 * @param {string} topicKey - The dialogue topic (e.g., "who_am_i_becoming")
 * @returns {Promise<object>} Dialogue object with observation, suggestion, respectClause
 */
export async function generateReflectiveDialogue(actor, mentorId, topicKey) {
  if (!actor || !mentorId) {
    return { observation: '', suggestion: '', respectClause: '' };
  }

  const mentor = MENTORS[mentorId];
  const personality = MENTOR_PERSONALITIES[mentorId];
  const memory = getMentorMemory(actor, mentorId.toLowerCase());

  // Update memory with current state
  updateInferredRole(memory, actor);

  const dspInfo = {
    saturation: calculateDspSaturation(actor),
    band: getDspBand(calculateDspSaturation(actor)),
    toneModifier: getToneModifier(getDspBand(calculateDspSaturation(actor)))
  };

  const dialogue = {
    topic: topicKey,
    mentorName: mentor?.name || 'Your Mentor',
    personality: personality,
    dspContext: dspInfo,
    showPathCommitment: topicKey === 'paths_open',
    showTargetClass: topicKey === 'what_lies_ahead'
  };

  // NOTE: Topic-specific dialogue functions have been removed as part of Phase 1
  // Judgment Atom system now handles mentor reactions.
  // This file is maintained for backward compatibility but is no longer the primary dialogue path.
  dialogue.content = { observation: '', suggestion: '', respectClause: '' };

  // Save updated memory
  await setMentorMemory(actor, mentorId.toLowerCase(), memory);

  return dialogue;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the phase of progression (Early, Mid, Late)
 */
function getPhase(level) {
  if (level <= 5) {return 'early';}
  if (level <= 12) {return 'mid';}
  return 'late';
}

/**
 * Apply mentor personality to dialogue generation
 */
function getMentorVoice(personality, layer, baseText) {
  if (!personality) {return baseText;}

  const traits = personality.traits || [];

  // Minimal mentors: shorter text
  if (personality.verbosity === 'minimal') {
    if (baseText.length > 100) {
      return baseText.substring(0, 80) + '...';
    }
  }

  // Verbose mentors: add flourish
  if (personality.verbosity === 'verbose' && layer === 'observation') {
    if (traits.includes('philosophical')) {
      return `${baseText} I have walked this road before, and I see patterns you have yet to perceive.`;
    }
    if (traits.includes('spiritual')) {
      return `${baseText} The Force speaks to me of your nature.`;
    }
  }

  return baseText;
}

// NOTE: getArchetypePaths is now imported from mentor-archetype-paths.js

/**
 * Detect build gaps
 */
function detectBuildGaps(actor, memory) {
  const gaps = [];

  if (!memory.inferredRole) {
    gaps.push('Your build lacks coherent identity. Consider what role you wish to play.');
  }

  const talents = actor.items.filter(i => i.type === 'talent').length;
  const feats = actor.items.filter(i => i.type === 'feat').length;

  if (talents === 0 && actor.system.level >= 6) {
    gaps.push('You have few talents for your level. Consider developing a talent tree.');
  }

  if (feats === 0 && actor.system.level >= 3) {
    gaps.push('Limited feat selection limits your options. Diversify your abilities.');
  }

  return {
    summary: gaps.length > 0 ? gaps[0] : 'Your path shows some inconsistencies.',
    details: gaps
  };
}

/**
 * Identify risks based on current state
 */
function identifyRisks(actor, memory, dspInfo) {
  const risks = [];

  if (dspInfo.saturation >= 0.4) {
    risks.push('The darkness presses upon you. Each choice risks drawing you further into shadow.');
  }

  // Over-specialization
  const role = memory.inferredRole;
  if (role === 'striker' && (actor.system.attributes?.con?.base || 10) <= 11) {
    risks.push("You walk a striker's path with fragile constitution. One strong blow could end you.");
  }

  if (role === 'guardian' && (actor.system.attributes?.wis?.base || 10) <= 10) {
    risks.push('You stand as guardian, yet lack wisdom to read threats. This is dangerous.');
  }

  return {
    summary: risks.length > 0 ? risks[0] : 'Be mindful of imbalance.',
    primary: risks[0] || 'Stay vigilant against complacency.'
  };
}

/**
 * Get the top skill by modifier
 */
function getTopSkill(actor) {
  const skills = actor.system.skills || {};
  let topSkill = 'a learned skill';
  let topMod = 0;

  for (const [key, skill] of Object.entries(skills)) {
    if (skill.mod > topMod) {
      topMod = skill.mod;
      topSkill = key;
    }
  }

  return topSkill;
}

/**
 * Export for testing/console access
 */
export const MentorReflectiveDialogue = {
  generateReflectiveDialogue
};
