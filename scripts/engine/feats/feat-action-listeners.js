/**
 * Feat Action Listeners
 *
 * Registers Hooks.on() listeners for feats that trigger on game events
 * (combat outcomes, damage, actions, etc.)
 *
 * Registered feats:
 * - Sadistic Strike: Move opponent -1 step on CT when delivering Coup de Grace
 * - Damage Conversion / Stay Up-style rules: spend a CT step to reduce incoming damage
 * - Bone Crusher: Move damaged grappled opponent -1 step on CT after grapple damage
 * - (Future) Forceful Strike: Spend Force Point to move target -1 step on CT with Force Stun
 * - (Future) Forceful Telekinesis: Spend Force Point to move target -1 step on CT with Move Object
 */

import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeFeatName(featName);
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && normalizeFeatName(item?.name) === wanted);
  } catch (_err) {
    return false;
  }
}

function conditionStep(actor) {
  return Math.max(0, Number(actor?.system?.conditionTrack?.current ?? 0) || 0);
}

function canWorsenCondition(actor) {
  return !!actor && conditionStep(actor) < ConditionTrackRules.getConditionStepCap();
}

function uniqueActors(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const actor = value?.actor ?? value;
    if (!actor?.id || seen.has(actor.id)) continue;
    seen.add(actor.id);
    out.push(actor);
  }
  return out;
}

function hasDamagePayload(value) {
  if (!value) return false;
  const total = Number(value.total ?? value.damage ?? value.damageApplied ?? value.applied?.damageApplied ?? value.applied?.damage ?? 0);
  return Number.isFinite(total) && total > 0;
}

export class FeatActionListeners {
  /**
   * Initialize all feat action listeners.
   * Called from init-hooks during ready phase.
   */
  static initialize() {
    SWSELogger.log('[FeatActionListeners] Initializing feat action listeners');

    this._registerSadisticStrike();
    this._registerStayUp();
    this._registerBoneCrusher();
    // Future listeners will be registered here
    // this._registerForcefulStrike();
    // this._registerForcefulTelekinesis();
  }

  /* ---------------------------------------- */
  /* SADISTIC STRIKE                          */
  /* ---------------------------------------- */
  /**
   * Sadistic Strike: Move opponent -1 step on CT when delivering Coup de Grace.
   * Listens for swse.coupDeGrace event emitted by CombatEngine.
   */
  static _registerSadisticStrike() {
    Hooks.on('swse.coupDeGrace', async (context = {}) => {
      const { attacker, target } = context;
      if (!attacker) return;

      // Check if attacker has Sadistic Strike via metadata
      const ctRules = MetaResourceFeatResolver.getConditionTrackRules(attacker);
      if (!ctRules.moveTargetCtOnCoupDeGrace) {
        return;
      }

      const explicitTargets = uniqueActors([
        ...(Array.isArray(context.affectedActors) ? context.affectedActors : []),
        ...(Array.isArray(context.observers) ? context.observers : []),
        ...(Array.isArray(context.targets) ? context.targets : [])
      ]);
      const affected = explicitTargets.length ? explicitTargets : uniqueActors([target]);

      for (const affectedActor of affected) {
        if (!affectedActor || affectedActor.id === attacker.id) continue;
        if (!canWorsenCondition(affectedActor)) continue;

        try {
          const oldCT = conditionStep(affectedActor);
          await ActorEngine.applyConditionShift(affectedActor, 1, 'Sadistic Strike');
          const newCT = conditionStep(affectedActor);

          SWSELogger.log(
            `[FeatActionListeners] Sadistic Strike applied by ${attacker.name}: ` +
            `${affectedActor.name} moved from CT ${oldCT} to CT ${newCT}`
          );

          ui.notifications.info(
            `${attacker.name} uses Sadistic Strike: ${affectedActor.name} moved -1 step on the Condition Track.`
          );
        } catch (err) {
          SWSELogger.error('[FeatActionListeners] Sadistic Strike error:', err);
        }
      }
    });

    SWSELogger.log('[FeatActionListeners] Sadistic Strike listener registered');
  }

