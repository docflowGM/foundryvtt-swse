/**
 * Block/Deflect Talent Combination System
 *
 * When the blockDeflectTalents house rule is set to "combined", this system
 * combines Block and Deflect into a single "Block/Deflect" selector entry and
 * marks that virtual entry so finalization expands it into both real talents.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

const BLOCK_ID = '9379daa94a228c04';
const DEFLECT_ID = '72c644f7a09b1186';
const COMBINED_ID = 'block-deflect-combined';
const COMBINED_NAME = 'Block/Deflect';

export class HouseRuleTalentCombination {
  static _blockDeflectMode() {
    try {
      return HouseRuleService.getString('blockDeflectTalents', 'separate');
    } catch (_err) {
      return 'separate';
    }
  }

  static _nameKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  static processBlockDeflectCombination(talents) {
    if (this._blockDeflectMode() !== 'combined') return talents;
    const sourceTalents = Array.isArray(talents) ? talents : [];

    const blockTalent = sourceTalents.find((t) => t?._id === BLOCK_ID || this._nameKey(t?.name) === 'block');
    const deflectTalent = sourceTalents.find((t) => t?._id === DEFLECT_ID || this._nameKey(t?.name) === 'deflect');

    if (!blockTalent || !deflectTalent) {
      SWSELogger.warn('Block/Deflect combination enabled but talents not found');
      return talents;
    }

    const combinedTalent = this._createCombinedTalent(blockTalent, deflectTalent);
    const processed = sourceTalents.filter((t) => {
      const key = this._nameKey(t?.name);
      return t?._id !== BLOCK_ID && t?._id !== DEFLECT_ID && key !== 'block' && key !== 'deflect';
    });

    processed.push(combinedTalent);
    SWSELogger.info('Block/Deflect combination applied - talents combined in selector');
    return processed;
  }

  static _createCombinedTalent(blockTalent, deflectTalent) {
    const combinedData = foundry?.utils?.deepClone
      ? foundry.utils.deepClone(blockTalent.toObject?.() || blockTalent)
      : JSON.parse(JSON.stringify(blockTalent.toObject?.() || blockTalent));

    combinedData._id = COMBINED_ID;
    combinedData.id = COMBINED_ID;
    combinedData.name = COMBINED_NAME;
    combinedData.system = combinedData.system || {};

    const blockBenefit = blockTalent.system?.benefit || blockTalent.system?.description || 'Negate melee attacks with Use the Force.';
    const deflectBenefit = deflectTalent.system?.benefit || deflectTalent.system?.description || 'Negate ranged attacks with Use the Force.';

    combinedData.system.benefit = [
      'Combined house-rule talent that grants both Block and Deflect.',
      '',
      `<strong>Block:</strong> ${blockBenefit}`,
      '',
      `<strong>Deflect:</strong> ${deflectBenefit}`,
    ].join('\n');
    combinedData.system.description = combinedData.system.description || combinedData.system.benefit;
    combinedData.system.prerequisites = '';
    combinedData.system.prerequisite = '';
    combinedData.system.grantsTalents = ['Block', 'Deflect'];
    combinedData.system.sourceComponentTalentIds = [BLOCK_ID, DEFLECT_ID];
    combinedData.system.flags = {
      ...(combinedData.system.flags || {}),
      isBlockDeflectCombined: true,
    };

    return combinedData;
  }

  static getActualTalentsToGrant(talentName) {
    if (this._blockDeflectMode() === 'combined' && this.isBlockDeflectCombined(talentName)) {
      return ['Block', 'Deflect'];
    }
    return [talentName];
  }

  static isBlockDeflectCombined(talent) {
    const name = typeof talent === 'string' ? talent : talent?.name;
    const key = this._nameKey(name);
    return talent?.system?.flags?.isBlockDeflectCombined === true
      || talent?._id === COMBINED_ID
      || key === 'blockdeflect'
      || key === 'blockanddeflect';
  }
}
