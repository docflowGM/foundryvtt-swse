/**
 * CLASS NORMALIZER
 * Normalizes class documents to ensure consistent structure for progression engine.
 *
 * Standardizes:
 * - Hit die format
 * - BAB progression rates
 * - Class skills lists
 * - Talent trees
 * - Level progression data
 */

import { SWSELogger } from '../../utils/logger.js';

export const ClassNormalizer = {

    /**
     * Normalize an entire class document
     * NOTE: Compendium may use camelCase or snake_case property names
     */
    normalizeClassDoc(classDoc) {
        if (!classDoc || !classDoc.system) {
            return classDoc;
        }

        const sys = classDoc.system;

        // Normalize basic properties - check both naming conventions
        sys.hit_die = this._normalizeHitDie(sys.hitDie || sys.hit_die);
        sys.hitDie = sys.hit_die; // Keep both for compatibility
        sys.babProgression = this._normalizeBabProgression(sys.babProgression || sys.bab_progression);
        sys.class_skills = this._normalizeSkillsList(sys.classSkills || sys.class_skills);
        sys.classSkills = sys.class_skills; // Keep both for compatibility
        sys.talent_trees = this._normalizeTalentTrees(sys.talentTrees || sys.talent_trees);
        sys.talentTrees = sys.talent_trees; // Keep both for compatibility
        sys.level_progression = this._normalizeLevelProgression(sys.levelProgression || sys.level_progression);
        sys.levelProgression = sys.level_progression; // Keep both for compatibility

        SWSELogger.log(`Normalized class: ${classDoc.name}`);
        return classDoc;
    },

    /**
     * Normalize hit die to standard format (e.g., "1d8")
     * @private
     */
    _normalizeHitDie(die) {
        if (!die) return '1d6';

        // Already in correct format
        if (typeof die === 'string' && die.match(/^\d+d\d+$/)) {
            return die;
        }

        // Convert number to die (e.g., 8 -> "1d8")
        if (typeof die === 'number') {
            return `1d${die}`;
        }

        // Default
        return '1d6';
    },

    /**
     * Normalize BAB progression to standard rates
     * @private
     */
    _normalizeBabProgression(val) {
        const rateMap = {
            'fast': 'fast',
            'medium': 'medium',
            'slow': 'slow',
            '1.0': 'fast',
            '0.75': 'medium',
            '0.5': 'slow'
        };

        const normalized = String(val || 'medium').toLowerCase().trim();
        return rateMap[normalized] || 'medium';
    },

    /**
     * Normalize class skills list
     * @private
     */
    _normalizeSkillsList(arr) {
        if (!arr) return [];
        if (!Array.isArray(arr)) return [];

        return arr
            .map(skill => String(skill).trim())
            .filter(skill => skill.length > 0);
    },

    /**
     * Normalize talent trees list
     * @private
     */
    _normalizeTalentTrees(arr) {
        if (!arr) return [];
        if (!Array.isArray(arr)) return [];

        return arr
            .map(tree => String(tree).trim())
            .filter(tree => tree.length > 0);
    },

    /**
     * Normalize level progression data
     * @private
     */
    _normalizeLevelProgression(levels) {
        if (!levels) return [];
        if (!Array.isArray(levels)) return [];

        return levels.map(level => {
            if (!level) return null;

            return {
                level: Number(level.level ?? 1),
                bab: Number(level.bab ?? 0),
                force_points: Number(level.force_points ?? 0),
                features: Array.isArray(level.features) ? level.features : [],
                defense_bonus: Number(level.defense_bonus ?? 0),
                bonus_talents: Number(level.bonus_talents ?? 0),
                bonus_feats: Number(level.bonus_feats ?? 0)
            };
        }).filter(l => l !== null);
    },

    /**
     * Validate a normalized class document
     * NOTE: Checks both camelCase and snake_case property names
     */
    validate(classDoc) {
        const errors = [];
        const sys = classDoc.system;

        if (!classDoc.name) {
            errors.push('Class must have a name');
        }

        if (!(sys.hitDie || sys.hit_die)) {
            errors.push('Class must have a hit die');
        }

        const bab = sys.babProgression || sys.bab_progression;
        if (!['fast', 'medium', 'slow'].includes(bab)) {
            errors.push('Invalid BAB progression: ' + bab);
        }

        const levelProg = sys.levelProgression || sys.level_progression;
        if (!Array.isArray(levelProg)) {
            errors.push('Class must have level progression');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get class features for a specific level
     * NOTE: Checks both camelCase and snake_case property names
     */
    getFeaturesForLevel(classDoc, level) {
        const levelProg = classDoc.system.levelProgression || classDoc.system.level_progression;
        if (!levelProg) return [];

        const levelData = levelProg.find(l => l.level === level);
        return levelData ? levelData.features : [];
    }
};

export default ClassNormalizer;
