/**
 * SWSE Build Intent Analyzer
 *
 * Analyzes character progression to infer build direction and goals.
 * This module provides shared context for both class and feat/talent
 * suggestion engines, ensuring coherent recommendations.
 *
 * Key principles:
 * - Observe patterns, not single choices
 * - Weighted inference, not locking
 * - Influences ordering and explanation only
 * - Never hides options or overrides RAW legality
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ClassSuggestionEngine.js";
import { ArchetypeRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry.js";
import { PrestigeLayerRegistry } from "/systems/foundryvtt-swse/scripts/engine/prestige/prestige-layer-registry.js";
import { IdentityEngine } from "/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js";
import { BiasTagProjection } from "/systems/foundryvtt-swse/scripts/engine/prestige/bias-tag-projection.js";
import { BuildThemeProjection } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildThemeProjection.js";
import { PrestigeAffinityEngine, initializePrestigeSignals } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PrestigeAffinityEngine.js";

// Re-export initializePrestigeSignals for external consumers
export { initializePrestigeSignals };
import { MilestoneComputer } from "/systems/foundryvtt-swse/scripts/engine/suggestion/MilestoneComputer.js";
import { getPrimaryArchetypeForActor } from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry-integration.js";

// ──────────────────────────────────────────────────────────────
// PRESTIGE SIGNALS LOADER
// Load from data file instead of hardcoding
// ──────────────────────────────────────────────────────────────

export let PRESTIGE_SIGNALS = {};

/**
 * Initialize prestige signals from /data/prestige-signals.json
 * Called once at module load
 */
export async function initializePrestigeSignalsData() {
    try {
        const response = await fetch('/systems/foundryvtt-swse/data/prestige-signals.json');
        if (!response.ok) {
            throw new Error(`Failed to load prestige signals: ${response.status}`);
        }
        const data = await response.json();
        PRESTIGE_SIGNALS = data.signals || {};
        SWSELogger.log(`[BuildIntent] Loaded ${Object.keys(PRESTIGE_SIGNALS).length} prestige class signals from data file`);

        // Also initialize PrestigeAffinityEngine with signals
        initializePrestigeSignals(PRESTIGE_SIGNALS);
    } catch (err) {
        SWSELogger.error('[BuildIntent] Failed to load prestige signals from data file:', err);
        PRESTIGE_SIGNALS = {}; // Fall back to empty, signals will be sourced from registry only
        initializePrestigeSignals({});
    }
}

// ──────────────────────────────────────────────────────────────
// BUILD THEME DEFINITIONS
// ──────────────────────────────────────────────────────────────

export const BUILD_THEMES = {
    FORCE: 'force',
    RANGED: 'ranged',
    MELEE: 'melee',
    STEALTH: 'stealth',
    SOCIAL: 'social',
    TECH: 'tech',
    LEADERSHIP: 'leadership',
    EXPLORATION: 'exploration',
    VEHICLE: 'vehicle',
    SUPPORT: 'support',
    COMBAT: 'combat',
    TRACKING: 'tracking'
};

// Note: PRESTIGE_SIGNALS is now loaded from /data/prestige-signals.json
// See initializePrestigeSignals() above

// ──────────────────────────────────────────────────────────────
// FEAT SIGNAL MAPPINGS
// Maps feats to themes they indicate
// ──────────────────────────────────────────────────────────────

