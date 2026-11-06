import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { getVehicleRuntimeProjection } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import {
  buildVehiclePublicationViewModel, buildPublishedCrewSummary, describeShield, SOURCE_UNKNOWN
} from '../scripts/sheets/v2/vehicle-sheet/vehicle-publication-view-model.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const byKey = new Map(actors.map(a => [a.system.vehicleSourceEntryKey, a]));
const view = key => {
  const actor = byKey.get(key);
  assert.ok(actor, key);
  return buildVehiclePublicationViewModel(structuredClone(actor));
};
const record = a => a.flags.swse.universalVehicleSource.source;

test('representative matrix: source badge, identity, printed facts', () => {
  const xw = view('core-incom-t-65b-x-wing-starfighter');
  assert.equal(xw.identity.book, 'Core Rulebook');
  assert.equal(xw.identity.page, 178);
  assert.equal(xw.initiative.value, 7);
  assert.equal(xw.hp.max, 120);
  assert.equal(xw.defenses.reflex.value, 18);
  assert.equal(xw.shield.max, 15);
  assert.equal(xw.crew.label, '1 plus astromech droid (skilled)');
  assert.equal(xw.cargo.display, '110 kg');
  assert.equal(xw.hyperdrive.capability, 'equipped');
  assert.equal(xw.price.status, 'priced');
  assert.equal(xw.movement.length, 2);
  assert.deepEqual(xw.movement.map(m => m.scale), ['character', 'starship']);
});

test('two book-specific Vultures keep distinct source identities', () => {
  const core = view('core-vulture-class-droid-starfighter');
  const sotg = view('sotg-baktoid-armor-workshop-vulture-class-starfighter');
  assert.notEqual(core.identity.sourceKey, sotg.identity.sourceKey);
  assert.notEqual(core.identity.book, sotg.identity.book);
});

test('shield states: unknown, explicit zero, positive are distinct and never conflated', () => {
  const unknown = view('core-vulture-class-droid-starfighter');
  assert.equal(unknown.shield.state, 'unknown');
  assert.equal(unknown.shield.max, null);
  assert.equal(unknown.shield.editable, false);
  assert.match(unknown.shield.label, /not stated/i);
  const zero = view('core-tie-fighter');
  assert.equal(zero.shield.state, 'explicit-zero');
  assert.equal(zero.shield.rating, 0);
  assert.equal(zero.shield.editable, false);
  assert.equal(zero.shield.label, 'SR 0 (printed)');
  const positive = view('core-incom-t-65b-x-wing-starfighter');
  assert.equal(positive.shield.state, 'known');
  assert.equal(positive.shield.editable, true);
  assert.equal(positive.shield.label, 'SR 15 / 15');
});

test('current shields reflect world state while max stays printed', () => {
  const actor = structuredClone(byKey.get('core-incom-t-65b-x-wing-starfighter'));
  actor.system.shields.value = 5;
  const v = buildVehiclePublicationViewModel(actor);
  assert.equal(v.shield.current, 5);
  assert.equal(v.shield.max, 15);
});

test('HP damage changes current only; printed max stays', () => {
  const actor = structuredClone(byKey.get('core-incom-t-65b-x-wing-starfighter'));
  actor.system.hp.value = 37;
  const v = buildVehiclePublicationViewModel(actor);
  assert.equal(v.hp.current, 37);
  assert.equal(v.hp.max, 120);
});

test('call sign differs from printed model without changing source identity', () => {
  const actor = structuredClone(byKey.get('core-incom-t-65b-x-wing-starfighter'));
  actor.name = 'Red Five';
  const v = buildVehiclePublicationViewModel(actor);
  assert.equal(v.identity.callSign, 'Red Five');
  assert.equal(v.identity.printedModel, 'Incom T-65B X-wing Starfighter');
  assert.equal(v.identity.callSignDiffers, true);
  assert.equal(v.identity.sourceKey, 'core-incom-t-65b-x-wing-starfighter');
});

test('price states: priced vs not-for-sale are not purchasable from the sheet', () => {
  const priced = view('core-incom-t-65b-x-wing-starfighter');
  assert.equal(priced.price.status, 'priced');
  assert.equal(priced.price.amountCredits, 150000);
  const nfs = view('core-at-at');
  assert.equal(nfs.price.status, 'not-for-sale');
  assert.match(nfs.price.label, /not for sale/i);
  assert.equal(nfs.price.amountCredits, undefined);
  for (const v of [priced, nfs]) assert.equal(v.price.purchasable, false);
});

test('walker, capital ship, station, hybrid vehicle-droid render without invented facts', () => {
  for (const key of ['core-at-at', 'core-imperial-i-class-star-destroyer',
    'le-golan-viii-space-defense-platform', 'sgtd-dp-2-probe-droid', 'kotor-basilisk-war-droid']) {
    const v = view(key);
    assert.ok(v, key);
    const r = record(byKey.get(key));
    assert.equal(v.hp.max, r.durability.hitPoints);
    assert.equal(v.crew.count, Number.isFinite(r.crew?.crewCount) ? r.crew.crewCount : null);
  }
  const walker = view('core-at-at');
  assert.ok(walker.movement.some(m => m.mode === 'walking'));
});

