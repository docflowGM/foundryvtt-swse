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

    const normalizeClassKey = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const addClass = (raw, source = 'unknown') => {
      if (!raw) return;
      const classId = raw.classId || raw.id || raw.sourceId || raw.name || raw.class || raw.className;
      const key = normalizeClassKey(classId);
      if (!key) return;
      const level = Number(raw.level ?? raw.system?.level ?? raw.system?.levels ?? raw.system?.rank ?? 0) || 0;
      index.classes.set(key, {
        ...raw,
        classId: key,
        name: raw.name || raw.className || raw.class || raw.system?.className || raw.system?.name || classId,
        level: Math.max(0, level),
        source,
      });
    };

    // Extract classes from all canonical/current shapes. Level-up writes
    // system.progression.classLevels and class items; older code only read
    // system.classes, which left BAB readers blind after multiclassing.
    if (actor.system?.classes && Array.isArray(actor.system.classes)) {
      for (const cls of actor.system.classes) addClass(cls, 'system.classes');
    }

    if (actor.system?.progression?.classLevels && Array.isArray(actor.system.progression.classLevels)) {
      for (const cls of actor.system.progression.classLevels) addClass(cls, 'system.progression.classLevels');
    }

    if (actor.items) {
      for (const item of actor.items) {
        if (item.type !== 'class') continue;
        addClass({
          id: item.system?.classId || item.system?.sourceId || item.id || item.name,
          name: item.name,
          level: item.system?.level ?? item.system?.levels ?? item.system?.rank ?? 0,
        }, 'items');
      }
    }

    return index;
  }
}
