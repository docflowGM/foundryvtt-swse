/**
 * PHASE 8D-3C — Job-specific GM Field Authoring API.
 *
 * A THIN wrapper over `lib/draft-field-authoring.js`'s domain-agnostic
 * engine, specialized for `job-draft.js` drafts, mirroring
 * `npc/npc-field-authoring.js`'s exact pattern (see that module's own
 * header for the full rationale on lazy initialization + scalar
 * mirroring — repeated verbatim here, just against `JOB_FIELD_DEFINITIONS`
 * and `updateJobDraft()` instead of the NPC equivalents).
 */

import {
  addDraftField, removeDraftField, restoreDraftField, renameDraftField, resetDraftFieldLabel,
  setDraftFieldValue, addDraftFieldValue, removeDraftFieldValue, duplicateDraftFieldValue, moveDraftFieldValue,
  duplicateDraftField, moveDraftField, addCustomDraftField, removeCustomDraftField,
  buildFieldsStateFromScalars, getFieldPrimaryValue
} from '../lib/draft-field-authoring.js';
import { JOB_FIELD_DEFINITIONS } from './job-field-definitions.js';
import { updateJobDraft } from './job-draft.js';

function currentScalarValues(draft) {
  const values = {};
  for (const fieldId of Object.keys(JOB_FIELD_DEFINITIONS)) values[fieldId] = draft[fieldId];
  return values;
}

/** Lazily build `narrativeFields` from the draft's current scalars if it doesn't exist yet. A no-op (returns the draft unchanged) once `narrativeFields` is already present. */
export function ensureJobFieldsState(draft) {
  if (!draft) return draft;
  if (draft.narrativeFields) return draft;
  return { ...draft, narrativeFields: buildFieldsStateFromScalars(JOB_FIELD_DEFINITIONS, currentScalarValues(draft)) };
}

/** After a generic field-authoring op, mirror every registered field's primary value back onto its `job-draft.js` scalar and route the result through `updateJobDraft()` so normalization applies exactly once. */
function syncAndNormalize(draft) {
  if (!draft?.narrativeFields) return draft;
  const patch = { narrativeFields: draft.narrativeFields };
  for (const fieldId of Object.keys(JOB_FIELD_DEFINITIONS)) {
    patch[fieldId] = getFieldPrimaryValue(draft.narrativeFields, fieldId);
  }
  return updateJobDraft(draft, patch);
}

function wrap(genericOp) {
  return (draft, ...args) => syncAndNormalize(genericOp(ensureJobFieldsState(draft), ...args));
}

export const jobAddDraftField = wrap(addDraftField);
export const jobRemoveDraftField = wrap(removeDraftField);
export const jobRestoreDraftField = wrap(restoreDraftField);
export const jobRenameDraftField = wrap(renameDraftField);
export const jobResetDraftFieldLabel = wrap(resetDraftFieldLabel);
export const jobSetFieldValue = wrap(setDraftFieldValue);
export const jobAddFieldValue = wrap(addDraftFieldValue);
export const jobRemoveFieldValue = wrap(removeDraftFieldValue);
export const jobDuplicateFieldValue = wrap(duplicateDraftFieldValue);
export const jobMoveFieldValue = wrap(moveDraftFieldValue);
export const jobDuplicateField = wrap(duplicateDraftField);
export const jobMoveField = wrap(moveDraftField);
export const jobAddCustomField = wrap(addCustomDraftField);
export const jobRemoveCustomField = wrap(removeCustomDraftField);
