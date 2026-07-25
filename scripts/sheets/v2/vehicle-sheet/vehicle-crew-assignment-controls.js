/**
 * bindVehicleCrewAssignmentControls(sheet, root, {signal})
 *
 * Phase 6 (vehicle crew assignment + drag-and-drop repair): the vehicle
 * sheet's render path (_wireVehicleActorModeEvents in character-sheet.js)
 * never reaches activateListeners()/_onDrop() — vehicles take an entirely
 * separate, narrower listener path. That meant the crew-assignment panel's
 * vehicle-assign-crew/vehicle-open-crew/vehicle-remove-crew buttons, the
 * per-station Actor drop zones, and even the weapon-mount panel's
 * vehicle-crew-skill Fire buttons had no live handler at all, despite the
 * template and VehicleCrewAssignmentService/VehicleDropEngine already
 * containing the logic to drive them.
 *
 * This module is the single place that binds all of it, called from
 * _wireVehicleActorModeEvents (the listener path vehicles actually use).
 * See docs/audits/vehicle-crew-assignment-phase-6.md for the full trace.
 */

import { VehicleCrewAssignmentService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-assignment-service.js";
import { VehicleDropEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/vehicle-drop-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { rollVehicleCrewSkill } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-skill-router.js";
import { VehicleWeaponStationService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-weapon-station-service.js";
import { VehicleCustomStationService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-custom-station-service.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const CUSTOM_STATION_ROW_SELECTOR = '[data-custom-station-id]';

// Matches the existing (previously unused) hover style in
// styles/sheets/v2-vehicle-sheet.css.
const HOVER_CLASS = 'swse-vehicle-station-row--drop-hover';
const STATION_ROW_SELECTOR = '[data-drop-zone="crew-station"][data-crew-station]';

function withPendingButton(button, handler) {
  return async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    try {
      await handler(event);
    } finally {
      button.disabled = false;
    }
  };
}

function bindAssignmentButtons(vehicle, root, signal) {
  root.querySelectorAll('[data-action="vehicle-assign-crew"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const station = button.dataset.station;
      if (!station) return;
      await VehicleCrewAssignmentService.openCrewPicker(vehicle, station);
    }), { signal });
  });

  root.querySelectorAll('[data-action="vehicle-open-crew"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const station = button.dataset.station;
      if (!station) return;
      await VehicleCrewAssignmentService.openCrewSheet(vehicle, station);
    }), { signal });
  });

  root.querySelectorAll('[data-action="vehicle-remove-crew"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const station = button.dataset.station;
      if (!station) return;
      await VehicleCrewAssignmentService.removeCrew(vehicle, station, { source: 'vehicle-crew-remove-button' });
    }), { signal });
  });
}

function bindCrewSkillButtons(vehicle, root, signal) {
  // Fire-weapon/skill-use buttons rendered by both the crew-assignment
  // panel (non-weapon station skills) and the weapon-mount panel (per-weapon
  // Fire buttons, which carry data-weapon-id). Same action name, same
  // handler — crew-skill-router.js resolves the station's assigned actor
  // (or abstract crew quality) for either case.
  root.querySelectorAll('[data-action="vehicle-crew-skill"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async (event) => {
      event.stopPropagation();
      const station = button.dataset.station;
      const skill = button.dataset.skill;
      const weaponId = button.dataset.weaponId;
      if (!station || !skill) return;
      await rollVehicleCrewSkill(vehicle, station, skill, { weaponId });
    }), { signal });
  });
}

// Resolve a weapon-mount's identity/role from its rendered weaponId, so the
// station-select handler can call VehicleWeaponStationService without the
// full panel context object (which the DOM event does not carry).
function resolveMountByWeaponId(vehicle, weaponId) {
  if (!weaponId) return null;
  const systemMatch = /^system-weapons-(\d+)$/.exec(weaponId);
  if (systemMatch) {
    const index = Number(systemMatch[1]);
    const weapon = vehicle?.system?.weapons?.[index];
    if (!weapon) return null;
    return { source: 'system', index, name: weapon.name, crewRole: weapon.crewRole || 'gunner' };
  }
  const item = vehicle?.items?.get?.(weaponId);
  if (!item) return null;
  return { source: 'item', id: item.id, name: item.name, crewRole: item.system?.vehicleMount?.crewRole || 'gunner' };
}

