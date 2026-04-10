/**
 * SIDEBAR SENTINEL TRACE LAYER
 *
 * Surgical DOM lifecycle tracing for sidebar/tab path only.
 *
 * Tracks:
 * - #sidebar-tabs container
 * - #sidebar-tabs button.ui-control.plain.icon[data-action="tab"] buttons
 * - sidebar content container
 * - SWSE sidebar mutation code execution
 *
 * Phases:
 * - init / setup / ready
 * - first sidebar render
 * - post-hardening
 * - post-fallback
 * - timed snapshots
 *
 * Output: [SIDEBAR TRACE] prefix in console
 */

const TRACE_START = performance.now();
const TRACE_LOG = [];
const TRACE_ENABLED = false; // Set to false to disable sidebar trace logging

function traceLog(phase, message, data = null) {
  if (!TRACE_ENABLED) return;

  const elapsed = (performance.now() - TRACE_START).toFixed(0);
  const prefix = `[SIDEBAR TRACE ${elapsed}ms]`;
  const entry = { phase, elapsed, message, data };
  TRACE_LOG.push(entry);

  if (data) {
    console.log(`${prefix} [${phase}] ${message}`, data);
  } else {
    console.log(`${prefix} [${phase}] ${message}`);
  }
}

/**
 * Take a snapshot of sidebar state at current moment
 */
function snapshotSidebarState(label) {
  const snapshot = {
    label,
    timestamp: performance.now() - TRACE_START,
    sidebarTabsExists: !!document.querySelector('#sidebar-tabs'),
    sidebarTabsHTML: document.querySelector('#sidebar-tabs')?.outerHTML.substring(0, 200),
    tabCount: 0,
    tabs: []
  };

  const tabButtons = document.querySelectorAll('#sidebar-tabs button.ui-control.plain.icon[data-action="tab"]');
  snapshot.tabCount = tabButtons.length;

  tabButtons.forEach((btn, idx) => {
    const tabSnapshot = {
      index: idx,
      dataTab: btn.getAttribute('data-tab'),
      className: btn.className,
      dataset: Object.fromEntries(Object.entries(btn.dataset)),
      ariaLabel: btn.getAttribute('aria-label'),
      textContent: btn.textContent,
      outerHTML: btn.outerHTML.substring(0, 150),
      innerHTML: btn.innerHTML.substring(0, 150),
      hasChildren: btn.children.length,
      childCount: btn.children.length,
      computedDisplay: window.getComputedStyle(btn).display,
      computedVisibility: window.getComputedStyle(btn).visibility,
      computedOpacity: window.getComputedStyle(btn).opacity,
      beforeContent: window.getComputedStyle(btn, '::before').content,
      beforeFontFamily: window.getComputedStyle(btn, '::before').fontFamily,
      afterContent: window.getComputedStyle(btn, '::after').content
    };
    snapshot.tabs.push(tabSnapshot);
  });

  return snapshot;
}

/**
 * Annotate when SWSE code is about to run
 */
function annotateEvent(event, message) {
  traceLog('EVENT', `${event}: ${message}`);
}

