/**
 * ACCEPTANCE VERIFICATION: Character Sheet Scroll & Resize
 *
 * Final acceptance tests to verify the sheet actually works correctly.
 * Not a validator - a real-world behavioral verification.
 *
 * Questions answered:
 * 1. Does the sheet scroll?
 * 2. Does the app resize at runtime?
 * 3. Is content clipping gone?
 * 4. How many scroll regions exist?
 */

export class AcceptanceVerification {
  /**
   * Full acceptance verification report
   * Run this to determine if the sheet meets functional acceptance criteria
   */
  static verifyAcceptance(appElement) {
    const report = {
      timestamp: new Date().toISOString(),
      appElement: appElement ? appElement.tagName : 'MISSING',
      tests: {}
    };

    if (!appElement) {
      report.tests.elementFound = {
        status: 'FAIL',
        message: 'Character sheet app element not found',
        severity: 'CRITICAL'
      };
      return report;
    }

    // TEST 1: Can the sheet scroll?
    report.tests.scrollFunctionality = this.testScrollFunctionality(appElement);

    // TEST 2: Can the app be resized?
    report.tests.resizeFunctionality = this.testResizeFunctionality(appElement);

    // TEST 3: Is content clipped?
    report.tests.contentClipping = this.testContentClipping(appElement);

    // TEST 4: How many scroll regions?
    report.tests.scrollRegions = this.testScrollRegions(appElement);

    // TEST 5: Height chain integrity
    report.tests.heightChain = this.testHeightChain(appElement);

    // TEST 6: Window content overflow
    report.tests.windowContentOverflow = this.testWindowContentOverflow(appElement);

    // OVERALL STATUS
    report.overallStatus = this.calculateOverallStatus(report.tests);

    return report;
  }

  /**
   * TEST 1: Can the sheet actually scroll?
   * Verifies that .tab.active is scrollable and has overflowing content
   */
  static testScrollFunctionality(appElement) {
    const tab = appElement.querySelector('.tab.active');

    if (!tab) {
      return {
        status: 'FAIL',
        message: 'No active tab found',
        severity: 'CRITICAL',
        evidence: {}
      };
    }

    const styles = window.getComputedStyle(tab);
    const scrollHeight = tab.scrollHeight;
    const clientHeight = tab.clientHeight;
    const canScroll = scrollHeight > clientHeight;
    const overflowY = styles.overflowY;

    return {
      status: canScroll ? 'PASS' : 'WARN',
      message: canScroll ? 'Tab is scrollable' : 'Tab has no overflow (content may be small)',
      severity: canScroll ? 'INFO' : 'LOW',
      evidence: {
        selector: '.tab.active',
        scrollHeight,
        clientHeight,
        canScroll,
        overflowY,
        overflowX: styles.overflowX,
        scrollTop: tab.scrollTop,
        scrollable: tab.scrollHeight > tab.clientHeight
      }
    };
  }

  /**
   * TEST 2: Can the app be resized at runtime?
   * Checks if the app is resizable and not locked
   */
  static testResizeFunctionality(appElement) {
    const app = appElement.closest('.application');

    if (!app) {
      return {
        status: 'FAIL',
        message: 'Application wrapper not found',
        severity: 'CRITICAL',
        evidence: {}
      };
    }

    const styles = window.getComputedStyle(app);
    const isResizable = !app.classList.contains('no-resize') &&
                       styles.position === 'fixed' &&
                       app.style.width &&
                       app.style.height;

    // Check for resize handle
    const resizeHandle = app.querySelector('.window-resizable-handle, [data-resize-handle]');

    const appWidth = parseInt(app.style.width) || app.offsetWidth;
    const appHeight = parseInt(app.style.height) || app.offsetHeight;

    return {
      status: isResizable ? 'PASS' : 'WARN',
      message: isResizable ? 'Application appears resizable' : 'Application resize state unclear',
      severity: isResizable ? 'INFO' : 'MEDIUM',
      evidence: {
        selector: app.className,
        position: styles.position,
        width: app.style.width || 'not set',
        height: app.style.height || 'not set',
        offsetWidth: app.offsetWidth,
        offsetHeight: app.offsetHeight,
        hasResizeHandle: !!resizeHandle,
        resizable: !app.classList.contains('no-resize'),
        classes: app.className
      }
    };
  }

