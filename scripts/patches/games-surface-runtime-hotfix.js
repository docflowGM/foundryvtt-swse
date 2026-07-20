import { GamesSurfaceController } from '/systems/foundryvtt-swse/scripts/ui/shell/GamesSurfaceController.js';
import { PazaakEngine } from '/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-engine.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.gamesSurfaceRuntime.registered.v2');
const CONTROLLER = Symbol.for('swse.gamesSurfaceRuntime.controller.v2');
const RENDER_TIMER = Symbol.for('swse.gamesSurfaceRuntime.renderTimer.v2');
const ENHANCEMENT_ABORT = Symbol.for('swse.gamesSurfaceRuntime.enhancementAbort.v2');
const PAZAAK_SNAPSHOTS = Symbol.for('swse.gamesSurfaceRuntime.pazaakSnapshots.v2');
const HOSTS = new Set();
const PAZAAK_STYLE_ID = 'swse-pazaak-interactions-style';

function ensurePazaakStyles() {
  if (document.getElementById(PAZAAK_STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = PAZAAK_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = '/systems/foundryvtt-swse/styles/system/pazaak-interactions.css';
  document.head.append(link);
}

function isGamesHost(application) {
  return Boolean(application)
    && (application.shellSurface === 'games' || application._shellSurface === 'games')
    && application.element instanceof HTMLElement;
}

function resolveGamesSurface(application) {
  return application?.element?.querySelector?.('[data-shell-region="surface-games"]') ?? null;
}

function destroyController(application) {
  application?.[ENHANCEMENT_ABORT]?.abort?.();
  if (application) application[ENHANCEMENT_ABORT] = null;

  if (application?.[CONTROLLER]) {
    application[CONTROLLER].destroy?.();
    delete application[CONTROLLER];
  }
  HOSTS.delete(application);
}

function setBusy(form, busy) {
  if (!(form instanceof HTMLFormElement)) return;
  if (busy) form.setAttribute('aria-busy', 'true');
  else form.removeAttribute('aria-busy');
  form.querySelectorAll('button, input[type="submit"]').forEach(control => {
    if (busy) {
      control.dataset.swseWasDisabled = control.disabled ? 'true' : 'false';
      control.disabled = true;
    } else if (control.dataset.swseWasDisabled !== 'true') {
      control.disabled = false;
      delete control.dataset.swseWasDisabled;
    } else {
      delete control.dataset.swseWasDisabled;
    }
  });
}

function emitPazaakCue(cue, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('swse:game-cue', {
      detail: { gameId: 'pazaak', cue, ...detail }
    }));
  } catch (_error) {
    // Presentation cues must never block gameplay.
  }
}

async function handlePazaakSideCardSubmit(application, form, event) {
  const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
  const data = new FormData(form);
  const sessionId = String(data.get('sessionId') || '').trim();
  const seatId = String(data.get('seatId') || '').trim();
  const cardInstanceId = String(data.get('cardInstanceId') || '').trim();
  const sign = submitter?.getAttribute?.('name') === 'sign'
    ? String(submitter.getAttribute('value') || '').trim()
    : String(data.get('sign') || '').trim();
  const rawChoiceValue = submitter?.dataset?.pazaakChoiceValue || data.get('value') || '';
  const parsedChoiceValue = Number(rawChoiceValue);
  const choiceValue = Number.isFinite(parsedChoiceValue) && parsedChoiceValue > 0 ? parsedChoiceValue : null;

  if (!sessionId || !seatId || !cardInstanceId) {
    ui.notifications?.warn?.('That Pazaak card action is missing its session, seat, or card identifier.');
    return;
  }

  setBusy(form, true);
  try {
    const actor = application.actor || application.document || null;
    const result = await PazaakEngine.submitAction({
      sessionId,
      seatId,
      action: 'play-side-card',
      actorId: actor?.id || null,
      payload: {
        cardInstanceId,
        choice: { sign, value: choiceValue }
      }
    });

    if (result?.pending) {
      ui.notifications?.info?.('Pazaak action sent to the GM relay.');
    } else if (!result?.ok) {
      ui.notifications?.warn?.(result?.error || 'Pazaak card play failed.');
    } else {
      emitPazaakCue('play-side-card', { sessionId, seatId, cardInstanceId, sign, value: choiceValue });
    }

    await requestShellRender(application, {
      reason: 'pazaak-play-side-card',
      surfaceId: 'games'
    });
  } catch (error) {
    SWSELogger.error('[GamesSurfaceRuntime] Pazaak side-card action failed', error);
    ui.notifications?.error?.(`Pazaak card play failed: ${error?.message || error}`);
  } finally {
    if (form.isConnected) setBusy(form, false);
  }
}

function wireSideDeckBuilder(application, surface, signal) {
  surface.querySelectorAll('form[data-games-action="lock-pazaak-side-deck"]').forEach(form => {
    const checkboxes = Array.from(form.querySelectorAll('[data-pazaak-side-card]'));
    const counters = Array.from(form.querySelectorAll('[data-pazaak-selected-count]'));
    const submitButtons = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));

    const sync = () => {
      const selected = checkboxes.filter(box => box.checked);
      const selectedIds = selected.map(box => String(box.value || '')).filter(Boolean);
      const ready = selected.length === 10;

      checkboxes.forEach(box => {
        box.disabled = !box.checked && selected.length >= 10;
        box.closest('label')?.classList.toggle('is-selected', box.checked);
      });
      counters.forEach(counter => { counter.textContent = String(selected.length); });
      submitButtons.forEach(button => { button.disabled = !ready; });

      application.patchSurfaceOptions?.({ sideDeckIds: selectedIds }, { render: false });
    };

    checkboxes.forEach(box => box.addEventListener('change', sync, { signal }));
    sync();
  });
}

