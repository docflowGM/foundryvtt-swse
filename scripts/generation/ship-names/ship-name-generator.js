/**
 * PHASE 8D-1 — shared random ship-name generator.
 *
 * Confirmed by reconnaissance before writing this file: this repo has NO
 * existing random ship-name generator under any obvious name. This is
 * therefore new, small, reusable utility — not Job-specific — meant to
 * be shared by Jobs, generated NPC-owned ships, pirate vessels, Faction
 * flagships, Holonet/Intel references, and future starship generation,
 * alongside the existing `getRandomName()`/`getRandomDroidName()`
 * (`scripts/apps/chargen/chargen-shared.js`).
 *
 * Contract: `[Adjective] [Noun]` composed from two small weighted/tagged
 * pools (`ship-name-adjectives.js`, `ship-name-nouns.js`) rather than a
 * combinatorial list of pre-written full names. Deliberately plain JS
 * module data (not a fetched JSON file, unlike `random-names.json`) so
 * this generator is importable and testable in a bare Node process with
 * no Foundry shim required — the spec explicitly asks for generation
 * logic to be "testable without needing a running Foundry world wherever
 * practical."
 *
 * A ship NAME is independent of a ship MODEL. Rerolling the name must
 * never imply rerolling the model, and vice versa — this module only
 * ever returns/consumes name components, never a price or a stat block.
 */

import { SHIP_NAME_ADJECTIVES } from '../data/ship-name-adjectives.js';
import { SHIP_NAME_NOUNS } from '../data/ship-name-nouns.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/**
 * Pick a random adjective entry (the full `{value, weight, tags}` record,
 * not just the string) optionally preferring the given tags.
 */
export function pickShipNameAdjective({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SHIP_NAME_ADJECTIVES, { rng, preferTags });
}

/** Pick a random noun entry. See `pickShipNameAdjective()`. */
export function pickShipNameNoun({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(SHIP_NAME_NOUNS, { rng, preferTags });
}

/**
 * Generate a full ship-name draft: `{ name, adjective, noun }` where
 * `adjective`/`noun` are the full pool entries (so a caller can later
 * reroll just one and re-join) and `name` is `"${adjective.value}
 * ${noun.value}"`.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng] - injectable RNG (see
 *   `lib/weighted-random.js`); defaults to `Math.random()`.
 * @param {string[]} [options.preferTags] - soft tone preference shared by
 *   both the adjective and noun roll (e.g. `['criminal','smuggler']` for
 *   a pirate vessel). Never a hard filter.
 */
export function getRandomShipName({ rng, preferTags = [] } = {}) {
  const adjective = pickShipNameAdjective({ rng, preferTags });
  const noun = pickShipNameNoun({ rng, preferTags });
  return {
    name: `${adjective?.value ?? 'Silent'} ${noun?.value ?? 'Star'}`,
    adjective,
    noun
  };
}

/**
 * Reroll ONLY the adjective of an existing ship-name draft, preserving
 * the noun exactly (per-field reroll readiness, §14 of the phase spec).
 */
export function rerollShipNameAdjective(draft, { rng, preferTags = [] } = {}) {
  const adjective = pickShipNameAdjective({ rng, preferTags });
  const noun = draft?.noun ?? pickShipNameNoun({ rng, preferTags });
  return { name: `${adjective?.value ?? 'Silent'} ${noun?.value ?? 'Star'}`, adjective, noun };
}

/** Reroll ONLY the noun, preserving the adjective. Mirrors the above. */
export function rerollShipNameNoun(draft, { rng, preferTags = [] } = {}) {
  const adjective = draft?.adjective ?? pickShipNameAdjective({ rng, preferTags });
  const noun = pickShipNameNoun({ rng, preferTags });
  return { name: `${adjective?.value ?? 'Silent'} ${noun?.value ?? 'Star'}`, adjective, noun };
}
