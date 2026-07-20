import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { FollowerCreator } from '/systems/foundryvtt-swse/scripts/apps/follower-creator.js';
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { deriveFollowerStateForApply } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-deriver.js';
import { getAvailableFollowerSlots } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-session-seeder.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerOrphanTransfer.registered.v1');
const PROCESSING_OWNERS = new Set();
const TRANSFERRING_FOLLOWERS = new Set();

function isFollowerOwner(actor) {
  return actor?.type === 'character' || actor?.type === 'droid';
}

function isFollowerActor(actor) {
  if (!actor || actor.type !== 'npc') return false;
  const kind = actor.system?.npcProfile?.kind || actor.flags?.swse?.follower?.kind || null;
  return kind === 'follower'
    || actor.system?.isFollower === true
    || actor.system?.progression?.isFollower === true
    || actor.flags?.swse?.follower?.isFollower === true
    || actor.getFlag?.('foundryvtt-swse', 'isFollower') === true;
}

function ownerIdForFollower(follower) {
  return follower?.system?.npcProfile?.owner?.actorId
    || follower?.flags?.swse?.follower?.ownerId
    || null;
}

function isExplicitlyDead(actor) {
  if (!actor) return false;
  const statuses = actor.statuses;
  const hasDeadStatus = statuses?.has?.('dead')
    || statuses?.has?.('death')
    || Array.from(statuses || []).some(status => String(status || '').toLowerCase() === 'dead');
  const systemStatus = String(
    actor.system?.health?.status
    || actor.system?.lifeState
    || actor.system?.status
    || ''
  ).trim().toLowerCase();
  return hasDeadStatus
    || actor.system?.dead === true
    || actor.system?.isDead === true
    || actor.flags?.swse?.dead === true
    || actor.flags?.swse?.isDead === true
    || systemStatus === 'dead'
    || systemStatus === 'deceased';
}

function followerIdsForOwner(owner) {
  const ids = new Set();
  for (const entry of owner?.getFlag?.('foundryvtt-swse', 'followers') || []) {
    if (entry?.id) ids.add(entry.id);
  }
  for (const slot of owner?.getFlag?.('foundryvtt-swse', 'followerSlots') || []) {
    if (slot?.createdActorId) ids.add(slot.createdActorId);
  }
  for (const entry of owner?.system?.ownedActors || []) {
    if (entry?.id) ids.add(entry.id);
  }
  for (const candidate of game.actors || []) {
    if (isFollowerActor(candidate) && ownerIdForFollower(candidate) === owner?.id) ids.add(candidate.id);
  }
  return Array.from(ids);
}

function followerLink(follower, slot = null) {
  return {
    id: follower.id,
    name: follower.name,
    type: follower.type,
    img: follower.img,
    kind: 'follower',
    talent: slot?.talentName || follower.system?.npcProfile?.owner?.talent || null,
    templateType: follower.system?.progression?.followerTemplate || follower.flags?.swse?.follower?.templateType || null,
  };
}

async function clearOwnerRegistries(owner, followerId, { clearSlot = true } = {}) {
  if (!owner) return;
  const slots = (owner.getFlag('foundryvtt-swse', 'followerSlots') || []).map(slot => {
    if (!clearSlot || slot.createdActorId !== followerId) return slot;
    return {
      ...slot,
      createdActorId: null,
      orphanedFollowerId: followerId,
      orphanedAt: Date.now(),
    };
  });
  const followers = (owner.getFlag('foundryvtt-swse', 'followers') || []).filter(entry => entry?.id !== followerId);
  const ownedActors = (owner.system?.ownedActors || []).filter(entry => entry?.id !== followerId);

  await owner.setFlag('foundryvtt-swse', 'followerSlots', slots);
  await owner.setFlag('foundryvtt-swse', 'followers', followers);
  await ActorEngine.updateActor(owner, { 'system.ownedActors': ownedActors }, {
    source: 'FollowerOrphanTransfer.clearOwnerRegistries',
  });
}

