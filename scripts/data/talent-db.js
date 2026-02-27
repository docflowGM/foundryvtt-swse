// ============================================
// FILE: scripts/data/talent-db.js
// Talent Database - Hardened v2 Version
// ============================================

import {
  normalizeTalent,
  validateTalent,
  filterTalentsByRole
} from "/systems/foundryvtt-swse/scripts/data/talent-normalizer.js";

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";

export const TalentDB = {

  // Internal state
  talents: [],
  talentsByTree: new Map(),
  talentsByTreeKey: new Map(),
  talentsById: new Map(),
  _byKey: new Map(),
  isBuilt: false,

  // ------------------------------
  // BUILD
  // ------------------------------

  async build(talentTreeDB = null) {
    try {
      const pack = game?.packs?.get("foundryvtt-swse.talents");
      if (!pack) {
        SWSELogger.warn("[TalentDB] Talents compendium not found");
        return false;
      }

      // Reset state (idempotent build)
      this.talents = [];
      this.talentsByTree.clear();
      this.talentsByTreeKey.clear();
      this.talentsById.clear();
      this._byKey.clear();
      this.isBuilt = false;

      const index = await pack.getIndex({ fields: ["system", "name", "img"] });

      let count = 0;
      let orphaned = 0;
      let warnings = 0;

      for (const raw of index ?? []) {
        try {
          if (!raw?._id) {
            warnings++;
            continue;
          }

          const normalized = normalizeTalent(raw, talentTreeDB);

          if (!validateTalent(normalized)) {
            warnings++;
            continue;
          }

          this.talents.push(normalized);
          this.talentsById.set(normalized.id, normalized);

          // Stable key
          const key = raw.system?.key ?? toStableKey(raw.name);
          if (key) this._byKey.set(key, normalized);

          // Tree grouping
          if (normalized.treeId) {
            if (!this.talentsByTree.has(normalized.treeId)) {
              this.talentsByTree.set(normalized.treeId, []);
            }
            this.talentsByTree.get(normalized.treeId).push(normalized);
          } else {
            orphaned++;
          }

          const treeKey =
            raw.system?.treeKey ??
            (normalized.treeName ? toStableKey(normalized.treeName) : null);

          if (treeKey) {
            if (!this.talentsByTreeKey.has(treeKey)) {
              this.talentsByTreeKey.set(treeKey, []);
            }
            this.talentsByTreeKey.get(treeKey).push(normalized);
          }

          count++;

        } catch (err) {
          warnings++;
          SWSELogger.error(
            `[TalentDB] Failed to normalize talent "${raw?.name ?? "unknown"}"`,
            err
          );
        }
      }

      this.isBuilt = true;

      SWSELogger.log(
        `[TalentDB] Built: ${count} talents` +
        (orphaned ? ` (${orphaned} orphaned)` : "") +
        (warnings ? ` (${warnings} warnings)` : "")
      );

      return true;

    } catch (err) {
      SWSELogger.error("[TalentDB] Build failed", err);
      return false;
    }
  },

  // ------------------------------
  // SAFE ACCESS
  // ------------------------------

  ensureBuilt() {
    if (!this.isBuilt) {
      throw new Error("[TalentDB] Not built. Call TalentDB.build() first.");
    }
  },

  all() {
    this.ensureBuilt();
    return this.talents;
  },

  count() {
    return this.talents.length;
  },

  get(id) {
    return id ? this.talentsById.get(id) ?? null : null;
  },

  byKey(key) {
    return key ? this._byKey.get(key) ?? null : null;
  },

  byTree(treeId) {
    return treeId ? this.talentsByTree.get(treeId) ?? [] : [];
  },

  byTreeKey(treeKey) {
    return treeKey ? this.talentsByTreeKey.get(treeKey) ?? [] : [];
  },

  byTreeCompat(treeIdOrKey) {
    if (!treeIdOrKey) return [];
    return this.byTreeKey(treeIdOrKey).length
      ? this.byTreeKey(treeIdOrKey)
      : this.byTree(treeIdOrKey);
  },

  // ------------------------------
  // CLASS & ACTOR ACCESS
  // ------------------------------

  forClass(classId, classesDB) {
    if (!classId || !classesDB) return [];

    const classDef = classesDB.get(classId);
    if (!classDef?.talentTreeIds?.length) return [];

    const results = [];
    for (const treeId of classDef.talentTreeIds) {
      const talents = this.byTree(treeId);
      if (talents.length) results.push(...talents);
    }

    return results;
  },

  forActor(actor, classesDB) {
    if (!actor || !classesDB) return [];

    const classItems = actor.items?.filter(i => i.type === "class") ?? [];
    if (!classItems.length) return [];

    const uniqueIds = new Set();

    for (const classItem of classItems) {
      const classDef = classesDB.fromItem?.(classItem);
      if (!classDef?.id) continue;

      const talents = this.forClass(classDef.id, classesDB);
      for (const t of talents) {
        if (t?.id) uniqueIds.add(t.id);
      }
    }

    return Array.from(uniqueIds)
      .map(id => this.talentsById.get(id))
      .filter(Boolean);
  },

  selectedByActor(actor) {
    return actor?.items?.filter(i => i.type === "talent") ?? [];
  },

  unselectedForActor(actor, classesDB) {
    const available = this.forActor(actor, classesDB);
    const selectedIds = new Set(
      this.selectedByActor(actor).map(t => t.id ?? t._id)
    );

    return available.filter(t => !selectedIds.has(t.id));
  },

  // ------------------------------
  // ROLE FILTER
  // ------------------------------

  byRole(role, talentTreeDB) {
    if (!role || !talentTreeDB) return [];
    return filterTalentsByRole(this.talents, role, talentTreeDB.trees);
  }

};