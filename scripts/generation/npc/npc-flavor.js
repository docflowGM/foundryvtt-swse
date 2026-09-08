/**
 * PHASE 8D-3B production — NPC flavor-note selection/reroll engine.
 *
 * ONE shared selection/weighting/conflict/reroll engine over TWO
 * structurally separate content pools (`data/npc-flavor-qualities-organic.js`/
 * `data/npc-flavor-qualities-droid.js`) -- per the user's explicit
 * architecture requirement, the organic/droid boundary is enforced
 * HERE, structurally, by `CATALOG_BY_KIND`'s lookup, never by trusting
 * every catalog entry to correctly self-exclude via a tag. A `'living'`
 * NPC can never roll a droid-only quality and vice versa -- there is no
 * code path in this module that reads both pools for one selection.
 *
 * `flavorNotes` are NARRATIVE FLAVOR ONLY (restated from both catalog
 * files' own headers): a generated quality never implies a mechanical
 * modifier, condition, or Item, and this module performs no mechanical
 * resolution of any kind.
 *
 * Stored shape on an `npc-concept.js` draft: `flavorNotes: [{
 * qualityId, text }]` -- `qualityId` is the persisted IDENTITY (matches
 * this whole generation ecosystem's existing "structured facts first,
 * id-backed, never keyed by display text" discipline; every OTHER
 * generator in this codebase stores its picked TEXT directly rather
 * than round-tripping through a catalog id, so this module follows
 * that same convention for `text` while ALSO keeping `qualityId` for
 * identity/reroll-targeting/dedup, per the phase spec's explicit
 * request). `rerollNpcFlavorNote()` re-resolves a note's full catalog
 * entry (tags/conflictTags) by `qualityId` lookup at reroll time rather
 * than persisting those fields on the draft itself -- avoids
 * duplicating catalog data onto every generated NPC.
 */

import { ORGANIC_NPC_FLAVOR_QUALITIES } from '../data/npc-flavor-qualities-organic.js';
import { DROID_NPC_FLAVOR_QUALITIES } from '../data/npc-flavor-qualities-droid.js';
import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';
import { updateNpcConceptDraft } from '../npc-concept.js';

/** Structural pool boundary -- the ONE place `kind` maps to a content authority. */
const CATALOG_BY_KIND = Object.freeze({
  living: ORGANIC_NPC_FLAVOR_QUALITIES,
  droid: DROID_NPC_FLAVOR_QUALITIES
});

function poolForKind(kind) {
  return CATALOG_BY_KIND[kind] || [];
}

function catalogEntryById(kind, qualityId) {
  return poolForKind(kind).find((entry) => entry.id === qualityId) || null;
}

/** `entry.tags` merged with its OPTIONAL `roleTags`/`contextTags` -- one flattened tag list for `weightedPickWithPreference()`'s existing preference matcher, without modifying that shared primitive or duplicating its logic here. */
function effectiveTags(entry) {
  return [...(entry.tags ?? []), ...(entry.roleTags ?? []), ...(entry.contextTags ?? [])];
}

/** True if `candidate` conflicts with any quality already in `picked` -- checked in BOTH directions (candidate's own `conflictTags` against an already-picked quality's `tags`, and vice versa), matching the phase spec's "never-eye-contact + intense-eye-contact" example. Deliberately simple tag-set overlap, never a full inference engine. */
function conflictsWithPicked(candidate, picked) {
  return picked.some((other) => {
    const candidateConflicts = candidate.conflictTags ?? [];
    const otherConflicts = other.conflictTags ?? [];
    const otherTags = other.tags ?? [];
    const candidateTags = candidate.tags ?? [];
    return candidateConflicts.some((t) => otherTags.includes(t)) || otherConflicts.some((t) => candidateTags.includes(t));
  });
}

/** `requiresTags`/`excludedTags` gate (organic-only, currently -- e.g. an entry that assumes hands is excluded from a caller that declares it has none). Both default to empty (universally eligible) when a catalog entry doesn't set them. `traitTags` is the caller's OPTIONAL declared set of physical/anatomical tags (e.g. `['organic-hands', 'hair']`); omitted entirely, every requiresTags-gated entry stays eligible (never over-restrictive by default). */
function passesAnatomyGate(entry, traitTags) {
  if (!traitTags) return true;
  const has = new Set(traitTags);
  const requires = entry.requiresTags ?? [];
  const excludes = entry.excludedTags ?? [];
  if (requires.length && !requires.every((t) => has.has(t))) return false;
  if (excludes.length && excludes.some((t) => has.has(t))) return false;
  return true;
}

/** Default flavor-note COUNT distribution (phase spec): 0/10%, 1/45%, 2/35%, 3/10%. Deliberately small -- memorability, not clutter. */
const FLAVOR_NOTE_COUNT_WEIGHTS = Object.freeze([
  { value: 0, weight: 10 },
  { value: 1, weight: 45 },
  { value: 2, weight: 35 },
  { value: 3, weight: 10 }
]);

/** Roll a flavor-note count (0-3) per the default distribution above. */
export function rollFlavorNoteCount({ rng } = {}) {
  return weightedPick(FLAVOR_NOTE_COUNT_WEIGHTS, { rng, weightOf: (e) => e.weight })?.value ?? 1;
}

