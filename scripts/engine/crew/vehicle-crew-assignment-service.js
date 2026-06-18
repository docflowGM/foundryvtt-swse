import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const CREW_STATIONS = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
const CREW_ACTOR_TYPES = new Set(['character', 'npc', 'droid']);

function htmlEscape(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function normalizeKey(value, fallback = 'pilot') {
  const key = String(value || fallback).trim().toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    pilot: 'pilot',
    copilot: 'copilot',
    copilotseat: 'copilot',
    co: 'copilot',
    coPilot: 'copilot',
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
  return aliases[key] || fallback;
}

function firstEmptyStation(vehicle) {
  const positions = vehicle?.system?.crewPositions ?? {};
  return CREW_STATIONS.find((key) => !positions?.[key]) || 'pilot';
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

export class VehicleCrewAssignmentService {
  static get stationKeys() {
    return [...CREW_STATIONS];
  }

  static normalizeStation(value, fallback = 'pilot') {
    return normalizeKey(value, fallback);
  }

  static canBeCrew(actor) {
    const crewActor = unwrapCrewActor(actor);
    return !!crewActor && crewActor.documentName === 'Actor' && CREW_ACTOR_TYPES.has(crewActor.type);
  }


  static getDropDataFromEvent(event) {
    try {
      const data = globalThis.TextEditor?.getDragEventData?.(event);
      if (data) return data;
    } catch (_err) { /* fall through to raw dataTransfer parsing */ }

    const transfer = event?.dataTransfer;
    if (!transfer) return null;
    for (const type of ['application/json', 'text/plain', 'text/x-foundry-uuid']) {
      const raw = transfer.getData?.(type);
      if (!raw) continue;
      if (type === 'text/x-foundry-uuid') return { uuid: raw };
      try { return JSON.parse(raw); } catch (_err) { /* ignored */ }
    }
    return null;
  }

  static async resolveCrewActorFromDropData(dropData) {
    if (!dropData || typeof dropData !== 'object') return null;

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

    for (const candidate of candidates) {
      const crewActor = unwrapCrewActor(candidate);
      if (this.canBeCrew(crewActor)) return crewActor;
    }
    return null;
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

    const targetStation = normalizeKey(station, firstEmptyStation(vehicle));
    const ownedActors = Array.isArray(vehicle.system?.ownedActors) ? vehicle.system.ownedActors : [];
    const relationships = Array.isArray(vehicle.system?.relationships) ? vehicle.system.relationships : [];
    const legacyRef = legacyCrewRef(crewActor, targetStation);
    const update = {};

    for (const key of CREW_STATIONS) {
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
    const targetStation = normalizeKey(station, 'pilot');
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

  static async assignCrew(vehicle, station, crewActor, options = {}) {
    crewActor = unwrapCrewActor(crewActor);
    const update = this.buildAssignmentUpdate(vehicle, station, crewActor);
    if (!update) {
      ui?.notifications?.warn?.('Only character, NPC, or droid actors can be assigned as vehicle crew.');
      return false;
    }

    const targetStation = normalizeKey(station, firstEmptyStation(vehicle));
    try {
      await ActorEngine.updateActor(vehicle, update, {
        source: options.source || 'vehicle-crew-assignment'
      });
      ui?.notifications?.info?.(`${crewActor.name} assigned to ${this.labelForStation(targetStation)}.`);
      return true;
    } catch (err) {
      SWSELogger.error('VehicleCrewAssignmentService.assignCrew failed', { err, vehicle: vehicle?.name, station: targetStation, crew: crewActor?.name });
      ui?.notifications?.error?.(`Failed to assign crew: ${err.message}`);
      return false;
    }
  }

  static async removeCrew(vehicle, station, options = {}) {
    const targetStation = normalizeKey(station, 'pilot');
    const current = vehicle?.system?.crewPositions?.[targetStation];
    const currentName = typeof current === 'string' ? current : current?.name;
    const update = this.buildRemovalUpdate(vehicle, targetStation);
    if (!update) return false;

    try {
      await ActorEngine.updateActor(vehicle, update, {
        source: options.source || 'vehicle-crew-removal'
      });
      ui?.notifications?.info?.(`${currentName || 'Crew'} removed from ${this.labelForStation(targetStation)}.`);
      return true;
    } catch (err) {
      SWSELogger.error('VehicleCrewAssignmentService.removeCrew failed', { err, vehicle: vehicle?.name, station: targetStation });
      ui?.notifications?.error?.(`Failed to remove crew: ${err.message}`);
      return false;
    }
  }

  static async openCrewPicker(vehicle, station, options = {}) {
    const targetStation = normalizeKey(station, firstEmptyStation(vehicle));
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
        <p>Assign a character, NPC, or droid to <strong>${htmlEscape(this.labelForStation(targetStation))}</strong> aboard <strong>${htmlEscape(vehicle?.name || 'this vehicle')}</strong>.</p>
        <label class="swse-vehicle-crew-picker-row">
          <span>Crew actor</span>
          <select name="crewUuid">${optionsHtml}</select>
        </label>
      </form>
    `;

    const chosenUuid = await SWSEDialogV2.prompt({
      title: `Assign ${this.labelForStation(targetStation)}`,
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
    await this.assignCrew(vehicle, targetStation, crewActor, { source: 'vehicle-crew-picker' });
    return crewActor;
  }

  static async openCrewSheet(vehicle, station) {
    const targetStation = normalizeKey(station, 'pilot');
    const current = vehicle?.system?.crewPositions?.[targetStation];
    const uuid = typeof current === 'string' ? current : current?.uuid;
    if (!uuid) {
      ui?.notifications?.warn?.('No crew member is assigned to this station.');
      return null;
    }
    const actor = await fromUuid(uuid);
    if (!actor?.sheet) {
      ui?.notifications?.warn?.('Assigned crew actor could not be opened.');
      return null;
    }
    actor.sheet.render(true);
    return actor;
  }

  static labelForStation(station) {
    const key = normalizeKey(station, station);
    const labels = {
      pilot: 'Pilot',
      copilot: 'Co-Pilot',
      gunner: 'Gunner',
      engineer: 'Engineer',
      shields: 'Shields',
      commander: 'Commander'
    };
    return labels[key] || String(station || 'Crew').replace(/^./, (c) => c.toUpperCase());
  }
}

globalThis.SWSE ??= {};
globalThis.SWSE.VehicleCrewAssignmentService = VehicleCrewAssignmentService;
