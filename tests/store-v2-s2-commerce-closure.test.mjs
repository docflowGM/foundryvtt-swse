import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store V2: every acquisition path has a defined price authority. Customized purchases and Store-originated custom
// droids have none yet, so they must fail closed; pending-droid approval never debits silently.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.utils ??= {};
globalThis.foundry.utils.deepClone ??= v => JSON.parse(JSON.stringify(v));
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: B => class extends B {}, DialogV2: class {} };
const notes = [];
globalThis.ui = { notifications: { warn: m => notes.push(['warn', m]), info: m => notes.push(['info', m]), error: m => notes.push(['error', m]) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll() {}, on() {} };
globalThis.game = { ...(globalThis.game ?? {}), user: { isGM: true, id: 'gm' }, items: { get: () => null, contents: [] }, actors: { contents: [], get: () => null },
  settings: { settings: { has: () => true }, get: () => 0, set: async () => {} } };

const { addItemToCart, createItemPlans, buildDroidWithBuilder } = await import('/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js');
const { verifyApprovalQuote } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-approval-quote.js');
let n = 0; const ok = m => console.log(`  [${++n}] ${m} OK`);

// P2: customized purchases fail closed everywhere
{
  const listing = { id: 'w1', name: 'Blaster', type: 'weapon', finalCost: 500, costStatus: 'priced' };
  const store = { cart: { items: [], droids: [], vehicles: [] }, itemsById: new Map([['w1', listing]]) };
  await addItemToCart(store, 'w1', null, { stagedCustomization: { itemData: {}, baseCost: 500, customizationCost: 1, finalCost: 501 }, costOverride: 1 });
  assert.equal(store.cart.items.length, 0, 'a staged customization is not added to the cart');
  await addItemToCart(store, 'w1', null, { costOverride: 1 });
  assert.equal(store.cart.items.length, 0, 'a client price override is not accepted');
  await addItemToCart(store, 'w1', null);
  assert.equal(store.cart.items[0].cost, 500, 'the merchant offer is the price');
  assert.throws(() => createItemPlans([{ id: 'w1', name: 'Blaster (Customized)', cost: 501, stagedCustomization: { itemData: { name: 'x', type: 'weapon' } } }]), /no authoritative quote/);
  const inv = new Map([['w1', listing]]);
  const v = verifyApprovalQuote({ costCredits: 501, approvalItems: [{ id: 'w1', name: 'Blaster (Customized)', finalCost: 501, stagedCustomization: { itemData: {} } }] }, inv);
  assert.equal(v.ok, false); assert.match(v.reasons[0], /CUSTOMIZATION_QUOTE_UNVERIFIABLE/);
  const wb = fs.readFileSync('scripts/apps/customization/item-customization-workbench.js', 'utf8');
  const stage = wb.slice(wb.indexOf('async _stageCurrentItemToCart('), wb.indexOf('async _openColorPickerDialog('));
  assert.doesNotMatch(stage, /onStage|cartEntry/, 'the workbench no longer stages priced customizations into the Store cart');
  ok('customized purchases: not stageable, not addable, not plannable, not approvable; client price override ignored');
}

// P1: Store-originated custom droid construction runs only through the verified lifecycle (see store-v2-droid-construction.test.mjs)
{
  const co = fs.readFileSync('scripts/apps/store/store-checkout.js', 'utf8');
  const fn = co.slice(co.indexOf('export async function buildDroidWithBuilder('), co.indexOf('\n}\n', co.indexOf('export async function buildDroidWithBuilder(')));
  assert.match(fn, /beginStoreDroidConstruction\(/, 'the builder is launched only with a one-shot Store authorization');
  const fin = fs.readFileSync('scripts/apps/progression-framework/shell/progression-finalizer.js', 'utf8');
  assert.match(fin, /domain === 'droidBuilder'[\s\S]{0,200}submitStoreDroidConstruction/, 'droidBuilder single-step finalization queues a quoted request, never an actor');
  assert.doesNotMatch(fin.slice(fin.indexOf("if (domain === 'droidBuilder')"), fin.indexOf('const mutationPlan = await this._compileSingleStepMutationPlan')), /createActor|ActorEngine|executeMutationTransaction/, 'finalizer creates no actor and charges nothing');
  ok('Store Build Droid: authorized launch -> quoted pending request; the finalizer creates nothing and charges nothing');
}

// P1: pending-droid approval is never a silent or zero-cost debit
{
  const g = fs.readFileSync('scripts/ui/shell/gm/GMApprovalOperationsService.js', 'utf8');
  const fn = g.slice(g.indexOf('static async approveDroid('), g.indexOf('static async rejectDroid('));
  assert.match(fn, /if \(!\(cost > 0\)\)/, 'no zero/invalid-cost approval');
  assert.ok(fn.indexOf('DialogV2.confirm') > 0 && fn.indexOf('DialogV2.confirm') < fn.indexOf('executeAssetApprovalTransaction('), 'GM authorizes the exact amount before any debit');
  assert.match(fn, /priceAuthority: 'gm-authorized-declared-cost'/, 'authorization is recorded in the transaction audit');
  assert.match(fn, /stateMode !== 'PENDING'/, 'only a PENDING droid can be approved (no duplicate delivery)');
  ok('pending droid approval: refuses zero/missing cost, requires explicit GM authorization of the amount, records it, only from PENDING');
}
console.log(`store-v2-s2-commerce-closure: ${n} checks ok`);

// P5: the vehicle condition is part of every stage of the chain and never silently becomes 'new'
{
  const vf = fs.readFileSync('scripts/engine/vehicles/vehicle-factory.js', 'utf8');
  assert.match(vf, /condition !== 'new' && condition !== 'used'\) throw/, 'factory refuses a missing/invalid condition');
  const eng = fs.readFileSync('scripts/engine/store/store-engine.js', 'utf8');
  assert.match(eng, /condition: item\.condition \|\| null/, 'the transaction audit records each line\'s condition');
  const co = fs.readFileSync('scripts/apps/store/store-checkout.js', 'utf8');
  assert.match(co, /condition: vehicle\.condition\s*\n\s*\}\);/, 'checkout passes the cart condition (not a default) to the factory');
  assert.match(co, /condition: entry\.condition \|\| null/, 'approval requests record the condition');
  console.log('  vehicle condition chain guards OK');
}
