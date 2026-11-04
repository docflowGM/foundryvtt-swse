import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { resolveTrustedStockAttackGroup } from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';
import { STOCK_ARC_POLICY, getStockSilentArcPolicy } from '../scripts/domain/vehicles/vehicle-stock-arc-policy.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate, guardShipyardWeaponItem } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { authorizeVehicleAttackBeforeCosts } = await import('../scripts/domain/vehicles/vehicle-attack-preflight.js');
const { buildVehicleWeaponMountPanel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { resolveAbstractCrewAttackBonus, resolveVehicleAttackBonus } = await import('../scripts/engine/combat/vehicle-attack-math.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const XW = 'core-incom-t-65b-x-wing-starfighter';
class Items extends Map {   // the parts of Foundry's Collection the system uses
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });

/** An imported published vehicle (pack document) as a live actor with an items collection. */
function importVehicle(key, over = {}) {
  const d = structuredClone(docs.find(x => keyOf(x) === key));
  const v = Object.assign(d, { id: 'veh1', isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); }, ...over });
  return v;
}
let seq = 0;
function persistItemsFor(v) {
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'i' + (++seq); v.items.set(id, { id, ...structuredClone(x), actor: v }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) v.items.delete(id); };
}
async function armed(key, over) {
  const v = importVehicle(key, over); persistItemsFor(v);
  globalThis.game.user.id = 'u1';
  await armStockWeaponsOnCreate(v, {}, 'u1');                 // the createActor hook, as run by the creating client
  return v;
}
const stockItems = v => [...v.items.values()].filter(i => i.flags?.swse?.vehicleStockWeapon);
const target = (size = 'medium', type = 'character') => ({ id: 'tgt', type, items: [], system: { size, defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] });
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
const setPolicy = p => { globalThis.game.settings = { get: (ns, k) => (k === 'vehicleStockSilentArcPolicy' ? p : undefined) }; };
const fire = async (vehicle, weapon, t = target(), opts = {}) => {
  log.length = 0; let result = null;
  try { result = await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target: t, ...opts }); } catch (e) { log.push('THREW ' + e.message); }
  return { result, log: [...log], blocked: log.some(m => /blocked|requires/.test(m)) };
};

test('SOURCE: the X-wing record yields exactly one executable stock group; torpedoes stay reference-only', () => {
  const rec = docs.find(d => keyOf(d) === XW).flags.swse.universalVehicleSource.source;
  const groups = assessStockWeaponGroups(rec).groups;
  const lc = groups.find(g => g.label === 'laser cannons'), pt = groups.find(g => g.label === 'proton torpedoes');
  assert.equal(lc.executable, true);
  assert.deepEqual([lc.damage.raw, lc.operator, lc.attackBonusPrinted], ['6d10x2', 'pilot', 5]);
  assert.equal(pt.executable, false);
  assert.ok(pt.reasons.includes('STOCK_DAMAGE_AREA_OR_SPLASH'));
});

test('IMPORT -> DISPLAY: creating the vehicle arms its factory laser cannons as an owned Item; no ledger, no credits', async () => {
  const v = await armed(XW);
  const items = stockItems(v);
  assert.deepEqual(items.map(i => i.name), ['laser cannons']);
  assert.equal(v.flags.swse.vehicleInstallations ?? undefined, undefined, 'no installation ledger entry was created');
  const panel = buildVehicleWeaponMountPanel(v);
  const row = (panel.mounts ?? panel.weapons ?? panel.rows ?? []).find?.(m => /laser cannons/i.test(m.name ?? m.label ?? ''));
  assert.ok(row ?? JSON.stringify(panel).includes('laser cannons'), 'the sheet mount panel lists the stock weapon');
  assert.ok(JSON.stringify(panel).includes('6d10x2'));
  // idempotent
  await armStockWeaponsOnCreate(v, {}, 'u1');
  assert.equal(stockItems(v).length, 1);
});

test('AUTHORITY: the stock Item resolves to a trusted source group; classification is stock, not installation', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  assert.deepEqual(resolveVehicleWeaponAuthority(w).origin, 'stock');
  const t = resolveTrustedStockAttackGroup(v, w);
  assert.deepEqual([t.bindingVerified, t.sourceComplete, t.operator, t.arcEvidence.state, t.attackBonusEvidence.value], [true, true, 'pilot', 'SOURCE_SILENT_CONFIRMED', 5]);
  assert.equal(classifyInstalledVehicleWeapon(v, w).kind, 'STOCK_CANDIDATE');
});

test('ARC RULING V-P6C-01: with no setting touched, X-wing and TIE fighter stock cannons fire without GM intervention', async () => {
  setPolicy(undefined);                                   // the shipped default
  for (const key of [XW, 'core-tie-fighter']) {
    const v = await armed(key); const w = stockItems(v)[0];
    const r = await fire(v, w);
    assert.equal(r.blocked, false, `${key}: ${r.log.join('|')}`);
    assert.ok(r.result, key);
    assert.equal(w.system.vehicleMount.arc, 'unknown', 'a source-unstated arc is shown as unknown, not as a published arc');
  }
  assert.equal(getStockSilentArcPolicy(), STOCK_ARC_POLICY.UNRESTRICTED, 'default policy');
});

