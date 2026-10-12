// Phase 5D-I-D-E -- canonical TALENT identity for the weapon <-> ability relations.
// The weapon registry names the talents a weapon interacts with by display string ("Siang Lance Mastery"). The talent authority is the
// canonical corpus (data/canonical/talents.json, canonicalIdentity = "<book>|<tree>|<name>"). This module is the one join between the two:
//   reference side -> canonical identity (WEAPON_TALENT_IDENTITIES; validated against the corpus by tests, one row per referenced talent)
//   owned-item side -> canonical identity: a stamp (flags.swse.canonicalTalent.identityKey) when the talent pipeline has written one,
//                      otherwise the item's exact name ONLY where that name is unique in the corpus (the table rows are checked for that).
// A weapon relation therefore matches by identity, never by comparing weapon-registry text with an item title.
import { canonicalFeatSlug } from './ability-selector.js';

const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const fold = (v) => clean(v).toLowerCase();

/** display string used by weapon-registry abilityInteractions / abilityOverrides -> canonical talent identity */
export const WEAPON_TALENT_IDENTITIES = Object.freeze({
  'Siang Lance Mastery': 'Rebellion Era Campaign Guide|Kilian Ranger|Siang Lance Mastery',
  'Discblade Arc': 'Jedi Academy Training Manual|Zeison Sha Warrior|Discblade Arc',
  'Distant Discblade Throw': 'Jedi Academy Training Manual|Zeison Sha Warrior|Distant Discblade Throw',
  'Recall Discblade': 'Jedi Academy Training Manual|Zeison Sha Warrior|Recall Discblade',
});

const BY_FOLDED_NAME = new Map(Object.entries(WEAPON_TALENT_IDENTITIES).map(([name, id]) => [fold(name), id]));

/** Canonical identity a weapon-registry ability reference names, or null when the reference is not a known talent (feat / legacy string). */
export function talentIdentityOfReference(reference) {
  return BY_FOLDED_NAME.get(fold(reference)) ?? null;
}

/** Canonical identity of an owned talent item, or null (not a talent / not one the weapon corpus references and not stamped). */
export function canonicalTalentIdentityOf(item) {
  if (item?.type !== 'talent') return null;
  const stamp = item?.flags?.swse?.canonicalTalent?.identityKey ?? item?.system?.canonicalTalent?.identityKey ?? null;
  if (typeof stamp === 'string' && stamp.includes('|')) return stamp;
  // a talent carrying another stable id (flags.swse.id) is that talent; only a bare, unstamped item is joined by its (corpus-unique) name
  if (canonicalFeatSlug(item) !== null) {
    const slug = canonicalFeatSlug(item);
    for (const [name, id] of BY_FOLDED_NAME) if (fold(name).replace(/[^a-z0-9]+/g, '-') === slug) return id;
    return null;
  }
  return BY_FOLDED_NAME.get(fold(item?.name)) ?? null;
}

/** Set of canonical talent identities an actor owns (only talents the weapon corpus references are resolvable). */
export function ownedTalentIdentities(actor) {
  const out = new Set();
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      const id = canonicalTalentIdentityOf(item);
      if (id) out.add(id);
    }
  } catch (_e) { /* partial snapshot */ }
  return out;
}
