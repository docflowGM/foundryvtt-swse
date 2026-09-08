/**
 * PHASE 8D-3B correction (independent review addendum) — generic GM
 * Field Authoring API.
 *
 * A domain-agnostic engine for GM narrative-field customization
 * (NPC/Faction/Location/Job drafts, or any future draft type that
 * declares a field-definitions registry). The UI must NEVER mutate a
 * draft's field shape directly (`draft.foo = ...`, `delete draft.bar`);
 * every add/remove/restore/rename/duplicate/reorder operation goes
 * through this ONE tested authority instead, so behavior, stable
 * identity, validation, and manual/generated provenance are consistent
 * everywhere a GM edits narrative content.
 *
 * HARD RULE (this module's own boundary, verified by a test that
 * inspects its imports): this file imports NOTHING domain-specific --
 * no NPC motivation catalogs, no Faction tables, no SpeciesRegistry, no
 * Planet data. It knows only about a generic `{ order, fields }`
 * container shape and a generic field-DEFINITIONS shape a caller
 * supplies. "What does 'motivation' mean, and what values can it take"
 * is entirely the calling domain's job (e.g.
 * `npc/npc-field-definitions.js` + the actual generator pickers); this
 * module only knows how to ADD/REMOVE/RENAME/REORDER/DUPLICATE
 * whatever fields+values it's told exist.
 *
 * STRUCTURAL FIELD PROTECTION (item 30/54): a draft's structural
 * identity (`draftId`, `kind`, `provenance`, canonical id fields) is
 * NEVER represented in `narrativeFields` at all -- only fields a
 * domain's field-definitions registry explicitly declares can ever be
 * addressed by this API. There is no code path here that could reach
 * `draftId`, because `draftId` is never a registered field; every
 * operation below that receives an unregistered/unknown fieldId fails
 * safe (returns the draft UNCHANGED) rather than acting on it or
 * throwing -- ordinary bad UI input is not an error condition.
 *
 * IMMUTABLE-SAFE: every operation returns a NEW draft
 * (`{ ...draft, narrativeFields: nextState }`), never mutates its
 * input, matching every other draft/reroll operation in this codebase.
 * No result-wrapper object -- functions return drafts directly, same
 * convention `updateNpcConceptDraft()`/`updateFactionDraft()` already
 * use throughout this generation ecosystem.
 *
 * IDENTITY: every field has a stable `fieldId` (a domain semantic key
 * for built-in fields, e.g. `'motivation'`; a minted
 * `custom-field-<hex>` for GM-added fields) and every multi-value
 * entry has a stable `entryId` -- never display label, array index, or
 * DOM position. Duplicating a field/value always mints a NEW id; moving
 * one never changes its id.
 */

import { stableHexId } from '../../utils/stable-id.js';

/** Mint a stable, collision-resistant id for a custom field or a value entry. Not a canonical/draft id (`lib/draft-id.js`'s domain-namespaced `draft:<domain>:...` scheme) -- this is narrower-scoped identity for one draft's own field/entry list. */
function mintId(prefix) {
  return `${prefix}-${stableHexId(`${Date.now()}:${Math.random()}:${prefix}`).slice(0, 12)}`;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

/** One value entry: `{ entryId, value, source }`. `source` is `'generated'` (untouched since the generator produced it) or `'manual'` (a GM wrote or edited it, including duplicating a generated entry -- duplication is itself an explicit GM action). */
export function createFieldEntry(value, source = 'generated') {
  return { entryId: mintId('field-entry'), value: cleanString(value), source: source === 'manual' ? 'manual' : 'generated' };
}

/** One field's full state: identity + display + values. `defaultLabel` is preserved separately from `label` so `resetDraftFieldLabel()` can restore it without needing the domain's field-definitions registry at reset time. */
export function createFieldState({ fieldId, label, defaultLabel, isCustom = false, multiValue = false, hidden = false, values = [] } = {}) {
  return {
    fieldId: cleanString(fieldId),
    label: cleanString(label) || cleanString(defaultLabel),
    defaultLabel: cleanString(defaultLabel) || cleanString(label),
    isCustom: Boolean(isCustom),
    multiValue: Boolean(multiValue),
    hidden: Boolean(hidden),
    values: Array.isArray(values) ? values.map((v) => (v && v.entryId ? v : createFieldEntry(v))) : []
  };
}

/** An empty field-authoring container: `{ order: [], fields: {} }`. */
export function createDraftFieldsState() {
  return { order: [], fields: {} };
}

function isValidFieldsState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.order) && value.fields && typeof value.fields === 'object');
}