test('ARC RULING: a world may still require a GM adjudication for source-unstated arcs', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  setPolicy('gm-per-attack');
  const blocked = await fire(v, w);
  assert.equal(blocked.result, null);
  assert.match(blocked.log.join('|'), /TRUSTED_GM_CONTEXT_REQUIRED/);
  setPolicy(undefined);
});

test('ARC RULING hierarchy: a PUBLISHED arc is enforced, never overridden by source silence (Ghtroc 720 fixed-forward cannon)', async () => {
  const gh = 'sotg-ghtroc-industries-class-720-freighter';
  const rec = docs.find(d => keyOf(d) === gh).flags.swse.universalVehicleSource.source;
  const g = assessStockWeaponGroups(rec).groups[0];
  assert.deepEqual([g.executable, g.arc.state, g.arc.value], [true, 'PUBLISHED', 'forward']);
  assert.match(g.arc.basis, /fixed-forward per p\.88/);
  // the record-level "not stated" does not outrank the group's stated arc
  assert.equal(rec.fieldStates['/armament/firingArcs'], 'not-stated');
  setPolicy('unrestricted');
  const v = await armed(gh); const w = stockItems(v)[0];
  assert.equal(w.system.vehicleMount.arc, 'forward');
  const ahead = await fire(v, w, target('medium'));                     // target 300 units ahead of the token (rotation 0)
  assert.equal(ahead.blocked, false, ahead.log.join('|'));
  const behind = await fire(v, w, { ...target('medium'), getActiveTokens: () => [token(-300, 0)] });
  assert.equal(behind.result, null);
  assert.match(behind.log.join('|'), /TARGET_OUTSIDE_VERIFIED_FIRE_ARC/);
  setPolicy(undefined);
});

test('ARC RULING hierarchy: stated-but-uninterpreted and never-reviewed arcs stay refused', () => {
  const find = (key, label) => {
    const rec = docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
    return assessStockWeaponGroups(rec).groups.find(x => x.label === label);
  };
  const turret = find('sotg-koensayr-manufacturing-btl-58-k-wing', 'quad laser cannon');
  assert.deepEqual([turret.executable, turret.arc.state], [false, 'STATED_UNPARSED']);
  assert.ok(turret.reasons.includes('STOCK_FIRING_ARC_STATED_UNPARSED'));
  const articulated = find('sotg-mandalmotors-starviper-assault-fighter', 'heavy double laser cannons');
  assert.equal(articulated.arc.state, 'STATED_UNPARSED');
  const unreviewed = find('core-aat-1', 'light blaster cannons');
  assert.deepEqual([unreviewed.executable, unreviewed.arc.state], [false, 'NOT_REVIEWED']);
  assert.ok(unreviewed.reasons.includes('STOCK_FIRING_ARC_NOT_REVIEWED'));
  // a stated-but-uninterpreted arc is never silently treated as unrestricted, whatever the world policy
  assert.equal(turret.executable, false);
});

test('ARC RULING: certified aftermarket installations keep their certified mount and arc regardless of the stock policy', async () => {
  const { planVehicleInstallation, DEFAULT_VEHICLE_INSTALLATION_RULES } = await import('../scripts/domain/vehicles/vehicle-installation-ledger.js');
  const { VehicleInstallationService: Svc } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
  const { readFileSync } = await import('node:fs');
  const wsys = JSON.parse(readFileSync('data/vehicle-modifications/weapon-systems.json', 'utf8')).find(w => w.id === 'laser-cannon-light');
  const cert = { ...JSON.parse(readFileSync('data/vehicle-modifications/certification-p6a.json', 'utf8')).rows, ...JSON.parse(readFileSync('data/vehicle-modifications/certification.json', 'utf8')).rows }['laser-cannon-light'];
  const v = importVehicle(XW);
  const rules = { ...DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
  const plan = mount => planVehicleInstallation({ record: v.flags.swse.universalVehicleSource.source, flags: v.flags, catalogEntry: { ...wsys, certification: cert }, installId: 'w1', availableCredits: 1e9, rules, mount, nonstandard: false });
  assert.ok(plan(null).reasons.includes('WEAPON_MOUNT_UNCERTIFIED'), 'still needs a certified mount');
  assert.ok(plan(Svc.normalizeMount({ mountKey: 'n', arc: 'sideways', operatorRole: 'pilot', reason: 'r' }, { isGM: true, userId: 'g', now: 1 }).mount).reasons.includes('WEAPON_MOUNT_ARC_INVALID'));
});

test('CREW -> TARGET -> ATTACK: generic crew uses the printed +5 once; its components are shown, not added again', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  setPolicy(undefined);
  const r = await fire(v, w);
  assert.equal(r.result.attackDomain, 'vehicle-abstract-crew');
  assert.equal(r.result.atkBonus, 5, 'the statblock\'s laser cannons +5, applied once');
  const ledger = r.result.componentLedger;
  const base = ledger.find(e => e.id === 'published-statblock-attack');
  assert.deepEqual([base.value, base.applied], [5, true]);
  assert.match(base.label, /Published statblock attack \(laser cannons\)/);
  const included = ledger.filter(e => e.id.startsWith('included-'));
  assert.deepEqual(included.map(e => [e.id, e.value, e.applied]), [['included-crew-bab', 2, false], ['included-vehicle-int', 3, false]]);
  assert.equal(ledger.some(e => e.id === 'crew-quality-bab' || e.id === 'vehicle-int'), false, 'the formula is not recomposed on top of the printed total');
  assert.equal(ledger.some(e => e.id === 'capital-ship-attack-penalty'), false, 'a Gargantuan starfighter takes no capital penalty');
  // attack-time modifiers still stack on top of the baseline: a pilot-crewed group whose printed total includes the +2
  const sotg = await armed('sotg-ghtroc-industries-class-720-freighter');
  assert.equal(stockItems(sotg).length, 1);
});

