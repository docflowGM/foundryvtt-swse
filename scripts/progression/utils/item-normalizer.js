/**
 * Normalizes Feats, Talents, and Force Powers into a standard format
 * so the Progression Engine and PrerequisiteValidator always see consistent data.
 */

import { normalizePrerequisiteString } from "./prerequisite-normalizer.js";
import { normalizeSpeciesData } from "./species-normalizer.js";
import { normalizeBackgroundData } from "./background-normalizer.js";

// ============================================================
// FEAT NORMALIZATION
// ============================================================

export function normalizeFeatData(rawFeat) {
    const feat = foundry.utils.deepClone(rawFeat);

    feat.system.featType =
        feat.system.featType ||
        feat.system.type ||
        "general";

    // Always an array
    feat.system.bonus_feat_for = feat.system.bonus_feat_for || [];
    if (typeof feat.system.bonus_feat_for === "string") {
        feat.system.bonus_feat_for = [feat.system.bonus_feat_for];
    }

    // Normalize prerequisites
    feat.system.prerequisite = normalizePrerequisiteString(feat.system.prerequisite);

    return feat;
}


// ============================================================
// TALENT NORMALIZATION
// ============================================================

export function normalizeTalentData(rawTalent) {
    const talent = foundry.utils.deepClone(rawTalent);

    // Normalize tree name
    talent.system.talent_tree =
        talent.system.talent_tree ||
        talent.system.tree ||
        talent.system.talentTree ||
        "";

    // Prerequisites: normalize to structured format
    talent.system.prerequisites = normalizePrerequisiteString(talent.system.prerequisites);

    // Normalize class name field
    talent.system.class =
        talent.system.class ||
        talent.system.sourceClass ||
        null;

    return talent;
}


// ============================================================
// FORCE POWER NORMALIZATION
// ============================================================

export function normalizeForcePowerData(rawPower) {
    const power = foundry.utils.deepClone(rawPower);

    // Normalize powerLevel
    if (!power.system.powerLevel) {
        power.system.powerLevel = 1;
    } else {
        power.system.powerLevel = Number(power.system.powerLevel);
        if (isNaN(power.system.powerLevel)) {
            power.system.powerLevel = 1;
        }
    }

    // Normalize tree
    power.system.tree =
        power.system.tree ||
        power.system.forceTree ||
        null;

    // Normalize prerequisite power to structured format
    power.system.prerequisitePower = normalizePrerequisiteString(power.system.prerequisitePower);

    return power;
}


// ============================================================
// UNIVERSAL NORMALIZER — CALL THIS EVERYWHERE
// ============================================================

export function normalizeItemByType(item) {
    if (!item?.type) return item;

    switch (item.type) {
        case "feat":
            return normalizeFeatData(item);
        case "talent":
            return normalizeTalentData(item);
        case "forcepower":
        case "force-power":
            return normalizeForcePowerData(item);
        case "species":
            return normalizeSpeciesData(item);
        case "background":
            return normalizeBackgroundData(item);
        default:
            return item;
    }
}
