/**
 * Force Progression Engine
 * Unified system for all Force-related character progression.
 *
 * Handles:
 * - Force Power grants and choices
 * - Force Technique grants and choices
 * - Force Secret grants and choices
 * - Force Regimen selection
 * - Force Point pools and allocation
 * - Force Training feats
 * - Force Sensitivity prerequisites
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ApplyHandlers } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/apply-handlers.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";

export class ForceProgressionEngine {

    /**
     * Check if actor is Force-sensitive
     */
    static isForceEnlightened(actor) {
        // Check for Force Sensitivity feat
        const hasForceSensitivity = actor.items.some(i =>
            i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
        );

        // Check for Force-using class
        const hasForceSensitiveClass = actor.items.some(i =>
            i.type === 'class' && i.system?.forceSensitive === true
        );

        return hasForceSensitivity || hasForceSensitiveClass;
    }

    /**
     * Calculate total available force points for the actor
     */
    static calculateForcePoints(actor) {
        const progression = actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        let totalForcePoints = 0;

        // Sum force points from all Force-using class levels
        for (const classLevel of classLevels) {
            const classData = progression[`${classLevel.class}_data`]; // Cached class data
            if (!classData) {continue;}

            const levelFeatures = classData.levelProgression?.[classLevel.level];
            if (levelFeatures && levelFeatures.forcePoints) {
                totalForcePoints += levelFeatures.forcePoints;
            }
        }

        // Add force points from feats (Force Training)
        const forceTrainingFeats = actor.items.filter(i =>
            i.type === 'feat' && i.name.includes('Force Training')
        );
        totalForcePoints += forceTrainingFeats.length; // Each Force Training = 1 point

        return totalForcePoints;
    }

    /**
     * Grant a force power to the actor
     */
    static async grantForcePower(actor, powerName) {
        const exists = actor.items.some(i =>
            i.type === 'forcepower' && i.name === powerName
        );

        if (exists) {
            SWSELogger.log(`Force power already granted: ${powerName}`);
            return false;
        }

        const powerDoc = await ForceRegistry.getDocumentByRef?.(powerName, 'power');
        if (!powerDoc) {
            SWSELogger.warn(`Force power not found: ${powerName}`);
            return false;
        }

        await ApplyHandlers.applyForcePower(actor, powerDoc.toObject());
        SWSELogger.log(`Granted force power: ${powerName}`);
        return true;
    }

    /**
     * Grant multiple force powers
     */
    static async grantForcePowers(actor, powerNames) {
        const results = [];

        for (const powerName of powerNames) {
            const result = await this.grantForcePower(actor, powerName);
            results.push({ name: powerName, granted: result });
        }

        return results;
    }

    /**
     * Create force power selection choice
     * Used when class grants "Force Power Choice"
     */
    static async createForcePowerChoice(actor, count = 1, filters = {}) {
        await ForceRegistry.ensureInitialized?.();
        const allPowers = [];
        for (const entry of (ForceRegistry.getByType?.('power') || [])) {
            const doc = await ForceRegistry.getDocumentByRef?.(entry, 'power');
            if (doc) allPowers.push(doc);
        }
        let availablePowers = allPowers.filter(p => {
            // Filter by power level if specified
            if (filters.maxPowerLevel && p.system?.powerLevel > filters.maxPowerLevel) {
                return false;
            }

            // Exclude already-known powers
            const hasIt = actor.items.some(i =>
                i.type === 'forcepower' && i.name === p.name
            );
            if (hasIt) {return false;}

            return true;
        });

        // Filter by prerequisites if needed (must be done separately due to async)
        if (filters.checkPrerequisites) {
            const { PrerequisiteValidator } = await import("/systems/foundryvtt-swse/scripts/engine/utils/prerequisite-validator.js");
            availablePowers = availablePowers.filter(p => {
                const assessment = AbilityEngine.evaluateAcquisition(actor, p);
                const legacy = PrerequisiteValidator.checkFeatPrerequisites(p, actor);
                if (assessment.legal !== legacy.valid) {
                    console.warn('Force power prereq mismatch detected', { power: p.name, assessment, legacy });
                }
                return assessment.legal;
            });
        }

        return availablePowers;
    }

    /**
     * Grant force point pool increase
     */
    static async increaseForcePointPool(actor, amount = 1) {
        const current = actor.system.force?.pointPool || 0;

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.force.pointPool': current + amount
        });

        SWSELogger.log(`Force point pool increased by ${amount} (now ${current + amount})`);
    }

    /**
     * Handle Force Technique grants/choices
     */
    static async grantForceTechnique(actor, techniqueName) {
        // Force Techniques are implemented as feats with special tags
        const exists = actor.items.some(i =>
            i.type === 'feat' &&
            i.name === techniqueName &&
            i.system?.tags?.includes('force_technique')
        );

        if (exists) {
            SWSELogger.log(`Force technique already known: ${techniqueName}`);
            return false;
        }

        const featDoc = await FeatRegistry.getDocumentByName?.(techniqueName);
        if (!featDoc) {
            SWSELogger.warn(`Force technique not found: ${techniqueName}`);
            return false;
        }

        await ApplyHandlers.applyFeat(actor, featDoc.toObject());
        SWSELogger.log(`Granted force technique: ${techniqueName}`);
        return true;
    }

    /**
     * Handle Force Secret grants/choices
     */
    static async grantForceSecret(actor, secretName) {
        // Force Secrets are implemented as talents with special tags
        const exists = actor.items.some(i =>
            i.type === 'talent' &&
            i.name === secretName &&
            i.system?.tags?.includes('force_secret')
        );

        if (exists) {
            SWSELogger.log(`Force secret already known: ${secretName}`);
            return false;
        }

        const talentDoc = await TalentRegistry.getDocumentByName?.(secretName);
        if (!talentDoc) {
            SWSELogger.warn(`Force secret not found: ${secretName}`);
            return false;
        }

        await ApplyHandlers.applyTalent(actor, talentDoc.toObject());
        SWSELogger.log(`Granted force secret: ${secretName}`);
        return true;
    }

    /**
     * Create Force Technique choice selection
     */
    static async createForceTechniqueChoice(actor, count = 1) {
        const allFeats = [];
        for (const entry of (FeatRegistry.getAll?.() || [])) {
            const doc = await FeatRegistry.getDocumentById?.(entry.id);
            if (doc) allFeats.push(doc);
        }
        const techniques = allFeats.filter(f =>
            f.system?.tags?.includes('force_technique') &&
            !actor.items.some(i => i.type === 'feat' && i.name === f.name)
        );

        return techniques;
    }

    /**
     * Create Force Secret choice selection
     */
    static async createForceSecretChoice(actor, count = 1) {
        const allTalents = [];
        for (const entry of (TalentRegistry.getAll?.() || [])) {
            const doc = await TalentRegistry.getDocumentById?.(entry.id);
            if (doc) allTalents.push(doc);
        }
        const secrets = allTalents.filter(t =>
            t.system?.tags?.includes('force_secret') &&
            !actor.items.some(i => i.type === 'talent' && i.name === t.name)
        );

        return secrets;
    }

    /**
     * Handle Force Regimen selection (for Force-using prestige classes)
     */
    static async selectForceRegimen(actor, regimenName) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.force.regimen': regimenName
        });

        SWSELogger.log(`Selected Force regimen: ${regimenName}`);
    }

    /**
     * Calculate force power known count
     */
    static getForcePowerKnownCount(actor) {
        return actor.items.filter(i => i.type === 'forcepower').length;
    }

    /**
     * Get force technique count
     */
    static getForceTechniqueCount(actor) {
        return actor.items.filter(i =>
            i.type === 'feat' && i.system?.tags?.includes('force_technique')
        ).length;
    }

    /**
     * Get force secret count
     */
    static getForceSecretCount(actor) {
        return actor.items.filter(i =>
            i.type === 'talent' && i.system?.tags?.includes('force_secret')
        ).length;
    }

    /**
     * Finalize all force progression (called at end of level-up/chargen)
     */
    static async finalizeForceProgression(actor) {
        if (!this.isForceEnlightened(actor)) {
            SWSELogger.log('Actor is not Force-sensitive, skipping force progression');
            return;
        }

        // Recalculate force points
        const forcePoints = this.calculateForcePoints(actor);
        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            'system.force.pointsMax': forcePoints
        });

        SWSELogger.log(`Finalized force progression: ${forcePoints} force points available`);
    }
}
