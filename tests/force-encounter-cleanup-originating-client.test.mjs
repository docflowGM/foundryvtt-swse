import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-FRC-006 (Phase 3D): the deleteCombat Force cleanup ran on every client. Only the originating user's client may run it, and only on actors it owns.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const handlers = {}; globalThis.Hooks = { on: (ev, fn) => { (handlers[ev] ??= []).push(fn); }, once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'me', isGM: true } };
const AE = (await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js')).ActorEngine;
const calls = [];
AE.unsetActorFlag = async (actor, scope, key) => { calls.push(`${actor.id}:${scope}.${key}`); };
const { ForceExecutor, registerForceExecutorChatHooks } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
ForceExecutor.resetForceFlowTemporaryForcePoints = async (actor) => { calls.push(`${actor.id}:reset`); };
registerForceExecutorChatHooks();
const handler = handlers.deleteCombat?.[0]; assert.ok(handler, 'deleteCombat listener registered');
const combat = (actors) => ({ id: 'c1', combatants: actors.map((a) => ({ actor: a })) });
const mine = { id: 'a1', isOwner: true }, notMine = { id: 'a2', isOwner: false };

await handler(combat([mine]), {}, 'someone-else');
assert.equal(calls.length, 0, 'a foreign user\'s combat deletion performs no cleanup on this client');
await handler(combat([mine, notMine]), {}, 'me');
assert.ok(calls.some((c) => c.startsWith('a1:')), 'originating client cleans the actors it owns');
assert.ok(!calls.some((c) => c.startsWith('a2:')), 'actors the user cannot modify are skipped');
console.log('force-encounter-cleanup-originating-client: ok');
