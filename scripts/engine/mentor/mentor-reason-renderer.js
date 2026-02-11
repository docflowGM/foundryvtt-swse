/**
 * MENTOR REASON RENDERER - Decision Explanation Formatter
 *
 * Converts structured mentor decision records into human-readable explanations.
 * This is an ENGINE-LAYER formatting module.
 *
 * RESPONSIBILITY:
 * - Format decision records into UI-safe explanatory text
 * - Support multiple verbosity levels
 * - NO DOM creation
 * - NO styling or localization
 * - NO side-effects
 *
 * Output is suitable for tooltips, debug panels, mentor UI panels, etc.
 * The consumer (UI layer) decides where to display the text.
 */

/**
 * Format a mentor decision record as human-readable text.
 *
 * Produces explanatory text that answers "Why did the mentor recommend this?"
 * The text is conversational and avoids technical jargon.
 *
 * @param {Object} record - MentorDecisionRecord from mentor-decision-logger.js
 * @param {Object} options - Formatting options
 *   @param {boolean} options.verbose - Include detailed breakdown (default: false)
 *   @param {boolean} options.includeContext - Include character/level info (default: true)
 *   @param {boolean} options.includeReasons - Include supporting reasons (default: true)
 *   @param {string} options.format - Output format: 'text' or 'html' (default: 'text')
 *   @param {number} options.maxReasons - Max supporting reasons to include (default: 3)
 *
 * @returns {string} Formatted explanation (plain text or HTML)
 *
 * @example
 * const explanation = formatReasoning(record);
 * // Returns: "This suggestion strongly aligns with your martial focus..."
 *
 * @example
 * const detailed = formatReasoning(record, { verbose: true });
 * // Includes factor breakdown and additional context
 */
export function formatReasoning(record = {}, options = {}) {
  const {
    verbose = false,
    includeContext = true,
    includeReasons = true,
    format = 'text',
    maxReasons = 3
  } = options;

  // Validate record
  if (!record || typeof record !== 'object') {
    return formatAsText('Unable to format reasoning: invalid record.', format);
  }

  // Build explanation sections
  const sections = [];

  // Section 1: Opening
  sections.push(buildOpeningStatement(record));

  // Section 2: Context (optional)
  if (includeContext && record.context) {
    const contextLine = buildContextLine(record.context);
    if (contextLine) {
      sections.push(contextLine);
    }
  }

  // Section 3: Supporting reasons (optional)
  if (includeReasons && record.context?.supportingReasons?.length > 0) {
    const reasonsLine = buildReasonsLine(
      record.context.supportingReasons,
      maxReasons
    );
    if (reasonsLine) {
      sections.push(reasonsLine);
    }
  }

  // Section 4: Intensity breakdown (verbose only)
  if (verbose && record.intensity?.breakdown?.length > 0) {
    const breakdownLine = buildBreakdownLine(record.intensity.breakdown);
    if (breakdownLine) {
      sections.push(breakdownLine);
    }
  }

  // Join sections
  const text = sections.filter(s => s && s.length > 0).join(' ');

  // Format for output
  return formatAsText(text, format);
}

/**
 * Build the opening statement based on intensity.
 * @private
 */
function buildOpeningStatement(record) {
  const { suggestionName, intensity } = record;

  if (!intensity || !suggestionName) {
    return 'This suggestion is offered for consideration.';
  }

  const { level, score } = intensity;

  // Phrasing by intensity level
  const phrasings = {
    very_low: `${suggestionName} is worth a glance—`,
    low: `${suggestionName} could be interesting—`,
    medium: `${suggestionName} is a solid choice—`,
    high: `${suggestionName} is a strong fit—`,
    very_high: `${suggestionName} is exactly what you're looking for—`
  };

  const basePhrase = phrasings[level] || phrasings.medium;
  const confidence = `(${(score * 100).toFixed(0)}% aligned)`;

  return `${basePhrase} ${confidence}`;
}

/**
 * Build context line (character, level, focus).
 * @private
 */
function buildContextLine(context) {
  const { characterName, characterLevel, buildFocus } = context;

  const parts = [];

  if (buildFocus) {
    parts.push(`it supports your ${buildFocus} focus`);
  }

  if (characterLevel && characterLevel >= 3) {
    parts.push(`at your current level`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `For ${characterName || 'your character'}, ${parts.join(' and ')}.`;
}

/**
 * Build supporting reasons line.
 * @private
 */
function buildReasonsLine(reasons = [], maxReasons = 3) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return null;
  }

  const limited = reasons.slice(0, maxReasons);

  if (limited.length === 1) {
    return `Reason: ${limited[0]}`;
  }

  const enumerated = limited
    .map((r, i) => `${i + 1}. ${r}`)
    .join(' ');

  return `Reasons: ${enumerated}`;
}

/**
 * Build intensity breakdown line (verbose mode).
 * @private
 */
function buildBreakdownLine(breakdown = []) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return null;
  }

  // Format each factor
  const factors = breakdown
    .map(item => {
      const { atom, contribution } = item;
      const humanName = atomToHumanName(atom);
      const percent = (contribution * 100).toFixed(0);
      return `${humanName} (${percent}%)`;
    })
    .join(', ');

  return `Factors: ${factors}.`;
}

