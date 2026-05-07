/**
 * ActorItemIndex
 *
 * Fast, normalized lookup of actor-owned data.
 * Pure extraction layer - NO business logic, NO registry calls.
 *
 * Provides:
 * - feats: Set of feat IDs or names
 * - forcePowers: Set of force power IDs or names
 * - classes: Map of classId → class level data
 */

export class ActorItemIndex {
  /**
   * Build index from actor items
   * @param {Actor} actor - The actor to index
   * @returns {Object} {feats: Set, forcePowers: Set, classes: Map}
   */
  static build(actor) {
    const index = {
      feats: new Set(),
      forcePowers: new Set(),
      classes: new Map()
    };

    if (!actor) {
      return index;
    }

    // Extract feats
    if (actor.items) {
      for (const item of actor.items) {
        if (item.type === 'feat') {
          // Add both ID and name for flexible matching
          if (item.system?.id) {
            index.feats.add(item.system.id);
          }
          if (item.name) {
            index.feats.add(item.name.toLowerCase());
          }
        }

        if (item.type === 'force-power') {
          if (item.system?.id) {
            index.forcePowers.add(item.system.id);
          }
          if (item.name) {
            index.forcePowers.add(item.name.toLowerCase());
          }
        }
      }
    }

    // Extract classes from system.classes array
    if (actor.system?.classes && Array.isArray(actor.system.classes)) {
      for (const cls of actor.system.classes) {
        if (cls.classId) {
          index.classes.set(cls.classId, cls);
        }
      }
    }

    return index;
  }
}
