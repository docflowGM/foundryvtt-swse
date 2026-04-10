/**
 * SIDEBAR ICON CLASS AUDIT
 *
 * Find where sidebar tab icon classes (fa-solid, fa-icons, etc.) should be set,
 * and where they're being lost or not applied.
 *
 * The problem: sidebar buttons are missing Font Awesome classes that working buttons have.
 * Working: button.control.ui-control.layer.icon.fa-solid.fa-cubes
 * Broken: button.ui-control.plain.icon.active
 *
 * Goal: Find where fa-solid/fa-[icon] classes should come from.
 */

export function initSidebarIconClassAudit() {
  console.log('[SWSE] Initializing sidebar-icon-class-audit...');

  globalThis.SWSE_CLASS_AUDIT = {
    /**
     * Compare the class lists of working vs broken buttons
     */
    compareClasses: () => {
      console.log('=== SIDEBAR ICON CLASS AUDIT ===\n');

      // Working button (scene control)
      const workingBtn = document.querySelector('#controls .control-tool, [class*="fa-solid"]');
      const brokenBtn = document.querySelector('#sidebar-tabs button[data-tab="scenes"]');

      if (!workingBtn) {
        console.error('❌ Could not find working button');
        return;
      }

      if (!brokenBtn) {
        console.error('❌ Could not find sidebar button');
        return;
      }

      // Parse class lists
      const workingClasses = workingBtn.className.split(/\s+/).filter(Boolean);
      const brokenClasses = brokenBtn.className.split(/\s+/).filter(Boolean);

      // Find Font Awesome related classes
      const workingFAClasses = workingClasses.filter(c => c.startsWith('fa-'));
      const brokenFAClasses = brokenClasses.filter(c => c.startsWith('fa-'));

      console.log('Working button classes:');
      console.log('  All:', workingClasses.join(', '));
      console.log('  Font Awesome:', workingFAClasses.length > 0 ? workingFAClasses.join(', ') : '(none)');

      console.log('\nBroken sidebar button classes:');
      console.log('  All:', brokenClasses.join(', '));
      console.log('  Font Awesome:', brokenFAClasses.length > 0 ? brokenFAClasses.join(', ') : '(none)');

      // Missing classes
      const missingClasses = workingFAClasses.filter(c => !brokenClasses.includes(c));

      console.log('\n--- MISSING CLASSES ---');
      if (missingClasses.length === 0) {
        console.log('(no obvious FA classes missing)');
      } else {
        missingClasses.forEach(c => {
          console.log(`  ❌ Missing: ${c}`);
        });
      }

      // Data attributes that might drive icons
      console.log('\n--- DATA ATTRIBUTES (might define icon) ---');
      console.log('Working button data:', Object.fromEntries(Object.entries(workingBtn.dataset)));
      console.log('Broken button data:', Object.fromEntries(Object.entries(brokenBtn.dataset)));

      return {
        working: { classes: workingClasses, faClasses: workingFAClasses },
        broken: { classes: brokenClasses, faClasses: brokenFAClasses },
        missing: missingClasses
      };
    },

    /**
     * Trace when sidebar button classes change
     */
    monitorClassChanges: () => {
      console.log('\n=== MONITORING SIDEBAR BUTTON CLASSES ===\n');

      // Take initial snapshot
      const buttons = document.querySelectorAll('#sidebar-tabs button[data-action="tab"]');
      const initialSnapshot = {};

      buttons.forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        initialSnapshot[tab] = {
          classes: btn.className,
          hasFA: /fa-\w+/.test(btn.className)
        };
      });

      console.log('Initial class state:', initialSnapshot);

      // Watch for mutations on each button
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const btn = mutation.target;
            const tab = btn.getAttribute('data-tab');
            const oldValue = mutation.oldValue;
            const newValue = btn.className;

            // Check if FA classes were added or removed
            const hadFA = /fa-\w+/.test(oldValue || '');
            const hasFA = /fa-\w+/.test(newValue);

            if (hadFA && !hasFA) {
              console.warn(`❌ FA CLASSES REMOVED from button[data-tab="${tab}"]`);
              console.log(`   Before: ${oldValue}`);
              console.log(`   After: ${newValue}`);
            } else if (!hadFA && hasFA) {
              console.log(`✓ FA CLASSES ADDED to button[data-tab="${tab}"]`);
              console.log(`   Before: ${oldValue}`);
              console.log(`   After: ${newValue}`);
            }
          }
        });
      });

      buttons.forEach(btn => {
        observer.observe(btn, {
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['class']
        });
      });

      console.log('✓ Monitoring class changes on all sidebar buttons');
      return observer;
    },

    /**
     * Check if Foundry is supposed to apply icon classes dynamically
     */
    inspectFoundryIconContract: () => {
      console.log('\n=== FOUNDRY ICON CONTRACT INSPECTION ===\n');

      // Check the sidebar object
      if (!ui?.sidebar) {
        console.error('❌ ui.sidebar not available');
        return;
      }

      console.log('ui.sidebar object:', {
        exists: !!ui.sidebar,
        tabs: ui.sidebar.tabs ? Object.keys(ui.sidebar.tabs) : 'none',
        activeTab: ui.sidebar.activeTab
      });

      // Check if there's icon metadata in the tabs
      if (ui.sidebar.tabs) {
        console.log('\nIcon metadata in ui.sidebar.tabs:');
        Object.entries(ui.sidebar.tabs).forEach(([tabName, tabObj]) => {
          console.log(`  ${tabName}:`, {
            icon: tabObj.icon,
            label: tabObj.label,
            class: tabObj.class,
            title: tabObj.title
          });
        });
      }

      // Check actual rendered buttons
      console.log('\nActual rendered tab buttons:');
      document.querySelectorAll('#sidebar-tabs button[data-action="tab"]').forEach(btn => {
        console.log(`  [${btn.getAttribute('data-tab')}]:`, {
          className: btn.className,
          innerHTML: btn.innerHTML.substring(0, 100),
          title: btn.title,
          ariaLabel: btn.getAttribute('aria-label')
        });
      });

      return ui.sidebar;
    },

    /**
     * Check if any SWSE code is mutating button classes after render
     */
    findSWSEMutations: () => {
      console.log('\n=== SEARCHING FOR CLASS MUTATIONS ===\n');

      // Search for SWSE code that touches classList or className
      const suspiciousPaths = [
        'hardening-init.js',
        'sidebar-icon-fallback.js',
        'init.js'
      ];

      console.log('Suspicious SWSE files that might mutate sidebar:');
      suspiciousPaths.forEach(path => {
        console.log(`  - ${path}`);
      });

      console.log('\nLook for code patterns:');
      console.log('  button.className = ...');
      console.log('  button.classList.add(...)');
      console.log('  button.classList.remove(...)');
      console.log('  button.innerHTML = ...');
      console.log('  #sidebar-tabs.innerHTML = ...');

      return {
        filesToAudit: suspiciousPaths,
        searchPatterns: ['className', 'classList', 'innerHTML', 'replaceWith', 'insertBefore', 'appendChild']
      };
    },

    /**
     * Snapshot button classes before and after key boot phases
     */
    snapshotClassesThroughBoot: () => {
      console.log('\n=== SCHEDULING CLASS SNAPSHOTS ===\n');

      const snapshots = {};

      const takeSnapshot = (label) => {
        const snapshot = {};
        document.querySelectorAll('#sidebar-tabs button[data-action="tab"]').forEach(btn => {
          const tab = btn.getAttribute('data-tab');
          snapshot[tab] = {
            classes: btn.className,
            hasFA: /fa-\w+/.test(btn.className),
            innerHTML: btn.innerHTML.substring(0, 50)
          };
        });
        snapshots[label] = snapshot;
        console.log(`[${label}]`, snapshot);
        return snapshot;
      };

      // Take snapshots at key points
      if (document.readyState === 'loading') {
        console.log('Deferring snapshots until page loads...');
        document.addEventListener('DOMContentLoaded', () => {
          takeSnapshot('DOMContentLoaded');
        });
      } else {
        takeSnapshot('NOW');
      }

      // After setup
      Hooks.once('setup', () => {
        setTimeout(() => takeSnapshot('post-setup'), 50);
      });

      // After ready
      Hooks.once('ready', () => {
        setTimeout(() => takeSnapshot('post-ready'), 50);
        setTimeout(() => takeSnapshot('post-ready+100ms'), 100);
        setTimeout(() => takeSnapshot('post-ready+500ms'), 500);
        setTimeout(() => takeSnapshot('post-ready+1000ms'), 1000);
      });

      console.log('✓ Snapshots scheduled');
      return snapshots;
    }
  };

  console.log('[SWSE] SWSE_CLASS_AUDIT global assigned successfully');
  console.log('[SWSE] Icon class audit tools available:');
  console.log('  SWSE_CLASS_AUDIT.compareClasses() - Compare class lists');
  console.log('  SWSE_CLASS_AUDIT.monitorClassChanges() - Watch for class mutations');
  console.log('  SWSE_CLASS_AUDIT.inspectFoundryIconContract() - Check Foundry icon metadata');
  console.log('  SWSE_CLASS_AUDIT.findSWSEMutations() - Find suspect SWSE code');
  console.log('  SWSE_CLASS_AUDIT.snapshotClassesThroughBoot() - Track classes through boot phases');

  // Auto-run class comparison after ready completes
  Hooks.once('ready', () => {
    console.log('[SWSE] Ready hook fired - queueing class audit execution at 1200ms');
    setTimeout(() => {
      console.log('\n========================================');
      console.log('AUTOMATIC SIDEBAR ICON CLASS AUDIT');
      console.log('========================================\n');
      if (globalThis.SWSE_CLASS_AUDIT) {
        globalThis.SWSE_CLASS_AUDIT.compareClasses();
        console.log('\n--- ADDITIONAL AUDIT INFO ---\n');
        globalThis.SWSE_CLASS_AUDIT.inspectFoundryIconContract();
      } else {
        console.error('[SWSE] ERROR: SWSE_CLASS_AUDIT not found!');
      }
    }, 1200); // Run before trace output
  });

  // Monitor class changes in real-time
  Hooks.once('ready', () => {
    console.log('[SWSE] Ready hook fired - queueing class monitor execution at 100ms');
    setTimeout(() => {
      if (globalThis.SWSE_CLASS_AUDIT) {
        globalThis.SWSE_CLASS_AUDIT.monitorClassChanges();
      } else {
        console.error('[SWSE] ERROR: SWSE_CLASS_AUDIT not found during monitoring!');
      }
    }, 100);
  });
}
