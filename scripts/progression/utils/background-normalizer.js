/**
 * Normalizes background documents into a consistent schema compatible
 * with chargen and progression engine requirements.
 */

export function normalizeBackgroundData(rawBackground) {
    if (!rawBackground?.system) return rawBackground;

    const bg = foundry.utils.duplicate(rawBackground);

    // --------------------------------------------
    // 1. Normalize skill grants
    // --------------------------------------------
    bg.system.skills =
        bg.system.skills ||
        bg.system.grantedSkills ||
        bg.system.skill ||
        [];

    if (!Array.isArray(bg.system.skills)) {
        bg.system.skills = [bg.system.skills];
    }

    // --------------------------------------------
    // 2. Normalize feat grants
    // --------------------------------------------
    bg.system.feats =
        bg.system.feats ||
        bg.system.grantedFeats ||
        bg.system.feat ||
        [];

    if (!Array.isArray(bg.system.feats)) {
        bg.system.feats = [bg.system.feats];
    }

    // --------------------------------------------
    // 3. Normalize talent grants
    // --------------------------------------------
    bg.system.talents =
        bg.system.talents ||
        bg.system.grantedTalents ||
        bg.system.talent ||
        [];

    if (!Array.isArray(bg.system.talents)) {
        bg.system.talents = [bg.system.talents];
    }

    // --------------------------------------------
    // 4. Normalize languages
    // --------------------------------------------
    bg.system.languages =
        bg.system.languages ||
        bg.system.language ||
        [];

    if (!Array.isArray(bg.system.languages)) {
        bg.system.languages = [bg.system.languages];
    }

    // --------------------------------------------
    // 5. Normalize bonus features
    // --------------------------------------------
    bg.system.features =
        bg.system.features ||
        bg.system.grants ||
        bg.system.special ||
        [];

    if (!Array.isArray(bg.system.features)) {
        bg.system.features = [bg.system.features];
    }

    return bg;
}
