/**
 * Droid Item Classification
 *
 * PHASE 1 — Droid Authority Consolidation
 *
 * Pure, dependency-free predicates used to decide which bucket a droid's
 * embedded Item or projected part belongs in (Integrated Weapon, Integrated
 * Equipment, weaponized accessory, locomotion, etc). These used to be
 * inlined ad hoc in scripts/sheets/v2/droid-sheet/droid-systems-resolver.js
 * with two independent predicates (weapon vs equipment) that disagreed on
 * lightsaber handling, and a weaponized-accessory filter that dropped its
 * own output before the weapons list could read it. Pulling them out as
 * named, individually testable functions means the classification rule is
 * defined once and the same fix cannot regress in only one of its call
 * sites.
 *
 * Zero imports by design — this stays unit-testable under plain Node.
 */

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const WEAPON_LIKE_ITEM_TYPES = new Set(['weapon', 'lightsaber']);

/**
 * An embedded Item counts as an Integrated Weapon when it is a weapon-like
 * document type (weapon OR lightsaber) that has been flagged integrated.
 */
export function isIntegratedWeaponItem(item) {
  return WEAPON_LIKE_ITEM_TYPES.has(item?.type) &&
    (item?.system?.integrated === true || Boolean(item?.flags?.swse?.integrated));
}

/**
 * An embedded Item counts as Integrated Equipment when it is integrated but
 * is NOT a weapon-like document type. This must exclude the same set
 * isIntegratedWeaponItem() accepts (weapon AND lightsaber) — the original
 * defect excluded only 'weapon', so an integrated lightsaber satisfied both
 * predicates and rendered in both panels.
 *
 * @param {object} item
 * @param {object} [options]
 * @param {boolean} [options.hasCategoryOrSlot] - Whether the hydrated droid
 *   part projection for this item resolved a category/slot (a signal the
 *   catalog recognizes it as a droid system even without an explicit
 *   integrated flag). Callers that already hydrate the part should pass
 *   this through instead of re-deriving it here, since doing so requires
 *   the canonical schema this module intentionally does not import.
 */
export function isIntegratedEquipmentItem(item, { hasCategoryOrSlot = false } = {}) {
  if (WEAPON_LIKE_ITEM_TYPES.has(item?.type)) return false;
  return item?.type === 'integratedSystem' ||
    item?.system?.integrated === true ||
    Boolean(item?.flags?.swse?.integrated) ||
    Boolean(hasCategoryOrSlot);
}

/**
 * A projected/hydrated part (the shape produced by hydrateDroidPart /
 * _fromBuilder / _fromActorItem — anything carrying a weaponProfile) is
 * "weaponized" when it has a weapon profile attached.
 */
export function isWeaponizedProjectedPart(part) {
  return Boolean(part?.weaponProfile);
}

/**
 * Split a list of already-projected parts into weaponized and
 * non-weaponized buckets in one pass, so a caller can route the weaponized
 * bucket into the weapons collection instead of dropping it. This is the
 * direct fix for weaponized accessories vanishing from both the equipment
 * and weapons regions: the old code filtered weaponized parts OUT of the
 * equipment list and then tried to read them back FROM that same
 * already-filtered list when building the weapons region.
 */
export function partitionWeaponizedParts(parts = []) {
  const weaponized = [];
  const nonWeaponized = [];
  for (const part of parts) {
    if (isWeaponizedProjectedPart(part)) weaponized.push(part);
    else nonWeaponized.push(part);
  }
  return { weaponized, nonWeaponized };
}

/**
 * Loose type-hint match used to recognize an actor-owned Item as belonging
 * to a given droid system category (e.g. 'locomotion', 'appendage') when
 * the item does not carry a structured droid-part category/slot. Mirrors
 * the existing appendage-matching convention already used by
 * DroidSystemsResolver._resolveAppendages() so locomotion Items are treated
 * the same way appendage Items already are, rather than inventing a
 * stricter rule for one slot and not the other.
 */
export function matchesDroidPartTypeHint(item, keyword) {
  const hint = slug(
    item?.system?.droidSystemType ??
    item?.system?.droidPartType ??
    item?.flags?.swse?.droidPartType ??
    item?.name
  );
  return hint.includes(slug(keyword));
}
