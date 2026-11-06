import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import * as C from '../scripts/domain/vehicles/custom-vehicle-construction.js';
import { CREW_QUALITY } from '../scripts/domain/vehicles/vehicle-modification-rules.js';
import { classifyVehicleActorSource, getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-source-identity.js';

const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
const frame = id => frames.find(f => f.id === id);
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;

const claims = { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' };
const homebrew = { kind: 'gm-homebrew', gmUserId: 'gm1' };
const row = (over = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000, costType: 'base',
  availability: 'Common', sizeRestriction: null, certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, ...over });
const rulesWith = over => ({ ...C.DEFAULT_CONSTRUCTION_RULES, designRounding: 'floor', ...over });

// trusted authority resolvers (stand-ins for game.actors / game.users)
const feat = name => ({ type: 'feat', name });
const resolvers = ({ designerFeats = [feat('Starship Designer')], gm = true } = {}) => ({
  getActor: id => (id === 'a1' ? { id, items: designerFeats } : null),
  getUser: id => (id === 'gm1' ? { id, isGM: gm } : id === 'player1' ? { id, isGM: false } : null)
});
const design = (over = {}) => ({ designId: 'd1', name: 'Test Ship', frame: frame('superiority-fighter'), authorship: claims, crewQuality: 'skilled', rules: rulesWith(), ...over });
const approvedDesign = (over = {}) => {
  const authority = C.verifyConstructionAuthority(over.authorship ?? claims, resolvers());
  return C.validateDesign(design({ authority, ...over }));
};

// ---- formulas are checked against the published records themselves ----
test('formulas reproduce the printed X-wing exactly (a superiority fighter frame, skilled crew)', () => {
  const p = C.previewFrame(frame('superiority-fighter'), { crewQuality: 'skilled' });
  const x = rec(actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter'));
  assert.equal(p.ok, true);
  assert.equal(p.derived.reflexDefense, x.defenses.reflex);
  assert.equal(p.derived.fortitudeDefense, x.defenses.fortitude);
  assert.equal(p.derived.damageThreshold, x.durability.damageThreshold);
  assert.equal(p.derived.hitPoints, x.durability.hitPoints);
  assert.equal(p.derived.damageReduction, x.defenses.damageReduction);
  assert.equal(p.derived.initiative, x.abilities.initiativePrinted, 'Dex mod + size modifier + crew check modifier');
  assert.equal(p.derived.perception, x.abilities.perceptionPrinted);
  assert.equal(p.derived.baseAttackBonus, x.combat.baseAttackBonusPrinted);
});

test('Reflex / Fortitude / damage threshold agree with at least 90% of the published records', () => {
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

test('Crew Quality statistics agree with the published records: Initiative, Perception, base attack (each modifier applied once)', () => {
  let n = 0, init = 0, perc = 0, atk = 0;
  for (const a of actors) {
    const r = rec(a), q = String(r.crew?.crewQuality ?? '').toLowerCase(), k = String(r.classification.printedSize ?? '').toLowerCase();
    if (!CREW_QUALITY[q] || C.REFLEX_SIZE_MODIFIER[k] === undefined || r.abilities.dex == null || r.abilities.initiativePrinted == null) continue;
    n++;
    if (C.abilityModifier(r.abilities.dex) + C.REFLEX_SIZE_MODIFIER[k] + CREW_QUALITY[q].checkModifier === r.abilities.initiativePrinted) init++;
    if (CREW_QUALITY[q].checkModifier === r.abilities.perceptionPrinted) perc++;
    if (CREW_QUALITY[q].attackBonus === r.combat?.baseAttackBonusPrinted) atk++;
  }
  assert.ok(n > 300, 'sample size ' + n);
  assert.ok(init / n >= 0.9, `initiative ${init}/${n}`);
  assert.ok(perc / n >= 0.9, `perception ${perc}/${n}`);
  assert.ok(atk / n >= 0.9, `attack ${atk}/${n}`);
});

test('statistics follow the chosen crew quality; without one they are pending, never invented', () => {
  const f = frame('cruiser');
  const base = C.previewFrame(f, { crewQuality: 'normal' }).derived;
  for (const q of Object.keys(CREW_QUALITY)) {
    const d = C.previewFrame(f, { crewQuality: q }).derived;
    assert.equal(d.initiative, base.initiative - 5 + CREW_QUALITY[q].checkModifier);
    assert.equal(d.baseAttackBonus, CREW_QUALITY[q].attackBonus);
    assert.equal(d.reflexDefense, base.reflexDefense, 'crew quality does not change defenses');
  }
  const none = C.previewFrame(f);
  assert.equal(none.derived.initiative, undefined);
  assert.ok(none.pending.some(p => p.stat === 'initiative' && p.reason === 'CREW_QUALITY_NOT_CHOSEN'));
  assert.deepEqual(none.pending.filter(p => !['initiative', 'pilot', 'perception', 'mechanics', 'useComputer', 'baseAttackBonus'].includes(p.stat)).map(p => p.stat).sort(), ['challengeLevel', 'fightingSpace', 'grapple']);
  assert.ok(!none.pending.some(p => /CREW_QUALITY_SIDEBAR_NOT_IN_TEXT/.test(p.reason)), 'the Crew Quality source gap is closed');
  assert.equal(C.previewFrame({ size: 'Large', strength: 10, dexterity: 10 }).ok, false);
});

test('every certified frame (text-verified or PDF-confirmed) previews, including the two PDF-confirmed ones', () => {
  const certified = frames.filter(C.isCertifiedFrame);
  assert.equal(certified.length, 12);
  for (const f of certified) assert.equal(C.previewFrame(f, { crewQuality: 'normal' }).ok, true, f.id);
  assert.equal(C.isCertifiedFrame({ certification: 'NEEDS_PDF_CONFIRMATION' }), false);
  assert.equal(C.isCertifiedFrame({}), false);
});

test('the frame cost is not multiplied by the size cost modifier (book note)', () => {
  const v = C.validateDesign(design());
  assert.equal(v.totalCredits, 50000);
});

// ---- the three tiers ----
test('previewable -> rules-validated -> approved: each tier needs more', () => {
  const noCrew = C.validateDesign(design({ crewQuality: null }));
  assert.deepEqual([noCrew.status, noCrew.previewable, noCrew.rulesValidated, noCrew.approved], ['PREVIEWABLE', true, false, false]);
  assert.deepEqual(noCrew.unresolved, ['CREW_QUALITY_NOT_CHOSEN']);

  // cost 201,000: a partial 100,000 whose rounding is unruled (frame-only costs are exact multiples and need no ruling)
  const noRounding = C.validateDesign(design({ frame: frame('gunship'), systems: [{ catalogEntry: row({ costType: 'flat', emplacementPoints: 0 }), installId: 's1' }], rules: rulesWith({ designRounding: undefined }) }));
  assert.equal(noRounding.status, 'PREVIEWABLE');
  assert.equal(noRounding.rulesValidated, false);
  assert.deepEqual(noRounding.unresolved, ['DESIGN_TIME_ROUNDING_UNRULED']);
  assert.deepEqual(noRounding.reasons, []);

  const validated = C.validateDesign(design());
  assert.deepEqual([validated.status, validated.rulesValidated, validated.approved], ['RULES_VALIDATED', true, false]);

  const approved = approvedDesign();
  assert.deepEqual([approved.status, approved.rulesValidated, approved.approved], ['APPROVED_FOR_CONSTRUCTION', true, true]);
  assert.deepEqual(approved.design, { days: 30, mechanicsDC: 25 });

  const rejected = C.validateDesign(design({ frame: null }));
  assert.deepEqual([rejected.status, rejected.previewable], ['REJECTED', false]);
});

test('a design with an unresolved required rule cannot be recorded as certified (fail closed)', () => {
  const gunshipDesign = { frame: frame('gunship'), systems: [{ catalogEntry: row({ costType: 'flat', emplacementPoints: 0 }), installId: 's1' }] };
  const v = C.validateDesign(design({ ...gunshipDesign, rules: rulesWith({ designRounding: undefined }), authority: { verified: true } }));
  assert.equal(v.approved, false, 'authority alone cannot approve while a required rule is unresolved');
  assert.throws(() => C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame: frame('gunship'), validation: v, authorship: claims, crewQuality: 'skilled' }),
    /CUSTOM_VEHICLE_DESIGN_INVALID.*DESIGN_TIME_ROUNDING_UNRULED/);
});

test('authority is verified by the system, not by caller-provided booleans or names', () => {
  const ok = C.verifyConstructionAuthority(claims, resolvers());
  assert.deepEqual(ok, { verified: true, reasons: [] });
  assert.deepEqual(C.verifyConstructionAuthority(claims, resolvers({ designerFeats: [feat('Tech Specialist')] })).reasons, ['DESIGNER_LACKS_STARSHIP_DESIGNER_FEAT']);
  assert.deepEqual(C.verifyConstructionAuthority(claims, resolvers({ gm: false })).reasons, ['SHIPYARD_AID_APPROVER_NOT_A_GM']);
  assert.deepEqual(C.verifyConstructionAuthority({ ...claims, designerActorId: 'ghost' }, resolvers()).reasons, ['DESIGNER_ACTOR_NOT_FOUND']);
  assert.deepEqual(C.verifyConstructionAuthority({ ...claims, shipyardAidApprovedBy: 'player1' }, resolvers()).reasons, ['SHIPYARD_AID_APPROVER_NOT_A_GM']);
  assert.deepEqual(C.verifyConstructionAuthority({ ...claims, shipyardAidApprovedBy: 'nobody' }, resolvers()).reasons, ['SHIPYARD_AID_APPROVER_NOT_A_GM']);
  assert.deepEqual(C.verifyConstructionAuthority({}, resolvers()).reasons, ['AUTHORSHIP_KIND_REQUIRED']);
  assert.equal(C.verifyConstructionAuthority(homebrew, resolvers()).verified, true);
  assert.deepEqual(C.verifyConstructionAuthority({ kind: 'gm-homebrew', gmUserId: 'player1' }, resolvers()).reasons, ['HOMEBREW_AUTHOR_NOT_A_GM']);
  // claims alone never approve: a self-asserted feat flag with no verified authority stays at RULES_VALIDATED
  assert.equal(C.validateDesign(design({ authorship: { ...claims, starshipDesigner: true } })).approved, false);
  assert.equal(C.validateDesign(design({ authority: { verified: false, reasons: ['x'] } })).approved, false);
  // the feat is matched by an actual feat item, not any item with the name
  assert.equal(C.verifyConstructionAuthority(claims, resolvers({ designerFeats: [{ type: 'equipment', name: 'Starship Designer' }] })).verified, false);
});

test('rules-legal construction needs a certified frame and the claims that the verification then proves', () => {
  const base = { designId: 'd', name: 'N', crewQuality: 'normal', rules: rulesWith() };
  assert.deepEqual(C.validateDesign({ ...base, frame: { ...frame('cruiser'), certification: 'NEEDS_PDF_CONFIRMATION' }, authorship: claims }).reasons, ['FRAME_NOT_SOURCE_VERIFIED']);
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: { ...claims, starshipDesigner: false } }).reasons.includes('STARSHIP_DESIGNER_FEAT_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: { ...claims, shipyardAidApprovedBy: null } }).reasons.includes('SHIPYARD_AID_APPROVAL_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: {} }).reasons.includes('AUTHORSHIP_KIND_REQUIRED'));
  assert.ok(C.validateDesign({ ...base, designId: '', frame: frame('cruiser'), authorship: claims }).reasons.includes('DESIGN_IDENTITY_MISSING'));
  assert.deepEqual(C.validateDesign({ ...base, frame: null, authorship: claims }).reasons, ['FRAME_MISSING']);
  assert.ok(C.validateDesign({ ...base, frame: frame('cruiser'), authorship: claims, crewQuality: 'legendary' }).reasons.includes('CREW_QUALITY_INVALID'));
  // the PDF-confirmed frames are accepted
  assert.equal(C.validateDesign({ ...base, frame: frame('battlecruiser'), authorship: claims }).ok, true);
  assert.equal(C.validateDesign({ ...base, frame: frame('light-fighter'), authorship: claims }).ok, true);
});

