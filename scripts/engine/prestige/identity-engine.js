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
     * Compute ObservedBehaviorBias from actor primitives
     * Uses PrimitiveBiasRegistry for deterministic mapping
     * Pure function - does not mutate actor
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

        // Load mapping registries (would be loaded from files in real implementation)
        // For now, return empty until registries are integrated
        // TODO: Load primitive-bias-mapping.json and primitive-classification.json

        // Iterate through actor items and process primitives
        if (!actor.items || actor.items.length === 0) {
            return behaviorBias;
        }

        // Process each item's rules/primitives
        for (const item of actor.items) {
            if (!item.system?.rules) {
                continue;
            }

            const rules = Array.isArray(item.system.rules) ? item.system.rules : [];
            for (const rule of rules) {
                const primitive = this.#processPrimitive(rule, actor);
                this.#addBias(behaviorBias, primitive);
            }
        }

        return behaviorBias;
    }

    /**
     * Process a single primitive and map to bias
     * Uses PrimitiveBiasRegistry for deterministic mapping
     * Pure function
     *
     * @private
     * @param {Object} rule - The primitive rule object
     * @param {Object} actor - Foundry actor (for context only, not modified)
     * @returns {Object} Mapped bias: { mechanicalBias, roleBias, attributeBias }
     */
    static #processPrimitive(rule, actor) {
        const bias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!rule || !rule.type) {
            return bias;
        }

        const ruleType = rule.type;

        // Skip vehicle-only and mechanical-only primitives
        if (this.#isVehicleOnly(ruleType) || this.#isMechanicalOnly(ruleType)) {
            return bias;
        }

        // Get mapping for this primitive type
        const mapping = this.#getPrimitiveMapping(ruleType, rule);
        if (!mapping) {
            return bias; // No mapping; skip
        }

        // Apply mapping to bias
        if (mapping.mechanicalBias) {
            this.#mergeBias(bias.mechanicalBias, mapping.mechanicalBias);
        }
        if (mapping.roleBias) {
            this.#mergeBias(bias.roleBias, mapping.roleBias);
        }
        if (mapping.attributeBias) {
            this.#mergeBias(bias.attributeBias, mapping.attributeBias);
        }

        // Apply conditional weighting if needed
        if (!this.#isAlwaysActive(rule)) {
            const weight = this.#getConditionalWeight(ruleType, rule);
            bias = this.#scaleAllBias(bias, weight);
        }

        return bias;
    }

    /**
     * Get bias mapping for primitive type and target
     * Consults PrimitiveBiasRegistry
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @param {Object} rule - The rule object with target/skillId/etc
     * @returns {Object|null} Mapping object or null if not found
     */
    static #getPrimitiveMapping(ruleType, rule) {
        // TODO: Load primitive-bias-mapping.json at startup
        // For now, return null (will be integrated with registry loading)
        // This is a placeholder for the actual mapping lookup
        return null;
    }

    /**
     * Check if primitive is vehicle-only
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @returns {boolean}
     */
    static #isVehicleOnly(ruleType) {
        const vehicleOnlyTypes = ['vehicleEvasion', 'shipCombatAction', 'vehicle'];
        return vehicleOnlyTypes.includes(ruleType);
    }

    /**
     * Check if primitive is mechanical-only (non-identity)
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @returns {boolean}
     */
    static #isMechanicalOnly(ruleType) {
        const mechanicalOnlyTypes = [
            'IMMUNE_FEAR', 'IMMUNE_MIND_AFFECTING',
            'breathing', 'size', 'movement', 'restriction', 'trade',
            'skillSubstitution', 'negatesPenalty', 'keepDexBonus'
        ];
        return mechanicalOnlyTypes.includes(ruleType);
    }

    /**
     * Check if primitive is always active
     * Pure function
     *
     * @private
     * @param {Object} rule - The rule object
     * @returns {boolean}
     */
    static #isAlwaysActive(rule) {
        if (!rule.when) return true;
        return rule.when.type === 'always';
    }

    /**
     * Get conditional weight factor for situational primitives
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @param {Object} rule - The rule object
     * @returns {number} Weight multiplier (0.5–1.0)
     */
    static #getConditionalWeight(ruleType, rule) {
        // Highly situational: 0.5x
        if (ruleType === 'meleeCultureBonus') return 0.5;
        if (ruleType === 'concealment') return 0.5;

        // Moderately situational: 0.7x
        if (ruleType === 'reroll') return 0.7;
        if (ruleType === 'evasion') return 0.75;

        // Usually active: 1.0x
        if (ruleType === 'fastHealing') return 1.0;
        if (ruleType === 'damageReduction') return 1.0;

        // Default: 0.7x for unknown conditionals
        return 0.7;
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

        // Observed Behavior Bias (from primitives)
        const behaviorBias = this.computeObservedBehaviorBias(actor);
        SWSELogger.info("--- ObservedBehaviorBias (from primitives) ---");

        // Count primitives processed
        let primitiveCount = 0;
        let conditionalCount = 0;
        let skippedCount = 0;
        if (actor.items && actor.items.length > 0) {
            for (const item of actor.items) {
                if (item.system?.rules) {
                    const rules = Array.isArray(item.system.rules) ? item.system.rules : [];
                    for (const rule of rules) {
                        if (rule.type) {
                            if (this.#isMechanicalOnly(rule.type) || this.#isVehicleOnly(rule.type)) {
                                skippedCount++;
                            } else if (!this.#isAlwaysActive(rule)) {
                                conditionalCount++;
                                primitiveCount++;
                            } else {
                                primitiveCount++;
                            }
                        }
                    }
                }
            }
        }

        SWSELogger.info(`  Primitives processed: ${primitiveCount}`);
        SWSELogger.info(`  Conditional primitives: ${conditionalCount}`);
        SWSELogger.info(`  Skipped (mechanical-only): ${skippedCount}`);
        SWSELogger.info(`  Mechanical: ${JSON.stringify(behaviorBias.mechanicalBias)}`);
        SWSELogger.info(`  Role: ${JSON.stringify(behaviorBias.roleBias)}`);
        SWSELogger.info(`  Attribute: ${JSON.stringify(behaviorBias.attributeBias)}`);

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
