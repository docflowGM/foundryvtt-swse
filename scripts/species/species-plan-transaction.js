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
export async function buildSpeciesReplacementPlan(actor, speciesName, { buildContext, applyCanonical, source = 'drag-drop', identity = null }) {
  // `identity` carries an explicitly chosen published version (RD-001); without one the context builder fails closed
  // for species that require it.
  const pendingContext = await buildContext(actor, identity ?? speciesName, { source });
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
  const itemList = () => Array.from(actor.items || []);
  const preIds = new Set(itemList().map(i => i.id));
  const createSignatures = new Set(createData.map(d => `${d.type}:${d.name}`));

  const journal = { updateAttempted: false };
  try {
    if (existingDeleteIds.length) {
      await engine.deleteEmbeddedDocuments(actor, 'Item', existingDeleteIds, { source });
    }
    if (createData.length) {
      await engine.createEmbeddedDocuments(actor, 'Item', createData, { source });
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
    // Item rollback is STATE-based, not journal-based: a create or delete that throws midway may have
    // changed some items without returning their ids. Compare what the actor really holds now with
    // what it held before the operation.
    //  - items that did not exist before and match something we tried to create -> delete
    //  - items we removed that are no longer present -> recreate with their original ids
    const strayIds = itemList()
      .filter(i => !preIds.has(i.id) && createSignatures.has(`${i.type}:${i.name}`))
      .map(i => i.id);
    if (strayIds.length) {
      await attempt('delete-created', () => engine.deleteEmbeddedDocuments(actor, 'Item', strayIds, { source: `${source}-rollback` }));
    }
    const presentNow = new Set(itemList().map(i => i.id));
    const missing = deletedData.filter(d => !presentNow.has(d._id ?? d.id));
    if (missing.length) {
      await attempt('recreate-deleted', () => engine.createEmbeddedDocuments(actor, 'Item', missing, { source: `${source}-rollback`, keepId: true }));
    }
    // Verify rather than assume: anything still different is an incomplete rollback.
    const after = new Set(itemList().map(i => i.id));
    const unrestored = [...preIds].filter(id => !after.has(id));
    const leftovers = itemList().filter(i => !preIds.has(i.id) && createSignatures.has(`${i.type}:${i.name}`));
    if (unrestored.length || leftovers.length) {
      rollbackErrors.push({ step: 'verify', error: new Error(`items not restored: ${JSON.stringify({ unrestored, leftovers: leftovers.map(i => i.id) })}`) });
    }
    throw new SpeciesPlanApplyError(`Species replacement failed: ${cause?.message || cause}`, {
      cause,
      rollbackComplete: rollbackErrors.length === 0,
      rollbackErrors,
    });
  }
}

export { MANIFEST_FLAG };
