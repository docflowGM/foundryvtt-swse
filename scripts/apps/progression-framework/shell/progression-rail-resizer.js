/**
 * Progression Rail Resizer
 *
 * Desktop/tablet enhancement for the v2 progression shell. This helper owns only
 * presentation state: the summary/details rail widths and collapsed flags. It
 * does not read or mutate progression selections, rules, actors, or finalizer
 * state.
 */

const STORAGE_PREFIX = 'swse.progression.rails';
const USER_FLAG_SCOPE = 'foundryvtt-swse';

const DEFAULTS = Object.freeze({
  summary: {
    width: 180,
    min: 140,
    max: 340,
    collapseThreshold: 120,
    cssVar: '--prog-summary-rail-width',
    collapsedClass: 'is-summary-rail-collapsed',
  },
  details: {
    width: 280,
    min: 240,
    max: 520,
    collapseThreshold: 200,
    cssVar: '--prog-details-rail-width',
    collapsedClass: 'is-details-rail-collapsed',
  },
});

const TOP_RAIL_FLAGS = Object.freeze([
  'mentorRailCollapsed',
  'progressRailCollapsed',
  'utilityBarCollapsed',
  'summaryPanelCollapsed',
]);

function storageKey(rail, field) {
  return `${STORAGE_PREFIX}.${rail}.${field}`;
}

function asNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shellFor(target) {
  return target?.closest?.('.progression-shell') || null;
}

function contentRowFor(shell) {
  return shell?.querySelector?.('.prog-content-row') || null;
}

function workSurfaceFor(shell) {
  return shell?.querySelector?.('[data-region="work-surface"]') || null;
}

function configFor(rail) {
  return DEFAULTS[rail] || null;
}

function railDisplayName(rail) {
  return rail === 'details' ? 'details' : 'summary';
}

function regionForRail(rail) {
  return rail === 'details' ? 'details-panel' : 'summary-panel';
}

function syncRailControls(shell, rail) {
  const cfg = configFor(rail);
  if (!shell || !cfg) return;

  const collapsed = shell.classList.contains(cfg.collapsedClass);
  const label = railDisplayName(rail);
  const resizer = shell.querySelector?.(`.prog-rail-resizer[data-rail="${rail}"]`);
  const region = shell.querySelector?.(`[data-region="${regionForRail(rail)}"]`);

  if (region) region.dataset.collapsed = collapsed ? 'true' : 'false';

  if (resizer) {
    resizer.dataset.collapsed = collapsed ? 'true' : 'false';
    resizer.setAttribute('aria-label', collapsed ? `Restore ${label} rail` : `Resize ${label} rail`);
    resizer.setAttribute(
      'title',
      collapsed
        ? `Click or drag to restore the ${label} rail. Double-click to reset its width.`
        : `Drag to resize the ${label} rail. Drag closed to collapse; double-click to reset.`
    );
  }
}

function activeProgressionShellApp() {
  return globalThis.game?.__swseActiveProgressionShell || null;
}

function applyRestoreAllButtonStyles(button) {
  if (!button) return;
  Object.assign(button.style, {
    position: 'absolute',
    top: '8px',
    right: '12px',
    zIndex: '96',
    minHeight: '24px',
    padding: '3px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    pointerEvents: 'auto',
  });
}

function ensureRestoreAllButton(shell) {
  const row = contentRowFor(shell);
  if (!row || row.querySelector?.(':scope > .prog-layout-restore-all')) return;

  if (!row.style.position) row.style.position = 'relative';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prog-layout-restore-all swse-ui-button';
  button.title = 'Restore all progression rails, panels, and resized body columns to their default layout';
  button.setAttribute('aria-label', 'Restore all progression rails and panels');
  button.innerHTML = '<i class="fas fa-rotate-left" aria-hidden="true"></i><span>Restore All</span>';
  applyRestoreAllButtonStyles(button);
  button.addEventListener('click', (event) => {
    void resetProgressionLayout(event, button);
  });

  row.prepend(button);
}

function availableWidth(shell) {
  const row = contentRowFor(shell);
  return Math.max(0, Number(row?.clientWidth || shell?.clientWidth || 0));
}

