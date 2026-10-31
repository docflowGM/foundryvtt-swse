import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as C from '../scripts/domain/vehicles/custom-vehicle-construction.js';
import { planVehicleInstallation, DEFAULT_VEHICLE_INSTALLATION_RULES } from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import { makeUnusedEmplacementResolver } from '../scripts/domain/vehicles/vehicle-modification-rules.js';

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { buildVehicleSchemaViewModel, buildVehicleAssetSummary, VEHICLE_ORIGIN } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
const { AssetBaySurfaceService } = await import('../scripts/ui/shell/AssetBaySurfaceService.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const epTable = JSON.parse(readFileSync('data/canonical/vehicles/construction/unused-emplacement-points.json', 'utf8'));
const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
const bySource = key => actors.find(a => a.system.vehicleSourceEntryKey === key);
const XW = 'core-incom-t-65b-x-wing-starfighter';
const wrap = (a, over = {}) => { const d = structuredClone(a); Object.assign(d, over);
  return { id: 'v1', isOwner: true, ...d, items: d.items ?? [], toObject: () => structuredClone(d) }; };
const row = (over = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000, costType: 'base',
  availability: 'Common', sizeRestriction: null, certification: { status: 'MECHANIC_SPECIFIED', book: 'Starships of the Galaxy', page: 40 }, ...over });
const rules = { ...DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: makeUnusedEmplacementResolver(epTable), resolveNonstandard: () => ({ nonstandard: false, basis: 'TEST' }) };
function withLedger(key, catalogEntry, mount = null) {
  const a = structuredClone(bySource(key));
  const plan = planVehicleInstallation({ record: a.flags.swse.universalVehicleSource.source, flags: a.flags, catalogEntry, installId: 'i1', availableCredits: 1e9, rules, mount });
  assert.equal(plan.ok, true, JSON.stringify(plan.reasons));
  a.flags.swse.vehicleInstallations = plan.nextLedger;
  return a;
}
const authority = { verified: true };
const claims = { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' };
function customActor(approved = true) {
  const frame = frames.find(f => f.id === 'superiority-fighter');
  const v = C.validateDesign({ designId: 'd1', name: 'Test Ship', frame, authorship: claims, crewQuality: 'skilled', authority: approved ? authority : null,
    rules: { ...C.DEFAULT_CONSTRUCTION_RULES, designRounding: 'floor' } });
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame, validation: v, authorship: claims, crewQuality: 'skilled' });
  return { record, frame, actorData: approved ? C.buildCustomVehicleActorData({ record, frame }) : { name: 'Test Ship', type: 'vehicle', system: { hp: { value: 30, max: 30 } }, flags: { swse: { vehicleConstruction: record } } } };
}

test('1 published X-wing, no installations: published identity, ledger empty, nothing fabricated', () => {
  const m = buildVehicleSchemaViewModel(wrap(bySource(XW)), { epTable });
  assert.equal(m.origin, VEHICLE_ORIGIN.PUBLISHED);
  assert.equal(m.identity.published, true);
  assert.equal(m.installed.count, 0);
  assert.equal(m.installed.certification, 'NONE');
  assert.equal(m.construction, null);
  assert.match(m.identity.sourceLabel, /, p\. \d+/);
});

test('2 starship with known unused EP: total from the published table, none consumed', () => {
  const m = buildVehicleSchemaViewModel(wrap(bySource(XW)), { epTable });
  assert.equal(m.ep.state, 'KNOWN');
  assert.equal(m.ep.total, 1);
  assert.equal(m.ep.used, 0);
  assert.equal(m.ep.remaining, 1);
  assert.equal(m.ep.shortfall, 0);
});

test('3 unknown EP is unresolved, not zero or one', () => {
  const none = buildVehicleSchemaViewModel(wrap(bySource(XW)), { epTable: null });
  assert.equal(none.ep.state, 'UNKNOWN');
  assert.equal(none.ep.total, null);
  assert.equal(none.ep.remaining, null);
  const unruled = epTable.entries.find(e => e.unusedEmplacementPoints === null);
  const m = buildVehicleSchemaViewModel(wrap(bySource(unruled.sourceEntryKey)), { epTable });
  assert.equal(m.ep.state, 'UNKNOWN');
  assert.equal(m.ep.total, null);
  assert.match(m.ep.label, /unknown/i);
});

test('4 ground vehicle: starship modification rules unsupported, no EP default', () => {
  const ground = actors.find(a => !(a.flags.swse.universalVehicleSource.source.movement?.speedModes ?? []).some(s => s.scale === 'starship'));
  const m = buildVehicleSchemaViewModel(wrap(ground), { epTable });
  assert.equal(m.ep.state, 'UNSUPPORTED');
  assert.equal(m.ep.total, null);
  assert.ok(m.reasons.includes('STARSHIP_MODIFICATION_RULES_UNSUPPORTED'));
});

