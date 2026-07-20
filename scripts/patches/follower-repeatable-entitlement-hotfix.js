import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerRepeatableEntitlement.registered.v1');
const QUEUES = new Map();
const REPAIRING = new Set();

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
}

function isOwnerActor(actor) {
  return actor?.type === 'character' || actor?.type === 'droid';
}

function followerOwnerId(actor) {
  return actor?.system?.npcProfile?.owner?.actorId || actor?.flags?.swse?.follower?.ownerId || null;
}

function followerTalentName(actor) {
  return actor?.system?.npcProfile?.owner?.talent?.name
    || actor?.flags?.swse?.follower?.grantingTalent
    || actor?.system?.progression?.grantingTalentName
    || null;
}

function isActiveFollower(actor) {
  if (!actor || actor.type !== 'npc') return false;
  const kind = actor.system?.npcProfile?.kind || actor.flags?.swse?.follower?.kind || null;
  const isFollower = kind === 'follower'
    || actor.system?.isFollower === true
    || actor.system?.progression?.isFollower === true
    || actor.flags?.swse?.follower?.isFollower === true
    || actor.getFlag?.('foundryvtt-swse', 'isFollower') === true;
  return isFollower
    && actor.flags?.swse?.follower?.active !== false
    && actor.getFlag?.('foundryvtt-swse', 'dismissedAlly') !== true;
}

function activeFollowersForOwner(owner) {
  const ids = new Set();
  for (const entry of owner.getFlag?.('foundryvtt-swse', 'followers') || []) if (entry?.id) ids.add(entry.id);
  for (const entry of owner.system?.ownedActors || []) if (entry?.id && (!entry.kind || entry.kind === 'follower')) ids.add(entry.id);
  for (const actor of game.actors || []) {
    if (isActiveFollower(actor) && followerOwnerId(actor) === owner.id) ids.add(actor.id);
  }
  return Array.from(ids).map(id => game.actors?.get(id)).filter(isActiveFollower);
}

function explicitTalentRank(item) {
  return Math.max(0, ...[
    item?.system?.repeatableRank,
    item?.system?.rank,
    item?.system?.count,
    item?.system?.quantity,
    item?.flags?.swse?.progression?.repeatableRank,
  ].map(value => Number(value || 0)).filter(Number.isFinite));
}

function buildSlot(item, cfg, rank, existing = null) {
  const profile = cfg?.fixedFollowerProfile || null;
  return {
    ...(existing || {}),
    id: existing?.id || foundry.utils.randomID?.() || Math.random().toString(36).slice(2),
    talentName: item.name,
    talentItemId: item.id,
    talentTreeId: item.system?.treeId || item.system?.tree || existing?.talentTreeId || null,
    talentRank: rank,
    templateChoices: Array.isArray(cfg?.templateChoices) ? [...cfg.templateChoices] : [],
    dependentKind: cfg?.dependentKind || 'follower',
    minionLevelOffset: cfg?.minionLevelOffset ?? null,
    minionLevelLabel: cfg?.minionLevelLabel ?? null,
    fixedFollowerProfileId: profile?.id || null,
    fixedSpeciesName: profile?.speciesName || null,
    noStartingCredits: cfg?.noStartingCredits === true || profile?.noStartingCredits === true,
    createdActorId: existing?.createdActorId || null,
    createdAt: existing?.createdAt || Date.now(),
  };
}

function groupFollowerTalents(actor) {
  const groups = new Map();
  for (const item of actor.items || []) {
    if (item.type !== 'talent') continue;
    const cfg = getFollowerTalentConfig(item.name, item);
    if (!cfg) continue;
    const key = normalize(item.name);
    const group = groups.get(key) || { name: item.name, items: [], cfg };
    group.items.push(item);
    group.cfg = cfg || group.cfg;
    groups.set(key, group);
  }
  return groups;
}

