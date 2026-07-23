import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';

/**
 * Temporary compatibility repairs for controller/service contracts that drifted
 * during the GM Datapad ApplicationV2 extraction. Keep these repairs centralized
 * so page controllers remain usable while the larger controller audit proceeds.
 */
export class GMControllerCompatibilityService {
  static prepare({ surfaceId = '', host = null, controller = null } = {}) {
    if (!host || !controller) return controller;

    if (surfaceId === 'factions') this._repairFactionMutationContract(host, controller);
    if (surfaceId === 'jobs') this._repairJobStatusContract(host, controller);

    return controller;
  }

  static _repairFactionMutationContract(host, controller) {
    // GMFactionRelationshipSurfaceController previously called
    // mutateShellOnly(operation, reason), shifting every argument left. The
    // helper therefore saw a string where the mutation callback belongs and
    // silently returned without saving any faction/contact/relationship data.
    controller._mutate = async (operation, reason = 'gm-faction-surface') => {
      if (typeof operation !== 'function') return undefined;
      return mutateShellOnly(host, operation, {
        reason,
        surfaceId: 'factions'
      });
    };
  }

  static _repairJobStatusContract(host, controller) {
    // The extracted Job Board controller called a removed public method named
    // transitionJobStatus(). Route the rendered lifecycle controls through the
    // supported Messenger thread-action API instead.
    controller._wireStatusButtons = (pageElement, signal) => {
      pageElement.querySelectorAll('[data-job-status-action], [data-job-transition-action]').forEach((button) => {
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!controller._assertGM?.('change job status')) return;

          const threadId = String(event.currentTarget?.dataset?.threadId || '').trim();
          const status = String(event.currentTarget?.dataset?.status || '').trim();
          if (!threadId || !status) {
            globalThis.ui?.notifications?.warn?.('This job control is missing its thread or destination status.');
            return;
          }

          const noteSelector = `[data-job-status-note][data-thread-id="${CSS.escape(threadId)}"]`;
          const statusNote = String(pageElement.querySelector(noteSelector)?.value || '').trim();
          const allowOverride = event.currentTarget.dataset.jobStatusOverride === 'true';
          const action = allowOverride ? 'override-job-status' : 'set-job-status';

          try {
            event.currentTarget.disabled = true;
            const result = await mutateShellOnly(host, () => HolonetMessengerService.threadAction({
              actor: null,
              threadId,
              action,
              status,
              statusNote,
              allowStatusOverride: allowOverride
            }), {
              reason: allowOverride ? 'gm-job-status-override' : 'gm-job-status-transition',
              surfaceId: 'jobs'
            });

            if (!result) {
              globalThis.ui?.notifications?.warn?.('The job status change did not complete.');
              return;
            }

            host.selectedJobThreadId = threadId;
            await requestShellRender(host, {
              reason: allowOverride ? 'gm-job-status-override-refresh' : 'gm-job-status-transition-refresh',
              surfaceId: 'jobs'
            });
          } catch (error) {
            console.error('[SWSE] GM Job Board status action failed', error);
            globalThis.ui?.notifications?.error?.(`Job status change failed: ${error?.message || error}`);
          } finally {
            if (event.currentTarget?.isConnected) event.currentTarget.disabled = false;
          }
        }, { signal });
      });
    };
  }
}

export default GMControllerCompatibilityService;