test('PRINTED TOTAL accounting: a +2 pilot-crewed total is the trained-Pilot rule, shown as included; unexplained totals are refused', async () => {
  const rec = k => docs.find(d => keyOf(d) === k).flags.swse.universalVehicleSource.source;
  const arc170 = assessStockWeaponGroups(rec('core-arc-170-starfighter')).groups.find(g => g.label === 'heavy laser cannons');
  assert.equal(arc170.attackBasis.kind, 'BAB_PLUS_INT');
  const sotgPilot = assessStockWeaponGroups(rec('sotg-ghtroc-industries-class-720-freighter')).groups[0];
  assert.ok(['BAB_PLUS_INT', 'BAB_PLUS_INT_PLUS_TRAINED_PILOT'].includes(sotgPilot.attackBasis.kind));
  // find a pilot-crewed group whose total includes the +2
  let plus2 = null;
  for (const d of docs) { const g = assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.find(x => x.executable && x.attackBasis.kind === 'BAB_PLUS_INT_PLUS_TRAINED_PILOT'); if (g) { plus2 = [keyOf(d), g]; break; } }
  assert.ok(plus2, 'there are pilot-crewed groups whose printed total includes the Core +2');
  assert.equal(plus2[1].operator, 'pilot');
  assert.deepEqual(plus2[1].attackBasis.components.map(c => c.id), ['crew-bab', 'vehicle-int', 'pilot-trained']);
  const v = await armed(plus2[0]); const w = stockItems(v).find(i => i.flags.swse.vehicleStockWeapon.groupKey === plus2[1].groupKey);
  setPolicy(undefined);
  const r = await fire(v, w);
  assert.equal(r.result.atkBonus, plus2[1].attackBonusPrinted - (CAPITAL_SIZES_FOR_TEST.has(v.flags.swse.universalVehicleSource.source.classification.printedSize) ? 20 : 0));
  assert.equal(r.result.componentLedger.find(e => e.id === 'included-pilot-trained').applied, false);
  // a total the published rules cannot explain stays refused (not "corrected" to fit)
  const unexplained = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups).filter(g => g.reasons.includes('STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA'));
  assert.ok(unexplained.length > 0 && unexplained.every(g => !g.executable));
});

test('DAMAGE: published 6d10 x 2 through the one composition authority; edited Item damage is irrelevant', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  const f = ctx => buildDamageFormula(resolveDamageComposition(v, w, { weapon: w, ...ctx }));
  assert.equal(f({}), '(6d10) * 2');
  assert.equal(f({ isCritical: true }), '((6d10) * 2) * 2');
  assert.deepEqual(resolveVehicleWeaponDamage(w), { ok: true, formula: '6d10', multiplier: 2, damageType: null, printed: '6d10x2' });
  w.system.damage = '99d10x9';
  assert.throws(() => f({}), /STOCK_WEAPON_ITEM_DAMAGE_DIVERGES_FROM_SOURCE|no ordinary damage roll/);
});

test('APPLY DAMAGE: the rolled damage is applied to a target through ActorEngine.applyDamage', async () => {
  const hit = { id: 'tgt', type: 'vehicle', name: 'Target', system: { hp: { value: 100, max: 100 }, conditionTrack: { current: 0 }, derived: { damage: { threshold: 40, reduction: 0 }, hp: { value: 100, max: 100 } } }, items: [], flags: {} };
  const updates = [];
  const realUpdate = ActorEngine.updateActor;
  ActorEngine.updateActor = async (_a, u) => { updates.push(u); };
  try {
    const r = await ActorEngine.applyDamage(hit, { amount: 30, type: 'energy', source: 'stock-weapon', sourceActor: null });
    assert.ok(r.applied >= 0 && Number.isFinite(r.newHP));
    assert.ok(updates.length >= 1);
  } finally { ActorEngine.updateActor = realUpdate; }
});

