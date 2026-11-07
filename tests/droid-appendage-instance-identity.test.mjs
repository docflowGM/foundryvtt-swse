import assert from 'node:assert/strict';

// Droid Gate C-1 -- pure appendage instance identity helpers.
// No Foundry shim needed: the module under test has no Foundry imports.

const {
  isPhysicalAppendageDefinition, isValidInstanceId, isValidLocationId,
  ledgerKeyForInstance, listLedgerInstances, instancesOfPart, findInstance,
  dependentsOfInstance, mintInstanceId, mintLocationId, takenIdentities,
  auditAppendageMirror
} = await import('../scripts/domain/droids/droid-appendage-instance.js');

// 1. Only BASE appendage definitions are physical appendages. Enhancements,
// appendage mounts/weapons/shields/utilities are fitted to one.
assert.equal(isPhysicalAppendageDefinition({ slot: 'appendage', category: 'appendage' }), true);
for (const slot of ['appendage.enhancement', 'appendage.mount', 'appendage.weapon', 'appendage.utility', 'appendage.shield', 'appendage.toolWeapon']) {
  assert.equal(isPhysicalAppendageDefinition({ slot, category: 'appendage' }), false, slot);
}
assert.equal(isPhysicalAppendageDefinition({ slot: 'appendage', category: 'weapon' }), false);
assert.equal(isPhysicalAppendageDefinition(null), false);

// 2. Identity vocabulary validation is strict and opaque.
assert.equal(isValidInstanceId('inst-abc123'), true);
assert.equal(isValidInstanceId('abc123'), false);
assert.equal(isValidInstanceId('inst-ab'), false);
assert.equal(isValidInstanceId('inst-AB12CD'), false, 'uppercase is not a minted identity');
assert.equal(isValidInstanceId(''), false);
assert.equal(isValidLocationId('appendage-slot-1'), true);
assert.equal(isValidLocationId('appendage-slot-0'), false);
assert.equal(isValidLocationId('left-arm'), false, 'anatomical names are not location tokens');

// 3. Minting is deterministic under an injected source, unique, and never
// reuses a taken id.
{
  const seq = ['aaaaaa01', 'aaaaaa01', 'bbbbbb02'];
  const next = () => seq.shift();
  const first = mintInstanceId([], next);
  assert.equal(first, 'inst-aaaaaa01');
  const second = mintInstanceId([first], next);
  assert.equal(second, 'inst-bbbbbb02', 'a colliding draw is rejected and redrawn');
  assert.throws(() => mintInstanceId([], () => 'zz'), /unique appendage instance id/, 'a source that never yields a valid id fails closed');
}
assert.equal(mintLocationId([]), 'appendage-slot-1');
assert.equal(mintLocationId(['appendage-slot-1']), 'appendage-slot-2');
assert.equal(mintLocationId(['appendage-slot-2']), 'appendage-slot-1', 'smallest unused token');
assert.equal(mintLocationId(['appendage-slot-1', 'appendage-slot-3']), 'appendage-slot-2');