/**
 * Build an INITIAL fields-state from a domain's field-definitions
 * registry (`{ [fieldId]: { defaultLabel, multiValue, removable,
 * renameable } }`) plus the draft's CURRENT scalar values (`{ [fieldId]:
 * string }`). Every registered field with a non-empty scalar value
 * becomes a single-entry `'generated'`-source field, in the registry's
 * own key order. Called lazily, the FIRST time any field-authoring
 * operation touches a draft that has no `narrativeFields` yet -- plain
 * generation/reroll never calls this, so it costs nothing and changes
 * nothing until a GM actually opens the field-authoring UI.
 */
export function buildFieldsStateFromScalars(fieldDefinitions, scalarValues) {
  const order = [];
  const fields = {};
  for (const [fieldId, definition] of Object.entries(fieldDefinitions ?? {})) {
    const rawValue = scalarValues?.[fieldId];
    const values = Array.isArray(rawValue)
      ? rawValue.filter(Boolean).map((v) => createFieldEntry(v, 'generated'))
      : (cleanString(rawValue) ? [createFieldEntry(rawValue, 'generated')] : []);
    fields[fieldId] = createFieldState({ fieldId, label: definition.defaultLabel, defaultLabel: definition.defaultLabel, isCustom: false, multiValue: Boolean(definition.multiValue), hidden: false, values });
    order.push(fieldId);
  }
  return { order, fields };
}

/**
 * Reconcile an EXISTING fields-state against FRESH scalar values (a
 * plain, field-authoring-unaware reroll changed one or more scalars
 * directly). For each registered field whose current PRIMARY value
 * (`values[0]?.value`) differs from the new scalar, the field's values
 * are replaced with ONE fresh `'generated'` entry carrying the new
 * value -- but its customized `label`/`hidden` state is PRESERVED (a
 * targeted "reroll this field" is consent to replace its VALUE, never
 * its GM-assigned label or its removed/restored state). A field whose
 * scalar did NOT change is returned completely untouched (same object
 * reference), so an unrelated reroll can never disturb a GM's other
 * customizations -- including any extra manual entries on a
 * multi-value field, which only get collapsed when THAT field's own
 * primary scalar actually changes.
 */
export function reconcileFieldsStateWithScalars(fieldsState, fieldDefinitions, scalarValues) {
  if (!isValidFieldsState(fieldsState)) return buildFieldsStateFromScalars(fieldDefinitions, scalarValues);
  const fields = { ...fieldsState.fields };
  let changed = false;
  for (const [fieldId, definition] of Object.entries(fieldDefinitions ?? {})) {
    const existing = fields[fieldId];
    const rawValue = scalarValues?.[fieldId];
    const nextPrimary = Array.isArray(rawValue) ? cleanString(rawValue[0]) : cleanString(rawValue);
    if (!existing) {
      if (nextPrimary) {
        fields[fieldId] = createFieldState({ fieldId, label: definition.defaultLabel, defaultLabel: definition.defaultLabel, multiValue: Boolean(definition.multiValue), values: [createFieldEntry(nextPrimary, 'generated')] });
        changed = true;
      }
      continue;
    }
    const currentPrimary = existing.values[0]?.value ?? '';
    if (currentPrimary !== nextPrimary) {
      fields[fieldId] = { ...existing, values: nextPrimary ? [createFieldEntry(nextPrimary, 'generated')] : [] };
      changed = true;
    }
  }
  if (!changed) return fieldsState;
  const order = fieldsState.order.length ? fieldsState.order : Object.keys(fields);
  return { order, fields };
}

// --- read helpers ---------------------------------------------------------

export function getFieldState(fieldsState, fieldId) {
  return fieldsState?.fields?.[fieldId] ?? null;
}

/** Plain string values for a field, in entry order (empty array if the field doesn't exist or has no values). */
export function getFieldValues(fieldsState, fieldId) {
  return (getFieldState(fieldsState, fieldId)?.values ?? []).map((e) => e.value);
}

/** The primary (first) value, or `''` if none. */
export function getFieldPrimaryValue(fieldsState, fieldId) {
  return getFieldState(fieldsState, fieldId)?.values?.[0]?.value ?? '';
}

