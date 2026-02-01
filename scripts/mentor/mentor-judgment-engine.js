/**
 * Mentor Judgment Engine
 *
 * Selects exactly ONE semantic reaction atom per mentor interaction,
 * along with an intensity level and explanatory reasons.
 *
 * Mentor responses flow through FOUR AXES:
 * 1. TOPIC - What is being discussed (passed in, not inferred)
 * 2. JUDGMENT - How the mentor emotionally reacts (selected by this engine)
 * 3. INTENSITY - How strongly the mentor stands behind the reaction
 * 4. REASON - Why the mentor reacted (factual, inspectable via UI)
 *
 * This module handles judgment, intensity, and reason selection.
 * Dialogue rendering is handled separately in mentor-judgment-renderer.js.
 *
 * JUDGMENT ATOMS (36 total, authoritative):
 *
 * Recognition & Observation (4):
 *   - recognition: "I see what you're doing"
 *   - reflection: "Consider what that means"
 *   - contextualization: "Here's the broader picture"
 *   - clarification: "Let me be clear about that"
 *
 * Affirmation & Support (4):
 *   - affirmation: "That's good"
 *   - confirmation: "Yes, that's right"
 *   - encouragement: "Keep going"
 *   - resolve_validation: "Your conviction matters"
 *
 * Concern & Warning (4):
 *   - concern: "I'm worried about that"
 *   - warning: "Be careful"
 *   - risk_acknowledgment: "You're taking a risk"
 *   - exposure: "You're vulnerable here"
 *   - overreach: "You're overextending"
 *
 * Reorientation (4):
 *   - reorientation: "Different angle"
 *   - invitation: "Consider this path"
 *   - release: "Let it go"
 *   - reassessment: "Time to reconsider"
 *
 * Doubt & Testing (4):
 *   - doubt_recognition: "I sense your doubt"
 *   - inner_conflict: "You're conflicted"
 *   - resolve_testing: "Are you sure?"
 *   - uncertainty_acknowledgment: "It's unclear"
 *
 * Discipline & Focus (4):
 *   - restraint: "Hold back"
 *   - patience: "Wait for the right moment"
 *   - focus_reminder: "Stay on target"
 *   - discipline: "Maintain rigor"
 *
 * Insight & Understanding (4):
 *   - insight: "You're seeing it now"
 *   - perspective: "New angle"
 *   - revelation: "Something important"
 *   - humility: "Accept your limits"
 *
 * Gravity & Weight (3):
 *   - gravity: "This matters"
 *   - consequential_awareness: "You understand the cost"
 *   - threshold: "A turning point"
 *
 * Growth & Transformation (2):
 *   - emergence: "You're becoming something new"
 *   - transformation_acknowledgment: "You've changed"
 *   - maturation: "You're growing"
 *
 * Acceptance & Closure (3):
 *   - acceptance: "That's how it is"
 *   - deferral: "Not yet"
 *   - silence: No response
 */

import { INTENSITY_ATOMS, getIntensityScale, incrementIntensity, decrementIntensity } from './mentor-intensity-atoms.js';
import { isValidReasonKey } from './mentor-reason-renderer.js';
import { findMatchingRule, validateMentorRules } from './mentor-reason-judgment-map.js';
import { logMentorDecision, isMentorLoggingEnabled } from './mentor-decision-logger.js';

