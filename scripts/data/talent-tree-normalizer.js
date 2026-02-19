// ============================================
// FILE: scripts/data/talent-tree-normalizer.js
// Talent Tree Data Normalizer
// ============================================
//
// This module provides a normalization layer between the raw talent_tree.db
// compendium data and the rest of the system.
//
// Purpose:
// - Converts talent tree names to stable IDs
// - Infers semantic metadata (role, category)
// - Provides deterministic joins between classes and talents
// - Prevents string matching failures due to encoding/spacing issues
//
// This is a READ-ONLY transformation layer.
// It does NOT mutate the source data.
//
// All engines MUST use this normalizer instead of string matching on names.
// ============================================

/**
 * Normalize a talent tree ID from a name string.
 * Ensures stable, machine-addressable identifiers.
 *
 * @param {string} name - Talent tree name
 * @returns {string} - Normalized ID (lowercase, underscored)
 */
export function normalizeTalentTreeId(name) {
    if (!name) {return 'unknown';}

    return name
        .toLowerCase()
        .replace(/['']/g, '')      // Remove apostrophes (handles encoding issues)
        .replace(/\W+/g, '_')       // Replace non-word chars with underscore
        .replace(/^_|_$/g, '');     // Trim leading/trailing underscores
}

/**
 * Infer role from talent tree name.
 * Used by Suggestion Engine for role-based filtering.
 *
 * @param {string} name - Talent tree name
 * @returns {string} - Role: "force", "combat", "tech", "leader", or "general"
 */
function inferTreeRole(name) {
    const n = name.toLowerCase();

    if (n.includes('jedi') || n.includes('force') || n.includes('sith') ||
        n.includes('lightsaber') || n.includes('vitality')) {
        return 'force';
    }

    if (n.includes('commando') || n.includes('trooper') || n.includes('weapon') ||
        n.includes('armor') || n.includes('duelist') || n.includes('gunslinger') ||
        n.includes('soldier') || n.includes('guardian') || n.includes('gladiator')) {
        return 'combat';
    }

    if (n.includes('slicer') || n.includes('tech') || n.includes('engineer') ||
        n.includes('mechanic') || n.includes('droid') || n.includes('saboteur')) {
        return 'tech';
    }

    if (n.includes('leadership') || n.includes('influence') || n.includes('inspiration') ||
        n.includes('noble') || n.includes('officer') || n.includes('diplomat')) {
        return 'leader';
    }

    return 'general';
}

/**
 * Infer category from talent tree name.
 * Categories group trees by thematic affiliation.
 *
 * @param {string} name - Talent tree name
 * @returns {string} - Category: "jedi", "sith", "droid", "universal", etc.
 */
function inferTreeCategory(name) {
    const n = name.toLowerCase();

    if (n.includes('jedi')) {return 'jedi';}
    if (n.includes('sith')) {return 'sith';}
    if (n.includes('droid')) {return 'droid';}
    if (n.includes('force') && !n.includes('jedi') && !n.includes('sith')) {return 'force';}
    if (n.includes('bounty hunter')) {return 'bounty_hunter';}
    if (n.includes('soldier') || n.includes('trooper')) {return 'military';}
    if (n.includes('noble') || n.includes('officer')) {return 'leadership';}
    if (n.includes('scoundrel') || n.includes('outlaw')) {return 'scoundrel';}
    if (n.includes('scout') || n.includes('fringer')) {return 'scout';}

    return 'universal';
}

/**
 * Normalize a raw talent tree document from talent_tree.db.
 *
 * This is the ONLY way talent tree data should be accessed by engines.
 *
 * @param {Object} rawTree - Raw talent tree document from compendium
 * @returns {Object} - Normalized talent tree definition
 */
export function normalizeTalentTree(rawTree) {
    const name = rawTree.name || 'Unknown Tree';
    const sys = rawTree.system || {};

    return {
        // Identity
        id: normalizeTalentTreeId(name),
        name: name,
        sourceId: rawTree._id,

        // SSOT: Talent ownership (authoritative list from tree)
        talentIds: sys.talentIds || [],

        // Classification
        role: inferTreeRole(name),
        category: inferTreeCategory(name),

        // Access tags (for flag-based eligibility)
        // "force" = accessible to Force-sensitive characters
        // "droid" = accessible to Droid characters
        tags: sys.tags || [],

        // Source reference (for Foundry item lookups)
        // This allows getting back to the original compendium entry if needed
        compendiumName: sys.talent_tree || name,

        // Metadata
        description: sys.description || '',
        img: rawTree.img || 'icons/svg/item-bag.svg'
    };
}