export const FEAT_THEME_SIGNALS = {
    // Force feats
    'Force Sensitivity': BUILD_THEMES.FORCE,
    'Force Training': BUILD_THEMES.FORCE,
    'Force Boon': BUILD_THEMES.FORCE,
    'Strong in the Force': BUILD_THEMES.FORCE,

    // Ranged combat feats
    'Point-Blank Shot': BUILD_THEMES.RANGED,
    'Precise Shot': BUILD_THEMES.RANGED,
    'Rapid Shot': BUILD_THEMES.RANGED,
    'Sniper': BUILD_THEMES.RANGED,
    'Far Shot': BUILD_THEMES.RANGED,
    'Deadeye': BUILD_THEMES.RANGED,
    'Quick Draw': BUILD_THEMES.RANGED,

    // Melee combat feats
    'Martial Arts I': BUILD_THEMES.MELEE,
    'Martial Arts II': BUILD_THEMES.MELEE,
    'Martial Arts III': BUILD_THEMES.MELEE,
    'Melee Defense': BUILD_THEMES.MELEE,
    'Rapid Strike': BUILD_THEMES.MELEE,
    'Flurry': BUILD_THEMES.MELEE,
    'Weapon Proficiency (Lightsabers)': BUILD_THEMES.FORCE,
    'Weapon Focus (Lightsabers)': BUILD_THEMES.FORCE,
    'Weapon Proficiency (Advanced Melee Weapons)': BUILD_THEMES.MELEE,

    // Stealth feats
    'Skill Focus (Stealth)': BUILD_THEMES.STEALTH,
    'Stealthy': BUILD_THEMES.STEALTH,

    // Social feats
    'Skill Focus (Persuasion)': BUILD_THEMES.SOCIAL,
    'Skill Focus (Deception)': BUILD_THEMES.SOCIAL,
    'Linguist': BUILD_THEMES.SOCIAL,

    // Tech feats
    'Skill Focus (Mechanics)': BUILD_THEMES.TECH,
    'Skill Focus (Use Computer)': BUILD_THEMES.TECH,
    'Tech Specialist': BUILD_THEMES.TECH,

    // Vehicle feats
    'Vehicular Combat': BUILD_THEMES.VEHICLE,
    'Skill Focus (Pilot)': BUILD_THEMES.VEHICLE,

    // Combat general
    'Armor Proficiency (Light)': BUILD_THEMES.COMBAT,
    'Armor Proficiency (Medium)': BUILD_THEMES.COMBAT,
    'Armor Proficiency (Heavy)': BUILD_THEMES.COMBAT,
    'Toughness': BUILD_THEMES.COMBAT,
    'Improved Damage Threshold': BUILD_THEMES.COMBAT,

    // Medical/Support
    'Surgical Expertise': BUILD_THEMES.SUPPORT,
    'Skill Focus (Treat Injury)': BUILD_THEMES.SUPPORT
};

// ──────────────────────────────────────────────────────────────
// BUILD INTENT CLASS
// ──────────────────────────────────────────────────────────────

export class BuildIntent {

