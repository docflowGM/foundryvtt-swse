import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// G36 GM control: an unresolved transaction surfaces "Resolve" (GM only) on the weapon; the dialog shows only admitted decisions; the decision
// goes back through InventoryEngine.reconcileWeaponRequest and clears the withholding.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { isWeaponReadied } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const { buildConceptSheetViewModel } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
const R = await import('/systems/foundryvtt-swse/scripts/sheets/v2/equipment-reconcile-dialog.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const fs = await import('node:fs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const h = installCoordinatorHarness(ActorEngine);
const mkActor = (items) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: { size: 'Medium' }, flags: { swse: {} } }; for (const i of items) i.actor = a; return a; };
const weapon = (id) => ({ id, name: 'Blade', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const history = []; const sw = { fail: 3 }; let fenceCalls = 0;
const deps = { ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false, currentUserId: () => 'gm-1',
  spendAction: async (_a, _t, meta) => { history.push(meta); return { allowed: true, committed: true }; },
  spendMarkerPresent: async (_a, id) => history.some((m) => m.requestId === id),
  fence: async () => { fenceCalls += 1; return sw.fail === 0 || fenceCalls < sw.fail; } };
const form = (v) => ({ get: (k) => v[k] ?? null });
const readinessOf = (actor) => { const vm = buildConceptSheetViewModel({ actor, inventoryPanel: new PanelContextBuilder(actor, { isEditable: true }).buildInventoryPanel() }); for (const g of vm.gear.groups) for (const e of g.entries) if (e.id === 's') return e.weaponReadiness; return null; };

// an interrupted draw: fenced before the spend -> APPLIED, unpaid, unresolved
const actor = mkActor([weapon('s')]);
const first = await InventoryEngine.requestWeaponPosture(actor, { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' }, { deps });
assert.equal(first.status, 'EXECUTOR_FENCED');
sw.fail = 0;
{
  globalThis.game.user.isGM = false;
  assert.equal(readinessOf(actor).unresolved, true); assert.equal(readinessOf(actor).canReconcile, false, 'players never see the control');
  globalThis.game.user.isGM = true;
  assert.equal(readinessOf(actor).canReconcile, true);
  assert.equal(isWeaponReadied(actor, 's', { resolveSpecies: h.deps.resolveSpecies }), false, 'withheld while unresolved');
  for (const t of ['templates/actors/character/v2-concept/partials/panels/inventory-weapon-card.hbs', 'templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs']) {
    assert.match(fs.readFileSync(t, 'utf8'), /\{\{#if entry\.weaponReadiness\.canReconcile\}\}<button[^>]*data-action="reconcile-weapon-transaction"/);
  }
  assert.match(fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8'), /\[data-action="reconcile-weapon-transaction"\]/, 'the sheet binds the action');
  ok('1: GM sees Resolve on the withheld weapon; players do not; templates and the sheet binding carry it');
}
{
  const review = await InventoryEngine.reconcileWeaponRequest(actor, first.requestId, { deps });
  const html = R.buildReconcileContent(review);
  assert.match(html, /value="compensate"/); assert.match(html, /value="finalize-without-spend"/); assert.doesNotMatch(html, /value="finalize"/);
  assert.match(html, /executor|phase APPLIED/);
  assert.equal(R.readReconcileChoice(form({ resolution: 'finalize' }), review), null, 'a decision the review did not admit is refused');
  assert.deepEqual(R.readReconcileChoice(form({ resolution: 'compensate', note: '  oops ' }), review), { resolution: 'compensate', note: 'oops' });
  ok('2: the dialog lists only admitted decisions and refuses anything else');
}
{
  const notes = [];
  const notify = { info: (m) => notes.push(['info', m]), warn: (m) => notes.push(['warn', m]) };
  assert.deepEqual(await R.reconcileItemTransactions(actor, actor.items.get('s'), { isGm: () => false, notify }), []);
  const cancelled = await R.reconcileItemTransactions(actor, actor.items.get('s'), { isGm: () => true, notify, prompt: async () => null, reconcile: (id, o) => InventoryEngine.reconcileWeaponRequest(actor, id, { ...o, deps }) });
  assert.equal(cancelled[0].status, 'CANCELLED'); assert.equal(readinessOf(actor).unresolved, true);
  const done = await R.reconcileItemTransactions(actor, actor.items.get('s'), { isGm: () => true, notify, prompt: async () => ({ resolution: 'finalize-without-spend', note: 'table ruling' }), reconcile: (id, o) => InventoryEngine.reconcileWeaponRequest(actor, id, { ...o, deps }) });
  assert.equal(done[0].status, 'RECONCILED'); assert.equal(done[0].phaseAfter, 'FINALIZED');
  assert.equal(history.length, 0, 'no action was spent');
  assert.equal(readinessOf(actor).unresolved, false); assert.equal(readinessOf(actor).canReconcile, false);
  assert.equal(isWeaponReadied(actor, 's', { resolveSpecies: h.deps.resolveSpecies }), true, 'the weapon is ready once the GM finalized it');
  assert.ok(notes.some(([k, m]) => k === 'info' && /APPLIED → FINALIZED/.test(m)));
  ok('3: non-GM refused; cancel changes nothing; a GM decision clears the withholding without spending');
}
console.log(`equipment-g36-gm-control: ${n} checks ok`);
