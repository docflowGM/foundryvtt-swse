/**
 * force-power-engine.js
 * Unified Force Power engine for SWSE progression.
 * - Detects triggers (feats, class levels, templates) and opens the picker.
 * - Applies selected powers to the actor as Item documents.
 *
 * COMPENDIUM MIGRATION NOTES:
 * To move force power grants from hardcoded data to compendiums:
 *
 * For Feats (swse.feats):
 *   Add field: system.forcePowerGrants: number
 *   Example: "Force Training" should have system.forcePowerGrants: 1
 *
 * For Classes (swse.classes):
 *   Add field to level_progression entries: force_power_grants: number
 *   Example: Jedi level 3 should have level_progression[2].force_power_grants: 1
 *
 * The engine will prefer compendium data but fallback to progression-data.js
 */

import { FORCE_POWER_DATA } from "../data/progression-data.js";
import { ForcePowerPicker } from "../ui/force-power-picker.js";
import { swseLogger } from "../../utils/logger.js";

export class ForcePowerEngine {
  /**
   * Check feat for force power grants
   * Looks in compendium first, falls back to hardcoded data
   * @param {string} featName - Name of the feat
   * @param {Actor} actor - The actor (to find feat document)
   * @returns {Promise<number>} Number of powers granted
   */
  static async _countFromFeat(featName, actor) {
    // Try to find feat document on actor or in compendium
    let featDoc = actor?.items.find(i => i.type === 'feat' && i.name === featName);

    if (!featDoc) {
      try {
        const pack = game.packs.get('foundryvtt-swse.feats');
        if (pack) {
          if (!pack.indexed) {
            await pack.getIndex();
          }
          const index = pack.index.find(e => e.name === featName);
          if (index) {
            featDoc = await pack.getDocument(index._id);
          }
        }
      } catch (e) {
        console.warn(`ForcePowerEngine: Failed to load feat "${featName}" from compendium`, e);
      }
    }

    // Check for structured field in compendium
    if (featDoc?.system?.forcePowerGrants) {
      return featDoc.system.forcePowerGrants;
    }

    // Fallback to hardcoded data
    const f = FORCE_POWER_DATA.feats[featName];
    return f ? (f.grants || 0) : 0;
  }

  /**
   * Check class level for force power grants
   * Looks in compendium first, falls back to hardcoded data
   * @param {string} className - Name of the class
   * @param {number} level - Class level
   * @returns {Promise<number>} Number of powers granted
   */
  static async _countFromClassLevel(className, level) {
    // Try to load class from compendium
    try {
      const { getClassData } = await import('../utils/class-data-loader.js');
      const classData = await getClassData(className);

      if (classData?._raw?.level_progression) {
        const levelData = classData._raw.level_progression.find(lp => lp.level === level);
        if (levelData?.force_power_grants) {
          return levelData.force_power_grants;
        }
      }
    } catch (e) {
      console.warn(`ForcePowerEngine: Failed to load class "${className}" from compendium`, e);
    }

    // Fallback to hardcoded data
    const c = FORCE_POWER_DATA.classes[className];
    if (!c) return 0;
    const L = String(level);
    return (c[L] && c[L].powers) ? c[L].powers : 0;
  }

  static _countFromTemplate(templateId) {
    const t = FORCE_POWER_DATA.templates[templateId];
    return t ? (t.powers || 0) : 0;
  }

  /**
   * updateSummary is a lightweight object describing what's been added:
   * {
   *   featsAdded: ["Force Training"],
   *   classLevelsAdded: [ { class: "Jedi", level: 1 } ],
   *   templateApplied: "jedi_padawan"
   * }
   */
  static async handleForcePowerTriggers(actor, updateSummary = {}) {
    let selectable = 0;

    if (updateSummary.featsAdded && Array.isArray(updateSummary.featsAdded)) {
      for (const ft of updateSummary.featsAdded) {
        selectable += await this._countFromFeat(ft, actor);
      }
    }

    if (updateSummary.classLevelsAdded && Array.isArray(updateSummary.classLevelsAdded)) {
      for (const cl of updateSummary.classLevelsAdded) {
        selectable += await this._countFromClassLevel(cl.class, cl.level);
      }
    }

    if (updateSummary.templateApplied && typeof updateSummary.templateApplied === 'string') {
      selectable += this._countFromTemplate(updateSummary.templateApplied);
    }

    if (selectable > 0) {
      await this.openPicker(actor, selectable);
    }
  }

  static async collectAvailablePowers(actor) {
    // Attempt to find a compendium called foundryvtt-swse.forcepowers and return its content.
    try {
      const pack = game.packs.get('foundryvtt-swse.forcepowers');
      if (!pack) return [];
      if (!pack.indexed) {
        await pack.getIndex();
      }
      return pack.getDocuments ? await pack.getDocuments() : pack.index.map(e => e);
    } catch (e) {
      swseLogger.warn("ForcePowerEngine: failed to collect powers from compendium", e);
      return [];
    }
  }

  static async openPicker(actor, count) {
    // collect powers (documents or index entries)
    const available = await this.collectAvailablePowers(actor);
    // Filter heuristic: keep all for now (UI will show legality)
    const docs = available;
    const selected = await ForcePowerPicker.select(docs, count);
    if (selected && selected.length) {
      await this.applySelected(actor, selected);
    }
  }

  static async applySelected(actor, selectedItems) {
    // selectedItems are Document or index entries - create Item docs on actor
    try {
      const toCreate = [];
      for (const it of selectedItems) {
        // if it's a Document (has toObject), prefer that
        if (typeof it.toObject === 'function') {
          toCreate.push(it.toObject());
        } else if (it.document) {
          toCreate.push(it.document.toObject());
        } else {
          // fallback: create minimal Item data with name and img
          toCreate.push({ name: it.name || "Force Power", type: "force", img: it.img || "icons/svg/mystery-man.svg", system: it.system || {} });
        }
      }
      if (toCreate.length) {
        await actor.createEmbeddedDocuments("Item", toCreate);
      }
    } catch (e) {
      swseLogger.error("ForcePowerEngine.applySelected error", e);
    }
  }
}
