import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-FEA-001 (Phase 3F.2): the feat normalization listeners ran on EVERY client for every item create/update, so each client issued the
// same ActorEngine write. They must act only on the client whose user originated the change (hook arg `userId`).
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const captured = [];
globalThis.Hooks = { on: (ev, fn) => captured.push({ ev, fn }), once: () => {}, callAll: () => {}, call: () => {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { id: 'me', isGM: false } };
const dir = 'scripts/engine/feats/';
const files = fs.readdirSync(dir).filter((f) => /normalization-hooks\.js$|ability-meta-schema-default-hooks\.js$/.test(f));
assert.ok(files.length >= 44, `expected the 44+ feat listener modules, found ${files.length}`);
let handlers = 0;
for (const f of files) {
  const mod = await import(`/systems/foundryvtt-swse/${dir}${f}`);
  const register = Object.values(mod).find((v) => typeof v === 'function' && /^register/.test(v.name));
  assert.ok(register, `${f} exports a register function`);
  const before = captured.length; register();
  const mine = captured.slice(before).filter((h) => h.ev === 'createItem' || h.ev === 'updateItem');
  assert.equal(mine.length, 2, `${f} registers one createItem and one updateItem listener`);
  for (const h of mine) {
    handlers++;
    let touched = false;
    const item = new Proxy({ type: 'feat', name: 'X', id: 'i1', system: {}, get actor() { touched = true; return null; } }, {});
    // a change made by ANOTHER user must not reach the item at all
    const args = h.ev === 'createItem' ? [item, {}, 'someone-else'] : [item, {}, {}, 'someone-else'];
    const r = await h.fn(...args);
    assert.equal(r, false, `${f} ${h.ev}: foreign-user change is ignored`);
    assert.equal(touched, false, `${f} ${h.ev}: foreign-user change never inspects the item`);
    // the originating client still runs the handler
    touched = false;
    const own = h.ev === 'createItem' ? [item, {}, 'me'] : [item, {}, {}, 'me'];
    await h.fn(...own);
    assert.equal(touched, true, `${f} ${h.ev}: originating client still evaluates the item`);
  }
}
console.log(`feat-normalization-hooks-originating-client: ok (${files.length} modules, ${handlers} listeners)`);
