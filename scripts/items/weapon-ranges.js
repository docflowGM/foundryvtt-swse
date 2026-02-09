/**
 * Weapon Range Utilities for SWSE
 * Handles default range brackets based on weapon type
 */

/**
 * Range categories with penalties
 * Point-Blank: No penalty
 * Short: -2 penalty
 * Medium: -5 penalty
 * Long: -10 penalty
 */
export const RANGE_PENALTIES = {
  pointBlank: 0,
  short: -2,
  medium: -5,
  long: -10
};

/**
 * Range brackets by weapon type (in squares)
 */
export const WEAPON_RANGE_BRACKETS = {
  // Heavy Weapons: 0-50, 51-100, 101-250, 251-500
  'heavy': {
    pointBlank: { min: 0, max: 50 },
    short: { min: 51, max: 100 },
    medium: { min: 101, max: 250 },
    long: { min: 251, max: 500 }
  },

  // Pistols: 0-20, 21-40, 41-60, 61-80
  'pistol': {
    pointBlank: { min: 0, max: 20 },
    short: { min: 21, max: 40 },
    medium: { min: 41, max: 60 },
    long: { min: 61, max: 80 }
  },

  // Rifles: 0-30, 31-60, 61-150, 151-300
  'rifle': {
    pointBlank: { min: 0, max: 30 },
    short: { min: 31, max: 60 },
    medium: { min: 61, max: 150 },
    long: { min: 151, max: 300 }
  },

  // Simple Weapons: 0-20, 21-40, 41-60, 61-80
  'simple': {
    pointBlank: { min: 0, max: 20 },
    short: { min: 21, max: 40 },
    medium: { min: 41, max: 60 },
    long: { min: 61, max: 80 }
  },

  // Thrown Weapons: 0-6, 7-8, 9-10, 11-12
  'thrown': {
    pointBlank: { min: 0, max: 6 },
    short: { min: 7, max: 8 },
    medium: { min: 9, max: 10 },
    long: { min: 11, max: 12 }
  }
};

/**
 * Determine weapon type from weapon name and properties
 * @param {Object} weapon - Weapon item
 * @returns {string} Weapon type: 'heavy', 'pistol', 'rifle', 'simple', 'thrown', or 'melee'
 */
export function determineWeaponType(weapon) {
  const name = (weapon.name || '').toLowerCase();
  const range = (weapon.system?.range || '').toLowerCase();
  const attackAttr = weapon.system?.attackAttribute || 'str';

  // Melee weapons
  if (range === 'melee' || range.includes('melee')) {
    return 'melee';
  }

  // Thrown weapons
  if (name.includes('grenade') ||
      name.includes('thermal detonator') ||
      name.includes('thrown') ||
      (attackAttr === 'str' && range.match(/^[1-6]\s*squares?$/i))) {
    return 'thrown';
  }

  // Heavy weapons
  if (name.includes('cannon') ||
      name.includes('launcher') ||
      name.includes('repeating') ||
      name.includes('heavy laser') ||
      name.includes('heavy blaster')) {
    return 'heavy';
  }

  // Pistols
  if (name.includes('pistol') ||
      name.includes('hold-out') ||
      name.includes('hand cannon')) {
    return 'pistol';
  }

  // Rifles
  if (name.includes('rifle') ||
      name.includes('carbine') ||
      name.includes('bowcaster') ||
      name.includes('sniper') ||
      name.includes('longarm')) {
    return 'rifle';
  }

  // Default based on range if specified
  const rangeNum = parseInt(range, 10);
  if (!isNaN(rangeNum)) {
    if (rangeNum <= 6) {return 'thrown';}
    if (rangeNum <= 20) {return attackAttr === 'dex' ? 'pistol' : 'simple';}
    if (rangeNum <= 40) {return 'pistol';}
    if (rangeNum <= 100) {return 'rifle';}
    return 'heavy';
  }

  // Fallback to simple
  return 'simple';
}

/**
 * Get range bracket for a weapon at a given distance
 * @param {Object} weapon - Weapon item
 * @param {number} distance - Distance in squares
 * @returns {Object} { bracket: 'pointBlank'|'short'|'medium'|'long', penalty: number }
 */
export function getRangeBracket(weapon, distance) {
  const weaponType = determineWeaponType(weapon);

  if (weaponType === 'melee') {
    return { bracket: 'melee', penalty: 0 };
  }

  const brackets = WEAPON_RANGE_BRACKETS[weaponType];
  if (!brackets) {
    return { bracket: 'unknown', penalty: 0 };
  }

  // Find which bracket the distance falls into
  for (const [bracketName, range] of Object.entries(brackets)) {
    if (distance >= range.min && distance <= range.max) {
      return {
        bracket: bracketName,
        penalty: RANGE_PENALTIES[bracketName] || 0,
        range: range
      };
    }
  }

  // Beyond long range
  return {
    bracket: 'beyond',
    penalty: -20,
    range: null
  };
}

/**
 * Get formatted range string for weapon display
 * @param {Object} weapon - Weapon item
 * @returns {string} Formatted range string (e.g., "0-30/31-60/61-150/151-300")
 */
export function getFormattedRangeString(weapon) {
  const weaponType = determineWeaponType(weapon);

  if (weaponType === 'melee') {
    return 'Melee';
  }

  const brackets = WEAPON_RANGE_BRACKETS[weaponType];
  if (!brackets) {
    return weapon.system?.range || 'Unknown';
  }

  return `${brackets.pointBlank.min}-${brackets.pointBlank.max}` +
         `/${brackets.short.min}-${brackets.short.max}` +
         `/${brackets.medium.min}-${brackets.medium.max}` +
         `/${brackets.long.min}-${brackets.long.max}`;
}

/**
 * Get detailed range information for weapon
 * @param {Object} weapon - Weapon item
 * @returns {Object} Range information with brackets and penalties
 */
export function getWeaponRangeInfo(weapon) {
  const weaponType = determineWeaponType(weapon);

  if (weaponType === 'melee') {
    return {
      type: 'melee',
      rangeString: 'Melee',
      brackets: null
    };
  }

  const brackets = WEAPON_RANGE_BRACKETS[weaponType];
  if (!brackets) {
    return {
      type: weaponType,
      rangeString: weapon.system?.range || 'Unknown',
      brackets: null
    };
  }

  return {
    type: weaponType,
    rangeString: getFormattedRangeString(weapon),
    brackets: {
      pointBlank: { ...brackets.pointBlank, penalty: RANGE_PENALTIES.pointBlank },
      short: { ...brackets.short, penalty: RANGE_PENALTIES.short },
      medium: { ...brackets.medium, penalty: RANGE_PENALTIES.medium },
      long: { ...brackets.long, penalty: RANGE_PENALTIES.long }
    }
  };
}
