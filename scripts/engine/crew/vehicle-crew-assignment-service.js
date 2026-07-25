import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { resolveVehicleCrewStations } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-resolver.js";
import { recordAssignmentEvent, recordMutationReceipt } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-diagnostics-log.js";

const CREW_ACTOR_TYPES = new Set(['character', 'npc', 'droid']);
const VEHICLE_WEAPON_ITEM_TYPES = new Set(['weapon', 'vehicle-weapon', 'vehicleWeapon', 'vehicleWeaponRange']);

// Legacy word aliases only — NOT a fallback table. An unrecognized station
// key (including a mistyped one) must fail clearly rather than silently
// resolve to some other station. See canonicalStationKey().
const LEGACY_STATION_ALIASES = {
  pilot: 'pilot',
  copilot: 'copilot',
  'co-pilot': 'copilot',
  co_pilot: 'copilot',
  gunner: 'gunner',
  gunners: 'gunner',
  engineer: 'engineer',
  engineering: 'engineer',
  shield: 'shields',
  shields: 'shields',
  commander: 'commander',
  command: 'commander',
  captain: 'commander'
};

function htmlEscape(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function countCrewWeapons(vehicle) {
  const items = Array.isArray(vehicle?.items?.contents) ? vehicle.items.contents
    : Array.isArray(vehicle?.items) ? vehicle.items
    : (vehicle?.items && typeof vehicle.items[Symbol.iterator] === 'function') ? Array.from(vehicle.items)
    : [];
  return items.filter((item) => VEHICLE_WEAPON_ITEM_TYPES.has(item?.type)).length;
}

function toCrewRef(actor) {
  return {
    name: actor?.name || 'Unnamed Crew',
    uuid: actor?.uuid || (actor?.id ? `Actor.${actor.id}` : null),
    id: actor?.id || null,
    actorId: actor?.id || null,
    type: actor?.type || ''
  };
}

function legacyCrewRef(actor, station) {
  return {
    uuid: actor?.uuid || null,
    id: actor?.id || null,
    actorId: actor?.id || null,
    name: actor?.name || 'Unnamed Crew',
    type: actor?.type || '',
    role: station,
    position: station
  };
}

function crewRefMatches(entry, crewActor) {
  if (!entry || !crewActor) return false;
  const entryUuid = typeof entry === 'string' ? entry : entry.uuid;
  const entryId = typeof entry === 'string' && entry.startsWith('Actor.') ? entry.slice(6) : (entry.id ?? entry.actorId);
  return entryUuid === crewActor.uuid || entryId === crewActor.id || entry.name === crewActor.name;
}

function unwrapCrewActor(document) {
  if (!document) return null;
  if (document.documentName === 'Actor') return document;
  if (document.actor?.documentName === 'Actor') return document.actor;
  if (document.object?.actor?.documentName === 'Actor') return document.object.actor;
  return null;
}

// A document fetched from a compendium (via pack.getDocument, or resolved
// through a Compendium.* uuid) is not a world Actor. Cloning it into the
// world without the user's explicit intent is unsafe (Architectural
// constraints: "do not clone crew actors"), so compendium actors are
// rejected with an explicit message rather than silently handled.
function isCompendiumActor(actor) {
  if (!actor) return false;
  if (typeof actor.pack === 'string' && actor.pack) return true;
  if (actor.compendium) return true;
  return !game.actors?.has?.(actor.id);
}

function structuredResult({ ok, station = null, crewActorUuid = null, mutationReceipt = null, warnings = [], error = null }) {
  return { ok, station, crewActorUuid, mutationReceipt, warnings, error };
}

export class VehicleCrewAssignmentService {
  /**
   * The dynamic, per-vehicle station descriptor set — the SAME resolver
   * that builds the live crew-assignment panel (vehicle-context-builder.js)
   * and that the attack-operator resolver's storage keys must line up with.
   * There is deliberately no independent hard-coded station list here.
   */
  static resolveStations(vehicle) {
    const system = vehicle?.system ?? {};
    return resolveVehicleCrewStations({ system, weapons: { count: countCrewWeapons(vehicle) } });
  }

  static get stationKeys() {
    // Retained for callers that only care about the fixed base roles
    // (e.g. legacy diagnostics). Dynamic gunner/custom stations are only
    // knowable per-vehicle — use resolveStations(vehicle) for those.
    return ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
  }

  /**
   * Resolve a requested station value to the exact station key this
   * vehicle actually has (per resolveStations), or null if it does not
   * match any real station — including any dynamic gunner-N/custom key.
   * Never coerces an unrecognized key to pilot or to any other station.
   */
  static canonicalStationKey(vehicle, value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const stations = this.resolveStations(vehicle).stations;
    const direct = stations.find((station) => station.storageKey === raw || station.key === raw);
    if (direct) return direct.storageKey;

    const aliased = LEGACY_STATION_ALIASES[raw.toLowerCase()];
    if (aliased) {
      const match = stations.find((station) => station.storageKey === aliased);
      if (match) return match.storageKey;
    }

    return null;
  }

  static canBeCrew(actor) {
    const crewActor = unwrapCrewActor(actor);
    return !!crewActor && crewActor.documentName === 'Actor' && CREW_ACTOR_TYPES.has(crewActor.type);
  }

  static canEdit(vehicle) {
    return vehicle?.isOwner === true;
  }

  static getDropDataFromEvent(event) {
    try {
      const data = globalThis.TextEditor?.getDragEventData?.(event);
      if (data) return data;
    } catch (_err) { /* fall through to raw dataTransfer parsing */ }

    const transfer = event?.dataTransfer;
    if (!transfer) return null;
    for (const type of ['application/json', 'text/plain', 'text/x-foundry-uuid', 'text/uri-list']) {
      const raw = transfer.getData?.(type);
      if (!raw) continue;
      const text = String(raw || '').trim();
      if (!text) continue;
      if (type === 'text/x-foundry-uuid') return { uuid: text };
      try { return JSON.parse(text); } catch (_err) { /* fall through */ }
      if (/^(Actor|Scene|Token|Compendium)\./.test(text)) return { uuid: text };
      if (/^[A-Za-z0-9]{16}$/.test(text)) return { type: 'Actor', id: text };
    }
    return null;
  }

  // Shared by resolveCrewActorFromDropData (the happy path) and
  // describeDropRejection (rejection messaging) so there is exactly one
  // document-resolution implementation for drag/drop payloads, not two.
  static async _resolveDropCandidates(dropData) {
    if (!dropData || typeof dropData !== 'object') return [];

    const candidates = [];
    const push = (value) => { if (value && !candidates.includes(value)) candidates.push(value); };

    if (dropData.uuid) {
      try { push(await fromUuid(dropData.uuid)); } catch (_err) { /* ignored */ }
    }

    if (dropData.pack && dropData.id) {
      try {
        const pack = game.packs?.get?.(dropData.pack);
        push(await pack?.getDocument?.(dropData.id));
      } catch (_err) { /* ignored */ }
    }

    if (dropData.type === 'Actor' && dropData.id) push(game.actors?.get?.(dropData.id));
    if (dropData.actorId) push(game.actors?.get?.(dropData.actorId));

    if (typeof globalThis.Actor?.implementation?.fromDropData === 'function') {
      try { push(await globalThis.Actor.implementation.fromDropData(dropData)); } catch (_err) { /* ignored */ }
    }

    return candidates;
  }

  static async resolveCrewActorFromDropData(dropData) {
    const candidates = await this._resolveDropCandidates(dropData);
    for (const candidate of candidates) {
      const crewActor = unwrapCrewActor(candidate);
      if (this.canBeCrew(crewActor)) return crewActor;
    }
    return null;
  }

  /**
   * Explain why a drop did not resolve to a valid crew actor — used only on
   * the rejection path so station-drop handlers can tell the user why
   * (Item/Journal/Scene/vehicle/wrong-actor-type), instead of silently
   * doing nothing.
   */
  static async describeDropRejection(dropData) {
    const candidates = await this._resolveDropCandidates(dropData);
    const first = candidates[0];
    if (!first) return 'Only characters, NPCs, or droids can be assigned as crew.';
    if (first.documentName && first.documentName !== 'Actor') {
      return `${first.documentName} documents cannot be assigned as crew.`;
    }
    const actor = unwrapCrewActor(first);
    if (actor?.type === 'vehicle') return 'Vehicles cannot be assigned as crew.';
    if (actor?.type) return `${actor.type} actors cannot be assigned as crew — only characters, NPCs, and droids can.`;
    return 'Only characters, NPCs, or droids can be assigned as crew.';
  }

  static listEligibleCrewActors(vehicle = null) {
    const vehicleId = vehicle?.id ?? null;
    return Array.from(game.actors?.contents ?? [])
      .filter((actor) => this.canBeCrew(actor))
      .filter((actor) => actor.id !== vehicleId)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map((actor) => ({
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        img: actor.img || ''
      }));
  }

  static buildAssignmentUpdate(vehicle, station, crewActor) {
    if (!vehicle || vehicle.type !== 'vehicle') return null;
    crewActor = unwrapCrewActor(crewActor);
    if (!this.canBeCrew(crewActor)) return null;

    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) return null;

    const stationKeys = this.resolveStations(vehicle).stations.map((entry) => entry.storageKey);
    const ownedActors = Array.isArray(vehicle.system?.ownedActors) ? vehicle.system.ownedActors : [];
    const relationships = Array.isArray(vehicle.system?.relationships) ? vehicle.system.relationships : [];
    const legacyRef = legacyCrewRef(crewActor, targetStation);
    const update = {};

    for (const key of stationKeys) {
      const current = vehicle.system?.crewPositions?.[key];
      if (key !== targetStation && crewRefMatches(current, crewActor)) update[`system.crewPositions.${key}`] = null;
    }

    return {
      ...update,
      [`system.crewPositions.${targetStation}`]: toCrewRef(crewActor),
      'system.ownedActors': [
        ...ownedActors.filter((entry) => !crewRefMatches(entry, crewActor)),
        legacyRef
      ],
      'system.relationships': [
        ...relationships.filter((entry) => !crewRefMatches(entry, crewActor)),
        { ...legacyRef }
      ]
    };
  }

  static buildAssignmentMutationPlan(vehicle, station, crewActor) {
    const update = this.buildAssignmentUpdate(vehicle, station, crewActor);
    if (!update) return null;
    return {
      mutationPlan: { update },
      uiTargetTab: 'crew'
    };
  }

  static buildRemovalUpdate(vehicle, station) {
    if (!vehicle || vehicle.type !== 'vehicle') return null;
    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) return null;

    const current = vehicle.system?.crewPositions?.[targetStation];
    const currentUuid = typeof current === 'string' ? current : current?.uuid;
    const currentName = typeof current === 'string' ? current : current?.name;
    const currentId = currentUuid?.startsWith?.('Actor.') ? currentUuid.slice(6) : null;

    const ownedActors = Array.isArray(vehicle.system?.ownedActors) ? vehicle.system.ownedActors : [];
    const relationships = Array.isArray(vehicle.system?.relationships) ? vehicle.system.relationships : [];
    const shouldRemove = (entry) => {
      if (!entry) return false;
      if (entry.position !== targetStation && entry.role !== targetStation) return false;
      if (!currentUuid && !currentId && !currentName) return true;
      return entry.uuid === currentUuid || entry.id === currentId || entry.actorId === currentId || entry.name === currentName;
    };

    return {
      [`system.crewPositions.${targetStation}`]: null,
      'system.ownedActors': ownedActors.filter((entry) => !shouldRemove(entry)),
      'system.relationships': relationships.filter((entry) => !shouldRemove(entry))
    };
  }

  /**
   * Assign a crew actor to a station. ActorEngine is the sole mutation
   * authority — if it rejects the update, that failure is surfaced as-is
   * (no direct vehicle.update() fallback). A silent fallback previously
   * wrote system.crewPositions only, dropping the ownedActors/relationships
   * compatibility mirrors out of sync with a successful ActorEngine write.
   *
   * @returns {Promise<{ok, station, crewActorUuid, mutationReceipt, warnings, error}>}
   */
  static async assignCrew(vehicle, station, crewActor, options = {}) {
    crewActor = unwrapCrewActor(crewActor);

    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s crew.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, station, error });
    }

    if (!this.canBeCrew(crewActor)) {
      const error = 'Only character, NPC, or droid actors can be assigned as vehicle crew.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, station, error });
    }

    if (isCompendiumActor(crewActor)) {
      const error = `${crewActor.name} is a compendium actor. Import it into the world before assigning it as crew.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, station, crewActorUuid: crewActor.uuid ?? null, error });
    }

    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) {
      const error = `"${station}" is not a valid crew station on ${vehicle?.name || 'this vehicle'}.`;
      ui?.notifications?.error?.(error);
      return structuredResult({ ok: false, station: station ?? null, crewActorUuid: crewActor.uuid ?? null, error });
    }

    const update = this.buildAssignmentUpdate(vehicle, targetStation, crewActor);
    if (!update) {
      const error = 'Failed to build crew assignment update.';
      ui?.notifications?.error?.(error);
      return structuredResult({ ok: false, station: targetStation, crewActorUuid: crewActor.uuid ?? null, error });
    }

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, update, {
        source: options.source || 'vehicle-crew-assignment'
      });
      ui?.notifications?.info?.(`${crewActor.name} assigned to ${this.labelForStation(vehicle, targetStation)}.`);
      recordAssignmentEvent(vehicle?.id, { type: 'assign', station: targetStation, crewActorUuid: crewActor.uuid ?? null, ok: true, source: options.source || 'vehicle-crew-assignment' });
      recordMutationReceipt(vehicle?.id, { ok: true, source: options.source || 'vehicle-crew-assignment' });
      return structuredResult({ ok: true, station: targetStation, crewActorUuid: crewActor.uuid ?? null, mutationReceipt });
    } catch (err) {
      SWSELogger.error('VehicleCrewAssignmentService.assignCrew failed', { err, vehicle: vehicle?.name, station: targetStation, crew: crewActor?.name });
      const error = err?.message || 'Failed to assign crew.';
      ui?.notifications?.error?.(`Failed to assign crew: ${error}`);
      recordAssignmentEvent(vehicle?.id, { type: 'assign', station: targetStation, crewActorUuid: crewActor.uuid ?? null, ok: false, error });
      recordMutationReceipt(vehicle?.id, { ok: false, error });
      return structuredResult({ ok: false, station: targetStation, crewActorUuid: crewActor.uuid ?? null, error });
    }
  }

  /**
   * Remove whichever crew actor occupies exactly the requested station.
   * Removing gunner-2 must never clear gunner (or any other station) —
   * buildRemovalUpdate() only ever touches system.crewPositions.<targetStation>.
   *
   * @returns {Promise<{ok, station, crewActorUuid, mutationReceipt, warnings, error}>}
   */
  static async removeCrew(vehicle, station, options = {}) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s crew.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, station, error });
    }

    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) {
      const error = `"${station}" is not a valid crew station on ${vehicle?.name || 'this vehicle'}.`;
      ui?.notifications?.error?.(error);
      return structuredResult({ ok: false, station: station ?? null, error });
    }

    const current = vehicle?.system?.crewPositions?.[targetStation];
    const currentName = typeof current === 'string' ? current : current?.name;
    const currentUuid = typeof current === 'string' ? current : current?.uuid;
    const update = this.buildRemovalUpdate(vehicle, targetStation);
    if (!update) {
      const error = 'Failed to build crew removal update.';
      ui?.notifications?.error?.(error);
      return structuredResult({ ok: false, station: targetStation, error });
    }

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, update, {
        source: options.source || 'vehicle-crew-removal'
      });
      ui?.notifications?.info?.(`${currentName || 'Crew'} removed from ${this.labelForStation(vehicle, targetStation)}.`);
      recordAssignmentEvent(vehicle?.id, { type: 'remove', station: targetStation, crewActorUuid: currentUuid ?? null, ok: true, source: options.source || 'vehicle-crew-removal' });
      recordMutationReceipt(vehicle?.id, { ok: true, source: options.source || 'vehicle-crew-removal' });
      return structuredResult({ ok: true, station: targetStation, crewActorUuid: currentUuid ?? null, mutationReceipt });
    } catch (err) {
      SWSELogger.error('VehicleCrewAssignmentService.removeCrew failed', { err, vehicle: vehicle?.name, station: targetStation });
      const error = err?.message || 'Failed to remove crew.';
      ui?.notifications?.error?.(`Failed to remove crew: ${error}`);
      recordAssignmentEvent(vehicle?.id, { type: 'remove', station: targetStation, crewActorUuid: currentUuid ?? null, ok: false, error });
      recordMutationReceipt(vehicle?.id, { ok: false, error });
      return structuredResult({ ok: false, station: targetStation, crewActorUuid: currentUuid ?? null, error });
    }
  }

  static async openCrewPicker(vehicle, station, options = {}) {
    if (!this.canEdit(vehicle)) {
      ui?.notifications?.warn?.(`You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s crew.`);
      return null;
    }

    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) {
      ui?.notifications?.error?.(`"${station}" is not a valid crew station on ${vehicle?.name || 'this vehicle'}.`);
      return null;
    }

    const actors = this.listEligibleCrewActors(vehicle);
    if (!actors.length) {
      ui?.notifications?.warn?.('No character, NPC, or droid actors are available to assign as crew.');
      return null;
    }

    const current = vehicle?.system?.crewPositions?.[targetStation];
    const currentUuid = typeof current === 'string' ? current : current?.uuid;
    const optionsHtml = actors.map((actor) => {
      const selected = actor.uuid === currentUuid ? ' selected' : '';
      return `<option value="${htmlEscape(actor.uuid)}"${selected}>${htmlEscape(actor.name)} (${htmlEscape(actor.type)})</option>`;
    }).join('');

    const content = `
      <form class="swse-vehicle-crew-picker">
        <p>Assign a character, NPC, or droid to <strong>${htmlEscape(this.labelForStation(vehicle, targetStation))}</strong> aboard <strong>${htmlEscape(vehicle?.name || 'this vehicle')}</strong>.</p>
        <label class="swse-vehicle-crew-picker-row">
          <span>Crew actor</span>
          <select name="crewUuid">${optionsHtml}</select>
        </label>
      </form>
    `;

    const chosenUuid = await SWSEDialogV2.prompt({
      title: `Assign ${this.labelForStation(vehicle, targetStation)}`,
      content,
      label: 'Assign Crew',
      callback: (html) => html?.find?.('[name="crewUuid"]')?.val?.() || html?.[0]?.querySelector?.('[name="crewUuid"]')?.value || null,
      options: { width: options.width || 420 }
    });

    if (!chosenUuid) return null;
    const crewActor = await fromUuid(chosenUuid);
    if (!this.canBeCrew(crewActor)) {
      ui?.notifications?.warn?.('Selected document is not a valid crew actor.');
      return null;
    }
    const result = await this.assignCrew(vehicle, targetStation, crewActor, { source: 'vehicle-crew-picker' });
    return result.ok ? crewActor : null;
  }

  static async openCrewSheet(vehicle, station) {
    const targetStation = this.canonicalStationKey(vehicle, station);
    if (!targetStation) {
      ui?.notifications?.error?.(`"${station}" is not a valid crew station on ${vehicle?.name || 'this vehicle'}.`);
      return null;
    }

    const current = vehicle?.system?.crewPositions?.[targetStation];
    const uuid = typeof current === 'string' ? current : current?.uuid;
    if (!uuid) {
      ui?.notifications?.warn?.('No crew member is assigned to this station.');
      return null;
    }
    const actor = await fromUuid(uuid);
    if (!actor) {
      ui?.notifications?.warn?.('The assigned crew actor no longer exists. Remove this station assignment and reassign.');
      return null;
    }
    if (!actor.sheet) {
      ui?.notifications?.warn?.('Assigned crew actor could not be opened.');
      return null;
    }
    actor.sheet.render(true);
    return actor;
  }

  static labelForStation(vehicle, station) {
    if (vehicle) {
      const stations = this.resolveStations(vehicle).stations;
      const match = stations.find((entry) => entry.storageKey === station || entry.key === station);
      if (match) return match.label;
    }
    return String(station || 'Crew').replace(/^./, (c) => c.toUpperCase());
  }
}

globalThis.SWSE ??= {};
globalThis.SWSE.VehicleCrewAssignmentService = VehicleCrewAssignmentService;
