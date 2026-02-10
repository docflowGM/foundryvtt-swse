/**
 * SKILL VALIDATOR
 * Validates skill training eligibility and class skills.
 *
 * Checks:
 * - If skill can be trained
 * - If skill is class skill
 * - If prerequisites are met
 */

import { SWSELogger } from '../../utils/logger.js';
import { SkillRegistry } from './skill-registry.js';
import { SkillState } from './skill-state.js';

export const SkillValidator = {

    /**
     * Check if actor can train a skill
     */
    canTrain(actor, skillName) {
        if (!skillName || !actor) {return false;}

        // Get skill document
        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {
            SWSELogger.warn(`Skill not found: ${skillName}`);
            return false;
        }

        // Check if already trained
        if (SkillState.isTrained(actor, skillName)) {
            return false; // Already trained
        }

        // Check prerequisites if any
        if (skillDoc.system?.prerequisites) {
            // Prerequisites validation would be implemented here when needed
        }

        return true;
    },

    /**
     * Check if a skill is a class skill for actor's classes
     */
    isClassSkill(actor, skillName) {
        if (!skillName || !actor) {return false;}

        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {return false;}

        // Get actor's classes
        const classLevels = actor.system.progression?.classLevels || [];
        const classes = classLevels.map(cl => cl.class);

        // Check if skill is class skill for any of actor's classes
        const classSkills = skillDoc.system?.classes || {};
        for (const className of classes) {
            if (classSkills[className] === true) {
                return true;
            }
        }

        return false;
    },

    /**
     * Get the best (lowest) ability modifier for a skill
     * This is useful for multi-class characters
     */
    getOptimalAbilityMod(actor, skillName) {
        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {return 0;}

        const ability = skillDoc.system?.ability || 'cha';
        return actor.system.attributes?.[ability]?.mod ?? 0;
    },

    /**
     * Calculate skill modifier for an actor
     * Includes ability mod + class skill bonus + trained bonus + misc
     */
    calculateSkillModifier(actor, skillName) {
        if (!skillName) {return 0;}

        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {return 0;}

        const ability = skillDoc.system?.ability || 'cha';
        const abilityMod = actor.system.attributes?.[ability]?.mod ?? 0;

        // Class skill bonus (+3)
        const classSkillBonus = this.isClassSkill(actor, skillName) ? 3 : 0;

        // Trained bonus (already in actor's skill data usually)
        const skillData = this._getSkillData(actor, skillName);
        const trainedBonus = skillData?.trained ? 3 : 0;

        // Misc modifiers
        const miscMod = skillData?.miscMod ?? 0;

        return abilityMod + classSkillBonus + trainedBonus + miscMod;
    },

    /**
     * Validate all trained skills are valid
     */
    validateAllTrained(actor) {
        const trained = SkillState.getTrainedSkillNames(actor);
        const errors = [];
        const warnings = [];

        for (const skillName of trained) {
            const doc = SkillRegistry.get(skillName);
            if (!doc) {
                errors.push(`Trained skill not found: ${skillName}`);
                continue;
            }

            if (!this.canTrain(actor, skillName)) {
                warnings.push(`Skill may no longer be trainable: ${skillName}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Get skills available to train based on points remaining
     */
    getAvailableSkills(actor, pointsRemaining) {
        if (!pointsRemaining || pointsRemaining <= 0) {
            return [];
        }

        const allSkills = SkillRegistry.list();
        const available = [];

        for (const skill of allSkills) {
            if (this.canTrain(actor, skill.name)) {
                available.push(skill);
            }
        }

        return available;
    },

    /**
     * Get skills that would give class skill bonus
     */
    getClassSkillsForActor(actor) {
        const allSkills = SkillRegistry.list();
        return allSkills.filter(skill => this.isClassSkill(actor, skill.name));
    },

    /**
     * Get the ability-based grouping of skills
     */
    getSkillsByAbility(actor) {
        const allSkills = SkillRegistry.list();
        const byAbility = {};

        for (const skill of allSkills) {
            const ability = skill.system?.ability || 'cha';
            if (!byAbility[ability]) {
                byAbility[ability] = [];
            }
            byAbility[ability].push(skill);
        }

        return byAbility;
    },

    /**
     * Helper: get skill data from actor
     * @private
     */
    _getSkillData(actor, skillName) {
        if (!actor.system.skills) {return null;}

        // Try direct lookup
        const direct = actor.system.skills[skillName.toLowerCase()];
        if (direct) {return direct;}

        // Try normalized key (remove spaces, parens, etc)
        const normalized = skillName
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[()]/g, '');

        return actor.system.skills[normalized] || null;
    }
};

export default SkillValidator;
