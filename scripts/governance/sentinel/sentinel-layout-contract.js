/**
 * SWSE Sentinel Layout Contract
 *
 * Machine-readable CSS layout invariants for Foundry V13 / ApplicationV2 sheets.
 * Defines what every app/sheet MUST satisfy so partials don't become invisible.
 *
 * Contract rules are evaluated at runtime against computed styles and DOM metrics.
 * Violations are reported to Sentinel with severity levels and actionable fixes.
 */

export const SentinelLayoutContract = {
  /**
   * Contract metadata
   */
  version: "1.0.0",
  target: "Foundry V13 / ApplicationV2 + SWSE Sheets",
  purpose: "Prevent layout collapse causing invisible/squished/clipped content",

  /**
   * Layout invariant rules
   * Each rule defines:
   * - id: Canonical rule identifier
   * - severity: How bad it is if violated (low, medium, high, critical)
   * - selector: CSS selectors to check
   * - require: Required computed style properties
   * - forbid: Forbidden style properties
   * - forbidAncestor: Forbidden properties on ancestors
   * - minChildren: Minimum child count before severity escalates
   */
  rules: [
    {
      id: "LAYOUT_ROOT_FLEX_COLUMN",
      severity: "high",
      category: "structural",
      description: "Root app/sheet must be flex column",
      selectors: [".swse-app", ".swse-sheet", ".app"],
      require: {
        display: "flex",
        flexDirection: "column"
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }
    },

    {
      id: "LAYOUT_WINDOW_CONTENT_FLEX",
      severity: "high",
      category: "structural",
      description: "Window content wrapper must support vertical growth",
      selectors: [".window-content"],
      require: {
        display: "flex",
        flexDirection: "column",
        minHeightOneOf: ["0px", "0"]
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        minHeight: "0"
      }
    },

    {
      id: "LAYOUT_SHEET_BODY_GROWS",
      severity: "critical",
      category: "structural",
      description: "Sheet body must expand and contain tabs/content",
      selectors: [".sheet-body", ".swse-sheet-body"],
      require: {
        display: "flex",
        flexDirection: "column",
        flexGrowMin: 1,
        minHeightOneOf: ["0px", "0"],
        minWidthOneOf: ["0px", "0"]
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        flex: "1",
        minHeight: "0",
        minWidth: "0"
      }
    },

    {
      id: "LAYOUT_TABS_NAV_FIXED",
      severity: "medium",
      category: "structural",
      description: "Tab navigation should not consume flex space",
      selectors: [".sheet-tabs", ".swse-tabs", "nav[data-tab-group]"],
      require: {
        flex: "0 0 auto"
      },
      likelyFix: {
        flex: "0 0 auto"
      },
      warnIfGrowing: true
    },

    {
      id: "LAYOUT_TAB_CONTENT_EXPANDS",
      severity: "critical",
      category: "structural",
      description: "Tab content wrapper must expand to fill available space",
      selectors: [".tab-content", ".swse-tab-content"],
      require: {
        display: "flex",
        flexDirection: "column",
        flexGrowMin: 1,
        minHeightOneOf: ["0px", "0"],
        minWidthOneOf: ["0px", "0"]
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        flex: "1",
        minHeight: "0",
        minWidth: "0"
      }
    },

    {
      id: "LAYOUT_TAB_PANEL_SCROLLABLE",
      severity: "critical",
      category: "content",
      description: "Active tab panels must be able to scroll when content overflows",
      selectors: [".tab", ".tab-panel", ".swse-tab-panel", "[data-tab]"],
      require: {
        flexGrowMin: 1,
        minHeightOneOf: ["0px", "0"],
        minWidthOneOf: ["0px", "0"],
        overflowYOneOf: ["auto", "scroll"]
      },
      likelyFix: {
        flex: "1",
        minHeight: "0",
        minWidth: "0",
        overflowY: "auto"
      },
      checkHeight: true
    },

    {
      id: "LAYOUT_PARTIAL_SELF_STABLE",
      severity: "medium",
      category: "content",
      description: "Partials must be self-contained layout containers",
      selectors: [".swse-partial", ".swse-section", ".swse-panel", "[data-partial]"],
      require: {
        displayOneOf: ["flex", "grid"],
        minHeightOneOf: ["0px", "0"],
        minWidthOneOf: ["0px", "0"]
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        minHeight: "0",
        minWidth: "0"
      }
    },

    {
      id: "LAYOUT_DYNAMIC_SECTION_VISIBLE",
      severity: "critical",
      category: "content",
      description: "Dynamic sections (inventory, followers, biography) must not collapse",
      selectors: [
        ".inventory-section",
        ".inventory-list",
        ".followers-section",
        ".follower-list",
        ".biography-section",
        ".swse-list"
      ],
      require: {
        displayOneOf: ["flex", "grid"],
        minHeightOneOf: ["0px", "0"]
      },
      likelyFix: {
        display: "flex",
        flexDirection: "column",
        minHeight: "0"
      },
      checkHeight: true,
      checkChildren: true
    },

    {
      id: "LAYOUT_ANCESTOR_OVERFLOW_CLIPS",
      severity: "high",
      category: "structural",
      description: "Structural ancestors must not clip content with overflow: hidden",
      selectors: [
        ".sheet-body",
        ".tab-content",
        ".tab",
        ".swse-section",
        ".inventory-section",
        ".followers-section"
      ],
      forbidAncestorOverflow: {
        overflowY: ["hidden"],
        overflowX: ["hidden"]
      },
      likelyFix: "Remove overflow: hidden; use overflow-y: auto on scrollable children instead"
    },

    {
      id: "LAYOUT_FIXED_HEIGHT_STRUCTURAL",
      severity: "medium",
      category: "structural",
      description: "Structural nodes must not use fixed heights",
      selectors: [
        ".sheet-body",
        ".tab-content",
        ".tab",
        ".swse-section"
      ],
      forbidFixedHeights: true,
      likelyFix: "Replace fixed height with flex: 1 or min-height: 0"
    },

    {
      id: "LAYOUT_ABSOLUTE_STRUCTURAL_NODE",
      severity: "critical",
      category: "structural",
      description: "Structural content nodes must not be absolutely positioned",
      selectors: [
        ".sheet-body",
        ".tab-content",
        ".tab",
        ".swse-section",
        ".inventory-section",
        ".followers-section"
      ],
      forbid: {
        position: ["absolute", "fixed"]
      },
      likelyFix: "Use normal flow layout instead of absolute positioning"
    },

    {
      id: "LAYOUT_MIN_WIDTH_ZERO_REQUIRED",
      severity: "medium",
      category: "structural",
      description: "Flex row descendants must allow horizontal shrinkage",
      selectors: [".swse-section", ".swse-panel", "[data-partial]"],
      require: {
        minWidthOneOf: ["0px", "0"]
      },
      likelyFix: {
        minWidth: "0"
      },
      onlyIfParentFlexRow: true
    }
  ]
};