function bindWeaponStationMapping(vehicle, root, signal) {
  root.querySelectorAll('[data-action="vehicle-weapon-station-select"]').forEach((select) => {
    select.addEventListener('change', async () => {
      const weaponId = select.dataset.weaponId;
      const stationKey = select.value || null;
      const mount = resolveMountByWeaponId(vehicle, weaponId);
      if (!mount) {
        ui?.notifications?.warn?.('Could not identify this weapon mount.');
        return;
      }
      select.disabled = true;
      try {
        await VehicleWeaponStationService.setOperatorStation(vehicle, mount, stationKey);
      } finally {
        select.disabled = false;
      }
    }, { signal });
  });
}

function clearHover(row) {
  row.classList.remove(HOVER_CLASS);
}

function bindStationDropZones(vehicle, root, signal) {
  root.querySelectorAll(STATION_ROW_SELECTOR).forEach((row) => {
    const station = row.dataset.crewStation;
    if (!station) return;

    row.addEventListener('dragenter', (event) => {
      event.preventDefault();
      row.classList.add(HOVER_CLASS);
    }, { signal });

    row.addEventListener('dragover', (event) => {
      event.preventDefault();
    }, { signal });

    row.addEventListener('dragleave', (event) => {
      // Only clear hover once the pointer actually leaves the row (not when
      // moving between child elements of the row).
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) return;
      clearHover(row);
    }, { signal });

    row.addEventListener('drop', async (event) => {
      // File drops (e.g. portrait images dragged from the OS) are not a
      // crew-assignment concern; let the browser default apply.
      if (event.dataTransfer?.files?.length) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      clearHover(row);

      const dropData = VehicleCrewAssignmentService.getDropDataFromEvent(event);
      if (!dropData) {
        ui?.notifications?.warn?.('Could not read the dropped item.');
        return;
      }

      const crewActor = await VehicleCrewAssignmentService.resolveCrewActorFromDropData(dropData);
      if (!crewActor) {
        ui?.notifications?.warn?.(await VehicleCrewAssignmentService.describeDropRejection(dropData));
        return;
      }

      // Exactly one mutation per drop: assignCrew is the sole write path,
      // called once, here, for this station.
      await VehicleCrewAssignmentService.assignCrew(vehicle, station, crewActor, { source: 'vehicle-crew-drop' });
    }, { signal });
  });
}

/**
 * Generic (non-station) vehicle drop routing: weapons, cargo, and any other
 * item drop that lands somewhere on the sheet other than a crew-station row.
 * This is VehicleDropEngine's first live caller — it was previously
 * unreachable from any actual sheet code (Architectural constraints: no
 * second, independently-invented drop-classification engine).
 */
function bindGenericVehicleDrop(sheet, vehicle, root, signal) {
  root.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.files?.length) return;
    event.preventDefault();
  }, { signal });

  root.addEventListener('drop', async (event) => {
    if (event.dataTransfer?.files?.length) return;
    // Station rows already handled (and stopped propagation on) their own
    // drops above; this only ever sees drops that land elsewhere on the
    // sheet, so there is no double-processing between the two handlers.
    if (event.target?.closest?.(STATION_ROW_SELECTOR)) return;

    const dropData = VehicleCrewAssignmentService.getDropDataFromEvent(event);
    if (!dropData) return;
    event.preventDefault();

    const result = await VehicleDropEngine.resolve({ actor: vehicle, dropData, station: null });
    if (!result) {
      // VehicleDropEngine._handleActorDrop rejects an Actor dropped with no
      // station target rather than silently assigning pilot/first-empty;
      // tell the user what to do instead. Item/unsupported-document
      // rejections are already covered by VehicleDropEngine's own domain
      // rules and stay silent no-ops there (matches its established
      // console.debug-only contract for those cases).
      const looksLikeActorDrop = dropData?.type === 'Actor' || /^Actor\./.test(String(dropData?.uuid || ''));
      if (looksLikeActorDrop) {
        ui?.notifications?.warn?.('Drop the crew member directly onto a station row to assign them.');
      }
      return;
    }

    try {
      await ActorEngine.apply(vehicle, result.mutationPlan, { source: 'vehicle-drop-engine' });
      if (result.uiTargetTab && typeof sheet._activateVehicleTab === 'function') {
        sheet._activateVehicleTab(root, result.uiTargetTab);
      }
    } catch (err) {
      ui?.notifications?.error?.(`Failed to apply drop: ${err?.message || err}`);
    }
  }, { signal });
}

