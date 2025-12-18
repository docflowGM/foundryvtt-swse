/**
 * TALENT TREE NORMALIZER
 * Normalizes talent documents to ensure consistent structure for talent selection.
 *
 * Standardizes:
 * - Talent tree names
 * - Prerequisites
 * - Benefits/descriptions
 * - Talent tree validation
 */

import { SWSELogger } from '../../utils/logger.js';

export const TalentTreeNormalizer = {

    /**
     * Normalize a talent document
     */
    normalize(talentDoc) {
        if (!talentDoc || !talentDoc.system) {
            return talentDoc;
        }

        const sys = talentDoc.system;

        // Normalize properties
        sys.talent_tree = this._normalizeTalentTree(sys.talent_tree);
        sys.prerequisites = this._normalizePrerequisites(sys.prerequisites);
        sys.benefit = this._normalizeBenefit(sys.benefit);
        sys.description = sys.description ?? '';

        return talentDoc;
    },

    /**
     * Normalize talent tree name
     * @private
     */
    _normalizeTalentTree(treeName) {
        if (!treeName) return '';

        const normalized = String(treeName)
            .trim()
            .replace(/\s+/g, ' '); // Normalize whitespace

        return normalized;
    },

    /**
     * Normalize prerequisites string
     * @private
     */
    _normalizePrerequisites(prereq) {
        if (!prereq) return '';

        return String(prereq)
            .trim()
            .replace(/\s+/g, ' ');
    },

    /**
     * Normalize benefit description
     * @private
     */
    _normalizeBenefit(benefit) {
        if (!benefit) return '';

        return String(benefit)
            .trim()
            .replace(/\s+/g, ' ');
    },

    /**
     * Validate talent tree name format
     */
    validateTreeName(treeName) {
        if (!treeName || typeof treeName !== 'string') return false;

        // Allow alphanumeric, spaces, hyphens, apostrophes, parentheses
        return /^[A-Za-z0-9\s\-'()]+$/.test(treeName);
    },

    /**
     * Check if a talent document has a valid tree name
     */
    checkTalentAgainstTree(talentDoc) {
        const tree = talentDoc.system?.talent_tree;

        if (!tree) {
            SWSELogger.warn(`Talent "${talentDoc.name}" has no talent tree assigned`);
            return false;
        }

        if (!this.validateTreeName(tree)) {
            SWSELogger.warn(`Talent "${talentDoc.name}" has malformed tree name: "${tree}"`);
            return false;
        }

        return true;
    },

    /**
     * Validate a normalized talent document
     */
    validate(talentDoc) {
        const errors = [];

        if (!talentDoc.name) {
            errors.push('Talent must have a name');
        }

        if (!talentDoc.system?.talent_tree) {
            errors.push('Talent must be assigned to a talent tree');
        } else if (!this.validateTreeName(talentDoc.system.talent_tree)) {
            errors.push('Invalid talent tree name: ' + talentDoc.system.talent_tree);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get talent tree from document
     */
    getTalentTree(talentDoc) {
        return talentDoc.system?.talent_tree ?? '';
    },

    /**
     * Get prerequisites from document
     */
    getPrerequisites(talentDoc) {
        return talentDoc.system?.prerequisites ?? '';
    },

    /**
     * Get benefit description from document
     */
    getBenefit(talentDoc) {
        return talentDoc.system?.benefit ?? '';
    }
};

export default TalentTreeNormalizer;
