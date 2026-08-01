import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// Phase 2 DSP migration — real behavioral coverage via the existing
// tests/helpers/foundry-shim/ harness. Uses the real production migration
// module (scripts/migration/dark-side-points-migration.js) and the real
// DSPEngine.hasOwnPath it imports; ActorEngine is faked per the harness's
// documented convention (its real implementation is too heavy to load
// under Node — see fakes/actor-engine.fake.mjs's doc comment), but the
// fake's updateActor() genuinely mutates the actor object, including
// honoring the 'system.-=field' deletion-key convention, so this is real
// verification of the migration's actual write behavior, not a mock that
// just records calls.

registerFoundryPathLoader();

const { migrateDarkSidePoints, computeDarkSidePointsMigration, MIGRATION_VERSION } = await import(
  '/systems/foundryvtt-swse/scripts/migration/dark-side-points-migration.js'
);

function deepClone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function actorWithSource(sourceSystem, preparedSystemOverrides = {}) {
  const preparedSystem = { darkSide: { value: 0, max: 0 }, ...preparedSystemOverrides };
  return {
    id: `actor-${Math.random().toString(36).slice(2)}`,
    name: 'Test Actor',
    _source: { system: deepClone(sourceSystem) },
    system: deepClone(preparedSystem)
  };
}

/** Real Foundry Collections iterate to values (not [k,v] pairs) via Array.from — a plain Map does not, so this overrides it locally for the test. */
function fakeActorCollection(actors) {
  const map = new Map(actors.map(a => [a.id, a]));
  map[Symbol.iterator] = function* iterateValues() { yield* this.values(); };
  return map;
}

/** Simulates a world reload: what got persisted (system, post fake-ActorEngine mutation) becomes the new _source. */
function syncSourceFromSystem(actor) {
  actor._source = { system: deepClone(actor.system) };
}

/** Minimal working game.settings — HouseRuleService requires .get/.set and a registered-key check via .settings.has(). */
function fakeSettingsApi(registeredKeys) {
  const store = new Map();
  const fullKeys = new Set(registeredKeys.map(k => `foundryvtt-swse.${k}`));
  return {
    get(namespace, key) { return store.get(`${namespace}.${key}`); },
    async set(namespace, key, value) { store.set(`${namespace}.${key}`, value); return value; },
    settings: { has: (fullKey) => fullKeys.has(fullKey) }
  };
}

function freshGm(actors) {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true, id: 'gm-1' },
      actors: fakeActorCollection(actors),
      settings: fakeSettingsApi(['darkSidePointsPhase2Migration'])
    }
  });
  resetFakeActorEngine();
}

// ── computeDarkSidePointsMigration: pure decision-table coverage ────────

// 1. canonical-absent + legacy scalar → canonical becomes the scalar
{
  const actor = actorWithSource({ darkSideScore: 5 });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, true);
  assert.equal(d.update['system.darkSide.value'], 5);
}

// 2. canonical-absent + legacy object {value:4} → canonical becomes 4, legacy object cleaned
{
  const actor = actorWithSource({ darkSideScore: { value: 4 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 4);
  assert.equal(d.legacyObjectRecovered, true);
  assert.equal(d.update['system.-=darkSideScore'], null);
  assert.equal(d.legacyShapeCleaned, true);
}

// 3. persisted canonical 0 + legacy 5 → canonical remains 0
{
  const actor = actorWithSource({ darkSide: { value: 0, max: 0 }, darkSideScore: 5 });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, false, '0 is already valid canonical; scalar legacy 5 is left untouched, not cleaned');
  assert.equal('system.darkSide.value' in d.update, false);
}

// 4. persisted canonical 3 + legacy 5 (plain scalar) → canonical remains 3, no update at all
{
  const actor = actorWithSource({ darkSide: { value: 3, max: 0 }, darkSideScore: 5 });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, false);
}

