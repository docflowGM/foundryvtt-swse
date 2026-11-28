import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// AE characterization (RETAIN_PENDING_PARITY): ActorEngine.applyDelta has no remaining callers in scripts/ (3O dead-code candidate); its guardrails stay
// pinned until the 3O decision (public API: macros may reach it). Derived writes are rejected; set/add/delete route through the engine's own methods.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const l of ['info', 'warn', 'error', 'debug', 'log']) if (SWSELogger[l]) SWSELogger[l] = () => {};

const log = [];
const saved = {};
for (const k of ['updateActor', 'createEmbeddedDocuments', 'deleteEmbeddedDocuments']) saved[k] = ActorEngine[k];
ActorEngine.updateActor = async (a, u) => { log.push(['update', u]); };
ActorEngine.createEmbeddedDocuments = async (a, t, d) => { log.push(['create', t, d]); };
ActorEngine.deleteEmbeddedDocuments = async (a, t, ids) => { log.push(['delete', t, ids]); };
try {
  const actor = { name: 'T', items: [{ id: 't1', type: 'talent', system: { ssotId: 'x' } }, { id: 'f1', type: 'feat', system: { ssotId: 'y' } }, { id: 'f2', type: 'feat', system: { ssotId: 'z' } }] };
  assert.equal(await ActorEngine.applyDelta(actor, null), undefined, 'empty delta is a no-op');
  await assert.rejects(() => ActorEngine.applyDelta(actor, { derived: { x: 1 } }), /ARCHITECTURE VIOLATION/);
  await assert.rejects(() => ActorEngine.applyDelta(actor, { set: { 'system.derived.bab': 3 } }), /derived field/);
  await assert.rejects(() => ActorEngine.applyDelta(actor, { set: 'nope' }), /Invalid delta\.set/);
  assert.equal(log.length, 0, 'rejected deltas wrote nothing');
  await ActorEngine.applyDelta(actor, { set: { 'system.credits': 5 }, add: { talents: ['tal'], feats: ['fe'], skills: ['acrobatics'] }, delete: { talents: ['x'], feats: ['y'] } });
  assert.deepEqual(log.map((l) => l[0]), ['update', 'create', 'create', 'update', 'delete', 'delete']);
  assert.deepEqual(log[0][1], { 'system.credits': 5 });
  assert.deepEqual(log[1][2], [{ type: 'talent', name: 'tal', system: { ssotId: 'tal' } }]);
  assert.deepEqual(log[3][1], { 'system.progression.skills.acrobatics': 1 });
  assert.deepEqual(log[4][2], ['t1']); assert.deepEqual(log[5][2], ['f1']);
} finally { Object.assign(ActorEngine, saved); }
console.log('actor-engine-apply-delta-characterization: ok');
