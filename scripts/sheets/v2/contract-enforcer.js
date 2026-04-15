/**
 * CHARACTER SHEET WINDOW CONTRACT ENFORCER
 *
 * This module enforces the immutable Character Sheet Window Contract at runtime.
 * It validates that the sheet complies with the architectural rules and prevents regressions.
 *
 * Integrates with SentinelEngine for:
 * - Violation detection and reporting
 * - Severity tracking
 * - Regression prevention
 * - Contract breach tracing
 *
 * CONTRACT RULES (IMMUTABLE):
 * 1. FRAME: ApplicationV2 controls window size/resize
 * 2. LAYOUT: Single flex chain from .window-content to .tab.active
 * 3. SCROLL: Exactly ONE vertical scroll owner: .tab.active
 * 4. PANELS: No inner panel has independent scroll
 * 5. FLEX: All flex children have min-height: 0
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export class CharacterSheetContractEnforcer {
  static #violationCounts = new Map();
  static #layerInitialized = false;
  /**
   * Initialize the contract enforcer as a Sentinel layer
   * Called once at system startup
   */
  static init() {
    if (this.#layerInitialized) return;
    this.#layerInitialized = true;

    SentinelEngine.registerLayer("contract-enforcer", {
      enabled: true,
      readOnly: true,
      description: "Character Sheet Window Contract enforcement and violation detection",
      init: () => {
        // console.log("[SWSE Sentinel] Character Sheet Contract Enforcer layer ready");
      }
    });
  }

  /**
   * Report a contract violation to Sentinel
   * @param {string} rule - Contract rule name (FRAME, LAYOUT, SCROLL, PANELS, FLEX)
   * @param {number} severity - SentinelEngine.SEVERITY level
   * @param {string} message - Human-readable violation message
   * @param {Object} meta - Violation metadata
   * @param {string} selector - CSS selector of violating element
   */
  static #reportViolation(rule, severity, message, meta = {}, selector = null) {
    // Track violation count for this rule
    const violationKey = `contract-${rule}-${selector || 'unknown'}`;
    const count = (this.#violationCounts.get(violationKey) || 0) + 1;
    this.#violationCounts.set(violationKey, count);

    // Escalate severity on repeated violations
    if (count > 2 && severity < SentinelEngine.SEVERITY.ERROR) {
      severity = SentinelEngine.SEVERITY.ERROR;
    }
    if (count > 5 && severity < SentinelEngine.SEVERITY.CRITICAL) {
      severity = SentinelEngine.SEVERITY.CRITICAL;
    }

    // Report to Sentinel
    SentinelEngine.report(
      "contract-enforcer",
      severity,
      `[${rule}] ${message}`,
      {
        rule,
        selector,
        violationCount: count,
        ...meta
      },
      {
        aggregateKey: `contract-${rule}`,
        category: "contract-violation",
        subcode: `CONTRACT_BREACH_${rule}`,
        source: "CharacterSheetContractEnforcer.validate()",
        evidence: {
          rule,
          selector,
          occurrences: count
        }
      }
    );
  }

  /**
   * Validate the character sheet against the contract
   * @param {HTMLElement} element - The root element of the sheet
   * @param {Object} options - Validation options
   * @returns {Object} Validation results { passed: boolean, violations: Array }
   */
  static validate(element, options = {}) {
    // Initialize Sentinel layer on first validation
    this.init();
    const violations = [];
    const warnings = [];

    if (!element) {
      const violation = {
        rule: 'FRAME',
        severity: 'CRITICAL',
        message: 'Element not found',
        selector: null
      };
      violations.push(violation);
      this.#reportViolation(
        'FRAME',
        SentinelEngine.SEVERITY.CRITICAL,
        'Element not found for validation',
        { element: element ? element.tagName : 'null' }
      );
      return { passed: false, violations, warnings };
    }

    // RULE 3: SCROLL CONTRACT - Exactly ONE scroll owner
    const scrollOwners = this.findScrollOwners(element);
    if (scrollOwners.length !== 1) {
      const violation = {
        rule: 'SCROLL',
        severity: 'CRITICAL',
        message: `Expected 1 scroll owner, found ${scrollOwners.length}`,
        selectors: scrollOwners.map(el => this.getElementPath(el))
      };
      violations.push(violation);
      this.#reportViolation(
        'SCROLL',
        SentinelEngine.SEVERITY.CRITICAL,
        `Expected 1 scroll owner, found ${scrollOwners.length}`,
        {
          expectedCount: 1,
          actualCount: scrollOwners.length,
          scrollOwners: scrollOwners.map(el => ({
            selector: this.getElementPath(el),
            classes: el.className
          }))
        }
      );
    } else if (!scrollOwners[0].classList.contains('tab')) {
      const violation = {
        rule: 'SCROLL',
        severity: 'CRITICAL',
        message: 'Scroll owner is not .tab.active',
        selector: this.getElementPath(scrollOwners[0])
      };
      violations.push(violation);
      this.#reportViolation(
        'SCROLL',
        SentinelEngine.SEVERITY.CRITICAL,
        'Scroll owner is not .tab.active',
        {
          actualSelector: this.getElementPath(scrollOwners[0]),
          actualClasses: scrollOwners[0].className,
          expectedSelector: '.tab.active'
        },
        this.getElementPath(scrollOwners[0])
      );
    }

    // RULE 4: PANEL CONTRACT - No inner panel scrolls
    const illegalPanelScrollers = this.findIllegalPanelScrollers(element);
    if (illegalPanelScrollers.length > 0) {
      const violation = {
        rule: 'PANELS',
        severity: 'CRITICAL',
        message: `Inner panels with independent scroll found: ${illegalPanelScrollers.length}`,
        selectors: illegalPanelScrollers.map(el => this.getElementPath(el))
      };
      violations.push(violation);

      // Report each violating panel
      illegalPanelScrollers.forEach((el, index) => {
        this.#reportViolation(
          'PANELS',
          SentinelEngine.SEVERITY.CRITICAL,
          `Panel ${index + 1}/${illegalPanelScrollers.length} has independent scroll`,
          {
            panelSelector: this.getElementPath(el),
            panelClasses: el.className,
            panelOverflow: window.getComputedStyle(el).overflowY
          },
          this.getElementPath(el)
        );
      });
    }

    // RULE 5: FLEX CHAIN - Verify height chain integrity
    const heightChainViolations = this.validateHeightChain(element);
    if (heightChainViolations.length > 0) {
      violations.push(...heightChainViolations);
      // Report each height chain violation
      heightChainViolations.forEach(v => {
        this.#reportViolation(
          'FLEX',
          SentinelEngine.SEVERITY[v.severity],
          v.message,
          { selector: v.selector },
          v.selector
        );
      });
    }

    // RULE 1: FRAME CONTRACT - Verify ApplicationV2 frame is in control
    const frameViolations = this.validateFrameContract(element);
    if (frameViolations.length > 0) {
      warnings.push(...frameViolations);
      frameViolations.forEach(w => {
        this.#reportViolation(
          'FRAME',
          SentinelEngine.SEVERITY.WARN,
          w.message,
          { selector: w.selector },
          w.selector
        );
      });
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Find all elements with overflow-y: auto (potential scroll owners)
   */
  static findScrollOwners(element) {
    const realScrollOwners = [];
    const excludedElements = {
      hiddenTabs: [],
      nativeControls: [],
      horizontalOnly: []
    };

    // Native form control tags to exclude
    const nativeControlTags = ['TEXTAREA', 'INPUT', 'SELECT', 'OPTION'];

    element.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);

      // Exclude native form controls
      if (nativeControlTags.includes(el.tagName)) {
        excludedElements.nativeControls.push(el);
        return;
      }

      // Exclude contenteditable elements
      if (el.getAttribute('contenteditable') === 'true') {
        excludedElements.nativeControls.push(el);
        return;
      }

      // Exclude hidden elements (display: none or visibility: hidden)
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        if (el.classList.contains('tab')) {
          excludedElements.hiddenTabs.push(el);
        }
        return;
      }

      // Only check overflow-y, not overflow-x
      const hasVerticalOverflow = styles.overflowY === 'auto' || styles.overflowY === 'scroll';
      const hasAnyOverflow = styles.overflow === 'auto' || styles.overflow === 'scroll';

      if (!hasVerticalOverflow && !hasAnyOverflow) {
        return;
      }

      // Check if this is a structural container (not a tiny control wrapper)
      const isStructuralContainer = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'FORM', 'ASIDE'].includes(el.tagName);
      if (!isStructuralContainer) {
        return;
      }

      // Mark horizontal-only scrollers (for informational purposes, don't count as real owners)
      if (styles.overflowX === 'auto' || styles.overflowX === 'scroll') {
        if (!(hasVerticalOverflow || hasAnyOverflow)) {
          excludedElements.horizontalOnly.push(el);
          return;
        }
      }

      // This is a real structural scroll owner
      realScrollOwners.push(el);
    });

    // Attach exclusion info to the array for diagnostic reporting
    realScrollOwners.excluded = excludedElements;
    return realScrollOwners;
  }

  /**
   * Find inner panels that have their own scroll (illegal)
   * Panels are elements with classes like: -panel, -container, -grid, -body
   */
  static findIllegalPanelScrollers(element) {
    const illegal = [];
    element.querySelectorAll('[class*="-panel"], [class*="-container"], [class*="-grid"], [class*="-body"]').forEach(el => {
      // Ignore .tab and .sheet-body themselves
      if (el.classList.contains('tab') || el.classList.contains('sheet-body')) {
        return;
      }

      const styles = window.getComputedStyle(el);
      if (styles.overflowY === 'auto' || styles.overflowY === 'scroll' || styles.overflow === 'auto') {
        illegal.push(el);
      }
    });
    return illegal;
  }

  /**
   * Validate the flex height chain from root to active tab
   *
   * CRITICAL CHAIN (from Phase 2 governance):
   * .window-content
   *   → .swse-character-sheet-wrapper (transparent, display: contents)
   *   → .swse-character-sheet-form (primary flex column)
   *   → .sheet-shell (secondary flex column)
   *   → .sheet-body (tab container, non-scrolling)
   *   → .tab.active (sole vertical scroll owner)
   *
   * Each flex container must have min-height: 0 to allow shrinking.
   * The wrapper is transparent (display: contents) and is NOT a flex container.
   */
  static validateHeightChain(element) {
    const violations = [];

    // Expected chain: windowContent → wrapper → form → sheet-shell → sheet-body → tab
    const chain = [
      { selector: '.window-content', required: true, transparent: false },
      { selector: '.swse-character-sheet-wrapper', required: true, transparent: true },
      { selector: '.swse-character-sheet-form', required: true, transparent: false },
      { selector: '.sheet-shell', required: true, transparent: false },
      { selector: '.sheet-body', required: true, transparent: false },
      { selector: '.tab.active', required: true, transparent: false }
    ];

    chain.forEach(link => {
      const el = element.closest(link.selector) || element.querySelector(link.selector);
      if (!el) {
        if (link.required) {
          violations.push({
            rule: 'FLEX_CHAIN',
            severity: 'HIGH',
            message: `Missing required ${link.transparent ? 'transparent pass-through' : 'flex container'}: ${link.selector}`,
            selector: link.selector
          });
        }
        return;
      }

      const styles = window.getComputedStyle(el);
      const display = styles.display;

      // Transparent elements (display: contents) bypass flex validation
      if (link.transparent) {
        if (display !== 'contents') {
          violations.push({
            rule: 'FLEX_CHAIN',
            severity: 'MEDIUM',
            message: `${link.selector} is transparent wrapper but display is ${display} (expected: contents)`,
            selector: link.selector
          });
        }
        // No further checks for transparent nodes
        return;
      }

      // Check if it's a flex container (non-transparent nodes)
      if (display !== 'flex' && display !== 'grid') {
        violations.push({
          rule: 'FLEX_CHAIN',
          severity: 'MEDIUM',
          message: `${link.selector} is not flex or grid (display: ${display})`,
          selector: link.selector
        });
      }

      // Check min-height: 0 (only for flex containers, not grid)
      if (display === 'flex' && styles.minHeight !== '0px') {
        violations.push({
          rule: 'FLEX_CHAIN',
          severity: 'MEDIUM',
          message: `${link.selector} missing min-height: 0 (has: ${styles.minHeight})`,
          selector: link.selector
        });
      }
    });

    return violations;
  }

  /**
   * Validate ApplicationV2 frame contract
   * The frame should control size and resize behavior
   */
  static validateFrameContract(element) {
    const violations = [];

    // Check if .window-content exists (ApplicationV2 frame element)
    const windowContent = element.closest('.window-content') || element.querySelector('.window-content');
    if (!windowContent) {
      violations.push({
        rule: 'FRAME',
        severity: 'MEDIUM',
        message: 'ApplicationV2 frame (.window-content) not found',
        selector: '.window-content'
      });
    }

    return violations;
  }

  /**
   * Get a meaningful path/selector for an element (for error reporting)
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

      // Limit depth
      if (parts.length >= 5) break;
    }

    return parts.join(' > ');
  }

  /**
   * Run validation and log results
   * Reports comprehensive summary to Sentinel
   */
  static validateAndReport(element) {
    const result = this.validate(element);

    // Log to console for immediate visibility
    if (result.violations.length > 0) {
      console.error('[CHARACTER SHEET CONTRACT] VIOLATIONS FOUND:', result.violations);
      result.violations.forEach(v => {
        console.error(`  [${v.rule}] ${v.message}`);
        if (v.selectors) {
          console.error(`    SELECTORS (${v.selectors.length}):`);
          v.selectors.forEach((sel, idx) => {
            console.error(`      ${idx + 1}. ${sel}`);
          });
        }
        if (v.selector) {
          console.error(`    SELECTOR: ${v.selector}`);
        }
      });

      // Summary report to Sentinel
      SentinelEngine.report(
        "contract-enforcer",
        SentinelEngine.SEVERITY.CRITICAL,
        `Contract validation failed: ${result.violations.length} violation(s)`,
        {
          totalViolations: result.violations.length,
          violationsByRule: this.#groupViolationsByRule(result.violations),
          violations: result.violations.map(v => ({
            rule: v.rule,
            message: v.message,
            selector: v.selector || v.selectors
          }))
        },
        {
          aggregateKey: "contract-validation-failed",
          category: "contract-breach",
          subcode: "VALIDATION_FAILED",
          source: "CharacterSheetContractEnforcer.validateAndReport()"
        }
      );
    } else {
      // Success report to Sentinel
      SentinelEngine.report(
        "contract-enforcer",
        SentinelEngine.SEVERITY.INFO,
        "Character sheet contract validation passed",
        {
          element: element ? element.tagName : 'unknown',
          timestamp: new Date().toISOString()
        },
        {
          aggregateKey: "contract-validation-passed",
          category: "contract-compliance",
          subcode: "VALIDATION_PASSED",
          source: "CharacterSheetContractEnforcer.validateAndReport()"
        }
      );
    }

    if (result.warnings.length > 0) {
      console.warn('[CHARACTER SHEET CONTRACT] WARNINGS:', result.warnings);
      result.warnings.forEach(w => {
        console.warn(`  [${w.rule}] ${w.message}`, w);
      });
    }

    if (result.passed) {
      // console.log('[CHARACTER SHEET CONTRACT] ✓ All rules passed');
    }

    return result;
  }

  /**
   * PHASE 3: Capture actual runtime geometry for the critical chain
   * This validates that the CSS contract actually translates to correct runtime behavior.
   *
   * Returns geometry data for:
   * - .window-content
   * - .swse-character-sheet-wrapper
   * - .swse-character-sheet-form
   * - .sheet-shell
   * - .sheet-body
   * - .tab.active
   *
   * For each node, captures:
   * - offsetHeight, clientHeight, scrollHeight
   * - computed display, flex, min-height, overflow, overflow-y
   * - whether the node can/is scrolling
   */
  static captureGeometry(element) {
    const geometry = {
      timestamp: new Date().toISOString(),
      frameSize: {
        width: element?.offsetWidth || 0,
        height: element?.offsetHeight || 0
      },
      chain: {}
    };

    const chain = [
      { name: 'windowContent', selector: '.window-content' },
      { name: 'wrapper', selector: '.swse-character-sheet-wrapper' },
      { name: 'form', selector: '.swse-character-sheet-form' },
      { name: 'sheetShell', selector: '.sheet-shell' },
      { name: 'sheetBody', selector: '.sheet-body' },
      { name: 'activeTab', selector: '.tab.active' }
    ];

    chain.forEach(link => {
      const el = element.closest(link.selector) || element.querySelector(link.selector);
      if (!el) {
        geometry.chain[link.name] = { found: false, selector: link.selector };
        return;
      }

      const styles = window.getComputedStyle(el);
      geometry.chain[link.name] = {
        found: true,
        selector: link.selector,
        offsetHeight: el.offsetHeight,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        overflow: styles.overflow,
        overflowY: styles.overflowY,
        overflowX: styles.overflowX,
        display: styles.display,
        flex: styles.flex,
        minHeight: styles.minHeight,
        canScroll: el.scrollHeight > el.clientHeight,
        isScrolling: el.scrollTop > 0 || (el.scrollHeight - el.clientHeight) > 0,
        classes: Array.from(el.classList)
      };
    });

    return geometry;
  }

  /**
   * PHASE 4: Validate actual runtime geometry against contract
   * P0 repair focus: Detect form content-sizing breakage
   * Checks that height chain is properly constrained and single scroll owner exists
   */
  static validateGeometry(element) {
    const geometry = this.captureGeometry(element);
    const violations = [];

    // P0 CHECK: Form height constraint validation (now a div, not a form)
    const form = element.querySelector('.swse-character-sheet-form');
    const windowContent = element.querySelector('.window-content');

    if (form && windowContent) {
      const formHeight = form.clientHeight;
      const parentHeight = windowContent.clientHeight;
      const formStyles = window.getComputedStyle(form);

      // P0: Form should be constrained to parent
      // If form is 2-3x parent height, content-sizing runaway likely occurred
      if (parentHeight > 0 && formHeight > parentHeight * 1.5) {
        violations.push({
          rule: 'HEIGHT_CHAIN_BROKEN',
          severity: 'CRITICAL',
          message: `FORM HEIGHT RUNAWAY: Parent ${parentHeight}px, Form ${formHeight}px. Check flex-basis and height properties.`,
          selector: '.swse-character-sheet-form',
          geometry: { parentHeight, formHeight, ratio: (formHeight / parentHeight).toFixed(1) }
        });
      }

      // Form must not be a scroll owner
      if (formStyles.overflowY === 'auto' || formStyles.overflowY === 'scroll') {
        violations.push({
          rule: 'SCROLL',
          severity: 'CRITICAL',
          message: 'Form must NOT be a scroll owner',
          selector: '.swse-character-sheet-form'
        });
      }
    }

    // Validate scroll owner
    const activeTab = element.querySelector('.tab.active');
    if (activeTab) {
      const styles = window.getComputedStyle(activeTab);
      if (styles.overflowY !== 'auto' && styles.overflowY !== 'scroll') {
        violations.push({
          rule: 'SCROLL',
          severity: 'HIGH',
          message: 'Active tab is not scrollable (overflow-y is not auto/scroll)',
          selector: '.tab.active'
        });
      }

      // If content exceeds visible height, tab must be able to scroll
      if (geometry.chain.activeTab && geometry.chain.activeTab.canScroll && styles.overflowY === 'hidden') {
        violations.push({
          rule: 'SCROLL',
          severity: 'CRITICAL',
          message: 'Active tab content exceeds height but overflow-y is hidden',
          selector: '.tab.active'
        });
      }
    }

    // Validate sheet-body is NOT a scroll owner
    const sheetBody = element.querySelector('.sheet-body');
    if (sheetBody) {
      const styles = window.getComputedStyle(sheetBody);
      if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
        violations.push({
          rule: 'LAYOUT',
          severity: 'CRITICAL',
          message: 'Sheet-body must NOT be a scroll owner; only tab.active scrolls',
          selector: '.sheet-body'
        });
      }
    }

    return {
      geometry,
      violations,
      passed: violations.length === 0
    };
  }

  /**
   * PHASE 4: Quick P0 status check
   * Returns one-line summary of height chain and scroll owner status
   */
  static getP0Status(element) {
    const result = this.validateGeometry(element);
    const form = element.querySelector('.swse-character-sheet-form');
    const windowContent = element.querySelector('.window-content');
    const activeTab = element.querySelector('.tab.active');

    if (result.violations.length > 0) {
      const heightBroken = result.violations.find(v => v.rule === 'HEIGHT_CHAIN_BROKEN');
      if (heightBroken) {
        return `❌ HEIGHT CHAIN BROKEN: ${heightBroken.message}`;
      }
      return `❌ CONTRACT VIOLATED: ${result.violations[0].message}`;
    }

    const scrollOwner = activeTab ? '.sheet-body > .tab.active' : 'NONE';
    return `✅ P0 PASS: Height chain bounded, scroll owner: ${scrollOwner}`;
  }

  /**
   * Group violations by rule for summary reporting
   */
  static #groupViolationsByRule(violations) {
    const grouped = {};
    violations.forEach(v => {
      if (!grouped[v.rule]) {
        grouped[v.rule] = 0;
      }
      grouped[v.rule]++;
    });
    return grouped;
  }

  /**
   * Get violation summary for dashboard/debugging
   */
  static getViolationSummary() {
    const summary = {
      totalViolations: this.#violationCounts.size,
      violations: Object.fromEntries(
        Array.from(this.#violationCounts.entries()).map(([key, count]) => [key, count])
      )
    };
    return summary;
  }

  /**
   * Reset violation tracking (useful for test runs)
   */
  static reset() {
    this.#violationCounts.clear();
  }

  /**
   * PHASE 3: Classify and diagnose contract failures
   * Provides actionable failure categories instead of just reporting violations
   */
  static diagnoseFailures(element) {
    const result = this.validate(element);
    const geometry = this.captureGeometry(element);
    const diagnosis = {
      timestamp: new Date().toISOString(),
      passed: result.passed,
      violations: result.violations,
      categories: {}
    };

    if (result.passed) {
      diagnosis.categories.OK = {
        message: 'All contract rules passed',
        detail: 'Runtime geometry matches CSS contract expectations'
      };
      return diagnosis;
    }

    // Classify violations into actionable categories
    const violations = result.violations || [];

    violations.forEach(v => {
      const category = this.#classifyViolation(v, geometry);
      if (!diagnosis.categories[category]) {
        diagnosis.categories[category] = {
          message: category,
          violations: []
        };
      }
      diagnosis.categories[category].violations.push({
        selector: v.selector || v.selectors,
        message: v.message,
        severity: v.severity
      });
    });

    // Add recommendations for each category
    Object.keys(diagnosis.categories).forEach(cat => {
      if (cat === 'OK') return;
      diagnosis.categories[cat].recommendation = this.#getRecommendation(cat);
    });

    return diagnosis;
  }

  /**
   * Classify a violation into a failure category
   * Categories: HEIGHT_CHAIN_BROKEN, WRONG_SCROLL_OWNER, MISSING_SHRINKABILITY,
   *             DISPLAY_CHAIN_INVALID, ILLEGAL_INNER_SCROLLER, WRAPPER_MISMATCH
   */
  static #classifyViolation(violation, geometry) {
    const rule = violation.rule;
    const selector = violation.selector || '';

    if (rule === 'SCROLL' && selector.includes('scroll owner')) {
      return 'WRONG_SCROLL_OWNER';
    }
    if (rule === 'FLEX_CHAIN') {
      if (violation.message.includes('min-height')) {
        return 'MISSING_SHRINKABILITY';
      }
      if (violation.message.includes('display')) {
        return 'DISPLAY_CHAIN_INVALID';
      }
      if (violation.message.includes('wrapper') || selector.includes('wrapper')) {
        return 'WRAPPER_MISMATCH';
      }
      if (violation.message.includes('Missing')) {
        return 'HEIGHT_CHAIN_BROKEN';
      }
    }
    if (rule === 'PANELS') {
      return 'ILLEGAL_INNER_SCROLLER';
    }
    if (rule === 'LAYOUT') {
      return 'HEIGHT_CHAIN_BROKEN';
    }

    return 'UNKNOWN_VIOLATION';
  }

  /**
   * Get actionable recommendation for a failure category
   */
  static #getRecommendation(category) {
    const recommendations = {
      HEIGHT_CHAIN_BROKEN: 'The root flex chain is broken. Verify all nodes in the chain exist and are properly connected in the DOM.',
      WRONG_SCROLL_OWNER: 'Multiple scroll owners found or wrong owner. Only .tab.active should scroll. Check for overflow: auto elsewhere.',
      MISSING_SHRINKABILITY: 'A flex child is missing min-height: 0, preventing proper shrinking. Add min-height: 0 to the flex container.',
      DISPLAY_CHAIN_INVALID: 'A flex chain node has wrong display property. Verify v2-sheet.css defines display: flex for all chain nodes.',
      ILLEGAL_INNER_SCROLLER: 'An inner panel/container has overflow-y: auto. Only .tab.active should scroll; remove overflow-y: auto from inner panels.',
      WRAPPER_MISMATCH: 'The wrapper element display property is wrong. Wrapper must have display: contents to be transparent in the flex chain.'
    };
    return recommendations[category] || 'Check contract rules in v2-sheet.css';
  }

  /**
   * Print diagnosis results in readable format
   */
  static printDiagnosis(element) {
    const diagnosis = this.diagnoseFailures(element);

    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║        CHARACTER SHEET CONTRACT FAILURE DIAGNOSIS               ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (diagnosis.passed) {
      // console.log('✅ CONTRACT PASSED: All rules satisfied\n');
      return;
    }

    // console.log(`❌ CONTRACT FAILED: ${diagnosis.violations.length} violation(s)\n`);

    Object.entries(diagnosis.categories).forEach(([cat, data]) => {
      if (cat === 'OK') return;
      // console.log(`📍 ${cat}`);
      // console.log(`   ${data.message}`);
      if (data.violations && data.violations.length > 0) {
        data.violations.forEach(v => {
          // console.log(`   - [${v.severity}] ${v.message}`);
        });
      }
      if (data.recommendation) {
        // console.log(`   ➡️  RECOMMENDATION: ${data.recommendation}`);
      }
      // console.log('');
    });
  }

  /**
   * DEBUG: Print all actual scroll owners with element details
   * Call this to see exactly which elements are scrollable and why
   */
  static debugScrollOwners(element) {
    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║   DEBUG: REAL SHEET-LEVEL VERTICAL SCROLL OWNERS (REFINED)    ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const scrollOwners = this.findScrollOwners(element);
    const excluded = scrollOwners.excluded || {};

    // Report real scroll owners
    if (scrollOwners.length === 0) {
      // console.log('✓ No sheet-level scroll owners found (correct state).');
    } else {
      // console.log(`Found ${scrollOwners.length} real scroll owner(s):\n`);

      scrollOwners.forEach((el, idx) => {
        const styles = window.getComputedStyle(el);
        const path = this.getElementPath(el);

        // console.log(`${idx + 1}. ${path}`);
        // console.log(`   Classes: ${el.className}`);
        // console.log(`   Display: ${styles.display}`);
        // console.log(`   Overflow-Y: ${styles.overflowY}`);
        // console.log(`   ScrollHeight: ${el.scrollHeight}`);
        // console.log(`   ClientHeight: ${el.clientHeight}`);
        // console.log(`   Can scroll: ${el.scrollHeight > el.clientHeight}`);
        // console.log(`   Min-height: ${styles.minHeight}`);
        // console.log('');
      });
    }

    // Report exclusions
    // console.log('╔════════════════════════════════════════════════════════════════╗');
    // console.log('║                    EXCLUSIONS (NOT VIOLATIONS)                 ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (excluded.hiddenTabs && excluded.hiddenTabs.length > 0) {
      // console.log(`Hidden tabs (display: none): ${excluded.hiddenTabs.length}`);
      excluded.hiddenTabs.forEach((el) => {
        const path = this.getElementPath(el);
        // console.log(`  - ${path}`);
      });
      // console.log('');
    }

    if (excluded.nativeControls && excluded.nativeControls.length > 0) {
      // console.log(`Native form controls (textarea, input, etc): ${excluded.nativeControls.length}`);
      excluded.nativeControls.slice(0, 5).forEach((el) => {
        const path = this.getElementPath(el);
        // console.log(`  - ${path}`);
      });
      if (excluded.nativeControls.length > 5) {
        // console.log(`  ... and ${excluded.nativeControls.length - 5} more`);
      }
      // console.log('');
    }

    if (excluded.horizontalOnly && excluded.horizontalOnly.length > 0) {
      // console.log(`Horizontal-only scrollers: ${excluded.horizontalOnly.length}`);
      excluded.horizontalOnly.forEach((el) => {
        const path = this.getElementPath(el);
        // console.log(`  - ${path}`);
      });
      // console.log('');
    }

    return scrollOwners;
  }

  /**
   * DEBUG: Print the one remaining inner panel scroller
   */
  static debugIllegalPanelScrollers(element) {
    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║      DEBUG: ILLEGAL INNER PANEL SCROLLERS                      ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const illegal = this.findIllegalPanelScrollers(element);

    if (illegal.length === 0) {
      // console.log('No illegal panel scrollers found.');
      return;
    }

    // console.log(`Found ${illegal.length} illegal panel scroller(s):\n`);

    illegal.forEach((el, idx) => {
      const styles = window.getComputedStyle(el);
      const path = this.getElementPath(el);

      // console.log(`${idx + 1}. ${path}`);
      // console.log(`   Classes: ${el.className}`);
      // console.log(`   Overflow-Y: ${styles.overflowY}`);
      // console.log(`   Overflow: ${styles.overflow}`);
      // console.log(`   ScrollHeight: ${el.scrollHeight}`);
      // console.log(`   ClientHeight: ${el.clientHeight}`);
      // console.log(`   CSS Rule to Remove: overflow-y: auto or overflow: auto`);
      // console.log('');
    });

    return illegal;
  }

  /**
   * DEBUG: Check why .window-content min-height is not 0
   */
  static debugWindowContentMinHeight(element) {
    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║      DEBUG: .WINDOW-CONTENT MIN-HEIGHT ISSUE                   ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const windowContent = element.querySelector('.window-content');

    if (!windowContent) {
      // console.log('ERROR: .window-content not found');
      return;
    }

    const styles = window.getComputedStyle(windowContent);
    const inlineStyle = windowContent.getAttribute('style');

    // console.log('Element: .window-content');
    // console.log(`Computed min-height: ${styles.minHeight}`);
    // console.log(`Computed height: ${styles.height}`);
    // console.log(`Inline style attribute: ${inlineStyle || '(none)'}`);
    // console.log(`Display: ${styles.display}`);
    // console.log(`Flex: ${styles.flex}`);
    // console.log(`Overflow: ${styles.overflow}`);
    // console.log(`ScrollHeight: ${windowContent.scrollHeight}`);
    // console.log(`ClientHeight: ${windowContent.clientHeight}`);
    // console.log(`OffsetHeight: ${windowContent.offsetHeight}`);

    // Report actual status
    if (styles.minHeight === '0px') {
      // console.log('\n✓ STATUS: min-height is correctly set to 0px (flex chain is working)');
    } else {
      // console.log(`\n⚠ PROBLEM: min-height is "${styles.minHeight}" instead of "0px"`);
      // console.log('To fix: Find the CSS rule that sets min-height and override it to `min-height: 0 !important`');
    }
  }

  /**
   * DEBUG: Measure the height constraint chain from window-content down to active tab
   * Identifies where the height constraint is lost
   */
  static debugHeightChain(element) {
    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║              DEBUG: HEIGHT CONSTRAINT CHAIN AUDIT               ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Define the expected chain
    const chainSelectors = [
      { selector: 'form.application.sheet', label: 'form.application.sheet (app root)' },
      { selector: '.window-content', label: '.window-content' },
      { selector: '.swse-character-sheet-wrapper', label: '.swse-character-sheet-wrapper' },
      { selector: '.swse-character-sheet-form', label: '.swse-character-sheet-form' },
      { selector: '.sheet-shell', label: '.sheet-shell (or .swse-sheet)' },
      { selector: '.sheet-body', label: '.sheet-body' },
      { selector: '.tab.active', label: '.tab.active' }
    ];

    let constraintBroken = false;
    let previousHeight = null;

    chainSelectors.forEach((item, idx) => {
      const el = element.closest('.application')?.querySelector(item.selector) || document.querySelector(item.selector);

      if (!el) {
        // console.log(`❌ NOT FOUND: ${item.label}`);
        return;
      }

      const styles = window.getComputedStyle(el);
      const isConstrained = el.clientHeight < el.scrollHeight;
      const heightLimited = previousHeight !== null && el.clientHeight <= previousHeight;

      // console.log(`\n[${idx + 1}] ${item.label}`);
      // console.log(`    Display: ${styles.display}`);
      // console.log(`    Flex: ${styles.flex || styles.flexGrow + ' ' + styles.flexShrink + ' ' + styles.flexBasis}`);
      // console.log(`    Min-height: ${styles.minHeight}`);
      // console.log(`    Height: ${styles.height}`);
      // console.log(`    Max-height: ${styles.maxHeight}`);
      // console.log(`    ClientHeight: ${el.clientHeight}`);
      // console.log(`    ScrollHeight: ${el.scrollHeight}`);
      // console.log(`    Is constrained: ${isConstrained ? 'YES (clientH < scrollH)' : 'NO (clientH >= scrollH)'}`);

      if (previousHeight !== null) {
        // console.log(`    Parent clientHeight: ${previousHeight}`);
        // console.log(`    Height limited by parent: ${heightLimited ? 'YES' : 'NO - AUTO-GROWING'}`);
        if (!heightLimited && !constraintBroken) {
          // console.log(`    ⚠️  CONSTRAINT CHAIN BREAKS HERE`);
          constraintBroken = true;
        }
      }

      previousHeight = el.clientHeight;
    });

    // console.log('\n╔════════════════════════════════════════════════════════════════╗');
    // console.log('║                         ANALYSIS                              ║');
    // console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      const styles = window.getComputedStyle(activeTab);
      if (activeTab.scrollHeight > activeTab.clientHeight) {
        // console.log('✓ Active tab HAS scrollable content (good)');
      } else {
        // console.log(`⚠️  Active tab is NOT constrained:`);
        // console.log(`    scrollHeight: ${activeTab.scrollHeight}`);
        // console.log(`    clientHeight: ${activeTab.clientHeight}`);
        // console.log(`    These should differ for scrolling to work`);
      }
    }
  }
}

export default CharacterSheetContractEnforcer;
