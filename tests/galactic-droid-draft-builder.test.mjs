import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

registerFoundryPathLoader();
const { buildDroidDraft, resolveDroidSystemsSelection } = await import('../scripts/domain/droids/droid-draft-builder.js');
const { buildInitialDroidInstallation } = await import('../scripts/domain/droids/droid-initial-installation-service.js');
const doc = JSON.parse(fs.readFileSync(new URL('../data/galactic-profiles/v3/galactic-profiles.json', import.meta.url), 'utf8'));
const droids = doc.profiles.filter(p => p.subtype === 'droid');
const clone = v => JSON.parse(JSON.stringify(v));

test('there are exactly eight droid profiles', () => assert.equal(droids.length, 8));

for (const p of droids) {
  test(`${p.profileId}: authored 1000-credit hardware passes quote and installation unchanged`, () => {
    const d = p.extension.droid;
    const r = buildDroidDraft({ degree: d.degree, size: d.size, systems: d.systems, budget: 1000 });
    assert.equal(r.ok, true, JSON.stringify(r.blocked));
    assert.equal(r.quote.status, 'OK');
    assert.equal(r.quote.totalCredits, 1000);
    assert.equal(r.draft.droidCredits.spent, 1000);
    assert.equal(r.draft.droidCredits.remaining, 0);
    assert.equal(r.draft.buildState.mode, 'provisional');
    assert.equal(r.draft.buildState.isFinalized, false);
    assert.equal(r.draft.creationMode, 'custom');
    // appendage rows carry the canonical physical type, slot ids preserved
    const rows = r.draft.droidSystems.appendages;
    assert.deepEqual(rows.slice(0, 2).map(a => [a.id, a.type]), [['hand-1', 'hand'], ['hand-2', 'hand']]);
    assert.ok(rows.every(a => typeof a.type === 'string' && a.type.length > 0), 'every appendage row has a canonical type');
    assert.deepEqual(rows.map(a => a.id), d.systems.appendages.map(a => a.id), 'identities and order preserved');
    // free grants derive from V2: heuristic processor and the two baseline hands cost nothing; extras are charged
    assert.equal(r.draft.droidSystems.processor.cost, 0);
    assert.ok(rows.slice(0, 2).every(a => a.cost === 0));
    assert.ok(rows.slice(2).every(a => a.cost > 0));
    // the authored selection object was not mutated
    assert.ok(d.systems.appendages.every(a => Object.keys(a).join() === 'id'));
  });

  test(`${p.profileId}: real initial-installation projection seeds a ledger once and is deterministic`, () => {
    const d = p.extension.droid;
    const r = buildDroidDraft({ degree: d.degree, size: d.size, systems: d.systems, budget: 1000 });
    const a = buildInitialDroidInstallation({ actor: null, seed: 'seed-1', droidSystems: r.draft.droidSystems, size: d.size });
    const b = buildInitialDroidInstallation({ actor: null, seed: 'seed-1', droidSystems: r.draft.droidSystems, size: d.size });
    assert.equal(a.seeded, true);
    assert.deepEqual(a.unresolved, []);
    assert.deepEqual(a.installedSystems, b.installedSystems);
    assert.ok(Object.keys(a.installedSystems).length >= 8);
  });
}

test('fail closed: unknown component, over-budget, non-OK quote', () => {
  const d = clone(droids[0].extension.droid);
  const bad = clone(d.systems); bad.accessories.push({ id: 'does-not-exist', category: 'armor' });
  const u = buildDroidDraft({ degree: d.degree, size: d.size, systems: bad, budget: 1000 });
  assert.equal(u.ok, false);
  assert.equal(u.blocked[0].code, 'UNKNOWN_COMPONENT');

  const over = buildDroidDraft({ degree: d.degree, size: d.size, systems: d.systems, budget: 999 });
  assert.equal(over.ok, false);
  assert.equal(over.blocked[0].code, 'DROID_OVER_BUDGET');

  const noProc = clone(d.systems); noProc.processor = { id: 'nope' };
  assert.equal(resolveDroidSystemsSelection({ size: d.size, systems: noProc }).ok, false);
});

test('generic resolver: no profile-specific behaviour — a builder-style default selection is accepted', () => {
  const r = buildDroidDraft({
    degree: '1st-degree', size: 'medium', budget: 1000,
    systems: { locomotion: { id: 'walking' }, processor: { id: 'heuristic' }, appendages: [{ id: 'hand-1' }, { id: 'hand-2' }], accessories: [], locomotionEnhancements: [], appendageEnhancements: [] }
  });
  assert.equal(r.ok, true, JSON.stringify(r.blocked));
  assert.equal(r.draft.droidCredits.spent, 0);
  assert.equal(r.draft.droidCredits.remaining, 1000);
});