test('GM homebrew is labelled, needs no design time, and is never marked as certified published rules', () => {
  const authority = C.verifyConstructionAuthority(homebrew, resolvers());
  const v = C.validateDesign(design({ authorship: homebrew, authority, frame: { ...frame('battlecruiser'), certification: 'NEEDS_PDF_CONFIRMATION' }, rules: rulesWith({ designRounding: undefined }) }));
  assert.equal(v.approved, true, v.reasons.join() + v.unresolved.join());
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame: frame('battlecruiser'), validation: v, authorship: homebrew, crewQuality: 'skilled' });
  assert.equal(record.authorship.certifiedPublishedRules, false);
  assert.equal(record.authorship.kind, 'gm-homebrew');
  assert.ok(C.validateDesign(design({ authorship: { kind: 'gm-homebrew' } })).reasons.includes('GM_AUTHORSHIP_REQUIRED'));
});

// ---- systems reuse the shared planner and rules ----
test('new frames start with the general unused-EP rule (1), not the frame allocation; shortfall carries the published penalties', () => {
  const sys = (id, over) => ({ catalogEntry: row({ id, ...over }), installId: 'i-' + id });
  const one = C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { emplacementPoints: 1 })] }));
  assert.equal(one.ok, true, one.reasons.join());
  assert.equal(one.quotes[0].quote.shortfall, 0);
  // Colossal (cruiser): modifier 500; frame EP allocation is 100 but only 1 is unused
  const three = C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('b', { emplacementPoints: 3 })] }));
  assert.equal(three.ok, true, three.reasons.join());
  const q = three.quotes[0].quote;
  assert.equal(q.shortfall, 2);
  assert.equal(three.quotes[0].credits, Math.round(1000 * 500 * 1.4), '+20% per missing point');
  assert.equal(q.mechanicsDC, 20 + 3 + 10);
  assert.deepEqual(q.consequences, ['VEHICLE_BECOMES_USED', 'SYSTEM_DAMAGED_BEYOND_REPAIR_IF_VEHICLE_DISABLED']);
  assert.equal(q.days, (3 * 500) / 20 + 4, 'EP x cost modifier / minimum work force of a cruiser (20), +2 days per missing point');
  // unknown EP is not insufficient EP: an unruled pool still fails closed
  const unknownPool = C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('c')], rules: rulesWith({ resolveFrameEpPool: () => null }) }));
  assert.ok(unknownPool.reasons.includes('c:EP_BUDGET_UNKNOWN'));
  assert.ok(!unknownPool.reasons.includes('c:EP_EXCEEDED'));
  // when shortfall installs are disallowed the same design is refused
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('d', { emplacementPoints: 3 })], rules: rulesWith({ allowEpShortfall: false }) })).reasons.includes('d:EP_EXCEEDED'));
});