    /**
     * Analyze an actor's build to determine intent and direction
     * @param {Actor} actor - The actor to analyze
     * @param {Object} pendingData - Pending selections from level-up
     * @returns {Promise<Object>} Build intent analysis
     */
    static async analyze(actor, pendingData = {}) {
        SWSELogger.log(`[BUILD-INTENT] analyze() START - Actor: ${actor.id} (${actor.name})`);
        const state = await this._buildActorState(actor, pendingData);
        SWSELogger.log(`[BUILD-INTENT] analyze() - Actor state built:`, {
            ownedFeats: state.ownedFeats.size,
            ownedTalents: state.ownedTalents.size,
            talentTrees: Array.from(state.talentTrees),
            trainedSkills: Array.from(state.trainedSkills),
            highestAbility: state.highestAbility,
            classes: Object.keys(state.classes)
        });

        const intent = {
            // Theme scores (0-1 confidence)
            themes: {},
            // Primary themes (highest confidence)
            primaryThemes: [],
            // Prestige class affinities with confidence scores
            prestigeAffinities: [],
            // Combat style inference
            combatStyle: null,
            // Force focus flag
            forceFocus: false,
            // Key signals that informed this intent
            signals: {
                feats: [],
                talents: [],
                skills: [],
                classes: []
            },
            // Priority prerequisites to suggest
            priorityPrereqs: [],
            // Template information if applied
            appliedTemplate: null,
            // TIER 1: Archetype affinity data for identity projection
            primaryArchetypeId: null,
            maxArchetypeFrequency: 1,
            archetypeAffinityIndex: new Map() // Map<itemId, { confidence, archetypeFrequency, roleAffinity? }>
        };

        // Check for applied template to inform build intent
        const appliedTemplate = actor.getFlag('foundryvtt-swse', 'appliedTemplate');
        if (appliedTemplate) {
            intent.appliedTemplate = appliedTemplate;
            SWSELogger.log(`[BUILD-INTENT] analyze() - Character uses template: ${appliedTemplate.name} (${appliedTemplate.archetype})`);
        }

        // Analyze themes using BuildThemeProjection
        SWSELogger.log(`[BUILD-INTENT] analyze() - Delegating theme analysis to BuildThemeProjection`);
        const themeData = BuildThemeProjection.analyzeSignals(state);
        intent.themes = themeData.themes;
        intent.primaryThemes = themeData.primaryThemes;
        intent.combatStyle = themeData.combatStyle;
        intent.signals = themeData.signals;

        // Calculate prestige affinities using PrestigeAffinityEngine
        SWSELogger.log(`[BUILD-INTENT] analyze() - Delegating prestige analysis to PrestigeAffinityEngine`);
        const prestigeData = await PrestigeAffinityEngine.analyzePrestigeTargets(state, intent);
        intent.prestigeAffinities = prestigeData.prestigeAffinities;
        intent.priorityPrereqs = prestigeData.priorityPrereqs;

        // PHASE 2 SHIFT: Identity computation moved to IdentityEngine
        // BuildIntent no longer computes or owns identity.
        // SuggestionEngine and callers now compute identityBias directly via IdentityEngine.computeTotalBias()
        SWSELogger.log(`[BUILD-INTENT] analyze() - Identity authority shifted to IdentityEngine.computeTotalBias()`);

        // Resolve class/archetype metadata for richer tag-aware suggestion scoring
        try {
            const primaryArchetype = await getPrimaryArchetypeForActor(actor);
            if (primaryArchetype) {
                intent.primaryArchetypeMeta = primaryArchetype;
                if (!intent.primaryArchetypeId) {
                    intent.primaryArchetypeId = primaryArchetype.id || null;
                }
            }
        } catch (err) {
            SWSELogger.warn('[BUILD-INTENT] Failed to resolve primary archetype metadata:', err);
        }

        // Apply template archetype bias if available
        if (appliedTemplate && appliedTemplate.archetype) {
            SWSELogger.log(`[BUILD-INTENT] analyze() - Applying template archetype bias: ${appliedTemplate.archetype}`);
            this._applyTemplateArchetypeBias(intent, appliedTemplate.archetype);

            // TIER 1: Compute archetype affinity index for identity projection scoring
            intent.primaryArchetypeId = appliedTemplate.archetype;
            const affinityData = this._computeArchetypeAffinityIndex(
                appliedTemplate.archetype,
                state.ownedFeats,
                state.ownedTalents
            );
            intent.archetypeAffinityIndex = affinityData.index;
            intent.maxArchetypeFrequency = affinityData.maxFrequency;
            SWSELogger.log(`[BUILD-INTENT] analyze() - Archetype affinity computed:`, {
                archetype: appliedTemplate.archetype,
                itemsIndexed: affinityData.index.size,
                maxFrequency: affinityData.maxFrequency
            });
        }

        // Apply mentor survey biases if available (check pendingData as fallback for chargen)
        SWSELogger.log(`[BUILD-INTENT] analyze() - Applying mentor survey biases`);
        this._applyMentorBiases(actor, intent, pendingData);

        // Primary themes and combat style already determined by BuildThemeProjection
        SWSELogger.log(`[BUILD-INTENT] analyze() - Primary themes:`, intent.primaryThemes);
        SWSELogger.log(`[BUILD-INTENT] analyze() - Combat style:`, intent.combatStyle);

        // Check for Force focus
        intent.forceFocus = (intent.themes[BUILD_THEMES.FORCE] || 0) >= 0.3;
        SWSELogger.log(`[BUILD-INTENT] analyze() - Force focus:`, intent.forceFocus);

        // Priority prerequisites already identified by PrestigeAffinityEngine
        SWSELogger.log(`[BUILD-INTENT] analyze() - Priority prereqs identified:`, intent.priorityPrereqs.length);

        // Phase 2B: Compute next-level milestones for forecasting
        SWSELogger.log(`[BUILD-INTENT] analyze() - Computing next-level milestones`);
        try {
            const milestoneData = MilestoneComputer.computeNextLevelMilestones(actor);
            intent.nextLevelMilestones = milestoneData.nextLevelMilestones;
            intent.nextLevelMilestonesByClass = milestoneData.nextLevelMilestonesByClass;
            SWSELogger.log(`[BUILD-INTENT] analyze() - Milestones computed:`, {
                nextHeroicLevel: intent.nextLevelMilestones.nextHeroicLevel,
                nextAttributeIncrease: intent.nextLevelMilestones.nextAttributeIncreaseLevel,
                classMilestones: intent.nextLevelMilestonesByClass.size
            });
        } catch (err) {
            SWSELogger.warn(`[BUILD-INTENT] analyze() - Failed to compute milestones:`, err);
            // Graceful fallback - continue without milestones
            intent.nextLevelMilestones = {};
            intent.nextLevelMilestonesByClass = new Map();
        }

        SWSELogger.log(`[BUILD-INTENT] analyze() COMPLETE - Intent summary:`, {
            themes: intent.themes,
            primaryThemes: intent.primaryThemes,
            combatStyle: intent.combatStyle,
            forceFocus: intent.forceFocus,
            mentorBiases: intent.mentorBiases ? Object.keys(intent.mentorBiases) : 'NONE',
            nextLevelMilestones: !!intent.nextLevelMilestones
        });

        return intent;
    }