export const JUDGMENT_ATOMS = {
  // Recognition & Observation
  RECOGNITION: 'recognition',
  REFLECTION: 'reflection',
  CONTEXTUALIZATION: 'contextualization',
  CLARIFICATION: 'clarification',

  // Affirmation & Support
  AFFIRMATION: 'affirmation',
  CONFIRMATION: 'confirmation',
  ENCOURAGEMENT: 'encouragement',
  RESOLVE_VALIDATION: 'resolve_validation',

  // Concern & Warning
  CONCERN: 'concern',
  WARNING: 'warning',
  RISK_ACKNOWLEDGMENT: 'risk_acknowledgment',
  EXPOSURE: 'exposure',
  OVERREACH: 'overreach',

  // Reorientation
  REORIENTATION: 'reorientation',
  INVITATION: 'invitation',
  RELEASE: 'release',
  REASSESSMENT: 'reassessment',

  // Doubt & Testing
  DOUBT_RECOGNITION: 'doubt_recognition',
  INNER_CONFLICT: 'inner_conflict',
  RESOLVE_TESTING: 'resolve_testing',
  UNCERTAINTY_ACKNOWLEDGMENT: 'uncertainty_acknowledgment',

  // Discipline & Focus
  RESTRAINT: 'restraint',
  PATIENCE: 'patience',
  FOCUS_REMINDER: 'focus_reminder',
  DISCIPLINE: 'discipline',

  // Insight & Understanding
  INSIGHT: 'insight',
  PERSPECTIVE: 'perspective',
  REVELATION: 'revelation',
  HUMILITY: 'humility',

  // Gravity & Weight
  GRAVITY: 'gravity',
  CONSEQUENTIAL_AWARENESS: 'consequential_awareness',
  THRESHOLD: 'threshold',

  // Growth & Transformation
  EMERGENCE: 'emergence',
  TRANSFORMATION_ACKNOWLEDGMENT: 'transformation_acknowledgment',
  MATURATION: 'maturation',

  // Acceptance & Closure
  ACCEPTANCE: 'acceptance',
  DEFERRAL: 'deferral',
  SILENCE: 'silence'
};

/**
 * Select exactly ONE judgment atom based on context
 *
 * @param {Object} context - Read-only context object containing:
 *   - actor: The character being analyzed
 *   - mentorId: The mentor's ID
 *   - mentorMemory: Mentor-specific memory (committedPath, commitmentStrength, etc.)
 *   - topic: The dialogue topic key
 *   - buildIntent: Character's build analysis
 *   - isOnPath: Whether player choice aligns with committed path
 *   - commitmentJustChanged: Whether commitment just shifted
 *   - isHighImpact: Whether this is a major decision point
 *   - isUndecidedOrDrifting: Whether player is undecided or drifting
 *   - lastAction: Last meaningful player action
 *   - dspSaturation: Dark Side Points saturation level (0-1)
 *
 * @returns {string} Single judgment atom ID from JUDGMENT_ATOMS
 *
 * Decision Priority (highest to lowest):
 * 1. confirmation (high-impact on-path decisions)
 * 2. gravity (threshold moments, major transitions)
 * 3. warning (exposure, overreach detection)
 * 4. affirmation (synergistic choices)
 * 5. recognition (default observational)
 * 6. silence (when no strong reaction exists)
 */
