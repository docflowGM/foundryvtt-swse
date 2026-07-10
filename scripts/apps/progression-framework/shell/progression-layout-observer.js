/**
 * Progression Layout Observer
 *
 * Applies responsive classes from the actual progression shell size, not just
 * the browser viewport. This covers resized Foundry windows, sidebar-open
 * layouts, browser zoom, and low-height 16:9 laptop screens.
 */

const OBSERVER_KEY = Symbol.for('swse.progression.layoutObserver');
const STYLE_ID = 'swse-progression-layout-observer-styles';

function shellFor(target) {
  return target?.closest?.('.progression-shell') || target?.querySelector?.('.progression-shell') || null;
}

function ensureObserverStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.progression-shell.is-prog-compact {
  --prog-utility-bar-height: 38px;
  --prog-footer-height: 44px;
}

.progression-shell.is-prog-compact::before {
  inset: 4px !important;
}

.progression-shell.is-prog-compact [data-region="mentor-rail"],
.progression-shell.is-prog-compact [data-region="progress-rail"],
.progression-shell.is-prog-compact .prog-phase-banner,
.progression-shell.is-prog-compact .prog-collapsed-rail-tray,
.progression-shell.is-prog-compact .prog-summary-restore,
.progression-shell.is-prog-compact .prog-summary-panel__collapse,
.progression-shell.is-prog-compact .prog-rail-resizer {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  flex-basis: 0 !important;
  overflow: hidden !important;
}

.progression-shell.is-prog-compact .prog-main-column {
  min-height: 0 !important;
  overflow: hidden !important;
}

.progression-shell.is-prog-compact .prog-content-row {
  position: relative !important;
  padding: 4px !important;
  gap: 0 !important;
}

.progression-shell.is-prog-compact [data-region="summary-panel"] {
  display: none !important;
}

.progression-shell.is-prog-compact [data-region="work-surface"] {
  flex: 1 1 100% !important;
  width: 100% !important;
  min-width: 0 !important;
  padding: 6px !important;
  border-inline-width: 0 !important;
}

.progression-shell.is-prog-compact .prog-step-context-banner {
  padding: 4px 8px !important;
  margin: 0 0 4px !important;
  font-size: 11px !important;
}

.progression-shell.is-prog-compact [data-region="utility-bar"] {
  height: var(--prog-utility-bar-height) !important;
  min-height: var(--prog-utility-bar-height) !important;
  max-height: var(--prog-utility-bar-height) !important;
  padding: 2px 6px !important;
  border-bottom-color: rgba(80, 220, 255, 0.18) !important;
}

.progression-shell.is-prog-compact .prog-inline-utility-region {
  margin-bottom: 4px !important;
}

.progression-shell.is-prog-compact .prog-utility-bar,
.progression-shell.is-prog-compact .prog-utility-bar__controls,
.progression-shell.is-prog-compact .prog-utility-bar__filters,
.progression-shell.is-prog-compact .prog-utility-bar__search {
  min-height: 0 !important;
  gap: 4px !important;
}

.progression-shell.is-prog-compact .prog-utility-bar button,
.progression-shell.is-prog-compact .prog-utility-bar input,
.progression-shell.is-prog-compact .prog-utility-bar__filter-chip,
.progression-shell.is-prog-compact .swse-ui-button {
  min-height: 28px !important;
  padding-block: 3px !important;
  font-size: 11px !important;
}

.progression-shell.is-prog-compact [data-region="details-panel"] {
  display: flex !important;
  position: absolute !important;
  left: 8px !important;
  right: 8px !important;
  bottom: 8px !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  max-height: min(46%, 360px) !important;
  z-index: 80 !important;
  border: 1px solid rgba(80, 220, 255, 0.42) !important;
  background: rgba(3, 11, 20, 0.96) !important;
  box-shadow: 0 0 24px rgba(0, 190, 255, 0.18), inset 0 0 12px rgba(80, 220, 255, 0.08) !important;
  backdrop-filter: blur(10px);
}

.progression-shell.is-prog-compact [data-region="details-panel"]:has(.prog-details-placeholder__empty) {
  display: none !important;
}

.progression-shell.is-prog-compact [data-region="details-panel"] > * {
  max-height: 100% !important;
  overflow-y: auto !important;
}

