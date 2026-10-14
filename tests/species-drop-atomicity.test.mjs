import assert from 'node:assert/strict';
import { makeActor, selectSpecies, speciesFootprint, setPath } from './helpers/species-actor-sim.mjs';

const { buildSpeciesReplacementPlan, applySpeciesPlanWithRollback, SpeciesPlanApplyError } =
  await import('/systems/foundryvtt-swse/scripts/species/species-plan-transaction.js');
const { buildPendingSpeciesContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js');
const { applyCanonicalSpeciesToActor } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js');

// ---- ActorEngine stand-in with Foundry update semantics and fault injection ----
function makeEngine(actor, { failAt = null, failAfter = false } = {}) {
  const calls = [];
  const maybeFail = step => { if (failAt === step) throw new Error(`injected ${step} failure`); };
  return {
    calls,
    async deleteEmbeddedDocuments(a, _n, ids, opts) {
      calls.push(['delete', ids, opts]);
      const isRollback = String(opts?.source).endsWith('-rollback');
      if (!isRollback) maybeFail('delete');
      a.items = a.items.filter(i => !ids.includes(i.id));
    },
    async createEmbeddedDocuments(a, _n, data, opts) {
      calls.push(['create', data.map(d => d.name), opts]);
      const isRollback = String(opts?.source).endsWith('-rollback');
      if (!isRollback) maybeFail('create');
      return data.map(d => { const id = opts?.keepId && (d._id || d.id) ? (d._id || d.id) : `item${a._next++}`; const { _id, id: _ignored, ...rest } = structuredClone(d); a.items.push({ ...rest, id }); return { id }; });
    },
    async updateActor(a, fields, opts) {
      calls.push(['update', Object.keys(fields).length, opts]);
      const isRollback = String(opts?.source).endsWith('-rollback');
      if (!isRollback && failAt === 'update' && !failAfter) throw new Error('injected update failure');
      for (const [k, v] of Object.entries(fields)) setPath(a, k, v);
      if (!isRollback && failAt === 'update' && failAfter) throw new Error('injected update failure after apply');
    },
  };
}

const state = a => JSON.parse(JSON.stringify({
  system: a.system, flags: a.flags,
  items: [...a.items].sort((x, y) => x.id.localeCompare(y.id)),
}));
const speciesItem = (id, name) => ({ id, type: 'species', name, flags: {}, system: { canonicalTraits: [] } });
const dropData = name => ({ name, type: 'species', flags: {}, system: {} });
const plan = async (actor, name) => buildSpeciesReplacementPlan(actor, name, { buildContext: buildPendingSpeciesContext, applyCanonical: applyCanonicalSpeciesToActor });

function seededWookiee() {
  return (async () => {
    const actor = makeActor();
    await selectSpecies(actor, 'Wookiee');
    actor.items.push(speciesItem('sp-old', 'Wookiee'));
    actor.items.push({ id: 'blaster', type: 'weapon', name: 'Blaster Pistol', flags: {} });
    actor.flags.swse.userNote = 'keep';
    return actor;
  })();
}

// ---- Failure at every step restores the exact prior actor ----
for (const [failAt, failAfter] of [['delete', false], ['create', false], ['update', false], ['update', true]]) {
  const actor = await seededWookiee();
  const before = state(actor);
  const { mutations } = await plan(actor, 'Human');
  assert.ok(mutations.itemsToDelete?.length > 0, 'precondition: plan removes Wookiee grants');
  const engine = makeEngine(actor, { failAt, failAfter });
  await assert.rejects(
    applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData: dropData('Human'), replaceItemIds: ['sp-old'] }),
    e => e instanceof SpeciesPlanApplyError && e.rollbackComplete === true,
    `${failAt}${failAfter ? '+after' : ''}`);
  assert.deepEqual(state(actor), before, `actor unchanged after ${failAt}${failAfter ? ' (post-apply)' : ''} failure`);
}

// ---- Success: old species + grants replaced, unrelated content kept ----
{
  const actor = await seededWookiee();
  const { mutations } = await plan(actor, 'Human');
  await applySpeciesPlanWithRollback({ actor, engine: makeEngine(actor), mutations, newSpeciesItemData: dropData('Human'), replaceItemIds: ['sp-old'] });
  assert.deepEqual(actor.items.filter(i => i.type === 'species').map(i => i.name), ['Human']);
  assert.ok(actor.items.some(i => i.id === 'blaster'));
  assert.equal(actor.flags.swse.userNote, 'keep');
  const fresh = makeActor(); await selectSpecies(fresh, 'Human');
  assert.deepEqual(speciesFootprint(actor), speciesFootprint(fresh));
}

