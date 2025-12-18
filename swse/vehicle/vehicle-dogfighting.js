/**
 * Dogfighting Engine (Tailing, Breaking Tail, Maneuvers)
 * AUTO-GENERATED
 */

import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEDogfighting {
  static getState(actor) {
    return actor.flags.swse?.dogfight ?? "none";
  }

  static async setState(actor, state, target = null) {
    await actor.setFlag("swse", "dogfight", state);
    await actor.setFlag("swse", "dogfightTarget", target?.id ?? null);
    return state;
  }

  static async attemptTail(attacker, target) {
    const atk = await SWSERoll.quick("1d20 + @piloting", attacker.getRollData());
    const def = await SWSERoll.quick("1d20 + @piloting", target.getRollData());

    const success = atk.total >= def.total;

    if (success) {
      await this.setState(attacker, "tailing", target);
      await this.setState(target, "tailed", attacker);
    }

    return { success, atk, def };
  }

  static async breakTail(actor, pursuer) {
    const atk = await SWSERoll.quick("1d20 + @piloting", actor.getRollData());
    const def = await SWSERoll.quick("1d20 + @piloting", pursuer.getRollData());

    const success = atk.total >= def.total;

    if (success) {
      await this.setState(actor, "none");
      await this.setState(pursuer, "none");
    }

    return { success, atk, def };
  }

  static async maintain(attacker, target) {
    const atk = await SWSERoll.quick("1d20 + @piloting", attacker.getRollData());
    const dc = target.system?.dodgeDC ?? 10;

    const success = atk.total >= dc;

    if (!success) {
      await this.setState(attacker, "none");
      await this.setState(target, "none");
    }

    return { success, atk, dc };
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Dogfighting = SWSEDogfighting;
});
