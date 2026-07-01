#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const auditPath = path.join(root, 'data/feat-implementation/phase10h-damage-context-callsite-audit.json');
const files = {
  damageEngine: path.join(root, 'scripts/engine/combat/damage-engine.js'),
  damageAdapter: path.join(root, 'scripts/engine/combat/damage-timing-rider-adapter.js'),
  combatEngine: path.join(root, 'scripts/engine/combat/CombatEngine.js'),
  damageApp: path.join(root, 'scripts/apps/damage-app.js'),
  recurringDamage: path.join(root, 'scripts/engine/combat/recurring-damage-engine.js'),
  vehicleCollisions: path.join(root, 'scripts/engine/combat/subsystems/vehicle/vehicle-collisions.js')
};

const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

for (const [key, file] of Object.entries({ audit: auditPath, ...files })) {
  if (!fs.existsSync(file)) errors.push(`Missing required file for ${key}: ${path.relative(root, file)}`);
}

if (!errors.length) {
  const audit = JSON.parse(read(auditPath));
  if (audit.phase !== 'phase-10h-damage-context-callsite-audit') errors.push(`Unexpected phase: ${audit.phase}`);
  if (!Array.isArray(audit.callsites) || audit.callsites.length < 5) errors.push('Phase 10H audit must document at least five damage callsites.');

  const combatEngine = read(files.combatEngine);
  const damageApp = read(files.damageApp);
  const recurringDamage = read(files.recurringDamage);
  const vehicleCollisions = read(files.vehicleCollisions);
  const damageEngine = read(files.damageEngine);
  const adapter = read(files.damageAdapter);

  if (!damageEngine.includes('DamageTimingRiderAdapter.applyToDamagePacket')) {
    errors.push('DamageEngine must remain wired to DamageTimingRiderAdapter from Phase 10G.');
  }
  if (!adapter.includes('Advantageous Attack')) {
    errors.push('DamageTimingRiderAdapter must retain Advantageous Attack compatibility handling.');
  }

  const attackCallIsContextRich = /DamageEngine\.applyDamage\(target,\s*damage,\s*\{[\s\S]*?(sourceActor|attacker)[\s\S]*?targetActor[\s\S]*?weapon[\s\S]*?(hit|isHit)[\s\S]*?\}\)/m.test(combatEngine);
  if (!attackCallIsContextRich) {
    warnings.push('CombatEngine.resolveAttack still appears to call DamageEngine.applyDamage without full attacker/target/weapon/hit context. Phase 10I should patch this first.');
  }

  const manualDamageSkipsRiders = /DamageEngine\.applyDamage\(this\.actor,\s*dmg,\s*\{[\s\S]*?skipDamageTimingRiders:\s*true[\s\S]*?\}\)/m.test(damageApp);
  if (!manualDamageSkipsRiders) {
    warnings.push('DamageApp manual damage does not explicitly pass skipDamageTimingRiders: true. Phase 10I should add this guard.');
  }

  const recurringSkipsRiders = /skipDamageTimingRiders:\s*true/.test(recurringDamage);
  if (!recurringSkipsRiders) {
    warnings.push('RecurringDamageEngine does not explicitly skip damage timing riders; recurring ticks should not retrigger on-hit riders by default.');
  }

  const collisionSkipsRiders = /DamageEngine\.applyDamage\(target,\s*damage,\s*\{[\s\S]*?skipDamageTimingRiders:\s*true[\s\S]*?\}\)/m.test(vehicleCollisions);
  if (!collisionSkipsRiders) {
    warnings.push('VehicleCollisions.ram does not explicitly skip damage timing riders; collision damage should not trigger weapon-hit riders by default.');
  }

  const primary = audit.callsites.find(entry => entry.classification === 'safe_to_wire_attack_context');
  if (!primary || primary.path !== 'scripts/engine/combat/CombatEngine.js') {
    errors.push('Phase 10H must identify CombatEngine.js as the primary safe attack-context wiring path.');
  }
}

const generatedDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(generatedDir, { recursive: true });
const report = {
  phase: 'phase-10h-damage-context-callsite-audit',
  errors,
  warnings,
  ok: errors.length === 0,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(generatedDir, 'phase10h-damage-context-callsites-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(generatedDir, 'phase10h-damage-context-callsites-report.md'), [
  '# Phase 10H Damage Context Callsites Report',
  '',
  `OK: ${errors.length === 0}`,
  `Errors: ${errors.length}`,
  `Warnings: ${warnings.length}`,
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map(error => `- ${error}`) : ['- None']),
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map(warning => `- ${warning}`) : ['- None'])
].join('\n') + '\n');

console.log(`Phase 10H damage context callsite audit: ${errors.length} errors, ${warnings.length} warnings.`);
if (warnings.length) console.warn(warnings.map(warning => `WARN: ${warning}`).join('\n'));
if (errors.length) console.error(errors.map(error => `ERROR: ${error}`).join('\n'));
if (strict && errors.length) process.exit(1);
