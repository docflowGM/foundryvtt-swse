/**
 * Level Diff Inspector
 * Displays a summary of all changes made during level-up/character creation.
 * Provides quality-of-life feedback and GM review capabilities.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class LevelDiffInspector {

    /**
     * Compare two actor states and generate a summary of differences
     */
    static generateDiff(beforeData, afterData, label = 'Character Changes') {
        const diff = {
            label,
            timestamp: Date.now(),
            changes: {}
        };

        // HP changes
        const hpBefore = beforeData.system?.hp?.max || 0;
        const hpAfter = afterData.system?.hp?.max || 0;
        if (hpAfter !== hpBefore) {
            diff.changes.hp = {
                before: hpBefore,
                after: hpAfter,
                gain: hpAfter - hpBefore,
                display: `HP: ${hpBefore} → ${hpAfter} (+${hpAfter - hpBefore})`
            };
        }

        // Class changes
        const classCountBefore = (beforeData.items || []).filter(i => i.type === 'class').length;
        const classCountAfter = (afterData.items || []).filter(i => i.type === 'class').length;
        if (classCountAfter > classCountBefore) {
            const newClasses = (afterData.items || [])
                .filter(i => i.type === 'class')
                .slice(classCountBefore);

            diff.changes.classes = {
                added: newClasses.map(c => c.name),
                display: `Class(es): ${newClasses.map(c => c.name).join(', ')}`
            };
        }

        // Feat changes
        const featsBefore = (beforeData.items || []).filter(i => i.type === 'feat').map(f => f.name);
        const featsAfter = (afterData.items || []).filter(i => i.type === 'feat').map(f => f.name);
        const newFeats = featsAfter.filter(f => !featsBefore.includes(f));

        if (newFeats.length > 0) {
            diff.changes.feats = {
                added: newFeats,
                display: `Feat(s): ${newFeats.join(', ')}`
            };
        }

        // Talent changes
        const talentsBefore = (beforeData.items || []).filter(i => i.type === 'talent').map(t => t.name);
        const talentsAfter = (afterData.items || []).filter(i => i.type === 'talent').map(t => t.name);
        const newTalents = talentsAfter.filter(t => !talentsBefore.includes(t));

        if (newTalents.length > 0) {
            diff.changes.talents = {
                added: newTalents,
                display: `Talent(s): ${newTalents.join(', ')}`
            };
        }

        // Force power changes
        const powersBefore = (beforeData.items || []).filter(i => i.type === 'forcepower').map(p => p.name);
        const powersAfter = (afterData.items || []).filter(i => i.type === 'forcepower').map(p => p.name);
        const newPowers = powersAfter.filter(p => !powersBefore.includes(p));

        if (newPowers.length > 0) {
            diff.changes.forcePowers = {
                added: newPowers,
                display: `Force Power(ies): ${newPowers.join(', ')}`
            };
        }

        // Skill training changes
        const skillsBefore = beforeData.system?.progression?.trainedSkills || [];
        const skillsAfter = afterData.system?.progression?.trainedSkills || [];
        const newSkills = skillsAfter.filter(s => !skillsBefore.includes(s));

        if (newSkills.length > 0) {
            diff.changes.skills = {
                added: newSkills,
                display: `Trained Skill(s): ${newSkills.join(', ')}`
            };
        }

        // Language changes
        const langBefore = beforeData.system?.languages || [];
        const langAfter = afterData.system?.languages || [];
        const newLanguages = langAfter.filter(l => !langBefore.includes(l));

        if (newLanguages.length > 0) {
            diff.changes.languages = {
                added: newLanguages,
                display: `Language(s): ${newLanguages.join(', ')}`
            };
        }

        // Credits changes
        const creditsBefore = beforeData.system?.credits || 0;
        const creditsAfter = afterData.system?.credits || 0;
        if (creditsAfter !== creditsBefore) {
            diff.changes.credits = {
                before: creditsBefore,
                after: creditsAfter,
                gain: creditsAfter - creditsBefore,
                display: `Credits: ${creditsBefore} → ${creditsAfter} (+${creditsAfter - creditsBefore})`
            };
        }

        // Ability score increases
        const abilitiesBefore = beforeData.system?.abilities || {};
        const abilitiesAfter = afterData.system?.abilities || {};
        const abilityIncreases = {};

        for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            const before = abilitiesBefore[ability]?.total || 10;
            const after = abilitiesAfter[ability]?.total || 10;

            if (after > before) {
                abilityIncreases[ability] = {
                    before,
                    after,
                    gain: after - before
                };
            }
        }

        if (Object.keys(abilityIncreases).length > 0) {
            const displays = Object.entries(abilityIncreases).map(([ab, data]) =>
                `${ab.toUpperCase()} ${data.before} → ${data.after} (+${data.gain})`
            );

            diff.changes.abilities = {
                increased: abilityIncreases,
                display: `Ability Increase(s): ${displays.join(', ')}`
            };
        }

        return diff;
    }

    /**
     * Format diff into a readable HTML summary
     */
    static formatDiffAsHTML(diff) {
        let html = `<div class="level-diff-summary">`;
        html += `<h3>${diff.label}</h3>`;
        html += `<div class="diff-content">`;

        for (const [type, change] of Object.entries(diff.changes)) {
            if (change.display) {
                html += `<div class="diff-item">`;
                html += `<span class="diff-icon">+</span> ${change.display}`;
                html += `</div>`;
            }
        }

        html += `</div>`;
        html += `</div>`;

        return html;
    }

    /**
     * Format diff into plain text
     */
    static formatDiffAsText(diff) {
        let text = `\n=== ${diff.label} ===\n`;

        for (const [type, change] of Object.entries(diff.changes)) {
            if (change.display) {
                text += `+ ${change.display}\n`;
            }
        }

        return text;
    }

    /**
     * Log diff to console
     */
    static logDiff(diff) {
        const text = this.formatDiffAsText(diff);
        SWSELogger.log(text);
    }

    /**
     * Show diff in a chat message
     */
    static async sendDiffToChatBroadcast(actor, diff) {
        const html = this.formatDiffAsHTML(diff);

        await ChatMessage.create({
            content: html,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    }

    /**
     * Show diff only to GM
     */
    static async sendDiffToGMAsWhisper(actor, diff) {
        const html = this.formatDiffAsHTML(diff);

        await ChatMessage.create({
            content: html,
            speaker: ChatMessage.getSpeaker({ actor }),
            whisper: ChatMessage.getWhisperRecipients('GM')
        });
    }

    /**
     * Create a detailed diff report (for GM review)
     */
    static createDetailedReport(diff) {
        const report = {
            title: diff.label,
            timestamp: new Date(diff.timestamp).toLocaleString(),
            summary: this.formatDiffAsText(diff),
            details: {}
        };

        for (const [type, change] of Object.entries(diff.changes)) {
            if (change.added) {
                report.details[type] = {
                    type: 'additions',
                    items: change.added
                };
            } else if (change.increased) {
                report.details[type] = {
                    type: 'increases',
                    changes: change.increased
                };
            } else {
                report.details[type] = change;
            }
        }

        return report;
    }

    /**
     * Get list of all changes in a concise format
     */
    static getChangesList(diff) {
        const list = [];

        for (const [type, change] of Object.entries(diff.changes)) {
            if (change.added && Array.isArray(change.added)) {
                for (const item of change.added) {
                    list.push({ type, action: 'added', value: item });
                }
            } else if (change.gain !== undefined) {
                list.push({ type, action: 'increased', value: change.gain, before: change.before, after: change.after });
            } else if (change.increased) {
                for (const [ability, data] of Object.entries(change.increased)) {
                    list.push({ type: ability, action: 'increased', value: data.gain, before: data.before, after: data.after });
                }
            }
        }

        return list;
    }
}
