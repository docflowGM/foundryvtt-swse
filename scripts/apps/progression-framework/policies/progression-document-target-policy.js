/**
 * Progression Document Target Policy
 *
 * Canonical resolver for mapping progression subtype/profile to resulting actor document type.
 *
 * SINGLE AUTHORITY for document targeting:
 * - Progression subtype → Actor document type mapping
 * - Used at actor creation/finalization boundary
 * - Enforces correct document type from the start (not sheet hacks)
 *
 * Mapping:
 * - heroic actor → 'character' document/sheet
 * - droid → 'droid' document/sheet
 * - nonheroic → 'npc' document/sheet
 * - beast → 'npc' document/sheet
 * - follower → 'npc' document/sheet
 */

import { swseLogger } from '../../../utils/logger.js';

export class ProgressionDocumentTargetPolicy {
  /**
   * Canonical mapping of progression subtype to resulting actor document type.
   * @type {Object<string, string>}
   * @private
   */
  static #SUBTYPE_TO_DOCUMENT_TYPE = {
    'actor': 'character',       // Heroic actor progression
    'npc': 'npc',               // NPC progression (if applicable)
    'droid': 'droid',           // Droid progression
    'nonheroic': 'npc',         // Nonheroic → NPC sheet
    'beast': 'npc',             // Beast → NPC sheet
    'follower': 'npc',          // Follower → NPC sheet
  };

  /**
   * Resolve the target actor document type for a given progression subtype.
   *
   * @param {string} progressionSubtype - Progression subtype/profile
   *   ('actor', 'droid', 'nonheroic', 'beast', 'follower')
   * @returns {string} Target actor document type ('character', 'droid', 'npc')
   * @throws {Error} If subtype is unknown or mapping is invalid
   */
  static resolveActorDocumentType(progressionSubtype) {
    if (!progressionSubtype) {
      throw new Error('[ProgressionDocumentTargetPolicy] Progression subtype required');
    }

    const targetType = this.#SUBTYPE_TO_DOCUMENT_TYPE[progressionSubtype];

    if (!targetType) {
      throw new Error(
        `[ProgressionDocumentTargetPolicy] Unknown progression subtype: "${progressionSubtype}". ` +
        `Known subtypes: ${Object.keys(this.#SUBTYPE_TO_DOCUMENT_TYPE).join(', ')}`
      );
    }

    swseLogger.debug('[ProgressionDocumentTargetPolicy] Resolved document type', {
      subtype: progressionSubtype,
      targetType,
    });

    return targetType;
  }

  /**
   * Check if an actor's document type matches its progression subtype.
   * Used for validation/audit.
   *
   * @param {Actor} actor - Actor to check
   * @param {string} progressionSubtype - Expected progression subtype
   * @returns {boolean} True if actor.type matches the expected document type
   */
  static isDocumentTypeCorrect(actor, progressionSubtype) {
    if (!actor || !progressionSubtype) {
      return false;
    }

    const expectedType = this.resolveActorDocumentType(progressionSubtype);
    return actor.type === expectedType;
  }

  /**
   * Get all valid actor types supported by progression.
   * @returns {string[]} Array of valid actor document types
   */
  static getSupportedActorTypes() {
    return [...new Set(Object.values(this.#SUBTYPE_TO_DOCUMENT_TYPE))];
  }

  /**
   * Get all valid progression subtypes.
   * @returns {string[]} Array of valid progression subtypes
   */
  static getSupportedProgressionSubtypes() {
    return Object.keys(this.#SUBTYPE_TO_DOCUMENT_TYPE);
  }
}
