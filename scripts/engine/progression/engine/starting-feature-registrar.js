/**
 * STARTING FEATURE REGISTRAR
 * Registers class starting features in FeatureIndex for efficient lookup.
 *
 * Called during system initialization to populate the FeatureIndex
 * with all class starting features (bonus feats, automatic grants, etc.)
 */

import { FeatureIndex } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/feature-index.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const StartingFeatureRegistrar = {

    /**
     * Register all starting features from a class document
     */
    register(classDoc) {
        if (!classDoc || !classDoc.system) {
            return;
        }

        const className = classDoc.name;
        const sys = classDoc.system;

        // Register starting feats
        if (sys.starting_feats && Array.isArray(sys.starting_feats)) {
            this._registerFeatures(className, 'starting_feat', sys.starting_feats);
        }

        // Register automatic feats
        if (sys.automatic_feats && Array.isArray(sys.automatic_feats)) {
            this._registerFeatures(className, 'automatic_feat', sys.automatic_feats);
        }

        // Register bonus feats
        if (sys.bonus_feats && Array.isArray(sys.bonus_feats)) {
            this._registerFeatures(className, 'bonus_feat', sys.bonus_feats);
        }

        // Register starting features from level progression
        if (sys.level_progression && Array.isArray(sys.level_progression)) {
            for (const level of sys.level_progression) {
                if (level.features && Array.isArray(level.features)) {
                    this._registerLevelFeatures(className, level.level, level.features);
                }
            }
        }

        // Register starting equipment
        if (sys.starting_equipment && Array.isArray(sys.starting_equipment)) {
            this._registerEquipment(className, sys.starting_equipment);
        }

        // Register starting languages
        if (sys.starting_languages && Array.isArray(sys.starting_languages)) {
            this._registerLanguages(className, sys.starting_languages);
        }

        SWSELogger.log(`Registered starting features for class: ${className}`);
    },

    /**
     * Register multiple features of a specific type
     * @private
     */
    _registerFeatures(className, type, features) {
        for (const feature of features) {
            if (typeof feature === 'string') {
                FeatureIndex.registerClassFeature(className, feature, {
                    name: feature,
                    type: type,
                    className: className
                });
            } else if (feature && feature.name) {
                FeatureIndex.registerClassFeature(className, feature.name, feature);
            }
        }
    },

    /**
     * Register features from a specific level
     * @private
     */
    _registerLevelFeatures(className, level, features) {
        for (const feature of features) {
            if (!feature) {continue;}

            const featureName = feature.name || feature.title || String(feature);
            FeatureIndex.registerClassFeature(className, `${level}_${featureName}`, {
                name: featureName,
                type: feature.type || 'class_feature',
                level: level,
                className: className,
                ...feature
            });
        }
    },

    /**
     * Register starting equipment
     * @private
     */
    _registerEquipment(className, equipment) {
        const equipmentList = equipment.map(item => {
            if (typeof item === 'string') {
                return { name: item, type: 'equipment' };
            }
            return item;
        });

        FeatureIndex.registerClassFeature(className, 'starting_equipment', {
            name: 'Starting Equipment',
            type: 'equipment_grant',
            items: equipmentList,
            className: className
        });
    },

    /**
     * Register starting languages
     * @private
     */
    _registerLanguages(className, languages) {
        FeatureIndex.registerClassFeature(className, 'starting_languages', {
            name: 'Starting Languages',
            type: 'language_grant',
            items: languages,
            className: className
        });
    },

    /**
     * Register all classes at once
     */
    async registerAllClasses() {
        try {
            const classPack = game.packs.get('foundryvtt-swse.classes');
            if (!classPack) {
                SWSELogger.warn('Classes compendium not found');
                return;
            }

            const classes = await classPack.getDocuments();
            let registered = 0;

            for (const classDoc of classes) {
                this.register(classDoc);
                registered++;
            }

            SWSELogger.log(`Registered starting features for ${registered} classes`);

        } catch (err) {
            SWSELogger.error('Failed to register starting features:', err);
        }
    }
};

export default StartingFeatureRegistrar;
