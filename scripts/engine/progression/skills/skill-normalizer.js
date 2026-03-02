/**
 * SKILL NORMALIZER
 * Normalizes skill documents to ensure consistent structure.
 *
 * Standardizes:
 * - Ability associations
 * - Class skill definitions
 * - Prerequisites
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const SkillNormalizer = {

    /**
     * Normalize a skill document
     */
    normalize(doc) {
        if (!doc || !doc.system) {
            return doc;
        }

        const sys = doc.system;

        // Normalize ability (default to charisma)
        sys.ability = this._normalizeAbility(sys.ability);

        // Normalize class skills object
        sys.classes = this._normalizeClasses(sys.classes);

        // Normalize other properties
        sys.description = sys.description ?? '';
        sys.untrained = sys.untrained ?? false;

        return doc;
    },

    /**
     * Normalize ability string to lowercase
     * @private
     */
    _normalizeAbility(ability) {
        const normalized = String(ability || 'cha').toLowerCase().trim();

        // Validate it's one of the 6 abilities
        const valid = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (valid.includes(normalized)) {
            return normalized;
        }

        return 'cha'; // Default
    },

    /**
     * Normalize class skills object
     * @private
     */
    _normalizeClasses(classes) {
        if (!classes) {return {};}
        if (typeof classes !== 'object') {return {};}

        const normalized = {};
        for (const [className, isClass] of Object.entries(classes)) {
            if (isClass === true || isClass === 'true' || isClass === 1) {
                normalized[String(className).trim()] = true;
            }
        }

        return normalized;
    },

    /**
     * Validate a normalized skill document
     */
    validate(skillDoc) {
        const errors = [];

        if (!skillDoc.name) {
            errors.push('Skill must have a name');
        }

        const valid = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (!valid.includes(skillDoc.system?.ability)) {
            errors.push(`Invalid ability: ${skillDoc.system?.ability}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get ability for skill
     */
    getAbility(skillDoc) {
        return skillDoc.system?.ability ?? 'cha';
    },

    /**
     * Get classes that treat this as a class skill
     */
    getClassSkills(skillDoc) {
        const classes = skillDoc.system?.classes || {};
        return Object.keys(classes).filter(className => classes[className] === true);
    },

    /**
     * Check if skill is class skill for specific class
     */
    isClassSkillFor(skillDoc, className) {
        const classes = skillDoc.system?.classes || {};
        return classes[className] === true;
    },

    /**
     * Check if skill can be trained untrained
     */
    canTrainUntrained(skillDoc) {
        return skillDoc.system?.untrained ?? false;
    }
};

export default SkillNormalizer;