  /**
   * TEST 3: Is content being clipped?
   * Checks .window-content for hidden overflow
   */
  static testContentClipping(appElement) {
    const windowContent = appElement.querySelector('.window-content');

    if (!windowContent) {
      return {
        status: 'FAIL',
        message: '.window-content not found',
        severity: 'CRITICAL',
        evidence: {}
      };
    }

    const styles = window.getComputedStyle(windowContent);
    const form = windowContent.querySelector('form');

    if (!form) {
      return {
        status: 'FAIL',
        message: 'Form not found in window-content',
        severity: 'CRITICAL',
        evidence: {}
      };
    }

    const windowContentHeight = windowContent.clientHeight;
    const windowContentScrollHeight = windowContent.scrollHeight;
    const formHeight = form.clientHeight;
    const formScrollHeight = form.scrollHeight;

    const isClipping = windowContentScrollHeight > windowContentHeight;
    const formOverflows = formScrollHeight > formHeight;

    return {
      status: isClipping ? 'WARN' : 'PASS',
      message: isClipping ? 'Content is being clipped by window-content' : 'No clipping detected',
      severity: isClipping ? 'HIGH' : 'INFO',
      evidence: {
        windowContentOverflow: styles.overflow,
        windowContentHeight,
        windowContentScrollHeight,
        isClipping,
        formHeight,
        formScrollHeight,
        formOverflows,
        clipPoint: {
          element: '.window-content',
          overflow: styles.overflow,
          canScroll: windowContent.scrollHeight > windowContent.clientHeight
        }
      }
    };
  }

