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
     */
    normalizeClassDoc(classDoc) {
        if (!classDoc || !classDoc.system) {
            return classDoc;
        }

        const sys = classDoc.system;

        // Normalize basic properties
        sys.hit_die = this._normalizeHitDie(sys.hit_die);
        sys.babProgression = this._normalizeBabProgression(sys.babProgression);
        sys.class_skills = this._normalizeSkillsList(sys.class_skills);
        sys.talent_trees = this._normalizeTalentTrees(sys.talent_trees);
        sys.level_progression = this._normalizeLevelProgression(sys.level_progression);

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
     */
    validate(classDoc) {
        const errors = [];

        if (!classDoc.name) {
            errors.push('Class must have a name');
        }

        if (!classDoc.system.hit_die) {
            errors.push('Class must have a hit die');
        }

        if (!['fast', 'medium', 'slow'].includes(classDoc.system.babProgression)) {
            errors.push('Invalid BAB progression: ' + classDoc.system.babProgression);
        }

        if (!Array.isArray(classDoc.system.level_progression)) {
            errors.push('Class must have level progression');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get class features for a specific level
     */
    getFeaturesForLevel(classDoc, level) {
        if (!classDoc.system.level_progression) return [];

        const levelData = classDoc.system.level_progression.find(l => l.level === level);
        return levelData ? levelData.features : [];
    }
};

export default ClassNormalizer;
