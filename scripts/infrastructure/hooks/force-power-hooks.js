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
import { installPhase3ForcePowerCorrections } from "/systems/foundryvtt-swse/scripts/engine/force/phase3-force-power-corrections.js";
import { installPhase4ForceModifierAutomation } from "/systems/foundryvtt-swse/scripts/engine/force/phase4-force-modifier-automation.js";
import { installPhase5ForceHealing } from "/systems/foundryvtt-swse/scripts/engine/force/phase5-force-healing-mitigation.js";
import { installPhase6ForceDamage } from "/systems/foundryvtt-swse/scripts/engine/force/phase6-force-direct-damage.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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
  installPhase3ForcePowerCorrections(ForcePowerEffectsEngine);
  installPhase4ForceModifierAutomation(ForcePowerEffectsEngine);
  installPhase5ForceHealing(ForceExecutor);
  installPhase6ForceDamage(ForceExecutor);

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

  Hooks.on('deleteCombat', async (combat, options, userId) => {
    SWSELogger.log('SWSE | Force Powers | Combat ended, regaining Force Powers for all combatants');

    for (const combatant of combat.combatants) {
      if (!combatant.actor) {continue;}

      const spentPowers = combatant.actor.items.filter(i =>
        i.type === 'force-power' && i.system.spent
      );

      if (spentPowers.length > 0) {
        const updates = spentPowers.map(power => ({
          _id: power.id,
          'system.spent': false
        }));

        await ActorEngine.updateOwnedItems(combatant.actor, updates, {
          meta: { guardKey: 'force-power-grant' }
        });

        if (combatant.actor.isOwner) {
          ui.notifications.info(`Combat ended. ${combatant.actor.name} regained ${spentPowers.length} Force Power(s)`);
        }
      }
    }
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
