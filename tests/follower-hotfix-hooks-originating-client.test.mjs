import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PAT-002 / F-NPC-001 (3H/3N): the follower slot-repair hooks ran (and wrote followerSlots flags) on every client for every item change.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const hooks = []; globalThis.Hooks = { on: (ev, fn) => hooks.push({ ev, fn }), once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'me', isGM: true }, actors: { get: () => null, contents: [] } };
const { registerFollowerRepeatableEntitlementHotfix } = await import('../scripts/patches/follower-repeatable-entitlement-hotfix.js');
const { registerFollowerProgressionLiveStateHotfix } = await import('../scripts/patches/follower-progression-live-state-hotfix.js');
delete globalThis[Symbol.for('swse.followerRepeatableEntitlement.v1')];
registerFollowerRepeatableEntitlementHotfix(); registerFollowerProgressionLiveStateHotfix();
const item = () => { let touched = 0; const o = { type: 'talent', name: 'Anything', get parent() { touched++; return null; }, get actor() { touched++; return null; } }; return { o, touched: () => touched }; };
let checked = 0;
for (const ev of ['createItem', 'updateItem', 'deleteItem']) for (const h of hooks.filter((x) => x.ev === ev)) {
  const a = item(); const args = ev === 'createItem' || ev === 'deleteItem' ? [a.o, {}, 'someone-else'] : [a.o, {}, {}, 'someone-else'];
  h.fn(...args); assert.equal(a.touched(), 0, `${ev}: a foreign user's item change is ignored before touching the item`); checked++;
  const b = item(); h.fn(...(ev === 'updateItem' ? [b.o, {}, {}, 'me'] : [b.o, {}, 'me'])); assert.ok(b.touched() > 0, `${ev}: own change is processed`);
}
assert.ok(checked >= 5, `checked ${checked} item listeners`);
console.log('follower-hotfix-hooks-originating-client: ok', checked);