    /**
     * Build normalized actor state
     */
    static async _buildActorState(actor, pendingData = {}) {
        const ownedFeats = new Set(
            actor.items
                .filter(i => i.type === 'feat')
                .map(f => f.name)
        );
        // FIX: Ensure selectedFeats is an array before calling .forEach()
        const selectedFeatsArray = Array.isArray(pendingData.selectedFeats) ? pendingData.selectedFeats : [];
        selectedFeatsArray.forEach(f => {
            ownedFeats.add(f.name || f);
        });

        const ownedTalents = new Set(
            actor.items
                .filter(i => i.type === 'talent')
                .map(t => t.name)
        );
        // FIX: Ensure selectedTalents is an array before calling .forEach()
        const selectedTalentsArray = Array.isArray(pendingData.selectedTalents) ? pendingData.selectedTalents : [];
        selectedTalentsArray.forEach(t => {
            ownedTalents.add(t.name || t);
        });

        const talentTrees = new Set(
            actor.items
                .filter(i => i.type === 'talent' && i.system?.tree)
                .map(t => t.system.tree.toLowerCase())
        );

        const trainedSkills = new Set();
        const skills = actor.system?.skills || {};
        for (const [skillKey, skillData] of Object.entries(skills)) {
            if (skillData?.trained) {
                trainedSkills.add(skillKey.toLowerCase());
            }
        }
        // FIX: Ensure selectedSkills is an array before calling .forEach()
        const selectedSkillsArray = Array.isArray(pendingData.selectedSkills) ? pendingData.selectedSkills : [];
        selectedSkillsArray.forEach(s => {
            trainedSkills.add((s.key || s).toLowerCase());
        });

        const abilities = actor.system?.attributes || {};
        let highestAbility = null;
        let highestScore = 0;
        for (const [key, data] of Object.entries(abilities)) {
            const score = data?.total || data?.value || 10;
            if (score > highestScore) {
                highestScore = score;
                highestAbility = key.toLowerCase();
            }
        }

        const classes = {};
        actor.items
            .filter(i => i.type === 'class')
            .forEach(c => {
                classes[c.name] = c.system?.level || 1;
            });

        return {
            ownedFeats,
            ownedTalents,
            talentTrees,
            trainedSkills,
            highestAbility,
            highestScore,
            classes
        };
    }



