import { FOLLOWER_TALENT_CONFIG } from "/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Follower Hooks (AppV2-safe)
 * PHASE 10: Recursive guards prevent cascading follower deletion loops
 *
 * Responsibilities:
 * - Maintain flags.swse.followerSlots based on follower-granting talents.
 * - Never open pop-out windows or dialogs.
 * - Provenance-safe cleanup: on talent loss, remove only items granted by that talent.
 *
 * UI responsibilities (choice prompts) are deferred to the in-sheet embedded modal.
 */

function _randomId() {
  return foundry.utils.randomID?.() ?? Math.random().toString(36).slice(2);
}

function _getSlots(actor) {
  return actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
}

async function _setSlots(actor, slots) {
  await actor.setFlag('foundryvtt-swse', 'followerSlots', slots);
}

function _slotsForTalent(slots, talentName) {
  return slots.filter(s => s.talentName === talentName);
}

function _filledSlotsForTalent(slots, talentName) {
  return _slotsForTalent(slots, talentName).filter(s => !!s.createdActorId);
}

function _buildSlot(talentItem, cfg) {
  return {
    id: _randomId(),
    talentName: talentItem.name,
    talentItemId: talentItem.id,
    templateChoices: cfg?.templateChoices ?? [],
    createdActorId: null,
    createdAt: Date.now()
  };
}

async function _removeGrantedItemsFromFollower(ownerActor, followerActorId, talentItemId) {
  const follower = game.actors.get(followerActorId);
  if (!follower) return;

  const toDelete = follower.items
    .filter(i => i.getFlag?.('swse', 'grantedByTalent')?.talentItemId === talentItemId)
    .map(i => i.id);

  if (toDelete.length) {
    await follower.deleteEmbeddedDocuments('Item', toDelete);
  }

  // PHASE 10: Route through ActorEngine with guard key for owner update
  // Best-effort detach from owner's ownedActors list.
  const owned = (ownerActor.system.ownedActors || []).filter(o => o.id !== followerActorId);
  if (globalThis.SWSE?.ActorEngine?.updateActor) {
    await globalThis.SWSE.ActorEngine.updateActor(ownerActor, { 'system.ownedActors': owned }, {
      meta: { guardKey: 'follower-cleanup' }
    });
  } else {
    await ownerActor.update({ 'system.ownedActors': owned });
  }
}

/**
 * When a follower slot must be reduced but multiple filled followers exist,
 * store a pending choice flag to be resolved in-sheet.
 */
async function _setPendingDetachment(ownerActor, talentItem, filledFollowerIds) {
  const payload = {
    talentName: talentItem.name,
    talentItemId: talentItem.id,
    candidateActorIds: filledFollowerIds
  };
  await ownerActor.setFlag('foundryvtt-swse', 'pendingFollowerDetachment', payload);
  ui.notifications?.warn?.(
    `Follower slots reduced for ${talentItem.name}. Open your character sheet > Other tab to choose which follower to detach.`
  );
}

export function initializeFollowerHooks() {

  Hooks.on('createItem', async (item, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    const actor = item.actor;
    if (!actor || actor.type !== 'character') return;

    const cfg = FOLLOWER_TALENT_CONFIG[item.name];
    if (!cfg) return;

    const slots = _getSlots(actor);
    const current = _slotsForTalent(slots, item.name).length;
    const max = Number(cfg.maxCount ?? 0);

    if (max > 0 && current >= max) {
      // Slot cap reached; do nothing (UI shows locked create buttons).
      return;
    }

    slots.push(_buildSlot(item, cfg));
    await _setSlots(actor, slots);
  });

  Hooks.on('deleteItem', async (item, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    // PHASE 10: Guard against cascading follower deletion loops
    if (options?.meta?.guardKey === 'follower-cleanup') return;

    const actor = item.actor;
    if (!actor || actor.type !== 'character') return;

    const cfg = FOLLOWER_TALENT_CONFIG[item.name];
    if (!cfg) return;

    const slots = _getSlots(actor);

    // Prefer removing the slot that came from this exact talent item.
    const idx = slots.findIndex(s => s.talentItemId === item.id);
    if (idx === -1) return;

    const slot = slots[idx];

    // If the slot is empty, remove it immediately.
    if (!slot.createdActorId) {
      slots.splice(idx, 1);
      await _setSlots(actor, slots);
      return;
    }

    // If exactly one filled follower exists for this talent, detach automatically.
    const filled = _filledSlotsForTalent(slots, item.name).map(s => s.createdActorId).filter(Boolean);
    const uniqueFilled = Array.from(new Set(filled));

    if (uniqueFilled.length === 1) {
      const followerId = uniqueFilled[0];
      // Clear slot linkage and remove granted items provenance-safely.
      slot.createdActorId = null;
      slot.detachedAt = Date.now();
      slots.splice(idx, 1); // rank removed -> slot removed
      await _setSlots(actor, slots);
      await _removeGrantedItemsFromFollower(actor, followerId, item.id);
      return;
    }

    // Multiple candidates: defer choice to in-sheet resolver.
    await _setPendingDetachment(actor, item, uniqueFilled);
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (game.user.id !== userId) return;
    if (actor.type !== 'character') return;

    // If follower stats need updating, do it elsewhere; keep this hook minimal.
    if (changes.system?.level) {
      swseLogger?.debug?.(`FollowerHooks: owner level changed; followers may require recalculation.`);
    }
  });
}
