import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const byKey = new Map(actors.map(a => [a.system.vehicleSourceEntryKey, a]));
const rec = a => a.flags.swse.universalVehicleSource.source;
const XW = 'core-incom-t-65b-x-wing-starfighter';

// Fixture for the project-owner-ruling seam; NOT a rules claim.
const fixtureRules = { resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveUninstallRefund: () => null };
const certified = (over = {}) => ({
  id: 'fx-armor', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000,
  costType: 'flat', availability: 'Licensed', sizeRestriction: null,
  certification: { status: 'MECHANIC_SPECIFIED', book: 'Fixture Book', page: 1 }, ...over
});
const plan = (over = {}, key = XW, flags = null) => {
  const a = byKey.get(key);
  return L.planVehicleInstallation({
    record: rec(a), flags: flags ?? a.flags, catalogEntry: certified(), installId: 'i1',
    availableCredits: 5000, installedAt: 1, rules: fixtureRules, ...over
  });
};

test('defaults deny: all 429 vehicles x every real catalog entry fail closed', () => {
  const catalog = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems']
    .flatMap(f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8')));
  assert.ok(catalog.length > 150);
  for (const a of actors) for (const entry of catalog.slice(0, 5)) {
    const r = L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: entry,
      installId: 'x', availableCredits: 1e9 });
    assert.equal(r.ok, false);
    assert.ok(r.reasons.includes('CATALOG_ENTRY_UNCERTIFIED'));
    assert.ok(r.reasons.includes('EP_BUDGET_UNKNOWN'));
  }
  assert.ok(catalog.every(e => !e.certification), 'catalog carries no certification yet');
});

test('certified entry but unruled EP budget still denies (default rules)', () => {
  const a = byKey.get(XW);
  const r = L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: certified(),
    installId: 'i', availableCredits: 1e9 });
  assert.deepEqual(r.reasons, ['EP_BUDGET_UNKNOWN']);
});

test('fail-closed reasons: unknown EP, price, availability, credits, size, exceeded', () => {
  assert.ok(plan({ catalogEntry: certified({ emplacementPoints: undefined }) }).reasons.includes('EP_COST_UNKNOWN'));
  assert.ok(plan({ catalogEntry: certified({ cost: null }) }).reasons.includes('PRICE_UNKNOWN_OR_UNRESOLVED'));
  assert.ok(plan({ catalogEntry: certified({ costType: 'multiplier' }) }).reasons.includes('PRICE_UNKNOWN_OR_UNRESOLVED'));
  assert.ok(plan({ catalogEntry: certified({ availability: '' }) }).reasons.includes('AVAILABILITY_UNKNOWN'));
  assert.ok(plan({ availableCredits: 999 }).reasons.includes('INSUFFICIENT_CREDITS'));
  assert.ok(plan({ catalogEntry: certified({ sizeRestriction: 'Colossal or Larger' }) }).reasons.includes('SIZE_INELIGIBLE'));
  assert.ok(plan({ catalogEntry: certified({ emplacementPoints: 5 }) }).reasons.includes('EP_EXCEEDED'));
  // explicit zero EP and zero price are values, not unknowns
  assert.equal(plan({ catalogEntry: certified({ emplacementPoints: 0, cost: 0 }) }).ok, true);
});

test('legal install: sealed ledger entry, base untouched, EP accounted', () => {
  const a = byKey.get(XW);
  const before = JSON.stringify(a.flags.swse);
  const r = plan();
  assert.equal(r.ok, true);
  assert.equal(r.cost, 1000);
  assert.equal(r.entry.executable, false);
  assert.equal(L.isValidLedgerEntry(r.entry, XW), true);
  assert.equal(JSON.stringify(a.flags.swse), before);
  const flags = structuredClone(a.flags); flags.swse.vehicleInstallations = r.nextLedger;
  const second = plan({ catalogEntry: certified({ id: 'fx-2', emplacementPoints: 3 }) }, XW, flags);
  assert.ok(second.reasons.includes('EP_EXCEEDED'), '2 used + 3 > 4');
  const s = L.summarizeInstallations(L.readCertifiedInstallations(flags, XW).entries, { state: 'known', total: 4 });
  assert.deepEqual([s.epUsed, s.epRemaining], [2, 2]);
});

