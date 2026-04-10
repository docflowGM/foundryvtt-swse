/**
 * Character Sheet Resize/Scroll Diagnostics
 *
 * Captures runtime state of the character sheet's window frame, DOM layout,
 * and CSS metrics to identify where resize/scroll contracts break.
 *
 * Usage (from browser console):
 *   SWSE_SHEET_DIAG.inspectCharacterSheet()  // One-time snapshot
 *   SWSE_SHEET_DIAG.watchCharacterSheet()    // Attach observers and periodic snapshots
 *   SWSE_SHEET_DIAG.printLastReport()        // Print stored report
 */

class CharacterSheetDiagnostics {
  constructor() {
    this.lastReport = null;
    this.observers = {
      resizeObserver: null,
      mutationObserver: null
    };
    this.snapshots = [];
    this.maxSnapshots = 20;
  }

  /**
   * Find the character sheet app instance and its element
   */
  getSheetInstance() {
    // Try to find a SWSEV2CharacterSheet instance from open apps
    for (const app of Object.values(ui.windows || {})) {
      if (app.constructor.name === 'SWSEV2CharacterSheet') {
        return app;
      }
    }
    return null;
  }

  /**
   * Get effective runtime options from sheet instance
   */
  captureRuntimeOptions(app) {
    if (!app) return null;

    return {
      className: app.constructor.name,
      baseClass: app.constructor.__proto__?.name || 'unknown',
      fullChain: this.getClassChain(app),
      options: {
        id: app.id,
        title: app.title,
        resizable: app.options?.resizable,
        draggable: app.options?.draggable,
        frame: app.options?.frame,
        width: app.options?.width,
        height: app.options?.height,
        scrollY: app.options?.scrollY,
        classes: app.options?.classes,
        tag: app.options?.tag,
        position: {
          width: app.options?.position?.width,
          height: app.options?.position?.height,
          left: app.options?.position?.left,
          top: app.options?.position?.top
        },
        window: {
          resizable: app.options?.window?.resizable,
          draggable: app.options?.window?.draggable,
          frame: app.options?.window?.frame
        }
      },
      currentPosition: {
        left: app.position?.left,
        top: app.position?.top,
        width: app.position?.width,
        height: app.position?.height,
        right: app.position?.right,
        bottom: app.position?.bottom
      }
    };
  }

  /**
   * Walk the prototype chain to find all base classes
   */
  getClassChain(obj) {
    const chain = [];
    let proto = Object.getPrototypeOf(obj);
    let count = 0;
    while (proto && count < 10) {
      if (proto.constructor && proto.constructor.name && proto.constructor.name !== 'Object') {
        chain.push(proto.constructor.name);
      }
      proto = Object.getPrototypeOf(proto);
      count++;
    }
    return chain;
  }

