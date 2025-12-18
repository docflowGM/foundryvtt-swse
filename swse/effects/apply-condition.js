/**
 * Condition Application System
 * AUTO-GENERATED
 */

import { SWSEStatusIcons } from "./status-icons.js";

export class SWSECondition {
  static async apply(actor, condition, { changes = [], duration = null } = {}) {
    const existing = actor.effects.find(e => e.label === condition);
    if (existing) await existing.delete();
    const effect = {
      label: condition,
      icon: SWSEStatusIcons.get(condition),
      changes,
      flags: { swse: { condition } }
    };
    if (duration) {
      effect.duration = { rounds: duration };
    }
    return await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }

  static async remove(actor, condition) {
    const effects = actor.effects.filter(e => e.label === condition);
    if (!effects.length) return;
    return await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
  }

  static has(actor, condition) {
    return actor.effects.some(e => e.label === condition);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Condition = SWSECondition;

  game.swse = game.swse ?? {};
  game.swse.condition = SWSECondition;
});
