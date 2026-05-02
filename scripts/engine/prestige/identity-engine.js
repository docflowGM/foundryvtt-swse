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
    static #classChassisMapping = null;
    static #skillBiasMapping = null;
    static #equipmentAffinityMapping = null;

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
            this.#classChassisMapping = await this.#loadRegistry('class-chassis-bias.json');
            this.#skillBiasMapping = await this.#loadRegistry('skill-bias-mapping.json');
            this.#equipmentAffinityMapping = await this.#loadRegistry('equipment-affinity-mapping.json');
            Object.freeze(this.#equipmentAffinityMapping);
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

        // Layer 2: ClassChassisBias (Saga mechanics: BAB, HD, defense tier, skill breadth)
        const classChassisBias = this.computeClassChassisBias(actor);
        this.#addBias(totalBias, classChassisBias);

        // Layer 3: ObservedBehaviorBias (primitives + attributes + skills)
        const behaviorBias = this.computeObservedBehaviorBias(actor);
        this.#addBias(totalBias, behaviorBias);

        // Layer 4: EquipmentAffinityBias (equipment structural categories - optional refinement)
        const equipmentAffinityBias = this.computeEquipmentAffinityBias(actor);
        this.#addBias(totalBias, equipmentAffinityBias);

        // Layer 5: ArchetypeBias (base archetype)
        const archetypeBias = this.#getArchetypeBias(actor);
        this.#addBias(totalBias, archetypeBias);

        // Layer 6: SpecialistBias
        const specialistBias = this.#getSpecialistBias(actor);
        this.#addBias(totalBias, specialistBias);

        // Layer 7: PrestigeClassChassisBias (prestige class mechanics: BAB, HD, defense with 0.5 scaling)
        const prestigeClassChassisBias = this.computePrestigeClassChassisBias(actor);
        this.#addBias(totalBias, prestigeClassChassisBias);

        // Layer 8: WeightedPrestigeBias (prestige amplifier + specialist with stacking diminishment)
        const prestigeBias = this.computePrestigeBias(actor);
        this.#addBias(totalBias, prestigeBias);

        // Layer 9: ReinforcementBias
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
     * Compute Class Chassis Bias from Saga mechanics
     * Pure function - static structural identity seed
     * Does NOT scale per level
     *
     * Layers:
     * 1. BAB bias (with pattern weight applied)
     * 2. Hit Die bias (with pattern weight applied)
     * 3. Defense tier bias (NO pattern weight - best tier only)
     * 4. Skill breadth bias (NO pattern weight - union of skills)
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} ClassChassisBias
     */
    static computeClassChassisBias(actor) {
        const chassisBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!this.#classChassisMapping) {
            return chassisBias;
        }

        const classes = actor.system?.classes || {};
        const baseClasses = Object.entries(classes)
            .filter(([name]) => !this.#isPrestigeClass(name))
            .map(([name, data]) => ({ name: name.toLowerCase(), level: data.level || 0 }));

        if (baseClasses.length === 0) {
            return chassisBias;
        }

        // Calculate totalLevel for pattern weight computation
        let totalLevel = 0;
        for (const cls of baseClasses) {
            totalLevel += cls.level;
        }
        totalLevel = Math.max(1, totalLevel);
        const isEarlyGame = totalLevel <= 3;

        // ===== Layer 1: BAB Bias (with pattern weight) =====
        for (const cls of baseClasses) {
            const classMetadata = this.#classChassisMapping[cls.name];
            if (!classMetadata || !classMetadata.bab) continue;

            const babMapping = this.#classChassisMapping.bab_bias_mapping?.[classMetadata.bab];
            if (!babMapping) continue;

            // Compute pattern weight for this class
            const ratio = totalLevel > 0 ? cls.level / totalLevel : 0;
            let patternWeight = 0;

            if (isEarlyGame) {
                patternWeight = ratio * 0.5;
            } else {
                if (cls.level <= 2 && ratio < 0.35) {
                    patternWeight = 0.15; // DIP
                } else if (cls.level >= 4 && ratio >= 0.45) {
                    patternWeight = 0.75; // DIVE
                } else if (this.#isSwimClass(classes, cls.name)) {
                    patternWeight = 0.45; // SWIM
                } else {
                    patternWeight = ratio; // PRIMARY
                }
            }

            // Apply weighted BAB bias
            const scaledBAB = this.#scaleAllBias(babMapping, patternWeight);
            this.#addBias(chassisBias, scaledBAB);
        }

        // ===== Layer 2: Hit Die Bias (with pattern weight) =====
        for (const cls of baseClasses) {
            const classMetadata = this.#classChassisMapping[cls.name];
            if (!classMetadata || !classMetadata.hitDie) continue;

            const hdMapping = this.#classChassisMapping.hd_bias_mapping?.[classMetadata.hitDie];
            if (!hdMapping) continue;

            // Compute pattern weight for this class (same as BAB)
            const ratio = totalLevel > 0 ? cls.level / totalLevel : 0;
            let patternWeight = 0;

            if (isEarlyGame) {
                patternWeight = ratio * 0.5;
            } else {
                if (cls.level <= 2 && ratio < 0.35) {
                    patternWeight = 0.15;
                } else if (cls.level >= 4 && ratio >= 0.45) {
                    patternWeight = 0.75;
                } else if (this.#isSwimClass(classes, cls.name)) {
                    patternWeight = 0.45;
                } else {
                    patternWeight = ratio;
                }
            }

            // Apply weighted HD bias
            const scaledHD = this.#scaleAllBias(hdMapping, patternWeight);
            this.#addBias(chassisBias, scaledHD);
        }

        // ===== Layer 3: Defense Tier Bias (NO pattern weight - best tier only) =====
        const bestDefenseTiers = {};
        for (const defenseType of ['reflex', 'fortitude', 'will']) {
            let bestTier = 'low';
            let bestTierRank = 0;

            // Find best tier across all base classes
            for (const cls of baseClasses) {
                const classMetadata = this.#classChassisMapping[cls.name];
                if (!classMetadata || !classMetadata.defenseProgressions) continue;

                const tier = classMetadata.defenseProgressions[defenseType];
                if (!tier) continue;

                const tierRank = tier === 'high' ? 2 : tier === 'average' ? 1 : 0;
                if (tierRank > bestTierRank) {
                    bestTier = tier;
                    bestTierRank = tierRank;
                }
            }

            bestDefenseTiers[defenseType] = bestTier;

            // Apply defense tier bias (no pattern weight)
            const tierMapping = this.#classChassisMapping.defense_tier_mapping?.[bestTier];
            if (!tierMapping) continue;

            const defenseKeys = this.#classChassisMapping.defense_bias_keys?.[defenseType];
            if (!defenseKeys) continue;

            // Apply mechanical bias
            if (defenseKeys.mechanicalBias) {
                const key = defenseKeys.mechanicalBias;
                chassisBias.mechanicalBias[key] = (chassisBias.mechanicalBias[key] || 0) + tierMapping.mechanicalBias;
            }

            // Apply role bias (scaled by tier)
            if (defenseKeys.roleBias && tierMapping.roleBias_scale !== 0) {
                const key = defenseKeys.roleBias;
                const roleValue = tierMapping.roleBias_scale * 0.5; // 0.5 is role bias scaling factor
                chassisBias.roleBias[key] = (chassisBias.roleBias[key] || 0) + roleValue;
            }
        }

        // ===== Layer 4: Skill Breadth Bias (NO pattern weight - union of skills) =====
        const allClassSkills = new Set();
        let maxTrainedSkills = 0;

        for (const cls of baseClasses) {
            const classMetadata = this.#classChassisMapping[cls.name];
            if (!classMetadata) continue;

            // Track max trained skills for ratio calculation
            if (classMetadata.trainedSkillsAtLevel1 > maxTrainedSkills) {
                maxTrainedSkills = classMetadata.trainedSkillsAtLevel1;
            }

            // Add all class skills to union
            if (classMetadata.classSkills && Array.isArray(classMetadata.classSkills)) {
                classMetadata.classSkills.forEach(skill => allClassSkills.add(skill));
            }
        }

        if (maxTrainedSkills > 0 && allClassSkills.size > 0) {
            const skillBreadthRatio = allClassSkills.size / maxTrainedSkills;

            // Apply skill breadth bias
            const skillBreadthMapping = this.#classChassisMapping.skill_breadth_bias;
            if (skillBreadthMapping) {
                const mechanicalValue = skillBreadthRatio * skillBreadthMapping.mechanicalBias_scale;
                const roleValue = skillBreadthRatio * skillBreadthMapping.roleBias_scale;

                if (skillBreadthMapping.mechanicalBias) {
                    chassisBias.mechanicalBias[skillBreadthMapping.mechanicalBias] =
                        (chassisBias.mechanicalBias[skillBreadthMapping.mechanicalBias] || 0) + mechanicalValue;
                }

                if (skillBreadthMapping.roleBias) {
                    chassisBias.roleBias[skillBreadthMapping.roleBias] =
                        (chassisBias.roleBias[skillBreadthMapping.roleBias] || 0) + roleValue;
                }
            }
        }

        return chassisBias;
    }

    /**
     * Compute Prestige Chassis Bias
     * Separate from base class chassis (subtle, scaled 0.5, diminishing stack)
     * Pure function
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} PrestigeClassChassisBias
     */
    static computePrestigeClassChassisBias(actor) {
        const prestigeChassisBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!this.#classChassisMapping) {
            return prestigeChassisBias;
        }

        const prestige = actor.system?.prestige || {};
        const prestigeClasses = [];

        for (const [prestigeName, prestigeData] of Object.entries(prestige)) {
            if (prestigeData.level && prestigeData.level > 0) {
                prestigeClasses.push({ name: prestigeName.toLowerCase(), level: prestigeData.level });
            }
        }

        prestigeClasses.sort((a, b) => b.level - a.level);

        // Apply prestige chassis bias with diminishing stack weight
        for (let i = 0; i < prestigeClasses.length; i++) {
            const prestige = prestigeClasses[i];
            const stackingWeight = 1 / (1 + i * 0.5);
            const prestigeMetadata = this.#classChassisMapping[prestige.name];

            if (!prestigeMetadata) continue;

            // BAB bias with 0.5 scaling and diminishing weight
            if (prestigeMetadata.bab) {
                const babMapping = this.#classChassisMapping.bab_bias_mapping?.[prestigeMetadata.bab];
                if (babMapping) {
                    const prestige_scaled = this.#scaleAllBias(babMapping, 0.5 * stackingWeight);
                    this.#addBias(prestigeChassisBias, prestige_scaled);
                }
            }

            // HD bias with 0.5 scaling and diminishing weight
            if (prestigeMetadata.hitDie) {
                const hdMapping = this.#classChassisMapping.hd_bias_mapping?.[prestigeMetadata.hitDie];
                if (hdMapping) {
                    const prestige_scaled = this.#scaleAllBias(hdMapping, 0.5 * stackingWeight);
                    this.#addBias(prestigeChassisBias, prestige_scaled);
                }
            }

            // Defense tier bias (best tier if higher than base classes)
            // Only apply if prestige defines higher defense progression
            for (const defenseType of ['reflex', 'fortitude', 'will']) {
                const prestigeTier = prestigeMetadata.defenseProgressions?.[defenseType];
                if (!prestigeTier) continue;

                // Would need to compare with base class best tier here
                // For now, apply subtly if prestige has defense boost
                const tierMapping = this.#classChassisMapping.defense_tier_mapping?.[prestigeTier];
                if (tierMapping && tierMapping.mechanicalBias > 0) {
                    const defenseKeys = this.#classChassisMapping.defense_bias_keys?.[defenseType];
                    if (defenseKeys && defenseKeys.mechanicalBias) {
                        const prestige_scaled = tierMapping.mechanicalBias * 0.5 * stackingWeight;
                        prestigeChassisBias.mechanicalBias[defenseKeys.mechanicalBias] =
                            (prestigeChassisBias.mechanicalBias[defenseKeys.mechanicalBias] || 0) + prestige_scaled;
                    }
                }
            }

            // Note: NO skill breadth bias from prestige
        }

        return prestigeChassisBias;
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
        // Survey bias is stored in system.swse.surveyBias via injectSurveyBias()
        const rawSurveyBias = actor.system?.swse?.surveyBias || {};
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

        const surveyWeight = Math.max(0.175, 1 - (totalLevel / 20));

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

        if (!this.#skillBiasMapping) {
            return skillBias;
        }

        // Detect Skill Focus feats to apply 2.0× multiplier
        const skillFocusByName = new Set();
        if (actor.items && actor.items.length > 0) {
            for (const item of actor.items) {
                if (item.type !== 'feat') continue;
                if (!item.name || !item.name.toLowerCase().includes('skill focus')) continue;

                // Extract skill name from feat (e.g., "Skill Focus (Persuasion)" → "persuasion")
                const skillMatch = item.name.match(/\(([^)]+)\)/);
                if (skillMatch && skillMatch[1]) {
                    skillFocusByName.add(skillMatch[1].toLowerCase());
                }
            }
        }

        // Apply skill training bias from skill-bias-mapping registry
        const skills = actor.system?.skills || {};
        for (const [skillKey, skillData] of Object.entries(skills)) {
            if (!skillData?.trained) {
                continue;
            }

            // Convert skill key to registry key (e.g., "useTheForce" or normalize for lookup)
            const skillRegistryKey = this.#normalizeSkillKey(skillKey);

            // Look up skill in bias mapping registry
            const skillMapping = this.#skillBiasMapping[skillRegistryKey] || this.#skillBiasMapping.default;
            if (!skillMapping) {
                continue;
            }

            // Determine weight: 1.0 for training, 2.0 for Skill Focus
            let weight = 1.0;
            if (skillFocusByName.has(skillRegistryKey)) {
                weight = 2.0;
            }

            // Apply weighted skill bias
            if (skillMapping.mechanicalBias) {
                for (const [key, value] of Object.entries(skillMapping.mechanicalBias)) {
                    if (typeof value === 'number') {
                        skillBias.mechanicalBias[key] = (skillBias.mechanicalBias[key] || 0) + (value * weight);
                    }
                }
            }

            if (skillMapping.roleBias) {
                for (const [key, value] of Object.entries(skillMapping.roleBias)) {
                    if (typeof value === 'number') {
                        skillBias.roleBias[key] = (skillBias.roleBias[key] || 0) + (value * weight);
                    }
                }
            }
        }

        return skillBias;
    }

    /**
     * Compute Equipment Affinity Bias from equipped items
     * Maps weapon groups and armor categories to identity bias
     * Enforces threshold rule: 2+ items in same category before applying
     * Caps total contribution to prevent gear from dominating identity
     * Pure function - does not mutate actor
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} EquipmentAffinityBias { mechanicalBias, roleBias, attributeBias }
     */
    static computeEquipmentAffinityBias(actor) {
        const equipmentBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        if (!this.#equipmentAffinityMapping) {
            return equipmentBias;
        }

        const rules = this.#equipmentAffinityMapping.rules || {};
        const minimumCategoryCount = rules.minimumCategoryCount || 2;
        const maxTotalContribution = rules.maxTotalAffinityContribution || 0.5;

        // Collect equipped items only
        const weaponsByGroup = {};
        const armorsByCategory = {};
        let totalEquippedSlots = 0;

        if (actor.items && actor.items.length > 0) {
            for (const item of actor.items) {
                if (!item.system?.equipped) {
                    continue;
                }

                if (item.type === 'weapon') {
                    const weaponGroup = item.system?.group;
                    if (weaponGroup) {
                        weaponsByGroup[weaponGroup] = (weaponsByGroup[weaponGroup] || 0) + 1;
                        totalEquippedSlots++;
                    }
                } else if (item.type === 'armor') {
                    const armorCategory = item.system?.category;
                    if (armorCategory) {
                        armorsByCategory[armorCategory] = (armorsByCategory[armorCategory] || 0) + 1;
                        totalEquippedSlots++;
                    }
                } else if (item.type === 'equipment' || item.type === 'gear') {
                    totalEquippedSlots++;
                }
            }
        }

        // Apply weapon group affinity with threshold
        const weaponAffinities = this.#equipmentAffinityMapping.weapon_group_affinity || {};
        for (const [weaponGroup, count] of Object.entries(weaponsByGroup)) {
            if (count >= minimumCategoryCount) {
                const affinity = weaponAffinities[weaponGroup];
                if (affinity) {
                    this.#addBias(equipmentBias, affinity);
                }
            }
        }

        // Apply armor category affinity with threshold
        const armorAffinities = this.#equipmentAffinityMapping.armor_category_affinity || {};
        for (const [armorCategory, count] of Object.entries(armorsByCategory)) {
            if (count >= minimumCategoryCount) {
                const affinity = armorAffinities[armorCategory];
                if (affinity) {
                    this.#addBias(equipmentBias, affinity);
                }
            }
        }

        // Cap total equipment affinity contribution
        const totalMagnitude = this.#calculateBiasMagnitude(equipmentBias);
        if (totalMagnitude > maxTotalContribution) {
            const scale = maxTotalContribution / totalMagnitude;
            const scaled = this.#scaleAllBias(equipmentBias, scale);
            equipmentBias.mechanicalBias = scaled.mechanicalBias;
            equipmentBias.roleBias = scaled.roleBias;
            equipmentBias.attributeBias = scaled.attributeBias;
        }

        return equipmentBias;
    }

    /**
     * Calculate total magnitude of bias contribution
     * Used for capping equipment affinity
     *
     * @private
     * @param {Object} bias - Bias object with mechanicalBias, roleBias, attributeBias
     * @returns {number} Total magnitude (sum of absolute values)
     */
    static #calculateBiasMagnitude(bias) {
        let magnitude = 0;
        for (const [key, value] of Object.entries(bias.mechanicalBias || {})) {
            if (typeof value === 'number') magnitude += Math.abs(value);
        }
        for (const [key, value] of Object.entries(bias.roleBias || {})) {
            if (typeof value === 'number') magnitude += Math.abs(value);
        }
        for (const [key, value] of Object.entries(bias.attributeBias || {})) {
            if (typeof value === 'number') magnitude += Math.abs(value);
        }
        return magnitude;
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

        // Handle featGrant recursion: do not apply bias here, recurse into granted feat
        if (ruleType === 'featGrant' && (rule.featId || rule.featName)) {
            const featId = rule.featId;
            const featName = rule.featName;

            // Prevent infinite recursion via deduplication
            if (featId && !processedFeats.has(featId)) {
                processedFeats.add(featId);

                // Look up feat item from actor's items
                if (actor.items && actor.items.length > 0) {
                    for (const item of actor.items) {
                        if (item.type === 'feat' && item.id === featId) {
                            // Found the feat; recurse into its primitives
                            if (item.system?.rules && Array.isArray(item.system.rules)) {
                                for (const subrule of item.system.rules) {
                                    const subPrimitive = this.#processPrimitive(subrule, actor, processedFeats);
                                    this.#addBias(bias, subPrimitive);
                                }
                            }
                            break;
                        }
                    }
                }
            } else if (featName && !processedFeats.has(featName)) {
                processedFeats.add(featName);

                // Fallback: look up by name if ID not available
                if (actor.items && actor.items.length > 0) {
                    for (const item of actor.items) {
                        if (item.type === 'feat' && item.name === featName) {
                            // Found the feat; recurse into its primitives
                            if (item.system?.rules && Array.isArray(item.system.rules)) {
                                for (const subrule of item.system.rules) {
                                    const subPrimitive = this.#processPrimitive(subrule, actor, processedFeats);
                                    this.#addBias(bias, subPrimitive);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            return bias; // Don't apply bias to featGrant itself; only to granted feat's primitives
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
     * Adds bonus when prestige class deepens the base archetype
     * Reinforcement occurs when prestige deepening name matches base archetype
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

        // Check if actor has a prestige class
        const prestige = actor.system?.prestige || {};
        if (!prestige || Object.keys(prestige).length === 0) {
            return reinforcementBias;
        }

        // Get base archetype
        const baseArchetypeId = actor.system?.archetype;
        if (!baseArchetypeId || !ArchetypeRegistry.isInitialized()) {
            return reinforcementBias;
        }

        const baseArchetype = ArchetypeRegistry.get(baseArchetypeId);
        if (!baseArchetype) {
            return reinforcementBias;
        }

        // Check if any prestige class deepens this archetype
        if (!PrestigeLayerRegistry.isInitialized()) {
            return reinforcementBias;
        }

        for (const [prestigeName, prestigeData] of Object.entries(prestige)) {
            if (!prestigeData.level || prestigeData.level <= 0) continue;

            const prestigeLayer = PrestigeLayerRegistry.get(prestigeName);
            if (!prestigeLayer || !prestigeLayer.archetypeDeepenings) continue;

            // Check if this prestige has a deepening that matches the base archetype
            // Deepenings are keyed by base class (e.g., "jedi", "scout")
            // Match against archetype name or ID
            for (const [deepeningKey, deepening] of Object.entries(prestigeLayer.archetypeDeepenings)) {
                // Simple check: if deepening name or key contains archetype name, it's a match
                const archetypeName = baseArchetype.name ? baseArchetype.name.toLowerCase() : '';
                const deependingName = deepening.name ? deepening.name.toLowerCase() : '';

                if (archetypeName && (deependingName.includes(archetypeName) || archetypeName.includes(deependingName))) {
                    // Reinforcement bonus: add 0.15 to all bias categories of base archetype
                    const reinforcementBonus = 0.15;
                    if (baseArchetype.mechanicalBias) {
                        for (const [key, value] of Object.entries(baseArchetype.mechanicalBias)) {
                            if (typeof value === 'number') {
                                reinforcementBias.mechanicalBias[key] = (reinforcementBias.mechanicalBias[key] || 0) + (value * reinforcementBonus);
                            }
                        }
                    }
                    if (baseArchetype.roleBias) {
                        for (const [key, value] of Object.entries(baseArchetype.roleBias)) {
                            if (typeof value === 'number') {
                                reinforcementBias.roleBias[key] = (reinforcementBias.roleBias[key] || 0) + (value * reinforcementBonus);
                            }
                        }
                    }
                    if (baseArchetype.attributeBias) {
                        for (const [key, value] of Object.entries(baseArchetype.attributeBias)) {
                            if (typeof value === 'number') {
                                reinforcementBias.attributeBias[key] = (reinforcementBias.attributeBias[key] || 0) + (value * reinforcementBonus);
                            }
                        }
                    }
                    // Found a match; can break now
                    return reinforcementBias;
                }
            }
        }

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

        // Class Chassis Bias (Saga mechanics: BAB, HD, defense tiers, skill breadth)
        const classChassisBias = this.computeClassChassisBias(actor);
        SWSELogger.info("--- Class Chassis Bias ---");
        SWSELogger.info(`  BAB & HD contributions with pattern weight applied`);
        SWSELogger.info(`  Defense tiers (best progression, no pattern weight)`);
        SWSELogger.info(`  Skill breadth ratio (union of skills, no pattern weight)`);
        SWSELogger.info(`  Mechanical: ${JSON.stringify(classChassisBias.mechanicalBias)}`);
        SWSELogger.info(`  Role: ${JSON.stringify(classChassisBias.roleBias)}`);

        // Prestige Class Chassis Bias
        if (Object.keys(prestige).length > 0) {
            const prestigeClassChassisBias = this.computePrestigeClassChassisBias(actor);
            SWSELogger.info("--- Prestige Class Chassis Bias ---");
            SWSELogger.info(`  BAB & HD scaled ×0.5 and diminishing stacked`);
            SWSELogger.info(`  Mechanical: ${JSON.stringify(prestigeClassChassisBias.mechanicalBias)}`);
            SWSELogger.info(`  Role: ${JSON.stringify(prestigeClassChassisBias.roleBias)}`);
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

        // Equipment Affinity Bias
        const equipmentAffinityBias = this.computeEquipmentAffinityBias(actor);
        SWSELogger.info("--- Equipment Affinity Bias ---");

        // Analyze equipped items by category
        const weaponsByGroup = {};
        const armorsByCategory = {};
        if (actor.items && actor.items.length > 0) {
            for (const item of actor.items) {
                if (!item.system?.equipped) continue;
                if (item.type === 'weapon') {
                    const group = item.system?.group;
                    if (group) weaponsByGroup[group] = (weaponsByGroup[group] || 0) + 1;
                } else if (item.type === 'armor') {
                    const category = item.system?.category;
                    if (category) armorsByCategory[category] = (armorsByCategory[category] || 0) + 1;
                }
            }
        }

        if (Object.keys(weaponsByGroup).length > 0 || Object.keys(armorsByCategory).length > 0) {
            SWSELogger.info("  Equipment categories detected:");
            for (const [group, count] of Object.entries(weaponsByGroup)) {
                SWSELogger.info(`    Weapon group '${group}': ${count} items${count >= 2 ? ' [APPLIED]' : ' [below threshold]'}`);
            }
            for (const [category, count] of Object.entries(armorsByCategory)) {
                SWSELogger.info(`    Armor category '${category}': ${count} items${count >= 2 ? ' [APPLIED]' : ' [below threshold]'}`);
            }
            const magnitude = this.#calculateBiasMagnitude(equipmentAffinityBias);
            SWSELogger.info(`  Total affinity contribution: ${magnitude.toFixed(3)} (max: 0.5)`);
            if (magnitude >= 0.5) {
                SWSELogger.info(`  [CAP APPLIED: scaling factor = ${(0.5 / magnitude).toFixed(3)}]`);
            }
        } else {
            SWSELogger.info("  No equipped items with structural categories.");
        }

        SWSELogger.info(`  Mechanical: ${JSON.stringify(equipmentAffinityBias.mechanicalBias)}`);
        SWSELogger.info(`  Role: ${JSON.stringify(equipmentAffinityBias.roleBias)}`);

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
        // Base classes (Jedi, Scout, Soldier, Noble, Scoundrel) don't have intrinsic bias
        // Bias comes entirely from the selected archetype within the class
        // This method returns empty as a placeholder for future class-level bias (if needed)
        //
        // Note: If class-level bias is needed in future, implement:
        // 1. Create class-baseline-bias.json with bias for each class
        // 2. Load registry in #loadRegistry()
        // 3. Look up className in registry here

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
        // Get specialist from actor system (if stored during build)
        const specialist = actor.system?.specialist;
        if (!specialist) {
            return {
                mechanicalBias: {},
                roleBias: {},
                attributeBias: {}
            };
        }

        // Specialist may be stored as full object or just ID
        const specialistData = typeof specialist === 'object' ? specialist : null;
        if (!specialistData) {
            return {
                mechanicalBias: {},
                roleBias: {},
                attributeBias: {}
            };
        }

        return {
            mechanicalBias: specialistData.mechanicalBias || {},
            roleBias: specialistData.roleBias || {},
            attributeBias: specialistData.attributeBias || {}
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

    static #normalizeSkillKey(skillKey) {
        // Normalize various skill key formats to canonical registry keys
        // Examples: "perception" → "perception", "useTheForce" → "useTheForce"
        // This handles camelCase and lowercase variations

        if (!skillKey) return '';

        const lower = skillKey.toLowerCase();

        // Direct matches (already canonical)
        if (lower === 'acrobatics' || lower === 'athletics' || lower === 'deception' ||
            lower === 'endurance' || lower === 'gatherinfo' || lower === 'initiative' ||
            lower === 'knowledgegalacticlore' || lower === 'knowledgelifesciences' ||
            lower === 'knowledgephysicalsciences' || lower === 'knowledgesocialsciences' ||
            lower === 'knowledgetechnology' || lower === 'mechanics' || lower === 'perception' ||
            lower === 'persuasion' || lower === 'pilot' || lower === 'ride' ||
            lower === 'stealthmastery' || lower === 'survival' || lower === 'treatinjury' ||
            lower === 'usetheforce') {
            return lower;
        }

        // Convert hyphenated to camelCase
        const normalized = skillKey
            .replace(/[\s-]+/g, '') // Remove spaces and hyphens
            .toLowerCase(); // Ensure lowercase

        // Map common variations to canonical keys
        const variations = {
            'gatherinfo': 'gatherInfo',
            'knowledgegalactic': 'knowledgeGalacticLore',
            'knowledgelife': 'knowledgeLifeSciences',
            'knowledgephysical': 'knowledgePhysicalSciences',
            'knowledgesocial': 'knowledgeSocialSciences',
            'knowledgetech': 'knowledgeTechnology',
            'stealth': 'stealthMastery',
            'treatinjury': 'treatInjury',
            'useof': 'useTheForce',
            'useforce': 'useTheForce'
        };

        // Return mapped variation or lowercase normalized form
        return variations[normalized] || normalized;
    }

    /**
     * Inject survey bias into an actor's identity layer
     * This replaces any existing survey bias and triggers recomputation
     *
     * Does NOT mutate the actor directly - stores in system.swse.surveyBias
     * Caller is responsible for persisting changes if needed
     *
     * @param {Object} actor - Foundry actor (will have survey bias added to system data)
     * @param {Object} biasObject - Survey bias object { mechanicalBias, roleBias, attributeBias }
     * @returns {Object} Updated totalBias after injection
     */
    static injectSurveyBias(actor, biasObject = {}) {
        if (!actor) {
            SWSELogger.warn('[IdentityEngine.injectSurveyBias] No actor provided');
            return this.computeTotalBias(actor);
        }

        if (!actor.system) {
            actor.system = {};
        }
        if (!actor.system.swse) {
            actor.system.swse = {};
        }

        // Replace survey bias (not additive)
        actor.system.swse.surveyBias = {
            mechanicalBias: biasObject.mechanicalBias || {},
            roleBias: biasObject.roleBias || {},
            attributeBias: biasObject.attributeBias || {}
        };

        SWSELogger.log('[IdentityEngine.injectSurveyBias] Injected survey bias:', actor.system.swse.surveyBias);

        // Return recomputed total bias
        return this.computeTotalBias(actor);
    }

    /**
     * Clear survey bias from an actor's identity layer
     * This removes all survey influence and triggers recomputation
     *
     * Does NOT mutate the actor directly - resets system.swse.surveyBias
     * Caller is responsible for persisting changes if needed
     *
     * @param {Object} actor - Foundry actor
     * @returns {Object} Updated totalBias after clearing
     */
    static clearSurveyBias(actor) {
        if (!actor) {
            SWSELogger.warn('[IdentityEngine.clearSurveyBias] No actor provided');
            return this.computeTotalBias(actor);
        }

        if (!actor.system) {
            actor.system = {};
        }
        if (!actor.system.swse) {
            actor.system.swse = {};
        }

        // Clear survey bias
        actor.system.swse.surveyBias = {
            mechanicalBias: {},
            roleBias: {},
            attributeBias: {}
        };

        SWSELogger.log('[IdentityEngine.clearSurveyBias] Cleared survey bias for actor:', actor.id);

        // Return recomputed total bias
        return this.computeTotalBias(actor);
    }
}
