/**
 * Reason Factory
 *
 * Creates structured reason objects with consistent shape:
 * {
 *   domain: string,      // Reason category (e.g., "bab", "class", "attributes")
 *   code: string,        // Machine-readable identifier
 *   text: string,        // Human-readable explanation
 *   safe: boolean,       // Is this player-safe (no technical jargon)?
 *   strength: number,    // Confidence in this reason (0-1)
 *   atoms: string[]      // Optional: associated mentor reason atoms
 * }
 *
 * This factory ensures all reasons have the same structure for consistent
 * filtering, ranking, and display across the suggestion system.
 */

export class ReasonFactory {
  /**
   * Create a structured reason object
   * @param {Object} opts - Reason options
   * @param {string} opts.domain - Reason domain (required)
   * @param {string} opts.code - Machine-readable code (required)
   * @param {string} opts.text - Human-readable text (required)
   * @param {boolean} [opts.safe=true] - Is player-safe (default: true)
   * @param {number} [opts.strength=0.8] - Confidence (default: 0.8, range 0-1)
   * @param {string[]} [opts.atoms] - Mentor reason atoms (optional)
   * @returns {Object} Structured reason object
   */
  static create({
    domain,
    code,
    text,
    safe = true,
    strength = 0.8,
    atoms = []
  }) {
    if (!domain || !code || !text) {
      throw new Error('[ReasonFactory] domain, code, and text are required');
    }

    return {
      domain,
      code,
      text,
      safe: Boolean(safe),
      strength: Math.max(0, Math.min(1, strength)),
      atoms: Array.isArray(atoms) ? atoms : []
    };
  }

  /**
   * Create a high-confidence reason
   * @param {string} domain - Reason domain
   * @param {string} code - Machine-readable code
   * @param {string} text - Human-readable text
   * @param {boolean} [safe=true] - Is player-safe
   * @returns {Object} Reason with strength 0.9
   */
  static strong(domain, code, text, safe = true) {
    return this.create({ domain, code, text, safe, strength: 0.9 });
  }

  /**
   * Create a moderate-confidence reason
   * @param {string} domain - Reason domain
   * @param {string} code - Machine-readable code
   * @param {string} text - Human-readable text
   * @param {boolean} [safe=true] - Is player-safe
   * @returns {Object} Reason with strength 0.7
   */
  static moderate(domain, code, text, safe = true) {
    return this.create({ domain, code, text, safe, strength: 0.7 });
  }

  /**
   * Create a weak/secondary reason
   * @param {string} domain - Reason domain
   * @param {string} code - Machine-readable code
   * @param {string} text - Human-readable text
   * @param {boolean} [safe=true] - Is player-safe
   * @returns {Object} Reason with strength 0.5
   */
  static weak(domain, code, text, safe = true) {
    return this.create({ domain, code, text, safe, strength: 0.5 });
  }

  /**
   * Filter reasons by safe flag
   * @param {Array} reasons - Array of reason objects
   * @param {boolean} [onlySafe=true] - If true, return only safe reasons
   * @returns {Array} Filtered reasons
   */
  static filterBySafety(reasons, onlySafe = true) {
    if (!Array.isArray(reasons)) return [];
    if (!onlySafe) return reasons;
    return reasons.filter(r => r?.safe !== false);
  }

  /**
   * Sort reasons by strength (descending)
   * @param {Array} reasons - Array of reason objects
   * @returns {Array} Sorted reasons
   */
  static sortByStrength(reasons) {
    if (!Array.isArray(reasons)) return [];
    return [...reasons].sort((a, b) => (b?.strength ?? 0) - (a?.strength ?? 0));
  }

  /**
   * Limit reasons to top N by strength
   * @param {Array} reasons - Array of reason objects
   * @param {number} limit - Maximum number of reasons
   * @returns {Array} Limited reasons, sorted by strength
   */
  static limitByStrength(reasons, limit = 3) {
    if (!Array.isArray(reasons) || limit <= 0) return [];
    return this.sortByStrength(reasons).slice(0, Math.max(1, limit));
  }

  /**
   * Deduplicate reasons by code
   * Keeps first occurrence, higher strength wins
   * @param {Array} reasons - Array of reason objects
   * @returns {Array} Deduplicated reasons
   */
  static deduplicate(reasons) {
    if (!Array.isArray(reasons)) return [];

    const seen = new Map();
    for (const reason of reasons) {
      const code = reason?.code;
      if (!code) continue;

      const existing = seen.get(code);
      if (!existing || (reason?.strength ?? 0) > (existing?.strength ?? 0)) {
        seen.set(code, reason);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Detect conflicting reasons
   * Returns pairs of reasons that contradict each other
   * @param {Array} reasons - Array of reason objects
   * @returns {Array} Array of {code1, code2, reason1, reason2} conflicts
   */
  static detectConflicts(reasons) {
    if (!Array.isArray(reasons)) return [];

    const CONFLICT_PAIRS = [
      { a: 'RISK_INCREASED', b: 'RISK_MITIGATED' },
      { a: 'SYNERGY_PRESENT', b: 'SYNERGY_MISSING' },
      { a: 'PREREQ_MET', b: 'PREREQ_LACKING' },
      { a: 'PATTERN_MATCH', b: 'PATTERN_CONFLICT' }
    ];

    const conflicts = [];
    for (const { a, b } of CONFLICT_PAIRS) {
      const reasonA = reasons.find(r => r?.code === a);
      const reasonB = reasons.find(r => r?.code === b);
      if (reasonA && reasonB) {
        conflicts.push({ code1: a, code2: b, reason1: reasonA, reason2: reasonB });
      }
    }

    return conflicts;
  }

  /**
   * Merge duplicate domains into a single reason
   * Useful for consolidating "Uses trained skills" + "Requires high DEX" → single explanation
   * @param {Array} reasons - Array of reason objects
   * @param {string} domain - Domain to consolidate
   * @param {string} mergedCode - Code for merged reason
   * @param {string} mergedText - Text for merged reason
   * @returns {Array} Reasons with domain consolidated
   */
  static consolidateDomain(reasons, domain, mergedCode, mergedText) {
    if (!Array.isArray(reasons)) return [];

    const sameD = reasons.filter(r => r?.domain === domain);
    if (sameD.length <= 1) return reasons; // Nothing to consolidate

    // Average strength across all reasons in this domain
    const avgStrength = sameD.reduce((sum, r) => sum + (r?.strength ?? 0), 0) / sameD.length;
    const merged = {
      domain,
      code: mergedCode,
      text: mergedText,
      safe: sameD.every(r => r?.safe !== false),
      strength: avgStrength
    };

    // Keep non-matching reasons + merged reason
    const others = reasons.filter(r => r?.domain !== domain);
    return [...others, merged];
  }
}
