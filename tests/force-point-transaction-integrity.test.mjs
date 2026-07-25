import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static architectural guards for the Phase 1 Force Point transaction fix.
// These read source text rather than executing the modules, matching this
// repo's convention (engine modules use absolute /systems/foundryvtt-swse
// import specifiers that only resolve inside Foundry's module loader, so
// they cannot be imported directly under plain node — see
// docs/audits/rolling-system-alignment-phase-1.md).

const rollCore = await readFile(new URL('../scripts/engine/roll/roll-core.js', import.meta.url), 'utf8');
const coordinator = await readFile(new URL('../scripts/engine/force/force-point-spend-coordinator.js', import.meta.url), 'utf8');
const forcePointsService = await readFile(new URL('../scripts/engine/force/force-points-service.js', import.meta.url), 'utf8');
const swseInitiative = await readFile(new URL('../scripts/engine/combat/SWSEInitiative.js', import.meta.url), 'utf8');
const forceExecutor = await readFile(new URL('../scripts/engine/force/force-executor.js', import.meta.url), 'utf8');
const forceRegimenExecutor = await readFile(new URL('../scripts/engine/force/force-regimen-executor.js', import.meta.url), 'utf8');

// 1. RollCore.applyForcePointLogic() must delegate to the coordinator instead
//    of validating+rolling without ever spending (the confirmed Phase 1 bug).
assert.match(rollCore, /applyForcePointLogic\(actor, pointsToSpend = 1, options = \{\}\) \{[\s\S]{0,400}ForcePointSpendCoordinator\.rollAndSpend\(/);
assert.doesNotMatch(rollCore, /ForcePointsService\.canSpend/, 'RollCore must not re-implement Force Point validation inline.');

// 2. RollCore must refund a Force Point already spent if the main check roll
//    (not just the Force die) subsequently fails to execute.
assert.match(rollCore, /forcePointDetails\?\.success && forcePointDetails\.spent > 0/);
assert.match(rollCore, /_refundForcePoints\(actor, forcePointDetails\.spent, 'main-roll-execution-failed'\)/);

// 3. The coordinator must validate before spending, spend through
//    ActorEngine (the sole mutation authority), roll after paying, and roll
//    back via ActorEngine.gainForcePoints if the die roll fails.
assert.match(coordinator, /ForcePointsService\.validateSpend\(/);
assert.match(coordinator, /ActorEngine\.spendForcePoints\(actor, requested\)/);
assert.match(coordinator, /ActorEngine\.gainForcePoints\(actor, amount\)/);
assert.match(coordinator, /rolling back spend/);

// 4. The receipt must never claim `spent` beyond what was actually deducted;
//    a failure receipt reports spent: 0, not the requested amount.
assert.match(coordinator, /spent:\s*0,\s*\n\s*before,\s*\n\s*after,/);

// 5. ForcePointsService remains the pure rules/calculation authority — no
//    mutation methods live there.
assert.doesNotMatch(forcePointsService, /actor\.update\(/);
assert.doesNotMatch(forcePointsService, /updateActor\(/);

// 6. Compensating ad hoc Force Point spends that pre-dated RollCore actually
//    paying for its own bonus must be removed, or they will now double-spend
//    every time RollCore.execute() is called with useForce: true.
assert.doesNotMatch(swseInitiative, /'system\.forcePoints\.value':\s*Math\.max\(0,\s*fp\s*-\s*1\)/);
assert.doesNotMatch(forceExecutor, /if \(useForce && forcePointBonus > 0\) \{\s*\n\s*await ActorEngine\.spendForcePoints\(actor, 1\);/);
assert.doesNotMatch(forceRegimenExecutor, /SchemaAdapters\.setForcePointsUpdate\(Math\.max\(0, currentFP - 1\)\)/);

console.log('Force Point transaction integrity guards passed.');
