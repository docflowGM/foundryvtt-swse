/**
 * FEAT DISPATCHER
 * Routes feat-related features to the FeatEngine.
 *
 * Handles:
 * - feat_choice: Feat selection during progression
 * - bonus_feat: Automatic bonus feat grants
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-engine.js";

export const FEAT_FEATURE_DISPATCH = {

    /**
     * Handle feat choice features
     * Player selects from available feats
     */
    'feat_choice': async (feature, actor, engine) => {
        if (!feature.name) {
            SWSELogger.warn('Feat choice feature missing name');
            return;
        }

        const result = await FeatEngine.learn(actor, feature.name, engine);

        if (result.success) {
            SWSELogger.log(`Feature: Feat choice "${feature.name}"`);
        } else {
            SWSELogger.warn(`Failed to apply feat choice: ${result.reason}`);
        }
    },

    /**
     * Handle bonus feat grants
     * Automatically grant a specific feat
     */
    'bonus_feat': async (feature, actor, engine) => {
        if (!feature.name) {
            SWSELogger.warn('Bonus feat feature missing name');
            return;
        }

        const result = await FeatEngine.learn(actor, feature.name, engine);

        if (result.success) {
            SWSELogger.log(`Feature: Bonus feat "${feature.name}"`);
        } else {
            SWSELogger.warn(`Failed to apply bonus feat: ${result.reason}`);
        }
    },

    /**
     * Handle feat grants (alias for bonus_feat)
     */
    'feat_grant': async (feature, actor, engine) => {
        // Delegate to bonus_feat handler
        await FEAT_FEATURE_DISPATCH.bonus_feat(feature, actor, engine);
    }
};

/**
 * Register feat features with main dispatcher
 * Call this from feature-dispatcher.js
 */
export function registerFeatFeatures() {
    // Import at call time to avoid circular dependency
    const { registerFeatureHandler } = require('../engine/feature-dispatcher.js');

    for (const [type, handler] of Object.entries(FEAT_FEATURE_DISPATCH)) {
        registerFeatureHandler(type, handler);
        SWSELogger.log(`Registered feat feature handler: ${type}`);
    }
}

export default FEAT_FEATURE_DISPATCH;
