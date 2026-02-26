/**
 * FEAT ENGINE
 * Unified interface for feat selection and learning.
 *
 * Coordinates:
 * - Feat registry lookups
 * - State management
 * - Requirement validation
 * - Item creation
 */

import { SWSELogger } from '../../../utils/logger.js';
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';
import { FeatRegistry } from './feat-registry.js';
import { FeatState } from './feat-state.js';
import { FeatNormalizer } from './feat-normalizer.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';

export const FeatEngine = {

    // Repeatable feats (can be selected multiple times)
    repeatables: [
        'skill training',
        'linguist',
        'weapon proficiency',
        'exotic weapon proficiency',
        'double attack',
        'triple attack',
        'triple crit',
        'force training',
        'force regimen mastery',
        'ability focus',
        'combat expertise',
        'weapon focus',
        'skill focus',
        'attack combo (melee)',
        'attack combo (ranged)',
        'attack combo (fire and strike)'
    ],

    /**
     * Learn/select a feat for an actor
     */
    async learn(actor, featName, engine = null) {
        if (!featName || !actor) {
            return {
                success: false,
                reason: 'Invalid feat name or actor'
            };
        }

        // Look up feat
        const featDoc = FeatRegistry.get(featName);
        if (!featDoc) {
            return {
                success: false,
                reason: `Feat "${featName}" not found in registry`
            };
        }

        // Check if already known (unless repeatable)
        const alreadyKnown = actor.items.some(i =>
            i.type === 'feat' &&
            i.name.toLowerCase() === featName.toLowerCase()
        );

        if (alreadyKnown && !this._isRepeatable(featName)) {
            return {
                success: false,
                reason: `Already know ${featName} feat`
            };
        }

        // Check requirements (delegated to sovereign authority)
        const assessment = AbilityEngine.evaluateAcquisition(actor, featDoc, {});
        if (!assessment.legal) {
            return {
                success: false,
                reason: `Cannot learn feat: ${assessment.blockingReasons.join(', ')}`
            };
        }

        try {
            // Create feat item on actor
            await this._grantFeatItem(actor, featDoc);

            // Track in progression state
            await FeatState.addFeat(actor, featDoc.name);

            SWSELogger.log(`Feat learned: ${featName}`);

            if (engine) {
                engine.pendingSelections ??= {};
            }

            return {
                success: true,
                feat: featDoc.name
            };

        } catch (err) {
            SWSELogger.error('Failed to learn feat:', featName, err);
            return {
                success: false,
                reason: `Error learning feat: ${err.message}`
            };
        }
    },

    /**
     * Learn multiple feats
     */
    async learnMultiple(actor, featNames) {
        if (!Array.isArray(featNames)) {
            return [];
        }

        const results = [];
        for (const featName of featNames) {
            const result = await this.learn(actor, featName);
            results.push(result);
        }

        return results;
    },

    /**
     * Get feats available to learn
     */
    getAvailableFeats(actor, className = null) {
        const allFeats = FeatRegistry.list();
        const available = [];

        for (const feat of allFeats) {
            // Can't already know it (unless repeatable)
            const alreadyKnown = actor.items.some(i =>
                i.type === 'feat' &&
                i.name.toLowerCase() === feat.name.toLowerCase()
            );

            if (alreadyKnown && !this._isRepeatable(feat.name)) {
                continue;
            }

            // Must meet requirements (delegated to sovereign authority)
            if (!AbilityEngine.canAcquire(actor, feat, {})) {
                continue;
            }

            available.push(feat);
        }

        return available;
    },

    /**
     * Get bonus feats for a class
     */
    getBonusFeatsForClass(className) {
        return FeatRegistry.getBonusFeats().filter(feat =>
            FeatRegistry.feats.get(feat.name.toLowerCase()).system?.bonus_feat_for
                ?.includes(className)
        );
    },

    /**
     * Get learned feats
     */
    getLearnedFeats(actor) {
        return FeatState.getFeatNames(actor);
    },

    /**
     * Check if feat is learned
     */
    hasLearned(actor, featName) {
        return actor.items.some(i =>
            i.type === 'feat' &&
            i.name.toLowerCase() === featName.toLowerCase()
        );
    },

    /**
     * Get unmet requirements for a feat
     */
    getUnmetRequirements(actor, featName) {
        const featDoc = FeatRegistry.get(featName);
        if (!featDoc) {
            return ['Feat not found'];
        }

        // Delegated to sovereign authority
        return AbilityEngine.getUnmetRequirements(actor, featDoc, {});
    },

    /**
     * Check if feat is repeatable
     * @private
     */
    _isRepeatable(featName) {
        const lower = String(featName).toLowerCase();
        return this.repeatables.some(r => lower.includes(r));
    },

    /**
     * Grant feat item to actor
     * @private
     */
    async _grantFeatItem(actor, featDoc) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{
            name: featDoc.name,
            type: 'feat',
            img: featDoc.img || 'icons/svg/upgrade.svg',
            system: featDoc.system
        }]);
    }
};

export default FeatEngine;
