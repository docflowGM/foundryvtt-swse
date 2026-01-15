/**
 * Effect Sanitizer
 *
 * Sanitizes ActiveEffect data to ensure compatibility with Foundry v13+
 * Removes invalid effect type fields that don't conform to Foundry standards.
 *
 * This runs proactively when:
 * - Items are being created or updated
 * - Actors are being created or updated
 * - Effects are being embedded in documents
 */

import { SWSELogger } from './logger.js';

export class EffectSanitizer {

  /**
   * Invalid effect types that should be removed
   * (custom types that don't conform to Foundry v13+ standards)
   */
  static INVALID_TYPES = [
    'talent-effect',
    'feat-effect',
    'custom-effect'
  ];

  /**
   * Check if an effect type is invalid
   */
  static isInvalidType(type) {
    if (type === undefined || type === null) return false;
    return this.INVALID_TYPES.includes(type);
  }

  /**
   * Sanitize a single effect object
   */
  static sanitizeEffect(effect) {
    if (!effect) return effect;

    const sanitized = { ...effect };

    // Remove invalid type field
    if (this.isInvalidType(sanitized.type)) {
      SWSELogger.debug(`EffectSanitizer | Removing invalid effect type: "${sanitized.type}" from effect "${sanitized.name}"`);
      delete sanitized.type;
    }

    return sanitized;
  }

  /**
   * Sanitize an array of effects
   */
  static sanitizeEffects(effects) {
    if (!Array.isArray(effects)) return effects;
    return effects.map(effect => this.sanitizeEffect(effect));
  }

  /**
   * Sanitize embedded effects in item/actor data
   */
  static sanitizeDocumentData(data) {
    if (!data) return data;

    const sanitized = { ...data };

    // Check for embedded effects
    if (data.effects && Array.isArray(data.effects)) {
      sanitized.effects = this.sanitizeEffects(data.effects);
    }

    return sanitized;
  }

  /**
   * Initialize sanitization hooks
   */
  static initialize() {
    // Hook into preCreateItem to sanitize effects before they're created
    Hooks.on('preCreateItem', (item, data, options, userId) => {
      if (data.effects && Array.isArray(data.effects)) {
        const hasInvalid = data.effects.some(e => this.isInvalidType(e.type));
        if (hasInvalid) {
          SWSELogger.debug(`EffectSanitizer | Sanitizing effects on item creation: ${item.name}`);
          data.effects = this.sanitizeEffects(data.effects);
        }
      }
    });

    // Hook into preUpdateItem to sanitize effects on update
    Hooks.on('preUpdateItem', (item, data, options, userId) => {
      if (data.effects && Array.isArray(data.effects)) {
        const hasInvalid = data.effects.some(e => this.isInvalidType(e.type));
        if (hasInvalid) {
          SWSELogger.debug(`EffectSanitizer | Sanitizing effects on item update: ${item.name}`);
          data.effects = this.sanitizeEffects(data.effects);
        }
      }
    });

    // Hook into preCreateActor to sanitize effects before they're created
    Hooks.on('preCreateActor', (actor, data, options, userId) => {
      if (data.effects && Array.isArray(data.effects)) {
        const hasInvalid = data.effects.some(e => this.isInvalidType(e.type));
        if (hasInvalid) {
          SWSELogger.debug(`EffectSanitizer | Sanitizing effects on actor creation: ${actor.name}`);
          data.effects = this.sanitizeEffects(data.effects);
        }
      }
    });

    // Hook into preUpdateActor to sanitize effects on update
    Hooks.on('preUpdateActor', (actor, data, options, userId) => {
      if (data.effects && Array.isArray(data.effects)) {
        const hasInvalid = data.effects.some(e => this.isInvalidType(e.type));
        if (hasInvalid) {
          SWSELogger.debug(`EffectSanitizer | Sanitizing effects on actor update: ${actor.name}`);
          data.effects = this.sanitizeEffects(data.effects);
        }
      }
    });

    SWSELogger.log("EffectSanitizer | Initialization complete - effect sanitization hooks registered");
  }
}

// Initialize on ready
Hooks.once('ready', () => {
  EffectSanitizer.initialize();
});
