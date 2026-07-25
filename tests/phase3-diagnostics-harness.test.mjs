import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AttackRollDiagnostics } from '../scripts/engine/combat/attack-roll-diagnostics.js';

// AttackRollDiagnostics has zero Foundry dependencies (confirmed by the
// relative import above actually resolving and executing under plain
// Node), so its no-op-when-disabled and record-when-enabled behavior is
// genuinely executable, not just statically inspected.

// 1. Disabled by default; record() must not throw and must not accumulate
// events while disabled.
assert.equal(AttackRollDiagnostics.enabled, false);
AttackRollDiagnostics.record({ domain: 'combat.attack', naturalD20: 20 });
assert.equal(AttackRollDiagnostics.events.length, 0);

// 2. Enabling it makes record() capture a snapshot, including the new
// Phase 3 crewStation field and a vehicle actor's identity.
AttackRollDiagnostics.enabled = true;
try {
  AttackRollDiagnostics.record({
    domain: 'combat.attack',
    attackType: 'vehicle',
    actor: { name: 'Ace Gunner', id: 'actor1' },
    vehicleActor: { name: 'YT-1300', id: 'vehicle1' },
    operator: { name: 'Ace Gunner', id: 'actor1' },
    crewStation: 'gunner',
    naturalD20: 20,
    finalTotal: 25,
    outcome: { hit: true, automaticHit: true, automaticMiss: false, critical: true, criticalThreat: true, damageMultiplier: 2, reason: 'natural-20-automatic-hit' }
  });
  assert.equal(AttackRollDiagnostics.events.length, 1);
  const entry = AttackRollDiagnostics.events[0];
  assert.equal(entry.attackType, 'vehicle');
  assert.equal(entry.vehicleActor, 'YT-1300');
  assert.equal(entry.operator, 'Ace Gunner');
  assert.equal(entry.crewStation, 'gunner');
  assert.equal(entry.outcome.critical, true);
} finally {
  AttackRollDiagnostics.enabled = false;
  AttackRollDiagnostics.clear();
}

// 3. A diagnostics failure must never throw into the roll pipeline — feed
// it a snapshot shaped to make internal access throw and confirm record()
// swallows it.
AttackRollDiagnostics.enabled = true;
try {
  assert.doesNotThrow(() => {
    AttackRollDiagnostics.record({
      get componentLedger() { throw new Error('boom'); }
    });
  });
} finally {
  AttackRollDiagnostics.enabled = false;
  AttackRollDiagnostics.clear();
}

// 4. index.js registers the harness under the existing SWSE.debug.*
// namespace (not a new ad hoc global), disabled by default.
const indexSource = await readFile(new URL('../index.js', import.meta.url), 'utf8');
assert.match(indexSource, /globalThis\.SWSE\.debug\.attackRolls = AttackRollDiagnostics;/);

// 5. The canonical attack path and the reroll handler both feed the
// harness (statically confirmed — see phase3-vehicle-operator-resolution
// and phase3-reroll-supersession tests for the surrounding wiring).
const attacksSource = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const resolverSource = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
assert.match(attacksSource, /AttackRollDiagnostics\.record\(\{/);
assert.match(resolverSource, /AttackRollDiagnostics\.record\(\{\s*\n\s*domain: 'combat\.attack\.reroll'/);

console.log('Phase 3 diagnostics harness guards passed.');
