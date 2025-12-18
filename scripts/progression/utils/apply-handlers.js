/**
 * Normalized Application Handlers for Progression Engine
 * Every game action funnels through these centralized handlers.
 * Ensures consistent, normalized application of class, feat, talent, and power selections.
 */

export const ApplyHandlers = {

    // ────────────────────────────────────────────
    // APPLY CLASS
    // ────────────────────────────────────────────
    async applyClass(actor, classDoc, level) {
        // Create or update class item
        const item = actor.items.find(i => i.type === "class" && i.name === classDoc.name);

        if (item) {
            await item.update({ "system.level": level });
        } else {
            await actor.createEmbeddedDocuments("Item", [{
                name: classDoc.name,
                type: "class",
                img: classDoc.img,
                system: {
                    level,
                    hitDie: classDoc.system.hitDie,
                    babProgression: classDoc.system.babProgression,
                    defenses: classDoc.system.defenses,
                    description: classDoc.system.description || "",
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
        const exists = actor.items.some(i => i.type === "feat" && i.name === featObj.name);
        if (!exists || featObj.repeatable) {
            await actor.createEmbeddedDocuments("Item", [featObj]);
        }
    },

    // ────────────────────────────────────────────
    // APPLY TALENT
    // ────────────────────────────────────────────
    async applyTalent(actor, talent) {
        const exists = actor.items.some(i => i.type === "talent" && i.name === talent.name);
        if (exists) return;

        await actor.createEmbeddedDocuments("Item", [{
            name: talent.name,
            type: "talent",
            img: talent.img,
            system: talent.system
        }]);
    },

    // ────────────────────────────────────────────
    // APPLY FORCE POWER
    // ────────────────────────────────────────────
    async applyForcePower(actor, power) {
        const exists = actor.items.some(i => i.type === "forcepower" && i.name === power.name);
        if (exists) return;

        await actor.createEmbeddedDocuments("Item", [{
            name: power.name,
            type: "forcepower",
            img: power.img,
            system: power.system
        }]);
    },

    // ────────────────────────────────────────────
    // APPLY SCALING FEATURE
    // e.g. Trusty Sidearm +3, Precision Aim +2
    // ────────────────────────────────────────────
    async applyScalingFeature(actor, feature, className) {
        const key = `${className}-${feature.name}`.replace(/\s+/g, "-").toLowerCase();

        await actor.update({
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
            (i.type === "feat" || i.type === "classfeature") &&
            i.name === feature.name
        );

        if (!exists) {
            await actor.createEmbeddedDocuments("Item", [{
                name: feature.name,
                type: "classfeature",
                img: "icons/svg/upgrade.svg",
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
        await actor.update({
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
                updates[`system.abilities.${ability}.mod`] = (actor.system.abilities[ability]?.mod || 0) + mod;
            }
        }

        if (Object.keys(updates).length > 0) {
            await actor.update(updates);
        }
    },

    // ────────────────────────────────────────────
    // APPLY HP INCREASE
    // ────────────────────────────────────────────
    async applyHPGain(actor, hpGain) {
        if (hpGain > 0) {
            await actor.update({
                "system.hp.max": (actor.system.hp?.max || 0) + hpGain,
                "system.hp.value": (actor.system.hp?.value || 0) + hpGain
            });
        }
    },

    // ────────────────────────────────────────────
    // RECALCULATE DERIVED VALUES
    // ────────────────────────────────────────────
    async recalculateDerived(actor) {
        // Recalculate BAB, defenses, skills, etc.
        await actor.prepareData();
        await actor.sheet?.render(true);
    }
};
