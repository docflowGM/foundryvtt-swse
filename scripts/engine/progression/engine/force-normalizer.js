/**
 * FORCE NORMALIZER
 * Normalizes Force power, technique, and secret documents to ensure consistency.
 *
 * Standardizes:
 * - Force power levels
 * - Action economy
 * - Range and targeting
 * - Duration
 * - Prerequisites
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const ForceNormalizer = {

    /**
     * Normalize a Force power document
     */
    normalizePower(powerDoc) {
        if (!powerDoc || !powerDoc.system) {
            return powerDoc;
        }

        const sys = powerDoc.system;

        // Normalize properties
        sys.powerLevel = this._normalizePowerLevel(sys.powerLevel);
        sys.action = this._normalizeAction(sys.action);
        sys.range = this._normalizeRange(sys.range);
        sys.duration = this._normalizeDuration(sys.duration);
        sys.targets = this._normalizeTargets(sys.targets);
        sys.force_type = this._normalizeForceType(sys.force_type);
        sys.description = sys.description ?? '';
        sys.prerequisites = sys.prerequisites ?? '';

        return powerDoc;
    },

    /**
     * Normalize a Force technique (feat)
     */
    normalizeTechnique(techniqueDoc) {
        if (!techniqueDoc || !techniqueDoc.system) {
            return techniqueDoc;
        }

        const sys = techniqueDoc.system;

        // Normalize properties
        sys.description = sys.description ?? '';
        sys.prerequisites = this._normalizePrerequisites(sys.prerequisites);
        sys.benefit = sys.benefit ?? '';
        sys.tags = Array.isArray(sys.tags) ? sys.tags : [];

        // Ensure tagged as force_technique
        if (!sys.tags.includes('force_technique')) {
            sys.tags.push('force_technique');
        }

        return techniqueDoc;
    },

    /**
     * Normalize a Force secret (talent)
     */
    normalizeSecret(secretDoc) {
        if (!secretDoc || !secretDoc.system) {
            return secretDoc;
        }

        const sys = secretDoc.system;

        // Normalize properties
        sys.description = sys.description ?? '';
        sys.prerequisites = this._normalizePrerequisites(sys.prerequisites);
        sys.benefit = sys.benefit ?? '';
        sys.tags = Array.isArray(sys.tags) ? sys.tags : [];

        // Ensure tagged as force_secret
        if (!sys.tags.includes('force_secret')) {
            sys.tags.push('force_secret');
        }

        return secretDoc;
    },

    /**
     * Normalize power level to 1-9
     * @private
     */
    _normalizePowerLevel(level) {
        const num = Number(level ?? 1);
        if (isNaN(num)) {return 1;}
        return Math.max(1, Math.min(9, num));
    },

    /**
     * Normalize action economy
     * @private
     */
    _normalizeAction(action) {
        const validActions = ['free', 'swift', 'move', 'standard', 'full round'];
        const normalized = String(action || 'standard').toLowerCase().trim();

        if (validActions.includes(normalized)) {
            return normalized;
        }

        return 'standard';
    },

    /**
     * Normalize range description
     * @private
     */
    _normalizeRange(range) {
        if (!range) {return 'Personal';}
        return String(range).trim();
    },

    /**
     * Normalize duration description
     * @private
     */
    _normalizeDuration(duration) {
        if (!duration) {return 'Instantaneous';}
        return String(duration).trim();
    },

    /**
     * Normalize target description
     * @private
     */
    _normalizeTargets(targets) {
        if (!targets) {return 'One living creature';}
        return String(targets).trim();
    },

    /**
     * Normalize force type (light/dark/neutral)
     * @private
     */
    _normalizeForceType(type) {
        const validTypes = ['light', 'dark', 'neutral', 'untyped'];
        const normalized = String(type || 'untyped').toLowerCase().trim();

        if (validTypes.includes(normalized)) {
            return normalized;
        }

        return 'untyped';
    },

    /**
     * Normalize prerequisites
     * @private
     */
    _normalizePrerequisites(prereq) {
        if (!prereq) {return '';}
        return String(prereq).trim().replace(/\s+/g, ' ');
    },

    /**
     * Validate a normalized Force power document
     */
    validatePower(powerDoc) {
        const errors = [];

        if (!powerDoc.name) {
            errors.push('Power must have a name');
        }

        const level = Number(powerDoc.system?.powerLevel ?? 1);
        if (level < 1 || level > 9) {
            errors.push(`Invalid power level: ${level} (must be 1-9)`);
        }

        const validActions = ['free', 'swift', 'move', 'standard', 'full round'];
        if (!validActions.includes(powerDoc.system?.action?.toLowerCase())) {
            errors.push(`Invalid action: ${powerDoc.system?.action}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Check if document is a Force power
     */
    isPower(doc) {
        return doc.type === 'forcepower' || doc.system?.force_type !== undefined;
    },

    /**
     * Check if document is a Force technique
     */
    isTechnique(doc) {
        return doc.system?.tags?.includes('force_technique') || doc.type === 'feat';
    },

    /**
     * Check if document is a Force secret
     */
    isSecret(doc) {
        return doc.system?.tags?.includes('force_secret') || doc.type === 'talent';
    },

    /**
     * Get power level from document
     */
    getPowerLevel(powerDoc) {
        return Number(powerDoc.system?.powerLevel ?? 1);
    },

    /**
     * Get action type from document
     */
    getAction(powerDoc) {
        return powerDoc.system?.action ?? 'standard';
    },

    /**
     * Get range from document
     */
    getRange(powerDoc) {
        return powerDoc.system?.range ?? 'Personal';
    }
};

export default ForceNormalizer;
