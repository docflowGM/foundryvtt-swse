/**
 * Canonical ability identity (pure). One authority for "which ability is this owned item":
 *   feats   -> canonical identityKey (`feat::<book>::p<page>::<slug>`)
 *   talents -> the registry id the pack stamps (`flags.swse.id` = `swse.talent.<slug_with_underscores>`)
 * Display names are NOT identity for canonical content; the (base) name is a fallback ONLY for an item
 * that carries no canonical identity (legacy/homebrew).
 */
const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function canonicalFeatSlug(item) {
  const key = item?.flags?.swse?.canonicalFeat?.identityKey ?? item?.system?.canonicalFeat?.identityKey ?? null;
  if (typeof key === 'string' && key.startsWith('feat::')) return key.split('::').pop() || null;
  const id = item?.flags?.swse?.id;
  const m = typeof id === 'string' ? /^swse\.(?:feat|talent)\.(.+)$/.exec(id) : null;
  return m ? m[1].replace(/_/g, '-') : null;
}

/** Owned, enabled instance of the ability `slug` (identity first, base name only for non-canonical items). Returns the Item or null. */
export function ownedAbilityInstance(actor, { type, slug }) {
  const wanted = norm(slug);
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== type || item?.system?.disabled === true) continue;
    const canonical = canonicalFeatSlug(item);
    const base = norm(String(item?.name ?? '').replace(/\([^)]*\)/g, ''));
    if (canonical !== null ? canonical === wanted : base === wanted) return item;
  }
  return null;
}
