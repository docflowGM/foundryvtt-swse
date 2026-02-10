/**
 * SKILL REGISTRY
 * Central lookup for all skills in the system.
 *
 * Loads all skills from compendium and builds an in-memory index
 * for fast O(1) lookups by name.
 */

import { SWSELogger } from '../../utils/logger.js';

export const SkillRegistry = {

    // In-memory map for O(1) lookups
    skills: new Map(),
    isBuilt: false,

    /**
     * Build skill registry from compendium
     * Call once during system initialization
     */
    async build() {
        try {
            const pack = game.packs.get('foundryvtt-swse.skills');
            if (!pack) {
                SWSELogger.warn('Skills compendium not found');
                return false;
            }

            const docs = await pack.getDocuments();
            let count = 0;

            for (const skillDoc of docs) {
                if (skillDoc.name) {
                    this.skills.set(skillDoc.name.toLowerCase(), skillDoc);
                    count++;
                }
            }

            this.isBuilt = true;
            SWSELogger.log(`SkillRegistry built: ${count} skills loaded`);
            return true;

        } catch (err) {
            SWSELogger.error('Failed to build SkillRegistry:', err);
            return false;
        }
    },

    /**
     * Get a skill by name (case-insensitive)
     */
    get(name) {
        if (!name) {return null;}
        return this.skills.get(name.toLowerCase()) ?? null;
    },

    /**
     * Check if a skill exists
     */
    has(name) {
        if (!name) {return false;}
        return this.skills.has(name.toLowerCase());
    },

    /**
     * Get all skills as an array
     */
    list() {
        return Array.from(this.skills.values());
    },

    /**
     * Get count of loaded skills
     */
    count() {
        return this.skills.size;
    },

    /**
     * Get skills by ability
     */
    getByAbility(ability) {
        const normalized = String(ability).toLowerCase();
        return this.list().filter(skill => {
            const skillAbility = String(skill.system?.ability || '').toLowerCase();
            return skillAbility === normalized;
        });
    },

    /**
     * Get all skill names
     */
    getNames() {
        return Array.from(this.skills.keys()).map(name => {
            const doc = this.skills.get(name);
            return doc.name;
        });
    },

    /**
     * Get skills for a specific class
     */
    getClassSkills(className) {
        if (!className) {return [];}

        return this.list().filter(skill => {
            const classSkills = skill.system?.classes || {};
            return classSkills[className] === true;
        });
    },

    /**
     * Rebuild skill registry (for when content changes)
     */
    async rebuild() {
        this.skills.clear();
        this.isBuilt = false;
        return await this.build();
    },

    /**
     * Get registry status
     */
    getStatus() {
        return {
            isBuilt: this.isBuilt,
            count: this.skills.size,
            skills: this.getNames()
        };
    }
};

export default SkillRegistry;
