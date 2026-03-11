/**
 * SIDEBAR ICON FALLBACK DETECTION
 *
 * Detects if Font Awesome icons fail to load on sidebar tabs.
 * If Font Awesome fails, applies .swse-sidebar-icons-fallback class to document.
 * This triggers CSS fallback rules that use PNG/SVG icons from assets/icons/
 */

export function initSidebarIconFallback() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectIconFailure);
  } else {
    detectIconFailure();
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

    // Get all control icons in sidebar
    const controlIcons = sidebarTabs.querySelectorAll('.control-icon');

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