test('systems validate through the shared planner: published costs, duplicates, certification, cost types, funds', () => {
  const sys = (id, over) => ({ catalogEntry: row({ id, ...over }), installId: 'i-' + id });
  const ok = C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { emplacementPoints: 0 }), sys('b', { emplacementPoints: 0 })] }));
  assert.equal(ok.ok, true, ok.reasons.join());
  assert.deepEqual(ok.quotes.map(q => q.credits), [500000, 500000]);
  assert.equal(ok.totalCredits, 10_000_000 + 1_000_000);
  assert.ok(ok.quotes.every(q => q.quote.nonstandard === false && q.quote.nonstandardBasis === 'STARSHIP_DESIGNER'));
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { emplacementPoints: 0 }), { ...sys('b', { emplacementPoints: 0 }), installId: 'i-a' }] })).reasons.includes('b:DUPLICATE_INSTALL_ID'));
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { certification: undefined })] })).reasons.includes('a:CATALOG_ENTRY_UNCERTIFIED'));
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { costType: 'multiplier' })] })).reasons.includes('a:COST_TYPE_NOT_RESOLVED_BY_PUBLISHED_RULES'));
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a')], availableCredits: 10_400_000 })).reasons.some(r => r.endsWith('INSUFFICIENT_CREDITS')));
  // a SOURCE_VERIFIED row whose effect is not implemented is not buildable
  assert.ok(C.validateDesign(design({ frame: frame('cruiser'), systems: [sys('a', { certification: { status: 'SOURCE_VERIFIED', book: 'B', printedPage: 41 } })] })).reasons.includes('a:MODIFICATION_EFFECT_NOT_IMPLEMENTED'));
});

