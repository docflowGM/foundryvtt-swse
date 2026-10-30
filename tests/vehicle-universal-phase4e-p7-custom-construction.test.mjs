import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import * as C from '../scripts/domain/vehicles/custom-vehicle-construction.js';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-source-identity.js';

const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
const frame = id => frames.find(f => f.id === id);
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;

const legal = { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' };
const certifiedRow = (over = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000, costType: 'base',
  availability: 'Common', sizeRestriction: null, certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, ...over });
const pool = n => ({ ...C.DEFAULT_CONSTRUCTION_RULES, resolveFrameEpPool: () => n, designRounding: 'floor' });

// ---- formulas are checked against the published records themselves ----
test('formulas reproduce the printed X-wing exactly (a superiority fighter frame)', () => {
  const p = C.previewFrame(frame('superiority-fighter'));
  assert.equal(p.ok, true);
  const x = rec(actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter'));
  assert.equal(p.derived.reflexDefense, x.defenses.reflex);
  assert.equal(p.derived.fortitudeDefense, x.defenses.fortitude);
  assert.equal(p.derived.damageThreshold, x.durability.damageThreshold);
  assert.equal(p.derived.hitPoints, x.durability.hitPoints);
  assert.equal(p.derived.damageReduction, x.defenses.damageReduction);
});

test('Reflex / Fortitude / damage threshold formulas agree with at least 90% of the published records', () => {
  let n = 0, ref = 0, fort = 0, dt = 0;
  for (const a of actors) {
    const r = rec(a), k = String(r.classification.printedSize ?? '').toLowerCase();
    if (C.REFLEX_SIZE_MODIFIER[k] === undefined || r.abilities.dex == null || r.abilities.str == null || r.defenses.armorBonus == null) continue;
    n++;
    const f = 10 + C.abilityModifier(r.abilities.str);
    if (10 + C.abilityModifier(r.abilities.dex) + C.REFLEX_SIZE_MODIFIER[k] + r.defenses.armorBonus === r.defenses.reflex) ref++;
    if (f === r.defenses.fortitude) fort++;
    if (f + C.DAMAGE_THRESHOLD_SIZE_MODIFIER[k] === r.durability.damageThreshold) dt++;
  }
  assert.ok(n > 350, 'sample size ' + n);
  for (const [name, hit] of [['reflex', ref], ['fortitude', fort], ['damage threshold', dt]]) assert.ok(hit / n >= 0.9, `${name}: ${hit}/${n}`);
});

test('every certified frame previews; pending statistics are listed with a reason, never invented', () => {
  for (const f of frames.filter(f => f.certification === 'SOURCE_VERIFIED_TEXT')) {
    const p = C.previewFrame(f);
    assert.equal(p.ok, true, f.id);
    assert.equal(p.derived.hitPoints, f.hitPoints);
    assert.deepEqual(p.pending.map(x => x.stat).sort(), ['baseAttackBonus', 'challengeLevel', 'fightingSpace', 'grapple', 'initiative', 'perception']);
    assert.ok(p.pending.every(x => x.reason));
    assert.equal(p.derived.initiative, undefined);
  }
  assert.equal(C.previewFrame({ size: 'Large', strength: 10, dexterity: 10 }).ok, false);
});

test('the frame cost is not multiplied by the size cost modifier (book note)', () => {
  const v = C.validateDesign({ designId: 'd1', name: 'Test Fighter', frame: frame('superiority-fighter'), authorship: legal, rules: pool(5) });
  assert.equal(v.ok, true, v.reasons.join());
  assert.equal(v.totalCredits, 50000);
});

// ---- authorship ----
test('rules-legal construction needs a certified frame, the Starship Designer feat and a recorded shipyard-aid approval', () => {
  const base = { designId: 'd', name: 'N', rules: pool(5) };
  assert.deepEqual(C.validateDesign({ ...base, frame: frame('battlecruiser'), authorship: legal }).reasons, ['FRAME_NOT_SOURCE_VERIFIED']);
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: { ...legal, starshipDesigner: false } }).reasons.includes('STARSHIP_DESIGNER_FEAT_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: { ...legal, shipyardAidApprovedBy: null } }).reasons.includes('SHIPYARD_AID_APPROVAL_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: {} }).reasons.includes('AUTHORSHIP_KIND_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, designId: '', frame: frame('cruiser'), authorship: legal }).reasons.includes('DESIGN_IDENTITY_MISSING'));
  assert.deepEqual(C.validateDesign({ ...base, frame: null, authorship: legal }).reasons, ['FRAME_MISSING']);
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: legal, crewQuality: 'legendary' }).reasons.includes('CREW_QUALITY_INVALID'));
});