test('all 429: no throw, no invented crew/cargo/price, attacks never executable, nothing installed', () => {
  assert.equal(actors.length, 429);
  for (const actor of actors) {
    const v = buildVehiclePublicationViewModel(structuredClone(actor));
    const r = record(actor);
    assert.equal(v.identity.sourceKey, r.identity.sourceEntryKey);
    assert.equal(v.hp.max, r.durability.hitPoints);
    assert.equal(v.initiative.value, r.abilities.initiativePrinted);
    // unknown crew complement is null, never 6
    if (!Number.isFinite(r.crew?.crewCount)) assert.equal(v.crew.count, null);
    if (!r.capacity?.cargo) assert.equal(v.cargo.display, SOURCE_UNKNOWN);
    if (!r.economics?.priceNew) assert.equal(v.price.status, 'absent');
    else assert.equal(v.price.status, r.economics.priceNew.status);
    // shield: SR editable only when a positive printed rating exists
    const sr = r.defenses.shieldRating;
    assert.equal(v.shield.editable, Number.isFinite(sr) && sr > 0);
    if (sr === 0) assert.equal(v.shield.state, 'explicit-zero');
    if (!Number.isFinite(sr)) assert.equal(v.shield.max, null);
    // movement keeps every published mode
    assert.equal(v.movement.length, (r.movement?.speedModes ?? []).length);
    // reference-only armament
    assert.equal(v.attackReference.executable, false);
    assert.equal(v.attackReference.groups.length, (r.armament?.firingGroups ?? []).length);
    assert.deepEqual(v.installed.mounts, []);
    assert.deepEqual(v.installed.modifications, []);
    assert.equal(v.installed.certification, 'NONE');
    assert.equal(getVehicleRuntimeProjection(structuredClone(actor)).published.attackGroupsExecutable, false);
  }
});

test('scratch and custom actors get no publication view', () => {
  assert.equal(buildVehiclePublicationViewModel({ type: 'vehicle', system: {}, flags: {} }), null);
});

test('published crew summary reports unknown complement as unknown, filled from assignments only', () => {
  const v = view('core-incom-t-65b-x-wing-starfighter');
  const s = buildPublishedCrewSummary(v, { pilot: { uuid: 'Actor.abc' }, gunner: null });
  assert.equal(s.filledSlots, 1);
  assert.equal(s.totalSlots, 1);
  const unknownCrew = actors.find(a => !Number.isFinite(record(a).crew?.crewCount));
  if (unknownCrew) {
    const u = buildPublishedCrewSummary(buildVehiclePublicationViewModel(structuredClone(unknownCrew)), {});
    assert.equal(u.totalSlots, null);
    assert.equal(u.totalKnown, false);
  }
});

test('describeShield never marks a non-positive/unknown SR editable', () => {
  const mk = (state, value) => ({ defenses: { shield: { state, value } } });
  assert.equal(describeShield(mk('conditional', null), null).editable, false);
  assert.equal(describeShield(mk('conflicting', null), null).editable, false);
  assert.equal(describeShield(mk('explicit-zero', 0), { value: 0 }).editable, false);
});

// ---- static guards on the sheet code/templates (Foundry globals unavailable in Node) ----
const builder = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8');
const sheet = readFileSync('scripts/sheets/v2/vehicle-actor-sheet.js', 'utf8');
const content = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
const reference = readFileSync('templates/actors/vehicle/v2/partials/vehicle-attack-reference-panel.hbs', 'utf8');

test('no invented 500 cargo capacity, 6 crew default, or unconditional starship shields', () => {
  assert.doesNotMatch(sheet, /cargo\?\.capacity \?\? 500/);
  assert.doesNotMatch(sheet, /\|\| 500/);
  assert.doesNotMatch(builder, /\|\| 6\)/);
  assert.doesNotMatch(builder, /safeNumber\([^)]*, 6\)/);
  assert.doesNotMatch(builder, /supportsShields: hasShields \|\| isStarship/);
});

test('printed attack reference has no Fire control and canonical edit tab only exposes mutable state', () => {
  assert.doesNotMatch(reference, /data-action=|<button/);
  const canonicalEdit = content.split('data-canonical-edit="true"')[1].split('</section>')[0];
  const names = [...canonicalEdit.matchAll(/name="([^"]+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(names, ['system.hp.value', 'system.notes', 'system.shields.value']);
});

test('sheet submit policy still protects source fields (P0 gate unchanged)', () => {
  assert.match(sheet, /canonicalWritable = new Set\(\[\s*'name', 'img', 'system\.hp\.value', 'system\.shields\.value',/);
});
