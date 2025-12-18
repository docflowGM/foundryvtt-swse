/**
 * Modular Grapple Action Engine
 * AUTO-GENERATED
 */

import { SWSECondition } from "../effects/apply-condition.js";
import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEGrapple {
  static async attemptGrab(attacker, target, opts = {}) {
    const result = await CONFIG.SWSE.Hit.resolve({
      attacker,
      target,
      attackBonus: opts.attackBonus ?? 0,
      defenseType: "reflex",
      context: { grapple: true }
    });

    if (!result.hit) return result;

    const newState = CONFIG.SWSE.GrappleFSM.next("none", "attemptGrab");
    await SWSECondition.apply(target, newState);

    return result;
  }

  static async opposedCheck(attacker, target, opts = {}) {
    const atkRoll = await SWSERoll.quick("1d20 + @strMod", attacker.getRollData());
    const defRoll = await SWSERoll.quick("1d20 + @strMod", target.getRollData());

    const attackerWins = atkRoll.total >= defRoll.total;
    const action = attackerWins ? "succeedOpposed" : "failOpposed";

    const oldState = this.getState(target);
    const newState = CONFIG.SWSE.GrappleFSM.next(oldState, action);

    await SWSECondition.apply(target, newState);

    return { attackerWins, atkRoll, defRoll, newState };
  }

  static async pin(attacker, target) {
    const oldState = this.getState(target);
    const newState = CONFIG.SWSE.GrappleFSM.next(oldState, "pin");

    await SWSECondition.apply(target, newState);
    return { oldState, newState };
  }

  static async escape(attacker, target) {
    const rollA = await SWSERoll.quick("1d20 + @strMod", attacker.getRollData());
    const rollT = await SWSERoll.quick("1d20 + @strMod", target.getRollData());

    const success = rollA.total >= rollT.total;
    const oldState = this.getState(target);
    const newState = success ? CONFIG.SWSE.GrappleFSM.next(oldState, "escape") : oldState;

    if (success) await SWSECondition.apply(target, newState);

    return { success, oldState, newState };
  }

  static async damage(attacker, target, formula = null) {
    const dmgRoll = await SWSERoll.quick(formula ?? attacker.system?.damageFormula ?? "1d6");
    return { dmgRoll };
  }

  static getState(actor) {
    return actor.effects.find(e => CONFIG.SWSE.GrappleStates[e.label])?.label ?? "none";
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Grapple = SWSEGrapple;
});
