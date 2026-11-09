import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world, install, state } from './helpers/vehicle-weapon-world.mjs';

// Vehicle systems browser: weapon classification comes from the existing weapon authority, installations from the sealed ledger, printed armament
// stays reference-only, EP states stay explicit, and a legacy system.weapons record is visible but never evidence. Real install service + vehicle.
const { buildVehicleSystemsBrowser } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-systems-browser.js');
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
const { buildVehiclePublicationViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-publication-view-model.js');
const { buildVehicleWeaponMountPanel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');

const browse = (v, extra = {}) => {
  const schema = buildVehicleSchemaViewModel(v, { isGM: true });
  let publication = null; try { publication = buildVehiclePublicationViewModel(v); } catch (_e) { publication = null; }
  return buildVehicleSystemsBrowser({ actor: v, schema, publication, mountPanel: buildVehicleWeaponMountPanel(v), canAct: true, ...extra });
};

test('published vehicle: printed armament is reference only; a certified installed weapon is a certified weapon; EP is explicit', async () => {
  world({ hull: 'fighter' });
  const { vehicle } = state();
  const before = browse(vehicle);
  assert.ok(before, 'a published vehicle yields a browser');
  const refs = before.entries.filter((e) => e.category === 'weapon-reference');
  assert.ok(refs.length > 0, 'the printed attack groups are listed');
  assert.ok(refs.every((e) => e.status.key === 'reference' && e.operations.length === 0 && e.facts.some((f) => f.label === 'Executable' && f.value === 'No')), 'printed groups are reference only and carry no control');
  assert.ok(before.entries.every((e) => !(e.category === 'weapon-reference' && e.operations.some((o) => /fire|attack|roll/i.test(o.label)))));
  assert.ok(before.summary.some((c) => c.label === 'EP'), 'EP is shown');

  const weapon = await install('laser-cannon-light');
  assert.ok(weapon, 'the certified weapon was installed through the real service');
  const after = browse(vehicle);
  const mine = after.entries.find((e) => e.key === `weapon:${weapon.id}`);
  assert.ok(mine, 'the installed weapon Item is listed');
  assert.equal(mine.category, 'weapon-certified'); assert.equal(mine.status.key, 'installed');
  assert.ok(mine.facts.some((f) => f.label === 'Provenance' && /Certified installation/.test(f.value)));
  const ledger = after.entries.filter((e) => e.key.startsWith('install:'));
  assert.ok(ledger.length >= 1, 'the sealed ledger entry is listed as an installation');
  const f = Object.fromEntries(ledger[0].facts.map((x) => [x.label, x.value]));
  assert.equal(f['Operational state'], 'Not tracked by the installation record', 'no operational state is invented');
  assert.ok(after.summary.find((c) => c.label === 'EP').value.includes('used'), 'consumed EP is visible after the install');
  assert.ok(after.entries.filter((e) => e.category === 'weapon-reference').length === refs.length, 'printed references are unchanged by the install and never become mounts');
});

test('a weapon Item the authority does not certify is Blocked with its reason', async () => {
  world({ hull: 'fighter' });
  const { vehicle, items } = state();
  items.set('rogue', { id: 'rogue', type: 'weapon', name: 'Homebrew Cannon', system: { damage: '9d10' }, flags: {}, actor: vehicle });
  const b = browse(vehicle);
  const rogue = b.entries.find((e) => e.key === 'weapon:rogue');
  assert.equal(rogue.category, 'weapon-blocked'); assert.equal(rogue.status.key, 'blocked');
  assert.ok(rogue.operations.every((o) => o.cls === 'swse-v2-open-item'), 'a blocked weapon offers no fire/ammo control, only to open the Item');
  assert.match(rogue.notes.join(' '), /Nothing is generated from its displayed text/);
  assert.ok(b.categories.some((c) => c.id === 'weapon-blocked'));
});

test('legacy system.weapons: a published vehicle carrying it is source-invalid (no browser); on a custom vehicle it is listed as non-canonical, never as a weapon', async () => {
  world({ hull: 'fighter' });
  const { vehicle } = state();
  vehicle.system.weapons = [{ name: 'Legacy Gun', damage: '5d10' }];
  assert.equal(browse(vehicle), null, 'the existing authority invalidates the published source, so nothing is presented as installed');
  const custom = { id: 'cv', type: 'vehicle', name: 'Skiff', isOwner: true, items: [], flags: { swse: {} }, system: { weapons: [{ name: 'Legacy Gun', damage: '5d10' }] } };
  const b = browse(custom);
  const legacy = b.entries.find((e) => e.key.startsWith('legacy:'));
  assert.equal(legacy.status.key, 'legacy'); assert.equal(legacy.category, 'weapon-blocked'); assert.equal(legacy.operations.length, 0); assert.match(legacy.notes.join(' '), /not installation evidence/);
  assert.ok(b.entries.every((e) => e.category !== 'weapon-certified'));
});

test('source-invalid vehicles and missing view models yield no browser; adapter and template are presentation-only and wired', async () => {
  assert.equal(buildVehicleSystemsBrowser({ actor: {}, schema: null }), null);
  assert.equal(buildVehicleSystemsBrowser({ actor: {}, schema: { origin: 'PUBLISHED_SOURCE_INVALID' } }), null);
  const adapter = fs.readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-systems-browser.js', 'utf8');
  assert.ok(!/ActorEngine|\.update\(|setFlag|createEmbedded|deleteEmbedded|new Roll\(/.test(adapter));
  assert.ok(!/system\.installedSystems|system\.hull/.test(adapter.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'legacy fields are never read as evidence');
  const tpl = fs.readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
  assert.ok(tpl.includes('browse-inspect.hbs" browser=vehicleSystemsBrowser'));
  assert.ok(fs.readFileSync('scripts/sheets/v2/vehicle-actor-sheet.js', 'utf8').includes('activateBrowseInspect(this, root, { signal })'));
  assert.ok(fs.readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8').includes('vehicleSystemsBrowser,'));
});
