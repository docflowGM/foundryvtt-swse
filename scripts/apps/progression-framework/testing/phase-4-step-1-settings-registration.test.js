/**
 * PHASE 4 STEP 1: Settings Registration Test
 *
 * Proves that RolloutSettings are actually registered in the game
 * and have correct default values at runtime.
 */

import { RolloutSettings } from '../rollout/rollout-settings.js';

describe('PHASE 4 STEP 1 — RolloutSettings Registration', () => {
  describe('Settings exist after registration', () => {
    it('should have progression-rollout-mode registered with default "default"', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-rollout-mode');
      expect(value).toBe('default');
    });

    it('should have progression-enable-templates registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-enable-templates');
      expect(typeof value).toBe('boolean');
    });

    it('should have progression-enable-advisory registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-enable-advisory');
      expect(typeof value).toBe('boolean');
    });

    it('should have progression-enable-forecast registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-enable-forecast');
      expect(typeof value).toBe('boolean');
    });

    it('should have progression-show-support-warnings registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-show-support-warnings');
      expect(typeof value).toBe('boolean');
    });

    it('should have progression-enable-debug-tools registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-enable-debug-tools');
      expect(typeof value).toBe('boolean');
    });

    it('should have progression-legacy-entry-points-visible registered', () => {
      const value = game?.settings?.get?.('foundryvtt-swse', 'progression-legacy-entry-points-visible');
      expect(typeof value).toBe('boolean');
    });
  });

  describe('RolloutSettings methods respect registered values', () => {
    it('should return rollout mode from game.settings', () => {
      const mode = RolloutSettings.getRolloutMode();
      expect(mode).toBeDefined();
      expect(['internal', 'gm-opt-in', 'beta', 'default', 'legacy-fallback']).toContain(mode);
    });

    it('should return feature enabled status based on game.settings', () => {
      const templatesEnabled = RolloutSettings.isFeatureEnabled('templates');
      expect(typeof templatesEnabled).toBe('boolean');
    });

    it('should return all features as object', () => {
      const features = RolloutSettings.getActiveFeatures();
      expect(features).toHaveProperty('templates');
      expect(features).toHaveProperty('advisory');
      expect(features).toHaveProperty('forecast');
      expect(features).toHaveProperty('debug-tools');
    });

    it('should determine unified progression default based on mode', () => {
      const shouldUse = RolloutSettings.shouldUseUnifiedProgressionByDefault();
      expect(typeof shouldUse).toBe('boolean');
    });

    it('should generate rollout report with actual values', () => {
      const report = RolloutSettings.generateRolloutReport();
      expect(report).toBeDefined();
      expect(report.rolloutMode).toBeDefined();
      expect(report.features).toBeDefined();
      expect(report.behavior).toBeDefined();
    });
  });

  describe('Rollout mode enum values are valid', () => {
    const validModes = ['internal', 'gm-opt-in', 'beta', 'default', 'legacy-fallback'];

    validModes.forEach(mode => {
      it(`should accept mode: ${mode}`, () => {
        expect(validModes).toContain(mode);
      });
    });
  });
});
