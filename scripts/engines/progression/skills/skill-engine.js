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
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { SkillRegistry } from './skill-registry.js';
import { SkillState } from './skill-state.js';
import { SkillValidator } from './skill-validator.js';
import { SkillNormalizer } from './skill-normalizer.js';

export const SkillEngine = {

    /**
     * Train a skill for an actor
     */
    async train(actor, skillName, engine = null) {
        SWSELogger.log(`[SKILL-ENGINE] train: START - Skill: "${skillName}", Actor: ${actor?.id} (${actor?.name})`);

        if (!skillName || !actor) {
            SWSELogger.warn(`[SKILL-ENGINE] train: ERROR - Missing skillName or actor`);
            return false;
        }

        // Validate can train
        if (!SkillValidator.canTrain(actor, skillName)) {
            SWSELogger.warn(`[SKILL-ENGINE] train: Cannot train skill "${skillName}" - validation failed`);
            return false;
        }
        SWSELogger.log(`[SKILL-ENGINE] train: Validation passed for skill "${skillName}"`);

        // Get skill document
        const skillDoc = SkillRegistry.get(skillName);
        if (!skillDoc) {
            SWSELogger.warn(`[SKILL-ENGINE] train: Skill document not found in registry: "${skillName}"`);
            return false;
        }
        SWSELogger.log(`[SKILL-ENGINE] train: Found skill document: "${skillDoc.name}"`);

        try {
            // Update actor's skill training flag
            const skillKey = this._normalizeKey(skillDoc.name);
            SWSELogger.log(`[SKILL-ENGINE] train: Normalized skill key: "${skillName}" → "${skillKey}"`);
            // PHASE 3: Route through ActorEngine
            await ActorEngine.updateActor(actor, {
                [`system.skills.${skillKey}.trained`]: true
            });
            SWSELogger.log(`[SKILL-ENGINE] train: Updated actor data for skill "${skillKey}"`);

            // Track in progression state
            await SkillState.addTrained(actor, skillDoc.name);
            SWSELogger.log(`[SKILL-ENGINE] train: Tracked skill in progression state`);

            SWSELogger.log(`[SKILL-ENGINE] train: COMPLETE - Trained skill: "${skillName}"`);
            return true;

        } catch (err) {
            SWSELogger.error(`[SKILL-ENGINE] train: ERROR - Failed to train skill "${skillName}":`, err);
            return false;
        }
    },

    /**
     * Grant bonus skill from INT modifier increase
     */
    async grantBonusSkill(actor, skillName) {
        SWSELogger.log(`[SKILL-ENGINE] grantBonusSkill: START - Skill: "${skillName}", Actor: ${actor?.id} (${actor?.name})`);

        if (!skillName || !actor) {
            SWSELogger.warn(`[SKILL-ENGINE] grantBonusSkill: ERROR - Missing skillName or actor`);
            return false;
        }

        // Bonus skills still need validation
        SWSELogger.log(`[SKILL-ENGINE] grantBonusSkill: Granting bonus skill via train method`);
        return await this.train(actor, skillName);
    },

    /**
     * Train multiple skills
     */
    async trainMultiple(actor, skillNames) {
        SWSELogger.log(`[SKILL-ENGINE] trainMultiple: START - Skills: ${skillNames?.length || 0}, Actor: ${actor?.id} (${actor?.name})`);

        if (!Array.isArray(skillNames)) {
            SWSELogger.warn(`[SKILL-ENGINE] trainMultiple: ERROR - skillNames is not an array`);
            return [];
        }
        SWSELogger.log(`[SKILL-ENGINE] trainMultiple: Training ${skillNames.length} skills:`, skillNames);

        const results = [];
        for (const skillName of skillNames) {
            const success = await this.train(actor, skillName);
            results.push({
                skill: skillName,
                trained: success
            });
        }
        SWSELogger.log(`[SKILL-ENGINE] trainMultiple: COMPLETE - ${results.filter(r => r.trained).length}/${results.length} skills trained`);

        return results;
    },

    /**
     * Get available skills to train
     */
    getAvailableSkills(actor, pointsRemaining) {
        SWSELogger.log(`[SKILL-ENGINE] getAvailableSkills: Actor: ${actor?.id} (${actor?.name}), Points remaining: ${pointsRemaining}`);
        const available = SkillValidator.getAvailableSkills(actor, pointsRemaining);
        SWSELogger.log(`[SKILL-ENGINE] getAvailableSkills: Found ${available?.length || 0} available skills`);
        return available;
    },

    /**
     * Get class skills for actor
     */
    getClassSkills(actor) {
        SWSELogger.log(`[SKILL-ENGINE] getClassSkills: Actor: ${actor?.id} (${actor?.name})`);
        const classSkills = SkillValidator.getClassSkillsForActor(actor);
        SWSELogger.log(`[SKILL-ENGINE] getClassSkills: Found ${classSkills?.length || 0} class skills`);
        return classSkills;
    },

    /**
     * Calculate skill modifier
     */
    calculateModifier(actor, skillName) {
        SWSELogger.log(`[SKILL-ENGINE] calculateModifier: Skill: "${skillName}", Actor: ${actor?.id} (${actor?.name})`);
        const modifier = SkillValidator.calculateSkillModifier(actor, skillName);
        SWSELogger.log(`[SKILL-ENGINE] calculateModifier: Calculated modifier for "${skillName}": ${modifier}`);
        return modifier;
    },

    /**
     * Check if skill is trained
     */
    isTrained(actor, skillName) {
        SWSELogger.log(`[SKILL-ENGINE] isTrained: Skill: "${skillName}", Actor: ${actor?.id} (${actor?.name})`);
        const trained = SkillState.isTrained(actor, skillName);
        SWSELogger.log(`[SKILL-ENGINE] isTrained: Skill "${skillName}" is ${trained ? 'TRAINED' : 'NOT TRAINED'}`);
        return trained;
    },

    /**
     * Get trained skills
     */
    getTrainedSkills(actor) {
        SWSELogger.log(`[SKILL-ENGINE] getTrainedSkills: Actor: ${actor?.id} (${actor?.name})`);
        const trainedSkills = SkillState.getTrainedSkillNames(actor);
        SWSELogger.log(`[SKILL-ENGINE] getTrainedSkills: Found ${trainedSkills?.length || 0} trained skills:`, trainedSkills);
        return trainedSkills;
    },

    /**
     * Validate all trained skills
     */
    validateActor(actor) {
        SWSELogger.log(`[SKILL-ENGINE] validateActor: Actor: ${actor?.id} (${actor?.name})`);
        const validation = SkillValidator.validateAllTrained(actor);
        SWSELogger.log(`[SKILL-ENGINE] validateActor: Validation result:`, validation);
        return validation;
    },

    /**
     * Get skill document
     */
    getSkill(skillName) {
        SWSELogger.log(`[SKILL-ENGINE] getSkill: Looking up skill "${skillName}"`);
        const skill = SkillRegistry.get(skillName);
        if (skill) {
            SWSELogger.log(`[SKILL-ENGINE] getSkill: Skill "${skillName}" FOUND`);
        } else {
            SWSELogger.warn(`[SKILL-ENGINE] getSkill: Skill "${skillName}" NOT FOUND`);
        }
        return skill;
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
