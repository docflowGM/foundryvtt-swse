/**
 * SIDEBAR ICON FALLBACK & RESTORATION
 *
 * PHASE 1: Applies Font Awesome icon classes to sidebar tab buttons
 * Foundry v13 sidebar tabs don't receive FA icon classes from core,
 * so we must apply them: fa-solid + icon class per tab type
 *
 * PHASE 2: If Font Awesome still fails to load, applies CSS fallback
 * that uses PNG/SVG icons from assets/icons/
 */

// Icon mapping: data-tab value → Font Awesome icon class
const SIDEBAR_ICON_MAP = {
  'chat': 'fa-comments',
  'combat': 'fa-swords',
  'scenes': 'fa-cubes',
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

export function initSidebarIconFallback() {
  // PHASE 1: Restore missing Font Awesome icon classes to sidebar tabs
  applyMissingIconClasses();

  // PHASE 2: Detect if Font Awesome rendering fails despite classes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectIconFailure);
  } else {
    detectIconFailure();
  }
}

/**
 * Apply Font Awesome icon classes to sidebar tab buttons
 * Foundry v13 creates buttons with class="ui-control plain icon"
 * but doesn't add the fa-solid + icon classes, so we add them.
 */
function applyMissingIconClasses() {
  const sidebarTabs = document.querySelector('#sidebar-tabs');
  if (!sidebarTabs) {
    console.warn('SWSE | Sidebar tabs not found, skipping icon class restoration');
    return;
  }

  // Find all sidebar tab buttons: button.ui-control.plain.icon[data-action="tab"]
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

    // Check if button already has fa-solid class
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
  // Check sidebar tabs after a brief delay to ensure they're rendered
  setTimeout(() => {
    const sidebarTabs = document.querySelector('#sidebar-tabs');
    if (!sidebarTabs) {
      console.warn('SWSE | Sidebar tabs not found, skipping icon fallback detection');
      return;
    }

    // Get all control icons in sidebar (Foundry v13: button.ui-control.plain.icon)
    // UPDATED for v13: was looking for .control-icon (pre-v13 selector)
    const controlIcons = sidebarTabs.querySelectorAll('button.ui-control.plain.icon[data-action="tab"]');

    if (controlIcons.length === 0) {
      console.warn('SWSE | No control icons found in sidebar');
      return;
    }

    // Check if Font Awesome is loaded by looking for computed styles
    let fontAwesomeFailed = false;

    for (const icon of controlIcons) {
      const computedStyle = window.getComputedStyle(icon, '::before');
      const fontFamily = computedStyle.fontFamily || '';
      const content = computedStyle.content || '';

      // Font Awesome icons should have a font-family containing "Font Awesome"
      // and content should be a character code
      if (!fontFamily.includes('Font Awesome') && !fontFamily.includes('FontAwesome')) {
        // Also check if the icon has a visible error indicator
        const isEmpty = content === 'none' || content === '""' || content === '';

        if (isEmpty) {
          fontAwesomeFailed = true;
          console.warn('SWSE | Font Awesome not loaded, activating icon fallback');
          break;
        }
      }
    }

    // Apply fallback class if Font Awesome failed
    if (fontAwesomeFailed) {
      document.documentElement.classList.add('swse-sidebar-icons-fallback');
      console.log('SWSE | Sidebar icon fallback activated');
    } else {
      document.documentElement.classList.remove('swse-sidebar-icons-fallback');
    }

  }, 500); // Wait for icons to render
}

// Re-check on sidebar visibility changes
Hooks.on('sidebarCollapse', () => {
  setTimeout(detectIconFailure, 100);
});
