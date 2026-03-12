/**
 * SWSE Build Theme Projection
 *
 * Pure signal analysis for theme inference.
 * Analyzes actor state (feats, talents, skills, classes) to determine:
 * - Theme scores (0-1 confidence for each theme)
 * - Primary themes (top 2 with confidence > 0.2)
 * - Combat style inference (lightsaber, ranged, melee, mixed)
 *
 * This module is independent and testable.
 * It does not modify actor state or global objects.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { CLASS_SYNERGY_DATA } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ClassSuggestionEngine.js";
import { BUILD_THEMES, FEAT_THEME_SIGNALS } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";

export class BuildThemeProjection {
    /**
     * Analyze actor state to infer character intent themes and combat style
     *
     * @param {Object} state - Actor state from _buildActorState()
     * @returns {Object} { themes: {...}, primaryThemes: [...], combatStyle: '...', signals: {...} }
     */
    static analyzeSignals(state) {
        SWSELogger.log(`[BUILD-THEME-PROJECTION] analyzeSignals() START`);

        const themes = {};
        const signals = {
            feats: [],
            talents: [],
            skills: [],
            classes: []
        };

        // Analyze feats, talents, skills, classes
        this._analyzeFeats(state, themes, signals);
        this._analyzeTalents(state, themes, signals);
        this._analyzeSkills(state, themes, signals);
        this._analyzeClasses(state, themes, signals);

        // Determine primary themes
        const primaryThemes = this._determinePrimaryThemes(themes);

        // Infer combat style
        const combatStyle = this._inferCombatStyle(themes);

        SWSELogger.log(`[BUILD-THEME-PROJECTION] analyzeSignals() COMPLETE - Primary themes:`, primaryThemes);

        return {
            themes,
            primaryThemes,
            combatStyle,
            signals
        };
    }

    /**
     * Analyze feats for theme signals
     * @private
     */
    static _analyzeFeats(state, themes, signals) {
        for (const featName of state.ownedFeats) {
            // Check direct theme mapping
            const theme = FEAT_THEME_SIGNALS[featName];
            if (theme) {
                themes[theme] = (themes[theme] || 0) + 0.15;
                signals.feats.push({ name: featName, theme });
            }

            // Check partial matches for weapon proficiencies etc.
            if (featName.includes('Lightsaber')) {
                themes[BUILD_THEMES.FORCE] = (themes[BUILD_THEMES.FORCE] || 0) + 0.1;
            }
            if (featName.includes('Pistol') || featName.includes('Rifle')) {
                themes[BUILD_THEMES.RANGED] = (themes[BUILD_THEMES.RANGED] || 0) + 0.1;
            }
            if (featName.includes('Melee') || featName.includes('Martial')) {
                themes[BUILD_THEMES.MELEE] = (themes[BUILD_THEMES.MELEE] || 0) + 0.1;
            }
        }
    }

    /**
     * Analyze talents for theme signals
     * @private
     */
    static _analyzeTalents(state, themes, signals) {
        // Force talents
        if (state.talentTrees.has('lightsaber combat') ||
            state.talentTrees.has('jedi mind tricks') ||
            state.talentTrees.has('telekinetic savant')) {
            themes[BUILD_THEMES.FORCE] = (themes[BUILD_THEMES.FORCE] || 0) + 0.2;
        }

        // Stealth talents
        if (state.talentTrees.has('camouflage') || state.talentTrees.has('spy')) {
            themes[BUILD_THEMES.STEALTH] = (themes[BUILD_THEMES.STEALTH] || 0) + 0.2;
        }

        // Combat talents
        if (state.talentTrees.has('armor specialist') ||
            state.talentTrees.has('weapon specialist') ||
            state.talentTrees.has('commando')) {
            themes[BUILD_THEMES.COMBAT] = (themes[BUILD_THEMES.COMBAT] || 0) + 0.2;
        }

        // Social talents
        if (state.talentTrees.has('influence') ||
            state.talentTrees.has('inspiration') ||
            state.talentTrees.has('leadership')) {
            themes[BUILD_THEMES.SOCIAL] = (themes[BUILD_THEMES.SOCIAL] || 0) + 0.2;
            themes[BUILD_THEMES.LEADERSHIP] = (themes[BUILD_THEMES.LEADERSHIP] || 0) + 0.15;
        }

        // Ranged talents
        if (state.talentTrees.has('sharpshooter') || state.talentTrees.has('gunslinger')) {
            themes[BUILD_THEMES.RANGED] = (themes[BUILD_THEMES.RANGED] || 0) + 0.2;
        }

        // Melee talents
        if (state.talentTrees.has('melee smash') || state.talentTrees.has('brawler')) {
            themes[BUILD_THEMES.MELEE] = (themes[BUILD_THEMES.MELEE] || 0) + 0.2;
        }

        // Tracking talents
        if (state.talentTrees.has('awareness')) {
            themes[BUILD_THEMES.TRACKING] = (themes[BUILD_THEMES.TRACKING] || 0) + 0.2;
        }
    }

    /**
     * Analyze skills for theme signals
     * @private
     */
    static _analyzeSkills(state, themes, signals) {
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
                themes[theme] = (themes[theme] || 0) + 0.1;
                signals.skills.push({ name: skill, theme });
            }
        }
    }

    /**
     * Analyze classes for theme signals
     * @private
     */
    static _analyzeClasses(state, themes, signals) {
        for (const className of Object.keys(state.classes)) {
            const synergy = CLASS_SYNERGY_DATA[className];
            if (synergy?.theme) {
                themes[synergy.theme] = (themes[synergy.theme] || 0) + 0.25;
                signals.classes.push({ name: className, theme: synergy.theme });
            }
        }
    }

    /**
     * Determine primary themes (top 2 with confidence > 0.2)
     * @private
     */
    static _determinePrimaryThemes(themes) {
        const sorted = Object.entries(themes)
            .filter(([_, score]) => score >= 0.2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        return sorted.map(([theme]) => theme);
    }

    /**
     * Infer combat style based on themes
     * @private
     */
    static _inferCombatStyle(themes) {
        const forceScore = themes[BUILD_THEMES.FORCE] || 0;
        const rangedScore = themes[BUILD_THEMES.RANGED] || 0;
        const meleeScore = themes[BUILD_THEMES.MELEE] || 0;

        if (forceScore > rangedScore && forceScore > meleeScore && forceScore >= 0.2) {
            return 'lightsaber';
        } else if (rangedScore > meleeScore && rangedScore >= 0.2) {
            return 'ranged';
        } else if (meleeScore >= 0.2) {
            return 'melee';
        } else {
            return 'mixed';
        }
    }
}

export default BuildThemeProjection;