function oppositeWidth(shell, rail) {
  const opposite = rail === 'summary' ? 'details' : 'summary';
  const cfg = configFor(opposite);
  if (!cfg) return 0;
  if (shell.classList.contains(cfg.collapsedClass)) return 0;
  const stored = shell.style.getPropertyValue(cfg.cssVar).replace('px', '');
  return clamp(asNumber(stored, cfg.width), cfg.min, cfg.max);
}

function maxWidthFor(shell, rail) {
  const cfg = configFor(rail);
  const workMin = asNumber(getComputedStyle(shell).getPropertyValue('--prog-work-surface-min'), 360);
  const gapBudget = 36;
  const maxByWorkspace = availableWidth(shell) - oppositeWidth(shell, rail) - workMin - gapBudget;
  return Math.max(cfg.min, Math.min(cfg.max, maxByWorkspace || cfg.max));
}

function applyWidth(shell, rail, width, { persist = false } = {}) {
  const cfg = configFor(rail);
  if (!shell || !cfg) return;
  const max = maxWidthFor(shell, rail);
  const next = clamp(asNumber(width, cfg.width), cfg.min, max);
  shell.style.setProperty(cfg.cssVar, `${Math.round(next)}px`);
  shell.classList.remove(cfg.collapsedClass);
  shell.dataset[`${rail}RailCollapsed`] = 'false';
  if (persist) {
    localStorage.setItem(storageKey(rail, 'width'), String(Math.round(next)));
    localStorage.setItem(storageKey(rail, 'collapsed'), 'false');
  }
  syncRailControls(shell, rail);
}

function collapseRail(shell, rail, { persist = false } = {}) {
  const cfg = configFor(rail);
  if (!shell || !cfg) return;
  shell.classList.add(cfg.collapsedClass);
  shell.dataset[`${rail}RailCollapsed`] = 'true';
  if (persist) localStorage.setItem(storageKey(rail, 'collapsed'), 'true');
  syncRailControls(shell, rail);
}

function restoreRail(shell, rail, { persist = false } = {}) {
  const cfg = configFor(rail);
  if (!shell || !cfg) return;
  const stored = asNumber(localStorage.getItem(storageKey(rail, 'width')), cfg.width);
  applyWidth(shell, rail, stored, { persist });
}

function resetBodyRailDefaults(shell) {
  if (!shell) return;
  for (const rail of Object.keys(DEFAULTS)) {
    const cfg = configFor(rail);
    localStorage.removeItem(storageKey(rail, 'width'));
    localStorage.removeItem(storageKey(rail, 'collapsed'));
    applyWidth(shell, rail, cfg.width, { persist: true });
  }
}

function syncTopRailDom(shell) {
  if (!shell) return;
  shell.querySelector?.('[data-region="mentor-rail"]')?.setAttribute('data-collapsed', 'false');
  shell.querySelector?.('[data-region="progress-rail"]')?.setAttribute('data-collapsed', 'false');
  shell.querySelector?.('[data-region="utility-bar"]')?.setAttribute('data-collapsed', 'false');
  shell.querySelector?.('[data-region="summary-panel"]')?.setAttribute('data-collapsed', 'false');
  shell.dataset.summaryRailCollapsed = 'false';
  shell.dataset.detailsRailCollapsed = 'false';
}

async function persistTopRailDefaults() {
  const user = globalThis.game?.user;
  if (!user?.setFlag) return;
  await Promise.allSettled(TOP_RAIL_FLAGS.map(flag => user.setFlag(USER_FLAG_SCOPE, flag, false)));
}

export function hydrateProgressionRailSizes(root) {
  const shell = shellFor(root) || root?.querySelector?.('.progression-shell') || null;
  if (!shell) return;

  ensureRestoreAllButton(shell);

  for (const rail of Object.keys(DEFAULTS)) {
    const cfg = configFor(rail);
    const width = asNumber(localStorage.getItem(storageKey(rail, 'width')), cfg.width);
    applyWidth(shell, rail, width, { persist: false });
    if (localStorage.getItem(storageKey(rail, 'collapsed')) === 'true') {
      collapseRail(shell, rail, { persist: false });
    }
  }
}

export function resetProgressionRailResize(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const rail = target?.dataset?.rail;
  const shell = shellFor(target);
  const cfg = configFor(rail);
  if (!shell || !cfg) return;
  localStorage.removeItem(storageKey(rail, 'width'));
  localStorage.removeItem(storageKey(rail, 'collapsed'));
  applyWidth(shell, rail, cfg.width, { persist: true });
}

