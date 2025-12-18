/**
 * Unified Condition Track Engine for Characters + Vehicles
 * AUTO-GENERATED
 */

export class SWSEConditionTrack {
  static getValue(actor) {
    return actor.system?.conditionTrack?.value ?? 0;
  }

  static async applyStep(actor, steps = 1) {
    const ct = actor.system?.conditionTrack;
    if (!ct) return null;

    const newValue = Math.clamped(ct.value + steps, 0, ct.max ?? 5);

    await actor.update({
      "system.conditionTrack.value": newValue
    });

    Hooks.callAll("swse.ctChanged", { actor, old: ct.value, new: newValue });

    return newValue;
  }

  static async checkDamageThreshold(actor, dmg) {
    const threshold = actor.system?.threshold;
    if (!threshold) return false;

    if (dmg >= threshold) {
      await this.applyStep(actor, 1);
      return true;
    }
    return false;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.ConditionTrack = SWSEConditionTrack;
});