export function isFieldHidden(fieldsState, fieldId) {
  return Boolean(getFieldState(fieldsState, fieldId)?.hidden);
}

/** Every visible (non-hidden) fieldId, in display order. */
export function listVisibleFieldIds(fieldsState) {
  return (fieldsState?.order ?? []).filter((id) => fieldsState.fields[id] && !fieldsState.fields[id].hidden);
}

function withFieldsState(draft, nextState) {
  return { ...draft, narrativeFields: nextState };
}

function updateField(fieldsState, fieldId, updater) {
  const existing = fieldsState.fields[fieldId];
  if (!existing) return fieldsState;
  return { ...fieldsState, fields: { ...fieldsState.fields, [fieldId]: updater(existing) } };
}

// --- field-level operations -------------------------------------------

/**
 * Add/restore a field: unhide it (a previously `removeDraftField()`-ed
 * built-in field), or no-op if it's already present and visible. Does
 * NOT create a brand-new BUILT-IN field out of nothing (a domain field
 * only exists once the domain's normalization has put it in
 * `narrativeFields` at least once) -- use `addCustomDraftField()` to
 * create a wholly new custom field.
 */
export function addDraftField(draft, fieldId) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  if (!state.fields[fieldId].hidden) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, hidden: false })));
}

/** Mark a field hidden/removed WITHOUT discarding its values -- restorable later via `addDraftField()`/`restoreDraftField()`. A no-op for an unknown fieldId (fails safe). */
export function removeDraftField(draft, fieldId) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, hidden: true })));
}

/** Alias of `addDraftField()` -- restoration and (re-)addition are the same operation (unhide), matching item 10's own framing. */
export function restoreDraftField(draft, fieldId) {
  return addDraftField(draft, fieldId);
}

/** Rename a field's DISPLAY label only -- the semantic `fieldId` never changes, so the generator/every reroll wrapper keeps working unchanged. */
export function renameDraftField(draft, fieldId, newLabel) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  const label = cleanString(newLabel);
  if (!label) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, label })));
}

/** Reset a field's label back to its original `defaultLabel`, leaving values untouched. */
export function resetDraftFieldLabel(draft, fieldId) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, label: f.defaultLabel })));
}

// --- value-level operations ----------------------------------------------

/** Replace a field's ENTIRE value list with exactly one manually-owned entry (the "scalar set" shape -- for a single-value field this is the normal edit path). */
export function setDraftFieldValue(draft, fieldId, value, { source = 'manual' } = {}) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  const clean = cleanString(value);
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, values: clean ? [createFieldEntry(clean, source)] : [] })));
}

/** Append one new value entry (multi-value fields: "+ Add"). Defaults to `'manual'` source -- the GM explicitly asked for another entry. */
export function addDraftFieldValue(draft, fieldId, value, { source = 'manual' } = {}) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.fields[fieldId]) return draft;
  const clean = cleanString(value);
  if (!clean) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, values: [...f.values, createFieldEntry(clean, source)] })));
}

/** Remove ONE value entry by `entryId`. If it was the last remaining value, the field stays PRESENT (still registered, `hidden: false`) but with an empty `values` list -- "empty field" and "removed field" are deliberately different states (item 52). A no-op if the entryId doesn't exist. */
export function removeDraftFieldValue(draft, fieldId, entryId) {
  const state = draft?.narrativeFields;
  const field = state?.fields?.[fieldId];
  if (!field || !field.values.some((v) => v.entryId === entryId)) return draft;
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, values: f.values.filter((v) => v.entryId !== entryId) })));
}

/** Duplicate one value entry, inserted immediately after the original. The duplicate ALWAYS gets a NEW `entryId` and `source: 'manual'` (duplication is itself an explicit GM authoring action, even duplicating a generated entry). A no-op if the entryId doesn't exist. */
export function duplicateDraftFieldValue(draft, fieldId, entryId) {
  const state = draft?.narrativeFields;
  const field = state?.fields?.[fieldId];
  const index = field?.values.findIndex((v) => v.entryId === entryId) ?? -1;
  if (index === -1) return draft;
  const duplicate = createFieldEntry(field.values[index].value, 'manual');
  const values = [...field.values.slice(0, index + 1), duplicate, ...field.values.slice(index + 1)];
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, values })));
}

