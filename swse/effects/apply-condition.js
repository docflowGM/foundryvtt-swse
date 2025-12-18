/**
 * Unified Condition Application API
 * AUTO-GENERATED
 */

import { SWSEStatusIcons } from "./status-icons.js";

export class SWSECondition {
  static apply(actor, condition, data = {}) {
    return actor.createEmbeddedDocuments("ActiveEffect", [{
      label: condition,
      icon: SWSEStatusIcons[condition] ?? "icons/svg/aura.svg",
      changes: data.changes ?? []
    }]);
  }

  static remove(actor, condition) {
    const effects = actor.effects.filter(e => e.label === condition);
    return actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
  }
}