/**
 * Convert atom key to human-readable name.
 * @private
 */
function atomToHumanName(atom) {
  const names = {
    theme_match: 'Theme Match',
    prestige_signal: 'Prestige Path',
    ability_synergy: 'Ability Synergy',
    level_appropriate: 'Level',
    milestone_aligned: 'Milestone',
    mentor_memory_affinity: 'Mentor Affinity',
    role_coherence: 'Role Fit',
    synergy_strength: 'Synergy',
    unique_advantage: 'Unique Advantage',
    exploratory_value: 'Exploration',
    cautionary_weight: 'Risk'
  };

  return names[atom] || atom;
}

/**
 * Format text for output (plain or HTML).
 * @private
 */
function formatAsText(text, format = 'text') {
  if (format === 'html') {
    // HTML-safe: escape special characters
    return escapeHtml(text);
  }
  return text;
}

/**
 * Escape HTML special characters.
 * @private
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, char => map[char]);
}

/**
 * Generate a short, one-line explanation.
 *
 * Useful for compact tooltips or brief feedback.
 *
 * @param {Object} record - MentorDecisionRecord
 * @returns {string} One-line explanation
 *
 * @example
 * const short = formatShort(record);
 * // Returns: "Power Attack (85% aligned)"
 */
export function formatShort(record = {}) {
  const { suggestionName, intensity } = record;

  if (!suggestionName || !intensity) {
    return 'Suggestion offered';
  }

  const percent = (intensity.score * 100).toFixed(0);
  return `${suggestionName} (${percent}% aligned)`;
}

/**
 * Generate a multi-line verbose explanation.
 *
 * Useful for detail panels or hover tooltips.
 *
 * @param {Object} record - MentorDecisionRecord
 * @returns {string} Detailed explanation
 *
 * @example
 * const verbose = formatVerbose(record);
 * // Returns: Multi-paragraph explanation with breakdown
 */
export function formatVerbose(record = {}) {
  return formatReasoning(record, {
    verbose: true,
    includeContext: true,
    includeReasons: true,
    maxReasons: 5
  });
}

/**
 * Generate a debug-friendly explanation.
 *
 * Includes all available information, useful for troubleshooting.
 * NOT intended for player-facing UI.
 *
 * @param {Object} record - MentorDecisionRecord
 * @returns {string} Debug explanation
 *
 * @example
 * const debug = formatDebug(record);
 * // Returns: Full breakdown with all factors and context
 */
export function formatDebug(record = {}) {
  const lines = [];

  lines.push(`=== Mentor Decision Debug ===`);
  lines.push(`Suggestion: ${record.suggestionName || 'Unknown'}`);
  lines.push(`ID: ${record.suggestionId || 'Unknown'}`);
  lines.push(`Timestamp: ${new Date(record.timestamp).toISOString()}`);

  if (record.context) {
    lines.push(`\n--- Context ---`);
    lines.push(`Character: ${record.context.characterName || 'Unknown'}`);
    if (record.context.characterLevel) {
      lines.push(`Level: ${record.context.characterLevel}`);
    }
    if (record.context.buildFocus) {
      lines.push(`Focus: ${record.context.buildFocus}`);
    }
    if (record.context.mentorId) {
      lines.push(`Mentor: ${record.context.mentorId}`);
    }
  }

  if (record.intensity) {
    lines.push(`\n--- Intensity ---`);
    lines.push(`Score: ${record.intensity.score}`);
    lines.push(`Level: ${record.intensity.level}`);

    if (record.intensity.breakdown?.length > 0) {
      lines.push(`Breakdown:`);
      record.intensity.breakdown.forEach(item => {
        lines.push(`  ${item.atom}: ${item.contribution}`);
      });
    }
  }

  if (record.factors?.length > 0) {
    lines.push(`\n--- Input Factors ---`);
    record.factors.forEach(factor => {
      lines.push(`  ${factor.atom}: ${factor.weight}`);
    });
  }

  if (record.context?.supportingReasons?.length > 0) {
    lines.push(`\n--- Supporting Reasons ---`);
    record.context.supportingReasons.forEach(reason => {
      lines.push(`  • ${reason}`);
    });
  }

  lines.push(`\n--- Summary ---`);
  lines.push(record.summary || 'No summary available');

  return lines.join('\n');
}

/**
 * Utility: Check if a record has valid intensity data.
 *
 * @param {Object} record - MentorDecisionRecord
 * @returns {boolean} True if record has intensity >= MEDIUM level
 */
export function hasSignificantIntensity(record = {}) {
  if (!record.intensity) {
    return false;
  }

  const { score } = record.intensity;
  return score >= 0.4; // MEDIUM threshold
}

/**
 * Utility: Get intensity description.
 *
 * Returns a verb phrase describing the intensity level.
 * Useful for UI labels like "Strongly Recommended" or "Gently Suggested".
 *
 * @param {string} level - Intensity level (from INTENSITY_LEVELS)
 * @returns {string} Human-readable description
 */
export function getIntensityDescription(level) {
  const descriptions = {
    very_low: 'Briefly noted',
    low: 'Gently suggested',
    medium: 'Recommended',
    high: 'Strongly recommended',
    very_high: 'Emphatically recommended'
  };

  return descriptions[level] || 'Suggested';
}
