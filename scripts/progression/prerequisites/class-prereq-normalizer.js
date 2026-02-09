/**
 * ============================================
 * Class Prerequisite Normalizer
 * ============================================
 *
 * Invariant:
 * The prerequisite engine consumes ONLY normalized prerequisites.
 * Raw class data is never interpreted directly by the engine.
 *
 * This normalizer is the single adapter layer that:
 * 1. Reads raw class documents from classes.db
 * 2. Derives/normalizes prerequisites into canonical structure
 * 3. Converts names → database IDs (feats, talent trees)
 * 4. Feeds structured output to the prerequisite engine
 *
 * ============================================
 */

import { PRESTIGE_PREREQUISITES } from '../../data/prestige-prerequisites.js';
import { TalentTreeDB } from '../../data/talent-tree-db.js';

/**
 * Talent tree name → ID mapping (from talent_trees.db)
 * Keep this in sync with actual database.
 */
const TALENT_TREE_IDS = {
    'Awareness': '1c48d1cd9ab1f5c8',
    'Armor Specialist': '17cec542331cb4e4',
    'Brawler': '67fdd8dce9abd6c1',
    'Camouflage': '3926d582d2077489',
    'Commando': '798ed0945cbdac1c',
    'Dark Side Devotee': '96ef43a3054dcb58',
    'Disgrace': 'e91cc675fbf9ba6e',
    'Force Adept': 'e35ee41362604227',
    'Force Item': '01e443d93e47f9c4',
    'Fortune': 'cee9b9398682b7d0',
    'Influence': '8375b9b26b679901',
    'Leadership': '5964237d22681dc0',
    'Lineage': 'b5bb4154688c66ab',
    'Mercenary': '4007fa87192b5884',
    'Misfortune': '67b59e020c1660eb',
    'Smuggling': '9f7ca12cc084737a',
    'Spacer': '5ea8c79492d40713',
    'Spy': '7c42882a1347ef18',
    'Survivor': '9b06340233eb3cdd',
    'Veteran': '96c390430d7a4975',
    'Weapon Specialist': '2e9265a596cc43f7'
};

/**
 * Feat name → ID mapping (from feats.db)
 * Includes only feats used in prestige class prerequisites.
 */
const FEAT_IDS = {
    'Vehicular Combat': '1f2f70d34a17667d',
    'Sniper': '56367f3943ee8c17',
    'Martial Arts I': '92f927c92ded9fcf',
    'Armor Proficiency (Medium)': 'd445051370a88a7f',
    'Armor Proficiency (medium)': 'd445051370a88a7f',
    'Point-Blank Shot': '05459ac4d439f229',
    'Precise Shot': 'c180eee7d3bc29b2',
    'Quick Draw': '44705a692e2f01a6',
    'Weapon Proficiency (Pistols)': 'e5d361d01d1b44e4',
    'Force Sensitivity': 'ddbeb23013d9e917',
    'Improved Damage Threshold': '96666de28ba99b64',
    'Advanced Melee Weapon Proficiency': 'cf28ec45cabaff59',
    'Weapon Proficiency (Advanced Melee Weapons)': 'cf28ec45cabaff59',
    'Melee Defense': '3a847230d573a623',
    'Rapid Strike': 'ccb33e58342499a3',
    'Surgical Expertise': 'f9ae5b531ae01fd0',
    'Skill Focus (Knowledge (Bureaucracy))': '1592aaedf4b6e40a',
    'Skill Focus (Stealth)': '1592aaedf4b6e40a',
    'Skill Focus (Mechanics)': '1592aaedf4b6e40a',
    'Weapon Focus (Melee Weapon)': 'c41814601364b643',
    'Martial Arts II': '5bedd71f0eead6b9',
    'Biotech Specialist': 'bf6c01fa590a3f75',
    'Flurry': '0536f81eff886234',
    // Lightsaber-related (talent IDs, not feats)
    'Weapon Proficiency (Lightsabers)': '6fe17dc4f0f03c12'  // Lightsaber Specialist talent
};

