import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { isVehicleFieldWritable, coerceVehicleFieldValue } from '../scripts/sheets/v2/vehicle-sheet/vehicle-edit-form-contract.js';

const dir = new URL('../templates/actors/vehicle/v2/partials/', import.meta.url);
// Only templates actually reachable from the sheet root count (damage-threshold-panel / defenses-panel are preloaded but never rendered).
const reachable = new Set(['vehicle-sheet-content.hbs']);
const queue = ['vehicle-sheet-content.hbs'];
while (queue.length) {
  const f = queue.pop();
  for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/\{\{>\s*"[^"]*\/vehicle\/v2\/partials\/([^"]+\.hbs)"/g)) {
    if (!reachable.has(m[1])) { reachable.add(m[1]); queue.push(m[1]); }
  }
}
const names = new Set();
for (const f of reachable) {
  for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/<(?:input|select|textarea)\b[^>]*\bname="((?:system\.|name$|img$)[^"{}]*)"/g)) names.add(m[1]);
}
// Rendered only in the source-backed (canonical) branch of the sheet; canonical writes are checked separately below.
const CANONICAL_ONLY = new Set(['system.hp.value']);
const missing = [...names].filter((n) => !CANONICAL_ONLY.has(n) && !isVehicleFieldWritable(n, 'custom'));
assert.deepEqual(missing, [], `rendered inputs the Save handler would silently drop: ${missing.join(', ')}`);
for (const n of CANONICAL_ONLY) assert(isVehicleFieldWritable(n, 'canonical'), `${n} writable on source-backed vehicles`);
// published facts stay locked on source-backed vehicles
for (const locked of ['system.starshipSpeed', 'system.hyperdrive_class', 'system.cost', 'system.maxVelocityKmh']) assert.equal(isVehicleFieldWritable(locked, 'canonical'), false, locked);
// coercion
assert.equal(coerceVehicleFieldValue('system.characterScaleSpeed', ''), null);
assert.equal(coerceVehicleFieldValue('system.maxVelocityKmh', '1050.7'), 1050);
assert.equal(coerceVehicleFieldValue('system.starshipSpeed', '12 squares'), '12 squares');
assert(reachable.size > 5 && names.size > 20, 'scan found the sheet inputs');
console.log(`vehicle edit-form contract: ok (${names.size} inputs in ${reachable.size} templates)`);
