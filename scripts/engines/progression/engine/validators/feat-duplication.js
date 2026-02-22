/**
 * SWSE Feat Duplication Validator
 * Prevents duplicate feats from being granted during progression
 */

/**
 * Check if an actor can take a feat (i.e., doesn't already have it)
 * @param {Actor} actor - The actor to check
 * @param {string} featName - Name of the feat to check
 * @returns {boolean} - True if the feat can be taken, false if already present
 */
export function canTakeFeat(actor, featName) {
  if (!actor || !featName) {return false;}

  // Normalize feat name for comparison (trim whitespace, case-insensitive)
  const normalizedName = featName.trim().toLowerCase();

  // Check existing feat items
  const hasFeatItem = actor.items.some(item =>
    item.type === 'feat' &&
    item.name.trim().toLowerCase() === normalizedName
  );

  if (hasFeatItem) {return false;}

  // Check progression data
  const progression = actor.system.progression || {};

  // Check starting feats
  const hasInStartingFeats = (progression.startingFeats || []).some(
    f => f.trim().toLowerCase() === normalizedName
  );

  if (hasInStartingFeats) {return false;}

  // Check chosen feats
  const hasInChosenFeats = (progression.feats || []).some(
    f => f.trim().toLowerCase() === normalizedName
  );

  if (hasInChosenFeats) {return false;}

  return true;
}

/**
 * Get all feats an actor currently has
 * @param {Actor} actor - The actor to check
 * @returns {string[]} - Array of feat names
 */
export function getActorFeats(actor) {
  if (!actor) {return [];}

  const feats = new Set();

  // Add feats from items
  actor.items.forEach(item => {
    if (item.type === 'feat') {
      feats.add(item.name.trim());
    }
  });

  // Add feats from progression
  const progression = actor.system.progression || {};

  (progression.startingFeats || []).forEach(f => feats.add(f.trim()));
  (progression.feats || []).forEach(f => feats.add(f.trim()));

  return Array.from(feats);
}
