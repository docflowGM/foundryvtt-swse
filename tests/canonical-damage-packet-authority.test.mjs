import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCanonicalDamagePacket } from '../scripts/engine/combat/canonical-damage-packet.js';

// V2 combat runtime convergence, Phase 1 (damage packet / mitigation authority).
// buildCanonicalDamagePacket() is the single chokepoint every applyDamage
// input normalizes through before mitigation runs (see
// docs/audits/v2-remaining-work.md). It is a pure function with no Foundry
// globals, so it is unit-testable directly.

test('bare numeric damage normalizes exactly once to a single "normal" component tagged legacy', () => {
  const packet = buildCanonicalDamagePacket({ amount: 12 });
  assert.equal(packet.amount, 12);
  assert.equal(packet.primaryType, 'normal');
  assert.deepEqual(packet.components, [
    { amount: 12, type: 'normal', tags: ['legacy'], source: 'legacy-number-damage' }
  ]);
});

test('explicit type on the packet is preserved exactly, with no weapon tags when no weapon is present', () => {
  const packet = buildCanonicalDamagePacket({ amount: 8, type: 'force', source: 'channel-aggression' });
  assert.equal(packet.primaryType, 'force');
  assert.deepEqual(packet.components, [
    { amount: 8, type: 'force', tags: [], source: 'channel-aggression' }
  ]);
});

test('weapon present with no explicit type derives type + lightsaber tag from the weapon', () => {
  const weapon = { id: 'wpn1', name: 'Lightsaber', system: { damageType: 'energy', isLightsaber: true } };
  const packet = buildCanonicalDamagePacket({ amount: 20, options: { weapon } });
  assert.equal(packet.primaryType, 'energy');
  assert.equal(packet.components.length, 1);
  assert.equal(packet.components[0].type, 'energy');
  assert.ok(packet.components[0].tags.includes('lightsaber'));
  assert.ok(packet.components[0].tags.includes('weapon'));
});

test('bypassDR weapon flag surfaces as a bypass-dr tag alongside the damage type', () => {
  const weapon = { id: 'wpn2', name: 'Ion Cannon', system: { damageType: 'ion', bypassDR: true } };
  const packet = buildCanonicalDamagePacket({ amount: 15, options: { weapon } });
  assert.equal(packet.primaryType, 'ion');
  assert.ok(packet.components[0].tags.includes('bypass-dr'));
});

test('an explicit type still wins over a weapon default, but keeps the weapon tags', () => {
  const weapon = { id: 'wpn3', name: 'Lightsaber', system: { damageType: 'energy', isLightsaber: true } };
  const packet = buildCanonicalDamagePacket({ amount: 10, type: 'stun', options: { weapon } });
  assert.equal(packet.primaryType, 'stun');
  assert.ok(packet.components[0].tags.includes('lightsaber'));
});

test('a pre-built mixed two-component packet survives normalization with both components intact', () => {
  const packet = buildCanonicalDamagePacket({
    options: {
      damageComponents: [
        { amount: 20, type: 'energy', source: 'blaster' },
        { amount: 6, type: 'ion', source: 'blaster' }
      ]
    }
  });
  assert.equal(packet.components.length, 2);
  assert.equal(packet.amount, 26);
  assert.equal(packet.primaryType, 'energy');
  assert.deepEqual(packet.components[0], { amount: 20, type: 'energy', tags: [], source: 'blaster' });
  assert.deepEqual(packet.components[1], { amount: 6, type: 'ion', tags: [], source: 'blaster' });
});

test('a malformed component (non-numeric amount) fails closed to zero rather than throwing or dropping the packet', () => {
  const packet = buildCanonicalDamagePacket({
    options: {
      damageComponents: [{ amount: 'not-a-number', type: 'energy', source: 'blaster' }]
    }
  });
  assert.equal(packet.components.length, 1);
  assert.equal(packet.components[0].amount, 0);
  assert.equal(packet.components[0].type, 'energy');
});

test('negative amounts are clamped to zero, never negative HP application', () => {
  const packet = buildCanonicalDamagePacket({ amount: -5 });
  assert.equal(packet.amount, 0);
  assert.equal(packet.components[0].amount, 0);
});
