import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Runtime Cache Coherency Audit — Target 2 (HIGH RISK, confirmed).
//
// AbilityEngine._acquisitionCache (scripts/engine/abilities/AbilityEngine.js)
// caches evaluateAcquisition()'s legality verdict under a key built from
// _actorCacheSignature(): actor id/type, persisted revision
// (_stats.modifiedTime), and an item signature. It does NOT observe
// system.derived at all.
//
// Computation reads -> semantic inputs -> cache identity -> invalidation:
//   reads:            PrerequisiteChecker.check*Prerequisites() -> for an
//                      ability-score prerequisite, SchemaAdapters
//                      .getAbilityScore(actor, key), whose FIRST-preference
//                      authority is system.derived.attributes[key].total.
//   semantic inputs:   persisted actor/item revision, AND the runtime
//                      derived ability snapshot (system.derived.attributes),
//                      which SWSEV2BaseActor._computeDerivedAsync() /
//                      ActorEngine._applyDerivedUpdates() write asynchronously
//                      and which an ActiveEffect-driven ability change flows
//                      through without touching the actor's persisted
//                      revision (the exact category of gap fixed for the
//                      panel cache in docs/audits/
//                      v2-derived-panel-cache-coherency.md).
//   cache identity (pre-fix): persisted revision + items ONLY.
//   invalidation:      clearAcquisitionCache(), called by a hand-maintained
//                      list of house-rule-change hooks -- NOT by any
//                      derived-state change.
//
// Because the cache identity never observed system.derived, a legality
// verdict computed while system.derived.attributes was stale (not yet
// reflecting a real ability-score correction) survives forever after that
// correction lands, for as long as the actor/item revision stays the same
// -- exactly the same defect class already fixed for the panel cache, now
// reproduced against AbilityEngine's real, unmodified evaluateAcquisition().
//
// This test exercises the REAL, imported AbilityEngine, PrerequisiteChecker
// (via AbilityEngine's own internal call), and SchemaAdapters.getAbilityScore()
// end to end -- no reimplementation of prerequisite logic.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils.duplicate = (v) => JSON.parse(JSON.stringify(v ?? {}));
globalThis.game.settings = globalThis.game.settings ?? {};
globalThis.game.settings.get = () => undefined; // debugMode off; no house-rule interference

const { AbilityEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js'
);
const { stampDerivedGeneration } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js'
);

function makeActor({ dexEnhancement = 0, derivedDexTotal = 14, derivedDexMod = 2 } = {}) {
  return {
    id: 'ability-engine-cache-actor',
    type: 'character',
    name: 'Cache Coherency Test Actor',
    _stats: { modifiedTime: 500 }, // persisted revision R — never changes in this test
    items: [],
    effects: [],
    flags: { swse: {} },
    system: {
      level: 1,
      isDroid: false,
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 14, racial: 0, enhancement: dexEnhancement, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      // Snapshot of what DerivedCalculator.computeAll() previously wrote to
      // system.derived.attributes -- may lag behind system.attributes
      // whenever an ActiveEffect/other runtime contribution mutates the
      // canonical score before the async derived pass catches up.
      derived: {
        attributes: {
          dex: { total: derivedDexTotal, mod: derivedDexMod }
        }
      }
    }
  };
}

// A feat with a structured ability-score prerequisite. Uses
// PrerequisiteChecker's real structured-condition path
// (feat.system.prerequisitesStructured), not a reimplementation.
const CANDIDATE_FEAT = {
  id: 'test-feat-dex-15-unique-9f21',
  type: 'feat',
  name: 'Test Feat Requiring DEX 15 (cache-coherency fixture, not a real feat)',
  system: {
    prerequisite: '',
    prerequisites: '',
    prerequisitesStructured: [{ type: 'attribute', ability: 'dex', minimum: 15 }]
  }
};

AbilityEngine.clearAcquisitionCache();

// ── Step 1: actor genuinely does not qualify yet (DEX 14 < 15), everything ──
// consistent (canonical attribute and derived snapshot agree). Evaluate and
// let AbilityEngine cache the (correct, for this state) "not legal" verdict.
const actor = makeActor({ dexEnhancement: 0, derivedDexTotal: 14, derivedDexMod: 2 });
const before = AbilityEngine.evaluateAcquisition(actor, CANDIDATE_FEAT, {});
assert.equal(before.legal, false, 'DEX 14 must not satisfy a DEX 15 prerequisite');

// ── Step 2: a real ability-score correction lands. In production this is ──
// exactly what an ActiveEffect enhancement bonus (applied during Foundry's
// applyActiveEffects(), before prepareDerivedData()) plus the async derived
// recompute landing (SWSEV2BaseActor._computeDerivedAsync() /
// ActorEngine._applyDerivedUpdates()) would produce: system.attributes AND
// system.derived.attributes both now correctly show DEX 16, and the shared
// derived-generation stamp (see derived-generation.js) advances. Crucially,
// NEITHER of those write paths touches the actor's persisted revision or
// item set -- same reasoning as the panel-cache fix.
actor.system.attributes.dex.enhancement = 2;
actor.system.derived.attributes.dex = { total: 16, mod: 3 };
stampDerivedGeneration(actor, actor.system, null);
assert.equal(actor._stats.modifiedTime, 500, 'test setup must keep the persisted revision identical across the correction');

// ── Step 3: re-evaluate the SAME candidate against the SAME actor object. ──
const after = AbilityEngine.evaluateAcquisition(actor, CANDIDATE_FEAT, {});
assert.equal(
  after.legal,
  true,
  'FAIL-BEFORE PROOF: after DEX genuinely rises to 16 (both system.attributes and system.derived.attributes ' +
  'agree, and the derived-generation stamp advanced), re-evaluating the SAME feat against the SAME actor/item ' +
  'revision must report legal:true. Under the pre-fix cache signature (persisted revision + items only, no ' +
  'awareness of system.derived), this assertion fails: the stale legal:false verdict cached in Step 1 is served ' +
  'forever, because nothing in the cache key changed.'
);

console.log('  [1/2] stale acquisition verdict does not survive a real derived-generation-stamped correction OK');

// ── Cache-retention proof: unchanged state after the correction still HITs ──
// (the fix must not degrade to "recompute every evaluateAcquisition call").
AbilityEngine.clearAcquisitionCache();
const retentionActor = makeActor({ dexEnhancement: 2, derivedDexTotal: 16, derivedDexMod: 3 });
stampDerivedGeneration(retentionActor, retentionActor.system, null);

let prereqCalls = 0;
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const realCheckFeatPrerequisites = PrerequisiteChecker.checkFeatPrerequisites.bind(PrerequisiteChecker);
PrerequisiteChecker.checkFeatPrerequisites = (...args) => {
  prereqCalls++;
  return realCheckFeatPrerequisites(...args);
};
try {
  AbilityEngine.evaluateAcquisition(retentionActor, CANDIDATE_FEAT, {});
  assert.equal(prereqCalls, 1, 'first evaluation for this actor/feat/generation must actually run PrerequisiteChecker');

  AbilityEngine.evaluateAcquisition(retentionActor, CANDIDATE_FEAT, {});
  assert.equal(prereqCalls, 1, 'a second evaluation with unchanged actor/item revision AND unchanged derived generation must reuse the cached verdict');
} finally {
  PrerequisiteChecker.checkFeatPrerequisites = realCheckFeatPrerequisites;
}

console.log('  [2/2] cache-hit retention preserved when nothing relevant changed OK');
console.log('ability-engine-acquisition-cache-derived-coherency.test.mjs: all assertions passed');
