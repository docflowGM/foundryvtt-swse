/**
 * SWSE Sentinel Layout Evaluator
 *
 * Runtime evaluator for CSS layout contract.
 * Validates elements against layout invariants and emits violations.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";
import {
  SentinelLayoutContract,
  SEVERITY_LEVELS,
  getRulesForSelector,
  getRuleById
} from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-layout-contract.js";

function getComputedFlex(el) {
  const cs = getComputedStyle(el);
  return cs.flex || `${cs.flexGrow} ${cs.flexShrink} ${cs.flexBasis}`;
}

function flexGrowValue(el) {
  const cs = getComputedStyle(el);
  return parseFloat(cs.flexGrow) || 0;
}

function shortSelector(el) {
  if (!(el instanceof Element)) return "<non-element>";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = [...el.classList].slice(0, 3).map(c => `.${c}`).join("");
  return `${tag}${id}${classes}`;
}

function styleSnapshot(el) {
  const cs = getComputedStyle(el);
  return {
    display: cs.display,
    flexDirection: cs.flexDirection,
    flex: cs.flex,
    flexGrow: cs.flexGrow,
    flexBasis: cs.flexBasis,
    minHeight: cs.minHeight,
    minWidth: cs.minWidth,
    maxHeight: cs.maxHeight,
    height: cs.height,
    overflowY: cs.overflowY,
    overflowX: cs.overflowX,
    position: cs.position
  };
}

function rectSnapshot(el) {
  const r = el.getBoundingClientRect();
  return {
    width: Math.round(r.width),
    height: Math.round(r.height)
  };
}

function isElementVisible(el) {
  if (!(el instanceof Element)) return false;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  if (el.closest("[hidden]")) return false;
  return true;
}

/**
 * Check if element violates a specific rule
 */
function checkRuleViolation(el, rule) {
  const violations = [];
  const cs = getComputedStyle(el);
  const rect = rectSnapshot(el);
  const selector = shortSelector(el);

  // Check required properties
  if (rule.require) {
    for (const [prop, expectedValue] of Object.entries(rule.require)) {
      let actual = cs[prop];
      let matches = false;

      if (prop === "flexGrowMin") {
        matches = flexGrowValue(el) >= expectedValue;
        if (!matches) {
          violations.push({
            prop: "flex-grow",
            expected: `>= ${expectedValue}`,
            actual: flexGrowValue(el),
            severity: "high"
          });
        }
      } else if (prop === "displayOneOf") {
        matches = expectedValue.includes(actual);
        if (!matches) {
          violations.push({
            prop: "display",
            expected: expectedValue,
            actual,
            severity: "high"
          });
        }
      } else if (prop === "minHeightOneOf" || prop === "minWidthOneOf") {
        const propName = prop.includes("Height") ? "minHeight" : "minWidth";
        const actualValue = cs[propName];
        matches = expectedValue.some(v => {
          if (v === "0px") return actualValue === "0px" || actualValue === "0";
          return actualValue === v;
        });
        if (!matches) {
          violations.push({
            prop: propName,
            expected: expectedValue,
            actual: actualValue,
            severity: "high"
          });
        }
      } else if (prop === "overflowYOneOf" || prop === "overflowXOneOf") {
        const propName = prop.includes("Y") ? "overflowY" : "overflowX";
        const actualValue = cs[propName];
        matches = expectedValue.includes(actualValue);
        if (!matches) {
          violations.push({
            prop: propName,
            expected: expectedValue,
            actual: actualValue,
            severity: "high"
          });
        }
      } else {
        actual = cs[prop];
        if (actual !== expectedValue) {
          violations.push({
            prop,
            expected: expectedValue,
            actual,
            severity: "high"
          });
        }
      }
    }
  }

  // Check forbidden properties
  if (rule.forbid) {
    for (const [prop, forbiddenValues] of Object.entries(rule.forbid)) {
      const actual = cs[prop];
      if (forbiddenValues.includes(actual)) {
        violations.push({
          prop,
          forbidden: forbiddenValues,
          actual,
          severity: "critical"
        });
      }
    }
  }

  // Check forbidden ancestor overflow
  if (rule.forbidAncestorOverflow) {
    let ancestor = el.parentElement;
    let depth = 0;
    while (ancestor && depth < 5) {
      const acs = getComputedStyle(ancestor);
      for (const [prop, forbiddenValues] of Object.entries(rule.forbidAncestorOverflow)) {
        const actual = acs[prop];
        if (forbiddenValues.includes(actual)) {
          violations.push({
            type: "ancestor-overflow-clips",
            ancestorSelector: shortSelector(ancestor),
            ancestorProp: prop,
            actual,
            severity: "high"
          });
        }
      }
      ancestor = ancestor.parentElement;
      depth++;
    }
  }

  // Check fixed heights
  if (rule.forbidFixedHeights) {
    const height = cs.height;
    const maxHeight = cs.maxHeight;
    const isFixed = (h) => {
      if (!h || h === "auto" || h === "0px" || h === "0") return false;
      if (h.includes("px")) {
        const val = parseFloat(h);
        return val > 0 && val !== 100; // 100px is fixed, 100% is not
      }
      return false;
    };

    if (isFixed(height)) {
      violations.push({
        prop: "height",
        actual: height,
        severity: "medium"
      });
    }
    if (isFixed(maxHeight)) {
      violations.push({
        prop: "max-height",
        actual: maxHeight,
        severity: "medium"
      });
    }
  }

  // Escalate severity if element has height: 0 but children present
  if (rule.checkHeight && rect.height === 0 && el.children.length > 0) {
    violations.forEach(v => {
      v.severity = "critical";
    });
  }

  return violations;
}