async function confirmRemoveOccupiedStation(label) {
  return SWSEDialogV2.confirm({
    title: 'Remove Occupied Station',
    content: `<p>${label || 'This station'} is currently occupied. Remove the station and unassign its crew, or cancel?</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
}

function bindCustomStationEditor(vehicle, root, signal) {
  root.querySelectorAll('[data-action="vehicle-custom-station-rename"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const stationId = input.dataset.stationId;
      if (!stationId) return;
      await VehicleCustomStationService.renameCustomStation(vehicle, stationId, input.value);
    }, { signal });
  });

  root.querySelectorAll('[data-action="vehicle-custom-station-role"]').forEach((select) => {
    select.addEventListener('change', async () => {
      const stationId = select.dataset.stationId;
      if (!stationId) return;
      await VehicleCustomStationService.setCustomStationRole(vehicle, stationId, select.value);
    }, { signal });
  });

  root.querySelectorAll('[data-action="vehicle-custom-station-description"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const stationId = input.dataset.stationId;
      if (!stationId) return;
      await VehicleCustomStationService.setCustomStationDescription(vehicle, stationId, input.value);
    }, { signal });
  });

  function currentOrderedIds() {
    return Array.from(root.querySelectorAll(CUSTOM_STATION_ROW_SELECTOR)).map((row) => row.dataset.customStationId);
  }

  root.querySelectorAll('[data-action="vehicle-custom-station-move-up"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const ids = currentOrderedIds();
      const index = ids.indexOf(button.dataset.stationId);
      if (index <= 0) return;
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      await VehicleCustomStationService.reorderCustomStations(vehicle, ids);
    }), { signal });
  });

  root.querySelectorAll('[data-action="vehicle-custom-station-move-down"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const ids = currentOrderedIds();
      const index = ids.indexOf(button.dataset.stationId);
      if (index === -1 || index >= ids.length - 1) return;
      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
      await VehicleCustomStationService.reorderCustomStations(vehicle, ids);
    }), { signal });
  });

  root.querySelectorAll('[data-action="vehicle-custom-station-remove"]').forEach((button) => {
    button.addEventListener('click', withPendingButton(button, async () => {
      const stationId = button.dataset.stationId;
      if (!stationId) return;
      const result = await VehicleCustomStationService.removeCustomStation(vehicle, stationId, { unassignCrew: false });
      if (result.ok || !result.requiresConfirmation) return;
      const confirmed = await confirmRemoveOccupiedStation(result.station?.label);
      if (confirmed) {
        await VehicleCustomStationService.removeCustomStation(vehicle, stationId, { unassignCrew: true });
      }
    }), { signal });
  });

  const addForm = root.querySelector('[data-action="vehicle-custom-station-add-form"]');
  addForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (addForm.dataset.pending === 'true') return;
    const label = addForm.querySelector('[name="label"]')?.value;
    const role = addForm.querySelector('[name="role"]')?.value;
    addForm.dataset.pending = 'true';
    try {
      const result = await VehicleCustomStationService.createCustomStation(vehicle, { label, role });
      if (result.ok) addForm.reset();
    } finally {
      addForm.dataset.pending = 'false';
    }
  }, { signal });
}

export function bindVehicleCrewAssignmentControls(sheet, root, { signal } = {}) {
  const vehicle = sheet?.actor;
  if (!(root instanceof HTMLElement) || !vehicle || vehicle.type !== 'vehicle') return;

  bindAssignmentButtons(vehicle, root, signal);
  bindCrewSkillButtons(vehicle, root, signal);
  bindStationDropZones(vehicle, root, signal);
  bindGenericVehicleDrop(sheet, vehicle, root, signal);
  bindWeaponStationMapping(vehicle, root, signal);
  bindCustomStationEditor(vehicle, root, signal);
}
