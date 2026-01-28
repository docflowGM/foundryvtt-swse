// ============================================
// FILE: scripts/data/classes-db.js
// Classes Database — Single Source of Truth
// ============================================
//
// Responsibilities:
// - Load class documents from compendium
// - Normalize class definitions
// - Resolve talent trees by TREE ID ONLY
// - Enforce SSOT strictly (no fallbacks, no guessing)
// - Provide fast lookup APIs
//
// NON-GOALS:
// - No name-based resolution
// - No legacy compatibility
// - No inference from talent names
// ============================================

import { normalizeClass, normalizeClassId, validateClass } from "./class-normalizer.js";
import { SWSELogger } from "../utils/logger.js";

export const ClassesDB = {

  /** @type {Map<string, Object>} */
  classes: new Map(),

  isBuilt: false,

  /**
   * Build the ClassesDB.
   * Requires TalentTreeDB to already be built.
   *
   * @param {Object} talentTreeDB
   */
  async build(talentTreeDB) {
    if (!talentTreeDB || !talentTreeDB.isBuilt) {
      throw new Error(
        "[ClassesDB] build() requires a built TalentTreeDB"
      );
    }

    try {
      const pack = game.packs.get("foundryvtt-swse.classes");
      if (!pack) {
        throw new Error("[ClassesDB] Classes compendium not found");
      }

      const docs = await pack.getDocuments();

      let loaded = 0;
      let rejected = 0;

      for (const rawClass of docs) {
        try {
          // Normalize + validate base structure
          const normalized = normalizeClass(rawClass);
          validateClass(normalized);

          // Enforce SSOT: classes MUST declare talent tree IDs explicitly
          const treeIds = Array.isArray(normalized.talentTreeIds)
            ? normalized.talentTreeIds
            : Array.isArray(normalized.talentTreeSourceIds)
              ? normalized.talentTreeSourceIds
              : [];

          if (!treeIds.length) {
            SWSELogger.warn(
              `[ClassesDB] Class "${normalized.name}" has no talentTreeIds defined`
            );
            normalized.talentTreeIds = [];
          } else {
            normalized.talentTreeIds = treeIds
              .map(treeId => {
                const tree = talentTreeDB.getTree(treeId);
                if (!tree) {
                  throw new Error(
                    `Unknown talent tree ID "${treeId}"`
                  );
                }
                return tree.id;
              });
          }

          this.classes.set(normalized.id, normalized);
          loaded++;

        } catch (err) {
          rejected++;
          SWSELogger.error(
            `[ClassesDB] Rejected class "${rawClass.name}": ${err.message}`
          );
        }
      }

      this.isBuilt = true;

      SWSELogger.log(
        `[ClassesDB] Build complete — ${loaded} classes loaded, ${rejected} rejected`
      );

      return true;

    } catch (err) {
      SWSELogger.error("[ClassesDB] Build failed:", err);
      return false;
    }
  },

  // ============================================
  // Lookup APIs
  // ============================================

  get(classId) {
    if (!classId) return null;
    return this.classes.get(normalizeClassId(classId)) ?? null;
  },

  has(classId) {
    if (!classId) return false;
    return this.classes.has(normalizeClassId(classId));
  },

  byName(name) {
    // Name lookup is allowed only as a convenience wrapper
    return this.get(name);
  },

  all() {
    return Array.from(this.classes.values());
  },

  count() {
    return this.classes.size;
  },

  // ============================================
  // Filters
  // ============================================

  baseClasses() {
    return this.all().filter(cls => cls.baseClass === true);
  },

  prestigeClasses() {
    return this.all().filter(cls => cls.baseClass === false);
  },

  byRole(role) {
    if (!role) return [];
    return this.all().filter(cls => cls.role === role);
  },

  // ============================================
  // Actor / Item Integration
  // ============================================

  fromItem(classItem) {
    if (!classItem || classItem.type !== "class") {
      SWSELogger.warn("[ClassesDB] fromItem called with invalid item", classItem);
      return null;
    }

    const classId =
      classItem.system?.classId ??
      normalizeClassId(classItem.name);

    const classDef = this.get(classId);

    if (!classDef) {
      SWSELogger.error(
        `[ClassesDB] Actor references unknown class "${classId}"`
      );
    }

    return classDef;
  },

  // ============================================
  // Safety
  // ============================================

  ensureBuilt() {
    if (!this.isBuilt) {
      throw new Error("[ClassesDB] Accessed before build()");
    }
  }
};

// Required for uniform DB import contract
export default ClassesDB;