/**
 * Severity levels
 */
export const SEVERITY_LEVELS = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

/**
 * Get all rules
 */
export function getAllRules() {
  return SentinelLayoutContract.rules;
}

/**
 * Get rule by ID
 */
export function getRuleById(id) {
  return SentinelLayoutContract.rules.find(r => r.id === id);
}

/**
 * Get rules for a selector
 */
export function getRulesForSelector(selector) {
  return SentinelLayoutContract.rules.filter(rule =>
    rule.selectors.some(s => selector.includes(s))
  );
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity) {
  const level = SEVERITY_LEVELS[severity] ?? 0;
  return SentinelLayoutContract.rules.filter(r =>
    SEVERITY_LEVELS[r.severity] >= level
  );
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category) {
  return SentinelLayoutContract.rules.filter(r => r.category === category);
}

/**
 * Get base CSS that satisfies all contracts
 */
export function getBaseCSS() {
  return `
/* SWSE Layout Contract Base CSS */

/* 1. Root containers */
.swse-app, .swse-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* 2. Window content */
.swse-app .window-content,
.swse-sheet .window-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 3. Sheet body (primary growing container) */
.swse-sheet-body,
.sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* 4. Tab navigation (fixed space) */
.swse-tabs,
.sheet-tabs,
nav[data-tab-group] {
  flex: 0 0 auto;
}

/* 5. Tab content wrapper (grows) */
.swse-tab-content,
.tab-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* 6. Tab panels (scrollable) */
.swse-tab-panel,
.tab,
[data-tab] {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
}

/* 7. Sections and partials (self-stable) */
.swse-section,
.swse-panel,
.swse-partial,
[data-partial] {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* 8. Dynamic sections (inventory, followers, etc.) */
.inventory-section,
.inventory-list,
.followers-section,
.follower-list,
.biography-section,
.swse-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* 9. Prevent overflow clipping */
.sheet-body,
.tab-content,
.tab,
.swse-section {
  overflow: visible;
}

.tab,
.swse-tab-panel,
.inventory-section {
  overflow-y: auto;
}
`;
}
