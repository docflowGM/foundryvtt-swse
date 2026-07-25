#!/usr/bin/env node

/**
 * check-vehicle-attack-routing-guard.mjs — Phase 4 vehicle-attack routing
 * guard.
 *
 * Static check for rolling-system alignment invariants added/hardened in
 * Phase 4 (docs/audits/rolling-system-alignment-phase-4.md):
 *
 *   1. rollAttack() (scripts/combat/rolls/attacks.js) is the only place
 *      that selects an attack-math resolver, and it must do so via
 *      attack-domain-router.js#resolveAttackDomain() — not by
 *      independently re-deriving "is this a vehicle attack" from
 *      rollOptions/actor.type ad hoc.
 *   2. No file outside scripts/engine/combat/vehicle-attack-math.js reads
 *      a vehicle actor's own BAB for an attack-bonus computation
 *      (SchemaAdapters.getBAB(vehicleActor) or equivalent) — the exact
 *      pre-Phase-3 defect.
 *   3. No file outside combat-roll-math.js's character-formula path adds a
 *      gunner's own ability modifier (getWeaponAttackAbility /
 *      getAbilityMod(gunnerActor, ...)) into a vehicle-domain ledger
 *      component — vehicle attacks must source their ability-modifier
 *      component from the vehicle's Intelligence, never the operator.
 *   4. Abstract-crew vehicle attacks route through the shared rollAttack()
 *      pipeline (RollEngine dice execution, AttackOutcomeResolver,
 *      ModifierEngine) rather than a standalone Roll()/safeRoll() call
 *      that bypasses AttackOutcomeResolver — the pre-Phase-4 defect this
 *      phase fixed. Only crew-skill-router.js's non-attack skill-check
 *      fallback (rollFallback(), pilot/mechanics/etc.) is allowed to roll
 *      standalone; the 'attack' skill branch must not.
 *
 * Report-only by default; --strict exits non-zero on violations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const STRICT = process.argv.includes('--strict');

const VEHICLE_ATTACK_MATH_FILE = 'scripts/engine/combat/vehicle-attack-math.js';
const ATTACKS_FILE = 'scripts/combat/rolls/attacks.js';
const DOMAIN_ROUTER_FILE = 'scripts/engine/combat/attack-domain-router.js';
const CREW_ROUTER_FILE = 'scripts/sheets/v2/vehicle-sheet/crew-skill-router.js';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const problems = [];

// Invariant 1: attacks.js dispatches via resolveAttackDomain(), not ad hoc
// vehicle-ness checks.
const attacksPath = path.join(ROOT, ATTACKS_FILE);
if (fs.existsSync(attacksPath)) {
  const text = fs.readFileSync(attacksPath, 'utf8');
  if (!text.includes('resolveAttackDomain(')) {
    problems.push(`${ATTACKS_FILE}: does not call resolveAttackDomain() — attack-domain selection must go through attack-domain-router.js.`);
  }
  if (!/domainResolution\.domain/.test(text)) {
    problems.push(`${ATTACKS_FILE}: does not branch on domainResolution.domain — resolver dispatch must be driven by the router's decision.`);
  }
} else {
  problems.push(`${ATTACKS_FILE} not found.`);
}

// Invariant 2: no file outside vehicle-attack-math.js reads a vehicle
// actor's own BAB for attack-bonus math.
const VEHICLE_BAB_PATTERN = /getBAB\(\s*vehicleActor\s*\)|getBAB\(\s*vehicle\s*\)/;
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === VEHICLE_ATTACK_MATH_FILE) continue; // this file's own guard comments/negative-checks reference the pattern intentionally
  const text = fs.readFileSync(file, 'utf8');
  if (VEHICLE_BAB_PATTERN.test(text)) {
    problems.push(`${rel}: reads a vehicle actor's own BAB (getBAB(vehicleActor)/getBAB(vehicle)) — vehicle attacks must use the resolved gunner/operator's BAB or the abstract-crew-quality equivalent, never the vehicle actor's own (empty) BAB.`);
  }
}

// Invariant 3: no file outside combat-roll-math.js computes a gunner's own
// ability modifier for a 'vehicle.attack'-domain ledger entry.
const GUNNER_ABILITY_IN_VEHICLE_PATTERN = /getAbilityMod\(\s*gunnerActor\s*,\s*(abilityKey|'int'|"int")\s*\)/;
for (const file of walk(SCRIPTS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === VEHICLE_ATTACK_MATH_FILE) continue; // this file's own excluded/negative-check comments reference the pattern intentionally
  const text = fs.readFileSync(file, 'utf8');
  if (GUNNER_ABILITY_IN_VEHICLE_PATTERN.test(text)) {
    problems.push(`${rel}: computes a gunner actor's own ability modifier in a vehicle-attack context — the vehicle formula's ability-modifier component must be the vehicle's Intelligence modifier, not the operator's.`);
  }
}

// Invariant 4: abstract-crew ('attack' skill, unassigned station) routes
// through rollAttack(), not a standalone Roll()/safeRoll() call.
const crewRouterPath = path.join(ROOT, CREW_ROUTER_FILE);
if (fs.existsSync(crewRouterPath)) {
  const text = fs.readFileSync(crewRouterPath, 'utf8');
  const attackBranchStart = text.indexOf("if (normalizedSkill === 'attack')");
  const nextIfActor = text.indexOf('if (actor) {', attackBranchStart + 400);
  const attackBranch = attackBranchStart >= 0 && nextIfActor > attackBranchStart
    ? text.slice(attackBranchStart, nextIfActor)
    : '';
  if (!attackBranch) {
    problems.push(`${CREW_ROUTER_FILE}: could not locate the attack skill branch — guard pattern may need updating.`);
  } else if (/rollFallback\(/.test(attackBranch)) {
    problems.push(`${CREW_ROUTER_FILE}: the 'attack' skill branch still calls rollFallback() (standalone Roll, bypasses AttackOutcomeResolver) for abstract crew — must route through rollAttack() with abstractCrewQuality instead.`);
  } else if (!/rollAttack\(vehicle, weapon, \{/.test(attackBranch)) {
    problems.push(`${CREW_ROUTER_FILE}: the 'attack' skill branch's abstract-crew path does not call rollAttack(vehicle, weapon, {...}) — pattern may have changed; verify it still routes through the shared pipeline.`);
  }
} else {
  problems.push(`${CREW_ROUTER_FILE} not found.`);
}

console.log('\n' + '='.repeat(72));
console.log('  VEHICLE ATTACK ROUTING GUARD (Phase 4)');
console.log('='.repeat(72));

if (problems.length) {
  console.log(`\n${STRICT ? 'FAILURES' : 'WARNINGS'} (${problems.length}):`);
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log('\nAttack-domain routing goes through the router; no vehicle-actor-BAB or gunner-ability-in-vehicle-formula violations found; abstract crew routes through the shared rollAttack() pipeline.');
}

console.log('='.repeat(72) + '\n');

if (STRICT && problems.length) {
  process.exit(1);
}
