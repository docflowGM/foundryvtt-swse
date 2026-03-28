/**
 * Selection Ordering Utility
 *
 * Enforces canonical ordering for feat and talent selections:
 * - General (priority 0)
 * - Class (priority 1)
 * - Bonus/Granted (priority 2)
 * - Subtype-specific (priority 3)
 *
 * Within same priority, sorts alphabetically by name (tiebreaker).
 *
 * Used at display time only — storage maintains insertion order.
 */

/**
 * Selection source priority levels
 */
export const SelectionSourcePriority = {
  GENERAL: 0,   // General/heroic selections
  CLASS: 1,     // Class-specific selections
  BONUS: 2,     // Bonus/granted selections (from feats, talents)
  SUBTYPE: 3,   // Subtype-specific (Beast, Droid, Nonheroic)
};

/**
 * Detect the source priority of a selection
 * @param {Object} selection - Selection object with 'source' property
 * @returns {number} Priority level from SelectionSourcePriority
 */
export function getSelectionSourcePriority(selection) {
  if (!selection || !selection.source) {
    return SelectionSourcePriority.GENERAL;
  }

  const source = selection.source;

  // General/heroic selections
  if (source === 'general' || source === 'heroic') {
    return SelectionSourcePriority.GENERAL;
  }

  // Class-specific selections
  if (source === 'class') {
    return SelectionSourcePriority.CLASS;
  }

  // Bonus/granted selections
  if (source && (source.includes('granted') || source.includes('bonus'))) {
    return SelectionSourcePriority.BONUS;
  }

  // Subtype-specific selections
  if (source === 'beast' || source === 'droid' || source === 'nonheroic') {
    return SelectionSourcePriority.SUBTYPE;
  }

  // Default to general
  return SelectionSourcePriority.GENERAL;
}

/**
 * Sort selections in canonical order: General → Class → Bonus → Subtype
 * Within same priority, sort alphabetically by name (case-insensitive)
 *
 * @param {Array<Object>} selections - Array of selection objects
 * @returns {Array<Object>} Sorted copy (original array unchanged)
 */
export function canonicallyOrderSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  // Create a copy to avoid mutating the original
  return [...selections].sort((a, b) => {
    // First, sort by priority
    const aPriority = getSelectionSourcePriority(a);
    const bPriority = getSelectionSourcePriority(b);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // If same priority, sort alphabetically by name (case-insensitive)
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();

    return aName.localeCompare(bName);
  });
}
