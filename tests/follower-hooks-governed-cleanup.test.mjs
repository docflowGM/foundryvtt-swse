import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// P1-4 — follower-hooks.js talent-removal cleanup was: (1) writing
// `followers`/`minions` owner registries via direct ownerActor.setFlag()
// calls that bypass ActorEngine/MutationInterceptor authorization
// entirely, and (2) removing the follower slot BEFORE the rest of cleanup
// (granted-item deletion, owner registry detachment) had completed, so a
// mid-cleanup failure could leave the slot already gone while the
// follower's granted items and owner-side registries were still attached.
//
// scripts/infrastructure/hooks/follower-hooks.js cannot load through the
// Foundry-shim harness (transitively imports FollowerManager/MinionManager,
// which reach into `foundry.applications.api` — confirmed by direct import
// attempt, matching the same wall documented for follower-creator.js since
// Phase 4), so this is a (c) STRUCTURAL / SOURCE-INSPECTION ONLY suite —
// it proves the shipped source no longer contains the defective shape, not
// that the hook fires correctly at runtime.

const source = await readFile(new URL('../scripts/infrastructure/hooks/follower-hooks.js', import.meta.url), 'utf8');

// 1. No more direct ownerActor.setFlag() calls for the owner-side
// followers/minions/pendingFollowerDetachment registries — every write in
// this file must go through ActorEngine.
assert.doesNotMatch(source, /ownerActor\.setFlag\(/, 'follower-hooks.js must not call ownerActor.setFlag() directly');

// 2. The consolidated cleanup write covers ownedActors, followers, and
// minions in one governed ActorEngine.updateActor() call.
assert.match(source, /'system\.ownedActors':\s*owned,\s*\n\s*'flags\.foundryvtt-swse\.followers':\s*followers,\s*\n\s*'flags\.foundryvtt-swse\.minions':\s*minions/);

// 3. pendingFollowerDetachment is written via ActorEngine, not setFlag.
assert.match(source, /'flags\.foundryvtt-swse\.pendingFollowerDetachment':\s*payload/);

// 4. The auto-detach path in the deleteItem hook uses
// runFollowerMutationTransaction with named, ordered steps.
assert.match(source, /import \{ runFollowerMutationTransaction \} from "\/systems\/foundryvtt-swse\/scripts\/apps\/progression-framework\/adapters\/follower-mutation-transaction\.js";/);
assert.match(source, /runFollowerMutationTransaction\(\[/);

// 5. Cleanup ("remove-granted-items-and-detach") is ordered BEFORE slot
// removal ("remove-slot") in the steps array — the exact ordering defect
// this fix closes. Extract the steps array body and check step-name order.
const stepsStart = source.indexOf('runFollowerMutationTransaction([');
const stepsEnd = source.indexOf('], { source:', stepsStart);
const stepsBody = source.slice(stepsStart, stepsEnd);
const cleanupIdx = stepsBody.indexOf("name: 'remove-granted-items-and-detach'");
const slotRemovalIdx = stepsBody.indexOf("name: 'remove-slot'");
assert.ok(cleanupIdx !== -1 && slotRemovalIdx !== -1, 'both named steps must be present');
assert.ok(cleanupIdx < slotRemovalIdx, 'granted-item/owner-registry cleanup must run BEFORE the slot is removed, not after');

// 6. The slot-removal step has a rollback that restores the pre-removal
// slots array (so a later-step failure — none currently follows it, but a
// future addition would — cannot leave the slot silently gone).
assert.match(stepsBody, /name: 'remove-slot',\s*\n\s*commit: \(\) => _setSlots\(actor, remainingSlots\),\s*\n\s*rollback: \(\) => _setSlots\(actor, slots\)/);

// 7. Occupancy checks route through the centralized alias-aware helper
// (P1-1), not a raw `slot.createdActorId` truthiness check.
assert.match(source, /import \{ isFollowerSlotOccupied, resolveFollowerSlotActorId \} from "\/systems\/foundryvtt-swse\/scripts\/domain\/followers\/follower-slot-occupancy\.js";/);
assert.doesNotMatch(source, /if \(slot\.createdActorId\)/);
assert.doesNotMatch(source, /if \(!slot\.createdActorId\)/);

console.log('follower-hooks.js governed-cleanup structural guards passed.');
