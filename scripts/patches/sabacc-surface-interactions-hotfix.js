import { SabaccEngine } from '/systems/foundryvtt-swse/scripts/games/games/sabacc/sabacc-engine.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.sabaccSurfaceInteractions.registered.v1');
const ABORT = Symbol.for('swse.sabaccSurfaceInteractions.abort.v1');
const SNAPSHOTS = Symbol.for('swse.sabaccSurfaceInteractions.snapshots.v1');
const STYLE_ID = 'swse-sabacc-interactions-style';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = '/systems/foundryvtt-swse/styles/system/sabacc-interactions.css';
  document.head.append(link);
}

function isGamesHost(application) {
  return Boolean(application)
    && (application.shellSurface === 'games' || application._shellSurface === 'games')
    && application.element instanceof HTMLElement;
}

function getSurface(application) {
  return application?.element?.querySelector?.('[data-shell-region="surface-games"]') ?? null;
}

function getSabaccFrame(surface) {
  return surface?.querySelector?.('[data-games-table-frame][data-game-id="sabacc"]') ?? null;
}

function setFormBusy(form, busy) {
  if (!(form instanceof HTMLFormElement)) return;
  form.classList.toggle('is-action-pending', busy);
  if (busy) form.setAttribute('aria-busy', 'true');
  else form.removeAttribute('aria-busy');

  form.querySelectorAll('button, input').forEach(control => {
    if (!(control instanceof HTMLButtonElement || control instanceof HTMLInputElement)) return;
    if (busy) {
      control.dataset.swseSabaccWasDisabled = control.disabled ? 'true' : 'false';
      control.disabled = true;
      return;
    }
    const wasDisabled = control.dataset.swseSabaccWasDisabled === 'true';
    delete control.dataset.swseSabaccWasDisabled;
    if (!wasDisabled) control.disabled = false;
  });
}

function emitCue(cue, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('swse:game-cue', {
      detail: { gameId: 'sabacc', cue, ...detail }
    }));
  } catch (_error) {
    // Presentation cues are best-effort and must never block rules execution.
  }
}

async function submitSabaccAction(application, form, event) {
  const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
  if (submitter?.matches?.(':disabled') || submitter?.getAttribute?.('aria-disabled') === 'true') return;

  const data = new FormData(form);
  const action = String(form.dataset.gamesAction || '').replace(/^sabacc-/, '').trim();
  const sessionId = String(data.get('sessionId') || '').trim();
  const seatId = String(data.get('seatId') || '').trim();
  if (!action || !sessionId) {
    ui.notifications?.warn?.('That Sabacc action is missing its action or session identifier.');
    return;
  }

  const actor = application.actor || application.document || null;
  const payload = {
    cardId: String(data.get('cardId') || '').trim(),
    cardInstanceId: String(data.get('cardInstanceId') || '').trim(),
    slotId: String(data.get('slotId') || '').trim(),
    amount: Number(data.get('amount') || 0) || 0,
    reason: String(data.get('reason') || '').trim()
  };

  setFormBusy(form, true);
  try {
    const result = await SabaccEngine.submitAction({
      sessionId,
      seatId,
      action,
      payload,
      actorId: actor?.id || null
    });

    if (result?.pending) {
      ui.notifications?.info?.('Sabacc action sent to the GM relay.');
    } else if (!result?.ok) {
      ui.notifications?.warn?.(result?.error || 'Sabacc action failed.');
    } else {
      emitCue(action, { sessionId, seatId, cardId: payload.cardId, slotId: payload.slotId, amount: payload.amount });
    }

    await requestShellRender(application, {
      reason: `sabacc-${action}`,
      surfaceId: 'games'
    });
  } catch (error) {
    SWSELogger.error('[SabaccSurfaceInteractions] Sabacc action failed', {
      action,
      sessionId,
      seatId,
      error: error?.message || String(error)
    });
    ui.notifications?.error?.(`Sabacc action failed: ${error?.message || error}`);
  } finally {
    if (form.isConnected) setFormBusy(form, false);
  }
}

function cardFingerprint(node) {
  if (!(node instanceof Element)) return '';
  const imageAlt = node.querySelector('img')?.getAttribute('alt') || '';
  const label = node.querySelector('b, strong')?.textContent || '';
  const short = node.querySelector('small')?.textContent || '';
  return `${imageAlt}|${label}|${short}`.replace(/\s+/g, ' ').trim();
}

function collectCards(root, selector) {
  return Array.from(root.querySelectorAll(selector)).map((node, index) => ({
    node,
    index,
    fingerprint: cardFingerprint(node)
  }));
}

