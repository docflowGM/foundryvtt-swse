import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// P1-4 / R4-1 — follower-hooks.js talent-removal auto-detach transaction
// atomicity. scripts/infrastructure/hooks/follower-hooks.js cannot load
// through the Foundry-shim harness (transitively imports FollowerManager/
// MinionManager, which reach into `foundry.applications.api` — confirmed by
// direct import attempt, matching the same wall documented for
// follower-creator.js since Phase 4), so this remains a (c) STRUCTURAL /
// SOURCE-INSPECTION ONLY suite for the hook wiring itself. The DATA side of
// the fix (which items to delete, owner-registry before/after patches,
// slot-removal before/after patches) is extracted into
// scripts/domain/followers/follower-talent-detach-plan.js and covered by
// real production-path tests in tests/follower-talent-detach-plan.test.mjs.

const source = await readFile(new URL('../scripts/infrastructure/hooks/follower-hooks.js', import.meta.url), 'utf8');

// 1. No direct setFlag() calls anywhere in this file.
assert.doesNotMatch(source, /ownerActor\.setFlag\(/, 'follower-hooks.js must not call ownerActor.setFlag() directly');
assert.doesNotMatch(source, /actor\.setFlag\(/, 'follower-hooks.js must not call actor.setFlag() directly');

// 2. pendingFollowerDetachment is written via ActorEngine, not setFlag.
assert.match(source, /'flags\.foundryvtt-swse\.pendingFollowerDetachment':\s*payload/);

// 3. R4-1: the item-deletion and owner-registry-detach mutations are two
// SEPARATE named steps, each independently commit/rollback-capable — the
// exact defect this round closes (previously both mutations lived inside
// one opaque step, so a partial failure between them had nothing to
// compensate the already-deleted Items).
assert.match(source, /name:\s*'delete-granted-items'/, 'Item deletion must be its own named step');
assert.match(source, /name:\s*'detach-owner-registries'/, 'owner-registry detachment must be its own named step');
const deleteStepBody = source.slice(source.indexOf("name: 'delete-granted-items'"), source.indexOf("name: 'detach-owner-registries'"));
assert.match(deleteStepBody, /rollback:\s*async\s*\(\)\s*=>\s*\{/, 'the item-deletion step must define a rollback (recreate) function');
assert.match(deleteStepBody, /ActorEngine\.createEmbeddedDocuments\(follower,\s*'Item',\s*grantedItemData\)/, 'item-deletion rollback must recreate the deleted items');

const detachStepBody = source.slice(source.indexOf("name: 'detach-owner-registries'"), source.indexOf("return steps;"));
assert.match(detachStepBody, /rollback:\s*async\s*\(\)\s*=>\s*\{/, 'the owner-registry-detach step must define a rollback');
assert.match(detachStepBody, /rollbackPatch/, 'owner-registry-detach rollback must use the captured pre-mutation rollbackPatch, not a live-state recompute');

// 4. R4-1: a missing follower Actor still yields the owner-registry-detach
// step — the item-deletion step is only pushed `if (follower)`, but the
// detach step is built unconditionally afterward, outside that guard.
const buildStepsFn = source.slice(source.indexOf('function _buildFollowerDetachSteps'), source.indexOf('function _setPendingDetachment'));
const followerGuardIdx = buildStepsFn.indexOf('if (follower) {');
const followerGuardEnd = buildStepsFn.indexOf('\n  }\n', followerGuardIdx);
const detachPushIdx = buildStepsFn.indexOf("name: 'detach-owner-registries'");
assert.ok(followerGuardIdx !== -1 && followerGuardEnd !== -1 && detachPushIdx !== -1, 'expected structure not found');
assert.ok(detachPushIdx > followerGuardEnd, 'detach-owner-registries step must be built OUTSIDE the `if (follower)` guard so a missing follower Actor still cleans stale owner registries');

// 5. The auto-detach transaction runs delete/detach steps before
// remove-slot (ordering requirement carried over from the prior pass).
const stepsArrayStart = source.indexOf('runFollowerMutationTransaction([');
const stepsArrayEnd = source.indexOf('], { source:', stepsArrayStart);
const stepsArrayBody = source.slice(stepsArrayStart, stepsArrayEnd);
assert.match(stepsArrayBody, /\.\.\.detachSteps/, 'detach steps must be spread into the transaction before remove-slot');
const detachSpreadIdx = stepsArrayBody.indexOf('...detachSteps');
const removeSlotIdx = stepsArrayBody.indexOf("name: 'remove-slot'");
assert.ok(detachSpreadIdx < removeSlotIdx, 'detach steps must run before remove-slot');

// 6. remove-slot's rollback restores the captured pre-removal slots array
// (via buildSlotRemovalPatch's rollbackSlots), not a recompute.
assert.match(stepsArrayBody, /rollback:\s*\(\)\s*=>\s*_setSlots\(actor,\s*rollbackSlots\)/);

// 7. Occupancy checks route through the centralized alias-aware helper
// (P1-1), not a raw `slot.createdActorId` truthiness check.
assert.match(source, /import \{ isFollowerSlotOccupied, resolveFollowerSlotActorId \} from "\/systems\/foundryvtt-swse\/scripts\/domain\/followers\/follower-slot-occupancy\.js";/);
assert.doesNotMatch(source, /if \(slot\.createdActorId\)/);
assert.doesNotMatch(source, /if \(!slot\.createdActorId\)/);

// 8. The pure data-building helpers are imported from the extracted plan
// module (production-path tested separately), not reimplemented inline.
assert.match(source, /import \{ computeGrantedItemIdsForTalent, buildOwnerRegistryDetachPatch, buildSlotRemovalPatch \} from "\/systems\/foundryvtt-swse\/scripts\/domain\/followers\/follower-talent-detach-plan\.js";/);

console.log('follower-hooks.js governed-cleanup structural guards passed.');
