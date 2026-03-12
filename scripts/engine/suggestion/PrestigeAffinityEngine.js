/**
 * SWSE Prestige Affinity Engine
 *
 * Pure signal analysis for prestige class affinity calculation.
 * Analyzes actor state to determine:
 * - Prestige class affinities with confidence scores
 * - Priority prerequisites for top prestige targets
 *
 * This module is independent and testable.
 * It does not modify actor state or global objects.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { PrestigeLayerRegistry } from "/systems/foundryvtt-swse/scripts/engine/prestige/prestige-layer-registry.js";

// Will be populated at runtime from BuildIntent
let PRESTIGE_SIGNALS = {};

/**
 * Initialize prestige signals from BuildIntent after it loads
 * @param {Object} signals - PRESTIGE_SIGNALS from BuildIntent module
 */
export function initializePrestigeSignals(signals) {
    PRESTIGE_SIGNALS = signals || {};
    SWSELogger.log(`[PRESTIGE-AFFINITY-ENGINE] Initialized with ${Object.keys(PRESTIGE_SIGNALS).length} prestige class signals`);
}

export class PrestigeAffinityEngine {
    /**
     * Analyze actor state to calculate prestige class affinities and priority prerequisites
     *
     * @param {Object} state - Actor state from _buildActorState()
     * @param {Object} intent - Current build intent (optional, for context)
     * @returns {Promise<Object>} { prestigeAffinities: [...], priorityPrereqs: [...] }
     */
    static async analyzePrestigeTargets(state, intent = {}) {
        SWSELogger.log(`[PRESTIGE-AFFINITY-ENGINE] analyzePrestigeTargets() START`);

        const prestigeAffinities = await this._calculatePrestigeAffinities(state, intent);
        const priorityPrereqs = this._identifyPriorityPrereqs(state, intent, prestigeAffinities);

        SWSELogger.log(`[PRESTIGE-AFFINITY-ENGINE] analyzePrestigeTargets() COMPLETE - Found ${prestigeAffinities.length} affinities`);

        return {
            prestigeAffinities,
            priorityPrereqs
        };
    }

    /**
     * Calculate prestige class affinities
     * Data-driven: checks ArchetypeRegistry first, falls back to PRESTIGE_SIGNALS
     * @private
     */
    static async _calculatePrestigeAffinities(state, intent) {
        // Collect all prestige classes to evaluate
        const prestigeClassesToEvaluate = new Map();

        // 1. Start with loaded PRESTIGE_SIGNALS from data file (vanilla prestige classes)
        for (const [className, signals] of Object.entries(PRESTIGE_SIGNALS)) {
            // Validate that this prestige class exists in the registry
            const registryPrestige = PrestigeLayerRegistry.get(className);
            if (registryPrestige) {
                prestigeClassesToEvaluate.set(className, signals);
            } else {
                SWSELogger.warn(`[PRESTIGE-AFFINITY-ENGINE] Prestige signal for "${className}" has no matching PrestigeLayerRegistry entry`);
            }
        }

        // 2. Also load prestige class items from world to support custom prestige classes
        if (game?.items) {
            const prestigeItems = game.items.filter(item => item.type === 'prestige');
            for (const prestigeItem of prestigeItems) {
                const className = prestigeItem.name;

                // Skip if already added from loaded signals
                if (prestigeClassesToEvaluate.has(className)) {
                    continue;
                }

                // Try to get signals from ArchetypeRegistry first
                let signals = ArchetypeRegistry.getPrestigeSignals(prestigeItem.id);

                // Fall back to prestige item's own metadata
                if (!signals) {
                    signals = prestigeItem.system?.prestigeSignals;
                }

                // Only add if we found signals
                if (signals) {
                    prestigeClassesToEvaluate.set(className, signals);
                }
            }
        }

        // 3. Calculate affinities for all prestige classes
        const affinities = [];
        for (const [className, signals] of prestigeClassesToEvaluate.entries()) {
            // Ensure signals object has expected structure (with fallback defaults)
            const normalizedSignals = {
                feats: signals.feats || [],
                skills: signals.skills || [],
                talents: signals.talents || [],
                talentTrees: signals.talentTrees || [],
                abilities: signals.abilities || [],
                weight: signals.weight || { feats: 2, skills: 2, talents: 2, abilities: 1 }
            };

            let score = 0;
            const matches = { feats: [], skills: [], talents: [], talentTrees: [], abilities: [] };

            // Check feats
            for (const feat of normalizedSignals.feats) {
                if (state.ownedFeats.has(feat)) {
                    score += normalizedSignals.weight.feats || 2;
                    matches.feats.push(feat);
                }
            }

            // Check skills
            for (const skill of normalizedSignals.skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '');
                if (state.trainedSkills.has(skillKey)) {
                    score += normalizedSignals.weight.skills || 2;
                    matches.skills.push(skill);
                }
            }

            // Check talents
            for (const talent of normalizedSignals.talents) {
                if (state.ownedTalents.has(talent)) {
                    score += normalizedSignals.weight.talents || 2;
                    matches.talents.push(talent);
                }
            }

            // Check talent trees
            for (const tree of normalizedSignals.talentTrees) {
                if (state.talentTrees.has(tree.toLowerCase())) {
                    score += normalizedSignals.weight.talents || 2;
                    matches.talentTrees.push(tree);
                }
            }

            // Check abilities
            for (const ability of normalizedSignals.abilities) {
                if (ability === state.highestAbility) {
                    score += normalizedSignals.weight.abilities || 1;
                    matches.abilities.push(ability);
                }
            }

            // Calculate max possible score
            const talentTreeWeight = normalizedSignals.weight.talentTrees || normalizedSignals.weight.talents || 2;
            const maxScore =
                normalizedSignals.feats.length * (normalizedSignals.weight.feats || 2) +
                normalizedSignals.skills.length * (normalizedSignals.weight.skills || 2) +
                normalizedSignals.talents.length * (normalizedSignals.weight.talents || 2) +
                normalizedSignals.talentTrees.length * talentTreeWeight +
                normalizedSignals.abilities.length * (normalizedSignals.weight.abilities || 1);

            // Normalize to 0-1
            const confidence = maxScore > 0 ? Math.min(1, score / (maxScore * 0.6)) : 0;

            if (confidence > 0.1) {
                affinities.push({
                    className,
                    confidence,
                    score,
                    matches
                });
            }
        }

