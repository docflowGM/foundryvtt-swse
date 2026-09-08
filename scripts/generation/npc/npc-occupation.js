/**
 * PHASE 8D-3B production — NPC occupation picker.
 *
 * Filters `data/npc-occupations.js` down to entries whose `roleTag`
 * matches the NPC's already-rolled `role` (`npc-role.js`'s pick), so an
 * NPC rolled as role `'technician'` gets an occupation like "hyperdrive
 * maintenance engineer," never "cantina owner." Falls back to the FULL
 * occupation pool (unfiltered by role) when no entry matches the given
 * role -- occupation stays reachable for every role, even one with
 * sparse dedicated occupation coverage yet.
 */

import { NPC_OCCUPATIONS } from '../data/npc-occupations.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';
import { updateNpcConceptDraft, recomposeNpcPublicDescription } from '../npc-concept.js';

/** Pick one occupation entry, filtered to `roleValue` when that yields at least one match. */
export function pickNpcOccupation({ rng, roleValue = '', preferTags = [] } = {}) {
  const filtered = roleValue ? NPC_OCCUPATIONS.filter((entry) => entry.roleTag === roleValue) : [];
  const pool = filtered.length ? filtered : NPC_OCCUPATIONS;
  return weightedPickWithPreference(pool, { rng, preferTags });
}

/** Reroll ONLY `occupation` (still filtered against the draft's own `role`), preserving every other field. */
export function rerollNpcOccupation(draft, { rng, preferTags = [] } = {}) {
  if (!draft) return draft;
  const entry = pickNpcOccupation({ rng, roleValue: draft.role, preferTags });
  return recomposeNpcPublicDescription(updateNpcConceptDraft(draft, { occupation: entry?.value ?? '' }));
}
