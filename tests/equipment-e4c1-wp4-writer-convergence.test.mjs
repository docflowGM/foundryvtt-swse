import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP4 (NOT CONVERGED): legacy weapon-state writers are retired or rerouted to the single equipment-state coordinator.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { SWSEActorBase } = await import('/systems/foundryvtt-swse/scripts/actors/base/swse-actor-base.js');
const J = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js');
const { fingerprintIntent } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const tracked = execFileSync('git', ['ls-files', 'scripts', 'templates', 'index.js'], { cwd: new URL('..', import.meta.url).pathname }).toString().split('\n').filter(Boolean);

const spent = []; let allow = true;
ActionEconomyConsumption.spend = async (_a, type) => { if (!allow) return { allowed: false }; spent.push(type); return { allowed: true }; };
const h = installCoordinatorHarness(ActorEngine);
const opts = { deps: h.deps };
const mkActor = (items, extra = {}) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: { size: 'Medium' }, flags: {}, ...extra }; for (const i of items) i.actor = a; return a; };
const weapon = (id, system = {}, extra = {}) => ({ id, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: extra.key ?? 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...system } });
const OWNED = ['system.weaponPosture', 'system.weaponOccupancy', 'flags.swse.fireState.wielded', 'flags.swse.fireState.v'];

// ------------------------------------------------------------------------------------------------ static convergence guards
{
  const writers = tracked.filter((f) => f.endsWith('.js') && /['"]system\.(equipped|isEquipped|readied|dualWielded|wieldedTwoHanded|equippable\.equipped)['"]|['"]flags\.swse\.equipped['"]/.test(read(f)));
  assert.deepEqual(writers.sort(), [
    'scripts/actors/base/swse-actor-base.js',               // worn-state helper (non-weapon only) + the weapon-state key guard
    'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js', // Sith armor
    'scripts/engine/inventory/InventoryEngine.js',          // armor / shield / equipment worn state
    'scripts/items/item-defaults.js',                       // sheet-submit preservation of retired weapon keys + armor/equipment checkboxes
  ]);
  const inv = strip(read('scripts/engine/inventory/InventoryEngine.js'));
  const start = inv.indexOf('static async requestWeaponPosture'); const end = inv.indexOf('static async toggleImplantTag');
  const region = inv.slice(start, end);
  assert.ok(region.length > 500 && !/ActorEngine|updateOwnedItems|system\.equipped|equipMirrors|isItemEquipped|isAlwaysReadiedWeapon/.test(region), 'the weapon entry points never write or read legacy state themselves');
  assert.ok(!/equipMirrors/.test(inv));
  const toggle = inv.slice(inv.indexOf('static async toggleEquip'), inv.indexOf('static async toggleActivated'));
  assert.ok(/isWeaponItem\(item\)\) return this\.toggleWeaponReadied/.test(toggle), 'toggleEquip hands every weapon to the coordinator path before any write');
  ok('1: no production module outside the explicit non-weapon allowlist writes retired equip/grip aliases, and the InventoryEngine weapon entry points contain no writer');
}
{
  const owners = tracked.filter((f) => f.endsWith('.js') && /weaponPosture|weaponOccupancy/.test(read(f)));
  assert.deepEqual(owners.sort(), [
    'scripts/actors/base/swse-actor-base.js',                          // guard regex only
    'scripts/actors/derived/defense-calculator.js',                    // cache signature (reads posture/occupancy/grip as revision keys)
    'scripts/actors/derived/derived-calculator.js',                    // cache signature
    'scripts/engine/effects/modifiers/ModifierEngine.js',              // cache signature
    'scripts/engine/equipment/equipment-state-coordinator.js',         // the one writer
    'scripts/engine/equipment/equipment-state-reader.js',              // reader
    'scripts/engine/equipment/equipment-transaction-journal.js',       // journal docs only
    'scripts/engine/equipment/weapon-record-invariants.js',            // validator
    'scripts/engine/items/safe-item-factory.js',                       // creation default
    'scripts/items/item-defaults.js',                                  // creation default + sheet-submit preservation
    'scripts/utils/lightsaber-light-sync.js',                          // visual consumer (watch list)
  ]);
  const writersOfOwnedPaths = tracked.filter((f) => f.endsWith('.js') && /updateOwnedItems|updateEmbeddedDocuments|\.update\(/.test(strip(read(f))) && /['"]system\.weaponPosture['"]|['"]system\.weaponOccupancy['"]/.test(strip(read(f))));
  assert.deepEqual(writersOfOwnedPaths.filter((f) => f !== 'scripts/utils/lightsaber-light-sync.js'), ['scripts/engine/equipment/equipment-state-coordinator.js'], 'exactly one writer of weapon posture/occupancy (the light sync only lists the path in its token-update watch list and is asserted separately)');
  const light = strip(read('scripts/utils/lightsaber-light-sync.js'));
  assert.ok(/system\.weaponPosture/.test(light) && !/updateOwnedItems|updateEmbeddedDocuments|system\.equipped|equippable/.test(light), 'light sync watches posture as a consumer and writes no item state');
  ok('2: exactly one writer of system.weaponPosture/weaponOccupancy exists (the coordinator); the lightsaber light sync is a visual consumer that watches posture and activation only');
}
{
  for (const gone of ['scripts/ui/weapon-config-dialog.js', 'templates/ui/weapon-config-dialog.hbs', 'templates/items/base/item-sheet-old.hbs', 'scripts/ui/inventory-handlers.js']) assert.ok(!existsSync(new URL(`../${gone}`, import.meta.url)), `${gone} is deleted`);
  let survivors = [];
  try { survivors = execFileSync('git', ['grep', '-lE', 'weapon-config-dialog|WeaponConfigDialog|inventory-handlers|InventoryHandlers|item-sheet-old', '--', 'scripts', 'templates', 'styles', 'system.json', 'index.js', 'tests/weapon-runtime-builder-negative.test.mjs'], { cwd: new URL('..', import.meta.url).pathname }).toString().split('\n').filter(Boolean); } catch (e) { if (e.status !== 1) throw e; /* exit 1 = no match */ }
  assert.deepEqual(survivors, [], 'no reference to a deleted module remains');
  assert.ok(!/weapon-config-dialog/.test(read('tests/weapon-runtime-builder-negative.test.mjs')));
  const entity = strip(read('templates/dialogs/entity/parts/body-weapon.hbs')) + read('templates/dialogs/entity/parts/header.hbs');
  assert.ok(!/name="system\.dualWielded"|name="system\.wieldedTwoHanded"/.test(entity));
  const body = read('templates/dialogs/entity/parts/body-weapon.hbs');
  assert.ok(!/name="system\.equipped"/.test(body), 'the weapon editor body has no Equipped toggle');
  const header = read('templates/dialogs/entity/parts/header.hbs');
  const idx = header.indexOf('name="system.equipped"');
  assert.ok(/\(or \(eq item\.type "armor"\) \(eq item\.type "equipment"\)\)/.test(header.slice(Math.max(0, idx - 200), idx)), 'the header Equipped toggle is limited to armor and equipment');
  const crystal = strip(read('scripts/engine/crafting/phase-3-advanced-crystal-system.js'));
  assert.ok(!/equippable\.equipped['"]\s*:/.test(crystal) && /InventoryEngine\.setActivated\(actor, weapon\.id, false, \{ free: true \}\)/.test(crystal), 'unstable-crystal deactivation uses the activation authority, not posture');
  ok('3: obsolete dialog, legacy handlers and legacy sheet template are deleted with every reference; weapon editor forms carry no equip/grip writers; crystal deactivation is an activation change');
}
{
  const src = ['scripts/engine/inventory/InventoryEngine.js', 'scripts/actors/base/swse-actor-base.js', 'scripts/utils/lightsaber-light-sync.js', 'scripts/engine/equipment/equipment-state-coordinator.js'].map((f) => strip(read(f))).join('\n');
  assert.ok(!/game\.socket|socket\.(on|emit)|registerSocket|requesterUserId|activeGM|sessionId/.test(src), 'no socket route, asserted identity or executor election');
  const coordinatorCalls = strip(read('scripts/engine/inventory/InventoryEngine.js'));
  assert.equal((coordinatorCalls.match(/executeEquipmentIntent\(/g) ?? []).length, 1, 'one call site, always with the explicit local GM context');
  assert.ok(/context: GM_LOCAL_CONTEXT/.test(coordinatorCalls));
  ok('4: no socket handler, asserted requester identity or client-local fallback was introduced; the only execution call site passes the explicit GM-local context');
}

// ------------------------------------------------------------------------------------------------ behavior
{
  const w = weapon('w1', REC('EQUIPPED', 'hold', ['natural-arm-1']));
  const a = mkActor([w]); spent.length = 0; h.log.itemWrites.length = 0; h.log.actorWrites.length = 0;
  const r = await InventoryEngine.setWeaponReadied(a, 'w1', false, opts);
  assert.equal(r.ok, true); assert.equal(r.outcome.status, 'COMMITTED'); assert.equal(r.outcome.finalized, true);
  assert.equal(w.system.weaponPosture, 'STOWED'); assert.deepEqual(spent, ['move']);
  assert.ok(h.log.actorWrites.length >= 3 && h.log.actorWrites.every((x) => Object.keys(x).length === 1 && 'flags.swse.equipmentTxn' in x), 'the journal is written before and after (PREPARED, APPLIED, FINALIZED)');
  assert.deepEqual(h.log.actorWrites.map((x) => x['flags.swse.equipmentTxn'].entries[0].phase), ['PREPARED', 'APPLIED', 'FINALIZED']);
  assert.ok(h.log.itemWrites.flat().every((u) => Object.keys(u).every((k) => k === '_id' || OWNED.includes(k))), 'only coordinator-owned paths are written');
  ok('5: InventoryEngine delegates weapon posture to the coordinator: journaled PREPARED/APPLIED/FINALIZED, field-scoped write, one Move spend, no retired alias');
}
{
  // armor / shield / equipment toggling is unchanged
  const body1 = { id: 'b1', type: 'armor', name: 'Light Armor', system: { equipped: true, armorType: 'light' } };
  const body2 = { id: 'b2', type: 'armor', name: 'Heavy Armor', system: { equipped: false, armorType: 'heavy' } };
  const shield = { id: 'sh', type: 'armor', name: 'Energy Shield (SR 10)', system: { equipped: false, armorType: 'shield', shieldRating: 10, charges: { current: 3, max: 3 } } };
  const gear = { id: 'g1', type: 'equipment', name: 'Comlink', system: { equipped: false } };
  const a = mkActor([body1, body2, shield, gear]); h.log.actorWrites.length = 0; spent.length = 0;
  await InventoryEngine.toggleEquip(a, 'b2');
  assert.equal(body2.system.equipped, true); assert.equal(body1.system.equipped, false, 'single body armor rule');
  await InventoryEngine.toggleEquip(a, 'sh');
  assert.equal(shield.system.equipped, true); assert.equal(body2.system.equipped, true, 'a shield coexists with body armor');
  await InventoryEngine.toggleEquip(a, 'g1');
  assert.equal(gear.system.equipped, true);
  assert.equal(h.log.actorWrites.length, 0, 'armor/equipment toggles do not touch the equipment journal');
  assert.deepEqual(spent, [], 'no action is spent for worn state');
  ok('6: armor, shield and equipment toggling keeps its worn-state behavior (single body armor, shield coexistence)');
}
{
  // legacy actor helpers cannot bypass the coordinator
  const w = weapon('w1', REC('STOWED', null, []));
  const armor = { id: 'ar', type: 'armor', name: 'Armor', system: { equipped: false } };
  const a = mkActor([w, armor]);
  for (const i of [w, armor]) { i.isOwned = true; i.parent = a; }
  for (const m of ['setItemEquipped', 'equipItem', 'unequipItem', 'toggleItemEquipped', 'updateOwnedItem']) a[m] = SWSEActorBase.prototype[m];
  const call = (fn, ...args) => fn.apply(a, args);
  const before = JSON.stringify(w.system); h.log.itemWrites.length = 0;
  for (const m of ['setItemEquipped', 'equipItem', 'unequipItem', 'toggleItemEquipped']) {
    const r = await call(SWSEActorBase.prototype[m], w, true);
    assert.equal(r?.ok, false, m); assert.equal(r.reason, 'weapon-posture-owned-by-coordinator');
  }
  for (const changes of [{ 'system.equipped': true }, { 'system.weaponPosture': 'READIED' }, { 'system.weaponOccupancy': { schemaVersion: 1, purpose: 'wield', appendageIds: ['natural-arm-1'] } }, { 'system.equippable.equipped': true }, { 'system.dualWielded': true }, { 'flags.swse.fireState.wielded': 'two-handed' }, { 'flags.swse.equipped': true }]) {
    await assert.rejects(call(SWSEActorBase.prototype.updateOwnedItem, w, changes), /coordinator/, JSON.stringify(changes));
  }
  assert.equal(JSON.stringify(w.system), before); assert.equal(h.log.itemWrites.length, 0);
  await call(SWSEActorBase.prototype.equipItem, armor);
  assert.equal(armor.system.equipped, true, 'armor and equipment keep the worn-state helper');
  await call(SWSEActorBase.prototype.updateOwnedItem, w, { 'system.description': 'ok' });
  ok('7: legacy actor helpers cannot write weapon posture, occupancy, equip aliases or the grip choice; armor and unrelated weapon fields still pass');
}
{
  // missing choices, illegal grips, deferred transitions: nothing written or spent
  const stowed = weapon('s', REC('STOWED', null, []));
  const great = weapon('g', REC('STOWED', null, []), { key: 'lightsaber-chassis-great' });
  const held = weapon('h', REC('EQUIPPED', 'hold', ['natural-arm-1']));
  const a = mkActor([stowed, great, held]);
  const snap = () => JSON.stringify([stowed.system, great.system, held.system]);
  const before = snap(); h.log.itemWrites.length = 0; h.log.actorWrites.length = 0; spent.length = 0;
  let r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 's' }, opts);
  assert.equal(r.status, 'CHOICE_REQUIRED'); assert.equal(r.ok, false);
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 's', appendageIds: ['natural-arm-2'] }, opts);
  assert.equal(r.status, 'CHOICE_REQUIRED'); assert.deepEqual(r.choices.map((c) => c.id), ['grip']);
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 'g', appendageIds: ['natural-arm-2'], grip: 'one-handed' }, opts);
  assert.notEqual(r.status, 'COMMITTED', 'a Large weapon cannot be wielded one-handed with one arm'); assert.equal(r.ok, false);
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 'g', appendageIds: ['natural-arm-2'], grip: 'two-handed' }, opts);
  assert.equal(r.ok, false, 'two-handed needs two appendages');
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 's', appendageIds: ['tail-9'], grip: 'one-handed' }, opts);
  assert.equal(r.ok, false);
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 'h', appendageIds: ['natural-arm-2'], grip: 'one-handed' }, opts);
  assert.equal(r.status, 'DEFERRED_RULES_REVIEW'); assert.equal(r.plan.issues[0].details.decisionId, 'EQ-001');
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 'h', purpose: 'hold', appendageIds: ['natural-arm-2'] }, opts);
  assert.equal(r.status, 'DEFERRED_RULES_REVIEW', 'moving a held weapon to other appendages is the same deferred item');
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed', requesterUserId: 'u' }, opts);
  assert.equal(r.status, 'REJECTED_INVALID');
  assert.equal(snap(), before); assert.equal(h.log.itemWrites.length, 0); assert.equal(h.log.actorWrites.length, 0); assert.deepEqual(spent, []);
  ok('8: missing appendage/grip choices, illegal grips, unknown appendages, EQ-001 transitions and identity-carrying payloads fail closed with no write, no journal entry and no spend');
}
{
  // a legal canonical ready goes through; activation is independent of posture
  const s = weapon('s', REC('STOWED', null, []));
  const a = mkActor([s]); spent.length = 0;
  const r = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' }, opts);
  assert.equal(r.ok, true, JSON.stringify(r.plan?.issues ?? r.outcome?.issues)); assert.equal(s.system.weaponPosture, 'READIED'); assert.deepEqual(spent, ['move']);
  const posture = JSON.stringify([s.system.weaponPosture, s.system.weaponOccupancy]);
  spent.length = 0; h.log.actorWrites.length = 0;
  const lit = await InventoryEngine.setActivated(a, 's', true, opts);
  assert.equal(lit.ok, true); assert.equal(s.system.activated, true); assert.deepEqual(spent, ['swift']);
  assert.equal(JSON.stringify([s.system.weaponPosture, s.system.weaponOccupancy]), posture, 'activation does not change posture');
  assert.equal(h.log.actorWrites.length, 0, 'activation does not touch the equipment journal');
  const stowRefused = await InventoryEngine.setWeaponReadied(a, 's', false, opts);
  assert.equal(stowRefused.reason, 'deactivate-before-stowing');
  await InventoryEngine.setActivated(a, 's', false, opts);
  assert.equal(s.system.weaponPosture, 'READIED', 'deactivation does not change posture');
  ok('9: a legal explicit READY commits through the coordinator; ignition and extinguishing are the activation authority and never change or consult posture writes');
}
{
  // pending transactions cannot grant readiness through the migrated helpers
  const s = weapon('s', REC('EQUIPPED', 'hold', ['natural-arm-1']), {}); s.system.weaponPosture = 'EQUIPPED';
  const a = mkActor([s]);
  const entry = J.addPreparedEntry([], { requestId: 'pending-1', intentDigest: fingerprintIntent('i'), planDigest: fingerprintIntent('p'), items: [{ id: 's', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'EQUIPPED' } }], spend: { state: 'pending', actionType: 'move' } });
  a.flags = { swse: { equipmentTxn: J.toStored(entry) } };
  spent.length = 0; h.log.itemWrites.length = 0;
  assert.equal(await InventoryEngine.isWeaponDrawn(a, s, opts), false, 'an unfinalized transaction is not verified-held');
  const lit = await InventoryEngine.setActivated(a, 's', true, opts);
  assert.equal(lit.ok, false); assert.equal(lit.reason, 'draw-before-activating'); assert.equal(s.system.activated, false);
  const stow = await InventoryEngine.setWeaponReadied(a, 's', false, opts);
  assert.equal(stow.ok, false); assert.equal(stow.status, 'UNRESOLVED_TRANSACTION');
  const tog = await InventoryEngine.toggleEquip(a, 's');
  assert.equal(tog.ok, false);
  assert.deepEqual(spent, []); assert.equal(h.log.itemWrites.length, 0);
  // finalized entries release it
  const done = J.transitionEntry(J.transitionEntry(entry, 'pending-1', 'APPLIED'), 'pending-1', 'FINALIZED');
  a.flags.swse.equipmentTxn = J.toStored(done);
  assert.equal(await InventoryEngine.isWeaponDrawn(a, s, opts), true);
  ok('10: an unresolved transaction withholds usable readiness from the migrated helpers (activation, stow, toggle); FINALIZED releases it');
}
{
  // GM-local boundary: no GM, no write, no spend, no fallback
  const s = weapon('s', REC('EQUIPPED', 'hold', ['natural-arm-1']));
  const a = mkActor([s]); spent.length = 0; h.log.itemWrites.length = 0; h.log.actorWrites.length = 0;
  h.setGm(false);
  const r = await InventoryEngine.setWeaponReadied(a, 's', false, opts);
  const t = await InventoryEngine.toggleEquip(a, 's');
  h.setGm(true);
  assert.equal(r.ok, false); assert.equal(r.status, 'REJECTED_NOT_GM'); assert.match(r.message, /GM/);
  assert.equal(t.ok, false);
  assert.equal(s.system.weaponPosture, 'EQUIPPED'); assert.deepEqual(spent, []); assert.equal(h.log.itemWrites.length, 0); assert.equal(h.log.actorWrites.length, 0);
  ok('11: without a GM execution context the legacy entry points fail with a structured outcome and perform no write, journal entry, spend or fallback');
}
{
  // Draw/Stow and Quick Draw authority intact
  const quickDrawRule = { type: 'ACTION_SPEED_MUTATION', id: 'quickDraw', label: 'Quick Draw', source: 'Quick Draw', actionId: 'drawOrHolsterWeapon', aliases: ['draw', 'holsterWeapon', 'drawOrHolster'], baseActionCost: 'move', mutatedActionCost: 'swift', requiresWorkflowValidation: true, actionEconomy: { from: 'move', to: 'swift', spend: 'swift', workflowRequired: true } };
  const qd = { id: 'f1', name: 'Quick Draw', type: 'feat', system: { abilityMeta: { attackOptionRules: [quickDrawRule] } } };
  const s = weapon('s', REC('STOWED', null, []));
  const a = mkActor([s, qd]); spent.length = 0;
  await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 's', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  await InventoryEngine.setWeaponReadied(a, 's', false, opts);
  assert.deepEqual(spent, ['swift', 'swift'], 'Quick Draw: Swift');
  const plain = mkActor([weapon('p', REC('STOWED', null, []))]); spent.length = 0;
  await InventoryEngine.requestWeaponPosture(plain, { type: 'equip', itemId: 'p', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  assert.deepEqual(spent, ['move'], 'Core Rulebook: Move');
  const src = strip(read('scripts/engine/equipment/equipment-state-coordinator.js'));
  assert.ok(/resolveActionCost\(actor, 'drawOrHolsterWeapon'/.test(src), 'the existing action authority prices draw/holster');
  ok('12: Draw/Stow cost stays with the existing action authority (Move; Swift with Quick Draw) and is not recomputed in the inventory layer');
}
{
  // no independent weapon rules authority in the migrated layers
  for (const f of ['scripts/engine/inventory/InventoryEngine.js']) {
    const region = strip(read(f));
    const w = region.slice(region.indexOf('static async requestWeaponPosture'), region.indexOf('static async toggleImplantTag'));
    assert.ok(!/twoHanded|requiredHands|resolveWielding|resolveEffectiveWieldingSize|weapon-runtime\/|appendageIds\s*=\s*\[/.test(w), 'no grip/size/appendage rule or default assignment in the inventory layer');
  }
  const sheet = strip(read('scripts/sheets/v2/character-like-sheet.js'));
  assert.ok(/toggleWeaponReadied\(this\.actor, itemId\)/.test(sheet) && /result\?\.message/.test(sheet), 'the sheet handler only forwards the request and shows the structured message');
  ok('13: the migrated inventory layer and sheet handler hold no weapon rule and fabricate no default appendage assignment');
}

{
  // WP5 correction: setWeaponReadied(true) never reports success for a weapon that is only EQUIPPED or whose declared READIED is unverified
  const eq = weapon('e', REC('EQUIPPED', 'hold', ['natural-arm-2']));
  const declared = weapon('d', REC('READIED', 'wield', ['natural-arm-2']));   // no grip choice recorded: not verified
  const real = weapon('r', REC('READIED', 'wield', ['natural-arm-1']));
  real.flags.swse.fireState = { v: 1, wielded: 'one-handed' };
  const a = mkActor([eq, real]); spent.length = 0; h.log.itemWrites.length = 0; h.log.actorWrites.length = 0;
  let r = await InventoryEngine.setWeaponReadied(a, 'e', true, opts);
  assert.equal(r.ok, false); assert.equal(r.status, 'DEFERRED_RULES_REVIEW'); assert.notEqual(r.status, 'NO_CHANGE');
  r = await InventoryEngine.setWeaponReadied(a, 'e', true, { ...opts, appendageIds: ['natural-arm-1'], grip: 'one-handed' });
  assert.equal(r.status, 'DEFERRED_RULES_REVIEW', 'explicit appendages do not bypass EQ-001');
  assert.equal(eq.system.weaponPosture, 'EQUIPPED'); assert.deepEqual(spent, []); assert.equal(h.log.itemWrites.length, 0); assert.equal(h.log.actorWrites.length, 0);
  r = await InventoryEngine.setWeaponReadied(a, 'r', true, opts);
  assert.equal(r.ok, true); assert.equal(r.status, 'NO_CHANGE', 'a VERIFIED READIED weapon is the only no-change case');
  const b = mkActor([declared]);
  r = await InventoryEngine.setWeaponReadied(b, 'd', true, opts);
  assert.equal(r.ok, false); assert.equal(r.status, 'READINESS_NOT_VERIFIED'); assert.equal(r.reason, 'declared-readied-not-verified');
  const c = mkActor([weapon('s', REC('STOWED', null, []))]);
  r = await InventoryEngine.setWeaponReadied(c, 's', true, opts);
  assert.equal(r.status, 'CHOICE_REQUIRED', 'STOWED -> READIED keeps its explicit-choice path');
  ok('14: setWeaponReadied(true) is NO_CHANGE only for verified READIED; EQUIPPED stays DEFERRED_RULES_REVIEW (no write, journal or spend) and unverified declared READIED is READINESS_NOT_VERIFIED');
}

console.log(`equipment-e4c1-wp4-writer-convergence: ${n} checks ok`);
