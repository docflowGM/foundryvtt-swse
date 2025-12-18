/**
 * Vehicle Hit Resolution (Shields, DR, Threshold)
 * AUTO-GENERATED
 */

import { SWSERoll } from "../rolls/swse-roll.js";
import { SWSEConditionTrack } from "./vehicle-ct.js";

export class SWSEVehicleHit {
  static async resolve({
    attacker,
    target,
    weapon,
    attackBonus = 0,
    roll = null,
    context = {}
  }) {
    if (!attacker || !target) return null;

    Hooks.callAll("swse.preVehicleHit", { attacker, target, weapon, context });

    if (!roll) {
      const r = new SWSERoll("1d20", { attacker, target, weapon });
      r.addModifier("Attack Bonus", attackBonus);
      roll = await r.evaluate();
    }

    const total = roll.total;
    const defense = target.system?.defenses?.reflex?.value ?? 10;

    const hit = total >= defense;
    const isThreat = roll.terms[0].results?.[0]?.result === 20;

    const result = {
      hit,
      margin: total - defense,
      total,
      defense,
      roll,
      isThreat,
      attacker,
      target,
      weapon,
      context
    };

    if (!hit) {
      Hooks.callAll("swse.postVehicleHit", result);
      return result;
    }

    const sr = target.system?.shields?.value ?? 0;
    if (sr > 0) {
      result.shieldAbsorbed = sr;
    }

    const dmgFormula = weapon?.system?.damage ?? "1d6";
    const dmgRoll = await SWSERoll.quick(dmgFormula);
    let dmg = dmgRoll.total;

    if (sr > 0) dmg = Math.max(0, dmg - sr);

    const dr = target.system?.dr ?? 0;
    if (dr > 0) dmg = Math.max(0, dmg - dr);

    result.damage = dmg;
    result.damageRoll = dmgRoll;

    const thresholdTriggered = await SWSEConditionTrack.checkDamageThreshold(target, dmg);
    result.threshold = thresholdTriggered;

    Hooks.callAll("swse.postVehicleHit", result);
    return result;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE.VehicleHit = SWSEVehicleHit;
});
