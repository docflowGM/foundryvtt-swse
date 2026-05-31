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

function entryType(entry, actor = null) {
  return String(
    actor?.type
    ?? entry?.type
    ?? entry?.actorType
    ?? entry?.documentType
    ?? entry?.kind
    ?? ''
  ).toLowerCase();
}

function matchesMode(entry, mode, actor = null) {
  const type = entryType(entry, actor);
  if (mode === 'garage') return type === 'droid';
  if (mode === 'shipyard') return ['vehicle', 'ship', 'starship'].includes(type);
  return false;
}

function displayName(entry, actor = null) {
  return String(actor?.name ?? entry?.name ?? entry?.label ?? entry?.title ?? 'Unlinked Asset');
}

function displayImage(entry, actor = null) {
  return actor?.img || entry?.img || entry?.image || entry?.thumbnail || 'icons/svg/mystery-man.svg';
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
  const system = ownerActor?.system ?? {};
  const candidates = [
    ...asArray(system.ownedActors),
    ...asArray(mode === 'garage' ? system.droids : system.vehicles),
    ...asArray(mode === 'garage' ? system.assets?.droids : system.assets?.vehicles),
    ...asArray(mode === 'shipyard' ? system.ships : []),
    ...asArray(mode === 'shipyard' ? system.assets?.ships : []),
    ...asArray(mode === 'garage' ? system.inventory?.droids : system.inventory?.vehicles),
    ...asArray(mode === 'shipyard' ? system.inventory?.ships : [])
  ];

  const seen = new Set();
  const assets = [];

  for (const entry of candidates) {
    if (!entry) continue;
    const actor = actorFromReference(entry);
    if (!matchesMode(entry, mode, actor)) continue;
    const id = normalizeId(actor?.id ?? entry?.id ?? entry?.actorId ?? entry?.uuid ?? displayName(entry, actor));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    assets.push({
      id,
      actorId: actor?.id ?? id,
      uuid: actor?.uuid ?? entry?.uuid ?? (actor?.id ? `Actor.${actor.id}` : ''),
      name: displayName(entry, actor),
      img: displayImage(entry, actor),
      type: entryType(entry, actor),
      detail: detailLine(entry, actor, mode),
      status: statusLine(entry, actor, mode),
      isLinked: Boolean(actor?.id),
      canOpenSheet: Boolean(actor?.id),
      canModify: Boolean(actor?.id),
      sheetLabel: mode === 'shipyard' ? 'See Ship Sheet' : 'See Droid Sheet',
      modifyLabel: mode === 'shipyard' ? 'Modify in Shipyard' : 'Modify in Garage'
    });
  }

  return assets;
}

export class AssetBaySurfaceService {
  static async buildViewModel(actor, options = {}) {
    const mode = options.bayMode || options.mode || 'garage';
    const isShipyard = mode === 'shipyard';
    const assets = collectOwnedEntries(actor, isShipyard ? 'shipyard' : 'garage');

    return {
      id: 'asset-bay',
      mode: isShipyard ? 'shipyard' : 'garage',
      title: isShipyard ? 'Shipyard' : 'Droid Garage',
      subtitle: isShipyard
        ? 'Owned ship and vehicle control point'
        : 'Owned droid property control point',
      actorId: actor?.id ?? '',
      actorName: actor?.name ?? '',
      emptyTitle: isShipyard ? 'No owned ships linked' : 'No owned droids linked',
      emptyText: isShipyard
        ? 'Ships and vehicles purchased, granted, or linked to this actor appear here.'
        : 'Droids purchased, granted, or linked to this actor appear here. Droid PC sheets remain their own character sheet app.',
      assets,
      count: assets.length,
      hasAssets: assets.length > 0
    };
  }
}
