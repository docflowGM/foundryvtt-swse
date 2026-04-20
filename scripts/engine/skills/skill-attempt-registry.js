/**
 * Skill Attempt Registry
 *
 * Tracks skill attempts for retry enforcement.
 * SEPARATE concern from SkillEnforcementEngine.
 *
 * SkillEnforcementEngine reads from this (pure from its perspective).
 * RollEngine writes to this AFTER roll resolves.
 *
 * State:
 * - In-memory Map: actorId → skillKey → { timestamps: [], contextHashes: [] }
 *
 * API:
 * - canRetry(actorId, skillKey, context) → boolean
 * - record(actorId, skillKey, contextHash) → void
 * - clear(actorId, skillKey) → void
 *
 * Future: Persist to actor.flags.swse.skillAttempts
 */

export class SkillAttemptRegistry {
  /**
   * In-memory storage: actorId → skillKey → [{ timestamp, contextHash }]
   *
   * @private
   * @type {Map<string, Map<string, Array>>}
   */
  static #attempts = new Map();

  /**
   * QUERY: Can this actor retry this skill?
   *
   * @param {string} actorId
   * @param {string} skillKey
   * @param {Object} context - Current context
   * @returns {boolean}
   */
  static canRetry(actorId, skillKey, context = {}) {
    const actorAttempts = this.#attempts.get(actorId);
    if (!actorAttempts) {
      return true; // No prior attempts recorded
    }

    const skillAttempts = actorAttempts.get(skillKey);
    if (!skillAttempts || skillAttempts.length === 0) {
      return true; // No attempts on this skill
    }

    // For now: simple check — if there's a recent attempt, no retry allowed for 6 seconds
    // (This can be customized per-skill once skill definitions include retry cooldowns)
    const now = Date.now();
    const recentAttempt = skillAttempts[skillAttempts.length - 1];
    const cooldownMs = 6000; // 6 seconds default

    return now - recentAttempt.timestamp > cooldownMs;
  }

  /**
   * RECORD: Actor made a skill attempt
   *
   * Called by RollEngine AFTER roll resolves.
   *
   * @param {string} actorId
   * @param {string} skillKey
   * @param {string} contextHash - Optional hash of context
   */
  static record(actorId, skillKey, contextHash = "") {
    if (!this.#attempts.has(actorId)) {
      this.#attempts.set(actorId, new Map());
    }

    const actorAttempts = this.#attempts.get(actorId);
    if (!actorAttempts.has(skillKey)) {
      actorAttempts.set(skillKey, []);
    }

    const skillAttempts = actorAttempts.get(skillKey);
    skillAttempts.push({
      timestamp: Date.now(),
      contextHash
    });

    // planned: Persist to actor.flags.swse.skillAttempts for session recovery
  }

  /**
   * CLEAR: Reset attempts for this actor/skill
   *
   * @param {string} actorId
   * @param {string} skillKey
   */
  static clear(actorId, skillKey) {
    const actorAttempts = this.#attempts.get(actorId);
    if (actorAttempts) {
      actorAttempts.delete(skillKey);
    }
  }

  /**
   * CLEAR ALL: Reset entire registry (mainly for testing)
   */
  static clearAll() {
    this.#attempts.clear();
  }
}