test('PERMISSIONS: a user who does not own the vehicle cannot fire its stock weapon; a GM can', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  setPolicy('unrestricted');
  v.isOwner = false;
  const denied = await fire(v, w);
  assert.equal(denied.result, null);
  assert.match(denied.log.join('|'), /ATTACK_USER_NOT_AUTHORIZED/);
  globalThis.game.user.isGM = true;
  try { assert.ok((await fire(v, w)).result, 'GM may'); } finally { globalThis.game.user.isGM = false; }
  setPolicy(undefined);
});

test('GM per-attack adjudication still works under the default policy (receipted, scoped)', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  const g = globalThis.game, prevUser = g.user, prevCombat = g.combat, prevChat = globalThis.ChatMessage;
  g.user = { id: 'gm1', isGM: true }; g.combat = { id: 'c1' };
  globalThis.ChatMessage = { create: async () => ({ id: 'receipt1' }) };
  globalThis.foundry ??= {}; globalThis.foundry.utils ??= {}; const prevRid = globalThis.foundry.utils.randomID; globalThis.foundry.utils.randomID = () => 'rid1';
  try {
    const base = { vehicle: v, weapon: w, target: { id: 'tgt', getActiveTokens: () => [token(300, 0)] }, attackId: 'a1', crewStationResolved: true, stockArcPolicy: STOCK_ARC_POLICY.GM_PER_ATTACK };
    assert.equal((await authorizeVehicleAttackBeforeCosts(base)).ok, false);
    const r = await authorizeVehicleAttackBeforeCosts({ ...base, gmDecision: { confirmed: true, reason: 'open space', selectedArc: 'omni' } });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual([r.kind, r.arcAuthority, r.receiptDocumentId], ['TRUSTED_STOCK', 'ALLOW_GM_INSTANCE_EXCEPTION', 'receipt1']);
  } finally { g.user = prevUser; g.combat = prevCombat; globalThis.ChatMessage = prevChat; globalThis.foundry.utils.randomID = prevRid; }
});

test('INTEGRITY: forged, edited and foreign stock Items never fire and never resolve damage', async () => {
  setPolicy('unrestricted');
  const cases = {
    damage: w => { w.system.damage = '99d10x9'; },
    operator: w => { w.system.vehicleMount.crewRole = 'gunner'; },
    mountKey: w => { w.system.vehicleMount.mountKey = 'x'; },
    name: w => { w.name = 'turbolaser'; },
    groupKey: w => { w.flags.swse.vehicleStockWeapon.groupKey = `${XW}-printed-attack-2`; w.system.vehicleMount.stockGroupKey = `${XW}-printed-attack-2`; },   // the torpedoes
    unknownGroup: w => { w.flags.swse.vehicleStockWeapon.groupKey = 'made-up'; },
    foreignSource: w => { w.flags.swse.vehicleStockWeapon.sourceEntryKey = 'core-tie-fighter'; },
    alsoInstalled: w => { w.system.vehicleMount.installId = 'inst1'; }
  };
  for (const [name, tamper] of Object.entries(cases)) {
    const v = await armed(XW); const w = stockItems(v)[0]; tamper(w);
    assert.equal(resolveTrustedStockAttackGroup(v, w), null, name + ' (authority)');
    assert.equal((await fire(v, w)).result, null, name + ' (attack)');
    assert.throws(() => buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })), /./, name + ' (damage)');
  }
  // a source record that fails verification denies every stock weapon, with no fallback to the legacy path
  const v = await armed(XW); const w = stockItems(v)[0];
  v.flags.swse.universalVehicleSource.source.armament.firingGroups[0].attackBonusPrinted = 99;
  assert.equal(resolveTrustedStockAttackGroup(v, w), null);
  assert.equal((await fire(v, w)).result, null);
  setPolicy(undefined);
});

test('INTEGRITY: an Item copied onto another vehicle, or a stock flag on a non-source vehicle, is refused', async () => {
  setPolicy('unrestricted');
  const xw = await armed(XW), w = stockItems(xw)[0];
  const tie = importVehicle('core-tie-fighter'); persistItemsFor(tie);
  const moved = { ...structuredClone({ ...w, actor: undefined }), id: 'moved', actor: tie }; tie.items.set('moved', moved);
  assert.equal(resolveTrustedStockAttackGroup(tie, moved), null, 'source key differs');
  const legacy = { id: 'leg', type: 'vehicle', isOwner: true, system: {}, flags: {}, items: new Items(), getActiveTokens: () => [token(0, 0)] };
  const lw = { ...structuredClone({ ...w, actor: undefined }), id: 'lw', actor: legacy }; legacy.items.set('lw', lw);
  assert.equal(resolveTrustedStockAttackGroup(legacy, lw), null);
  assert.equal((await fire(legacy, lw)).result, null);
  setPolicy(undefined);
});

test('AUTOFIRE and BURST are refused for stock weapons (their printed vehicle autofire bonuses are not automated)', async () => {
  setPolicy('unrestricted');
  const v = await armed(XW); const w = stockItems(v)[0];
  for (const opts of [{ autofire: true }, { attackMode: 'autofire' }, { fireMode: 'burst' }, { combatOptions: { burstFire: true } }]) {
    const r = await fire(v, w, target(), opts);
    assert.equal(r.result, null, JSON.stringify(opts));
    assert.match(r.log.join('|'), /autofire and burst fire are not automated/);
  }
  setPolicy(undefined);
});

