/**
 * Deprecated Condition Track House Rule Compatibility Layer
 *
 * Previous versions maintained a parallel condition-track authority in actor flags
 * (`flags.foundryvtt-swse.conditionTrackLevel`) and recomputed state independently.
 * That model has been retired.
 *
 * Canonical authority is now:
 *   ActorEngine / ConditionEngine -> system.conditionTrack.current|persistent
 *
 * This file remains only as a compatibility facade for older callers and house-rule hooks.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ConditionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionEngine.js";

export class ConditionTrackMechanics {
  static initialize() {
    Hooks.once('ready', () => {
      SWSELogger.warn('[DEPRECATED] ConditionTrackMechanics.initialize() is now a compatibility shim. Condition authority lives in ConditionEngine/ActorEngine.');
    });
  }

  static getConditionTrackLevel(actor) {
    return Number(actor?.system?.conditionTrack?.current ?? 0);
  }

  static calculateTrackLevel(actor) {
    return Number(ConditionEngine.calculateConditionStep(actor)?.currentStep ?? 0);
  }

  static async updateConditionTrack(actor) {
    if (!actor) return false;
    const current = this.getConditionTrackLevel(actor);
    const calculated = this.calculateTrackLevel(actor);
    if (current === calculated) return false;
    await ConditionEngine.applyConditionStep(actor, calculated, { source: 'ConditionTrackMechanics.updateConditionTrack' });
    return true;
  }

  static getTrackPenalties(actor) {
    const result = ConditionEngine.calculateConditionStep(actor);
    const penalty = Number(result?.penalty ?? 0);
    return {
      attack: penalty,
      ac: penalty,
      ability: penalty,
      damage: 0,
      movement: penalty <= -5 ? -10 : (penalty < 0 ? -5 : 0)
    };
  }

  static getTrackLevelDescription(level, variant = 'swseStandard') {
    const descriptions = {
      swseStandard: ['Normal', '-1 Step', '-2 Steps', '-5 Steps', '-10 Steps', 'Helpless'],
      simplified: ['Normal', '-1 Step', '-2 Steps', '-5 Steps', '-10 Steps', 'Helpless'],
      criticalConditions: ['Normal', '-1 Step', '-2 Steps', '-5 Steps', '-10 Steps', 'Helpless']
    };
    const list = descriptions[variant] || descriptions.swseStandard;
    return list[Math.max(0, Math.min(Number(level or 0), list.length - 1))]
  }

  static async removeTrackEffects(_actor, _oldLevel, _newLevel) {
    SWSELogger.warn('[DEPRECATED] ConditionTrackMechanics.removeTrackEffects() no longer owns condition effects. Use canonical status/effect systems.');
  }

  static async onActorPreUpdate(_actor, _data) {
    return;
  }
}