/**
 * Normalize a class document into engine-readable prerequisites.
 *
 * Entry point: Convert raw class data → normalized structure
 *
 * @param {Object} classDoc - Class document from classes.db
 * @returns {Object|null} - Normalized prerequisites or null if not prestige
 *
 * Output shape:
 * {
 *   minLevel: number,
 *   minBAB: number,
 *   skills: string[],
 *   feats: { allOf: string[], anyOf: string[] },
 *   talents: { count: number, treeIds: string[], specific: string[] },
 *   forcePowers: string[],
 *   forceTechniques: number,
 *   darkSideScore: string,
 *   species: string[],
 *   droidSystems: string[],
 *   special: string
 * }
 */
export function normalizeClassPrerequisites(classDoc) {
    if (!classDoc || !classDoc.name) {
        return null;
    }

    // Look up prestige class data from authoritative source
    const rawPrereqs = PRESTIGE_PREREQUISITES[classDoc.name];
    if (!rawPrereqs) {
        // Not a prestige class
        return null;
    }

    // Build normalized structure
    const normalized = {};

    // Copy direct numeric fields
    if (rawPrereqs.minLevel) {
        normalized.minLevel = rawPrereqs.minLevel;
    }
    if (rawPrereqs.minBAB) {
        normalized.minBAB = rawPrereqs.minBAB;
    }

    // Skills (direct passthrough - engine will match by name)
    if (rawPrereqs.skills && rawPrereqs.skills.length > 0) {
        normalized.skills = rawPrereqs.skills;
    }

    // Feats with ID conversion
    if (rawPrereqs.feats || rawPrereqs.featsAny) {
        normalized.feats = {
            allOf: rawPrereqs.feats ? convertFeatNamesToIds(rawPrereqs.feats) : [],
            anyOf: rawPrereqs.featsAny ? convertFeatNamesToIds(rawPrereqs.featsAny) : []
        };
    }

    // Talents with tree ID conversion
    if (rawPrereqs.talents) {
        normalized.talents = normalizeTalentRequirements(rawPrereqs.talents);
    }

    // Force powers (direct passthrough - engine will match by name)
    if (rawPrereqs.forcePowers && rawPrereqs.forcePowers.length > 0) {
        normalized.forcePowers = rawPrereqs.forcePowers;
    }

    // Force techniques
    if (rawPrereqs.forceTechniques) {
        normalized.forceTechniques = rawPrereqs.forceTechniques.count || 1;
    }

    // Dark Side Score
    if (rawPrereqs.darkSideScore) {
        normalized.darkSideScore = rawPrereqs.darkSideScore;
    }

    // Species
    if (rawPrereqs.species && rawPrereqs.species.length > 0) {
        normalized.species = rawPrereqs.species;
    }

    // Droid systems
    if (rawPrereqs.droidSystems && rawPrereqs.droidSystems.length > 0) {
        normalized.droidSystems = rawPrereqs.droidSystems;
    }

    // Special conditions (narrative/campaign-specific)
    if (rawPrereqs.special) {
        normalized.special = rawPrereqs.special;
    }

    return normalized;
}

/**
 * Known feat flag requirements (feats with semantic flags, not IDs).
 * These feats are identified by a flag on the feat document, not by ID.
 */
const FEAT_FLAGS = {
    'Martial Arts Feat': 'martialArtsFeat'
};

/**
 * Convert feat names to their database IDs or flag checks.
 * Handles both specific feats (by ID) and flag-based feat groups.
 *
 * @param {string[]} featNames
 * @returns {Array} - Array of IDs, names, or { flag: flagName } objects
 */
function convertFeatNamesToIds(featNames) {
    if (!Array.isArray(featNames)) {
        return [];
    }

    return featNames.map(name => {
        // Check if this is a flag-based requirement
        if (name in FEAT_FLAGS) {
            return { flag: FEAT_FLAGS[name] };
        }

        // Case-insensitive lookup for exact feat ID matches
        for (const [featName, featId] of Object.entries(FEAT_IDS)) {
            if (featName.toLowerCase() === name.toLowerCase()) {
                return featId;
            }
        }

        // Fallback: return the name (shouldn't happen in normal operation)
        console.warn(`[ClassPrereqNormalizer] Unknown feat: ${name}`);
        return name;
    });
}

/**
 * Convert talent tree requirements to canonical form with tree IDs.
 *
 * @param {Object} talentReq - Talent requirement from PRESTIGE_PREREQUISITES
 * @returns {Object} - Normalized talent requirement
 *
 * Input examples:
 * - { count: 2, trees: ["Awareness"] }
 * - { count: 1, trees: ["Fortune", "Lineage", "Misfortune"] }
 * - { specific: ["Dastardly Strike"] }
 * - { count: 3, forceTalentsOnly: true }
 *
 * Output:
 * - { count: 2, treeIds: ["1c48d1cd9ab1f5c8"], specific: [] }
 */
