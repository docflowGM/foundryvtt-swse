/**
 * StarshipManeuversEngine - Handles prepared maneuver lists for vehicle sheets.
 *
 * Maneuvers may live on the vehicle actor itself or on linked crew actors.
 * Character progression stores them as Item type "maneuver", while some older
 * data may call them "starshipManeuver". This engine normalizes both shapes
 * into the vehicle sheet contract and provides spend/regain helpers.
 */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function lower(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isManeuverItem(item) {
  const type = lower(item?.type);
  if (type === 'maneuver' || type === 'starshipmaneuver' || type === 'starship-maneuver') return true;
  const systemType = lower(item?.system?.type || item?.system?.category || item?.system?.featType);
  return systemType === 'starship maneuver' || systemType === 'starshipmaneuver';
}

function actorIdFromUuid(uuid) {
  const match = String(uuid ?? '').match(/^Actor\.([^\.]+)/);
  return match?.[1] ?? null;
}

function itemIdFromUuid(uuid) {
  const match = String(uuid ?? '').match(/\.Item\.([^\.]+)$/);
  return match?.[1] ?? null;
}

function resolveActorSync(entry) {
  if (!entry) return null;
  if (entry.actor && entry.actor.items) return entry.actor;

  if (typeof entry === 'string') {
    const actorId = actorIdFromUuid(entry) || entry;
    return game?.actors?.get?.(actorId) ?? null;
  }

  const uuid = entry.uuid || entry.actorUuid;
  const id = entry.id || entry.actorId || actorIdFromUuid(uuid);
  return game?.actors?.get?.(id) ?? null;
}

function collectCrewActors(vehicle) {
  const actors = [];
  const seen = new Set();
  const add = (actor) => {
    if (!actor?.id || seen.has(actor.id)) return;
    seen.add(actor.id);
    actors.push(actor);
  };

  const system = vehicle?.system ?? {};
  for (const entry of Object.values(system.crewPositions ?? {})) add(resolveActorSync(entry));
  for (const entry of safeArray(system.ownedActors)) add(resolveActorSync(entry));
  return actors;
}

function firstText(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();
    if (raw) return raw;
  }
  return '';
}

function normalizeManeuver(item, sourceActor, vehicle) {
  const system = item?.system ?? {};
  const description = firstText(
    system.summary,
    system.description,
    system.effect,
    system.text,
    system.details,
    item?.description
  );
  const spent = Boolean(system.spent ?? system.used ?? system.expended ?? false);
  const ownerIsVehicle = sourceActor?.id === vehicle?.id;
  const actorUuid = sourceActor?.uuid || (sourceActor?.id ? `Actor.${sourceActor.id}` : null);
  const itemUuid = item?.uuid || (actorUuid && item?.id ? `${actorUuid}.Item.${item.id}` : null);

  return {
    id: item?.id || itemUuid || item?.name,
    itemId: item?.id || null,
    uuid: itemUuid,
    actorId: sourceActor?.id || null,
    actorUuid,
    vehicleOwned: ownerIsVehicle,
    name: item?.name || 'Unnamed Maneuver',
    img: item?.img || 'icons/svg/aura.svg',
    sourceActorName: sourceActor?.name || 'Unknown Crew',
    sourceLabel: ownerIsVehicle ? 'Vehicle' : (sourceActor?.name || 'Crew'),
    spent,
    available: !spent,
    system: {
      ...system,
      summary: description || 'No maneuver summary available.',
      action: system.action || system.activation || system.actionType || 'Maneuver',
      recharge: system.recharge || system.frequency || 'Encounter'
    }
  };
}

function compareManeuvers(a, b) {
  const source = String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || ''));
  if (source !== 0) return source;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

export class StarshipManeuversEngine {
  /**
   * Get maneuvers available to a vehicle actor from the vehicle and its linked crew.
   *
   * @param {Actor} actor - Vehicle actor to inspect.
   * @returns {Array} Normalized starship maneuver view-model entries.
   */
  static getManeuversForActor(actor) {
    if (!actor || actor.type !== 'vehicle') return [];
    const maneuvers = [];
    const seen = new Set();

    const addItem = (item, sourceActor) => {
      if (!isManeuverItem(item)) return;
      const key = `${sourceActor?.id || 'unknown'}::${item?.id || item?.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      maneuvers.push(normalizeManeuver(item, sourceActor, actor));
    };

    for (const item of actor.items ?? []) addItem(item, actor);
    for (const crew of collectCrewActors(actor)) {
      for (const item of crew.items ?? []) addItem(item, crew);
    }

    return maneuvers.sort(compareManeuvers);
  }

  static async setManeuverSpent(vehicle, maneuverRef, spent) {
    if (!vehicle || vehicle.type !== 'vehicle' || !maneuverRef) return false;

    const ref = typeof maneuverRef === 'string'
      ? { id: maneuverRef, itemId: maneuverRef, uuid: maneuverRef }
      : maneuverRef;

    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");

    const directItem = vehicle.items?.get?.(ref.itemId || ref.id);
    if (directItem) {
      await ActorEngine.updateOwnedItems(vehicle, [{ _id: directItem.id, 'system.spent': Boolean(spent) }]);
      return true;
    }

    const actorId = ref.actorId || actorIdFromUuid(ref.uuid || ref.actorUuid);
    const itemId = ref.itemId || itemIdFromUuid(ref.uuid);
    const owner = game?.actors?.get?.(actorId);
    const item = owner?.items?.get?.(itemId);
    if (item) {
      await ActorEngine.updateOwnedItems(owner, [{ _id: item.id, 'system.spent': Boolean(spent) }]);
      return true;
    }

    ui?.notifications?.warn?.('Could not resolve that starship maneuver item.');
    return false;
  }

  static async useManeuver(vehicle, maneuverRef) {
    const ok = await this.setManeuverSpent(vehicle, maneuverRef, true);
    if (ok) ui?.notifications?.info?.('Starship maneuver marked as used.');
    return ok;
  }

  static async regainManeuver(vehicle, maneuverRef) {
    const ok = await this.setManeuverSpent(vehicle, maneuverRef, false);
    if (ok) ui?.notifications?.info?.('Starship maneuver readied.');
    return ok;
  }
}
