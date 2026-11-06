import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { signedBonus } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-publication-view-model.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;
const wrap = (a, over = {}) => { const d = structuredClone(a); Object.assign(d, over);
  return { ...d, id: 'v1', isOwner: true, items: [], toObject: () => structuredClone(d) }; };
const ctx = (a, opts = {}) => buildVehicleSheetContext(wrap(a, opts.actor), { editable: opts.editable ?? true }, opts.builder ?? {});

test('signed printed bonuses: negative, zero and positive are all shown correctly', () => {
  assert.equal(signedBonus(-2), '-2');
  assert.equal(signedBonus(0), '+0');
  assert.equal(signedBonus(5), '+5');
  const x = actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
  const groups = ctx(x).publicationView.attackReference.groups;
  assert.deepEqual(groups.map(g => g.attackLabel), ['+5', '+5']);
  const content = readFileSync('templates/actors/vehicle/v2/partials/vehicle-attack-reference-panel.hbs', 'utf8');
  assert.doesNotMatch(content, /\+\{\{group/);
  assert.match(content, /\{\{#if group\.attackLabel\}\}/);
});

test('all 429: the integrated context builds, with source-faithful panels and no invented numbers', () => {
  const categories = new Set(), opsAbsent = [];
  for (const a of actors) {
    const r = rec(a), c = ctx(a);
    categories.add(r.classification.primaryCategory);
    const view = c.publicationView;
    assert.equal(view.identity.sourceKey, r.identity.sourceEntryKey);
    // tabs: Stats always present; Edit only when editable
    const tabs = c.vehicleConceptTabs.map(t => t.key);
    assert.ok(tabs.includes('stats'), r.identity.sourceEntryKey);
    assert.ok(tabs.includes('edit'));
    assert.ok(!ctx(a, { editable: false }).vehicleConceptTabs.some(t => t.key === 'edit'));
    if (!tabs.includes('operations')) opsAbsent.push(r.identity.sourceEntryKey);
    // crew: published count or unknown, never a default of 6
    const crew = c.vehiclePanels.crewSummaryPanel;
    const count = Number.isFinite(r.crew?.crewCount) ? r.crew.crewCount : null;
    assert.equal(crew.totalSlots, count);
    assert.equal(crew.totalKnown, count !== null);
    // cargo capacity is the published value or unknown, never 500
    const cargo = c.vehiclePanels.cargoSummaryPanel;
    if (!r.capacity?.cargo) assert.notEqual(cargo.capacity, 500);
    // shield: strip text follows the printed state
    const sr = r.defenses.shieldRating, strip = c.vehicleResourceStrip.entries.find(e => e.key === 'sr').value;
    if (!Number.isFinite(sr)) assert.equal(strip, 'Unknown', 'unknown/conditional SR is never 0');
    else if (sr === 0) assert.equal(strip, '0 (printed)');
    else assert.match(strip, new RegExp(`^${a.system.shields.value} / ${sr}$`));
    // HP: current from system.hp, max printed
    assert.equal(c.vehiclePanels.hpConditionPanel.hp.max, r.durability.hitPoints);
    // printed defenses, unknown stays unknown
    const defs = Object.fromEntries(c.vehiclePanels.defensesPanel.defenses.map(d => [d.key, d.total]));
    assert.equal(defs.ref, String(r.defenses.reflex));
    assert.equal(defs.fort, String(r.defenses.fortitude));
    // power panel only with a power rule context
    assert.equal(c.vehiclePanels.powerSummaryPanel, null);
    // directional shield zones only for a positive published SR
    assert.equal(c.vehiclePanels.shieldManagementPanel === null || (Number.isFinite(sr) && sr > 0), true);
    // nothing renders a NaN/undefined/[object Object] string
    assert.doesNotMatch(JSON.stringify(c.publicationView), /NaN|undefined|\[object/);
    // reference armament is always available on the context regardless of category
    assert.equal(view.attackReference.executable, false);
    assert.equal(view.attackReference.groups.length, (r.armament?.firingGroups ?? []).length);
    // no embedded weapon mounts exist for source-only vehicles
    assert.equal(c.vehiclePanels.weaponMountPanel, null);
  }
  assert.ok(opsAbsent.length > 0, 'fixture covers categories without an Operations tab');
  assert.ok(categories.size >= 25);
});

test('printed armament is on the Stats tab, outside every category-dependent block', () => {
  const t = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
  const stats = t.slice(t.indexOf('data-tab="stats"'), t.indexOf('data-tab="crew"'));
  assert.match(stats, /vehicle-attack-reference-panel\.hbs/);
  const operations = t.slice(t.indexOf('data-tab="operations"'), t.indexOf('data-tab="edit"'));
  assert.doesNotMatch(operations, /vehicle-attack-reference-panel/);
  assert.match(t, /\{\{#if vehicleTypeFlags\.supportsOperationsTab\}\}\s*<section[^>]*data-tab="operations"/);
});

test('categories lacking an Operations tab still expose printed attack groups in the context', () => {
  const noOps = actors.filter(a => !ctx(a).vehicleConceptTabs.some(t => t.key === 'operations'));
  const withGroups = noOps.filter(a => (rec(a).armament?.firingGroups ?? []).length);
  assert.ok(withGroups.length > 0, 'at least one operations-less category has printed groups');
  for (const a of withGroups) assert.ok(ctx(a).publicationView.attackReference.groups.length > 0);
});

test('current state: HP damage, shields and crew assignments flow through; printed values do not move', () => {
  const x = actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
  const c = ctx(x, { actor: { system: { ...structuredClone(x.system), hp: { value: 30, max: 120 }, shields: { value: 4, max: 15 },
    crewPositions: { pilot: { id: 'p', name: 'Luke' } } } } });
  assert.equal(c.vehiclePanels.hpConditionPanel.hp.value, 30);
  assert.equal(c.vehiclePanels.hpConditionPanel.hp.max, 120);
  assert.equal(c.vehicleResourceStrip.entries.find(e => e.key === 'sr').value, '4 / 15');
  assert.equal(c.vehiclePanels.crewSummaryPanel.filledSlots, 1);
  assert.equal(c.vehiclePanels.crewSummaryPanel.totalSlots, 1);
  assert.equal(c.publicationView.shield.current, 4);
  assert.equal(c.publicationView.shield.max, 15);
});

test('movement: hybrid and multi-scale vehicles expose every published mode with its scale', () => {
  for (const a of actors) {
    const modes = rec(a).movement?.speedModes ?? [];
    const view = ctx(a).publicationView.movement;
    assert.equal(view.length, modes.length);
    assert.deepEqual(view.map(m => m.scale), modes.map(m => m.scale));
  }
  const multi = actors.filter(a => new Set((rec(a).movement?.speedModes ?? []).map(m => m.scale)).size > 1);
  assert.ok(multi.length > 50);
});

test('a vehicle with an equipment Item still builds a valid context (runtime Item contract)', () => {
  const x = actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
  const d = structuredClone(x); d.items = [{ _id: 'e', type: 'equipment', name: 'Crate', system: {} }];
  const actor = { ...d, id: 'v1', isOwner: true, items: d.items, toObject: () => structuredClone(d) };
  const c = buildVehicleSheetContext(actor, { editable: true }, {});
  assert.equal(c.vehicleRuntimeProjection.installed.equipmentItemCount, 1);
  assert.equal(c.publicationView.attackReference.executable, false);
});

test('edit restrictions: canonical edit tab exposes only current state', () => {
  const t = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
  const canonical = t.split('data-canonical-edit="true"')[1].split('</section>')[0];
  assert.deepEqual([...canonical.matchAll(/name="([^"]+)"/g)].map(m => m[1]).sort(), ['system.hp.value', 'system.notes', 'system.shields.value']);
});
