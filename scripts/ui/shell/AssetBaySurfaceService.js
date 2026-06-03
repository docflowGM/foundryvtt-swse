/**
 * AssetBaySurfaceService — Garage / Shipyard ownership dashboard.
 *
 * This surface is intentionally an owner-control point. It lists droids or
 * vehicles owned by the current actor and lets the player open the owned
 * actor sheet or route that owned actor into the inline Garage/Shipyard
 * customization surface.
 */

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

function detailLine(entry, actor = null, mode = 'garage') {
  const system = actor?.system ?? entry?.system ?? {};
  if (mode === 'shipyard') {
    return String(system.model ?? system.vehicleModel ?? system.frame ?? system.size ?? entry?.model ?? entry?.role ?? 'Vehicle');
  }
  return String(system.droidModel ?? system.model ?? system.droidType ?? entry?.model ?? entry?.role ?? 'Droid');
}

function statusLine(entry, actor = null, mode = 'garage') {
  if (!actor) return 'Link unresolved';
  if (mode === 'shipyard') {
    const hull = actor.system?.hull ?? actor.system?.hp ?? {};
    const shields = actor.system?.shields ?? actor.system?.shield ?? {};
    const hullText = hull?.max ? `Hull ${hull.value ?? 0}/${hull.max}` : 'Hull —';
    const shieldText = shields?.max ? `Shields ${shields.value ?? 0}/${shields.max}` : 'Shields —';
    return `${hullText} · ${shieldText}`;
  }
  const hp = actor.system?.hp ?? actor.system?.hitPoints ?? {};
  const hpText = hp?.max ? `HP ${hp.value ?? 0}/${hp.max}` : 'HP —';
  const source = actor.system?.buildSource || actor.system?.source || actor.system?.droidSource || 'Droid property';
  return `${hpText} · ${source}`;
}

function collectOwnedEntries(ownerActor, mode) {
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
    ...ownedItemReferences(ownerActor)
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
      detail: detailLine(entry, actor, assetMode),
      status: statusLine(entry, actor, assetMode),
      isLinked: Boolean(actor?.id),
      canOpenSheet: Boolean(actor?.id),
      canModify: Boolean(actor?.id),
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

export class AssetBaySurfaceService {
  static async buildViewModel(actor, options = {}) {
    const mode = normalizeBayMode(options.bayMode || options.mode || 'all');
    const assets = collectOwnedEntries(actor, mode);
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
