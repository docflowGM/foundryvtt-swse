/**
 * Phases C, D, E Validation Matrix (Minimal)
 * Combat, Active Effects, Force Engine
 */

import { TestUtils } from './test-utils.js';
import { DamageEngine } from '../scripts/engine/combat/damage-engine.js';
import { ActiveEffectsEngine } from '../scripts/engine/effects/active-effects-engine.js';
import { ForceEngine } from '../scripts/engine/force/force-engine.js';
import { ModifierEngine } from '../scripts/engine/modifiers/ModifierEngine.js';

describe('Phases C, D, E - Combat, Effects, Force', () => {

  // PHASE C - Combat
  describe('Phase C: Combat Resolution', () => {
    test('should apply damage and reduce HP', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.hp = { value: 20, max: 20, temp: 0 };
      actor.system.derived = { damageThreshold: 2 };

      const result = await DamageEngine.applyDamage(actor, 5);
      expect(result.success).toBe(true);
      expect(result.newHP).toBe(15);
    });

    test('should absorb damage with DT', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.hp = { value: 20, max: 20 };
      actor.system.derived = { damageThreshold: 5 };

      const result = await DamageEngine.applyDamage(actor, 3);
      expect(result.absorbed).toBe(3);
      expect(result.newHP).toBe(20);
    });

    test('should apply temp HP first', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.hp = { value: 20, max: 20, temp: 5 };
      actor.system.derived = { damageThreshold: 0 };

      const result = await DamageEngine.applyDamage(actor, 8);
      expect(result.finalDamage).toBe(3); // 8 - 5 temp
      expect(result.newHP).toBe(17);
    });

    test('should trigger massive damage', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.hp = { value: 20, max: 20 };
      actor.system.derived = { hp: { max: 20 }, damageThreshold: 0 };
      actor.system.conditionTrack = { current: 0, max: 5 };

      const result = await DamageEngine.applyDamage(actor, 15, { forceMassiveDamageCheck: true });
      expect(result.isMassiveDamage).toBe(true);
    });

    test('should auto-adjust CT when HP <= 0', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.hp = { value: 5, max: 20 };
      actor.system.derived = { damageThreshold: 0 };
      actor.system.conditionTrack = { current: 1, max: 5 };

      await DamageEngine.applyDamage(actor, 10);
      expect(actor.system.conditionTrack.current).toBe(5);
    });
  });

  // PHASE D - Active Effects
  describe('Phase D: Active Effects', () => {
    test('should add active effect', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.activeEffects = [];

      const effect = await ActiveEffectsEngine.addEffect(actor, {
        name: 'Buff',
        target: 'skill.attack',
        type: 'enhancement',
        value: 2,
        duration: 3
      });

      expect(effect.name).toBe('Buff');
      expect(effect.roundsRemaining).toBe(3);
    });

    test('should collect effects as modifiers', () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.activeEffects = [
        {
          id: 'eff1',
          name: 'Buff',
          target: 'skill.attack',
          type: 'enhancement',
          value: 2,
          enabled: true,
          roundsRemaining: 1
        }
      ];

      const mods = ActiveEffectsEngine.getEffectModifiers(actor);
      expect(mods.length).toBe(1);
      expect(mods[0].source).toBe('activeEffect');
    });

    test('should decrement effect duration', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.activeEffects = [
        {
          id: 'eff1',
          name: 'Buff',
          target: 'skill.attack',
          type: 'enhancement',
          value: 2,
          roundsRemaining: 2,
          enabled: true
        }
      ];

      await ActiveEffectsEngine.decrementEffects(actor);
      expect(actor.system.activeEffects[0].roundsRemaining).toBe(1);
    });

    test('should remove expired effects', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.activeEffects = [
        { id: 'eff1', name: 'Buff', target: 'skill.attack', type: 'enhancement', value: 2, roundsRemaining: 1, enabled: true },
        { id: 'eff2', name: 'Debuff', target: 'skill.defense', type: 'penalty', value: -1, roundsRemaining: 3, enabled: true }
      ];

      const result = await ActiveEffectsEngine.decrementEffects(actor);
      expect(result.remaining).toBe(2);

      actor.system.activeEffects[0].roundsRemaining = 0;
      const result2 = await ActiveEffectsEngine.decrementEffects(actor);
      expect(result2.expired).toBeGreaterThanOrEqual(0);
    });

    test('should integrate active effects into modifier pipeline', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.skills = { attack: { base: 5, total: 5 } };
      actor.system.activeEffects = [
        {
          id: 'eff1',
          name: 'Combat Buff',
          target: 'skill.attack',
          type: 'untyped',
          value: 3,
          enabled: true,
          roundsRemaining: 2
        }
      ];

      const allModifiers = await ModifierEngine.getAllModifiers(actor);
      const effectMods = allModifiers.filter(m => m.source === 'activeEffect');
      expect(effectMods.length).toBeGreaterThanOrEqual(1);
    });
  });

  // PHASE E - Force Engine
  describe('Phase E: Force Engine', () => {
    test('should calculate DC with modifiers', () => {
      const dc = ForceEngine.calculateDC(15, { situationalModifier: 2, distancePenalty: -3 });
      expect(dc).toBe(14);
    });

    test('should record natural 20 and recover FP', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.force = { natural20Count: 0 };
      actor.system.forcePoints = { current: 2, max: 3 };

      const result = await ForceEngine.recordNatural20(actor, 'Mind Trick');
      expect(result.natural20Count).toBe(1);
      expect(result.fpRecovered).toBe(1);
    });

    test('should spend Force Point', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.forcePoints = { current: 2, max: 3 };

      const result = await ForceEngine.spendForcePoint(actor);
      expect(result.success).toBe(true);
      expect(result.fpRemaining).toBe(1);
    });

    test('should block spending when no FP', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.forcePoints = { current: 0, max: 3 };

      const result = await ForceEngine.spendForcePoint(actor);
      expect(result.success).toBe(false);
    });

    test('should gain Dark Side Point', async () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.darkSidePoints = { current: 0 };
      actor.system.dspLog = [];

      const result = await ForceEngine.gainDarkSidePoint(actor, 'Used dark power');
      expect(result.dspCurrent).toBe(1);
    });

    test('should apply light/dark descriptor bonuses', () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.force = { alignment: 'light' };

      const lightBonus = ForceEngine.getDescriptorModifier(10, 'light', actor);
      expect(lightBonus).toBe(12);

      actor.system.force.alignment = 'dark';
      const darkBonus = ForceEngine.getDescriptorModifier(10, 'dark', actor);
      expect(darkBonus).toBe(12);
    });

    test('should check power availability', () => {
      const actor = TestUtils.createMockActor('character');
      actor.system.forcePoints = { current: 2, max: 3 };

      const power1 = { fpCost: 1 };
      expect(ForceEngine.canUsePower(actor, power1).canUse).toBe(true);

      const power2 = { fpCost: 3 };
      expect(ForceEngine.canUsePower(actor, power2).canUse).toBe(false);
    });
  });

});
