import assert from 'node:assert/strict';
import {
  isIntegratedWeaponItem,
  isIntegratedEquipmentItem,
  isWeaponizedProjectedPart,
  partitionWeaponizedParts,
  matchesDroidPartTypeHint
} from '../scripts/domain/droids/droid-item-classification.js';

// Phase 1 — Droid Authority Consolidation. These predicates used to be
// inlined directly in DroidSystemsResolver with two independent copies (one
// for "is this a weapon" and one for "is this equipment") that disagreed on
// lightsaber handling, plus a weaponized-accessory filter that discarded its
// own output before the weapons region could read it back. Extracting them
// as named, dependency-free functions means the fix applies everywhere they
// are used, and the fix itself is directly testable under plain Node.

// 16. Integrated lightsaber is classified as a weapon only.
{
  const lightsaber = { type: 'lightsaber', system: { integrated: true }, flags: {} };
  assert.equal(isIntegratedWeaponItem(lightsaber), true);
  assert.equal(isIntegratedEquipmentItem(lightsaber), false, 'an integrated lightsaber must not also satisfy the equipment predicate');
}

// A plain integrated weapon (non-lightsaber) behaves the same way.
{
  const blaster = { type: 'weapon', system: { integrated: true }, flags: {} };
  assert.equal(isIntegratedWeaponItem(blaster), true);
  assert.equal(isIntegratedEquipmentItem(blaster), false);
}

// A non-integrated weapon/lightsaber is neither an integrated weapon nor
// integrated equipment — it belongs in the ordinary inventory/combat list.
{
  const handheld = { type: 'weapon', system: { integrated: false }, flags: {} };
  assert.equal(isIntegratedWeaponItem(handheld), false);
  assert.equal(isIntegratedEquipmentItem(handheld), false);
}

// Integrated equipment that is not weapon-like is classified as equipment.
{
  const sensor = { type: 'integratedSystem', system: {}, flags: {} };
  assert.equal(isIntegratedWeaponItem(sensor), false);
  assert.equal(isIntegratedEquipmentItem(sensor), true);
}

// hasCategoryOrSlot lets a hydrated-but-untyped item still count as equipment.
{
  const untypedButRecognized = { type: 'gear', system: {}, flags: {} };
  assert.equal(isIntegratedEquipmentItem(untypedButRecognized), false);
  assert.equal(isIntegratedEquipmentItem(untypedButRecognized, { hasCategoryOrSlot: true }), true);
}

// 18. Weaponized accessory is partitioned into the weaponized bucket,
// which is exactly what routes it into the Integrated Weapons region
// instead of vanishing when it is filtered out of Integrated Equipment.
{
  const taser = { id: 'a1', name: 'Taser', category: 'accessory', weaponProfile: { name: 'Taser', damage: '2d6' } };
  const holoDisguiser = { id: 'a2', name: 'Holographic Image Disguiser', category: 'accessory', weaponProfile: null };
  assert.equal(isWeaponizedProjectedPart(taser), true);
  assert.equal(isWeaponizedProjectedPart(holoDisguiser), false);

  const { weaponized, nonWeaponized } = partitionWeaponizedParts([taser, holoDisguiser]);
  assert.deepEqual(weaponized.map(p => p.id), ['a1']);
  assert.deepEqual(nonWeaponized.map(p => p.id), ['a2']);
}

// partitionWeaponizedParts is total: every input part lands in exactly one bucket.
{
  const parts = [
    { id: '1', weaponProfile: { damage: '1d6' } },
    { id: '2', weaponProfile: null },
    { id: '3' },
    { id: '4', weaponProfile: { damage: '' } }
  ];
  const { weaponized, nonWeaponized } = partitionWeaponizedParts(parts);
  assert.equal(weaponized.length + nonWeaponized.length, parts.length);
  assert.deepEqual(new Set([...weaponized, ...nonWeaponized].map(p => p.id)), new Set(parts.map(p => p.id)));
}

// 17. Actor-owned locomotion Item is recognized via the same loose
// type-hint convention already used for appendages, so it can be routed
// into the locomotion region instead of being silently ignored.
{
  const explicitType = { name: 'Mystery Part', system: { droidSystemType: 'locomotion' } };
  const explicitPartType = { name: 'Mystery Part', system: { droidPartType: 'Locomotion Booster' } };
  const flaggedType = { name: 'Mystery Part', flags: { swse: { droidPartType: 'locomotion-secondary' } } };
  const nameFallback = { name: 'Burrower Locomotion Drive', system: {} };
  const unrelated = { name: 'Vibroblade', system: { droidSystemType: 'weapon' } };

  assert.equal(matchesDroidPartTypeHint(explicitType, 'locomotion'), true);
  assert.equal(matchesDroidPartTypeHint(explicitPartType, 'locomotion'), true);
  assert.equal(matchesDroidPartTypeHint(flaggedType, 'locomotion'), true);
  assert.equal(matchesDroidPartTypeHint(nameFallback, 'locomotion'), true);
  assert.equal(matchesDroidPartTypeHint(unrelated, 'locomotion'), false);
}

console.log('Droid item classification predicate guards passed.');