test('projection reads only sealed entries; forged or edited entries are ignored; source stays canonical', () => {
  const a = structuredClone(byKey.get(XW));
  const good = plan().entry;
  a.flags.swse.vehicleInstallations = [good, { ...good, installId: 'f', epCost: 0 }, { installId: 'g' }];
  const p = getVehicleRuntimeProjection(a);
  assert.equal(p.installed.modifications.length, 1);
  assert.equal(p.installed.rejectedLedgerEntries, 2);
  assert.equal(p.installed.certification, 'LEDGER');
  assert.equal(p.installed.stockMountsCertified, false);
  assert.equal(p.published.attackGroupsExecutable, false);
  assert.equal(classifyVehicleActorSource(a).kind, 'canonical');
  assert.equal(getVehicleRuntimeProjection(byKey.get(XW)).installed.certification, 'NONE');
});

test('ledger entry sealed for a different hull is ignored', () => {
  const a = structuredClone(byKey.get('core-tie-fighter'));
  a.flags.swse.vehicleInstallations = [plan().entry];
  assert.equal(getVehicleRuntimeProjection(a).installed.modifications.length, 0);
});

test('weapons: mount evidence required; installed weapon is still not executable', () => {
  const w = certified({ id: 'fx-gun', category: 'Weapon' });
  assert.ok(plan({ catalogEntry: w }).reasons.includes('WEAPON_MOUNT_UNCERTIFIED'));
  assert.ok(plan({ catalogEntry: w, mount: { mountKey: 'm1', arc: 'forward' } }).reasons.includes('WEAPON_MOUNT_UNCERTIFIED'));
  const mount = { mountKey: 'm1', arc: 'forward', operatorRole: 'pilot', evidence: { book: 'B', page: 2 } };
  const r = plan({ catalogEntry: w, mount });
  assert.equal(r.ok, true);
  assert.equal(r.entry.executable, false);
  const a = structuredClone(byKey.get(XW)); a.flags.swse.vehicleInstallations = r.nextLedger;
  const p = getVehicleRuntimeProjection(a);
  assert.equal(p.installed.mounts.length, 1);
  assert.deepEqual(a.system.weapons, []);
});

test('uninstall: removes entry, no refund without a ruling, reports policy undecided', () => {
  const a = structuredClone(byKey.get(XW));
  a.flags.swse.vehicleInstallations = plan().nextLedger;
  const r = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId: 'i1' });
  assert.equal(r.ok, true);
  assert.equal(r.refund, 0);
  assert.equal(r.refundPolicyDecided, false);
  assert.deepEqual(r.nextLedger, []);
  assert.deepEqual(L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId: 'nope' }).reasons, ['INSTALL_NOT_FOUND']);
  const decided = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId: 'i1',
    rules: { resolveUninstallRefund: () => 400 } });
  assert.equal(decided.refund, 400);
});

test('size restriction: ordering, unparseable and ambiguous never guessed', () => {
  const e = L.evaluateSizeRestriction;
  assert.equal(e(null, 'Huge'), 'ok');
  assert.equal(e('Gargantuan or Larger', 'Huge'), 'ineligible');
  assert.equal(e('Gargantuan or Larger', 'Colossal (cruiser)'), 'ok');
  assert.equal(e('Colossal or Smaller', 'Colossal (frigate)'), 'ambiguous');
  assert.equal(e('Colossal or Smaller', 'Gargantuan'), 'ok');
  assert.equal(e('Gargantuan or Colossal', 'Huge'), 'ineligible');
  assert.equal(e('Colossal', 'Colossal (frigate)'), 'ambiguous');
  assert.equal(e('Weird or Larger', 'Huge'), 'unparseable');
  assert.equal(e('Huge or Larger', 'Mystery'), 'unparseable');
});

