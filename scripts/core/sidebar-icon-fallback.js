/**
 * SIDEBAR ICON FALLBACK & RESTORATION
 *
 * PHASE 1: Applies Font Awesome icon classes to sidebar tab buttons.
 * Foundry v13 sidebar tabs don't receive FA icon classes from core,
 * so we must apply them: fa-solid + icon class per tab type.
 *
 * PHASE 2: If Font Awesome still fails to load, applies CSS fallback
 * that uses PNG/SVG icons from assets/icons/.
 *
 * PHASE 3 (TEMP DIAGNOSTIC): MutationObserver watches #sidebar-tabs and
 * #controls for class/style/DOM changes after fallback runs, to identify
 * exactly when/why icons vanish. Gated by globalThis.SWSE_ICON_DIAG = true.
 */

// Icon mapping: data-tab value → Font Awesome icon class
const SIDEBAR_ICON_MAP = {
  'chat': 'fa-comments',
  'combat': 'fa-swords',
  'scenes': 'fa-cubes',
  'placeables': 'fa-map-pin',
  'actors': 'fa-users',
  'items': 'fa-scroll',
  'journal': 'fa-book',
  'tables': 'fa-table',
  'cards': 'fa-rectangle',
  'macros': 'fa-code',
  'playlists': 'fa-music',
  'compendium': 'fa-archive',
  'settings': 'fa-gear'
};

// ─── Diagnostic helpers ────────────────────────────────────────────────────

function _diagEnabled() {
  // LOGGING DISABLED — set globalThis.SWSE_ICON_DIAG = true to re-enable
  return globalThis.SWSE_ICON_DIAG === true;
}

function _buttonSnapshot(btn) {
  if (!(btn instanceof HTMLElement)) return null;
  const cs = window.getComputedStyle(btn);
  const before = window.getComputedStyle(btn, '::before');
  return {
    tab: btn.dataset.tab ?? '—',
    action: btn.dataset.action ?? '—',
    ariaLabel: btn.getAttribute('aria-label') ?? btn.title ?? '—',
    className: btn.className,
    controlIcon: cs.getPropertyValue('--control-icon').trim() || '(empty)',
    beforeContent: before.content,
    beforeFont: before.fontFamily,
    beforeMask: (before.maskImage || before.webkitMaskImage || '(none)').slice(0, 80),
    fallbackActive: document.documentElement.classList.contains('swse-sidebar-icons-fallback')
  };
}

function _snapshotAll(label) {
  if (!_diagEnabled()) return;
  const buttons = [...document.querySelectorAll('#sidebar-tabs button[data-action="tab"]')];
  if (!buttons.length) {
    console.warn(`[SWSE ICON DIAG] ${label} — no sidebar tab buttons found`);
    return;
  }
  console.groupCollapsed(`[SWSE ICON DIAG] ${label} — ${buttons.length} button(s)`);
  console.table(buttons.map((b, i) => ({ i, ..._buttonSnapshot(b) })));
  console.groupEnd();
}

// ─── TEMP DIAGNOSTIC: MutationObserver ────────────────────────────────────
// Remove this block when the icon issue is resolved.

let _diagObserver = null;

function _installDiagObserver() {
  if (!_diagEnabled()) return;
  if (_diagObserver) return;

  const roots = [
    document.querySelector('#sidebar-tabs'),
    document.querySelector('#controls'),
  ].filter(Boolean);

  if (!roots.length) {
    console.warn('[SWSE ICON DIAG] No observable roots found (#sidebar-tabs / #controls)');
    return;
  }

  _diagObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const target = m.target;
      const isButton = target instanceof HTMLElement && (
        target.matches('button[data-action="tab"]') ||
        target.matches('button.ui-control')
      );

      if (m.type === 'attributes' && isButton) {
        const newVal = target.getAttribute(m.attributeName);
        console.warn(
          `[SWSE ICON DIAG] ATTR CHANGE on button[data-tab="${target.dataset.tab}"]`,
          {
            attribute: m.attributeName,
            oldValue: m.oldValue,
            newValue: newVal,
            snapshot: _buttonSnapshot(target)
          }
        );
      }

      if (m.type === 'childList') {
        for (const node of m.removedNodes) {
          if (node instanceof HTMLElement && node.matches('button[data-action="tab"]')) {
            console.warn(
              `[SWSE ICON DIAG] SIDEBAR BUTTON REMOVED — data-tab="${node.dataset.tab}"`,
              { removedClass: node.className, parent: m.target?.id ?? m.target?.className }
            );
          }
        }
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement && node.matches('button[data-action="tab"]')) {
            const hadFallback = document.documentElement.classList.contains('swse-sidebar-icons-fallback');
            const hasFASolid = node.classList.contains('fa-solid');
            if (hadFallback && !hasFASolid) {
              console.warn(
                `[SWSE ICON DIAG] *** SIDEBAR BUTTON REPLACED AFTER FALLBACK *** data-tab="${node.dataset.tab}"`,
                _buttonSnapshot(node)
              );
            } else {
              console.log(
                `[SWSE ICON DIAG] SIDEBAR BUTTON ADDED — data-tab="${node.dataset.tab}"`,
                _buttonSnapshot(node)
              );
            }
          }
        }
      }
    }
  });

  for (const root of roots) {
    _diagObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'style', 'data-tab', 'data-action', 'aria-label', 'title']
    });
  }

  console.log('[SWSE ICON DIAG] Observer installed on:', roots.map(r => r.id || r.className).join(', '));
  globalThis.SWSE_ICON_DIAG_STOP = () => { _diagObserver?.disconnect(); console.log('[SWSE ICON DIAG] Observer stopped'); };
}

