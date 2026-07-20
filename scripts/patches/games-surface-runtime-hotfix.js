import { GamesSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/GamesSurfaceController.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.gamesSurfaceRuntime.registered.v1');
const CONTROLLER = Symbol.for('swse.gamesSurfaceRuntime.controller.v1');
const RENDER_TIMER = Symbol.for('swse.gamesSurfaceRuntime.renderTimer.v1');
const HOSTS = new Set();

function isGamesHost(application) {
  return Boolean(application)
    && (application.shellSurface === 'games' || application._shellSurface === 'games')
    && application.element instanceof HTMLElement;
}

function destroyController(application) {
  if (!application?.[CONTROLLER]) return;
  application[CONTROLLER].destroy?.();
  delete application[CONTROLLER];
  HOSTS.delete(application);
}

function attachController(application) {
  if (!isGamesHost(application)) {
    destroyController(application);
    return;
  }

  const actor = application.actor || application.document || null;
  let controller = application[CONTROLLER];
  if (!controller) {
    controller = new GamesSurfaceController(application, actor);
    Object.defineProperty(application, CONTROLLER, {
      value: controller,
      writable: true,
      configurable: true
    });
  }

  controller.attach(application.element);
  HOSTS.add(application);
  SWSELogger.debug('[GamesSurfaceRuntime] Games controller attached', {
    actorId: actor?.id || null,
    surface: application.shellSurface || application._shellSurface || null
  });
}

function scheduleGamesRender(application, payload = {}) {
  if (!isGamesHost(application) || application[RENDER_TIMER]) return;

  application[RENDER_TIMER] = window.setTimeout(async () => {
    application[RENDER_TIMER] = null;
    if (!isGamesHost(application)) return;

    try {
      await requestShellRender(application, {
        reason: payload?.type || payload?.action || 'games-session-updated',
        surfaceId: 'games'
      });
    } catch (error) {
      SWSELogger.error('[GamesSurfaceRuntime] Games refresh failed', error);
    }
  }, 40);
}

export function registerGamesSurfaceRuntimeHotfix() {
  if (globalThis[REGISTERED]) return;

  Hooks.on('renderApplicationV2', application => {
    queueMicrotask(() => attachController(application));
  });

  Hooks.on('closeApplicationV2', application => {
    if (application?.[RENDER_TIMER]) {
      clearTimeout(application[RENDER_TIMER]);
      application[RENDER_TIMER] = null;
    }
    destroyController(application);
  });

  Hooks.on('swseGamesUpdated', payload => {
    for (const host of Array.from(HOSTS)) {
      if (!host?.rendered) {
        destroyController(host);
        continue;
      }
      scheduleGamesRender(host, payload);
    }
  });

  Object.defineProperty(globalThis, REGISTERED, { value: true });
  SWSELogger.log('[GamesSurfaceRuntime] Registered playable Games surface controller');
}
