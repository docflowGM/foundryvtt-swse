import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative) => readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
const math = read('scripts/engine/combat/vehicle-attack-math.js');
const importer = read('scripts/engine/import/vehicle-weapon-import-normalizer.js');
const crew = read('scripts/sheets/v2/vehicle-sheet/crew-skill-router.js');
const vehicleImport = read('scripts/engine/import/vehicle-import-normalizer.js');
const panel = read('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const attacks = read('scripts/combat/rolls/attacks.js');

// Both authoritative vehicle attack formulas must source Vehicle INT.
assert.equal((math.match(/SchemaAdapters\.getAbilityMod\(vehicleActor, 'int'\)/g) ?? []).length, 2);
assert.match(math, /id: 'gunner-bab'/);
assert.match(math, /id: 'vehicle-int'/);
assert.match(math, /id: 'crew-quality-bab'/);
assert.match(math, /error: 'npc-flat-vehicle-attack-unreconciled'/);
assert.doesNotMatch(math, /total: baseline\.total,[\s\S]*?id: 'npc-flat-override'/);

// An imported mounted weapon must NOT declare the gunner's DEX as its attack authority.
assert.match(importer, /attackAbilityAuthority: 'vehicle-int'/);
assert.doesNotMatch(importer, /attackAttribute: 'dex'/);
assert.match(importer, /formatVehicleAttackSummary\(bonus\)/);
assert.doesNotMatch(importer, /Math\.max\(0, bonus\)/);

// Missing attack bonus / damage / physical arc remain missing, not +0, 1d10, or forward.
assert.doesNotMatch(crew, /weapon\.bonus \?\? weapon\.attackBonus \?\? '\+0'/);
assert.doesNotMatch(crew, /weapon\.damage \?\? weapon\.damageFormula \?\? '1d10'/);
assert.doesNotMatch(crew, /sourceEntryKey: vehicle\.system\?\.sourceEntryKey/);
assert.doesNotMatch(panel, /weapon\.arc, weapon\.firingArc, 'Forward'/);
assert.doesNotMatch(panel, /weapon\.toHit, weapon\.total, '\+0'/);
assert.match(panel, /rawBonus === null \? null/);
assert.match(panel, /arc: weapon\?\.arc \?\? 'unknown'/);
assert.match(panel, /bonus: weapon\?\.bonus \?\? weapon\?\.attackBonus \?\? null/);
assert.match(panel, /damageSummary = safeString\(firstPresent\(weapon\.damage, weapon\.damageFormula, weapon\.formula, weapon\.damageRoll, null\), ''\)/);
assert.match(panel, /count: firstPresent\(weapon\.count\) === null \? null/);
assert.doesNotMatch(vehicleImport, /safeString\(w\.arc, 'Forward'\)/);
assert.doesNotMatch(vehicleImport, /safeString\(w\.bonus, '\+0'\)/);
assert.doesNotMatch(vehicleImport, /safeString\(w\.damage, '1d10'\)/);
assert.match(vehicleImport, /bonus: w\.bonus/);

// The live sheet fire action must still use the domain-aware rollAttack path.
assert.match(crew, /rollAttack\(actor, weapon, \{ vehicleActor: vehicle, operator: actor, crewStation: stationKey \}\)/);
assert.match(crew, /rollAttack\(vehicle, weapon, \{/);
assert.match(attacks, /resolveAttackDomain\(/);
assert.match(attacks, /resolveVehicleAttackBonus\(/);
assert.match(attacks, /resolveAbstractCrewAttackBonus\(/);
console.log('Phase 2C gunnery source-contract guards passed.');