function snapshotTable(table) {
  const viewerCards = collectCards(table, '.swse-sabacc-private-card');
  const tableCards = collectCards(table, '.swse-sabacc-seat-cards .swse-sabacc-card');
  const marketCards = collectCards(table, '.swse-sabacc-market-dock > article');
  const shiftRow = table.querySelector('.swse-sabacc-shift-row');
  const handMarker = table.querySelector('.swse-sabacc-myinfo small')?.textContent?.trim() || '';
  const phase = Array.from(table.classList).find(name => name.startsWith('phase-')) || '';
  const showdown = Boolean(table.querySelector('.swse-sabacc-banner'));

  return {
    viewerCards,
    tableCards,
    marketCards,
    viewerFingerprints: viewerCards.map(entry => entry.fingerprint),
    tableFingerprints: tableCards.map(entry => entry.fingerprint),
    marketFingerprints: marketCards.map(entry => entry.fingerprint),
    shiftLabel: shiftRow?.textContent?.replace(/\s+/g, ' ').trim() || '',
    shiftMatched: Boolean(shiftRow?.classList.contains('matched')),
    handMarker,
    phase,
    showdown
  };
}

function motionDisabled(application) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return true;
  const root = application?.element;
  const style = root?.closest?.('[data-motion-style]')?.dataset?.motionStyle
    || root?.querySelector?.('[data-motion-style]')?.dataset?.motionStyle
    || '';
  return ['off', 'reduced', 'quiet'].includes(String(style).toLowerCase());
}

function targetCardElement(entry) {
  const node = entry?.node;
  if (!(node instanceof HTMLElement)) return null;
  if (node.matches('.swse-sabacc-card')) return node;
  return node.querySelector('.swse-sabacc-card') || node;
}

function pulseClass(node, className, duration = 900) {
  if (!(node instanceof HTMLElement)) return;
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  window.setTimeout(() => node.classList.remove(className), duration);
}

function flyCard(application, source, entry, { delay = 0, reveal = false, market = false } = {}) {
  const target = targetCardElement(entry);
  if (!(target instanceof HTMLElement)) return;

  if (motionDisabled(application) || !(source instanceof HTMLElement)) {
    pulseClass(target, reveal ? 'swse-sabacc-card--reveal' : (market ? 'swse-sabacc-market-card--arrived' : 'swse-sabacc-card--arrived'));
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
    pulseClass(target, reveal ? 'swse-sabacc-card--reveal' : (market ? 'swse-sabacc-market-card--arrived' : 'swse-sabacc-card--arrived'));
    return;
  }

  target.classList.add('swse-sabacc-card-awaiting-deal');
  const ghost = document.createElement('div');
  ghost.className = 'swse-sabacc-deal-ghost';
  Object.assign(ghost.style, {
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${Math.max(22, sourceRect.width)}px`,
    height: `${Math.max(32, sourceRect.height)}px`
  });
  document.body.append(ghost);

  const animation = ghost.animate([
    {
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${Math.max(22, sourceRect.width)}px`,
      height: `${Math.max(32, sourceRect.height)}px`,
      opacity: 0.58,
      transform: 'rotate(-14deg) scale(0.82)'
    },
    {
      offset: 0.72,
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      opacity: 1,
      transform: 'rotate(5deg) scale(1.05)'
    },
    {
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      opacity: 1,
      transform: 'rotate(0deg) scale(1)'
    }
  ], {
    duration: 520,
    delay,
    easing: 'cubic-bezier(0.18, 0.84, 0.24, 1.08)',
    fill: 'both'
  });

  const finish = () => {
    ghost.remove();
    target.classList.remove('swse-sabacc-card-awaiting-deal');
    pulseClass(target, reveal ? 'swse-sabacc-card--reveal' : (market ? 'swse-sabacc-market-card--arrived' : 'swse-sabacc-card--arrived'));
  };
  animation.addEventListener('finish', finish, { once: true });
  animation.addEventListener('cancel', finish, { once: true });
}

function changedIndices(previous = [], current = [], forceAll = false) {
  if (forceAll) return current.map((_value, index) => index);
  const indices = [];
  for (let index = 0; index < current.length; index += 1) {
    if (index >= previous.length || previous[index] !== current[index]) indices.push(index);
  }
  return indices;
}

