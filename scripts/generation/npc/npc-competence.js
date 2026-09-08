/**
 * PHASE 8D-3B production — NPC Competence Level authority.
 *
 * `competenceLevel` describes how good this NPC narratively is at their
 * PRIMARY occupational/narrative role -- "this person is an expert
 * mechanic," never a mechanical statement. HARD RULE (restated for the
 * third time in this generation ecosystem's history, because it keeps
 * mattering): `competenceLevel` produces NO level, BAB, skill bonus,
 * ability score, feat, talent, Force power, CL, or attack bonus of any
 * kind. `NPC_COMPETENCE_LEVEL` carries no numeric field whatsoever.
 *
 * DELIBERATELY MODELED ON SWSE's existing five-tier Crew Quality
 * progression (Untrained/Normal/Skilled/Expert/Ace, used for generic
 * vehicle crews) rather than invented from scratch -- confirmed by
 * reconnaissance that no other five-tier "how good is this person"
 * vocabulary already exists in this codebase for NON-crew NPCs. The
 * naming is generalized (`capable` instead of `normal`, `elite`
 * instead of `ace`) because this vocabulary must read naturally for a
 * doctor, a slicer, or a bartender, not only a ship's gunner --
 * `NPC_COMPETENCE_CREW_QUALITY_EQUIVALENT` below records the exact
 * mapping so a FUTURE resolver that needs to turn an NPC concept into
 * a generic vehicle crew has the semantic bridge already documented,
 * without this module importing or depending on any actual Crew
 * Quality mechanical implementation (this module has no dependency on
 * vehicle/crew code at all -- the mapping is a one-way documentation
 * seam, not a shared implementation).
 */

import { weightedPick } from '../lib/weighted-random.js';
import { NPC_ROLE_TIER } from '../data/npc-roles.js';
import { COMMAND_TIER } from '../rank-metadata.js';
import { updateNpcConceptDraft } from '../npc-concept.js';

export const NPC_COMPETENCE_LEVEL = Object.freeze({
  UNTRAINED: 'untrained',
  CAPABLE: 'capable',
  SKILLED: 'skilled',
  EXPERT: 'expert',
  ELITE: 'elite'
});

const COMPETENCE_LEVELS = Object.freeze(Object.values(NPC_COMPETENCE_LEVEL));

export function isNpcCompetenceLevel(value) {
  return COMPETENCE_LEVELS.includes(value);
}

/**
 * Documented semantic bridge to SWSE's existing generic-vehicle-crew
 * Crew Quality progression -- exact, 1:1, never approximate. A future
 * resolver may read this map; nothing in this module or its callers
 * consumes it to produce mechanics.
 */
export const NPC_COMPETENCE_CREW_QUALITY_EQUIVALENT = Object.freeze({
  [NPC_COMPETENCE_LEVEL.UNTRAINED]: 'Untrained',
  [NPC_COMPETENCE_LEVEL.CAPABLE]: 'Normal',
  [NPC_COMPETENCE_LEVEL.SKILLED]: 'Skilled',
  [NPC_COMPETENCE_LEVEL.EXPERT]: 'Expert',
  [NPC_COMPETENCE_LEVEL.ELITE]: 'Ace'
});

/** GM-facing descriptive label, independent of the Crew Quality mapping (which is a cross-reference, not the display string). */
export const NPC_COMPETENCE_LABEL = Object.freeze({
  [NPC_COMPETENCE_LEVEL.UNTRAINED]: 'Untrained',
  [NPC_COMPETENCE_LEVEL.CAPABLE]: 'Capable',
  [NPC_COMPETENCE_LEVEL.SKILLED]: 'Skilled',
  [NPC_COMPETENCE_LEVEL.EXPERT]: 'Expert',
  [NPC_COMPETENCE_LEVEL.ELITE]: 'Elite'
});

/**
 * Named context weighting presets (phase spec §4). Deliberately SOFT --
 * every preset still leaves every competence level reachable (no zero
 * weights), matching this whole ecosystem's "soft bias, never a hard
 * lock" discipline; an unexpectedly brilliant frontier mechanic, or an
 * inept senior specialist, must both remain possible.
 */