// 4. Ledger scan: legacy (no instanceId) is excluded; two hands are two
// instances; a duplicate or malformed identity is reported, never repaired.
const ledger = {
  'plasteel-shell': { id: 'plasteel-shell' },
  hand: { id: 'hand' },                                                      // legacy evidence
  [ledgerKeyForInstance('hand', 'inst-aaaaaa01')]: { id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' },
  [ledgerKeyForInstance('hand', 'inst-bbbbbb02')]: { id: 'hand', instanceId: 'inst-bbbbbb02', locationId: 'appendage-slot-2' },
  [ledgerKeyForInstance('claw', 'inst-cccccc03')]: { id: 'claw', instanceId: 'inst-cccccc03', locationId: 'appendage-slot-3' },
  'telescopic-appendage': { id: 'telescopic-appendage', hostInstanceId: 'inst-aaaaaa01' }
};
{
  const { instances, malformed } = listLedgerInstances(ledger);
  assert.equal(malformed.length, 0);
  assert.deepEqual(instances.map(i => i.instanceId).sort(), ['inst-aaaaaa01', 'inst-bbbbbb02', 'inst-cccccc03']);
  assert.equal(instancesOfPart(ledger, 'hand').length, 2, 'legacy part-keyed "hand" is not an instance');
  assert.equal(instancesOfPart(ledger, 'claw').length, 1);
  assert.equal(findInstance(ledger, 'inst-bbbbbb02').locationId, 'appendage-slot-2');
  assert.equal(findInstance(ledger, 'inst-nope0000'), null);
  assert.equal(findInstance(ledger, ''), null);
  assert.deepEqual(dependentsOfInstance(ledger, 'inst-aaaaaa01').map(d => d.partId), ['telescopic-appendage']);
  assert.deepEqual(dependentsOfInstance(ledger, 'inst-bbbbbb02'), []);
}
{
  const bad = {
    a: { id: 'hand', instanceId: 'inst-aaaaaa01' },
    b: { id: 'hand', instanceId: 'inst-aaaaaa01' },        // duplicate identity
    c: { id: 'hand', instanceId: 'not-an-instance' },       // malformed
    d: { id: 'hand', instanceId: 'inst-dddddd04', locationId: 'left-arm' }, // invented anatomy
    e: { instanceId: 'inst-eeeeee05' }                      // no part
  };
  const { instances, malformed } = listLedgerInstances(bad);
  assert.deepEqual(instances.map(i => i.ledgerKey), ['a']);
  assert.deepEqual(malformed.map(m => m.ledgerKey).sort(), ['b', 'c', 'd', 'e']);
}

// 5. takenIdentities sees both the ledger and the display mirror so a mint
// can never collide with either.
{
  const { instanceIds, locationIds } = takenIdentities(ledger, { appendages: [{ id: 'tool', instanceId: 'inst-ffffff06', locationId: 'appendage-slot-9' }] });
  assert.ok(instanceIds.has('inst-aaaaaa01') && instanceIds.has('inst-ffffff06'));
  assert.ok(locationIds.has('appendage-slot-3') && locationIds.has('appendage-slot-9'));
}

// 6. Mirror audit: ledger authoritative; every disagreement is reported.
{
  const mirror = { appendages: [
    { id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' },
    { id: 'hand', instanceId: 'inst-bbbbbb02', locationId: 'appendage-slot-2' },
    { id: 'claw', instanceId: 'inst-cccccc03', locationId: 'appendage-slot-3' }
  ] };
  assert.deepEqual(auditAppendageMirror(ledger, mirror), []);
  const missing = { appendages: mirror.appendages.slice(0, 2) };
  assert.deepEqual(auditAppendageMirror(ledger, missing).map(p => p.code), ['MIRROR_INSTANCE_MISSING']);
  const extra = { appendages: [...mirror.appendages, { id: 'tool', instanceId: 'inst-ffffff06', locationId: 'appendage-slot-4' }] };
  assert.deepEqual(auditAppendageMirror(ledger, extra).map(p => p.code), ['MIRROR_INSTANCE_NOT_IN_LEDGER']);
  const wrongPart = { appendages: [{ ...mirror.appendages[0], id: 'claw' }, mirror.appendages[1], mirror.appendages[2]] };
  assert.deepEqual(auditAppendageMirror(ledger, wrongPart).map(p => p.code), ['MIRROR_PART_DISAGREES']);
  const wrongLoc = { appendages: [{ ...mirror.appendages[0], locationId: 'appendage-slot-7' }, mirror.appendages[1], mirror.appendages[2]] };
  assert.deepEqual(auditAppendageMirror(ledger, wrongLoc).map(p => p.code), ['MIRROR_LOCATION_DISAGREES']);
  const dup = { appendages: [...mirror.appendages, mirror.appendages[0]] };
  assert.ok(auditAppendageMirror(ledger, dup).some(p => p.code === 'MIRROR_INSTANCE_DUPLICATED'));
}

console.log('Droid appendage instance identity (pure) tests passed.');
