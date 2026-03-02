/**
 * SWSE Archetype Registry
 *
 * Immutable, in-memory registry of archetype metadata.
 * Archetypes define character build directions, prerequisites, and prestige paths.
 *
 * This is a data-only layer — no scoring logic.
 * All archetype items are loaded on game ready and cached.
 *
 * Phase A & B: Registry and initialization
 * Phase 1.5: Used by SuggestionEngine for alignment scoring
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ArchetypeRegistry {
    // Immutable cache
    static #archetypes = new Map();
    static #initialized = false;

    /**
     * Initialize the registry by loading all archetype items
     * Called once on game ready
     * @returns {Promise<void>}
     */
    static async initialize() {
        if (this.#initialized) {
            SWSELogger.log('[ArchetypeRegistry] Already initialized, skipping');
            return;
        }

        try {
            // Load archetypes from class-archetypes.json
            await this._loadFromJSON();

            // Load custom archetypes from world items
            const archetypeItems = game.items.filter(item => item.type === 'archetype');
            SWSELogger.log(`[ArchetypeRegistry] Loading ${archetypeItems.length} custom archetypes from world`);

            for (const item of archetypeItems) {
                const archetype = this._parseArchetypeItem(item);
                if (archetype) {
                    this.#archetypes.set(item.id, archetype);
                    SWSELogger.log(
                        `[ArchetypeRegistry] Loaded (custom): "${item.name}" ` +
                        `(id: ${item.id}, class: ${archetype.baseClassId})`
                    );
                }
            }

            this.#initialized = true;
            SWSELogger.log(`[ArchetypeRegistry] Initialization complete. Total: ${this.#archetypes.size}`);
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Initialization failed:', err);
            this.#initialized = false;
        }
    }

    /**
     * Load archetypes from class-archetypes.json
     * @private
     * @returns {Promise<void>}
     */
    static async _loadFromJSON() {
        try {
            const response = await fetch('/systems/foundryvtt-swse/data/class-archetypes.json');
            const data = await response.json();

            SWSELogger.log(`[ArchetypeRegistry] Loading archetypes from class-archetypes.json`);

            // Iterate through classes and archetypes
            for (const [className, classData] of Object.entries(data.classes || {})) {
                for (const [archId, archData] of Object.entries(classData.archetypes || {})) {
                    const archetype = this._parseJSONArchetype(className, archId, archData);
                    if (archetype) {
                        // Use class-id format as key to avoid conflicts with world items
                        const key = `${className}-${archId}`;
                        this.#archetypes.set(key, archetype);
                        SWSELogger.log(
                            `[ArchetypeRegistry] Loaded (json): "${archetype.name}" ` +
                            `(class: ${className})`
                        );
                    }
                }
            }
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Failed to load from class-archetypes.json:', err);
        }
    }

    /**
     * Parse archetype from class-archetypes.json format
     * @private
     * @param {string} className - Class ID (e.g., 'jedi')
     * @param {string} archetypeId - Archetype ID (e.g., 'guardian_defender')
     * @param {Object} archData - Archetype data from JSON
     * @returns {Object|null} Parsed archetype or null if invalid
     */
    static _parseJSONArchetype(className, archetypeId, archData) {
        try {
            if (!archData.name) {
                SWSELogger.warn(`[ArchetypeRegistry] Archetype "${archetypeId}" missing name`);
                return null;
            }

            // Extract roles from roleBias (keys with value > 1.0 indicate primary roles)
            const roleBias = archData.roleBias || {};
            const roles = Object.entries(roleBias)
                .filter(([_, value]) => value > 1.0)
                .map(([role, _]) => role);

            // Extract attribute priority from attributeBias (sorted by weight, descending)
            const attributeBias = archData.attributeBias || {};
            const attributePriority = Object.entries(attributeBias)
                .sort(([_, a], [__, b]) => b - a)
                .map(([attr, _]) => attr);

            // Convert keyword recommendations to arrays (we'll need item lookup during runtime)
            const talentKeywords = archData.talentKeywords || [];
            const featKeywords = archData.featKeywords || [];

            return {
                id: `${className}-${archetypeId}`,
                name: archData.name,
                baseClassId: className,
                roles: roles.length > 0 ? roles : ['generalist'],
                prestigeTargets: [], // Not defined in JSON, can be added later
                attributePriority: attributePriority.length > 0 ? attributePriority : [],
                recommended: {
                    feats: featKeywords, // Store as keywords for now
                    talents: talentKeywords, // Store as keywords for now
                    skills: []
                },
                weights: {
                    feat: 1,
                    talent: 1,
                    prestige: 1,
                    skill: 1
                },
                mechanicalBias: archData.mechanicalBias || {},
                roleBias: roleBias,
                attributeBias: attributeBias,
                notes: archData.notes || '',
                status: archData.status || 'active'
            };
        } catch (err) {
            SWSELogger.error(`[ArchetypeRegistry] Error parsing JSON archetype "${archetypeId}":`, err);
            return null;
        }
    }

    /**
     * Get an archetype by ID
     * @param {string} archetypeId - Archetype item ID
     * @returns {Object|null} Archetype data or null if not found
     */
    static get(archetypeId) {
        if (!this.#initialized) {
            SWSELogger.warn('[ArchetypeRegistry] Not yet initialized');
            return null;
        }

        return this.#archetypes.get(archetypeId) || null;
    }

    /**
     * Get all archetypes for a given base class
     * @param {string} baseClassId - Class ID (e.g., 'jedi', 'soldier')
     * @returns {Array} Array of archetype objects
     */
    static getByClass(baseClassId) {
        if (!this.#initialized) {
            return [];
        }

        const result = [];
        for (const archetype of this.#archetypes.values()) {
            if (archetype.baseClassId === baseClassId) {
                result.push(archetype);
            }
        }

        return result;
    }

    /**
     * Get all registered archetypes
     * @returns {Array} Array of all archetype objects
     */
    static getAll() {
        if (!this.#initialized) {
            return [];
        }

        return Array.from(this.#archetypes.values());
    }

    /**
     * Check if registry is initialized
     * @returns {boolean}
     */
    static isInitialized() {
        return this.#initialized;
    }

    /**
     * Get registry statistics
     * @returns {Object} {initialized, count, classes}
     */
    static getStats() {
        const classes = new Set();
        for (const archetype of this.#archetypes.values()) {
            classes.add(archetype.baseClassId);
        }

        return {
            initialized: this.#initialized,
            count: this.#archetypes.size,
            classes: Array.from(classes)
        };
    }

    /**
     * Parse archetype item into registry format
     * Validates schema and extracts data
     * @private
     * @param {Object} item - Archetype item document
     * @returns {Object|null} Parsed archetype or null if invalid
     */
    static _parseArchetypeItem(item) {
        try {
            const system = item.system || {};

            // Required fields
            if (!system.baseClassId) {
                SWSELogger.warn(`[ArchetypeRegistry] Archetype "${item.name}" missing baseClassId`);
                return null;
            }

            // Parse recommended items (ensure arrays)
            const recommended = system.recommended || {};
            const feats = Array.isArray(recommended.feats) ? recommended.feats : [];
            const talents = Array.isArray(recommended.talents) ? recommended.talents : [];
            const skills = Array.isArray(recommended.skills) ? recommended.skills : [];

            // Parse prestige targets (ensure array)
            const prestigeTargets = Array.isArray(system.prestigeTargets)
                ? system.prestigeTargets
                : (system.prestigeTargets ? [system.prestigeTargets] : []);

            // Parse attribute priority (ensure array)
            const attributePriority = Array.isArray(system.attributePriority)
                ? system.attributePriority
                : (system.attributePriority ? [system.attributePriority] : []);

            // Parse roles (ensure array)
            const roles = Array.isArray(system.roles)
                ? system.roles
                : (system.roles ? [system.roles] : []);

            // Parse weights (defaults to 1 if missing)
            const weights = system.weights || {};
            const parsedWeights = {
                feat: weights.feat || 1,
                talent: weights.talent || 1,
                prestige: weights.prestige || 1,
                skill: weights.skill || 1
            };

            return {
                id: item.id,
                name: item.name,
                baseClassId: system.baseClassId,
                roles,
                prestigeTargets,
                attributePriority,
                recommended: {
                    feats,
                    talents,
                    skills
                },
                weights: parsedWeights
            };
        } catch (err) {
            SWSELogger.error(`[ArchetypeRegistry] Error parsing archetype "${item.name}":`, err);
            return null;
        }
    }

    /**
     * Check if an item ID is in archetype's recommended feats
     * @param {string} itemId - Item ID
     * @param {Object} archetype - Archetype object
     * @returns {boolean}
     */
    static isRecommendedFeat(itemId, archetype) {
        return archetype?.recommended?.feats?.includes(itemId) || false;
    }

    /**
     * Check if an item ID is in archetype's recommended talents
     * @param {string} itemId - Item ID
     * @param {Object} archetype - Archetype object
     * @returns {boolean}
     */
    static isRecommendedTalent(itemId, archetype) {
        return archetype?.recommended?.talents?.includes(itemId) || false;
    }

    /**
     * Check if a skill is in archetype's recommended skills
     * @param {string} skillKey - Skill key (e.g., 'useTheForce')
     * @param {Object} archetype - Archetype object
     * @returns {boolean}
     */
    static isRecommendedSkill(skillKey, archetype) {
        return archetype?.recommended?.skills?.includes(skillKey) || false;
    }

    /**
     * Check if archetype targets a prestige class
     * @param {string} prestigeClassId - Prestige class ID
     * @param {Object} archetype - Archetype object
     * @returns {boolean}
     */
    static targetsPrestige(prestigeClassId, archetype) {
        return archetype?.prestigeTargets?.includes(prestigeClassId) || false;
    }

    /**
     * Get weight multiplier for item type in archetype
     * @param {string} itemType - 'feat', 'talent', 'skill', 'prestige'
     * @param {Object} archetype - Archetype object
     * @returns {number} Weight (1.0 default)
     */
    static getWeight(itemType, archetype) {
        if (!archetype?.weights) return 1.0;
        return archetype.weights[itemType] || 1.0;
    }

    /**
     * Get prestige signals for a prestige class
     * Looks up which archetypes target this prestige and returns their recommended items
     * This replaces hardcoded PRESTIGE_SIGNALS lookups
     *
     * @param {string} prestigeId - Prestige class item ID (or name as fallback)
     * @returns {Object|null} Signals object {feats, skills, talents, talentTrees, abilities, weight} or null if not found
     */
    static getPrestigeSignals(prestigeId) {
        if (!this.#initialized || !prestigeId) {
            return null;
        }

        // Search through all archetypes for those targeting this prestige
        for (const archetype of this.#archetypes.values()) {
            if (archetype.prestigeTargets && archetype.prestigeTargets.includes(prestigeId)) {
                // Return signals in standard format (compatible with PRESTIGE_SIGNALS schema)
                return {
                    feats: archetype.recommended?.feats || [],
                    skills: archetype.recommended?.skills || [],
                    talents: archetype.recommended?.talents || [],
                    talentTrees: [], // Note: archetype registry doesn't store talent trees separately
                    abilities: archetype.attributePriority || [],
                    weight: {
                        feats: archetype.weights?.feat || 1,
                        skills: archetype.weights?.skill || 1,
                        talents: archetype.weights?.talent || 1,
                        abilities: 1 // Default weight for abilities
                    }
                };
            }
        }

        return null;
    }

    /**
     * Resolve feat keywords to item IDs by searching compendiums
     * Matches feat names against keyword list with fuzzy matching
     * @param {Array<string>} keywords - Feat keywords (e.g., ['Weapon Focus (Lightsabers)'])
     * @returns {Promise<Array<string>>} Array of feat item IDs
     */
    static async resolveFeatKeywords(keywords) {
        try {
            if (!Array.isArray(keywords) || keywords.length === 0) {
                return [];
            }

            const results = [];
            const pack = game.packs.get('foundryvtt-swse.feats');

            if (!pack) {
                SWSELogger.warn('[ArchetypeRegistry] Feats compendium not found');
                return [];
            }

            const index = await pack.getIndex();

            for (const keyword of keywords) {
                const match = this._findBestMatch(keyword, index);

                if (match) {
                    results.push(match._id);
                    SWSELogger.debug(
                        `[ArchetypeRegistry] Resolved feat keyword "${keyword}" to "${match.name}"`
                    );
                } else {
                    SWSELogger.debug(`[ArchetypeRegistry] Feat keyword not resolved: "${keyword}"`);
                }
            }

            return results;
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Error resolving feat keywords:', err);
            return [];
        }
    }

    /**
     * Resolve talent keywords to item IDs by searching compendiums
     * Matches talent names against keyword list with fuzzy matching
     * @param {Array<string>} keywords - Talent keywords (e.g., ['Block', 'Deflect'])
     * @returns {Promise<Array<string>>} Array of talent item IDs
     */
    static async resolveTalentKeywords(keywords) {
        try {
            if (!Array.isArray(keywords) || keywords.length === 0) {
                return [];
            }

            const results = [];
            const pack = game.packs.get('foundryvtt-swse.talents');

            if (!pack) {
                SWSELogger.warn('[ArchetypeRegistry] Talents compendium not found');
                return [];
            }

            const index = await pack.getIndex();

            for (const keyword of keywords) {
                const match = this._findBestMatch(keyword, index);

                if (match) {
                    results.push(match._id);
                    SWSELogger.debug(
                        `[ArchetypeRegistry] Resolved talent keyword "${keyword}" to "${match.name}"`
                    );
                } else {
                    SWSELogger.debug(`[ArchetypeRegistry] Talent keyword not resolved: "${keyword}"`);
                }
            }

            return results;
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Error resolving talent keywords:', err);
            return [];
        }
    }

    /**
     * Get resolved recommendations (item IDs) for an archetype
     * Converts talentKeywords and featKeywords to actual item IDs
     * @param {string} archetypeId - Archetype ID
     * @returns {Promise<Object|null>} { feats: [ids], talents: [ids], skills: [] } or null
     */
    static async getResolvedRecommendations(archetypeId) {
        try {
            const archetype = this.get(archetypeId);
            if (!archetype) {
                return null;
            }

            const [resolvedFeats, resolvedTalents] = await Promise.all([
                this.resolveFeatKeywords(archetype.recommended?.feats || []),
                this.resolveTalentKeywords(archetype.recommended?.talents || [])
            ]);

            return {
                feats: resolvedFeats,
                talents: resolvedTalents,
                skills: archetype.recommended?.skills || []
            };
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Error getting resolved recommendations:', err);
            return null;
        }
    }

    /**
     * Get all archetypes for a class with resolved recommendations
     * @param {string} baseClassId - Class ID (e.g., 'jedi')
     * @returns {Promise<Array>} Archetypes with resolved recommendations
     */
    static async getByClassResolved(baseClassId) {
        try {
            const archetypes = this.getByClass(baseClassId);
            const results = [];

            for (const archetype of archetypes) {
                const resolved = await this.getResolvedRecommendations(archetype.id);
                if (resolved) {
                    results.push({
                        ...archetype,
                        recommendedIds: resolved
                    });
                }
            }

            return results;
        } catch (err) {
            SWSELogger.error('[ArchetypeRegistry] Error getting class archetypes resolved:', err);
            return [];
        }
    }

    /**
     * Find best matching item for a keyword using fuzzy matching
     * Strategy:
     * 1. Exact match (normalized)
     * 2. Substring match (keyword contains item name or vice versa)
     * 3. Levenshtein distance (most similar)
     * @private
     * @param {string} keyword - The keyword to find
     * @param {Array} indexItems - Compendium index items
     * @returns {Object|null} Best matching item or null
     */
    static _findBestMatch(keyword, indexItems) {
        const normalized = this._normalizeKeyword(keyword);

        // Strategy 1: Exact match
        const exactMatch = indexItems.find(item =>
            this._normalizeKeyword(item.name) === normalized
        );
        if (exactMatch) return exactMatch;

        // Strategy 2: Substring match (either direction)
        const substringMatches = indexItems.filter(item => {
            const itemNorm = this._normalizeKeyword(item.name);
            return itemNorm.includes(normalized) || normalized.includes(itemNorm);
        });

        if (substringMatches.length > 0) {
            // Return the shortest matching name (most specific)
            return substringMatches.reduce((best, current) =>
                current.name.length < best.name.length ? current : best
            );
        }

        // Strategy 3: Levenshtein distance (fuzzy match)
        let bestMatch = null;
        let bestDistance = Infinity;
        const threshold = 0.6; // 60% similarity

        for (const item of indexItems) {
            const distance = this._levenshteinDistance(normalized, this._normalizeKeyword(item.name));
            const maxLen = Math.max(normalized.length, item.name.length);
            const similarity = 1 - (distance / maxLen);

            if (similarity >= threshold && distance < bestDistance) {
                bestDistance = distance;
                bestMatch = item;
            }
        }

        return bestMatch;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Used for fuzzy matching
     * @private
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Edit distance
     */
    static _levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(b.length + 1)
            .fill(null)
            .map(() => Array(a.length + 1).fill(0));

        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,      // deletion
                    matrix[j - 1][i] + 1,      // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Normalize keyword for comparison (case-insensitive, trim)
     * @private
     * @param {string} keyword
     * @returns {string} Normalized keyword
     */
    static _normalizeKeyword(keyword) {
        return (keyword || '').toLowerCase().trim();
    }
}