export function selectJudgmentAtom(context) {
  // Guard against null/undefined context
  if (!context) {
    return JUDGMENT_ATOMS.SILENCE;
  }

  const {
    actor,
    mentorId,
    mentorMemory,
    topic,
    buildIntent,
    isOnPath,
    commitmentJustChanged,
    isHighImpact,
    isUndecidedOrDrifting,
    lastAction,
    dspSaturation
  } = context;

  // PRIORITY 1: CONFIRMATION (High-impact + On-path)
  // When player makes a decisive, aligned choice
  if (isHighImpact && isOnPath && mentorMemory?.commitmentStrength > 0.5) {
    return JUDGMENT_ATOMS.CONFIRMATION;
  }

  // PRIORITY 2: GRAVITY (Threshold/Major Transitions)
  // - Reaching level 6+ (prestige class territory)
  // - First major archetype commitment
  // - High-impact decisions with consequences
  if (actor?.system?.level >= 6 && topic === 'what_lies_ahead') {
    return JUDGMENT_ATOMS.GRAVITY;
  }

  if (commitmentJustChanged && !isOnPath) {
    return JUDGMENT_ATOMS.THRESHOLD;
  }

  if (isHighImpact && mentorMemory?.commitmentStrength > 0.7) {
    return JUDGMENT_ATOMS.CONSEQUENTIAL_AWARENESS;
  }

  // PRIORITY 3: WARNING (Exposure/Overreach Detection)
  // Dark Side saturation or overspecialization
  if (dspSaturation > 0.7) {
    return JUDGMENT_ATOMS.EXPOSURE;
  }

  // Detect overreach (too many competing archetypes)
  const inferredRole = buildIntent?.inferredRole;
  const targetClass = mentorMemory?.targetClass;
  if (isHighImpact && !inferredRole && !targetClass) {
    return JUDGMENT_ATOMS.OVERREACH;
  }

  // Off-path choice = concern
  if (isHighImpact && !isOnPath && mentorMemory?.commitmentStrength > 0.3) {
    return JUDGMENT_ATOMS.CONCERN;
  }

  // Off-path without high-impact = reassessment (drift detection)
  // If player is committed to a path but now diverging, mentor should note the shift
  if (!isOnPath && mentorMemory?.commitmentStrength > 0.3 && !isHighImpact) {
    return JUDGMENT_ATOMS.REASSESSMENT;
  }

  // PRIORITY 4: AFFIRMATION (Synergistic choices)
  // When player choice reinforces existing themes
  if (isOnPath && !isHighImpact && topic === 'doing_well') {
    return JUDGMENT_ATOMS.AFFIRMATION;
  }

  if (buildIntent?.synergies && buildIntent.synergies.length > 0 && topic === 'doing_well') {
    return JUDGMENT_ATOMS.ENCOURAGEMENT;
  }

  // PRIORITY 5: DOUBT/TESTING (Undecided or drifting)
  if (isUndecidedOrDrifting && mentorMemory?.commitmentStrength < 0.3) {
    return JUDGMENT_ATOMS.DOUBT_RECOGNITION;
  }

  if (isUndecidedOrDrifting && topic === 'who_am_i_becoming') {
    return JUDGMENT_ATOMS.UNCERTAINTY_ACKNOWLEDGMENT;
  }

  // Soft reassessment if player is drifting
  if (isUndecidedOrDrifting) {
    return JUDGMENT_ATOMS.REASSESSMENT;
  }

  // PRIORITY 6: RECOGNITION (Default observational)
  // Safe, neutral observation that doesn't commit to reaction
  switch (topic) {
    case 'who_am_i_becoming':
      return JUDGMENT_ATOMS.REFLECTION;
    case 'paths_open':
      return JUDGMENT_ATOMS.CONTEXTUALIZATION;
    case 'doing_wrong':
      return JUDGMENT_ATOMS.CLARIFICATION;
    case 'what_lies_ahead':
      return JUDGMENT_ATOMS.INSIGHT;
    case 'mentor_story':
      return JUDGMENT_ATOMS.PERSPECTIVE;
    default:
      return JUDGMENT_ATOMS.RECOGNITION;
  }
}

/**
 * Build judgment context for selectJudgmentAtom
 * This helper function extracts relevant context from actor, mentor memory, and build intent.
 *
 * NOTE: MentorMemory import is done inside the function to avoid circular dependencies.
 *
 * @param {Actor} actor - The character
 * @param {string} mentorId - The mentor's ID
 * @param {string} topic - The dialogue topic key
 * @param {Object} buildIntent - BuildIntent analysis
 * @returns {Object} Complete context object for selectJudgmentAtom
 */
