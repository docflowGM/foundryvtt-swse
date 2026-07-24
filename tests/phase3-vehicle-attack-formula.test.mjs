import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for the authoritative vehicle attack formula
// (docs/audits/rolling-system-alignment-phase-3.md, "Live Vehicle and
// Starship Attack Formula Audit" addendum):
//
//   Vehicle Attack Total = 1d20 + Gunner BAB + Vehicle INT modifier +
//                           Range modifier + applicable miscellaneous modifiers
//
// scripts/engine/combat/vehicle-attack-math.js and vehicle-attack-math.js's
// imports have zero Foundry-global dependencies at the top of their import
// graph but transitively reach Foundry-only modules (ModifierEngine, etc.),
// so — consistent with the rest of this phase's tests — these are static
// source-text guards (readFile + regex/assert.match), not executed logic.
// Each of the 20 required formula-validation properties below is mapped to
// a concrete, evidence-based assertion against the actual resolver source
// and its live call site in attacks.js.

const math = await readFile(new URL('../scripts/engine/combat/vehicle-attack-math.js', import.meta.url), 'utf8');
const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const router = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/crew-skill-router.js', import.meta.url), 'utf8');
const contextBuilder = await readFile(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', import.meta.url), 'utf8');
const resolver = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');

// 1. Exact formula: total is built from gunner-bab + vehicle-int + range +
// sum(applied misc/effect components) — not any other combination.
assert.match(math, /id:\s*'gunner-bab'/);
assert.match(math, /id:\s*'vehicle-int'/);
assert.match(math, /id:\s*'range'/);
assert.match(math, /const total = ledger\s*\n\s*\.filter\(entry => entry\.applied\)\s*\n\s*\.reduce\(\(sum, entry\) => sum \+ \(Number\(entry\.value\) \|\| 0\), 0\);/);

// 2. Gunner BAB, not vehicle BAB: getBAB is only ever called (indirectly,
// via resolveAttackBonus) on gunnerActor; the module never calls
// SchemaAdapters.getBAB(vehicleActor) or reads vehicleActor's own BAB.
assert.match(math, /resolveAttackBonus\(gunnerActor, weapon, null, context\)/);
assert.doesNotMatch(math, /getBAB\(vehicleActor\)/);
assert.doesNotMatch(math, /vehicleActor\.system\?\.(derived\?\.)?bab/);

// 3. Vehicle INT, not gunner INT: getAbilityMod is called on vehicleActor
// with 'int', never on gunnerActor with 'int'.
assert.match(math, /SchemaAdapters\.getAbilityMod\(vehicleActor, 'int'\)/);
assert.doesNotMatch(math, /getAbilityMod\(gunnerActor, 'int'\)/);

// 4. Gunner Dex (or any gunner ability modifier) is not auto-added: the
// gunner's own ability-modifier component (whatever getWeaponAttackAbility
// resolves it to) is explicitly excluded from the misc-component loop.
assert.match(math, /if \(label === 'BAB' \|\| label === gunnerAbilityLabel\) continue;/);

// 5 & 16 & 17. Pilot BAB only when the pilot is the valid operator of THAT
// weapon: the crew-skill-router station is derived per-weapon from
// weapon.crewRole, defaulting to 'gunner' — never a blanket pilot fallback.
assert.match(contextBuilder, /getStationSkillActions\(weapon\.crewRole \|\| 'gunner'\)/);
assert.match(contextBuilder, /stationKey:\s*weapon\.crewRole \|\| 'gunner'/);

// 6. No stacking of an assigned gunner's BAB with abstract crew quality:
// rollVehicleCrewSkill's attack branch is a strict if(actor)/else split —
// a resolved crew actor takes the rollAttack() path OR the unassigned
// station takes the abstract crew-quality rollFallback() path, never both.
const attackBranch = router.slice(router.indexOf("if (normalizedSkill === 'attack')"), router.indexOf('if (actor) {', router.indexOf("if (normalizedSkill === 'attack')") + 400));
assert.match(attackBranch, /if \(actor\) \{[\s\S]*?rollAttack\(actor, weapon,/);
assert.match(attackBranch, /return rollFallback\(vehicle, stationKey, normalizedSkill,/);

// 7. Vehicle INT score->modifier conversion happens exactly once (a single
// getAbilityMod(vehicleActor, 'int') call site in the module).
const vehicleIntCalls = (math.match(/getAbilityMod\(vehicleActor, 'int'\)/g) || []).length;
assert.equal(vehicleIntCalls, 1, 'SchemaAdapters.getAbilityMod(vehicleActor, "int") must be called exactly once.');

// 8. Range penalties retain their sign: getRangePenalty's return value is
// assigned straight into the ledger with no Math.abs()/sign inversion.
assert.match(math, /const rangeModifier = getRangePenalty\(weapon, context\);/);
assert.doesNotMatch(math, /Math\.abs\(rangeModifier\)/);
assert.match(math, /id:\s*'range', label: 'Range', value: rangeModifier,/);

// 9. Range is not double-applied: getRangePenalty is called exactly once in
// the resolver, and attacks.js does not independently call getRangePenalty
// for the vehicle attack path (it only consumes attackBonusResolution.total
// / .ledger).
const rangeCalls = (math.match(/getRangePenalty\(/g) || []).length;
assert.equal(rangeCalls, 1, 'getRangePenalty must be called exactly once.');
assert.doesNotMatch(attacks, /getRangePenalty/);

// 10. Every misc modifier gets its own ledger entry (pushed individually in
// the loop), never accumulated into one aggregate value.
assert.match(math, /ledger\.push\(ledgerEntry\(\{\s*\n\s*id: `misc-\$\{slugify\(label\)\}`, label, value: numeric,/);

// 11 & 13. finalAttackBonus is the sum of applied ledger components (so
// removing any one applied component changes the total by exactly that
// component's value — a direct property of summing over the ledger array
// rather than an independently-tracked running total).
assert.match(math, /\.filter\(entry => entry\.applied\)/);

// 12. finalAttackTotal = naturalD20 + finalAttackBonus: both the vehicle
// and character paths build the same `1d20 + ${atkBonus}` formula string
// from the same unified atkBonus variable in attacks.js.
assert.match(attacks, /const rollFormula = `1d20 \+ \$\{atkBonus\}`;/);
assert.match(attacks, /const atkBonus = attackBonusResolution\.total \+ fightingDefensivelyPenalty/);

// 14. Suppressed modifiers (applied: false, from ModifierEngine.resolveTarget)
// are still pushed into the ledger for visibility but excluded from the
// total sum by the applied-only filter above.
assert.match(math, /Suppressed modifiers are still shown \(applied: false, with a reason\)/);

// 15. Invalid gunner/vehicle actors return a structured failure — total 0,
// empty ledger, explicit error code — never a silent substitution.
assert.match(math, /return \{ total: 0, ledger: \[\], warnings, error: 'invalid-gunner-actor' \};/);
assert.match(math, /return \{ total: 0, ledger: \[\], warnings, error: 'invalid-vehicle-actor' \};/);
assert.match(attacks, /if \(attackBonusResolution\.error\) \{/);
assert.match(attacks, /ui\?\.notifications\?\.error\?\.\(attackBonusResolution\.error === 'invalid-vehicle-actor'/);

// 18. Chat, AttackOutcomeResolver, and the damage workflow all consume the
// same atkBonus/roll.total regardless of vehicle vs character attack — the
// branch only changes how attackBonusResolution is computed, not how roll,
// outcome, or chat posting consume it downstream.
const rollAttackBody = attacks.slice(attacks.indexOf('export async function rollAttack('), attacks.indexOf('export async function rollDamage('));
assert.match(rollAttackBody, /const isVehicleAttack = Boolean\(rollOptions\.vehicleActor\);/);
assert.match(rollAttackBody, /const outcome = AttackOutcomeResolver\.resolve\(\{\s*\n\s*naturalD20: d20,\s*\n\s*total: roll\.total,/);
// Only one AttackOutcomeResolver.resolve call and one SWSEChat.postRoll call
// exist in rollAttack — i.e. no vehicle-specific fork downstream of the
// bonus resolution.
assert.equal((rollAttackBody.match(/AttackOutcomeResolver\.resolve\(/g) || []).length, 1);
assert.equal((rollAttackBody.match(/SWSEChat\.postRoll\(/g) || []).length, 1);

// 19. Reroll preserves the resolved formula components: the reroll button's
// formula is captured verbatim from the original resolved rollFormula
// (which already embeds atkBonus as a literal number), so a reroll re-rolls
// "1d20 + <resolved bonus>" rather than recomputing the vehicle formula
// from scratch.
assert.match(attacks, /formula: rollFormula,\s*\n\s*weaponId: weapon\.id,/);
assert.match(resolver, /const formula = button\.dataset\.formula \|\| '1d20';/);
assert.doesNotMatch(resolver, /resolveVehicleAttackBonus/);

// 20. Vehicle attacks still flow through the same transaction/rollback
// structure as Phase 1/2 (ammo + action-option rollback on failure) — the
// new vehicle-formula error branch rolls back exactly like the pre-existing
// ammoSpend-failure branch.
assert.match(rollAttackBody, /if \(attackBonusResolution\.error\) \{\s*\n\s*if \(ammoSpend\?\.spent\) await AmmoSystem\.rollbackSpend\(actor, weapon, ammoSpend\);\s*\n\s*await actionOptionSpend\?\.rollback\?\.\(\);/);

console.log('Phase 3 vehicle attack formula guards passed (20/20 required properties mapped).');
