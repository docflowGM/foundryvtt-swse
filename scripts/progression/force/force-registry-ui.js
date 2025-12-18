/**
 * Force Registry - UI version
 * Loads and indexes Force powers, techniques, and secrets
 */

import { SWSELogger } from "../../utils/logger.js";
import { PrerequisiteValidator } from "../validation/prerequisite-validator.js";

export const ForceRegistry = {
  _powers: [],
  _secrets: [],
  _techniques: [],

  /**
   * Build the registry from compendiums
   */
  async build() {
    try {
      const powerPack = game.packs.get("foundryvtt-swse.forcepowers");
      const secretPack = game.packs.get("foundryvtt-swse.forcesecrets");
      const techPack = game.packs.get("foundryvtt-swse.forcetechniques");

      this._powers = powerPack ? await powerPack.getDocuments() : [];
      this._secrets = secretPack ? await secretPack.getDocuments() : [];
      this._techniques = techPack ? await techPack.getDocuments() : [];

      SWSELogger.log(
        `ForceRegistry built: ${this._powers.length} powers, ` +
        `${this._secrets.length} secrets, ${this._techniques.length} techniques`
      );
    } catch (err) {
      SWSELogger.error("Failed to build ForceRegistry:", err);
      this._powers = [];
      this._secrets = [];
      this._techniques = [];
    }
  },

  /**
   * Get Force powers available for an actor
   */
  listPowersForActor(actor) {
    return this._powers.map(p => {
      let qualified = true;
      try {
        const result = PrerequisiteValidator.checkFeatPrerequisites(p, actor, {});
        qualified = result.valid;
      } catch (err) {
        SWSELogger.warn(`Prerequisite check failed for ${p.name}:`, err);
      }

      return {
        name: p.name,
        id: p.id,
        isQualified: qualified,
        data: p
      };
    });
  },

  /**
   * Get Force secrets available for an actor
   */
  listSecretsForActor(actor) {
    return this._secrets.map(s => ({
      name: s.name,
      id: s.id,
      isQualified: true,
      data: s
    }));
  },

  /**
   * Get Force techniques available for an actor
   */
  listTechniquesForActor(actor) {
    return this._techniques.map(t => ({
      name: t.name,
      id: t.id,
      isQualified: true,
      data: t
    }));
  },

  /**
   * Get a specific power by name
   */
  getPower(name) {
    const lower = name.toLowerCase();
    return this._powers.find(p => p.name.toLowerCase() === lower);
  },

  /**
   * Get a specific secret by name
   */
  getSecret(name) {
    const lower = name.toLowerCase();
    return this._secrets.find(s => s.name.toLowerCase() === lower);
  },

  /**
   * Get a specific technique by name
   */
  getTechnique(name) {
    const lower = name.toLowerCase();
    return this._techniques.find(t => t.name.toLowerCase() === lower);
  },

  /**
   * Get all powers
   */
  getPowers() {
    return this._powers;
  },

  /**
   * Get all secrets
   */
  getSecrets() {
    return this._secrets;
  },

  /**
   * Get all techniques
   */
  getTechniques() {
    return this._techniques;
  },

  /**
   * Clear the registry
   */
  clear() {
    this._powers = [];
    this._secrets = [];
    this._techniques = [];
  }
};

SWSELogger.log("ForceRegistry (UI) module loaded");
