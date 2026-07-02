#!/usr/bin/env node
/**
 * Phase 10N audit: damage-rider metadata quarantine.
 *
 * Verifies that wrong-shape Advantageous Attack attack-bonus metadata is surfaced
 * as quarantined metadata/manual notes and never converted into a damage rider,
 * while the built-in compatibility damage rider remains the only automatic path.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const adapterPath = 'scripts/engine/combat/damage-timing-rider-adapter.js';
const fullPath = path.join(repoRoot, adapterPath);

function assert(name, condition, details = '') {
  results.push({ name, ok: Boolean(condition), details });
}

const results = [];
if (!fs.existsSync(fullPath)) {
  console.error(`[phase10n] Missing required file: ${adapterPath}`);
  process.exit(1);
}

const source = fs.readFileSync(fullPath, 'utf8');

assert(
  'Adapter keeps Advantageous Attack as a built-in damage rider',
  /hasFeat\(actor,\s*["']Advantageous Attack["']\)/.test(source) &&
    /type:\s*["']TARGET_NOT_ACTED_DAMAGE_RIDER["']/.test(source) &&
    /damageBonus:\s*\{\s*formula:\s*["']halfLevel["']/.test(source)
);

assert(
  'Adapter has a wrong-shape quarantine predicate',
  /function\s+isQuarantinedDamageTimingRule\s*\(/.test(source) &&
    /wrong_shape_attack_bonus_metadata/.test(source)
);

assert(
  'Quarantine recognizes attack-bonus shaped metadata',
  /attack-bonus/.test(source) &&
    /attack-modifier/.test(source) &&
    /rule\.attackBonus\s*!==\s*undefined/.test(source)
);

assert(
  'Quarantine scans non-damage attack metadata containers',
  /attackRules/.test(source) &&
    /attackModifiers/.test(source) &&
    /attackBonuses/.test(source)
);

assert(
  'Damage timing collection refuses quarantined rules before accepting damage riders',
  /if\s*\(isQuarantinedDamageTimingRule\(rule,\s*item\)\)\s*return;[\s\S]{0,240}if\s*\(isDamageRiderRule\(rule\)\)/.test(source)
);

assert(
  'Build plan surfaces quarantined metadata as manual notes',
  /manualNotes\.push\(\.\.\.collectActorQuarantinedDamageTimingRules\(attacker\)\)/.test(source)
);

assert(
  'Quarantined attack bonuses are not added to damage',
  !/amount\s*\+=\s*(?:Number\()?rule\.attackBonus/.test(source) &&
    !/damagePacket\.amount\s*=\s*.*attackBonus/.test(source)
);

assert(
  'Final damage authority remains ActorEngine.applyDamage through existing adapter boundary',
  /ActorEngine\.applyDamage\(actor,\s*plan\.damagePacket\)/.test(source) &&
    !/system\.hp\.value\s*=/.test(source)
);

const failed = results.filter(result => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.details ? ` - ${result.details}` : ''}`);
}

if (failed.length) {
  console.error(`\n[phase10n] ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log('\n[phase10n] Damage-rider metadata quarantine audit passed.');