test('5 valid custom-built starship: not one of the 429; Crew Quality, frame and provenance shown', () => {
  const { actorData } = customActor(true);
  const a = wrap(actorData);
  const m = buildVehicleSchemaViewModel(a, { epTable });
  assert.equal(m.origin, VEHICLE_ORIGIN.CUSTOM_CONSTRUCTED);
  assert.equal(m.identity.published, false);
  assert.equal(m.identity.printedModel, null);
  assert.equal(m.identity.sourceKey, undefined);
  assert.equal(m.construction.crewQuality, 'skilled');
  assert.match(m.construction.crewQualityLabel, /attack \+2/);
  assert.equal(m.construction.frame, 'superiority-fighter');
  assert.equal(m.construction.approvalStatus, 'APPROVED');
  assert.match(m.construction.rulesLabel, /GM-approved/);
  assert.equal(m.ep.total, 1, 'new design general rule, not the frame printed EP allocation');
  const c = buildVehicleSheetContext(a, { editable: true }, { epTable });
  assert.equal(c.schemaView.origin, VEHICLE_ORIGIN.CUSTOM_CONSTRUCTED);
  assert.equal(c.publicationView, null);
});

test('6 custom ship awaiting GM approval shows pending, not approved', () => {
  const { actorData } = customActor(false);
  const m = buildVehicleSchemaViewModel(wrap(actorData), { epTable });
  assert.equal(m.origin, VEHICLE_ORIGIN.CUSTOM_CONSTRUCTED);
  assert.equal(m.construction.approvalStatus, 'PENDING_APPROVAL');
  assert.equal(m.construction.statusLabel, 'Awaiting GM approval');
  assert.equal(m.construction.certifiedPublishedRules, false);
});

test('7 certified ledger: installed weapon without authorization is shown as not authorized, uncertified effect as not automated', () => {
  const weapon = row({ id: 'wp', name: 'Fixture Laser', category: 'Weapon', emplacementPoints: 1, costType: 'flat', cost: 500 });
  const mount = { mountKey: 'fwd-1', arc: 'forward', operatorRole: 'pilot', evidence: { book: 'B', page: 2 } };
  const a = withLedger(XW, weapon, mount);
  const m = buildVehicleSchemaViewModel(wrap(a), { epTable });
  const e = m.installed.entries[0];
  assert.equal(m.installed.certification, 'LEDGER');
  assert.equal(e.weaponStatus, 'NOT_AUTHORIZED');
  assert.match(e.mountLabel, /fwd-1/);
  assert.equal(m.ep.used, 1);
  assert.equal(m.ep.remaining, 0);
  // an effect on a SOURCE_VERIFIED-only row is not automated
  const b = withLedger(XW, row({ certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 } }));
  assert.equal(buildVehicleSchemaViewModel(wrap(b), { epTable }).installed.entries[0].effectStatus, 'EFFECT_CERTIFIED');
  b.flags.swse.vehicleInstallations[0].certification.status = 'SOURCE_VERIFIED';
  // tampering with the sealed entry is ignored and counted
  const t = buildVehicleSchemaViewModel(wrap(b), { epTable });
  assert.equal(t.installed.count, 0);
  assert.equal(t.installed.rejected, 1);
});

test('EP shortfall and nonstandard installs are visible', () => {
  const big = row({ id: 'big', emplacementPoints: 3 });
  const a = withLedger(XW, big);
  const m = buildVehicleSchemaViewModel(wrap(a), { epTable });
  assert.equal(m.ep.used, 3);
  assert.equal(m.ep.remaining, 0);
  assert.equal(m.ep.shortfall, 2);
  assert.match(m.ep.label, /shortfall 2/);
});

test('8 damaged vehicle in the owner Asset Bay: HP from system.hp (never hull), origin, installs, ownership', async () => {
  const src = structuredClone(bySource(XW));
  src.system.hp.value = 10;
  src.system.hull = { value: 999, max: 999 };
  const v = wrap(src, { uuid: 'Actor.v1' });
  v.system.ownedByActorId = 'owner1';
  globalThis.game = { user: { id: 'u1', isGM: false }, actors: { contents: [v], get: id => (id === 'v1' ? v : null) }, users: new Map() };
  const owner = { id: 'owner1', name: 'Wedge', system: {}, getFlag: () => null };
  const vm = await AssetBaySurfaceService.buildViewModel(owner, { bayMode: 'shipyard', epTable });
  const card = vm.assets[0];
  assert.match(card.status, new RegExp(`HP 10/${src.flags.swse.universalVehicleSource.source.durability.hitPoints}`));
  assert.doesNotMatch(card.status, /999|Hull/);
  assert.match(card.detail, /^Published/);
  assert.match(card.status, /No certified installations/);
  assert.equal(card.ownership, 'Document permission: Owner');
  assert.equal(card.ownedByThisActor, true);
  assert.equal(card.canOpenSheet, true);
  assert.equal(card.canModify, true);
});

