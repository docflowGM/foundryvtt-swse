/**
 * Feature Dispatcher
 * Central hub for processing all class feature types.
 * Eliminates the need for special-casing different feature types throughout the engine.
 *
 * Every class feature (talent_choice, feat_choice, feat_grant, scaling_feature, etc.)
 * is routed through this dispatcher to the appropriate handler.
 */

import { SWSELogger } from '../../utils/logger.js';

// ============================================================
// FEATURE HANDLER DEFINITIONS
// ============================================================

async function handleTalentChoice(feature, actor, engine) {
    // Talent choice features grant a budget for selecting talents
    // Store in engine state, actual selection happens in UI
    if (!engine.data.talentChoices) {
        engine.data.talentChoices = [];
    }
    engine.data.talentChoices.push(feature);

    SWSELogger.log(`Feature: Talent choice (${feature.value || 1} talent(s))`);
}

async function handleFeatChoice(feature, actor, engine) {
    // Feat choice features grant a budget for selecting feats
    if (!engine.data.featChoices) {
        engine.data.featChoices = [];
    }
    engine.data.featChoices.push(feature);

    SWSELogger.log(`Feature: Feat choice (${feature.value || 1} feat(s))`);
}

async function applyGrantedFeat(feature, actor, engine) {
    // Automatically grant this feat (no choice)
    if (!engine.data.grantedFeats) {
        engine.data.grantedFeats = [];
    }
    engine.data.grantedFeats.push(feature.name);

    SWSELogger.log(`Feature: Granted feat "${feature.name}"`);
}

async function applyClassFeature(feature, actor, engine) {
    // Class features are just tracked; they don't grant items
    // They're more about marking capabilities or abilities
    if (!engine.data.classFeatures) {
        engine.data.classFeatures = [];
    }
    engine.data.classFeatures.push(feature.name);

    SWSELogger.log(`Feature: Class feature "${feature.name}"`);
}

async function applyScalingFeature(feature, actor, engine) {
    // Scaling features increase over time (e.g., Trusty Sidearm +3)
    if (!engine.data.scalingFeatures) {
        engine.data.scalingFeatures = [];
    }
    engine.data.scalingFeatures.push({
        name: feature.name,
        value: feature.value || 1,
        level: feature.level || 1
    });

    SWSELogger.log(`Feature: Scaling "${feature.name}" +${feature.value || 1}`);
}

async function handleForceTechniqueChoice(feature, actor, engine) {
    // Force Technique choice
    if (!engine.data.forceTechniqueChoices) {
        engine.data.forceTechniqueChoices = [];
    }
    engine.data.forceTechniqueChoices.push(feature);

    SWSELogger.log(`Feature: Force Technique choice (${feature.value || 1} technique(s))`);
}

async function handleForceSecretChoice(feature, actor, engine) {
    // Force Secret choice
    if (!engine.data.forceSecretChoices) {
        engine.data.forceSecretChoices = [];
    }
    engine.data.forceSecretChoices.push(feature);

    SWSELogger.log(`Feature: Force Secret choice (${feature.value || 1} secret(s))`);
}

async function handleStarshipManeuverChoice(feature, actor, engine) {
    // Starship Maneuver choice
    if (!engine.data.starshipManeuverChoices) {
        engine.data.starshipManeuverChoices = [];
    }
    engine.data.starshipManeuverChoices.push(feature);

    SWSELogger.log(`Feature: Starship Maneuver choice (${feature.value || 1} maneuver(s))`);
}

async function applyForcePowerGrant(feature, actor, engine) {
    // Automatically grant this force power
    if (!engine.data.grantedForcePowers) {
        engine.data.grantedForcePowers = [];
    }
    engine.data.grantedForcePowers.push(feature.name);

    SWSELogger.log(`Feature: Granted force power "${feature.name}"`);
}

async function handleMedicalSecretChoice(feature, actor, engine) {
    // Medical Secret choice (for medic prestige class)
    if (!engine.data.medicalSecretChoices) {
        engine.data.medicalSecretChoices = [];
    }
    engine.data.medicalSecretChoices.push(feature);

    SWSELogger.log(`Feature: Medical Secret choice (${feature.value || 1} secret(s))`);
}

async function applyLanguageGrant(feature, actor, engine) {
    // Automatically grant a language
    if (!engine.data.grantedLanguages) {
        engine.data.grantedLanguages = [];
    }
    engine.data.grantedLanguages.push(feature.language || feature.name);

    SWSELogger.log(`Feature: Granted language "${feature.language || feature.name}"`);
}