function labelHitControls(surface) {
  surface.querySelectorAll('form[data-games-action="pazaak-end-turn"] button[type="submit"]').forEach(button => {
    button.textContent = 'Hit / Draw';
    button.title = 'Finish this action phase without standing. Your next turn begins with the mandatory main-deck draw.';
    button.setAttribute('aria-label', 'Hit and draw on your next turn');
  });
}

function addDrawShoe(surface) {
  const playArea = surface.querySelector('.swse-pazaak-play');
  const board = surface.querySelector('.swse-pazaak-board');
  if (!playArea || !board || board.querySelector('.swse-pazaak-draw-shoe')) return;
  const shoe = document.createElement('div');
  shoe.className = 'swse-pazaak-draw-shoe';
  shoe.setAttribute('aria-hidden', 'true');
  board.append(shoe);
}

function animateCard(node, className, delayMs) {
  if (!(node instanceof HTMLElement)) return;
  const target = node.matches('.swse-pazaak-hand-card')
    ? node
    : node.querySelector('.swse-pazaak-played-card, .swse-pazaak-card-face');
  if (!(target instanceof HTMLElement)) return;

  target.style.setProperty('--pazaak-deal-delay', `${Math.max(0, delayMs)}ms`);
  target.classList.add(className);
  if (node.matches('.swse-pazaak-hand-card')) node.classList.add('is-newly-dealt');

  window.setTimeout(() => {
    target.classList.remove(className);
    target.style.removeProperty('--pazaak-deal-delay');
    node.classList.remove('is-newly-dealt');
  }, Math.max(1200, delayMs + 900));
}

function animatePazaakDeltas(application, surface) {
  const table = surface.querySelector('[data-pazaak-session-id]');
  if (!(table instanceof HTMLElement)) return;

  addDrawShoe(surface);

  const sessionId = String(table.dataset.pazaakSessionId || '').trim();
  if (!sessionId) return;

  application[PAZAAK_SNAPSHOTS] ??= new Map();
  const snapshots = application[PAZAAK_SNAPSHOTS];
  const previous = snapshots.get(sessionId) || null;

  const opponentSlots = Array.from(table.querySelectorAll('.swse-pazaak-seat-row--opponent .swse-pazaak-slot.is-filled'));
  const viewerSlots = Array.from(table.querySelectorAll('.swse-pazaak-seat-row--viewer .swse-pazaak-slot.is-filled'));
  const handCards = Array.from(table.querySelectorAll('.swse-pazaak-hand-card'));
  const playing = Boolean(table.querySelector('.swse-pazaak-play'));
  const current = {
    opponentCount: opponentSlots.length,
    viewerCount: viewerSlots.length,
    handCount: handCards.length,
    playing
  };

  snapshots.set(sessionId, current);
  if (!playing) return;

  const tableReset = Boolean(previous && (
    current.opponentCount < previous.opponentCount
    || current.viewerCount < previous.viewerCount
  ));
  const firstPlayingRender = !previous || !previous.playing;

  const opponentStart = firstPlayingRender || tableReset ? 0 : previous.opponentCount;
  const viewerStart = firstPlayingRender || tableReset ? 0 : previous.viewerCount;
  let delay = 40;

  opponentSlots.slice(opponentStart).forEach(slot => {
    const card = slot.querySelector('.swse-pazaak-played-card, .swse-pazaak-card-face');
    const sideCard = card && !card.classList.contains('tone-neutral');
    animateCard(slot, sideCard ? 'swse-pazaak-card--deal-side' : 'swse-pazaak-card--deal-opponent', delay);
    delay += 135;
  });

  viewerSlots.slice(viewerStart).forEach(slot => {
    const card = slot.querySelector('.swse-pazaak-played-card, .swse-pazaak-card-face');
    const sideCard = card && !card.classList.contains('tone-neutral');
    animateCard(slot, sideCard ? 'swse-pazaak-card--deal-side' : 'swse-pazaak-card--deal-viewer', delay);
    delay += 135;
  });

  if (firstPlayingRender) {
    handCards.forEach(card => {
      animateCard(card, 'swse-pazaak-card--deal-hand', delay);
      delay += 75;
    });
  }
}

function wirePazaakEnhancements(application) {
  application?.[ENHANCEMENT_ABORT]?.abort?.();
  const surface = resolveGamesSurface(application);
  if (!(surface instanceof HTMLElement)) return;

  const abort = new AbortController();
  application[ENHANCEMENT_ABORT] = abort;
  const { signal } = abort;

  wireSideDeckBuilder(application, surface, signal);
  labelHitControls(surface);
  animatePazaakDeltas(application, surface);

  surface.addEventListener('submit', async event => {
    const form = event.target instanceof HTMLFormElement
      ? event.target
      : event.target?.closest?.('form');
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.gamesAction !== 'pazaak-play-side-card') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    await handlePazaakSideCardSubmit(application, form, event);
  }, { capture: true, signal });
}

function attachController(application) {
  if (!isGamesHost(application)) {
    destroyController(application);
    return;
  }

  ensurePazaakStyles();
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
  wirePazaakEnhancements(application);
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
  SWSELogger.log('[GamesSurfaceRuntime] Registered playable Games surface controller and Pazaak presentation bridge');
}