export function restoreProgressionRail(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const rail = target?.dataset?.rail;
  const shell = shellFor(target);
  if (!shell || !configFor(rail)) return;
  restoreRail(shell, rail, { persist: true });
}

export async function resetProgressionLayout(event, target) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const shell = shellFor(target) || target?.querySelector?.('.progression-shell') || null;
  if (!shell) return;

  resetBodyRailDefaults(shell);
  syncTopRailDom(shell);

  const app = activeProgressionShellApp();
  if (app) {
    app.mentorCollapsed = false;
    app.progressRailCollapsed = false;
    app.utilityBarCollapsed = false;
    app.summaryPanelCollapsed = false;
  }

  await persistTopRailDefaults();

  ui?.notifications?.info?.('Progression layout restored.');

  if (typeof app?.requestRender === 'function') {
    app.requestRender({ preserveScroll: true, reason: 'restore-layout-defaults' });
  } else if (typeof app?.render === 'function') {
    app.render();
  }
}

export function handleProgressionRailResizerKey(event, target) {
  const rail = target?.dataset?.rail;
  const shell = shellFor(target);
  const cfg = configFor(rail);
  if (!shell || !cfg) return;

  const key = event?.key;
  if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(key)) return;
  event.preventDefault();
  event.stopPropagation();

  if (key === 'Enter' || key === ' ') {
    if (shell.classList.contains(cfg.collapsedClass)) restoreRail(shell, rail, { persist: true });
    else collapseRail(shell, rail, { persist: true });
    return;
  }

  if (shell.classList.contains(cfg.collapsedClass)) restoreRail(shell, rail, { persist: true });

  const current = asNumber(shell.style.getPropertyValue(cfg.cssVar).replace('px', ''), cfg.width);
  const delta = key === 'ArrowRight' ? 16 : -16;
  const signed = rail === 'summary' ? delta : -delta;
  applyWidth(shell, rail, current + signed, { persist: true });
}

export function startProgressionRailResize(event, target) {
  if (event?.button !== undefined && event.button !== 0) return;
  const rail = target?.dataset?.rail;
  const shell = shellFor(target);
  const cfg = configFor(rail);
  if (!shell || !cfg) return;

  event.preventDefault();
  event.stopPropagation();

  const startX = Number(event.clientX || 0);
  const startWidth = shell.classList.contains(cfg.collapsedClass)
    ? cfg.min
    : asNumber(shell.style.getPropertyValue(cfg.cssVar).replace('px', ''), cfg.width);

  shell.classList.add('is-resizing-progression-rail');
  target.classList.add('is-dragging');
  target.setPointerCapture?.(event.pointerId);
  restoreRail(shell, rail, { persist: false });

  const onMove = (moveEvent) => {
    const dx = Number(moveEvent.clientX || startX) - startX;
    const signedDelta = rail === 'summary' ? dx : -dx;
    const rawWidth = startWidth + signedDelta;
    if (rawWidth < cfg.collapseThreshold) {
      collapseRail(shell, rail, { persist: false });
      return;
    }
    applyWidth(shell, rail, rawWidth, { persist: false });
  };

  const onEnd = (endEvent) => {
    target.releasePointerCapture?.(event.pointerId);
    target.classList.remove('is-dragging');
    shell.classList.remove('is-resizing-progression-rail');
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onEnd, true);
    window.removeEventListener('pointercancel', onEnd, true);

    const collapsed = shell.classList.contains(cfg.collapsedClass);
    localStorage.setItem(storageKey(rail, 'collapsed'), collapsed ? 'true' : 'false');
    if (!collapsed) {
      const width = asNumber(shell.style.getPropertyValue(cfg.cssVar).replace('px', ''), cfg.width);
      localStorage.setItem(storageKey(rail, 'width'), String(Math.round(width)));
    }
  };

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onEnd, true);
  window.addEventListener('pointercancel', onEnd, true);
}

if (typeof window !== 'undefined') {
  window.swseProgressionRailResizer = {
    start: startProgressionRailResize,
    key: handleProgressionRailResizerKey,
    reset: resetProgressionRailResize,
    restore: restoreProgressionRail,
    resetAll: resetProgressionLayout,
    hydrate: hydrateProgressionRailSizes,
  };
}
