/**
 * SWSE Long-term Path Preview
 *
 * Projects future qualification possibilities for prestige classes.
 * Shows "In X levels you could qualify for..." messages to help players
 * plan their character progression.
 *
 * Key features:
 * - Simulates future level-ups to estimate qualification timing
 * - Considers obtainable prerequisites (feats, skills, BAB, level)
 * - Provides actionable advice for reaching prestige goals
 */

import { SWSELogger } from '../utils/logger.js';
import { isEpicActor, getPlannedHeroicLevel } from '../actors/derived/level-split.js';
import { ClassSuggestionEngine } from './ClassSuggestionEngine.js';
import { BuildIntent, PRESTIGE_SIGNALS } from './BuildIntent.js';

// ──────────────────────────────────────────────────────────────
// PATH PREVIEW CONFIGURATION
// ──────────────────────────────────────────────────────────────

/**
 * Prerequisites that can be gained per level
 * These values estimate how quickly a character can obtain prerequisites
 */
const PREREQS_PER_LEVEL = {
    feat: 0.5,      // Average ~1 feat per 2 levels (bonus feats vary by class)
    skill: 1,       // Can train ~1 skill per level (varies)
    bab: {          // BAB progression by class type
        full: 1,
        three_quarters: 0.75,
        half: 0.5
    },
    level: 1        // 1 level per level (obviously)
};

/**
 * Maximum levels to project forward
 */
const MAX_PROJECTION_LEVELS = 5;

// ──────────────────────────────────────────────────────────────
// PATH PREVIEW CLASS
// ──────────────────────────────────────────────────────────────

export class PathPreview {

    /**
     * Generate path previews for an actor
     * @param {Actor} actor - The actor to analyze
     * @param {Object} pendingData - Pending selections from level-up
     * @returns {Promise<Array>} Array of path preview objects
     */
    static async generatePreviews(actor, pendingData = {}) {
        const planned = getPlannedHeroicLevel(actor, pendingData);
        if (pendingData?.epicAdvisory || isEpicActor(actor, planned)) {return [];}
        const previews = [];
        const actorState = await ClassSuggestionEngine._buildActorState(actor, pendingData);
        const prestigePrereqs = await ClassSuggestionEngine._loadPrestigePrerequisites();
        const buildIntent = await BuildIntent.analyze(actor, pendingData);

        // Get top prestige targets from build intent
        const targets = this._getTargetClasses(buildIntent, prestigePrereqs);

        for (const target of targets) {
            const prereqData = prestigePrereqs[target.className];
            if (!prereqData) {continue;}

            // Check current qualification status
            const prereqCheck = ClassSuggestionEngine._checkPrerequisites(
                target.className, prereqData, actorState
            );

            if (prereqCheck.met) {
                // Already qualified
                previews.push({
                    className: target.className,
                    status: 'qualified',
                    levelsAway: 0,
                    message: `You qualify for ${target.className} now!`,
                    confidence: target.confidence,
                    missing: [],
                    recommendations: []
                });
            } else {
                // Calculate how many levels until qualification
                const projection = this._projectQualification(
                    target.className,
                    prereqData,
                    prereqCheck.missing,
                    actorState
                );

                if (projection.levelsAway <= MAX_PROJECTION_LEVELS) {
                    previews.push({
                        className: target.className,
                        status: 'reachable',
                        levelsAway: projection.levelsAway,
                        message: `In ${projection.levelsAway} level${projection.levelsAway > 1 ? 's' : ''}, you could qualify for ${target.className}`,
                        confidence: target.confidence,
                        missing: prereqCheck.missing,
                        recommendations: projection.recommendations,
                        breakdown: projection.breakdown
                    });
                } else {
                    // Too far away to show
                    previews.push({
                        className: target.className,
                        status: 'distant',
                        levelsAway: projection.levelsAway,
                        message: `${target.className} requires significant progression`,
                        confidence: target.confidence,
                        missing: prereqCheck.missing,
                        recommendations: projection.recommendations.slice(0, 2),
                        breakdown: projection.breakdown
                    });
                }
            }
        }

        // Sort by levels away (qualified first, then closest)
        previews.sort((a, b) => {
            if (a.status === 'qualified' && b.status !== 'qualified') {return -1;}
            if (b.status === 'qualified' && a.status !== 'qualified') {return 1;}
            return a.levelsAway - b.levelsAway;
        });

        return previews;
    }