// ─── Core fallback logic ───────────────────────────────────────────────────

/**
 * Apply Font Awesome icon classes to sidebar tab buttons.
 * Foundry v13 renders button.ui-control.plain.icon[data-action="tab"] without
 * FA classes, leaving icons blank.
 */
function applyMissingIconClasses() {
  const sidebarTabs = document.querySelector('#sidebar-tabs');
  if (!sidebarTabs) {
    console.warn('SWSE | Sidebar tabs not found, skipping icon class restoration');
    return;
  }

  const tabButtons = sidebarTabs.querySelectorAll('button[data-action="tab"][data-tab]');
  if (tabButtons.length === 0) {
    console.warn('SWSE | No sidebar tab buttons found');
    return;
  }

  let appliedCount = 0;
  tabButtons.forEach(button => {
    const tabName = button.getAttribute('data-tab');
    const iconClass = SIDEBAR_ICON_MAP[tabName];
    if (!iconClass) {
      console.warn(`SWSE | No icon mapping for tab: ${tabName}`);
      return;
    }
    if (!button.classList.contains('fa-solid')) {
      button.classList.add('fa-solid', iconClass);
      appliedCount++;
    }
  });

  if (appliedCount > 0) {
    console.log(`[SWSE] Restored Font Awesome icon classes to ${appliedCount} sidebar tab buttons`);
  }
}

function detectIconFailure() {
  setTimeout(() => {
    const sidebarTabs = document.querySelector('#sidebar-tabs');
    if (!sidebarTabs) {
      console.warn('SWSE | Sidebar tabs not found, skipping icon fallback detection');
      return;
    }

    const controlIcons = sidebarTabs.querySelectorAll('button.ui-control.plain.icon[data-action="tab"]');
    if (controlIcons.length === 0) {
      console.warn('SWSE | No control icons found in sidebar');
      return;
    }

    let fontAwesomeFailed = false;
    for (const icon of controlIcons) {
      const before = window.getComputedStyle(icon, '::before');
      const content = before.content || '';
      // FA with a real glyph: content like '"\f075"' or '"\f075" / ""'
      // Broken cases: 'none', '""', '', '"" / ""' (CSS alt-text with empty glyph)
      const hasGlyph = content !== 'none' && content !== '' && !content.startsWith('""');
      if (!hasGlyph) {
        fontAwesomeFailed = true;
        console.warn('SWSE | FA glyph empty (content:', content, ') — activating PNG fallback');
        break;
      }
    }

    if (fontAwesomeFailed) {
      document.documentElement.classList.add('swse-sidebar-icons-fallback');
      console.log('SWSE | Sidebar icon fallback activated');
    } else {
      document.documentElement.classList.remove('swse-sidebar-icons-fallback');
    }
  }, 500);
}

// ─── Public entry point ────────────────────────────────────────────────────

export function initSidebarIconFallback() {
  // TEMP DIAGNOSTIC: snapshot state before fallback applies
  _snapshotAll('PRE-FALLBACK');

  // PHASE 1: add FA classes
  applyMissingIconClasses();

  // TEMP DIAGNOSTIC: snapshot immediately after
  _snapshotAll('POST-FALLBACK (immediate)');

  // TEMP DIAGNOSTIC: snapshots at 250ms, 1000ms, 3000ms to catch post-render changes
  for (const delay of [250, 1000, 3000]) {
    setTimeout(() => _snapshotAll(`POST-FALLBACK +${delay}ms`), delay);
  }

  // PHASE 2: check if FA rendering actually worked
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectIconFailure);
  } else {
    detectIconFailure();
  }

  // TEMP DIAGNOSTIC: install observer after a tick so it doesn't fire on our own class additions
  setTimeout(_installDiagObserver, 50);
}

// Re-apply classes after sidebar renders (e.g. first open, tab switch)
Hooks.on('renderSidebar', () => {
  applyMissingIconClasses();
  setTimeout(() => _snapshotAll('POST renderSidebar'), 100);
  setTimeout(detectIconFailure, 500);
});

Hooks.on('sidebarCollapse', () => {
  setTimeout(detectIconFailure, 100);
});

// Expose diagnostic helpers on the global SWSE namespace
Hooks.once('ready', () => {
  globalThis.SWSE ??= {};
  globalThis.SWSE.iconDiag = {
    enable()  { globalThis.SWSE_ICON_DIAG = true;  console.log('[SWSE ICON DIAG] enabled — reload or call SWSE.iconDiag.run()'); },
    disable() { globalThis.SWSE_ICON_DIAG = false; globalThis.SWSE_ICON_DIAG_STOP?.(); },
    run()     { _snapshotAll('manual'); },
    snapshot: _snapshotAll,
  };
});
