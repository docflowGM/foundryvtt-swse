/**
 * Medical Registry - UI version
 * Loads and indexes Medical Secrets
 */

import { SWSELogger } from "../../utils/logger.js";

export const MedicalRegistry = {
  _secrets: [],

  /**
   * Build the registry from compendiums
   */
  async build() {
    try {
      const secretPack = game.packs.get("foundryvtt-swse.medicalsecrets");

      this._secrets = secretPack ? await secretPack.getDocuments() : [];

      SWSELogger.log(
        `MedicalRegistry built: ${this._secrets.length} secrets`
      );
    } catch (err) {
      SWSELogger.error("Failed to build MedicalRegistry:", err);
      this._secrets = [];
    }
  },

  /**
   * Get Medical secrets available for an actor
   * Filters out secrets the actor already has to prevent duplicates
   * @param {Actor} actor - The actor
   * @param {Object} options - Filter options
   * @param {boolean} options.showHomebrew - Whether to include homebrew secrets (default: false)
   */
  listSecretsForActor(actor, options = {}) {
    const { showHomebrew = false } = options;

    // Get currently owned medical secrets
    const ownedSecrets = actor.items
      .filter(item => item.system?.tags?.includes('medical-secret'))
      .map(item => item.name.toLowerCase());

    // Filter out already-owned secrets and filter by homebrew setting
    return this._secrets
      .filter(s => {
        // Skip if already owned
        if (ownedSecrets.includes(s.name.toLowerCase())) return false;

        // If homebrew is disabled, only show non-homebrew secrets
        if (!showHomebrew && s.system?.homebrew) return false;

        return true;
      })
      .map(s => ({
        name: s.name,
        id: s.id,
        isQualified: true,
        isHomebrew: s.system?.homebrew || false,
        data: s
      }));
  },

  /**
   * Get a specific secret by name
   */
  getSecret(name) {
    const lower = name.toLowerCase();
    return this._secrets.find(s => s.name.toLowerCase() === lower);
  },

  /**
   * Get all secrets (for debugging/admin)
   */
  getAllSecrets() {
    return this._secrets;
  }
};