function desiredRankForGroup(group, ownerFollowers, existingSlots) {
  const max = Math.max(1, Number(group.cfg?.maxCount || group.cfg?.repeatableMax || 1));
  const itemCopies = group.items.length;
  const explicit = Math.max(0, ...group.items.map(explicitTalentRank));
  const linkedFollowers = ownerFollowers.filter(follower => normalize(followerTalentName(follower)) === normalize(group.name)).length;
  const slotEvidence = existingSlots.filter(slot => normalize(slot?.talentName) === normalize(group.name)).length;
  return Math.min(max, Math.max(1, itemCopies, explicit, linkedFollowers, slotEvidence));
}

function sameSlotState(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function repairRepeatableFollowerEntitlements(actor, { reason = 'manual' } = {}) {
  if (!isOwnerActor(actor) || REPAIRING.has(actor.id)) return [];
  REPAIRING.add(actor.id);
  try {
    const groups = groupFollowerTalents(actor);
    const currentSlots = (actor.getFlag('foundryvtt-swse', 'followerSlots') || []).map(slot => ({ ...slot }));
    const ownerFollowers = activeFollowersForOwner(actor);
    const nextSlots = currentSlots.filter(slot => !groups.has(normalize(slot?.talentName)));

    for (const group of groups.values()) {
      const desired = desiredRankForGroup(group, ownerFollowers, currentSlots);
      const matchingSlots = currentSlots
        .filter(slot => normalize(slot?.talentName) === normalize(group.name))
        .sort((a, b) => Number(a?.talentRank || 999) - Number(b?.talentRank || 999));
      const matchingFollowers = ownerFollowers.filter(follower => normalize(followerTalentName(follower)) === normalize(group.name));
      const claimedFollowerIds = new Set();

      // Preserve every distinct, valid filled link first.
      for (const slot of matchingSlots) {
        if (slot.createdActorId && matchingFollowers.some(follower => follower.id === slot.createdActorId) && !claimedFollowerIds.has(slot.createdActorId)) {
          claimedFollowerIds.add(slot.createdActorId);
        }
      }
      const unclaimedFollowers = matchingFollowers.filter(follower => !claimedFollowerIds.has(follower.id));

      for (let index = 0; index < desired; index += 1) {
        const rank = index + 1;
        const item = group.items[index] || group.items[0];
        let existing = matchingSlots.find(slot => Number(slot?.talentRank || 0) === rank)
          || matchingSlots[index]
          || null;
        const slot = buildSlot(item, group.cfg, rank, existing);

        if (!slot.createdActorId || claimedFollowerIds.has(slot.createdActorId) && nextSlots.some(entry => entry.createdActorId === slot.createdActorId)) {
          const follower = unclaimedFollowers.shift();
          if (follower) slot.createdActorId = follower.id;
        }
        if (slot.createdActorId) claimedFollowerIds.add(slot.createdActorId);
        nextSlots.push(slot);
      }

      // Persist rank on legacy collapsed items so the sheet and future repairs know
      // that one old document represents several lawful acquisitions.
      if (group.items.length === 1 && explicitTalentRank(group.items[0]) !== desired) {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
          _id: group.items[0].id,
          'system.repeatable': true,
          'system.repeatableRank': desired,
          'system.repeatableMax': Math.max(1, Number(group.cfg?.maxCount || desired)),
          'flags.swse.progression.repeatableRank': desired,
        }], { source: 'FollowerRepeatableEntitlement.persistLegacyRank' });
      }
    }

    nextSlots.sort((a, b) => String(a.talentName || '').localeCompare(String(b.talentName || '')) || Number(a.talentRank || 0) - Number(b.talentRank || 0));
    if (!sameSlotState(currentSlots, nextSlots)) {
      await actor.setFlag('foundryvtt-swse', 'followerSlots', nextSlots);
      swseLogger.log('[FollowerRepeatableEntitlement] Repaired canonical follower slots', {
        actor: actor.name,
        reason,
        before: currentSlots.length,
        after: nextSlots.length,
        filled: nextSlots.filter(slot => slot.createdActorId).length,
      });
    }
    return nextSlots;
  } finally {
    REPAIRING.delete(actor.id);
  }
}

