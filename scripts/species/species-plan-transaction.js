/**
 * Atomic species replacement.
 *
 * 1. buildSpeciesReplacementPlan() resolves the selected species/profile and builds
 *    the COMPLETE mutation plan with no side effects. If the species cannot be
 *    resolved canonically it returns null/throws and the actor is never touched
 *    (there is no legacy attribute fallback).
 * 2. applySpeciesPlanWithRollback() applies the plan through the ActorEngine
 *    (delete -> create -> update) while journaling what it changed. Foundry has no
 *    multi-document transaction, so on any failure the journal is replayed in
 *    reverse: fields restored, created items deleted, deleted items recreated with
 *    their original ids. The original species and all of its grants survive.
 */

import { withStaleDeletions, MANIFEST_FLAG } from './species-grant-reconciliation.js';

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const clone = value => (value === undefined ? undefined : structuredClone(value));

export class SpeciesPlanApplyError extends Error {
  constructor(message, { cause, rollbackComplete, rollbackErrors }) {
    super(message, { cause });
    this.name = 'SpeciesPlanApplyError';
    this.rollbackComplete = rollbackComplete;
    this.rollbackErrors = rollbackErrors;
  }
}

/** Split a species mutation plan into actor field writes and item operations. */
export function splitSpeciesPlan(mutations) {
  const fields = {};
  for (const [key, value] of Object.entries(mutations || {})) {
    if (key.startsWith('system.') || key.startsWith('flags.')) fields[key] = value;
  }
  return {
    fields,
    itemsToCreate: Array.isArray(mutations?.itemsToCreate) ? mutations.itemsToCreate : [],
    itemsToDelete: Array.isArray(mutations?.itemsToDelete) ? mutations.itemsToDelete : [],
  };
}

/**
 * Build the full replacement plan without touching the actor.
 * @returns {Promise<{mutations: object, pendingContext: object}>}
 * @throws {Error} when the species cannot be resolved or materialized canonically
 */
export async function buildSpeciesReplacementPlan(actor, speciesName, { buildContext, applyCanonical, source = 'drag-drop' }) {
  const pendingContext = await buildContext(actor, speciesName, { source });
  if (!pendingContext) throw new Error(`Species "${speciesName}" could not be resolved to a canonical profile`);
  const materialization = await applyCanonical(actor, pendingContext);
  if (!materialization?.success) throw new Error(materialization?.error || `Species "${speciesName}" could not be materialized`);
  return { mutations: materialization.mutations, pendingContext };
}

function restorePayload(actor, key, previous) {
  if (previous === undefined) {
    const parts = key.split('.');
    const leaf = parts.pop();
    return [[`${parts.join('.')}.-=${leaf}`, null]];
  }
  if (isPlainObject(previous)) return [[key, withStaleDeletions(getPath(actor, key), clone(previous))]];
  return [[key, clone(previous)]];
}

/**
 * Apply a plan with a reversible journal.
 * @param {object} args
 * @param {Actor} args.actor
 * @param {object} args.engine                ActorEngine-compatible: updateActor, createEmbeddedDocuments, deleteEmbeddedDocuments
 * @param {object} args.mutations             output of applyCanonicalSpeciesToActor
 * @param {object|null} args.newSpeciesItemData  embedded species item to create (drag-drop), if any
 * @param {string[]} args.replaceItemIds      embedded species item ids to remove first
 * @param {string} args.source
 */
export async function applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData = null, replaceItemIds = [], source = 'species-drop' }) {
  const { fields, itemsToCreate, itemsToDelete } = splitSpeciesPlan(mutations);
  const deleteIds = [...new Set([...replaceItemIds, ...itemsToDelete])];
  const createData = [...(newSpeciesItemData ? [newSpeciesItemData] : []), ...itemsToCreate];

  // Snapshot everything the plan can change BEFORE the first write.
  const previousFields = Object.fromEntries(Object.keys(fields).map(key => [key, clone(getPath(actor, key))]));
  const deletedData = [];
  for (const id of deleteIds) {
    const item = actor.items?.get?.(id) ?? Array.from(actor.items || []).find(i => i.id === id);
    if (!item) continue;
    deletedData.push(clone(typeof item.toObject === 'function' ? item.toObject() : { ...item, _id: item.id }));
  }
  const existingDeleteIds = deletedData.map(d => d._id ?? d.id);

  const journal = { deleted: false, createdIds: [], updateAttempted: false };
  try {
    if (existingDeleteIds.length) {
      await engine.deleteEmbeddedDocuments(actor, 'Item', existingDeleteIds, { source });
      journal.deleted = true;
    }
    if (createData.length) {
      const created = await engine.createEmbeddedDocuments(actor, 'Item', createData, { source });
      journal.createdIds = (created || []).map(doc => doc.id);
    }
    if (Object.keys(fields).length) {
      journal.updateAttempted = true;
      await engine.updateActor(actor, fields, { source });
    }
    return { success: true };
  } catch (cause) {
    const rollbackErrors = [];
    const attempt = async (label, fn) => { try { await fn(); } catch (err) { rollbackErrors.push({ step: label, error: err }); } };

    if (journal.updateAttempted) {
      const restore = {};
      for (const [key, previous] of Object.entries(previousFields)) {
        for (const [k, v] of restorePayload(actor, key, previous)) restore[k] = v;
      }
      await attempt('restore-fields', () => engine.updateActor(actor, restore, { source: `${source}-rollback` }));
    }
    // Items created by this operation are identified by the ids the engine returned; a create that
    // threw midway may still have produced items, so also sweep by journal-less ids is not attempted.
    if (journal.createdIds.length) {
      await attempt('delete-created', () => engine.deleteEmbeddedDocuments(actor, 'Item', journal.createdIds, { source: `${source}-rollback` }));
    }
    if (journal.deleted) {
      await attempt('recreate-deleted', () => engine.createEmbeddedDocuments(actor, 'Item', deletedData, { source: `${source}-rollback`, keepId: true }));
    }
    throw new SpeciesPlanApplyError(`Species replacement failed: ${cause?.message || cause}`, {
      cause,
      rollbackComplete: rollbackErrors.length === 0,
      rollbackErrors,
    });
  }
}

export { MANIFEST_FLAG };
