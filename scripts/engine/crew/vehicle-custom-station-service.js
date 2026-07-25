// scripts/engine/crew/vehicle-custom-station-service.js
//
// Phase 7 (vehicle-crew-runtime-and-ux-phase-7): CRUD authority for
// system.stations custom crew-station records. Phase 6 made existing
// custom stations renderable and assignable (via crew-resolver.js's
// customStations()) but there was no UI or mutation path to create, edit,
// reorder, or remove them — this is that narrow authority, mirroring
// VehicleCrewAssignmentService's conventions (ActorEngine-only mutation,
// structured results, owner-only permission checks).
//
// Record shape: { id, key, label, role, description, order, crew }.
// - id: stable internal identifier (foundry.utils.randomID()), generated
//   once at creation and never reused for key derivation afterward.
// - key: the canonical system.crewPositions/data storage key, slugified
//   from the label ONCE at creation. Renaming the label never changes key.
// - role: a normalized mechanical-role hint (see NORMALIZED_ROLES) — only
//   'gunner' (and, ambiguity permitting, 'pilot'/other base roles) actually
//   feeds crew-skill-router.js/weapon-station-mapping.js resolution;
//   anything else is organizational/display-only.
// - crew: unused by canonical assignment (system.crewPositions is
//   canonical, same as every other station) — kept only as an optional
//   legacy mirror slot for parity with crew-resolver.js#customStations()'s
//   storedCrew fallback read.

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { VehicleCrewAssignmentService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-assignment-service.js";

const NORMALIZED_ROLES = new Set(['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander', 'communications', 'sensor', 'custom']);

function slugify(value) {
  const slug = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'station';
}

function normalizeRole(role) {
  const normalized = String(role || 'custom').trim().toLowerCase();
  return NORMALIZED_ROLES.has(normalized) ? normalized : 'custom';
}

function structuredResult({ ok, station = null, mutationReceipt = null, error = null, requiresConfirmation = false, occupied = false }) {
  return { ok, station, mutationReceipt, error, requiresConfirmation, occupied };
}

export class VehicleCustomStationService {
  static canEdit(vehicle) {
    return vehicle?.isOwner === true;
  }

  static listCustomStations(vehicle) {
    return Array.isArray(vehicle?.system?.stations) ? vehicle.system.stations : [];
  }

  /**
   * Every station key currently in use by this vehicle (base roles,
   * dynamic gunner-N stations, and existing custom stations) — the full
   * reserved-key set a NEW custom station must avoid colliding with.
   */
  static reservedKeys(vehicle) {
    const stations = VehicleCrewAssignmentService.resolveStations(vehicle).stations;
    return new Set(stations.map((station) => station.storageKey));
  }

  /**
   * Generate a stable, collision-free station key from a label. Called
   * only at creation time — never re-derived when the label is edited
   * later (station identity and label are independent).
   */
  static generateStationKey(vehicle, label) {
    const reserved = this.reservedKeys(vehicle);
    const base = slugify(label);
    if (!reserved.has(base)) return base;
    let n = 2;
    let candidate = `${base}-${n}`;
    while (reserved.has(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }

  static async createCustomStation(vehicle, { label, role = 'custom', description = '' } = {}) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s stations.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const trimmedLabel = String(label || '').trim();
    if (!trimmedLabel) {
      const error = 'A station label is required.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const existing = this.listCustomStations(vehicle);
    const key = this.generateStationKey(vehicle, trimmedLabel);
    const record = {
      id: foundry.utils.randomID(),
      key,
      label: trimmedLabel,
      role: normalizeRole(role),
      description: String(description || ''),
      order: existing.length,
      crew: null
    };

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, {
        'system.stations': [...existing, record]
      }, { source: 'vehicle-custom-station-create' });
      ui?.notifications?.info?.(`${trimmedLabel} station added.`);
      return structuredResult({ ok: true, station: record, mutationReceipt });
    } catch (err) {
      const error = err?.message || 'Failed to create custom station.';
      ui?.notifications?.error?.(`Failed to create custom station: ${error}`);
      return structuredResult({ ok: false, error });
    }
  }

  static async renameCustomStation(vehicle, id, label) {
    return this._patchStation(vehicle, id, (record) => {
      const trimmedLabel = String(label || '').trim();
      if (!trimmedLabel) throw new Error('A station label is required.');
      return { ...record, label: trimmedLabel };
    }, 'vehicle-custom-station-rename');
  }

  static async setCustomStationRole(vehicle, id, role) {
    return this._patchStation(vehicle, id, (record) => ({ ...record, role: normalizeRole(role) }), 'vehicle-custom-station-role');
  }

  static async setCustomStationDescription(vehicle, id, description) {
    return this._patchStation(vehicle, id, (record) => ({ ...record, description: String(description || '') }), 'vehicle-custom-station-description');
  }

  static async _patchStation(vehicle, id, patchFn, source) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s stations.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const existing = this.listCustomStations(vehicle);
    const index = existing.findIndex((station) => station?.id === id);
    if (index === -1) {
      const error = 'Custom station not found.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    let patched;
    try {
      patched = patchFn(existing[index]);
    } catch (err) {
      const error = err?.message || 'Invalid station update.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const next = existing.slice();
    next[index] = patched;

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, { 'system.stations': next }, { source });
      return structuredResult({ ok: true, station: patched, mutationReceipt });
    } catch (err) {
      const error = err?.message || 'Failed to update custom station.';
      ui?.notifications?.error?.(`Failed to update custom station: ${error}`);
      return structuredResult({ ok: false, error });
    }
  }

  /**
   * Reorder custom stations. `orderedIds` must contain exactly the current
   * station ids, in the desired order; each station's `order` field is
   * rewritten to match its new index.
   */
  static async reorderCustomStations(vehicle, orderedIds) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s stations.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const existing = this.listCustomStations(vehicle);
    const byId = new Map(existing.map((station) => [station.id, station]));
    if (!Array.isArray(orderedIds) || orderedIds.length !== existing.length || orderedIds.some((id) => !byId.has(id))) {
      const error = 'Reorder list does not match the current custom stations.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const next = orderedIds.map((id, order) => ({ ...byId.get(id), order }));

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, { 'system.stations': next }, { source: 'vehicle-custom-station-reorder' });
      return structuredResult({ ok: true, mutationReceipt });
    } catch (err) {
      const error = err?.message || 'Failed to reorder custom stations.';
      ui?.notifications?.error?.(`Failed to reorder custom stations: ${error}`);
      return structuredResult({ ok: false, error });
    }
  }

  /**
   * Remove a custom station. If it is currently occupied, the caller MUST
   * pass { unassignCrew: true } to proceed — otherwise this returns
   * { ok: false, requiresConfirmation: true, occupied: true } without
   * mutating anything, so the UI can present an explicit
   * remove-and-unassign vs. cancel choice rather than silently orphaning
   * (or silently preserving) the crew reference.
   */
  static async removeCustomStation(vehicle, id, { unassignCrew = false } = {}) {
    if (!this.canEdit(vehicle)) {
      const error = `You do not have permission to modify ${vehicle?.name || 'this vehicle'}'s stations.`;
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const existing = this.listCustomStations(vehicle);
    const record = existing.find((station) => station?.id === id);
    if (!record) {
      const error = 'Custom station not found.';
      ui?.notifications?.warn?.(error);
      return structuredResult({ ok: false, error });
    }

    const key = record.key;
    const current = vehicle?.system?.crewPositions?.[key];
    const occupied = Boolean(current && (typeof current === 'string' ? current : (current.uuid || current.id || current.name)));

    if (occupied && !unassignCrew) {
      return structuredResult({ ok: false, requiresConfirmation: true, occupied: true, station: record });
    }

    const remaining = existing.filter((station) => station?.id !== id);
    let update = { 'system.stations': remaining };
    if (occupied) {
      const removal = VehicleCrewAssignmentService.buildRemovalUpdate(vehicle, key);
      if (removal) update = { ...update, ...removal };
    }

    try {
      const mutationReceipt = await ActorEngine.updateActor(vehicle, update, { source: 'vehicle-custom-station-remove' });
      ui?.notifications?.info?.(`${record.label || 'Station'} removed.`);
      return structuredResult({ ok: true, station: record, mutationReceipt });
    } catch (err) {
      const error = err?.message || 'Failed to remove custom station.';
      ui?.notifications?.error?.(`Failed to remove custom station: ${error}`);
      return structuredResult({ ok: false, error });
    }
  }
}
