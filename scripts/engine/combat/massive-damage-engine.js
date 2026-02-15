/**
 * MassiveDamageEngine — Phase F
 * Massive damage check, persistent condition, house rules
 */

export class MassiveDamageEngine {
  /**
   * Check if damage triggers massive damage (SWSE: >= HP/2)
   */
  static isMassiveDamage(damageDealt, actorMaxHP) {
    return damageDealt >= actorMaxHP / 2;
  }

  /**
   * Resolve massive damage check
   * DC = 15 + (damage - threshold)/10
   * Success: continue fighting
   * Failure: move CT forward 1, forced to rest
   */
  static async resolveMassiveDamageCheck(actor, damageDealt, dc = null) {
    const maxHP = actor.system.derived?.hp?.max || 1;
    if (!this.isMassiveDamage(damageDealt, maxHP)) {
      return { triggered: false };
    }

    // Calculate DC if not provided
    if (!dc) {
      dc = 15 + Math.floor((damageDealt - (actor.system.derived?.damageThreshold || 0)) / 10);
    }

    // Fort save (use Fort defense as base)
    const fort = actor.system.derived?.defenses?.fortitude?.total || 10;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + Math.floor((fort - 10) / 2);
    const success = total >= dc;

    const ct = actor.system.conditionTrack || {};
    if (!success) {
      // Move CT forward 1 (or apply house rule variant)
      const houseRulePersistent = actor.system.houserules?.massiveDamagePersistent;
      const moves = houseRulePersistent ? 2 : 1; // Double move if persistent rule

      const newCT = Math.min(5, (ct.current || 0) + moves);
      await actor.update({ 'system.conditionTrack.current': newCT });

      return {
        triggered: true,
        roll,
        total,
        dc,
        success: false,
        ctMoved: moves,
        newCT
      };
    }

    return { triggered: true, roll, total, dc, success: true };
  }

  /**
   * Massive damage penalty (stacks with condition penalty)
   */
  static getMassiveDamagePenalty(actor) {
    const ct = actor.system.conditionTrack || {};
    const step = ct.current || 0;
    // House rule: double CT penalty if in massive damage state
    const massiveDamageDouble = actor.system.houserules?.massiveDamageDouble;
    if (massiveDamageDouble && step > 0) {
      return step * -2;
    }
    return 0;
  }

  /**
   * Check if actor forced to rest (failed massive damage)
   */
  static isForcedToRest(actor) {
    const md = actor.system.massiveDamageState || {};
    return md.forcedRest === true;
  }
}
