/**
 * SKILL ENGINE
 * Unified interface for skill training and management.
 *
 * Coordinates:
 * - Skill registry lookups
 * - State management
 * - Validation
 * - Training application
 */

import { SWSELogger } from '../../utils/logger.js';
import { SkillRegistry } from './skill-registry.js';
import { SkillState } from './skill-state.js';
import { SkillValidator } from './skill-validator.js';
import { SkillNormalizer } from './skill-normalizer.js';

export const SkillEngine = {

    /**
     * Train a skill for an actor
     */
    async train(actor, skillName, engine = null) {
        if (!skillName || !actor) {
            return false;
        }

        // Validate can train
        if (!SkillValidator.canTrain(actor, skillName)) {
            SWSELogger.warn(`Cannot train skill: ${skillName}`);
            return false;
        }

        // Get skill document
        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {
            SWSELogger.warn(`Skill not found: ${skillName}`);
            return false;
        }

        try {
            // Update actor's skill training flag
            const skillKey = this._normalizeKey(skillDoc.name);
            await actor.update({
                [`system.skills.${skillKey}.trained`]: true
            });

            // Track in progression state
            await SkillState.addTrained(actor, skillDoc.name);

            SWSELogger.log(`Trained skill: ${skillName}`);
            return true;

        } catch (err) {
            SWSELogger.error('Failed to train skill:', skillName, err);
            return false;
        }
    },

    /**
     * Grant bonus skill from INT modifier increase
     */
    async grantBonusSkill(actor, skillName) {
        if (!skillName || !actor) {
            return false;
        }

        // Bonus skills still need validation
        return await this.train(actor, skillName);
    },

    /**
     * Train multiple skills
     */
    async trainMultiple(actor, skillNames) {
        if (!Array.isArray(skillNames)) {
            return [];
        }

        const results = [];
        for (const skillName of skillNames) {
            const success = await this.train(actor, skillName);
            results.push({
                skill: skillName,
                trained: success
            });
        }

        return results;
    },

    /**
     * Get available skills to train
     */
    getAvailableSkills(actor, pointsRemaining) {
        return SkillValidator.getAvailableSkills(actor, pointsRemaining);
    },

    /**
     * Get class skills for actor
     */
    getClassSkills(actor) {
        return SkillValidator.getClassSkillsForActor(actor);
    },

    /**
     * Calculate skill modifier
     */
    calculateModifier(actor, skillName) {
        return SkillValidator.calculateSkillModifier(actor, skillName);
    },

    /**
     * Check if skill is trained
     */
    isTrained(actor, skillName) {
        return SkillState.isTrained(actor, skillName);
    },

    /**
     * Get trained skills
     */
    getTrainedSkills(actor) {
        return SkillState.getTrainedSkillNames(actor);
    },

    /**
     * Validate all trained skills
     */
    validateActor(actor) {
        return SkillValidator.validateAllTrained(actor);
    },

    /**
     * Get skill document
     */
    getSkill(skillName) {
        return SkillRegistry.get(skillName);
    },

    /**
     * Normalize skill key for actor data
     * Converts "Skill (Variant)" → "skillvariant"
     * @private
     */
    _normalizeKey(skillName) {
        return skillName
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[()]/g, '');
    }
};

export default SkillEngine;