test('the managed stock Item cannot be edited, and Resync restores a tampered one without touching others', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  const item = { ...w, parent: v };
  for (const c of [{ 'system.damage': '9d10' }, { 'system.vehicleMount.crewRole': 'gunner' }, { name: 'x' }, { 'flags.swse.vehicleStockWeapon.groupKey': 'x' }])
    assert.equal(guardShipyardWeaponItem(item, c), false, JSON.stringify(c));
  v.items.set('mine', { id: 'mine', name: 'Hold-out', flags: {}, system: { damage: '3d4' }, actor: v });
  w.system.damage = '99d10x9';                                            // tampered behind the hook (e.g. a macro)
  const { VehicleInstallationService: Svc } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
  const r = await Svc.reconcileWeaponItems({ vehicle: v });
  assert.deepEqual([r.success, r.operational], [true, true]);
  assert.equal(stockItems(v).length, 1);
  assert.equal(stockItems(v)[0].system.damage, '6d10x2');
  assert.ok(v.items.has('mine'));
});

test('CAPITAL and PILOT rules apply to stock groups through the same attack math', async () => {
  setPolicy('unrestricted');
  // frigate: a stock fire-linked laser cannon group takes the Core -20 against a small target
  const f = await armed('cw-c-9979-landing-craft');
  const fw = stockItems(f)[0];
  assert.ok(fw, 'the frigate\'s plain stock group is armed');
  const small = await fire(f, fw, target('medium'));
  assert.equal(small.result.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 1);
  const big = await fire(f, fw, target('colossal', 'vehicle'));
  assert.equal(big.result.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 0);
  assert.equal(small.result.atkBonus, big.result.atkBonus - 20);
  // trained Pilot +2: only for a pilot-crewed stock group fired by the assigned, Pilot-trained pilot
  const v = await armed(XW); const w = stockItems(v)[0];
  v.system.crewPositions = { pilot: { id: 'p1', name: 'Luke' } };
  const pilot = { id: 'p1', name: 'Luke', type: 'character', isOwner: true, items: [], system: { level: 4, attributes: { dex: { base: 14 }, int: { base: 10 }, str: { base: 10 } }, skills: { pilot: { trained: true } }, derived: { skills: { pilot: { trained: true } } } }, getRollData: () => ({}) };
  const realGet = globalThis.game.actors.get; globalThis.game.actors.get = id => (id === 'p1' ? pilot : null);
  try {
    const trained = await resolveVehicleAttackBonus(pilot, v, w, { target: target('medium', 'vehicle') });
    assert.equal(trained.ledger.filter(e => e.id === 'pilot-trained-weapon-crew').length, 1);
    pilot.system.skills.pilot.trained = false; pilot.system.derived.skills.pilot.trained = false;
    assert.equal((await resolveVehicleAttackBonus(pilot, v, w, { target: target('medium', 'vehicle') })).ledger.some(e => e.id === 'pilot-trained-weapon-crew'), false);
  } finally { globalThis.game.actors.get = realGet; }
  const abs = await resolveAbstractCrewAttackBonus(v, w, 'skilled', { target: target() });
  assert.equal(abs.ledger.some(e => e.id === 'pilot-trained-weapon-crew'), false, 'abstract crew never gets it');
  assert.equal(abs.ledger.find(e => e.id === 'published-statblock-attack').value, 5, 'the printed total, not a recomposition from the legacy tier table');
  setPolicy(undefined);
});

// ---------------------------------------------------------------------------------------------------------------------
// CORPUS: every executable stock group of every published vehicle runs the real chain
// ---------------------------------------------------------------------------------------------------------------------
const CAPITAL_SIZES_FOR_TEST = new Set(['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']);
const CAPITAL_SIZES = new Set(['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']);

