/**
 * Status Effects House Rule Mechanics
 * Handles condition and status effect application and removal
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";

const NS = 'foundryvtt-swse';

const STATUS_EFFECT_ICONS = {
  fatigued: 'icons/svg/downgrade.svg',
  exhausted: 'icons/svg/skull.svg',
  dazed: 'icons/svg/daze.svg',
  stunned: 'icons/svg/stoned.svg',
  prone: 'icons/svg/falling.svg',
  immobilized: 'icons/svg/net.svg',
  helpless: 'icons/svg/unconscious.svg',
  blinded: 'icons/svg/blind.svg',
  deafened: 'icons/svg/deaf.svg',
  marked: 'icons/svg/target.svg'
};

function statusEffectSeverity(effectId) {
  if (['helpless', 'stunned', 'exhausted'].includes(effectId)) return 'danger';
  if (['dazed', 'blinded', 'immobilized', 'fatigued'].includes(effectId)) return 'warning';
  return 'info';
}

// Define available status effects
const STATUS_EFFECTS_LIBRARY = {
  combatConditions: [
    {
      id: 'fatigued',
      name: 'Fatigued',
      description: '-1 penalty to attack rolls and ability checks'
    },
    {
      id: 'exhausted',
      name: 'Exhausted',
      description: '-2 penalty to attack rolls and ability checks; movement halved'
    },
    {
      id: 'dazed',
      name: 'Dazed',
      description: 'Cannot take actions during your turn'
    },
    {
      id: 'stunned',
      name: 'Stunned',
      description: 'Cannot act; can only take free actions'
    },
    {
      id: 'prone',
      name: 'Prone',
      description: "-2 to ranged attacks; +2 bonus to opponents' melee attacks"
    },
    {
      id: 'immobilized',
      name: 'Immobilized',
      description: 'Cannot move; still can take actions'
    },
    {
      id: 'helpless',
      name: 'Helpless',
      description: 'Flat-footed; melee attacks gain +4 bonus'
    }
  ],
  expanded: [
    // Include all combat conditions plus additional effects
    {
      id: 'fatigued',
      name: 'Fatigued',
      description: '-1 penalty to attack rolls and ability checks'
    },
    {
      id: 'exhausted',
      name: 'Exhausted',
      description: '-2 penalty to attack rolls and ability checks; movement halved'
    },
    {
      id: 'dazed',
      name: 'Dazed',
      description: 'Cannot take actions during your turn'
    },
    {
      id: 'stunned',
      name: 'Stunned',
      description: 'Cannot act; can only take free actions'
    },
    {
      id: 'prone',
      name: 'Prone',
      description: "-2 to ranged attacks; +2 bonus to opponents' melee attacks"
    },
    {
      id: 'immobilized',
      name: 'Immobilized',
      description: 'Cannot move; still can take actions'
    },
    {
      id: 'helpless',
      name: 'Helpless',
      description: 'Flat-footed; melee attacks gain +4 bonus'
    },
    {
      id: 'blinded',
      name: 'Blinded',
      description: '-4 to attacks; enemies gain +2 to attacks against you'
    },
    {
      id: 'deafened',
      name: 'Deafened',
      description: 'Cannot hear; automatically fail Perception checks based on sound'
    },
    {
      id: 'marked',
      name: 'Marked',
      description: 'Enemy combatant has designated you; specific mechanical effect'
    }
  ]
};

export class StatusEffectsMechanics {
  static initialize() {
    Hooks.on('updateActor', (actor, data) => this.onActorUpdate(actor, data));
    Hooks.on('restCompleted', (data) => this.onRestCompleted(data));
    SWSELogger.debug('Status effects mechanics initialized');
  }

  /**
   * Get available status effects for current settings
   * @returns {Array<Object>} - Array of status effect definitions
   */
  static getAvailableEffects() {
    if (!ConditionTrackRules.statusEffectsEnabled()) {return [];}

    const list = ConditionTrackRules.getStatusEffectsList();
    return STATUS_EFFECTS_LIBRARY[list] || STATUS_EFFECTS_LIBRARY.combatConditions;
  }

  /**
   * Apply a status effect to an actor
   * @param {Actor} actor - The target actor
   * @param {string} effectId - The effect ID
   * @returns {Promise<boolean>} - Success status
   */
  static async applyEffect(actor, effectId) {
    if (!ConditionTrackRules.statusEffectsEnabled() || !actor) {return false;}

    const effect = this.findEffect(effectId);
    if (!effect) {
      SWSELogger.warn(`Effect not found: ${effectId}`);
      return false;
    }

    try {
      if (this.hasEffect(actor, effect.id)) { return true; }

      const activeEffect = {
        name: effect.name,
        label: effect.name,
        icon: STATUS_EFFECT_ICONS[effect.id] || 'icons/svg/aura.svg',
        type: 'condition',
        statuses: [effect.id],
        disabled: false,
        flags: {
          [NS]: {
            statusEffect: effect.id,
            temporary: true,
            appliedAt: Date.now(),
            effectState: {
              family: 'status',
              effectType: 'statusEffect',
              severity: statusEffectSeverity(effect.id),
              sourceType: 'gmStatusEffect',
              sourceName: effect.name,
              summary: effect.description || `Status effect: ${effect.name}`,
              details: effect.description ? [effect.description] : [],
              icon: STATUS_EFFECT_ICONS[effect.id] || 'icons/svg/aura.svg',
              tags: ['status', 'condition', effect.id],
              removable: true,
              removableBy: 'gm-or-owner'
            }
          },
          swse: {
            statusEffect: effect.id,
            temporary: true,
            severity: statusEffectSeverity(effect.id)
          }
        }
      };

      // PHASE 7+: Create through ActorEngine ActiveEffect wrapper.
      await ActorEngine.createActiveEffects(actor, [activeEffect], { source: 'StatusEffectsMechanics.applyEffect' });
      return true;
    } catch (err) {
      SWSELogger.error(`Failed to apply effect ${effectId}`, err);
      return false;
    }
  }

  /**
   * Remove a status effect from an actor
   * @param {Actor} actor - The target actor
   * @param {string} effectId - The effect ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeEffect(actor, effectId) {
    if (!actor) {return false;}

    try {
      const effects = actor.effects.filter(e =>
        e.getFlag?.(NS, 'statusEffect') === effectId
        || e.flags?.[NS]?.statusEffect === effectId
        || e.flags?.swse?.statusEffect === effectId
        || (Array.isArray(e.statuses) && e.statuses.includes(effectId))
      );

      if (effects.length > 0) {
        // PHASE 7+: Delete through ActorEngine ActiveEffect wrapper.
        await ActorEngine.deleteActiveEffects(actor, effects.map(e => e.id), { source: 'StatusEffectsMechanics.removeEffect' });
        return true;
      }
      return false;
    } catch (err) {
      SWSELogger.error(`Failed to remove effect ${effectId}`, err);
      return false;
    }
  }

  /**
   * Check if actor has a specific status effect
   * @param {Actor} actor - The actor to check
   * @param {string} effectId - The effect ID
   * @returns {boolean}
   */
  static hasEffect(actor, effectId) {
    if (!actor) {return false;}

    return actor.effects.some(e =>
      e.getFlag?.(NS, 'statusEffect') === effectId
      || e.flags?.[NS]?.statusEffect === effectId
      || e.flags?.swse?.statusEffect === effectId
      || (Array.isArray(e.statuses) && e.statuses.includes(effectId))
    );
  }

  /**
   * Find effect definition by ID
   * @private
   */
  static findEffect(effectId) {
    const effects = this.getAvailableEffects();
    return effects.find(e => e.id === effectId);
  }

  /**
   * Auto-apply effects when condition track changes
   * @param {Actor} actor - The actor
   * @param {number} newTrackLevel - New condition track level
   */
  static async autoApplyConditionEffects(actor, newTrackLevel) {
    const autoApply = ConditionTrackRules.autoApplyFromConditionTrackEnabled();
    if (!autoApply) {return;}

    // Map condition track levels to effects
    const effectMap = {
      1: 'fatigued',
      2: 'exhausted',
      3: 'stunned',
      4: 'helpless'
    };

    const effectId = effectMap[newTrackLevel];
    if (effectId) {
      await this.applyEffect(actor, effectId);
    }
  }

  /**
   * Handle actor update
   * @private
   */
  static async onActorUpdate(actor, data) {
    if (!ConditionTrackRules.statusEffectsEnabled()) {return;}

    // Track effect duration if needed
    const tracking = ConditionTrackRules.statusEffectDurationTrackingEnabled();
    if (tracking === 'rounds') {
      // Decrement effect duration each round in combat
      actor.effects.forEach(effect => {
        const duration = effect.getFlag(NS, 'duration');
        if (duration && duration > 0) {
          effect.setFlag(NS, 'duration', duration - 1);
        }
      });
    }
  }

  /**
   * Handle rest completion
   * @private
   */
  static async onRestCompleted(data) {
    const autoRemove = ConditionTrackRules.autoRemoveOnRestEnabled();
    if (!autoRemove) {return;}

    // Remove temporary effects on rest for organic actors only.
    // Droids/vehicles cannot benefit from resting; use repair/reboot workflows instead.
    const scopedActorIds = Array.isArray(data?.actorIds) ? new Set(data.actorIds.filter(Boolean)) : null;
    for (const actor of game.actors) {
      if (scopedActorIds && !scopedActorIds.has(actor.id)) continue;
      const isDroidOrVehicle = actor?.type === 'droid'
        || actor?.type === 'vehicle'
        || actor?.type === 'starship'
        || actor?.system?.isDroid === true
        || actor?.system?.isVehicle === true
        || actor?.system?.isStarship === true
        || String(actor?.system?.details?.species ?? '').toLowerCase() === 'droid';
      if (isDroidOrVehicle) continue;

      const tempEffects = actor.effects.filter(e =>
        e.getFlag(NS, 'temporary') === true
      );

      if (tempEffects.length > 0) {
        // Import ActorEngine dynamically to avoid circular dependencies
        const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
        // SOVEREIGNTY: Route ActiveEffect deletion through ActorEngine
        await ActorEngine.deleteActiveEffects(actor, tempEffects.map(e => e.id), { source: 'rest-effects-cleanup' });
      }
    }
  }

  /**
   * Get effect modifiers for actor calculations
   * @param {Actor} actor - The actor
   * @returns {Object} - Modifier object for skills/attacks
   */
  static getEffectModifiers(actor) {
    const modifiers = {
      attack: 0,
      ability: 0,
      ac: 0
    };

    if (!ConditionTrackRules.statusEffectsEnabled() || !actor) {return modifiers;}

    // Apply penalties based on active effects
    if (this.hasEffect(actor, 'fatigued')) {
      modifiers.attack -= 1;
      modifiers.ability -= 1;
    }

    if (this.hasEffect(actor, 'exhausted')) {
      modifiers.attack -= 2;
      modifiers.ability -= 2;
    }

    if (this.hasEffect(actor, 'prone')) {
      modifiers.ac += 2; // Penalty to AC (worsens defense)
    }

    if (this.hasEffect(actor, 'dazed') || this.hasEffect(actor, 'stunned')) {
      modifiers.attack -= 4; // Cannot act effectively
    }

    return modifiers;
  }
}
