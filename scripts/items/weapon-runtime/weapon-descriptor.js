// Phase 5D-H -- canonical weapon DESCRIPTOR (pure).
// "Weapons declare what they are. Abilities declare what they apply to." This module states what the SELECTED canonical form is, as a
// closed set of normalized tokens built ONLY from structured canonical fields: exact identity, certified families, weapon group,
// proficiency group, branch, the selected profile's quality flags, its area kind and fire modes, native stun capability and the
// structured `weaponFinesseCountsAsLight` operation fact. It never reads a weapon name, Item text or a description. An ability rule's
// weapon-scope tokens (weaponGroups / requiresWeaponGroups / requiresWeaponText ...) are then joined to it by token EQUALITY
// (singular/plural normalized) -- never substring search -- so "light" cannot match "lightsaber" and "blaster pistol" cannot match
// "heavy blaster pistol".
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
export const tokenOf = (v) => String(v ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const stripPrefix = (s, p) => (String(s ?? '').startsWith(p) ? String(s).slice(p.length) : String(s ?? ''));
/** Identity key -> the slug an ability scope token names ('weapon-heavy-blaster-rifle' -> 'heavy-blaster-rifle'). */
export const identitySlug = (key) => tokenOf(stripPrefix(stripPrefix(stripPrefix(String(key ?? ''), 'weapon-'), 'unmapped::'), 'lightsaber-chassis-'));
const slugCache = new WeakMap();
/** All canonical identity slugs of a registry (memoized per registry). */
export function identitySlugSet(registry) {
  if (!registry) return new Set();
  if (!slugCache.has(registry)) slugCache.set(registry, new Set(registry.getAll().map((r) => identitySlug(r.identityKey))));
  return slugCache.get(registry);
}
const vocabCache = new WeakMap();
/** Group / proficiency / subcategory vocabulary of a registry: tokens that name a KIND of weapon rather than one identity. */
export function groupVocabSet(registry) {
  if (!registry) return new Set();
  if (!vocabCache.has(registry)) {
    const v = new Set();
    for (const r of registry.getAll()) {
      if (r.selectors?.group) v.add(tokenOf(stripPrefix(r.selectors.group, 'weapon-group:')));
      for (const p of asArray(r.selectors?.proficiency)) v.add(tokenOf(stripPrefix(p, 'weapon-proficiency:')));
      if (r.schemaFamily?.subcategory) v.add(tokenOf(r.schemaFamily.subcategory));
      if (r.schemaFamily?.proficiency) v.add(tokenOf(r.schemaFamily.proficiency));
    }
    vocabCache.set(registry, v);
  }
  return vocabCache.get(registry);
}
const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
const sizeIndex = (s) => SIZE_ORDER.indexOf(String(s ?? '').trim().toLowerCase());
const QUALITY_TOKEN = Object.freeze({ thrown: 'thrown', areaEffect: 'area-effect', accurate: 'accurate', inaccurate: 'inaccurate', reach: 'reach', arc: 'arc', ignoresDR: 'ignores-dr', doubleWeapon: 'double-weapon', autofireOnly: 'autofire-only' });

/** Build the descriptor of the selected form. `area` = resolveAreaShape() result, `fireModes` = shape.fireModes. */
export function buildWeaponDescriptor(resolved, profileDef, { area = null, fireModes = null } = {}) {
  const t = new Set();
  const add = (v) => { const k = tokenOf(v); if (k) t.add(k); };
  const key = String(resolved?.identity?.identityKey ?? '');
  const exact = identitySlug(key);
  const sel = resolved?.selectors ?? {};
  const families = new Set(asArray(sel.families).map((f) => tokenOf(stripPrefix(f, 'weapon-family:'))).filter(Boolean));
  if (sel.group) add(stripPrefix(sel.group, 'weapon-group:'));
  for (const p of asArray(sel.proficiency)) add(stripPrefix(p, 'weapon-proficiency:'));
  const fam = profileDef?.schemaFamily ?? resolved?.schemaFamily ?? {};
  const branch = fam.branch ?? null;
  if (branch) add(branch);
  if (fam.subcategory) add(fam.subcategory);
  if (fam.proficiency) add(fam.proficiency);
  // composite group+branch vocabulary used by ability scopes ("simple melee", simpleWeaponsMelee ...)
  for (const g of [...t].filter((x) => ['simple', 'simple-weapons', 'advanced-melee', 'exotic'].includes(x))) if (branch) { add(`${g}-${branch}`); add(`${g}-weapons-${branch}`); add(`${g}-${branch}-weapons`); }
  for (const [k, v] of Object.entries(QUALITY_TOKEN)) if (profileDef?.qualities?.[k] === true) add(v);
  if (area?.isArea) { add('area'); add(area.kind); if (area.geometry?.shape) add(area.geometry.shape); }
  if (fireModes?.autofire) add('autofire');
  if (profileDef?.stun?.capability === 'native-stun') add('stun');
  if (resolved?.operation?.weaponFinesseCountsAsLight === true) add('treated-as-light-for-weapon-finesse');
  return Object.freeze({
    exact, families: Object.freeze([...families].sort()),
    tokens: Object.freeze([...t].sort()), melee: branch === 'melee',
    sizeIndex: sizeIndex(resolved?.canonicalStats?.size ?? profileDef?.size ?? null),
  });
}

const variants = (token) => {
  const out = new Set([token]);
  if (token.endsWith('s')) out.add(token.slice(0, -1)); else out.add(`${token}s`);
  for (const suf of ['-weapons', '-weapon']) if (token.endsWith(suf)) { const b = token.slice(0, -suf.length); out.add(b); out.add(`${b}s`); }
  return out;
};

/**
 * Does the descriptor satisfy ANY of the rule's weapon-scope tokens?
 * "light" is relative: a melee weapon smaller than its wielder (SWSE light weapon), or a form that states it counts as light.
 * @param {{tokens:string[], melee:boolean, sizeIndex:number}} d
 * @param {{wielderSize?:string}} [ctx]
 */
export function descriptorMatchesAny(d, values, { wielderSize = null, forAbility = null, identitySlugs = null, groupVocab = null } = {}) {
  if (!d) return false;
  const have = new Set(d.tokens);
  const fams = new Set(d.families);
  for (const raw of asArray(values)) {
    const tok = tokenOf(raw);
    if (!tok) continue;
    // 'light' / 'light melee (weapons)': relative to the wielder; forms that declare it count as light for Weapon Finesse
    if (tok === 'light' || tok === 'light-melee' || tok === 'light-melee-weapon' || tok === 'light-melee-weapons') {
      const w = sizeIndex(wielderSize);
      if (d.melee && d.sizeIndex >= 0 && w >= 0 && d.sizeIndex < w) return true;
      if (forAbility === 'weapon-finesse' && have.has('treated-as-light-for-weapon-finesse')) return true;
      continue;
    }
    // a token that NAMES a canonical weapon is an exact-identity scope ("Blaster Pistol" is not every blaster-pistol-derived weapon);
    // any other token is group/kind vocabulary and may match certified families
    const isKind = !!groupVocab && [...variants(tok)].some((v) => groupVocab.has(v));
    const namesIdentity = !isKind && !!identitySlugs && [...variants(tok)].some((v) => identitySlugs.has(v));
    if (namesIdentity) { if ([...variants(tok)].some((v) => v === d.exact)) return true; continue; }
    for (const v of variants(tok)) if (have.has(v) || fams.has(v) || v === d.exact) return true;
  }
  return false;
}
