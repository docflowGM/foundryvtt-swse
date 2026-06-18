/**
 * Concept Parity Diagnostics
 * ---------------------------------------------------------------------------
 * Phase 6 hardening utility for the concept north-star surface stack. This is a
 * manual/debug-only audit; it does not mutate app state or block rendering.
 *
 * Usage in Foundry console:
 *   SWSE.debug.conceptParity()
 */

const REQUIRED_STYLE_ORDER = [
  'styles/system/display-effects.css',
  'styles/system/concept-surface-contract.css',
  'styles/apps/gm-holopad-concept-phase2.css',
  'styles/system/atlas-surface.css',
  'styles/system/games-table-unification.css',
  'styles/system/transmission-alchemy-polish.css',
  'styles/system/concept-parity-hardening.css'
];

const SURFACE_CONTRACTS = [
  {
    id: 'gm-holopad',
    label: 'GM Holopad / Datapad',
    root: '[data-concept-surface="gm-holopad"], .gm-command-screen-v2',
    expected: ['.gm-command-sidebar', '.gm-command-surface-stage', '.gm-command-surface-toolbar']
  },
  {
    id: 'holopad-games',
    label: 'Holopad Games',
    root: '[data-concept-surface="holopad-games"], .swse-shell-surface--games',
    expected: ['.swse-games-hud']
  },
  {
    id: 'transmission-decryption',
    label: 'Transmission Decryption / Hacking',
    root: '[data-concept-surface="transmission-decryption"], [data-concept-surface="transmission-console"], .swse-intel-decryption-console',
    expected: ['.swse-intel-decryption-hud']
  },
  {
    id: 'force-alchemy',
    label: 'Sith Alchemy / Force Talisman',
    root: '[data-concept-surface="force-alchemy"], .sa-win',
    expected: ['.sa-hud', '.sa-left', '.sa-center', '.sa-right']
  },
  {
    id: 'atlas',
    label: 'Atlas / Locations',
    root: '[data-concept-surface="atlas"], .swse-shell-surface--atlas',
    expected: ['.swse-atlas-registry-rail', '.swse-atlas-dossier-stage']
  }
];

function normalizeHref(href) {
  if (!href) return '';
  const raw = String(href).replace(/\\/g, '/');
  const systemsIndex = raw.indexOf('/systems/');
  const relative = systemsIndex >= 0 ? raw.slice(systemsIndex) : raw;
  const withoutQuery = relative.split('?')[0].split('#')[0];
  return withoutQuery.replace(/^.*\/systems\/foundryvtt-swse\//, '');
}

function collectLoadedStyles() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style[data-href]'))
    .map((node) => normalizeHref(node.getAttribute('href') || node.dataset.href || ''))
    .filter(Boolean);
}

function auditStyleStack(loadedStyles) {
  const entries = REQUIRED_STYLE_ORDER.map((href) => ({
    href,
    index: loadedStyles.findIndex((loaded) => loaded.endsWith(href) || loaded === href)
  }));

  const missing = entries.filter((entry) => entry.index < 0).map((entry) => entry.href);
  const orderIssues = [];
  for (let i = 1; i < entries.length; i += 1) {
    const previous = entries[i - 1];
    const current = entries[i];
    if (previous.index >= 0 && current.index >= 0 && current.index < previous.index) {
      orderIssues.push(`${current.href} loads before ${previous.href}`);
    }
  }

  return { entries, missing, orderIssues, ok: !missing.length && !orderIssues.length };
}

function auditRenderedSurface(contract) {
  const roots = Array.from(document.querySelectorAll(contract.root));
  const checks = roots.map((root) => {
    const missingChildren = contract.expected.filter((selector) => !root.querySelector(selector));
    return {
      tag: root.tagName?.toLowerCase?.() || 'unknown',
      classes: root.className || '',
      dataset: { ...root.dataset },
      missingChildren,
      ok: missingChildren.length === 0
    };
  });

  return {
    id: contract.id,
    label: contract.label,
    rootCount: roots.length,
    rendered: roots.length > 0,
    checks,
    ok: roots.length === 0 || checks.every((check) => check.ok)
  };
}

function logReport(report) {
  const logger = console;
  logger.groupCollapsed?.('SWSE Concept Parity Diagnostics');
  logger.info?.('Styles:', report.styles);
  if (report.styles.missing.length) logger.warn?.('Missing parity styles:', report.styles.missing);
  if (report.styles.orderIssues.length) logger.warn?.('Parity style order issues:', report.styles.orderIssues);
  logger.table?.(report.surfaces.map((surface) => ({
    surface: surface.label,
    rendered: surface.rendered,
    roots: surface.rootCount,
    ok: surface.ok
  })));
  const childIssues = report.surfaces
    .flatMap((surface) => surface.checks.map((check) => ({ surface: surface.label, ...check })))
    .filter((check) => !check.ok);
  if (childIssues.length) logger.warn?.('Rendered surface contract issues:', childIssues);
  logger.groupEnd?.();
}

export function auditConceptParity(options = {}) {
  const loadedStyles = collectLoadedStyles();
  const report = {
    styles: auditStyleStack(loadedStyles),
    surfaces: SURFACE_CONTRACTS.map(auditRenderedSurface)
  };
  report.ok = report.styles.ok && report.surfaces.every((surface) => surface.ok);

  if (options.log !== false) logReport(report);
  return report;
}

export function initializeConceptParityDiagnostics() {
  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.conceptParity = auditConceptParity;

  queueMicrotask(() => {
    const report = auditConceptParity({ log: false });
    if (!report.styles.ok) {
      console.warn('SWSE | Concept parity style stack needs attention. Run SWSE.debug.conceptParity() for details.', report.styles);
    }
  });
}
