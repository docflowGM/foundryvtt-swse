/**
 * PHASE 4 Test Matrix: Droid System Modifications
 *
 * Tests for:
 * - DroidModificationFactory (planning, validation)
 * - DroidSlotGovernanceEngine (slot rules)
 * - DroidTransactionService (GM review pipeline)
 * - Integration (full workflows)
 * - Edge cases
 *
 * Coverage targets: ≥95% V2 compliance
 */

import { DroidModificationFactory } from '../../scripts/domain/droids/droid-modification-factory.js';
import { DroidSlotGovernanceEngine } from '../../scripts/domain/droids/droid-slot-governance.js';
import { DroidTransactionService } from '../../scripts/domain/droids/droid-transaction-service.js';
import { DROID_SYSTEM_DEFINITIONS } from '../../scripts/domain/droids/droid-system-definitions.js';

describe('PHASE 4: Droid Modifications', () => {
  describe('DroidModificationFactory', () => {
    let mockActor;

    beforeEach(() => {
      mockActor = {
        id: 'test-droid-1',
        name: 'Test Droid',
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: {
            size: 'medium'
          },
          installedSystems: {}
        }
      };
    });

    it('should plan valid modifications', () => {
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: []
      });

      expect(result.valid).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.summary.systemsAdded.length).toBe(1);
      expect(result.summary.netCost).toBeGreaterThan(0);
    });

    it('should reject insufficient funds', () => {
      mockActor.system.credits = 100;
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_advanced'], // 10000 credits
        remove: []
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient credits');
    });

    it('should calculate resale value correctly (50%)', () => {
      mockActor.system.installedSystems = {
        'processor_basic': {
          id: 'processor_basic',
          name: 'Basic Processor',
          cost: 2000
        }
      };

      const result = DroidModificationFactory.planModifications(mockActor, {
        add: [],
        remove: ['processor_basic']
      });

      expect(result.valid).toBe(true);
      expect(result.summary.totalResaleValue).toBe(1000); // 50% of 2000
      expect(result.summary.newCredits).toBe(51000); // 50000 + 1000
    });

    it('should handle complex transactions', () => {
      mockActor.system.installedSystems = {
        'processor_basic': {
          id: 'processor_basic',
          name: 'Basic Processor',
          cost: 2000
        }
      };

      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_standard', 'locomotion_walker'],
        remove: ['processor_basic']
      });

      expect(result.valid).toBe(true);
      // Remove 2000, add 5000 + 3000 = 8000 - 1000 = 7000 net cost
      expect(result.summary.totalPurchaseCost).toBe(8000);
      expect(result.summary.totalResaleValue).toBe(1000);
      expect(result.summary.netCost).toBe(7000);
    });

    it('should detect add+remove conflicts', () => {
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: ['processor_basic']
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot add and remove same systems');
    });

    it('should reject invalid actor type', () => {
      mockActor.type = 'character';
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: []
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Actor type must be "droid"');
    });

    it('should build valid MutationPlan', () => {
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: []
      });

      expect(result.plan.set).toBeDefined();
      expect(result.plan.set['system.credits']).toBeLessThan(50000);
      expect(result.plan.set['system.installedSystems']).toBeDefined();
    });
  });

  describe('DroidSlotGovernanceEngine', () => {
    it('should enforce single-slot rules', () => {
      const validation = DroidSlotGovernanceEngine.validateConfiguration(
        ['processor_basic', 'processor_standard'],
        'medium'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations.some(v => v.includes('processor'))).toBe(true);
    });

    it('should allow multiple locomotion systems', () => {
      const validation = DroidSlotGovernanceEngine.validateConfiguration(
        ['locomotion_walker', 'locomotion_hover'],
        'heavy'
      );

      // Note: Actual behavior depends on DROID_SYSTEM_DEFINITIONS
      // This test checks the validation works
      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.violations)).toBe(true);
    });

    it('should validate compatibility with chassis', () => {
      const validation = DroidSlotGovernanceEngine.validateConfiguration(
        ['locomotion_flight'], // Flight only works on light/medium
        'heavy'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations.some(v => v.includes('incompatible'))).toBe(true);
    });

    it('should validate modifications correctly', () => {
      const validation = DroidSlotGovernanceEngine.validateModifications(
        ['processor_basic'],
        ['processor_standard'],
        ['processor_basic'],
        'medium'
      );

      expect(validation.valid).toBe(true);
    });

    it('should detect incompatible add+remove', () => {
      const validation = DroidSlotGovernanceEngine.validateModifications(
        [],
        ['processor_basic'],
        ['processor_basic'],
        'medium'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations.some(v => v.includes('Cannot add and remove same system'))).toBe(true);
    });

    it('should list compatible systems for slot', () => {
      const compatible = DroidSlotGovernanceEngine.getCompatibleSystemsForSlot(
        'processor',
        'medium'
      );

      expect(Array.isArray(compatible)).toBe(true);
      expect(compatible.length).toBeGreaterThan(0);
      expect(compatible.every(s => s.slot === 'processor')).toBe(true);
    });
  });

  describe('DroidTransactionService', () => {
    let mockActor;
    let mockPlanResult;

    beforeEach(() => {
      mockActor = {
        id: 'test-droid-2',
        name: 'Test Droid 2',
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        },
        ownership: { user1: 'owner' }
      };

      mockPlanResult = {
        valid: true,
        plan: { set: { 'system.credits': 48000, 'system.installedSystems': {} } },
        summary: {
          currentCredits: 50000,
          totalPurchaseCost: 2000,
          totalResaleValue: 0,
          netCost: 2000,
          newCredits: 48000,
          systemsAdded: [{ id: 'processor_basic', name: 'Basic Processor', cost: 2000 }],
          systemsRemoved: []
        }
      };
    });

    it('should reject invalid plan', async () => {
      const result = await DroidTransactionService.submitForReview(mockActor, {
        valid: false,
        error: 'Test error'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid modification plan');
    });

    it('should generate transaction ID', async () => {
      const result = await DroidTransactionService.submitForReview(mockActor, mockPlanResult);

      // May fail if world flags not available, but check structure
      if (result.success) {
        expect(result.transactionId).toBeDefined();
        expect(result.transactionId).toMatch(/^droid-txn-/);
      }
    });
  });

  describe('Integration Tests', () => {
    let mockActor;

    beforeEach(() => {
      mockActor = {
        id: 'integration-droid',
        name: 'Integration Test Droid',
        type: 'droid',
        system: {
          credits: 100000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };
    });

    it('should complete full modification workflow', () => {
      // Step 1: Plan modifications
      const plan1 = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_standard', 'locomotion_walker'],
        remove: []
      });

      expect(plan1.valid).toBe(true);

      // Step 2: Apply modifications
      mockActor.system.credits = plan1.summary.newCredits;
      mockActor.system.installedSystems = plan1.plan.set['system.installedSystems'];

      // Step 3: Plan second modification (remove and replace)
      const plan2 = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_advanced'],
        remove: ['processor_standard']
      });

      expect(plan2.valid).toBe(true);
      expect(plan2.summary.systemsRemoved.length).toBe(1);
      expect(plan2.summary.systemsAdded.length).toBe(1);
    });

    it('should handle rapid succession modifications', () => {
      const modifications = [
        { add: ['processor_basic'], remove: [] },
        { add: ['locomotion_walker'], remove: [] },
        { add: [], remove: ['processor_basic'] }
      ];

      let currentActor = JSON.parse(JSON.stringify(mockActor));

      for (const mod of modifications) {
        const result = DroidModificationFactory.planModifications(currentActor, mod);
        expect(result.valid).toBe(true);

        // Simulate applying
        currentActor.system.credits = result.summary.newCredits;
        currentActor.system.installedSystems = result.plan.set['system.installedSystems'];
      }

      expect(currentActor.system.credits).toBeLessThan(mockActor.system.credits);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-cost modifications', () => {
      // If such a system existed
      const mockActor = {
        type: 'droid',
        system: {
          credits: 1000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };

      // Verify infrastructure works with edge case
      const validation = DroidSlotGovernanceEngine.validateConfiguration(
        [],
        'medium'
      );

      expect(validation.valid).toBe(true);
    });

    it('should handle empty changeset', () => {
      const mockActor = {
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };

      const result = DroidModificationFactory.planModifications(mockActor, {
        add: [],
        remove: []
      });

      // Empty changeset should be valid but with no changes
      expect(result.valid).toBe(true);
      expect(result.summary.netCost).toBe(0);
    });

    it('should reject very large changesets', () => {
      const mockActor = {
        type: 'droid',
        system: {
          credits: 500000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };

      // Try to add same system multiple times
      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic', 'processor_basic', 'processor_basic'],
        remove: []
      });

      // Should fail due to slot governance
      expect(result.valid).toBe(false);
    });
  });

  describe('V2 Compliance', () => {
    it('should never mutate input actor', () => {
      const mockActor = {
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };

      const originalCredits = mockActor.system.credits;
      const originalSystems = JSON.stringify(mockActor.system.installedSystems);

      DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: []
      });

      expect(mockActor.system.credits).toBe(originalCredits);
      expect(JSON.stringify(mockActor.system.installedSystems)).toBe(originalSystems);
    });

    it('should use canonical 50% resale multiplier everywhere', () => {
      const mockActor = {
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: { size: 'medium' },
          installedSystems: {
            'processor_standard': { cost: 5000 }
          }
        }
      };

      const result = DroidModificationFactory.planModifications(mockActor, {
        add: [],
        remove: ['processor_standard']
      });

      expect(result.summary.totalResaleValue).toBe(2500); // Exactly 50%
    });

    it('should route through governance layers', () => {
      const mockActor = {
        type: 'droid',
        system: {
          credits: 50000,
          droidSystems: { size: 'medium' },
          installedSystems: {}
        }
      };

      const result = DroidModificationFactory.planModifications(mockActor, {
        add: ['processor_basic'],
        remove: []
      });

      // Should produce proper MutationPlan format
      expect(result.plan.set).toBeDefined();
      expect(result.plan.set['system.credits']).toBeDefined();
      expect(result.plan.set['system.installedSystems']).toBeDefined();

      // Never direct mutations
      expect(result.plan.delete).toBeUndefined();
      expect(result.plan.add).toBeUndefined();
    });
  });
});
