/**
 * Vehicle sheet -> VehicleInstallationService glue. The sheet never edits the ledger or the jobs store; every
 * button calls a governed service method, which enforces ownership, GM authority, funds and the transaction.
 * Dependencies are injected so the glue is testable without Foundry.
 */

const REASON_TEXT = {
  GM_REQUIRED: 'Only a GM can do that.',
  GM_OVERRIDE_REASON_REQUIRED: 'A reason is required for a GM override.',
  WORK_TIME_INCOMPLETE: 'The installation time has not been completed yet (the GM logs work days).',
  OWNER_VEHICLE_NOT_ASSOCIATED: 'This character is not recorded as the vehicle\'s owner.',
  INSUFFICIENT_CREDITS: 'Not enough credits.',
  EP_EXCEEDED: 'Not enough unused emplacement points.',
  INSTALLATION_IN_PROGRESS: 'Another installation action is in progress on this vehicle.',
  STORE_CONTAINS_UNVERIFIED_ENTRIES: 'The installation records failed verification; new work is blocked.',
  MECHANICS_BONUS_UNKNOWN: 'No Mechanics skill total is available for the installing character.',
  TRANSACTION_FAILED: 'The transaction failed; nothing was charged.'
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
  const ownerActor = resolveOwnerActor(vehicle, game);
  if (!ownerActor) { notify.warn('No owner character is available for this installation.'); return { success: false, reasons: ['NO_OWNER_ACTOR'] }; }
  const installerActor = game?.user?.character ?? ownerActor;
  let r;
  switch (action) {
    case 'start-job':
      if (!catalogId) return { success: false, reasons: ['NOTHING_SELECTED'] };
      r = await service.startJob({ ownerActor, vehicle, catalogId }); break;
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
      r = await service.gmInstantInstall({ ownerActor, vehicle, catalogId, reason }); break;
    }
    default: return { success: false, reasons: ['UNKNOWN_ACTION'] };
  }
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
  return {
    service, game: globalThis.game, notify: globalThis.ui.notifications,
    askReason: title => ask(title, 'Reason (recorded with the override)'),
    askDays: async () => { const v = await ask('Log work days', 'Days of work completed', 'number'); const n = Number(v); return v === null || !Number.isFinite(n) || n <= 0 ? null : n; }
  };
}
