/**
 * PHASE 8D-3B correction (independent review addendum) — NPC narrative-
 * field definitions for the generic GM Field Authoring API
 * (`lib/draft-field-authoring.js`).
 *
 * Declares WHICH `npc-concept.js` scalar fields are exposed to GM
 * field-authoring (add/remove/rename/multi-value/...), and their
 * display metadata. The generic engine reads this registry but never
 * hardcodes anything about it -- this is where "what does 'motivation'
 * mean to the authoring layer" actually lives, per that module's own
 * "shared mechanics, separate domain knowledge" split (item 28/39).
 *
 * Deliberately a SUBSET of `npc-concept.js`'s full field list: only
 * genuinely GM-narrative, free-text-ish fields that make sense as
 * "a GM might want to rename/multi-value/remove this" are registered.
 * Structural fields (`draftId`/`kind`/`provenance`/canonical id fields)
 * are never listed here, which is what makes them unreachable by the
 * authoring API at all (see `draft-field-authoring.js`'s header for why
 * that's sufficient protection, requiring no special-casing).
 * Single-pick narrative facts that already have dedicated pool-based
 * reroll wrappers (`role`/`occupation`/`voice`/`appearance`/...) are
 * also left OUT of this first registry pass -- they stay reachable
 * through the existing generic `updateNpcConceptDraft()` patch and
 * their own `rerollNpcX()` wrappers; only the fields the review's own
 * walkthrough exercises (motivation/desire/fear/agenda/secret/
 * complication/notes) are registered in this pass. Expanding the
 * registry to more fields later is purely additive -- it never requires
 * touching the generic engine.
 */

export const NPC_FIELD_DEFINITIONS = Object.freeze({
  motivation: { defaultLabel: 'Motivation', multiValue: true, removable: true, renameable: true },
  desire: { defaultLabel: 'Desire', multiValue: true, removable: true, renameable: true },
  fear: { defaultLabel: 'Fear', multiValue: true, removable: true, renameable: true },
  agenda: { defaultLabel: 'Agenda', multiValue: true, removable: true, renameable: true },
  secret: { defaultLabel: 'Secret', multiValue: true, removable: true, renameable: true },
  complication: { defaultLabel: 'Complication', multiValue: true, removable: true, renameable: true },
  loyalty: { defaultLabel: 'Loyalty', multiValue: true, removable: true, renameable: true },
  publicNotes: { defaultLabel: 'Public Notes', multiValue: false, removable: true, renameable: true },
  gmNotes: { defaultLabel: 'GM Notes', multiValue: false, removable: true, renameable: true }
});
