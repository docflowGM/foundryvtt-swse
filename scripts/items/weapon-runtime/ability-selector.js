// Phase 5D-G -- canonical ability selectors.
// "Weapons declare what they are. Abilities declare what they apply to."
//   canonical feat identity (FeatRegistry/canonicalFeat identityKey)
//   + structured stored feat choice (group token or exact exotic identity)
//   + selected canonical weapon form (group / exotic identity)  ->  applicability
// Names are display only for canonical content: a renamed canonical feat still applies, a same-named non-canonical item does not
// impersonate one. Legacy/homebrew compatibility (name + choice text) remains ONLY for weapons/feats that carry no canonical identity.
import { canonicalFeatSlug } from '../../utils/canonical-ability-identity.js';
import { normalizeToken } from './attack-shape.js';

/**
 * Stable ability identity slug, independent of the display name:
 *   feats    -> canonical identityKey (`feat::<book>::p<page>::<slug>`)
 *   talents  -> the registry id the pack stamps (`flags.swse.id` = `swse.talent.<slug_with_underscores>`)
 * null when the item carries neither (a legacy/homebrew item).
 */
export { canonicalFeatSlug };

const legacyBase = (item) => normalizeToken(String(item?.name || item?.system?.slug || item?.slug || '').replace(/\([^)]*\)/g, '').trim());

/** Is this owned ability `slug`? Canonical identity decides when present; the (base) name is the legacy fallback only. */
export function featIs(item, slug) {
  const canonical = canonicalFeatSlug(item);
  if (canonical !== null) return canonical === normalizeToken(slug);
  return legacyBase(item) === normalizeToken(slug);
}

/** The slug an owned ability resolves to: canonical identity, else its legacy base name. */
export const featKeyOf = (item) => canonicalFeatSlug(item) ?? legacyBase(item);

/** Identity keys of every ability an actor owns (canonical slug, else legacy base + full name), for hasFeat-style conditions. */
export function abilityKeysOfActor(actor) {
  const out = new Set();
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (item?.type !== 'feat' && item?.type !== 'talent') continue;
      const c = canonicalFeatSlug(item);
      if (c !== null) out.add(c);
      else { out.add(legacyBase(item)); out.add(normalizeToken(String(item?.name ?? ''))); }
    }
  } catch { /* detached actor */ }
  out.delete('');
  return [...out];
}