    /**
     * [DEPRECATED] Compute actor identity via IdentityEngine
     *
     * DEPRECATED IN PHASE 2: This method has been removed from the analysis pipeline.
     * Identity authority is now with IdentityEngine.computeTotalBias().
     *
     * SuggestionEngine and all callers must now:
     * 1. Call IdentityEngine.computeTotalBias(actor) directly
     * 2. Pass identityBias as a parameter to suggestion engines
     *
     * This method is preserved as a stub for backwards compatibility only.
     * It should not be called from new code.
     *
     * @deprecated Use IdentityEngine.computeTotalBias(actor) instead
     * @private
     */
    static async _computeActorIdentity(actor, appliedTemplate, intent) {
        SWSELogger.warn(
            '[BUILD-INTENT] _computeActorIdentity() DEPRECATED - ' +
            'This method has been removed from the analysis pipeline. ' +
            'Use IdentityEngine.computeTotalBias(actor) directly instead.'
        );
        return null;
    }


    /**
     * Check if a feat aligns with the build intent
     * @param {string} featName - Name of the feat
     * @param {Object} intent - Build intent object
     * @returns {{aligned: boolean, reason: string|null}}
     */
    static checkFeatAlignment(featName, intent) {
        // Check if feat is a priority prereq
        const priorityPrereq = intent.priorityPrereqs.find(p =>
            p.type === 'feat' && p.name === featName
        );
        if (priorityPrereq) {
            return {
                aligned: true,
                reason: `Supports path toward ${priorityPrereq.forClass}`
            };
        }

        // Check theme alignment
        const featTheme = FEAT_THEME_SIGNALS[featName];
        if (featTheme && intent.primaryThemes.includes(featTheme)) {
            return {
                aligned: true,
                reason: `Aligns with your ${featTheme}-focused build`
            };
        }

        // Check partial matches
        if (intent.forceFocus && featName.includes('Force')) {
            return {
                aligned: true,
                reason: 'Supports your Force-focused build'
            };
        }

        if (intent.combatStyle === 'ranged' &&
            (featName.includes('Shot') || featName.includes('Pistol') || featName.includes('Rifle'))) {
            return {
                aligned: true,
                reason: 'Supports your ranged combat style'
            };
        }

        if (intent.combatStyle === 'melee' &&
            (featName.includes('Melee') || featName.includes('Martial'))) {
            return {
                aligned: true,
                reason: 'Supports your melee combat style'
            };
        }

        return { aligned: false, reason: null };
    }

