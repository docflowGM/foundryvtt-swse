/**
 * Stock finite-ammunition reconciliation: the payload a statblock PRINTS on its Payload line (recorded in armament.carriedPayloads) is attached to the group
 * whose exact ammunition it is; launcher designations are read with grammatical normalization only; a launcher COUNT is accepted only when the statblock prints
 * it for a launcher-named group. Nothing is inferred: shared, composite, unsized or qualified payloads and unprinted launcher counts leave the group blocked on that
 * one fact. Also: the armed / unarmed classification of the vehicles with no printed attack group comes from the printed statblock, never from a guess.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
installSystemsResolver(); installFoundryStubs();
const L = await import('../scripts/domain/vehicles/vehicle-ammunition-ledger.js');
const { assessStockWeaponGroups } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const recordOf = key => docs.find(d => d.flags.swse.canonicalPublication.sourceEntryKey === key).flags.swse.universalVehicleSource.source;

test('DESIGNATIONS: only grammatical normalization; an unsized or other wording names no launcher', () => {
  for (const [label, key] of [['medium concussion missile', 'medium concussion missiles'], ['Proton torpedo launchers', 'proton torpedoes'], ['proton torpedoes', 'proton torpedoes'], ['Heavy concussion missile launcher', 'heavy concussion missiles'], ['light concussion missiles', 'light concussion missiles'], ['shieldbuster torpedo', 'shieldbuster torpedoes']])
    assert.equal(L.launcherDesignationOf(label)?.key, key, label);
  for (const label of ['concussion missile launcher', 'missile launchers', 'grenade launcher', 'torpedo launchers', 'proton torpedo battery', '']) assert.equal(L.launcherDesignationOf(label), null, label);
  assert.equal(L.launcherDesignationOf('proton torpedo launchers').viaLauncherWord, true);
  assert.equal(L.launcherDesignationOf('proton torpedoes').viaLauncherWord, false);
});

test('PRINTED PAYLOAD: one exact single-item entry claimed by exactly one group; composite, unsized, qualified and shared payloads are not used', () => {
  const p = (unit, value = 8) => ({ value, unit, raw: `${value} ${unit}` });
  assert.deepEqual(L.matchPrintedPayload('proton torpedoes', [p('proton torpedoes', 6)], ['laser cannons', 'proton torpedoes']), { value: 6, raw: '6 proton torpedoes' });
  assert.equal(L.matchPrintedPayload('Medium concussion missile', [p('medium concussion missiles', 12)], ['Medium concussion missile'])?.value, 12, 'a mangled-space unit still matches its exact words');
  assert.equal(L.matchPrintedPayload('proton torpedoes', [p('protontorpedoes', 5)], ['proton torpedoes'])?.value, 5);
  assert.equal(L.matchPrintedPayload('medium concussion missiles', [p('concussion missiles', 12)], ['medium concussion missiles']), null, 'an unsized payload does not name the size');
  assert.equal(L.matchPrintedPayload('medium concussion missiles', [p('heavy concussion missiles', 12)], ['medium concussion missiles']), null, 'a different size');
  assert.equal(L.matchPrintedPayload('proton torpedoes', [p('proton torpedoes; 6 concussion missiles', 6)], ['proton torpedoes']), null, 'composite');
  assert.equal(L.matchPrintedPayload('concussion missiles', [p('concussion missiles (Belbullab-24 only)', 12)], ['concussion missiles']), null, 'variant-qualified');
  assert.equal(L.matchPrintedPayload('proton torpedoes', [p('proton torpedoes', 6)], ['proton torpedoes', 'proton torpedo launcher']), null, 'two groups could share one payload');
  assert.equal(L.matchPrintedPayload('proton torpedoes', [p('proton torpedoes', 6), p('proton torpedoes', 8)], ['proton torpedoes']), null, 'two entries');
  assert.equal(L.matchPrintedPayload('proton torpedoes', [p('proton torpedoes', 0)], ['proton torpedoes']), null);
});

test('LAUNCHER COUNT: printed only -- a number on a launcher-named group completes the family; an ammunition-named group, a battery or no number does not', () => {
  const ev = (hardwareCount, extra = {}) => ({ label: 'proton torpedo launchers', evidence: { payloadCount: 8, hardwareCount, ...extra }, battery: null });
  const two = L.resolveLauncherFamily(ev(2));
  assert.deepEqual([two.status, two.family.launchers, two.family.allocation], ['complete', 2, 'printed-launcher-count']);
  assert.deepEqual([L.resolveLauncherFamily(ev(1)).family.allocation, L.resolveLauncherFamily(ev(1)).family.launchers], ['single-launcher-verified', 1]);
  assert.equal(L.resolveLauncherFamily({ ...ev(3), label: 'proton torpedoes' }).status, 'allocation-required', 'a count on an ammunition-named group is not read as a launcher count');
  assert.equal(L.resolveLauncherFamily({ ...ev(2), battery: { gunners: 2 } }).status, 'allocation-required');
  assert.equal(L.resolveLauncherFamily(ev('SOURCE_SILENT_CONFIRMED')).status, 'allocation-required');
  // its ledger carries the printed launcher count and validates against it
  const ledger = L.initialLedger(two.family);
  assert.deepEqual([ledger.launchers, ledger.loaded, ledger.reserve], [2, 6, 2]);
  assert.equal(L.validateLedger(ledger, two.family).ok, true);
  assert.equal(L.validateLedger({ ...ledger, launchers: 1 }, two.family).ok, false);
});

test('REAL RECORDS: the printed Payload line is attached to the group; the one unresolved fact left is the launcher count (never inferred)', () => {
  const azure = assessStockWeaponGroups(recordOf('cw-azure-angel')).groups.find(g => g.label === 'proton torpedoes');
  assert.equal(azure.executable, false);
  assert.ok(azure.reasons.includes('STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED'));
  assert.ok(!azure.reasons.includes('STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED') && !azure.reasons.includes('STOCK_LAUNCHER_IDENTITY_NOT_ESTABLISHED'));
  assert.deepEqual([azure.evidence.payloadCount, azure.ammunitionPending.payload, azure.ammunitionPending.launchers], [16, 16, null]);
  assert.match(azure.evidence.payloadSource, /armament\.carriedPayloads: 16 proton torpedoes/);
  // a composite or unsized Payload line is NOT used
  const hyena = assessStockWeaponGroups(recordOf('cw-hyena-class-bomber')).groups.filter(g => g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED'));
  for (const g of hyena) assert.equal(g.evidence.payloadSource, undefined, g.label);
});

test('COVERAGE NEVER REGRESSES: the canonical executable count is unchanged and GM configuration is still reported apart', () => {
  const c = JSON.parse(readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
  assert.equal(c.totals.offlineExecutableGroups, 542, '528 + the two finite-ammunition groups whose printed payload, launcher and launcher count establish a complete family + nine tractor-beam groups whose grapple modifier is printed in a spelling the gate now reads (p58) + three groups whose damage-line autofire figure reconciles with the printed total (p58)');
  assert.equal(c.totals.groups, 846);
  assert.ok(c.totals.gmConfigurableGroups >= 90);
  assert.equal(c.totals.liveVerifiedVehicles, 0);
});

test('ARMED / UNARMED: a vehicle leaves the armed denominator only with printed-statblock evidence; a statblock that prints an attack the record lacks stays armed and is a data defect', () => {
  const cert = JSON.parse(readFileSync('data/audits/vehicles/unarmed-vehicle-certification.json', 'utf8'));
  const c = JSON.parse(readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
  const noGroups = c.vehicles.filter(v => !(v.groups ?? []).length).map(v => v.sourceEntryKey).sort();
  assert.deepEqual(cert.rows.map(r => r.sourceEntryKey).sort(), noGroups, 'every vehicle with no printed attack group is classified, no other vehicle is');
  assert.deepEqual(cert.counts, { UNARMED_CONFIRMED: 38, ARMED_RECORD_GAP: 4 });
  for (const r of cert.rows) {
    assert.ok(r.evidence && r.evidence.file && Number.isInteger(r.evidence.statblockLine), r.sourceEntryKey);
    if (r.status === 'UNARMED_CONFIRMED') assert.deepEqual(r.evidence.attackLines, [], r.sourceEntryKey);
    if (r.status === 'ARMED_RECORD_GAP') assert.ok(r.evidence.attackLines.length >= 1 && /^Ranged|^Melee/.test(r.evidence.attackLines[0]), r.sourceEntryKey);
  }
  assert.deepEqual(cert.rows.filter(r => r.status === 'ARMED_RECORD_GAP').map(r => r.sourceEntryKey).sort(), ['cw-bc-714-luxury-transport', 'cw-sheathipede-class-shuttle', 'goi-corona-limited-luxury-groundspeeder', 'ur-landing-sphere']);
  assert.deepEqual([c.totals.vehicles, c.totals.unarmedCertifiedVehicles, c.totals.armedVehicles, c.totals.armedRecordGapVehicles], [429, 38, 391, 4]);
  assert.ok(c.totals.armedVehiclesWithExecutableGroup <= c.totals.armedVehicles && c.totals.armedVehiclesFullyExecutable <= c.totals.armedVehiclesWithExecutableGroup);
});

test('NEW CANONICAL GROUPS: the Starviper proton torpedo launcher (2 printed launchers, payload 6) and the Cutlass-9 medium concussion missile launcher (1 launcher, payload 8) run from source evidence alone', () => {
  const star = assessStockWeaponGroups(recordOf('sotg-mandalmotors-starviper-assault-fighter')).groups.find(g => g.label === 'proton torpedo launcher');
  assert.deepEqual([star.executable, star.ammunition.launchers, star.ammunition.payload, star.ammunition.capacity, star.ammunition.allocation], [true, 2, 6, 3, 'printed-launcher-count']);
  assert.match(star.evidence.payloadSource, /group evidence: payload/);
  const cut = assessStockWeaponGroups(recordOf('sotg-sorosuub-cutlass-9-patrol-fighter')).groups.find(g => g.label === 'medium concussion missile');
  assert.deepEqual([cut.executable, cut.ammunition.launchers, cut.ammunition.payload, cut.ammunition.capacity], [true, 1, 8, 16]);
  // the ledger of the 2-launcher family: loaded to the 6 carried (below its 2 x 3 magazine), validated against the printed count
  const ledger = L.initialLedger(star.ammunition);
  assert.deepEqual([ledger.launchers, ledger.loaded, ledger.reserve], [2, 6, 0]);
  assert.equal(L.validateLedger(ledger, star.ammunition).ok, true);
});

test('CERTIFIED OUTCOMES: every stock group is accounted for in exactly one outcome; canonical equals the executable count; a rules-decision outcome is only the launcher-count question', () => {
  const c = JSON.parse(readFileSync('data/audits/vehicles/stock-weapon-coverage.json', 'utf8'));
  const groups = c.vehicles.flatMap(v => v.groups);
  const total = Object.values(c.totals.outcomes).reduce((a, b) => a + b, 0);
  assert.equal(total, groups.length);
  assert.equal(c.totals.outcomes.CANONICAL_EXECUTABLE, c.totals.offlineExecutableGroups);
  assert.deepEqual(Object.keys(c.totals.outcomes).sort(), ['CANONICAL_EXECUTABLE', 'IMPLEMENTATION_REQUIRED', 'RULES_DECISION_REQUIRED', 'SOURCE_EVIDENCE_REQUIRED']);
  for (const g of groups) {
    assert.ok(g.outcome, g.groupKey);
    assert.equal(g.outcome === 'CANONICAL_EXECUTABLE', g.offlineExecutable === true, g.groupKey);
    if (g.outcome === 'RULES_DECISION_REQUIRED') assert.ok(g.refusals.includes('STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED'), g.groupKey);
  }
  // GM-configurable groups are reported apart and never counted as canonical
  assert.ok(c.totals.gmConfigurableGroups >= 97);
  assert.equal(groups.filter(g => g.gmConfigurable && g.offlineExecutable).length, 0);
});
