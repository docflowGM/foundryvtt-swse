/**
 * Modular Roll Engine with Middleware Pipeline
 * AUTO-GENERATED
 */

import { SWSENotify } from "../core/swse-notify.js";

export class SWSERoll {
  constructor(formula, context = {}) {
    this.formula = formula;
    this.context = context;
    this.modifiers = [];
  }

  addModifier(label, value) {
    this.modifiers.push({ label, value });
  }

  buildFormula() {
    const base = this.formula;
    const modSum = this.modifiers.reduce((t, m) => t + m.value, 0);
    if (modSum === 0) return base;
    return `(${base}) + ${modSum}`;
  }

  async evaluate() {
    Hooks.callAll("swse.preRoll", this);
    const rollFormula = this.buildFormula();
    const roll = await new Roll(rollFormula, this.context).evaluate();
    this.roll = roll;
    Hooks.callAll("swse.postRoll", this);
    return roll;
  }

  async reroll({ keepHigher = true } = {}) {
    Hooks.callAll("swse.preReroll", this);
    const newRoll = await new Roll(this.buildFormula(), this.context).evaluate();
    const final = keepHigher
      ? (newRoll.total >= this.roll.total ? newRoll : this.roll)
      : newRoll;
    this.roll = final;
    Hooks.callAll("swse.postReroll", this);
    return final;
  }

  static async quick(formula, context = {}) {
    const r = new SWSERoll(formula, context);
    return await r.evaluate();
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Roll = SWSERoll;
});
