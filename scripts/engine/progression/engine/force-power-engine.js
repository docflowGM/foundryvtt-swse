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
import { ForceSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-slot-validator.js";
import { ForceProvenanceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-provenance-engine.js";

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
   * Uses canonical forceTrainingAttribute setting (wisdom or charisma)
   * Minimum 1 power
   * @param {Actor} actor - The actor
   * @returns {number} Number of powers (minimum 1)
   */
  static _countFromAbilityMod(actor) {
    if (!actor?.system?.abilities) {
      return 1; // Default minimum if no ability data
    }

    // Use canonical setting to determine which ability modifier to apply
    const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
    const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
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
    const { getClassData } = await import("/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js");
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
  const powerIds = selectedItems
    .map(p => p.id || p._id)
    .filter(id => id);

  // NEW (Phase 3.3): Pre-mutation validation
  const validation = await ForceSlotValidator.validateBeforeApply(actor, powerIds);
  if (!validation.valid) {
    swseLogger.warn('[FORCE APPLY] Validation failed: ' + validation.error);
    return { success: false, error: validation.error };
  }

  const existing = new Set(
    actor.items
      .filter(i => i.type === 'power' || i.type === 'forcepower')
      .map(i => i.name.toLowerCase())
  );

  const filtered = selectedItems.filter(
    p => p?.name && !existing.has(p.name.toLowerCase())
  );

  try {
    const toCreate = [];

    // Determine provenance context for this application
    // Get all force grant sources on actor
    const feats = actor.items.filter(i => i.type === 'feat') || [];
    const hasForceSensitivity = feats.some(f => f.name?.toLowerCase().includes('force sensitivity'));
    const ftFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    // Count how many powers are already assigned to FS
    const fsOwnedPowers = actor.items.filter(i =>
      i.type === 'forcepower' && i.system?.provenance?.grantSourceId === 'fs-chargen'
    ).length;

    // If this is the first power and FS exists, mark it as FS. Otherwise, mark as FT.
    let powerIndexInThisApplication = 0;

    for (const it of filtered) {
      let itemData;
      if (typeof it.toObject === 'function') {
        itemData = it.toObject();
      } else if (it.document) {
        itemData = it.document.toObject();
      } else {
        itemData = {
          name: it.name || 'Force Power',
          type: 'forcepower',
          img: it.img || 'icons/svg/mystery-man.svg',
          system: it.system || {}
        };
      }

      // Add provenance metadata
      if (!itemData.system) {
        itemData.system = {};
      }

      // Determine provenance source
      let grantSourceType = 'force-training'; // Default
      let grantSourceId = 'ft-unknown';
      let grantSubtype = 'baseline';
      let isLocked = false;

      // If first power in this application and no FS powers exist yet, mark as FS
      if (powerIndexInThisApplication === 0 && hasForceSensitivity && fsOwnedPowers === 0) {
        grantSourceType = 'force-sensitivity';
        grantSourceId = 'fs-chargen';
        grantSubtype = 'baseline';
        isLocked = true;
      } else if (ftFeats.length > 0) {
        // Mark as Force Training
        grantSourceType = 'force-training';
        // Use existing grantSourceId if available, else generate one for this acquisition
        grantSourceId = ftFeats[0].system?.grantSourceId ||
          ForceProvenanceEngine.generateForceTairingGrantId(actor.system.level, Date.now().toString(16).slice(-8));
        // Determine subtype: first FT power is baseline, rest are modifier-extra
        grantSubtype = powerIndexInThisApplication === 0 ? 'baseline' : 'modifier-extra';
        isLocked = false;
      }

      itemData.system.provenance = ForceProvenanceEngine.createProvenanceMetadata(
        grantSourceType,
        grantSourceId,
        grantSubtype,
        isLocked
      );

      toCreate.push(itemData);
      powerIndexInThisApplication++;
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
