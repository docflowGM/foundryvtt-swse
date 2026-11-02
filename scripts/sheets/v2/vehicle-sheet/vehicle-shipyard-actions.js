/**
 * Vehicle sheet -> VehicleInstallationService glue. The sheet never edits the ledger or the jobs store; every
 * button calls a governed service method, which enforces ownership, GM authority, funds and the transaction.
 * Dependencies are injected so the glue is testable without Foundry.
 */
import { EFFECTS } from '../../../domain/vehicles/vehicle-modification-effects.js';
import { VEHICLE_FIRING_ARCS } from '../../../domain/vehicles/vehicle-firing-arc-geometry.js';
import { WEAPON_OPERATOR_ROLES } from '../../../domain/vehicles/vehicle-installation-ledger.js';

const isWeaponRow = catalogId => EFFECTS[catalogId]?.kind === 'weapon';

const REASON_TEXT = {
  GM_REQUIRED: 'Only a GM can do that.',
  ENVIRONMENT_STATE_INVALID: 'Unknown environment state.',
  ASSIGNED_PILOT_UNAVAILABLE: 'The pilot assigned to this vehicle could not be found. Reassign the pilot station or clear it to use the generic crew.',
  PILOT_ROLL_NOT_AUTHORIZED: 'You do not control the assigned pilot.',
  GENERIC_CREW_ROLL_NOT_AUTHORIZED: 'Only the vehicle\'s owner or a GM can roll for the generic crew.',
  GM_OVERRIDE_REASON_REQUIRED: 'A reason is required for a GM override.',
  WORK_TIME_INCOMPLETE: 'The installation time has not been completed yet (the GM logs work days).',
  OWNER_VEHICLE_NOT_ASSOCIATED: 'This character is not recorded as the vehicle\'s owner.',
  INSUFFICIENT_CREDITS: 'Not enough credits.',
  EP_EXCEEDED: 'Not enough unused emplacement points.',
  INSTALLATION_IN_PROGRESS: 'Another installation action is in progress on this vehicle.',
  STORE_CONTAINS_UNVERIFIED_ENTRIES: 'The installation records failed verification; new work is blocked.',
  MECHANICS_BONUS_UNKNOWN: 'No Mechanics skill total is available for the installing character.',
  TRANSACTION_FAILED: 'The transaction failed; nothing was charged.',
  WEAPON_MOUNT_UNCERTIFIED: 'A weapon needs a mount certified by the GM (mount, firing arc, operator and reason).',
  WEAPON_MOUNT_ARC_INVALID: 'That firing arc is not valid.',
  WEAPON_MOUNT_OPERATOR_INVALID: 'A weapon is operated from the pilot or a gunner station.',
  WEAPON_MOUNT_KEY_IN_USE: 'Another installed weapon already uses that mount.',
  MOUNT_CERTIFICATION_REASON_REQUIRED: 'The GM must give a reason when certifying a weapon mount.',
  MOUNT_PROVENANCE_SET_BY_SERVICE_ONLY: 'Mount provenance is recorded by the system, not supplied by the request.',
  CAPITAL_SHIP_TARGETING_PENALTY_NOT_IMPLEMENTED: 'Weapons cannot be installed on frigate-size or larger ships yet (the capital-ship attack penalty is not automated).',
  WEAPON_ITEM_SYNC_FAILED: 'The weapon item could not be written.',
  WEAPON_ITEM_SYNC_UNVERIFIED: 'The weapon items could not be verified after writing.',
  WEAPON_ITEMS_NOT_SYNCHRONIZED: 'The installation is complete and paid for, but the weapon is not operational yet: its weapon item is not in sync. Use "Resync weapons".',
  NOT_AUTHORIZED: 'Only a GM or the vehicle\'s owner can do that.'
};
export const describeReasons = reasons => (reasons ?? []).map(r => REASON_TEXT[r] ?? r).join(' ');

export function resolveOwnerActor(vehicle, game) {
  const id = vehicle?.system?.ownedByActorId;
  return (id && game?.actors?.get?.(id)) || game?.user?.character || null;
}

const OUTCOME = {
  SUCCESS: 'Success: the system is installed.',
  PARTIAL_FAILURE: 'Partial failure: the money and time are spent; a retry costs half and gives +5.',
  TOTAL_FAILURE: 'Total failure: all time and money are lost; starting again is a new attempt.'
};

/**
 * @param {{action:string, jobId?:string, catalogId?:string, vehicle:object}} p
 * @param {{service:object, game:object, notify:{info:Function,warn:Function}, askReason:Function, askDays:Function}} deps
 */