  /**
   * TEST 4: How many vertical scroll regions exist?
   * Should be exactly 1 (.tab.active) if contract is correct
   */
  static testScrollRegions(appElement) {
    const scrollable = [];

    appElement.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      const hasVerticalScroll = (styles.overflowY === 'auto' || styles.overflowY === 'scroll') &&
                               el.scrollHeight > el.clientHeight;

      if (hasVerticalScroll) {
        scrollable.push({
          selector: this.getElementPath(el),
          element: el.tagName,
          classes: el.className,
          overflowY: styles.overflowY,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          canScroll: true
        });
      }
    });

    const expectedCount = 1;
    const actualCount = scrollable.length;

    return {
      status: actualCount === expectedCount ? 'PASS' : 'FAIL',
      message: actualCount === 1 ? 'One scroll region found (correct)' : `${actualCount} scroll region(s) found (expected 1)`,
      severity: actualCount === 1 ? 'INFO' : 'CRITICAL',
      evidence: {
        expectedCount,
        actualCount,
        scrollRegions: scrollable,
        status: actualCount === 1 ? 'PASS' : 'FAIL'
      }
    };
  }

  /**
   * TEST 5: Is the height chain unbroken?
   * Verifies min-height: 0 on all flex containers in chain
   */
  static testHeightChain(appElement) {
    const chain = [
      { selector: '.window-content', required: true },
      { selector: 'form.swse-character-sheet-form, form', required: true },
      { selector: '.sheet-shell, section.sheet-shell', required: true },
      { selector: '.sheet-body', required: true },
      { selector: '.tab.active', required: true }
    ];

    const results = [];
    let hasIssues = false;

    chain.forEach(link => {
      const el = appElement.querySelector(link.selector);

      if (!el) {
        results.push({
          selector: link.selector,
          status: 'FAIL',
          message: 'Element not found',
          severity: 'CRITICAL'
        });
        hasIssues = true;
        return;
      }

      const styles = window.getComputedStyle(el);
      const display = styles.display;
      const minHeight = styles.minHeight;
      const flex = styles.flex;

      const isFlex = display === 'flex' || display === 'grid';
      const hasMinHeight = minHeight === '0px' || minHeight === '0';

      if (isFlex && !hasMinHeight) {
        hasIssues = true;
        results.push({
          selector: link.selector,
          status: 'WARN',
          message: `Flex container missing min-height: 0`,
          display,
          minHeight,
          flex,
          severity: 'MEDIUM'
        });
      } else {
        results.push({
          selector: link.selector,
          status: 'PASS',
          display,
          minHeight,
          flex
        });
      }
    });

    return {
      status: hasIssues ? 'WARN' : 'PASS',
      message: hasIssues ? 'Height chain has issues' : 'Height chain intact',
      severity: hasIssues ? 'MEDIUM' : 'INFO',
      evidence: {
        chain: results,
        allPresent: results.every(r => r.status !== 'FAIL'),
        allCorrect: results.every(r => r.status === 'PASS' || r.status !== 'WARN')
      }
    };
  }

  /**
   * TEST 6: Window content overflow state
   * Critical diagnostic for understanding the clip point
   */
  static testWindowContentOverflow(appElement) {
    const windowContent = appElement.querySelector('.window-content');

    if (!windowContent) {
      return {
        status: 'FAIL',
        message: '.window-content not found',
        severity: 'CRITICAL',
        evidence: {}
      };
    }

    const styles = window.getComputedStyle(windowContent);
    const isClipPoint = styles.overflow === 'hidden' || styles.overflowY === 'hidden';

    return {
      status: isClipPoint ? 'PASS' : 'WARN',
      message: isClipPoint ? 'Window-content is clip point (correct)' : 'Window-content overflow may be wrong',
      severity: isClipPoint ? 'INFO' : 'MEDIUM',
      evidence: {
        selector: '.window-content',
        overflow: styles.overflow,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        display: styles.display,
        position: styles.position,
        width: windowContent.style.width || 'auto',
        height: windowContent.style.height || 'auto'
      }
    };
  }

  /**
   * Calculate overall acceptance status
   */
  static calculateOverallStatus(tests) {
    const statuses = Object.values(tests).map(t => t.status);

    if (statuses.includes('FAIL')) {
      return {
        status: 'UNACCEPTABLE',
        reason: 'One or more critical failures',
        message: 'Sheet does not meet acceptance criteria'
      };
    }

    if (statuses.includes('WARN')) {
      return {
        status: 'CONDITIONAL',
        reason: 'One or more warnings present',
        message: 'Sheet may work but has issues'
      };
    }

    return {
      status: 'ACCEPTABLE',
      reason: 'All tests passed',
      message: 'Sheet meets acceptance criteria'
    };
  }

  /**
   * Get element path for readable output
   */
  static getElementPath(el) {
    const parts = [];
    let current = el;

    while (current && current !== document.body) {
      let identifier = current.tagName.toLowerCase();

      if (current.id) {
        identifier += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').slice(0, 2).join('.');
        if (classes) identifier += `.${classes}`;
      }

      parts.unshift(identifier);
      current = current.parentElement;

      if (parts.length >= 5) break;
    }

    return parts.join(' > ');
  }

  /**
   * Print a formatted report to console
   */
  static printReport(report) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║         CHARACTER SHEET ACCEPTANCE VERIFICATION REPORT         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    console.log(`Status: ${report.overallStatus.status}`);
    console.log(`Reason: ${report.overallStatus.message}`);
    console.log('');

    console.log('TEST RESULTS:');
    console.log('─────────────────────────────────────────────────────────────────');

    for (const [testName, result] of Object.entries(report.tests)) {
      const statusSymbol = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
      console.log(`${statusSymbol} ${testName}: ${result.status}`);
      console.log(`  ${result.message}`);

      if (result.evidence && Object.keys(result.evidence).length > 0) {
        console.log('  Evidence:', result.evidence);
      }
      console.log('');
    }

    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`Overall: ${report.overallStatus.status}`);
    console.log('');

    return report;
  }
}

export default AcceptanceVerification;
