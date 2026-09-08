/**
 * PHASE 8D-2 foundation — Job/mission archetype metadata.
 *
 * Reuses `objective-template.js`'s existing `missionTypes` vocabulary
 * (rescue/extraction/delivery/sabotage/recovery/investigation/heist/
 * escort/bounty/hunt/assault/smuggling/infiltration/boarding) rather
 * than inventing a second mission-type enum -- this module only adds
 * FLAVOR metadata per mission type (typical tone, typical legality,
 * typical visibility) a Job generator can use as a starting default,
 * always overridable per-Job.
 */

export const JOB_ARCHETYPE_METADATA = Object.freeze({
  rescue: { typicalTone: 'urgent, personal stakes', typicalLegality: 'legal', typicalVisibility: 'discreet' },
  extraction: { typicalTone: 'tense, time-pressured', typicalLegality: 'gray-area', typicalVisibility: 'hidden' },
  delivery: { typicalTone: 'routine, procedural', typicalLegality: 'legal', typicalVisibility: 'posted' },
  sabotage: { typicalTone: 'covert, high-risk', typicalLegality: 'illegal', typicalVisibility: 'hidden' },
  recovery: { typicalTone: 'investigative, methodical', typicalLegality: 'legal', typicalVisibility: 'posted' },
  investigation: { typicalTone: 'mysterious, slow-burn', typicalLegality: 'legal', typicalVisibility: 'discreet' },
  heist: { typicalTone: 'high-stakes, meticulous planning', typicalLegality: 'illegal', typicalVisibility: 'hidden' },
  escort: { typicalTone: 'protective, reactive', typicalLegality: 'legal', typicalVisibility: 'posted' },
  bounty: { typicalTone: 'predatory, competitive', typicalLegality: 'gray-area', typicalVisibility: 'posted' },
  hunt: { typicalTone: 'predatory, competitive', typicalLegality: 'gray-area', typicalVisibility: 'posted' },
  assault: { typicalTone: 'aggressive, direct', typicalLegality: 'illegal', typicalVisibility: 'hidden' },
  smuggling: { typicalTone: 'covert, nervy', typicalLegality: 'illegal', typicalVisibility: 'word-of-mouth' },
  infiltration: { typicalTone: 'covert, patient', typicalLegality: 'illegal', typicalVisibility: 'hidden' },
  boarding: { typicalTone: 'aggressive, fast-paced', typicalLegality: 'illegal', typicalVisibility: 'hidden' }
});

/** Metadata for a mission type, or a safe neutral default for an unrecognized one (never throws/guesses a specific tone). */
export function describeJobArchetype(missionType) {
  return JOB_ARCHETYPE_METADATA[missionType] ?? { typicalTone: '', typicalLegality: '', typicalVisibility: 'posted' };
}
