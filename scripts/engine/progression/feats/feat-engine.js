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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry.js";
import { FeatState } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-state.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { FeatNormalizer } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-normalizer.js";
import { FeatChoiceResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";

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

        // Check requirements
        const assessment = AbilityEngine.evaluateAcquisition(actor, featDoc);
        if (!assessment.legal) {
            return {
                success: false,
                reason: `Cannot learn feat: ${assessment.missingPrereqs.join(', ')}`
            };
        }

        try {
            // Create feat item on actor
            await this._grantFeatItem(actor, featDoc);

            // Track in progression state
            await FeatState.addFeat(actor, featDoc.name);

            const choiceMeta = FeatChoiceResolver.getChoiceMeta(featDoc);
            const requiresChoice = FeatChoiceResolver.requiresChoice(featDoc);
            const choiceSource = requiresChoice ? FeatChoiceResolver.inferChoiceSource(featDoc) : null;
            const choices = requiresChoice
                ? await FeatChoiceResolver.resolveOptions(actor, featDoc)
                : [];

            SWSELogger.log(`Feat learned: ${featName}`);

            if (engine) {
                engine.pendingSelections ??= {};
                if (requiresChoice) {
                    engine.pendingSelections.featChoices ??= [];
                    engine.pendingSelections.featChoices.push({
                        feat: featDoc.name,
                        choiceKind: choiceMeta?.choiceKind || null,
                        choiceSource,
                        options: choices,
                        deferred: choiceSource === 'grantPool'
                    });
                }
            }

            return {
                success: true,
                feat: featDoc.name,
                requiresChoice,
                choiceKind: choiceMeta?.choiceKind || null,
                choiceSource,
                choices
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

            // Must meet requirements
            if (!AbilityEngine.canAcquire(actor, feat)) {
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
     * Resolve available choices for a choice-backed feat.
     * UI/backfill dialogs should use this rather than hardcoding feat names.
     */
    async getChoiceOptions(actor, featOrName, context = {}) {
        const featDoc = typeof featOrName === 'string' ? FeatRegistry.get(featOrName) : featOrName;
        if (!featDoc) return [];
        return FeatChoiceResolver.resolveOptions(actor, featDoc, context);
    },

    /**
     * Find owned feats whose required choices have not been stored yet.
     */
    async getMissingChoices(actor, options = {}) {
        return FeatChoiceResolver.getMissingChoices(actor, options);
    },

    /**
     * Build the actor update patch for a selected feat choice.
     * Caller remains responsible for validating and applying the patch.
     */
    buildChoicePatch(featOrName, selectedChoice) {
        const featDoc = typeof featOrName === 'string' ? FeatRegistry.get(featOrName) : featOrName;
        return FeatChoiceResolver.buildChoicePatch(featDoc, selectedChoice);
    },

    /**
     * Get unmet requirements for a feat
     */
    getUnmetRequirements(actor, featName) {
        const featDoc = FeatRegistry.get(featName);
        if (!featDoc) {
            return ['Feat not found'];
        }

        return AbilityEngine.getUnmetRequirements(actor, featDoc);
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