    /**
     * Check if a talent aligns with the build intent
     * Now data-driven: uses signals from ArchetypeRegistry or item metadata
     * @param {string} talentName - Name of the talent
     * @param {string} treeName - Name of the talent tree
     * @param {Object} intent - Build intent object
     * @returns {{aligned: boolean, reason: string|null}}
     */
    static checkTalentAlignment(talentName, treeName, intent) {
        // Check if talent tree is associated with top prestige targets
        for (const target of intent.prestigeAffinities.slice(0, 3)) {
            // Try to get signals from ArchetypeRegistry first
            let signals = this._getPrestigeSignals(target.className);
            if (!signals) {
                // Fall back to hardcoded PRESTIGE_SIGNALS for vanilla prestige classes
                signals = PRESTIGE_SIGNALS[target.className];
            }

            if (signals?.talentTrees?.some(t =>
                t.toLowerCase() === treeName.toLowerCase()
            )) {
                return {
                    aligned: true,
                    reason: `Supports path toward ${target.className}`
                };
            }
        }

        // Check Force alignment
        if (intent.forceFocus) {
            const forceTrees = ['lightsaber combat', 'jedi mind tricks', 'alter', 'control', 'sense'];
            if (forceTrees.includes(treeName.toLowerCase())) {
                return {
                    aligned: true,
                    reason: 'Supports your Force-focused build'
                };
            }
        }

        return { aligned: false, reason: null };
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

    /**
     * Get explanation for a prestige class recommendation
     * @param {string} className - Prestige class name
     * @param {Object} intent - Build intent object
     * @returns {string|null}
     */
    static getPrestigeRecommendationReason(className, intent) {
        const affinity = intent.prestigeAffinities.find(a => a.className === className);
        if (!affinity || affinity.confidence < 0.2) {
            return null;
        }

        const matches = [];
        if (affinity.matches.feats.length > 0) {
            matches.push(`your ${affinity.matches.feats.join(', ')} feat(s)`);
        }
        if (affinity.matches.talentTrees.length > 0) {
            matches.push(`${affinity.matches.talentTrees.join(', ')} talents`);
        }
        if (affinity.matches.skills.length > 0) {
            matches.push(`trained ${affinity.matches.skills.join(', ')}`);
        }

        if (matches.length > 0) {
            return `Builds on ${matches.join(' and ')}`;
        }

        return 'Aligns with your build direction';
    }

    /**
     * Apply template archetype bias to intent
     * Templates are "pure" archetypes, so they strongly bias the build intent
     * @private
     * @param {Object} intent - The build intent object to update
     * @param {string} archetype - The template's archetype name
     */
    static _applyTemplateArchetypeBias(intent, archetype) {
        SWSELogger.log(`[BUILD-INTENT] _applyTemplateArchetypeBias() START - Archetype: ${archetype}`);

        // Map common archetypes to build themes
        const archetypeThemeMap = {
            // Melee-focused archetypes
            'Duelist': { [BUILD_THEMES.MELEE]: 0.4, [BUILD_THEMES.COMBAT]: 0.3 },
            'Swordmaster': { [BUILD_THEMES.MELEE]: 0.5, [BUILD_THEMES.COMBAT]: 0.4 },
            'Gladiator': { [BUILD_THEMES.MELEE]: 0.5, [BUILD_THEMES.COMBAT]: 0.4 },
            'Warrior': { [BUILD_THEMES.MELEE]: 0.4, [BUILD_THEMES.COMBAT]: 0.3 },

            // Ranged-focused archetypes
            'Gunslinger': { [BUILD_THEMES.RANGED]: 0.5, [BUILD_THEMES.COMBAT]: 0.3 },
            'Marksman': { [BUILD_THEMES.RANGED]: 0.4, [BUILD_THEMES.COMBAT]: 0.2 },
            'Sniper': { [BUILD_THEMES.RANGED]: 0.4, [BUILD_THEMES.STEALTH]: 0.3 },
            'Gunfighter': { [BUILD_THEMES.RANGED]: 0.5, [BUILD_THEMES.COMBAT]: 0.3 },

            // Stealth-focused archetypes
            'Assassin': { [BUILD_THEMES.STEALTH]: 0.5, [BUILD_THEMES.COMBAT]: 0.3 },
            'Spy': { [BUILD_THEMES.STEALTH]: 0.4, [BUILD_THEMES.TECH]: 0.2 },
            'Shadow': { [BUILD_THEMES.STEALTH]: 0.5, [BUILD_THEMES.COMBAT]: 0.2 },
            'Infiltrator': { [BUILD_THEMES.STEALTH]: 0.4, [BUILD_THEMES.TECH]: 0.2 },

            // Force-focused archetypes
            'Jedi': { [BUILD_THEMES.FORCE]: 0.5, [BUILD_THEMES.MELEE]: 0.2 },
            'Sith': { [BUILD_THEMES.FORCE]: 0.5, [BUILD_THEMES.MELEE]: 0.2 },
            'Force Adept': { [BUILD_THEMES.FORCE]: 0.4, [BUILD_THEMES.TECH]: 0.1 },
            'Knight': { [BUILD_THEMES.FORCE]: 0.4, [BUILD_THEMES.MELEE]: 0.3 },

            // Social-focused archetypes
            'Diplomat': { [BUILD_THEMES.SOCIAL]: 0.4, [BUILD_THEMES.LEADERSHIP]: 0.3 },
            'Leader': { [BUILD_THEMES.LEADERSHIP]: 0.4, [BUILD_THEMES.SOCIAL]: 0.3 },
            'Scoundrel': { [BUILD_THEMES.SOCIAL]: 0.3, [BUILD_THEMES.TECH]: 0.2 },

            // Tech-focused archetypes
            'Mechanic': { [BUILD_THEMES.TECH]: 0.4, [BUILD_THEMES.SUPPORT]: 0.2 },
            'Engineer': { [BUILD_THEMES.TECH]: 0.4, [BUILD_THEMES.SUPPORT]: 0.2 },
            'Hacker': { [BUILD_THEMES.TECH]: 0.4, [BUILD_THEMES.STEALTH]: 0.1 },

            // Exploration-focused archetypes
            'Scout': { [BUILD_THEMES.EXPLORATION]: 0.3, [BUILD_THEMES.RANGED]: 0.2 },
            'Explorer': { [BUILD_THEMES.EXPLORATION]: 0.3 },
            'Tracker': { [BUILD_THEMES.EXPLORATION]: 0.3, [BUILD_THEMES.TRACKING]: 0.2 },

            // Vehicle-focused archetypes
            'Pilot': { [BUILD_THEMES.VEHICLE]: 0.4, [BUILD_THEMES.RANGED]: 0.2 },
            'Ace': { [BUILD_THEMES.VEHICLE]: 0.4, [BUILD_THEMES.COMBAT]: 0.2 },

            // Support-focused archetypes
            'Medic': { [BUILD_THEMES.SUPPORT]: 0.3, [BUILD_THEMES.TECH]: 0.2 },
            'Healer': { [BUILD_THEMES.SUPPORT]: 0.3 },
            'Scholar': { [BUILD_THEMES.TECH]: 0.3, [BUILD_THEMES.SUPPORT]: 0.1 }
        };

        const themeBoosts = archetypeThemeMap[archetype];
        if (themeBoosts) {
            SWSELogger.log(`[BUILD-INTENT] _applyTemplateArchetypeBias() - Found theme mapping for archetype: ${archetype}`, themeBoosts);
            for (const [themeKey, boostValue] of Object.entries(themeBoosts)) {
                intent.themes[themeKey] = (intent.themes[themeKey] || 0) + boostValue;
                SWSELogger.log(`[BUILD-INTENT] _applyTemplateArchetypeBias() - Boosted theme "${themeKey}": +${boostValue}, new score: ${intent.themes[themeKey]}`);
            }
        } else {
            SWSELogger.log(`[BUILD-INTENT] _applyTemplateArchetypeBias() - No specific mapping for archetype: ${archetype}`);
        }

        SWSELogger.log(`[BUILD-INTENT] _applyTemplateArchetypeBias() COMPLETE - Final themes after template bias:`, intent.themes);
    }

    /**
     * [DEPRECATED] Apply mentor survey biases to theme scores
     *
     * DEPRECATED: Survey bias is now handled exclusively by IdentityEngine.
     * This method exists only for backward compatibility and will log a deprecation warning.
     * All survey influence now flows through:
     *   1. MentorSurvey.convertSurveyAnswersToBias() - converts survey to bias layers
     *   2. IdentityEngine.injectSurveyBias() - injects bias into identity layer
     *   3. IdentityEngine.computeTotalBias() - aggregates all layers including survey
     *
     * BuildIntent no longer modifies bias. It only reads identity for analysis.
     *
     * @deprecated Use IdentityEngine.injectSurveyBias() instead
     * @private
     * @param {Actor} actor - The actor being analyzed (unused)
     * @param {Object} intent - The build intent object (not modified)
     * @param {Object} pendingData - Pending selections (unused)
     */
    static _applyMentorBiases(actor, intent, pendingData = {}) {
        SWSELogger.warn(
            `[BUILD-INTENT] _applyMentorBiases() DEPRECATED - ` +
            `Survey bias is now injected via IdentityEngine.injectSurveyBias(). ` +
            `This method no longer does anything.`
        );
        // DEPRECATED: Do nothing. Survey authority has moved to IdentityEngine.
    }

    /**
     * TIER 1: Compute archetype affinity index for items
     *
     * For each owned feat/talent, determines:
     * - How many archetypes recommend it (frequency)
     * - Confidence score based on frequency
     * - Optional role affinity if archetype has roles
     *
     * @private
     * @param {string} primaryArchetypeId - The primary archetype ID
     * @param {Set<string>} ownedFeats - Set of owned feat item IDs
     * @param {Set<string>} ownedTalents - Set of owned talent item IDs
     * @returns {Object} { index: Map<itemId, affinityEntry>, maxFrequency: number }
     */
    static _computeArchetypeAffinityIndex(primaryArchetypeId, ownedFeats, ownedTalents) {
        const index = new Map();
        let maxFrequency = 1;

        try {
            // Get primary archetype
            const primaryArchetype = ArchetypeRegistry.get(primaryArchetypeId);
            if (!primaryArchetype) {
                SWSELogger.warn(
                    `[BUILD-INTENT] Primary archetype "${primaryArchetypeId}" not found in registry`
                );
                return { index, maxFrequency };
            }

            // Get all archetypes to count recommendations
            const allArchetypes = ArchetypeRegistry.getAll();
            if (!allArchetypes || allArchetypes.length === 0) {
                SWSELogger.warn('[BUILD-INTENT] No archetypes available for affinity computation');
                return { index, maxFrequency };
            }

            // Combine owned feats and talents
            const ownedItems = new Set([...ownedFeats, ...ownedTalents]);

            // For each owned item, count how many archetypes recommend it
            for (const itemId of ownedItems) {
                let frequency = 0;
                let recommendedByArchetypes = [];

                for (const arch of allArchetypes) {
                    const isFeatRecommended = ArchetypeRegistry.isRecommendedFeat(itemId, arch);
                    const isTalentRecommended = ArchetypeRegistry.isRecommendedTalent(itemId, arch);

                    if (isFeatRecommended || isTalentRecommended) {
                        frequency++;
                        recommendedByArchetypes.push(arch);
                    }
                }

                if (frequency > 0) {
                    // Frequency-based confidence: archetypes that recommend this item
                    // Normalized: frequency / total archetypes
                    const confidence = Math.min(1.0, frequency / Math.max(allArchetypes.length, 1));

                    // Build role affinity if primary archetype has roles
                    let roleAffinity = null;
                    if (primaryArchetype.roles && primaryArchetype.roles.length > 0) {
                        roleAffinity = {};
                        for (const role of primaryArchetype.roles) {
                            // Simple: 1.0 for primary archetype's role, 0.5 for others
                            const matchCount = recommendedByArchetypes.filter(
                                a => a.roles && a.roles.includes(role)
                            ).length;
                            roleAffinity[role] = matchCount > 0 ? 1.0 : 0.5;
                        }
                    }

                    const affinityEntry = {
                        id: itemId,
                        archetypeFrequency: frequency,
                        confidence,
                        roleAffinity
                    };

                    index.set(itemId, affinityEntry);
                    maxFrequency = Math.max(maxFrequency, frequency);
                }
            }

            SWSELogger.log(
                `[BUILD-INTENT] Archetype affinity index built:`,
                { itemCount: index.size, maxFrequency, primaryArchetype: primaryArchetype.name }
            );
        } catch (err) {
            SWSELogger.error('[BUILD-INTENT] Error computing archetype affinity index:', err);
        }

        return { index, maxFrequency };
    }
}

export default BuildIntent;