export async function buildJudgmentContext(actor, mentorId, topic, buildIntent) {
  if (!actor) {
    return {
      actor: null,
      mentorId: null,
      mentorMemory: null,
      topic: null,
      buildIntent: null,
      isOnPath: false,
      commitmentJustChanged: false,
      isHighImpact: false,
      isUndecidedOrDrifting: false,
      lastAction: null,
      dspSaturation: 0
    };
  }

  // Import here to avoid circular dependency
  const mentorMemoryModule = await import('../engine/mentor-memory.js');
  const { getMentorMemory } = mentorMemoryModule;

  const mentorMemory = getMentorMemory(actor, mentorId);
  const dspSaturation = (actor.system?.darkSidePoints || 0) / (actor.system?.maxDarkSidePoints || 1);

  // Determine if player choice is on-path
  const inferredRole = buildIntent?.inferredRole;
  const isOnPath = mentorMemory?.committedPath && inferredRole === mentorMemory.committedPath;

  // Determine high-impact topics
  const highImpactTopics = [
    'paths_open',
    'what_lies_ahead',
    'doing_wrong',
    'be_careful'
  ];
  const isHighImpact = highImpactTopics.includes(topic);

  // Determine if undecided or drifting
  const isUndecidedOrDrifting = !mentorMemory?.committedPath || mentorMemory.commitmentStrength < 0.2;

  return {
    actor,
    mentorId,
    mentorMemory,
    topic,
    buildIntent,
    isOnPath,
    commitmentJustChanged: false, // Would need additional tracking
    isHighImpact,
    isUndecidedOrDrifting,
    lastAction: null, // Would track previous user interaction
    dspSaturation
  };
}

/**
 * Determine intensity level based on context
 * Intensity represents how strongly the mentor stands behind the reaction.
 *
 * @param {string} judgment - The selected judgment atom
 * @param {Object} context - The judgment context object
 * @returns {string} One of: very_low, low, medium, high, very_high
 */
function selectIntensityAtom(judgment, context) {
  const {
    isHighImpact,
    isOnPath,
    mentorMemory,
    dspSaturation,
    buildIntent
  } = context;

  // very_high: Exceptional moments (threshold, severe warning)
  if (judgment === JUDGMENT_ATOMS.GRAVITY || judgment === JUDGMENT_ATOMS.CONSEQUENTIAL_AWARENESS) {
    return INTENSITY_ATOMS.very_high;
  }
  if (judgment === JUDGMENT_ATOMS.EXPOSURE && dspSaturation > 0.8) {
    return INTENSITY_ATOMS.very_high;
  }

  // high: Strong reactions (confirmation, overreach, major concern)
  if (judgment === JUDGMENT_ATOMS.CONFIRMATION && isHighImpact && isOnPath) {
    return INTENSITY_ATOMS.high;
  }
  if (judgment === JUDGMENT_ATOMS.OVERREACH) {
    return INTENSITY_ATOMS.high;
  }
  if (judgment === JUDGMENT_ATOMS.CONCERN && isHighImpact) {
    return INTENSITY_ATOMS.high;
  }
  if (judgment === JUDGMENT_ATOMS.WARNING && dspSaturation > 0.6) {
    return INTENSITY_ATOMS.high;
  }

  // medium: Balanced guidance (most reactions)
  if (judgment === JUDGMENT_ATOMS.AFFIRMATION || judgment === JUDGMENT_ATOMS.ENCOURAGEMENT) {
    return INTENSITY_ATOMS.medium;
  }
  if (judgment === JUDGMENT_ATOMS.REASSESSMENT) {
    return INTENSITY_ATOMS.medium;
  }
  if (judgment === JUDGMENT_ATOMS.INSIGHT || judgment === JUDGMENT_ATOMS.PERSPECTIVE) {
    return INTENSITY_ATOMS.medium;
  }

  // low: Gentle guidance (minor concerns, weak synergies)
  if (judgment === JUDGMENT_ATOMS.CONCERN && !isHighImpact) {
    return INTENSITY_ATOMS.low;
  }
  if (judgment === JUDGMENT_ATOMS.DOUBT_RECOGNITION) {
    return INTENSITY_ATOMS.low;
  }

  // very_low: Barely warrants comment (silence or filler)
  if (judgment === JUDGMENT_ATOMS.SILENCE) {
    return INTENSITY_ATOMS.very_low;
  }

  // Default to medium for unspecified reactions
  return INTENSITY_ATOMS.medium;
}