async function markFollowerOrphaned(follower, owner, reason) {
  const priorTalent = follower.system?.npcProfile?.owner?.talent || {
    id: follower.flags?.swse?.follower?.grantingTalentItemId || null,
    name: follower.flags?.swse?.follower?.grantingTalent || null,
  };
  const priorOwnerId = owner?.id || ownerIdForFollower(follower);
  const priorOwnerName = owner?.name || follower.flags?.swse?.follower?.formerOwnerName || 'Unknown Owner';
  const orphanedAt = Date.now();

  await ActorEngine.updateActor(follower, {
    'system.npcProfile.owner.actorId': null,
    'system.npcProfile.owner.talent': null,
    'system.npcProfile.owner.orphaned': true,
    'system.npcProfile.owner.formerActorId': priorOwnerId,
    'system.npcProfile.owner.formerActorName': priorOwnerName,
    'system.npcProfile.owner.formerTalent': priorTalent,
    'system.npcProfile.owner.orphanReason': reason,
    'system.npcProfile.owner.orphanedAt': orphanedAt,
    'flags.swse.follower.ownerId': null,
    'flags.swse.follower.orphaned': true,
    'flags.swse.follower.orphanReason': reason,
    'flags.swse.follower.orphanedAt': orphanedAt,
    'flags.swse.follower.formerOwnerId': priorOwnerId,
    'flags.swse.follower.formerOwnerName': priorOwnerName,
    'flags.swse.follower.formerGrantingTalent': priorTalent,
    'flags.swse.follower.active': true,
  }, { source: 'FollowerOrphanTransfer.markFollowerOrphaned' });

  swseLogger.log('[FollowerOrphanTransfer] Follower preserved as orphan', {
    follower: follower.name,
    formerOwner: priorOwnerName,
    reason,
  });
}

export async function orphanFollowersForOwner(owner, { reason = 'owner-unavailable' } = {}) {
  if (!isFollowerOwner(owner) || PROCESSING_OWNERS.has(owner.id)) return [];
  PROCESSING_OWNERS.add(owner.id);
  const orphaned = [];
  try {
    const followerIds = followerIdsForOwner(owner);
    for (const followerId of followerIds) {
      const follower = game.actors?.get(followerId);
      if (!isFollowerActor(follower)) continue;
      await clearOwnerRegistries(owner, follower.id);
      await markFollowerOrphaned(follower, owner, reason);
      orphaned.push(follower);
    }
    if (orphaned.length) {
      ui?.notifications?.warn?.(`${owner.name}'s ${orphaned.length === 1 ? 'follower is' : `${orphaned.length} followers are`} now unassigned and can be reassigned by a GM.`);
    }
    return orphaned;
  } finally {
    PROCESSING_OWNERS.delete(owner.id);
  }
}

function isOrphanFollower(follower) {
  if (!isFollowerActor(follower)) return false;
  const ownerId = ownerIdForFollower(follower);
  return follower.flags?.swse?.follower?.orphaned === true
    || follower.system?.npcProfile?.owner?.orphaned === true
    || !ownerId
    || !game.actors?.get(ownerId);
}

function slotSupportsFollower(slot, follower) {
  if (!slot || slot.createdActorId) return false;
  if (slot.dependentKind && slot.dependentKind !== 'follower') return false;

  const templateType = follower.system?.progression?.followerTemplate
    || follower.flags?.swse?.follower?.templateType
    || null;
  if (templateType && Array.isArray(slot.templateChoices) && slot.templateChoices.length && !slot.templateChoices.includes(templateType)) {
    return false;
  }

  const fixedProfileId = follower.system?.progression?.fixedFollowerProfile?.id
    || follower.flags?.swse?.follower?.fixedFollowerProfileId
    || follower.flags?.['foundryvtt-swse']?.fixedFollowerProfile?.id
    || null;
  const slotFixedProfileId = slot.fixedFollowerProfileId || null;
  if (fixedProfileId || slotFixedProfileId) return fixedProfileId === slotFixedProfileId;

  return true;
}

export function getEligibleFollowerTransferSlots(follower) {
  if (!isOrphanFollower(follower)) return [];
  const candidates = [];
  for (const owner of game.actors || []) {
    if (!isFollowerOwner(owner) || owner.id === follower.id || isExplicitlyDead(owner)) continue;
    const slots = getAvailableFollowerSlots(owner).filter(slot => slotSupportsFollower(slot, follower));
    for (const slot of slots) candidates.push({ owner, slot });
  }
  return candidates.sort((a, b) => {
    const ownerCompare = String(a.owner.name || '').localeCompare(String(b.owner.name || ''));
    return ownerCompare || String(a.slot.talentName || '').localeCompare(String(b.slot.talentName || ''));
  });
}

async function setOwnerLink(owner, follower, slot) {
  const slots = (owner.getFlag('foundryvtt-swse', 'followerSlots') || []).map(entry => {
    if (entry.id !== slot.id) return entry;
    return {
      ...entry,
      createdActorId: follower.id,
      assignedAt: Date.now(),
      adoptedFollower: true,
      orphanedFollowerId: null,
      orphanedAt: null,
    };
  });
  const link = followerLink(follower, slot);
  const followers = (owner.getFlag('foundryvtt-swse', 'followers') || []).filter(entry => entry?.id !== follower.id);
  followers.push(link);
  const ownedActors = (owner.system?.ownedActors || []).filter(entry => entry?.id !== follower.id);
  ownedActors.push(link);

  await owner.setFlag('foundryvtt-swse', 'followerSlots', slots);
  await owner.setFlag('foundryvtt-swse', 'followers', followers);
  await ActorEngine.updateActor(owner, { 'system.ownedActors': ownedActors }, {
    source: 'FollowerOrphanTransfer.setOwnerLink',
  });
}

