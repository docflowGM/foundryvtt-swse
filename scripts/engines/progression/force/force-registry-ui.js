/**
 * Force Registry - UI Helper Layer
 * Provides UI-friendly views of force items with legality filtering
 *
 * Does NOT load from compendiums (that's core ForceRegistry job).
 * Instead, wraps core registry with legality checks and document fetching.
 */

import { SWSELogger } from '../../../utils/logger.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';
import { ForceRegistry as CoreForceRegistry } from '../../../engine/registries/force-registry.js';

export const ForceRegistry = {
  /**
   * Get Force powers available for an actor (with legality filtering)
   */
  async listPowersForActor(actor) {
    const powers = CoreForceRegistry.getByType('power');
    const result = [];

    for (const entry of powers) {
      let qualified = true;
      try {
        const assessment = AbilityEngine.evaluateAcquisition(actor, entry, {});
        qualified = assessment.legal;
      } catch (err) {
        SWSELogger.warn(`Prerequisite check failed for ${entry.name}:`, err);
      }

      // Fetch full document for rendering (images, descriptions, etc.)
      const doc = await CoreForceRegistry._getDocument(entry.id);

      result.push({
        name: entry.name,
        id: entry.id,
        isQualified: qualified,
        data: doc || entry
      });
    }

    return result;
  },

  /**
   * Get Force secrets available for an actor
   */
  async listSecretsForActor(actor) {
    const secrets = CoreForceRegistry.getByType('secret');
    const result = [];

    for (const entry of secrets) {
      // Fetch full document for rendering
      const doc = await CoreForceRegistry._getDocument(entry.id);

      result.push({
        name: entry.name,
        id: entry.id,
        isQualified: true,
        data: doc || entry
      });
    }

    return result;
  },

  /**
   * Get Force techniques available for an actor
   */
  async listTechniquesForActor(actor) {
    const techniques = CoreForceRegistry.getByType('technique');
    const result = [];

    for (const entry of techniques) {
      // Fetch full document for rendering
      const doc = await CoreForceRegistry._getDocument(entry.id);

      result.push({
        name: entry.name,
        id: entry.id,
        isQualified: true,
        data: doc || entry
      });
    }

    return result;
  },

  /**
   * Get a specific power by name
   */
  getByName(name, type = 'power') {
    return CoreForceRegistry.search(entry =>
      entry.type === type && entry.name.toLowerCase() === name.toLowerCase()
    ).shift() || null;
  },

  /**
   * Get all powers
   */
  getByType(type) {
    return CoreForceRegistry.getByType(type);
  }
};

SWSELogger.log('ForceRegistry (UI) module loaded');