/**
 * Determine reason keys based on context (CONTEXT-ONLY, no judgment dependency)
 *
 * Reasons explain WHY the mentor reacted, factual and inspectable.
 * Returns 0-3 canonical reason keys (usually 1-2).
 *
 * All returned keys MUST exist in REASON_TEXT_MAP (mentor-reason-renderer.js).
 * Reasons are never spoken; they are exposed only via UI inspection.
 *
 * NOTE: This function derives facts from context ONLY.
 * It does not depend on judgment selection (judgment comes later from rule matching).
 *
 * @param {Object} context - The judgment context object
 * @returns {string[]} Array of canonical reason keys (may be empty)
 */
export function selectReasonAtoms(context) {
  const {
    isOnPath,
    isHighImpact,
    mentorMemory,
    buildIntent,
    dspSaturation,
    actor
  } = context;

  const reasons = [];

  // ========================================================================
  // Pattern Alignment/Conflict
  // ========================================================================
  if (isOnPath && buildIntent?.inferredRole) {
    // Player choice aligns with detected build direction
    reasons.push('feat_supports_existing_role');
  } else if (!isOnPath && mentorMemory?.commitmentStrength > 0.3) {
    // Player choice diverges from detected build direction
    reasons.push('prestige_path_divergence');
  }

  // ========================================================================
  // Synergy Detection (Feats, Talents, Skills)
  // ========================================================================
  if (buildIntent?.synergies && buildIntent.synergies.length > 1) {
    // Multiple synergies present
    reasons.push('synergy_present');
  } else if (buildIntent?.synergies && buildIntent.synergies.length === 1) {
    // Single strong synergy
    reasons.push('feat_reinforces_core_strength');
  }

  // ========================================================================
  // Commitment & Strength
  // ========================================================================
  if (mentorMemory?.commitmentStrength > 0.7 && isOnPath) {
    // Strong commitment to current path
    reasons.push('prestige_path_consistency');
  }
  if (mentorMemory?.commitmentStrength > 0.3 && !isOnPath) {
    // Commitment exists but being ignored
    reasons.push('commitment_ignored');
  }

  // ========================================================================
  // Risk & Resource Indicators
  // ========================================================================
  if (dspSaturation > 0.8) {
    // Very high DSP saturation—severe warning
    reasons.push('risk_increased');
  } else if (dspSaturation > 0.6) {
    // Moderate DSP saturation—caution
    reasons.push('risk_increased');
  }

  // ========================================================================
  // Growth & Progression Stage
  // ========================================================================
  if (actor?.system?.level >= 6) {
    // Level 6+ is prestige threshold
    reasons.push('prestige_specialization_threshold');
  } else if (actor?.system?.level >= 4 && actor?.system?.level < 6) {
    // Mid-level progression
    reasons.push('growth_stage_shift');
  }

  // High-impact choices at key moments
  if (isHighImpact && actor?.system?.level >= 6) {
    // Major threshold moment at late stage
    reasons.push('prestige_prerequisites_met');
  }

  // ========================================================================
  // Exploration Signals
  // ========================================================================
  if (!isOnPath && mentorMemory?.commitmentStrength < 0.3) {
    // Active exploration (low commitment)
    reasons.push('exploration_signal');
  }

  // ========================================================================
  // Readiness Signals
  // ========================================================================
  if (isOnPath && mentorMemory?.commitmentStrength > 0.5) {
    // Ready for significant advancement
    reasons.push('readiness_met');
  }

  // ========================================================================
  // Validate all reasons before returning
  // ========================================================================
  const validReasons = reasons.filter(key => {
    if (!isValidReasonKey(key)) {
      console.warn(`[selectReasonAtoms] Invalid reason key: "${key}" — skipping`);
      return false;
    }
    return true;
  });

  // Limit to 3 reasons maximum
  return validReasons.slice(0, 3);
}

