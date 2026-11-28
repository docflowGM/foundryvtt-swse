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
const { FollowerCreator } = await import('../scripts/apps/follower-creator.js');
const calls = [];
const origCreate = FollowerCreator._createFollowerFromMutationBase;
const origUpdate = FollowerCreator._updateFollowerFromMutationBase;
try {
  // non-npc follower: the materializer returns immediately (no species package), so only the wrapper contract is observable
  FollowerCreator._createFollowerFromMutationBase = async (owner, m) => { calls.push(['create', owner, m]); return { type: 'character', id: 'f1' }; };
  FollowerCreator._updateFollowerFromMutationBase = async (f, m, ...rest) => { calls.push(['update', f, m, rest]); return calls.at(-1)?.fail ? false : true; };
  const created = await FollowerCreator.createFollowerFromMutation({ id: 'o' }, { x: 1 });
  assert.equal(created.id, 'f1', 'create returns the base result');
  const opts = { report: {} };
  assert.equal(await FollowerCreator.updateFollowerFromMutation({ type: 'character' }, { y: 2 }, opts), true);
  assert.equal(calls[1][3][0], opts, 'update forwards options to the base');
  FollowerCreator._createFollowerFromMutationBase = async () => null;
  assert.equal(await FollowerCreator.createFollowerFromMutation({ id: 'o' }, {}), null, 'null base result is returned without materializing');
  FollowerCreator._updateFollowerFromMutationBase = async () => false;
  assert.equal(await FollowerCreator.updateFollowerFromMutation({ type: 'npc' }, {}), false, 'failed base update is returned and never materializes');
} finally {
  FollowerCreator._createFollowerFromMutationBase = origCreate;
  FollowerCreator._updateFollowerFromMutationBase = origUpdate;
}
console.log('follower-species-materialization-folded: ok');
