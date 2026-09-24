import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Runtime Cache Coherency Audit — Target 1 (confirmed, small fix).
//
// TalentStep._treeTalentCache (scripts/apps/progression-framework/steps/
// talent-step.js) caches the resolved talent list for a tree under a key
// built ONLY from tree identity:
//
//     const key = tree?.id || tree?.sourceId || tree?.name;
//
// But _getTalentsForTree() (the function _getTalentsForTreeCached wraps)
// post-processes that membership list through a live house-rule setting:
//
//     talents = HouseRuleTalentCombination.processBlockDeflectCombination(talents);
//
// processBlockDeflectCombination() reads HouseRuleService.getString(
// 'blockDeflectTalents', 'separate') — a live world setting a GM can change
// at any time, including while a player has this exact TalentStep open.
// The cache key does not represent that setting at all, so:
//
//     tree opened, setting = separate
//         -> cached: [Block, Deflect, ...]
//     GM changes setting to combined (same tree, same session)
//     tree re-queried (same tree id)
//         -> CACHE HIT -> still [Block, Deflect, ...], never [Block/Deflect, ...]
//
// This is the exact same category of bug fixed in
// docs/audits/v2-derived-panel-cache-coherency.md: a cache identity that
// omits a semantic input the wrapped computation actually reads.
//
// Computation reads -> semantic inputs -> cache identity -> invalidation:
//   reads:            getTalentMembership(tree), HouseRuleTalentCombination
//                      .processBlockDeflectCombination(talents)
//   semantic inputs:   tree identity, blockDeflectTalents house-rule mode
//   cache identity:    tree identity ONLY (bug)
//   invalidation:      _treeTalentCache reset on step construction and
//                      onStepEnter() only — never on a settings change, and
//                      never represents the mode in the key itself.
//
// This test exercises the REAL _getTalentsForTreeCached() method (extracted
// from committed source and executed via `new Function`, the same technique
// already established in this repo for sheet/step classes that cannot be
// imported directly under this Node/Foundry-shim harness — talent-step.js
// transitively imports FeatChoiceDialog, an ApplicationV2 subclass, which
// requires foundry.applications.api at module-evaluation time) and the REAL,
// unmodified HouseRuleTalentCombination.processBlockDeflectCombination().
// Only the registry-membership lookup (getTalentMembership/TalentRegistry --
// data plumbing unrelated to the cache-key bug) is stubbed, returning a
// fixed Block/Deflect membership list; the actual house-rule combination
// step is the real, imported function.

registerFoundryPathLoader();
installFoundryShimGlobals();

let currentBlockDeflectMode = 'separate';
globalThis.game.settings = {
  get: (_ns, key) => (key === 'blockDeflectTalents' ? currentBlockDeflectMode : undefined),
  // HouseRuleService._isSettingsReady() requires both get AND set to exist
  // before it will read through to this stub at all; without a `set`, every
  // read silently falls back to the default ('separate'), which would have
  // masked this whole test regardless of the production cache-key bug.
  set: () => {},
  settings: { has: () => true }
};

const { HouseRuleTalentCombination } = await import(
  '/systems/foundryvtt-swse/scripts/houserules/houserule-talent-combination.js'
);

const talentStepSrc = await readFile(
  new URL('../scripts/apps/progression-framework/steps/talent-step.js', import.meta.url),
  'utf8'
);

function extractMethodBody(src, signature) {
  const re = new RegExp(
    signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([\\s\\S]*?)\\n  \\}'
  );
  const match = src.match(re);
  assert.ok(match, `talent-step.js must still define ${signature}`);
  return match[1];
}

const cachedBody = extractMethodBody(talentStepSrc, 'async _getTalentsForTreeCached(tree, actor)');
// eslint-disable-next-line no-new-func -- executing the real, just-extracted
// method body against constructed inputs, not a reimplementation.
// HouseRuleTalentCombination is a module-scope import in the real
// talent-step.js (closure the extracted body relies on); new Function()
// has no access to that closure, so the real, imported class is passed in
// explicitly as a parameter instead.
const _getTalentsForTreeCachedFn = new Function(
  'tree', 'actor', 'HouseRuleTalentCombination',
  `return (async () => { ${cachedBody} })();`
);

const BLOCK_TALENT = { _id: '9379daa94a228c04', name: 'Block', system: {} };
const DEFLECT_TALENT = { _id: '72c644f7a09b1186', name: 'Deflect', system: {} };
const FIXED_MEMBERSHIP = [BLOCK_TALENT, DEFLECT_TALENT];

function makeStepLike() {
  return {
    _treeTalentCache: new Map(),
    // Stands in for the real _getTalentsForTree(): the registry-membership
    // lookup itself is data plumbing unrelated to this bug, but the
    // house-rule post-processing step is the REAL, imported production
    // function under test.
    _getTalentsForTree: async (_tree, _actor) => {
      return HouseRuleTalentCombination.processBlockDeflectCombination(FIXED_MEMBERSHIP);
    }
  };
}

function talentNames(talents) {
  return talents.map(t => t?.name).sort();
}

const tree = { id: 'force-talent-tree', name: 'Force Talent Tree' };

// ── separate mode: tree queried and cached ──
currentBlockDeflectMode = 'separate';
const stepLike = makeStepLike();
const firstResult = await _getTalentsForTreeCachedFn.call(stepLike, tree, null, HouseRuleTalentCombination);
assert.deepEqual(talentNames(firstResult), ['Block', 'Deflect'], 'in separate mode, the tree must list Block and Deflect independently');

// ── GM flips the house rule while this exact tree stays cached ──
currentBlockDeflectMode = 'combined';

// Re-querying the SAME tree (same id) must reflect the new house-rule mode.
const secondResult = await _getTalentsForTreeCachedFn.call(stepLike, tree, null, HouseRuleTalentCombination);
assert.deepEqual(
  talentNames(secondResult),
  ['Block/Deflect'],
  'FAIL-BEFORE PROOF: re-querying the same tree after the blockDeflectTalents house rule changes to "combined" ' +
  'must show the combined Block/Deflect entry. Under the pre-fix cache key (tree identity only), this assertion ' +
  'fails: the cache key never changed, so the stale [Block, Deflect] list cached under "separate" mode is served ' +
  'again, and the combined-mode processing this same real HouseRuleTalentCombination.processBlockDeflectCombination() ' +
  'call would have produced is never seen.'
);

// ── Cache-retention proof: unchanged mode still reuses the cached entry ──
// (the fix must not degrade to "recompute every time").
let underlyingCalls = 0;
const countingStepLike = makeStepLike();
const realGetTalentsForTree = countingStepLike._getTalentsForTree;
countingStepLike._getTalentsForTree = async (...args) => {
  underlyingCalls++;
  return realGetTalentsForTree(...args);
};

currentBlockDeflectMode = 'separate';
await _getTalentsForTreeCachedFn.call(countingStepLike, tree, null, HouseRuleTalentCombination);
assert.equal(underlyingCalls, 1, 'first query for this tree/mode must build (nothing cached yet)');

await _getTalentsForTreeCachedFn.call(countingStepLike, tree, null, HouseRuleTalentCombination);
assert.equal(underlyingCalls, 1, 'a second query with the SAME tree and SAME house-rule mode must reuse the cache, not rebuild');

currentBlockDeflectMode = 'combined';
await _getTalentsForTreeCachedFn.call(countingStepLike, tree, null, HouseRuleTalentCombination);
assert.equal(underlyingCalls, 2, 'a mode change must invalidate the cache and rebuild exactly once');

console.log('talent-step-block-deflect-cache-coherency.test.mjs: all assertions passed');