    /**
     * Get target prestige classes based on build intent
     * @param {Object} buildIntent - Build intent analysis
     * @param {Object} prestigePrereqs - Prerequisites data
     * @returns {Array} Target classes with confidence scores
     */
    static _getTargetClasses(buildIntent, prestigePrereqs) {
        const targets = [];

        // Add classes from prestige affinities
        for (const affinity of buildIntent.prestigeAffinities.slice(0, 5)) {
            if (prestigePrereqs[affinity.className]) {
                targets.push({
                    className: affinity.className,
                    confidence: affinity.confidence
                });
            }
        }

        // Add thematic matches if not already included
        const prestigeClasses = Object.keys(prestigePrereqs);
        for (const className of prestigeClasses) {
            if (!targets.find(t => t.className === className)) {
                // Check if class theme matches primary themes
                const signals = PRESTIGE_SIGNALS[className];
                if (signals) {
                    // Simple thematic match - add with low confidence
                    targets.push({
                        className,
                        confidence: 0.1
                    });
                }
            }
        }

        // Limit to top 8 targets
        return targets.slice(0, 8);
    }

    /**
     * Project how many levels until qualification
     * @param {string} className - Prestige class name
     * @param {Object} prereqData - Prerequisites data
     * @param {Array} missing - Missing prerequisites
     * @param {Object} actorState - Current actor state
     * @returns {Object} Projection with levels away and recommendations
     */
    static _projectQualification(className, prereqData, missing, actorState) {
        const recommendations = [];
        const breakdown = {
            feats: 0,
            skills: 0,
            bab: 0,
            level: 0,
            other: 0
        };

        let maxLevelsNeeded = 0;

        for (const prereq of missing) {
            if (prereq.unverifiable) {
                // Can't automatically project unverifiable prerequisites
                breakdown.other++;
                continue;
            }

            switch (prereq.type) {
                case 'level': {
                    const levelsForLevel = prereq.required - actorState.characterLevel;
                    breakdown.level = levelsForLevel;
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, levelsForLevel);
                    recommendations.push({
                        type: 'level',
                        priority: 'high',
                        text: `Reach level ${prereq.required}`,
                        levelsNeeded: levelsForLevel
                    });
                    break;
                }

                case 'bab':
                    // Estimate levels needed based on BAB progression
                    const babNeeded = prereq.required - actorState.bab;
                    // Assume 3/4 BAB progression (average)
                    const levelsForBAB = Math.ceil(babNeeded / PREREQS_PER_LEVEL.bab.three_quarters);
                    breakdown.bab = levelsForBAB;
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, levelsForBAB);
                    recommendations.push({
                        type: 'bab',
                        priority: 'high',
                        text: `Increase BAB to +${prereq.required} (take combat-focused classes)`,
                        levelsNeeded: levelsForBAB
                    });
                    break;

                case 'skill':
                    // Skills can usually be trained quickly
                    breakdown.skills++;
                    const skillLevels = Math.ceil(breakdown.skills * PREREQS_PER_LEVEL.skill);
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, 1);
                    recommendations.push({
                        type: 'skill',
                        priority: 'medium',
                        text: `Train ${prereq.name}`,
                        levelsNeeded: 1
                    });
                    break;

