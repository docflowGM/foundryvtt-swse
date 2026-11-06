import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const importer = readFileSync(new URL('../scripts/engine/import/vehicle-weapon-import-normalizer.js', import.meta.url),'utf8');

test('vehicle importer preserves printed attack totals as evidence, never as weapon enhancement',()=>{
  assert.match(importer,/entry\.printedAttackTotal \?\? entry\.attackBonus \?\? entry\.bonus \?\? entry\.attack/);
  assert.match(importer,/parsed\.attackSummary = formatVehicleAttackSummary\(bonus\)/);
  assert.match(importer,/printedAttackTotal: printedTotal/);
  assert.doesNotMatch(importer,/Math\.max\(0,\s*bonus\)/);
  assert.doesNotMatch(importer,/bonus: parsed\.attackSummary \|\| '\+0'/);
  assert.doesNotMatch(importer,/attackBonus:\s*numericVehicleAttackBonus\(parsed\.attackSummary\)/);
});
test('firing arcs have ONE geometry authority; the legacy arc helper (which could default to forward) is retired',()=>{
  assert.equal(existsSync(new URL('../scripts/combat/systems/vehicle/vehicle-weapons.js', import.meta.url)), false);
  const preflight = readFileSync(new URL('../scripts/domain/vehicles/vehicle-attack-preflight.js', import.meta.url),'utf8');
  assert.match(preflight, /isTargetWithinVehicleArc/);
});