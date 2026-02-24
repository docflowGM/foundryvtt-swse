// Roll Engine wrapper that delegates to global SWSE.RollEngine or RollManager
export class RollEngine {
  static async safeRoll(formula, data = {}, options = {}) {
    if (globalThis.SWSE?.RollEngine?.safeRoll) {
      const roll = globalThis.SWSE.RollEngine.safeRoll(formula, data);
      await roll.evaluate({ async: true });
      return roll;
    }
    throw new Error('RollEngine not available in SWSE namespace');
  }
}
