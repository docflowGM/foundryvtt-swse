import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// R4-5 — FollowerCreator.removeFollower() awaited deleteActor()'s result
// without checking it. deleteActor() (scripts/core/document-api-v13.js)
// returns null on failure (invalid input, or Actor.deleteDocuments()
// throwing internally) rather than throwing itself, so a failed deletion
// previously committed as if it had succeeded — the transaction reported
// success and the owner was unlinked from a follower Actor that still
// exists in the world.
//
// scripts/apps/follower-creator.js cannot load through the Foundry-shim
// harness (transitively imports SWSEDialogV2, which needs the full
// `foundry.applications.api` surface — confirmed by direct import attempt,
// the same wall documented for this file since Phase 4), so this is a (c)
// STRUCTURAL / SOURCE-INSPECTION ONLY suite — it proves the shipped source
// checks deleteActor()'s result and throws inside the SAME transaction
// step array as the owner-unlink step (so the coordinator's existing
// rollback machinery — already production-path tested in
// tests/follower-slot-occupancy-alignment.test.mjs and elsewhere for other
// steps — restores the owner's prior followers/followerSlots/ownedActors),
// not that the hook fires correctly at runtime.

const source = await readFile(new URL('../scripts/apps/follower-creator.js', import.meta.url), 'utf8');

// 1. The delete-follower-commit step must check deleteActor()'s return
// value, not merely await it.
const deleteStepStart = source.indexOf("name: 'delete-follower-commit'");
assert.ok(deleteStepStart !== -1, 'delete-follower-commit step not found');
const deleteStepEnd = source.indexOf("'follower-metadata-clear-commit'", deleteStepStart);
const deleteStepBody = source.slice(deleteStepStart, deleteStepEnd);

assert.match(deleteStepBody, /const deleted = await deleteActor\(follower\);/, 'the delete step must capture deleteActor()\'s return value');
assert.match(deleteStepBody, /if \s*\(\s*!deleted/, 'the delete step must check for a falsy (failed) deletion result');
assert.match(deleteStepBody, /throw new Error\(/, 'a failed deletion must throw, not silently succeed');

// 2. The delete step is still one entry in the SAME runFollowerMutationTransaction
// array as owner-unlink-commit (which has a rollback restoring the owner's
// prior followers/followerSlots/ownedActors) — a throw inside the delete
// step therefore triggers that existing, already-tested rollback rather
// than needing a new, separate compensating mechanism.
const removeFollowerStart = source.indexOf('static async removeFollower(');
const removeFollowerEnd = source.indexOf('\n    }\n', deleteStepStart);
const removeFollowerBody = source.slice(removeFollowerStart, removeFollowerEnd);
assert.match(removeFollowerBody, /name:\s*'owner-unlink-commit'/, 'owner-unlink-commit must be in the same function');
assert.match(removeFollowerBody, /rollback:\s*async\s*\(priorState\)\s*=>\s*\{/, 'owner-unlink-commit must retain its rollback');
const ownerUnlinkIdx = removeFollowerBody.indexOf("name: 'owner-unlink-commit'");
const deleteStepIdx = removeFollowerBody.indexOf("name: 'delete-follower-commit'");
assert.ok(ownerUnlinkIdx !== -1 && deleteStepIdx !== -1 && ownerUnlinkIdx < deleteStepIdx, 'owner-unlink-commit must run before delete-follower-commit so a delete failure rolls it back');

// 3. removeFollower() still checks the overall transaction result and
// rethrows on failure (pre-existing behavior, unaffected by this fix,
// verified here so the throw added in delete-follower-commit is not
// silently swallowed one level up).
const removalCheckIdx = removeFollowerBody.indexOf('if (!removalResult.ok)');
assert.ok(removalCheckIdx !== -1, 'removeFollower() must still check the overall transaction result');
assert.match(removeFollowerBody.slice(removalCheckIdx), /throw removalResult\.error;/);

console.log('Follower deletion failure propagation structural guards passed.');