  /**
   * Capture DOM structure and computed styles for all key elements
   */
  captureDOMLayout(app) {
    if (!app?.element) return null;

    const layout = {};

    // Define the element chain we want to inspect
    const selectors = {
      'app': app.element,
      'frame': app.element?.querySelector?.('.window-frame'),
      'windowContent': app.element?.querySelector?.('.window-content'),
      'wrapper': app.element?.querySelector?.('.swse-character-sheet-wrapper'),
      'form': app.element?.querySelector?.('.swse-character-sheet-form'),
      'sheetShell': app.element?.querySelector?.('.sheet-shell'),
      'sheetBody': app.element?.querySelector?.('.sheet-body'),
      'sheetTabs': app.element?.querySelector?.('.sheet-tabs'),
      'sheetContent': app.element?.querySelector?.('.sheet-content'),
      'activeTab': app.element?.querySelector?.('.sheet-content > .tab.active')
    };

    // For each element, capture its metrics
    for (const [name, el] of Object.entries(selectors)) {
      if (el) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        layout[name] = {
          present: true,
          tag: el.tagName,
          classes: el.className,
          id: el.id,
          boundingRect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            bottom: Math.round(rect.bottom),
            right: Math.round(rect.right)
          },
          scrollMetrics: {
            clientHeight: el.clientHeight,
            scrollHeight: el.scrollHeight,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            scrollTop: el.scrollTop,
            scrollLeft: el.scrollLeft,
            isOverflowing: el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
          },
          computed: {
            display: styles.display,
            position: styles.position,
            overflow: styles.overflow,
            overflowX: styles.overflowX,
            overflowY: styles.overflowY,
            height: styles.height,
            minHeight: styles.minHeight,
            maxHeight: styles.maxHeight,
            width: styles.width,
            minWidth: styles.minWidth,
            maxWidth: styles.maxWidth,
            flex: styles.flex,
            flexGrow: styles.flexGrow,
            flexShrink: styles.flexShrink,
            flexBasis: styles.flexBasis,
            pointerEvents: styles.pointerEvents,
            visibility: styles.visibility,
            zIndex: styles.zIndex
          }
        };
      } else {
        layout[name] = { present: false };
      }
    }

    return layout;
  }

  /**
   * Detect which element is the actual scroll region
   */
  detectScrollRegion(app) {
    if (!app?.element) return null;

    const scrollRegions = [];

    // Check all elements that might have overflow
    const allElements = app.element.querySelectorAll('*');
    for (const el of allElements) {
      const styles = window.getComputedStyle(el);
      const hasOverflow = styles.overflow === 'auto' || styles.overflow === 'scroll' ||
                         styles.overflowY === 'auto' || styles.overflowY === 'scroll';
      const isOverflowing = el.scrollHeight > el.clientHeight;

      if (hasOverflow || isOverflowing) {
        scrollRegions.push({
          element: el.tagName,
          classes: el.className,
          overflow: styles.overflow,
          overflowY: styles.overflowY,
          isOverflowing: isOverflowing,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          excess: el.scrollHeight - el.clientHeight
        });
      }
    }

    return scrollRegions;
  }

  /**
   * Detect resize affordances and frame structure
   */
  detectResizeAffordances(app) {
    if (!app?.element) return null;

    const frameEl = app.element.querySelector('.window-frame');
    const windowEl = app.element.querySelector('.window');

    return {
      hasFrameElement: !!frameEl,
      hasWindowElement: !!windowEl,
      frameClasses: frameEl?.className || 'none',
      windowClasses: windowEl?.className || 'none',
      frameHasResizeClass: frameEl?.classList?.contains('resizable') || false,
      windowHasResizeClass: windowEl?.classList?.contains('resizable') || false,
      appResizable: app.options?.resizable,
      appFrame: app.options?.frame,
      frameStyles: frameEl ? {
        cursor: window.getComputedStyle(frameEl).cursor,
        position: window.getComputedStyle(frameEl).position
      } : null
    };
  }

  /**
   * Create a single snapshot
   * @param {string} label - Label for this snapshot
   * @param {Application} app - Optional app instance (if not provided, will look up)
   */
  snapshot(label = '', app = null) {
    // If app not provided, try to look it up
    if (!app) {
      app = this.getSheetInstance();
    }
    if (!app) {
      console.warn('[SWSE SheetDiag] No character sheet instance found');
      return null;
    }

    const snap = {
      timestamp: Date.now(),
      label: label,
      runtimeOptions: this.captureRuntimeOptions(app),
      domLayout: this.captureDOMLayout(app),
      scrollRegions: this.detectScrollRegion(app),
      resizeAffordances: this.detectResizeAffordances(app)
    };

    this.snapshots.push(snap);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snap;
  }

  /**
   * One-time inspection of the character sheet
   */
  inspectCharacterSheet() {
    console.log('[SWSE SheetDiag] ═══ CHARACTER SHEET INSPECTION ═══');

    const app = this.getSheetInstance();
    if (!app) {
      console.error('[SWSE SheetDiag] No character sheet instance found');
      return;
    }

    const snapshot = this.snapshot('inspect');
    this.lastReport = snapshot;

    console.log('[SWSE SheetDiag] CLASS HIERARCHY');
    console.table({
      current: snapshot.runtimeOptions.className,
      baseClass: snapshot.runtimeOptions.baseClass,
      chain: snapshot.runtimeOptions.fullChain.join(' → ')
    });

    console.log('[SWSE SheetDiag] EFFECTIVE RUNTIME OPTIONS');
    console.table(snapshot.runtimeOptions.options);

    console.log('[SWSE SheetDiag] CURRENT POSITION');
    console.table(snapshot.runtimeOptions.currentPosition);

    console.log('[SWSE SheetDiag] DOM LAYOUT CHAIN');
    for (const [name, layout] of Object.entries(snapshot.domLayout)) {
      if (layout.present) {
        console.group(`[SWSE SheetDiag] ${name}`);
        console.log(`Tag: ${layout.tag} | Classes: ${layout.classes || '(none)'}`);
        console.table({
          'Bounding Rect': layout.boundingRect,
          'Scroll Metrics': layout.scrollMetrics,
          'Display/Position': {
            display: layout.computed.display,
            position: layout.computed.position,
            pointerEvents: layout.computed.pointerEvents
          },
          'Overflow': {
            overflow: layout.computed.overflow,
            overflowX: layout.computed.overflowX,
            overflowY: layout.computed.overflowY
          },
          'Dimensions': {
            height: layout.computed.height,
            minHeight: layout.computed.minHeight,
            maxHeight: layout.computed.maxHeight,
            width: layout.computed.width,
            minWidth: layout.computed.minWidth
          },
          'Flex': {
            flex: layout.computed.flex,
            flexGrow: layout.computed.flexGrow,
            flexShrink: layout.computed.flexShrink,
            flexBasis: layout.computed.flexBasis
          }
        });
        console.groupEnd();
      }
    }

    console.log('[SWSE SheetDiag] SCROLL REGIONS (elements with overflow)');
    if (snapshot.scrollRegions.length > 0) {
      console.table(snapshot.scrollRegions);
    } else {
      console.warn('[SWSE SheetDiag] ⚠️ NO SCROLL REGIONS DETECTED');
    }

    console.log('[SWSE SheetDiag] RESIZE AFFORDANCES');
    console.table(snapshot.resizeAffordances);

    console.log('[SWSE SheetDiag] ═══ END INSPECTION ═══');
  }

  /**
   * Attach observers and periodic snapshots to track runtime changes
   */
  watchCharacterSheet() {
    console.log('[SWSE SheetDiag] Starting observation...');

    const app = this.getSheetInstance();
    if (!app?.element) {
      console.error('[SWSE SheetDiag] Cannot watch: no sheet element');
      return;
    }

    // ResizeObserver: detect when window/elements change size
    this.observers.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log(`[SWSE SheetDiag] ResizeObserver: ${entry.target.className || entry.target.tagName}`, {
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height)
        });
      }
    });

    // Watch key elements
    this.observers.resizeObserver.observe(app.element);
    const windowContent = app.element.querySelector('.window-content');
    if (windowContent) this.observers.resizeObserver.observe(windowContent);
    const form = app.element.querySelector('.swse-character-sheet-form');
    if (form) this.observers.resizeObserver.observe(form);

    // MutationObserver: detect DOM/class changes
    this.observers.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          console.log(`[SWSE SheetDiag] ClassChange:`, mutation.target.className);
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          console.log(`[SWSE SheetDiag] StyleChange:`, mutation.target.getAttribute('style'));
        }
      }
    });

    this.observers.mutationObserver.observe(app.element, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true
    });

    // Periodic snapshots at key intervals
    const snapshots = [250, 500, 1000, 2000];
    for (const ms of snapshots) {
      setTimeout(() => {
        this.snapshot(`+${ms}ms after render`);
        console.log(`[SWSE SheetDiag] Snapshot at +${ms}ms taken`);
      }, ms);
    }

    console.log('[SWSE SheetDiag] ✓ Observation active (ResizeObserver + MutationObserver + periodic snapshots)');
  }

  /**
   * Print the last stored report
   */
  printLastReport() {
    if (!this.lastReport) {
      console.warn('[SWSE SheetDiag] No report stored. Run inspectCharacterSheet() first.');
      return;
    }

    console.log('[SWSE SheetDiag] ═══ LAST REPORT ═══');
    console.log(JSON.stringify(this.lastReport, null, 2));
    console.log('[SWSE SheetDiag] ═══ END REPORT ═══');
  }

  /**
   * Inspect the height chain of the character sheet
   * Logs computed styles and metrics for all key elements
   * @param {Application} app - Optional app instance (if not provided, will look up)
   */
  inspectHeightChain(app = null) {
    if (!app) {
      app = this.getSheetInstance();
    }
    if (!app?.element) {
      console.warn('[SWSE SheetDiag] No character sheet element found');
      return;
    }

    const getHeightMetrics = (selector, label) => {
      const el = app.element.querySelector(selector);
      if (!el) return null;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return {
        label,
        display: style.display,
        position: style.position,
        flex: style.flex,
        minHeight: style.minHeight,
        height: style.height,
        overflow: style.overflow,
        overflowY: style.overflowY,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        offsetHeight: el.offsetHeight,
        isOverflowing: el.scrollHeight > el.clientHeight,
        rect: {
          top: Math.round(rect.top),
          height: Math.round(rect.height)
        }
      };
    };

    console.log('[SWSE SheetDiag] ═══ HEIGHT CHAIN AUDIT ═══');
    console.table(getHeightMetrics('.window-content', '.window-content'));
    console.table(getHeightMetrics('.swse-character-sheet-form', 'form'));
    console.table(getHeightMetrics('.sheet-shell', '.sheet-shell'));
    console.table(getHeightMetrics('.sheet-body', '.sheet-body'));
    console.table(getHeightMetrics('.sheet-body > .tab.active', 'active tab'));
    console.table(getHeightMetrics('.sheet-body > .tab.active > div:first-child', 'tab inner wrapper'));
    console.log('[SWSE SheetDiag] ═══ END HEIGHT CHAIN ═══');
  }

  /**
   * List all elements with overflowing content
   * @param {Application} app - Optional app instance (if not provided, will look up)
   */
  listOverflowingElements(app = null) {
    if (!app) {
      app = this.getSheetInstance();
    }
    if (!app?.element) {
      console.warn('[SWSE SheetDiag] No character sheet element found');
      return;
    }

    const overflowing = [];
    const allElements = app.element.querySelectorAll('*');

    for (const el of allElements) {
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        const style = window.getComputedStyle(el);
        overflowing.push({
          selector: el.className || el.tagName,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowY: style.overflowY,
          overflow: style.overflow,
          canScroll: (style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                     style.overflow === 'auto' || style.overflow === 'scroll')
        });
      }
    }

    console.log('[SWSE SheetDiag] ═══ OVERFLOWING ELEMENTS ═══');
    console.table(overflowing);
    console.log(`[SWSE SheetDiag] Found ${overflowing.length} overflowing elements`);
  }

  /**
   * Inspect the actual runtime app state
   * @param {Application} app - Optional app instance (if not provided, will look up)
   */
  inspectAppState(app = null) {
    if (!app) {
      app = this.getSheetInstance();
    }
    if (!app) {
      console.warn('[SWSE SheetDiag] No character sheet instance found');
      return;
    }

    console.log('[SWSE SheetDiag] ═══ APP RUNTIME STATE ═══');
    console.log({
      className: app.constructor.name,
      parentClasses: Object.getPrototypeOf(Object.getPrototypeOf(app))?.constructor?.name,
      effectiveOptions: {
        width: app.options?.width,
        height: app.options?.height,
        resizable: app.options?.resizable,
        draggable: app.options?.draggable,
        frame: app.options?.frame,
        window: app.options?.window,
        position: app.options?.position
      },
      currentPosition: {
        width: app.position?.width,
        height: app.position?.height,
        left: app.position?.left,
        top: app.position?.top
      },
      elementState: {
        hasResizableClass: app.element?.classList?.contains('resizable'),
        appClasses: app.element?.className,
        appTag: app.element?.tagName
      }
    });
    console.log('[SWSE SheetDiag] ═══ END APP STATE ═══');
  }

  /**
   * Get all snapshots taken
   */
  getSnapshots() {
    return this.snapshots;
  }

  /**
   * Clear observers
   */
  stopWatching() {
    if (this.observers.resizeObserver) {
      this.observers.resizeObserver.disconnect();
      console.log('[SWSE SheetDiag] ResizeObserver stopped');
    }
    if (this.observers.mutationObserver) {
      this.observers.mutationObserver.disconnect();
      console.log('[SWSE SheetDiag] MutationObserver stopped');
    }
  }
}

// Export and expose globally
export const characterSheetDiagnostics = new CharacterSheetDiagnostics();

// Make available globally in browser console
if (typeof window !== 'undefined') {
  window.SWSE_SHEET_DIAG = characterSheetDiagnostics;
}