.progression-shell.is-prog-compact [data-region="action-footer"] {
  height: var(--prog-footer-height) !important;
  min-height: var(--prog-footer-height) !important;
  max-height: var(--prog-footer-height) !important;
}

.progression-shell.is-prog-compact .swse-footer {
  min-height: 0 !important;
  height: 100% !important;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr) minmax(72px, auto) !important;
  align-items: center !important;
  padding: 2px 6px !important;
  gap: 4px !important;
}

.progression-shell.is-prog-compact .action-footer__status {
  min-width: 0 !important;
  overflow: hidden !important;
}

.progression-shell.is-prog-compact .prog-footer-status-line,
.progression-shell.is-prog-compact .prog-footer-status-trigger {
  max-width: 100% !important;
}

.progression-shell.is-prog-compact .prog-footer-status-trigger {
  padding: 2px 8px !important;
  font-size: 10px !important;
}

.progression-shell.is-prog-compact .prog-blocker-explanation,
.progression-shell.is-prog-compact .swse-footer__status {
  position: absolute !important;
  left: 50% !important;
  bottom: calc(100% + 4px) !important;
  transform: translateX(-50%) !important;
  max-width: min(720px, calc(100vw - 32px)) !important;
  padding: 3px 8px !important;
  font-size: 11px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.progression-shell.is-prog-compact .swse-btn,
.progression-shell.is-prog-compact .swse-btn--back,
.progression-shell.is-prog-compact .swse-btn--confirm {
  min-height: 30px !important;
  padding: 4px 10px !important;
  font-size: 11px !important;
}

.progression-shell.is-prog-narrow [data-region="utility-bar"] {
  height: auto !important;
  min-height: 34px !important;
  max-height: 74px !important;
  overflow-y: auto !important;
}

.progression-shell.is-prog-narrow .prog-utility-bar,
.progression-shell.is-prog-narrow .prog-utility-bar__controls,
.progression-shell.is-prog-narrow .prog-utility-bar__filters {
  flex-wrap: wrap !important;
}

.progression-shell.is-prog-tiny .prog-step-context-banner,
.progression-shell.is-prog-tiny .prog-phase-banner,
.progression-shell.is-prog-tiny .hud,
.progression-shell.is-prog-tiny .swse-hud {
  display: none !important;
}

.progression-shell.is-prog-tiny [data-region="details-panel"] {
  max-height: 66% !important;
}
  `;
  document.head.appendChild(style);
}

function classify(shell, rect) {
  const width = Number(rect?.width || shell?.clientWidth || 0);
  const height = Number(rect?.height || shell?.clientHeight || 0);

  const compact = width < 1180 || height < 760 || (width < 1380 && height < 820);
  const narrow = width < 900;
  const tiny = width < 700;
  const short = height < 700;
  const laptopWideShort = width < 1380 && height < 820 && width >= 1180;

  shell.classList.toggle('is-prog-compact', compact);
  shell.classList.toggle('is-prog-narrow', narrow);
  shell.classList.toggle('is-prog-tiny', tiny);
  shell.classList.toggle('is-prog-short', short);
  shell.classList.toggle('is-prog-laptop-short', laptopWideShort);

  shell.dataset.progLayoutWidth = String(Math.round(width));
  shell.dataset.progLayoutHeight = String(Math.round(height));
  shell.dataset.progLayoutMode = tiny ? 'tiny' : narrow ? 'narrow' : compact ? 'compact' : 'desktop';
}

export function observeProgressionLayout(root) {
  const shell = shellFor(root);
  if (!shell || typeof ResizeObserver === 'undefined') return;
  ensureObserverStyles();

  if (shell[OBSERVER_KEY]?.observer) {
    classify(shell, shell.getBoundingClientRect());
    return;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries?.[0];
    classify(shell, entry?.contentRect || shell.getBoundingClientRect());
  });

  observer.observe(shell);
  shell[OBSERVER_KEY] = { observer };
  classify(shell, shell.getBoundingClientRect());
}

export function disconnectProgressionLayoutObserver(root) {
  const shell = shellFor(root);
  const observer = shell?.[OBSERVER_KEY]?.observer;
  if (observer) observer.disconnect();
  if (shell) delete shell[OBSERVER_KEY];
}

if (typeof window !== 'undefined') {
  window.swseProgressionLayoutObserver = {
    observe: observeProgressionLayout,
    disconnect: disconnectProgressionLayoutObserver,
  };
}