test('GM homebrew is labelled as such and is never marked as certified published rules', () => {
  const authorship = { kind: 'gm-homebrew', gmUserId: 'gm1' };
  const v = C.validateDesign({ designId: 'd', name: 'Homebrew', frame: frame('battlecruiser'), authorship, rules: pool(5) });
  assert.equal(v.ok, true, v.reasons.join());
  const record = C.buildConstructionRecord({ designId: 'd', name: 'Homebrew', frame: frame('battlecruiser'), validation: v, authorship });
  assert.equal(record.authorship.certifiedPublishedRules, false);
  assert.equal(record.authorship.kind, 'gm-homebrew');
  assert.ok(C.validateDesign({ designId: 'd', name: 'x', frame: frame('cruiser'), authorship: { kind: 'gm-homebrew' }, rules: pool(5) }).reasons.includes('GM_AUTHORSHIP_REQUIRED'));
});

// ---- systems reuse the shared planner and rules ----
test('systems are validated by the shared planner: frame EP pool unruled => no systems; pool ruled => quoted with published costs', () => {
  const sys = (id, over) => ({ catalogEntry: certifiedRow({ id, ...over }), installId: 'i-' + id });
  const unruled = C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a')], rules: { ...C.DEFAULT_CONSTRUCTION_RULES, designRounding: 'floor' } });
  assert.equal(unruled.ok, false);
  assert.ok(unruled.reasons.includes('a:EP_BUDGET_UNKNOWN'));

  const ok = C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a'), sys('b')], rules: pool(100) });
  assert.equal(ok.ok, true, ok.reasons.join());
  // Colossal (cruiser): base 1,000 x 500 per system
  assert.deepEqual(ok.quotes.map(q => q.credits), [500000, 500000]);
  assert.equal(ok.totalCredits, 10_000_000 + 1_000_000);
  assert.equal(ok.installedSystems.length, 2);
  assert.ok(ok.quotes.every(q => q.quote.nonstandard === false && q.quote.nonstandardBasis === 'STARSHIP_DESIGNER'));
  // a duplicate install id and an exceeded pool are refused through the same planner
  assert.ok(C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a'), { ...sys('b'), installId: 'i-a' }], rules: pool(100) }).reasons.includes('b:DUPLICATE_INSTALL_ID'));
  assert.ok(C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a', { emplacementPoints: 9 })], rules: pool(3) }).reasons.includes('a:EP_EXCEEDED'));
  // uncertified rows and unresolved cost types are refused
  assert.ok(C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a', { certification: undefined })], rules: pool(100) }).reasons.includes('a:CATALOG_ENTRY_UNCERTIFIED'));
  assert.ok(C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a', { costType: 'multiplier' })], rules: pool(100) }).reasons.includes('a:COST_TYPE_NOT_RESOLVED_BY_PUBLISHED_RULES'));
  // funds are checked against the whole design
  assert.ok(C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, systems: [sys('a')], rules: pool(100), availableCredits: 10_400_000 }).reasons.some(r => r.endsWith('INSUFFICIENT_CREDITS')));
});

test('design time: 30 days / DC 25, +1 per additional 100,000 credits; rounding is an owner decision', () => {
  assert.deepEqual(C.designTime({ finalCredits: 90_000, rounding: 'floor' }), { ok: true, reasons: [], days: 30, mechanicsDC: 25 });
  assert.deepEqual(C.designTime({ finalCredits: 100_000, rounding: 'floor' }), { ok: true, reasons: [], days: 30, mechanicsDC: 25 });
  assert.equal(C.designTime({ finalCredits: 250_000, rounding: 'floor' }).days, 31);
  assert.equal(C.designTime({ finalCredits: 250_000, rounding: 'ceil' }).days, 32);
  assert.equal(C.designTime({ finalCredits: 10_000_000, rounding: 'floor' }).mechanicsDC, 25 + 99);
  // two designers with the feat divide the cost used for TIME only
  const two = C.designTime({ finalCredits: 1_100_000, designers: 2, rounding: 'floor' });
  assert.equal(two.days, 30 + 4, '1,100,000 / 2 = 550,000 -> 4 full extra 100,000');
  assert.equal(two.mechanicsDC, 25 + 10);
  assert.deepEqual(C.designTime({ finalCredits: 250_000 }).reasons, ['DESIGN_TIME_ROUNDING_UNRULED']);
  assert.deepEqual(C.designTime({ finalCredits: -1, rounding: 'floor' }).reasons, ['DESIGN_INPUT_INVALID']);
  const unresolved = C.validateDesign({ designId: 'd', name: 'N', frame: frame('cruiser'), authorship: legal, rules: C.DEFAULT_CONSTRUCTION_RULES });
  assert.deepEqual(unresolved.design, { unresolved: ['DESIGN_TIME_ROUNDING_UNRULED'] });
});

// ---- the created Actor ----
test('a constructed vehicle is custom: sealed record, no publication claim, no Items, no weapons', () => {
  const authorship = legal, f = frame('superiority-fighter');
  const v = C.validateDesign({ designId: 'd9', name: 'Wedge Special', frame: f, authorship, rules: pool(5) });
  const record = C.buildConstructionRecord({ designId: 'd9', name: 'Wedge Special', frame: f, validation: v, authorship, crewQuality: 'skilled' });
  assert.equal(C.verifyConstructionRecord(record), true);
  const data = C.buildCustomVehicleActorData({ record, frame: f });
  assert.equal(data.type, 'vehicle');
  assert.deepEqual(data.items, []);
  assert.deepEqual(data.system.weapons, []);
  assert.equal(data.system.reflexDefense, 18);
  assert.equal(data.system.hp.max, 120);
  assert.equal(data.flags.swse.canonicalPublication, undefined);
  assert.equal(data.flags.swse.universalVehicleSource, undefined);
  assert.equal(data.system.vehicleSourceEntryKey, undefined);
  assert.equal(classifyVehicleActorSource({ ...data }).kind, 'custom');
  assert.equal(claimsPublishedSource(data), false);
  assert.equal(getVehicleRuntimeProjection(data).kind, 'custom');
});

test('the sealed construction record detects tampering and cannot be built from an invalid design', () => {
  const f = frame('cruiser');
  const v = C.validateDesign({ designId: 'd', name: 'N', frame: f, authorship: legal, rules: pool(5) });
  const record = C.buildConstructionRecord({ designId: 'd', name: 'N', frame: f, validation: v, authorship: legal });
  for (const mutate of [r => { r.derived.hitPoints = 99999; }, r => { r.frame.id = 'battlecruiser'; }, r => { r.authorship.certifiedPublishedRules = false; }, r => { r.totalCredits = 1; }]) {
    const copy = structuredClone(record); mutate(copy);
    assert.equal(C.verifyConstructionRecord(copy), false);
    assert.throws(() => C.buildCustomVehicleActorData({ record: copy, frame: f }), /CUSTOM_VEHICLE_RECORD_INVALID/);
  }
  const bad = C.validateDesign({ designId: 'd', name: 'N', frame: frame('battlecruiser'), authorship: legal, rules: pool(5) });
  assert.throws(() => C.buildConstructionRecord({ designId: 'd', name: 'N', frame: frame('battlecruiser'), validation: bad, authorship: legal }), /CUSTOM_VEHICLE_DESIGN_INVALID/);
});
