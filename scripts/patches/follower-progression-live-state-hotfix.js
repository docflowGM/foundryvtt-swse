import {
  reconcileFollowerEnhancementsForActor,
  reconcileFollowerSlotsForActor,
} from '/systems/foundryvtt-swse/scripts/infrastructure/hooks/follower-hooks.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerProgressionLiveState.registered.v1');
const RECONCILE_QUEUES = new Map();

function isFollowerOwner(actor) {
  return actor?.type === 'character' || actor?.type === 'droid';
}

function resolveItemOwner(item) {
  return item?.parent || item?.actor || null;
}

function queueFollowerReconciliation(actor, reason = 'unknown') {
  if (!isFollowerOwner(actor)) return;
  const actorId = actor.id;
  const prior = RECONCILE_QUEUES.get(actorId);
  if (prior) globalThis.clearTimeout(prior);

  const timer = globalThis.setTimeout(async () => {
    RECONCILE_QUEUES.delete(actorId);
    const currentActor = game.actors?.get(actorId) || actor;
    if (!currentActor) return;
    try {
      await reconcileFollowerSlotsForActor(currentActor);
      await reconcileFollowerEnhancementsForActor(currentActor);
      swseLogger.debug('[FollowerProgressionLiveState] Reconciled follower entitlement after settled item mutation', {
        actor: currentActor.name,
        reason,
      });
    } catch (err) {
      swseLogger.warn('[FollowerProgressionLiveState] Delayed follower reconciliation failed', {
        actor: currentActor.name,
        reason,
        error: err?.message || String(err),
      });
    }
  }, 0);

  RECONCILE_QUEUES.set(actorId, timer);
}

function registerDelayedSlotReconciliation() {
  Hooks.on('createItem', (item, _options, userId) => {
    if (userId !== undefined && userId !== game.user?.id) return; // originating client only
    const actor = resolveItemOwner(item);
    if (item?.type !== 'talent' || !actor) return;
    if (!getFollowerTalentConfig(item.name, item)) return;
    queueFollowerReconciliation(actor, 'create-follower-talent');
  });

  Hooks.on('updateItem', (item, _changes, _options, userId) => {
    if (userId !== undefined && userId !== game.user?.id) return; // originating client only
    const actor = resolveItemOwner(item);
    if (item?.type !== 'talent' || !actor) return;
    if (!getFollowerTalentConfig(item.name, item)) return;
    queueFollowerReconciliation(actor, 'update-follower-talent');
  });

  Hooks.on('swse:progression:completed', (data = {}) => {
    if (isFollowerOwner(data.actor)) queueFollowerReconciliation(data.actor, 'progression-completed');
  });

  Hooks.on('renderApplicationV2', (application) => {
    const actor = application?.actor || application?.document || null;
    if (isFollowerOwner(actor)) queueFollowerReconciliation(actor, 'owner-sheet-render');
  });

  Hooks.once('ready', () => {
    if (!game.user?.isGM) return;
    for (const actor of game.actors || []) {
      if (isFollowerOwner(actor)) queueFollowerReconciliation(actor, 'world-ready-repair');
    }
  });
}

export function registerFollowerProgressionLiveStateHotfix() {
  if (globalThis[REGISTERED]) return;
  registerDelayedSlotReconciliation();
  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[FollowerProgressionLiveState] Registered follower projection, language, and slot repairs');
}
