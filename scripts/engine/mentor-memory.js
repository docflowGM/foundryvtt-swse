/**
 * Mentor Memory System
 * Persistent per-actor mentor state tracking
 *
 * This module manages:
 * - Mentor relationship trust levels
 * - Inferred role detection (guardian, striker, controller)
 * - Soft commitments to archetypes and target classes
 * - Commitment decay on levelup
 *
 * All state is stored in actor.flags.swse.mentorMemory[mentorId]
 */

/**
 * MentorMemory class
 * Represents a single mentor-actor relationship
 */
export class MentorMemory {
  constructor(data = {}) {
    // Relationship / context
    this.trust = data.trust ?? 0.5;

    // Inferred identity
    this.inferredRole = data.inferredRole ?? null;
    this.inferredSecondary = data.inferredSecondary ?? null;
    this.roleConfidence = data.roleConfidence ?? 0.0;

    // Soft commitments
    this.committedPath = data.committedPath ?? null;
    this.commitmentStrength = data.commitmentStrength ?? 0.0;

    // Target class planning
    this.targetClass = data.targetClass ?? null;
    this.targetCommitment = data.targetCommitment ?? 0.0;

    // Philosophy profile (used for mentor values alignment)
    this.philosophyAxes = data.philosophyAxes ?? {
      restraint: 0.5,
      dominance: 0.5,
      protection: 0.5
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      trust: this.trust,
      inferredRole: this.inferredRole,
      inferredSecondary: this.inferredSecondary,
      roleConfidence: this.roleConfidence,
      committedPath: this.committedPath,
      commitmentStrength: this.commitmentStrength,
      targetClass: this.targetClass,
      targetCommitment: this.targetCommitment,
      philosophyAxes: this.philosophyAxes
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json) {
    return new MentorMemory(json || {});
  }
}

/**
 * Get mentor memory for a specific mentor and actor
 * Creates a default one if it doesn't exist
 *
 * @param {Actor} actor - The actor
 * @param {string} mentorId - The mentor ID (e.g., "miraj")
 * @returns {MentorMemory} The mentor memory object
 */
export function getMentorMemory(actor, mentorId) {
  if (!actor || !mentorId) {
    return new MentorMemory();
  }

  const mentorMemories = actor.getFlag('swse', 'mentorMemories') || {};
  const memoryData = mentorMemories[mentorId] || {};

  return MentorMemory.fromJSON(memoryData);
}

/**
 * Set mentor memory for a specific mentor and actor
 * Persists to actor.flags.swse.mentorMemories[mentorId]
 *
 * @param {Actor} actor - The actor
 * @param {string} mentorId - The mentor ID
 * @param {MentorMemory} memory - The memory object to save
 * @returns {Promise<void>}
 */
export async function setMentorMemory(actor, mentorId, memory) {
  if (!actor || !mentorId) {
    return;
  }

  const mentorMemories = actor.getFlag('swse', 'mentorMemories') || {};
  mentorMemories[mentorId] = memory.toJSON();

  await actor.setFlag('swse', 'mentorMemories', mentorMemories);
}

/**
 * Simple role inference based on actor attributes and talents
 * Returns inferred role and secondary role with confidence
 *
 * @param {Actor} actor - The actor to analyze
 * @returns {object} { primary, secondary, confidence }
 */
export function inferRole(actor) {
  if (!actor) {
    return { primary: null, secondary: null, confidence: 0.0 };
  }

  const scores = {
    guardian: 0.0,
    striker: 0.0,
    controller: 0.0
  };

  // Attribute influence
  const attributes = actor.system.attributes || {};
  scores.guardian += (attributes.con?.base || 10) * 1.0;
  scores.striker += (attributes.str?.base || 10) * 1.2 + (attributes.dex?.base || 10) * 1.0;
  scores.controller += (attributes.wis?.base || 10) * 1.5;

  // Talent influence
  const talents = actor.items.filter(i => i.type === 'talent').map(t => t.name);
  for (const talentName of talents) {
    const lower = talentName.toLowerCase();
    if (lower.includes('defense') || lower.includes('shield') || lower.includes('block')) {
      scores.guardian += 20;
    }
    if (lower.includes('power') || lower.includes('attack') || lower.includes('strike')) {
      scores.striker += 20;
    }
    if (lower.includes('force') || lower.includes('control') || lower.includes('technique')) {
      scores.controller += 20;
    }
  }

  // Determine primary and secondary
  const sortedRoles = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = sortedRoles[0][0];
  const secondary = sortedRoles[1][0];

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 1);
  const confidence = Math.min(1.0, scores[primary] / totalScore);

  return {
    primary: primary,
    secondary: secondary,
    confidence: Math.round(confidence * 100) / 100
  };
}

/**
 * Decay commitments on levelup
 * Commitments reduce unless reinforced by player action
 *
 * @param {MentorMemory} memory - The memory to decay
 * @param {number} decayRate - Rate of decay (default 0.15 = 15% reduction)
 * @returns {MentorMemory} Updated memory
 */
export function decayCommitments(memory, decayRate = 0.15) {
  if (!memory) {
    return new MentorMemory();
  }

  memory.commitmentStrength = Math.max(0.0, memory.commitmentStrength - decayRate);
  memory.targetCommitment = Math.max(0.0, memory.targetCommitment - decayRate);

  return memory;
}

