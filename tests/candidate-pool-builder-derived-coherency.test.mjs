import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Runtime Cache Coherency Audit — Target 3 (HIGH RISK, confirmed).
//
// CandidatePoolBuilder._candidatePoolCache (scripts/engine/suggestion/
// CandidatePoolBuilder.js) has its OWN, INDEPENDENT persistent cache in
// front of AbilityEngine, keyed by _buildCacheKey() = actor signature +
// slot-context signature + candidate-list signature. Its actor signature
// (_actorCacheSignature) has the exact same shape as AbilityEngine's
// pre-fix signature: persisted revision + item signature, no awareness of
// system.derived.
//
// This means fixing AbilityEngine's own cache (Target 2) is NOT sufficient
// on its own: CandidatePoolBuilder.build() checks ITS OWN cache first and,
// on a hit, never calls AbilityEngine.canAcquire() again at all -- so even
// though AbilityEngine would now correctly answer "legal" for a candidate
// once system.derived reflects a real ability correction, the STALE
// filtered candidate LIST cached before that correction survives forever,
// for as long as the actor/item revision and candidate list stay the same.
// This is the "parallel cache authority" risk: two layered caches, each
// individually plausible, that can disagree once only one of them observes
// the input that actually changed.
//
// Computation reads -> semantic inputs -> cache identity -> invalidation:
//   reads:            AbilityEngine.canAcquire() per candidate (which itself
//                      reads system.derived via SchemaAdapters.getAbilityScore()).
//   semantic inputs:   actor/item revision, candidate list identity, AND the
//                      runtime derived-generation the underlying AbilityEngine
//                      answer depends on.
//   cache identity (pre-fix): actor/item revision + slot context + candidate
//                      list ONLY.
//   invalidation:      no clearCandidatePoolCache() equivalent to
//                      AbilityEngine.clearAcquisitionCache(); no observation
//                      of derived state at all.
//
// This test exercises the REAL, imported CandidatePoolBuilder.build() and
// AbilityEngine.canAcquire()/evaluateAcquisition() end to end -- the same
// production call chain _filterHeroicFeats() uses -- not a reimplementation.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils.duplicate = (v) => JSON.parse(JSON.stringify(v ?? {}));
globalThis.game.settings = globalThis.game.settings ?? {};
globalThis.game.settings.get = () => undefined;

const { CandidatePoolBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/CandidatePoolBuilder.js'
);
const { AbilityEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js'
);
const { stampDerivedGeneration } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js'
);

function makeActor({ dexEnhancement = 0, derivedDexTotal = 14, derivedDexMod = 2 } = {}) {
  return {
    id: 'candidate-pool-cache-actor',
    type: 'character',
    name: 'Candidate Pool Cache Coherency Test Actor',
    _stats: { modifiedTime: 900 }, // persisted revision R — never changes in this test
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
      derived: {
        attributes: {
          dex: { total: derivedDexTotal, mod: derivedDexMod }
        }
      }
    }
  };
}

const CANDIDATE_FEAT = {
  id: 'test-feat-dex-15-unique-cpb-7c31',
  _id: 'test-feat-dex-15-unique-cpb-7c31',
  type: 'feat',
  name: 'Test Feat Requiring DEX 15 (candidate-pool cache-coherency fixture, not a real feat)',
  system: {
    prerequisite: '',
    prerequisites: '',
    prerequisitesStructured: [{ type: 'attribute', ability: 'dex', minimum: 15 }]
  }
};

const SLOT_CONTEXT = { slotKind: 'feat', slotType: 'heroic' };

AbilityEngine.clearAcquisitionCache();
CandidatePoolBuilder._candidatePoolCache.clear();
CandidatePoolBuilder._candidatePoolCacheOrder.length = 0;

