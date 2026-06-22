/**
 * Block/Deflect Talent Combination System
 *
 * When the blockDeflectTalents house rule is set to "combined",
 * this system combines Block and Deflect into a single "Block & Deflect" talent
 * in the talent selector, but grants both talents when selected.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

// Talent IDs
const BLOCK_ID = '9379daa94a228c04';
const DEFLECT_ID = '72c644f7a09b1186';
const COMBINED_ID = 'block-deflect-combined';
const COMPONENT_NAMES = ['Block', 'Deflect'];

function normalizeTalentName(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function talentIdentityMatches(talent, id, name) {
  const ids = [talent?.id, talent?._id, talent?.system?.id, talent?.flags?.swse?.canonicalId]
    .map(value => String(value ?? '').trim())
    .filter(Boolean);
  if (ids.includes(id)) return true;
  return normalizeTalentName(talent?.name || talent?.label) === normalizeTalentName(name);
}

function cloneObject(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? {}));
}

export class HouseRuleTalentCombination {
  /**
   * Process talent list to combine Block and Deflect if house rule enabled
   * @param {Array} talents - Array of talent documents
   * @returns {Array} Modified talent array
   */
  static processBlockDeflectCombination(talents) {
    try {
      var blockDeflectMode = HouseRuleService.getString('blockDeflectTalents', 'separate');
    } catch (err) {
      // Setting not yet registered, use default
      blockDeflectMode = 'separate';
    }

    if (blockDeflectMode !== 'combined') {
      return talents;
    }

    const list = Array.isArray(talents) ? talents : [];
    const blockTalent = list.find(t => talentIdentityMatches(t, BLOCK_ID, 'Block'));
    const deflectTalent = list.find(t => talentIdentityMatches(t, DEFLECT_ID, 'Deflect'));

    if (!blockTalent || !deflectTalent) {
      SWSELogger.warn(
        'Block/Deflect combination enabled but talents not found'
      );
      return talents;
    }

    // Create combined talent
    const combinedTalent = this._createCombinedTalent(blockTalent, deflectTalent);

    // Filter out Block and Deflect, add combined. Keep every other talent stable.
    const processed = list.filter(t =>
      !talentIdentityMatches(t, BLOCK_ID, 'Block') &&
      !talentIdentityMatches(t, DEFLECT_ID, 'Deflect')
    );

    processed.push(combinedTalent);

    SWSELogger.info(
      'Block/Deflect combination applied - talents combined in selector'
    );

    return processed;
  }

  /**
   * Create a combined Block & Deflect talent from both component talents.
   * The selector entry is synthetic, but it carries enough metadata for
   * prerequisite checks and finalization to treat it as both real talents.
   * @private
   */
  static _createCombinedTalent(blockTalent, deflectTalent) {
    // Use Block's data as base but modify name/description
    const combinedData = cloneObject(blockTalent.toObject?.() || blockTalent);

    combinedData._id = COMBINED_ID;
    combinedData.id = COMBINED_ID;
    combinedData.name = 'Block & Deflect';
    combinedData.type = combinedData.type || 'talent';

    combinedData.system = combinedData.system || {};
    const blockBenefit = blockTalent.system?.benefit || blockTalent.system?.description || 'Deflect melee attacks.';
    const deflectBenefit = deflectTalent.system?.benefit || deflectTalent.system?.description || 'Deflect ranged attacks.';

    combinedData.system.benefit =
      `Combined talent that grants both Block and Deflect abilities.\n\n` +
      `<strong>Block:</strong> ${blockBenefit}\n\n` +
      `<strong>Deflect:</strong> ${deflectBenefit}`;
    combinedData.system.description = combinedData.system.description || combinedData.system.benefit;

    // Mark as combined so every downstream path can expand/satisfy it.
    combinedData.system.flags = {
      ...(combinedData.system.flags || {}),
      isBlockDeflectCombined: true,
    };
    combinedData.system.isBlockDeflectCombined = true;
    combinedData.system.actualTalentsToGrant = [...COMPONENT_NAMES];
    combinedData.system.grantsTalents = [...COMPONENT_NAMES];
    combinedData.system.equivalentTalents = [...COMPONENT_NAMES];
    combinedData._data = {
      ...(combinedData._data || {}),
      isBlockDeflectCombined: true,
      actualTalentsToGrant: [...COMPONENT_NAMES],
      grants: [...COMPONENT_NAMES],
    };
    combinedData.flags = foundry.utils.mergeObject(combinedData.flags || {}, {
      swse: {
        isBlockDeflectCombined: true,
        actualTalentsToGrant: [...COMPONENT_NAMES],
        grantsTalents: [...COMPONENT_NAMES],
        componentTalentIds: [BLOCK_ID, DEFLECT_ID],
      }
    }, { inplace: false, recursive: true });

    return combinedData;
  }

  /**
   * Handle talent confirmation - if Block & Deflect combined, grant both
   * @param {string|Object} talent - The confirmed talent name or selection object
   * @returns {Array} Array of talent names to actually grant (may include multiple)
   */
  static getActualTalentsToGrant(talent) {
    let blockDeflectMode = 'separate';
    try {
      blockDeflectMode = HouseRuleService.getString('blockDeflectTalents', 'separate');
    } catch (_err) {
      blockDeflectMode = 'separate';
    }

    if (blockDeflectMode === 'combined' && this.isBlockDeflectCombined(talent)) {
      return [...COMPONENT_NAMES];
    }

    const name = typeof talent === 'string' ? talent : (talent?.name || talent?.label || talent?.id || '');
    return [name].filter(Boolean);
  }

  /**
   * Check if a talent is the combined Block & Deflect
   * @param {string|Object} talent - Talent name or object
   * @returns {boolean}
   */
  static isBlockDeflectCombined(talent) {
    const name = typeof talent === 'string' ? talent : talent?.name || talent?.label;
    const grants = [
      ...(Array.isArray(talent?._data?.actualTalentsToGrant) ? talent._data.actualTalentsToGrant : []),
      ...(Array.isArray(talent?.system?.actualTalentsToGrant) ? talent.system.actualTalentsToGrant : []),
      ...(Array.isArray(talent?.system?.grantsTalents) ? talent.system.grantsTalents : []),
      ...(Array.isArray(talent?.system?.equivalentTalents) ? talent.system.equivalentTalents : []),
      ...(Array.isArray(talent?.flags?.swse?.actualTalentsToGrant) ? talent.flags.swse.actualTalentsToGrant : []),
      ...(Array.isArray(talent?.flags?.swse?.grantsTalents) ? talent.flags.swse.grantsTalents : []),
    ].map(normalizeTalentName);
    return normalizeTalentName(name) === 'block and deflect'
      || talent?.system?.isBlockDeflectCombined === true
      || talent?.system?.flags?.isBlockDeflectCombined === true
      || talent?._data?.isBlockDeflectCombined === true
      || talent?.flags?.swse?.isBlockDeflectCombined === true
      || (grants.includes('block') && grants.includes('deflect'));
  }
}