async function applyEquipmentGrant(feature, actor, engine) {
    // Grant starting equipment
    if (!engine.data.startingEquipment) {
        engine.data.startingEquipment = [];
    }
    engine.data.startingEquipment.push(feature);

    SWSELogger.log(`Feature: Granted equipment "${feature.name}"`);
}

async function applyForcePointGrant(feature, actor, engine) {
    // Grant force points
    if (!engine.data.forcePointGrants) {
        engine.data.forcePointGrants = [];
    }
    engine.data.forcePointGrants.push(feature.value || 1);

    SWSELogger.log(`Feature: Granted ${feature.value || 1} force point(s)`);
}

async function applySkillGranted(feature, actor, engine) {
    // Auto-grant skill training
    if (!engine.data.grantedSkills) {
        engine.data.grantedSkills = [];
    }
    engine.data.grantedSkills.push(feature.skill || feature.name);

    SWSELogger.log(`Feature: Granted skill training "${feature.skill || feature.name}"`);
}

async function handleSkillChoice(feature, actor, engine) {
    // Skill choice (pick N from list)
    if (!engine.data.skillChoices) {
        engine.data.skillChoices = [];
    }
    engine.data.skillChoices.push(feature);

    SWSELogger.log(`Feature: Skill choice (${feature.value || 1} skill(s))`);
}

// ============================================================
// FEATURE DISPATCH TABLE
// ============================================================

export const FEATURE_DISPATCH_TABLE = {
    // Choice features (require UI selection)
    'talent_choice': handleTalentChoice,
    'feat_choice': handleFeatChoice,
    'skill_choice': handleSkillChoice,
    'force_technique_choice': handleForceTechniqueChoice,
    'force_secret_choice': handleForceSecretChoice,
    'starship_maneuver_choice': handleStarshipManeuverChoice,
    'medical_secret_choice': handleMedicalSecretChoice,

    // Grant features (automatic)
    'feat_grant': applyGrantedFeat,
    'force_power_grant': applyForcePowerGrant,
    'language_grant': applyLanguageGrant,
    'equipment_grant': applyEquipmentGrant,
    'force_point_grant': applyForcePointGrant,
    'skill_grant': applySkillGranted,

    // Passive features
    'class_feature': applyClassFeature,
    'scaling_feature': applyScalingFeature,

    // Aliases for backward compatibility
    'choice': handleFeatChoice,  // Default to feat choice
    'grant': applyGrantedFeat     // Default to feat grant
};

// ============================================================
// DISPATCHER PUBLIC API
// ============================================================

/**
 * Dispatch a single feature to its appropriate handler
 * @param {Object} feature - Feature object with type and properties
 * @param {Actor} actor - The character actor
 * @param {SWSEProgressionEngine} engine - The progression engine instance
 * @returns {Promise<void>}
 */
export async function dispatchFeature(feature, actor, engine) {
    if (!feature || !feature.type) {
        SWSELogger.warn('Invalid feature: missing type', feature);
        return;
    }

    const handler = FEATURE_DISPATCH_TABLE[feature.type];

    if (!handler) {
        SWSELogger.warn(`Unknown feature type: "${feature.type}"`, feature);
        return;
    }

    try {
        await handler(feature, actor, engine);
    } catch (err) {
        SWSELogger.error(`Feature handler failed for type "${feature.type}":`, err);
        throw err;
    }
}

/**
 * Dispatch multiple features
 * @param {Array} features - Array of feature objects
 * @param {Actor} actor - The character actor
 * @param {SWSEProgressionEngine} engine - The progression engine instance
 * @returns {Promise<void>}
 */
export async function dispatchFeatures(features, actor, engine) {
    if (!Array.isArray(features)) {
        return;
    }

    for (const feature of features) {
        await dispatchFeature(feature, actor, engine);
    }
}

/**
 * Register a custom feature handler
 * Allows plugins to extend the dispatcher with new feature types
 * @param {string} type - Feature type identifier
 * @param {Function} handler - Async handler function
 */
export function registerFeatureHandler(type, handler) {
    if (typeof handler !== 'function') {
        throw new Error('Feature handler must be a function');
    }

    FEATURE_DISPATCH_TABLE[type] = handler;
    SWSELogger.log(`Registered custom feature handler: "${type}"`);
}

/**
 * Get list of supported feature types
 * @returns {Array} Array of feature type strings
 */
export function getSupportedFeatureTypes() {
    return Object.keys(FEATURE_DISPATCH_TABLE);
}
