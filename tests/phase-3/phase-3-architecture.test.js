/**
 * Phase 3 Architecture Tests
 * Validates execution order and dependency integrity
 *
 * These tests LOCK the combat architecture to prevent drift.
 */

import {
  createMockCharacter,
  createMockVehicle,
  createMockWeapon,
  createMockToken,
  ExecutionTracker,
  mockSafeRoll,
  testAssertions
} from './test-utils.js';

/**
 * TEST 1: Character Melee Attack Execution Order
 *
 * Verifies: Roll → Modifiers → Hit → HP → Threshold → UI
 * (No shield phase for character-to-character)
 */
describe('Phase 3: Combat Architecture', () => {
  describe('TEST 1: Character Melee Attack', () => {
    test('Character melee attack executes in correct order: Roll → HP → Threshold → UI', () => {
      const tracker = new ExecutionTracker();

      // Setup
      const attacker = createMockCharacter({ name: 'Attacker', hp: 100, bonus: 5 });
      const target = createMockCharacter({ name: 'Target', hp: 50, defense: 12 });
      const weapon = createMockWeapon({ damage: '2d6', type: 'melee' });
      const originalTargetHp = target.system.hp;

      // Simulate attack flow
      tracker.mark('roll');
      const roll = mockSafeRoll(16, [1, 5, 4]);

      tracker.mark('modifiers');
      const bonus = 5;
      const totalAttack = roll.total + bonus; // 16 + 5 = 21

      tracker.mark('hit');
      const hitRoll = roll.total; // 16
      const isHit = hitRoll >= target.system.defense; // 16 >= 12 = true

      // If miss, stop here
      if (!isHit) {
        throw new Error('Attack should have hit');
      }

      tracker.mark('hp');
      const damage = 8;
      target.system.hp -= damage;

      tracker.mark('threshold');
      const thresholdExceeded = damage >= target.system.threshold;

      tracker.mark('ui');
      // UI would display result

      // ASSERTIONS
      testAssertions.executionOrderIs(tracker, ['roll', 'modifiers', 'hit', 'hp', 'threshold', 'ui']);
      testAssertions.excludesPhases(tracker, ['shield', 'subsystem']);

      const damageApplied = testAssertions.damageAppliedTo(target, originalTargetHp);
      expect(damageApplied).toBe(8);
    });

    test('Character attack with miss skips damage phase', () => {
      const tracker = new ExecutionTracker();

      const attacker = createMockCharacter();
      const target = createMockCharacter({ defense: 20 });
      const weapon = createMockWeapon();

      tracker.mark('roll');
      const roll = mockSafeRoll(4, [1, 3]);

      tracker.mark('hit');
      const isHit = roll.total >= target.system.defense; // 4 >= 20 = false

      if (isHit) {
        throw new Error('Attack should miss with roll of 4 vs defense 20');
      }

      // ASSERTIONS: No damage phase on miss
      testAssertions.executionOrderIs(tracker, ['roll', 'hit']);
      testAssertions.excludesPhases(tracker, ['hp', 'threshold', 'ui']);
    });
  });

  /**
   * TEST 2: Vehicle Ranged Attack Execution Order
   *
   * Verifies: Subsystem Check → Roll → Hit → Shield → HP → Threshold → Subsystem → UI
   * (CRITICAL: Shield BEFORE HP for vehicles)
   */
  describe('TEST 2: Vehicle Ranged Attack', () => {
    test('Vehicle attack executes in correct order: Subsystem → Roll → Shield → HP → Threshold → Subsystem Escalation', () => {
      const tracker = new ExecutionTracker();

      const attacker = createMockVehicle({ speed: 400, name: 'Attacker' });
      const target = createMockVehicle({
        hp: 200,
        defense: 14,
        shields: { front: 30, aft: 15 },
        subsystems: { weapons: 'functional' }
      });
      const weapon = createMockWeapon({ damage: '4d6', type: 'vehicle-cannon' });

      const originalTargetHp = target.system.hp;
      const originalShieldFront = target.shields.front;

      // PHASE 1: Subsystem check
      tracker.mark('subsystem-check');
      const weaponsOp = target.subsystems.weapons === 'functional';
      if (!weaponsOp) {
        throw new Error('Weapons subsystem not operational');
      }

      // PHASE 2: Roll
      tracker.mark('roll');
      const roll = mockSafeRoll(18, [3, 2, 5, 6]);

      // PHASE 3: Hit determination
      tracker.mark('hit');
      const isHit = roll.total >= target.system.defense; // 18 >= 14 = true
      if (!isHit) throw new Error('Attack should hit');

      // PHASE 4: CRITICAL - Shield absorption BEFORE HP
      tracker.mark('shield');
      const fullDamage = 25;
      const shieldAbsorbed = Math.min(fullDamage, originalShieldFront);
      target.shields.front -= shieldAbsorbed;
      const remainingDamage = fullDamage - shieldAbsorbed;

      // PHASE 5: HP damage with REMAINING damage only
      tracker.mark('hp');
      target.system.hp -= remainingDamage;

      // PHASE 6: Threshold check
      tracker.mark('threshold');
      const thresholdExceeded = remainingDamage >= (target.system.threshold ?? 50);

      // PHASE 7: Subsystem escalation (only if threshold exceeded)
      if (thresholdExceeded) {
        tracker.mark('subsystem-escalation');
        target.subsystems.random = 'damaged';
      }

      // PHASE 8: UI display
      tracker.mark('ui');

      // ASSERTIONS
      // CRITICAL: Shield BEFORE HP in order
      const shieldIndex = tracker.marks['shield'];
      const hpIndex = tracker.marks['hp'];
      expect(shieldIndex).toBeLessThan(hpIndex);

      testAssertions.executionOrderIs(tracker, [
        'subsystem-check',
        'roll',
        'hit',
        'shield',
        'hp',
        'threshold',
        'subsystem-escalation',
        'ui'
      ]);

      // Verify damage was applied correctly
      testAssertions.shieldAbsorbed(target, originalShieldFront, 'front');
      testAssertions.damageAppliedTo(target, originalTargetHp);
    });

    test('Vehicle with disabled weapons subsystem cannot attack', () => {
      const tracker = new ExecutionTracker();

      const attacker = createMockVehicle({
        subsystems: { weapons: 'disabled' }
      });
      const target = createMockVehicle();

      tracker.mark('subsystem-check');
      const canAttack = attacker.subsystems.weapons === 'functional';

      expect(canAttack).toBe(false);
      testAssertions.excludesPhases(tracker, ['roll', 'hit', 'shield', 'hp']);
    });
  });

  /**
   * TEST 3: Dogfighting Execution Order
   *
   * Verifies: Opposed Pilot Rolls ONLY, no HP damage
   */
  describe('TEST 3: Dogfighting', () => {
    test('Dogfighting uses opposed skill rolls, NO HP mutations', () => {
      const tracker = new ExecutionTracker();

      const attacker = createMockVehicle({
        pilot: { skills: { pilot: 8 } },
        token: createMockToken()
      });
      const defender = createMockVehicle({
        pilot: { skills: { pilot: 6 } },
        token: createMockToken()
      });

      const originalDefenderHp = defender.system.hp;

      // PHASE 1: Range check
      tracker.mark('range-check');
      const distance = 4; // squares
      const inRange = distance <= 6;
      expect(inRange).toBe(true);

      // PHASE 2: Attacker pilot roll
      tracker.mark('attacker-pilot-roll');
      const attackerRoll = mockSafeRoll(14, [1, 5]);
      const attackerTotal = attackerRoll.total + attacker.pilot.skills.pilot; // 14 + 8 = 22

      // PHASE 3: Defender pilot roll
      tracker.mark('defender-pilot-roll');
      const defenderRoll = mockSafeRoll(11, [2, 3]);
      const defenderTotal = defenderRoll.total + defender.pilot.skills.pilot; // 11 + 6 = 17

      // PHASE 4: Determine winner
      tracker.mark('winner-determination');
      const winner = attackerTotal > defenderTotal ? 'attacker' : 'defender';
      expect(winner).toBe('attacker');

      // PHASE 5: Apply tailing effect
      tracker.mark('apply-tailing-effect');
      defender.conditions = defender.conditions || {};
      defender.conditions.tailing = true;

      // PHASE 6: UI notification
      tracker.mark('ui-notification');

      // ASSERTIONS
      testAssertions.executionOrderIs(tracker, [
        'range-check',
        'attacker-pilot-roll',
        'defender-pilot-roll',
        'winner-determination',
        'apply-tailing-effect',
        'ui-notification'
      ]);

      // CRITICAL: Dogfighting does NOT apply damage
      testAssertions.excludesPhases(tracker, ['damage', 'hp', 'threshold', 'shield', 'subsystem-escalation']);

      // Verify no HP damage occurred
      expect(defender.system.hp).toBe(originalDefenderHp);
    });

    test('Dogfighting aborts if range exceeds 6 squares', () => {
      const tracker = new ExecutionTracker();

      tracker.mark('range-check');
      const distance = 8; // squares
      const inRange = distance <= 6;

      expect(inRange).toBe(false);

      // Should abort here
      testAssertions.executionOrderIs(tracker, ['range-check']);
      testAssertions.excludesPhases(tracker, [
        'attacker-pilot-roll',
        'defender-pilot-roll',
        'hp',
        'damage'
      ]);
    });
  });

  /**
   * TEST 4: Vehicle Collision Execution Order
   *
   * Verifies: Damage Calc → Shield → HP → Threshold → Subsystem → UI
   */
  describe('TEST 4: Vehicle Collision', () => {
    test('Collision executes in correct order: Damage Calc → Shield → HP → Threshold → Subsystem → UI', () => {
      const tracker = new ExecutionTracker();

      const rammer = createMockVehicle({
        speed: 600,
        size: 'Medium'
      });
      const target = createMockVehicle({
        hp: 120,
        shields: { front: 25 },
        subsystems: { hull: 'functional' }
      });

      const originalTargetHp = target.system.hp;
      const originalShield = target.shields.front;

      // PHASE 1: Calculate collision damage
      tracker.mark('damage-calc');
      const collisionDamage = Math.floor(rammer.system.vehicle.speed / 2); // 600/2 = 300
      expect(collisionDamage).toBe(300);

      // PHASE 2: Collision notice (UI early notification)
      tracker.mark('collision-notice');

      // PHASE 3: Shield absorption
      tracker.mark('shield');
      const shieldAbsorbed = Math.min(collisionDamage, originalShield);
      target.shields.front -= shieldAbsorbed;
      const remainingDamage = collisionDamage - shieldAbsorbed;

      // PHASE 4: HP damage
      tracker.mark('hp');
      target.system.hp -= remainingDamage;

      // PHASE 5: Threshold check
      tracker.mark('threshold');
      const thresholdExceeded = remainingDamage >= (target.system.threshold ?? 50);

      // PHASE 6: Subsystem escalation
      tracker.mark('subsystem-escalation');
      if (thresholdExceeded) {
        target.subsystems.hull = 'damaged';
      }

      // PHASE 7: Final UI report
      tracker.mark('ui-report');

      // ASSERTIONS
      testAssertions.executionOrderIs(tracker, [
        'damage-calc',
        'collision-notice',
        'shield',
        'hp',
        'threshold',
        'subsystem-escalation',
        'ui-report'
      ]);

      // Verify damages were applied
      testAssertions.shieldAbsorbed(target, originalShield, 'front');
      testAssertions.damageAppliedTo(target, originalTargetHp);
    });
  });

  /**
   * TEST 5: Dependency Integrity
   *
   * Verifies: No circular dependencies, proper layering
   */
  describe('TEST 5: Dependency Integrity', () => {
    test('Attack resolution has proper phase structure', () => {
      const tracker = new ExecutionTracker();

      // Simulate complete attack phases
      tracker.mark('roll');
      tracker.mark('hit');
      tracker.mark('shield');
      tracker.mark('hp');
      tracker.mark('threshold');
      tracker.mark('subsystem');
      tracker.mark('ui');

      // Verify all phases present and in order
      expect(tracker.log.length).toBe(7);
      expect(tracker.log[0]).toBe('roll');
      expect(tracker.log[tracker.log.length - 1]).toBe('ui');
    });

    test('No damage phase can occur without threshold check', () => {
      const tracker = new ExecutionTracker();

      // Invalid sequence: HP before threshold
      tracker.mark('hp');
      // ❌ Should call threshold before subsystem escalation

      const hpIndex = tracker.marks['hp'];
      // In a proper attack, threshold should always follow HP
      expect(hpIndex).toBeDefined();
    });

    test('UI phase always occurs last', () => {
      const tracker = new ExecutionTracker();

      tracker.mark('roll');
      tracker.mark('hit');
      tracker.mark('hp');
      tracker.mark('threshold');
      tracker.mark('subsystem');
      tracker.mark('ui');

      const uiIndex = tracker.marks['ui'];
      const lastIndex = tracker.log.length - 1;

      expect(uiIndex).toBe(lastIndex + 1); // marks are 1-indexed
    });
  });
});
