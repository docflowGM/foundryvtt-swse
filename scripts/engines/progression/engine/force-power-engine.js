/**
 * force-power-engine.js
 * Unified Force Power engine for SWSE progression.
 * - Detects triggers (feats, class levels, templates) and opens the picker.
 * - Applies selected powers to the actor as Item documents.
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

import { FORCE_POWER_DATA } from '../data/progression-data.js';
import { ForcePowerPicker } from '../../apps/progression/force-power-picker.js';
import { swseLogger } from '../../../utils/logger.js';
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';

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
 * updateSummary is a lightweight object describing what's been added
 */
static async handleForcePowerTriggers(actor, updateSummary = {}) {
  let selectable = 0;

  if (Array.isArray(updateSummary.featsAdded)) {
    for (const ft of updateSummary.featsAdded) {
      selectable += await this._countFromFeat(ft, actor);
    }
  }

  if (Array.isArray(updateSummary.classLevelsAdded)) {
    for (const cl of updateSummary.classLevelsAdded) {
      selectable += await this._countFromClassLevel(cl.class, cl.level);
    }
  }

  if (typeof updateSummary.templateApplied === 'string') {
    selectable += this._countFromTemplate(updateSummary.templateApplied);
  }

  if (selectable > 0) {
    await this.openPicker(actor, selectable);
  }
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

static async openPicker(actor, count) {
  const available = await this.collectAvailablePowers(actor);
  const selected = await ForcePowerPicker.select(available, count);

  if (selected && selected.length) {
    await this.applySelected(actor, selected);
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
      // PHASE 3: Route through ActorEngine
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
    }
  } catch (e) {
    swseLogger.error('ForcePowerEngine.applySelected error', e);
  }
}
}
