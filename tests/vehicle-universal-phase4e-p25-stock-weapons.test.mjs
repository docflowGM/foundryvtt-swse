import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { resolveTrustedStockAttackGroup } from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';
import { STOCK_ARC_POLICY } from '../scripts/domain/vehicles/vehicle-stock-arc-policy.js';

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

test('ARC POLICY: by default a stock attack is blocked (the source states no arc); the owner policy unlocks it', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  setPolicy('gm-per-attack');
  const blocked = await fire(v, w);
  assert.equal(blocked.result, null);
  assert.match(blocked.log.join('|'), /TRUSTED_GM_CONTEXT_REQUIRED/, 'without a GM adjudication the source-silent arc blocks the attack');
  setPolicy('unrestricted');
  const ok = await fire(v, w);
  assert.equal(ok.blocked, false, ok.log.join('|'));
  assert.ok(ok.result);
  setPolicy(undefined);
});

test('CREW -> TARGET -> ATTACK: generic crew reproduces the printed +5; breakdown shows the published Base Attack', async () => {
  const v = await armed(XW); const w = stockItems(v)[0];
  setPolicy('unrestricted');
  const r = await fire(v, w);
  assert.equal(r.result.attackDomain, 'vehicle-abstract-crew');
  assert.equal(r.result.atkBonus, 5, 'published Base Atk +2 plus Intelligence 16 (+3) equals the statblock\'s laser cannons +5');
  const ledger = r.result.componentLedger;
  assert.equal(ledger.find(e => e.id === 'crew-quality-bab').value, 2);
  assert.match(ledger.find(e => e.id === 'crew-quality-bab').label, /published statblock/);
  assert.equal(ledger.find(e => e.id === 'vehicle-int').value, 3);
  assert.equal(ledger.some(e => e.id === 'capital-ship-attack-penalty'), false, 'a Gargantuan starfighter takes no capital penalty');
  setPolicy(undefined);
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
  assert.equal(abs.ledger.find(e => e.id === 'crew-quality-bab').value, 2, 'published Base Atk, not the legacy tier table (skilled would have been 5)');
  setPolicy(undefined);
});

// ---------------------------------------------------------------------------------------------------------------------
// CORPUS: every executable stock group of every published vehicle runs the real chain
// ---------------------------------------------------------------------------------------------------------------------
const CAPITAL_SIZES = new Set(['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']);

test('CORPUS: each executable stock group arms, attacks at its printed total, and resolves its published damage', async () => {
  setPolicy('unrestricted');
  const proven = [];
  const failures = [];
  for (const d of docs) {
    const rec = d.flags.swse.universalVehicleSource.source;
    const groups = assessStockWeaponGroups(rec).groups.filter(g => g.executable);
    if (!groups.length) continue;
    const v = await armed(keyOf(d));
    const items = stockItems(v);
    if (items.length !== groups.length) { failures.push(`${keyOf(d)}: armed ${items.length} of ${groups.length}`); continue; }
    for (const g of groups) {
      const w = items.find(i => i.flags.swse.vehicleStockWeapon.groupKey === g.groupKey);
      const capital = CAPITAL_SIZES.has(rec.classification.printedSize);
      const r = await fire(v, w, target('medium'));
      const penalty = capital ? -20 : 0;
      const expectBonus = g.attackBonusPrinted + penalty;
      let ok = r.result && r.result.atkBonus === expectBonus && !r.blocked;
      let formula = null;
      try { formula = buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })); } catch (e) { ok = false; failures.push(`${g.groupKey}: damage ${e.message}`); }
      if (formula !== `(${g.damage.formula}) * ${g.damage.multiplier}`) ok = false;
      if (!ok) failures.push(`${g.groupKey}: attack ${r.result?.atkBonus} expected ${expectBonus}; ${r.log.join('|')}; damage ${formula}`);
      else proven.push(g.groupKey);
    }
  }
  assert.deepEqual(failures, []);
  assert.equal(proven.length, 62, 'the corpus-wide count of offline-executable stock groups');
  setPolicy(undefined);
});

test('COVERAGE REPORT: current, and its executable counts are exactly what the CORPUS test proves', async () => {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['tools/audits/vehicles/build-stock-weapon-coverage.mjs', '--check']);
  const { readFileSync } = await import('node:fs');
  const cov = JSON.parse(readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
  assert.deepEqual([cov.totals.vehicles, cov.totals.groups, cov.totals.offlineExecutableGroups, cov.totals.vehiclesWithOfflineExecutableGroup, cov.totals.liveVerifiedVehicles], [429, 846, 62, 51, 0]);
  const exec = cov.vehicles.flatMap(v => v.groups.filter(g => g.offlineExecutable));
  assert.equal(exec.length, 62);
  for (const g of cov.vehicles.flatMap(v => v.groups)) {
    assert.equal(g.liveVerified, false);
    if (!g.offlineExecutable) { assert.ok(g.refusals.length > 0, g.groupKey + ' has a named refusal'); assert.equal(g.attackReadiness, 'REFUSED'); }
  }
  // representative common ships are in the executable set
  const names = new Set(cov.vehicles.filter(v => v.offlineExecutableGroups).map(v => v.sourceEntryKey));
  for (const k of [XW, 'core-tie-fighter', 'core-corellian-yt-1300-transport', 'core-koensayr-y-wing-starfighter', 'core-arc-170-starfighter']) assert.ok(names.has(k), k);
});
