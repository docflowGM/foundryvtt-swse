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
   */
  listSecretsForActor(actor) {
    // Get currently owned medical secrets
    const ownedSecrets = actor.items
      .filter(item => item.system?.tags?.includes('medical-secret'))
      .map(item => item.name.toLowerCase());

    // Filter out already-owned secrets
    return this._secrets
      .filter(s => !ownedSecrets.includes(s.name.toLowerCase()))
      .map(s => ({
        name: s.name,
        id: s.id,
        isQualified: true,
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
