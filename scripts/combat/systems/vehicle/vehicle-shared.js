/**
 * Shared utilities and constants for Vehicle Combat System
 * Contains crew quality bonuses, size modifiers, and helper methods
 */

/**
 * Crew quality bonuses for vehicle operations
 */
export const CREW_QUALITY = {
  'untrained': { attack: -5, check: 0, cl: -1 },
  'normal': { attack: 0, check: 5, cl: 0 },
  'skilled': { attack: 2, check: 6, cl: 1 },
  'expert': { attack: 5, check: 8, cl: 2 },
  'ace': { attack: 10, check: 12, cl: 4 }
};

/**
 * Range modifiers for vehicle weapon attacks
 */
export const RANGE_MODIFIERS = {
  'point-blank': 0,
  'short': -2,
  'medium': -5,
  'long': -10
};

/**
 * Size modifiers for vehicle attacks
 */
export const SIZE_MODIFIERS = {
  'large': -1,
  'huge': -2,
  'gargantuan': -5,
  'colossal': -10,
  'colossal (frigate)': -10,
  'colossal (cruiser)': -10,
  'colossal (station)': -10
};

/**
 * Size modifiers for damage threshold
 */
export const DAMAGE_THRESHOLD_SIZE_MODIFIERS = {
  'large': 5,
  'huge': 10,
  'gargantuan': 20,
  'colossal': 50,
  'colossal (frigate)': 100,
  'colossal (cruiser)': 200,
  'colossal (station)': 500
};

/**
 * Collision damage dice by size
 */
export const COLLISION_DAMAGE_DICE = {
  'large': '2d6',
  'huge': '4d6',
  'gargantuan': '6d6',
  'colossal': '8d6',
  'colossal (frigate)': '10d6',
  'colossal (cruiser)': '15d6',
  'colossal (station)': '20d6'
};

/**
 * Condition track labels
 */
export const CONDITION_TRACK_LABELS = ['Normal', '-1', '-2', '-5', 'Disabled', 'Disabled'];

/**
 * Get weapon range modifier
 * @param {string} range - Range band (point-blank, short, medium, long)
 * @returns {number} Range modifier
 */
export function getRangeModifier(range) {
  return RANGE_MODIFIERS[range] || 0;
}

/**
 * Get vehicle size modifier for attacks
 * @param {Actor} vehicle - The vehicle actor
 * @returns {number} Size modifier
 */
export function getVehicleSizeModifier(vehicle) {
  const size = (vehicle.system.size || 'medium').toLowerCase();
  return SIZE_MODIFIERS[size] || 0;
}

/**
 * Get vehicle damage threshold
 * Formula: Fortitude Defense + Size Modifier
 * @param {Actor} vehicle - The vehicle actor
 * @returns {number} Damage threshold
 */
export function getVehicleDamageThreshold(vehicle) {
  const fortitude = vehicle.system.fortitudeDefense || 10;
  const size = (vehicle.system.size || 'medium').toLowerCase();
  const sizeMod = DAMAGE_THRESHOLD_SIZE_MODIFIERS[size] || 0;
  return fortitude + sizeMod;
}

/**
 * Get gunner's Base Attack Bonus (from crew quality or actual character)
 * @param {Actor} vehicle - The vehicle actor
 * @param {Actor} gunner - The gunner actor (null for generic crew)
 * @returns {number} Base Attack Bonus
 */
export function getGunnerBAB(vehicle, gunner) {
  if (!gunner) {
    // Use vehicle's crew quality
    const crewQuality = vehicle.system.crewQuality || 'normal';
    return getCrewQualityBonus(crewQuality, 'attack');
  }

  // Use actual gunner's BAB
  return gunner.system?.baseAttack || gunner.system?.bab || 0;
}

/**
 * Get crew quality bonuses
 * @param {string} quality - Crew quality (untrained, normal, skilled, expert, ace)
 * @param {string} type - Bonus type (attack, check, cl)
 * @returns {number} Bonus value
 */
export function getCrewQualityBonus(quality, type) {
  return CREW_QUALITY[quality]?.[type] || 0;
}

/**
 * Get pilot bonus for Pilot checks
 * @param {Actor} vehicle - The vehicle actor
 * @param {Actor} pilot - The pilot actor (null for generic crew)
 * @returns {number} Pilot check bonus
 */
export function getPilotBonus(vehicle, pilot) {
  if (!pilot) {
    const crewQuality = vehicle.system.crewQuality || 'normal';
    return getCrewQualityBonus(crewQuality, 'check');
  }

  // Use actual pilot's Pilot skill
  const pilotSkill = pilot.system?.skills?.pilot?.total || 0;
  const sizeModifier = getVehicleSizeModifier(vehicle);
  return pilotSkill + sizeModifier;
}

/**
 * Get target's Reflex Defense
 * @param {Actor} target - The target actor (vehicle or character)
 * @returns {number} Reflex Defense
 */
export function getTargetReflexDefense(target) {
  if (target.type === 'vehicle') {
    return target.system.reflexDefense || 10;
  }
  return target.system.defenses?.reflex?.total || 10;
}

/**
 * Check if vehicle is a starfighter/airspeeder
 * @param {Actor} vehicle - The vehicle actor
 * @returns {boolean} True if starfighter
 */
export function isStarfighter(vehicle) {
  const size = (vehicle.system.size || 'medium').toLowerCase();
  return size === 'gargantuan' || size === 'huge';
}

/**
 * Get default pilot from vehicle crew
 * @param {Actor} vehicle - The vehicle actor
 * @returns {Actor|null} Pilot actor or null
 */
export function getDefaultPilot(vehicle) {
  // Try to get assigned pilot
  const pilotName = vehicle.system.crewPositions?.pilot;
  if (pilotName) {
    const pilot = game.actors.getName(pilotName);
    if (pilot) return pilot;
  }

  // Use generic crew
  return null;
}

/**
 * Get default gunner from vehicle crew
 * @param {Actor} vehicle - The vehicle actor
 * @returns {Actor|null} Gunner actor or null
 */
export function getDefaultGunner(vehicle) {
  // Try to get assigned gunner
  const gunnerName = vehicle.system.crewPositions?.gunner;
  if (gunnerName) {
    const gunner = game.actors.getName(gunnerName);
    if (gunner) return gunner;
  }

  // Use generic crew
  return null;
}
