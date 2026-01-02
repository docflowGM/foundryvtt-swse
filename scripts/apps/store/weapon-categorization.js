/**
 * Weapon Categorization for SWSE Store
 * Intelligently sorts weapons into Melee, Ranged, and special categories
 */

/**
 * Categorize a weapon as melee or ranged based on its properties
 * @param {Object} weapon - Weapon item with system data
 * @returns {string} Category: 'melee', 'ranged-pistols', 'ranged-rifles', 'ranged-heavy', 'explosives'
 */
export function categorizeWeapon(weapon) {
    const range = weapon.system?.range || '';
    const name = weapon.name || '';
    const attackAttr = weapon.system?.attackAttribute || 'str';

    // MELEE WEAPONS
    // Explicitly marked as melee
    if (range.toLowerCase() === 'melee') {
        return 'melee';
    }

    // Reach weapons (2-3 squares with STR attribute)
    if (range.match(/^[2-3]\s*squares?$/i) && attackAttr === 'str') {
        return 'melee'; // Whips, reach weapons
    }

    // EXPLOSIVES & GRENADES
    if (name.toLowerCase().includes('grenade') ||
        name.toLowerCase().includes('detonator') ||
        name.toLowerCase().includes('explosive')) {
        return 'explosives';
    }

    // RANGED WEAPONS - subcategorized
    // Pistols (generally 8-20 squares, lighter weapons)
    if (name.toLowerCase().includes('pistol') ||
        name.toLowerCase().includes('hold-out')) {
        return 'ranged-pistols';
    }

    // Rifles & Carbines (generally 20-80 squares)
    if (name.toLowerCase().includes('rifle') ||
        name.toLowerCase().includes('carbine') ||
        name.toLowerCase().includes('bowcaster') ||
        name.toLowerCase().includes('sniper')) {
        return 'ranged-rifles';
    }

    // Heavy Weapons (cannons, launchers, repeating weapons)
    if (name.toLowerCase().includes('cannon') ||
        name.toLowerCase().includes('launcher') ||
        name.toLowerCase().includes('repeating') ||
        name.toLowerCase().includes('heavy laser')) {
        return 'ranged-heavy';
    }

    // Exotic/Special weapons (short range, special properties)
    if (name.toLowerCase().includes('flamethrower') ||
        name.toLowerCase().includes('lanvarok') ||
        name.toLowerCase().includes('ripper') ||
        name.toLowerCase().includes('net') ||
        name.toLowerCase().includes('wrist')) {
        return 'ranged-exotic';
    }

    // Default: Use range and attack attribute to determine
    const rangeNum = parseInt(range, 10);
    if (!isNaN(rangeNum)) {
        if (rangeNum <= 5) {
            // Very short range - likely thrown/exotic
            return 'ranged-exotic';
        } else if (rangeNum <= 20) {
            // Short-medium range
            return attackAttr === 'str' ? 'ranged-rifles' : 'ranged-pistols';
        } else if (rangeNum <= 40) {
            // Medium-long range
            return 'ranged-rifles';
        } else {
            // Very long range
            return 'ranged-heavy';
        }
    }

    // Fallback
    return 'uncategorized';
}

/**
 * Sort weapons by category for store display
 * @param {Array} weapons - Array of weapon items
 * @returns {Object} Categorized weapons object
 */
export function sortWeaponsByCategory(weapons) {
    const categories = {
        melee: [],
        'ranged-pistols': [],
        'ranged-rifles': [],
        'ranged-heavy': [],
        'ranged-exotic': [],
        explosives: [],
        uncategorized: []
    };

    for (const weapon of weapons) {
        const category = categorizeWeapon(weapon);
        categories[category].push(weapon);
    }

    // Sort each category alphabetically by name
    for (const category in categories) {
        categories[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    return categories;
}

/**
 * Get display name for weapon category
 * @param {string} category - Category key
 * @returns {string} Display name
 */
export function getCategoryDisplayName(category) {
    const names = {
        'melee': 'Melee Weapons',
        'ranged-pistols': 'Ranged: Pistols',
        'ranged-rifles': 'Ranged: Rifles & Carbines',
        'ranged-heavy': 'Ranged: Heavy Weapons',
        'ranged-exotic': 'Ranged: Exotic Weapons',
        'explosives': 'Explosives & Grenades',
        'uncategorized': 'Other Weapons'
    };
    return names[category] || category;
}

/**
 * Manual categorization override for edge cases
 * This ensures specific weapons are categorized correctly
 */
const MANUAL_OVERRIDES = {
    'Electro-whip': 'melee',           // Reach weapon
    'Zeltron Neural Whip': 'melee',    // Reach weapon
    'Bowcaster': 'ranged-rifles',      // Wookiee crossbow
    'Electro-net': 'ranged-exotic',    // Thrown net
    'Flamethrower': 'ranged-exotic',   // Special weapon
    'Sith Lanvarok': 'ranged-exotic',  // Disc launcher
    'Mandalorian Ripper': 'ranged-exotic', // Thrown blade
    'Wrist Laser': 'ranged-exotic',    // Wrist-mounted blaster
    'Wrist Rocket Launcher': 'ranged-exotic', // Wrist-mounted launcher
    'Lightfoil': 'melee',              // Fencing lightsaber (DEX-based but still melee)
};

/**
 * Get category with manual override support
 * @param {Object} weapon - Weapon item
 * @returns {string} Category
 */
export function getCategoryWithOverrides(weapon) {
    const name = weapon.name || '';

    // Check manual overrides first
    if (MANUAL_OVERRIDES[name]) {
        return MANUAL_OVERRIDES[name];
    }

    // Otherwise use intelligent categorization
    return categorizeWeapon(weapon);
}