/**
 * Select up to `count` distinct, non-conflicting flavor-quality catalog
 * ENTRIES (full objects, not yet reduced to `{qualityId, text}`) for
 * one NPC. `kind` (`'living'`/`'droid'`) selects the source pool --
 * structural, not a filter. `preferTags`/`roleTags`/`contextTags` are
 * all softly combined (via `effectiveTags()`) into one preference roll;
 * `traitTags` (optional) gates `requiresTags`/`excludedTags`. Returns
 * FEWER than `count` entries if the pool (after conflict/anatomy
 * filtering) runs out -- never throws, never pads with a conflicting or
 * duplicate pick.
 */
export function selectNpcFlavorQualities({ kind, preferTags = [], roleTags = [], contextTags = [], traitTags, count, rng } = {}) {
  const pool = poolForKind(kind).filter((entry) => passesAnatomyGate(entry, traitTags));
  const resolvedCount = Number.isFinite(count) ? Math.max(0, count) : rollFlavorNoteCount({ rng });
  const combinedPreferTags = [...preferTags, ...roleTags, ...contextTags];
  const picked = [];
  let remaining = pool.map((entry) => ({ ...entry, tags: effectiveTags(entry) }));
  const byId = new Map(pool.map((entry) => [entry.id, entry]));
  for (let i = 0; i < resolvedCount && remaining.length; i++) {
    const eligible = remaining.filter((candidate) => !conflictsWithPicked(byId.get(candidate.id), picked));
    if (!eligible.length) break;
    const chosen = weightedPickWithPreference(eligible, { rng, preferTags: combinedPreferTags });
    if (!chosen) break;
    const original = byId.get(chosen.id);
    picked.push(original);
    remaining = remaining.filter((entry) => entry.id !== chosen.id);
  }
  return picked;
}

/** `{ qualityId, text }` view of a list of full catalog entries -- the exact shape persisted on `npc-concept.js`'s `flavorNotes`. */
export function flavorQualitiesToNotes(qualities) {
  return qualities.map((entry) => ({ qualityId: entry.id, text: entry.text }));
}

/** Generate a full flavor-notes array (the composition most callers want): select + convert to the persisted `{qualityId, text}` shape in one call. */
export function generateNpcFlavorNotes({ kind, preferTags = [], roleTags = [], contextTags = [], traitTags, count, rng } = {}) {
  return flavorQualitiesToNotes(selectNpcFlavorQualities({ kind, preferTags, roleTags, contextTags, traitTags, count, rng }));
}

/**
 * Reroll the ENTIRE flavor-notes set on an existing NPC concept draft,
 * preserving every other field untouched (name/species/Faction/role/
 * motivation/agenda/secret/Location all stay exactly as they were --
 * this touches ONLY `flavorNotes`).
 */
export function rerollNpcFlavorNotes(draft, { rng, preferTags = [], roleTags = [], contextTags = [], traitTags, count } = {}) {
  if (!draft) return draft;
  const flavorNotes = generateNpcFlavorNotes({ kind: draft.kind, preferTags, roleTags, contextTags, traitTags, count, rng });
  return updateNpcConceptDraft(draft, { flavorNotes });
}

/**
 * Reroll exactly ONE flavor note, by its `qualityId` (preferred) or its
 * array index, preserving every other note AND every other draft field
 * untouched. The replacement is drawn from the SAME kind-locked pool,
 * excluding every `qualityId` the draft already carries (never a
 * duplicate) and respecting conflict tags against the notes NOT being
 * rerolled (a targeted reroll must not silently reintroduce a conflict
 * with a note the GM chose to keep). A no-op (returns the draft
 * unchanged) if the target note isn't found, or if no eligible
 * replacement exists (the original note is kept rather than removed).
 */
export function rerollNpcFlavorNote(draft, qualityIdOrIndex, { rng, preferTags = [], roleTags = [], contextTags = [], traitTags } = {}) {
  if (!draft || !Array.isArray(draft.flavorNotes)) return draft;
  const notes = draft.flavorNotes;
  const index = typeof qualityIdOrIndex === 'number' ? qualityIdOrIndex : notes.findIndex((n) => n.qualityId === qualityIdOrIndex);
  if (index < 0 || index >= notes.length) return draft;

  const keptNotes = notes.filter((_, i) => i !== index);
  const keptEntries = keptNotes.map((n) => catalogEntryById(draft.kind, n.qualityId)).filter(Boolean);
  const excludedIds = new Set(notes.map((n) => n.qualityId));

  const pool = poolForKind(draft.kind)
    .filter((entry) => !excludedIds.has(entry.id))
    .filter((entry) => passesAnatomyGate(entry, traitTags))
    .filter((entry) => !conflictsWithPicked(entry, keptEntries))
    .map((entry) => ({ ...entry, tags: effectiveTags(entry) }));

  const combinedPreferTags = [...preferTags, ...roleTags, ...contextTags];
  const chosen = weightedPickWithPreference(pool, { rng, preferTags: combinedPreferTags });
  if (!chosen) return draft;

  const replacement = { qualityId: chosen.id, text: chosen.text };
  const flavorNotes = notes.map((n, i) => (i === index ? replacement : n));
  return updateNpcConceptDraft(draft, { flavorNotes });
}
