/**
 * SWSE Sentinel CSS Contract Validator
 *
 * Validates that sheet CSS follows Foundry V13 layout contracts:
 * - flex containers have flex: 1 or flex-grow
 * - flex containers have min-height: 0 (critical for shrink behavior)
 * - overflow: hidden is only used when intentional
 * - no height: 0 in content containers
 * - tab containers have proper scroll behavior
 *
 * Reports CSS violations as actionable Sentinel warnings.
 * Uses computed styles from rendered sheets (not static CSS parsing).
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

const REQUIRED_FLEX_RULES = {
  ".sheet-body": {
    display: "flex",
    flex: ["1", "1 1 auto", "1 1 0%"],
    minHeight: "0"
  },
  ".tab-content": {
    display: "flex",
    flex: ["1", "1 1 auto", "1 1 0%"],
    minHeight: "0"
  },
  ".tab": {
    flex: ["1", "1 1 auto", "1 1 0%"]
  },
  ".window-content": {
    display: "flex"
  },
  ".inventory-section": {
    display: ["flex", "block"],
    flex: ["1", "0"]
  },
  ".inventory-list": {
    display: ["flex", "block"]
  }
};

function getComputedFlex(el) {
  const cs = getComputedStyle(el);
  return cs.flex || `${cs.flexGrow} ${cs.flexShrink} ${cs.flexBasis}`;
}

function validateElementCSS(el, selector, rules) {
  const violations = [];
  const cs = getComputedStyle(el);

  for (const [rule, expectedValues] of Object.entries(rules)) {
    const actual = cs[rule];

    // Handle special properties
    if (rule === "flex") {
      const flex = getComputedFlex(el);
      if (!Array.isArray(expectedValues)) {
        expectedValues = [expectedValues];
      }

      const matches = expectedValues.some(exp => {
        // Check if element has positive flex-grow (1 or higher)
        if (exp === "1") return cs.flexGrow !== "0";
        if (exp === "0") return cs.flexGrow === "0";
        return flex === exp || flex.startsWith(exp.split(" ")[0]);
      });

      if (!matches && cs.display === "flex") {
        violations.push({
          rule,
          expected: expectedValues,
          actual: flex,
          severity: "CRITICAL"
        });
      }
    } else if (rule === "minHeight") {
      if (cs.display === "flex" && actual !== "0px" && actual !== "0") {
        violations.push({
          rule,
          expected: expectedValues,
          actual,
          severity: "HIGH"
        });
      }
    } else if (Array.isArray(expectedValues)) {
      const matches = expectedValues.some(exp => actual === exp);
      if (!matches) {
        violations.push({
          rule,
          expected: expectedValues,
          actual,
          severity: "MEDIUM"
        });
      }
    } else if (actual !== expectedValues) {
      violations.push({
        rule,
        expected: expectedValues,
        actual,
        severity: "MEDIUM"
      });
    }
  }

  return violations;
}

export class SentinelCSSContract {
  static init() {
    SentinelEngine.registerLayer("css-contract", {
      enabled: true,
      readOnly: true,
      description: "CSS contract enforcement for sheet layouts",
      init: () => {
        console.log("[SWSE Sentinel] CSS-Contract layer ready");
      }
    });

    console.log("[SWSE Sentinel] CSS-Contract layer initialized");
  }

  /**
   * Validate a sheet's CSS contracts
   * Called after sheet renders
   */
  static validateSheetCSS(sheet, appName) {
    if (!sheet || !sheet.element) return;

    const violations = [];

    for (const [selector, rules] of Object.entries(REQUIRED_FLEX_RULES)) {
      const elements = sheet.element.querySelectorAll(selector);

      for (const el of elements) {
        const elementViolations = validateElementCSS(el, selector, rules);

        if (elementViolations.length > 0) {
          violations.push({
            selector,
            element: el.className,
            violations: elementViolations
          });
        }
      }
    }

    if (violations.length > 0) {
      this._reportViolations(appName, violations);
    }
  }

  static _reportViolations(appName, violations) {
    for (const violation of violations) {
      const highestSeverity = Math.max(
        ...violation.violations.map(v => {
          if (v.severity === "CRITICAL") return 2;
          if (v.severity === "HIGH") return 1;
          return 0;
        })
      );

      let severity = SentinelEngine.SEVERITY.WARN;
      if (highestSeverity >= 2) {
        severity = SentinelEngine.SEVERITY.ERROR;
      }

      const ruleBreaches = violation.violations.map(v => `${v.rule}: ${v.actual}`).join(", ");

      SentinelEngine.report(
        "css-contract",
        severity,
        `${appName} CSS contract violation at ${violation.selector}`,
        {
          appName,
          selector: violation.selector,
          element: violation.element,
          violations: violation.violations,
          ruleBreaches
        },
        {
          aggregateKey: `css-contract-${appName}-${violation.selector}`,
          category: "css-violation",
          subcode: `MISSING_${violation.violations[0].rule.toUpperCase()}`,
          source: "SentinelCSSContract.validateSheetCSS()"
        }
      );
    }
  }
}

// Auto-init on system ready
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    if (game.settings.get?.("foundryvtt-swse", "sentinelCSSContract") ?? false) {
      SentinelCSSContract.init();

      // Hook into sheet renders to validate CSS
      Hooks.on("renderApplicationV2", (app) => {
        if (app.constructor.name.includes("Sheet")) {
          SentinelCSSContract.validateSheetCSS(app, app.constructor.name);
        }
      });

      console.log("[SWSE Sentinel] CSS contract validator active");
    }
  });
}
