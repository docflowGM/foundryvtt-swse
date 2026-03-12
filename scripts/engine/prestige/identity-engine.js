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
    // === Registry Caches (Loaded at system init) ===
    static #primitiveMapping = null;
    static #primitiveClassification = null;
    static #attributeMapping = null;

    /**
     * Initialize registry caches
     * Must be called at system startup
     *
     * @async
     * @returns {Promise<void>}
     */
    static async initialize() {
        try {
            this.#primitiveMapping = await this.#loadRegistry('primitive-bias-mapping.json');
            this.#primitiveClassification = await this.#loadRegistry('primitive-classification.json');
            this.#attributeMapping = await this.#loadRegistry('attribute-bias-mapping.json');
            SWSELogger.info('[IdentityEngine] Registry caches initialized');
        } catch (error) {
            SWSELogger.error('[IdentityEngine] Failed to initialize registries:', error);
        }
    }

    /**
     * Load a registry JSON file
     * @private
     * @param {string} filename - Registry filename
     * @returns {Promise<Object>}
     */
    static async #loadRegistry(filename) {
        const response = await fetch(`/systems/foundryvtt-swse/data/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        return response.json();
    }

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
     * Get complete identity for an actor at current build state
     * Resolves base archetype, prestige amplifier, and specialist
     * Returns transient identity (not persisted to actor)
     * Pure async function: does not mutate actor
     *
     * @param {Object} actor - Foundry actor (read-only)
     * @param {string} baseArchetypeId - Base archetype identifier
     * @param {string} prestigeClassId - Prestige class identifier (or null)
     * @param {number} specialistIndex - Specialist variant index (or null for first)
     * @returns {Promise<Object>} Identity: { baseArchetype, amplifier, specialist, totalBias }
     */
    static async getActorIdentity(actor, baseArchetypeId, prestigeClassId = null, specialistIndex = null) {
        const identity = {
            baseArchetype: null,
            amplifier: null,
            specialist: null,
            totalBias: null
        };

        if (!baseArchetypeId) {
            SWSELogger.warn('[IdentityEngine.getActorIdentity] No baseArchetypeId provided');
            return identity;
        }

        // Resolve base archetype
        if (!ArchetypeRegistry.isInitialized()) {
            SWSELogger.warn('[IdentityEngine.getActorIdentity] ArchetypeRegistry not initialized');
            return identity;
        }

        identity.baseArchetype = ArchetypeRegistry.get(baseArchetypeId);
        if (!identity.baseArchetype) {
            SWSELogger.warn(`[IdentityEngine.getActorIdentity] Archetype not found: ${baseArchetypeId}`);
            return identity;
        }

        // Resolve prestige amplifier if provided
        if (prestigeClassId) {
            if (!PrestigeLayerRegistry.isInitialized()) {
                SWSELogger.warn('[IdentityEngine.getActorIdentity] PrestigeLayerRegistry not initialized');
            } else {
                const prestigeLayer = PrestigeLayerRegistry.get(prestigeClassId);
                if (prestigeLayer) {
                    identity.amplifier = prestigeLayer.amplifier || null;

                    // Select specialist (first applicable for actor's classes)
                    if (prestigeLayer.specialists && prestigeLayer.specialists.length > 0) {
                        // Use specialistIndex if provided, otherwise default to first
                        const idx = specialistIndex ?? 0;
                        if (idx >= 0 && idx < prestigeLayer.specialists.length) {
                            identity.specialist = prestigeLayer.specialists[idx];
                        } else {
                            identity.specialist = prestigeLayer.specialists[0];
                        }
                    }
                } else {
                    SWSELogger.warn(`[IdentityEngine.getActorIdentity] Prestige layer not found: ${prestigeClassId}`);
                }
            }
        }

        // Compute total bias
        identity.totalBias = this.computeTotalBias(actor);

        return identity;
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
     * Compute ObservedBehaviorBias from actor primitives, attributes, and skills
     * Uses PrimitiveBiasRegistry for deterministic mapping
     * Pure function - does not mutate actor
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} ObservedBehaviorBias (merged from primitives + attributes + skills)
     */
    static computeObservedBehaviorBias(actor) {
        const behaviorBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!this.#primitiveMapping) {
            SWSELogger.warn('[IdentityEngine] Primitive registries not initialized');
            return behaviorBias;
        }

        // Layer 1: Process actor primitives (feats, talents, class features)
        const processedFeats = new Set();
        if (actor.items && actor.items.length > 0) {
            for (const item of actor.items) {
                if (!item.system?.rules) {
                    continue;
                }

                const rules = Array.isArray(item.system.rules) ? item.system.rules : [];
                for (const rule of rules) {
                    const primitive = this.#processPrimitive(rule, actor, processedFeats);
                    this.#addBias(behaviorBias, primitive);
                }
            }
        }

        // Layer 2: Process ability scores (bell curve model)
        const attributeBias = this.#computeAttributeBias(actor);
        this.#addBias(behaviorBias, attributeBias);

        // Layer 3: Process skill training and Skill Focus
        const skillBias = this.#computeSkillBias(actor);
        this.#addBias(behaviorBias, skillBias);

        return behaviorBias;
    }

    /**
     * Compute bias from ability scores using bell curve model
     * Pure function
     *
     * @private
     * @param {Object} actor - Foundry actor
     * @returns {Object} Attribute bias
     */
    static #computeAttributeBias(actor) {
        const attributeBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!this.#attributeMapping) {
            return attributeBias;
        }

        const abilities = actor.system?.abilities || {};

        for (const [ability, score] of Object.entries(abilities)) {
            if (typeof score !== 'number' || score <= 10) {
                continue; // Only apply bias if score > 10
            }

            // Bell curve: z = (score - 10) / 2; bias = 0.6 * (z / (|z| + 2))
            const z = (score - 10) / 2;
            const biasMagnitude = 0.6 * (z / (Math.abs(z) + 2));

            // Get mapping for this ability
            const abilityMapping = this.#attributeMapping[ability];
            if (!abilityMapping) {
                continue;
            }

            // Apply scaled mapping
            const scaledAbilityBias = this.#scaleAllBias(abilityMapping, biasMagnitude);
            this.#addBias(attributeBias, scaledAbilityBias);
        }

        return attributeBias;
    }

    /**
     * Compute bias from skill training and Skill Focus
     * Pure function
     *
     * @private
     * @param {Object} actor - Foundry actor
     * @returns {Object} Skill bias
     */
    static #computeSkillBias(actor) {
        const skillBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        // TODO: Extract skill training and Skill Focus feats from actor
        // For now, return empty
        return skillBias;
    }

    /**
     * Process a single primitive and map to bias
     * Uses PrimitiveBiasRegistry for deterministic mapping
     * Handles featGrant recursion safely with deduplication
     * Pure function
     *
     * @private
     * @param {Object} rule - The primitive rule object
     * @param {Object} actor - Foundry actor (for context only, not modified)
     * @param {Set} processedFeats - Set of already-processed feat IDs (for deduplication)
     * @returns {Object} Mapped bias: { mechanicalBias, roleBias, attributeBias }
     */
    static #processPrimitive(rule, actor, processedFeats = new Set()) {
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

        // Handle featGrant recursion: do not apply bias here, recurse into feat
        if (ruleType === 'featGrant' && rule.featId) {
            // TODO: Implement feat lookup and recursion
            // if (!processedFeats.has(rule.featId)) {
            //     processedFeats.add(rule.featId);
            //     const feat = lookupFeatById(rule.featId);
            //     if (feat?.system?.rules) {
            //         for (const subrule of feat.system.rules) {
            //             const subPrimitive = this.#processPrimitive(subrule, actor, processedFeats);
            //             this.#addBias(bias, subPrimitive);
            //         }
            //     }
            // }
            return bias; // Skip for now
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

        // Apply conditional weighting if needed (registry-driven)
        if (!this.#isAlwaysActive(rule)) {
            const weight = this.#getConditionalWeight(ruleType);
            bias = this.#scaleAllBias(bias, weight);
        }

        return bias;
    }

    /**
     * Get bias mapping for primitive type and target
     * Consults PrimitiveBiasRegistry (registry-driven)
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @param {Object} rule - The rule object with target/skillId/etc
     * @returns {Object|null} Mapping object or null if not found
     */
    static #getPrimitiveMapping(ruleType, rule) {
        if (!this.#primitiveMapping) {
            return null; // Registry not loaded
        }

        // Get mapping for primitive type
        const typeMapping = this.#primitiveMapping[ruleType];
        if (!typeMapping) {
            return null; // No mapping for this primitive type
        }

        // For primitives with targets (skillModifier, damageModifier, etc)
        if (rule.skillId && typeMapping.mapping?.default) {
            // Use default mapping for skill-based primitives
            return typeMapping.mapping.default;
        }

        if (rule.target && typeMapping.mapping?.[rule.target]) {
            // Use specific target mapping if available
            return typeMapping.mapping[rule.target];
        }

        // Fallback to default mapping if no specific target
        if (typeMapping.mapping?.default) {
            return typeMapping.mapping.default;
        }

        // For simple primitives without targets
        if (typeMapping.mapping && typeof typeMapping.mapping === 'object') {
            return typeMapping.mapping;
        }

        return null; // No valid mapping
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
     * Registry-driven: no hardcoded logic
     * Pure function
     *
     * @private
     * @param {string} ruleType - The primitive type
     * @returns {number} Weight multiplier (0.5–1.0)
     */
    static #getConditionalWeight(ruleType) {
        if (!this.#primitiveClassification) {
            return 0.7; // Safe default if registry not loaded
        }

        // Use lookup table from CONDITIONAL classification
        const lookupTable = this.#primitiveClassification.CONDITIONAL?.lookup_table;
        if (!lookupTable) {
            return 0.7; // Safe default
        }

        return lookupTable[ruleType] ?? lookupTable.default ?? 0.7;
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

        // Observed Behavior Bias (from primitives + attributes + skills)
        const behaviorBias = this.computeObservedBehaviorBias(actor);
        SWSELogger.info("--- ObservedBehaviorBias (Primitives + Attributes + Skills) ---");

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

        // Show attribute contributions
        const abilities = actor.system?.abilities || {};
        SWSELogger.info("  --- Ability Scores ---");
        for (const [ability, score] of Object.entries(abilities)) {
            if (typeof score === 'number' && score > 10) {
                const z = (score - 10) / 2;
                const bias = 0.6 * (z / (Math.abs(z) + 2));
                SWSELogger.info(`    ${ability.toUpperCase()}: ${score} (z=${z.toFixed(2)}, bias=${(bias * 100).toFixed(1)}%)`);
            }
        }

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