/**
 * Evaluate all rules against an element
 */
export function evaluateElement(el, app) {
  if (!isElementVisible(el)) return [];

  const selector = shortSelector(el);
  const violations = [];
  const rules = getRulesForSelector(selector);
  const cs = getComputedStyle(el);
  const rect = rectSnapshot(el);

  for (const rule of rules) {
    const ruleViolations = checkRuleViolation(el, rule);

    if (ruleViolations.length > 0) {
      let baseSeverity = SEVERITY_LEVELS[rule.severity] || 0;

      // Escalate if element is invisible
      if (rect.height === 0 && el.children.length > 0) {
        baseSeverity = Math.max(baseSeverity, SEVERITY_LEVELS.critical);
      }

      violations.push({
        ruleId: rule.id,
        ruleDescription: rule.description,
        ruleCategory: rule.category,
        severity: Object.keys(SEVERITY_LEVELS).find(k => SEVERITY_LEVELS[k] === baseSeverity),
        selector,
        rect,
        computed: styleSnapshot(el),
        violations: ruleViolations,
        likelyFix: rule.likelyFix,
        childCount: el.children.length,
        textLength: (el.textContent ?? "").trim().length,
        app: app ? shortSelector(app) : null
      });
    }
  }

  return violations;
}

/**
 * Evaluate all elements in an app
 */
export function evaluateApp(app) {
  if (!app || !app.element) return [];

  const violations = [];
  const criticalSelectors = [
    ".sheet-body",
    ".tab",
    ".tab-content",
    ".inventory-section",
    ".followers-section",
    ".biography-section",
    ".swse-section",
    ".swse-panel",
    "[data-tab]"
  ];

  for (const selector of criticalSelectors) {
    const elements = app.element.querySelectorAll(selector);
    for (const el of elements) {
      const elementViolations = evaluateElement(el, app);
      violations.push(...elementViolations);
    }
  }

  return violations;
}

/**
 * Report violations to Sentinel
 */
export function reportViolations(violations, appName) {
  for (const violation of violations) {
    const severityNum = SEVERITY_LEVELS[violation.severity] || 0;

    SentinelEngine.report(
      "layout-evaluator",
      severityNum,
      `${appName}: ${violation.ruleDescription} at ${violation.selector}`,
      {
        ruleId: violation.ruleId,
        ruleCategory: violation.category,
        selector: violation.selector,
        appName,
        rect: violation.rect,
        computed: violation.computed,
        violations: violation.violations,
        childCount: violation.childCount,
        textLength: violation.textLength,
        likelyFix: violation.likelyFix
      },
      {
        aggregateKey: `layout-eval-${appName}-${violation.ruleId}`,
        category: "layout-contract",
        subcode: violation.ruleId,
        source: "SentinelLayoutEvaluator.reportViolations()"
      }
    );
  }
}

export class SentinelLayoutEvaluator {
  static init() {
    SentinelEngine.registerLayer("layout-evaluator", {
      enabled: true,
      readOnly: true,
      description: "CSS Layout Contract validator against Foundry V13 invariants",
      init: () => {
        console.log("[SWSE Sentinel] Layout-Evaluator layer ready");
      }
    });

    console.log("[SWSE Sentinel] Layout-Evaluator layer initialized");
  }

  /**
   * Evaluate a sheet against layout contract
   */
  static validateSheet(sheet, appName) {
    if (!sheet || !sheet.element) return [];

    const violations = evaluateApp(sheet);
    if (violations.length > 0) {
      reportViolations(violations, appName);
    }
    return violations;
  }

  /**
   * Get contract rules
   */
  static getContract() {
    return SentinelLayoutContract;
  }

  /**
   * Get rule by ID
   */
  static getRule(ruleId) {
    return getRuleById(ruleId);
  }
}

// Auto-init on system ready
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    if (game.settings.get?.("foundryvtt-swse", "sentinelLayoutEvaluator") ?? false) {
      SentinelLayoutEvaluator.init();

      // Hook into sheet renders to validate contract
      Hooks.on("renderApplicationV2", (app) => {
        if (app.constructor.name.includes("Sheet")) {
          SentinelLayoutEvaluator.validateSheet(app, app.constructor.name);
        }
      });

      console.log("[SWSE Sentinel] Layout evaluator active");
    }
  });
}
