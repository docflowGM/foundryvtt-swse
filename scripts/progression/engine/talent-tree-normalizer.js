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
import TalentTreeDB from '../../data/talent-tree-db.js';
import { normalizeTalentTreeId } from '../../data/talent-tree-normalizer.js';

export const TalentTreeNormalizer = {

    /**
     * Normalize a talent document - returns normalized snapshot without mutating original
     */
    normalize(talentDoc) {
        if (!talentDoc || !talentDoc.system) {
            return talentDoc;
        }

        const sys = talentDoc.system;

        // Return normalized snapshot without mutating the original document
        return {
            ...talentDoc,
            system: {
                ...sys,
                talent_tree: this._normalizeTalentTree(sys.talent_tree, sys),
                prerequisites: this._normalizePrerequisites(sys.prerequisites),
                benefit: this._normalizeBenefit(sys.benefit),
                description: sys.description ?? ''
            }
        };
    },

    /**
     * Normalize talent tree name
     * Checks multiple possible source fields for tree assignment
     * @private
     */
    _normalizeTalentTree(treeName, sys) {
        // Try multiple fields in order of priority
        const rawTree = treeName
            || sys?.tree
            || sys?.treeId
            || sys?.flags?.swse?.tree
            || '';

        if (!rawTree) return '';

        const normalized = String(rawTree)
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
     * Check if a talent document has a valid tree that exists in TalentTreeDB
     */
    checkTalentAgainstTree(talentDoc) {
        const sys = talentDoc.system;
        // Check multiple tree fields
        const tree = sys?.talent_tree || sys?.tree || sys?.treeId;

        if (!tree) {
            SWSELogger.warn(`Talent "${talentDoc.name}" has no talent tree assigned`);
            return false;
        }

        if (!this.validateTreeName(tree)) {
            SWSELogger.warn(`Talent "${talentDoc.name}" has malformed tree name: "${tree}"`);
            return false;
        }

        // Validate against TalentTreeDB if built
        if (TalentTreeDB.isBuilt) {
            const normalizedId = normalizeTalentTreeId(tree);
            const treeExists = TalentTreeDB.get(normalizedId) || TalentTreeDB.all().find(t => t.name === tree);
            if (!treeExists) {
                SWSELogger.warn(`Talent "${talentDoc.name}" references unknown tree: "${tree}" (normalized: ${normalizedId})`);
                return false;
            }
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
