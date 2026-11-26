import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
/**
 * Force Power Hooks
 * Handles automatic force power grants when feats are added or abilities change
 * PHASE 10: Recursive guards prevent infinite item creation loops
 * PHASE 2: In-flight mutation guard prevents re-entrant writes
 */

import { ForcePowerManager } from "/systems/foundryvtt-swse/scripts/utils/force-power-manager.js";
import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { TemptationOfTheDarkSide } from "/systems/foundryvtt-swse/scripts/engine/force/temptation-of-the-dark-side.js";
import { ForcePowerMaintenance } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-maintenance.js";
import { SuiteInstanceRecovery } from "/systems/foundryvtt-swse/scripts/engine/force/suite-instance-recovery.js";
import { installFinalForcePowerIntegration } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-final-integration.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { isResponsibleGM } from "/systems/foundryvtt-swse/scripts/utils/responsible-gm.js";


function isProgressionManagedForceMutation(itemOrActor, options = {}) {
  const source = String(options?.source || options?.meta?.source || '').toLowerCase();
  const guardKey = String(options?.meta?.guardKey || options?.guardKey || '').toLowerCase();
  const suppress = options?.swse?.suppressForcePowerPrompt === true
    || options?.meta?.suppressForcePowerPrompt === true
    || options?.meta?.skipForcePowerHook === true;

  if (suppress) return true;
  if (guardKey.includes('force-power-grant')) return true;
  if (source.includes('progressionfinalizer')
      || source.includes('actoreengine.applyprogression')
      || source.includes('actorengine.applyprogression')
      || source.includes('actorengine.applymutationplan')
      || source.includes('progression')) {
    return true;
  }

  const flags = itemOrActor?.flags || {};
  const progressionFlag = flags?.swse?.progression
    || flags?.['foundryvtt-swse']?.progression
    || itemOrActor?.system?.progressionSource
    || itemOrActor?.system?.source === 'progression';

  return !!progressionFlag;
}

export function initializeForcePowerHooks() {
  installFinalForcePowerIntegration({ ForcePowerEffectsEngine, ForceExecutor });
  // GM macro access to the optional FUCG p.85 Temptation rule and to maintained-power instances (no sheet UI yet).
  globalThis.game.swse = globalThis.game.swse || {};
  globalThis.game.swse.temptation = TemptationOfTheDarkSide;
  globalThis.game.swse.forcePowerMaintenance = ForcePowerMaintenance;

  Hooks.on('createItem', async (item, options, userId) => {
    if (game.user.id !== userId) {return;}

    if (isProgressionManagedForceMutation(item, options)) {
      SWSELogger.debug('SWSE | Force Powers | Skipping legacy prompt for progression-managed feat creation', {
        item: item.name,
        source: options?.source || options?.meta?.source || null,
        guardKey: options?.meta?.guardKey || null
      });
      return;
    }

    if (item.type !== 'feat') {return;}
    if (!item.parent || item.parent.documentName !== 'Actor') {return;}

    const actor = item.parent;
    const featName = item.name.toLowerCase();

    SWSELogger.log(`SWSE | Force Powers | Feat added: ${item.name}`);

    if (featName.includes('force sensitivity') || featName === 'force sensitive') {
      SWSELogger.log('SWSE | Force Powers | Detected Force Sensitivity feat');
      await ForcePowerManager.handleForceSensitivity(actor);
    }

    if (featName.includes('force training')) {
      SWSELogger.log('SWSE | Force Powers | Detected Force Training feat');

      if (!ForcePowerManager.hasForceSensitivity(actor)) {
        ui.notifications.warn(`${actor.name} must have Force Sensitivity before taking Force Training!`);
        return;
      }

      await ForcePowerManager.handleForceTraining(actor);
    }
  });

  Hooks.on('preUpdateActor', async (actor, changes, options, userId) => {
    if (game.user.id !== userId) {return;}
    if (!changes.system?.abilities) {return;}
    options.oldAbilities = foundry.utils.deepClone(actor.system.abilities);
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (game.user.id !== userId) {return;}

    if (isProgressionManagedForceMutation(actor, options)) {
      SWSELogger.debug('SWSE | Force Powers | Skipping legacy ability-increase prompt for progression-managed actor update', {
        actor: actor.name,
        source: options?.source || options?.meta?.source || null,
        guardKey: options?.meta?.guardKey || null
      });
      return;
    }

    if (ActorEngine.isActorMutationInFlight(actor.id)) {
      SWSELogger.debug(`[ForcePowerHooks] Deferring ability check for ${actor.name} — mutation in flight`);
      return;
    }

    if (!changes.system?.abilities || !options.oldAbilities) {return;}
    if (ForcePowerManager.countForceTrainingFeats(actor) === 0) {return;}

    const oldAbilities = options.oldAbilities;
    const newAbilities = actor.system.abilities;

    SWSELogger.log('SWSE | Force Powers | Checking for ability modifier increase');
    await ForcePowerManager.handleAbilityIncrease(actor, oldAbilities, newAbilities);
  });

  // Core, "Regaining Force Powers": combat over AND a chance to rest for 1 minute. The combat document being deleted
  // proves neither; the proven event is the GM-confirmed `restCompleted` (SuiteInstanceRecovery verifies it).
  Hooks.on('restCompleted', async (event) => {
    if (!isResponsibleGM()) return;
    await SuiteInstanceRecovery.regainAfterRest(event);
  });

  // Natural 20 on a Force Power / starship maneuver activation check: regain at the END of that actor's turn.
  Hooks.on('updateCombat', async (combat, changed, options, userId) => {
    if (!isResponsibleGM()) return;
    if (changed?.turn === undefined && changed?.round === undefined) return;
    await SuiteInstanceRecovery.regainAtEndOfTurn(combat);
    // The previous combatant's turn just ended: their unmaintained Force power instances lapse.
    const prev = combat?.previous;
    const prevActor = prev?.combatantId ? (combat.combatants?.get?.(prev.combatantId)?.actor ?? null) : null;
    if (prevActor) await ForcePowerMaintenance.lapseUnmaintained(prevActor, { combat, round: prev.round });
  });

  // Damage taken while maintaining: prompt the concentration check for each named instance (posted where it was applied).
  Hooks.on('swse.damageApplied', async ({ actor, damageToHP } = {}) => {
    await ForcePowerMaintenance.onDamageTaken(actor, damageToHP);
  });

  Hooks.on('deleteItem', async (item, options, userId) => {
    if (game.user.id !== userId) {return;}
    if (item.type !== 'force-power') {return;}
    if (!item.parent || item.parent.documentName !== 'Actor') {return;}

    const actor = item.parent;
    await ForcePowerEffectsEngine.removePowerEffects(actor, item);

    SWSELogger.log(`SWSE | Force Power Effects | Cleaned up effects for deleted power: ${item.name}`);
  });

  SWSELogger.log('SWSE | Force Power hooks initialized');
}