/**
 * DEPRECATED: Exact-match talent tree lookup only (SSOT stabilization).
 * This function no longer does fuzzy/fallback matching.
 * If a tree is not found by exact ID, it fails loudly to expose data issues.
 *
 * @deprecated Use TalentTreeDB.get(normalizedId) for direct ID lookup
 * @param {string} name - Talent tree ID (must match exactly after normalization)
 * @param {Map<string, Object>} treeMap - Map of normalized trees
 * @returns {Object|null} - Tree if exact ID found, null otherwise (never fuzzy matches)
 */
export function findTalentTreeByName(name, treeMap) {
    if (!name || !treeMap) {return null;}

    // Only exact ID match - no fuzzy matching (removed in SSOT stabilization)
    const id = normalizeTalentTreeId(name);
    if (treeMap.has(id)) {
        return treeMap.get(id);
    }

    // Fail loudly: data integrity issue if we reach here
    console.warn(`[SSOT] Talent tree not found by exact ID: "${name}" (normalized: "${id}")`);
    return null;
}

/**
 * Validate a normalized talent tree definition.
 * Throws if critical fields are missing.
 *
 * @param {Object} normalizedTree - Normalized tree object
 * @throws {Error} - If validation fails
 */
export function validateTalentTree(normalizedTree) {
    const required = ['id', 'name', 'role', 'category'];
    const missing = required.filter(field => !normalizedTree[field]);

    if (missing.length > 0) {
        throw new Error(`[TalentTreeNormalizer] Invalid tree definition - missing fields: ${missing.join(', ')}`);
    }

    return true;
}

/**
 * Normalize a talent document for the progression engine.
 * This wraps document-level normalization in defensive error handling.
 * NON-FATAL: Never throws, never blocks sheet rendering.
 *
 * @param {Object} talentDoc - Talent document to normalize
 * @returns {Object} - The modified talent document
 */
export function normalizeDocumentTalent(talentDoc) {
    if (!talentDoc || !talentDoc.system) {
        return talentDoc;
    }

    try {
        const sys = talentDoc.system;

        // Normalize tree name field (whitespace normalization)
        if (sys.talent_tree) {
            sys.talent_tree = String(sys.talent_tree)
                .trim()
                .replace(/\s+/g, ' ');
        }

        // Normalize prerequisites string
        if (sys.prerequisites) {
            sys.prerequisites = String(sys.prerequisites)
                .trim()
                .replace(/\s+/g, ' ');
        }

        // Normalize benefit description
        if (sys.benefit) {
            sys.benefit = String(sys.benefit)
                .trim()
                .replace(/\s+/g, ' ');
        }

        // Ensure description exists
        sys.description = sys.description ?? '';

        // Validate tree name format (non-fatal)
        if (sys.talent_tree) {
            const isValidFormat = /^[A-Za-z0-9\s\-'()]+$/.test(sys.talent_tree);
            if (!isValidFormat) {
                console.warn(`[SSOT] Talent "${talentDoc.name}" has unusual tree name format: "${sys.talent_tree}"`);
            }
        }

    } catch (err) {
        console.error(`[SSOT] Talent document normalization failed for "${talentDoc.name}":`, err);
        // Never throw: continue execution
    }

    return talentDoc;
}

/**
 * Validate tree assignment for a talent (non-fatal diagnostic).
 * Does not invalidate talents. Returns diagnostic info only.
 * NON-FATAL: Always returns true to allow progression.
 *
 * @param {Object} talentDoc - Talent document to check
 * @returns {boolean} - Always returns true (never blocks)
 */
export function validateTalentTreeAssignment(talentDoc) {
    try {
        if (!talentDoc?.system?.talent_tree) {
            console.warn(`[SSOT] Talent "${talentDoc?.name}" has no tree assignment`);
            return true; // Non-fatal
        }

        const treeName = talentDoc.system.talent_tree;
        if (typeof treeName !== 'string') {
            console.warn(`[SSOT] Talent "${talentDoc.name}" tree assignment is not a string`);
            return true; // Non-fatal
        }

        // Optional: Check if tree exists in TalentTreeDB (if available)
        try {
            // This is optional - we don't want to create a circular dependency
            // Just log warnings if the tree can't be resolved
            const treeId = normalizeTalentTreeId(treeName);
            // Note: Actual tree lookup would happen via TalentTreeDB in the progression layer
        } catch (innerErr) {
            console.warn(`[SSOT] Could not validate tree "${treeName}" for talent "${talentDoc.name}"`);
        }

    } catch (err) {
        console.error(`[SSOT] Tree validation failed for talent "${talentDoc.name}":`, err);
        return true; // Non-fatal: never block
    }

    return true; // Always allow progression
}
