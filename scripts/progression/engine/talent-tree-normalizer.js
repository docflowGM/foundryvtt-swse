/**
 * TALENT TREE NORMALIZER
 * Normalizes talent documents to ensure consistent structure for talent selection.
 * NON-BLOCKING: Tree resolution failures do not invalidate talents or break sheet rendering.
 *
 * Standardizes:
 * - Talent tree names
 * - Prerequisites
 * - Benefits/descriptions
 * - Talent tree validation (non-fatal)
 */

import { SWSELogger } from '../../utils/logger.js';
import { TalentTreeDB } from '../../data/talent-tree-db.js';
import { normalizeTalentTreeId } from '../../data/talent-tree-normalizer.js';

export const TalentTreeNormalizer = {

    /**
     * PHASE 1: Resolve talent tree from multiple sources (non-fatal)
     * @private
     */
    _resolveTalentTree(talent) {
        let tree = null;

        // 1️⃣ Preferred: stable key
        if (talent.system?.treeKey) {
            tree = TalentTreeDB.byKey(talent.system.treeKey);
        }

        // 2️⃣ Fallback: legacy _id
        if (!tree && talent.system?.treeId) {
            tree = TalentTreeDB.byId(talent.system.treeId);
        }

        // 3️⃣ Fallback: derive from stored treeName
        if (!tree && talent.system?.talent_tree) {
            const derivedKey = talent.system.talent_tree
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
            tree = TalentTreeDB.byKey(derivedKey);
        }

        return tree;
    },

    /**
     * Normalize a talent document (NON-FATAL)
     */
    normalize(talentDoc) {
        if (!talentDoc || !talentDoc.system) {
            return talentDoc;
        }

        try {
            const sys = talentDoc.system;

            // Normalize properties - check multiple tree fields
            sys.talent_tree = this._normalizeTalentTree(sys.talent_tree, sys);
            sys.prerequisites = this._normalizePrerequisites(sys.prerequisites);
            sys.benefit = this._normalizeBenefit(sys.benefit);
            sys.description = sys.description ?? '';

            // PHASE 3: Check tree but don't block
            const tree = this._resolveTalentTree(talentDoc);
            if (!tree) {
                console.warn(`[SSOT] Tree unresolved for talent "${talentDoc.name}" — validation skipped.`);
                // Non-fatal: continue normalization
            }
        } catch (err) {
            console.error(`[SSOT] Talent normalization failed for ${talentDoc.name}`, err);
            // Never throw: sheet rendering must continue
        }

        return talentDoc;
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

        if (!rawTree) {return '';}

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
        if (!prereq) {return '';}

        return String(prereq)
            .trim()
            .replace(/\s+/g, ' ');
    },

    /**
     * Normalize benefit description
     * @private
     */
    _normalizeBenefit(benefit) {
        if (!benefit) {return '';}

        return String(benefit)
            .trim()
            .replace(/\s+/g, ' ');
    },

    /**
     * Validate talent tree name format
     */
    validateTreeName(treeName) {
        if (!treeName || typeof treeName !== 'string') {return false;}

        // Allow alphanumeric, spaces, hyphens, apostrophes, parentheses
        return /^[A-Za-z0-9\s\-'()]+$/.test(treeName);
    },

    /**
     * PHASE 2: Check talent against tree (NON-FATAL)
     * Does not mark talent invalid. Never throws. Returns diagnostic info only.
     */
    checkTalentAgainstTree(talentDoc) {
        try {
            if (!talentDoc?.system) {
                return true; // Non-fatal: continue
            }

            const tree = this._resolveTalentTree(talentDoc);
            if (!tree) {
                console.warn(`[SSOT] Tree unresolved for talent "${talentDoc.name}" — validation skipped.`);
                return true; // Non-fatal: do NOT mark invalid
            }

            return true; // Tree found
        } catch (err) {
            console.error(`[SSOT] Tree check failed for talent "${talentDoc.name}"`, err);
            return true; // Non-fatal: never break sheet rendering
        }
    },

    /**
     * PHASE 2: Validate a normalized talent document (NON-FATAL)
     * Missing tree is a warning, not an error. Never marks talent invalid.
     */
    validate(talentDoc) {
        const errors = [];
        const warnings = [];

        if (!talentDoc.name) {
            errors.push('Talent must have a name');
        }

        // PHASE 2: Tree missing = warning only, not fatal
        if (!talentDoc.system?.talent_tree) {
            warnings.push('Talent not assigned to a talent tree');
        } else if (!this.validateTreeName(talentDoc.system.talent_tree)) {
            warnings.push('Invalid talent tree name: ' + talentDoc.system.talent_tree);
        }

        return {
            valid: errors.length === 0, // Only real errors block validity
            errors,
            warnings
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
