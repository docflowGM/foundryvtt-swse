/**
 * SWSE Identity Engine – Multiclass & Multi-Prestige Specification
 *
 * Implements exact deterministic identity weighting model with:
 * - Class investment pattern detection (Dip/Dive/Swim)
 * - PatternWeightedClassBias aggregation
 * - Multiple prestige stacking with diminishing weights
 * - Survey bias decay
 * - Observed behavior bias
 * - Reinforcement behavior
 * - Pure functions (no actor mutation)
 *
 * TotalBias = SurveyBias + PatternWeightedClassBias + ObservedBehaviorBias
 *           + ArchetypeBias + SpecialistBias + WeightedPrestigeAmplifierBias
 *           + WeightedPrestigeSpecialistBias + ReinforcementBias
 *
 * All layers are additive. No layer subtracts or overwrites.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { PrestigeLayerRegistry } from "/systems/foundryvtt-swse/scripts/engine/prestige/prestige-layer-registry.js";

export class IdentityEngine {
    /**
     * Compute TotalBias following exact specification
     * Pure function: does not mutate actor
     *
     * @param {Object} actor - Foundry actor (read-only)
     * @returns {Object} TotalBias: { mechanicalBias, roleBias, attributeBias }
     */
    static computeTotalBias(actor) {
        const totalBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // Layer 1: SurveyBias (decaying)
        const surveyBias = this.computeSurveyBias(actor);
        this.#addBias(totalBias, surveyBias);

        // Layer 2: PatternWeightedClassBias
        const classPatternBias = this.computeClassBias(actor);
        this.#addBias(totalBias, classPatternBias);

        // Layer 3: ObservedBehaviorBias
        const behaviorBias = this.computeObservedBehaviorBias(actor);
        this.#addBias(totalBias, behaviorBias);

        // Layer 4: ArchetypeBias (base archetype)
        const archetypeBias = this.#getArchetypeBias(actor);
        this.#addBias(totalBias, archetypeBias);

        // Layer 5: SpecialistBias
        const specialistBias = this.#getSpecialistBias(actor);
        this.#addBias(totalBias, specialistBias);

        // Layers 6-7: WeightedPrestigeBias (with stacking diminishment)
        const prestigeBias = this.computePrestigeBias(actor);
        this.#addBias(totalBias, prestigeBias);

        // Layer 8: ReinforcementBias
        const reinforcementBias = this.computeReinforcement(actor);
        this.#addBias(totalBias, reinforcementBias);

        return totalBias;
    }

    /**
     * Compute ClassBias with pattern weighting (Dip/Dive/Swim)
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} PatternWeightedClassBias
     */
    static computeClassBias(actor) {
        const classBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        const classes = actor.system?.classes || {};

        // Calculate totalLevel from BASE CLASSES ONLY (exclude prestige)
        let totalLevel = 0;
        for (const [className, classData] of Object.entries(classes)) {
            if (!this.#isPrestigeClass(className)) {
                totalLevel += classData.level || 0;
            }
        }
        totalLevel = Math.max(1, totalLevel); // Prevent divide-by-zero

        // Early game override (totalLevel <= 3)
        const isEarlyGame = totalLevel <= 3;

        for (const [className, classData] of Object.entries(classes)) {
            // Skip prestige classes
            if (this.#isPrestigeClass(className)) {
                continue;
            }

            const classLevel = classData.level || 0;
            const ratio = totalLevel > 0 ? classLevel / totalLevel : 0;

            let patternWeight = 0;

            if (isEarlyGame) {
                // Early game: weight by raw ratio * 0.5
                patternWeight = ratio * 0.5;
            } else {
                // Normal logic: Dip/Dive/Swim classification
                if (classLevel <= 2 && ratio < 0.35) {
                    // DIP: weight 0.15
                    patternWeight = 0.15;
                } else if (classLevel >= 4 && ratio >= 0.45) {
                    // DIVE: weight 0.75
                    patternWeight = 0.75;
                } else if (this.#isSwimClass(classes, className)) {
                    // SWIM: weight 0.45
                    patternWeight = 0.45;
                } else {
                    // Default: weight by ratio
                    patternWeight = ratio;
                }
            }

            // Get canonical class baseline bias
            const classBaseline = this.#getClassBaselineBias(className);
            const weightedBias = this.#scaleAllBias(classBaseline, patternWeight);
            this.#addBias(classBias, weightedBias);
        }

        return classBias;
    }

    /**
     * Compute PrestigeBias with stacking diminishment
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} WeightedPrestigeBias
     */
    static computePrestigeBias(actor) {
        const prestigeBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        const prestige = actor.system?.prestige || {};
        if (!prestige || Object.keys(prestige).length === 0) {
            return prestigeBias;
        }

        // Collect prestige classes sorted by level descending
        const prestigeClasses = [];
        for (const [prestigeName, prestigeData] of Object.entries(prestige)) {
            if (prestigeData.level && prestigeData.level > 0) {
                prestigeClasses.push({ name: prestigeName, level: prestigeData.level });
            }
        }

        prestigeClasses.sort((a, b) => b.level - a.level);

        // Apply diminishing weights
        prestigeClasses.forEach((prestige, index) => {
            const stackingWeight = 1 / (1 + index * 0.5);

            // Get prestige layer data
            const prestigeLayer = this.#getPrestigeLayer(prestige.name);
            if (!prestigeLayer) {
                return;
            }

            // Add amplifier bias with stacking weight
            if (prestigeLayer.amplifier) {
                const weightedAmplifier = this.#scaleAllBias(prestigeLayer.amplifier, stackingWeight);
                this.#addBias(prestigeBias, weightedAmplifier);
            }

            // Add specialist bias with stacking weight
            const specialist = this.#getApplicableSpecialist(actor, prestigeLayer);
            if (specialist) {
                const weightedSpecialist = this.#scaleAllBias(specialist, stackingWeight);
                this.#addBias(prestigeBias, weightedSpecialist);
            }
        });

        return prestigeBias;
    }

    /**
     * Compute SurveyBias with decay
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} SurveyBias
     */
    static computeSurveyBias(actor) {
        const surveyBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // Get survey bias from actor (if stored)
        const rawSurveyBias = actor.system?.surveyBias || {};
        if (!rawSurveyBias || Object.keys(rawSurveyBias).length === 0) {
            return surveyBias;
        }

        // Calculate totalLevel from BASE CLASSES ONLY (exclude prestige)
        const classes = actor.system?.classes || {};
        let totalLevel = 0;
        for (const [className, classData] of Object.entries(classes)) {
            if (!this.#isPrestigeClass(className)) {
                totalLevel += classData.level || 0;
            }
        }
        totalLevel = Math.max(1, totalLevel);

        const surveyWeight = Math.max(0.25, 1 - (totalLevel / 20));

        return this.#scaleAllBias(rawSurveyBias, surveyWeight);
    }

    /**
     * Compute ObservedBehaviorBias from feats, talents, ability increases, prestige selections
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} ObservedBehaviorBias
     */
    static computeObservedBehaviorBias(actor) {
        const behaviorBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // TODO: Implement feat/talent/ability/prestige analysis
        // For now, return empty (can be extended with behavior scoring)
        return behaviorBias;
    }

    /**
     * Compute ReinforcementBias
     * Adds 0.15 when archetype is confirmed and prestige deepens matching archetype
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} ReinforcementBias
     */
    static computeReinforcement(actor) {
        const reinforcementBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // TODO: Implement reinforcement logic
        // For now, return empty
        return reinforcementBias;
    }

    /**
     * Debug output for identity computation
     * Prints full identity state
     *
     * @param {Object} actor - Foundry actor
     */
    static printDebug(actor) {
        const classes = actor.system?.classes || {};

        // Calculate totalLevel from base classes only
        let totalLevel = 0;
        for (const [className, classData] of Object.entries(classes)) {
            if (!this.#isPrestigeClass(className)) {
                totalLevel += classData.level || 0;
            }
        }
        totalLevel = Math.max(1, totalLevel);

        const allLevel = actor.system?.details?.level || 1;
        const isEarlyGame = totalLevel <= 3;

        SWSELogger.info("[SWSE.debug.identity] === Identity Debug ===");
        SWSELogger.info(`Actor: ${actor.name} (Total L${allLevel}, Base Classes L${totalLevel})`);

        // Class patterns
        SWSELogger.info("--- Class Patterns ---");
        for (const [className, classData] of Object.entries(classes)) {
            if (this.#isPrestigeClass(className)) continue;

            const classLevel = classData.level || 0;
            const ratio = totalLevel > 0 ? classLevel / totalLevel : 0;
            const pattern = this.#getPatternClassification(classLevel, ratio, classes, className, totalLevel);

            // Calculate actual weight used
            let weight = 0;
            if (isEarlyGame) {
                weight = ratio * 0.5;
            } else {
                if (classLevel <= 2 && ratio < 0.35) {
                    weight = 0.15;
                } else if (classLevel >= 4 && ratio >= 0.45) {
                    weight = 0.75;
                } else if (this.#isSwimClass(classes, className)) {
                    weight = 0.45;
                } else {
                    weight = ratio;
                }
            }

            SWSELogger.info(`  ${className}: L${classLevel} (${(ratio * 100).toFixed(1)}%) → ${pattern} [weight: ${weight.toFixed(3)}]`);
        }

        // Prestige stacking
        const prestige = actor.system?.prestige || {};
        if (Object.keys(prestige).length > 0) {
            SWSELogger.info("--- Prestige Stacking ---");
            const prestigeClasses = [];
            for (const [prestigeName, prestigeData] of Object.entries(prestige)) {
                if (prestigeData.level && prestigeData.level > 0) {
                    prestigeClasses.push({ name: prestigeName, level: prestigeData.level });
                }
            }
            prestigeClasses.sort((a, b) => b.level - a.level);
            prestigeClasses.forEach((p, i) => {
                const weight = (1 / (1 + i * 0.5)).toFixed(3);
                SWSELogger.info(`  ${p.name}: L${p.level} (weight: ${weight})`);
            });
        }

        // Total bias
        const totalBias = this.computeTotalBias(actor);
        SWSELogger.info("--- TotalBias ---");
        SWSELogger.info(`  Mechanical: ${JSON.stringify(totalBias.mechanicalBias)}`);
        SWSELogger.info(`  Role: ${JSON.stringify(totalBias.roleBias)}`);
        SWSELogger.info(`  Attribute: ${JSON.stringify(totalBias.attributeBias)}`);
    }

    // === Private Helpers ===

    static #isPrestigeClass(className) {
        const prestigeClasses = ['jedi-knight', 'jedi-master', 'sith-apprentice', 'sith-lord'];
        return prestigeClasses.includes(className.toLowerCase());
    }

    static #isSwimClass(classes, targetClassName) {
        const baseClasses = Object.entries(classes)
            .filter(([name]) => !this.#isPrestigeClass(name))
            .map(([name, data]) => ({ name, level: data.level || 0 }))
            .filter(c => c.level >= 3);

        if (baseClasses.length < 2) return false;

        const targetLevel = classes[targetClassName]?.level || 0;
        return baseClasses.some(c =>
            c.name !== targetClassName && Math.abs(c.level - targetLevel) <= 2
        );
    }

    static #getPatternClassification(classLevel, ratio, classes, className, totalLevel) {
        const isEarlyGame = totalLevel <= 3;
        if (isEarlyGame) return 'PROVISIONAL';

        if (classLevel <= 2 && ratio < 0.35) return 'DIP';
        if (classLevel >= 4 && ratio >= 0.45) return 'DIVE';
        if (this.#isSwimClass(classes, className)) return 'SWIM';
        return 'PRIMARY';
    }

    static #getClassBaselineBias(className) {
        // TODO: Load from canonical class bias definitions
        // Placeholder: return empty object
        return {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };
    }

    static #getPrestigeLayer(prestigeName) {
        if (!PrestigeLayerRegistry.isInitialized()) return null;
        return PrestigeLayerRegistry.get(prestigeName);
    }

    static #getApplicableSpecialist(actor, prestigeLayer) {
        if (!prestigeLayer.specialists || prestigeLayer.specialists.length === 0) {
            return null;
        }
        // Return first specialist (can be extended for multi-class)
        return prestigeLayer.specialists[0];
    }

    static #getArchetypeBias(actor) {
        const archetypeId = actor.system?.archetype;
        if (!archetypeId || !ArchetypeRegistry.isInitialized()) {
            return {
                mechanicalBias: {},
                roleBias: {},
                attributeBias: {}
            };
        }

        const archetype = ArchetypeRegistry.get(archetypeId);
        if (!archetype) {
            return {
                mechanicalBias: {},
                roleBias: {},
                attributeBias: {}
            };
        }

        return {
            mechanicalBias: archetype.mechanicalBias || {},
            roleBias: archetype.roleBias || {},
            attributeBias: archetype.attributeBias || {}
        };
    }

    static #getSpecialistBias(actor) {
        // TODO: Get specialist from actor selections
        return {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };
    }

    static #addBias(target, source) {
        if (!source) return;
        this.#mergeBias(target.mechanicalBias, source.mechanicalBias || {});
        this.#mergeBias(target.roleBias, source.roleBias || {});
        this.#mergeBias(target.attributeBias, source.attributeBias || {});
    }

    static #mergeBias(target, source) {
        if (!source || typeof source !== 'object') return;
        for (const [key, value] of Object.entries(source)) {
            if (typeof value === 'number') {
                target[key] = (target[key] || 0) + value;
            }
        }
    }

    static #scaleAllBias(bias, scale) {
        return {
            mechanicalBias: this.#scaleBias(bias.mechanicalBias || {}, scale),
            roleBias: this.#scaleBias(bias.roleBias || {}, scale),
            attributeBias: this.#scaleBias(bias.attributeBias || {}, scale)
        };
    }

    static #scaleBias(biasObj, scale) {
        const scaled = {};
        for (const [key, value] of Object.entries(biasObj)) {
            if (typeof value === 'number') {
                scaled[key] = value * scale;
            }
        }
        return scaled;
    }
}
