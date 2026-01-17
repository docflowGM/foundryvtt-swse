// ============================================
// FILE: scripts/data/class-normalizer.js
// Class Data Normalizer
// ============================================
//
// This module provides a normalization layer between the raw classes.db
// compendium data and the rest of the system.
//
// Purpose:
// - Ensures consistent field access across all engines
// - Converts string/varied formats to canonical types
// - Provides stable IDs for deterministic joins
// - Prevents silent failures from missing/malformed data
//
// This is a READ-ONLY transformation layer.
// It does NOT mutate the source data.
//
// All engines (CharGen, Progression, Suggestion) MUST use this normalizer
// to access class data instead of reading raw compendium entries directly.
// ============================================

/**
 * Normalize a class ID from a name string.
 * Ensures stable, machine-addressable identifiers.
 *
 * @param {string} name - Class name
 * @returns {string} - Normalized ID (lowercase, underscored)
 */
export function normalizeClassId(name) {
    if (!name) return "unknown";

    return name
        .toLowerCase()
        .replace(/['']/g, "")      // Remove apostrophes
        .replace(/\W+/g, "_")       // Replace non-word chars with underscore
        .replace(/^_|_$/g, "");     // Trim leading/trailing underscores
}

/**
 * Parse hit die from various formats to integer.
 * Handles: "1d6", "d6", "6", 6
 *
 * @param {string|number} hitDieValue - Hit die value from data
 * @returns {number} - Integer hit die (6, 8, 10, or 12)
 */
function parseHitDie(hitDieValue) {
    if (typeof hitDieValue === 'number') {
        return hitDieValue;
    }

    if (typeof hitDieValue === 'string') {
        // Remove "1d" prefix if present
        const cleaned = hitDieValue.replace(/^1?d/, "").trim();
        const parsed = parseInt(cleaned, 10);

        if (!isNaN(parsed) && [6, 8, 10, 12].includes(parsed)) {
            return parsed;
        }
    }

    console.warn(`[ClassNormalizer] Invalid hit die value: ${hitDieValue}, defaulting to 6`);
    return 6;
}

/**
 * Infer class role from talent trees.
 * Used by Suggestion Engine for role-based filtering.
 *
 * @param {Array<string>} talentTrees - Array of talent tree names
 * @returns {string} - Role: "force", "combat", "tech", "leader", or "general"
 */
function inferClassRole(talentTrees = []) {
    const treeStr = talentTrees.join(" ").toLowerCase();

    if (treeStr.includes("jedi") || treeStr.includes("force") || treeStr.includes("sith")) {
        return "force";
    }

    if (treeStr.includes("commando") || treeStr.includes("trooper") ||
        treeStr.includes("soldier") || treeStr.includes("weapon")) {
        return "combat";
    }

    if (treeStr.includes("slicer") || treeStr.includes("tech") ||
        treeStr.includes("engineer") || treeStr.includes("mechanic")) {
        return "tech";
    }

    if (treeStr.includes("leadership") || treeStr.includes("influence") ||
        treeStr.includes("inspiration") || treeStr.includes("noble")) {
        return "leader";
    }

    return "general";
}

/**
 * Normalize a raw class document from classes.db.
 *
 * This is the ONLY way class data should be accessed by engines.
 *
 * @param {Object} rawClass - Raw class document from compendium
 * @returns {Object} - Normalized class definition
 */
export function normalizeClass(rawClass) {
    // Convert system DataModel proxy to plain object if needed
    // This ensures properties are properly accessible
    const rawSystem = rawClass.system;
    const sys = rawSystem?.toObject?.() ?? (rawSystem ? { ...rawSystem } : {});
    const name = rawClass.name || "Unknown Class";

    return {
        // Identity
        id: normalizeClassId(sys.class_name || name),
        name: name,
        sourceId: rawClass._id,

        // Classification
        baseClass: sys.base_class !== false,  // Default to true

        // Core Mechanics
        hitDie: parseHitDie(sys.hit_die),
        babProgression: sys.babProgression || "medium",

        // Defenses
        defenses: {
            fortitude: sys.defenses?.fortitude ?? 0,
            reflex: sys.defenses?.reflex ?? 0,
            will: sys.defenses?.will ?? 0
        },

        // Skills
        // NOTE: Data model may migrate snake_case to camelCase, so check both
        trainedSkills: sys.trainedSkills ?? sys.trained_skills ?? 0,
        classSkills: sys.classSkills || sys.class_skills || [],

        // Talent Trees (names only - will be resolved to IDs later)
        talentTreeNames: sys.talent_trees || [],
        talentTreeIds: [],  // Populated by ClassesDB after TalentTreeDB is loaded

        // Role (derived)
        role: inferClassRole(sys.talent_trees),

        // Progression
        levelProgression: sys.level_progression || [],
        startingFeatures: sys.starting_features || [],

        // Force Points
        // Note: These flags are for PRESTIGE class logic only
        // The actual FP calculation is actor-derived and uses these as inputs
        grantsForcePoints: sys.grants_force_points ?? true,
        forcePointBase: sys.force_point_base ?? null,  // 7 for Force Disciple/Jedi Master/Sith Lord, null otherwise

        // Starting Resources
        baseHp: sys.base_hp ?? 0,
        startingCredits: sys.starting_credits ?? null,

        // Metadata
        description: sys.description || "",
        img: rawClass.img || "icons/svg/item-bag.svg"
    };
}

/**
 * Safe accessor for class values.
 * Prevents undefined crashes when reading class data.
 *
 * @param {Object} classDoc - Class document (raw or normalized)
 * @param {string} key - Key to access
 * @param {*} defaultValue - Default value if key missing
 * @returns {*} - Value or default
 */
export function getClassValue(classDoc, key, defaultValue = null) {
    if (!classDoc) {
        console.warn(`[ClassNormalizer] getClassValue called with null classDoc for key: ${key}`);
        return defaultValue;
    }

    // Handle nested keys (e.g., "system.hitDie")
    const keys = key.split('.');
    let value = classDoc;

    for (const k of keys) {
        if (value === null || value === undefined) {
            return defaultValue;
        }
        value = value[k];
    }

    return value !== undefined ? value : defaultValue;
}

/**
 * Validate a normalized class definition.
 * Throws if critical fields are missing.
 *
 * @param {Object} normalizedClass - Normalized class object
 * @throws {Error} - If validation fails
 */
export function validateClass(normalizedClass) {
    const required = ['id', 'name', 'hitDie', 'babProgression'];
    const missing = required.filter(field => !normalizedClass[field]);

    if (missing.length > 0) {
        throw new Error(`[ClassNormalizer] Invalid class definition - missing fields: ${missing.join(', ')}`);
    }

    // Validate hit die
    if (![6, 8, 10, 12].includes(normalizedClass.hitDie)) {
        throw new Error(`[ClassNormalizer] Invalid hit die: ${normalizedClass.hitDie} for class ${normalizedClass.name}`);
    }

    // Validate BAB progression
    const validBAB = ['slow', 'medium', 'fast'];
    if (!validBAB.includes(normalizedClass.babProgression)) {
        throw new Error(`[ClassNormalizer] Invalid BAB progression: ${normalizedClass.babProgression} for class ${normalizedClass.name}`);
    }

    return true;
}
