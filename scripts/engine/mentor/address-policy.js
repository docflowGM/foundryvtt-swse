/**
 * ADDRESS POLICY - Mentor Address Invocation Logic
 *
 * Determines when and where to invoke mentor addresses:
 * - Mandatory cases (first class level, level up, talk-to-mentor)
 * - Weighted probabilistic cases (advisory type + severity)
 * - Position rules (start vs end of dialogue)
 *
 * Returns a policy decision: should invoke? force literal? where?
 */

export class AddressPolicy {
  /**
   * Evaluate whether to invoke address for this interaction
   *
   * @param {Object} options
   * @param {string} options.advisoryType - Type of advisory (conflict, drift, etc.)
   * @param {string} options.tier - Severity tier (very_low, low, medium, high, very_high)
   * @param {boolean} [options.isLevelUp=false] - Is this a level-up moment
   * @param {boolean} [options.isFirstLevelInClass=false] - Is this first level in a class
   * @param {boolean} [options.isTalkInitiated=false] - Was this talk user-initiated
   *
   * @returns {Object} Policy decision
   *   {
   *     shouldInvoke: boolean,
   *     forceLiteral?: boolean (if shouldInvoke),
   *     position?: "start" | "end" (if shouldInvoke)
   *   }
   */
  static evaluate({
    advisoryType,
    tier,
    isLevelUp = false,
    isFirstLevelInClass = false,
    isTalkInitiated = false
  }) {
    // MANDATORY CASES: Always invoke (force literal in first class level)

    if (isFirstLevelInClass) {
      return {
        shouldInvoke: true,
        forceLiteral: true,
        position: "start"
      };
    }

    if (isLevelUp) {
      return {
        shouldInvoke: true,
        forceLiteral: false,
        position: "end"
      };
    }

    if (isTalkInitiated) {
      return {
        shouldInvoke: true,
        forceLiteral: false,
        position: "start"
      };
    }

    // WEIGHTED PROBABILISTIC CASES: Advisory type eligibility + severity weighting

    const eligible = [
      "conflict",
      "drift",
      "specialization_warning",
      "momentum",
      "long_term_trajectory"
    ];

    if (!eligible.includes(advisoryType)) {
      return { shouldInvoke: false };
    }

    let chance = 0.35;

    if (tier === "very_high") chance += 0.2;
    if (tier === "very_low") chance -= 0.1;

    if (Math.random() < chance) {
      const startTypes = ["conflict", "drift", "specialization_warning"];
      const position = startTypes.includes(advisoryType) ? "start" : "end";

      return {
        shouldInvoke: true,
        forceLiteral: false,
        position
      };
    }

    return { shouldInvoke: false };
  }
}
