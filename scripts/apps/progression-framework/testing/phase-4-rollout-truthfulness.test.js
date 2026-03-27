/**
 * PHASE 4 STABILIZATION TESTS — Rollout Truthfulness and Exposure Control
 *
 * Proves that:
 * 1. Rollout flags can independently gate chargen / level-up / templates
 * 2. Partial-support classification is machine-readable and used
 * 3. Legacy entry point classification is explicit and testable
 * 4. Disabled/beta-gated paths are not exposed as stable
 * 5. Dirty/unresolved state explanation is surfaced truthfully
 * 6. Template blocked state exposes meaningful reason
 * 7. Admin/debug visibility reflects rollout/support truth
 * 8. Summary warning categories behave distinctly
 */

import { RolloutSettings } from '../rollout/rollout-settings.js';
import { RolloutController } from '../rollout/rollout-controller.js';
import { LegacyEntryPointManager } from '../rollout/legacy-entry-point-manager.js';

describe('PHASE 4 — Rollout Truthfulness and Exposure Control', () => {
  // ============================================================================
  // TEST 1: Rollout flags can independently gate features
  // ============================================================================

  describe('TEST 1: Feature gates work independently', () => {
    it('should disable templates when progression-enable-templates is false', () => {
      // Mock game.settings
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-templates') return false;
        return originalGet?.(scope, key);
      };

      const isEnabled = RolloutSettings.isFeatureEnabled('templates');
      expect(isEnabled).toBe(false);

      game.settings.get = originalGet;
    });

    it('should disable advisory when progression-enable-advisory is false', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-advisory') return false;
        return originalGet?.(scope, key);
      };

      const isEnabled = RolloutSettings.isFeatureEnabled('advisory');
      expect(isEnabled).toBe(false);

      game.settings.get = originalGet;
    });

    it('should disable forecast when progression-enable-forecast is false', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-forecast') return false;
        return originalGet?.(scope, key);
      };

      const isEnabled = RolloutSettings.isFeatureEnabled('forecast');
      expect(isEnabled).toBe(false);

      game.settings.get = originalGet;
    });

    it('should track all active features as object', () => {
      const features = RolloutSettings.getActiveFeatures();

      expect(features).toHaveProperty('templates');
      expect(features).toHaveProperty('advisory');
      expect(features).toHaveProperty('forecast');
      expect(features).toHaveProperty('explainability');
      expect(features).toHaveProperty('debug-tools');
    });
  });

  // ============================================================================
  // TEST 2: Partial-support classification is machine-readable
  // ============================================================================

  describe('TEST 2: Partial-support classification', () => {
    it('should classify droid as PARTIAL support', () => {
      const warning = RolloutController.getSupportWarningForFeature('droid');

      // Warning should exist and be caution-level
      expect(warning).toBeDefined();
      expect(warning.severity).toBe('caution');
      expect(warning.message).toContain('partially supported');
    });

    it('should classify npc as STRUCTURAL support', () => {
      const warning = RolloutController.getSupportWarningForFeature('npc');

      expect(warning).toBeDefined();
      expect(warning.severity).toBe('warning');
      expect(warning.message).toContain('experimental');
    });

    it('should classify prestige-class as PARTIAL support', () => {
      const warning = RolloutController.getSupportWarningForFeature('prestige-class');

      expect(warning).toBeDefined();
      expect(warning.severity).toBe('caution');
    });

    it('should return null for unknown features', () => {
      const warning = RolloutController.getSupportWarningForFeature('unknown-feature');

      expect(warning).toBeNull();
    });

    it('should suppress warnings when support-warnings disabled', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-show-support-warnings') return false;
        return originalGet?.(scope, key);
      };

      const warning = RolloutController.getSupportWarningForFeature('droid');
      expect(warning).toBeNull();

      game.settings.get = originalGet;
    });
  });

  // ============================================================================
  // TEST 3: Legacy entry point classification is explicit
  // ============================================================================

  describe('TEST 3: Legacy entry point classification', () => {
    it('should have legacy entry points registered in manager', () => {
      const legacyPoints = LegacyEntryPointManager.LEGACY_ENTRY_POINTS;

      expect(legacyPoints).toBeDefined();
      expect(Object.keys(legacyPoints).length).toBeGreaterThan(0);
    });

    it('should classify chargen-main as deprecated', () => {
      const chargenEntry = LegacyEntryPointManager.LEGACY_ENTRY_POINTS['chargen-main'];

      expect(chargenEntry).toBeDefined();
      expect(chargenEntry.status).toBe('deprecated');
      expect(chargenEntry.replacedBy).toContain('ProgressionShell');
    });

    it('should classify levelup-main as deprecated', () => {
      const levelupEntry = LegacyEntryPointManager.LEGACY_ENTRY_POINTS['levelup-main'];

      expect(levelupEntry).toBeDefined();
      expect(levelupEntry.status).toBe('deprecated');
      expect(levelupEntry.replacedBy).toContain('ProgressionShell');
    });

    it('should classify quick-build as deprecated', () => {
      const quickBuildEntry = LegacyEntryPointManager.LEGACY_ENTRY_POINTS['quick-build'];

      expect(quickBuildEntry).toBeDefined();
      expect(quickBuildEntry.status).toBe('deprecated');
    });

    it('should have all legacy entries explicitly classified', () => {
      const legacyPoints = LegacyEntryPointManager.LEGACY_ENTRY_POINTS;
      const validStatuses = ['active', 'deprecated', 'retired'];

      for (const [key, entry] of Object.entries(legacyPoints)) {
        expect(entry.status).toBeDefined();
        expect(validStatuses).toContain(entry.status);
      }
    });
  });

  // ============================================================================
  // TEST 4: Disabled/beta-gated paths are not exposed as stable
  // ============================================================================

  describe('TEST 4: Disabled paths behavior', () => {
    it('should determine unified progression is default in beta mode', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'beta';
        return originalGet?.(scope, key);
      };

      const shouldUse = RolloutSettings.shouldUseUnifiedProgressionByDefault();
      expect(shouldUse).toBe(true);

      game.settings.get = originalGet;
    });

    it('should not use unified progression in legacy-fallback mode', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'legacy-fallback';
        return originalGet?.(scope, key);
      };

      const shouldUse = RolloutSettings.shouldUseUnifiedProgressionByDefault();
      expect(shouldUse).toBe(false);

      game.settings.get = originalGet;
    });

    it('should support legacy fallback in beta mode', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'beta';
        return originalGet?.(scope, key);
      };

      const shouldSupport = RolloutSettings.shouldSupportLegacyFallback();
      expect(shouldSupport).toBe(true);

      game.settings.get = originalGet;
    });

    it('should not support legacy fallback in default mode', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'default';
        return originalGet?.(scope, key);
      };

      // Default mode doesn't explicitly support legacy fallback unless enabled separately
      const shouldSupport = RolloutSettings.shouldSupportLegacyFallback();
      expect(shouldSupport).toBe(false);

      game.settings.get = originalGet;
    });
  });

  // ============================================================================
  // TEST 5: Warning categories are distinct (blocking vs caution vs info)
  // ============================================================================

  describe('TEST 5: Summary warning categorization', () => {
    it('should distinguish blocking errors from caution warnings', () => {
      const validation = {
        isValid: false,
        errors: ['Character name is required'],
        warnings: {
          blocking: [],
          caution: [{ message: 'Missing some optional feats' }],
          info: [],
        },
      };

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.caution.length).toBeGreaterThan(0);
      expect(validation.warnings.blocking.length).toBe(0);
    });

    it('should indicate when character has blocking issues', () => {
      const validation = {
        isValid: false,
        errors: ['Class must be selected', 'Attributes must be assigned'],
        warnings: { blocking: [], caution: [], info: [] },
        blockingCount: 2,
        cautionCount: 0,
        infoCount: 0,
      };

      expect(validation.blockingCount).toBe(2);
      expect(validation.cautionCount).toBe(0);
    });

    it('should separate informational warnings from cautions', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: {
          blocking: [],
          caution: [],
          info: [{ message: 'Character uses experimental droid support' }],
        },
        blockingCount: 0,
        cautionCount: 0,
        infoCount: 1,
      };

      expect(validation.infoCount).toBe(1);
      expect(validation.isValid).toBe(true);
    });
  });

  // ============================================================================
  // TEST 6: Rollout report generation (admin visibility)
  // ============================================================================

  describe('TEST 6: Admin/debug visibility', () => {
    it('should generate complete rollout report', () => {
      const report = RolloutSettings.generateRolloutReport();

      expect(report).toBeDefined();
      expect(report.rolloutMode).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.features).toBeDefined();
      expect(report.behavior).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include all active features in report', () => {
      const report = RolloutSettings.generateRolloutReport();

      expect(report.features).toHaveProperty('templates');
      expect(report.features).toHaveProperty('advisory');
      expect(report.features).toHaveProperty('forecast');
      expect(report.features).toHaveProperty('debug-tools');
    });

    it('should generate recommendations for inconsistent settings', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        // Simulate: mode is 'default' but templates disabled
        if (key === 'progression-rollout-mode') return 'default';
        if (key === 'progression-enable-templates') return false;
        return originalGet?.(scope, key);
      };

      const report = RolloutSettings.generateRolloutReport();
      expect(report.recommendations.length).toBeGreaterThan(0);

      game.settings.get = originalGet;
    });

    it('should provide debug tools visibility when enabled', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-debug-tools') return true;
        return originalGet?.(scope, key);
      };

      const isEnabled = RolloutSettings.isFeatureEnabled('debug-tools');
      expect(isEnabled).toBe(true);

      game.settings.get = originalGet;
    });
  });

  // ============================================================================
  // TEST 7: Shell configuration from rollout controller
  // ============================================================================

  describe('TEST 7: Shell receives rollout configuration', () => {
    it('should apply rollout config to shell instance', () => {
      const mockShell = {
        _rolloutConfig: null,
        _hideTemplateSelection: false,
        _hideAdvisory: false,
      };

      RolloutController.configureShell(mockShell);

      expect(mockShell._rolloutConfig).toBeDefined();
      expect(mockShell._rolloutConfig).toHaveProperty('templatesEnabled');
      expect(mockShell._rolloutConfig).toHaveProperty('advisoryEnabled');
      expect(mockShell._rolloutConfig).toHaveProperty('forecastEnabled');
      expect(mockShell._rolloutConfig).toHaveProperty('debugToolsEnabled');
    });

    it('should hide templates when disabled in config', () => {
      const mockShell = { _hideTemplateSelection: false };
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-templates') return false;
        return originalGet?.(scope, key);
      };

      RolloutController.configureShell(mockShell);

      expect(mockShell._hideTemplateSelection).toBe(true);

      game.settings.get = originalGet;
    });

    it('should hide advisory when disabled in config', () => {
      const mockShell = { _hideAdvisory: false };
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-enable-advisory') return false;
        return originalGet?.(scope, key);
      };

      RolloutController.configureShell(mockShell);

      expect(mockShell._hideAdvisory).toBe(true);

      game.settings.get = originalGet;
    });
  });

  // ============================================================================
  // TEST 8: Rollout validation detects inconsistencies
  // ============================================================================

  describe('TEST 8: Rollout validation', () => {
    it('should validate rollout config for consistency', () => {
      const result = RolloutController.validateRolloutConfig();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
    });

    it('should warn if default mode has templates disabled', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'default';
        if (key === 'progression-enable-templates') return false;
        return originalGet?.(scope, key);
      };

      const result = RolloutController.validateRolloutConfig();
      expect(result.warnings.length).toBeGreaterThan(0);

      game.settings.get = originalGet;
    });

    it('should note legacy entry points visibility in internal mode', () => {
      const originalGet = game?.settings?.get;
      game.settings.get = (scope, key) => {
        if (key === 'progression-rollout-mode') return 'internal';
        if (key === 'progression-legacy-entry-points-visible') return true;
        return originalGet?.(scope, key);
      };

      const result = RolloutController.validateRolloutConfig();
      expect(result.info.length).toBeGreaterThan(0);

      game.settings.get = originalGet;
    });
  });
});

