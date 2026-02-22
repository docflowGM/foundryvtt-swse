/**
 * ActiveEffectsEngine — Phase D Persistent Effects
 * Temporary modifiers with duration tracking and auto-expiration
 */

import { ActorEngine } from '../../actors/engine/actor-engine.js';

export class ActiveEffectsEngine {
  /**
   * Add active effect to actor
   * @param {Actor} actor
   * @param {Object} effect - { name, target, type, value, duration (rounds), modifierSource }
   */
  static async addEffect(actor, effect) {
    if (!actor || !effect) return null;

    const effects = Array.isArray(actor.system.activeEffects)
      ? [...actor.system.activeEffects]
      : [];

    const newEffect = {
      id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: effect.name || 'Effect',
      source: 'activeEffect',
      sourceName: effect.name,
      target: effect.target,
      type: effect.type || 'untyped',
      value: effect.value || 0,
      duration: effect.duration || 1,
      roundsRemaining: effect.duration || 1,
      enabled: true,
      createdAtRound: game.combat?.round || 0
    };

    effects.push(newEffect);
    await ActorEngine.updateActor(actor, { 'system.activeEffects': effects });
    return newEffect;
  }

  /**
   * Remove effect
   */
  static async removeEffect(actor, effectId) {
    const effects = Array.isArray(actor.system.activeEffects)
      ? actor.system.activeEffects.filter(e => e.id !== effectId)
      : [];

    await ActorEngine.updateActor(actor, { 'system.activeEffects': effects });
  }

  /**
   * Decrement effect duration (call at round start/end)
   */
  static async decrementEffects(actor) {
    const effects = Array.isArray(actor.system.activeEffects)
      ? actor.system.activeEffects
      : [];

    const updated = effects.map(e => ({
      ...e,
      roundsRemaining: Math.max(0, (e.roundsRemaining || 0) - 1)
    })).filter(e => e.roundsRemaining > 0);

    if (updated.length !== effects.length) {
      await ActorEngine.updateActor(actor, { 'system.activeEffects': updated });
      return { expired: effects.length - updated.length, remaining: updated.length };
    }

    return { expired: 0, remaining: updated.length };
  }

  /**
   * Get all active effects as modifiers (for ModifierEngine)
   */
  static getEffectModifiers(actor) {
    const effects = Array.isArray(actor.system.activeEffects)
      ? actor.system.activeEffects.filter(e => e.enabled !== false && e.roundsRemaining > 0)
      : [];

    return effects.map(e => ({
      id: e.id,
      source: 'activeEffect',
      sourceId: e.id,
      sourceName: `${e.name} (${e.roundsRemaining}r)`,
      target: e.target,
      type: e.type,
      value: e.value,
      enabled: true,
      description: `${e.name} (${e.roundsRemaining} rounds remaining)`
    }));
  }

  static async toggleEffect(actor, effectId) {
    const effects = Array.isArray(actor.system.activeEffects)
      ? actor.system.activeEffects.map(e => {
          if (e.id === effectId) {
            return { ...e, enabled: e.enabled !== false ? false : true };
          }
          return e;
        })
      : [];

    await ActorEngine.updateActor(actor, { 'system.activeEffects': effects });
  }
}