function queueRepair(actor, reason) {
  if (!isOwnerActor(actor)) return;
  const previous = QUEUES.get(actor.id);
  if (previous) clearTimeout(previous);
  QUEUES.set(actor.id, setTimeout(async () => {
    QUEUES.delete(actor.id);
    const live = game.actors?.get(actor.id) || actor;
    try {
      await repairRepeatableFollowerEntitlements(live, { reason });
    } catch (err) {
      swseLogger.warn('[FollowerRepeatableEntitlement] Repair failed', { actor: live?.name, reason, error: err?.message || String(err) });
    }
  }, 25));
}

function appendTalentRankBadges(application) {
  const actor = application?.actor || application?.document || null;
  if (!isOwnerActor(actor)) return;
  const root = application?.element;
  if (!(root instanceof HTMLElement)) return;

  const groups = new Map();
  for (const item of actor.items || []) {
    if (item.type !== 'talent') continue;
    const key = normalize(item.name);
    const current = groups.get(key) || { name: item.name, count: 0 };
    current.count += 1;
    current.count = Math.max(current.count, explicitTalentRank(item));
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    if (group.count <= 1) continue;
    const candidates = root.querySelectorAll('[data-item-id], [data-talent-id], .talent-card, .swse-concept-talent-row, .swse-ability-item');
    for (const node of candidates) {
      const itemId = node.dataset?.itemId || node.dataset?.talentId;
      const item = itemId ? actor.items?.get(itemId) : null;
      const text = item?.name || node.querySelector?.('.name, .item-name, h3, h4, strong')?.textContent || '';
      if (normalize(text) !== normalize(group.name)) continue;
      if (node.querySelector('[data-swse-repeatable-rank-badge]')) continue;
      const anchor = node.querySelector('.name, .item-name, h3, h4, strong') || node;
      const badge = document.createElement('span');
      badge.dataset.swseRepeatableRankBadge = 'true';
      badge.className = 'swse-repeatable-rank-badge';
      badge.textContent = ` ×${group.count}`;
      badge.title = `${group.name} has been selected ${group.count} times.`;
      anchor.appendChild(badge);
    }
  }
}

export function registerFollowerRepeatableEntitlementHotfix() {
  if (globalThis[REGISTERED]) return;

  Hooks.on('createItem', item => {
    const actor = item?.parent || item?.actor;
    if (item?.type === 'talent' && getFollowerTalentConfig(item.name, item)) queueRepair(actor, 'talent-created');
  });
  Hooks.on('updateItem', item => {
    const actor = item?.parent || item?.actor;
    if (item?.type === 'talent' && getFollowerTalentConfig(item.name, item)) queueRepair(actor, 'talent-updated');
  });
  Hooks.on('deleteItem', item => {
    const actor = item?.parent || item?.actor;
    if (item?.type === 'talent') queueRepair(actor, 'talent-deleted');
  });
  Hooks.on('createActor', actor => {
    const ownerId = followerOwnerId(actor);
    if (ownerId) queueRepair(game.actors?.get(ownerId), 'follower-created');
  });
  Hooks.on('swse:progression:completed', data => {
    if (isOwnerActor(data?.actor)) queueRepair(data.actor, 'progression-completed');
    const ownerId = data?.owner || followerOwnerId(data?.actor);
    if (ownerId) queueRepair(game.actors?.get(ownerId), 'follower-progression-completed');
  });
  Hooks.on('renderApplicationV2', application => {
    const actor = application?.actor || application?.document;
    if (isOwnerActor(actor)) queueRepair(actor, 'sheet-render');
    queueMicrotask(() => appendTalentRankBadges(application));
  });
  Hooks.once('ready', () => {
    if (!game.user?.isGM) return;
    for (const actor of game.actors || []) if (isOwnerActor(actor)) queueRepair(actor, 'world-ready');
  });

  globalThis.SWSE ??= {};
  globalThis.SWSE.followers ??= {};
  globalThis.SWSE.followers.repairRepeatableEntitlements = repairRepeatableFollowerEntitlements;
  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[FollowerRepeatableEntitlement] Registered repeatable talent slot repair and rank display');
}