test('CORPUS: each executable stock group arms, attacks at its printed total, and resolves its published damage', async () => {
  setPolicy('unrestricted');
  const provenGroups = new Set(); let provenModes = 0;
  const failures = [];
  const modesOf = g => (g.modes ? Object.entries(g.modes).filter(([, m]) => m.executable).map(([k, m]) => [k, m.attackBasis.printed]) : [['single', g.attackBonusPrinted]]);
  for (const d of docs) {
    const rec = d.flags.swse.universalVehicleSource.source;
    const groups = assessStockWeaponGroups(rec).groups.filter(g => g.executable);
    if (!groups.length) continue;
    const v = await armed(keyOf(d));
    const items = stockItems(v);
    const expectedItems = groups.reduce((n, g) => n + modesOf(g).length, 0);
    if (items.length !== expectedItems) { failures.push(`${keyOf(d)}: armed ${items.length} of ${expectedItems}`); continue; }
    for (const g of groups) {
      for (const [mode, printed] of modesOf(g)) {
        const w = items.find(i => i.flags.swse.vehicleStockWeapon.groupKey === g.groupKey && (i.flags.swse.vehicleStockWeapon.fireMode ?? 'single') === mode);
        if (!w) { failures.push(`${g.groupKey}|${mode}: not armed`); continue; }
        const capital = CAPITAL_SIZES.has(rec.classification.printedSize);
        const r = await fire(v, w, target('medium'));
        const expectBonus = printed + (capital ? -20 : 0);
        let ok = r.result && r.result.atkBonus === expectBonus && !r.blocked;
        let formula = null;
        try { formula = buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })); } catch (e) { ok = false; failures.push(`${g.groupKey}|${mode}: damage ${e.message}`); }
        if (formula !== (g.damage.multiplier > 1 ? `(${g.damage.formula}) * ${g.damage.multiplier}` : g.damage.formula)) ok = false;
        if (!ok) failures.push(`${g.groupKey}|${mode}: attack ${r.result?.atkBonus} expected ${expectBonus}; ${r.log.join('|')}; damage ${formula}`);
        else { provenGroups.add(g.groupKey); provenModes++; }
      }
    }
  }
  assert.deepEqual(failures, []);
  assert.equal(provenGroups.size, 348, 'the corpus-wide count of offline-executable stock GROUPS (each counted once)');
  assert.equal(provenModes, 349, 'one group (Krayt\'s Honor turbolaser battery) supports two modes');
  setPolicy(undefined);
});

test('COVERAGE REPORT: current, and its executable counts are exactly what the CORPUS test proves', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['tools/audits/vehicles/build-stock-weapon-coverage.mjs', '--check']);
  const { readFileSync } = await import('node:fs');
  const cov = JSON.parse(readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
  assert.deepEqual([cov.totals.vehicles, cov.totals.groups, cov.totals.offlineExecutableGroups, cov.totals.vehiclesWithOfflineExecutableGroup, cov.totals.liveVerifiedVehicles], [429, 846, 348, 256, 0]);
  const exec = cov.vehicles.flatMap(v => v.groups.filter(g => g.offlineExecutable));
  assert.equal(exec.length, 348);
  for (const g of cov.vehicles.flatMap(v => v.groups)) {
    assert.equal(g.liveVerified, false);
    if (!g.offlineExecutable) { assert.ok(g.refusals.length > 0, g.groupKey + ' has a named refusal'); assert.equal(g.attackReadiness, 'REFUSED'); }
  }
  // representative common ships are in the executable set
  const names = new Set(cov.vehicles.filter(v => v.offlineExecutableGroups).map(v => v.sourceEntryKey));
  for (const k of [XW, 'core-tie-fighter', 'core-corellian-yt-1300-transport', 'core-koensayr-y-wing-starfighter', 'core-arc-170-starfighter']) assert.ok(names.has(k), k);
});