                case 'feat':
                case 'feat_or':
                    breakdown.feats++;
                    const featName = prereq.type === 'feat_or'
                        ? prereq.options[0]
                        : prereq.name;
                    const featLevels = Math.ceil(breakdown.feats / PREREQS_PER_LEVEL.feat);
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, featLevels);
                    recommendations.push({
                        type: 'feat',
                        priority: 'high',
                        text: prereq.type === 'feat_or'
                            ? `Take one of: ${prereq.options.join(' or ')}`
                            : `Take feat: ${featName}`,
                        levelsNeeded: featLevels
                    });
                    break;

                case 'talent':
                case 'talent_count':
                    // Talents are similar to feats in acquisition rate
                    breakdown.feats++;
                    const talentLevels = Math.ceil(breakdown.feats / PREREQS_PER_LEVEL.feat);
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, talentLevels);
                    recommendations.push({
                        type: 'talent',
                        priority: 'medium',
                        text: prereq.type === 'talent_count'
                            ? `Take ${prereq.required - prereq.current} more talent(s) from ${prereq.trees.join('/')}`
                            : `Take talent: ${prereq.name}`,
                        levelsNeeded: talentLevels
                    });
                    break;

                case 'technique':
                case 'power':
                    breakdown.other++;
                    maxLevelsNeeded = Math.max(maxLevelsNeeded, 2);
                    recommendations.push({
                        type: 'force',
                        priority: 'medium',
                        text: `Acquire ${prereq.display}`,
                        levelsNeeded: 2
                    });
                    break;
            }
        }

        // Sort recommendations by priority
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        return {
            levelsAway: Math.max(1, maxLevelsNeeded),
            recommendations,
            breakdown
        };
    }

    /**
     * Generate a summary message for path preview
     * @param {Array} previews - Array of path previews
     * @returns {Object} Summary with key messages
     */
    static generateSummary(previews) {
        const qualified = previews.filter(p => p.status === 'qualified');
        const reachable = previews.filter(p => p.status === 'reachable');
        const distant = previews.filter(p => p.status === 'distant');

        return {
            qualifiedCount: qualified.length,
            reachableCount: reachable.length,
            distantCount: distant.length,
            topQualified: qualified.slice(0, 2).map(p => p.className),
            topReachable: reachable.slice(0, 3).map(p => ({
                name: p.className,
                levels: p.levelsAway
            })),
            hasOpportunities: qualified.length > 0 || reachable.length > 0,
            summaryMessage: this._generateSummaryMessage(qualified, reachable)
        };
    }

    /**
     * Generate a human-readable summary message
     */
    static _generateSummaryMessage(qualified, reachable) {
        if (qualified.length > 0) {
            const names = qualified.slice(0, 2).map(p => p.className).join(' or ');
            return `You qualify for ${names}!`;
        }

        if (reachable.length > 0) {
            const closest = reachable[0];
            return `${closest.className} is ${closest.levelsAway} level${closest.levelsAway > 1 ? 's' : ''} away`;
        }

        return 'Keep building your character to unlock prestige classes';
    }

    /**
     * Get the next recommended action for a path
     * @param {Object} preview - A single path preview
     * @returns {Object|null} The top recommendation
     */
    static getNextAction(preview) {
        if (preview.status === 'qualified') {
            return {
                type: 'class',
                text: `Take a level in ${preview.className}`,
                priority: 'immediate'
            };
        }

        return preview.recommendations[0] || null;
    }
}

// ──────────────────────────────────────────────────────────────
// PATH PREVIEW DISPLAY UTILITIES
// ──────────────────────────────────────────────────────────────

/**
 * Generate HTML for a path preview card
 * @param {Object} preview - Path preview object
 * @returns {string} HTML string
 */
export function generatePathPreviewHtml(preview) {
    const statusClass = `status-${preview.status}`;
    const statusIcon = preview.status === 'qualified' ? 'fa-circle-check' :
                       preview.status === 'reachable' ? 'fa-clock' : 'fa-hourglass-half';

    let html = `
        <div class="path-preview-card ${statusClass}">
            <div class="path-header">
                <i class="fas ${statusIcon}"></i>
                <h4>${preview.className}</h4>
                ${preview.status !== 'qualified' ? `<span class="levels-badge">${preview.levelsAway} lvl</span>` : ''}
            </div>
            <p class="path-message">${preview.message}</p>
    `;

    if (preview.recommendations?.length > 0 && preview.status !== 'qualified') {
        html += '<div class="path-recommendations">';
        html += '<strong>Next steps:</strong><ul>';
        for (const rec of preview.recommendations.slice(0, 3)) {
            html += `<li class="rec-${rec.priority}">${rec.text}</li>`;
        }
        html += '</ul></div>';
    }

    html += '</div>';
    return html;
}

/**
 * Generate compact HTML for path preview (for inline display)
 * @param {Object} preview - Path preview object
 * @returns {string} HTML string
 */
export function generateCompactPreviewHtml(preview) {
    if (preview.status === 'qualified') {
        return `<span class="path-preview-inline qualified">
            <i class="fas fa-crown"></i> Qualified for ${preview.className}
        </span>`;
    }

    if (preview.status === 'reachable') {
        return `<span class="path-preview-inline reachable">
            <i class="fas fa-arrow-up"></i> ${preview.className} in ${preview.levelsAway} lvl
        </span>`;
    }

    return '';
}

export default PathPreview;
