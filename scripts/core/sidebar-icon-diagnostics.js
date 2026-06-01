/**
 * TEMP DIAGNOSTIC — Sidebar Native Icon Forensics
 *
 * Installs a document.body MutationObserver at module-load time (before any
 * Foundry hook fires) to catch the exact moment #sidebar-tabs first appears,
 * then immediately snapshots native button state before SWSE touches anything.
 *
 * Set globalThis.SWSE_ICON_DIAG_NO_FALLBACK = true before ready to disable
 * the fallback entirely so native state stays visible for inspection.
 *
 * Exposes on SWSE.debug:
 *   dumpSidebarIconState(label)
 *   watchSidebarIconMutations()
 *   stopSidebarIconMutations()
 *   auditSidebarIconCssRules()
 *   testNativeSidebarIcons()
 *
 * Remove this file when root cause is confirmed and fixed.
 */

const TAG = '[SWSE Sidebar Debug]';
const _ts = () => `+${(performance.now() / 1000).toFixed(2)}s`;

// ─── Per-button full snapshot ──────────────────────────────────────────────

function _btnSnapshot(btn) {
  if (!(btn instanceof HTMLElement)) return null;
  const cs  = window.getComputedStyle(btn);
  const bef = window.getComputedStyle(btn, '::before');
  return {
    tab:                  btn.dataset.tab ?? '—',
    className:            btn.className,
    styleAttr:            btn.getAttribute('style') ?? '(none)',
    '--control-icon':     cs.getPropertyValue('--control-icon').trim() || '(empty)',
    'btn.fontFamily':     cs.fontFamily.slice(0, 60),
    '::before.content':   bef.content,
    '::before.display':   bef.display,
    '::before.fontFamily':bef.fontFamily.slice(0, 60),
    '::before.fontWeight':bef.fontWeight,
    '::before.color':     bef.color,
    '::before.bgColor':   bef.backgroundColor,
    '::before.mask':      (bef.maskImage || bef.webkitMaskImage || 'none').slice(0, 100),
    '::before.bgImage':   bef.backgroundImage.slice(0, 80),
    '::before.width':     bef.width,
    '::before.height':    bef.height,
    'fa-solid':           btn.classList.contains('fa-solid'),
  };
}

export function dumpSidebarIconState(label = 'manual') {
  const sel = '#sidebar-tabs button.ui-control.plain.icon, #sidebar-tabs button[data-action="tab"]';
  const unique = [...new Set([...document.querySelectorAll(sel)])];
  if (!unique.length) {
    console.warn(TAG, `${_ts()} ${label} — NO sidebar tab buttons found yet`);
    return;
  }
  console.groupCollapsed(`${TAG} ${_ts()} [${label}] — ${unique.length} button(s)`);
  console.table(unique.map(_btnSnapshot));
  console.groupEnd();
}

// ─── Observers ────────────────────────────────────────────────────────────

const _observers = [];

function _stopAll() {
  _observers.forEach(o => o.disconnect());
  _observers.length = 0;
}

// Install per-button class/style/childList watcher on #sidebar-tabs
function _watchSidebarTabsNode(sidebarTabs) {
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      const t = m.target;
      const btn = (t instanceof HTMLElement)
        ? (t.matches('button[data-action="tab"]') ? t : t.closest?.('button[data-action="tab"]'))
        : null;

      if (m.type === 'attributes' && btn) {
        console.warn(TAG, `${_ts()} BTN ATTR "${m.attributeName}" [tab=${btn.dataset.tab}]`, {
          old: m.oldValue,
          new: t.getAttribute(m.attributeName),
          snapshot: _btnSnapshot(btn),
        });
      }

      if (m.type === 'childList') {
        for (const node of m.removedNodes) {
          if (node instanceof HTMLElement && node.matches('button[data-action="tab"]')) {
            console.warn(TAG, `${_ts()} BTN REMOVED [tab=${node.dataset.tab}]`, node.className);
          }
        }
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement && node.matches('button[data-action="tab"]')) {
            const fallbackActive = document.documentElement.classList.contains('swse-sidebar-icons-fallback');
            const hasFASolid = node.classList.contains('fa-solid');
            const label = (fallbackActive && !hasFASolid)
              ? '*** BTN ADDED AFTER FALLBACK — missing fa-solid ***'
              : 'BTN ADDED';
            console.warn(TAG, `${_ts()} ${label} [tab=${node.dataset.tab}]`, _btnSnapshot(node));
          }
        }
      }
    }
  });
  obs.observe(sidebarTabs, {
    subtree: true, childList: true, attributes: true, attributeOldValue: true,
    attributeFilter: ['class', 'style', 'data-tab', 'data-action', 'aria-label', 'title'],
  });
  _observers.push(obs);
  console.log(TAG, `${_ts()} Watching #sidebar-tabs subtree`);
}

