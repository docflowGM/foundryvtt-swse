import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Combined stacked-PR integration test (Phase 4 rolling-system alignment,
// item 10: "Add at least one combined integration test covering: vehicle
// attack context selection, authoritative formula resolution, modifier
// resolution, Force Point transaction where allowed, AttackOutcomeResolver,
// chat state, reroll supersession, and damage action routing."). This does
// not re-derive each individual invariant (already covered by the
// phase1-4 test files) — it checks that the PIECES from PRs #928-#931
// actually compose into one coherent pipeline rather than each phase's
// work existing in isolation. Same static-guard convention as the rest of
// this project: production files use absolute /systems/foundryvtt-swse/...
// imports that only resolve inside Foundry's module loader.

const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const vehicleMath = await readFile(new URL('../scripts/engine/combat/vehicle-attack-math.js', import.meta.url), 'utf8');
const domainRouter = await readFile(new URL('../scripts/engine/combat/attack-domain-router.js', import.meta.url), 'utf8');
const combatRollMath = await readFile(new URL('../scripts/engine/combat/combat-roll-math.js', import.meta.url), 'utf8');
const modifierEngine = await readFile(new URL('../scripts/engine/effects/modifiers/ModifierEngine.js', import.meta.url), 'utf8');
const forceCoordinator = await readFile(new URL('../scripts/engine/force/force-point-spend-coordinator.js', import.meta.url), 'utf8');
const outcomeResolver = await readFile(new URL('../scripts/engine/combat/attack-outcome-resolver.js', import.meta.url), 'utf8');
const resolverFeat = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../scripts/ui/chat/chat-interaction-bridge.js', import.meta.url), 'utf8');

const rollAttackBody = attacks.slice(attacks.indexOf('export async function rollAttack('), attacks.indexOf('export async function rollDamage('));

// 1. Vehicle attack context selection (Phase 4) feeds directly into
// formula resolution (Phase 3/4) — the router's normalizedContext fields
// are exactly what the two vehicle resolvers require as parameters.
assert.match(domainRouter, /normalizedContext: \{ gunnerActor: operator \?\? actor, vehicleActor: contextVehicleActor, weapon: item \}/);
assert.match(rollAttackBody, /resolveVehicleAttackBonus\(gunnerActor, vehicleActor, weapon, rollOptions\)/);
assert.match(domainRouter, /normalizedContext: \{ vehicleActor: actor, weapon: item, crewQuality: abstractCrewQuality \}/);
assert.match(rollAttackBody, /resolveAbstractCrewAttackBonus\(vehicleActor, weapon, crewQuality, rollOptions\)/);

// 2. Authoritative formula resolution: both vehicle resolvers ultimately
// feed the SAME atkBonus/rollFormula construction as the character path
// (Phase 1's canonical seam), not a parallel roll-formula builder.
assert.match(rollAttackBody, /const atkBonus = attackBonusResolution\.total \+ fightingDefensivelyPenalty/);
assert.match(rollAttackBody, /const rollFormula = `1d20 \+ \$\{atkBonus\}`;/);

// 3. Modifier resolution: vehicle-domain modifiers resolve through the
// same ModifierEngine.resolveTarget() single-pass authority Phase 1
// established (docs/audits/rolling-system-alignment-phase-1.md) — not a
// bespoke vehicle modifier aggregator.
assert.match(vehicleMath, /ModifierEngine\.resolveTarget\(/);
assert.match(modifierEngine, /static async resolveTarget\(actor, target, options = \{\}\)/);

// 4. Force Point transaction where allowed: character attacks still route
// Force Point spends through the Phase 1 ForcePointSpendCoordinator-backed
// reroll path (meta-resource-feat-resolver.js), and vehicle/abstract-crew
// attacks correctly have NO Force Point path fabricated for them (abstract
// crew has no actor to own points; a real gunner actor already goes
// through the same reroll handler as a character).
assert.match(resolverFeat, /ActorEngine\.spendForcePoints\(actor, 1\)/);
assert.doesNotMatch(vehicleMath, /ForcePoint|forcePoint/);

// 5. AttackOutcomeResolver: exactly one call site in rollAttack(), fed the
// SAME roll.total/naturalD20 regardless of which domain resolved atkBonus —
// confirmed not re-derived or branched per domain.
assert.equal((rollAttackBody.match(/AttackOutcomeResolver\.resolve\(/g) || []).length, 1);
assert.match(outcomeResolver, /export function resolveAttackOutcome/);

// 6. Chat state: the Phase 3 authoritative/superseded/revision schema and
// the Phase 4 sequenceId/attackInstanceId schema are written together, in
// the same flags.swse block, for every attack regardless of domain.
assert.match(rollAttackBody, /authoritative: true,\s*\n\s*superseded: false,\s*\n\s*supersededBy: null,\s*\n\s*revision: 0,\s*\n[\s\S]{0,400}sequenceId: rollOptions\.sequenceId \?\? null,/);

// 7. Reroll supersession: the Phase 3 reroll handler is untouched by
// Phase 4's vehicle/routing work (it still reuses the captured formula
// string rather than re-resolving any domain), so vehicle/abstract-crew
// attack rerolls inherit the same supersession guarantees as character
// attacks without new reroll code paths.
assert.doesNotMatch(resolverFeat, /resolveVehicleAttackBonus|resolveAbstractCrewAttackBonus|resolveAttackDomain/);
assert.match(resolverFeat, /'flags\.swse\.superseded': true/);

// 8. Damage action routing: the Phase 3 superseded-message guard and the
// Phase 4 duplicate-application receipt guard both gate the SAME
// handleApplyDamageButton, in the correct order (superseded check first).
const applyFn = bridge.slice(bridge.indexOf('async function handleApplyDamageButton'), bridge.indexOf('async function handleGrappleActionButton'));
assert.match(applyFn, /if \(isAttackMessageSuperseded\(message\)\) \{/);
assert.match(applyFn, /const existingReceipt = findDamageApplicationReceipt\(message, receiptKey\);/);
assert.ok(applyFn.indexOf('isAttackMessageSuperseded') < applyFn.indexOf('existingReceipt'));

// Merge-order / architecture sanity: Phase 4's new files import from
// Phase 1-3 authorities, never the reverse (no Phase 1-3 file imports
// attack-domain-router.js or vehicle-attack-math.js's abstract-crew
// export), keeping the stacked-PR dependency direction one-way.
assert.doesNotMatch(combatRollMath, /attack-domain-router|resolveAbstractCrewAttackBonus/);
assert.doesNotMatch(outcomeResolver, /attack-domain-router|vehicle-attack-math/);
assert.doesNotMatch(forceCoordinator, /attack-domain-router|vehicle-attack-math/);

console.log('Phase 4 combined stacked-PR integration guard passed.');
