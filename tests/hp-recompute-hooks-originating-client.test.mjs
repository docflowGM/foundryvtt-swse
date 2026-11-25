import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Phase 3F/3D multi-client gate: HPRecomputeHooks listeners must act only on the originating user's client.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const handlers = []; globalThis.Hooks = { on: (ev, fn) => handlers.push({ ev, fn }), once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'me', isGM: false } };
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
let recomputes = 0;
ActorEngine.recomputeHP = async () => { recomputes++; };
ActorEngine.isActorMutationInFlight = () => false;
const { HPRecomputeHooks } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/hp-recompute-hooks.js');
HPRecomputeHooks._initialized = false; HPRecomputeHooks.initialize?.() ?? HPRecomputeHooks.register?.();
assert.ok(handlers.length >= 4, `registered updateActor + 3 item listeners (got ${handlers.length})`);
const actor = { id: 'a1', name: 'A', isToken: false };
const item = { actor, name: 'Toughness', type: 'feat', system: {} };
const call = (ev, user) => { const h = handlers.find((x) => x.ev === ev).fn; return ev === 'updateActor' ? h(actor, { system: { level: 2 } }, {}, user) : ev === 'updateItem' ? h(item, {}, {}, user) : h(item, {}, user); };
for (const ev of ['updateActor']) { recomputes = 0; await call(ev, 'someone-else'); assert.equal(recomputes, 0, `${ev}: foreign user ignored`); await call(ev, 'me'); assert.equal(recomputes, 1, `${ev}: own change recomputes`); }
let itemCalls = 0; HPRecomputeHooks._handleItemChange = async () => { itemCalls++; };
for (const ev of ['createItem', 'updateItem', 'deleteItem']) { itemCalls = 0; await call(ev, 'someone-else'); assert.equal(itemCalls, 0, `${ev}: foreign user ignored`); await call(ev, 'me'); assert.equal(itemCalls, 1, `${ev}: own change handled`); }
console.log('hp-recompute-hooks-originating-client: ok');
