/**
 * tests/force-provenance.test.js
 * Unit tests for Force Power Provenance System
 *
 * Tests cover:
 * - Provenance engine reconciliation
 * - Legacy actor migration
 * - Immutability enforcement
 * - Grant ledger calculations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ForceProvenanceEngine } from '../scripts/engine/progression/engine/force-provenance-engine.js';
import { ForceProvenanceMigrator } from '../scripts/engine/progression/engine/force-provenance-migrator.js';
import { isForcePowerImmutable, getImmutabilityReason } from '../scripts/engine/progression/hooks/immutability-hook.js';

describe('ForceProvenanceEngine', () => {
  describe('generateForceTairingGrantId', () => {
    it('should generate chargen grant ID', () => {
      const id = ForceProvenanceEngine.generateForceTairingGrantId(0, 'chargen');
      expect(id).toBe('ft-0-chargen');
    });

    it('should generate levelup grant ID with timestamp', () => {
      const id = ForceProvenanceEngine.generateForceTairingGrantId(3, '6754a23b');
      expect(id).toBe('ft-3-6754a23b');
    });
  });

  describe('createProvenanceMetadata', () => {
    it('should create FS metadata with isLocked=true', () => {
      const metadata = ForceProvenanceEngine.createProvenanceMetadata(
        'force-sensitivity',
        'fs-chargen',
        'baseline',
        true
      );

      expect(metadata.grantSourceType).toBe('force-sensitivity');
      expect(metadata.grantSourceId).toBe('fs-chargen');
      expect(metadata.grantSubtype).toBe('baseline');
      expect(metadata.isLocked).toBe(true);
      expect(metadata.migratedAt).toBeNull();
      expect(metadata.legacyIssues).toEqual([]);
    });

    it('should create FT metadata with isLocked=false', () => {
      const metadata = ForceProvenanceEngine.createProvenanceMetadata(
        'force-training',
        'ft-0-chargen',
        'baseline',
        false
      );

      expect(metadata.grantSourceType).toBe('force-training');
      expect(metadata.isLocked).toBe(false);
    });
  });

  describe('reconcileForceGrants', () => {
    it('should return empty ledger for null actor', async () => {
      const ledger = await ForceProvenanceEngine.reconcileForceGrants(null);
      expect(ledger.grants).toEqual({});
      expect(ledger.legacy.unknownPowers).toBe(0);
    });

    it('should calculate single FS grant entitlement', async () => {
      const mockActor = {
        items: [
          { type: 'feat', name: 'Force Sensitivity' }
        ]
      };

      const ledger = await ForceProvenanceEngine.reconcileForceGrants(mockActor, 'test');
      expect(ledger.grants['fs-chargen']).toBeDefined();
      expect(ledger.grants['fs-chargen'].entitled).toBe(1);
    });

    it('should not include FT in grants if no FT feats exist', async () => {
      const mockActor = {
        items: [
          { type: 'feat', name: 'Some Other Feat' }
        ]
      };

      const ledger = await ForceProvenanceEngine.reconcileForceGrants(mockActor, 'test');
      expect(Object.keys(ledger.grants).length).toBe(0);
    });
  });

  describe('getTotalEntitled', () => {
    it('should sum entitlements across all grants', () => {
      const ledger = {
        grants: {
          'fs-chargen': { entitled: 1 },
          'ft-0-chargen': { entitled: 3 }
        }
      };

      const total = ForceProvenanceEngine.getTotalEntitled(ledger);
      expect(total).toBe(4);
    });

    it('should return 0 for empty ledger', () => {
      const ledger = { grants: {} };
      expect(ForceProvenanceEngine.getTotalEntitled(ledger)).toBe(0);
    });
  });

  describe('getTotalOwned', () => {
    it('should sum owned across all grants', () => {
      const ledger = {
        grants: {
          'fs-chargen': { owned: 1 },
          'ft-0-chargen': { owned: 2 }
        }
      };

      const total = ForceProvenanceEngine.getTotalOwned(ledger);
      expect(total).toBe(3);
    });
  });

  describe('getTotalOwed', () => {
    it('should calculate gap between entitled and owned', () => {
      const ledger = {
        grants: {
          'fs-chargen': { entitled: 1, owned: 1 },
          'ft-0-chargen': { entitled: 3, owned: 2 }
        }
      };

      const owed = ForceProvenanceEngine.getTotalOwed(ledger);
      expect(owed).toBe(1); // 3 - 2 from FT
    });
  });

  describe('hasLegacyIssues', () => {
    it('should return true if unknown powers exist', () => {
      const ledger = {
        legacy: {
          unknownPowers: 1,
          issues: []
        }
      };

      expect(ForceProvenanceEngine.hasLegacyIssues(ledger)).toBe(true);
    });

    it('should return true if issues array is not empty', () => {
      const ledger = {
        legacy: {
          unknownPowers: 0,
          issues: ['Some issue']
        }
      };

      expect(ForceProvenanceEngine.hasLegacyIssues(ledger)).toBe(true);
    });

    it('should return false if no legacy issues', () => {
      const ledger = {
        legacy: {
          unknownPowers: 0,
          issues: []
        }
      };

      expect(ForceProvenanceEngine.hasLegacyIssues(ledger)).toBe(false);
    });
  });

  describe('formatGrantSourceName', () => {
    it('should format FS grant name', () => {
      const name = ForceProvenanceEngine.formatGrantSourceName('fs-chargen');
      expect(name).toBe('Force Sensitivity');
    });

    it('should format FT chargen grant name', () => {
      const name = ForceProvenanceEngine.formatGrantSourceName('ft-0-chargen');
      expect(name).toBe('Force Training (chargen)');
    });

    it('should format FT levelup grant name', () => {
      const name = ForceProvenanceEngine.formatGrantSourceName('ft-3-6754a23b');
      expect(name).toBe('Force Training (level 3)');
    });

    it('should format legacy grant name', () => {
      const name = ForceProvenanceEngine.formatGrantSourceName('ft-unknown-legacy');
      expect(name).toBe('Force Training (legacy)');
    });

    it('should return identifier for unknown grant', () => {
      const name = ForceProvenanceEngine.formatGrantSourceName('unknown-source');
      expect(name).toBe('unknown-source');
    });
  });
});

describe('ForceProvenanceMigrator', () => {
  describe('isMigrationNeeded', () => {
    it('should return false for null actor', () => {
      expect(ForceProvenanceMigrator.isMigrationNeeded(null)).toBe(false);
    });

    it('should return false if all powers have provenance', () => {
      const mockActor = {
        items: [
          {
            type: 'forcepower',
            system: { provenance: { grantSourceId: 'fs-chargen' } }
          }
        ]
      };

      expect(ForceProvenanceMigrator.isMigrationNeeded(mockActor)).toBe(false);
    });

    it('should return true if any power lacks provenance', () => {
      const mockActor = {
        items: [
          {
            type: 'forcepower',
            system: { provenance: null }
          }
        ]
      };

      expect(ForceProvenanceMigrator.isMigrationNeeded(mockActor)).toBe(true);
    });
  });

  describe('getMigrationSummary', () => {
    it('should return empty summary for actor without legacy powers', () => {
      const mockActor = {
        items: [
          { type: 'forcepower', system: { provenance: { grantSourceId: 'fs-chargen' } } }
        ]
      };

      const summary = ForceProvenanceMigrator.getMigrationSummary(mockActor);
      expect(summary.needsMigration).toBe(false);
      expect(summary.powers).toBe(0);
    });

    it('should report legacy issues for multiple FT feats', () => {
      const mockActor = {
        items: [
          { type: 'feat', name: 'Force Training' },
          { type: 'feat', name: 'Force Training' },
          { type: 'forcepower', system: { provenance: null } }
        ]
      };

      const summary = ForceProvenanceMigrator.getMigrationSummary(mockActor);
      expect(summary.needsMigration).toBe(true);
      expect(summary.ftGrants).toBe(2);
      expect(summary.ambiguities.length).toBeGreaterThan(0);
    });
  });
});

describe('Immutability Enforcement', () => {
  describe('isForcePowerImmutable', () => {
    it('should return false for non-forcepower items', () => {
      const item = { type: 'feat' };
      expect(isForcePowerImmutable(item)).toBe(false);
    });

    it('should return false for unlocked force powers', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: false } }
      };

      expect(isForcePowerImmutable(item)).toBe(false);
    });

    it('should return true for locked powers with no actor context', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: true, grantSourceId: 'fs-chargen' } },
        parent: null
      };

      expect(isForcePowerImmutable(item)).toBe(true);
    });

    it('should return true if FS feat exists on actor', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: true, grantSourceId: 'fs-chargen' } },
        parent: {
          items: [
            { type: 'feat', name: 'Force Sensitivity' }
          ]
        }
      };

      expect(isForcePowerImmutable(item)).toBe(true);
    });

    it('should return false if FS feat does not exist on actor', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: true, grantSourceId: 'fs-chargen' } },
        parent: {
          items: [
            { type: 'feat', name: 'Some Other Feat' }
          ]
        }
      };

      expect(isForcePowerImmutable(item)).toBe(false);
    });
  });

  describe('getImmutabilityReason', () => {
    it('should return null for mutable powers', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: false } }
      };

      expect(getImmutabilityReason(item)).toBeNull();
    });

    it('should return reason for FS-granted immutable power', () => {
      const item = {
        type: 'forcepower',
        system: { provenance: { isLocked: true, grantSourceId: 'fs-chargen' } },
        parent: {
          items: [
            { type: 'feat', name: 'Force Sensitivity' }
          ]
        }
      };

      const reason = getImmutabilityReason(item);
      expect(reason).toContain('Force Sensitivity');
      expect(reason).toContain('immutable');
    });
  });
});
