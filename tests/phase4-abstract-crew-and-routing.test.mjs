import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 4's abstract-crew formula alignment and
// attack-domain routing (docs/audits/rolling-system-alignment-phase-4.md).
// Same convention as Phase 1-3: the production files under test use
// absolute /systems/foundryvtt-swse/... imports that only resolve inside
// Foundry's module loader, so these are readFile + regex/assert.match
// source-text guards, not executed logic.

const math = await readFile(new URL('../scripts/engine/combat/vehicle-attack-math.js', import.meta.url), 'utf8');
const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-skill-router.js', import.meta.url), 'utf8');
const domainRouter = await readFile(new URL('../scripts/engine/combat/attack-domain-router.js', import.meta.url), 'utf8');
const diagnostics = await readFile(new URL('../scripts/engine/combat/attack-roll-diagnostics.js', import.meta.url), 'utf8');

const crewFn = math.slice(math.indexOf('export async function resolveAbstractCrewAttackBonus'));

// --- Abstract crew formula (required tests 1-8, 13-17 as applicable) ---

// 1/3. Abstract crew uses the shared rollAttack() pipeline (RollEngine dice
// execution via the existing shared roll formula construction) and
// ModifierEngine.resolveTarget() for registered vehicle.attack-domain
// modifiers — not a standalone parallel implementation.
assert.match(router, /rollAttack\(vehicle, weapon, \{\s*\n\s*abstractCrewQuality:/);
assert.match(crewFn, /ModifierEngine\.resolveTarget\(vehicleActor, VEHICLE_ATTACK_DOMAIN, \{ context \}\)/);

// 2. AttackOutcomeResolver is not bypassed for abstract crew: since
// rollAttack() is the shared entry point and its single
// AttackOutcomeResolver.resolve() call is unconditional (not branched on
// attack domain — see phase3-vehicle-attack-formula.test.mjs assertion 18),
// routing abstract crew through rollAttack() is sufficient by construction.
// Confirm the OLD standalone bypass (rollFallback used for the attack skill)
// is gone from the attack branch specifically.
const attackBranch = router.slice(router.indexOf("if (normalizedSkill === 'attack')"), router.indexOf('if (actor) {', router.indexOf("if (normalizedSkill === 'attack')") + 400));
assert.doesNotMatch(attackBranch, /rollFallback\(/);

// 4/5/6. Natural 1/20/critical-range handling is not reimplemented for
// abstract crew — it flows through the same unconditional
// AttackOutcomeResolver.resolve() call in rollAttack() (see
// phase3-vehicle-attack-formula.test.mjs, assertion 18: exactly one
// AttackOutcomeResolver.resolve call site in rollAttack, never branched).
assert.doesNotMatch(math, /automaticHit|automaticMiss|criticalThreat/);

// 7. Abstract crew and a real gunner's values never stack: the attack
// branch is a strict if(actor){rollAttack(actor,...)} / else
// {rollAttack(vehicle,...,{abstractCrewQuality})} split — mutually
// exclusive by construction (only one branch can execute).
assert.match(attackBranch, /if \(actor\) \{[\s\S]*?rollAttack\(actor, weapon, \{ vehicleActor: vehicle,/);
assert.match(attackBranch, /rollAttack\(vehicle, weapon, \{\s*\n\s*abstractCrewQuality:/);

// 8. Invalid abstract crew data fails clearly: an unrecognized crewQuality
// value is warned about (not silently misapplied), and a missing/invalid
// vehicle actor returns the same structured failure shape as the
// named-gunner resolver.
assert.match(crewFn, /warnings\.push\(`Unrecognized crew quality/);
assert.match(crewFn, /return \{ total: 0, ledger: \[\], warnings, error: 'invalid-vehicle-actor' \};/);

// 13/14/15/16/17 (shared formula invariants, abstract-crew resolver):
// vehicle actor's own BAB is never read; the crew-quality tier substitutes
// for Gunner BAB, not the vehicle's own; vehicle INT sourced once; range
// sourced once; misc components individually labeled (weapon enhancement
// only added when nonzero, its own ledger entry).
assert.doesNotMatch(crewFn, /getBAB\(vehicleActor\)/);
assert.match(crewFn, /id: 'crew-quality-bab'/);
assert.match(crewFn, /id: 'vehicle-int'/);
assert.match(crewFn, /id: 'range'/);
assert.match(crewFn, /id: 'misc-enhancement'/);

// Duplicate-table drift fix: CREW_QUALITY_BONUS has exactly one definition
// (vehicle-attack-math.js), imported (not redeclared) by crew-skill-router.js.
assert.match(math, /export const CREW_QUALITY_BONUS = \{/);
assert.match(router, /import \{ CREW_QUALITY_BONUS \} from "\/systems\/foundryvtt-swse\/scripts\/engine\/combat\/vehicle-attack-math\.js";/);
assert.doesNotMatch(router, /const CREW_QUALITY_BONUS = \{/);

// --- Generic attack-domain routing (required tests 9-12) ---

// 9. Character weapons route to the character resolver: attack-domain-router.js
// falls through to domain: 'character' / resolver: 'resolveAttackBonus' for
// a non-vehicle actor.
assert.match(domainRouter, /domain: 'character',\s*\n\s*resolver: 'resolveAttackBonus',/);

// 10. An explicit vehicleActor context selects the named-gunner vehicle
// resolver.
assert.match(domainRouter, /domain: 'vehicle-actor-gunner',\s*\n\s*resolver: 'resolveVehicleAttackBonus',/);

// 11. An explicit abstractCrewQuality signal (with actor.type === 'vehicle')
// selects the abstract-crew resolver.
assert.match(domainRouter, /domain: 'vehicle-abstract-crew',\s*\n\s*resolver: 'resolveAbstractCrewAttackBonus',/);

// 12. Ambiguous/invalid vehicle context (actor.type==='vehicle' with no
// abstractCrewQuality signal, or a supplied vehicleActor that isn't
// actually vehicle-typed) is rejected with ok:false, not silently routed.
assert.match(domainRouter, /reason: 'vehicle-actor-with-no-crew-context'/);
assert.match(domainRouter, /reason: 'invalid-vehicle-context'/);

// The router only SELECTS an authority; it must not itself compute any
// attack-bonus math (no BAB/ability/range arithmetic in this file) or
// execute a roll (no RollEngine/RollCore/new Roll( references).
assert.doesNotMatch(domainRouter, /getBAB\(|getAbilityMod\(|getRangePenalty\(/);
assert.doesNotMatch(domainRouter, /new Roll\(|RollEngine\.|RollCore\./);

// rollAttack() is driven by the router's decision (see
// phase3-vehicle-attack-formula.test.mjs assertion 21 for the call-site
// check); confirm the three resolver branches dispatch on domainResolution.domain.
const rollAttackBody = attacks.slice(attacks.indexOf('export async function rollAttack('), attacks.indexOf('export async function rollDamage('));
assert.match(rollAttackBody, /if \(attackDomain === 'vehicle-actor-gunner'\) \{/);
assert.match(rollAttackBody, /\} else if \(attackDomain === 'vehicle-abstract-crew'\) \{/);
// Combat-display-parity Phase 2 fix: the character branch now threads a
// resolvedActionId (rollOptions.actionId ?? workflowContext.actionId ??
// null) instead of a hardcoded null literal, so action-linked talent
// bonuses can be resolved when a real actionId is available — see
// tests/attack-action-id-threading.test.mjs for the dedicated coverage.
// The invariant this file cares about (character domain still calls
// resolveAttackBonus with rollOptions as its context argument, as opposed
// to a vehicle resolver) is unchanged.
assert.match(rollAttackBody, /attackBonusResolution = resolveAttackBonus\(actor, weapon, resolvedActionId, rollOptions\);/);

// 17 (generic routing list): a vehicle weapon never falls back to the
// vehicle actor's own BAB or the gunner's Dex/Str merely because domain
// selection failed — a failed domain resolution aborts rollAttack() before
// any bonus is computed.
assert.match(rollAttackBody, /if \(!domainResolution\.ok\) \{/);

// Diagnostics: development visibility into which resolver was selected and
// why (routing decisions logged, and captured in the AttackRollDiagnostics
// snapshot alongside a GM-facing report() formatter for runtime verification).
assert.match(rollAttackBody, /console\.warn\(`\[SWSE\] Attack domain routing: \$\{warning\}`\);/);
assert.match(rollAttackBody, /resolverSelected: domainResolution\.resolver,/);
assert.match(diagnostics, /resolverSelected: snapshot\.resolverSelected/);
assert.match(diagnostics, /report\(index = -1\) \{/);

console.log('Phase 4 abstract-crew and attack-domain-routing guards passed.');
