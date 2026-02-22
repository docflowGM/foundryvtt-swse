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

import { SWSELogger } from '../utils/logger.js';
import { CLASS_SYNERGY_DATA } from './ClassSuggestionEngine.js';

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

// ──────────────────────────────────────────────────────────────
// PRESTIGE CLASS SIGNALS
// Maps prestige classes to the signals that indicate interest
// ──────────────────────────────────────────────────────────────

export const PRESTIGE_SIGNALS = {
    'Ace Pilot': {
        feats: ['Vehicular Combat', 'Skill Focus (Pilot)'],
        skills: ['pilot'],
        talents: [],
        talentTrees: ['Spacer'],
        abilities: ['dex', 'int'],
        weight: { feats: 2, skills: 2, talents: 1, abilities: 1 }
    },
    'Assassin': {
        feats: ['Sniper', 'Point-Blank Shot', 'Precise Shot'],
        skills: ['stealth'],
        talents: ['Dastardly Strike'],
        talentTrees: ['Misfortune'],
        abilities: ['dex', 'int'],
        weight: { feats: 1, skills: 1, talents: 3, abilities: 1 }
    },
    'Bounty Hunter': {
        feats: [],
        skills: ['survival', 'perception'],
        talents: [],
        talentTrees: ['Awareness'],
        abilities: ['wis', 'dex'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    },
    'Crime Lord': {
        feats: [],
        skills: ['deception', 'persuasion'],
        talents: [],
        talentTrees: ['Fortune', 'Lineage', 'Misfortune'],
        abilities: ['cha', 'int'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    },
    'Elite Trooper': {
        feats: ['Armor Proficiency (Medium)', 'Martial Arts I', 'Point-Blank Shot', 'Flurry'],
        skills: ['endurance'],
        talents: [],
        talentTrees: ['Armor Specialist', 'Commando', 'Weapon Specialist'],
        abilities: ['str', 'con'],
        weight: { feats: 2, skills: 1, talents: 2, abilities: 1 }
    },
    'Force Adept': {
        feats: ['Force Sensitivity', 'Force Training'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Alter', 'Control', 'Sense'],
        abilities: ['wis', 'cha'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Force Disciple': {
        feats: ['Force Sensitivity', 'Force Training'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Dark Side Devotee', 'Force Adept', 'Force Item'],
        abilities: ['wis', 'cha'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Gladiator': {
        feats: ['Improved Damage Threshold', 'Weapon Proficiency (Advanced Melee Weapons)'],
        skills: [],
        talents: [],
        talentTrees: [],
        abilities: ['str', 'con'],
        weight: { feats: 3, skills: 1, talents: 1, abilities: 1 }
    },
    'Gunslinger': {
        feats: ['Point-Blank Shot', 'Precise Shot', 'Quick Draw', 'Weapon Proficiency (Pistols)'],
        skills: [],
        talents: [],
        talentTrees: ['Fortune'],
        abilities: ['dex'],
        weight: { feats: 3, skills: 1, talents: 1, abilities: 2 }
    },
    'Imperial Knight': {
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)', 'Armor Proficiency (Medium)'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Lightsaber Combat'],
        abilities: ['str', 'wis'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Infiltrator': {
        feats: ['Skill Focus (Stealth)'],
        skills: ['perception', 'stealth'],
        talents: [],
        talentTrees: ['Camouflage', 'Spy'],
        abilities: ['dex', 'int'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    },
    'Jedi Knight': {
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Lightsaber Combat', 'Jedi Mind Tricks'],
        abilities: ['wis', 'cha'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Jedi Master': {
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Lightsaber Combat', 'Jedi Mind Tricks'],
        abilities: ['wis', 'cha'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Martial Arts Master': {
        feats: ['Martial Arts I', 'Martial Arts II', 'Melee Defense'],
        skills: [],
        talents: [],
        talentTrees: ['Brawler', 'Survivor'],
        abilities: ['str', 'dex'],
        weight: { feats: 3, skills: 1, talents: 1, abilities: 1 }
    },
    'Medic': {
        feats: ['Surgical Expertise'],
        skills: ['treatInjury', 'knowledge'],
        talents: [],
        talentTrees: [],
        abilities: ['int', 'wis'],
        weight: { feats: 2, skills: 3, talents: 1, abilities: 1 }
    },
    'Melee Duelist': {
        feats: ['Melee Defense', 'Rapid Strike', 'Weapon Focus'],
        skills: [],
        talents: [],
        talentTrees: [],
        abilities: ['str', 'dex'],
        weight: { feats: 3, skills: 1, talents: 1, abilities: 1 }
    },
    'Military Engineer': {
        feats: [],
        skills: ['mechanics', 'useComputer'],
        talents: [],
        talentTrees: [],
        abilities: ['int'],
        weight: { feats: 1, skills: 3, talents: 1, abilities: 2 }
    },
    'Officer': {
        feats: [],
        skills: ['knowledge'],
        talents: [],
        talentTrees: ['Leadership', 'Commando', 'Veteran'],
        abilities: ['cha', 'int'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    },
    'Pathfinder': {
        feats: [],
        skills: ['perception', 'survival'],
        talents: [],
        talentTrees: ['Awareness', 'Camouflage', 'Survivor'],
        abilities: ['wis', 'con'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    },
    'Saboteur': {
        feats: [],
        skills: ['deception', 'mechanics', 'useComputer'],
        talents: [],
        talentTrees: [],
        abilities: ['int', 'dex'],
        weight: { feats: 1, skills: 3, talents: 1, abilities: 1 }
    },
    'Sith Apprentice': {
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Dark Side', 'Lightsaber Combat'],
        abilities: ['cha', 'str'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Sith Lord': {
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        skills: ['useTheForce'],
        talents: [],
        talentTrees: ['Dark Side', 'Lightsaber Combat'],
        abilities: ['cha', 'str'],
        weight: { feats: 2, skills: 2, talents: 2, abilities: 1 }
    },
    'Vanguard': {
        feats: [],
        skills: ['perception', 'stealth'],
        talents: [],
        talentTrees: ['Camouflage', 'Commando'],
        abilities: ['dex', 'con'],
        weight: { feats: 1, skills: 2, talents: 2, abilities: 1 }
    }
};

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
            appliedTemplate: null
        };

        // Check for applied template to inform build intent
        const appliedTemplate = actor.getFlag('foundryvtt-swse', 'appliedTemplate');
        if (appliedTemplate) {
            intent.appliedTemplate = appliedTemplate;
            SWSELogger.log(`[BUILD-INTENT] analyze() - Character uses template: ${appliedTemplate.name} (${appliedTemplate.archetype})`);
        }

        // Analyze themes from feats
        SWSELogger.log(`[BUILD-INTENT] analyze() - Analyzing ${state.ownedFeats.size} feats`);
        this._analyzeFeats(state, intent);

        // Analyze themes from talents
        SWSELogger.log(`[BUILD-INTENT] analyze() - Analyzing ${state.ownedTalents.size} talents`);
        this._analyzeTalents(state, intent);

        // Analyze themes from skills
        SWSELogger.log(`[BUILD-INTENT] analyze() - Analyzing ${state.trainedSkills.size} skills`);
        this._analyzeSkills(state, intent);

        // Analyze themes from classes
        SWSELogger.log(`[BUILD-INTENT] analyze() - Analyzing ${Object.keys(state.classes).length} classes`);
        this._analyzeClasses(state, intent);

        // Calculate prestige affinities
        SWSELogger.log(`[BUILD-INTENT] analyze() - Calculating prestige affinities`);
        this._calculatePrestigeAffinities(state, intent);

        // Apply template archetype bias if available
        if (appliedTemplate && appliedTemplate.archetype) {
            SWSELogger.log(`[BUILD-INTENT] analyze() - Applying template archetype bias: ${appliedTemplate.archetype}`);
            this._applyTemplateArchetypeBias(intent, appliedTemplate.archetype);
        }

        // Apply mentor survey biases if available (check pendingData as fallback for chargen)
        SWSELogger.log(`[BUILD-INTENT] analyze() - Applying mentor survey biases`);
        this._applyMentorBiases(actor, intent, pendingData);

        // Determine primary themes
        this._determinePrimaryThemes(intent);
        SWSELogger.log(`[BUILD-INTENT] analyze() - Primary themes determined:`, intent.primaryThemes);

        // Infer combat style
        this._inferCombatStyle(intent);
        SWSELogger.log(`[BUILD-INTENT] analyze() - Combat style inferred:`, intent.combatStyle);

        // Check for Force focus
        intent.forceFocus = (intent.themes[BUILD_THEMES.FORCE] || 0) >= 0.3;
        SWSELogger.log(`[BUILD-INTENT] analyze() - Force focus:`, intent.forceFocus);

        // Identify priority prerequisites
        this._identifyPriorityPrereqs(state, intent);
        SWSELogger.log(`[BUILD-INTENT] analyze() - Priority prereqs identified:`, intent.priorityPrereqs.length);

        SWSELogger.log(`[BUILD-INTENT] analyze() COMPLETE - Intent summary:`, {
            themes: intent.themes,
            primaryThemes: intent.primaryThemes,
            combatStyle: intent.combatStyle,
            forceFocus: intent.forceFocus,
            mentorBiases: intent.mentorBiases ? Object.keys(intent.mentorBiases) : 'NONE'
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
        (pendingData.selectedFeats || []).forEach(f => {
            ownedFeats.add(f.name || f);
        });

        const ownedTalents = new Set(
            actor.items
                .filter(i => i.type === 'talent')
                .map(t => t.name)
        );
        (pendingData.selectedTalents || []).forEach(t => {
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
        (pendingData.selectedSkills || []).forEach(s => {
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
     * Analyze feats for theme signals
     */
    static _analyzeFeats(state, intent) {
        for (const featName of state.ownedFeats) {
            // Check direct theme mapping
            const theme = FEAT_THEME_SIGNALS[featName];
            if (theme) {
                intent.themes[theme] = (intent.themes[theme] || 0) + 0.15;
                intent.signals.feats.push({ name: featName, theme });
            }

            // Check partial matches for weapon proficiencies etc.
            if (featName.includes('Lightsaber')) {
                intent.themes[BUILD_THEMES.FORCE] = (intent.themes[BUILD_THEMES.FORCE] || 0) + 0.1;
            }
            if (featName.includes('Pistol') || featName.includes('Rifle')) {
                intent.themes[BUILD_THEMES.RANGED] = (intent.themes[BUILD_THEMES.RANGED] || 0) + 0.1;
            }
            if (featName.includes('Melee') || featName.includes('Martial')) {
                intent.themes[BUILD_THEMES.MELEE] = (intent.themes[BUILD_THEMES.MELEE] || 0) + 0.1;
            }
        }
    }

    /**
     * Analyze talents for theme signals
     */
    static _analyzeTalents(state, intent) {
        // Force talents
        if (state.talentTrees.has('lightsaber combat') ||
            state.talentTrees.has('jedi mind tricks') ||
            state.talentTrees.has('telekinetic savant')) {
            intent.themes[BUILD_THEMES.FORCE] = (intent.themes[BUILD_THEMES.FORCE] || 0) + 0.2;
        }

        // Stealth talents
        if (state.talentTrees.has('camouflage') || state.talentTrees.has('spy')) {
            intent.themes[BUILD_THEMES.STEALTH] = (intent.themes[BUILD_THEMES.STEALTH] || 0) + 0.2;
        }

        // Combat talents
        if (state.talentTrees.has('armor specialist') ||
            state.talentTrees.has('weapon specialist') ||
            state.talentTrees.has('commando')) {
            intent.themes[BUILD_THEMES.COMBAT] = (intent.themes[BUILD_THEMES.COMBAT] || 0) + 0.2;
        }

        // Social talents
        if (state.talentTrees.has('influence') ||
            state.talentTrees.has('inspiration') ||
            state.talentTrees.has('leadership')) {
            intent.themes[BUILD_THEMES.SOCIAL] = (intent.themes[BUILD_THEMES.SOCIAL] || 0) + 0.2;
            intent.themes[BUILD_THEMES.LEADERSHIP] = (intent.themes[BUILD_THEMES.LEADERSHIP] || 0) + 0.15;
        }

        // Ranged talents
        if (state.talentTrees.has('sharpshooter') || state.talentTrees.has('gunslinger')) {
            intent.themes[BUILD_THEMES.RANGED] = (intent.themes[BUILD_THEMES.RANGED] || 0) + 0.2;
        }

        // Melee talents
        if (state.talentTrees.has('melee smash') || state.talentTrees.has('brawler')) {
            intent.themes[BUILD_THEMES.MELEE] = (intent.themes[BUILD_THEMES.MELEE] || 0) + 0.2;
        }

        // Tracking talents
        if (state.talentTrees.has('awareness')) {
            intent.themes[BUILD_THEMES.TRACKING] = (intent.themes[BUILD_THEMES.TRACKING] || 0) + 0.2;
        }
    }

    /**
     * Analyze skills for theme signals
     */
    static _analyzeSkills(state, intent) {
        const skillThemes = {
            usetheforce: BUILD_THEMES.FORCE,
            stealth: BUILD_THEMES.STEALTH,
            deception: BUILD_THEMES.SOCIAL,
            persuasion: BUILD_THEMES.SOCIAL,
            mechanics: BUILD_THEMES.TECH,
            usecomputer: BUILD_THEMES.TECH,
            pilot: BUILD_THEMES.VEHICLE,
            survival: BUILD_THEMES.EXPLORATION,
            treatinjury: BUILD_THEMES.SUPPORT
        };

        for (const skill of state.trainedSkills) {
            const theme = skillThemes[skill];
            if (theme) {
                intent.themes[theme] = (intent.themes[theme] || 0) + 0.1;
                intent.signals.skills.push({ name: skill, theme });
            }
        }
    }

    /**
     * Analyze classes for theme signals
     */
    static _analyzeClasses(state, intent) {
        for (const className of Object.keys(state.classes)) {
            const synergy = CLASS_SYNERGY_DATA[className];
            if (synergy?.theme) {
                intent.themes[synergy.theme] = (intent.themes[synergy.theme] || 0) + 0.25;
                intent.signals.classes.push({ name: className, theme: synergy.theme });
            }
        }
    }

    /**
     * Calculate prestige class affinities
     */
    static _calculatePrestigeAffinities(state, intent) {
        for (const [className, signals] of Object.entries(PRESTIGE_SIGNALS)) {
            let score = 0;
            const matches = { feats: [], skills: [], talents: [], talentTrees: [], abilities: [] };

            // Check feats
            for (const feat of signals.feats) {
                if (state.ownedFeats.has(feat)) {
                    score += signals.weight.feats;
                    matches.feats.push(feat);
                }
            }

            // Check skills
            for (const skill of signals.skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '');
                if (state.trainedSkills.has(skillKey)) {
                    score += signals.weight.skills;
                    matches.skills.push(skill);
                }
            }

            // Check talents
            for (const talent of signals.talents) {
                if (state.ownedTalents.has(talent)) {
                    score += signals.weight.talents;
                    matches.talents.push(talent);
                }
            }

            // Check talent trees
            for (const tree of signals.talentTrees) {
                if (state.talentTrees.has(tree.toLowerCase())) {
                    score += signals.weight.talents;
                    matches.talentTrees.push(tree);
                }
            }

            // Check abilities
            for (const ability of signals.abilities) {
                if (ability === state.highestAbility) {
                    score += signals.weight.abilities;
                    matches.abilities.push(ability);
                }
            }

            // Calculate max possible score
            const talentTreeWeight = signals.weight.talentTrees || signals.weight.talents;
            const maxScore =
                signals.feats.length * signals.weight.feats +
                signals.skills.length * signals.weight.skills +
                signals.talents.length * signals.weight.talents +
                signals.talentTrees.length * talentTreeWeight +
                signals.abilities.length * signals.weight.abilities;

            // Normalize to 0-1
            const confidence = maxScore > 0 ? Math.min(1, score / (maxScore * 0.6)) : 0;

            if (confidence > 0.1) {
                intent.prestigeAffinities.push({
                    className,
                    confidence,
                    score,
                    matches
                });
            }
        }

        // Sort by confidence
        intent.prestigeAffinities.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Determine primary themes (top 2 with confidence > 0.2)
     */
    static _determinePrimaryThemes(intent) {
        const sorted = Object.entries(intent.themes)
            .filter(([_, score]) => score >= 0.2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        intent.primaryThemes = sorted.map(([theme]) => theme);
    }

    /**
     * Infer combat style based on themes
     */
    static _inferCombatStyle(intent) {
        const forceScore = intent.themes[BUILD_THEMES.FORCE] || 0;
        const rangedScore = intent.themes[BUILD_THEMES.RANGED] || 0;
        const meleeScore = intent.themes[BUILD_THEMES.MELEE] || 0;

        if (forceScore > rangedScore && forceScore > meleeScore && forceScore >= 0.2) {
            intent.combatStyle = 'lightsaber';
        } else if (rangedScore > meleeScore && rangedScore >= 0.2) {
            intent.combatStyle = 'ranged';
        } else if (meleeScore >= 0.2) {
            intent.combatStyle = 'melee';
        } else {
            intent.combatStyle = 'mixed';
        }
    }

    /**
     * Identify priority prerequisites for top prestige targets
     */
    static _identifyPriorityPrereqs(state, intent) {
        const topTargets = intent.prestigeAffinities.slice(0, 3);

        for (const target of topTargets) {
            const signals = PRESTIGE_SIGNALS[target.className];
            if (!signals) {continue;}

            // Check missing feats
            for (const feat of signals.feats) {
                if (!state.ownedFeats.has(feat)) {
                    intent.priorityPrereqs.push({
                        type: 'feat',
                        name: feat,
                        forClass: target.className,
                        confidence: target.confidence
                    });
                }
            }

            // Check missing skills
            for (const skill of signals.skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '');
                if (!state.trainedSkills.has(skillKey)) {
                    intent.priorityPrereqs.push({
                        type: 'skill',
                        name: skill,
                        forClass: target.className,
                        confidence: target.confidence
                    });
                }
            }
        }

        // Sort by confidence
        intent.priorityPrereqs.sort((a, b) => b.confidence - a.confidence);
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
     * @param {string} talentName - Name of the talent
     * @param {string} treeName - Name of the talent tree
     * @param {Object} intent - Build intent object
     * @returns {{aligned: boolean, reason: string|null}}
     */
    static checkTalentAlignment(talentName, treeName, intent) {
        // Check if talent tree is associated with top prestige targets
        for (const target of intent.prestigeAffinities.slice(0, 3)) {
            const signals = PRESTIGE_SIGNALS[target.className];
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
     * Apply mentor survey biases to theme scores
     * Mentor biases provide soft influence based on player intent questionnaire
     * @private
     * @param {Actor} actor - The actor being analyzed
     * @param {Object} intent - The build intent object to update
     * @param {Object} pendingData - Pending selections (may contain mentorBiases during chargen)
     */
    static _applyMentorBiases(actor, intent, pendingData = {}) {
        SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() START - Actor: ${actor.id} (${actor.name})`);

        // Try to get biases from actor first, then fall back to pendingData (for chargen flow)
        let mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
        SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - Retrieved actor biases:`, mentorBiases);

        // Fallback to pendingData.mentorBiases if actor doesn't have biases (chargen scenario)
        if ((!mentorBiases || Object.keys(mentorBiases).length === 0) && pendingData?.mentorBiases) {
            mentorBiases = pendingData.mentorBiases;
            SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - Using pendingData.mentorBiases fallback:`, mentorBiases);
        }

        if (!mentorBiases || Object.keys(mentorBiases).length === 0) {
            SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - No mentor biases to apply`);
            return; // No mentor biases to apply
        }

        // Map bias keys to theme keys
        const biasToThemeMap = {
            forceFocus: BUILD_THEMES.FORCE,
            combatStyle: null, // Handled separately
            melee: BUILD_THEMES.MELEE,
            ranged: BUILD_THEMES.RANGED,
            stealth: BUILD_THEMES.STEALTH,
            social: BUILD_THEMES.SOCIAL,
            tech: BUILD_THEMES.TECH,
            leadership: BUILD_THEMES.LEADERSHIP,
            awareness: null, // Handled as a signal
            mobility: null, // Handled as a signal
            survival: BUILD_THEMES.EXPLORATION,
            control: null, // Influences prestige
            damage: null, // Influences feat selection
            survivability: null, // Influences survivability focus
            utility: null, // Influences skill/versatility
            support: BUILD_THEMES.SUPPORT,
            specialization: null, // Meta-preference
            generalist: null, // Meta-preference
            balance: null, // Meta-preference
            order: null, // Meta-preference
            pragmatic: null, // Meta-preference
            riskTolerance: null, // Meta-preference
            authority: null // Meta-preference
        };

        // Apply biases to themes with small weight (0.05x multiplier)
        SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - Processing ${Object.keys(mentorBiases).length} bias entries`);
        for (const [biasKey, biasValue] of Object.entries(mentorBiases)) {
            const themeKey = biasToThemeMap[biasKey];
            SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - Bias key: "${biasKey}", value: ${biasValue}, maps to theme: "${themeKey}"`);
            if (themeKey && biasValue > 0) {
                // Apply bias with light weighting (don't let survey override actual choices)
                const biasContribution = biasValue * 0.05;
                intent.themes[themeKey] = (intent.themes[themeKey] || 0) + biasContribution;
                SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() - Applied bias to theme "${themeKey}": +${biasContribution}, new score: ${intent.themes[themeKey]}`);
            }
        }

        // Store mentor biases in intent for reference
        intent.mentorBiases = mentorBiases;
        SWSELogger.log(`[BUILD-INTENT] _applyMentorBiases() COMPLETE - Final themes after bias:`, intent.themes);
    }
}

export default BuildIntent;
