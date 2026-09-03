/**
 * PHASE 8D-2 foundation — encounter-phase suggestion vocabulary.
 *
 * SUGGEST-tier only: a rolled phase sequence proposes a possible shape
 * for a mission's flow (e.g. "infiltration -> negotiation -> firefight
 * -> escape") for a GM to use, ignore, or rearrange freely. This never
 * builds an actual encounter, never picks terrain/enemies, and is not
 * itself a combat/scene system -- see `opposition-request.js` for the
 * (also SUGGEST-tier) companion piece that describes what KIND of
 * opposition a phase might call for, again without selecting an actual
 * statblock.
 */

import { weightedPick, weightedPickUniqueN } from '../lib/weighted-random.js';

export const ENCOUNTER_PHASE = Object.freeze({
  INFILTRATION: 'infiltration',
  NEGOTIATION: 'negotiation',
  CHASE: 'chase',
  FIREFIGHT: 'firefight',
  INVESTIGATION: 'investigation',
  ESCAPE: 'escape',
  STEALTH: 'stealth',
  STANDOFF: 'standoff'
});

const PHASE_ENTRIES = Object.freeze(Object.values(ENCOUNTER_PHASE).map((value) => ({ value, weight: 1 })));

const PHASE_VALUES = Object.freeze(Object.values(ENCOUNTER_PHASE));

export function isEncounterPhase(value) {
  return PHASE_VALUES.includes(value);
}

/** Pick a single random phase entry. */
export function pickEncounterPhase({ rng } = {}) {
  return weightedPick(PHASE_ENTRIES, { rng });
}

/** Suggest an ordered sequence of `count` distinct phases (default 3) -- a proposal only, never authoritative. */
export function suggestEncounterPhaseSequence({ rng, count = 3 } = {}) {
  return weightedPickUniqueN(PHASE_ENTRIES, count, { rng }).map((entry) => entry.value);
}
