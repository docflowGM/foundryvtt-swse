/**
 * SWSE Multi-Attack Engine (Modular)
 * AUTO-GENERATED
 */

export class SWSEMultiAttack {
  static build(attacker, weapon, { mode = "single", baseBonus = 0 } = {}) {
    let iterations = [];

    switch (mode) {
      case "single":
        iterations.push({ penalty: 0 });
        break;
      case "dual":
        iterations = [{ penalty: -5 }, { penalty: -10 }];
        break;
      case "double":
        iterations = [{ penalty: -5 }, { penalty: -5 }];
        break;
      case "triple":
        iterations = [{ penalty: -10 }, { penalty: -10 }, { penalty: -10 }];
        break;
      case "autofire":
        iterations.push({ penalty: -5, autofire: true });
        break;
      default:
        iterations.push({ penalty: 0 });
    }

    Hooks.callAll("swse.modifyMultiAttack", { attacker, weapon, iterations });

    return iterations.map(entry => ({
      ...entry,
      finalBonus: baseBonus + entry.penalty
    }));
  }

  static async execute(attacker, target, weapon, opts = {}) {
    const baseBonus = opts.baseBonus ?? 0;
    const mode = opts.mode ?? "single";

    const sequence = this.build(attacker, weapon, { mode, baseBonus });
    const results = [];

    for (const iter of sequence) {
      const result = await CONFIG.SWSE.Hit.resolve({
        attacker,
        target,
        attackBonus: iter.finalBonus,
        defenseType: weapon?.system?.defenseType ?? "reflex",
        context: { multi: true, ...opts }
      });

      results.push(result);
    }

    return results;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.MultiAttack = SWSEMultiAttack;
});
