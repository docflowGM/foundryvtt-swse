/**
 * Phase 3.3: Force Subsystem Hardening Tests
 *
 * Validates the complete force progression system:
 * 1. Multi-source additive capacity calculation
 * 2. Domain unlock/lock lifecycle
 * 3. Capacity validation before mutations
 * 4. Automatic cleanup on feat removal
 * 5. ForceAuthorityEngine pure derivation + validation
 *
 * Test Coverage: 8 scenarios per specification
 */

import { ForceAuthorityEngine } from '../scripts/engine/progression/engine/force-authority-engine.js';
import { ForceSlotValidator } from '../scripts/engine/progression/engine/force-slot-validator.js';
import { ForceDomainLifecycle } from '../scripts/infrastructure/hooks/force-domain-lifecycle.js';
import { ForcePowerEngine } from '../scripts/engine/progression/engine/force-power-engine.js';

/**
 * Mock actor factory for force system testing
 */
function createMockActor(overrides = {}) {
  return {
    id: `actor-${Math.random().toString(36).slice(2, 9)}`,
    type: 'character',
    name: overrides.name ?? 'Test Actor',
    items: overrides.items ?? [],
    system: {
      abilities: {
        wis: { mod: overrides.wisMod ?? 0 },
        cha: { mod: overrides.chaMod ?? 0 }
      },
      progression: {
        unlockedDomains: overrides.unlockedDomains ?? []
      },
      ...overrides.system
    },
    // Mock ActorEngine methods for testing
    updateEmbeddedDocuments: async function(type, docs) {
      if (type === 'Item') {
        this.items.push(...docs);
      }
    },
    deleteEmbeddedDocuments: async function(type, ids) {
      if (type === 'Item') {
        this.items = this.items.filter(i => !ids.includes(i.id || i._id));
      }
    },
    ...overrides
  };
}

/**
 * Mock feat factory
 */
function createFeat(name, overrides = {}) {
  return {
    id: `feat-${Math.random().toString(36).slice(2, 9)}`,
    _id: `feat-${Math.random().toString(36).slice(2, 9)}`,
    type: 'feat',
    name: name,
    system: overrides.system || {},
    ...overrides
  };
}

/**
 * Mock force power factory
 */
function createForcePower(name, overrides = {}) {
  return {
    id: `power-${Math.random().toString(36).slice(2, 9)}`,
    _id: `power-${Math.random().toString(36).slice(2, 9)}`,
    type: 'forcePower',
    name: name,
    created: overrides.created ?? Date.now(),
    system: overrides.system || {},
    ...overrides
  };
}

