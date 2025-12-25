/**
 * Normalizes class features inside levelProgression and startingFeatures.
 * Converts strings → objects, standardizes feature types, ensures values exist.
 */

const CANONICAL_FEATURE_TYPES = {
    talent_choice: "talent_choice",
    feat_choice: "feat_choice",
    feat_grant: "feat_grant",
    class_feature: "class_feature",
    scaling_feature: "scaling_feature",

    // Force-related class choices
    force_technique_choice: "force_technique_choice",
    force_secret_choice: "force_secret_choice",
    force_power_grant: "force_power_grant",

    // Special Saga variants
    medical_secret_choice: "medical_secret_choice",
    bonus_feat: "feat_choice"
};

export function normalizeClassFeature(rawFeature) {
    // Convert strings → objects
    if (typeof rawFeature === "string") {
        return {
            name: rawFeature,
            type: "class_feature"
        };
    }

    const f = foundry.utils.duplicate(rawFeature);

    // Always ensure a name exists
    f.name = f.name || f.feature || "Unnamed Feature";

    // Normalize feature type field
    f.type =
        f.type ||
        f.featureType ||
        f.kind ||
        "class_feature";

    f.type = f.type.trim().toLowerCase();

    // Map near-matches to canonical versions
    if (CANONICAL_FEATURE_TYPES[f.type]) {
        f.type = CANONICAL_FEATURE_TYPES[f.type];
    }

    // Normalize scaling feature value
    if (f.type === "scaling_feature") {
        f.value = Number(f.value || 1);
        if (isNaN(f.value)) f.value = 1;
    }

    // Normalize Force-related features
    if (f.type.includes("force") && !f.value) {
        f.value = 1; // safe default
    }

    // Ensure bonus feat lists exist
    if (f.type === "feat_choice" && f.list && typeof f.list === "string") {
        f.list = f.list.trim();
    }

    return f;
}


/**
 * Normalizes ALL class features inside a class document.
 * Used inside class normalization solution.
 */
export function normalizeClassFeatureList(list) {
    if (!list) return [];

    if (!Array.isArray(list)) {
        list = [list];
    }

    return list.map(f => normalizeClassFeature(f));
}