/** Reorder one value entry to sit immediately before `beforeEntryId` (or to the end when `beforeEntryId` is omitted/not found). Never changes any entry's `entryId`. A no-op if `entryId` doesn't exist on this field. */
export function moveDraftFieldValue(draft, fieldId, entryId, beforeEntryId) {
  const state = draft?.narrativeFields;
  const field = state?.fields?.[fieldId];
  if (!field || !field.values.some((v) => v.entryId === entryId)) return draft;
  const moving = field.values.find((v) => v.entryId === entryId);
  const rest = field.values.filter((v) => v.entryId !== entryId);
  const targetIndex = beforeEntryId ? rest.findIndex((v) => v.entryId === beforeEntryId) : -1;
  const values = targetIndex === -1 ? [...rest, moving] : [...rest.slice(0, targetIndex), moving, ...rest.slice(targetIndex)];
  return withFieldsState(draft, updateField(state, fieldId, (f) => ({ ...f, values })));
}

// --- field-level duplication / reordering -------------------------------

/** Duplicate a whole field (primarily intended for custom fields -- see this module's header doc; a built-in semantic field CAN be duplicated too, but prefer multiple VALUES on the one semantic field for those). The duplicate gets a new custom `fieldId`, `isCustom: true`, a "(Copy)"-suffixed label, and entirely NEW `entryId`s for every value (never shares an id with the original). Inserted immediately after the original in display order. */
export function duplicateDraftField(draft, fieldId) {
  const state = draft?.narrativeFields;
  const source = state?.fields?.[fieldId];
  if (!source) return draft;
  const newFieldId = mintId('custom-field');
  const duplicate = createFieldState({
    fieldId: newFieldId,
    label: `${source.label} (Copy)`,
    defaultLabel: `${source.label} (Copy)`,
    isCustom: true,
    multiValue: source.multiValue,
    hidden: false,
    values: source.values.map((v) => createFieldEntry(v.value, 'manual'))
  });
  const index = state.order.indexOf(fieldId);
  const order = index === -1 ? [...state.order, newFieldId] : [...state.order.slice(0, index + 1), newFieldId, ...state.order.slice(index + 1)];
  return withFieldsState(draft, { order, fields: { ...state.fields, [newFieldId]: duplicate } });
}

/** Reorder a field to sit immediately before `beforeFieldId` (or to the end when omitted/not found). Never changes any field's `fieldId`. */
export function moveDraftField(draft, fieldId, beforeFieldId) {
  const state = draft?.narrativeFields;
  if (!isValidFieldsState(state) || !state.order.includes(fieldId)) return draft;
  const rest = state.order.filter((id) => id !== fieldId);
  const targetIndex = beforeFieldId ? rest.indexOf(beforeFieldId) : -1;
  const order = targetIndex === -1 ? [...rest, fieldId] : [...rest.slice(0, targetIndex), fieldId, ...rest.slice(targetIndex)];
  return withFieldsState(draft, { ...state, order });
}

// --- custom fields ---------------------------------------------------------

/** Create a wholly new custom field (a GM-authored narrative field with no semantic meaning to any generator). Optionally seeded with one initial value in the same call (item 19). Returns the draft UNCHANGED only if `label` is blank (a custom field with no label is a contradiction). */
export function addCustomDraftField(draft, { label, value, multiValue = true } = {}) {
  const cleanLabel = cleanString(label);
  if (!cleanLabel) return draft;
  const state = isValidFieldsState(draft?.narrativeFields) ? draft.narrativeFields : createDraftFieldsState();
  const fieldId = mintId('custom-field');
  const field = createFieldState({ fieldId, label: cleanLabel, defaultLabel: cleanLabel, isCustom: true, multiValue, hidden: false, values: value ? [createFieldEntry(value, 'manual')] : [] });
  return withFieldsState(draft, { order: [...state.order, fieldId], fields: { ...state.fields, [fieldId]: field } });
}

/** Permanently remove a custom field (custom fields have no semantic role to preserve, unlike a built-in field's `removeDraftField()`, which only hides). A no-op for a built-in (non-custom) fieldId or an unknown one -- this operation is deliberately scoped to custom fields only. */
export function removeCustomDraftField(draft, fieldId) {
  const state = draft?.narrativeFields;
  const field = state?.fields?.[fieldId];
  if (!field || !field.isCustom) return draft;
  const { [fieldId]: _removed, ...fields } = state.fields;
  return withFieldsState(draft, { order: state.order.filter((id) => id !== fieldId), fields });
}