export function initSidebarSentinelTrace() {
  console.log('[SWSE] Initializing sidebar-sentinel-trace...');
  traceLog('INIT', '=== SIDEBAR SENTINEL TRACE STARTED ===');

  // Track init phase
  Hooks.once('init', () => {
    traceLog('INIT', 'Init hook fired');
    const snap = snapshotSidebarState('INIT hook');
    traceLog('INIT', 'Sidebar state at init', snap);
  });

  // Track setup phase
  Hooks.once('setup', () => {
    traceLog('SETUP', 'Setup hook fired');
    const snap = snapshotSidebarState('SETUP hook');
    traceLog('SETUP', 'Sidebar state at setup', snap);
  });

  // Track ready phase entry
  Hooks.once('ready', () => {
    traceLog('READY', 'Ready hook fired (immediate)');
    const snap = snapshotSidebarState('READY hook entry');
    traceLog('READY', 'Sidebar state at ready entry', snap);

    // Before hardening runs (immediate)
    setTimeout(() => {
      traceLog('READY', 'Before hardening/fallback execution');
      const snap = snapshotSidebarState('pre-hardening');
      traceLog('READY', 'Sidebar state pre-hardening', snap);

      // Check activeTab state
      const activeTab = ui?.sidebar?.activeTab;
      traceLog('READY', 'ui.sidebar.activeTab status', {
        isNull: activeTab === null,
        isUndefined: activeTab === undefined,
        value: activeTab
      });
    }, 50);

    // After hardening runs (100ms)
    setTimeout(() => {
      annotateEvent('READY+100ms', 'Hardening code should have run by now');
      const snap = snapshotSidebarState('post-hardening');
      traceLog('READY', 'Sidebar state post-hardening', snap);
    }, 100);

    // After fallback runs (600ms, since it runs at 500ms)
    setTimeout(() => {
      annotateEvent('READY+600ms', 'Fallback detection should have run');
      const snap = snapshotSidebarState('post-fallback');
      traceLog('READY', 'Sidebar state post-fallback', snap);

      // Check if fallback was activated
      const hasFallback = document.documentElement.classList.contains('swse-sidebar-icons-fallback');
      traceLog('READY', 'Fallback class status', { activated: hasFallback });
    }, 600);
  });

  // Timed snapshots post-ready
  setTimeout(() => {
    traceLog('READY', 'Ready +250ms snapshot');
    const snap = snapshotSidebarState('READY +250ms');
    traceLog('READY', 'State at +250ms', snap);
  }, 250);

  setTimeout(() => {
    traceLog('READY', 'Ready +500ms snapshot');
    const snap = snapshotSidebarState('READY +500ms');
    traceLog('READY', 'State at +500ms', snap);
  }, 500);

  setTimeout(() => {
    traceLog('READY', 'Ready +1000ms snapshot');
    const snap = snapshotSidebarState('READY +1000ms');
    traceLog('READY', 'State at +1000ms', snap);
  }, 1000);

  // Set up MutationObserver on sidebar-tabs only
  const sidebarTabs = document.querySelector('#sidebar-tabs');
  if (sidebarTabs) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          traceLog('MUTATION', 'childList change', {
            addedCount: mutation.addedNodes.length,
            removedCount: mutation.removedNodes.length
          });

          // Log details about removed nodes
          Array.from(mutation.removedNodes).forEach(node => {
            if (node.nodeType === 1) {
              traceLog('MUTATION', `REMOVED: ${node.tagName}`, {
                dataTab: node.getAttribute?.('data-tab'),
                outerHTML: node.outerHTML.substring(0, 100)
              });
            }
          });

          // Log details about added nodes
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1) {
              traceLog('MUTATION', `ADDED: ${node.tagName}`, {
                dataTab: node.getAttribute?.('data-tab'),
                className: node.className,
                innerHTML: node.innerHTML?.substring(0, 100)
              });
            }
          });
        }

        if (mutation.type === 'attributes' && mutation.target.tagName === 'BUTTON') {
          const btn = mutation.target;
          traceLog('MUTATION', `Attribute changed on button[data-tab="${btn.getAttribute('data-tab')}"]`, {
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: btn.getAttribute(mutation.attributeName)
          });
        }
      });
    });

    observer.observe(sidebarTabs, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: false
    });

    traceLog('INIT', 'MutationObserver active on #sidebar-tabs');
  } else {
    traceLog('INIT', '❌ ERROR: #sidebar-tabs not found, cannot set up MutationObserver');
  }

  // Export trace data to global for manual inspection
  globalThis.SWSE_SIDEBAR_TRACE = {
    getLog: () => TRACE_LOG,
    getSnapshot: () => snapshotSidebarState('manual'),
    printLog: () => {
      console.log('=== SIDEBAR SENTINEL TRACE LOG ===');
      TRACE_LOG.forEach(entry => {
        console.log(`[${entry.phase}@${entry.elapsed}ms] ${entry.message}`, entry.data || '');
      });
    }
  };

  traceLog('INIT', 'Sidebar Sentinel Trace ready. Use: SWSE_SIDEBAR_TRACE.printLog()');

  // Auto-run detailed trace at the end of ready phase (disabled when TRACE_ENABLED is false)
  if (TRACE_ENABLED) {
    Hooks.once('ready', () => {
      console.log('[SWSE] Ready hook fired - queueing sentinel trace execution at 1500ms');
      setTimeout(() => {
        console.log('\n========================================');
        console.log('AUTOMATIC SIDEBAR SENTINEL TRACE OUTPUT');
        console.log('========================================\n');
        if (globalThis.SWSE_SIDEBAR_TRACE) {
          globalThis.SWSE_SIDEBAR_TRACE.printLog();
        } else {
          console.error('[SWSE] ERROR: SWSE_SIDEBAR_TRACE not found!');
        }
      }, 1500); // Wait for all boot phases to complete
    });
  }
}
