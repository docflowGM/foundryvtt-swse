/**
 * Normalized Application Handlers for Progression Engine
 * Every game action funnels through these centralized handlers.
 * Ensures consistent, normalized application of class, feat, talent, and power selections.
 *
 * PHASE 3: All mutations route through ActorEngine
 */

import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';

export const ApplyHandlers = {

    // ────────────────────────────────────────────
    // APPLY CLASS
    // ────────────────────────────────────────────
    async applyClass(actor, classDoc, level) {
        // Create or update class item
        const item = actor.items.find(i => i.type === 'class' && i.name === classDoc.name);

        if (item) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
                _id: item.id,
                'system.level': level
            }]);
        } else {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{
                name: classDoc.name,
                type: 'class',
                img: classDoc.img,
                system: {
                    level,
                    hitDie: classDoc.system.hitDie,
                    babProgression: classDoc.system.babProgression,
                    defenses: classDoc.system.defenses,
                    description: classDoc.system.description || '',
                    talentTrees: classDoc.system.talentTrees || [],
                    classSkills: classDoc.system.classSkills || [],
                    forceSensitive: classDoc.system.forceSensitive || false
                }
            }]);
        }
    },

    // ────────────────────────────────────────────
    // APPLY FEAT
    // ────────────────────────────────────────────
    async applyFeat(actor, featObj) {
        const exists = actor.items.some(i => i.type === 'feat' && i.name === featObj.name);
        if (!exists || featObj.repeatable) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', [featObj]);
        }
    },

    // ────────────────────────────────────────────
    // APPLY TALENT
    // ────────────────────────────────────────────
    async applyTalent(actor, talent) {
        const exists = actor.items.some(i => i.type === 'talent' && i.name === talent.name);
        if (exists) {return;}

        // PHASE 3: Route through ActorEngine
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{
            name: talent.name,
            type: 'talent',
            img: talent.img,
            system: talent.system
        }]);
    },

    // ────────────────────────────────────────────
    // APPLY FORCE POWER
    // ────────────────────────────────────────────
    async applyForcePower(actor, power) {
        const exists = actor.items.some(i => i.type === 'forcepower' && i.name === power.name);
        if (exists) {return;}

        // PHASE 3: Route through ActorEngine
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{
            name: power.name,
            type: 'forcepower',
            img: power.img,
            system: power.system
        }]);
    },

    // ────────────────────────────────────────────
    // APPLY SCALING FEATURE
    // e.g. Trusty Sidearm +3, Precision Aim +2
    // ────────────────────────────────────────────
    async applyScalingFeature(actor, feature, className) {
        const key = `${className}-${feature.name}`.replace(/\s+/g, '-').toLowerCase();

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            [`system.scaling.${key}.value`]: feature.value,
            [`system.scaling.${key}.source`]: className
        });
    },

    // ────────────────────────────────────────────
    // APPLY CLASS FEATURE
    // e.g. Weapon Proficiency (Simple), Lightsaber, etc.
    // ────────────────────────────────────────────
    async applyClassFeature(actor, feature, className) {
        const exists = actor.items.some(i =>
            (i.type === 'feat' || i.type === 'classfeature') &&
            i.name === feature.name
        );

        if (!exists) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{
                name: feature.name,
                type: 'classfeature',
                img: 'icons/svg/upgrade.svg',
                system: {
                    description: `Class Feature from ${className}`
                }
            }]);
        }
    },

    // ────────────────────────────────────────────
    // APPLY SKILL TRAINING
    // ────────────────────────────────────────────
    async applySkillTraining(actor, skillKey) {
        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
            [`system.skills.${skillKey}.trained`]: true
        });
    },

    // ────────────────────────────────────────────
    // APPLY ABILITY INCREASES
    // ────────────────────────────────────────────
    async applyAbilityIncreases(actor, abilityMods) {
        const updates = {};

        for (const [ability, mod] of Object.entries(abilityMods || {})) {
            if (mod > 0) {
                updates[`system.attributes.${ability}.mod`] = (actor.system.attributes[ability]?.mod || 0) + mod;
            }
        }

        if (Object.keys(updates).length > 0) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.updateActor(actor, updates);
        }
    },

    // ────────────────────────────────────────────
    // APPLY HP INCREASE
    // ────────────────────────────────────────────
    async applyHPGain(actor, hpGain) {
        if (hpGain > 0) {
            // PHASE 3: Route through ActorEngine
            await ActorEngine.updateActor(actor, {
                'system.hp.max': (actor.system.hp?.max || 0) + hpGain,
                'system.hp.value': (actor.system.hp?.value || 0) + hpGain
            });
        }
    },

    // ────────────────────────────────────────────
    // RECALCULATE DERIVED VALUES
    // ────────────────────────────────────────────
    async recalculateDerived(actor) {
        // Recalculate BAB, defenses, skills, etc.
        await // actor.prepareData(); // v13+ handled by lifecycle
        await actor.sheet?.render(true);
    }
};