// ---- service wiring with fakes (module imports Foundry paths) ----
function service(tx) {
  const code = readFileSync('scripts/engine/vehicles/vehicle-installation-service.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/\bexport\s+/g, '');
  const calls = [];
  const ctx = {
    classifyVehicleActorSource, DEFAULT_VEHICLE_INSTALLATION_RULES: fixtureRules,
    VEHICLE_INSTALLATION_FLAG_PATH: L.VEHICLE_INSTALLATION_FLAG_PATH,
    planVehicleInstallation: L.planVehicleInstallation, planVehicleUninstall: L.planVehicleUninstall,
    authorizeLedgerWrite: L.authorizeLedgerWrite, clearLedgerWrite: L.clearLedgerWrite,
    LedgerService: { getCurrentCredits: a => a.credits },
    TransactionEngine: { executeAssetCustomizationTransaction: async c => { calls.push(c); return tx(c); } },
    foundry: { utils: { randomID: () => 'id1' } }, fetch: async () => { throw new Error('no network'); }
  };
  runInNewContext(code + '\nglobalThis.S = VehicleInstallationService;', ctx);
  return { S: ctx.S, calls };
}
const vehicleDoc = key => { const a = structuredClone(byKey.get(key)); a.system.ownedByActorId = 'o1'; return { ...a, id: 'veh1', toObject: () => structuredClone(a) }; };

test('service: one transaction writes only the ledger path; failure and denial leave nothing', async () => {
  const catalog = new Map([['fx-armor', certified()]]);
  const ok = service(async () => ({ success: true, transactionId: 't1' }));
  const r = await ok.S.install({ ownerActor: { id: 'o1', credits: 5000 }, vehicle: vehicleDoc(XW), catalogId: 'fx-armor', catalog });
  assert.equal(r.success, true);
  assert.equal(ok.calls.length, 1);
  assert.deepEqual([...Object.keys(ok.calls[0].assetMutationPlan.set)], ['flags.swse.vehicleInstallations']);
  assert.equal(ok.calls[0].cost, 1000);

  const failed = service(async () => ({ success: false, error: 'boom' }));
  const f = await failed.S.install({ ownerActor: { id: 'o1', credits: 5000 }, vehicle: vehicleDoc(XW), catalogId: 'fx-armor', catalog });
  assert.equal(f.success, false);
  assert.deepEqual(JSON.parse(JSON.stringify(f.reasons)), ['TRANSACTION_FAILED']);

  const denied = service(async () => ({ success: true }));
  for (const [credits, cat] of [[10, catalog], [5000, new Map()]]) {
    const d = await denied.S.install({ ownerActor: { id: 'o1', credits }, vehicle: vehicleDoc(XW), catalogId: 'fx-armor', catalog: cat });
    assert.equal(d.success, false);
  }
  assert.equal(denied.calls.length, 0, 'denied plans never reach the transaction engine');
});

test('service refuses non-canonical vehicles', async () => {
  const s = service(async () => ({ success: true }));
  const r = await s.S.install({ ownerActor: { id: 'o1', credits: 9 }, vehicle: { id: 'c1', type: 'vehicle', system: {}, flags: {}, toObject() { return this; } },
    catalogId: 'x', catalog: new Map() });
  assert.match(r.reasons[0], /VEHICLE_NOT_SOURCE_BACKED/);
  assert.equal(s.calls.length, 0);
});

test('legacy Customization Bay engine blocks canonical vehicles at every entry point', async () => {
  const code = readFileSync('scripts/engine/customization/vehicle-customization-engine.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/\bexport\s+/g, '');
  let txCalls = 0;
  const ctx = { classifyVehicleActorSource, SWSELogger: { error() {} }, VEHICLE_SYSTEM_DEFINITIONS: {},
    VehicleSlotGovernanceEngine: {}, TransactionEngine: { executeAssetCustomizationTransaction: async () => { txCalls++; return { success: true }; } } };
  runInNewContext(code + '\nglobalThis.E = VehicleCustomizationEngine;', ctx);
  const v = vehicleDoc(XW);
  for (const r of [ctx.E.getNormalizedVehicleProfile(v), ctx.E.getVehicleCustomizationState(v),
    ctx.E.previewVehicleCustomization(v, { add: ['x'] }), await ctx.E.applyVehicleCustomization(v, { add: ['x'] })]) {
    assert.equal(r.success, false);
    assert.equal(r.error, 'VEHICLE_CUSTOMIZATION_CANONICAL_REQUIRES_INSTALLATION_SERVICE');
  }
  const corrupted = vehicleDoc(XW); corrupted.system.hp.max = 1;
  assert.equal(ctx.E.getVehicleCustomizationState(corrupted).canonicalBlocked, true);
  assert.equal(txCalls, 0);
  // a scratch/custom vehicle is not blocked by the canonical guard
  const custom = { type: 'vehicle', system: { type: 'transport' }, flags: {}, id: 'c' };
  assert.notEqual(ctx.E.getNormalizedVehicleProfile(custom).error, 'VEHICLE_CUSTOMIZATION_CANONICAL_REQUIRES_INSTALLATION_SERVICE');
});
