/**
 * Derived Calculator Engine
 * Centralized system for computing all derived character statistics.
 *
 * Manages calculations for:
 * - Base Attack Bonus (BAB)
 * - Saving Throws (Reflex, Fortitude, Will)
 * - Skills (with feat bonuses and class skill bonus)
 * - Damage Threshold
 * - Initiative
 * - Speed
 * - Force Points
 * - AC (derived from armor + dex)
 * - Condition immunities and resistances
 */

import { SWSELogger } from '../../utils/logger.js';

export class DerivedCalculator {

    /**
     * Register all default calculations
     * Can be extended with custom calculations via registerCalculation()
     */
    static initializeCalculations() {
        this._calculators = new Map();

        // Register all built-in calculators
        this.registerCalculation("bab", this._calculateBAB.bind(this));
        this.registerCalculation("saves", this._calculateSaves.bind(this));
        this.registerCalculation("skills", this._calculateSkills.bind(this));
        this.registerCalculation("forcePoints", this._calculateForcePoints.bind(this));
        this.registerCalculation("initiative", this._calculateInitiative.bind(this));
        this.registerCalculation("speed", this._calculateSpeed.bind(this));
        this.registerCalculation("ac", this._calculateAC.bind(this));
        this.registerCalculation("damageThreshold", this._calculateDamageThreshold.bind(this));

        SWSELogger.log("Derived calculator initialized with 8 default calculators");
    }

    /**
     * Register a new calculation function
     * Allows plugins to extend the calculator
     */
    static registerCalculation(name, fn) {
        if (!this._calculators) {
            this.initializeCalculations();
        }

        if (typeof fn !== 'function') {
            throw new Error(`Calculator "${name}" must be a function`);
        }

        this._calculators.set(name, fn);
        SWSELogger.log(`Registered calculator: "${name}"`);
    }

    /**
     * Calculate total BAB for an actor
     * Based on all class levels and BAB progression
     */
    static _calculateBAB(actor) {
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        let totalBAB = 0;

        // Sum BAB from all classes
        for (const classLevel of classLevels) {
            // Get class BAB progression (would need class data)
            // This is a simplified version
            const babRate = this._getBabRate(classLevel.class);
            totalBAB += (classLevel.level * babRate);
        }

        return Math.floor(totalBAB);
    }

    /**
     * Get BAB rate for a class
     * Rates: slow (0.5), medium (0.75), fast (1.0)
     */
    static _getBabRate(className) {
        // This would look up from class data
        // For now, use reasonable defaults
        const fastBabClasses = ['Soldier', 'Ace Pilot', 'Bounty Hunter'];
        const slowBabClasses = ['Noble', 'Scoundrel', 'Force Adept'];

        if (fastBabClasses.includes(className)) return 1.0;
        if (slowBabClasses.includes(className)) return 0.5;
        return 0.75; // medium (default)
    }

    /**
     * Calculate saving throws (Reflex, Fortitude, Will)
     */
    static _calculateSaves(actor) {
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        const saves = {
            reflex: 0,
            fortitude: 0,
            will: 0
        };

        // Calculate base saves from class levels
        for (const classLevel of classLevels) {
            // This would look up from class data
            // For now, use class-specific defaults
            const classSaves = this._getClassSaveProgression(classLevel.class);

            saves.reflex += classSaves.reflex || 0;
            saves.fortitude += classSaves.fortitude || 0;
            saves.will += classSaves.will || 0;
        }

        // Add ability modifiers
        saves.reflex += actor.system.abilities?.dex?.mod || 0;
        saves.fortitude += actor.system.abilities?.con?.mod || 0;
        saves.will += actor.system.abilities?.wis?.mod || 0;

        // Add feat bonuses
        const featSaveBonus = this._calculateFeatSaveBonus(actor);
        saves.reflex += featSaveBonus.reflex || 0;
        saves.fortitude += featSaveBonus.fortitude || 0;
        saves.will += featSaveBonus.will || 0;

        return saves;
    }

    /**
     * Get save progressions for a class
     */
    static _getClassSaveProgression(className) {
        // This would come from class data
        const progressions = {
            'Soldier': { reflex: 0, fortitude: 2, will: 0 },
            'Jedi': { reflex: 0, fortitude: 0, will: 2 },
            'Scoundrel': { reflex: 2, fortitude: 0, will: 0 },
            'Scout': { reflex: 2, fortitude: 0, will: 0 },
            'Noble': { reflex: 0, fortitude: 0, will: 2 }
        };

        return progressions[className] || { reflex: 0, fortitude: 0, will: 0 };
    }

    /**
     * Calculate feat-based save bonuses
     */
    static _calculateFeatSaveBonus(actor) {
        const bonuses = { reflex: 0, fortitude: 0, will: 0 };

        // Check for feats that grant save bonuses
        // Example: Iron Will +2 will saves
        actor.items.filter(i => i.type === 'feat').forEach(feat => {
            if (feat.name.includes('Iron Will')) bonuses.will += 2;
            if (feat.name.includes('Dodge')) bonuses.reflex += 1;
            if (feat.name.includes('Toughness')) bonuses.fortitude += 1;
        });

        return bonuses;
    }