test('design time: 30 days / DC 25, +1 per additional 100,000 credits; rounding comes only from the rules seam', () => {
  assert.deepEqual(C.designTime({ finalCredits: 90_000, rounding: 'floor' }), { ok: true, reasons: [], days: 30, mechanicsDC: 25 });
  assert.equal(C.designTime({ finalCredits: 250_000, rounding: 'floor' }).days, 31);
  assert.equal(C.designTime({ finalCredits: 250_000, rounding: 'ceil' }).days, 32);
  assert.equal(C.designTime({ finalCredits: 10_000_000, rounding: 'floor' }).mechanicsDC, 25 + 99);
  const two = C.designTime({ finalCredits: 1_100_000, designers: 2, rounding: 'floor' });
  assert.equal(two.days, 30 + 4);
  assert.equal(two.mechanicsDC, 25 + 10);
  assert.deepEqual(C.designTime({ finalCredits: 250_000 }).reasons, ['DESIGN_TIME_ROUNDING_UNRULED']);
  // exact multiples and costs within the first 100,000 need no rounding ruling
  assert.deepEqual(C.designTime({ finalCredits: 200_000 }), { ok: true, reasons: [], days: 31, mechanicsDC: 26 });
  assert.deepEqual(C.designTime({ finalCredits: 50_000 }), { ok: true, reasons: [], days: 30, mechanicsDC: 25 });
  assert.deepEqual(C.designTime({ finalCredits: -1, rounding: 'floor' }).reasons, ['DESIGN_INPUT_INVALID']);
});

