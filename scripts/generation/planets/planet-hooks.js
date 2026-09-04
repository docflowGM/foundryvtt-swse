/**
 * PHASE 8D-3A production — planet draft SUGGEST-tier narrative hooks.
 *
 * Composes four small, purely-narrative additions onto a procedural
 * planet draft, all SUGGEST-tier or GENERATE-tier facts only -- NONE
 * of this creates an actual Faction, Job, Intel record, canonical
 * Location fact, or Journal entry. This restates the hard rule every
 * Phase 8D-2/8D-3A generator already follows: "Generate narrative
 * facts. Suggest canonical mechanics. Resolve through existing
 * authorities."
 *
 *  - `suggestedFactionArchetypeTags` / `suggestedJobArchetypeTags`:
 *    1-3 archetype ids each, softly weighted toward the planet's own
 *    tag context (world class + economy + government + hazards/
 *    traits, i.e. the SAME merged `tags` the draft already carries).
 *    Reuses `organization-metadata.js`'s existing 20 Faction
 *    archetypes and `jobs/job-archetype-metadata.js`'s existing 14
 *    Job mission types verbatim (`data/planet-hook-archetypes.js`) --
 *    never a third archetype vocabulary.
 *  - `suggestedOppositionTags`: free-text tags describing the kind of
 *    opposition this world's own character implies (a lawless world
 *    suggests different opposition than a stable one) -- a plain
 *    filter of the draft's OWN tags against an "opposition-relevant"
 *    subset, matching `opposition-request.js`'s own explicit
 *    "free-text, deliberately not a closed enum" design, never a new
 *    catalog to keep in sync with a Catalog resolver that doesn't
 *    exist yet.
 *  - `currentEvents`: 0-2 ambient events via the EXISTING
 *    `location-event.js` (Phase 8D-2 groundwork, not previously wired
 *    into a planet draft) -- reused verbatim, not reimplemented.
 *  - `secret`: one optional GM-only world-level secret
 *    (`data/planet-secrets.js`) -- distinct from `npc-secrets.js`,
 *    which is about a PERSON hiding something; this is about the
 *    WORLD itself. Never surfaced anywhere but a GM-facing field.
 */

import { FACTION_ARCHETYPE_TAGS, JOB_ARCHETYPE_TAGS } from '../data/planet-hook-archetypes.js';
import { PLANET_SECRETS } from '../data/planet-secrets.js';
import { generateLocationEvent } from '../location-event.js';
import { weightedPickUniqueN, weightedPickWithPreference } from '../lib/weighted-random.js';

/**
 * The subset of the free-text tag vocabulary this codebase already
 * uses (`ORGANIZATION_FAMILY` values, `planet-stability.js`'s
 * strained-condition values, and a handful of economy/hazard
 * descriptors) that plausibly implies "there is opposition worth
 * naming here" -- an unstable, criminal, or militarized world
 * suggests real opposition; a `prosperous`/`recovering` agricultural
 * world usually doesn't.
 */
const OPPOSITION_RELEVANT_TAGS = new Set([
  'crime-syndicate', 'military-paramilitary', 'enforcement', 'government-bureaucracy',
  'lawless', 'unstable', 'contested', 'fractured', 'civil-war', 'civil unrest', 'popular-unrest',
  'rebellious', 'occupied', 'under-blockade', 'corrupt', 'succession-crisis',
  'black-market', 'spice', 'criminal', 'frontier', 'hazard', 'aggressive', 'wildlife'
]);

/** 0-2 current events, weighted toward fewer (a busy world with two ongoing events at once is the exception, not the rule). */
function pickCurrentEventCount({ rng }) {
  const roll = (rng ?? Math.random)();
  if (roll < 0.45) return 0;
  if (roll < 0.85) return 1;
  return 2;
}

/** Pick 1-3 (or an explicit `count`) suggested Faction archetype tags, softly biased by `preferTags`. */
export function generatePlanetSuggestedFactionArchetypeTags({ rng, preferTags = [], count } = {}) {
  const resolvedCount = Number.isFinite(count) ? count : 1 + Math.floor((rng ?? Math.random)() * 3);
  return weightedPickUniqueN(FACTION_ARCHETYPE_TAGS, resolvedCount, { rng, preferTags }).map((e) => e.value);
}

/** Pick 1-3 (or an explicit `count`) suggested Job archetype tags, softly biased by `preferTags`. */
export function generatePlanetSuggestedJobArchetypeTags({ rng, preferTags = [], count } = {}) {
  const resolvedCount = Number.isFinite(count) ? count : 1 + Math.floor((rng ?? Math.random)() * 3);
  return weightedPickUniqueN(JOB_ARCHETYPE_TAGS, resolvedCount, { rng, preferTags }).map((e) => e.value);
}

/** Derive suggested opposition tags as a plain filter of `tags` (a planet's own merged tag set) -- see `OPPOSITION_RELEVANT_TAGS` above. */
export function deriveSuggestedOppositionTags(tags = []) {
  return tags.filter((t) => OPPOSITION_RELEVANT_TAGS.has(t));
}

/** Roll 0-2 (or an explicit `count`) current events via `location-event.js`, softly biased by `preferTags`. */
export function generatePlanetCurrentEvents({ rng, preferTags = [], count } = {}) {
  const resolvedCount = Number.isFinite(count) ? count : pickCurrentEventCount({ rng });
  const events = [];
  for (let i = 0; i < resolvedCount; i++) events.push(generateLocationEvent({ rng, preferTags }));
  return events;
}

/** Pick one GM-only planet secret, softly biased by `preferTags`. */
export function pickPlanetSecret({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_SECRETS, { rng, preferTags });
}

/**
 * Compose the full hook bundle: `{ suggestedFactionArchetypeTags,
 * suggestedJobArchetypeTags, suggestedOppositionTags, currentEvents,
 * secret }`. `tags` should be the planet draft's own merged `tags`
 * field (world class + economy + government + hazards/traits) -- the
 * same context every other soft-preference pick on the draft already
 * uses.
 */
export function generatePlanetHooks({ rng, tags = [] } = {}) {
  return {
    suggestedFactionArchetypeTags: generatePlanetSuggestedFactionArchetypeTags({ rng, preferTags: tags }),
    suggestedJobArchetypeTags: generatePlanetSuggestedJobArchetypeTags({ rng, preferTags: tags }),
    suggestedOppositionTags: deriveSuggestedOppositionTags(tags),
    currentEvents: generatePlanetCurrentEvents({ rng, preferTags: tags }),
    secret: pickPlanetSecret({ rng, preferTags: tags })?.value ?? ''
  };
}
