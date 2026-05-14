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

    const rawMovement = (sp.system.movement && typeof sp.system.movement === 'object')
        ? sp.system.movement
        : {};

    const asNumberOrNull = value => {
        if (value === null || value === undefined || value === '') {return null;}
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    sp.system.movement = {
        walk: null,
        swim: null,
        fly: null,
        climb: null,
        hover: null,
        glide: null,
        burrow: null,
        bySize: {},
        ...rawMovement,
    };

    const walk = asNumberOrNull(sp.system.movement.walk ?? sp.system.walkSpeed ?? sp.system.speed);
    const swim = asNumberOrNull(sp.system.movement.swim ?? sp.system.swimSpeed);
    const fly = asNumberOrNull(sp.system.movement.fly ?? sp.system.flySpeed);
    const climb = asNumberOrNull(sp.system.movement.climb ?? sp.system.climbSpeed);
    const hover = asNumberOrNull(sp.system.movement.hover ?? sp.system.hoverSpeed);

    if (walk !== null) {sp.system.movement.walk = walk;}
    if (swim !== null) {sp.system.movement.swim = swim;}
    if (fly !== null) {sp.system.movement.fly = fly;}
    if (climb !== null) {sp.system.movement.climb = climb;}
    if (hover !== null) {sp.system.movement.hover = hover;}

    sp.system.speed = Number(sp.system.speed ?? sp.system.movement.walk ?? sp.system.movement.fly ?? 6);
    if (isNaN(sp.system.speed)) {sp.system.speed = 6;}

    return sp;
}
