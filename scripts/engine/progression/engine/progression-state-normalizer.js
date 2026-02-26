/**
 * PROGRESSION STATE NORMALIZER
 * Normalizes the progression state stored on actor.system.progression.
 *
 * Ensures consistent data structure across all actors:
 * - Classes and levels
 * - Selected feats and talents
 * - Force progression (powers, techniques, secrets)
 * - Languages
 * - Trained skills
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const ProgressionStateNormalizer = {

    /**
     * Normalize entire progression state
     */
    normalize(state) {
        if (!state) {
            state = {};
        }

        // Normalize all properties
        state.species = String(state.species || '').trim();
        state.background = String(state.background || '').trim();
        state.classLevels = this._normalizeClassLevels(state.classLevels);
        state.talents = this._normalizeStringArray(state.talents);
        state.feats = this._normalizeStringArray(state.feats);
        state.force = this._normalizeForce(state.force);
        state.languages = this._normalizeStringArray(state.languages);
        state.trainedSkills = this._normalizeTrainedSkills(state.trainedSkills);
        state.startingFeats = this._normalizeStringArray(state.startingFeats);

        // Initialize missing structures
        state.featBudget = Number(state.featBudget ?? 0);
        state.talentBudget = Number(state.talentBudget ?? 0);
        state.skillPointsRemaining = Number(state.skillPointsRemaining ?? 0);

        return state;
    },

    /**
     * Normalize class levels array
     * @private
     */
    _normalizeClassLevels(classLevels) {
        if (!classLevels) {return [];}
        if (!Array.isArray(classLevels)) {return [];}

        return classLevels
            .filter(cl => cl && cl.class)
            .map(cl => ({
                class: String(cl.class).trim(),
                level: Number(cl.level ?? 1),
                features: Array.isArray(cl.features) ? cl.features : []
            }));
    },

    /**
     * Normalize string array (talents, feats, languages, etc.)
     * @private
     */
    _normalizeStringArray(arr) {
        if (!arr) {return [];}
        if (!Array.isArray(arr)) {return [];}

        return arr
            .map(item => String(item).trim())
            .filter(item => item.length > 0)
            .sort(); // Sort for consistency
    },

    /**
     * Normalize trained skills object
     * @private
     */
    _normalizeTrainedSkills(skills) {
        if (!skills) {return {};}
        if (typeof skills !== 'object') {return {};}

        const normalized = {};
        for (const [skillKey, trained] of Object.entries(skills)) {
            if (typeof trained === 'boolean' || trained === 'true' || trained === true) {
                normalized[String(skillKey).toLowerCase()] = true;
            }
        }
        return normalized;
    },

    /**
     * Normalize force progression
     * @private
     */
    _normalizeForce(forceData) {
        if (!forceData) {
            return {
                powers: [],
                techniques: [],
                secrets: [],
                pointPool: 0,
                regimen: ''
            };
        }

        return {
            powers: this._normalizeStringArray(forceData.powers),
            techniques: this._normalizeStringArray(forceData.techniques),
            secrets: this._normalizeStringArray(forceData.secrets),
            pointPool: Number(forceData.pointPool ?? 0),
            regimen: String(forceData.regimen || '').trim()
        };
    },

    /**
     * Validate normalized progression state
     */
    validate(state) {
        const errors = [];

        if (state.classLevels && !Array.isArray(state.classLevels)) {
            errors.push('classLevels must be an array');
        }

        if (state.talents && !Array.isArray(state.talents)) {
            errors.push('talents must be an array');
        }

        if (state.feats && !Array.isArray(state.feats)) {
            errors.push('feats must be an array');
        }

        if (state.force && typeof state.force !== 'object') {
            errors.push('force must be an object');
        }

        if (state.languages && !Array.isArray(state.languages)) {
            errors.push('languages must be an array');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get total character level from progression state
     */
    getTotalLevel(state) {
        if (!state.classLevels || !Array.isArray(state.classLevels)) {
            return 0;
        }

        return state.classLevels.reduce((sum, cl) => sum + (cl.level || 0), 0);
    },

    /**
     * Get class levels by class name
     */
    getClassLevel(state, className) {
        if (!state.classLevels || !Array.isArray(state.classLevels)) {
            return 0;
        }

        const classLevel = state.classLevels.find(cl => cl.class === className);
        return classLevel ? classLevel.level : 0;
    },

    /**
     * Get all classes
     */
    getClasses(state) {
        if (!state.classLevels || !Array.isArray(state.classLevels)) {
            return [];
        }

        return state.classLevels.map(cl => cl.class);
    },

    /**
     * Check if has a specific class
     */
    hasClass(state, className) {
        return this.getClassLevel(state, className) > 0;
    },

    /**
     * Get count of specific item type
     */
    getCount(state, type) {
        const key = type === 'feat' ? 'feats' : type === 'talent' ? 'talents' : type;
        const items = state[key];
        return Array.isArray(items) ? items.length : 0;
    }
};

export default ProgressionStateNormalizer;