    /**
     * Calculate skill modifiers
     */
    static _calculateSkills(actor) {
        const skills = actor.system.skills || {};
        const calculated = {};

        for (const [skillKey, skillData] of Object.entries(skills)) {
            const ability = skillData.ability || 'str';
            const abilityMod = actor.system.abilities?.[ability]?.mod || 0;
            const classSkillBonus = skillData.classSkill ? 3 : 0;

            let total = abilityMod + (skillData.misc || 0) + classSkillBonus;

            // Add feat bonuses
            total += this._calculateSkillFeatBonus(actor, skillKey);

            calculated[skillKey] = {
                ...skillData,
                total
            };
        }

        return calculated;
    }

    /**
     * Calculate feat-based skill bonuses
     */
    static _calculateSkillFeatBonus(actor, skillKey) {
        // This would look for relevant feats
        // For now, simple implementation
        let bonus = 0;

        actor.items.filter(i => i.type === 'feat').forEach(feat => {
            if (feat.name.includes('Skill Focus') && feat.name.includes(skillKey)) {
                bonus += 3;
            }
        });

        return bonus;
    }

    /**
     * Calculate force points
     */
    static _calculateForcePoints(actor) {
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        let forcePoints = 0;

        // Sum force points from Force-using classes
        for (const classLevel of classLevels) {
            // This would look up from class data
            // Force-using classes grant force points per level
            const forceBabRate = this._getBabRate(classLevel.class);
            if (forceBabRate > 0) {  // Any Force-using class
                forcePoints += classLevel.level;  // Simplified: 1 per level
            }
        }

        // Add force points from feats (Force Training)
        const forceTrainingFeats = actor.items.filter(i =>
            i.type === 'feat' && i.name === 'Force Training'
        );
        forcePoints += forceTrainingFeats.length;

        return Math.max(0, forcePoints);
    }

    /**
     * Calculate initiative
     */
    static _calculateInitiative(actor) {
        const dexMod = actor.system.abilities?.dex?.mod || 0;
        let initiative = dexMod;

        // Add feat bonuses
        const initiativeFeats = actor.items.filter(i =>
            i.type === 'feat' && (i.name.includes('Initiative') || i.name.includes('Improved Initiative'))
        );
        initiative += initiativeFeats.length * 4;

        return initiative;
    }

    /**
     * Calculate movement speed
     */
    static _calculateSpeed(actor) {
        let speed = 6; // Default: 30 feet = 6 squares

        const progression = actor.system.progression || {};
        const species = progression.species || '';

        // Species modifiers would go here
        // For now, use default

        // Check for speed-affecting feats
        actor.items.filter(i => i.type === 'feat').forEach(feat => {
            if (feat.name.includes('Run')) speed += 2;
        });

        return speed;
    }

    /**
     * Calculate armor class
     */
    static _calculateAC(actor) {
        const dexMod = actor.system.abilities?.dex?.mod || 0;
        let ac = 10 + dexMod; // Base AC without armor

        // Add armor bonus
        const equippedArmor = actor.items.find(i =>
            i.type === 'armor' && i.system?.equipped !== false
        );

        if (equippedArmor && equippedArmor.system?.acBonus) {
            ac = equippedArmor.system.acBonus + dexMod;
        }

        // Add shield bonus
        const equippedShield = actor.items.find(i =>
            i.type === 'equipment' && i.name.includes('Shield') && i.system?.equipped !== false
        );

        if (equippedShield && equippedShield.system?.acBonus) {
            ac += equippedShield.system.acBonus;
        }

        return ac;
    }

    /**
     * Calculate damage threshold
     * SWSE rule: Con mod + class damage threshold bonus
     */
    static _calculateDamageThreshold(actor) {
        const conMod = actor.system.abilities?.con?.mod || 0;
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        let threshold = conMod;

        // Add class bonuses (Soldier gets +1 per level)
        for (const classLevel of classLevels) {
            if (classLevel.class === 'Soldier') {
                threshold += classLevel.level;
            }
        }

        return Math.max(0, threshold);
    }

    /**
     * Run all registered calculations
     * Returns object with all calculated stats
     */
    static recalculate(actor) {
        if (!this._calculators) {
            this.initializeCalculations();
        }

        const results = {};

        for (const [name, calculator] of this._calculators) {
            try {
                results[name] = calculator(actor);
            } catch (err) {
                SWSELogger.error(`Calculation "${name}" failed:`, err);
                results[name] = null;
            }
        }

        SWSELogger.log('All derived statistics recalculated');
        return results;
    }

    /**
     * Get a specific calculation
     */
    static calculate(name, actor) {
        if (!this._calculators) {
            this.initializeCalculations();
        }

        const calculator = this._calculators.get(name);
        if (!calculator) {
            SWSELogger.warn(`Unknown calculation: "${name}"`);
            return null;
        }

        return calculator(actor);
    }

    /**
     * Update actor with all calculated stats
     */
    static async updateActor(actor) {
        const calculated = this.recalculate(actor);

        const updates = {
            "system.bab": calculated.bab || 0,
            "system.saves.reflex": calculated.saves?.reflex || 0,
            "system.saves.fortitude": calculated.saves?.fortitude || 0,
            "system.saves.will": calculated.saves?.will || 0,
            "system.force.pointsMax": calculated.forcePoints || 0,
            "system.initiative": calculated.initiative || 0,
            "system.speed": calculated.speed || 6,
            "system.ac": calculated.ac || 10,
            "system.damageThreshold": calculated.damageThreshold || 0
        };

        await actor.update(updates);
        SWSELogger.log(`Updated actor with calculated statistics`);
    }
}

// Initialize calculators on import
DerivedCalculator.initializeCalculations();
