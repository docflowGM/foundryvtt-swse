/**
 * Recorded ownership of a droid/vehicle asset, and who may pay for changes to it (pure; no Foundry globals).
 *
 * ONE definition of "who owns this asset" for wallet resolution and payer authorization. It reads every
 * ownership record the Store/assignment/follower flows write (the same set VehicleInstallationService.isRecordedOwner
 * uses). Records that name DIFFERENT single owners are a contradiction and fail closed. A payer is authorized only if
 * it is the asset itself (self-funded), a recorded owner, or - explicitly - a GM. There is no fallback to "whichever
 * character the user controls".
 */
const SYSTEM_ID = 'foundryvtt-swse';

const clean = value => (typeof value === 'string' ? value.trim() : '');

/**
 * `single`: CURRENT-ownership records (assignment, follower and primary-owner links); two different ids here are a
 * contradiction. `co`: additional recorded owners - co-owner lists and the ORIGINAL acquirer in `storeAcquisition`
 * (a purchase record that may legitimately differ from the current owner after a transfer, so it is accepted as a
 * recorded owner but never counts as a contradiction).
 */
export function listRecordedOwnerIds(actor) {
  if (!actor) return { single: [], co: [] };
  const s = actor.system ?? {};
  const single = [
    s.ownedByActorId, actor.flags?.swse?.ownedByActorId, actor.flags?.[SYSTEM_ID]?.ownedByActorId,
    s.assetOwnership?.primaryOwnerActorId,
    s.npcProfile?.owner?.actorId, actor.flags?.swse?.follower?.ownerId
  ].map(clean).filter(Boolean);
  const co = [
    ...(Array.isArray(s.assetOwnership?.ownerActorIds) ? s.assetOwnership.ownerActorIds : []),
    s.storeAcquisition?.ownerActorId, actor.flags?.[SYSTEM_ID]?.storeAcquisition?.ownerActorId
  ].map(clean).filter(Boolean);
  return { single: [...new Set(single)], co: [...new Set(co)] };
}

/**
 * Is this actor id a RECORDED owner of the asset (no GM override)? Fails closed when the single-owner
 * records contradict each other: no id is "the" owner of an asset whose records disagree.
 */
export function isRecordedOwnerId(actor, id) {
  const wanted = clean(id);
  if (!wanted) return false;
  const { single, co } = listRecordedOwnerIds(actor);
  if (single.length > 1) return false;
  return single.includes(wanted) || co.includes(wanted);
}

/**
 * @param {object} actor
 * @param {{getActor?: (id:string)=>object|null}} [options]  actor lookup, used only to detect a deleted owner
 * @returns {{status:'NONE'|'RESOLVED'|'CONTRADICTORY'|'MISSING_ACTOR', ownerId:string|null, ownerIds:string[]}}
 */
export function resolveAssetOwner(actor, { getActor } = {}) {
  const { single, co } = listRecordedOwnerIds(actor);
  if (single.length > 1) return { status: 'CONTRADICTORY', ownerId: null, ownerIds: single };
  const ownerId = single[0] ?? null;
  if (!ownerId) return { status: 'NONE', ownerId: null, ownerIds: co };
  if (typeof getActor === 'function' && !getActor(ownerId)) return { status: 'MISSING_ACTOR', ownerId, ownerIds: [ownerId, ...co] };
  return { status: 'RESOLVED', ownerId, ownerIds: [ownerId, ...co] };
}

/** Back-compat helper: the single recorded owner id, or null when there is none or the records contradict. */
export function resolveAssetOwnerId(actor) {
  const r = resolveAssetOwner(actor);
  return r.status === 'RESOLVED' ? r.ownerId : null;
}

/**
 * May `wallet` pay for (and receive resale from) changes to `asset`?
 * Contradictory ownership records are refused for everyone, including a self-funded asset and a GM (a GM repairs
 * the data); otherwise the asset itself, a recorded owner, or an explicit GM override.
 * @returns {{ok:boolean, reason?:string, gmOverride?:boolean}}
 */
export function authorizePayer(asset, wallet, { isGM = false } = {}) {
  if (!asset || !wallet?.id) return { ok: false, reason: 'No payer actor was resolved for this transaction.' };
  // Contradictory records are checked FIRST so that self-funding cannot bypass the repair requirement.
  if (resolveAssetOwner(asset).status === 'CONTRADICTORY') {
    return { ok: false, reason: 'This asset has contradictory ownership records; a GM must repair them before it can be customized.' };
  }
  if (asset.id && wallet.id === asset.id) return { ok: true };
  if (isRecordedOwnerId(asset, wallet.id)) return { ok: true };
  if (isGM) return { ok: true, gmOverride: true };
  return { ok: false, reason: 'The selected payer is not a recorded owner of this asset.' };
}
