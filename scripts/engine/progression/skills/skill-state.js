/**
 * SKILL STATE
 * Manages trained skills state stored in actor.system.progression.trainedSkills
 *
 * Tracks which skills have been trained through progression (not miscmod).
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export const SkillState = {

    /**
     * Get all trained skills for an actor
     */
    getTrainedSkills(actor) {
        return actor.system.progression?.trainedSkills || {};
    },

    /**
     * Get trained skill names as array
     */
    getTrainedSkillNames(actor) {
        const trained = this.getTrainedSkills(actor);
        return Object.keys(trained).filter(skill => trained[skill] === true);
    },

    /**
     * Check if a skill is trained
     */
    isTrained(actor, skillName) {
        const trained = this.getTrainedSkills(actor);
        return trained[skillName] === true;
    },

    /**
     * Add a trained skill
     */
    async addTrained(actor, skillName) {
        if (!skillName) {return false;}

        const trained = this.getTrainedSkills(actor);
        if (trained[skillName] === true) {
            return false; // Already trained
        }

        trained[skillName] = true;

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.progression.trainedSkills': trained
        });

        SWSELogger.log(`Trained skill: ${skillName}`);
        return true;
    },

    /**
     * Remove a trained skill
     */
    async removeTrained(actor, skillName) {
        if (!skillName) {return false;}

        const trained = this.getTrainedSkills(actor);
        if (!trained[skillName]) {
            return false; // Not trained
        }

        delete trained[skillName];

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.progression.trainedSkills': trained
        });

        SWSELogger.log(`Untrained skill: ${skillName}`);
        return true;
    },

    /**
     * Add multiple trained skills
     */
    async addMultiple(actor, skillNames) {
        if (!Array.isArray(skillNames)) {return [];}

        const results = [];
        for (const skillName of skillNames) {
            const result = await this.addTrained(actor, skillName);
            results.push({ skill: skillName, trained: result });
        }

        return results;
    },

    /**
     * Get count of trained skills
     */
    getCount(actor) {
        return this.getTrainedSkillNames(actor).length;
    },

    /**
     * Clear all trained skills
     */
    async clear(actor) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.progression.trainedSkills': {}
        });

        SWSELogger.log('Cleared all trained skills');
    },

    /**
     * Normalize trained skills state
     */
    normalize(state) {
        if (!state) {return {};}
        if (typeof state !== 'object') {return {};}

        const normalized = {};
        for (const [skillName, trained] of Object.entries(state)) {
            if (trained === true || trained === 'true' || trained === 1) {
                normalized[String(skillName).trim()] = true;
            }
        }

        return normalized;
    }
};

export default SkillState;
