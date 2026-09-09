/**
 * PHASE 8D-3B correction (independent review addendum) — NPC-specific
 * GM Field Authoring API.
 *
 * A THIN wrapper over `lib/draft-field-authoring.js`'s domain-agnostic
 * engine, specialized for `npc-concept.js` drafts in exactly two ways
 * neither the generic engine nor `npc-field-definitions.js` know
 * about:
 *
 *  1. LAZY INITIALIZATION -- a freshly generated NPC concept carries NO
 *     `narrativeFields` at all (`createNpcConceptDraft()` never builds
 *     it eagerly, so plain generation/rerolls stay exactly as fast and
 *     deterministic as before this correction pass). The FIRST call to
 *     any function in this module builds it from the draft's current
 *     scalar values via `ensureNpcFieldsState()`.
 *  2. SCALAR MIRRORING -- every registered field's PRIMARY (first)
 *     value is mirrored back onto the matching `npc-concept.js` scalar
 *     field (`motivation`, `desire`, ...) after every operation, via
 *     `updateNpcConceptDraft()`, so every EXISTING consumer that reads
 *     `draft.motivation` as a plain string (generator composition,
 *     `composeNpcSuggestion()`, every pre-existing test) keeps working
 *     completely unchanged. `npc-concept.js`'s own
 *     `createNpcConceptDraft()` reconciliation (see that file's header)
 *     is what keeps the mirror correctly in sync across UNRELATED
 *     rerolls too, not just field-authoring operations.
 *
 * Every exported function here has the exact same name as its generic
 * counterpart, `npc`-prefixed, and the exact same signature shape
 * (`(draft, ...args) => draft`) -- a future Faction/Location field-
 * authoring module would look identical, just importing a different
 * field-definitions registry.
 */

import {
  addDraftField, removeDraftField, restoreDraftField, renameDraftField, resetDraftFieldLabel,
  setDraftFieldValue, addDraftFieldValue, removeDraftFieldValue, duplicateDraftFieldValue, moveDraftFieldValue,
  duplicateDraftField, moveDraftField, addCustomDraftField, removeCustomDraftField,
  buildFieldsStateFromScalars, getFieldPrimaryValue
} from '../lib/draft-field-authoring.js';
import { NPC_FIELD_DEFINITIONS } from './npc-field-definitions.js';
import { updateNpcConceptDraft } from '../npc-concept.js';

function currentScalarValues(draft) {
  const values = {};
  for (const fieldId of Object.keys(NPC_FIELD_DEFINITIONS)) values[fieldId] = draft[fieldId];
  return values;
}

/** Lazily build `narrativeFields` from the draft's current scalars if it doesn't exist yet. A no-op (returns the draft unchanged) once `narrativeFields` is already present. */
export function ensureNpcFieldsState(draft) {
  if (!draft) return draft;
  if (draft.narrativeFields) return draft;
  return { ...draft, narrativeFields: buildFieldsStateFromScalars(NPC_FIELD_DEFINITIONS, currentScalarValues(draft)) };
}

/** After a generic field-authoring op, mirror every registered field's primary value back onto its `npc-concept.js` scalar and route the result through `updateNpcConceptDraft()` so normalization/reconciliation applies exactly once. */
function syncAndNormalize(draft) {
  if (!draft?.narrativeFields) return draft;
  const patch = { narrativeFields: draft.narrativeFields };
  for (const fieldId of Object.keys(NPC_FIELD_DEFINITIONS)) {
    patch[fieldId] = getFieldPrimaryValue(draft.narrativeFields, fieldId);
  }
  return updateNpcConceptDraft(draft, patch);
}

function wrap(genericOp) {
  return (draft, ...args) => syncAndNormalize(genericOp(ensureNpcFieldsState(draft), ...args));
}

export const npcAddDraftField = wrap(addDraftField);
export const npcRemoveDraftField = wrap(removeDraftField);
export const npcRestoreDraftField = wrap(restoreDraftField);
export const npcRenameDraftField = wrap(renameDraftField);
export const npcResetDraftFieldLabel = wrap(resetDraftFieldLabel);
export const npcSetFieldValue = wrap(setDraftFieldValue);
export const npcAddFieldValue = wrap(addDraftFieldValue);
export const npcRemoveFieldValue = wrap(removeDraftFieldValue);
export const npcDuplicateFieldValue = wrap(duplicateDraftFieldValue);
export const npcMoveFieldValue = wrap(moveDraftFieldValue);
export const npcDuplicateField = wrap(duplicateDraftField);
export const npcMoveField = wrap(moveDraftField);
export const npcAddCustomField = wrap(addCustomDraftField);
export const npcRemoveCustomField = wrap(removeCustomDraftField);
