/**
 * MENTOR ATOM PHRASES
 *
 * Maps semantic atoms to mentor-specific phrases with intensity variants.
 * Used by MentorJudgmentEngine to build explanations from atoms.
 *
 * Structure:
 * {
 *   [mentorName]: {
 *     [atom]: {
 *       very_high: "...",
 *       high: "...",
 *       medium: "...",
 *       low: "...",
 *       very_low: "..."
 *     }
 *   }
 * }
 *
 * Intensity levels:
 * - very_high: Emphatic, absolute ("This is essential...")
 * - high: Strong, definitive ("This is important...")
 * - medium: Neutral, suggestive ("Consider...")
 * - low: Mild, tentative ("You could...")
 * - very_low: Minimal, optional ("This might...")
 */

export const MENTOR_ATOM_PHRASES = {
  // ========================================================================
  // MIRAJ - Jedi Mentor (mystical, force-aware, path-focused)
  // ========================================================================
  'Miraj': {
    'CommitmentDeclared': {
      very_high: "Your dedication defines your path.",
      high: "Your commitment is evident.",
      medium: "You show commitment to this direction.",
      low: "You are pursuing this path.",
      very_low: "This reflects your choices."
    },

    'GoalAdvancement': {
      very_high: "This moves you toward your destiny.",
      high: "This advances your goal significantly.",
      medium: "This supports your long-term aim.",
      low: "This relates to what you seek.",
      very_low: "This touches on your goals."
    },

    'DependencyChain': {
      very_high: "This is essential to what comes next.",
      high: "This is important for your progression.",
      medium: "This builds on previous choices.",
      low: "This connects to earlier decisions.",
      very_low: "This relates to your previous selections."
    },

    'RecentChoiceImpact': {
      very_high: "This reinforces your recent commitment.",
      high: "This builds naturally on your last choice.",
      medium: "This continues your recent direction.",
      low: "This extends what you just selected.",
      very_low: "This relates to your recent selection."
    },

    'PatternAlignment': {
      very_high: "This embodies your true nature.",
      high: "This aligns with your emerging pattern.",
      medium: "This reflects your established approach.",
      low: "This continues your general direction.",
      very_low: "This relates to your patterns."
    },

    'SynergyPresent': {
      very_high: "This amplifies all you have chosen.",
      high: "This creates powerful synergy.",
      medium: "This works well with your selections.",
      low: "This complements your other choices.",
      very_low: "This combines with what you have."
    },

    'ReadinessMet': {
      very_high: "You are fully prepared for this.",
      high: "Your preparation shows clearly.",
      medium: "You have what you need for this.",
      low: "You are ready for this step.",
      very_low: "You can handle this selection."
    },

    'PatternConflict': {
      very_high: "This contradicts your core path.",
      high: "This conflicts with your direction.",
      medium: "This diverges from your pattern.",
      low: "This doesn't quite fit your theme.",
      very_low: "This shifts away from your path."
    },

    'GoalDeviation': {
      very_high: "This moves you away from your goal.",
      high: "This diverges from your aim.",
      medium: "This shifts your direction somewhat.",
      low: "This isn't directly aligned with your goal.",
      very_low: "This doesn't support your goal."
    }
  },

  // ========================================================================
  // LEAD - Scout Mentor (practical, tactical, survival-focused)
  // ========================================================================
  'Lead': {
    'CommitmentDeclared': {
      very_high: "You're serious about this path.",
      high: "You're committed to this direction.",
      medium: "You're pursuing a clear goal.",
      low: "You're making deliberate choices.",
      very_low: "You're picking a direction."
    },

    'GoalAdvancement': {
      very_high: "This is critical to your mission.",
      high: "This moves you toward your objective.",
      medium: "This supports what you're after.",
      low: "This helps with your goal.",
      very_low: "This touches your objectives."
    },

    'DependencyChain': {
      very_high: "This is necessary for what comes next.",
      high: "This enables your next steps.",
      medium: "This sets up your progression.",
      low: "This leads to your next choices.",
      very_low: "This precedes your next selections."
    },

    'RecentChoiceImpact': {
      very_high: "This doubles down on your last move.",
      high: "This builds on your last selection.",
      medium: "This continues your recent choices.",
      low: "This extends your last pick.",
      very_low: "This follows your recent selection."
    },

    'PatternAlignment': {
      very_high: "This is exactly who you are.",
      high: "This matches your style.",
      medium: "This fits your approach.",
      low: "This aligns with your preference.",
      very_low: "This relates to your style."
    },

    'SynergyPresent': {
      very_high: "This creates formidable synergy.",
      high: "This works great with what you have.",
      medium: "This combines well with your choices.",
      low: "This complements your loadout.",
      very_low: "This adds to what you've got."
    },

    'ReadinessMet': {
      very_high: "You're combat-ready for this.",
      high: "You have what it takes.",
      medium: "You're prepared for this.",
      low: "You can handle this.",
      very_low: "You're ready enough for this."
    },

    'PatternConflict': {
      very_high: "This clashes with your whole approach.",
      high: "This doesn't fit your style.",
      medium: "This diverges from your method.",
      low: "This isn't your typical choice.",
      very_low: "This shifts your approach."
    },

    'GoalDeviation': {
      very_high: "This takes you off mission.",
      high: "This derails your objective.",
      medium: "This diverges from your goal.",
      low: "This doesn't support your aim.",
      very_low: "This misses your objective."
    }
  },

  // ========================================================================
  // Default Mentor (neutral, balanced)
  // ========================================================================
  'default': {
    'CommitmentDeclared': {
      very_high: "This represents a strong commitment.",
      high: "This shows clear direction.",
      medium: "This reflects your choices.",
      low: "This shows intent.",
      very_low: "This is your selection."
    },

    'GoalAdvancement': {
      very_high: "This directly advances your goal.",
      high: "This supports your objective.",
      medium: "This aids your aim.",
      low: "This relates to your goal.",
      very_low: "This touches your objectives."
    },

    'DependencyChain': {
      very_high: "This is essential for your progression.",
      high: "This enables future selections.",
      medium: "This builds on your choices.",
      low: "This connects to your selections.",
      very_low: "This relates to your progression."
    },

    'RecentChoiceImpact': {
      very_high: "This reinforces your recent selections.",
      high: "This builds on your last choice.",
      medium: "This continues your direction.",
      low: "This follows your selection.",
      very_low: "This relates to your recent choice."
    },

    'PatternAlignment': {
      very_high: "This perfectly matches your approach.",
      high: "This aligns with your pattern.",
      medium: "This reflects your style.",
      low: "This continues your approach.",
      very_low: "This relates to your pattern."
    },

    'SynergyPresent': {
      very_high: "This creates powerful synergy.",
      high: "This works well together.",
      medium: "This complements your choices.",
      low: "This combines with what you have.",
      very_low: "This adds to your selections."
    },

    'ReadinessMet': {
      very_high: "You are fully prepared for this.",
      high: "You have the foundation for this.",
      medium: "You are ready for this.",
      low: "You can manage this.",
      very_low: "You meet the requirements."
    },

    'PatternConflict': {
      very_high: "This contradicts your approach.",
      high: "This conflicts with your pattern.",
      medium: "This diverges from your style.",
      low: "This doesn't match your approach.",
      very_low: "This shifts your pattern."
    },

    'GoalDeviation': {
      very_high: "This moves you away from your goal.",
      high: "This diverges from your objective.",
      medium: "This shifts your direction.",
      low: "This doesn't support your goal.",
      very_low: "This diverges from your aim."
    }
  }
};

/**
 * Get mentor-specific phrases for an atom
 *
 * @param {string} atom - The atom name (e.g., 'CommitmentDeclared')
 * @param {string} mentorName - The mentor (falls back to 'default')
 * @returns {Object|null} Phrases object with intensity variants, or null if atom not found
 */
export function getMentorAtomPhrases(atom, mentorName = 'default') {
  const mentorPhrases = MENTOR_ATOM_PHRASES[mentorName] || MENTOR_ATOM_PHRASES['default'];
  return mentorPhrases[atom] || null;
}

/**
 * Get a specific phrase for an atom at a given intensity
 *
 * @param {string} atom - The atom name
 * @param {string} mentorName - The mentor name
 * @param {string} intensity - Intensity level (very_high, high, medium, low, very_low)
 * @returns {string|null} The phrase, or null if not found
 */
export function getMentorAtomPhrase(atom, mentorName = 'default', intensity = 'medium') {
  const phrases = getMentorAtomPhrases(atom, mentorName);
  if (!phrases) {return null;}

  return phrases[intensity] || phrases['medium'] || null;
}
