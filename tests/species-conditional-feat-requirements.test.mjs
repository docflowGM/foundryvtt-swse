import assert from 'node:assert/strict';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// Source-pinned: Ebruchi (The Unknown Regions): Constitution 13+ -> Improved Damage Threshold.
// Codru-Ji (Legacy Era Campaign Guide): Dual Weapon Mastery when Dexterity 13+ AND base attack bonus +1.
// Gran (The Force Unleashed Campaign Guide): Precise Shot when the Gran has Point Blank Shot.
// Requirements are structured data evaluated by the existing SpeciesConditionalGrantResolver — never an unconditional grant.
const { SpeciesConditionalGrantResolver } = await import('/systems/foundryvtt-swse/scripts/engine/species/SpeciesConditionalGrantResolver.js');
const { ProgressionContentAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js');
ProgressionContentAuthority.initialize = async () => {};
ProgressionContentAuthority.getFeatDocument = async ({ name }) => ({ toObject: () => ({ name, type: 'feat', system: {}, flags: {} }) });
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

async function deferredFor(species) {
  const actor = makeActor();
  const { ctx } = await quiet(() => selectSpecies(actor, species, null, { strict: true }));
  const grants = ctx.traits.filter(t => t.classification === 'grant' && t.source === 'bonusFeat').flatMap(t => t.grants).filter(g => g.target);
  assert.ok(grants.every(g => g.frequency === 'conditional' && g.requirements.length), `${species}: never unconditional`);
  return grants.map(g => ({ name: g.target, requirements: g.requirements, species }));
}

async function reconcile(deferred, { attrs = {}, bab = 0, feats = [], trained = [] }) {
  const created = [];
  globalThis.SWSE = { ActorEngine: { async createEmbeddedDocuments(_a, _t, items) { created.push(...items.map(i => i.name)); }, async updateActor() {} } };
  const actor = {
    id: 'a', name: 'T', items: feats.map(name => ({ type: 'feat', name })),
    flags: { swse: { deferredSpeciesBonusFeats: deferred } },
    system: { derived: { attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, { total: v }])), bab }, skills: Object.fromEntries(trained.map(k => [k, { trained: true }])) },
  };
  await quiet(() => SpeciesConditionalGrantResolver.reconcile(actor));
  return created;
}

const ebruchi = await deferredFor('Ebruchi');
assert.deepEqual(ebruchi.map(g => [g.name, g.requirements]), [['Improved Damage Threshold', [{ type: 'attributeMin', attribute: 'con', min: 13 }]]]);
assert.deepEqual(await reconcile(ebruchi, { attrs: { con: 12 } }), [], 'Con 12: not granted');
assert.deepEqual(await reconcile(ebruchi, { attrs: { con: 13 } }), ['Improved Damage Threshold'], 'Con 13: granted');

const codru = await deferredFor('Codru-Ji');
assert.deepEqual(codru[0].requirements, [{ type: 'attributeMin', attribute: 'dex', min: 13 }, { type: 'baseAttackMin', min: 1 }]);
assert.deepEqual(await reconcile(codru, { attrs: { dex: 13 }, bab: 0 }), [], 'Dex 13 alone is not enough');
assert.deepEqual(await reconcile(codru, { attrs: { dex: 12 }, bab: 1 }), [], 'BAB +1 alone is not enough');
assert.deepEqual(await reconcile(codru, { attrs: { dex: 13 }, bab: 1 }), ['Dual Weapon Mastery']);

const gran = await deferredFor('Gran');
assert.deepEqual(gran[0].requirements, [{ type: 'featOwned', feat: 'Point Blank Shot' }]);
assert.deepEqual(await reconcile(gran, {}), [], 'without Point Blank Shot: not granted');
assert.deepEqual(await reconcile(gran, { feats: ['Point Blank Shot'] }), ['Precise Shot']);

// A printed "may take" option is NOT an automatic grant (Tof: Mighty Swing with Martial Arts I and Strength 13).
assert.deepEqual((await deferredFor('Tof')).map(g => g.name), [], 'Tof: Mighty Swing is an option, never auto-granted');
console.log('PASS: species conditional feat requirements');
