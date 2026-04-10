/**
 * SIDEBAR ICON COMPARISON TOOL
 *
 * Direct comparison between a WORKING icon button and a BROKEN sidebar tab button.
 *
 * This bypasses speculation by showing the exact DOM/CSS differences.
 */

export function initSidebarIconComparison() {
  console.log('[SWSE] Initializing sidebar-icon-comparison...');
  globalThis.SWSE_ICON_COMPARE = {
    /**
     * Compare a working scene control button with a sidebar tab button
     */
    compare: () => {
      console.log('=== ICON BUTTON COMPARISON ===\n');

      // Get a working icon button from left scene controls
      const workingButton = document.querySelector('#controls .control-tool, #scene-controls button, [class*="scene-control"]');

      // Get a broken sidebar tab button
      const brokenButton = document.querySelector('#sidebar-tabs button.ui-control.plain.icon[data-tab="chat"]');

      if (!workingButton) {
        console.error('❌ Could not find working icon button in scene controls');
        return;
      }

      if (!brokenButton) {
        console.error('❌ Could not find sidebar tab button');
        return;
      }

      console.log('📊 COMPARISON RESULTS\n');

      // Compare structure
      console.log('--- ELEMENT STRUCTURE ---');
      console.log('Working button:', {
        tag: workingButton.tagName,
        id: workingButton.id,
        className: workingButton.className,
        innerHTML: workingButton.innerHTML.substring(0, 200),
        childCount: workingButton.children.length,
        children: Array.from(workingButton.children).map(c => c.tagName + '.' + c.className)
      });

      console.log('\nBroken button:', {
        tag: brokenButton.tagName,
        id: brokenButton.id,
        className: brokenButton.className,
        innerHTML: brokenButton.innerHTML.substring(0, 200),
        childCount: brokenButton.children.length,
        children: Array.from(brokenButton.children).map(c => c.tagName + '.' + c.className)
      });

      // Compare computed styles
      console.log('\n--- COMPUTED STYLES ---');
      const workingStyles = window.getComputedStyle(workingButton);
      const brokenStyles = window.getComputedStyle(brokenButton);

      console.log('Working button computed:', {
        display: workingStyles.display,
        visibility: workingStyles.visibility,
        opacity: workingStyles.opacity,
        fontSize: workingStyles.fontSize,
        fontFamily: workingStyles.fontFamily,
        color: workingStyles.color,
        backgroundColor: workingStyles.backgroundColor
      });

      console.log('\nBroken button computed:', {
        display: brokenStyles.display,
        visibility: brokenStyles.visibility,
        opacity: brokenStyles.opacity,
        fontSize: brokenStyles.fontSize,
        fontFamily: brokenStyles.fontFamily,
        color: brokenStyles.color,
        backgroundColor: brokenStyles.backgroundColor
      });

      // Compare pseudo-element content
      console.log('\n--- PSEUDO-ELEMENT CONTENT ---');
      const workingBefore = window.getComputedStyle(workingButton, '::before');
      const workingAfter = window.getComputedStyle(workingButton, '::after');
      const brokenBefore = window.getComputedStyle(brokenButton, '::before');
      const brokenAfter = window.getComputedStyle(brokenButton, '::after');

      console.log('Working button ::before:', {
        content: workingBefore.content,
        fontFamily: workingBefore.fontFamily,
        fontSize: workingBefore.fontSize,
        color: workingBefore.color,
        display: workingBefore.display
      });

      console.log('\nWorking button ::after:', {
        content: workingAfter.content,
        fontFamily: workingAfter.fontFamily
      });

      console.log('\nBroken button ::before:', {
        content: brokenBefore.content,
        fontFamily: brokenBefore.fontFamily,
        fontSize: brokenBefore.fontSize,
        color: brokenBefore.color,
        display: brokenBefore.display
      });

      console.log('\nBroken button ::after:', {
        content: brokenAfter.content,
        fontFamily: brokenAfter.fontFamily
      });

      // Compare data attributes
      console.log('\n--- DATA ATTRIBUTES ---');
      console.log('Working button dataset:', Object.fromEntries(Object.entries(workingButton.dataset)));
      console.log('Broken button dataset:', Object.fromEntries(Object.entries(brokenButton.dataset)));

      // ARIA and accessibility
      console.log('\n--- ACCESSIBILITY ATTRIBUTES ---');
      console.log('Working button:', {
        title: workingButton.title,
        ariaLabel: workingButton.getAttribute('aria-label'),
        role: workingButton.getAttribute('role'),
        ariaPressed: workingButton.getAttribute('aria-pressed')
      });

      console.log('\nBroken button:', {
        title: brokenButton.title,
        ariaLabel: brokenButton.getAttribute('aria-label'),
        role: brokenButton.getAttribute('role'),
        ariaPressed: brokenButton.getAttribute('aria-pressed')
      });

      // HTML comparison
      console.log('\n--- FULL OUTERHTML ---');
      console.log('Working button HTML:', workingButton.outerHTML);
      console.log('\nBroken button HTML:', brokenButton.outerHTML);

      // Summary
      console.log('\n--- KEY DIFFERENCES ---');
      const diffs = [];

      if (workingButton.innerHTML && !brokenButton.innerHTML) {
        diffs.push('❌ Broken button has empty innerHTML (Working has content)');
      }

      if (workingButton.children.length !== brokenButton.children.length) {
        diffs.push(`❌ Child count differs: Working=${workingButton.children.length}, Broken=${brokenButton.children.length}`);
      }

      if (workingBefore.content !== 'none' && brokenBefore.content === 'none') {
        diffs.push('❌ Working button has ::before pseudo-element content, broken does not');
      }

      if (workingBefore.fontFamily.includes('Font Awesome') && !brokenBefore.fontFamily.includes('Font Awesome')) {
        diffs.push('❌ Working button ::before uses Font Awesome, broken does not');
      }

      if (!workingButton.className.includes('icon') && brokenButton.className.includes('icon')) {
        diffs.push('⚠️ Broken button has "icon" class but working doesn\'t');
      }

      if (diffs.length === 0) {
        diffs.push('✓ No obvious differences - issue may be deeper (CSS rule, event listener, or dynamic mutation)');
      }

      diffs.forEach(diff => console.log(diff));

      return {
        working: workingButton,
        broken: brokenButton,
        diffs
      };
    },

    /**
     * Inspect what's inside a sidebar tab button
     */
    inspectSidebarButton: (dataTab = 'chat') => {
      const btn = document.querySelector(`#sidebar-tabs button[data-tab="${dataTab}"]`);
      if (!btn) {
        console.error(`Button with data-tab="${dataTab}" not found`);
        return;
      }

      console.log(`\n=== INSPECTING: sidebar-tabs button[data-tab="${dataTab}"] ===\n`);

      console.log('Element:', btn);
      console.log('outerHTML:', btn.outerHTML);
      console.log('innerHTML:', btn.innerHTML);
      console.log('textContent:', btn.textContent);
      console.log('className:', btn.className);
      console.log('children:', Array.from(btn.children).map((c, i) => ({
        index: i,
        tag: c.tagName,
        className: c.className,
        innerHTML: c.innerHTML
      })));

      console.log('\nComputed styles:', {
        display: window.getComputedStyle(btn).display,
        visibility: window.getComputedStyle(btn).visibility,
        opacity: window.getComputedStyle(btn).opacity
      });

      console.log('\n::before content:', window.getComputedStyle(btn, '::before').content);
      console.log('::before fontFamily:', window.getComputedStyle(btn, '::before').fontFamily);
      console.log('::after content:', window.getComputedStyle(btn, '::after').content);

      return btn;
    },

    /**
     * Find icon patterns in the app
     */
    scanForIcons: () => {
      console.log('\n=== SCANNING FOR ICON BUTTONS ===\n');

      // Find all elements with class containing "icon" or "fa-"
      const iconButtons = document.querySelectorAll('[class*="icon"], [class*="fa-"], [class*="fas"], [class*="far"]');

      console.log(`Found ${iconButtons.length} elements with icon-like classes\n`);

      // Group by location
      const locations = {
        sidebar: [],
        sceneControls: [],
        hotbar: [],
        other: []
      };

      iconButtons.forEach(el => {
        if (el.closest('#sidebar-tabs') || el.closest('#sidebar')) {
          locations.sidebar.push(el);
        } else if (el.closest('#controls') || el.closest('[id*="control"]')) {
          locations.sceneControls.push(el);
        } else if (el.closest('#hotbar')) {
          locations.hotbar.push(el);
        } else {
          locations.other.push(el);
        }
      });

      console.log(`Sidebar icons: ${locations.sidebar.length}`);
      console.log(`Scene control icons: ${locations.sceneControls.length}`);
      console.log(`Hotbar icons: ${locations.hotbar.length}`);
      console.log(`Other icons: ${locations.other.length}`);

      // Show a sample from each
      console.log('\n--- SIDEBAR ICONS SAMPLE ---');
      locations.sidebar.slice(0, 3).forEach(el => {
        console.log({
          tag: el.tagName,
          class: el.className,
          innerHTML: el.innerHTML.substring(0, 80),
          visible: el.offsetParent !== null
        });
      });

      console.log('\n--- SCENE CONTROL ICONS SAMPLE ---');
      locations.sceneControls.slice(0, 3).forEach(el => {
        console.log({
          tag: el.tagName,
          class: el.className,
          innerHTML: el.innerHTML.substring(0, 80),
          visible: el.offsetParent !== null
        });
      });

      return locations;
    }
  };

  console.log('[SWSE] Icon comparison tools available:');
  console.log('  SWSE_ICON_COMPARE.compare() - Compare working vs broken buttons');
  console.log('  SWSE_ICON_COMPARE.inspectSidebarButton(tab) - Inspect specific sidebar button');
  console.log('  SWSE_ICON_COMPARE.scanForIcons() - Find all icons in the app');
}