        // Sort by confidence (deterministic: stable sort by className as secondary key)
        affinities.sort((a, b) => {
            const confDiff = b.confidence - a.confidence;
            if (confDiff !== 0) return confDiff;
            return a.className.localeCompare(b.className);
        });

        return affinities;
    }

    /**
     * Identify priority prerequisites for top prestige targets
     * @private
     */
    static _identifyPriorityPrereqs(state, intent, prestigeAffinities) {
        const priorityPrereqs = [];
        const topTargets = prestigeAffinities.slice(0, 3);

        for (const target of topTargets) {
            // Try to get signals from ArchetypeRegistry first
            let signals = this._getPrestigeSignals(target.className);
            if (!signals) {
                // Fall back to hardcoded PRESTIGE_SIGNALS for vanilla prestige classes
                signals = PRESTIGE_SIGNALS[target.className];
            }
            if (!signals) { continue; }

            // Ensure arrays exist
            const feats = Array.isArray(signals.feats) ? signals.feats : [];
            const skills = Array.isArray(signals.skills) ? signals.skills : [];

            // Check missing feats
            for (const feat of feats) {
                if (!state.ownedFeats.has(feat)) {
                    priorityPrereqs.push({
                        type: 'feat',
                        name: feat,
                        forClass: target.className,
                        confidence: target.confidence
                    });
                }
            }

            // Check missing skills
            for (const skill of skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '');
                if (!state.trainedSkills.has(skillKey)) {
                    priorityPrereqs.push({
                        type: 'skill',
                        name: skill,
                        forClass: target.className,
                        confidence: target.confidence
                    });
                }
            }
        }

        // Sort by confidence (deterministic: stable sort by name as secondary key)
        priorityPrereqs.sort((a, b) => {
            const confDiff = b.confidence - a.confidence;
            if (confDiff !== 0) return confDiff;
            return a.name.localeCompare(b.name);
        });

        return priorityPrereqs;
    }

    /**
     * Get prestige signals for a prestige class name
     * Searches through world prestige items to find matching signals
     * @private
     */
    static _getPrestigeSignals(prestigeClassName) {
        if (!game?.items || !prestigeClassName) {
            return null;
        }

        // Find prestige item with matching name
        const prestigeItem = game.items.find(item =>
            item.type === 'prestige' && item.name === prestigeClassName
        );

        if (!prestigeItem) {
            return null;
        }

        // Try ArchetypeRegistry first
        let signals = ArchetypeRegistry.getPrestigeSignals(prestigeItem.id);

        // Fall back to prestige item's own metadata
        if (!signals) {
            signals = prestigeItem.system?.prestigeSignals;
        }

        return signals || null;
    }
}

export default PrestigeAffinityEngine;
