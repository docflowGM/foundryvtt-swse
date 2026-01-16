/**
 * FEAT REQUIREMENTS VALIDATOR
 * Validates if an actor meets feat prerequisites.
 *
 * Checks:
 * - Ability score requirements
 * - Base Attack Bonus (BAB) requirements
 * - Character level requirements
 * - Skill training requirements
 * - Other feat requirements
 */

import { SWSELogger } from '../../utils/logger.js';

export const FeatRequirements = {

    /**
     * Check if actor meets feat requirements
     * Returns { valid: boolean, reasons: string[] }
     */
    meetsRequirements(actor, featDoc) {
        const prereq = featDoc.system?.prerequisite ?? '';

        if (!prereq || !prereq.trim()) {
            return {
                valid: true,
                reasons: []
            };
        }

        const reasons = [];

        // Check ability score requirements
        this._checkAbilityRequirements(actor, prereq, reasons);

        // Check BAB requirements
        this._checkBABRequirements(actor, prereq, reasons);

        // Check level requirements
        this._checkLevelRequirements(actor, prereq, reasons);

        // Check skill training requirements
        this._checkSkillRequirements(actor, prereq, reasons);

        // Check other feat requirements
        this._checkOtherFeatRequirements(actor, featDoc, prereq, reasons);

        return {
            valid: reasons.length === 0,
            reasons
        };
    },

    /**
     * Check ability score requirements
     * @private
     */
    _checkAbilityRequirements(actor, prereq, reasons) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        for (const ability of abilities) {
            // Pattern: "Str 13", "Dex 15", etc.
            const pattern = new RegExp(`${ability}\\s*13`, 'i');
            if (pattern.test(prereq)) {
                const score = actor.system.attributes?.[ability]?.total || 10;
                if (score < 13) {
                    reasons.push(`Requires ${ability.toUpperCase()} 13 (you have ${score})`);
                }
            }

            const pattern15 = new RegExp(`${ability}\\s*15`, 'i');
            if (pattern15.test(prereq)) {
                const score = actor.system.attributes?.[ability]?.total || 10;
                if (score < 15) {
                    reasons.push(`Requires ${ability.toUpperCase()} 15 (you have ${score})`);
                }
            }
        }
    },

    /**
     * Check Base Attack Bonus requirements
     * @private
     */
    _checkBABRequirements(actor, prereq, reasons) {
        // Pattern: "BAB +5", "Base Attack Bonus +3", etc.
        const matchBAB = prereq.match(/(?:base attack bonus|bab)\s*\+?(\d+)/i);
        if (matchBAB) {
            const required = Number(matchBAB[1]);
            const bab = actor.system.bab ?? 0;
            if (bab < required) {
                reasons.push(`Requires BAB +${required} (you have +${bab})`);
            }
        }
    },

    /**
     * Check character level requirements
     * @private
     */
    _checkLevelRequirements(actor, prereq, reasons) {
        // Pattern: "Level 5", "Character level 8", etc.
        const matchLevel = prereq.match(/(?:level|character level)\s*(\d+)/i);
        if (matchLevel) {
            const required = Number(matchLevel[1]);
            const level = actor.system.level ?? 1;
            if (level < required) {
                reasons.push(`Requires Character Level ${required} (you are level ${level})`);
            }
        }
    },

    /**
     * Check skill training requirements
     * @private
     */
    _checkSkillRequirements(actor, prereq, reasons) {
        // Pattern: "Trained in Acrobatics", "Skill Focus (Athletics)", etc.
        const skillMatches = prereq.match(/trained in ([^,;]+)/gi);

        if (skillMatches) {
            for (const match of skillMatches) {
                const skillName = match.replace(/trained in/i, '').trim();
                const skillKey = skillName
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .replace(/[()]/g, '');

                const trained = actor.system.skills?.[skillKey]?.trained ?? false;
                if (!trained) {
                    reasons.push(`Requires trained in ${skillName}`);
                }
            }
        }
    },

    /**
     * Check other feat requirements
     * @private
     */
    _checkOtherFeatRequirements(actor, featDoc, prereq, reasons) {
        // Pattern: "Requires Mobility feat", "Must have Dodge", etc.
        const featMatches = prereq.match(/(?:requires|must have|need)\s+([^,;]+?)(?:\s+feat)?(?:[,;]|$)/gi);

        if (featMatches) {
            for (const match of featMatches) {
                const featName = match
                    .replace(/(?:requires|must have|need)\s+/i, '')
                    .replace(/\s+feat/i, '')
                    .trim();

                const hasFeat = actor.items.some(i =>
                    i.type === 'feat' &&
                    i.name.toLowerCase() === featName.toLowerCase()
                );

                if (!hasFeat) {
                    reasons.push(`Requires ${featName} feat`);
                }
            }
        }
    },

    /**
     * Get human-readable requirement string
     */
    getRequirementText(prereq) {
        if (!prereq || !prereq.trim()) {
            return 'None';
        }

        return prereq;
    },

    /**
     * Check if actor can learn feat (meets prerequisites)
     */
    canLearn(actor, featDoc) {
        const check = this.meetsRequirements(actor, featDoc);
        return check.valid;
    },

    /**
     * Get unmet requirements
     */
    getUnmetRequirements(actor, featDoc) {
        const check = this.meetsRequirements(actor, featDoc);
        return check.reasons;
    }
};

export default FeatRequirements;
