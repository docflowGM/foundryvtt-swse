/**
 * ADDRESS ENGINE - Mentor Address Resolution
 *
 * Resolves which form of address (nickname or literal name) to use
 * based on mentor profile, severity tier, and policy flags.
 *
 * Rules:
 * - Returns { text: "...", type: "nickname" | "literal" }
 * - Respects mentor allowNicknameInSevere flag
 * - Falls back to {actor_name} resolution when appropriate
 * - Pure stateless logic (no persistence)
 */

import { ADDRESS_PROFILES } from "/systems/foundryvtt-swse/scripts/engine/mentor/address-profiles.js";

export class AddressEngine {
  /**
   * Resolve mentor address to use for this interaction
   *
   * @param {Object} options
   * @param {string} options.mentorId - Mentor key (e.g., "miraj", "lead")
   * @param {string} options.actorName - Actor display name fallback
   * @param {string} options.tier - Severity tier (very_low, low, medium, high, very_high)
   * @param {boolean} [options.forceLiteral=false] - Force literal name only
   *
   * @returns {Object} Address resolution
   *   {
   *     text: "Young one" | "My friend" | actor.name,
   *     type: "nickname" | "literal"
   *   }
   */
  static resolve({ mentorId, actorName, tier, forceLiteral = false }) {
    const profile = ADDRESS_PROFILES[mentorId];

    // Unknown mentor → literal name
    if (!profile) {
      return { text: actorName, type: "literal" };
    }

    // Forced literal (first class level, etc.)
    if (forceLiteral) {
      return { text: actorName, type: "literal" };
    }

    // Severe context where mentor forbids nicknames → literal
    if (tier === "very_high" && !profile.allowNicknameInSevere) {
      return { text: actorName, type: "literal" };
    }

    // Select random from pool
    const pool = profile.pool;
    const selection = pool[Math.floor(Math.random() * pool.length)];

    // If pool item is {actor_name} placeholder → resolve to literal
    if (selection === "{actor_name}") {
      return { text: actorName, type: "literal" };
    }

    // Return selected nickname
    return { text: selection, type: "nickname" };
  }
}
