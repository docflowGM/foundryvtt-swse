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
const STYLE_IDS = Object.freeze([
  {
    id: 'swse-shell-responsive-contract-css',
    href: 'systems/foundryvtt-swse/styles/system/shell-responsive-contract.css',
  },
  {
    id: 'swse-app-responsive-contracts-css',
    href: 'systems/foundryvtt-swse/styles/system/app-responsive-contracts.css',
  },
  {
    id: 'swse-app-responsive-character-sheet-css',
    href: 'systems/foundryvtt-swse/styles/system/app-responsive-character-sheet.css',
  },
  {
    id: 'swse-app-responsive-store-css',
    href: 'systems/foundryvtt-swse/styles/system/app-responsive-store.css',
  },
]);
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

function ensureResponsiveStylesheets() {
  if (typeof document === 'undefined') return;
  for (const sheet of STYLE_IDS) {
    if (document.getElementById(sheet.id)) continue;
    const link = document.createElement('link');
    link.id = sheet.id;
    link.rel = 'stylesheet';
    link.href = sheet.href;
    document.head.appendChild(link);
  }
}

function classifyResolutionTier(width, height, compact, narrow, tiny) {
  if (tiny) return 'tiny';
  if (narrow) return 'narrow';
  if (width <= 1024 || height <= 600) return 'micro';
  if (width <= 1280 || height <= 720) return 'small';
  if (width <= 1380 && height <= 820) return 'laptop-short';
  if (compact) return 'compact';
  if (width >= 1920 && height >= 1080) return 'desktop-wide';
  return 'desktop';
}

function clearResolutionTierClasses(target) {
  target.classList.remove(
    'is-shell-tier-tiny',
    'is-shell-tier-narrow',
    'is-shell-tier-micro',
    'is-shell-tier-small',
    'is-shell-tier-laptop-short',
    'is-shell-tier-compact',
    'is-shell-tier-desktop',
    'is-shell-tier-desktop-wide',
  );
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
  const tier = classifyResolutionTier(width, height, compact, narrow, tiny);

  target.classList.add('swse-shell-responsive');
  target.classList.toggle('is-shell-compact', compact);
  target.classList.toggle('is-shell-narrow', narrow);
  target.classList.toggle('is-shell-tiny', tiny);
  target.classList.toggle('is-shell-short', short);
  target.classList.toggle('is-shell-laptop-short', laptopWideShort);
  clearResolutionTierClasses(target);
  target.classList.add(`is-shell-tier-${tier}`);

  target.dataset.shellLayoutWidth = String(Math.round(width));
  target.dataset.shellLayoutHeight = String(Math.round(height));
  target.dataset.shellLayoutMode = tiny ? 'tiny' : narrow ? 'narrow' : compact ? 'compact' : 'desktop';
  target.dataset.shellResolutionTier = tier;
}

export function observeShellResponsive(root, options = {}) {
  const target = resolveTarget(root, options.selector);
  if (!target || typeof ResizeObserver === 'undefined') return null;
  ensureResponsiveStylesheets();

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
  ensureResponsiveStylesheets();
  const scope = root?.querySelectorAll ? root : document;
  const explicitTargets = scope.querySelectorAll?.('.swse-shell-responsive, .swse-responsive-auto') || [];
  for (const target of explicitTargets) observeShellResponsive(target);

  const applicationTargets = scope.querySelectorAll?.(`
    .application:has(.swse-v2-sheet),
    .application:has(.swse-character-sheet),
    .application:has(.swse-concept-body),
    .application:has(.swse-sheet-v2-shell--concept),
    .application:has(.swse-v2-tablet--concept),
    .application:has(.lightsaber-construction-app),
    .application:has(.customization-bay),
    .application:has(.item-customization-workbench),
    .application:has(.swse-customization-workbench),
    .application:has(.gm-datapad),
    .application:has(.gm-holopad),
    .application:has(.swse-gm-datapad),
    .application:has(.swse-store-surface),
    .application:has(.store-surface),
    .application:has(.store-card-grid),
    .application:has(.atlas-surface),
    .application:has(.games-surface),
    .application:has(.hacking-surface),
    .application:has(.force-alchemy-workbench),
    .application:has(.sith-alchemy-workbench)
  `) || [];
  for (const target of applicationTargets) observeShellResponsive(target);
}

export function initializeShellResponsiveObserver() {
  if (typeof window === 'undefined') return;
  ensureResponsiveStylesheets();
  window.SWSEShellResponsive = {
    observe: observeShellResponsive,
    disconnect: disconnectShellResponsive,
    observeAll: observeAllShellResponsive,
  };

  Hooks.once('ready', () => observeAllShellResponsive(document));
  Hooks.on('renderApplication', (_app, html) => {
    const root = html?.[0] || html || document;
    queueMicrotask(() => observeAllShellResponsive(root));
  });
  Hooks.on('renderActorSheet', (_app, html) => {
    const root = html?.[0] || html || document;
    queueMicrotask(() => observeAllShellResponsive(root));
  });
  Hooks.on('renderItemSheet', (_app, html) => {
    const root = html?.[0] || html || document;
    queueMicrotask(() => observeAllShellResponsive(root));
  });
}
