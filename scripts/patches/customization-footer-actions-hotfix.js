import { CustomizationSurfaceAdapter } from '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.customizationFooterActions.registered.v1');
const LISTENER = Symbol.for('swse.customizationFooterActions.listener.v1');

function resolveShellHost(application) {
  if (!application) return null;
  if (application.shellSurface === 'customization' || application._shellSurface === 'customization') return application;
  return null;
}

function attachCustomizationActionBridge(application) {
  const shellHost = resolveShellHost(application);
  if (!shellHost) return;

  const root = application.element;
  if (!(root instanceof HTMLElement)) return;
  const surface = root.querySelector('[data-shell-region="surface-customization"]');
  if (!(surface instanceof HTMLElement) || surface[LISTENER]) return;

  const controller = new AbortController();
  Object.defineProperty(surface, LISTENER, { value: controller, configurable: true });

  surface.addEventListener('click', async event => {
    const eventTarget = event.target instanceof Element ? event.target : event.target?.parentElement;
    const button = eventTarget?.closest?.('[data-action]');
    if (!(button instanceof HTMLElement) || !surface.contains(button)) return;

    const action = button.dataset.action;
    if (!action || button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    button.setAttribute('aria-busy', 'true');
    try {
      const actorId = surface.dataset.actorId
        || shellHost.shellSurfaceOptions?.targetActorId
        || shellHost._shellSurfaceOptions?.targetActorId
        || shellHost.actor?.id
        || shellHost.document?.id
        || null;
      const mode = surface.dataset.bayMode
        || shellHost.shellSurfaceOptions?.bayMode
        || shellHost._shellSurfaceOptions?.bayMode
        || shellHost.shellSurfaceOptions?.mode
        || shellHost._shellSurfaceOptions?.mode
        || 'garage';

      const adapter = CustomizationSurfaceAdapter.getForActor(actorId, mode)
        || CustomizationSurfaceAdapter.getForHost(shellHost, { actorId, mode });

      if (!adapter) {
        SWSELogger.warn('[CustomizationFooterActions] No inline customization adapter resolved', {
          action,
          actorId,
          mode
        });
        ui?.notifications?.warn?.('The Garage controller could not be found. Close and reopen the Garage, then try again.');
        return;
      }

      await adapter.handleAction(action, button);
    } catch (error) {
      SWSELogger.error('[CustomizationFooterActions] Garage action failed', {
        action,
        error: error?.message || String(error)
      });
      ui?.notifications?.error?.(`Garage action failed: ${error?.message || error}`);
    } finally {
      button.removeAttribute('aria-busy');
    }
  }, { capture: true, signal: controller.signal });
}

export function registerCustomizationFooterActionsHotfix() {
  if (globalThis[REGISTERED]) return;

  Hooks.on('renderApplicationV2', application => {
    queueMicrotask(() => attachCustomizationActionBridge(application));
  });

  Object.defineProperty(globalThis, REGISTERED, { value: true });
  SWSELogger.log('[CustomizationFooterActions] Registered Garage footer action bridge');
}
