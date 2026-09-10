/**
 * PHASE 8D-3C — Job narrative-field definitions for the generic GM
 * Field Authoring API (`lib/draft-field-authoring.js`).
 *
 * Mirrors `npc/npc-field-definitions.js`'s own scoping discipline
 * exactly: only genuinely GM-narrative, free-text fields are
 * registered here. Single-pick fields that already have a dedicated
 * pool-based reroll wrapper (`missionType`/`legality`/`visibility`/
 * `urgency`/`twist`/`successConsequence`/`failureConsequence`/
 * `complications`/`objectives`) stay OUT of this registry — they
 * remain reachable through `job-bundle.js`'s own targeted reroll
 * operations, not this API. Structural fields (`draftId`/`issuer*`/
 * `location*`/`provenance`/reward outputs) are never listed here,
 * which is what makes them unreachable by the authoring API at all.
 *
 * CORRECTION (round 1): `title`/`briefing` are NOT registered here,
 * even though they are free-text-looking strings -- both are COMPOSED
 * from other generated facts (missionType / the primary objective's
 * description) and need a "recompose after the fact that composed them
 * changes" behavior this generic multi-value engine doesn't model.
 * They instead use `job-draft.js`'s own `titleSource`/`briefingSource`
 * + `job-bundle.js`'s `recomposeJobTitle()`/`recomposeJobBriefing()`,
 * mirroring `npc-concept.js`'s `publicDescriptionSource` pattern
 * exactly (that field is likewise excluded from
 * `npc/npc-field-definitions.js` for the identical reason).
 */

export const JOB_FIELD_DEFINITIONS = Object.freeze({
  hook: { defaultLabel: 'Hook', multiValue: false, removable: true, renameable: true },
  stakes: { defaultLabel: 'Stakes', multiValue: false, removable: true, renameable: true },
  instructions: { defaultLabel: 'Instructions', multiValue: false, removable: true, renameable: true },
  secret: { defaultLabel: 'Secret', multiValue: true, removable: true, renameable: true },
  notes: { defaultLabel: 'Notes', multiValue: false, removable: true, renameable: true },
  gmNotes: { defaultLabel: 'GM Notes', multiValue: false, removable: true, renameable: true }
});
