/**
 * SWSE Modular Hit Resolution Engine
 * AUTO-GENERATED
 */

import { SWSENotify } from "../core/swse-notify.js";
import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEHit {
  static async resolve({
    attacker,
    target,
    attackBonus = 0,
    roll = null,
    defenseType = "reflex",
    context = {}
  }) {
    if (!attacker || !target) {
      SWSENotify.error("Hit resolution missing attacker or target.");
      return null;
    }

    Hooks.callAll("swse.preHitResolution", { attacker, target, context });

    if (!roll) {
      const r = new SWSERoll("1d20", { attacker, target, context });
      r.addModifier("Attack Bonus", attackBonus);
      roll = await r.evaluate();
    }

    const total = roll.total;
    const defense = this.resolveDefense(target, defenseType, context);
    const margin = total - defense;
    const hit = margin >= 0;
    const isThreat = roll.terms[0].results?.[0]?.result === 20;

    const result = {
      hit,
      margin,
      total,
      defense,
      isThreat,
      attacker,
      target,
      roll,
      context
    };

    Hooks.callAll("swse.postHitResolution", result);
    return result;
  }

  static resolveDefense(target, type, context = {}) {
    const base =
      target.system?.defenses?.[type]?.value ??
      target.system?.attributes?.[type] ??
      10;

    let defense = base;

    if (game.settings.get("swse", "vehicleCTUnified") && target.system?.conditionTrack) {
      const ctPenalty = target.system.conditionTrack.value ?? 0;
      defense -= ctPenalty;
    }

    if (context.cover) defense += context.cover;

    Hooks.callAll("swse.modifyDefense", { target, type, context, defenseRef: { value: defense } });

    return defense;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Hit = SWSEHit;
});
