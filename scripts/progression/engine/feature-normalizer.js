/**
 * FEATURE NORMALIZER
 * Normalizes every feature from any source into a consistent, safe structure.
 *
 * All features must pass through this before dispatch to Feature Dispatcher.
 * Handles inconsistencies in feature definition across different sources.
 *
 * Standardizes:
 * - Feature name (handles name, title, label variants)
 * - Feature type (normalizes type strings)
 * - Value/amount (handles value, amount variants)
 * - Descriptions
 * - Item lists
 * - Scaling formulas
 */

import { ProgressionEngineHelpers as H } from './engine-helpers.js';
import { SWSELogger } from '../../utils/logger.js';

export const FeatureNormalizer = {

    /**
     * Normalize a single feature to standard structure
     */
    normalize(rawFeature) {
        if (!rawFeature) return this._empty();

        try {
            const normalized = {
                // Identity
                name: this._extractName(rawFeature),
                type: this._normalizeType(rawFeature.type),

                // Values
                value: rawFeature.value ?? rawFeature.amount ?? null,
                description: rawFeature.description ?? rawFeature.text ?? '',

                // Lists and selections
                items: rawFeature.items ?? rawFeature.choices ?? [],
                list: rawFeature.list ?? rawFeature.options ?? null,

                // Talent trees
                tree: rawFeature.tree ?? rawFeature.talentTree ?? null,
                trees: rawFeature.trees ?? rawFeature.talentTrees ?? null,

                // Scaling
                scaling: rawFeature.scaling ?? rawFeature.scale ?? null,
                formula: rawFeature.formula ?? rawFeature.expression ?? null,

                // Metadata
                tags: rawFeature.tags ?? [],
                prerequisites: rawFeature.prerequisites ?? null,

                // Keep original for inspection
                raw: rawFeature
            };

            return normalized;

        } catch (err) {
            SWSELogger.error('Feature normalization failed:', rawFeature, err);
            return this._empty();
        }
    },

    /**
     * Normalize a list of features
     */
    normalizeList(list) {
        if (!list) return [];
        if (!Array.isArray(list)) {
            SWSELogger.warn('FeatureNormalizer.normalizeList: expected array, got', typeof list);
            return [];
        }

        return list.map((f, i) => {
            try {
                return this.normalize(f);
            } catch (err) {
                SWSELogger.error(`Failed to normalize feature at index ${i}:`, f, err);
                return this._empty();
            }
        });
    },

    /**
     * Extract feature name from various possible properties
     * @private
     */
    _extractName(feature) {
        const candidates = [
            feature.name,
            feature.title,
            feature.label,
            feature.id,
            'Unnamed Feature'
        ];

        for (const name of candidates) {
            if (name && typeof name === 'string') {
                return name.trim();
            }
        }

        return 'Unnamed Feature';
    },

    /**
     * Normalize feature type string
     * @private
     */
    _normalizeType(typeStr) {
        if (!typeStr) return 'class_feature';

        const normalized = H.normalizeString(typeStr);

        // Map common variations to standard types
        const typeMap = {
            'feat_choice': 'feat_choice',
            'feat-choice': 'feat_choice',
            'featchoice': 'feat_choice',
            'choosefeat': 'feat_choice',

            'talent_choice': 'talent_choice',
            'talent-choice': 'talent_choice',
            'talentchoice': 'talent_choice',
            'choosetalent': 'talent_choice',

            'skill_choice': 'skill_choice',
            'skill-choice': 'skill_choice',
            'skillchoice': 'skill_choice',

            'force_power_choice': 'force_power_choice',
            'force-power-choice': 'force_power_choice',
            'forcepowerchoice': 'force_power_choice',

            'force_technique_choice': 'force_technique_choice',
            'force-technique-choice': 'force_technique_choice',
            'forcetechniquechoice': 'force_technique_choice',

            'force_secret_choice': 'force_secret_choice',
            'force-secret-choice': 'force_secret_choice',
            'forcesecretchoice': 'force_secret_choice',

            'feat_grant': 'feat_grant',
            'grantfeat': 'feat_grant',

            'language_grant': 'language_grant',
            'grantlanguage': 'language_grant',

            'equipment_grant': 'equipment_grant',
            'grantequipment': 'equipment_grant',

            'force_power_grant': 'force_power_grant',
            'grantforcepower': 'force_power_grant',

            'skill_training': 'skill_training',
            'trainskill': 'skill_training',

            'ability_increase': 'ability_increase',
            'abilityincrease': 'ability_increase',

            'hp_gain': 'hp_gain',
            'hpgain': 'hp_gain',

            'scaling_feature': 'scaling_feature',
            'scalingfeature': 'scaling_feature',

            'class_feature': 'class_feature',
            'classfeature': 'class_feature'
        };

        return typeMap[normalized] || normalized;
    },

    /**
     * Return empty normalized feature
     * @private
     */
    _empty() {
        return {
            name: '',
            type: 'class_feature',
            value: null,
            description: '',
            items: [],
            list: null,
            tree: null,
            trees: null,
            scaling: null,
            formula: null,
            tags: [],
            prerequisites: null,
            raw: {}
        };
    },

    /**
     * Validate a normalized feature
     * Returns { valid: boolean, errors: string[] }
     */
    validate(normalized) {
        const errors = [];

        if (!normalized.name || typeof normalized.name !== 'string') {
            errors.push('Feature must have a valid name');
        }

        if (!normalized.type || typeof normalized.type !== 'string') {
            errors.push('Feature must have a valid type');
        }

        if (normalized.items && !Array.isArray(normalized.items)) {
            errors.push('Feature items must be an array');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Get a human-readable description of a normalized feature
     */
    describe(normalized) {
        return `${normalized.name} (${normalized.type})${normalized.value ? ` [${normalized.value}]` : ''}`;
    },

    /**
     * Check if a feature is of a specific type
     */
    isType(normalized, type) {
        return normalized.type === type;
    },

    /**
     * Check if feature is a choice type
     */
    isChoice(normalized) {
        const choiceTypes = [
            'feat_choice',
            'talent_choice',
            'skill_choice',
            'force_power_choice',
            'force_technique_choice',
            'force_secret_choice'
        ];
        return choiceTypes.includes(normalized.type);
    },

    /**
     * Check if feature is a grant type
     */
    isGrant(normalized) {
        const grantTypes = [
            'feat_grant',
            'language_grant',
            'equipment_grant',
            'force_power_grant',
            'skill_training',
            'ability_increase',
            'hp_gain'
        ];
        return grantTypes.includes(normalized.type);
    },

    /**
     * Check if feature is a class feature (passive)
     */
    isClassFeature(normalized) {
        return normalized.type === 'class_feature';
    },

    /**
     * Check if feature has scaling
     */
    hasScaling(normalized) {
        return normalized.scaling !== null || normalized.formula !== null;
    }
};

export default FeatureNormalizer;
