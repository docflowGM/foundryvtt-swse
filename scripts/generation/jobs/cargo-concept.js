/**
 * PHASE 8D-2 foundation — cargo/mission-object generator. Thin wrapper
 * over `data/cargo-concepts.js`.
 */

import { CARGO_CONCEPTS } from '../data/cargo-concepts.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random cargo-concept entry, optionally softly biased by legality tags (`legal`/`gray-area`/`illegal`). */
export function pickCargoConcept({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(CARGO_CONCEPTS, { rng, preferTags });
}