// ---- Unresolvable species is rejected before ANY engine call; no legacy fallback ----
{
  const actor = await seededWookiee();
  const before = state(actor);
  await assert.rejects(plan(actor, 'Totally Made Up Species'), /could not be resolved/);
  assert.deepEqual(state(actor), before);
}
{
  const actor = await seededWookiee();
  await assert.rejects(buildSpeciesReplacementPlan(actor, 'Human', {
    buildContext: async () => ({ identity: { name: 'Human' } }),
    applyCanonical: async () => ({ success: false, error: 'invalid snapshot' }),
  }), /invalid snapshot/);
}

// ---- Failing rollback is reported, never silent ----
{
  const actor = await seededWookiee();
  const { mutations } = await plan(actor, 'Human');
  const engine = makeEngine(actor, { failAt: 'update' });
  const original = engine.updateActor;
  engine.updateActor = async (a, f, o) => { if (String(o?.source).endsWith('-rollback')) throw new Error('rollback boom'); return original(a, f, o); };
  await assert.rejects(
    applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData: dropData('Human'), replaceItemIds: ['sp-old'] }),
    e => e instanceof SpeciesPlanApplyError && e.rollbackComplete === false && e.rollbackErrors[0].step === 'restore-fields');
}

// ---- Partial creation: some items are created, then the operation throws before returning ids ----
{
  const actor = await seededWookiee();
  const before = state(actor);
  const { mutations } = await plan(actor, 'Barabel');          // creates species item + Bite + Claws
  assert.ok((mutations.itemsToCreate || []).length >= 2, 'precondition: several items to create');
  const engine = makeEngine(actor);
  const realCreate = engine.createEmbeddedDocuments;
  engine.createEmbeddedDocuments = async (a, n, data, opts) => {
    if (String(opts?.source).endsWith('-rollback')) return realCreate(a, n, data, opts);
    await realCreate(a, n, data.slice(0, 2), opts);              // two items really created...
    throw new Error('create died after partial success');         // ...and no ids returned
  };
  await assert.rejects(
    applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData: dropData('Barabel'), replaceItemIds: ['sp-old'] }),
    e => e instanceof SpeciesPlanApplyError && e.rollbackComplete === true);
  assert.deepEqual(state(actor), before, 'partially created items are removed and the deleted ones restored');
}

// ---- Partial deletion: some items are deleted, then the operation throws ----
{
  const actor = await seededWookiee();
  const before = state(actor);
  const { mutations } = await plan(actor, 'Human');
  const engine = makeEngine(actor);
  const realDelete = engine.deleteEmbeddedDocuments;
  engine.deleteEmbeddedDocuments = async (a, n, ids, opts) => {
    if (String(opts?.source).endsWith('-rollback')) return realDelete(a, n, ids, opts);
    await realDelete(a, n, ids.slice(0, 1), opts);
    throw new Error('delete died after partial success');
  };
  await assert.rejects(
    applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData: dropData('Human'), replaceItemIds: ['sp-old'] }),
    e => e instanceof SpeciesPlanApplyError && e.rollbackComplete === true);
  assert.deepEqual(state(actor), before);
}

// ---- A rollback that cannot restore items is reported as incomplete, never silent ----
{
  const actor = await seededWookiee();
  const { mutations } = await plan(actor, 'Barabel');
  const engine = makeEngine(actor);
  const realCreate = engine.createEmbeddedDocuments;
  engine.createEmbeddedDocuments = async (a, n, data, opts) => {
    if (String(opts?.source).endsWith('-rollback')) throw new Error('cannot recreate');
    await realCreate(a, n, data.slice(0, 1), opts);
    throw new Error('create died after partial success');
  };
  await assert.rejects(
    applySpeciesPlanWithRollback({ actor, engine, mutations, newSpeciesItemData: dropData('Barabel'), replaceItemIds: ['sp-old'] }),
    e => e instanceof SpeciesPlanApplyError && e.rollbackComplete === false && e.rollbackErrors.some(x => x.step === 'recreate-deleted' || x.step === 'verify'));
}

console.log('PASS: species drop atomicity');
