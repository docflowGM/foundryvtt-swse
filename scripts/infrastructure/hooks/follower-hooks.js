import { getFollowerTalentConfig } from "/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FollowerManager } from "/systems/foundryvtt-swse/scripts/apps/follower-manager.js";
import { MinionManager } from "/systems/foundryvtt-swse/scripts/apps/minion-manager.js";
import { runFollowerMutationTransaction } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-transaction.js";
import { isFollowerSlotOccupied, resolveFollowerSlotActorId } from "/systems/foundryvtt-swse/scripts/domain/followers/follower-slot-occupancy.js";
import { computeGrantedItemIdsForTalent, buildOwnerRegistryDetachPatch, buildSlotRemovalPatch } from "/systems/foundryvtt-swse/scripts/domain/followers/follower-talent-detach-plan.js";

function _clonePlain(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

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

function _isFollowerOwnerActor(actor) {
  if (!actor) return false;
  if (actor.type === 'character') return true;

  // Playable droid PCs may use the droid actor type during/after the v2
  // chargen migration. Owned garage/property droids normally will not carry
  // follower-granting talents, but this keeps legitimate droid PCs from being
  // excluded from follower-slot grants.
  if (actor.type === 'droid') return true;

  return false;
}

function _resolveItemOwner(item) {
  return item?.parent ?? item?.actor ?? null;
}

function _getSlots(actor) {
  return actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
}

async function _setSlots(actor, slots) {
  // GM-MANUAL-FOLLOWER-SLOT — governed via ActorEngine instead of a direct
  // setFlag(), so this file's writes to followerSlots are enforced by the
  // same authority FollowerSlotService uses for manual (GM-granted) slots.
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  await ActorEngine.updateActor(actor, {
    'flags.foundryvtt-swse.followerSlots': slots
  }, { source: 'FollowerHooks.setSlots' });
}

function _slotsForTalent(slots, talentName) {
  return slots.filter(s => s.talentName === talentName);
}

function _filledSlotsForTalent(slots, talentName) {
  return _slotsForTalent(slots, talentName).filter(isFollowerSlotOccupied);
}

function _buildSlot(talentItem, cfg) {
  const fixedProfile = cfg?.fixedFollowerProfile || null;
  return {
    id: _randomId(),
    talentName: talentItem.name,
    talentItemId: talentItem.id,
    talentTreeId: talentItem.system?.treeId || null,
    templateChoices: cfg?.templateChoices ?? [],
    dependentKind: cfg?.dependentKind ?? 'follower',
    minionLevelOffset: cfg?.minionLevelOffset ?? null,
    minionLevelLabel: cfg?.minionLevelLabel ?? null,
    fixedFollowerProfileId: fixedProfile?.id || null,
    fixedSpeciesName: fixedProfile?.speciesName || null,
    noStartingCredits: cfg?.noStartingCredits === true || fixedProfile?.noStartingCredits === true,
    createdActorId: null,
    createdAt: Date.now()
  };
}

/**
 * PHASE 2 / ROUND 4: Build the individually-compensatable transaction steps
 * for detaching a follower from its granting talent — deleting the items
 * that talent granted, and detaching the follower from every owner-side
 * dependent registry that can reference it.
 *
 * Previously this was ONE opaque step that did both an Item deletion and an
 * owner-registry write internally: if the Item deletion succeeded but the
 * owner write failed, the step's commit() threw and runFollowerMutationTransaction
 * could not compensate the already-deleted Items, because a step that never
 * finishes committing is never added to the completed list it rolls back.
 * Splitting into two named steps — each fully committed or fully rolled
 * back — closes that gap. A missing follower Actor (already deleted by some
 * other path) still yields the owner-registry-detach step, so stale
 * followers/minions/ownedActors entries pointing at it are still cleaned up
 * even though there are no Items left to delete.
 *
 * @param {Actor} ownerActor
 * @param {string} followerActorId
 * @param {string} talentItemId
 * @returns {Array<{name: string, commit: Function, rollback?: Function}>}
 */
function _buildFollowerDetachSteps(ownerActor, followerActorId, talentItemId) {
  const follower = game.actors.get(followerActorId) ?? null;
  const steps = [];

  if (follower) {
    const grantedItemIds = computeGrantedItemIdsForTalent(Array.from(follower.items ?? []), talentItemId);
    if (grantedItemIds.length) {
      const grantedItemData = grantedItemIds
        .map(id => follower.items.get(id)?.toObject())
        .filter(Boolean);
      steps.push({
        name: 'delete-granted-items',
        commit: async () => {
          const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
          await ActorEngine.deleteEmbeddedDocuments(follower, 'Item', grantedItemIds);
        },
        rollback: async () => {
          // Best-effort compensation: Foundry does not let a deleted
          // embedded document be un-deleted with its original _id intact,
          // so this recreates equivalent Items rather than restoring the
          // exact prior ones. Documented limitation, matching this
          // branch's existing snapshot-recreation caveats (see P1-7).
          const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
          await ActorEngine.createEmbeddedDocuments(follower, 'Item', grantedItemData);
        }
      });
    }
  }

  const currentOwnedActors = _clonePlain(ownerActor.system?.ownedActors ?? []);
  const currentFollowers = _clonePlain(ownerActor.getFlag('foundryvtt-swse', 'followers') ?? []);
  const currentMinions = _clonePlain(ownerActor.getFlag('foundryvtt-swse', 'minions') ?? []);
  const { commitPatch, rollbackPatch } = buildOwnerRegistryDetachPatch({
    ownedActors: currentOwnedActors,
    followers: currentFollowers,
    minions: currentMinions,
    followerActorId
  });

  steps.push({
    name: 'detach-owner-registries',
    commit: async () => {
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
      await ActorEngine.updateActor(ownerActor, commitPatch, { meta: { guardKey: 'follower-cleanup' } });
    },
    rollback: async () => {
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
      await ActorEngine.updateActor(ownerActor, rollbackPatch, { meta: { guardKey: 'follower-cleanup' } });
    }
  });

  return steps;
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
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  await ActorEngine.updateActor(ownerActor, {
    'flags.foundryvtt-swse.pendingFollowerDetachment': payload
  }, { source: 'FollowerHooks.setPendingDetachment' });
  ui.notifications?.warn?.(
    `Follower slots reduced for ${talentItem.name}. Open your character sheet > Other tab to choose which follower to detach.`
  );
}

/**
 * Reconcile follower entitlement slots from currently owned follower-granting talents.
 * This repairs actors that received talents while follower hooks were not registered,
 * and keeps future sheet launches from depending on a missed createItem side effect.
 *
 * @param {Actor} actor
 * @returns {Promise<Array>} The reconciled slot array
 */
export async function reconcileFollowerEnhancementsForActor(actor) {
  if (!_isFollowerOwnerActor(actor)) return;
  await FollowerManager.reconcileEnhancementsForOwner(actor);
  await MinionManager.reconcileTalentsForOwner(actor);
}

export async function reconcileFollowerSlotsForActor(actor) {
  if (!_isFollowerOwnerActor(actor)) return [];

  const talents = Array.from(actor.items || []).filter(item => item.type === 'talent' && getFollowerTalentConfig(item.name, item));
  const slots = _getSlots(actor).map(slot => ({ ...slot }));
  let changed = false;

  for (const talent of talents) {
    const cfg = getFollowerTalentConfig(talent.name, talent);
    const max = Number(cfg?.maxCount ?? 0);
    const existingForItem = slots.filter(slot => slot.talentItemId === talent.id);
    const existingForTalent = slots.filter(slot => slot.talentName === talent.name);

    if (existingForItem.length === 0 && (max <= 0 || existingForTalent.length < max)) {
      slots.push(_buildSlot(talent, cfg));
      changed = true;
      continue;
    }

    for (const slot of existingForItem) {
      if (!Array.isArray(slot.templateChoices)) {
        slot.templateChoices = cfg?.templateChoices ?? [];
        changed = true;
      }
      if (!slot.talentName) {
        slot.talentName = talent.name;
        changed = true;
      }
      if (!slot.talentTreeId && talent.system?.treeId) {
        slot.talentTreeId = talent.system.treeId;
        changed = true;
      }
      if (!slot.dependentKind) {
        slot.dependentKind = cfg?.dependentKind ?? 'follower';
        changed = true;
      }
      const fixedProfile = cfg?.fixedFollowerProfile || null;
      if ((slot.fixedFollowerProfileId || null) !== (fixedProfile?.id || null)) {
        slot.fixedFollowerProfileId = fixedProfile?.id || null;
        changed = true;
      }
      if ((slot.fixedSpeciesName || null) !== (fixedProfile?.speciesName || null)) {
        slot.fixedSpeciesName = fixedProfile?.speciesName || null;
        changed = true;
      }
      const noStartingCredits = cfg?.noStartingCredits === true || fixedProfile?.noStartingCredits === true;
      if (slot.noStartingCredits !== noStartingCredits) {
        slot.noStartingCredits = noStartingCredits;
        changed = true;
      }
      if (slot.minionLevelOffset === undefined && cfg?.minionLevelOffset !== undefined) {
        slot.minionLevelOffset = cfg.minionLevelOffset;
        changed = true;
      }
      if (slot.minionLevelRatio !== undefined) {
        delete slot.minionLevelRatio;
        changed = true;
      }
      if (!slot.minionLevelLabel && cfg?.minionLevelLabel) {
        slot.minionLevelLabel = cfg.minionLevelLabel;
        changed = true;
      }
    }
  }

  const validTalentItemIds = new Set(talents.map(t => t.id));
  const filtered = slots.filter(slot => {
    if (isFollowerSlotOccupied(slot)) return true;
    // GM-MANUAL-FOLLOWER-SLOT — a manually-granted slot has no talent
    // provenance at all (talentItemId is always null) and must never be
    // removed, capped, or otherwise governed by talent reconciliation; it
    // is explicitly out of scope for this loop regardless of maxCount or
    // whether any follower-granting talent currently exists on the owner.
    if (slot.sourceType === 'gm-grant') return true;
    if (!slot.talentItemId) return true;
    return validTalentItemIds.has(slot.talentItemId);
  });

  if (filtered.length !== slots.length) changed = true;

  if (changed) {
    await _setSlots(actor, filtered);
    swseLogger?.debug?.('[FollowerHooks] Reconciled follower slots', {
      actor: actor.name,
      slotCount: filtered.length
    });
  }

  return filtered;
}

export function initializeFollowerHooks() {

  Hooks.on('createItem', async (item, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    const actor = _resolveItemOwner(item);
    if (!_isFollowerOwnerActor(actor)) return;

    if (FollowerManager.isEnhancementTalent(item.name)) {
      await FollowerManager.applyEnhancement(actor, item);
    }
    if (MinionManager.isMinionTalent(item.name)) {
      await MinionManager.applyTalent(actor, item);
    }

    const cfg = getFollowerTalentConfig(item.name, item);
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

    const actor = _resolveItemOwner(item);
    if (!_isFollowerOwnerActor(actor)) return;

    if (FollowerManager.isEnhancementTalent(item.name)) {
      await FollowerManager.removeEnhancement(actor, item);
    }
    if (MinionManager.isMinionTalent(item.name)) {
      await MinionManager.removeTalent(actor, item);
    }

    const cfg = getFollowerTalentConfig(item.name, item);
    if (!cfg) return;

    const slots = _getSlots(actor);

    // Prefer removing the slot that came from this exact talent item.
    const idx = slots.findIndex(s => s.talentItemId === item.id);
    if (idx === -1) return;

    const slot = slots[idx];

    // If the slot is empty, remove it immediately.
    if (!isFollowerSlotOccupied(slot)) {
      slots.splice(idx, 1);
      await _setSlots(actor, slots);
      return;
    }

    // If exactly one filled follower exists for this talent, detach automatically.
    const filled = _filledSlotsForTalent(slots, item.name).map(resolveFollowerSlotActorId).filter(Boolean);
    const uniqueFilled = Array.from(new Set(filled));

    if (uniqueFilled.length === 1) {
      const followerId = uniqueFilled[0];
      // Run cleanup BEFORE the slot is removed/persisted, not after — a
      // mid-cleanup failure must not leave the slot already gone while the
      // follower's granted items and owner-side registries are still
      // attached (the slot is the only remaining record that a cleanup is
      // owed). Every persisted mutation here is now its own named,
      // individually-compensatable step (item deletion, owner-registry
      // detach, slot removal) rather than one opaque step that could
      // partially apply with nothing to roll it back — see
      // _buildFollowerDetachSteps()'s doc comment for the exact defect this
      // closes.
      const { remainingSlots, rollbackSlots } = buildSlotRemovalPatch(slots, slot.id);
      const detachSteps = _buildFollowerDetachSteps(actor, followerId, item.id);
      const transaction = await runFollowerMutationTransaction([
        ...detachSteps,
        {
          name: 'remove-slot',
          commit: () => _setSlots(actor, remainingSlots),
          rollback: () => _setSlots(actor, rollbackSlots)
        }
      ], { source: 'FollowerHooks.deleteItem.autoDetach' });

      if (!transaction.ok) {
        swseLogger?.warn?.(`[FollowerHooks] Auto-detach cleanup failed for ${item.name}; owner and follower state may need manual review.`, transaction.error);
      }
      return;
    }

    // Multiple candidates: defer choice to in-sheet resolver.
    await _setPendingDetachment(actor, item, uniqueFilled);
  });

  Hooks.on('swse:progression:completed', async (data = {}) => {
    const actor = data?.actor;
    if (!_isFollowerOwnerActor(actor)) return;
    if (actor.isOwner !== true && game.user?.isGM !== true) return;

    try {
      await reconcileFollowerSlotsForActor(actor);
      await reconcileFollowerEnhancementsForActor(actor);
    } catch (err) {
      swseLogger?.warn?.(`[FollowerHooks] Progression reconciliation failed for ${actor?.name}:`, err);
    }
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (game.user.id !== userId) return;
    if (!_isFollowerOwnerActor(actor)) return;

    // If follower stats need updating, do it elsewhere; keep this hook minimal.
    if (changes.system?.level) {
      swseLogger?.debug?.(`FollowerHooks: owner level changed; followers may require recalculation.`);
    }
  });
}
