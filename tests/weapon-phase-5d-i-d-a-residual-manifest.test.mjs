import assert from 'node:assert/strict';
import fs from 'node:fs';

// Phase 5D-I-D(-A): the residual input manifest classifies EVERY remaining unconsumed operation key / special-mechanic DEFER / deferred relation,
// claims no consumption it cannot probe, and guards each BLOCKED row with a tripwire that fails the day the missing subsystem appears.
const { buildManifest, evaluateTripwire, OUT_JSON } = await import('../tools/census-weapon-phase-5d-i-d-inputs.mjs');
const { I_D_ROWS } = await import('../tools/lib/weapon-phase-5d-i-d-ledger.mjs');
let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);

const m = buildManifest();
assert.deepEqual(m.problems, [], m.problems.join('\n'));
assert.equal(m.counters.I_D_UNCLASSIFIED, 0);
ok('manifest builds with no problems and zero unclassified');

const closure = JSON.parse(fs.readFileSync(new URL('../data/audits/weapon-phase-5d-h-closure-census.json', import.meta.url), 'utf8'));
assert.equal(m.counters.I_D_INPUT_OPERATION_KEYS, closure.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER);
assert.equal(closure.counters.CANONICAL_NAME_TEXT_HEURISTIC_USAGE, 0);
ok('every live unconsumed operation key has a row; canonical heuristic usage stays 0');

assert.equal(fs.readFileSync(new URL(`../${OUT_JSON}`, import.meta.url), 'utf8'), `${JSON.stringify(m, null, 2)}\n`);
ok('committed manifest equals the regenerated one (deterministic)');

// no consumption claimed: the I-D-A rows are BLOCKED / DUPLICATE / NON_EXECUTABLE, never IMPLEMENTED, and the manifest does not feed the closure census
assert.equal(m.counters.I_D_IMPLEMENTED, 0);
assert.ok(!fs.readFileSync(new URL('../tools/lib/weapon-phase-5d-h-ledgers.mjs', import.meta.url), 'utf8').includes('5d-i-d'));
ok('no IMPLEMENTED claim; the I-D ledger does not feed (or lower) the 5D-H closure counters');

// every BLOCKED row names a subsystem, an owner and tripwires that all hold today
for (const r of m.rows.filter((x) => x.disposition === 'BLOCKED')) {
  assert.ok(r.missingSubsystem && r.owner && r.tripwires?.length, r.key);
  for (const id of r.tripwires) assert.equal(evaluateTripwire(id).ok, true, `${r.key}: ${id}`);
}
for (const [id, t] of Object.entries(m.tripwires)) assert.equal(t.holds, true, id);
ok('every BLOCKED row is guarded by tripwires that hold');

// the tripwire mechanism really fails when a subsystem appears (synthetic: the pattern matches code that exists today)
assert.equal(evaluateTripwire('synthetic-present', { kind: 'none', pattern: 'class InventoryEngine' }).ok, false);
assert.equal(evaluateTripwire('synthetic-wired', { kind: 'unreferenced', module: 'scripts/engine/inventory/item-activation-state.js', needle: 'item-activation-state' }).ok, false);
assert.equal(evaluateTripwire('synthetic-count', { kind: 'count', pattern: 'class InventoryEngine', count: 1 }).ok, true);
assert.equal(evaluateTripwire('unknown-id').ok, false);
ok('tripwires fail when the "absent" subsystem is present / the "unwired" module is referenced');

// the one proven duplicate and the one proven non-executable
const dup = m.rows.find((r) => r.key === 'protectedAtmosphereImmune');
assert.equal(dup.disposition, 'DUPLICATE');
const non = m.rows.find((r) => r.key === 'targeting');
assert.equal(non.disposition, 'NON_EXECUTABLE');
ok('protectedAtmosphereImmune is a proven duplicate of the executed CT immunity; Sonic Stunner targeting states no executable restriction');

// owners: every later subpass row has an explicit owner
for (const r of I_D_ROWS.filter((x) => x.disposition.startsWith('DEFERRED_TO_'))) assert.ok(r.owner && r.disposition.endsWith(r.owner.replace(/-/g, '_')), r.key);
ok('every deferral names its owning subpass');

console.log(`Weapon 5D-I-D residual manifest: ${n} checks passed.`);
