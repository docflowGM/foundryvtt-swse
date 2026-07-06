/**
 * Feat Action Listeners
 *
 * Registers Hooks.on() listeners for feats that trigger on game events
 * (combat outcomes, damage, actions, etc.)
 *
 * Registered feats:
 * - Sadistic Strike: Move opponent -1 step on CT when delivering Coup de Grace
 * - Stay Up: legacy pre-damage hook for half damage and CT cost
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

function normalizeRuleType(value) {
  return String(value ?? '').trim().toUpperCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function activeCombatId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : null;
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

function actorConditionTrackRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      for (const rule of asArray(item?.system?.abilityMeta?.resourceRules?.conditionTrack)) {
        rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
      }
    }
  } catch (_err) {
    // Treat malformed actor/items as having no condition-track rules.
  }
  return rules;
}

function findConditionTrackRule(actor, type) {
  const wanted = normalizeRuleType(type);
  return actorConditionTrackRules(actor).find(rule => normalizeRuleType(rule?.type) === wanted) ?? null;
}

function actorGrappleRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      const grappleRules = item?.system?.abilityMeta?.grappleRules;
      if (!Array.isArray(grappleRules)) continue;
      for (const rule of grappleRules) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  } catch (_err) {
    // Treat malformed actor/items as having no grapple rules.
  }
  return rules;
}

function findGrappleRule(actor, type, predicate = null) {
  return actorGrappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule)));
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

function stayUpAlreadyUsed(actor) {
  const combatId = activeCombatId();
  const flag = actor?.getFlag?.('foundryvtt-swse', 'stayUpUsedThisEncounter');
  return !!combatId && flag === combatId;
}

async function markStayUpUsed(actor) {
  const combatId = activeCombatId();
  if (combatId) await actor?.setFlag?.('foundryvtt-swse', 'stayUpUsedThisEncounter', combatId);
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

      const ctRules = MetaResourceFeatResolver.getConditionTrackRules(attacker);
      if (!ctRules.moveTargetCtOnCoupDeGrace && !findConditionTrackRule(attacker, 'MOVE_TARGET_CT_ON_COUP_DE_GRACE')) {
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
  /* STAY UP                                  */
  /* ---------------------------------------- */
  /**
   * Stay Up: once per encounter, when the actor would take damage from an
   * attack, take half damage and move -1 step on the Condition Track.
   *
   * The modern DamageResolutionEngine handles this through explicit options.
   * This listener only preserves the older swse.damage-before pipeline and no
   * longer treats droid Damage Conversion as a flat damage reduction rule.
   */
  static _registerStayUp() {
    Hooks.on('swse.damage-before', async (context = {}) => {
      const { target } = context;
      const damage = Number(context.damage ?? 0) || 0;

      if (!target || damage <= 0) return;

      const stayUpRule = findConditionTrackRule(target, 'STAY_UP_HALF_DAMAGE_AND_CT');
      if (!stayUpRule) return;
      if (!canWorsenCondition(target)) return;
      if (stayUpAlreadyUsed(target)) return;

      try {
        const multiplier = Math.max(0, Number(stayUpRule.damageMultiplier ?? 0.5) || 0.5);
        const newDamage = Math.max(0, Math.floor(damage * multiplier));
        const useRule = await this._confirmStayUpUsage(target, damage, newDamage);
        if (!useRule) return;

        const oldCT = conditionStep(target);
        await ActorEngine.applyConditionShift(target, 1, 'Stay Up');
        await markStayUpUsed(target);
        const newCT = conditionStep(target);
        context.damage = newDamage;

        SWSELogger.log(
          `[FeatActionListeners] Stay Up used by ${target.name}: ` +
          `CT moved from ${oldCT} to ${newCT}, damage changed from ${damage} to ${newDamage}`
        );

        ui.notifications.info(
          `${target.name} uses Stay Up: takes half damage (${damage} -> ${newDamage}) and moves -1 step on the Condition Track.`
        );
      } catch (err) {
        SWSELogger.error('[FeatActionListeners] Stay Up error:', err);
      }
    });

    SWSELogger.log('[FeatActionListeners] Stay Up listener registered');
  }

  /**
   * Helper: Confirm Stay Up usage with the target player.
   * Returns true if the player accepts, false otherwise.
   * @private
   */
  static async _confirmStayUpUsage(actor, originalDamage, newDamage) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: `${actor.name} - Stay Up`,
        content: `<p><strong>Stay Up</strong>: Take half damage (${originalDamage} &rarr; ${newDamage}) and move -1 step on the Condition Track?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Use Stay Up',
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
   */
  static _registerBoneCrusher() {
    Hooks.on('swse.grappleManeuver', async (context = {}) => {
      const { attacker, defender, maneuver, result } = context;
      if (!attacker || !defender) return;

      const maneuverKey = String(maneuver ?? result?.maneuver ?? '').toLowerCase();
      if (!['throw', 'crush'].includes(maneuverKey)) return;
      if (!hasDamagePayload(result?.damage ?? context.damage)) return;

      const metadataRule = findGrappleRule(attacker, 'CONDITION_SHIFT_ON_GRAPPLE_DAMAGE', rule => {
        const maneuvers = Array.isArray(rule.maneuvers) ? rule.maneuvers : [rule.maneuver].filter(Boolean);
        return !maneuvers.length || maneuvers.map(value => String(value).toLowerCase()).includes(maneuverKey);
      });
      if (!metadataRule && !actorHasFeat(attacker, 'Bone Crusher')) return;
      if (!canWorsenCondition(defender)) return;

      const steps = Math.max(1, Number(metadataRule?.steps ?? 1) || 1);

      try {
        const oldCT = conditionStep(defender);
        await ActorEngine.applyConditionShift(defender, steps, metadataRule?.source ?? 'Bone Crusher');
        const newCT = conditionStep(defender);

        SWSELogger.log(
          `[FeatActionListeners] Bone Crusher applied by ${attacker.name}: ` +
          `${defender.name} moved from CT ${oldCT} to CT ${newCT}`
        );

        ui.notifications.info(
          `${attacker.name} uses ${metadataRule?.source ?? 'Bone Crusher'}: ${defender.name} moved -${steps} step${steps === 1 ? '' : 's'} on the Condition Track.`
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