// ─── EARLY BODY WATCHER (runs at module load, before any Foundry hook) ────

let _earlyBodyObs = null;

function _installEarlyBodyWatcher() {
  if (_earlyBodyObs) return;

  // If #sidebar-tabs already exists (unlikely at module load), snapshot immediately
  const existing = document.querySelector('#sidebar-tabs');
  if (existing) {
    console.log(TAG, `${_ts()} #sidebar-tabs already present at module load`);
    dumpSidebarIconState('module-load: sidebar already present');
    _watchSidebarTabsNode(existing);
    return;
  }

  // Watch document.body for #sidebar-tabs to appear
  _earlyBodyObs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        const tabs = node.id === 'sidebar-tabs' ? node : node.querySelector?.('#sidebar-tabs');
        if (!tabs) continue;

        console.log(TAG, `${_ts()} #sidebar-tabs APPEARED IN DOM — immediate native snapshot`);
        dumpSidebarIconState('sidebar-tabs first appeared (NATIVE, pre-SWSE)');
        _watchSidebarTabsNode(tabs);

        // Stop the body watcher — we have what we need
        _earlyBodyObs.disconnect();
        _earlyBodyObs = null;
        return;
      }
    }
  });

  const root = document.body ?? document.documentElement;
  _earlyBodyObs.observe(root, { subtree: true, childList: true });
  console.log(TAG, `${_ts()} Early body watcher installed — waiting for #sidebar-tabs`);
}

// ─── Global class/theme/stylesheet watchers ────────────────────────────────

function _installGlobalWatchers() {
  // html class changes (swse-language-aurabesh, etc.)
  const htmlObs = new MutationObserver(mutations => {
    for (const m of mutations) {
      console.warn(TAG, `${_ts()} html "${m.attributeName}" changed`, {
        old: m.oldValue,
        new: document.documentElement.getAttribute(m.attributeName),
      });
      dumpSidebarIconState(`after html ${m.attributeName} change`);
    }
  });
  htmlObs.observe(document.documentElement, {
    attributes: true, attributeOldValue: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  });
  _observers.push(htmlObs);

  // body class/data-theme changes
  if (document.body) {
    const bodyObs = new MutationObserver(mutations => {
      for (const m of mutations) {
        console.warn(TAG, `${_ts()} body "${m.attributeName}" changed`, {
          old: m.oldValue,
          new: document.body.getAttribute(m.attributeName),
        });
        dumpSidebarIconState(`after body ${m.attributeName} change`);
      }
    });
    bodyObs.observe(document.body, {
      attributes: true, attributeOldValue: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    _observers.push(bodyObs);
  }

  // <head> stylesheet injection
  if (document.head) {
    const headObs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement &&
              (node.tagName === 'STYLE' || (node.tagName === 'LINK' && node.rel === 'stylesheet'))) {
            const src = node.href ?? '(inline <style>)';
            console.warn(TAG, `${_ts()} Stylesheet injected: ${src}`);
            dumpSidebarIconState(`after stylesheet: ${src.split('/').slice(-1)[0]}`);
          }
        }
      }
    });
    headObs.observe(document.head, { childList: true });
    _observers.push(headObs);
  }

  console.log(TAG, `${_ts()} Global watchers active (html/body/head)`);
}

// ─── Public watcher API ────────────────────────────────────────────────────

export function watchSidebarIconMutations() {
  if (_observers.length) {
    console.log(TAG, 'Observers already running.');
    return;
  }
  const tabs = document.querySelector('#sidebar-tabs');
  if (tabs) _watchSidebarTabsNode(tabs);
  _installGlobalWatchers();
}

export function stopSidebarIconMutations() {
  _stopAll();
  console.log(TAG, 'All observers stopped.');
}

