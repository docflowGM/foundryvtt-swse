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
import { installFinalForcePowerIntegration } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-final-integration.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

// Exactly one client acts: the first active GM (mirrors the other combat hooks).
function isResponsibleGm() {
  const gms = (globalThis.game?.users ?? []).filter?.(u => u.isGM && u.active) ?? [];
  return globalThis.game?.user?.isGM === true && (gms.length === 0 || gms[0]?.id === globalThis.game.user.id);
}

export async function regainSuiteAfterCombat(combat) {
  const results = [];
  for (const combatant of combat?.combatants ?? []) {
    const actor = combatant.actor;
    if (!actor) continue;
    const result = await ForceExecutor.regainAllSpentForcePowers(actor, { source: 'force-power-combat-end-regain' });
    results.push({ actorId: actor.id, ...result });
    if (result.recovered > 0 && actor.isOwner) ui.notifications.info(`Combat ended. ${actor.name} regained ${result.recovered} Force Power(s)`);
  }
  return results;
}

/** The combatant whose turn just ended (Foundry v13 Combat#previous), if its actor has a pending natural-20 regain. */
export async function regainSuiteAtEndOfTurn(combat) {
  const prevId = combat?.previous?.combatantId ?? null;
  if (!prevId) return null;
  const combatant = combat.combatants?.get?.(prevId) ?? Array.from(combat.combatants ?? []).find(c => c.id === prevId);
  const actor = combatant?.actor;
  const pending = actor?.getFlag?.('swse', 'pendingSuiteRegain') ?? actor?.flags?.swse?.pendingSuiteRegain;
  if (!pending || pending.combatId !== combat.id || (pending.combatantId && pending.combatantId !== prevId)) return null;
  const result = await ForceExecutor.regainAllSpentForcePowers(actor, { source: 'force-power-natural-20-regain' });
  if (result.recovered > 0 && actor.isOwner) ui.notifications.info(`Natural 20: ${actor.name} regained ${result.recovered} Force Power(s) at the end of the turn`);
  return { actorId: actor.id, ...result };
}

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

  // Combat is over (the rest): every combatant regains all spent Force powers (Core, Regaining Force Powers).
  Hooks.on('deleteCombat', async (combat, options, userId) => {
    if (!isResponsibleGm()) return;
    await regainSuiteAfterCombat(combat);
  });

  // Natural 20 on a Use the Force check: regain every spent Force power at the END of that actor's turn.
  Hooks.on('updateCombat', async (combat, changed, options, userId) => {
    if (!isResponsibleGm()) return;
    if (changed?.turn === undefined && changed?.round === undefined) return;
    await regainSuiteAtEndOfTurn(combat);
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