function normalizeTalentRequirements(talentReq) {
    const normalized = {
        count: talentReq.count || 0,
        treeIds: [],
        specific: talentReq.specific || []
    };

    // Convert tree names to IDs
    if (talentReq.trees && Array.isArray(talentReq.trees)) {
        normalized.treeIds = talentReq.trees.map(treeName => {
            const treeId = TALENT_TREE_IDS[treeName];
            if (!treeId) {
                console.warn(`[ClassPrereqNormalizer] Unknown talent tree: ${treeName}`);
                return treeName; // Fallback to name
            }
            return treeId;
        });
    }

    // Force talents only flag
    if (talentReq.forceTalentsOnly) {
        normalized.forceTalentsOnly = true;
    }

    return normalized;
}

/**
 * Get all prestige classes with normalized prerequisites.
 * Useful for bulk operations or validation.
 *
 * @returns {Object} - Map of className → normalized prerequisites
 */
export function getAllNormalizedPrestigeClassPrerequisites() {
    const normalized = {};

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        const mockClassDoc = { name: className };
        normalized[className] = normalizeClassPrerequisites(mockClassDoc);
    }

    return normalized;
}

/**
 * Validate that all talent tree names are mapped to IDs.
 * Dev utility to catch missing mappings.
 *
 * @returns {Object} - { missing: string[], mapped: number }
 */
export function validateTalentTreeMappings() {
    const missing = [];
    let mapped = 0;

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        const prereqs = PRESTIGE_PREREQUISITES[className];
        if (prereqs.talents && prereqs.talents.trees) {
            for (const treeName of prereqs.talents.trees) {
                if (!TALENT_TREE_IDS[treeName]) {
                    missing.push(`${className}: "${treeName}"`);
                } else {
                    mapped++;
                }
            }
        }
    }

    return { missing, mapped };
}

/**
 * Validate that all feat names are mapped to IDs or flags.
 * Dev utility to catch missing mappings.
 *
 * @returns {Object} - { missing: string[], mapped: number, flagged: number }
 */
export function validateFeatMappings() {
    const missing = [];
    let mapped = 0;
    let flagged = 0;

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        const prereqs = PRESTIGE_PREREQUISITES[className];
        const feats = [...(prereqs.feats || []), ...(prereqs.featsAny || [])];

        for (const featName of feats) {
            // Check if this is a flag-based requirement
            if (featName in FEAT_FLAGS) {
                flagged++;
                continue;
            }

            let found = false;
            for (const mappedName of Object.keys(FEAT_IDS)) {
                if (mappedName.toLowerCase() === featName.toLowerCase()) {
                    found = true;
                    mapped++;
                    break;
                }
            }
            if (!found) {
                missing.push(`${className}: "${featName}"`);
            }
        }
    }

    return { missing, mapped, flagged };
}

/**
 * Audit output: Validate that normalized prerequisites are clean and consistent.
 * Run this to ensure all prestige classes normalize correctly.
 *
 * @returns {Object} - Audit report
 */
export function auditNormalizedOutput() {
    const report = {
        totalClasses: 0,
        normalized: 0,
        errors: [],
        warnings: []
    };

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        report.totalClasses++;
        const mockDoc = { name: className };
        try {
            const normalized = normalizeClassPrerequisites(mockDoc);
            if (normalized) {
                report.normalized++;
            }
        } catch (error) {
            report.errors.push(`${className}: ${error.message}`);
        }
    }

    const treeValidation = validateTalentTreeMappings();
    const featValidation = validateFeatMappings();

    if (treeValidation.missing.length > 0) {
        report.warnings.push(`Missing talent tree mappings: ${treeValidation.missing.join(', ')}`);
    }
    if (featValidation.missing.length > 0) {
        report.warnings.push(`Missing feat mappings: ${featValidation.missing.join(', ')}`);
    }
    if (featValidation.flagged > 0) {
        report.info = `${featValidation.flagged} feat(s) resolved by flag check`;
    }
    report.featStats = { mapped: featValidation.mapped, flagged: featValidation.flagged };

    return report;
}
