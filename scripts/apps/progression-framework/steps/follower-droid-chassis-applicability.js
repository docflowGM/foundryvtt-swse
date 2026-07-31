/**
 * Follower Droid Chassis Applicability
 *
 * PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
 *
 * Pure extraction of `DroidBuilderStep`'s per-item and per-presentation
 * constraint filtering (`_systemAllowedBySpeciesConstraints` /
 * `_applySpeciesDroidConstraintsToPresentation`), which is the only real,
 * working chassis-option filtering mechanism in the follower droid chargen
 * flow — confirmed by tracing the code, not assumed. Extracted so the
 * decision itself is unit-testable without instantiating the full
 * `DroidBuilderStep` (a large, Foundry-App-derived class), mirroring the
 * `getStockAttackFlatBonus`/`shouldSuppressComponentModifiers` extraction
 * pattern used in earlier droid-stabilization phases.
 *
 * `DroidBuilderStep`'s own two methods are thin delegates to these
 * functions — behavior is unchanged for every existing caller (PC droid
 * chargen, which passes no constraint object and always gets `true`/
 * unfiltered results, and follower droid chargen, which passes the
 * follower-specific category/subcategory constraint object).
 */

/**
 * Is a single canonical chassis/system option applicable given the current
 * follower (or other droid-builder caller's) constraint object? A `null`
 * constraint means "no restriction" — the normal PC droid-chargen case.
 *
 * @param {{allowedCategories?: string[], allowedAccessorySubcategories?: string[], allowedAccessoryIds?: string[]}|null} constraints
 * @param {{category: string, id: string, subcategory?: string|null}} option
 * @returns {boolean}
 */
export function isFollowerDroidChassisApplicable(constraints, { category, id, subcategory = null }) {
  if (!constraints) return true;

  const allowedCategories = new Set(constraints.allowedCategories || []);
  if (allowedCategories.size && !allowedCategories.has(category) && !allowedCategories.has(subcategory)) {
    return false;
  }

  if (category === 'accessory') {
    const allowedAccessorySubcategories = new Set(constraints.allowedAccessorySubcategories || []);
    const allowedAccessoryIds = new Set(constraints.allowedAccessoryIds || []);
    if (allowedAccessorySubcategories.size && !allowedAccessorySubcategories.has(subcategory)) return false;
    if (allowedAccessoryIds.size && !allowedAccessoryIds.has(id)) return false;
  }

  return true;
}

/**
 * Filter a full `DROID_SYSTEMS`-shaped "available options" object down to
 * what the given constraint object allows, applying `enhanceFn` (e.g. a
 * suggestion-annotation pass) to whatever survives. A `null` constraint
 * returns every category as-is (still passed through `enhanceFn` for
 * accessories, matching the unconstrained PC-chargen behavior exactly).
 *
 * @param {object} available - `{locomotion, processors, appendages, accessories: {subcategory: option[]}, locomotionEnhancements, appendageEnhancements}`
 * @param {object|null} constraints
 * @param {(options: object[]) => object[]} [enhanceFn]
 * @returns {object}
 */
export function getApplicableFollowerDroidChassisOptions(available, constraints, enhanceFn = (options) => options) {
  if (!constraints) {
    return {
      ...available,
      accessories: Object.fromEntries(
        Object.entries(available.accessories || {}).map(([key, systems]) => [key, enhanceFn(systems)])
      ),
    };
  }

  const allowedCategories = new Set(constraints.allowedCategories || []);
  const allowedAccessorySubcategories = new Set(constraints.allowedAccessorySubcategories || []);
  const allowedAccessoryIds = new Set(constraints.allowedAccessoryIds || []);
  const shouldShowCategory = (category) => allowedCategories.size === 0 || allowedCategories.has(category);

  const constrainedAccessories = {};
  for (const [subcategory, systems] of Object.entries(available.accessories || {})) {
    if (allowedAccessorySubcategories.size && !allowedAccessorySubcategories.has(subcategory)) continue;
    const filtered = (systems || []).filter(system => allowedAccessoryIds.size === 0 || allowedAccessoryIds.has(system.id));
    if (filtered.length) constrainedAccessories[subcategory] = enhanceFn(filtered);
  }

  return {
    locomotion: shouldShowCategory('locomotion') ? available.locomotion : [],
    processors: shouldShowCategory('processor') ? available.processors : [],
    appendages: shouldShowCategory('appendage') ? available.appendages : [],
    accessories: constrainedAccessories,
    locomotionEnhancements: shouldShowCategory('locomotionEnhancements') ? available.locomotionEnhancements : [],
    appendageEnhancements: shouldShowCategory('appendageEnhancements') ? available.appendageEnhancements : [],
    constraintNote: constraints.notes || null,
  };
}
