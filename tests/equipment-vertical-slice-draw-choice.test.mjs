import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Equipment vertical slice: the sheet's Draw button on a stowed weapon gets CHOICE_REQUIRED, asks for hands + grip, and the follow-up (same request
// id) commits a verified READIED weapon with one action spend; Stow returns it. The dialog markup is built only from the coordinator's choices.
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
const D = await import('/systems/foundryvtt-swse/scripts/sheets/v2/weapon-posture-choice-dialog.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const h = installCoordinatorHarness(ActorEngine);
const mkActor = (items) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: { size: 'Medium' }, flags: { swse: {} } }; for (const i of items) i.actor = a; return a; };
const weapon = (id) => ({ id, name: 'Blade', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const spends = [];
const deps = { ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false,
  spendAction: async (_a, type, meta) => { spends.push({ type, meta }); return { allowed: true, committed: true }; }, spendMarkerPresent: async () => false };
const form = (values) => ({ get: (k) => (Array.isArray(values[k]) ? values[k][0] : values[k]) ?? null, getAll: (k) => (Array.isArray(values[k]) ? values[k] : values[k] ? [values[k]] : []) });

{
  const choices = [{ id: 'appendageIds', options: [{ id: 'natural-arm-1', functionalState: 'functional' }, { id: 'natural-arm-2', functionalState: 'impaired' }] }, { id: 'grip', options: ['one-handed', 'two-handed'] }];
  const html = D.buildPostureChoiceContent(choices);
  assert.match(html, /value="natural-arm-1"/); assert.match(html, /Natural Arm 2 <em>\(impaired\)<\/em>/); assert.match(html, /name="grip" value="two-handed"/);
  assert.doesNotMatch(html, /checked/, 'nothing is pre-selected');
  assert.equal(D.readPostureChoice(form({ grip: 'one-handed' }), choices), null, 'missing hands -> incomplete');
  assert.equal(D.readPostureChoice(form({ appendageIds: ['natural-arm-1'] }), choices), null, 'missing grip -> incomplete');
  assert.deepEqual(D.readPostureChoice(form({ appendageIds: ['natural-arm-1', 'natural-arm-2'], grip: 'two-handed' }), choices), { appendageIds: ['natural-arm-1', 'natural-arm-2'], grip: 'two-handed' });
  assert.match(D.buildPostureChoiceContent([{ id: 'x', options: ['<script>'] }, { id: 'grip', options: ['<b>'] }]), /&lt;b&gt;/);
  ok('1: dialog shows only the coordinator options, nothing pre-selected, escaped; incomplete picks are refused');
}
{
  const actor = mkActor([weapon('s')]);
  let asked = null; let firstId = null;
  const prompt = async (_item, choices) => { asked = choices.map((c) => c.id); return null; };
  const cancelled = await D.requestWithPostureChoices(actor.items.get('s'), async () => { const r = await InventoryEngine.toggleWeaponReadied(actor, 's', { deps }); firstId = r.requestId; return r; }, () => assert.fail('no follow-up on cancel'), { prompt });
  assert.deepEqual(asked, ['appendageIds', 'grip']); assert.equal(cancelled.cancelled, true); assert.ok(firstId);
  assert.equal(actor.items.get('s').system.weaponPosture, 'STOWED'); assert.equal(spends.length, 0);
  ok('2: cancelling the choice changes nothing and spends nothing');
}
{
  const actor = mkActor([weapon('s')]);
  let firstId = null; let followId = null;
  const prompt = async () => ({ appendageIds: ['natural-arm-1'], grip: 'one-handed' });
  const drawn = await D.requestWithPostureChoices(actor.items.get('s'),
    async () => { const r = await InventoryEngine.toggleWeaponReadied(actor, 's', { deps }); firstId = r.requestId; return r; },
    (choice) => { followId = choice.requestId; return InventoryEngine.setWeaponReadied(actor, 's', true, { ...choice, deps }); }, { prompt });
  assert.equal(drawn.status, 'COMMITTED', JSON.stringify(drawn.message));
  assert.equal(followId, firstId, 'the follow-up keeps the request id'); assert.equal(drawn.requestId, firstId);
  assert.equal(actor.items.get('s').system.weaponPosture, 'READIED');
  assert.equal(isWeaponReadied(actor, 's', { resolveSpecies: h.deps.resolveSpecies }), true, 'combat readiness sees the weapon as ready');
  assert.equal(spends.length, 1); assert.equal(spends[0].type, 'move');
  const stowed = await InventoryEngine.toggleWeaponReadied(actor, 's', { deps });
  assert.equal(stowed.status, 'COMMITTED'); assert.equal(actor.items.get('s').system.weaponPosture, 'STOWED');
  assert.equal(isWeaponReadied(actor, 's', { resolveSpecies: h.deps.resolveSpecies }), false);
  assert.equal(spends.length, 2);
  ok('3: draw -> choose -> READIED (verified, one Move spend, same id) -> stow -> STOWED');
}
console.log(`equipment-vertical-slice-draw-choice: ${n} checks ok`);