describe('Phase 3.3: Force Subsystem Hardening', () => {

  /**
   * TEST 1: Multi-Source Capacity Calculation
   *
   * Validates that capacity is correctly calculated from multiple sources:
   * - Force Sensitivity: +1
   * - Force Training: +(1 + WIS mod) per feat (STACKS)
   */
  describe('TEST 1: Multi-Source Capacity Calculation', () => {
    test('should calculate capacity from Force Sensitivity (+1)', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      expect(capacity).toBe(1);
    });

    test('should calculate capacity from single Force Training (+1+WIS)', async () => {
      const actor = createMockActor({
        wisMod: 1,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training')
        ]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      // Force Sensitivity: 1
      // Force Training: 1 * (1 + 1) = 2
      // Total: 3
      expect(capacity).toBe(3);
    });

    test('should stack multiple Force Training feats (+1+WIS each)', async () => {
      const actor = createMockActor({
        wisMod: 1,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          createFeat('Force Training')
        ]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      // Force Sensitivity: 1
      // Force Training: 2 * (1 + 1) = 4
      // Total: 5
      expect(capacity).toBe(5);
    });

    test('should handle zero WIS modifier correctly', async () => {
      const actor = createMockActor({
        wisMod: 0,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training')
        ]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      // Force Sensitivity: 1
      // Force Training: 1 * (1 + 0) = 1
      // Total: 2
      expect(capacity).toBe(2);
    });

    test('should return 0 for actor with no feats', async () => {
      const actor = createMockActor({ items: [] });
      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      expect(capacity).toBe(0);
    });

    test('should return 0 if actor is null', async () => {
      const capacity = await ForceAuthorityEngine.getForceCapacity(null);
      expect(capacity).toBe(0);
    });
  });

  /**
   * TEST 2: Domain Unlock on Force Sensitivity Add
   *
   * Validates that force domain is unlocked when Force Sensitivity is added
   */
  describe('TEST 2: Domain Unlock on Force Sensitivity Add', () => {
    test('should unlock force domain when Force Sensitivity is added', async () => {
      const actor = createMockActor({
        unlockedDomains: []
      });

      // Add Force Sensitivity
      const feat = createFeat('Force Sensitivity');
      actor.items.push(feat);

      // Simulate domain unlock via lifecycle handler
      await ForceDomainLifecycle.handleForceSensitivityFeatAdded(actor);

      expect(actor.system.progression.unlockedDomains).toContain('force');
    });

    test('should not duplicate force domain if already unlocked', async () => {
      const actor = createMockActor({
        unlockedDomains: ['force']
      });

      await ForceDomainLifecycle.handleForceSensitivityFeatAdded(actor);

      const forceDomainCount = actor.system.progression.unlockedDomains.filter(d => d === 'force').length;
      expect(forceDomainCount).toBe(1);
    });

    test('validateForceAccess should pass after domain unlock', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: ['force']
      });

      const result = await ForceAuthorityEngine.validateForceAccess(actor);
      expect(result.valid).toBe(true);
    });

    test('validateForceAccess should fail without Force Sensitivity feat', async () => {
      const actor = createMockActor({
        unlockedDomains: ['force']
      });

      const result = await ForceAuthorityEngine.validateForceAccess(actor);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Force Sensitivity');
    });

    test('validateForceAccess should fail without domain unlock', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: []
      });

      const result = await ForceAuthorityEngine.validateForceAccess(actor);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('domain');
    });
  });

  /**
   * TEST 3: Domain Removal on Force Sensitivity Remove
   *
   * Validates that force domain is locked and excess powers are cleaned up
   * when Force Sensitivity is removed
   */
  describe('TEST 3: Domain Removal and Cleanup on Force Sensitivity Remove', () => {
    test('should lock force domain when Force Sensitivity is removed', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: ['force']
      });

      // Remove Force Sensitivity
      actor.items = actor.items.filter(i => !i.name.includes('Force Sensitivity'));

      await ForceDomainLifecycle.handleForceSensitivityFeatRemoved(actor);

      expect(actor.system.progression.unlockedDomains).not.toContain('force');
    });

    test('should remove excess powers when capacity drops to 0', async () => {
      const power1 = createForcePower('Force Power 1', { created: 1000 });
      const power2 = createForcePower('Force Power 2', { created: 2000 });

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1,
          power2
        ],
        unlockedDomains: ['force']
      });

      // Remove Force Sensitivity (capacity becomes 0)
      actor.items = actor.items.filter(i => !i.name.includes('Force Sensitivity'));

      await ForceDomainLifecycle.handleForceSensitivityFeatRemoved(actor);

      // No force powers should remain
      const forcePowers = actor.items.filter(i => i.type === 'forcePower');
      expect(forcePowers.length).toBe(0);
    });

    test('should remove oldest powers first during cleanup', async () => {
      const power1 = createForcePower('Power 1', { created: 1000 });
      const power2 = createForcePower('Power 2', { created: 2000 });
      const power3 = createForcePower('Power 3', { created: 3000 });

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1,
          power2,
          power3
        ],
        unlockedDomains: ['force']
      });

      // Simulate capacity becoming 1 (only one power allowed)
      // Remove Force Sensitivity and add Force Training with no WIS mod = capacity 1
      actor.items = actor.items.filter(i => !i.name.includes('Force Sensitivity'));
      actor.items.push(createFeat('Force Training'));

      await ForceDomainLifecycle.handleForceSensitivityFeatRemoved(actor);

      // Only newest power should remain (Power 3)
      const remaining = actor.items.filter(i => i.type === 'forcePower');
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe('Power 3');
    });
  });

  /**
   * TEST 4: Force Training Stacking
   *
   * Validates that multiple Force Training feats stack correctly
   */
  describe('TEST 4: Force Training Stacking', () => {
    test('should stack two Force Training feats with WIS modifier', async () => {
      const actor = createMockActor({
        wisMod: 1,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          createFeat('Force Training')
        ]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      // Force Sensitivity: 1
      // Force Training x2: 2 * (1 + 1) = 4
      // Total: 5
      expect(capacity).toBe(5);
    });

    test('should calculate correctly with three Force Training feats', async () => {
      const actor = createMockActor({
        wisMod: 2,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          createFeat('Force Training'),
          createFeat('Force Training')
        ]
      });

      const capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      // Force Sensitivity: 1
      // Force Training x3: 3 * (1 + 2) = 9
      // Total: 10
      expect(capacity).toBe(10);
    });

    test('should recalculate capacity when Force Training is added', async () => {
      const actor = createMockActor({
        wisMod: 1,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training')
        ]
      });

      let capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      expect(capacity).toBe(3); // 1 + (1 * (1 + 1))

      // Add another Force Training
      actor.items.push(createFeat('Force Training'));

      capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      expect(capacity).toBe(5); // 1 + (2 * (1 + 1))
    });
  });

  /**
   * TEST 5: Capacity Validation (Under Limit)
   *
   * Validates that power selection succeeds when under capacity
   */
  describe('TEST 5: Capacity Validation (Under Limit)', () => {
    test('should allow selection when under capacity', async () => {
      const power1 = createForcePower('Power 1');
      const power2 = createForcePower('Power 2');
      const power3 = createForcePower('Power 3');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          power1,
          power2,
          power3
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 + (1 * 1) = 2 (WIS mod 0)
      // Selecting 2 powers (at limit)
      const powerIds = [power1.id, power2.id];
      const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

      expect(result.valid).toBe(true);
      expect(result.capacityUsed).toBe(2);
    });

    test('should allow all powers when selection equals capacity', async () => {
      const power1 = createForcePower('Power 1');
      const power2 = createForcePower('Power 2');
      const power3 = createForcePower('Power 3');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1,
          power2,
          power3
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 (only Force Sensitivity)
      // Selecting 1 power
      const powerIds = [power1.id];
      const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

      expect(result.valid).toBe(true);
      expect(result.capacityUsed).toBe(1);
    });
  });

  /**
   * TEST 6: Capacity Validation (Over Limit)
   *
   * Validates that power selection fails when over capacity
   */
  describe('TEST 6: Capacity Validation (Over Limit)', () => {
    test('should reject selection when over capacity', async () => {
      const power1 = createForcePower('Power 1');
      const power2 = createForcePower('Power 2');
      const power3 = createForcePower('Power 3');
      const power4 = createForcePower('Power 4');
      const power5 = createForcePower('Power 5');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1,
          power2,
          power3,
          power4,
          power5
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 (only Force Sensitivity)
      // Trying to select 5 powers
      const powerIds = [power1.id, power2.id, power3.id, power4.id, power5.id];
      const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('capacity');
    });

    test('should detect duplicate power selections', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: ['force']
      });

      const powerIds = [power1.id, power1.id]; // Duplicate
      const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Duplicate');
    });

    test('should reject invalid power IDs', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: ['force']
      });

      const powerIds = ['invalid-id'];
      const result = await ForceAuthorityEngine.validateForceSelection(actor, powerIds);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid power ID');
    });
  });

  /**
   * TEST 7: Capacity Reduction on Force Training Remove
   *
   * Validates that excess powers are cleaned up when capacity drops
   */
  describe('TEST 7: Capacity Reduction on Force Training Remove', () => {
    test('should remove excess powers when Force Training is removed', async () => {
      const power1 = createForcePower('Power 1', { created: 1000 });
      const power2 = createForcePower('Power 2', { created: 2000 });

      const actor = createMockActor({
        wisMod: 1,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          power1,
          power2
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 + (1 * (1 + 1)) = 3
      // Remove Force Training
      actor.items = actor.items.filter(i => !i.name.includes('Force Training'));

      await ForceDomainLifecycle.handleForceTrainingFeatRemoved(actor);

      // Capacity now: 1 (only Force Sensitivity)
      // Should have removed Power 1 (oldest)
      const powers = actor.items.filter(i => i.type === 'forcePower');
      expect(powers.length).toBe(1);
      expect(powers[0].name).toBe('Power 2');
    });

    test('should handle multiple power removals when capacity drops significantly', async () => {
      const power1 = createForcePower('Power 1', { created: 1000 });
      const power2 = createForcePower('Power 2', { created: 2000 });
      const power3 = createForcePower('Power 3', { created: 3000 });
      const power4 = createForcePower('Power 4', { created: 4000 });

      const actor = createMockActor({
        wisMod: 2,
        items: [
          createFeat('Force Sensitivity'),
          createFeat('Force Training'),
          createFeat('Force Training'),
          power1,
          power2,
          power3,
          power4
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 + (2 * (1 + 2)) = 7
      // Remove both Force Training feats
      actor.items = actor.items.filter(i => !i.name.includes('Force Training'));

      await ForceDomainLifecycle.handleForceTrainingFeatRemoved(actor);

      // Capacity now: 1 (only Force Sensitivity)
      // Should have removed 3 oldest powers
      const powers = actor.items.filter(i => i.type === 'forcePower');
      expect(powers.length).toBe(1);
      expect(powers[0].name).toBe('Power 4');
    });
  });

  /**
   * TEST 8: Validation Failure Blocks Mutation
   *
   * Validates that ForcePowerEngine.applySelected() respects validation
   */
  describe('TEST 8: Validation Failure Blocks Mutation', () => {
    test('should block mutation when actor lacks Force Sensitivity', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [power1], // No Force Sensitivity
        unlockedDomains: []
      });

      const result = await ForcePowerEngine.applySelected(actor, [power1]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Force Sensitivity');
    });

    test('should block mutation when domain is not unlocked', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: [] // Domain not unlocked
      });

      const result = await ForcePowerEngine.applySelected(actor, [power1]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('domain');
    });

    test('should block mutation when over capacity', async () => {
      const power1 = createForcePower('Power 1');
      const power2 = createForcePower('Power 2');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1,
          power2
        ],
        unlockedDomains: ['force']
      });

      // Capacity: 1 (only Force Sensitivity)
      // Trying to apply 2 powers
      const result = await ForcePowerEngine.applySelected(actor, [power1, power2]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('capacity');
    });

    test('should allow mutation when all validations pass', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: ['force']
      });

      const result = await ForcePowerEngine.applySelected(actor, [power1]);

      // Should succeed (even though power already exists)
      expect(result.success).toBe(true);
    });
  });

  /**
   * TEST 9: ForceAuthorityEngine Pure Derivation
   *
   * Validates that ForceAuthorityEngine never mutates actor state
   */
  describe('TEST 9: ForceAuthorityEngine Pure Derivation', () => {
    test('getForceCapacity should not mutate actor', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: []
      });

      const originalState = JSON.stringify(actor);
      await ForceAuthorityEngine.getForceCapacity(actor);
      const afterState = JSON.stringify(actor);

      expect(originalState).toBe(afterState);
    });

    test('validateForceAccess should not mutate actor', async () => {
      const actor = createMockActor({
        items: [createFeat('Force Sensitivity')],
        unlockedDomains: ['force']
      });

      const originalState = JSON.stringify(actor);
      await ForceAuthorityEngine.validateForceAccess(actor);
      const afterState = JSON.stringify(actor);

      expect(originalState).toBe(afterState);
    });

    test('validateForceSelection should not mutate actor', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: ['force']
      });

      const originalState = JSON.stringify(actor);
      await ForceAuthorityEngine.validateForceSelection(actor, [power1.id]);
      const afterState = JSON.stringify(actor);

      expect(originalState).toBe(afterState);
    });
  });

  /**
   * TEST 10: ForceSlotValidator Orchestration
   *
   * Validates that ForceSlotValidator correctly delegates to ForceAuthorityEngine
   */
  describe('TEST 10: ForceSlotValidator Orchestration', () => {
    test('validateBeforeApply should call ForceAuthorityEngine methods', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: ['force']
      });

      const result = await ForceSlotValidator.validateBeforeApply(actor, [power1.id]);

      expect(result.valid).toBe(true);
      expect(result.capacityUsed).toBe(1);
    });

    test('validateBeforeApply should fail without domain', async () => {
      const power1 = createForcePower('Power 1');

      const actor = createMockActor({
        items: [
          createFeat('Force Sensitivity'),
          power1
        ],
        unlockedDomains: []
      });

      const result = await ForceSlotValidator.validateBeforeApply(actor, [power1.id]);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

});
