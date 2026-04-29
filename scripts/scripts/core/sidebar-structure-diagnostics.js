/**
 * Sidebar structure diagnostics
 * Focused logging for Foundry v13 right sidebar content/panel visibility.
 */

const TRACE_FLAG = 'SWSE_DEBUG_SIDEBAR_STRUCTURE';

function enabled() {
  return globalThis[TRACE_FLAG] !== false;
}

function panelSnapshot(panel) {
  if (!panel) return null;
  const style = getComputedStyle(panel);
  const rect = panel.getBoundingClientRect();
  return {
    id: panel.id || null,
    tag: panel.tagName,
    className: panel.className,
    dataset: { ...panel.dataset },
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    position: style.position,
    overflow: style.overflow,
    width: rect.width,
    height: rect.height,
    childCount: panel.children?.length ?? 0,
    textPreview: (panel.textContent || '').trim().slice(0, 80)
  };
}

function dumpSidebarStructure(label = 'manual') {
  const sidebar = document.querySelector('#sidebar');
  const sidebarContent = document.querySelector('#sidebar-content');
  const sidebarTabs = document.querySelector('#sidebar-tabs');
  const tabButtons = Array.from(document.querySelectorAll('#sidebar-tabs button[data-action="tab"]'));
  const panels = Array.from(document.querySelectorAll('#sidebar .tab, #sidebar-content .tab, #sidebar [data-tab]'));

  console.group(`[SWSE SIDEBAR STRUCTURE] ${label}`);
  console.log('ui.sidebar:', {
    exists: !!ui?.sidebar,
    activeTab: ui?.sidebar?.activeTab,
    tabsType: ui?.sidebar?.tabs ? typeof ui.sidebar.tabs : 'none',
    tabsKeys: ui?.sidebar?.tabs && typeof ui.sidebar.tabs === 'object' ? Object.keys(ui.sidebar.tabs) : []
  });
  console.log('sidebar:', panelSnapshot(sidebar));
  console.log('sidebarTabs:', panelSnapshot(sidebarTabs));
  console.log('sidebarContent:', panelSnapshot(sidebarContent));
  console.log('tabButtons:', tabButtons.map(btn => ({
    tab: btn.dataset.tab,
    className: btn.className,
    ariaLabel: btn.getAttribute('aria-label'),
    innerHTML: btn.innerHTML,
    display: getComputedStyle(btn).display,
    visibility: getComputedStyle(btn).visibility
  })));
  console.log('sidebarPanels:', panels.map(panelSnapshot));

  const hiddenPanels = panels.filter(p => getComputedStyle(p).display === 'none');
  if (hiddenPanels.length) {
    console.warn('Hidden sidebar panels detected:', hiddenPanels.map(panelSnapshot));
    const likelyGenericTabHide = hiddenPanels.some(p => p.matches?.('.tab:not(.swse-tab)'));
    if (likelyGenericTabHide) {
      console.warn('Likely culprit: a generic .tab rule is hiding Foundry sidebar panels.');
    }
  }
  console.groupEnd();
}

export function initSidebarStructureDiagnostics() {
  if (!enabled()) return;
  console.log('[SWSE] Initializing sidebar-structure-diagnostics...');

  globalThis.SWSE_SIDEBAR_STRUCTURE = {
    dump: dumpSidebarStructure
  };

  const schedule = (label, delay = 0) => setTimeout(() => dumpSidebarStructure(label), delay);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => schedule('DOMContentLoaded', 0), { once: true });
  } else {
    schedule('NOW', 0);
  }

  Hooks.once('ready', () => {
    schedule('ready+50ms', 50);
    schedule('ready+250ms', 250);
    schedule('ready+1000ms', 1000);
  });

  Hooks.on('renderSidebar', () => schedule('renderSidebar', 0));
  Hooks.on('sidebarCollapse', collapsed => schedule(`sidebarCollapse:${collapsed}`, 0));

  const sidebarContent = document.querySelector('#sidebar-content') || document.querySelector('#sidebar');
  if (sidebarContent) {
    const observer = new MutationObserver(mutations => {
      const significant = mutations.some(m => m.type === 'attributes' || m.addedNodes.length || m.removedNodes.length);
      if (significant) schedule('MutationObserver', 0);
    });
    observer.observe(sidebarContent, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    });
  }
}
