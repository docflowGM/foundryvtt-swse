/** Follower species materialization is folded into FollowerCreator (F-PAT-002): wrappers call the base, then materialize only on success. */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }), addEventListener() {}, body: {}, head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
import fs from 'node:fs';
const { FollowerCreator } = await import('../scripts/apps/follower-creator.js');
// F-PAT-002: follower feat de-duplication is part of FollowerCreator._addFeatByName (was a runtime wrapper in the sheet-parity hotfix)
const base = FollowerCreator._addFeatByNameBase; const added = [];
try {
  FollowerCreator._addFeatByNameBase = async (f, name, meta) => { added.push([name, meta]); return true; };
  const follower = { items: [{ type: 'feat', name: "Dodge" }, { type: 'talent', name: 'Armored Defense' }] };
  assert.equal(await FollowerCreator._addFeatByName(follower, ' dodge '), false, 'owned feat (normalized) is not re-added');
  assert.equal(await FollowerCreator._addFeatByName(follower, 'Armored Defense', { m: 1 }), true, 'a talent of the same name does not block a feat grant');
  assert.deepEqual(added, [['Armored Defense', { m: 1 }]]);
  assert.equal(await FollowerCreator._addFeatByName({ items: [{ type: 'feat', name: "Weapon Focus" }] }, 'Weapon  Focus'), false);
} finally { FollowerCreator._addFeatByNameBase = base; }
// The sheet-parity hotfix no longer patches the NPC sheet prototype or FollowerCreator; the sheet calls the module directly.
const hot = fs.readFileSync('scripts/patches/follower-npc-sheet-parity-hotfix.js', 'utf8');
assert.ok(!/SWSEV2NpcSheet|\.prototype|FollowerCreator/.test(hot.replace(/\/\/.*$/gm, '')), 'hotfix has no sheet/creator patching left');
const sheet = fs.readFileSync('scripts/sheets/v2/npc-actor-sheet.js', 'utf8');
assert.match(sheet, /async _prepareContext\(options = \{\}\) \{\s*const context = await super\._prepareContext\(options\);\s*return applyFollowerContext\(context, this\.actor\);/);
assert.match(sheet, /_wireNpcConceptSheetEventsBase\(root, signal\)/);
console.log('follower-sheet-parity-folded: ok');
