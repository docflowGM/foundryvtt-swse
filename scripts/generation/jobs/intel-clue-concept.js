/**
 * PHASE 8D-2 foundation — intel/clue generator. Thin wrapper over
 * `data/intel-clue-concepts.js`. See that file's header for the
 * "conceptually related to, never calling, the existing Holonet Intel
 * system" scope note.
 */

import { INTEL_CLUE_CONCEPTS } from '../data/intel-clue-concepts.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct clue-concept entries (default 1). */
export function pickIntelClues({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(INTEL_CLUE_CONCEPTS, count, { rng, preferTags });
}
