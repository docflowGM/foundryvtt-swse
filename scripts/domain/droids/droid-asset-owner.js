/**
 * Owner of a droid/vehicle asset (pure; no Foundry globals).
 *
 * The ONE definition of "which actor owns this asset" that wallet resolution
 * reads. It covers the purchase/assignment link (`ownedByActorId`) and the
 * follower link (`npcProfile.owner.actorId` / `flags.swse.follower.ownerId`),
 * so a follower droid's customization is funded by its owner through the real
 * payer/asset separation TransactionEngine already supports - no actor Proxy
 * or monkey patch is needed. Returns an id only; callers fetch the Actor.
 */
const SYSTEM_ID = 'foundryvtt-swse';

export function resolveAssetOwnerId(actor) {
  if (!actor) return null;
  const candidates = [
    actor.system?.ownedByActorId,
    actor.flags?.swse?.ownedByActorId,
    actor.flags?.[SYSTEM_ID]?.ownedByActorId,
    actor.system?.npcProfile?.owner?.actorId,
    actor.flags?.swse?.follower?.ownerId
  ];
  for (const value of candidates) {
    const id = typeof value === 'string' ? value.trim() : '';
    if (id) return id;
  }
  return null;
}
