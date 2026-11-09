import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Possessions browser (Gear tab): seven tabs over ONE list of owned Items + linked droid/vehicle actors. Presentation only: categories come from the
// rows' resolved flags, droids/vehicles from the Asset Bay association authority; nothing is inferred from world-visible actors.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const { buildEquipmentWorkspace, WORKSPACE_TABS, tabOfCategory } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-context.js');
const { listOwnedAssets } = await import('/systems/foundryvtt-swse/scripts/ui/shell/AssetBaySurfaceService.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const row = (o) => ({ img: '', typeLabel: o.type, quantity: 1, weight: 1, value: 0, tags: [], equipped: false, ...o });
const rows = [
  row({ id: 'w1', name: 'Lightsaber', type: 'weapon', isLightsaber: true }), row({ id: 'w2', name: 'Blaster', type: 'weapon' }),
  row({ id: 'a1', name: 'Flight Suit', type: 'armor', equipped: true }), row({ id: 's1', name: 'Energy Shield', type: 'armor', isEnergyShield: true, equipped: true }),
  row({ id: 'g1', name: 'Medpac', type: 'equipment', quantity: 3 }), row({ id: 'g2', name: 'Implant', type: 'equipment', isImplant: true, isActiveImplant: true }),
];
const vm = (extra = {}) => buildEquipmentWorkspace({ id: 'x', items: [] }, { groups: [{ entries: rows }, { entries: [rows[0]] }], readiness: { state: null }, isGM: true, ...extra });
const asset = (o) => ({ isLinked: true, canOpenSheet: true, kindLabel: 'Droid', detail: 'd', status: 'HP 1/1', img: '', ...o });

// 1. tabs: exact order, All last, droids/vehicles always present
assert.deepEqual(WORKSPACE_TABS.map((t) => t.id), ['weapons', 'armor', 'shields', 'gear', 'droids', 'vehicles', 'all']);
const empty = vm();
assert.deepEqual(empty.tabs.map((t) => t.id), ['weapons', 'armor', 'shields', 'gear', 'droids', 'vehicles', 'all']);
assert.equal(empty.tabs.find((t) => t.id === 'droids').count, 0); assert.equal(empty.tabs.find((t) => t.id === 'vehicles').count, 0);
ok('seven tabs in the required order; empty Droids/Vehicles tabs are kept');

// 2. category mapping: shield separate from armor, implants are gear, no duplicate from repeated sheet groups
const c = Object.fromEntries(empty.tabs.map((t) => [t.id, t.count]));
assert.deepEqual(c, { weapons: 2, armor: 1, shields: 1, gear: 2, droids: 0, vehicles: 0, all: 6 });
assert.equal(empty.entries.filter((e) => e.tab === 'shields').map((e) => e.name).join(), 'Energy Shield');
assert.ok(!empty.entries.filter((e) => e.tab === 'armor').some((e) => e.name === 'Energy Shield'));
assert.equal(empty.entries.find((e) => e.id === 'g2').tab, 'gear'); assert.equal(tabOfCategory('implants'), 'gear');
assert.equal(new Set(empty.entries.map((e) => e.key)).size, empty.entries.length);
ok('weapons/lightsabers, armor vs shield, gear incl. implants; a row repeated across groups is listed once');

// 3. linked assets: references to actors, separate from Items and carried weight; All is the union
const withAssets = vm({ assets: [asset({ bayMode: 'garage', actorId: 'd1', uuid: 'Actor.d1', name: 'R5-D4' }), asset({ bayMode: 'shipyard', actorId: 'v1', uuid: 'Actor.v1', name: 'Ebon Hawk', kindLabel: 'Ship / Vehicle' }), asset({ bayMode: 'garage', actorId: 'd1', uuid: 'Actor.d1', name: 'R5-D4' })] });
const cc = Object.fromEntries(withAssets.tabs.map((t) => [t.id, t.count]));
assert.equal(cc.droids, 1); assert.equal(cc.vehicles, 1); assert.equal(cc.all, 8, 'a duplicated association record is listed once');
const droid = withAssets.entries.find((e) => e.kind === 'droid');
assert.equal(droid.key, 'droid:Actor.d1'); assert.equal(droid.weight, null); assert.equal(droid.quantity, null); assert.equal(droid.isAsset, true);
assert.equal(withAssets.items.length, 6, 'assets are never converted to inventory Items (no inspector entry, no weight)');
assert.ok(withAssets.entries.some((e) => e.kind === 'vehicle' && e.tab === 'vehicles'));
ok('droids/vehicles appear as actor references: no Item, no weight/quantity, de-duplicated; All = union');

// 4. unresolved association is shown but cannot be opened; sheet-open needs an established link
const unresolved = vm({ assets: [asset({ bayMode: 'shipyard', actorId: 'v9', name: 'Lost', isLinked: false, canOpenSheet: false, status: 'Link unresolved' })] }).entries.find((e) => e.id === 'v9');
assert.equal(unresolved.canOpen, false); assert.equal(unresolved.statusLabel, 'Link unresolved');
ok('an unresolved link is not openable');

// 5. association authority: only established links; a visible world actor is not a possession
globalThis.game = {
  user: { isGM: false },
  actors: { contents: [], get: (id) => ({ d1: { id: 'd1', uuid: 'Actor.d1', name: 'R5-D4', type: 'droid', img: '', system: {}, isOwner: true }, d2: { id: 'd2', uuid: 'Actor.d2', name: 'Stranger Droid', type: 'droid', img: '', system: {}, isOwner: true } }[id] ?? null) },
};
const owner = { id: 'pc', type: 'character', system: { ownedActors: [{ id: 'd1', type: 'droid' }] }, getFlag: () => null, items: [] };
const linked = listOwnedAssets(owner, { user: globalThis.game.user });
assert.deepEqual(linked.map((a) => a.actorId), ['d1']); assert.equal(linked[0].bayMode, 'garage');
assert.deepEqual(listOwnedAssets({ ...owner, system: {} }, { user: globalThis.game.user }), [], 'a droid the user can see/own, but that is not linked, is not a possession');
ok('listOwnedAssets reuses the Asset Bay association: linked droid only; unlinked visible actors excluded');

// 6. static: presentation-only; seven tabs; assets via the shared authority; no second list
{
  const ui = fs.readFileSync('scripts/sheets/v2/character-sheet/equipment-workspace-ui.js', 'utf8');
  const tpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  const cx = fs.readFileSync('scripts/sheets/v2/character-sheet/concept-context.js', 'utf8');
  assert.ok(cx.includes('listOwnedAssets(actor)'));
  assert.ok(!/ownedActors|game\.actors\.contents|ownerActorId/.test(ui + fs.readFileSync('scripts/sheets/v2/character-sheet/equipment-workspace-context.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no ownership inference in the UI or view model');
  assert.equal((tpl.match(/data-eqw-list/g) ?? []).length, 1, 'one list');
  assert.ok(tpl.includes('data-eqw-status') && tpl.includes('data-eqw-sort') && tpl.includes('data-eqw-dir') && tpl.includes('data-eqw-reset') && tpl.includes('data-eqw-count'));
  assert.ok(ui.includes("const TABS = ['weapons', 'armor', 'shields', 'gear', 'droids', 'vehicles', 'all']"));
  assert.ok(/data-eqw-open-asset/.test(ui) && /sheet\.render\(true\)/.test(ui), 'assets open the existing actor sheet');
  assert.ok(!/gear-tab[\s\S]*inventory-panel/.test(fs.readFileSync('templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs', 'utf8')), 'no legacy inventory beneath the workspace');
}
ok('static: one list and toolbar, seven tabs, association via the Asset Bay, no ownership inference or legacy inventory');

// 7. contextual inspector: zero space until a selection exists, X closes it, assets get an actor summary, a11y hooks present
{
  const tpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  const css = fs.readFileSync('styles/sheets/equipment-workspace.css', 'utf8');
  const ui = fs.readFileSync('scripts/sheets/v2/character-sheet/equipment-workspace-ui.js', 'utf8');
  assert.match(tpl, /<aside[^>]*data-eqw-inspector[^>]* hidden>/, 'inspector starts hidden');
  assert.ok(!tpl.includes('swse-eqw__overview') && !tpl.includes('data-eqw-detail-empty'), 'no placeholder panel');
  assert.ok(/\.swse-eqw\.has-selection \.swse-eqw__layout \{ grid-template-columns: minmax\(0, 2fr\) minmax\(280px, 1fr\)/.test(css));
  assert.ok(/\.swse-eqw__inspector\[hidden\] \{ display: none !important/.test(css));
  assert.ok(/\.swse-eqw__layout \{ display: grid; grid-template-columns: minmax\(0, 1fr\)/.test(css), 'full width by default');
  assert.equal((tpl.match(/data-eqw-close/g) ?? []).length >= 2, true, 'items and linked actors both have an X');
  assert.ok(tpl.includes('data-eqw-detail="asset:{{it.id}}"') && tpl.includes('data-eqw-open-asset'));
  assert.ok(tpl.includes('swse-eqw__quick'), 'quick actions');
  const quick = tpl.slice(tpl.indexOf('QUICK ACTIONS'), tpl.indexOf('role="tablist" aria-label="Inspector sections"'));
  for (const a of [...quick.matchAll(/data-action="([a-z-]+)"/g)].map((m) => m[1])) assert.ok(tpl.indexOf(`data-action="${a}"`) !== tpl.lastIndexOf(`data-action="${a}"`), `quick action ${a} reuses the Operations handler (same data-action)`);
  assert.ok(ui.includes('function closeInspector') && ui.includes('selectionExists') && ui.includes("'ArrowRight'") && ui.includes('tabIndex'), 'close, invalid-selection cleanup, keyboard tab navigation');
  assert.ok(!/\.update\(|setFlag|ActorEngine/.test(ui));
}
ok('static: inspector hidden by default / zero space, 2fr:1fr when selected, X on items and actors, quick actions reuse handlers, keyboard + cleanup present');

// 8. equipped protection cards select the item when occupied and only switch category when empty; orphaned legacy inventory templates are gone
{
  const tpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  assert.ok(tpl.includes('{{#if pa.item}}data-eqw-select="{{pa.item.id}}" aria-controls="eqw-inspector"{{else}}data-eqw-station="armor"{{/if}}'));
  assert.ok(tpl.includes('{{#if ps.item}}data-eqw-select="{{ps.item.id}}" aria-controls="eqw-inspector"{{else}}data-eqw-station="shields"{{/if}}'));
  const a = vm({}); // vm() rows include a worn armor and a worn energy shield
  assert.equal(a.protection.armor.item?.id, 'a1'); assert.equal(a.protection.shield.item?.id, 's1');
  for (const n of ['inventory-panel', 'equipment-ledger-panel', 'armor-summary-panel', 'inventory-weapon-card', 'inventory-armor-card', 'inventory-item-card', 'inventory-item-row']) {
    assert.ok(!fs.existsSync(`templates/actors/character/v2-concept/partials/panels/${n}.hbs`), `${n}.hbs pruned`);
    for (const f of ['scripts/load-templates.js', 'helpers/handlebars/partials-auto.js']) assert.ok(!fs.readFileSync(f, 'utf8').includes(`v2-concept/partials/panels/${n}.hbs`), `${f} no longer lists ${n}`);
  }
}
ok('static: occupied Armor/Shield cards select the item (empty ones switch category); seven orphaned legacy inventory templates and their preload/registry entries are gone');
console.log(`equipment-possessions-browser: ${n} checks ok`);
