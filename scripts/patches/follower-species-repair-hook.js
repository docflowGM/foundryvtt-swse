import { FollowerCreator } from '/systems/foundryvtt-swse/scripts/apps/follower-creator.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerSpeciesRepairHook.v1');

function isFollowerNpc(actor) {
  const profile = actor?.system?.npcProfile || {};
  return actor?.type === 'npc' && (
    actor?.system?.isFollower === true
    || actor?.system?.progression?.isFollower === true
    || profile.kind === 'follower'
    || actor?.flags?.swse?.follower?.isFollower === true
    || actor?.getFlag?.('foundryvtt-swse', 'isFollower') === true
  );
}

function buildRepairMutation(actor) {
  const progression = actor.system?.progression || {};
  const persistentChoices = {
    ...(progression.followerChoices || {}),
    speciesName: progression.followerChoices?.speciesName || actor.system?.race || actor.system?.species || null,
    templateType: progression.followerChoices?.templateType || progression.followerTemplate || actor.flags?.swse?.follower?.templateType || null,
  };
  const templateType = persistentChoices.templateType || progression.followerTemplate || actor.flags?.swse?.follower?.templateType || null;
  return {
    operation: 'update',
    ownerActorId: actor.system?.npcProfile?.owner?.actorId || actor.flags?.swse?.follower?.ownerId || null,
    existingFollowerId: actor.id,
    speciesName: persistentChoices.speciesName,
    templateType,
    persistentChoices,
    targetHeroicLevel: Number(actor.system?.level || 1) || 1,
    followerState: {
      level: Number(actor.system?.level || 1) || 1,
      abilities: actor.system?.attributes || actor.system?.abilities || {},
      hp: actor.system?.hp || { value: 1, max: 1 },
      baseAttackBonus: actor.system?.baseAttackBonus || 0,
      size: actor.system?.size,
      speed: actor.system?.speed,
      movement: actor.system?.movement,
      defenses: null,
    },
    grantingTalentName: actor.system?.npcProfile?.owner?.talent?.name || actor.flags?.swse?.follower?.grantingTalent || null,
    grantingTalentItemId: actor.system?.npcProfile?.owner?.talent?.id || actor.flags?.swse?.follower?.grantingTalentItemId || null,
  };
}

async function repairExistingFollowers() {
  if (!game.user?.isGM) return;
  await SpeciesRegistry.initialize?.();
  const followers = Array.from(game.actors || []).filter(isFollowerNpc);
  for (const follower of followers) {
    const mutation = buildRepairMutation(follower);
    if (!mutation.speciesName || !mutation.templateType) continue;
    try {
      await FollowerCreator.updateFollowerFromMutation(follower, mutation);
    } catch (error) {
      swseLogger.warn('[FollowerSpeciesRepair] Existing follower repair failed', {
        follower: follower.name,
        species: mutation.speciesName,
        error,
      });
    }
  }
  if (followers.length) {
    swseLogger.log('[FollowerSpeciesRepair] Existing follower repair pass complete', {
      followers: followers.length,
    });
  }
}

export function registerFollowerSpeciesRepairHook() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  Hooks.once('ready', () => repairExistingFollowers());
}
