/**
 * Mentor Suggestion Bias Integration
 * Bridges mentor memory and archetype commitments into suggestion engine scoring
 *
 * This module provides bias multipliers that feed into the core suggestion engine.
 * All effects are soft (multipliers, never hard locks).
 */

import { getMentorMemory } from './mentor-memory.js';
import { getArchetype, getArchetypeRoleBias } from './mentor-archetype-paths.js';
import { calculateDspSaturation, getDarkSideBiasMultiplier } from './dsp-saturation.js';

/**
 * Calculate mentor bias for a suggestion
 * This is called by the suggestion engine to weight recommendations
 *
 * @param {Actor} actor - The character
 * @param {string} mentorId - The mentor class key
 * @param {string} suggestionType - The suggestion type (feat, talent, class, etc)
 * @returns {object} Bias multipliers and context
 */
export function calculateMentorBias(actor, mentorId, suggestionType) {
  const bias = {
    roleBias: {},
    pathBias: 1.0,
    targetClassBias: 1.0,
    darkSideBias: 1.0,
    totalBias: 1.0
  };

  if (!actor || !mentorId) {
    return bias;
  }

  // Get mentor memory for this actor
  const memory = getMentorMemory(actor, mentorId.toLowerCase());

  // 1. Role inference bias
  if (memory.inferredRole) {
    bias.roleBias[memory.inferredRole] = 1.15; // Gentle boost to inferred role
  }

  // 2. Committed path bias
  if (memory.committedPath && memory.commitmentStrength > 0.1) {
    const baseClass = Array.from(actor.items)
      .filter(i => i.type === 'class')
      .sort((a, b) => (b.system?.level || 0) - (a.system?.level || 0))[0];

    if (baseClass) {
      const archetype = getArchetype(baseClass.name, memory.committedPath);
      if (archetype) {
        const roleBiases = getArchetypeRoleBias(archetype);
        for (const [role, multiplier] of Object.entries(roleBiases)) {
          // Apply commitment strength as a modifier
          const appliedMultiplier = 1 + (multiplier - 1) * memory.commitmentStrength;
          bias.roleBias[role] = (bias.roleBias[role] || 1.0) * appliedMultiplier;
        }

        // Path-specific bias: boost suggestions aligned with that archetype
        if (suggestionType === 'talent' || suggestionType === 'feat') {
          // This will be handled by the suggestion engine checking keywords
          bias.pathBias = 1 + (0.2 * memory.commitmentStrength);
        }
      }
    }
  }

  // 3. Target class bias
  if (memory.targetClass && memory.targetCommitment > 0.1) {
    if (suggestionType === 'class' || suggestionType === 'feat' || suggestionType === 'talent') {
      // Boost recommendations that support prestige class prerequisites
      bias.targetClassBias = 1 + (0.3 * memory.targetCommitment);
    }
  }

  // 4. DSP dark-side bias
  const saturation = calculateDspSaturation(actor);
  bias.darkSideBias = getDarkSideBiasMultiplier(saturation);

  // 5. Calculate total bias (conservative - no single effect > 25%)
  const totalRoleBias = Math.max(...Object.values(bias.roleBias), 1.0);
  bias.totalBias = Math.min(1.5, // Hard cap at 1.5x
    totalRoleBias * bias.pathBias * bias.targetClassBias
  );

  return bias;
}

/**
 * Apply mentor bias to a suggestion score
 * This is the actual hook into the suggestion engine
 *
 * @param {number} baseScore - The base suggestion score from the engine
 * @param {object} bias - The bias object from calculateMentorBias
 * @param {object} suggestionItem - The item being suggested (has type, name, etc)
 * @returns {number} The adjusted score
 */
export function applyMentorBias(baseScore, bias, suggestionItem) {
  let adjustedScore = baseScore;

  // Apply role bias if applicable
  const itemRole = detectItemRole(suggestionItem);
  if (itemRole && bias.roleBias[itemRole]) {
    adjustedScore *= bias.roleBias[itemRole];
  }

  // Apply path bias
  if (bias.pathBias > 1.0) {
    adjustedScore *= bias.pathBias;
  }

  // Apply target class bias
  if (bias.targetClassBias > 1.0) {
    adjustedScore *= bias.targetClassBias;
  }

  // Apply DSP bias (only if suggestion is dark-side aligned)
  if (isSuggestionDarkSideAligned(suggestionItem) && bias.darkSideBias > 1.0) {
    adjustedScore *= bias.darkSideBias;
  }

  return adjustedScore;
}

/**
 * Detect which role a suggestion item aligns with
 * @param {object} item - The item (feat, talent, etc)
 * @returns {string|null} The role (guardian, striker, controller) or null
 */
function detectItemRole(item) {
  if (!item) {return null;}

  const name = (item.name || '').toLowerCase();
  const desc = ((item.system?.description || '') + (item.system?.benefit || '')).toLowerCase();
  const fullText = name + ' ' + desc;

  // Guardian indicators
  if (['defense', 'block', 'deflect', 'shield', 'protection', 'endurance', 'health', 'constitution'].some(w => fullText.includes(w))) {
    return 'guardian';
  }

  // Striker indicators
  if (['attack', 'power', 'damage', 'strike', 'offensive', 'strength', 'dexterity', 'precision'].some(w => fullText.includes(w))) {
    return 'striker';
  }

  // Controller indicators
  if (['control', 'force', 'wisdom', 'awareness', 'perception', 'command', 'technique', 'intellect'].some(w => fullText.includes(w))) {
    return 'controller';
  }

  return null;
}

/**
 * Check if a suggestion is aligned with dark-side philosophy
 * @param {object} item - The item
 * @returns {boolean} True if dark-side aligned
 */
function isSuggestionDarkSideAligned(item) {
  if (!item) {return false;}

  const fullText = ((item.name || '') + (item.system?.description || '')).toLowerCase();

  return ['dark', 'aggression', 'fear', 'anger', 'domination', 'pain'].some(w => fullText.includes(w));
}

/**
 * Debug helper: format bias for display
 * @param {object} bias - The bias object
 * @returns {string} Formatted bias information
 */
export function formatBias(bias) {
  let output = 'Mentor Bias:\n';
  output += `  Role Bias: ${JSON.stringify(bias.roleBias)}\n`;
  output += `  Path Bias: x${bias.pathBias.toFixed(2)}\n`;
  output += `  Target Class Bias: x${bias.targetClassBias.toFixed(2)}\n`;
  output += `  Dark Side Bias: x${bias.darkSideBias.toFixed(2)}\n`;
  output += `  Total Bias: x${bias.totalBias.toFixed(2)}`;

  return output;
}

/**
 * Export for testing/console
 */
export const MentorSuggestionBias = {
  calculateMentorBias,
  applyMentorBias,
  formatBias
};
