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
    if (!name) return "unknown";

    return name
        .toLowerCase()
        .replace(/['']/g, "")      // Remove apostrophes (handles encoding issues)
        .replace(/\W+/g, "_")       // Replace non-word chars with underscore
        .replace(/^_|_$/g, "");     // Trim leading/trailing underscores
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

    if (n.includes("jedi") || n.includes("force") || n.includes("sith") ||
        n.includes("lightsaber") || n.includes("vitality")) {
        return "force";
    }

    if (n.includes("commando") || n.includes("trooper") || n.includes("weapon") ||
        n.includes("armor") || n.includes("duelist") || n.includes("gunslinger") ||
        n.includes("soldier") || n.includes("guardian") || n.includes("gladiator")) {
        return "combat";
    }

    if (n.includes("slicer") || n.includes("tech") || n.includes("engineer") ||
        n.includes("mechanic") || n.includes("droid") || n.includes("saboteur")) {
        return "tech";
    }

    if (n.includes("leadership") || n.includes("influence") || n.includes("inspiration") ||
        n.includes("noble") || n.includes("officer") || n.includes("diplomat")) {
        return "leader";
    }

    return "general";
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

    if (n.includes("jedi")) return "jedi";
    if (n.includes("sith")) return "sith";
    if (n.includes("droid")) return "droid";
    if (n.includes("force") && !n.includes("jedi") && !n.includes("sith")) return "force";
    if (n.includes("bounty hunter")) return "bounty_hunter";
    if (n.includes("soldier") || n.includes("trooper")) return "military";
    if (n.includes("noble") || n.includes("officer")) return "leadership";
    if (n.includes("scoundrel") || n.includes("outlaw")) return "scoundrel";
    if (n.includes("scout") || n.includes("fringer")) return "scout";

    return "universal";
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
    const name = rawTree.name || "Unknown Tree";
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

        // Source reference (for Foundry item lookups)
        // This allows getting back to the original compendium entry if needed
        compendiumName: sys.talent_tree || name,

        // Metadata
        description: sys.description || "",
        img: rawTree.img || "icons/svg/item-bag.svg"
    };
}

/**
 * Find a talent tree by name (fuzzy matching).
 * Handles encoding issues and spacing variations.
 *
 * @param {string} name - Talent tree name to find
 * @param {Map<string, Object>} treeMap - Map of normalized trees
 * @returns {Object|null} - Normalized tree or null
 */
export function findTalentTreeByName(name, treeMap) {
    if (!name || !treeMap) return null;

    // Try exact ID match first
    const id = normalizeTalentTreeId(name);
    if (treeMap.has(id)) {
        return treeMap.get(id);
    }

    // Try fuzzy match by comparing normalized names
    for (const [treeId, tree] of treeMap) {
        const normalizedTreeName = normalizeTalentTreeId(tree.name);
        if (normalizedTreeName === id) {
            return tree;
        }
    }

    console.warn(`[TalentTreeNormalizer] Could not find talent tree for name: "${name}"`);
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