export async function runShipyardAction({ action, jobId, catalogId, vehicle }, deps) {
  const { service, game, notify } = deps;
  if (action === 'resync-weapons') {   // repairs Items from the sealed ledger; no owner character, no credits
    const r = await service.reconcileWeaponItems({ vehicle });
    if (r.success) notify.info('Weapon items are in sync.'); else notify.warn(describeReasons(r.reasons));
    return r;
  }
  const ownerActor = resolveOwnerActor(vehicle, game);
  if (!ownerActor) { notify.warn('No owner character is available for this installation.'); return { success: false, reasons: ['NO_OWNER_ACTOR'] }; }
  const installerActor = game?.user?.character ?? ownerActor;
  let r;
  switch (action) {
    case 'start-job': {
      if (!catalogId) return { success: false, reasons: ['NOTHING_SELECTED'] };
      // V-P2-04: a weapon's mount is certified by a GM when the work begins; players ask the GM to start weapon work.
      let mount = null;
      if (isWeaponRow(catalogId) && game?.user?.isGM === true) {
        mount = await deps.askMount?.();
        if (!mount) return { success: false, reasons: ['CANCELLED'] };
      }
      r = await service.startJob({ ownerActor, vehicle, catalogId, mount }); break;
    }
    case 'record-check': r = await service.recordCheck({ ownerActor, vehicle, jobId, installerActor }); break;
    case 'retry-job': r = await service.retryJob({ ownerActor, vehicle, jobId }); break;
    case 'log-days': {
      const days = await deps.askDays();
      if (days === null || days === undefined) return { success: false, reasons: ['CANCELLED'] };
      r = await service.logWorkDays({ ownerActor, vehicle, jobId, days }); break;
    }
    case 'gm-complete': {
      const reason = await deps.askReason('Mark installation completed');
      if (reason === null || reason === undefined) return { success: false, reasons: ['CANCELLED'] };
      r = await service.gmCompleteJob({ ownerActor, vehicle, jobId, reason }); break;
    }
    case 'gm-instant': {
      if (!catalogId) return { success: false, reasons: ['NOTHING_SELECTED'] };
      const reason = await deps.askReason('Install instantly (GM override)');
      if (reason === null || reason === undefined) return { success: false, reasons: ['CANCELLED'] };
      let mount = null;
      if (isWeaponRow(catalogId)) { mount = await deps.askMount?.(); if (!mount) return { success: false, reasons: ['CANCELLED'] }; }
      r = await service.gmInstantInstall({ ownerActor, vehicle, catalogId, reason, mount }); break;
    }
    default: return { success: false, reasons: ['UNKNOWN_ACTION'] };
  }
  // A committed transaction whose weapon Items are not in sync is NOT reported as a clean success.
  if (r.success && r.partial) { notify.warn(describeReasons(r.reasons)); return r; }
  if (r.success) notify.info(r.outcome ? `${OUTCOME[r.outcome]} (check ${r.total})` : 'Done.');
  else notify.warn(describeReasons(r.reasons) || r.error || 'The action was refused.');
  return r;
}

export function bindShipyardActions(root, vehicle, deps) {
  for (const btn of root.querySelectorAll('[data-shipyard-action]')) {
    btn.addEventListener('click', async ev => {
      ev.preventDefault();
      const select = root.querySelector('[data-shipyard-select="catalog"]');
      btn.disabled = true;
      try {
        await runShipyardAction({ action: btn.dataset.shipyardAction, jobId: btn.dataset.jobId, catalogId: select?.value, vehicle }, deps);
      } finally { btn.disabled = false; }
    });
  }
}

/** Client dependencies (Foundry V13 DialogV2). Resolves null when the dialog is dismissed. */
export function createDefaultShipyardDeps(service) {
  const ask = async (title, label, type = 'text') => {
    try {
      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title },
        content: `<label>${label} <input type="${type}" name="value" ${type === 'number' ? 'min="0" step="0.5"' : ''} autofocus></label>`,
        ok: { label: 'OK', callback: (_ev, button) => button.form.elements.value.value }
      });
      return result ?? null;
    } catch { return null; }
  };
  // GM mount certification (V-P2-04): recorded as GM-adjudicated, never as printed evidence.
  const askMount = async () => {
    const opt = values => [...values].map(v => `<option value="${v}">${v}</option>`).join('');
    try {
      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: 'Certify weapon mount (GM)' },
        content: `<label>Mount <input type="text" name="mountKey" placeholder="e.g. port wing" required autofocus></label>
          <label>Firing arc <select name="arc">${opt(VEHICLE_FIRING_ARCS)}</select></label>
          <label>Operator <select name="operatorRole">${opt(WEAPON_OPERATOR_ROLES)}</select></label>
          <label>Reason <input type="text" name="reason" required></label>`,
        ok: { label: 'Certify', callback: (_ev, button) => { const f = button.form.elements;
          return { mountKey: f.mountKey.value.trim(), arc: f.arc.value, operatorRole: f.operatorRole.value, reason: f.reason.value.trim() }; } }
      });
      return result && result.mountKey && result.reason ? result : null;
    } catch { return null; }
  };
  return {
    service, game: globalThis.game, notify: globalThis.ui.notifications, askMount,
    askReason: title => ask(title, 'Reason (recorded with the override)'),
    askDays: async () => { const v = await ask('Log work days', 'Days of work completed', 'number'); const n = Number(v); return v === null || !Number.isFinite(n) || n <= 0 ? null : n; }
  };
}

/**
 * P6B-0 operating-context buttons: GM environment adjudication and the Pilot check (crew pilot from the vehicle's
 * pilot station when assigned, otherwise the generic crew). deps: { service, notify }.
 */
export async function runOperatingAction({ action, environment, vehicle }, deps) {
  if (environment) {
    const r = await deps.service.setEnvironment(vehicle, environment);
    if (!r.success) deps.notify.warn(describeReasons(r.reasons));
    return r;
  }
  // The service resolves the assigned pilot itself and fails explicitly when it is unavailable.
  if (action === 'pilot-check') {
    const r = await deps.service.rollPilotCheck(vehicle, {});
    if (!r.success && r.reasons?.length) deps.notify.warn(describeReasons(r.reasons));
    return r;
  }
  return { success: false, reasons: ['UNKNOWN_ACTION'] };
}

export function bindOperatingActions(root, vehicle, deps) {
  for (const btn of root.querySelectorAll('[data-vehicle-environment], [data-vehicle-action="pilot-check"]')) {
    btn.addEventListener('click', async ev => {
      ev.preventDefault();
      btn.disabled = true;
      try { await runOperatingAction({ action: btn.dataset.vehicleAction, environment: btn.dataset.vehicleEnvironment, vehicle }, deps); }
      finally { btn.disabled = false; }
    });
  }
}

export function createDefaultOperatingDeps(service) {
  return { service, notify: globalThis.ui.notifications };
}
