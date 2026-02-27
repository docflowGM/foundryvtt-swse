// ============================================
// FILE: scripts/data/talent-normalizer.js
// Talent Data Normalizer
// ============================================
//
// This module provides a normalization layer between the raw talents.db
// compendium data and the rest of the system.
//
// Purpose:
// - Links talents to talent trees via stable IDs
// - Removes class-level eligibility (derived from trees instead)
// - Provides clean prerequisite and benefit data
// - Prevents circular dependency issues
//
// IMPORTANT: Talents do NOT define class eligibility directly.
// Class eligibility is resolved via the talent tree they belong to.
//
// This is a READ-ONLY transformation layer.
// It does NOT mutate the source data.
// ============================================

/**
 * Parse prerequisites from various formats.
 * Handles string and object formats from compendium data.
 *
 * @param {string|Object|Array} prereqValue - Prerequisites from data
 * @returns {Array<Object>} - Normalized prerequisite objects
 */
function parsePrerequisites(prereqValue) {
    if (!prereqValue) {return [];}

    // Already an array
    if (Array.isArray(prereqValue)) {
        return prereqValue;
    }

    // Object format
    if (typeof prereqValue === 'object') {
        return [prereqValue];
    }

    // String format (legacy)
    if (typeof prereqValue === 'string') {
        return [{
            type: 'text',
            value: prereqValue
        }];
    }

    return [];
}

/**
 * Normalize a raw talent document from talents.db.
 *
 * This is the ONLY way talent data should be accessed by engines.
 *
 * @param {Object} rawTalent - Raw talent document from compendium
 * @param {Map<string, Object>} treeMap - Map of normalized talent trees (for linking)
 * @returns {Object} - Normalized talent definition
 */
export function normalizeTalent(rawTalent, treeMap = null) {
    const name = rawTalent.name || 'Unknown Talent';
    const sys = rawTalent.system || {};

    // SSOT: treeId is derived from the tree's talentIds array
    // (authoritative source is in talent_trees.db, not here)
    // Read the derived treeId that was written by the Python reconciliation script
    
    // ======================================================
    // SSOT TREE RESOLUTION (Authoritative via TalentTreeDB)
    // ======================================================

    let treeId = null;
    const treeName = sys.talent_tree || sys.talentTree || null;

    // Primary source: inverse index from TalentTreeDB
    if (treeMap && treeMap.talentToTree instanceof Map) {
        treeId = treeMap.talentToTree.get(rawTalent._id) || null;
    }

    // Legacy fallback (only if inverse index missing)
    if (!treeId && treeName && treeMap && treeMap.trees instanceof Map) {
        const match = Array.from(treeMap.trees.values()).find(t =>
            t?.name?.toLowerCase() === treeName.toLowerCase()
        );
        if (match) {
            treeId = match.id;
        }
    }

    return {

        // Identity
        id: rawTalent._id,
        name: name,
        sourceId: rawTalent._id,

        // Tree Linkage (SSOT for class eligibility)
        treeId: treeId,
        treeName: treeName,

        // Mechanics
        prerequisites: parsePrerequisites(sys.prerequisites),
        benefit: sys.benefit || '',
        special: sys.special || '',

        // Effects (Active Effects for automation)
        effects: rawTalent.effects || [],

        // Metadata
        description: sys.description || '',
        img: rawTalent.img || 'icons/svg/item-bag.svg',

        // Flags (for system extensions)
        flags: rawTalent.flags?.swse || {}

        // DEPRECATED FIELDS (intentionally ignored)
        // - sys.class: Class eligibility is derived from tree, not stored here
        // - sys.category: Category is derived from tree
        // These fields exist in old data but should NOT be used by engines
    };
}

/**
 * Get talents by talent tree ID.
 * This is the primary way to query talents for a class.
 *
 * @param {string} treeId - Talent tree ID
 * @param {Array<Object>} allTalents - Array of all normalized talents
 * @returns {Array<Object>} - Talents belonging to this tree
 */
export function getTalentsByTree(treeId, allTalents) {
    if (!treeId || !allTalents) {return [];}

    return allTalents.filter(talent => talent.treeId === treeId);
}

/**
 * Check if a talent's prerequisites are met.
 * This is a helper for progression/selection logic.
 *
 * @param {Object} talent - Normalized talent
 * @param {Object} actor - Actor document
 * @returns {boolean} - True if prerequisites are met
 */
export function checkTalentPrerequisites(talent, actor) {
    if (!talent.prerequisites || talent.prerequisites.length === 0) {
        return true;
    }

    // This is a simplified check - full implementation would be in progression engine
    // For now, just check if prerequisites exist and are not empty
    return talent.prerequisites.every(prereq => {
        // TODO: Implement full prerequisite checking logic
        // This would check:
        // - Level requirements
        // - Feat requirements
        // - Skill requirements
        // - Other talent requirements
        // - Class requirements (via tree)

        // For now, assume prerequisites are met if actor exists
        return actor !== null;
    });
}

/**
 * Validate a normalized talent definition.
 * Warns if critical fields are missing (non-fatal for backwards compatibility).
 *
 * @param {Object} normalizedTalent - Normalized talent object
 * @returns {boolean} - True if valid
 */
export function validateTalent(normalizedTalent) {
    const required = ['id', 'name'];
    const missing = required.filter(field => !normalizedTalent[field]);

    if (missing.length > 0) {
        console.error(`[TalentNormalizer] Invalid talent definition - missing fields: ${missing.join(', ')}`);
        return false;
    }

    if (!normalizedTalent.treeId) {
        console.warn(`[TalentNormalizer] Talent "${normalizedTalent.name}" has no tree ID - may be orphaned`);
    }

    return true;
}

/**
 * Filter talents by role (via their tree).
 * Used by Suggestion Engine.
 *
 * @param {Array<Object>} talents - Array of normalized talents
 * @param {string} role - Desired role ("force", "combat", "tech", "leader", "general")
 * @param {Map<string, Object>} treeMap - Map of normalized talent trees
 * @returns {Array<Object>} - Filtered talents
 */
export function filterTalentsByRole(talents, role, treeMap) {
    if (!role || !treeMap) {return talents;}

    return talents.filter(talent => {
        if (!talent.treeId) {return false;}

        const tree = treeMap.get(talent.treeId);
        return tree && tree.role === role;
    });
}
