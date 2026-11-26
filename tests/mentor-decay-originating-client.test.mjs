import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-MEN-004 (3K): mentor commitment decay ran on every client from the updateActor hook. Only the originating user's client decays.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const hooks = {}; globalThis.Hooks = { on: (ev, fn) => { (hooks[ev] ??= []).push(fn); }, once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'me', isGM: false } };
const writes = []; const reads = [];
const actor = { id: 'a1', name: 'A', type: 'character', system: { level: 3 }, getFlag: () => { reads.push('read'); return {}; }, setFlag: async (...a) => { writes.push(a); } };
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
ActorEngine.updateActorFlags = async (...a) => { writes.push(a); };
const { HooksRegistry } = await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js');
const captured = {}; HooksRegistry.register = (ev, fn, meta) => { (captured[ev] ??= []).push({ fn, meta }); };
const { registerMentorSheetHooks } = await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/mentor-sheet-hooks.js');
registerMentorSheetHooks();
const h = captured.updateActor?.find((x) => x.meta?.id === 'swse-mentor-decay')?.fn;
assert.ok(h, 'updateActor decay listener registered');
const lvl = (n) => ({ system: { level: n } });
actor.system.level = 2; await h(actor, lvl(2), {}, 'me');            // seed tracked level
actor.system.level = 3; await h(actor, lvl(3), {}, 'someone-else');   // foreign user's level-up
assert.equal(reads.length, 0, 'a level-up made by another user does not run the decay on this client');
actor.system.level = 4; await h(actor, lvl(4), {}, 'me');
assert.ok(reads.length > 0, 'the originating client still runs the decay');
console.log('mentor-decay-originating-client: ok');
