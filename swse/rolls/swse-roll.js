/**
 * Expanded SWSERoll System
 * AUTO-GENERATED
 */

export class SWSERoll {
  constructor(formula, data = {}, options = {}) {
    this.formula = formula;
    this.data = data;
    this.options = options;
  }

  async evaluate() {
    const roll = await new Roll(this.formula, this.data).evaluate();
    return roll;
  }
}

Hooks.on("swse.preReroll", (context) => {
  // middleware hook—user modules can modify context.roll
});
