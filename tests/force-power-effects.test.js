/**
 * Tests for Force Power Effects Engine
 */

import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";

describe('ForcePowerEffectsEngine', () => {
  describe('_extractShieldRatingFromChart', () => {
    it('should extract SR 5 at DC 15', () => {
      const dcChart = [
        { dc: 15, effect: "SR 5", description: "You gain a Shield Rating (SR) of 5 until the beginning of your next turn." },
        { dc: 20, effect: "SR 10", description: "You gain a Shield Rating (SR) of 10 until the beginning of your next turn." },
        { dc: 25, effect: "SR 15", description: "You gain a Shield Rating (SR) of 15 until the beginning of your next turn." },
        { dc: 30, effect: "SR 20", description: "You gain a Shield Rating (SR) of 20 until the beginning of your next turn." }
      ];

      expect(ForcePowerEffectsEngine._extractShieldRatingFromChart(dcChart, 15)).toBe(5);
    });

    it('should extract SR 10 at DC 20', () => {
      const dcChart = [
        { dc: 15, effect: "SR 5", description: "You gain a Shield Rating (SR) of 5 until the beginning of your next turn." },
        { dc: 20, effect: "SR 10", description: "You gain a Shield Rating (SR) of 10 until the beginning of your next turn." },
        { dc: 25, effect: "SR 15", description: "You gain a Shield Rating (SR) of 15 until the beginning of your next turn." },
        { dc: 30, effect: "SR 20", description: "You gain a Shield Rating (SR) of 20 until the beginning of your next turn." }
      ];

      expect(ForcePowerEffectsEngine._extractShieldRatingFromChart(dcChart, 20)).toBe(10);
    });

    it('should extract SR 20 at DC 30', () => {
      const dcChart = [
        { dc: 15, effect: "SR 5", description: "You gain a Shield Rating (SR) of 5 until the beginning of your next turn." },
        { dc: 20, effect: "SR 10", description: "You gain a Shield Rating (SR) of 10 until the beginning of your next turn." },
        { dc: 25, effect: "SR 15", description: "You gain a Shield Rating (SR) of 15 until the beginning of your next turn." },
        { dc: 30, effect: "SR 20", description: "You gain a Shield Rating (SR) of 20 until the beginning of your next turn." }
      ];

      expect(ForcePowerEffectsEngine._extractShieldRatingFromChart(dcChart, 30)).toBe(20);
    });

    it('should extract highest SR at high roll', () => {
      const dcChart = [
        { dc: 15, effect: "SR 5", description: "You gain a Shield Rating (SR) of 5 until the beginning of your next turn." },
        { dc: 20, effect: "SR 10", description: "You gain a Shield Rating (SR) of 10 until the beginning of your next turn." },
        { dc: 25, effect: "SR 15", description: "You gain a Shield Rating (SR) of 15 until the beginning of your next turn." },
        { dc: 30, effect: "SR 20", description: "You gain a Shield Rating (SR) of 20 until the beginning of your next turn." }
      ];

      expect(ForcePowerEffectsEngine._extractShieldRatingFromChart(dcChart, 35)).toBe(20);
    });

    it('should return 0 below minimum DC', () => {
      const dcChart = [
        { dc: 15, effect: "SR 5", description: "You gain a Shield Rating (SR) of 5 until the beginning of your next turn." },
        { dc: 20, effect: "SR 10", description: "You gain a Shield Rating (SR) of 10 until the beginning of your next turn." },
        { dc: 25, effect: "SR 15", description: "You gain a Shield Rating (SR) of 15 until the beginning of your next turn." },
        { dc: 30, effect: "SR 20", description: "You gain a Shield Rating (SR) of 20 until the beginning of your next turn." }
      ];

      expect(ForcePowerEffectsEngine._extractShieldRatingFromChart(dcChart, 10)).toBe(0);
    });
  });

  describe('_extractDRFromChart', () => {
    it('should extract DR 5 at DC 20', () => {
      const dcChart = [
        { dc: 20, effect: "DR 5", description: "Gain Damage Reduction 5 vs energy damage." },
        { dc: 25, effect: "DR 10", description: "Gain Damage Reduction 10 vs energy damage." },
        { dc: 30, effect: "DR 15", description: "Gain Damage Reduction 15 vs energy damage." },
        { dc: 35, effect: "DR 20", description: "Gain Damage Reduction 20 vs energy damage." }
      ];

      expect(ForcePowerEffectsEngine._extractDRFromChart(dcChart, 20)).toBe(5);
    });

    it('should extract DR 10 at DC 25', () => {
      const dcChart = [
        { dc: 20, effect: "DR 5", description: "Gain Damage Reduction 5 vs energy damage." },
        { dc: 25, effect: "DR 10", description: "Gain Damage Reduction 10 vs energy damage." },
        { dc: 30, effect: "DR 15", description: "Gain Damage Reduction 15 vs energy damage." },
        { dc: 35, effect: "DR 20", description: "Gain Damage Reduction 20 vs energy damage." }
      ];

      expect(ForcePowerEffectsEngine._extractDRFromChart(dcChart, 25)).toBe(10);
    });
  });

  describe('_parseDuration', () => {
    it('should parse "Until beginning of next turn" as 1 turn', () => {
      const result = ForcePowerEffectsEngine._parseDuration('Until beginning of next turn');
      expect(result.type).toBe('turns');
      expect(result.duration).toBe(1);
    });

    it('should parse "Until end of next turn" as 2 turns', () => {
      const result = ForcePowerEffectsEngine._parseDuration('Until end of next turn');
      expect(result.type).toBe('turns');
      expect(result.duration).toBe(2);
    });

    it('should parse "Instantaneous" as 1 turn', () => {
      const result = ForcePowerEffectsEngine._parseDuration('Instantaneous');
      expect(result.type).toBe('turns');
      expect(result.duration).toBe(1);
    });

    it('should handle case-insensitive parsing', () => {
      const result = ForcePowerEffectsEngine._parseDuration('UNTIL BEGINNING OF NEXT TURN');
      expect(result.type).toBe('turns');
      expect(result.duration).toBe(1);
    });
  });
});