// ─── CSS Rule Audit ───────────────────────────────────────────────────────

export function auditSidebarIconCssRules() {
  const PATTERNS = [
    '#sidebar-tabs', '.ui-control', 'button.ui-control', '.plain.icon',
    '--control-icon', 'mask-image', '-webkit-mask', '::before',
    'swse-language-aurabesh', 'data-theme', 'font-family', 'font-variation',
  ];
  const hits = [];
  let sheetCount = 0, errorCount = 0;

  for (const sheet of document.styleSheets) {
    sheetCount++;
    let rules;
    try { rules = [...sheet.cssRules]; }
    catch (e) {
      errorCount++;
      console.warn(TAG, `Cannot read: ${sheet.href ?? '(inline)'} — ${e.message}`);
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const sel = rule.selectorText ?? '';
      const txt = rule.cssText ?? '';
      if (PATTERNS.some(p => sel.includes(p) || txt.includes(p))) {
        hits.push({
          sheet: (sheet.href ?? '(inline)').split('/').slice(-2).join('/'),
          selector: sel,
          cssText: txt.slice(0, 400),
        });
      }
    }
  }

  console.groupCollapsed(
    `${TAG} auditSidebarIconCssRules — ${hits.length} matching rule(s) / ${sheetCount} sheets / ${errorCount} unreadable`
  );
  if (errorCount) console.warn(TAG, `${errorCount} sheet(s) blocked by security — href shown above`);
  for (const h of hits) console.log(`[${h.sheet}]\n${h.selector}\n${h.cssText}\n`);
  console.groupEnd();
  return hits;
}

// ─── Isolation test ───────────────────────────────────────────────────────

export async function testNativeSidebarIcons() {
  const html = document.documentElement;
  const body = document.body;
  const raf  = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  console.group(`${TAG} testNativeSidebarIcons`);
  dumpSidebarIconState('baseline');

  const toggle = async (label, fn, restore) => {
    fn();
    await raf();
    dumpSidebarIconState(label);
    restore();
  };

  await toggle('1. removed swse-sidebar-icons-fallback',
    () => html.classList.remove('swse-sidebar-icons-fallback'),
    () => html.classList.add('swse-sidebar-icons-fallback')
  );
  await toggle('2. removed swse-language-aurabesh',
    () => html.classList.remove('swse-language-aurabesh'),
    () => {} // don't re-add — it might not have been there
  );

  const bodyTheme = body.dataset.theme;
  await toggle('3. removed body data-theme',
    () => delete body.dataset.theme,
    () => { if (bodyTheme) body.dataset.theme = bodyTheme; }
  );

  const htmlTheme = html.dataset.theme;
  await toggle('4. removed html data-theme',
    () => delete html.dataset.theme,
    () => { if (htmlTheme) html.dataset.theme = htmlTheme; }
  );

  const swseSheets = [...document.styleSheets].filter(s => s.href?.includes('foundryvtt-swse'));
  for (const sheet of swseSheets) {
    const name = sheet.href.split('/').slice(-1)[0];
    await toggle(`5. disabled: ${name}`,
      () => { sheet.disabled = true; },
      () => { sheet.disabled = false; }
    );
  }

  dumpSidebarIconState('final — all restored');
  console.groupEnd();
}

// ─── Phase snapshot (called from index.js) ────────────────────────────────

export function snapshotPhase(label) {
  dumpSidebarIconState(label);
}

// ─── Entry point (called from index.js ready hook) ────────────────────────

export function initSidebarIconDiagnostics() {
  globalThis.SWSE       ??= {};
  globalThis.SWSE.debug ??= {};

  Object.assign(globalThis.SWSE.debug, {
    dumpSidebarIconState,
    watchSidebarIconMutations,
    stopSidebarIconMutations,
    auditSidebarIconCssRules,
    testNativeSidebarIcons,
  });

  console.log(TAG, 'Forensic diagnostics ready. SWSE.debug.testNativeSidebarIcons() to isolate.');
}

// ─── MODULE-LEVEL: install early watcher immediately on import ────────────
// LOGGING DISABLED — set SWSE_ICON_DIAG_LOGGING = true to re-enable
// _installEarlyBodyWatcher();
// _installGlobalWatchers();
// console.log(TAG, `${_ts()} Module loaded — early watcher active`);
