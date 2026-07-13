/**
 * SWSE Active Effects Manager — Foundry v13+ Refactor
 * - Emits real Foundry ActiveEffect `changes[]` (applied by core applyActiveEffects)
 * - v13-safe document handling
 * - Condition & combat effects rewritten
 * - Token HUD integration modernized
 * - Governance-compliant mutation routing
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { normalizeActiveEffectChangeForRuntime } from "/systems/foundryvtt-swse/scripts/utils/active-effect-change-utils.js";

export class SWSEActiveEffectsManager {

  /* -------------------------------------------------------------------------- */
  /* UTILITIES                                                                  */
  /* -------------------------------------------------------------------------- */

  static _buildEffect(actor, {
    name,
    icon,
    changes = [],
    intent = null,
    flags = {},
    duration = {},
    origin = actor?.uuid
  }) {
    const effectFlags = { swse: { ...flags } };
    if (intent) {
      // SWSE Basic effect intent — consumed by the ModifierEngine domains
      // (e.g. global.attack read at attack-roll time via getBasicEffectIntentBonus).
      // Preferred over writing loose actor fields such as system.attackBonus that
      // have no canonical roll-time reader.
      effectFlags['foundryvtt-swse'] = { effectIntent: intent };
    }
    return {
      name,
      icon,
      origin,
      duration,
      disabled: false,
      // Real Foundry ActiveEffect changes so core applyActiveEffects() folds
      // them into prepared actor data (consumed by DefenseCalculator's misc.auto
      // and combat-roll-math's system.attackPenalty).
      changes: (Array.isArray(changes) ? changes : []).map(normalizeActiveEffectChangeForRuntime),
      flags: effectFlags
    };
  }

  static async _applyTokenStatus(actor, icon) {
    for (const token of actor.getActiveTokens()) {
      await token.toggleEffect(icon, { active: true });
    }
  }

  static async _removeTokenStatus(actor, pattern = 'conditions/') {
    for (const token of actor.getActiveTokens()) {
      const current = token.document.texture?.effects ?? token.document.effects ?? [];
      const filtered = current.filter(icon => !icon.includes(pattern));
      await token.document.update({ effects: filtered });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION EFFECTS                                                          */
  /* -------------------------------------------------------------------------- */

  static CONDITION_EFFECTS = {
    normal: {
      name: 'Normal',
      icon: 'systems/foundryvtt-swse/icons/conditions/normal.svg',
      changes: [],
      flags: { conditionTrack: 'normal', statusId: 'normal' }
    },
    '-1': {
      name: 'Injured (-1)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-1.svg',
      changes: [],
      flags: { conditionTrack: '-1', statusId: 'condition-1' }
    },
    '-2': {
      name: 'Wounded (-2)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-2.svg',
      changes: [],
      flags: { conditionTrack: '-2', statusId: 'condition-2' }
    },
    '-5': {
      name: 'Severely Wounded (-5)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-5.svg',
      changes: [],
      flags: { conditionTrack: '-5', statusId: 'condition-5' }
    },
    '-10': {
      name: 'Critical (-10)',
      icon: 'systems/foundryvtt-swse/icons/conditions/injured-10.svg',
      changes: [],
      flags: { conditionTrack: '-10', statusId: 'condition-10' }
    },
    helpless: {
      name: 'Helpless',
      icon: 'systems/foundryvtt-swse/icons/conditions/helpless.svg',
      changes: [],
      flags: { conditionTrack: 'helpless', statusId: 'helpless' }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* COMBAT ACTION EFFECTS                                                      */
  /* -------------------------------------------------------------------------- */

  static COMBAT_ACTION_EFFECTS = {
    'fighting-defensively': {
      name: 'Fighting Defensively',
      icon: 'icons/svg/shield.svg',
      duration: { rounds: 1 },
      changes: [
        { key: 'system.attackPenalty', mode: 2, value: -5 },
        { key: 'system.defenses.reflex.misc.auto.combatAction', mode: 2, value: 2 }
      ],
      flags: { combatAction: 'fighting-defensively', attackPenalty: -5, reflexDodgeBonus: 2 }
    },
    'total-defense': {
      name: 'Total Defense',
      icon: 'icons/svg/shield.svg',
      duration: { rounds: 1 },
      changes: [
        { key: 'system.defenses.reflex.misc.auto.combatAction', mode: 2, value: 5 }
      ],
      flags: { combatAction: 'total-defense', reflexDodgeBonus: 5, gmAdjudicatesNoAttacks: true }
    },
    'cover-partial': {
      name: 'Partial Cover',
      icon: 'icons/svg/wall.svg',
      changes: [],
      flags: { combatAction: 'cover-partial' }
    },
    'cover-full': {
      name: 'Full Cover',
      icon: 'icons/svg/wall.svg',
      changes: [],
      flags: { combatAction: 'cover-full' }
    },
    'cover-improved': {
      name: 'Improved Cover',
      icon: 'icons/svg/wall.svg',
      changes: [],
      flags: { combatAction: 'cover-improved' }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DESTINY EFFECTS                                                            */
  /* -------------------------------------------------------------------------- */

  static DESTINY_EFFECTS = {
    'destiny-attack-bonus': {
      name: 'Destiny: Attack Bonus',
      icon: 'icons/svg/sword.svg',
      duration: { hours: 24 },
      // Routed through the ModifierEngine attack domain (global.attack) instead
      // of a loose system.attackBonus field that has no roll-time reader.
      intent: { category: 'attack', target: 'all', operation: 'increase', amount: 2, bonusType: 'untyped', application: 'always', scope: 'self', transfer: true },
      flags: { destinyEffect: 'attack-bonus', duration: '24h' }
    },
    'destiny-defense-bonus': {
      name: 'Destiny: Defense Bonus',
      icon: 'icons/svg/shield.svg',
      duration: { hours: 24 },
      // +2 to all three defenses via misc.auto, summed by DefenseCalculator.
      changes: [
        { key: 'system.defenses.reflex.misc.auto.destiny', mode: 2, value: 2 },
        { key: 'system.defenses.fortitude.misc.auto.destiny', mode: 2, value: 2 },
        { key: 'system.defenses.will.misc.auto.destiny', mode: 2, value: 2 }
      ],
      flags: { destinyEffect: 'defense-bonus', duration: '24h' }
    },
    'noble-sacrifice': {
      name: 'Noble Sacrifice',
      icon: 'icons/svg/heart.svg',
      duration: { hours: 24 },
      changes: [],
      flags: { destinyEffect: 'noble-sacrifice', duration: '24h' }
    },
    'vengeance': {
      name: 'Vengeance',
      icon: 'icons/svg/explosion.svg',
      duration: { hours: 24 },
      // Routed through the ModifierEngine attack domain (global.attack).
      intent: { category: 'attack', target: 'all', operation: 'increase', amount: 3, bonusType: 'untyped', application: 'always', scope: 'self', transfer: true },
      flags: { destinyEffect: 'vengeance', duration: '24h' }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CONDITION HANDLING                                                         */
  /* -------------------------------------------------------------------------- */

  static _mapConditionStep(step) {
    if (typeof step === 'string') return step;
    return {
      0: 'normal',
      1: '-1',
      2: '-2',
      3: '-5',
      4: '-10',
      5: 'helpless'
    }[step] ?? 'normal';
  }

  static async applyConditionEffect(actor, condition) {
    await this.removeConditionEffects(actor);

    const key = this._mapConditionStep(condition);
    if (key === 'normal') return;

    const data = this.CONDITION_EFFECTS[key];
    if (!data) return;

    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      changes: data.changes,
      flags: data.flags
    });

    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
    await this._applyTokenStatus(actor, data.icon);
  }

  static async removeConditionEffects(actor) {
    const toRemove = actor.effects.filter(e => e.flags?.swse?.conditionTrack);
    if (toRemove.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', toRemove.map(e => e.id));
    }
    await this._removeTokenStatus(actor);
  }


  /* -------------------------------------------------------------------------- */
  /* COMBAT ACTION EFFECT HANDLING                                              */
  /* -------------------------------------------------------------------------- */

  static _hasTrainedAcrobatics(actor) {
    const skill = actor?.system?.skills?.acrobatics;
    const derived = Array.isArray(actor?.system?.derived?.skills?.list)
      ? actor.system.derived.skills.list.find(s => s?.key === 'acrobatics')
      : actor?.system?.derived?.skills?.acrobatics;
    return skill?.trained === true || derived?.trained === true;
  }

  static _combatActionDataForActor(actor, key) {
    const data = foundry.utils.deepClone(this.COMBAT_ACTION_EFFECTS[key] ?? null);
    if (!data) return null;
    const setChangeValue = (changeKey, value) => {
      const change = (data.changes ?? []).find(c => c.key === changeKey);
      if (change) change.value = value;
    };
    if (key === 'fighting-defensively') {
      const bonus = this._hasTrainedAcrobatics(actor) ? 5 : 2;
      setChangeValue('system.defenses.reflex.misc.auto.combatAction', bonus);
      data.flags.reflexDodgeBonus = bonus;
      data.name = `Fighting Defensively (+${bonus} Ref)`;
    }
    if (key === 'total-defense') {
      const bonus = this._hasTrainedAcrobatics(actor) ? 10 : 5;
      setChangeValue('system.defenses.reflex.misc.auto.combatAction', bonus);
      data.flags.reflexDodgeBonus = bonus;
      data.name = `Total Defense (+${bonus} Ref)`;
    }
    return data;
  }

  static async removeCombatActionEffects(actor, keys = null) {
    const wanted = keys ? new Set(Array.isArray(keys) ? keys : [keys]) : null;
    const toRemove = actor.effects.filter(e => {
      const key = e.flags?.swse?.combatAction;
      return key && (!wanted || wanted.has(key));
    });
    if (toRemove.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', toRemove.map(e => e.id));
    }
  }

  static async applyCombatActionEffect(actor, key) {
    if (!actor) return null;
    const data = this._combatActionDataForActor(actor, key);
    if (!data) return null;
    if (key === 'fighting-defensively' || key === 'total-defense') {
      await this.removeCombatActionEffects(actor, ['fighting-defensively', 'total-defense']);
    } else {
      await this.removeCombatActionEffects(actor, key);
    }
    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      changes: data.changes,
      flags: data.flags,
      duration: data.duration
    });
    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
    await this._applyTokenStatus(actor, data.icon);
    return effect;
  }

  static async toggleCombatActionEffect(actor, key) {
    if (!actor) return null;
    const existing = actor.effects.find(e => e.flags?.swse?.combatAction === key);
    if (existing) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', [existing.id]);
      return null;
    }
    return this.applyCombatActionEffect(actor, key);
  }

  static async createCustomEffect(actor, data = {}) {
    if (!actor || !data?.name) return null;
    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon ?? 'icons/svg/aura.svg',
      changes: data.changes ?? [],
      intent: data.intent ?? null,
      flags: data.flags ?? {},
      duration: data.duration ?? {}
    });
    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
    return effect;
  }

  /* -------------------------------------------------------------------------- */
  /* DESTINY EFFECT HANDLING                                                    */
  /* -------------------------------------------------------------------------- */

  static async applyDestinyEffect(actor, key) {
    if (!actor) return null;
    const data = this.DESTINY_EFFECTS[key];
    if (!data) return null;

    // Replace any existing instance of the same destiny effect (idempotent).
    const existing = actor.effects.filter(e => e.flags?.swse?.destinyEffect === data.flags?.destinyEffect);
    if (existing.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', existing.map(e => e.id));
    }

    const effect = this._buildEffect(actor, {
      name: data.name,
      icon: data.icon,
      changes: data.changes ?? [],
      intent: data.intent ?? null,
      flags: data.flags,
      duration: data.duration
    });
    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effect]);
    await this._applyTokenStatus(actor, data.icon);
    return effect;
  }

  /* -------------------------------------------------------------------------- */
  /* INITIALIZATION                                                             */
  /* -------------------------------------------------------------------------- */

  static init() {
    swseLogger.log('SWSE | Initializing Active Effects Manager');

    this._registerStatusEffects();

    Hooks.on('updateActor', (actor, changes) => {
      const ct = changes?.system?.conditionTrack?.current;
      if (ct !== undefined) this.applyConditionEffect(actor, ct);
    });

    Hooks.on('combatTurn', async combat => {
      const actor = combat.combatant?.actor;
      if (!actor) return;

      const expired = actor.effects.filter(e =>
        e.duration?.rounds === 1 && !e.flags?.swse?.persistent
      );

      if (expired.length) {
        await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', expired.map(e => e.id));
      }
    });

    swseLogger.log('SWSE | Active Effects Manager Ready');
  }

  static _registerStatusEffects() {
    const effects = [];

    for (const [key, data] of Object.entries(this.CONDITION_EFFECTS)) {
      if (key === 'normal') continue;
      effects.push({
        id: data.flags?.statusId ?? key,
        label: data.name,
        icon: data.icon
      });
    }

    for (const [key, data] of Object.entries(this.COMBAT_ACTION_EFFECTS)) {
      effects.push({
        id: key,
        label: data.name,
        icon: data.icon
      });
    }

    for (const [key, data] of Object.entries(this.DESTINY_EFFECTS)) {
      effects.push({
        id: key,
        label: data.name,
        icon: data.icon
      });
    }

    const existingIds = new Set(CONFIG.statusEffects.map(e => e.id));
    const newEffects = effects.filter(e => !existingIds.has(e.id));
    CONFIG.statusEffects.push(...newEffects);
  }
}

/* Register under system namespace */
Hooks.once('init', () => {
  if (!game.swse) game.swse = {};
  game.swse.ActiveEffectsManager = SWSEActiveEffectsManager;
});