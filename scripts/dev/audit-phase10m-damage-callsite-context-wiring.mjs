#!/usr/bin/env node
/**
 * Phase 10M audit: damage callsite context wiring.
 *
 * Verifies that successful combat attacks pass attacker/target/weapon/hit
 * context into DamageEngine.applyDamage, while manual and subsystem damage
 * explicitly opt out of successful-hit feat damage riders.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const files = {
  combat: 'scripts/engine/combat/CombatEngine.js',
  damage: 'scripts/engine/combat/damage-engine.js',
  manual: 'scripts/apps/damage-app.js',
  recurring: 'scripts/engine/combat/recurring-damage-engine.js',
  collision: 'scripts/engine/combat/subsystems/vehicle/vehicle-collisions.js',
  poison: 'scripts/engine/poison/poison-engine.js'
};

function read(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing required file: ${relPath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

const results = [];
function assert(name, condition, details = '') {
  results.push({ name, ok: Boolean(condition), details });
}

let combat = '';
let damage = '';
let manual = '';
let recurring = '';
let collision = '';
let poison = '';

try {
  combat = read(files.combat);
  damage = read(files.damage);
  manual = read(files.manual);
  recurring = read(files.recurring);
  collision = read(files.collision);
  poison = read(files.poison);
} catch (err) {
  console.error(`[phase10m] ${err.message}`);
  process.exit(1);
}

assert(
  'DamageEngine exposes skipDamageTimingRiders guard',
  /skipDamageTimingRiders\s*=\s*false/.test(damage) &&
    /skipDamageTimingRiders\s*\?\s*\{[\s\S]*damagePacket:\s*basePacket[\s\S]*\}\s*:\s*DamageTimingRiderAdapter\.applyToDamagePacket/.test(damage)
);

assert(
  'CombatEngine computes a single attack damage type before reaction/damage context',
  /const\s+damageType\s*=\s*weapon\.system\.combat\?\.damageType\s*\|\|\s*['"]kinetic['"]/.test(combat)
);

assert(
  'CombatEngine passes successful-hit rider context to DamageEngine.applyDamage',
  /DamageEngine\.applyDamage\(\s*target\s*,\s*damage\s*,\s*\{[\s\S]*sourceActor:\s*attacker[\s\S]*attacker,/.test(combat) &&
    /targetActor:\s*target/.test(combat) &&
    /weapon,/.test(combat) &&
    /hit:\s*true/.test(combat) &&
    /isHit:\s*true/.test(combat) &&
    /critical:\s*isCriticalHit/.test(combat) &&
    /isCritical:\s*isCriticalHit/.test(combat) &&
    /damageType/.test(combat)
);

assert(
  'Manual DamageApp opts out of successful-hit riders',
  /DamageEngine\.applyDamage\(this\.actor,\s*dmg,\s*\{[\s\S]*skipDamageTimingRiders:\s*true/.test(manual)
);

assert(
  'RecurringDamageEngine opts out of successful-hit riders',
  /DamageEngine\.applyDamage\(actor,\s*Math\.max[\s\S]*skipDamageTimingRiders:\s*true/.test(recurring)
);

assert(
  'Vehicle collision damage opts out of successful-hit riders',
  /DamageEngine\.applyDamage\(target,\s*damage,\s*\{[\s\S]*skipDamageTimingRiders:\s*true/.test(collision)
);

assert(
  'Poison direct damage opts out of successful-hit riders',
  /DamageEngine\.applyDamage\(targetActor,\s*amount,\s*\{[\s\S]*skipDamageTimingRiders:\s*true/.test(poison)
);

assert(
  'No manual/subsystem callsite passes hit:true with skipDamageTimingRiders:true',
  !/[\s\S](skipDamageTimingRiders:\s*true[\s\S]{0,200}hit:\s*true|hit:\s*true[\s\S]{0,200}skipDamageTimingRiders:\s*true)/.test(`${manual}\n${recurring}\n${collision}\n${poison}`),
  'Manual/subsystem damage should not masquerade as successful weapon hits.'
);

const failed = results.filter(result => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.details ? ` - ${result.details}` : ''}`);
}

if (failed.length) {
  console.error(`\n[phase10m] ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log('\n[phase10m] Damage callsite context wiring audit passed.');
