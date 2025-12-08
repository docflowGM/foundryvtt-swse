/**
 * force-power-engine.js
 * Unified Force Power engine for SWSE progression.
 * - Detects triggers (feats, class levels, templates) and opens the picker.
 * - Applies selected powers to the actor as Item documents.
 */

import { FORCE_POWER_DATA } from "../data/progression-data.js";
import { ForcePowerPicker } from "../ui/force-power-picker.js";

export class ForcePowerEngine {
  static _countFromFeat(featName) {
    const f = FORCE_POWER_DATA.feats[featName];
    return f ? (f.grants || 0) : 0;
  }

  static _countFromClassLevel(className, level) {
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
        selectable += this._countFromFeat(ft);
      }
    }

    if (updateSummary.classLevelsAdded && Array.isArray(updateSummary.classLevelsAdded)) {
      for (const cl of updateSummary.classLevelsAdded) {
        selectable += this._countFromClassLevel(cl.class, cl.level);
      }
    }

    if (updateSummary.templateApplied && typeof updateSummary.templateApplied === 'string') {
      selectable += this._countFromTemplate(updateSummary.templateApplied);
    }

    if (selectable > 0) {
      await this.openPicker(actor, selectable);
    }
  }

  static collectAvailablePowers(actor) {
    // Attempt to find a compendium called swse.forcepowers and return its content.
    try {
      const pack = game.packs.get("swse.forcepowers");
      if (!pack) return [];
      return pack.getDocuments ? pack.getDocuments() : pack.index.map(e => e);
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
