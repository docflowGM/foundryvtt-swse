/**
 * Normalizes class data from compendium documents or raw objects.
 * Ensures consistent schema for:
 *  - talent trees
 *  - class skills
 *  - level progression
 *  - starting features
 *  - hit dice
 *  - BAB progression
 *  - defense bonuses
 */

import { normalizeClassFeatureList } from "./class-feature-normalizer.js";

export function normalizeClassData(rawClass) {

    if (!rawClass || !rawClass.system) return rawClass;

    const cls = foundry.utils.duplicate(rawClass);

    // --------------------------------------
    // 1. Normalize Talent Trees
    // --------------------------------------
    cls.system.talentTrees =
        cls.system.talentTrees ||
        cls.system.talent_trees ||
        cls.system.talent_tree ||
        [];

    if (!Array.isArray(cls.system.talentTrees)) {
        cls.system.talentTrees = [cls.system.talentTrees];
    }

    // --------------------------------------
    // 2. Normalize Class Skills
    // --------------------------------------
    cls.system.classSkills =
        cls.system.classSkills ||
        cls.system.class_skills ||
        cls.system.skills ||
        [];

    if (!Array.isArray(cls.system.classSkills)) {
        cls.system.classSkills = [cls.system.classSkills];
    }

    // --------------------------------------
    // 3. Normalize Hit Die
    // --------------------------------------
    cls.system.hitDie =
        cls.system.hitDie ||
        cls.system.hit_die ||
        "1d6";

    // If numeric, convert to "1dX"
    if (typeof cls.system.hitDie === 'number') {
        cls.system.hitDie = `1d${cls.system.hitDie}`;
    }

    // --------------------------------------
    // 4. Normalize BAB progression
    // --------------------------------------
    cls.system.babProgression =
        cls.system.babProgression ||
        cls.system.bab_progression ||
        cls.system.bab ||
        "medium";

    // Standardize to slow / medium / fast
    const babMap = {
        "0.5": "slow",
        "0.75": "medium",
        "1.0": "fast",
        0.5: "slow",
        0.75: "medium",
        1.0: "fast"
    };

    if (babMap[cls.system.babProgression]) {
        cls.system.babProgression = babMap[cls.system.babProgression];
    }

    // --------------------------------------
    // 5. Normalize Defense Bonuses
    // --------------------------------------
    cls.system.defenses = cls.system.defenses || {
        fortitude: 0,
        reflex: 0,
        will: 0
    };

    // fallback: if defenses exist at root
    if (typeof cls.system.fortitude === "number") {
        cls.system.defenses.fortitude = cls.system.fortitude;
    }

    // --------------------------------------
    // 6. Normalize Starting Features
    // --------------------------------------
    cls.system.startingFeatures =
        cls.system.startingFeatures ||
        cls.system.starting_features ||
        [];

    cls.system.startingFeatures = normalizeClassFeatureList(cls.system.startingFeatures);

    // --------------------------------------
    // 7. Normalize Level Progression
    // --------------------------------------
    cls.system.levelProgression =
        cls.system.levelProgression ||
        cls.system.level_progression ||
        [];

    cls.system.levelProgression = cls.system.levelProgression.map(lp => {
        lp.features = normalizeClassFeatureList(lp.features);
        lp.bab = lp.bab ?? null; // allow null
        return lp;
    });

    // --------------------------------------
    // 8. Normalize Force User Flags
    // --------------------------------------
    // Force-sensitive classes
    cls.system.forceSensitive =
        cls.system.forceSensitive ||
        cls.system.force_sensitive ||
        false;

    return cls;
}