  /* ---------------------------------------- */
  /* STAY UP / DAMAGE CONVERSION              */
  /* ---------------------------------------- */
  /**
   * Damage Conversion / Stay Up-style rule: Move 1 step down Condition Track to reduce damage.
   * Listens for legacy pre-damage hook to allow reducing damage before it's applied.
   *
   * The modern DamageResolutionEngine also supports this as an explicit option; this
   * listener preserves the older CombatEngine.damage-before pipeline while routing
   * condition mutation through ActorEngine instead of actor helper methods.
   */
  static _registerStayUp() {
    Hooks.on('swse.damage-before', async (context) => {
      const { target, damage } = context;

      if (!target || damage <= 0) {
        return;
      }

      // Check if target has Damage Conversion / Stay Up style metadata
      const ctRules = MetaResourceFeatResolver.getConditionTrackRules(target);
      if (!ctRules.spendCtToReduceDamage) {
        return;
      }

      if (!canWorsenCondition(target)) {
        return;
      }

      try {
        // Calculate damage reduction using rule-defined amount
        const damageReduction = Math.min(ctRules.damageReductionAmount, damage);

        // Ask target if they want to use the rule
        const useRule = await this._confirmStayUpUsage(target, damageReduction);

        if (!useRule) {
          return;
        }

        const oldCT = conditionStep(target);
        await ActorEngine.applyConditionShift(target, 1, 'Damage Conversion');
        const newCT = conditionStep(target);

        // Reduce the incoming damage by spending the CT step
        const newDamage = Math.max(0, damage - damageReduction);
        context.damage = newDamage;

        SWSELogger.log(
          `[FeatActionListeners] Damage Conversion used by ${target.name}: ` +
          `CT moved from ${oldCT} to ${newCT}, damage reduced from ${damage} to ${newDamage}`
        );

        ui.notifications.info(
          `${target.name} uses Damage Conversion: Moved -1 step on CT and reduced damage by ${damageReduction} (${damage} → ${newDamage} damage).`
        );

      } catch (err) {
        SWSELogger.error('[FeatActionListeners] Damage Conversion error:', err);
      }
    });

    SWSELogger.log('[FeatActionListeners] Damage Conversion listener registered');
  }

  /**
   * Helper: Confirm Damage Conversion usage with the target player.
   * Returns a promise that resolves to true if the player accepts, false otherwise.
   * @private
   */
  static async _confirmStayUpUsage(actor, damageReduction) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: `${actor.name} - Damage Conversion`,
        content: `<p><strong>Damage Conversion</strong>: Move 1 step down the Condition Track to reduce damage by ${damageReduction} HP?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Use Damage Conversion',
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Decline',
            callback: () => resolve(false)
          }
        },
        default: 'no',
        close: () => resolve(false)
      });
      dialog.render(true);
    });
  }

  /* ---------------------------------------- */
  /* BONE CRUSHER                             */
  /* ---------------------------------------- */
  /**
   * Bone Crusher: when grapple damage is successfully applied to a grappled
   * opponent, move that opponent -1 step on the condition track.
   *
   * The current grapple system emits swse.grappleManeuver after Throw/Crush.
   * This listener deliberately requires a damage payload so non-damaging
   * grapple maneuvers such as Trip do not trigger the feat.
   */
  static _registerBoneCrusher() {
    Hooks.on('swse.grappleManeuver', async (context = {}) => {
      const { attacker, defender, maneuver, result } = context;
      if (!attacker || !defender) return;
      if (!['throw', 'crush'].includes(String(maneuver ?? result?.maneuver ?? '').toLowerCase())) return;
      if (!hasDamagePayload(result?.damage ?? context.damage)) return;
      if (!actorHasFeat(attacker, 'Bone Crusher')) return;
      if (!canWorsenCondition(defender)) return;

      try {
        const oldCT = conditionStep(defender);
        await ActorEngine.applyConditionShift(defender, 1, 'Bone Crusher');
        const newCT = conditionStep(defender);

        SWSELogger.log(
          `[FeatActionListeners] Bone Crusher applied by ${attacker.name}: ` +
          `${defender.name} moved from CT ${oldCT} to CT ${newCT}`
        );

        ui.notifications.info(
          `${attacker.name} uses Bone Crusher: ${defender.name} moved -1 step on the Condition Track.`
        );
      } catch (err) {
        SWSELogger.error('[FeatActionListeners] Bone Crusher error:', err);
      }
    });

    SWSELogger.log('[FeatActionListeners] Bone Crusher listener registered');
  }

  /* ---------------------------------------- */
  /* FUTURE: FORCEFUL STRIKE                  */
  /* ---------------------------------------- */
  // static _registerForcefulStrike() {
  //   // Listen for Force Stun activation
  //   // When Force Stun is resolved:
  //   //   - Check if attacker has Forceful Strike
  //   //   - If yes: Offer to spend Force Point to move target -1 step on CT
  // }

  /* ---------------------------------------- */
  /* FUTURE: FORCEFUL TELEKINESIS             */
  /* ---------------------------------------- */
  // static _registerForcefulTelekinesis() {
  //   // Listen for Move Object activation
  //   // When Move Object is resolved:
  //   //   - Check if user has Forceful Telekinesis
  //   //   - If yes: Offer to spend Force Point to move target -1 step on CT
  // }
}
