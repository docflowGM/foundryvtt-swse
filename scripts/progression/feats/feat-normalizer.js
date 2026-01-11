/**
 * FEAT NORMALIZER
 * Normalizes feat documents to ensure consistent structure.
 *
 * Standardizes:
 * - Feat type
 * - Prerequisites
 * - Benefits
 * - Bonus feat classifications
 */

import { SWSELogger } from '../../utils/logger.js';

export const FeatNormalizer = {

    /**
     * Normalize a feat document
     */
    normalize(doc) {
        if (!doc || !doc.system) {
            return doc;
        }

        const sys = doc.system;

        // Normalize feat type (default to 'general')
        sys.featType = this._normalizeFeatType(sys.featType);

        // Normalize prerequisite
        sys.prerequisite = this._normalizePrerequisite(sys.prerequisite);

        // Normalize benefit
        sys.benefit = this._normalizeBenefit(sys.benefit);

        // Normalize bonus feat classifications
        sys.bonus_feat_for = this._normalizeBonusFor(sys.bonus_feat_for);

        // Normalize tags
        sys.tags = Array.isArray(sys.tags) ? sys.tags : [];

        // Normalize description
        sys.description = sys.description ?? '';

        return doc;
    },

    /**
     * Normalize feat type
     * @private
     */
    _normalizeFeatType(featType) {
        const validTypes = [
            'general',
            'combat',
            'tactical',
            'bonus',
            'prerequisite',
            'jedi',
            'lightsaber',
            'force',
            'team',
            'martial_arts',
            'species'
        ];

        const normalized = String(featType || 'general').toLowerCase().trim();

        if (validTypes.includes(normalized)) {
            return normalized;
        }

        return 'general'; // Default
    },

    /**
     * Normalize prerequisite string
     * @private
     */
    _normalizePrerequisite(prereq) {
        if (!prereq) return '';
        return String(prereq).trim().replace(/\s+/g, ' ');
    },

    /**
     * Normalize benefit description
     * @private
     */
    _normalizeBenefit(benefit) {
        if (!benefit) return '';
        return String(benefit).trim().replace(/\s+/g, ' ');
    },

    /**
     * Normalize bonus feat classifications
     * @private
     */
    _normalizeBonusFor(bonusFor) {
        if (!bonusFor) return [];
        if (!Array.isArray(bonusFor)) return [];

        return bonusFor
            .map(className => String(className).trim())
            .filter(className => className.length > 0);
    },

    /**
     * Validate a normalized feat document
     */
    validate(featDoc) {
        const errors = [];

        if (!featDoc.name) {
            errors.push('Feat must have a name');
        }

        const validTypes = [
            'general',
            'combat',
            'tactical',
            'bonus',
            'prerequisite',
            'jedi',
            'lightsaber',
            'force',
            'team',
            'martial_arts',
            'species'
        ];

        if (!validTypes.includes(featDoc.system?.featType)) {
            errors.push(`Invalid feat type: ${featDoc.system?.featType}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get feat type
     */
    getFeatType(featDoc) {
        return featDoc.system?.featType ?? 'general';
    },

    /**
     * Get prerequisite
     */
    getPrerequisite(featDoc) {
        return featDoc.system?.prerequisite ?? '';
    },

    /**
     * Check if feat can be bonus feat for class
     */
    isBonusFeatFor(featDoc, className) {
        const bonusFor = featDoc.system?.bonus_feat_for || [];
        return Array.isArray(bonusFor) && bonusFor.includes(className);
    },

    /**
     * Check if feat has prerequisites
     */
    hasPrerequisites(featDoc) {
        return !!(featDoc.system?.prerequisite?.trim());
    }
};

export default FeatNormalizer;
