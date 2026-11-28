import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Transaction & Progression SSOT: progression is DRAFT-ONLY until final confirmation. Entering (or cancelling out of) the chargen summary's "store"
// must not write the actor's wallet, flags or items. The old staging wrote `system.credits` and `flags.swse.chargenStore` on the actor before
// confirmation; shopping is now deferred until the character exists (the normal store), so a cancelled creation leaves the actor and wallet unchanged.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {}, DialogV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null, body: { appendChild() {} }, head: { appendChild() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const notes = []; globalThis.ui = { notifications: { warn: (m) => notes.push(m), info: (m) => notes.push(m), error: (m) => notes.push(m) } };

const { SummaryStep } = await import('../scripts/apps/progression-framework/steps/summary-step.js');
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const writes = [];
const saved = { updateActor: ActorEngine.updateActor, applyMutationPlan: ActorEngine.applyMutationPlan, update: ActorEngine.updateActor };
ActorEngine.updateActor = async (a, u) => { writes.push(['updateActor', u]); };
ActorEngine.applyMutationPlan = async (a, p) => { writes.push(['applyMutationPlan', p]); };
const actor = { id: 'a1', name: 'Draft', type: 'character', system: { credits: 100 }, flags: {}, items: [], getFlag() { return undefined; }, async update(d) { writes.push(['actor.update', d]); }, async setFlag(...a) { writes.push(['setFlag', a]); } };
try {
  const step = Object.create(SummaryStep.prototype);
  step._summary = { startingCredits: 3000 };
  step._creditsState = { resolved: true, amount: 3000 };
  const shell = { sessionId: 's1', progressionSession: { draftSelections: {} } };
  const result = await step.enterStore(actor, shell);
  assert.equal(writes.length, 0, `entering the store wrote to the actor: ${JSON.stringify(writes)}`);
  assert.equal(actor.system.credits, 100, 'wallet unchanged');
  assert.deepEqual(actor.flags, {}, 'no chargenStore flag');
  assert.equal(result ?? null, null, 'no store was opened against an unconfirmed actor');
  assert.ok(notes.some((m) => /after the character is created/i.test(String(m))), 'the user is told shopping opens after creation');
} finally { Object.assign(ActorEngine, { updateActor: saved.updateActor, applyMutationPlan: saved.applyMutationPlan }); }

const src = fs.readFileSync('scripts/apps/progression-framework/steps/summary-step.js', 'utf8');
assert.doesNotMatch(src, /_stageStartingCreditsForStore|chargen-store-starting-credits|'flags\.swse\.chargenStore'/, 'the pre-confirmation staging path is gone');
process.stdout.write('chargen-store-no-prefinalization-write: ok\n');