/**
 * Refine intensity based on context (Phase 2: Feel Tuning)
 *
 * This function takes a base intensity from the rule and adjusts it based on:
 * - Number and strength of reasons present
 * - Player commitment level
 * - Whether this is a high-impact decision
 * - Whether player is exploring vs committed
 *
 * Tuning heuristics:
 * - Multiple strong reasons → bump intensity up
 * - Exploration-only signal → bump intensity down
 * - High-impact + strong commitment → bump intensity up
 * - DSP saturation → bump intensity up for warnings
 *
 * @param {string} baseIntensity - Intensity from the rule (e.g., "medium")
 * @param {string[]} reasons - The extracted reason keys (for count/analysis)
 * @param {Object} context - The judgment context
 * @returns {string} Refined intensity atom
 */
function refineIntensity(baseIntensity, reasons, context) {
  let intensity = baseIntensity;

  const {
    isHighImpact,
    mentorMemory,
    dspSaturation,
    isUndecidedOrDrifting
  } = context;

  // Multiple strong reasons → increase intensity
  // (More facts supporting the reaction = more conviction)
  if (reasons && reasons.length >= 3) {
    intensity = incrementIntensity(intensity);
  }

  // High-impact decision with strong commitment → increase intensity
  // (Important moment with clear path = mentor should be more emphatic)
  if (isHighImpact && mentorMemory?.commitmentStrength > 0.7) {
    intensity = incrementIntensity(intensity);
  }

  // Exploration-only signal (low commitment, not on path) → decrease intensity
  // (Player exploring without commitment = mentor should hold back)
  if (!isUndecidedOrDrifting && mentorMemory?.commitmentStrength < 0.2) {
    intensity = decrementIntensity(intensity);
  }

  // Very high DSP saturation with warning judgments → increase intensity
  // (Severe danger = mentor must be emphatic)
  if (dspSaturation > 0.8 && baseIntensity !== INTENSITY_ATOMS.very_low) {
    intensity = incrementIntensity(intensity);
  }

  return intensity;
}

/**
 * Select complete mentor response using rule-based judgment determination
 *
 * This is the AUTHORITATIVE mentor response interface.
 * Flow:
 * 1. Extract facts from context (selectReasonAtoms)
 * 2. Match facts to rule (findMatchingRule)
 * 3. Get judgment + base intensity from rule
 * 4. Refine intensity based on context + reasons
 * 5. Log decision (if enabled)
 * 6. Return complete response
 *
 * @param {Object} context - The judgment context (from buildJudgmentContext)
 * @returns {Object} Complete response:
 *   {
 *     judgment: string,      // judgment atom (from rule)
 *     intensity: string,     // intensity atom (rule-based + refined)
 *     reasons: string[]      // array of canonical reason keys (0-3)
 *                            // Each key maps to text in REASON_TEXT_MAP
 *   }
 */
export function selectMentorResponse(context) {
  if (!context) {
    return {
      judgment: JUDGMENT_ATOMS.SILENCE,
      intensity: INTENSITY_ATOMS.very_low,
      reasons: []
    };
  }

  // PHASE 1: Extract facts from character context
  const reasons = selectReasonAtoms(context);

  // PHASE 1: Match facts to rule → get judgment + baseIntensity
  const rule = findMatchingRule(reasons);
  const judgment = rule.judgment;
  const baseIntensity = rule.intensity;

  // PHASE 2: Refine intensity based on context + reason strength
  const intensity = refineIntensity(baseIntensity, reasons, context);

  // LOGGING (Dev-only): Trace the complete decision flow
  if (isMentorLoggingEnabled()) {
    logMentorDecision({
      characterName: context.actor?.name || "Unknown",
      mentorId: context.mentorId,
      reasons,
      ruleLabel: rule.label,
      judgment,
      baseIntensity,
      intensity,
      refined: intensity !== baseIntensity
    });
  }

  // Return complete response
  return {
    judgment,
    intensity,
    reasons
  };
}
