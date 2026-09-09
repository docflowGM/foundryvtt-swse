/**
 * PHASE 8D-3B production — Faction archetype resolver.
 *
 * "Every part of the buffalo": `planets/planet-hooks.js` (Phase 8D-3A)
 * already built the exact table this needs --
 * `data/planet-hook-archetypes.js`'s `FACTION_ARCHETYPE_TAGS` is
 * `organization-metadata.js`'s 20 `FACTION_ARCHETYPE_FAMILY` keys, each
 * carrying free-text context tags, self-validated at load time to stay
 * in lockstep with that authority. Phase 8D-3A used it in the
 * Location -> tags direction (`suggestedFactionArchetypeTags`); this
 * module is the OTHER direction of the exact same table -- Location/
 * preset tags -> a single archetype pick for a Faction actually being
 * generated ON that world. No second archetype-tag catalog is created
 * here.
 */

import { FACTION_ARCHETYPE_TAGS } from '../data/planet-hook-archetypes.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/**
 * Pick one Faction archetype id, softly biased by `preferTags` (a
 * Location's own merged tag set -- world class + economy + government
 * + hazards/traits, per `planet-draft.js`'s `tags` field -- and/or a
 * `data/faction-presets.js` preset's `preferTags`, freely combinable by
 * a caller into one array). An explicit `archetype` short-circuits the
 * roll entirely (an explicit choice always wins over a weighted guess).
 * Falls back to a uniform random archetype if `preferTags` is empty --
 * never defaults to the same archetype every time.
 */
export function pickFactionArchetype({ rng, preferTags = [], archetype = '' } = {}) {
  const values = FACTION_ARCHETYPE_TAGS.map((e) => e.value);
  if (values.includes(archetype)) return archetype;
  return weightedPickWithPreference(FACTION_ARCHETYPE_TAGS, { rng, preferTags })?.value ?? values[0];
}
