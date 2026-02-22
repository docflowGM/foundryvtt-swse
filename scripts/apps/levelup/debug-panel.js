/**
 * SWSE GM Debug Panel for BuildIntent Analysis
 *
 * Provides a comprehensive view of how the suggestion engine analyzes a character's
 * build direction, prestige class affinities, and priority prerequisites.
 *
 * GM-only feature for verifying and debugging the suggestion system.
 */

import { BuildIntent, BUILD_THEMES, PRESTIGE_SIGNALS, FEAT_THEME_SIGNALS } from '../../engines/suggestion/BuildIntent.js';
import { ClassSuggestionEngine, CLASS_SYNERGY_DATA } from '../../engines/suggestion/ClassSuggestionEngine.js';
import { SWSELogger } from '../../utils/logger.js';
import { CORE_CLASSES } from '../../progression/data/progression-data.js'; // PHASE C: Consolidate class lists

// V2 API base class
import SWSEApplicationV2 from '../base/swse-application-v2.js';

/**
 * GM Debug Panel Application
 * Shows detailed BuildIntent analysis for a character
 */
export class GMDebugPanel extends SWSEApplicationV2 {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'swse-gm-debug-panel',
            classes: ['swse', 'swse-app', 'gm-debug-panel'],
            template: 'systems/foundryvtt-swse/templates/apps/gm-debug-panel.hbs',
            width: 700,
            height: 650,
            resizable: true,
            title: 'BuildIntent Debug Panel',
            tabs: [{ navSelector: '.debug-tabs', contentSelector: '.debug-content', initial: 'overview' }]
        });
    }

    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this.buildIntent = null;
        this.classAnalysis = null;
        this.pendingData = options.pendingData || {};
    }

    get title() {
        return `BuildIntent Debug: ${this.actor.name}`;
    }

    async _prepareContext() {
        const data = await super._prepareContext();

        // Analyze build intent
        try {
            this.buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);
            this.classAnalysis = await this._analyzeClasses();
        } catch (err) {
            SWSELogger.error('GMDebugPanel | Failed to analyze build intent:', err);
            this.buildIntent = null;
        }

        data.actor = this.actor;
        data.buildIntent = this.buildIntent;
        data.classAnalysis = this.classAnalysis;

        // Format theme scores for display
        if (this.buildIntent) {
            data.themeScores = this._formatThemeScores();
            data.prestigeAffinities = this._formatPrestigeAffinities();
            data.signals = this._formatSignals();
            data.priorityPrereqs = this._formatPriorityPrereqs();
            data.combatStyle = this.buildIntent.combatStyle;
            data.forceFocus = this.buildIntent.forceFocus;
        }

        // Raw data for JSON view
        data.rawBuildIntent = this.buildIntent ? JSON.stringify(this.buildIntent, null, 2) : 'No data';

        return data;
    }

    /**
     * Format theme scores with visual indicators
     */
    _formatThemeScores() {
        if (!this.buildIntent?.themes) {return [];}

        const themes = Object.entries(this.buildIntent.themes)
            .map(([theme, score]) => ({
                name: theme,
                score: score,
                percentage: Math.min(100, Math.round(score * 100)),
                isPrimary: this.buildIntent.primaryThemes.includes(theme),
                barColor: this._getThemeColor(theme)
            }))
            .sort((a, b) => b.score - a.score);

        return themes;
    }

    /**
     * Get color for theme visualization
     */
    _getThemeColor(theme) {
        const colors = {
            [BUILD_THEMES.FORCE]: '#8b5cf6',
            [BUILD_THEMES.RANGED]: '#ef4444',
            [BUILD_THEMES.MELEE]: '#f97316',
            [BUILD_THEMES.STEALTH]: '#6b7280',
            [BUILD_THEMES.SOCIAL]: '#ec4899',
            [BUILD_THEMES.TECH]: '#06b6d4',
            [BUILD_THEMES.LEADERSHIP]: '#eab308',
            [BUILD_THEMES.EXPLORATION]: '#22c55e',
            [BUILD_THEMES.VEHICLE]: '#3b82f6',
            [BUILD_THEMES.SUPPORT]: '#14b8a6',
            [BUILD_THEMES.COMBAT]: '#dc2626',
            [BUILD_THEMES.TRACKING]: '#a855f7'
        };
        return colors[theme] || '#6b7280';
    }

    /**
     * Format prestige affinities for display
     */
    _formatPrestigeAffinities() {
        if (!this.buildIntent?.prestigeAffinities) {return [];}

        return this.buildIntent.prestigeAffinities.map(affinity => ({
            className: affinity.className,
            confidence: Math.round(affinity.confidence * 100),
            confidenceLevel: this._getConfidenceLevel(affinity.confidence),
            matches: affinity.matches,
            matchSummary: this._formatMatchSummary(affinity.matches)
        }));
    }

    /**
     * Get confidence level label
     */
    _getConfidenceLevel(confidence) {
        if (confidence >= 0.7) {return 'high';}
        if (confidence >= 0.4) {return 'medium';}
        return 'low';
    }

    /**
     * Format match summary for prestige affinity
     */
    _formatMatchSummary(matches) {
        const parts = [];
        if (matches.feats?.length) {parts.push(`${matches.feats.length} feat(s)`);}
        if (matches.skills?.length) {parts.push(`${matches.skills.length} skill(s)`);}
        if (matches.talents?.length) {parts.push(`${matches.talents.length} talent(s)`);}
        if (matches.talentTrees?.length) {parts.push(`${matches.talentTrees.length} tree(s)`);}
        if (matches.abilities?.length) {parts.push(`${matches.abilities.length} ability(s)`);}
        return parts.join(', ') || 'No matches';
    }

    /**
     * Format signals for display
     */
    _formatSignals() {
        if (!this.buildIntent?.signals) {return {};}

        return {
            feats: this.buildIntent.signals.feats.map(f => ({
                name: f.name,
                theme: f.theme,
                color: this._getThemeColor(f.theme)
            })),
            skills: this.buildIntent.signals.skills.map(s => ({
                name: s.name,
                theme: s.theme,
                color: this._getThemeColor(s.theme)
            })),
            classes: this.buildIntent.signals.classes.map(c => ({
                name: c.name,
                theme: c.theme,
                color: this._getThemeColor(c.theme)
            })),
            talents: this.buildIntent.signals.talents || []
        };
    }

    /**
     * Format priority prerequisites
     */
    _formatPriorityPrereqs() {
        if (!this.buildIntent?.priorityPrereqs) {return [];}

        return this.buildIntent.priorityPrereqs.map(prereq => ({
            type: prereq.type,
            name: prereq.name,
            forClass: prereq.forClass,
            confidence: Math.round(prereq.confidence * 100),
            icon: prereq.type === 'feat' ? 'fa-star' : 'fa-book'
        }));
    }

    /**
     * Analyze classes for debug display
     */
    async _analyzeClasses() {
        const classPack = game.packs.get('foundryvtt-swse.classes');
        if (!classPack) {return [];}

        const allClasses = await classPack.getDocuments();
        const prestigePrereqs = await ClassSuggestionEngine._loadPrestigePrerequisites();
        const actorState = await ClassSuggestionEngine._buildActorState(this.actor, this.pendingData);

        const analysis = [];
        for (const cls of allClasses) {
            // PHASE C: Use centralized CORE_CLASSES instead of hardcoded list
            const isPrestige = !CORE_CLASSES.includes(cls.name);
            if (!isPrestige) {continue;}

            const prereqData = prestigePrereqs[cls.name];
            if (!prereqData) {continue;}

            const prereqCheck = ClassSuggestionEngine._checkPrerequisites(cls.name, prereqData, actorState);
            const synergyScore = ClassSuggestionEngine._calculateSynergyScore({ name: cls.name }, actorState);

            analysis.push({
                name: cls.name,
                qualified: prereqCheck.met,
                missingCount: prereqCheck.missing.filter(m => !m.unverifiable).length,
                missing: prereqCheck.missing,
                synergyScore: synergyScore,
                synergy: CLASS_SYNERGY_DATA[cls.name]
            });
        }

        // Sort by qualification status, then by missing count
        analysis.sort((a, b) => {
            if (a.qualified !== b.qualified) {return a.qualified ? -1 : 1;}
            return a.missingCount - b.missingCount;
        });

        return analysis;
    }

    async _onRender(html, options) {
        await super._onRender(html, options);

        const root = (this.element instanceof HTMLElement) ? this.element : (html?.[0] ?? html);
        if (!(root instanceof HTMLElement)) {return;}

        // Refresh button
        root.querySelectorAll('.refresh-analysis').forEach(btn => btn.addEventListener('click', () => this.render(true)));

        // Copy JSON button
        root.querySelectorAll('.copy-json').forEach(btn => btn.addEventListener('click', () => {
            const json = JSON.stringify(this.buildIntent, null, 2);
            navigator.clipboard.writeText(json);
            ui.notifications.info('BuildIntent JSON copied to clipboard');
        }));

        // Collapsible sections
        root.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', event => {
                const section = event.currentTarget?.closest('.collapsible-section');
                section?.classList?.toggle('collapsed');
            });
        });
    }
}

/**
 * Show the GM Debug Panel for an actor
 * @param {Actor} actor - The actor to analyze
 * @param {Object} pendingData - Optional pending selections
 */
export function showGMDebugPanel(actor, pendingData = {}) {
    if (!game.user.isGM) {
        ui.notifications.warn('GM Debug Panel is only available to GMs');
        return;
    }

    new GMDebugPanel(actor, { pendingData }).render(true);
}

/**
 * Register the GM debug command
 */
export function registerDebugCommand() {
    // Add a method to actors for easy access
    Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
        if (!game.user.isGM) {return;}
        if (sheet.actor?.type !== 'character') {return;}

        buttons.unshift({
            label: 'Debug BuildIntent',
            class: 'debug-build-intent',
            icon: 'fa-solid fa-bug',
            onclick: () => showGMDebugPanel(sheet.actor)
        });
    });
}