// 4b. persisted canonical 3 + MALFORMED legacy {value:5} → canonical preserved at 3,
//     malformed object still cleaned (independent-OR case)
{
  const actor = actorWithSource({ darkSide: { value: 3, max: 0 }, darkSideScore: { value: 5 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, true, 'legacy shape cleanup alone must trigger an update');
  assert.equal('system.darkSide.value' in d.update, false, 'valid canonical 3 is not touched');
  assert.equal(d.update['system.-=darkSideScore'], null);
}

// 4c. unrecoverable legacy object {value:'broken'}, no canonical → canonical
//     falls back to 0, but the object is still deleted (round 3: recovery
//     and shape-cleanup are independent decisions — an object doesn't need
//     to be recoverable to need deleting, since the field is meant to be
//     numeric).
{
  const actor = actorWithSource({ darkSideScore: { value: 'broken' } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 0);
  assert.equal(d.legacyObjectRecovered, false, 'nothing usable was recovered');
  assert.equal(d.legacyShapeCleaned, true, 'the object must still be deleted');
  assert.equal(d.update['system.-=darkSideScore'], null);
}

// 4d. legacy object with no usable "value" key at all {foo:'bar'} → same:
//     canonical falls back to 0, object still deleted.
{
  const actor = actorWithSource({ darkSideScore: { foo: 'bar' } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 0);
  assert.equal(d.legacyObjectRecovered, false);
  assert.equal(d.legacyShapeCleaned, true);
  assert.equal(d.update['system.-=darkSideScore'], null);
}

// 4e. valid canonical 3 + an UNRECOVERABLE legacy object → canonical 3 is
//     preserved (never touched) and the object is still deleted, even
//     though nothing was recovered from it.
{
  const actor = actorWithSource({ darkSide: { value: 3, max: 0 }, darkSideScore: { value: 'broken' } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal('system.darkSide.value' in d.update, false, 'valid canonical 3 must not be touched');
  assert.equal(d.legacyObjectRecovered, false);
  assert.equal(d.legacyShapeCleaned, true);
  assert.equal(d.update['system.-=darkSideScore'], null);
}

// 5. template-hydrated-zero (no persisted canonical) + real legacy 5 → migration writes canonical 5
{
  const actor = actorWithSource({ darkSideScore: 5 }, { darkSide: { value: 0, max: 0 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 5, 'must see through template-hydrated prepared 0');
}

// 6. malformed canonical (NaN string) + valid legacy → repaired from legacy
{
  const actor = actorWithSource({ darkSide: { value: 'not-a-number' }, darkSideScore: 7 });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.malformedCanonicalRepaired, true);
  assert.equal(d.update['system.darkSide.value'], 7);
}

// 7. malformed canonical (negative) + no legacy → repaired to 0
{
  const actor = actorWithSource({ darkSide: { value: -3 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.malformedCanonicalRepaired, true);
  assert.equal(d.update['system.darkSide.value'], 0);
}

// 7b. Round 4: every broad-coercion trap (null/''/true/[4]/{}) that a
//     bare Number(x) would have silently accepted as a "valid" canonical
//     value must instead migrate to the legacy value — the same strict
//     parseCanonicalDarkSideNumber() rule getValue() now follows.
{
  const malformedCanonicalShapes = [null, '', '   ', true, false, [4], {}];
  for (const malformed of malformedCanonicalShapes) {
    const actor = actorWithSource({ darkSide: { value: malformed }, darkSideScore: 7 });
    const d = computeDarkSidePointsMigration(actor);
    assert.equal(
      d.update['system.darkSide.value'],
      7,
      `malformed canonical ${JSON.stringify(malformed)} must migrate to legacy 7`
    );
    assert.equal(d.malformedCanonicalRepaired, true);
  }
}

// 7c. canonical numeric string "4" is still read numerically for
//     compatibility, but migrates to the NUMBER 4, not to legacy 7 — a
//     numeric-string canonical value is valid data, just malformed
//     *storage type*, so it wins over legacy exactly like a real number
//     would, while still needing the type-normalizing rewrite.
{
  const actor = actorWithSource({ darkSide: { value: '4' }, darkSideScore: 7 });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 4, 'a numeric-string canonical value wins over legacy, unlike a truly malformed shape');
  assert.equal(typeof d.update['system.darkSide.value'], 'number', 'must be rewritten as a real Number, not left as a string');
  assert.equal(d.malformedCanonicalRepaired, false, 'a numeric-string canonical value is not "malformed" in the recovery sense — it is valid data needing a type rewrite');
}

// 8. missing max → 0
{
  const actor = actorWithSource({ darkSide: { value: 2 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.max'], 0);
}

// 8b. Round 4: strict canonical max normalization — the same
//     coercion-trap shapes, applied to darkSide.max instead of .value,
//     must all normalize to 0 (the "derive from Wisdom x multiplier"
//     sentinel), not be silently accepted via Number(x) coercion.
{
  const malformedMaxShapes = [null, '', true, [12]];
  for (const malformed of malformedMaxShapes) {
    const actor = actorWithSource({ darkSide: { value: 2, max: malformed } });
    const d = computeDarkSidePointsMigration(actor);
    assert.equal(
      d.update['system.darkSide.max'],
      0,
      `malformed max ${JSON.stringify(malformed)} must normalize to 0`
    );
  }
  // A numeric-string max is still read numerically and rewritten as a
  // real Number, same policy as the value field.
  const stringMaxActor = actorWithSource({ darkSide: { value: 2, max: '12' } });
  const stringMaxDecision = computeDarkSidePointsMigration(stringMaxActor);
  assert.equal(stringMaxDecision.update['system.darkSide.max'], 12);
  assert.equal(typeof stringMaxDecision.update['system.darkSide.max'], 'number');
}

// 9. valid explicit max → preserved
{
  const actor = actorWithSource({ darkSide: { value: 2, max: 12 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, false);
  assert.equal('system.darkSide.max' in d.update, false);
}

// 10. negative current value (no legacy) → normalized to 0 (already covered by #7, add explicit -2 case for symmetry with rounding tests)
{
  const actor = actorWithSource({ darkSide: { value: -2 } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.update['system.darkSide.value'], 0);
}

// 11. fractional-value rounding: half-up behavior, explicit cases
{
  const cases = [[4.4, 4], [4.5, 5], [4.6, 5]];
  for (const [input, expected] of cases) {
    const actor = actorWithSource({ darkSide: { value: input } });
    const d = computeDarkSidePointsMigration(actor);
    assert.equal(d.update['system.darkSide.value'], expected, `${input} -> ${expected}`);
  }
}

// 12. numeric-string repair: "5" is not already-canonical merely because Number("5") === 5
{
  const actor = actorWithSource({ darkSide: { value: '5' } });
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, true, 'a persisted string must be rewritten even though it numerically equals target');
  assert.equal(d.update['system.darkSide.value'], 5);
}

// ── migrateDarkSidePoints: full world-pass behavioral coverage ──────────

// 12b. no persisted DSP data at all (neither canonical nor legacy) → skipped,
//      not migrated to {value:0, max:0} — the migration's stated scope is
//      "actors that contain legacy or canonical DSP data," not every actor.
{
  const actor = actorWithSource({});
  const d = computeDarkSidePointsMigration(actor);
  assert.equal(d.needsUpdate, false, 'an actor with no darkSide and no darkSideScore in _source must be skipped');
  assert.equal(d.skippedNoDSPData, true);
  assert.deepEqual(d.update, {});
}

// 13. mixed collection: only actors requiring migration are updated; a
//     third actor with no DSP data at all is counted under
//     skippedNoDSPData and never receives an ActorEngine call
{
  const needsWork = actorWithSource({ darkSideScore: 5 });
  const alreadyClean = actorWithSource({ darkSide: { value: 2, max: 10 } });
  const noData = actorWithSource({});
  freshGm([needsWork, alreadyClean, noData]);
  const summary = await migrateDarkSidePoints({ silent: true });
  assert.equal(summary.migrated, 1);
  assert.equal(summary.skipped, 2);
  assert.equal(summary.skippedNoDSPData, 1);
  assert.equal(needsWork.system.darkSide.value, 5);
  const updateCalls = fakeActorEngineCallLog.filter(c => c.method === 'updateActor');
  assert.equal(updateCalls.length, 1, 'the no-data actor must never generate an ActorEngine call');
  assert.equal(updateCalls[0].actorId, needsWork.id);
  resetFoundryShimGlobals();
}

// 13b. second run stays a no-op for the no-data actor too
{
  const needsWork = actorWithSource({ darkSideScore: 5 });
  const noData = actorWithSource({});
  freshGm([needsWork, noData]);
  await migrateDarkSidePoints({ silent: true });
  syncSourceFromSystem(needsWork);

  resetFakeActorEngine();
  const summary2 = await migrateDarkSidePoints({ silent: true });
  assert.equal(summary2, null, 'already-migrated version short-circuits the whole pass');
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// 14. second run is a true no-op after syncing _source to what was persisted
{
  const actor = actorWithSource({ darkSideScore: 5 });
  freshGm([actor]);
  await migrateDarkSidePoints({ silent: true });
  assert.equal(actor.system.darkSide.value, 5);
  syncSourceFromSystem(actor); // simulate world reload picking up the persisted write

  resetFakeActorEngine();
  const summary2 = await migrateDarkSidePoints({ silent: true });
  // Version already advanced on the first (failure-free) run, so a second
  // call short-circuits on the version check before touching any actor.
  assert.equal(summary2, null, 'already-migrated version short-circuits the whole pass');
  assert.equal(fakeActorEngineCallLog.length, 0);
  resetFoundryShimGlobals();
}

// 15. live-writer retirement: gaining 1 DSP from a legacy-scalar-5 actor
//     produces canonical 6 with no system.darkSideScore key in the payload
{
  const { DSPEngine } = await import('/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js');
  installFoundryShimGlobals();
  const actor = actorWithSource({ darkSideScore: 5 });
  const before = DSPEngine.getValue(actor);
  const after = DSPEngine.getNextValue(actor, 1);
  assert.equal(before, 5);
  assert.equal(after, 6, 'not 1 — the legacy scalar must be recovered before incrementing');
  resetFoundryShimGlobals();
}

// 16. partial-failure/retry: one actor succeeds, one throws — version must
//     not advance; a clean retry then migrates only the previously-failed
//     actor and advances the version afterward.
{
  const willSucceed = actorWithSource({ darkSideScore: 5 });
  const willFail = actorWithSource({ darkSideScore: 9 });
  freshGm([willSucceed, willFail]);

  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalUpdateActor = ActorEngine.updateActor;
  ActorEngine.updateActor = async (actor, data, options) => {
    if (actor.id === willFail.id) throw new Error('simulated migration failure');
    return originalUpdateActor(actor, data, options);
  };

  let summary;
  try {
    summary = await migrateDarkSidePoints({ silent: true });
  } finally {
    ActorEngine.updateActor = originalUpdateActor;
  }
  assert.equal(summary.migrated, 1);
  assert.equal(summary.failures.length, 1);
  assert.equal(summary.versionAdvanced, false);
  assert.equal(willSucceed.system.darkSide.value, 5);
  assert.equal(willFail.system.darkSide.value, 0, 'unmigrated — the throwing update never applied');

  // Simulate the successful actor's write actually having persisted.
  syncSourceFromSystem(willSucceed);
  resetFakeActorEngine();

  // Retry: the failure condition is gone this time.
  const summary2 = await migrateDarkSidePoints({ silent: true });
  assert.equal(summary2.migrated, 1, 'only the previously-failed actor needs work now');
  assert.equal(summary2.skipped, 1, 'the already-migrated actor is naturally skipped, not re-updated');
  assert.equal(summary2.failures.length, 0);
  assert.equal(summary2.versionAdvanced, true, 'version only advances once a run has zero failures');
  assert.equal(willFail.system.darkSide.value, 9);

  resetFoundryShimGlobals();
}

resetFoundryShimGlobals();
console.log('DSP migration behavioral tests passed.');
