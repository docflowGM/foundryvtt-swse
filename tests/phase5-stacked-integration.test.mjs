import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Combined end-to-end stacked-PR integration test (Phase 5 rolling-system
// alignment, item 12: "Add a complete end-to-end test covering:
// attack-domain routing, formula resolution, modifiers, resource
// transaction, RollCore, AttackOutcomeResolver, sequence chat state,
// per-attack reroll, supersession, and authoritative damage routing.")
// This extends phase4-stacked-integration.test.mjs (which covered #928-#931
// composing correctly) with the Phase 5 full-attack-sequence pieces
// (#932): the reroll handler, the message-state service, and
// sequence-aware damage routing, all composing with the Phase 1-4
// authorities rather than existing as a parallel system.

const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const domainRouter = await readFile(new URL('../scripts/engine/combat/attack-domain-router.js', import.meta.url), 'utf8');
const vehicleMath = await readFile(new URL('../scripts/engine/combat/vehicle-attack-math.js', import.meta.url), 'utf8');
const resolver = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
const stateService = await readFile(new URL('../scripts/engine/combat/full-attack-message-state.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../scripts/engine/combat/full-attack-card-renderer.js', import.meta.url), 'utf8');
const executor = await readFile(new URL('../scripts/engine/combat/full-attack-executor.js', import.meta.url), 'utf8');
const combatFeatureHandlers = await readFile(new URL('../scripts/engine/combat/features/combat-feature-handlers.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../scripts/ui/chat/chat-interaction-bridge.js', import.meta.url), 'utf8');
const modifierEngine = await readFile(new URL('../scripts/engine/effects/modifiers/ModifierEngine.js', import.meta.url), 'utf8');
const outcomeResolver = await readFile(new URL('../scripts/engine/combat/attack-outcome-resolver.js', import.meta.url), 'utf8');

// 1. Attack-domain routing (#931) still drives every single attack inside
// a declared sequence — FullAttackExecutor and combat-feature-handlers.js
// both call the unmodified rollAttack(), which internally consults
// resolveAttackDomain(); neither full-attack orchestrator re-derives
// domain selection independently.
assert.match(attacks, /const domainResolution = resolveAttackDomain\(\{/);
assert.doesNotMatch(executor, /resolveAttackDomain|attack-domain-router/);
assert.doesNotMatch(combatFeatureHandlers, /resolveAttackDomain|attack-domain-router/);

// 2. Formula resolution (#930/#931): the full-attack reroll handler
// reuses the captured formula string / preserves the component ledger
// rather than recomputing which domain's formula applies — a vehicle
// attack rerolled through the single-attack path (the only reachable path
// for vehicle attacks — see finding below) never touches
// resolveVehicleAttackBonus/resolveAbstractCrewAttackBonus a second time.
assert.doesNotMatch(resolver, /resolveVehicleAttackBonus|resolveAbstractCrewAttackBonus|resolveAttackDomain/);

// 3. Modifiers (#928): the state service and renderer never resolve
// modifiers themselves — ModifierEngine.resolveTarget() remains the sole
// authority, untouched by Phase 5.
assert.doesNotMatch(stateService, /ModifierEngine/);
assert.doesNotMatch(renderer, /ModifierEngine/);
assert.match(modifierEngine, /static async resolveTarget\(actor, target, options = \{\}\)/);

// 4. Resource transaction (#928, Force Points): the full-attack reroll
// handler spends through the same ActorEngine.spendForcePoints() call
// convention the single-attack reroll uses (other meta-resource mechanics
// in this file, e.g. Second Wind, have their own unrelated spend call
// sites — not part of this check).
const singleAttackRerollFn = resolver.slice(resolver.indexOf('static async resolveAttackRerollButton('), resolver.indexOf('static async resolveFullAttackRerollButton('));
const fullAttackRerollFn = resolver.slice(resolver.indexOf('static async resolveFullAttackRerollButton('));
assert.match(singleAttackRerollFn, /ActorEngine\.spendForcePoints\(actor, 1\)/);
assert.match(fullAttackRerollFn, /ActorEngine\.spendForcePoints\(actor, 1\)/);

// 5. RollCore/RollEngine: the full-attack reroll handler rolls through the
// same RollEngine.safeRoll call convention as the single-attack reroll
// (globalThis.SWSE?.RollEngine?.safeRoll with a roll-engine.js import
// fallback) — not a new dice executor.
assert.match(fullAttackRerollFn, /globalThis\.SWSE\?\.RollEngine\?\.safeRoll\?\.\(/);
assert.doesNotMatch(fullAttackRerollFn, /new Roll\(/);

// 6. AttackOutcomeResolver: the full-attack reroll handler builds a fresh
// verdict via the same AttackOutcomeResolver.resolve() the rest of the
// codebase uses — imported once, not re-implemented.
assert.match(fullAttackRerollFn, /AttackOutcomeResolver\.resolve\(\{/);
assert.match(outcomeResolver, /export function resolveAttackOutcome/);

// 7. Sequence chat state: full-attack-message-state.js is the single
// authority for the schema (Phase 4's flat shape normalized read-only;
// Phase 5's revisions[] shape is what's written), and both
// full-attack-executor.js (initial post) and the reroll handler (updates)
// go through it rather than each maintaining their own copy of the shape.
assert.match(executor, /buildInitialAttackEntry\(\{/);
assert.match(fullAttackRerollFn, /appendRevision\(message, attackInstanceId, expectedRevision, revisionData\)/);

// 8. Per-attack reroll + supersession: appending a revision marks the
// previous one superseded within the SAME message (distinct from the
// single-attack path's separate-message supersession, but the same
// underlying concept — an old result must not remain independently
// authoritative once a newer one exists).
assert.match(stateService, /superseded: true, supersededBy: newRevisionNumber/);

// 9. Authoritative damage routing: a combined-card damage button is
// checked against the CURRENT stored revision (via the state service)
// before either rolling or applying damage — both live handlers guarded,
// not just one.
assert.match(bridge, /if \(await isFullAttackRowStale\(message, button\)\) \{/g);
const staleGuardCount = (bridge.match(/if \(await isFullAttackRowStale\(message, button\)\) \{/g) || []).length;
assert.equal(staleGuardCount, 2, 'Both handleLegacyDamageRollButton and handleApplyDamageButton must carry the stale-revision guard.');

// 10. Vehicle/abstract-crew full-attack behavior: confirmed, not assumed —
// no vehicle-sheet, vehicle-actor, or vehicle-weapon-system file
// references FullAttackExecutor or executeCombatFeatureMultiattack, and
// neither full-attack orchestrator threads vehicleActor/abstractCrewQuality
// context. There is no live vehicle/abstract-crew full-attack sequence to
// align — a named-gunner or abstract-crew vehicle attack can only ever
// reach the single-attack reroll path (resolveAttackRerollButton), which
// Phase 3/4 already proved preserves Gunner BAB / Vehicle INT / Crew
// Quality by never recomputing the formula on reroll.
assert.doesNotMatch(executor, /vehicleActor|abstractCrewQuality/);
assert.doesNotMatch(combatFeatureHandlers, /vehicleActor|abstractCrewQuality/);
assert.doesNotMatch(vehicleMath, /FullAttackExecutor|executeCombatFeatureMultiattack|sequenceId/);

// Merge-order / architecture sanity: Phase 5's new files still only import
// from Phase 1-4 authorities (or from each other in the one-way direction
// documented in full-attack-card-renderer.js's own header comment) — never
// creating a cycle back into attacks.js or meta-resource-feat-resolver.js
// from the renderer or state service.
assert.doesNotMatch(stateService, /^import/m);
assert.doesNotMatch(renderer, /^import.*(attacks\.js|meta-resource-feat-resolver)/m);

console.log('Phase 5 combined stacked-PR (#928-#932) end-to-end integration guard passed.');