/**
 * Reinforce a commitment from player choice
 * Brings commitment strength back to 1.0
 *
 * @param {MentorMemory} memory - The memory to update
 * @param {string} commitmentType - "path" or "targetClass"
 * @returns {MentorMemory} Updated memory
 */
export function reinforceCommitment(memory, commitmentType = "path") {
  if (!memory) {
    return new MentorMemory();
  }

  if (commitmentType === "path") {
    memory.commitmentStrength = 1.0;
  } else if (commitmentType === "targetClass") {
    memory.targetCommitment = 1.0;
  }

  return memory;
}

/**
 * Set a soft commitment to an archetype
 * Does not lock player, just influences suggestions
 *
 * @param {MentorMemory} memory - The memory to update
 * @param {string} path - Path name (e.g., "guardian", "striker", "controller")
 * @returns {MentorMemory} Updated memory
 */
export function setCommittedPath(memory, path) {
  if (!memory) {
    memory = new MentorMemory();
  }

  memory.committedPath = path;
  memory.commitmentStrength = 1.0;

  return memory;
}

/**
 * Set a target class for future progression
 * Used for prestige class planning
 *
 * @param {MentorMemory} memory - The memory to update
 * @param {string} targetClass - Target class name
 * @returns {MentorMemory} Updated memory
 */
export function setTargetClass(memory, targetClass) {
  if (!memory) {
    memory = new MentorMemory();
  }

  memory.targetClass = targetClass;
  memory.targetCommitment = 1.0;

  return memory;
}

/**
 * Update inferred role based on current actor state
 *
 * @param {MentorMemory} memory - The memory to update
 * @param {Actor} actor - The actor
 * @returns {MentorMemory} Updated memory
 */
export function updateInferredRole(memory, actor) {
  if (!memory) {
    memory = new MentorMemory();
  }

  if (!actor) {
    return memory;
  }

  const roleInfo = inferRole(actor);
  memory.inferredRole = roleInfo.primary;
  memory.inferredSecondary = roleInfo.secondary;
  memory.roleConfidence = roleInfo.confidence;

  return memory;
}

/**
 * Apply decay to all mentors for an actor
 * Called on levelup
 *
 * @param {Actor} actor - The actor
 * @param {number} decayRate - Decay rate per levelup
 * @returns {Promise<void>}
 */
export async function decayAllMentorCommitments(actor, decayRate = 0.15) {
  if (!actor) {
    return;
  }

  const mentorMemories = actor.getFlag('swse', 'mentorMemories') || {};
  let updated = false;

  for (const [mentorId, memoryData] of Object.entries(mentorMemories)) {
    const memory = MentorMemory.fromJSON(memoryData);
    const decayed = decayCommitments(memory, decayRate);

    if (decayed.commitmentStrength !== memory.commitmentStrength ||
        decayed.targetCommitment !== memory.targetCommitment) {
      mentorMemories[mentorId] = decayed.toJSON();
      updated = true;
    }
  }

  if (updated) {
    await actor.setFlag('swse', 'mentorMemories', mentorMemories);
  }
}

/**
 * Update all mentor memories with current actor state
 * Called to ensure memories reflect current reality
 *
 * @param {Actor} actor - The actor
 * @returns {Promise<void>}
 */
export async function updateAllMentorMemories(actor) {
  if (!actor) {
    return;
  }

  const mentorMemories = actor.getFlag('swse', 'mentorMemories') || {};
  let updated = false;

  for (const [mentorId, memoryData] of Object.entries(mentorMemories)) {
    const memory = MentorMemory.fromJSON(memoryData);
    const oldRole = memory.inferredRole;

    updateInferredRole(memory, actor);

    // Only update flag if role changed
    if (memory.inferredRole !== oldRole) {
      mentorMemories[mentorId] = memory.toJSON();
      updated = true;
    }
  }

  if (updated) {
    await actor.setFlag('swse', 'mentorMemories', mentorMemories);
  }
}

/**
 * Get all mentor memories for an actor
 *
 * @param {Actor} actor - The actor
 * @returns {object} Map of mentorId -> MentorMemory
 */
export function getAllMentorMemories(actor) {
  if (!actor) {
    return {};
  }

  const mentorMemories = actor.getFlag('swse', 'mentorMemories') || {};
  const result = {};

  for (const [mentorId, memoryData] of Object.entries(mentorMemories)) {
    result[mentorId] = MentorMemory.fromJSON(memoryData);
  }

  return result;
}

/**
 * Format mentor memory for display/debugging
 *
 * @param {MentorMemory} memory - The memory
 * @returns {string} Formatted string
 */
export function formatMentorMemory(memory) {
  if (!memory) {
    return "No memory";
  }

  let output = `Trust: ${Math.round(memory.trust * 100)}%\n`;
  output += `Role: ${memory.inferredRole} (${memory.inferredSecondary}) [${Math.round(memory.roleConfidence * 100)}%]\n`;

  if (memory.committedPath) {
    output += `Committed Path: ${memory.committedPath} (${Math.round(memory.commitmentStrength * 100)}%)\n`;
  }

  if (memory.targetClass) {
    output += `Target Class: ${memory.targetClass} (${Math.round(memory.targetCommitment * 100)}%)\n`;
  }

  return output;
}