// ── Step 1: actor genuinely does not qualify (DEX 14 < 15). ──
const actor = makeActor({ dexEnhancement: 0, derivedDexTotal: 14, derivedDexMod: 2 });
const before = await CandidatePoolBuilder.build(actor, SLOT_CONTEXT, [CANDIDATE_FEAT]);
assert.equal(before.filteredCandidates.length, 0, 'DEX 14 must exclude a feat requiring DEX 15 from the pool');

// ── Step 2: a real ability-score correction lands (system.attributes AND ──
// system.derived.attributes now agree on DEX 16), and the shared
// derived-generation stamp advances -- same real-world trigger as Target 2
// (an ActiveEffect enhancement bonus plus the async derived recompute
// landing). Persisted revision/items are unchanged.
actor.system.attributes.dex.enhancement = 2;
actor.system.derived.attributes.dex = { total: 16, mod: 3 };
stampDerivedGeneration(actor, actor.system, null);
assert.equal(actor._stats.modifiedTime, 900, 'test setup must keep the persisted revision identical across the correction');

// Sanity: AbilityEngine itself (Target 2, already fixed) correctly reports
// this candidate as legal now that DEX is genuinely 16.
assert.equal(
  AbilityEngine.canAcquire(actor, CANDIDATE_FEAT),
  true,
  'sanity check: AbilityEngine.canAcquire() must already report legal:true for this corrected actor state'
);

// ── Step 3: re-run CandidatePoolBuilder.build() with the SAME actor/item ──
// revision and the SAME candidate list.
const after = await CandidatePoolBuilder.build(actor, SLOT_CONTEXT, [CANDIDATE_FEAT]);
assert.equal(
  after.filteredCandidates.length,
  1,
  'FAIL-BEFORE PROOF: after DEX genuinely rises to 16 and AbilityEngine itself already reports this candidate as ' +
  'legal, CandidatePoolBuilder.build() must include it in the pool. Under the pre-fix cache signature (actor/item ' +
  'revision + slot + candidate list only, no awareness of system.derived), this assertion fails: the stale, empty ' +
  'candidate list cached in Step 1 is served again, because CandidatePoolBuilder\'s OWN cache never re-consulted ' +
  'AbilityEngine at all -- a parallel cache authority independently blind to the same derived correction.'
);

console.log('  [1/2] stale filtered candidate pool does not survive a real derived-generation-stamped correction OK');

// ── Cache-retention proof: unchanged state after the correction still HITs ──
CandidatePoolBuilder._candidatePoolCache.clear();
CandidatePoolBuilder._candidatePoolCacheOrder.length = 0;
AbilityEngine.clearAcquisitionCache();

const retentionActor = makeActor({ dexEnhancement: 2, derivedDexTotal: 16, derivedDexMod: 3 });
stampDerivedGeneration(retentionActor, retentionActor.system, null);

let acquireCalls = 0;
const realCanAcquire = AbilityEngine.canAcquire.bind(AbilityEngine);
AbilityEngine.canAcquire = (...args) => {
  acquireCalls++;
  return realCanAcquire(...args);
};
try {
  const first = await CandidatePoolBuilder.build(retentionActor, SLOT_CONTEXT, [CANDIDATE_FEAT]);
  assert.equal(first.filteredCandidates.length, 1, 'first build for this actor/generation must correctly include the now-legal candidate');
  assert.equal(acquireCalls, 1, 'first build must actually consult AbilityEngine (nothing cached yet)');

  const second = await CandidatePoolBuilder.build(retentionActor, SLOT_CONTEXT, [CANDIDATE_FEAT]);
  assert.equal(second.filteredCandidates.length, 1, 'second build must return the same result');
  assert.equal(acquireCalls, 1, 'a second build with unchanged actor/item revision AND unchanged derived generation must reuse the cached pool, not re-consult AbilityEngine');
} finally {
  AbilityEngine.canAcquire = realCanAcquire;
}

console.log('  [2/2] cache-hit retention preserved when nothing relevant changed OK');
console.log('candidate-pool-builder-derived-coherency.test.mjs: all assertions passed');