function animateSabaccTable(application, table) {
  const sessionId = String(table.dataset.sabaccSessionId || '').trim();
  if (!sessionId) return;

  application[SNAPSHOTS] ??= new Map();
  const snapshots = application[SNAPSHOTS];
  const current = snapshotTable(table);
  const previous = snapshots.get(sessionId) || null;
  snapshots.set(sessionId, {
    viewerFingerprints: current.viewerFingerprints,
    tableFingerprints: current.tableFingerprints,
    marketFingerprints: current.marketFingerprints,
    shiftLabel: current.shiftLabel,
    shiftMatched: current.shiftMatched,
    handMarker: current.handMarker,
    phase: current.phase,
    showdown: current.showdown
  });

  const sourceCards = Array.from(table.querySelectorAll('.swse-sabacc-deck-row .swse-sabacc-deck-card'));
  const source = sourceCards[0] || table.querySelector('.swse-sabacc-deck-row');
  const firstRender = !previous;
  const newHand = Boolean(previous && current.handMarker && current.handMarker !== previous.handMarker);
  const showdownReveal = Boolean(current.showdown && !previous?.showdown);
  const shiftChanged = Boolean(current.shiftLabel && current.shiftLabel !== previous?.shiftLabel);
  const forcedShift = Boolean(shiftChanged && current.shiftMatched);

  let delay = 30;
  const viewerChanges = changedIndices(previous?.viewerFingerprints || [], current.viewerFingerprints, firstRender || newHand || forcedShift);
  viewerChanges.forEach(index => {
    flyCard(application, source, current.viewerCards[index], { delay });
    delay += 105;
  });

  const tableChanges = changedIndices(previous?.tableFingerprints || [], current.tableFingerprints, firstRender || newHand || forcedShift);
  tableChanges.forEach(index => {
    const wasHidden = String(previous?.tableFingerprints?.[index] || '').includes('??');
    const isHidden = String(current.tableFingerprints[index] || '').includes('??');
    const reveal = showdownReveal || (wasHidden && !isHidden);
    if (reveal) pulseClass(targetCardElement(current.tableCards[index]), 'swse-sabacc-card--reveal', 1050);
    else flyCard(application, source, current.tableCards[index], { delay });
    delay += 90;
  });

  const marketChanges = changedIndices(previous?.marketFingerprints || [], current.marketFingerprints, firstRender || newHand || forcedShift);
  marketChanges.forEach(index => {
    flyCard(application, source, current.marketCards[index], { delay, market: true });
    delay += 80;
  });

  if (shiftChanged) {
    const shiftRow = table.querySelector('.swse-sabacc-shift-row');
    pulseClass(shiftRow, 'is-new-roll', 1200);
  }
}

function attach(application) {
  application?.[ABORT]?.abort?.();
  application[ABORT] = null;
  if (!isGamesHost(application)) return;

  const surface = getSurface(application);
  const frame = getSabaccFrame(surface);
  const table = frame?.querySelector?.('[data-sabacc-session-id]');
  if (!(surface instanceof HTMLElement) || !(frame instanceof HTMLElement) || !(table instanceof HTMLElement)) return;

  ensureStyles();
  const controller = new AbortController();
  application[ABORT] = controller;

  surface.addEventListener('submit', async event => {
    const form = event.target instanceof HTMLFormElement
      ? event.target
      : event.target?.closest?.('form');
    if (!(form instanceof HTMLFormElement) || !frame.contains(form)) return;
    if (!String(form.dataset.gamesAction || '').startsWith('sabacc-')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    await submitSabaccAction(application, form, event);
  }, { capture: true, signal: controller.signal });

  animateSabaccTable(application, table);
}

function bridgeGameSocketRefresh(payload = {}) {
  if (payload?.__swseGamesRefreshBridged) return;
  const isGamePayload = payload?.source === 'games'
    || /^game-(session|invite|receipt)/.test(String(payload?.type || ''))
    || Boolean(payload?.gameId);
  if (!isGamePayload) return;
  Hooks.callAll('swseGamesUpdated', { ...payload, __swseGamesRefreshBridged: true });
}

export function registerSabaccSurfaceInteractionsHotfix() {
  if (globalThis[REGISTERED]) return;

  Hooks.on('renderApplicationV2', application => {
    queueMicrotask(() => attach(application));
  });

  Hooks.on('closeApplicationV2', application => {
    application?.[ABORT]?.abort?.();
    if (application) application[ABORT] = null;
  });

  Hooks.on('swseHolonetUpdated', bridgeGameSocketRefresh);

  Object.defineProperty(globalThis, REGISTERED, { value: true });
  SWSELogger.log('[SabaccSurfaceInteractions] Registered Sabacc controls, deal animation, and socket refresh bridge');
}
