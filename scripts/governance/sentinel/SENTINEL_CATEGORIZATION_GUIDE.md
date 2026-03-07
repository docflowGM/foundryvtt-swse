# Sentinel Categorization & Source Location Guide

**Status:** Implementation-ready specification
**Last Updated:** 2026-03-07

---

## Overview

This guide explains how to use the new Sentinel categorization system to make reports more actionable for GMs and developers.

### Key Features

- **Categories**: 9 predefined categories covering all SWSE governance domains
- **Source Location**: Automatic file + line extraction from stack traces
- **Evidence Fields**: Structured context (selector, keyPath, template, partialId, packId, etc.)
- **Debug API**: `SWSE.debug.sentinel.*` commands for GM dashboard and JSON export

---

## 1. Using Categories in Reports

### Basic Report (Traditional)

```javascript
import { SentinelEngine } from "...sentinel-core.js";

SentinelEngine.report(
  "my-layer",
  SentinelEngine.SEVERITY.WARN,
  "Something went wrong",
  { extraData: "..." }
);
```

### Categorized Report (New)

```javascript
SentinelEngine.report(
  "my-layer",
  SentinelEngine.SEVERITY.WARN,
  "Character sheet abilities panel missing",
  { missingField: "system.abilities" },
  {
    category: "PARTIAL_HYDRATION",
    subcode: "MISSING_CONTEXT",
    evidence: {
      context Key: "abilities",
      panel: "abilities-panel",
      template: "character-sheet.hbs"
    }
  }
);
```

### Example: Store System Report

```javascript
// When a pack is missing
SentinelEngine.report(
  "mall-cop",
  SentinelEngine.SEVERITY.ERROR,
  "Store pack unavailable",
  { packName: "foundryvtt-swse.weapons" },
  {
    category: "STORE_MALL_COP",
    subcode: "PACK_MISSING",
    evidence: {
      packId: "foundryvtt-swse.weapons",
      reason: "not found in game.packs"
    }
  }
);
```

---

## 2. Available Categories

All categories defined in `sentinel-categories.js`:

### APPV2_CONTRACT
ApplicationV2 governance violations
- `MISSING_SUPER` — Missing super() in constructor
- `LIFECYCLE_VIOLATION` — Incorrect lifecycle method usage
- `DOM_OUTSIDE_RENDER` — DOM mutation outside _renderHTML()
- `INVALID_EXTENSION` — Not extending BaseSWSEAppV2
- `RENDER_TIMING` — DOM manipulation at wrong phase

### TABS
Tab system issues
- `TABGROUP_MISMATCH` — Tab definition not in tabGroups
- `SELECTOR_INVALID` — Tab selector doesn't match template
- `BINDING_FAILURE` — Tab click binding not working
- `DUPLICATE_ID` — Duplicate tab IDs
- `MISSING_CONTENT` — Tab panel empty

### PARTIAL_HYDRATION
Sheet hydration failures
- `EMPTY_PANEL` — Panel rendered without content
- `MISSING_CONTEXT` — Context key missing from _prepareContext()
- `MISSING_PARTIAL` — Partial include not found
- `MISSING_ARRAY` — Array field undefined (skills, inventory, etc.)
- `INCOMPLETE_DATA` — Partial data, sheet incomplete

