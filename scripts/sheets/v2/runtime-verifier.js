/**
 * CHARACTER SHEET RUNTIME VERIFIER
 *
 * Captures and reports exact geometry and scroll-owner data for Phase 5 validation.
 *
 * Usage (in browser console while sheet is open):
 *   const result = await CharacterSheetRuntimeVerifier.runFullVerification(appElement);
 *   console.log(JSON.stringify(result, null, 2));
 *
 * Or individual snapshots:
 *   const geometry = CharacterSheetRuntimeVerifier.captureGeometrySnapshot(appElement);
 *   const scrollOwners = CharacterSheetRuntimeVerifier.identifyScrollOwners(appElement);
 */

export class CharacterSheetRuntimeVerifier {
  /**
   * Full Phase 5 verification suite
   * Captures geometry and identifies scroll owners
   */
  static async runFullVerification(appElement) {
    if (!appElement) {
      return {
        success: false,
        error: 'App element not found. Pass the sheet root element.'
      };
    }

    const timestamp = new Date().toISOString();
    const geometry = this.captureGeometrySnapshot(appElement);
    const scrollOwners = this.identifyScrollOwners(appElement);
    const verdict = this.evaluateScrollOwnership(scrollOwners);

    return {
      timestamp,
      success: true,
      geometry,
      scrollOwners,
      verdict
    };
  }

  /**
   * Capture full geometry snapshot of protected chain
   */
  static captureGeometrySnapshot(appElement) {
    const selectors = [
      { name: 'application', selector: '.application.swse-character-sheet' },
      { name: 'window-content', selector: '.window-content' },
      { name: 'wrapper', selector: '.swse-character-sheet-wrapper' },
      { name: 'form', selector: 'form.swse-character-sheet-form' },
      { name: 'sheet-shell', selector: '.sheet-shell' },
      { name: 'sheet-body', selector: '.sheet-body' },
      { name: 'tab.active', selector: '.sheet-body > .tab.active' },
      { name: 'tab:not(.active)', selector: '.sheet-body > .tab:not(.active)' }
    ];

    const snapshot = {
      timestamp: new Date().toISOString(),
      nodes: {}
    };

    selectors.forEach(({ name, selector }) => {
      const element = appElement.querySelector(selector);
      if (element) {
        const computed = window.getComputedStyle(element);
        snapshot.nodes[name] = {
          selector,
          found: true,
          computed: {
            display: computed.display,
            flex: computed.flex,
            flexBasis: computed.flexBasis,
            flexGrow: computed.flexGrow,
            flexShrink: computed.flexShrink,
            flexDirection: computed.flexDirection,
            minHeight: computed.minHeight,
            height: computed.height,
            maxHeight: computed.maxHeight,
            overflow: computed.overflow,
            overflowX: computed.overflowX,
            overflowY: computed.overflowY
          },
          geometry: {
            offsetHeight: element.offsetHeight,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            offsetWidth: element.offsetWidth,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth
          },
          isScrollOwner: this.isScrollOwner(element),
          isTransparent: computed.display === 'contents'
        };
      } else {
        snapshot.nodes[name] = {
          selector,
          found: false
        };
      }
    });

    return snapshot;
  }

  /**
   * Identify all real scroll owners in the sheet
   */
  static identifyScrollOwners(appElement) {
    const scrollOwners = [];

    // Scan the protected chain
    const chainSelectors = [
      '.window-content',
      '.swse-character-sheet-wrapper',
      'form.swse-character-sheet-form',
      '.sheet-shell',
      '.sheet-body',
      '.sheet-body > .tab.active'
    ];

    chainSelectors.forEach(selector => {
      const element = appElement.querySelector(selector);
      if (element && this.isScrollOwner(element)) {
        const computed = window.getComputedStyle(element);
        scrollOwners.push({
          selector,
          isLegal: selector === '.sheet-body > .tab.active',
          overflowY: computed.overflowY,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          hasScroll: element.scrollHeight > element.clientHeight,
          isScrolling: element.scrollTop > 0 || element.scrollHeight > element.clientHeight
        });
      }
    });

    // Scan for any other scrollers in the sheet
    const allElements = appElement.querySelectorAll('*');
    allElements.forEach(element => {
      // Skip if already found in chain
      const inChain = chainSelectors.some(sel => {
        const chainEl = appElement.querySelector(sel);
        return chainEl === element;
      });

      if (!inChain && this.isScrollOwner(element) && element.scrollHeight > element.clientHeight) {
        const path = this.getElementPath(element);
        // Skip common false positives
        if (!path.includes('textarea') && !path.includes('input') && !path.includes('[class*="select"]')) {
          scrollOwners.push({
            path,
            selector: element.className,
            isLegal: false,
            overflowY: window.getComputedStyle(element).overflowY,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            hasScroll: true,
            isScrolling: element.scrollTop > 0
          });
        }
      }
    });

    return scrollOwners;
  }

  /**
   * Check if element can scroll vertically
   */
  static isScrollOwner(element) {
    const computed = window.getComputedStyle(element);
    const overflowY = computed.overflowY;
    return overflowY === 'auto' || overflowY === 'scroll';
  }

