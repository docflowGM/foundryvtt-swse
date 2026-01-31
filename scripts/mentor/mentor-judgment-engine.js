/**
 * Mentor Judgment Engine
 *
 * Selects exactly ONE semantic reaction atom per mentor interaction.
 * No prose generation. Pure, deterministic reaction selection.
 *
 * JUDGMENT ATOMS (38 total, authoritative):
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