### TEMPLATE_INTEGRITY
Handlebars template issues
- `UNCLOSED_BLOCK` — Unclosed {{#if/each/with}}
- `DUPLICATE_ID` — Duplicate element IDs
- `CASE_SENSITIVITY` — Partial name wrong case
- `MISSING_FILE` — Referenced partial doesn't exist
- `SYNTAX_ERROR` — Handlebars syntax error

### ROLL_PIPELINE
Roll governance violations
- `ENGINE_BYPASS` — Roll bypassed SWSEChat/engine
- `MISSING_FLAGS` — Roll missing SWSE governance flags
- `MISSING_ASYNC` — Roll not evaluated with async: true
- `DIRECT_TO_MESSAGE` — Direct roll.toMessage() call
- `MISSING_METADATA` — Roll missing metadata (source, modifiers)

### PERSISTENCE
Data persistence issues
- `UPDATE_FAILED` — actor.update() failed or not routed
- `WRONG_PATH` — Form field path doesn't match schema
- `NOT_SAVED` — Changes not persisted
- `STALE_DATA` — Sheet showing old data after update

### POSITION_STABILITY
Window position issues
- `WINDOW_JUMP` — Window repositioned unexpectedly
- `SETPOSITION_MISUSE` — setPosition() called wrongly
- `OFFSCREEN` — Window unreachable

### ATOMICITY
Update atomicity issues
- `UPDATE_BURST` — 3+ updates in 500ms
- `UPDATE_LOOP` — Field updated multiple times
- `NON_ATOMIC` — Updates not consolidated

### STORE_MALL_COP
Store system issues
- `PACK_MISSING` — Pack unavailable or empty
- `INDEX_AS_DOC` — Using pack index as document
- `CARD_MISSING_FIELDS` — Item card incomplete
- `PURCHASE_GOVERNANCE` — Purchase not validated
- `CACHE_STALE` — Store cache out of sync

---

## 3. Evidence Fields

Provide structured context to make reports actionable:

```javascript
// Template hydration issue
evidence: {
  template: "character-sheet.hbs",
  partial: "partials/abilities-panel.hbs",
  selector: "[data-tab=abilities]",
  missingKeys: ["system.abilities", "system.defenses"]
}

// Roll governance issue
evidence: {
  rollType: "attack",
  controlSelector: "[data-roll=attack]",
  engineCalled: false,
  cardMissingFields: ["swse.source", "swse.metadata"]
}

// Store issue
evidence: {
  packId: "foundryvtt-swse.weapons",
  itemCount: 0,
  missingFields: ["cost", "category"]
}

// Update atomicity issue
evidence: {
  actorId: actor.id,
  fieldCount: 5,
  updateCount: 3,
  duration: "245ms"
}
```

---

## 4. Source Location Extraction

### Automatic Stack Capture

For ERROR and CRITICAL severity, the report system automatically captures the call stack:

```javascript
// This will auto-capture stack and try to parse source location
SentinelEngine.report(
  "my-layer",
  SentinelEngine.SEVERITY.ERROR,  // Stack captured automatically
  "Critical issue",
  {},
  { category: "APPV2_CONTRACT" }
);
```

### Manual Stack Capture

```javascript
SentinelEngine.report(
  "my-layer",
  SentinelEngine.SEVERITY.WARN,
  "Issue with context",
  {},
  {
    captureStack: true,  // Force stack capture even for WARN
    category: "PARTIAL_HYDRATION"
  }
);
```

### Source Location Format

Parsed from stack: `{ file, line, column, function }`

Output in dashboard: `filename.js:150:20`

---

## 5. GM Debug Commands

### Dashboard (Categorized Report View)

```javascript
// Print categorized reports to console
SWSE.debug.sentinel.dashboard()

// Output:
// SYSTEM HEALTH: DEGRADED
// 14 total reports
//
// Partial Hydration (3)
//   [WARN] Character sheet abilities panel missing (character-sheet.js:150)
//   [WARN] Inventory context undefined (character-sheet.js:215)
//   ...
//
// Store System (2)
//   [ERROR] Store pack unavailable (mall-cop.js:75)
//   ...
```

### Health Status

```javascript
// Quick health snapshot
SWSE.debug.sentinel.health()

// Output:
// Health: DEGRADED
// Mode: DEV
// Total Reports: 14
```

### Export as JSON

```javascript
// Export all reports + metadata as JSON (copies to clipboard)
SWSE.debug.sentinel.export()

// Output (to clipboard):
// {
//   "metadata": {
//     "timestamp": "2026-03-07T15:30:00Z",
//     "worldName": "MyWorld",
//     "health": "DEGRADED"
//   },
//   "summary": { "totalReports": 14 },
//   "reports": [...],
//   "byCategory": {
//     "PARTIAL_HYDRATION": { "label": "Sheet Hydration", "total": 3 }
//   }
// }
```

### Clear Reports

```javascript
// Clear all reports (GM only, requires confirmation)
SWSE.debug.sentinel.clear()
```

---

## 6. Implementation Examples

### Sheet Hydration Layer (Updated)

```javascript
import { SentinelEngine } from "...sentinel-core.js";

export class SentinelSheetHydration {
  static monitorRender(app) {
    const element = app.element;
    if (!element) return;

    const appClass = app.constructor.name;

    // Check for missing content
    const skillRows = element.querySelectorAll(".skill-row");
    if (skillRows.length === 0) {
      const hasEmptyState = element.querySelector(".empty-state");

      if (!hasEmptyState) {
        SentinelEngine.report(
          "sheet-hydration",
          SentinelEngine.SEVERITY.WARN,
          `${appClass} skills panel missing content`,
          { appClass, hasEmptyState: false },
          {
            category: "PARTIAL_HYDRATION",
            subcode: "MISSING_ARRAY",
            evidence: {
              contextKey: "skills",
              selector: ".skill-row",
              panel: "skills"
            }
          }
        );
      }
    }
  }
}
```

### Roll Pipeline Layer (Updated)

```javascript
export class SentinelRollPipeline {
  static monitorChatMessage(message) {
    if (!message.rolls) return;

    const hasSwseFlags = message.flags?.swse !== undefined;
    if (!hasSwseFlags) {
      SentinelEngine.report(
        "roll-pipeline",
        SentinelEngine.SEVERITY.WARN,
        "Roll missing SWSE governance flags",
        { messageId: message.id },
        {
          category: "ROLL_PIPELINE",
          subcode: "MISSING_FLAGS",
          evidence: {
            rollType: message.rolls[0]?.formula,
            messageAuthor: message.author?.name,
            hasMetadata: message.flags?.swse?.metadata !== undefined
          }
        }
      );
    }
  }
}
```

---

## 7. Investigator Plugin Integration (Future)

When the Sentinel Investigator plugin is available:

```javascript
import { SentinelSourceMapper } from "...sentinel-source-mapper.js";

// Parse stack and enrich source location
const source = SentinelSourceMapper.enrich(report);

SentinelEngine.report(
  "layer",
  SentinelEngine.SEVERITY.ERROR,
  "Issue detected",
  { stack: new Error().stack },
  {
    category: "APPV2_CONTRACT",
    source: source  // { file, line, column, function }
  }
);
```

---

## 8. Performance Guidelines

### Sampling

Avoid reporting on every occurrence. Use aggregation:

```javascript
// Rate-limited to once per 50 occurrences
SentinelEngine.report(
  "layer",
  SentinelEngine.SEVERITY.WARN,
  "Common issue",
  { },
  {
    aggregateKey: "my-aggregation-key",
    sample: true,
    threshold: 50
  }
);
```

### Debouncing

Debounce high-frequency checks:

```javascript
static debounceTimers = new Map();

static monitorUpdate(actor) {
  const actorId = actor.id;

  if (this.debounceTimers.has(actorId)) {
    clearTimeout(this.debounceTimers.get(actorId));
  }

  const timer = setTimeout(() => {
    this._analyzeUpdate(actor);
    this.debounceTimers.delete(actorId);
  }, 250); // 250ms debounce window

  this.debounceTimers.set(actorId, timer);
}
```

---

## 9. Testing Your Categories

```javascript
// In console, verify categories work:
__SWSE_SENTINEL__.dashboard()  // Old API (if exists)
SWSE.debug.sentinel.dashboard()  // New API

// Verify export:
const exported = SWSE.debug.sentinel.export()
console.log(exported.byCategory)  // Should show summary by category
```

---

## 10. Checklist for Updating Layers

When updating a Sentinel layer to use categories:

- [ ] Import categories: `import { SENTINEL_CATEGORIES } from "...sentinel-categories.js"`
- [ ] Assign category to each report type
- [ ] Assign subcode (choose from category.subcodes)
- [ ] Provide evidence: selector, keyPath, template, partial, packId, etc.
- [ ] Use aggregateKey for rate-limiting
- [ ] Test with `SWSE.debug.sentinel.dashboard()`
- [ ] Verify evidence shows in output
- [ ] Check export includes category + subcode

---

## Next Steps

1. **Immediate**: Install debug API and test dashboard
2. **This sprint**: Update 3-4 passive layers with categories
3. **Next sprint**: Add Investigator enrichment for source mapping
4. **Future**: Webhooks to Discord/Slack for GM alerts

---

**Questions?** Check `sentinel-debug-api.js` for implementation details.
