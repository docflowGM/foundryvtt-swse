/**
 * FEAT NORMALIZER
 * Normalizes feat documents to ensure consistent structure.
 *
 * Standardizes:
 * - Feat type
 * - Prerequisites
 * - Benefits
 * - Bonus feat classifications
 * - Runtime-friendly field accessors
 */

import { normalizeFeatTypeKey, resolveFeatBonusFeatFor, resolveFeatDescription, resolveFeatPrerequisites } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-shape.js";

export const FeatNormalizer = {

    /**
     * Normalize a feat document in-place for compendium/runtime safety.
     */
    normalize(doc) {
        if (!doc || !doc.system) {
            return doc;
        }

        const sys = doc.system;

        sys.featType = normalizeFeatTypeKey(sys.featType);
        sys.prerequisite = this._normalizePrerequisite(sys.prerequisite);
        sys.benefit = this._normalizeBenefit(sys.benefit);
        sys.bonus_feat_for = resolveFeatBonusFeatFor(doc);
        sys.tags = Array.isArray(sys.tags) ? sys.tags : [];

        // Preserve Foundry rich-text object shape when present; otherwise use empty string.
        if (sys.description == null) {
            sys.description = '';
        }

        return doc;
    },

    /**
     * Normalize prerequisite string
     * @private
     */
    _normalizePrerequisite(prereq) {
        if (!prereq) {return '';}
        return String(prereq).trim().replace(/\s+/g, ' ');
    },

    /**
     * Normalize benefit description
     * @private
     */
    _normalizeBenefit(benefit) {
        if (!benefit) {return '';}
        return String(benefit).trim().replace(/\s+/g, ' ');
    },

    /**
     * Validate a normalized feat document
     */
    validate(featDoc) {
        const errors = [];

        if (!featDoc?.name) {
            errors.push('Feat must have a name');
        }

        const featType = normalizeFeatTypeKey(featDoc?.system?.featType);
        if (!featType) {
            errors.push(`Invalid feat type: ${featDoc?.system?.featType}`);
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
        return normalizeFeatTypeKey(featDoc?.system?.featType);
    },

    /**
     * Get prerequisite
     */
    getPrerequisite(featDoc) {
        return resolveFeatPrerequisites(featDoc).prerequisiteText;
    },

    /**
     * Get canonical description
     */
    getDescription(featDoc) {
        return resolveFeatDescription(featDoc);
    },

    /**
     * Check if feat can be bonus feat for class
     */
    isBonusFeatFor(featDoc, className) {
        const bonusFor = resolveFeatBonusFeatFor(featDoc);
        return bonusFor.includes(className);
    },

    /**
     * Check if feat has prerequisites
     */
    hasPrerequisites(featDoc) {
        return !!resolveFeatPrerequisites(featDoc).prerequisiteText;
    }
};

export default FeatNormalizer;
