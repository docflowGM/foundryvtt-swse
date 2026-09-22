import assert from 'node:assert/strict';
import fs from 'node:fs';

// Math Integrity Freeze, Attack Bonus round 7 (Blocker 4): construction
// flattens the selected crystal's AND every selected accessory's own
// `system.modifiers` records into one combined array on the finished
// weapon (`lightsaber-construction-engine.js#createBuiltLightsaber()`/
// `applyEdits()`), with no per-record origin tag distinguishing "this record
// came from the crystal" from "this record came from an accessory."
// `combat-stat-rules.js#getWeaponAttunementAndUpgradeModifiers()`'s
// standard-baseline-vs-real-crystal distinction (round 7) only inspects the
// weapon's recorded CRYSTAL identity (`lightsaberConfig.crystalId`), not
// which component a given record originated from -- so it is safe ONLY as
// long as no accessory record can be mistaken for a crystal's own
// ATTACK_BONUS/CONDITIONAL_ATTACK benefit. This is true for every
// accessory currently shipped (verified below by parsing the actual
// compiled pack directly, not a reference/import file) -- this test locks
// that fact down as a regression guard, so a future accessory record
// gaining an ATTACK_BONUS/CONDITIONAL_ATTACK type is caught here rather
// than silently changing attack math.

const raw = fs.readFileSync(new URL('../packs/lightsaber-accessories.db', import.meta.url), 'utf8');
const records = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));

assert.ok(records.length > 0, 'the lightsaber-accessories pack must contain at least one record (otherwise this guard proves nothing)');

const attackRelevantAccessories = [];
for (const record of records) {
  const modifiers = record?.system?.modifiers;
  if (!Array.isArray(modifiers)) continue;
  for (const modifier of modifiers) {
    const type = String(modifier?.type ?? '').toUpperCase();
    if (type === 'ATTACK_BONUS' || type === 'CONDITIONAL_ATTACK') {
      attackRelevantAccessories.push({ name: record.name, type });
    }
  }
}

assert.deepEqual(
  attackRelevantAccessories,
  [],
  'no shipped lightsaber accessory may carry an ATTACK_BONUS or CONDITIONAL_ATTACK modifier record today -- ' +
  'getWeaponAttunementAndUpgradeModifiers()\'s standard-baseline-vs-real-crystal distinction only inspects the ' +
  'weapon\'s recorded CRYSTAL identity, not which component a flattened record came from, so an accessory ' +
  'gaining one of these types would need combat-stat-rules.js updated with real per-record provenance before ' +
  'shipping -- this failure is that trip-wire, not a false positive to silence'
);

console.log(`lightsaber-accessory-attack-provenance-safety.test.mjs: ${records.length} accessory record(s) checked, none carry ATTACK_BONUS/CONDITIONAL_ATTACK -- all assertions passed`);