async function grantNewOwnerPermission(owner, follower) {
  const ownerUser = game.users?.find(user => user.character?.id === owner.id);
  if (!ownerUser) return;
  const ownership = { ...(follower.ownership || {}) };
  ownership[ownerUser.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  await ActorEngine.updateActor(follower, { ownership }, {
    source: 'FollowerOrphanTransfer.grantNewOwnerPermission',
  });
}

export async function transferOrphanFollower(follower, newOwner, slot) {
  if (!game.user?.isGM) throw new Error('Only a GM can reassign an orphaned follower.');
  if (!isOrphanFollower(follower)) throw new Error('This follower is not currently orphaned.');
  if (!isFollowerOwner(newOwner)) throw new Error('The selected actor cannot own followers.');
  if (!slotSupportsFollower(slot, follower)) throw new Error('The selected follower slot is no longer available or compatible.');
  if (TRANSFERRING_FOLLOWERS.has(follower.id)) return follower;

  TRANSFERRING_FOLLOWERS.add(follower.id);
  try {
    const formerOwnerId = follower.flags?.swse?.follower?.formerOwnerId || null;
    const formerOwner = formerOwnerId ? game.actors?.get(formerOwnerId) : null;
    if (formerOwner) await clearOwnerRegistries(formerOwner, follower.id);

    await setOwnerLink(newOwner, follower, slot);
    const newTalent = slot.talentName ? { id: slot.talentItemId || null, name: slot.talentName } : null;
    await ActorEngine.updateActor(follower, {
      'system.npcProfile.owner.actorId': newOwner.id,
      'system.npcProfile.owner.talent': newTalent,
      'system.npcProfile.owner.orphaned': false,
      'system.npcProfile.owner.adopted': true,
      'system.npcProfile.owner.adoptedAt': Date.now(),
      'flags.swse.follower.ownerId': newOwner.id,
      'flags.swse.follower.grantingTalent': slot.talentName || null,
      'flags.swse.follower.grantingTalentItemId': slot.talentItemId || null,
      'flags.swse.follower.orphaned': false,
      'flags.swse.follower.orphanReason': null,
      'flags.swse.follower.active': true,
      'flags.swse.follower.adoptedAt': Date.now(),
      'flags.swse.follower.adoptedByOwnerId': newOwner.id,
    }, { source: 'FollowerOrphanTransfer.transfer' });

    await grantNewOwnerPermission(newOwner, follower);

    const persistentChoices = follower.system?.progression?.followerChoices || {};
    const templateType = follower.system?.progression?.followerTemplate || follower.flags?.swse?.follower?.templateType;
    const speciesName = follower.system?.race || persistentChoices.speciesName;
    if (templateType && speciesName) {
      const ownerHeroicLevel = getHeroicLevel(newOwner) || 1;
      const followerState = await deriveFollowerStateForApply(ownerHeroicLevel, speciesName, templateType, persistentChoices);
      await FollowerCreator.updateFollowerFromMutation(follower, {
        ownerActorId: newOwner.id,
        speciesName,
        templateType,
        persistentChoices,
        followerState,
        targetHeroicLevel: ownerHeroicLevel,
        grantingTalentName: slot.talentName || null,
        grantingTalentItemId: slot.talentItemId || null,
        grantingTalentTreeId: slot.talentTreeId || null,
        slotTalentName: slot.talentName || null,
        slotTalentItemId: slot.talentItemId || null,
        slotTalentTreeId: slot.talentTreeId || null,
      });
    }

    await FollowerCreator._linkFollowerToOwner(newOwner, follower, newTalent);
    ui?.notifications?.info?.(`${follower.name} is now assigned to ${newOwner.name}.`);
    swseLogger.log('[FollowerOrphanTransfer] Reassigned follower', {
      follower: follower.name,
      newOwner: newOwner.name,
      slotId: slot.id,
      talent: slot.talentName || null,
    });
    return follower;
  } finally {
    TRANSFERRING_FOLLOWERS.delete(follower.id);
  }
}

function escapeHtml(value) {
  const text = String(value ?? '');
  return foundry.utils.escapeHTML?.(text)
    || text.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

export async function promptFollowerReassignment(follower) {
  if (!game.user?.isGM) {
    ui?.notifications?.warn?.('Only a GM can reassign an orphaned follower.');
    return null;
  }
  const choices = getEligibleFollowerTransferSlots(follower);
  if (!choices.length) {
    ui?.notifications?.warn?.('No living actor currently has an open, compatible follower slot.');
    return null;
  }

  const options = choices.map(({ owner, slot }, index) => {
    const label = `${owner.name} — ${slot.talentName || 'Follower Slot'}`;
    return `<option value="${index}">${escapeHtml(label)}</option>`;
  }).join('');

  const selectedIndex = await SWSEDialogV2.prompt({
    title: `Reassign ${follower.name}`,
    content: `
      <form class="swse-follower-transfer-form">
        <p>Select a character with an open follower slot. The follower remains the same actor and is recalculated to the new owner's heroic level.</p>
        <div class="form-group">
          <label>New Owner and Slot</label>
          <select name="transferTarget">${options}</select>
        </div>
      </form>
    `,
    label: 'Reassign Follower',
    callback: (html) => Number(html?.[0]?.querySelector?.('[name="transferTarget"]')?.value ?? 0),
    options: { width: 520 },
  });

  if (!Number.isInteger(selectedIndex) || !choices[selectedIndex]) return null;
  const { owner, slot } = choices[selectedIndex];
  return transferOrphanFollower(follower, owner, slot);
}

function appendOrphanTransferControl(application) {
  if (!game.user?.isGM) return;
  const follower = application?.actor || application?.document || null;
  if (!isOrphanFollower(follower)) return;
  const root = application?.element;
  if (!(root instanceof HTMLElement) || root.querySelector('[data-swse-reassign-orphan-follower]')) return;

  const body = root.querySelector('.swse-npc-owner-card .swse-npc-card__body')
    || root.querySelector('.swse-npc-follower-card')
    || root;
  const wrapper = document.createElement('div');
  wrapper.className = 'swse-npc-callout swse-npc-callout--follower-advance';
  wrapper.dataset.swseReassignOrphanFollower = 'true';
  wrapper.innerHTML = `
    <strong>Follower Unassigned:</strong>
    The previous owner is dead, deleted, or unavailable. This follower remains in the world and can be assigned to another character with an open follower slot.
    <div class="swse-npc-action-row">
      <button type="button" class="swse-npc-action-button" data-swse-action="reassign-orphan-follower">Reassign Follower</button>
    </div>
  `;
  wrapper.querySelector('[data-swse-action="reassign-orphan-follower"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    void promptFollowerReassignment(follower);
  });
  body.appendChild(wrapper);
}

export function registerFollowerOrphanTransferHotfix() {
  if (globalThis[REGISTERED]) return;

  Hooks.on('preDeleteActor', async (actor, _options, userId) => {
    if (game.user?.id !== userId || !isFollowerOwner(actor)) return;
    await orphanFollowersForOwner(actor, { reason: 'owner-deleted' });
  });

  Hooks.on('updateActor', async (actor, _changes, _options, userId) => {
    if (game.user?.id !== userId || !isFollowerOwner(actor)) return;
    if (!isExplicitlyDead(actor)) return;
    const processed = actor.flags?.swse?.followerOwnerDeathProcessed === true;
    if (processed) return;
    await ActorEngine.updateActor(actor, { 'flags.swse.followerOwnerDeathProcessed': true }, {
      source: 'FollowerOrphanTransfer.markOwnerDeathProcessed',
    });
    await orphanFollowersForOwner(actor, { reason: 'owner-dead' });
  });

  Hooks.on('renderApplicationV2', (application) => appendOrphanTransferControl(application));

  Hooks.once('ready', async () => {
    if (!game.user?.isGM) return;
    for (const follower of game.actors || []) {
      if (!isFollowerActor(follower)) continue;
      const ownerId = ownerIdForFollower(follower);
      if (ownerId && !game.actors?.get(ownerId)) {
        await markFollowerOrphaned(follower, null, 'owner-missing');
      }
    }
  });

  globalThis.SWSE ??= {};
  globalThis.SWSE.followers ??= {};
  globalThis.SWSE.followers.getEligibleTransferSlots = getEligibleFollowerTransferSlots;
  globalThis.SWSE.followers.transferOrphan = transferOrphanFollower;
  globalThis.SWSE.followers.promptReassignment = promptFollowerReassignment;
  globalThis.SWSE.followers.orphanForOwner = orphanFollowersForOwner;

  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[FollowerOrphanTransfer] Registered follower orphan preservation and reassignment');
}
