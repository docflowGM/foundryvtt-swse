import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// External review round 2 — the ready hook in index.js used to fire
// repairWorldForcePowerAbilityMeta and migrateDarkSidePoints as two
// unawaited `.catch()`-chained calls, running them concurrently against
// the same world actor collection. index.js is too heavy to load under
// the Node test shim (matches this repo's existing convention for such
// files — see the "static source-guard" note in dsp-engine-consolidation
// .test.mjs), so this is a static guard on the source text confirming the
// two passes are now sequenced with independent try/catch, not a
// behavioral test of the hook itself.

const src = await readFile(new URL('../index.js', import.meta.url), 'utf8');

const readyHookMatch = src.match(/if \(game\.user\.isGM\) \{[\s\S]*?\n {2}\}\n\}\);/);
assert.ok(readyHookMatch, 'GM-gated ready hook block found');
const block = readyHookMatch[0];

// Neither pass is a bare `.catch()`-chained non-awaited call anymore.
assert.doesNotMatch(block, /repairWorldForcePowerAbilityMeta\(\{[^)]*\}\)\.catch\(/, 'force power repair must no longer be a fire-and-forget .catch() chain');
assert.doesNotMatch(block, /migrateDarkSidePoints\(\{[^)]*\}\)\.catch\(/, 'DSP migration must no longer be a fire-and-forget .catch() chain');

// Both passes are awaited.
assert.match(block, /await repairWorldForcePowerAbilityMeta\(/, 'force power repair must be awaited');
assert.match(block, /await migrateDarkSidePoints\(/, 'DSP migration must be awaited');

// repairWorldForcePowerAbilityMeta textually precedes migrateDarkSidePoints
// — i.e. the two passes are sequenced, not concurrent.
const repairIndex = block.indexOf('await repairWorldForcePowerAbilityMeta(');
const migrationIndex = block.indexOf('await migrateDarkSidePoints(');
assert.ok(repairIndex >= 0 && migrationIndex >= 0, 'both calls found in the ready-hook block');
assert.ok(repairIndex < migrationIndex, 'repairWorldForcePowerAbilityMeta must run before migrateDarkSidePoints, not concurrently');

// Each pass has its own independent try/catch — a failure in one must not
// prevent the other from running.
const betweenCalls = block.slice(repairIndex, migrationIndex);
assert.match(betweenCalls, /catch \(err\) \{/, 'the force power repair pass must have its own catch block before the migration call starts');

console.log('DSP ready-hook sequencing tests passed.');
