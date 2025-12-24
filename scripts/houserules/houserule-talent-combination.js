/**
 * Block/Deflect Talent Combination System
 *
 * When the blockDeflectTalents house rule is set to "combined",
 * this system combines Block and Deflect into a single "Block & Deflect" talent
 * in the talent selector, but grants both talents when selected.
 */
import { SWSELogger } from "../utils/logger.js";

// Talent IDs
const BLOCK_ID = "9379daa94a228c04";
const DEFLECT_ID = "72c644f7a09b1186";
const COMBINED_ID = "block-deflect-combined-" + Date.now();

export class HouseRuleTalentCombination {
  /**
   * Process talent list to combine Block and Deflect if house rule enabled
   * @param {Array} talents - Array of talent documents
   * @returns {Array} Modified talent array
   */
  static processBlockDeflectCombination(talents) {
    const blockDeflectMode = game.settings.get(
      "foundryvtt-swse",
      "blockDeflectTalents"
    );

    if (blockDeflectMode !== "combined") {
      return talents;
    }

    // Find Block and Deflect talents
    const blockTalent = talents.find(
      (t) =>
        t._id === BLOCK_ID ||
        t.name.toLowerCase() === "block"
    );
    const deflectTalent = talents.find(
      (t) =>
        t._id === DEFLECT_ID ||
        t.name.toLowerCase() === "deflect"
    );

    if (!blockTalent || !deflectTalent) {
      SWSELogger.warn(
        "Block/Deflect combination enabled but talents not found"
      );
      return talents;
    }

    // Create combined talent
    const combinedTalent = this._createCombinedTalent(blockTalent, deflectTalent);

    // Filter out Block and Deflect, add combined
    const processed = talents.filter(
      (t) =>
        t._id !== BLOCK_ID &&
        t._id !== DEFLECT_ID &&
        t.name.toLowerCase() !== "block" &&
        t.name.toLowerCase() !== "deflect"
    );

    processed.push(combinedTalent);

    SWSELogger.info(
      "Block/Deflect combination applied - talents combined in selector"
    );

    return processed;
  }

  /**
   * Create a combined Block & Deflect talent from both component talents
   * @private
   */
  static _createCombinedTalent(blockTalent, deflectTalent) {
    // Use Block's data as base but modify name/description
    const combinedData = foundry.utils.deepClone(blockTalent.toObject?.() || blockTalent);

    combinedData._id = COMBINED_ID;
    combinedData.name = "Block & Deflect";

    const blockBenefit = blockTalent.system?.benefit || "Deflect melee attacks.";
    const deflectBenefit = deflectTalent.system?.benefit || "Deflect ranged attacks.";

    combinedData.system.benefit =
      `Combined talent that grants both Block and Deflect abilities.\n\n` +
      `<strong>Block:</strong> ${blockBenefit}\n\n` +
      `<strong>Deflect:</strong> ${deflectBenefit}`;

    // Mark as combined so we know to grant both
    if (!combinedData.system.flags) {
      combinedData.system.flags = {};
    }
    combinedData.system.flags.isBlockDeflectCombined = true;

    return combinedData;
  }

  /**
   * Handle talent confirmation - if Block & Deflect combined, grant both
   * @param {string} talentName - The confirmed talent name
   * @returns {Array} Array of talent names to actually grant (may include multiple)
   */
  static getActualTalentsToGrant(talentName) {
    const blockDeflectMode = game.settings.get(
      "foundryvtt-swse",
      "blockDeflectTalents"
    );

    if (
      blockDeflectMode === "combined" &&
      talentName.toLowerCase() === "block & deflect"
    ) {
      return ["Block", "Deflect"];
    }

    return [talentName];
  }

  /**
   * Check if a talent is the combined Block & Deflect
   * @param {string|Object} talent - Talent name or object
   * @returns {boolean}
   */
  static isBlockDeflectCombined(talent) {
    const name = typeof talent === "string" ? talent : talent?.name;
    return (
      name &&
      name.toLowerCase() === "block & deflect"
    );
  }
}
