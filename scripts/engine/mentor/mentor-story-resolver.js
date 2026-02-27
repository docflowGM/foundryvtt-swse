/**
 * Mentor Self-Disclosure Story Resolver
 *
 * Resolves mentor story responses based on:
 * - Career progression (normalized to player's 1-20 lifespan)
 * - DSP gating (based on distance model, not absolute morality)
 * - Mentor-specific tolerance and sensitivity
 *
 * Pure read-only logic with no state mutations.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MentorStoryResolver {
  /**
   * Resolve mentor story response for a character
   * @param {Object} actor - The character actor
   * @param {Object} mentor - The mentor definition
   * @param {string} mentorName - The mentor's name
   * @returns {string} - The story response or deflection
   */
  static resolveStoryResponse(actor, mentor, mentorName) {
    // Extract story definition
    const storyData = mentor.mentorStory;
    if (!storyData) {
      return this._getFallbackResponse(mentorName);
    }

    // Calculate mentor-relevant progress (0.0 → 1.0)
    const progress = this._calculateMentorProgress(actor, storyData);

    // Determine tier (1-5)
    const tier = this._resolveTier(progress);

    // Check DSP gating
    const dspStatus = this._checkDspGating(actor, mentor, storyData);
    if (!dspStatus.allowed) {
      return this._selectDialogue(storyData.dspBlocked);
    }

    // Get tier dialogue
    const tierKey = `tier${tier}`;
    const tierDialogue = storyData.tiers[tierKey];

    if (!tierDialogue || tierDialogue.length === 0) {
      return this._getFallbackResponse(mentorName, tier);
    }

    return this._selectDialogue(tierDialogue);
  }

  /**
   * Calculate mentor-relevant levels normalized to 20
   * mentorRelevantLevels / 20 = progress (0.0 → 1.0)
   */
  static _calculateMentorProgress(actor, storyData) {
    const mentorClasses = storyData.mentorClasses || [];

    if (mentorClasses.length === 0) {
      // Fallback: use actor's total level
      return Math.min(actor.system.level || 1, 20) / 20;
    }

    // Sum levels in mentor-relevant classes
    let relevantLevels = 0;
    for (const classId of mentorClasses) {
      // Actor's class data structure: system.classes[classId].level
      const classData = actor.system.classes?.[classId];
      if (classData) {
        relevantLevels += classData.level || 0;
      }
    }

    // Normalize to 20-level lifespan
    const progress = Math.min(relevantLevels, 20) / 20;
    return Math.max(0, Math.min(1, progress)); // Clamp to [0, 1]
  }

  /**
   * Map progress to tier (1-5)
   * Tier 1: 0-24%
   * Tier 2: 25-49%
   * Tier 3: 50-74%
   * Tier 4: 75-99%
   * Tier 5: 100% (requires additional conditions)
   */
  static _resolveTier(progress) {
    if (progress >= 1.0) {return 5;}
    if (progress >= 0.75) {return 4;}
    if (progress >= 0.5) {return 3;}
    if (progress >= 0.25) {return 2;}
    return 1;
  }

  /**
   * Check DSP gating rules
   * Returns { allowed: bool, reason: string }
   */
  static _checkDspGating(actor, mentor, storyData) {
    const sensitivity = storyData.dspSensitivity || 'none';

    // DSP sensitivity "none" → always allowed
    if (sensitivity === 'none') {
      return { allowed: true };
    }

    // Calculate DSP saturation and distance
    const playerDspPercent = this._calculatePlayerDspPercent(actor);
    const mentorDspPercent = storyData.mentorDSPPercent ?? 0.5;
    const dspDistance = Math.abs(playerDspPercent - mentorDspPercent);
    const tolerance = storyData.dspTolerance ?? 0.25;

    // Inverted sensitivity (evil mentors) → prefer corruption
    if (sensitivity === 'inverted') {
      // Block if *too close* to light (inverse logic)
      const invrtedDistance = 1.0 - dspDistance;
      if (invrtedDistance > tolerance) {
        return { allowed: false, reason: 'dsp_misaligned' };
      }
      return { allowed: true };
    }

    // Strict/Loose sensitivity → block if distance too great
    if (sensitivity === 'strict' || sensitivity === 'loose') {
      const allowance = sensitivity === 'loose' ? tolerance * 1.5 : tolerance;
      if (dspDistance > allowance) {
        return { allowed: false, reason: 'dsp_distance' };
      }
      return { allowed: true };
    }

    // Default: allow
    return { allowed: true };
  }

  /**
   * Calculate player's DSP saturation as percent
   * DSP / WIS, clamped to [0, 1]
   */
  static _calculatePlayerDspPercent(actor) {
    const dsp = actor.system.darkSidePoints || 0;
    const wisdom = actor.system.attributes?.wis?.base || 10;

    if (wisdom === 0) {return 0;}

    const saturation = dsp / wisdom;
    return Math.min(saturation, 1.0); // Cap at 100%
  }

  /**
   * Select dialogue from array, function, or string
   */
  static _selectDialogue(content) {
    if (typeof content === 'function') {
      return content();
    }

    if (Array.isArray(content)) {
      if (content.length === 0) {
        return null;
      }
      return content[Math.floor(Math.random() * content.length)];
    }

    return content || null;
  }

  /**
   * Fallback response when story data unavailable
   */
  static _getFallbackResponse(mentorName, tier = null) {
    const tierSuffix = tier ? ` (Tier ${tier})` : '';
    return (
      `*${mentorName} pauses thoughtfully${tierSuffix}*\n\n` +
      "I'm not quite ready to talk about that yet. Ask me something else."
    );
  }
}