// ---- the created Actor ----
test('only an approved design becomes an Actor; it is custom, sealed, and carries no publication claim', () => {
  const f = frame('superiority-fighter');
  const validated = C.validateDesign(design());
  const pending = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame: f, validation: validated, authorship: claims, crewQuality: 'skilled' });
  assert.equal(pending.approval.status, 'PENDING_APPROVAL');
  assert.equal(pending.authorship.certifiedPublishedRules, false, 'not certified until approved');
  assert.throws(() => C.buildCustomVehicleActorData({ record: pending, frame: f }), /CUSTOM_VEHICLE_NOT_APPROVED/);

  const v = approvedDesign();
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame: f, validation: v, authorship: claims, crewQuality: 'skilled' });
  assert.equal(record.approval.status, 'APPROVED');
  assert.equal(record.authorship.certifiedPublishedRules, true);
  assert.equal(C.verifyConstructionRecord(record), true);
  assert.deepEqual(record.frame.printedTables, { 'Table 3-8 Stock Ship Types': 52, 'Table 3-9 Stock Ship Base Values': 53 });

  const data = C.buildCustomVehicleActorData({ record, frame: f });
  assert.equal(data.type, 'vehicle');
  assert.deepEqual(data.items, []);
  assert.deepEqual(data.system.weapons, []);
  assert.deepEqual([data.system.reflexDefense, data.system.hp.max, data.system.initiative], [18, 120, 7]);
  assert.equal(data.flags.swse.canonicalPublication, undefined);
  assert.equal(data.flags.swse.universalVehicleSource, undefined);
  assert.equal(data.system.vehicleSourceEntryKey, undefined);
  assert.equal(classifyVehicleActorSource({ ...data }).kind, 'custom');
  assert.equal(claimsPublishedSource(data), false);
  assert.equal(getVehicleRuntimeProjection(data).kind, 'custom');
});

test('the sealed construction record detects tampering (including the approval) and cannot be built from an unvalidated design', () => {
  const f = frame('cruiser');
  const v = approvedDesign({ frame: f });
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'N', frame: f, validation: v, authorship: claims, crewQuality: 'skilled' });
  for (const mutate of [r => { r.derived.hitPoints = 99999; }, r => { r.frame.id = 'battlecruiser'; }, r => { r.authorship.certifiedPublishedRules = false; },
    r => { r.totalCredits = 1; }, r => { r.approval.status = 'PENDING_APPROVAL'; }]) {
    const copy = structuredClone(record); mutate(copy);
    assert.equal(C.verifyConstructionRecord(copy), false);
    assert.throws(() => C.buildCustomVehicleActorData({ record: copy, frame: f }), /CUSTOM_VEHICLE_RECORD_INVALID/);
  }
  const forged = structuredClone(record); forged.approval.status = 'PENDING_APPROVAL';
  const pendingCopy = C.buildConstructionRecord({ designId: 'd1', name: 'N', frame: f, validation: C.validateDesign(design({ frame: f })), authorship: claims, crewQuality: 'skilled' });
  assert.notEqual(pendingCopy.recordDigest, record.recordDigest);
  assert.throws(() => C.buildConstructionRecord({ designId: 'd', name: 'N', frame: frame('cruiser'), validation: C.validateDesign(design({ frame: null })), authorship: claims }), /CUSTOM_VEHICLE_DESIGN_INVALID/);
});
