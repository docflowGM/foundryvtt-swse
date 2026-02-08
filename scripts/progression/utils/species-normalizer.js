/**
 * Normalizes species documents before being used by chargen or the progression engine.
 * Ensures consistent fields for:
 *  - skills
 *  - ability modifiers
 *  - languages
 *  - species features
 *  - size, speed, traits
 */

export function normalizeSpeciesData(rawSpecies) {
    if (!rawSpecies?.system) {return rawSpecies;}

    const sp = foundry.utils.deepClone(rawSpecies);

    // --------------------------------------------
    // 1. Normalize Ability Modifiers
    // --------------------------------------------
    sp.system.abilityMods =
        sp.system.abilityMods ||
        sp.system.ability_mods ||
        sp.system.attributes ||
        {};

    // Ensure all ability keys exist
    const ab = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    ab.forEach(a => {
        sp.system.abilityMods[a] = Number(sp.system.abilityMods[a] || 0);
    });

    // --------------------------------------------
    // 2. Normalize Species Skills
    // --------------------------------------------
    sp.system.grantedSkills =
        sp.system.grantedSkills ||
        sp.system.skills ||
        sp.system.bonusSkills ||
        [];

    if (!Array.isArray(sp.system.grantedSkills)) {
        sp.system.grantedSkills = [sp.system.grantedSkills];
    }

    // --------------------------------------------
    // 3. Normalize Languages
    // --------------------------------------------
    sp.system.languages =
        sp.system.languages ||
        sp.system.language ||
        sp.system.startingLanguages ||
        [];

    if (!Array.isArray(sp.system.languages)) {
        sp.system.languages = [sp.system.languages];
    }

    // --------------------------------------------
    // 4. Normalize Species Features / Traits
    // --------------------------------------------
    sp.system.traits =
        sp.system.traits ||
        sp.system.features ||
        sp.system.special ||
        [];

    if (!Array.isArray(sp.system.traits)) {
        sp.system.traits = [sp.system.traits];
    }

    // --------------------------------------------
    // 5. Normalize Speed & Size
    // --------------------------------------------
    sp.system.size = sp.system.size || sp.system.category || 'Medium';

    sp.system.speed = Number(sp.system.speed || sp.system.movement || 6);
    if (isNaN(sp.system.speed)) {sp.system.speed = 6;}

    return sp;
}
