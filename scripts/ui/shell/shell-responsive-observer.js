/**
 * Shared SWSE Shell Responsive Observer
 *
 * Generic presentation helper for large shell-hosted apps. It classifies the
 * actual rendered app/shell size, not the physical device or browser viewport,
 * so resized Foundry windows and sidebar-open layouts can use compact UI rules.
 *
 * This helper is intentionally presentation-only. It does not read or mutate
 * actors, items, rules data, progression selections, commerce state, or app
 * business state.
 */

const OBSERVER_KEY = Symbol.for('swse.shellResponsiveObserver');
const DEFAULT_THRESHOLDS = Object.freeze({
  compactWidth: 1180,
  compactHeight: 760,
  laptopWidth: 1380,
  laptopHeight: 820,
  narrowWidth: 900,
  tinyWidth: 700,
  shortHeight: 700,
});

function asNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveTarget(root, selector) {
  if (!root) return null;
  if (selector && root.matches?.(selector)) return root;
  if (selector) return root.querySelector?.(selector) || null;
  return root.closest?.('.swse-shell-responsive') || root.querySelector?.('.swse-shell-responsive') || root;
}

function classify(target, rect, thresholds) {
  const width = Number(rect?.width || target?.clientWidth || 0);
  const height = Number(rect?.height || target?.clientHeight || 0);
  const compact = width < thresholds.compactWidth
    || height < thresholds.compactHeight
    || (width < thresholds.laptopWidth && height < thresholds.laptopHeight);
  const narrow = width < thresholds.narrowWidth;
  const tiny = width < thresholds.tinyWidth;
  const short = height < thresholds.shortHeight;
  const laptopWideShort = width < thresholds.laptopWidth
    && height < thresholds.laptopHeight
    && width >= thresholds.compactWidth;

  target.classList.add('swse-shell-responsive');
  target.classList.toggle('is-shell-compact', compact);
  target.classList.toggle('is-shell-narrow', narrow);
  target.classList.toggle('is-shell-tiny', tiny);
  target.classList.toggle('is-shell-short', short);
  target.classList.toggle('is-shell-laptop-short', laptopWideShort);

  target.dataset.shellLayoutWidth = String(Math.round(width));
  target.dataset.shellLayoutHeight = String(Math.round(height));
  target.dataset.shellLayoutMode = tiny ? 'tiny' : narrow ? 'narrow' : compact ? 'compact' : 'desktop';
}

export function observeShellResponsive(root, options = {}) {
  const target = resolveTarget(root, options.selector);
  if (!target || typeof ResizeObserver === 'undefined') return null;

  const thresholds = {
    compactWidth: asNumber(options.compactWidth, DEFAULT_THRESHOLDS.compactWidth),
    compactHeight: asNumber(options.compactHeight, DEFAULT_THRESHOLDS.compactHeight),
    laptopWidth: asNumber(options.laptopWidth, DEFAULT_THRESHOLDS.laptopWidth),
    laptopHeight: asNumber(options.laptopHeight, DEFAULT_THRESHOLDS.laptopHeight),
    narrowWidth: asNumber(options.narrowWidth, DEFAULT_THRESHOLDS.narrowWidth),
    tinyWidth: asNumber(options.tinyWidth, DEFAULT_THRESHOLDS.tinyWidth),
    shortHeight: asNumber(options.shortHeight, DEFAULT_THRESHOLDS.shortHeight),
  };

  const existing = target[OBSERVER_KEY];
  if (existing?.observer) {
    existing.thresholds = thresholds;
    classify(target, target.getBoundingClientRect(), thresholds);
    return existing.observer;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries?.[0];
    classify(target, entry?.contentRect || target.getBoundingClientRect(), thresholds);
  });

  observer.observe(target);
  target[OBSERVER_KEY] = { observer, thresholds };
  classify(target, target.getBoundingClientRect(), thresholds);
  return observer;
}

export function disconnectShellResponsive(root, options = {}) {
  const target = resolveTarget(root, options.selector);
  const observer = target?.[OBSERVER_KEY]?.observer;
  if (observer) observer.disconnect();
  if (target) delete target[OBSERVER_KEY];
}

export function observeAllShellResponsive(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  const targets = scope.querySelectorAll?.('.swse-shell-responsive, .swse-responsive-auto') || [];
  for (const target of targets) observeShellResponsive(target);
}

if (typeof window !== 'undefined') {
  window.SWSEShellResponsive = {
    observe: observeShellResponsive,
    disconnect: disconnectShellResponsive,
    observeAll: observeAllShellResponsive,
  };

  document.addEventListener('DOMContentLoaded', () => observeAllShellResponsive(document), { once: true });
}
