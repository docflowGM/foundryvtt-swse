/**
 * MENTOR JUDGMENT ATOMS - Decision Type Classifications
 *
 * Judgment Atoms represent the TYPE of mentor reaction to a decision.
 * They categorize the semantic nature of the mentor's assessment.
 *
 * These are engine-facing identifiers used to map decisions to appropriate
 * mentor responses and phrasing in mentor-atom-phrases.js.
 *
 * Judgment is determined ALONGSIDE Intensity during mentor response selection.
 */

/**
 * Canonical Judgment Atoms
 * 19 judgment types covering the full spectrum of mentor assessments.
 */
export const JUDGMENT_ATOMS = {
  /**
   * AFFIRMATION
   * "This validates something important about you."
   *
   * Positive reinforcement of identity, values, or growth already evident.
   * Mentor sees alignment between action and established character.
   */
  AFFIRMATION: 'AFFIRMATION',

  /**
   * CONFIRMATION
   * "Your instinct here was correct."
   *
   * Mentor validates a choice or approach the character was already inclined toward.
   * Builds confidence in the character's own judgment.
   */
  CONFIRMATION: 'CONFIRMATION',

  /**
   * CONSEQUENTIAL_AWARENESS
   * "You're beginning to understand what's really at stake."
   *
   * Character is developing comprehension of larger implications.
   * Growth in systemic thinking or strategic vision.
   */
  CONSEQUENTIAL_AWARENESS: 'CONSEQUENTIAL_AWARENESS',

  /**
   * CONTEXTUALIZATION
   * "Let me show you how this fits into the bigger picture."
   *
   * Mentor provides framework or pattern to help character understand significance.
   * Elevates perspective from immediate to contextual.
   */
  CONTEXTUALIZATION: 'CONTEXTUALIZATION',

  /**
   * EMERGENCE
   * "Something new is becoming possible for you."
   *
   * Recognition of newly unlocked potential or capability.
   * Often tied to prestige advancement or significant threshold crossing.
   */
  EMERGENCE: 'EMERGENCE',

  /**
   * ENCOURAGEMENT
   * "You're on the right path. Keep going."
   *
   * Positive reinforcement for continued effort or direction.
   * Less validation-focused than AFFIRMATION; more forward-looking.
   */
  ENCOURAGEMENT: 'ENCOURAGEMENT',

  /**
   * GRAVITY
   * "This matters. Pay attention."
   *
   * Warning or emphasis about weight/importance of a choice or direction.
   * Not necessarily negative, but signals significance.
   */
  GRAVITY: 'GRAVITY',

  /**
   * INSIGHT
   * "You've grasped something fundamental."
   *
   * Recognition that character has achieved deeper understanding.
   * Often intellectual or philosophical breakthrough.
   */
  INSIGHT: 'INSIGHT',

  /**
   * MATURATION
   * "You're becoming the kind of person who can handle this."
   *
   * Recognition of growth toward readiness or capability.
   * Focus on development, not just current ability.
   */
  MATURATION: 'MATURATION',

  /**
   * PATIENCE
   * "Not yet. This takes time."
   *
   * Mentor advises restraint or delayed action.
   * Can be cautionary without being negative.
   */
  PATIENCE: 'PATIENCE',

  /**
   * PERSPECTIVE
   * "Here's another way to look at this."
   *
   * Mentor offers alternative framing or viewpoint.
   * Expands character's understanding without judgment.
   */
  PERSPECTIVE: 'PERSPECTIVE',

  /**
   * REASSESSMENT
   * "Let's look at this more carefully."
   *
   * Mentor suggests reconsideration or deeper analysis.
   * Implies current assessment may be incomplete or surface-level.
   */
  REASSESSMENT: 'REASSESSMENT',

  /**
   * RECOGNITION
   * "I see who you are becoming."
   *
   * Mentor acknowledges trajectory, promise, or emerging identity.
   * Affirming but future-focused rather than past-validating.
   */
  RECOGNITION: 'RECOGNITION',

  /**
   * REFLECTION
   * "Consider what this says about you."
   *
   * Mentor invites self-examination.
   * Supportive inquiry rather than direction.
   */
  REFLECTION: 'REFLECTION',

  /**
   * REORIENTATION
   * "You need to look at this differently."
   *
   * More directive than PERSPECTIVE—suggests current framing is flawed.
   * Can be gentle or firm depending on intensity.
   */
  REORIENTATION: 'REORIENTATION',

  /**
   * REVELATION
   * "Now you see what was hidden."
   *
   * Mentor reveals information or understanding previously obscured.
   * Often tied to mysteries, secrets, or deeper truths about the world.
   */
  REVELATION: 'REVELATION',

  /**
   * RISK_ACKNOWLEDGMENT
   * "This path has dangers. Choose carefully."
   *
   * Mentor names risks without forbidding choice.
   * Respects character agency while ensuring informed decision.
   */
  RISK_ACKNOWLEDGMENT: 'RISK_ACKNOWLEDGMENT',

  /**
   * THRESHOLD
   * "You've crossed an important line."
   *
   * Recognition that a significant boundary has been passed.
   * Often tied to commitment escalation or point-of-no-return moments.
   */
  THRESHOLD: 'THRESHOLD',

  /**
   * WARNING
   * "Stop. This path leads to damage."
   *
   * Direct cautionary response—strongest warning level.
   * Mentor is genuinely concerned about consequences.
   */
  WARNING: 'WARNING'
};