export const COMPETENCE_CONTEXT_WEIGHTS = Object.freeze({
  ordinaryCivilian: Object.freeze([
    { value: NPC_COMPETENCE_LEVEL.UNTRAINED, weight: 2 },
    { value: NPC_COMPETENCE_LEVEL.CAPABLE, weight: 5 },
    { value: NPC_COMPETENCE_LEVEL.SKILLED, weight: 4 },
    { value: NPC_COMPETENCE_LEVEL.EXPERT, weight: 1 },
    { value: NPC_COMPETENCE_LEVEL.ELITE, weight: 0.15 }
  ]),
  specializedProfessional: Object.freeze([
    { value: NPC_COMPETENCE_LEVEL.UNTRAINED, weight: 0.5 },
    { value: NPC_COMPETENCE_LEVEL.CAPABLE, weight: 2 },
    { value: NPC_COMPETENCE_LEVEL.SKILLED, weight: 5 },
    { value: NPC_COMPETENCE_LEVEL.EXPERT, weight: 4 },
    { value: NPC_COMPETENCE_LEVEL.ELITE, weight: 0.5 }
  ]),
  seniorFactionSpecialist: Object.freeze([
    { value: NPC_COMPETENCE_LEVEL.UNTRAINED, weight: 0.1 },
    { value: NPC_COMPETENCE_LEVEL.CAPABLE, weight: 1 },
    { value: NPC_COMPETENCE_LEVEL.SKILLED, weight: 3 },
    { value: NPC_COMPETENCE_LEVEL.EXPERT, weight: 5 },
    { value: NPC_COMPETENCE_LEVEL.ELITE, weight: 1 }
  ]),
  randomBystander: Object.freeze([
    { value: NPC_COMPETENCE_LEVEL.UNTRAINED, weight: 4 },
    { value: NPC_COMPETENCE_LEVEL.CAPABLE, weight: 5 },
    { value: NPC_COMPETENCE_LEVEL.SKILLED, weight: 1.5 },
    { value: NPC_COMPETENCE_LEVEL.EXPERT, weight: 0.3 },
    { value: NPC_COMPETENCE_LEVEL.ELITE, weight: 0.05 }
  ]),
  eliteInstitution: Object.freeze([
    { value: NPC_COMPETENCE_LEVEL.UNTRAINED, weight: 0.3 },
    { value: NPC_COMPETENCE_LEVEL.CAPABLE, weight: 1.5 },
    { value: NPC_COMPETENCE_LEVEL.SKILLED, weight: 3.5 },
    { value: NPC_COMPETENCE_LEVEL.EXPERT, weight: 4.5 },
    { value: NPC_COMPETENCE_LEVEL.ELITE, weight: 1.5 }
  ])
});

/**
 * Resolve which named context preset applies, from a role tier +
 * commandTier + an optional `institution` flag ("this Faction/
 * organization is itself an elite institution"). PHASE SPEC §5 HARD
 * RULE: Faction Scale is NEVER read here -- a Scale-18 government still
 * employs ordinary clerks, so a caller must never pass Scale as if it
 * were competence context. `institution` is a narrow, explicit,
 * caller-supplied flag (e.g. a `research-organization`/`force-tradition`
 * preset choosing to set it), never derived from Scale.
 */
function resolvePreset({ roleTier, commandTier, institution }) {
  const leadershipTiers = new Set([
    COMMAND_TIER.SENIOR_SPECIALIST, COMMAND_TIER.JUNIOR_COMMAND, COMMAND_TIER.TACTICAL_COMMAND,
    COMMAND_TIER.OPERATIONAL_COMMAND, COMMAND_TIER.STRATEGIC_COMMAND
  ]);
  if (leadershipTiers.has(commandTier) && roleTier === NPC_ROLE_TIER.SPECIALIST) return COMPETENCE_CONTEXT_WEIGHTS.seniorFactionSpecialist;
  if (institution) return COMPETENCE_CONTEXT_WEIGHTS.eliteInstitution;
  if (roleTier === NPC_ROLE_TIER.SPECIALIST || roleTier === NPC_ROLE_TIER.LEADERSHIP) return COMPETENCE_CONTEXT_WEIGHTS.specializedProfessional;
  if (roleTier === NPC_ROLE_TIER.COMMON) return COMPETENCE_CONTEXT_WEIGHTS.ordinaryCivilian;
  return COMPETENCE_CONTEXT_WEIGHTS.randomBystander;
}

/**
 * Roll a competence level. `roleTier` (an `NPC_ROLE_TIER` value, from
 * whichever role/occupation entry this NPC already rolled) and
 * `commandTier` (a Faction Contact's rank, if any) softly select a
 * named context preset (see `resolvePreset()`); `institution: true`
 * overrides toward `eliteInstitution` explicitly. An explicit `preset`
 * name (any `COMPETENCE_CONTEXT_WEIGHTS` key) always wins over the
 * derived resolution.
 */
export function rollNpcCompetence({ rng, roleTier, commandTier = COMMAND_TIER.NONE, institution = false, preset } = {}) {
  const weights = (preset && COMPETENCE_CONTEXT_WEIGHTS[preset]) || resolvePreset({ roleTier, commandTier, institution });
  return weightedPick(weights, { rng, weightOf: (e) => e.weight })?.value ?? NPC_COMPETENCE_LEVEL.CAPABLE;
}

/** Reroll ONLY `competenceLevel`, preserving every other field (role/rank context reused from the draft itself unless explicitly overridden). */
export function rerollNpcCompetence(draft, { rng, roleTier, commandTier, institution, preset } = {}) {
  if (!draft) return draft;
  const competenceLevel = rollNpcCompetence({ rng, roleTier, commandTier: commandTier ?? draft.commandTier, institution, preset });
  return updateNpcConceptDraft(draft, { competenceLevel });
}
