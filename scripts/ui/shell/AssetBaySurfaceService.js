/**
 * AssetBaySurfaceService — Garage / Shipyard ownership dashboard.
 *
 * This surface is intentionally an owner-control point. It lists droids or
 * vehicles owned by the current actor and lets the player open the owned
 * actor sheet or route that owned actor into the inline Garage/Shipyard
 * customization surface.
 */

import { listRecordedOwnerIds, listAcquisitionProvenanceIds, isRecordedOwnerId, resolveAssetOwner } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-asset-owner.js';
import { buildVehicleAssetSummary, loadUnusedEpTable } from '/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value.contents)) return value.contents;
  if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') return Array.from(value);
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeId(value) {
  return String(value ?? '')
    .replace(/^Actor\./, '')
    .replace(/^Compendium\.[^.]+\.[^.]+\.Actor\./, '')
    .trim();
}

function actorFromReference(entry) {
  const direct = entry?.actor || entry?.document;
  if (direct?.id && direct?.type) return direct;
  const id = normalizeId(entry?.id ?? entry?.actorId ?? entry?.uuid ?? entry?.documentId);
  if (!id) return null;
  return game.actors?.get?.(id) ?? null;
}

function normalizeAssetType(value) {
  const raw = String(value ?? '').toLowerCase().trim();
  if (!raw) return '';
  if (raw === 'droid' || raw === 'asset-droid' || raw === 'owned-droid' || raw === 'follower-droid') return 'droid';
  if (['vehicle', 'ship', 'starship', 'asset-vehicle', 'asset-ship', 'owned-vehicle', 'owned-ship'].includes(raw)) return 'vehicle';
  if (raw.includes('droid')) return 'droid';
  if (raw.includes('vehicle') || raw.includes('ship') || raw.includes('starship') || raw.includes('speeder') || raw.includes('walker')) return 'vehicle';
  return raw;
}

function entryType(entry, actor = null) {
  return normalizeAssetType(
    actor?.type
    ?? entry?.type
    ?? entry?.actorType
    ?? entry?.documentType
    ?? entry?.kind
    ?? ''
  );
}

function normalizeBayMode(value) {
  const mode = String(value || 'all').toLowerCase();
  if (mode === 'garage' || mode === 'droid' || mode === 'droids') return 'garage';
  if (mode === 'shipyard' || mode === 'ship' || mode === 'ships' || mode === 'vehicle' || mode === 'vehicles' || mode === 'starship') return 'shipyard';
  return 'all';
}

function assetModeFor(entry, actor = null) {
  const type = entryType(entry, actor);
  if (type === 'droid') return 'garage';
  if (type === 'vehicle') return 'shipyard';
  return null;
}

function matchesMode(entry, mode, actor = null) {
  const normalizedMode = normalizeBayMode(mode);
  const assetMode = assetModeFor(entry, actor);
  if (!assetMode) return false;
  if (normalizedMode === 'all') return true;
  return normalizedMode === assetMode;
}

function displayName(entry, actor = null) {
  return String(actor?.name ?? entry?.name ?? entry?.label ?? entry?.title ?? 'Unlinked Asset');
}

function displayImage(entry, actor = null) {
  return actor?.img || entry?.img || entry?.image || entry?.thumbnail || 'icons/svg/mystery-man.svg';
}

function ownedItemReferences(ownerActor) {
  const refs = [];
  for (const item of asArray(ownerActor?.items)) {
    const type = normalizeAssetType(item?.type ?? item?.system?.type ?? item?.system?.assetType);
    if (!['droid', 'vehicle'].includes(type)) continue;
    refs.push({
      id: item.system?.actorId ?? item.system?.linkedActorId ?? item.flags?.['foundryvtt-swse']?.actorId ?? item.id,
      uuid: item.system?.actorUuid ?? item.system?.uuid ?? item.flags?.['foundryvtt-swse']?.actorUuid ?? '',
      name: item.name,
      img: item.img,
      type,
      itemId: item.id,
      source: 'item'
    });
  }
  return refs;
}

function normalizeReferenceId(value) {
  return normalizeId(value).replace(/^\s+|\s+$/g, '');
}