  /**
   * Evaluate if scroll ownership matches the contract
   */
  static evaluateScrollOwnership(scrollOwners) {
    const legalScrollers = scrollOwners.filter(s => s.isLegal);
    const illegalScrollers = scrollOwners.filter(s => !s.isLegal && s.hasScroll);

    const verdict = {
      legalCount: legalScrollers.length,
      illegalCount: illegalScrollers.length,
      hasExactlyOneScroller: legalScrollers.length === 1 && illegalScrollers.length === 0,
      legalScrollers,
      illegalScrollers,
      pass: legalScrollers.length === 1 && illegalScrollers.length === 0
    };

    return verdict;
  }

  /**
   * Get the CSS path to an element
   */
  static getElementPath(element) {
    const names = [];
    while (element.parentElement) {
      if (element.id !== '') {
        names.unshift(`#${element.id}`);
        break;
      } else {
        names.unshift(element.tagName.toLowerCase());
      }
      element = element.parentElement;
    }
    return names.join(' > ');
  }

  /**
   * Check P0 specific failure: form height chain broken
   */
  static checkP0Failure(appElement) {
    const form = appElement.querySelector('form.swse-character-sheet-form');
    const windowContent = appElement.querySelector('.window-content');

    if (!form || !windowContent) {
      return { detected: false, reason: 'Form or window-content not found' };
    }

    const formHeight = form.clientHeight;
    const parentHeight = windowContent.clientHeight;
    const ratio = formHeight / parentHeight;

    const isP0Failed = ratio > 1.5;

    return {
      detected: isP0Failed,
      formHeight,
      parentHeight,
      ratio: ratio.toFixed(2),
      threshold: 1.5,
      formOverflow: window.getComputedStyle(form).overflow,
      formFlex: window.getComputedStyle(form).flex,
      formFlexBasis: window.getComputedStyle(form).flexBasis,
      formHeight_computed: window.getComputedStyle(form).height
    };
  }

  /**
   * Quick P0 status check (one-liner)
   */
  static getQuickStatus(appElement) {
    const p0 = this.checkP0Failure(appElement);
    const scrollOwners = this.identifyScrollOwners(appElement);
    const scrollVerdict = this.evaluateScrollOwnership(scrollOwners);

    if (p0.detected) {
      return `❌ P0 FAILED: Form ${p0.formHeight}px in ${p0.parentHeight}px parent (ratio: ${p0.ratio})`;
    }

    if (!scrollVerdict.pass) {
      return `❌ SCROLL CHAIN BROKEN: ${scrollVerdict.illegalCount} illegal scroll owners detected`;
    }

    return `✅ RUNTIME VERIFIED: P0 fixed, single scroll owner at .tab.active`;
  }

  /**
   * Print a human-readable verification report to console
   */
  static printVerificationReport(appElement) {
    console.clear();
    console.log('%c═══════════════════════════════════════════════════════════', 'color: cyan; font-weight: bold');
    console.log('%c  CHARACTER SHEET RUNTIME VERIFICATION (Phase 5)', 'color: cyan; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: cyan; font-weight: bold');

    const status = this.getQuickStatus(appElement);
    const statusColor = status.includes('✅') ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold';
    console.log(`\n%c${status}`, statusColor);

    // Geometry snapshot
    const geometry = this.captureGeometrySnapshot(appElement);
    console.log('\n%cGEOMETRY SNAPSHOT:', 'color: yellow; font-weight: bold');
    Object.entries(geometry.nodes).forEach(([name, node]) => {
      if (node.found) {
        console.log(`\n  ${name}:`);
        console.log(`    Display: ${node.computed.display} | Flex: ${node.computed.flex}`);
        console.log(`    Geometry: ${node.geometry.clientHeight}px height (scroll: ${node.geometry.scrollHeight}px)`);
        console.log(`    Scroll owner: ${node.isScrollOwner ? 'YES' : 'NO'}`);
      }
    });

    // Scroll owners
    const scrollOwners = this.identifyScrollOwners(appElement);
    const verdict = this.evaluateScrollOwnership(scrollOwners);
    console.log('\n%cSCROLL OWNER AUDIT:', 'color: yellow; font-weight: bold');
    console.log(`  Legal scrollers: ${verdict.legalCount}`);
    console.log(`  Illegal scrollers: ${verdict.illegalCount}`);
    verdict.legalScrollers.forEach(s => {
      console.log(`    ✅ ${s.selector || s.path}`);
    });
    verdict.illegalScrollers.forEach(s => {
      console.log(`    ❌ ${s.selector || s.path} (${s.overflowY})`);
    });

    // P0 specific
    const p0 = this.checkP0Failure(appElement);
    console.log('\n%cP0 FAILURE CHECK:', 'color: yellow; font-weight: bold');
    console.log(`  Status: ${p0.detected ? 'FAILED' : 'PASSED'}`);
    console.log(`  Form height: ${p0.formHeight}px`);
    console.log(`  Parent height: ${p0.parentHeight}px`);
    console.log(`  Ratio: ${p0.ratio}x (threshold: ${p0.threshold}x)`);

    console.log('\n%c═══════════════════════════════════════════════════════════', 'color: cyan');
  }
}

// If running in browser console, expose to window for easy access
if (typeof window !== 'undefined') {
  window.CharacterSheetRuntimeVerifier = CharacterSheetRuntimeVerifier;
}
