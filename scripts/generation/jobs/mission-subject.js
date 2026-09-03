/**
 * PHASE 8D-2 foundation — mission-subject generator.
 *
 * Composes a `data/mission-subject-archetypes.js` role pick with an
 * OPTIONAL full narrative NPC concept via `npc/npc-narrative-generator.js`
 * (reused, never duplicated) -- a mission subject that needs a name and
 * personality gets a real `npc-concept.js` draft attached under
 * `npcConcept`; a subject that's just briefly referenced in a briefing
 * (e.g. "the courier") can skip that and use only `role`/`descriptor`.
 */

import { MISSION_SUBJECT_ARCHETYPES } from '../data/mission-subject-archetypes.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';
import { createGeneratedNpcConceptDraft } from '../npc/npc-narrative-generator.js';
import { NPC_CONCEPT_KIND } from '../npc-concept.js';

/** Pick a random mission-subject archetype entry. */
export function pickMissionSubjectArchetype({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(MISSION_SUBJECT_ARCHETYPES, { rng, preferTags });
}

/**
 * Build a mission-subject draft: `{ role, archetype, npcConcept }`.
 * `npcConcept` is `null` unless `withNpcConcept` is true, in which case
 * it's a full `npc-concept.js` draft (via
 * `createGeneratedNpcConceptDraft()`) with its `role` pre-filled from
 * the rolled archetype.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.preferTags] - e.g. the parent mission's `missionTypes`.
 * @param {boolean} [options.withNpcConcept]
 * @param {string} [options.name] - only used when `withNpcConcept` (caller-supplied, same discipline as `npc-concept.js` itself).
 * @param {string} [options.kind] - `NPC_CONCEPT_KIND.LIVING`/`DROID`, only used when `withNpcConcept`.
 */
export function createMissionSubjectDraft({ rng, preferTags = [], withNpcConcept = false, name = '', kind = NPC_CONCEPT_KIND.LIVING, ...npcInput } = {}) {
  const archetype = pickMissionSubjectArchetype({ rng, preferTags });
  const npcConcept = withNpcConcept
    ? createGeneratedNpcConceptDraft({ rng, preferTags, kind, name, role: archetype?.value ?? '', ...npcInput })
    : null;
  return { role: archetype?.value ?? '', archetype, npcConcept };
}