/**
 * Relationship of `ownerActor` to a droid/vehicle asset, decided by the CANONICAL recorded-owner authority (droid-asset-owner.js: the same
 * contract VehicleInstallationService / payer authorization use). No second owner parser lives here. The relations stay apart:
 *   OWNER / CO_OWNER   current primary owner; explicit co-owner only while assetOwnership.shared === true
 *   ACCESS_ONLY        accessActorIds / assetGrant.recipientActorIds: permission to see or open it, never possession
 *   FORMER_OWNER       the historical purchaser of an asset since transferred: evidence only
 *   CONTRADICTORY      records name different primary owners: nobody is the owner (fails closed, GM included, a GM repairs the data)
 *   NAME_ONLY          no stable owner identity at all, but a display name matches: unresolved, never ownership
 *   NOT_LINKED         anything else (visibility, document permission, a shared Foundry user and a shared name are NOT relations)
 * @returns {{status:string, matches:boolean, nameOnly:boolean, accessOnly:boolean}}
 */
export function assetOwnershipEvidence(asset, ownerActor) {
  const none = { status: 'NOT_LINKED', matches: false, nameOnly: false, accessOnly: false };
  if (!asset || !['vehicle', 'droid'].includes(asset.type) || !ownerActor?.id) return none;
  const id = String(ownerActor.id).trim();
  const resolved = resolveAssetOwner(asset);
  if (resolved.status === 'CONTRADICTORY') return { ...none, status: 'CONTRADICTORY' };
  if (isRecordedOwnerId(asset, id)) {
    return { status: listRecordedOwnerIds(asset).single.includes(id) ? 'OWNER' : 'CO_OWNER', matches: true, nameOnly: false, accessOnly: false };
  }
  const system = asset.system ?? {};
  const flags = asset.flags ?? {};
  const grant = flags['foundryvtt-swse']?.assetGrant ?? flags.swse?.assetGrant ?? {};
  const accessIds = [...asArray(system.assetOwnership?.accessActorIds), ...asArray(grant.recipientActorIds)].map(v => String(v ?? '').trim());
  if (accessIds.includes(id)) return { ...none, status: 'ACCESS_ONLY', accessOnly: true };
  if (listAcquisitionProvenanceIds(asset).includes(id)) return { ...none, status: 'FORMER_OWNER' };
  const recorded = listRecordedOwnerIds(asset);
  const hasStableIdentity = recorded.single.length > 0 || recorded.co.length > 0 || accessIds.some(Boolean) || listAcquisitionProvenanceIds(asset).length > 0;
  const ownerName = String(ownerActor.name || '').trim().toLowerCase();
  const sysOwner = system.owner;
  const names = [
    system.ownedByActorName, system.ownerActorName, system.ownerName, typeof sysOwner === 'string' ? sysOwner : sysOwner?.name,
    system.assetOwnership?.primaryOwnerActorName, system.storeAcquisition?.ownerActorName,
    (flags['foundryvtt-swse']?.storeAcquisition ?? flags.swse?.storeAcquisition ?? {}).ownerActorName
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
  // A name record never establishes possession, and is "unresolved" only when the asset carries no stable identity at all.
  return { ...none, status: !hasStableIdentity && !!ownerName && names.includes(ownerName) ? 'NAME_ONLY' : 'NOT_LINKED', nameOnly: !hasStableIdentity && !!ownerName && names.includes(ownerName) };
}

const OWNERSHIP_LABEL = Object.freeze({
  OWNER: 'Owned', CO_OWNER: 'Shared co-owner', ACCESS_ONLY: 'Access only (not owned)', FORMER_OWNER: 'Former owner (not owned)',
  CONTRADICTORY: 'Ownership records contradict', NAME_ONLY: 'Owner recorded by name only (unresolved)', NOT_LINKED: 'Linked, ownership not recorded'
});

/** Vehicles the actor OWNS per the canonical authority (current owner / active co-owner). */
function vehicleOwnerMatchesActor(vehicle, ownerActor) {
  return vehicle?.type === 'vehicle' && assetOwnershipEvidence(vehicle, ownerActor).matches;
}

function ownedVehicleReferencesFromActorOwnership(ownerActor, { includeAccessOnly = false } = {}) {
  if (!ownerActor?.id) return [];
  return asArray(game?.actors?.contents ?? game?.actors ?? [])
    .filter(actor => {
      if (actor?.type !== 'vehicle') return false;
      const evidence = assetOwnershipEvidence(actor, ownerActor);
      return evidence.matches || (includeAccessOnly && evidence.accessOnly);
    })
    .map(actor => ({
      id: actor.id,
      actorId: actor.id,
      uuid: actor.uuid || `Actor.${actor.id}`,
      name: actor.name,
      img: actor.img,
      type: 'vehicle',
      source: assetOwnershipEvidence(actor, ownerActor).matches ? 'vehicle-owner-link' : 'vehicle-access-grant',
      role: 'vehicle',
      ownerActorId: ownerActor.id
    }));
}

/**
 * UI availability of Modify. Foundry document permission (actor.isOwner) is NOT in-game property ownership:
 * a vehicle is modifiable here only when the user may edit the Actor AND it is linked to the owner actor as
 * property (or the user is a GM). Authoritative checks remain in VehicleInstallationService/TransactionEngine.
 */
export function assetModifyAuthorization({ user, ownerActor, assetActor }) {
  if (!assetActor?.id) return { allowed: false, reason: 'LINK_UNRESOLVED' };
  const owned = ['vehicle', 'droid'].includes(assetActor.type);
  const evidence = owned ? assetOwnershipEvidence(assetActor, ownerActor) : null;
  // contradictory ownership records are refused for everyone, a GM included (a GM repairs the data), exactly like payer authorization
  if (evidence?.status === 'CONTRADICTORY') return { allowed: false, reason: 'OWNERSHIP_CONTRADICTORY' };
  if (user?.isGM) return { allowed: true, reason: null };
  if (assetActor.isOwner !== true) return { allowed: false, reason: 'NO_DOCUMENT_PERMISSION' };
  if (owned && !evidence.matches) {
    const reason = { ACCESS_ONLY: 'ACCESS_ONLY', FORMER_OWNER: 'FORMER_OWNER', NAME_ONLY: 'OWNER_IDENTITY_UNRESOLVED' }[evidence.status] ?? 'NOT_LINKED_AS_PROPERTY';
    return { allowed: false, reason };
  }
  return { allowed: true, reason: null };
}

function documentPermissionLabel(actor) {
  if (!actor?.id) return '';
  return actor.isOwner === true ? 'Document permission: Owner' : 'Document permission: view only';
}

function followerSlotReferences(ownerActor) {
  const refs = [];
  for (const slot of asArray(ownerActor?.getFlag?.('foundryvtt-swse', 'followerSlots'))) {
    const actorId = slot?.createdActorId ?? slot?.actorId ?? slot?.id;
    if (!actorId) continue;
    refs.push({
      id: actorId,
      actorId,
      uuid: slot?.createdActorUuid ?? slot?.actorUuid ?? `Actor.${actorId}`,
      name: slot?.name ?? slot?.label ?? 'Linked Follower',
      type: slot?.actorType ?? slot?.type ?? slot?.kind ?? '',
      source: 'follower-slot',
      slotId: slot?.id
    });
  }
  return refs;
}

function detailLine(entry, actor = null, mode = 'garage', vehicle = null) {
  const system = actor?.system ?? entry?.system ?? {};
  // Vehicles: published/custom identity comes from the runtime schema, never from legacy system.model/frame.
  if (mode === 'shipyard' && vehicle) return `${vehicle.originLabel}${vehicle.sourceLabel ? ' · ' + vehicle.sourceLabel : ''}`;
  if (mode === 'shipyard') return String(entry?.model ?? entry?.role ?? 'Vehicle');
  return String(system.droidModel ?? system.model ?? system.droidType ?? entry?.model ?? entry?.role ?? 'Droid');
}

function statusLine(entry, actor = null, mode = 'garage', vehicle = null) {
  if (!actor) return 'Link unresolved';
  if (mode === 'shipyard') {
    if (!vehicle) return 'HP —';
    return [vehicle.hpLabel, vehicle.shieldLabel, vehicle.installationLabel].join(' · ');
  }
  const hp = actor.system?.hp ?? actor.system?.hitPoints ?? {};
  const hpText = hp?.max ? `HP ${hp.value ?? 0}/${hp.max}` : 'HP —';
  const source = actor.system?.buildSource || actor.system?.source || actor.system?.droidSource || 'Droid property';
  return `${hpText} · ${source}`;
}

function collectOwnedEntries(ownerActor, mode, epTable = null, user = null, { includeAccessOnly = false } = {}) {
  const normalizedMode = normalizeBayMode(mode);
  const system = ownerActor?.system ?? {};
  const candidates = [
    ...asArray(system.ownedActors),
    ...asArray(system.droids),
    ...asArray(system.vehicles),
    ...asArray(system.ships),
    ...asArray(system.assets?.droids),
    ...asArray(system.assets?.vehicles),
    ...asArray(system.assets?.ships),
    ...asArray(system.inventory?.droids),
    ...asArray(system.inventory?.vehicles),
    ...asArray(system.inventory?.ships),
    ...asArray(system.relationships),
    ...asArray(ownerActor?.getFlag?.('foundryvtt-swse', 'followers')),
    ...followerSlotReferences(ownerActor),
    ...ownedItemReferences(ownerActor),
    ...ownedVehicleReferencesFromActorOwnership(ownerActor, { includeAccessOnly })
  ];

  const seen = new Set();
  const assets = [];

  for (const entry of candidates) {
    if (!entry) continue;
    const actor = actorFromReference(entry);
    if (!matchesMode(entry, normalizedMode, actor)) continue;

    const assetMode = assetModeFor(entry, actor);
    if (!assetMode) continue;

    const id = normalizeId(actor?.id ?? entry?.id ?? entry?.actorId ?? entry?.uuid ?? displayName(entry, actor));
    const dedupeKey = `${assetMode}:${id}`;
    if (!id || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const isShipyard = assetMode === 'shipyard';
    const modifyAuth = assetModifyAuthorization({ user, ownerActor, assetActor: actor });
    // Compact, read-only runtime-schema summary (HP, shields, installs, construction). Never throws into the Bay.
    let vehicle = null;
    if (isShipyard && actor) {
      try { vehicle = buildVehicleAssetSummary(actor, { epTable }); }
      catch (err) { vehicle = { originLabel: 'Vehicle record unavailable', hpLabel: 'HP —', shieldLabel: 'Shields —', installationLabel: 'Installations unavailable', constructionLabel: null, epLabel: null, sourceLabel: null, origin: 'UNAVAILABLE' }; }
    }
    assets.push({
      id,
      actorId: actor?.id ?? id,
      uuid: actor?.uuid ?? entry?.uuid ?? (actor?.id ? `Actor.${actor.id}` : ''),
      name: displayName(entry, actor),
      img: displayImage(entry, actor),
      type: entryType(entry, actor),
      bayMode: assetMode,
      kindLabel: isShipyard ? 'Ship / Vehicle' : 'Droid',
      kindIcon: isShipyard ? 'fa-rocket' : 'fa-robot',
      detail: detailLine(entry, actor, assetMode, vehicle),
      status: statusLine(entry, actor, assetMode, vehicle),
      vehicle,
      vehicleOrigin: vehicle?.origin ?? null,
      constructionLine: vehicle?.constructionLabel ?? null,
      epLine: vehicle?.epLabel ?? null,
      ownership: documentPermissionLabel(actor),
      ownedByThisActor: isShipyard ? vehicleOwnerMatchesActor(actor, ownerActor) : null,
      // the canonical relation of this actor to the asset, shown accurately (access is not ownership; a name alone is unresolved)
      ownershipStatus: actor ? assetOwnershipEvidence(actor, ownerActor).status : 'NOT_LINKED',
      ownershipLabel: OWNERSHIP_LABEL[actor ? assetOwnershipEvidence(actor, ownerActor).status : 'NOT_LINKED'],
      accessOnly: actor ? assetOwnershipEvidence(actor, ownerActor).accessOnly : false,
      // a vehicle whose only owner record is a display name (no stable id) is shown as unresolved, never as owned
      ownerIdentityUnresolved: isShipyard && actor ? assetOwnershipEvidence(actor, ownerActor).nameOnly : false,
      modifyBlockedReason: modifyAuth.reason,
      isLinked: Boolean(actor?.id),
      canOpenSheet: Boolean(actor?.id),
      canModify: modifyAuth.allowed,
      canGrantAccess: Boolean(actor?.id && game.user?.isGM),
      grantAccessLabel: isShipyard ? 'Give / Share Ship' : 'Give Droid',
      sheetLabel: isShipyard ? 'Open Ship Sheet' : 'Open Droid Sheet',
      modifyLabel: isShipyard ? 'Modify in Shipyard' : 'Modify in Garage'
    });
  }

  return assets.sort((a, b) => {
    if (a.bayMode !== b.bayMode) return a.bayMode === 'garage' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Synchronous read of the Asset Bay's owned droid / vehicle association (the same collectOwnedEntries the Bay renders, mode 'all'),
 * for compact consumers such as the character sheet's possessions browser. Read-only; the EP table is only needed by the Shipyard view.
 */
export function listOwnedAssets(ownerActor, { user = game?.user ?? null } = {}) {
  // possessions: an access-only asset is never counted (it is shown, labelled, by the Asset Bay itself)
  try { return collectOwnedEntries(ownerActor, 'all', null, user).filter(a => a.accessOnly !== true); } catch (_err) { return []; }
}

export class AssetBaySurfaceService {
  static async buildViewModel(actor, options = {}) {
    const mode = normalizeBayMode(options.bayMode || options.mode || 'all');
    const epTable = options.epTable !== undefined ? options.epTable : await loadUnusedEpTable();
    const assets = collectOwnedEntries(actor, mode, epTable, game.user, { includeAccessOnly: true });
    const droidCount = assets.filter(asset => asset.bayMode === 'garage').length;
    const shipCount = assets.filter(asset => asset.bayMode === 'shipyard').length;
    const isShipyard = mode === 'shipyard';
    const isGarage = mode === 'garage';

    return {
      id: 'asset-bay',
      mode,
      isAllMode: mode === 'all',
      isGarageMode: isGarage,
      isShipyardMode: isShipyard,
      title: isShipyard ? 'Shipyard' : isGarage ? 'Droid Garage' : 'Asset Bay',
      surfaceIcon: isShipyard ? 'fa-rocket' : isGarage ? 'fa-robot' : 'fa-warehouse',
      subtitle: isShipyard
        ? 'Owned ship and vehicle control point'
        : isGarage
          ? 'Owned droid property control point'
          : 'Centralized owned droid, ship, and vehicle control point',
      actorId: actor?.id ?? '',
      actorName: actor?.name ?? '',
      emptyTitle: isShipyard
        ? 'No owned ships linked'
        : isGarage
          ? 'No owned droids linked'
          : 'No owned assets linked',
      emptyText: isShipyard
        ? 'Ships and vehicles purchased, granted, or linked to this actor appear here.'
        : isGarage
          ? 'Droids purchased, granted, or linked to this actor appear here. Droid PC actors remain their own actor sheet.'
          : 'Owned droids, ships, and vehicles appear here after purchase, GM grant, or relationship linking. This keeps property management separate from the main character sheet.',
      assets,
      count: assets.length,
      droidCount,
      shipCount,
      totalCount: assets.length,
      hasAssets: assets.length > 0,
      showModeFilters: mode === 'all' || droidCount > 0 || shipCount > 0,
      isGM: Boolean(game.user?.isGM),
      grantHelp: isShipyard
        ? 'GM tools can grant one shared ship to one or more owner actors without copying it.'
        : isGarage
          ? 'GM tools can grant a droid to an owner actor without routing through store purchase.'
          : 'GM tools can grant shared ships or owned droids without copying player character sheets.'
    };
  }
}