test('AMMUNITION-LIMITED groups are never executable (no magazine authority); an ion-NAMED group runs only when the source types its damage as ion', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const ammo = all.filter(x => /\b(missiles?|torpedo(es)?|rockets?|mines?|bombs?|grenades?|launchers?|projectiles?)\b/i.test(x.g.label));
  assert.ok(ammo.length > 50, 'there are many ammunition-based groups');
  for (const x of ammo) { assert.equal(x.g.executable, false, `${x.key}: ${x.g.label}`); assert.ok(x.g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED')); }
  // a name alone never types damage: an executable ion-named group has the ion type stated by its source (P6C-2C, see p27)
  for (const x of all.filter(y => /\bion\b/i.test(y.g.label))) {
    if (x.g.executable) assert.equal(x.g.damage.type, 'ion', `${x.key}: ${x.g.label}`);
    else assert.ok(x.g.reasons.length > 0, `${x.key}: ${x.g.label}`);
  }
  // the executable set contains no wording that denotes finite ammunition
  assert.equal(all.filter(x => x.g.executable && /missile|torpedo|mine|rocket|bomb|grenade|launcher/i.test(x.g.label)).length, 0);
});

test('COPILOT-operated stock groups: armed, fire from the copilot station, and get no pilot bonus', async () => {
  const key = 'cw-barloz-class-freighter';
  const rec = docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
  const g = assessStockWeaponGroups(rec).groups.find(x => x.operator === 'copilot' && x.executable);
  assert.ok(g, 'a copilot group is executable');
  const v = await armed(key); const w = stockItems(v).find(i => i.flags.swse.vehicleStockWeapon.groupKey === g.groupKey);
  assert.equal(w.system.vehicleMount.crewRole, 'copilot');
  setPolicy(undefined);
  const r = await fire(v, w);
  assert.equal(r.blocked, false, r.log.join('|'));
  assert.ok(r.result);
  assert.equal(g.attackBasis.kind, 'BAB_PLUS_INT', 'a copilot total gets no trained-Pilot +2');
  assert.equal(r.result.componentLedger.some(e => e.id === 'pilot-trained-weapon-crew'), false);
  v.system.crewPositions = { copilot: { id: 'gone', name: 'Ghost' } };          // an assigned copilot that no longer exists
  assert.equal((await fire(v, w)).result, null);
});

// ---------------------------------------------------------------------------------------------------------------------
// P6C-2A: plain dice and generalized multipliers
// ---------------------------------------------------------------------------------------------------------------------
const stockOf = async (key, label) => { const v = await armed(key); const w = stockItems(v).find(i => i.name === label); assert.ok(w, `${key}: ${label} armed`); return { v, w }; };

test('P6C-2A plain damage: a printed expression with no multiplier is the dice (x1), never x2; real published examples', async () => {
  setPolicy(undefined);
  for (const [key, label, dice] of [['cw-barc-speeder', 'twin light blaster cannons', '5d10'], ['cw-republic-troop-transport', 'laser cannons', '4d10'], ['le-quickfire-speeder-bike', 'Blaster cannon', '3d10'], ['ur-wind-skiff', 'Debris Clearing Laser Cannon', '3d10']]) {
    const { v, w } = await stockOf(key, label);
    assert.equal(w.system.damage, dice, 'the Item mirrors the printed dice');
    assert.deepEqual(resolveVehicleWeaponDamage(w), { ok: true, formula: dice, multiplier: 1, damageType: null, printed: dice });
    const f = ctx => buildDamageFormula(resolveDamageComposition(v, w, { weapon: w, ...ctx }));
    assert.equal(f({}), dice, `${key}: plain dice, no multiplier, no added modifier`);
    assert.equal(f({ isCritical: true }), `(${dice}) * 2`, 'a critical doubles the plain damage once');
    const r = await fire(v, w);
    assert.equal(r.blocked, false, `${key}: ${r.log.join('|')}`);
  }
});

test('P6C-2A capital multipliers: x5 is multiplication, never exploding dice; critical and ordering are correct', async () => {
  setPolicy(undefined);
  for (const [key, label, dice, mult] of [['cw-self-propelled-heavy-artillery', 'SPHA-T heavy turbolaser', '7d10', 5], ['sotg-banking-clan-munificent-class-frigate', 'heavy turbolasers', '11d10', 5], ['sotg-venator-class-star-destroyer', 'medium double turbolasers', '6d10', 5], ['re-lancet-aerial-artillery', 'Proton beam cannon', '6d10', 5]]) {
    const { v, w } = await stockOf(key, label);
    assert.equal(w.system.damage, `${dice}x${mult}`);
    assert.deepEqual(resolveVehicleWeaponDamage(w), { ok: true, formula: dice, multiplier: mult, damageType: null, printed: `${dice}x${mult}` });
    const f = ctx => buildDamageFormula(resolveDamageComposition(v, w, { weapon: w, ...ctx }));
    assert.equal(f({}), `(${dice}) * ${mult}`);
    assert.doesNotMatch(f({}), /x\d/, 'the printed x5 never reaches Foundry as an exploding-dice modifier');
    assert.equal(f({ isCritical: true }), `((${dice}) * ${mult}) * 2`, 'critical doubles the multiplied total once');
    const r = await fire(v, w, target('medium'));
    assert.equal(r.blocked, false, `${key}: ${r.log.join('|')}`);
  }
});

test('P6C-2A capital ships: the Core -20 is applied once at attack time and the statblock\'s vs-small figure is only a consistency check', async () => {
  setPolicy(undefined);
  const { v, w } = await stockOf('sotg-venator-class-star-destroyer', 'medium double turbolasers');
  const rec = v.flags.swse.universalVehicleSource.source;
  const g = assessStockWeaponGroups(rec).groups.find(x => x.label === 'medium double turbolasers');
  assert.equal(g.executable, true);
  const evKey = Object.keys(g.evidence).find(k => /smaller/i.test(k));
  assert.equal(g.evidence[evKey], g.attackBonusPrinted - 20, 'the printed vs-smaller-than-Colossal figure is the printed total minus 20');
  const small = await fire(v, w, target('medium')), big = await fire(v, w, target('colossal', 'vehicle'));
  assert.equal(small.result.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 1);
  assert.equal(small.result.atkBonus, g.evidence[evKey], 'attack against a small target equals the statblock\'s own figure');
  assert.equal(big.result.atkBonus, g.attackBonusPrinted);
  // a size-dependent figure that is NOT printed - 20, or a ship the rule does not cover, is refused
  const bad = structuredClone(rec); bad.armament.firingGroups.find(x => x.label === 'medium double turbolasers').specialNotes = bad.armament.firingGroups.find(x => x.label === 'medium double turbolasers').specialNotes.replace(/"(\w*[Ss]maller\w*)":-?\d+/, '"$1":-3');
  assert.ok(assessStockWeaponGroups(bad).groups.find(x => x.label === 'medium double turbolasers').reasons.includes('STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT'));
  for (const key of ['sotg-eclipse', 'sotg-sienar-fleet-systems-gat-12h']) {
    const r2 = docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
    assert.ok(assessStockWeaponGroups(r2).groups.some(x => x.reasons.includes('STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT')), key);
  }
});

test('P6C-2A: a group with a plain multiplier but another special mechanic stays refused; area-looking names only deny', () => {
  const find = (key, label) => assessStockWeaponGroups(docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source).groups.find(x => x.label === label);
  const flak = find('re-at-aa-anti-aircraft-platform', 'Flak pod');
  assert.deepEqual([flak.executable, flak.damage.multiplier], [false, 5]);
  assert.ok(flak.reasons.includes('STOCK_POSSIBLE_AREA_WEAPON_UNVERIFIED'));
  const pulse = find('kotor-basilisk-war-droid', 'pulse-wave cannons');
  assert.equal(pulse.executable, false);
  const torp = find('cw-cr-20-troop-carrier', 'fire-linked medium turbolasers');
  assert.ok(torp, 'turbolaser group parsed');
});

// ---------------------------------------------------------------------------------------------------------------------
// The structured source evidence is read as a whole (fail closed): the audit found 8 groups that were executable although
// their evidence states a mechanic the runtime does not model.
// ---------------------------------------------------------------------------------------------------------------------
test('EVIDENCE GATE: area, variant-specific, qualitatively-aimed and specially-notated groups are refused by name', () => {
  const find = (key, label) => assessStockWeaponGroups(docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source).groups.find(g => g.label === label);
  const pulse = find('cw-subjugator-class-heavy-cruiser', 'ion pulse cannons');
  assert.equal(pulse.executable, false);
  assert.ok(pulse.reasons.includes('STOCK_DAMAGE_AREA_OR_SPLASH'), 'a 5-square area weapon with hit/miss/recharge rules is not a plain weapon');
  const variants = assessStockWeaponGroups(docs.find(d => /belbullab/i.test(keyOf(d))).flags.swse.universalVehicleSource.source).groups.filter(g => /Belbullab-2\d/.test(g.label));
  assert.ok(variants.length >= 2 && variants.every(g => !g.executable && g.reasons.includes('STOCK_VARIANT_SPECIFIC_GROUP_UNMODELED')), 'a group that applies to only some variants is not armed on the generic ship');
  const scurrg = assessStockWeaponGroups(docs.find(d => /scurrg/i.test(keyOf(d))).flags.swse.universalVehicleSource.source).groups.find(g => /forward-mounted/.test(g.label));
  assert.ok(scurrg.reasons.includes('STOCK_FIRING_ARC_STATED_UNPARSED'), 'a qualitative direction the source calls "not a fully defined firing arc" is a stated, uninterpreted arc');
  assert.equal(scurrg.executable, false);
  // an unknown evidence key refuses; a null figure refuses nothing
  const rec = structuredClone(docs.find(d => keyOf(d) === XW).flags.swse.universalVehicleSource.source);
  const lc = rec.armament.firingGroups.find(g => g.label === 'laser cannons');
  const base = assessStockWeaponGroups(rec).groups.find(g => g.label === 'laser cannons');
  assert.equal(base.executable, true);
  lc.specialNotes = lc.specialNotes.replace(/\{[^{}]*\}/, m => m.replace('}', ',"mysteryMechanic":1}'));
  if (!/\{/.test(lc.specialNotes)) lc.specialNotes += ' remaining source attack evidence {"mysteryMechanic":1}';
  const unknown = assessStockWeaponGroups(rec).groups.find(g => g.label === 'laser cannons');
  assert.ok(unknown.reasons.includes('STOCK_EVIDENCE_UNMODELED'));
  assert.equal(unknown.executable, false);
});

test('EVIDENCE GATE invariant: no executable group carries an evidence key outside the understood set', () => {
  const understood = new Set(['firingArc', 'damageType', 'hardwareCount', 'hardwareCountBasis', 'hardwareCountKind', 'hardwareCountStatus', 'hardwareEvidence', 'physicalMountCount', 'physicalMountSource', 'physicalCountEvidence', 'narrativePhysicalCount', 'printedMultiplicity', 'printedRangedMultiplicity', 'rangedMultiplicity', 'printedRangedGroupCount', 'printedRangedCount', 'printedRangedWeaponCount', 'firingGroupCountEvidence', 'attackGroupIndex', 'batteryCount', 'batteryComposition', 'gunnerCountPrinted', 'sourceEvidenceStatus', 'printedWeaponDesignation', 'fireLink', 'fireLinkOption', 'autofire', 'autofireBonus', 'autofireAttackBonus', 'auto', 'ammunition', 'attackScale', 'specialAttackNotation', 'qualitativeDirection', 'applicableVariants']);
  const sizeKey = /smaller|small|vs|against/i;
  for (const d of docs) for (const g of assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.filter(x => x.executable)) {
    for (const [k, v] of Object.entries(g.evidence ?? {})) {
      assert.ok(understood.has(k) || sizeKey.test(k), `${g.groupKey}: unexplained evidence key ${k}`);
      if (['specialAttackNotation', 'qualitativeDirection'].includes(k)) assert.ok(!v, `${g.groupKey}: ${k} must be empty on an executable group`);
      if (k === 'applicableVariants') assert.equal(v?.length ?? 0, 0);
      if (k === 'ammunition') assert.equal(v, 'SOURCE_SILENT_CONFIRMED');
    }
  }
});
