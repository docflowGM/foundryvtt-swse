/**
 * SWSE Prestige Roadmap UI
 *
 * Visual prerequisite progress tracker for prestige classes.
 * Shows a roadmap-style visualization of requirements with progress bars,
 * checkmarks for completed prerequisites, and clear indicators of what's next.
 */

import { ClassSuggestionEngine } from '../../engine/ClassSuggestionEngine.js';
import { BuildIntent, PRESTIGE_SIGNALS } from '../../engine/BuildIntent.js';
import { PathPreview } from '../../engine/PathPreview.js';
import { SWSELogger } from '../../utils/logger.js';

// V2 API base class
import SWSEApplicationV2 from '../base/swse-application-v2.js';

/**
 * Prestige Roadmap Application
 * Shows visual progress toward prestige class qualification
 */
export class PrestigeRoadmap extends SWSEApplicationV2 {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'swse-prestige-roadmap',
            classes: ['swse', 'swse-app', 'prestige-roadmap'],
            template: 'systems/foundryvtt-swse/templates/apps/prestige-roadmap.hbs',
            width: 750,
            height: 600,
            resizable: true,
            title: 'Prestige Class Roadmap'
        });
    }

    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this.pendingData = options.pendingData || {};
        this.selectedClass = null;
        this.roadmapData = null;
    }

    get title() {
        return `Prestige Roadmap: ${this.actor.name}`;
    }

    async _prepareContext() {
        const data = await super._prepareContext();

        // Build roadmap data
        this.roadmapData = await this._buildRoadmapData();

        data.actor = this.actor;
        data.roadmap = this.roadmapData;
        data.selectedClass = this.selectedClass;
        data.selectedClassData = this.selectedClass
            ? this.roadmapData.classes.find(c => c.name === this.selectedClass)
            : null;

        return data;
    }

    /**
     * Build comprehensive roadmap data for all prestige classes
     */
    async _buildRoadmapData() {
        const actorState = await ClassSuggestionEngine._buildActorState(this.actor, this.pendingData);
        const prestigePrereqs = await ClassSuggestionEngine._loadPrestigePrerequisites();
        const buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);
        const pathPreviews = await PathPreview.generatePreviews(this.actor, this.pendingData);

        const classes = [];

        for (const [className, prereqData] of Object.entries(prestigePrereqs)) {
            const prereqCheck = ClassSuggestionEngine._checkPrerequisites(className, prereqData, actorState);
            const pathPreview = pathPreviews.find(p => p.className === className);
            const affinity = buildIntent.prestigeAffinities.find(a => a.className === className);

            // Calculate overall progress
            const totalPrereqs = this._countTotalPrereqs(prereqData);
            const metPrereqs = totalPrereqs - prereqCheck.missing.filter(m => !m.unverifiable).length;
            const progressPercent = totalPrereqs > 0 ? Math.round((metPrereqs / totalPrereqs) * 100) : 0;

            // Build detailed prerequisite breakdown
            const prereqBreakdown = this._buildPrereqBreakdown(prereqData, prereqCheck.missing, actorState);

            classes.push({
                name: className,
                qualified: prereqCheck.met,
                progressPercent,
                metPrereqs,
                totalPrereqs,
                levelsAway: pathPreview?.levelsAway || 99,
                affinity: affinity?.confidence || 0,
                affinityPercent: Math.round((affinity?.confidence || 0) * 100),
                isRecommended: (affinity?.confidence || 0) >= 0.3,
                prereqBreakdown,
                recommendations: pathPreview?.recommendations || [],
                message: pathPreview?.message || ''
            });
        }

        // Sort by qualification, then progress, then affinity
        classes.sort((a, b) => {
            if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
            if (a.progressPercent !== b.progressPercent) return b.progressPercent - a.progressPercent;
            return b.affinity - a.affinity;
        });

        // Categorize classes
        const qualified = classes.filter(c => c.qualified);
        const inProgress = classes.filter(c => !c.qualified && c.progressPercent >= 30);
        const recommended = classes.filter(c => !c.qualified && c.progressPercent < 30 && c.isRecommended);
        const other = classes.filter(c => !c.qualified && c.progressPercent < 30 && !c.isRecommended);

        return {
            classes,
            qualified,
            inProgress,
            recommended,
            other,
            summary: {
                qualifiedCount: qualified.length,
                inProgressCount: inProgress.length,
                recommendedCount: recommended.length
            }
        };
    }

    /**
     * Count total number of prerequisites
     */
    _countTotalPrereqs(prereqData) {
        let count = 0;
        if (prereqData.level) count++;
        if (prereqData.bab) count++;
        if (prereqData.skills) count += prereqData.skills.length;
        if (prereqData.feats) count += prereqData.feats.length;
        if (prereqData.featsOr) count++;
        if (prereqData.talents && Array.isArray(prereqData.talents)) count += prereqData.talents.length;
        if (prereqData.talents && typeof prereqData.talents === 'number') count++;
        if (prereqData.techniques) count++;
        if (prereqData.powers) count += prereqData.powers.length;
        return count;
    }

    /**
     * Build detailed prerequisite breakdown with status
     */
    _buildPrereqBreakdown(prereqData, missing, actorState) {
        const breakdown = [];

        // Level prerequisite
        if (prereqData.level) {
            const isMet = actorState.characterLevel >= prereqData.level;
            breakdown.push({
                type: 'level',
                name: `Character Level ${prereqData.level}`,
                icon: 'fa-arrow-up',
                isMet,
                current: actorState.characterLevel,
                required: prereqData.level,
                progress: Math.min(100, Math.round((actorState.characterLevel / prereqData.level) * 100))
            });
        }

        // BAB prerequisite
        if (prereqData.bab) {
            const isMet = actorState.bab >= prereqData.bab;
            breakdown.push({
                type: 'bab',
                name: `BAB +${prereqData.bab}`,
                icon: 'fa-crosshairs',
                isMet,
                current: actorState.bab,
                required: prereqData.bab,
                progress: Math.min(100, Math.round((actorState.bab / prereqData.bab) * 100))
            });
        }

        // Skill prerequisites
        if (prereqData.skills) {
            for (const skill of prereqData.skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '');
                const isMet = actorState.trainedSkills.has(skillKey);
                breakdown.push({
                    type: 'skill',
                    name: `Trained in ${skill}`,
                    icon: 'fa-book',
                    isMet,
                    progress: isMet ? 100 : 0
                });
            }
        }

        // Feat prerequisites
        if (prereqData.feats) {
            for (const feat of prereqData.feats) {
                const isMet = actorState.ownedFeats.has(feat.toLowerCase());
                breakdown.push({
                    type: 'feat',
                    name: feat,
                    icon: 'fa-star',
                    isMet,
                    progress: isMet ? 100 : 0
                });
            }
        }

        // Feat OR prerequisites
        if (prereqData.featsOr) {
            const hasAny = prereqData.featsOr.some(f => actorState.ownedFeats.has(f.toLowerCase()));
            breakdown.push({
                type: 'feat_or',
                name: `One of: ${prereqData.featsOr.join(' or ')}`,
                icon: 'fa-star',
                isMet: hasAny,
                progress: hasAny ? 100 : 0,
                options: prereqData.featsOr
            });
        }

        // Talent prerequisites
        if (prereqData.talents && Array.isArray(prereqData.talents)) {
            for (const talent of prereqData.talents) {
                const isMet = actorState.ownedTalents.has(talent.toLowerCase());
                breakdown.push({
                    type: 'talent',
                    name: talent,
                    icon: 'fa-lightbulb',
                    isMet,
                    progress: isMet ? 100 : 0
                });
            }
        }

        // Talent count prerequisites
        if (prereqData.talents && typeof prereqData.talents === 'number' && prereqData.talentTrees) {
            const requiredCount = prereqData.talents;
            const validTrees = prereqData.talentTrees.map(t => t.toLowerCase());
            let count = 0;
            for (const tree of actorState.talentTrees) {
                if (validTrees.some(vt => tree.includes(vt))) count++;
            }
            breakdown.push({
                type: 'talent_count',
                name: `${requiredCount} ${prereqData.talentTrees.join('/')} Talent(s)`,
                icon: 'fa-lightbulb',
                isMet: count >= requiredCount,
                current: count,
                required: requiredCount,
                progress: Math.min(100, Math.round((count / requiredCount) * 100))
            });
        }

        // Force technique prerequisites
        if (prereqData.techniques) {
            breakdown.push({
                type: 'technique',
                name: `${prereqData.techniques} Force Technique(s)`,
                icon: 'fa-atom',
                isMet: false, // Would need to count actual techniques
                progress: 0,
                unverifiable: true
            });
        }

        // Force power prerequisites
        if (prereqData.powers) {
            for (const power of prereqData.powers) {
                const isMet = actorState.ownedFeats.has(power.toLowerCase()) ||
                             actorState.ownedTalents.has(power.toLowerCase());
                breakdown.push({
                    type: 'power',
                    name: power,
                    icon: 'fa-hand-sparkles',
                    isMet,
                    progress: isMet ? 100 : 0
                });
            }
        }

        // Other prerequisites (organization membership, etc.)
        if (prereqData.other) {
            for (const other of prereqData.other) {
                breakdown.push({
                    type: 'other',
                    name: other,
                    icon: 'fa-circle-question',
                    isMet: false,
                    progress: 0,
                    unverifiable: true
                });
            }
        }

        return breakdown;
    }

    async _onRender(html, options) {
        await super._onRender(html, options);

        // Class card selection
        html.find('.roadmap-class-card').click(event => {
            const className = $(event.currentTarget).data('class-name');
            this.selectedClass = this.selectedClass === className ? null : className;
            this.render();
        });

        // Collapse/expand sections
        html.find('.section-header').click(event => {
            const section = $(event.currentTarget).closest('.roadmap-section');
            section.toggleClass('collapsed');
        });
    }
}

/**
 * Show the Prestige Roadmap for an actor
 * @param {Actor} actor - The actor to show roadmap for
 * @param {Object} pendingData - Optional pending selections
 */
export function showPrestigeRoadmap(actor, pendingData = {}) {
    new PrestigeRoadmap(actor, { pendingData }).render(true);
}

export default PrestigeRoadmap;
