import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { getVehicleCrewEntry, resolveVehicleCrewActor } from '../scripts/engine/crew/vehicle-crew-actor-authority.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const rec = a => a.flags.swse.universalVehicleSource.source;
const byKey = key => structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === key));
const XW = 'core-incom-t-65b-x-wing-starfighter';

const resolver = (() => {
  const code = readFileSync('scripts/sheets/v2/vehicle-sheet/crew-resolver.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { VehicleCrewPositions: { POSITION_SKILLS: {} } };
  runInNewContext(code + '\nglobalThis.R = resolveVehicleCrewStations;', ctx);
  return ctx.R;
})();

test('all 429: station set is the base stations only; no gunner stations from printed attack groups', () => {
  for (const a of actors) {
    const r = resolver({ system: a.system, weapons: { count: 0 } });
    assert.equal(r.gunners.length, 0, rec(a).identity.sourceEntryKey);
    assert.deepEqual([...r.stations.map(s => s.key)], ['pilot', 'copilot', 'engineer', 'shields', 'commander']);
    assert.equal(r.assignedCount, 0);
  }
});

test('published crew count drives facts; unknown is null, not parsed or defaulted', () => {
  for (const a of actors) {
    const r = resolver({ system: a.system });
    const count = rec(a).crew?.crewCount;
    const expected = Number.isFinite(count) ? count : null;
    assert.equal(r.facts.multiCrew, (expected ?? 0) > 1);
    const quality = rec(a).crew?.crewQuality;
    const fb = r.stations.find(s => s.key === 'pilot').fallback;
    assert.equal(fb, quality ? String(a.system.vehicleCrewQuality ?? quality) : 'Crew quality not stated');
  }
});

test('legacy ownedActors link is never a crew assignment on a source-backed vehicle', async () => {
  const v = byKey(XW);
  v.system.ownedActors = [{ id: 'Z', position: 'pilot', role: 'pilot', name: 'Asset Link' }];
  assert.equal(getVehicleCrewEntry(v, 'pilot'), null);
  assert.equal(resolver({ system: v.system }).assignedCount, 0);
  assert.equal((await resolveVehicleCrewActor(v, 'pilot')).source, 'unassigned');
  // custom vehicle keeps the legacy compatibility read
  const custom = { system: { ownedActors: [{ id: 'Z', position: 'pilot', name: 'Old' }] } };
  assert.equal(getVehicleCrewEntry(custom, 'pilot').name, 'Old');
});

test('assigned, deleted/invalid and abstract crew remain distinct', async () => {
  const v = byKey(XW);
  v.system.crewPositions = { pilot: { id: 'gone', name: 'Ghost' }, copilot: null };
  globalThis.game = { actors: { get: id => (id === 'real' ? { id: 'real', name: 'Real Pilot' } : null) } };
  assert.equal((await resolveVehicleCrewActor(v, 'pilot')).source, 'invalid');
  assert.equal((await resolveVehicleCrewActor(v, 'copilot')).source, 'unassigned');
  v.system.crewPositions.pilot = { id: 'real' };
  const ok = await resolveVehicleCrewActor(v, 'pilot');
  assert.equal(ok.source, 'actor');
  assert.equal(ok.label, 'Real Pilot');
  const r = resolver({ system: v.system });
  assert.equal(r.assignedCount, 1);
  delete globalThis.game;
});

test('installed weapons (not printed groups) are what creates gunner-N stations', () => {
  const v = byKey(XW);
  const r = resolver({ system: v.system, weapons: { count: 2 } });
  assert.deepEqual([...r.gunners.map(g => g.key)], ['gunner', 'gunner-2']);
  assert.equal(resolver({ system: v.system, weapons: { count: 0 } }).gunners.length, 0);
});
