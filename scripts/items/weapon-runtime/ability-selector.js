// Phase 5D-G -- canonical ability selectors.
// "Weapons declare what they are. Abilities declare what they apply to."
//   canonical feat identity (FeatRegistry/canonicalFeat identityKey)
//   + structured stored feat choice (group token or exact exotic identity)
//   + selected canonical weapon form (group / exotic identity)  ->  applicability
// Names are display only for canonical content: a renamed canonical feat still applies, a same-named non-canonical item does not
// impersonate one. Legacy/homebrew compatibility (name + choice text) remains ONLY for weapons/feats that carry no canonical identity.
import { shapeOfWeapon } from './attack-consumer.js';
import { featChoiceSelectors, featChoiceMatchesShape, canonicalSelectionFromContext, normalizeToken } from './attack-shape.js';

/**
 * Stable ability identity slug, independent of the display name:
 *   feats    -> canonical identityKey (`feat::<book>::p<page>::<slug>`)
 *   talents  -> the registry id the pack stamps (`flags.swse.id` = `swse.talent.<slug_with_underscores>`)
 * null when the item carries neither (a legacy/homebrew item).
 */
export function canonicalFeatSlug(item) {
  const key = item?.flags?.swse?.canonicalFeat?.identityKey ?? item?.system?.canonicalFeat?.identityKey ?? null;
  if (typeof key === 'string' && key.startsWith('feat::')) return key.split('::').pop() || null;
  const id = item?.flags?.swse?.id;
  const m = typeof id === 'string' ? /^swse\.(?:feat|talent)\.(.+)$/.exec(id) : null;
  return m ? m[1].replace(/_/g, '-') : null;
}

const legacyBase = (item) => normalizeToken(String(item?.name || item?.system?.slug || item?.slug || '').replace(/\([^)]*\)/g, '').trim());

/** Is this owned ability `slug`? Canonical identity decides when present; the (base) name is the legacy fallback only. */
export function featIs(item, slug) {
  const canonical = canonicalFeatSlug(item);
  if (canonical !== null) return canonical === normalizeToken(slug);
  return legacyBase(item) === normalizeToken(slug);
}

/** The slug an owned ability resolves to: canonical identity, else its legacy base name. */
export const featKeyOf = (item) => canonicalFeatSlug(item) ?? legacyBase(item);

/**
 * Does the ability's stored choice select the weapon form being used?
 * @returns {boolean|null} true/false for a canonical weapon (structured join); null when the weapon is legacy/custom (caller keeps its legacy match)
 */
export function abilityChoiceMatchesWeapon(item, weapon, context = {}) {
  if (!weapon) return null;
  const shape = shapeOfWeapon(weapon, canonicalSelectionFromContext(context));
  if (shape.source === 'legacy') return null;
  if (shape.source === 'error') return false;
  const actor = item?.actor ?? item?.parent ?? context.actor ?? null;
  const slug = canonicalFeatSlug(item) ?? legacyBase(item);
  return featChoiceMatchesShape(featChoiceSelectors(item, { actor, choiceKind: slug ? slug.replace(/-/g, '_') : null }), shape);
}
