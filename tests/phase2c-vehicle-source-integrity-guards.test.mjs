import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const importer = readFileSync(new URL('../scripts/engine/import/vehicle-weapon-import-normalizer.js', import.meta.url),'utf8');
const legacyArc = readFileSync(new URL('../scripts/combat/systems/vehicle/vehicle-weapons.js', import.meta.url),'utf8');

test('vehicle importer uses shared source-preserving attack-summary authority',()=>{
  assert.match(importer, /formatVehicleAttackSummary\(entry\.attackBonus \?\? entry\.bonus \?\? entry\.attack\)/);
  assert.match(importer, /parsed\.attackSummary = formatVehicleAttackSummary\(bonus\)/);
  assert.match(importer, /const bonus = numericVehicleAttackBonus\(parsed\.attackSummary\)/);
  assert.doesNotMatch(importer, /Math\.max\(0,\s*bonus\)/);
  assert.doesNotMatch(importer, /bonus: parsed\.attackSummary \|\| '\+0'/);
});
test('legacy firing arc helper cannot infer forward or permit unknown arc',()=>{
  assert.match(legacyArc, /static inFireArc\(attacker, target, arc = null/);
  assert.match(legacyArc, /return isTargetWithinVehicleArc\(attacker, target, arc, tolerance\)/);
  assert.doesNotMatch(legacyArc, /static inFireArc\([^\n]*arc = 'forward'/);
});