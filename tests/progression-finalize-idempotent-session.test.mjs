import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SSOT Priority 3: finalization is idempotent per session. The plan stamps `system.progression.completedSessionId`; re-finalizing the SAME session on
// an actor that already carries that stamp must refuse before compiling or applying anything (no duplicate credits, items or levels). It reports
// `committed: true` so the draft lifecycle never discards the actor on this refusal.
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {}, DialogV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null, body: { appendChild() {} }, head: { appendChild() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const calls = [];
const real = { compile: ProgressionFinalizer._compileMutationPlan, apply: ActorEngine.applyMutationPlan };
ProgressionFinalizer._compileMutationPlan = async () => { calls.push('compile'); throw new Error('must not compile a completed session again'); };
ActorEngine.applyMutationPlan = async () => { calls.push('apply'); throw new Error('must not apply'); };
try {
  const actor = { id: 'a1', name: 'Done', type: 'character', collection: {}, parent: null, system: { progression: { completedSessionId: 'sess-1' } }, flags: {}, items: [] };
  for (const mode of ['chargen', 'levelup']) {
    const res = await ProgressionFinalizer.finalize({ mode, sessionId: 'sess-1', progressionSession: { sessionId: 'sess-1', mode } }, actor);
    assert.equal(res.success, false); assert.equal(res.alreadyFinalized, true, JSON.stringify(res)); assert.equal(res.committed, true);
    assert.match(String(res.error), /already (been )?finalized/i);
  }
  assert.deepEqual(calls, [], 'nothing was compiled or applied');
  // a DIFFERENT session on the same actor is not blocked by the guard (it proceeds into validation and fails there for lack of a real session)
  const other = await ProgressionFinalizer.finalize({ mode: 'levelup', sessionId: 'sess-2', progressionSession: { sessionId: 'sess-2', mode: 'levelup' } }, actor);
  assert.notEqual(other.alreadyFinalized, true);
} finally { ProgressionFinalizer._compileMutationPlan = real.compile; ActorEngine.applyMutationPlan = real.apply; }
process.stdout.write('progression-finalize-idempotent-session: ok\n');
