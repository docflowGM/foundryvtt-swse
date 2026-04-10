/**
 * TEMPORARY SIDEBAR ICON INSTRUMENTATION
 *
 * Purpose: Determine whether sidebar icons are:
 * 1. Removed from DOM
 * 2. Hidden via CSS/class changes
 * 3. Replaced by later JS mutation
 * 4. Never inserted in the first place
 *
 * Console prefix: [SWSE Sidebar Debug]
 *
 * This file is TEMPORARY and should be removed after diagnosis.
 */

// Track instrumentation start time
const DEBUG_START_TIME = performance.now();

function debugLog(message, data = null) {
  const elapsed = (performance.now() - DEBUG_START_TIME).toFixed(0);
  const prefix = `[SWSE Sidebar Debug ${elapsed}ms]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Snapshot sidebar tab button state
 */
function snapshotTabButtons() {
  const buttons = document.querySelectorAll('#sidebar-tabs button.ui-control.plain.icon');
  const snapshots = [];

  buttons.forEach((btn, idx) => {
    const dataTab = btn.getAttribute('data-tab');
    snapshots.push({
      index: idx,
      dataTab,
      outerHTML: btn.outerHTML.substring(0, 200), // First 200 chars
      innerHTML: btn.innerHTML,
      textContent: btn.textContent,
      childCount: btn.children.length,
      computedDisplay: window.getComputedStyle(btn).display,
      computedVisibility: window.getComputedStyle(btn).visibility,
      computedOpacity: window.getComputedStyle(btn).opacity,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
      // Check for pseudo-element content
      beforeContent: window.getComputedStyle(btn, '::before').content,
      afterContent: window.getComputedStyle(btn, '::after').content
    });
  });

  return snapshots;
}

/**
 * Log sidebar tab button state
 */
function logTabButtonState(phase) {
  const snapshots = snapshotTabButtons();
  debugLog(`${phase} - Found ${snapshots.length} tab buttons`);

  snapshots.forEach((snap) => {
    if (!snap.innerHTML) {
      debugLog(`  ⚠️ EMPTY CONTENT: data-tab="${snap.dataTab}" has no innerHTML`, {
        childCount: snap.childCount,
        textContent: snap.textContent,
        beforeContent: snap.beforeContent,
        afterContent: snap.afterContent
      });
    } else {
      debugLog(`  ✓ data-tab="${snap.dataTab}" has content (${snap.innerHTML.length} chars)`, {
        innerHTML: snap.innerHTML.substring(0, 100)
      });
    }
  });
}

/**
 * Set up MutationObserver on sidebar tabs
 */
function setupSidebarMutationObserver() {
  const sidebarTabs = document.querySelector('#sidebar-tabs');
  if (!sidebarTabs) {
    debugLog('❌ ERROR: #sidebar-tabs not found');
    return;
  }

  debugLog('✓ Setting up MutationObserver on #sidebar-tabs');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        debugLog('  → childList change detected', {
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length
        });

        // Log details about removed nodes
        if (mutation.removedNodes.length > 0) {
          Array.from(mutation.removedNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
              debugLog(`    ❌ REMOVED: ${node.tagName}`, {
                dataTab: node.getAttribute?.('data-tab'),
                outerHTML: node.outerHTML.substring(0, 100)
              });
            }
          });
        }

        // Log details about added nodes
        if (mutation.addedNodes.length > 0) {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
              debugLog(`    ✓ ADDED: ${node.tagName}`, {
                dataTab: node.getAttribute?.('data-tab'),
                innerHTML: node.innerHTML?.substring(0, 100)
              });
            }
          });
        }
      }

      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.tagName === 'BUTTON' && target.classList.contains('ui-control')) {
          const oldValue = mutation.oldValue;
          const newValue = target.getAttribute(mutation.attributeName);
          debugLog(`  → Attribute change: ${mutation.attributeName}`, {
            dataTab: target.getAttribute('data-tab'),
            oldValue,
            newValue
          });
        }
      }

      if (mutation.type === 'characterData') {
        debugLog(`  → Text content change`, {
          nodeValue: mutation.target.nodeValue.substring(0, 50)
        });
      }
    });
  });

  observer.observe(sidebarTabs, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true
  });

  debugLog('✓ MutationObserver active');

  return observer;
}

/**
 * Hook into Foundry lifecycle
 */
export function initSidebarInstrumentation() {
  debugLog('=== SIDEBAR INSTRUMENTATION STARTING ===');

  // Init phase
  Hooks.once('init', () => {
    debugLog('📌 INIT HOOK FIRED');
  });

  // Setup phase
  Hooks.once('setup', () => {
    debugLog('📌 SETUP HOOK FIRED');
    logTabButtonState('SETUP');
  });

  // Ready phase
  Hooks.once('ready', () => {
    debugLog('📌 READY HOOK FIRED');
    logTabButtonState('READY (immediate)');

    // Set up mutation observer now that DOM is stable
    setupSidebarMutationObserver();

    // Check again after ready completes
    setTimeout(() => {
      logTabButtonState('READY +100ms');
    }, 100);
  });

  // Timed snapshots
  setTimeout(() => logTabButtonState('STARTUP +250ms'), 250);
  setTimeout(() => logTabButtonState('STARTUP +500ms'), 500);
  setTimeout(() => logTabButtonState('STARTUP +1000ms'), 1000);
  setTimeout(() => logTabButtonState('STARTUP +2000ms'), 2000);

  // Instrument the ready hook error
  Hooks.once('ready', () => {
    try {
      debugLog('🔍 Checking sentinelSheetGuardrails setting...');
      const setting = game.settings.get('foundryvtt-swse', 'sentinelSheetGuardrails');
      debugLog('✓ sentinelSheetGuardrails setting found', { value: setting });
    } catch (err) {
      debugLog('❌ ERROR reading sentinelSheetGuardrails', {
        message: err.message,
        timeElapsed: (performance.now() - DEBUG_START_TIME).toFixed(0)
      });
    }
  });

  // Monitor sidebar visibility changes
  Hooks.on('sidebarCollapse', (collapsed) => {
    debugLog(`📌 SIDEBAR COLLAPSE: ${collapsed}`);
    logTabButtonState(`AFTER_SIDEBAR_COLLAPSE (${collapsed})`);
  });
}

/**
 * Export snapshot function for manual console inspection
 */
globalThis.SWSE_DEBUG = {
  snapshotTabs: () => {
    console.log('=== Tab Button Snapshot ===');
    logTabButtonState('MANUAL_SNAPSHOT');
  },
  checkTabContent: () => {
    const buttons = document.querySelectorAll('#sidebar-tabs button.ui-control.plain.icon');
    console.log(`Total buttons: ${buttons.length}`);
    buttons.forEach(btn => {
      console.log(`[${btn.getAttribute('data-tab')}]`, {
        hasChildren: btn.children.length > 0,
        innerHTML: btn.innerHTML.substring(0, 50),
        computedDisplay: window.getComputedStyle(btn).display,
        beforeContent: window.getComputedStyle(btn, '::before').content
      });
    });
  }
};

debugLog('✓ Instrumentation module loaded');
debugLog('Use: SWSE_DEBUG.snapshotTabs() or SWSE_DEBUG.checkTabContent() in console');
