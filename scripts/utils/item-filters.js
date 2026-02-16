/**
 * Item Type Filtering Utility
 * PHASE C: Centralized item type filters to prevent scattered .filter() calls
 * Single source of truth for item type comparisons across codebase
 */

/**
 * Get all feats from items collection
 */
export function getFeats(items) {
  return (items || []).filter(i => i.type === 'feat');
}

/**
 * Get all talents from items collection
 */
export function getTalents(items) {
  return (items || []).filter(i => i.type === 'talent');
}

/**
 * Get all classes from items collection
 */
export function getClasses(items) {
  return (items || []).filter(i => i.type === 'class');
}

/**
 * Get all skills from items collection
 */
export function getSkills(items) {
  return (items || []).filter(i => i.type === 'skill');
}

/**
 * Get all force powers from items collection
 */
export function getForcePowers(items) {
  return (items || []).filter(i => i.type === 'forcepower');
}

/**
 * Get all force techniques from items collection
 */
export function getForceTechniques(items) {
  return (items || []).filter(i => i.type === 'forcetechnique');
}

/**
 * Get all force secrets from items collection
 */
export function getForceSecrets(items) {
  return (items || []).filter(i => i.type === 'forcesecret');
}

/**
 * Get all weapons from items collection
 */
export function getWeapons(items) {
  return (items || []).filter(i => i.type === 'weapon');
}

/**
 * Get all armor from items collection
 */
export function getArmor(items) {
  return (items || []).filter(i => i.type === 'armor');
}

/**
 * Get all generic equipment/gear from items collection
 */
export function getEquipment(items) {
  return (items || []).filter(i => i.type === 'equipment');
}

/**
 * Get all items of a specific type
 */
export function getItemsByType(items, type) {
  if (!type) return [];
  return (items || []).filter(i => i.type === type);
}

/**
 * Check if items collection contains any of given type
 */
export function hasItemType(items, type) {
  return (items || []).some(i => i.type === type);
}
