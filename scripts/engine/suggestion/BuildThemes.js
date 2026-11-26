/**
 * Build theme definitions and feat->theme signals (leaf). Moved out of BuildIntent.js so BuildThemeProjection.js can use them without importing
 * BuildIntent (which imports BuildThemeProjection): breaks that two-file import cycle. BuildIntent.js re-exports both names unchanged.
 */

export const BUILD_THEMES = {
    FORCE: 'force',
    RANGED: 'ranged',
    MELEE: 'melee',
    STEALTH: 'stealth',
    SOCIAL: 'social',
    TECH: 'tech',
    LEADERSHIP: 'leadership',
    EXPLORATION: 'exploration',
    VEHICLE: 'vehicle',
    SUPPORT: 'support',
    COMBAT: 'combat',
    TRACKING: 'tracking'
};


export function normalizeTextTokens(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(entry => normalizeTextTokens(entry));
    if (value instanceof Set) return Array.from(value).flatMap(entry => normalizeTextTokens(entry));
    if (typeof value === 'object') {
        const preferred = value.name ?? value.label ?? value.title ?? value.id ?? value.key ?? value.slug ?? value.value;
        if (preferred != null) return normalizeTextTokens(preferred);
        return Object.values(value).flatMap(entry => normalizeTextTokens(entry));
    }
    const text = String(value).trim();
    return text ? [text] : [];
}

export function normalizeLowerTextTokens(value) {
    return normalizeTextTokens(value)
        .map(token => token.toLowerCase().trim())
        .filter(Boolean);
}

export function firstLowerTextToken(value) {
    return normalizeLowerTextTokens(value)[0] || '';
}

// Note: PRESTIGE_SIGNALS is now loaded from /data/prestige-signals.json
// See initializePrestigeSignals() above

// ──────────────────────────────────────────────────────────────
// FEAT SIGNAL MAPPINGS
// Maps feats to themes they indicate
// ──────────────────────────────────────────────────────────────

export const FEAT_THEME_SIGNALS = {
    // Force feats
    'Force Sensitivity': BUILD_THEMES.FORCE,
    'Force Training': BUILD_THEMES.FORCE,
    'Force Boon': BUILD_THEMES.FORCE,
    'Strong in the Force': BUILD_THEMES.FORCE,

    // Ranged combat feats
    'Point-Blank Shot': BUILD_THEMES.RANGED,
    'Precise Shot': BUILD_THEMES.RANGED,
    'Rapid Shot': BUILD_THEMES.RANGED,
    'Sniper': BUILD_THEMES.RANGED,
    'Far Shot': BUILD_THEMES.RANGED,
    'Deadeye': BUILD_THEMES.RANGED,
    'Quick Draw': BUILD_THEMES.RANGED,

    // Melee combat feats
    'Martial Arts I': BUILD_THEMES.MELEE,
    'Martial Arts II': BUILD_THEMES.MELEE,
    'Martial Arts III': BUILD_THEMES.MELEE,
    'Melee Defense': BUILD_THEMES.MELEE,
    'Rapid Strike': BUILD_THEMES.MELEE,
    'Flurry': BUILD_THEMES.MELEE,
    'Weapon Proficiency (Lightsabers)': BUILD_THEMES.FORCE,
    'Weapon Focus (Lightsabers)': BUILD_THEMES.FORCE,
    'Weapon Proficiency (Advanced Melee Weapons)': BUILD_THEMES.MELEE,

    // Stealth feats
    'Skill Focus (Stealth)': BUILD_THEMES.STEALTH,
    'Stealthy': BUILD_THEMES.STEALTH,

    // Social feats
    'Skill Focus (Persuasion)': BUILD_THEMES.SOCIAL,
    'Skill Focus (Deception)': BUILD_THEMES.SOCIAL,
    'Linguist': BUILD_THEMES.SOCIAL,

    // Tech feats
    'Skill Focus (Mechanics)': BUILD_THEMES.TECH,
    'Skill Focus (Use Computer)': BUILD_THEMES.TECH,
    'Tech Specialist': BUILD_THEMES.TECH,

    // Vehicle feats
    'Vehicular Combat': BUILD_THEMES.VEHICLE,
    'Skill Focus (Pilot)': BUILD_THEMES.VEHICLE,

    // Combat general
    'Armor Proficiency (Light)': BUILD_THEMES.COMBAT,
    'Armor Proficiency (Medium)': BUILD_THEMES.COMBAT,
    'Armor Proficiency (Heavy)': BUILD_THEMES.COMBAT,
    'Toughness': BUILD_THEMES.COMBAT,
    'Improved Damage Threshold': BUILD_THEMES.COMBAT,

    // Medical/Support
    'Surgical Expertise': BUILD_THEMES.SUPPORT,
    'Skill Focus (Treat Injury)': BUILD_THEMES.SUPPORT
};