test('Asset Bay: custom-built vs published vs invalid published are distinguishable and never throw', async () => {
  const custom = wrap(customActor(true).actorData, { id: 'c1', uuid: 'Actor.c1' });
  custom.system.ownedByActorId = 'owner1';
  const bad = structuredClone(bySource(XW)); bad.flags.swse.universalVehicleSource.source.durability.hitPoints += 5;
  const invalid = wrap(bad, { id: 'b1', uuid: 'Actor.b1' }); invalid.system.ownedByActorId = 'owner1';
  globalThis.game = { user: { id: 'u1', isGM: false }, actors: { contents: [custom, invalid], get: id => ({ c1: custom, b1: invalid })[id] }, users: new Map() };
  const vm = await AssetBaySurfaceService.buildViewModel({ id: 'owner1', name: 'W', system: {}, getFlag: () => null }, { bayMode: 'shipyard', epTable });
  const byId = Object.fromEntries(vm.assets.map(a => [a.actorId, a]));
  assert.match(byId.c1.detail, /^Custom-built/);
  assert.match(byId.c1.constructionLine, /Crew Quality skilled/);
  assert.equal(byId.c1.vehicleOrigin, VEHICLE_ORIGIN.CUSTOM_CONSTRUCTED);
  assert.equal(byId.b1.vehicleOrigin, VEHICLE_ORIGIN.PUBLISHED_SOURCE_INVALID);
  assert.match(byId.b1.detail, /failed verification/);
});

test('9 published attack groups stay reference-only; installed list does not include them', () => {
  const c = buildVehicleSheetContext(wrap(bySource(XW)), { editable: true }, { epTable });
  assert.equal(c.publicationView.attackReference.executable, false);
  assert.equal(c.schemaView.installed.count, 0);
  assert.equal(c.schemaView.installed.entries.length, 0);
});

test('10 tampered construction record and tampered published source fail closed', () => {
  const { actorData } = customActor(true);
  actorData.flags.swse.vehicleConstruction.totalCredits = 1;
  const m = buildVehicleSchemaViewModel(wrap(actorData), { epTable });
  assert.equal(m.origin, VEHICLE_ORIGIN.CUSTOM_UNVERIFIED_RECORD);
  assert.equal(m.construction, null);
  assert.ok(m.reasons.includes('CONSTRUCTION_RECORD_DIGEST_MISMATCH'));
  assert.equal(m.ep.state, 'UNVERIFIABLE');
  const plain = buildVehicleSchemaViewModel(wrap({ name: 'Old', type: 'vehicle', system: { hull: { value: 5, max: 9 }, installedSystems: [{ name: 'Fake' }], weapons: [{ name: 'Fake' }] } }), { epTable });
  assert.equal(plain.origin, VEHICLE_ORIGIN.CUSTOM_UNRECORDED);
  assert.equal(plain.installed.count, 0, 'legacy installedSystems/weapons are never evidence');
  assert.equal(plain.hp.max, null, 'legacy system.hull is never read');
});

test('summary never reads hull and exposes compact fields', () => {
  const s = buildVehicleAssetSummary(wrap(bySource(XW)), { epTable });
  assert.equal(s.published, true);
  assert.match(s.hpLabel, /^HP /);
});

test('templates: schema panel is read-only (no inputs, no ledger/construction fields)', () => {
  const t = readFileSync('templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs', 'utf8');
  assert.doesNotMatch(t, /<input|<select|<textarea|name="/);
  assert.doesNotMatch(t, /installedSystems|system\.weapons|system\.hull/);
  const content = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
  assert.match(content, /vehicle-schema-panel\.hbs/);
  assert.match(readFileSync('helpers/handlebars/partials-auto.js', 'utf8'), /vehicle-schema-panel\.hbs/);
  assert.match(readFileSync('scripts/load-templates.js', 'utf8'), /vehicle-schema-panel\.hbs/);
  const bay = readFileSync('scripts/ui/shell/AssetBaySurfaceService.js', 'utf8');
  assert.doesNotMatch(bay, /system\?\.hull|system\.hull/);
});
