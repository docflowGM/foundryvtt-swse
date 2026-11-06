import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const attacks=read('scripts/combat/rolls/attacks.js');
const importer=read('scripts/engine/import/vehicle-import-normalizer.js');
const preflight=read('scripts/domain/vehicles/vehicle-attack-preflight.js');
const mapping=read('scripts/domain/vehicles/vehicle-stock-attack-authority.js');

test('the live shared attack entry invokes stock gate before any payment or dice',()=>{
 const fn=attacks.slice(attacks.indexOf('export async function rollAttack('));
 const gate=fn.indexOf('await authorizeVehicleAttackBeforeCosts(');
 assert(gate>0);
 assert(gate<fn.indexOf('spendCoreAttackOptionCosts('));
 assert(gate<fn.indexOf('AmmoSystem.spendForWorkflow('));
 assert(gate<fn.indexOf('RollEngine.safeRoll('));
 assert.match(fn,/if \(!sourceGate\.ok\) \{[\s\S]*?return null/);
});
test('attacks classify actual vehicle ownership and never trust roll-option claims',()=>{
 assert.match(attacks,/ownedVehicle && \(!vehicleDomain\.ok/);
 assert.match(attacks,/vehicleDomain\.domain !== 'character'/);
 assert.doesNotMatch(attacks,/rollOptions\.(?:sourceComplete|arcEvidence|sourceEntryKey|verifiedUserIsGM)/);
});
test('vehicle weapon import retains installed modifier identity without assuming it is canon',()=>{
 assert.match(importer,/w\.sourceModificationId !== undefined/);
 assert.doesNotMatch(importer,/sourceModificationId:.*printedSource/);
});
test('no trusted stock mapping exists until authoritative registry hydration',()=>{
 assert.match(mapping,/TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0/);
 assert.match(mapping,/return null/);
 assert.match(preflight,/CANONICAL_STOCK_ATTACK_UNBOUND/);
});
test('custom is a per-weapon installed modification, not a ship-level opt-out',()=>{
 assert.match(preflight,/classifyInstalledVehicleWeapon\(vehicle,weapon\)/);
 assert.match(preflight,/provenance.kind === 'SHIPYARD_MODIFICATION'/);
 assert.doesNotMatch(preflight,/customBuild|modifiedInShipyard/);
});