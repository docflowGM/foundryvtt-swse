/**
 * force-power-engine.js
 * Unified Force Power engine for SWSE progression.
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Responsibilities:
 * - Calculate force power grants from feats, class levels, templates (pure logic)
 * - Collect available powers from compendium (data layer)
 * - Apply selected powers to actor via ActorEngine (mutation)
 * - Return structured trigger results (no UI orchestration)
 *
 * Note: UI orchestration (opening pickers, user interaction) belongs in apps/ layer.
 * Apps should call detectForcePowerTriggers(), show UI with collectAvailablePowers(),
 * then call applySelected().
 *
 * COMPENDIUM MIGRATION NOTES:
 * To move force power grants from hardcoded data to compendiums:
 *
 * For Feats (foundryvtt-swse.feats):
 *   Add field: system.forcePowerGrants: number
 *   Example: "Force Training" should have system.forcePowerGrants: 1
 *
 * For Classes (foundryvtt-swse.classes):
 *   Add field to level_progression entries: force_power_grants: number
 *   Example: Jedi level 3 should have level_progression[2].force_power_grants: 1
 *
 * The engine will prefer compendium data but fallback to progression-data.js
 */

import { FORCE_POWER_DATA } from "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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
        if (!pack) {
          // Only warn once per session
          if (!ForcePowerEngine._featPackWarnShown) {
            swseLogger.warn('ForcePowerEngine: foundryvtt-swse.feats compendium not found. Feat-based force power grants may not work.');
            ForcePowerEngine._featPackWarnShown = true;
          }
        } else {
          if (!pack.indexed) {
            await pack.getIndex();
          }
          const index = pack.index.find(e => e.name === featName);
          if (index) {
            featDoc = await pack.getDocument(index._id);
          }
        }
      } catch (e) {
        swseLogger.warn(`ForcePowerEngine: Failed to load feat "${featName}" from compendium`, e);
      }
    }

    // Check for structured field in compendium
    if (featDoc?.system?.forcePowerGrants) {
      return featDoc.system.forcePowerGrants;
    }

    // Fallback to hardcoded data
    const f = FORCE_POWER_DATA.feats[featName];
    if (!f) {return 0;}

    // Handle ability modifier-based grants (Force Training)
    if (f.grants === 'ability_mod') {
      return this._countFromAbilityMod(actor);
    }

    return f.grants || 0;
  }

  /**
   * Calculate force powers from ability modifier
   * Uses WIS mod by default, or CHA mod if house rule is enabled
   * Minimum 1 power
   * @param {Actor} actor - The actor
   * @returns {number} Number of powers (minimum 1)
   */
  static _countFromAbilityMod(actor) {
    if (!actor?.system?.abilities) {
      return 1; // Default minimum if no ability data
    }

    // Check for house rule to use CHA instead of WIS
    const useCha = game.settings?.get('foundryvtt-swse', 'forceTrainingUseCha') ?? false;
    const abilityKey = useCha ? 'cha' : 'wis';
    const mod = actor.system.abilities[abilityKey]?.mod ?? 0;

    return Math.max(1, 1 + mod);
  }

  /**
 * Check class level for force power grants
 * Looks in compendium first, falls back to hardcoded data
 * @param {string} className - Name of the class
 * @param {number} level - Class level
 * @returns {Promise<number>} Number of powers granted
 */
static async _countFromClassLevel(className, level) {
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

  const c = FORCE_POWER_DATA.classes[className];
  if (!c) {return 0;}
  const L = String(level);
  return (c[L] && c[L].powers) ? c[L].powers : 0;
}

static _countFromTemplate(templateId) {
  const t = FORCE_POWER_DATA.templates[templateId];
  return t ? (t.powers || 0) : 0;
}

/**
 * Detect force power triggers and calculate count needed
 * Does not open UI - returns data for apps layer to use
 * @param {Actor} actor - The actor
 * @param {Object} updateSummary - Object describing what's been added
 * @returns {Promise<Object>} Trigger result with count and reason
 */
static async detectForcePowerTriggers(actor, updateSummary = {}) {
  let selectable = 0;
  const reasons = [];

  if (Array.isArray(updateSummary.featsAdded)) {
    for (const ft of updateSummary.featsAdded) {
      const count = await this._countFromFeat(ft, actor);
      if (count > 0) {
        selectable += count;
        reasons.push(`Feat: ${ft} (+${count})`);
      }
    }
  }

  if (Array.isArray(updateSummary.classLevelsAdded)) {
    for (const cl of updateSummary.classLevelsAdded) {
      const count = await this._countFromClassLevel(cl.class, cl.level);
      if (count > 0) {
        selectable += count;
        reasons.push(`Class: ${cl.class} level ${cl.level} (+${count})`);
      }
    }
  }

  if (typeof updateSummary.templateApplied === 'string') {
    const count = this._countFromTemplate(updateSummary.templateApplied);
    if (count > 0) {
      selectable += count;
      reasons.push(`Template: ${updateSummary.templateApplied} (+${count})`);
    }
  }

  return {
    triggersDetected: selectable > 0,
    selectable,
    reasons
  };
}

static async collectAvailablePowers(actor) {
  try {
    const pack = game.packs.get('foundryvtt-swse.forcepowers');

    if (!pack) {
      swseLogger.error('Force Power Engine: foundryvtt-swse.forcepowers compendium not found!');
      return [];
    }

    if (!pack.indexed) {
      await pack.getIndex();
    }

    const docs = pack.getDocuments
      ? await pack.getDocuments()
      : pack.index.map(e => e);

    return docs ?? [];
  } catch (e) {
    swseLogger.error('ForcePowerEngine: Failed to collect powers from compendium', e);
    return [];
  }
}

static async applySelected(actor, selectedItems = []) {
  const existing = new Set(
    actor.items
      .filter(i => i.type === 'power' || i.type === 'forcePower')
      .map(i => i.name.toLowerCase())
  );

  const filtered = selectedItems.filter(
    p => p?.name && !existing.has(p.name.toLowerCase())
  );

  try {
    const toCreate = [];

    for (const it of filtered) {
      if (typeof it.toObject === 'function') {
        toCreate.push(it.toObject());
      } else if (it.document) {
        toCreate.push(it.document.toObject());
      } else {
        toCreate.push({
          name: it.name || 'Force Power',
          type: 'forcePower',
          img: it.img || 'icons/svg/mystery-man.svg',
          system: it.system || {}
        });
      }
    }

    if (toCreate.length) {
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
      return { success: true, applied: toCreate.length };
    }
    return { success: true, applied: 0 };
  } catch (e) {
    swseLogger.error('ForcePowerEngine.applySelected error', e);
    return { success: false, error: e.message };
  }
}
}
