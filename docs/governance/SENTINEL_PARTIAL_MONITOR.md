# SENTINEL PARTIAL MONITOR

**Runtime Contract Enforcement for Partials and Subpartials**

---

## WHAT IS SENTINEL?

Sentinel is an in-game supervisor that watches panel rendering and detects contract violations at runtime. It answers:

- **Before Render:** Is this panel context valid? Do all rows have required fields? Is data properly typed?
- **After Render:** Does the rendered DOM match expected structure? Are all post-render assertions passing?
- **Continuously:** Are there orphaned panels in the registry? Are subpartials receiving correct data shapes?

Sentinel catches violations **in-game**, making them visible to developers immediately, not after users report issues.

---

## VIOLATION CATEGORIES

Sentinel detects violations across five categories:

### 1. Context Contract Violations

**Detected:** Panel context missing required keys or has wrong types

```
Example:
  healthPanel missing required key: "currentHealth"

Fix:
  Ensure builder returns all declared required keys
  Check buildHealthPanel() returns {currentHealth, maxHealth, ...}
```

### 2. Row Shape Violations (Ledger Panels)

**Detected:** Ledger entry missing required fields (id, name, img, type, etc.)

```
Example:
  inventoryPanel row 3 missing required field: "uuid"

Fix:
  Ensure row transformer produces all required fields
  Check transformInventoryItemRow() includes uuid in output
```

### 3. Forbidden Pattern Violations

**Detected:** Panel using direct actor.system access instead of panel context

```
Example:
  Panel context has suspicious key: "system" (likely copied from actor)

Fix:
  Builder should not copy raw actor.system into panel context
  Provide only needed data through builder
```

### 4. SVG/Layout Violations

**Detected:** SVG panel missing safe area, anchors, or layer structure

```
Example:
  SVG panel missing safeArea definition

Fix:
  Add safeArea {x, y, width, height} to builder output
  Define anchor points for socketed controls
```

### 5. Subpartial Data Violations

**Detected:** Subpartial receiving wrong data type or missing expected fields

```
Example:
  inventory-row-subpartial expects row but received parent context

Fix:
  Pass row object to subpartial: {{> inventory-row-subpartial row}}
  Not: {{> inventory-row-subpartial inventoryPanel}}
```

---

## SEVERITY LEVELS

Sentinel uses four severity levels:

| Level | Meaning | Action |
|-------|---------|--------|
| **info** | Diagnostic information | Log only (optional) |
| **warn** | Recoverable issue, panel may be degraded | Log and monitor |
| **error** | Contract violation, panel likely broken | Log and throw in strict mode |
| **critical** | Systemic issue, panel unrenderable | Always throw (stop render) |

---

## HOW TO USE SENTINEL

### For Sheet Developers

Sentinel runs automatically during sheet rendering. In **development/strict mode**:

```javascript
CONFIG.SWSE.sheets.v2.strictMode = true
```

Violations throw errors and stop rendering:
```
Error: Sentinel: healthPanel contract violation
  Missing required key: "currentHealth"
  ➜ Ensure builder returns all required keys
```

In **production mode** (`strictMode = false`):
- Violations logged as warnings
- Sheet renders with degraded functionality
- Panels marked with `.swse-contract-broken` CSS class

### For Reviewing Violations

Query violations during development:

```javascript
// Get all violations
const violations = Sentinel.getViolations();

// Log violations with details
Sentinel.logViolations();

// Get summary
const summary = Sentinel.getViolationSummary();
// {
//   total: 3,
//   byCategory: {
//     'context-contract-violation': 2,
//     'row-contract-violation': 1
//   },
//   bySeverity: {
//     error: 2,
//     warn: 1,
//     info: 0,
//     critical: 0
//   }
// }
```

### Manually Validating During Development

Use integration helpers in builders:

```javascript
function buildHealthPanel(actor) {
  const context = {
    currentHealth: actor.system.health.value,
    maxHealth: actor.system.health.max,
    isDamaged: actor.system.health.value < actor.system.health.max
  };

  // Manually validate before returning
  SentinelIntegration.validatePanelBeforeRender(
    'character',
    'healthPanel',
    context,
    actor
  );

  return context;
}
```

Validate rows before assigning:

```javascript
function buildInventoryPanel(actor) {
  const entries = actor.items.map(item => transformInventoryItemRow(item, actor));

  // Validate all rows
  SentinelIntegration.validateRowsBeforeRender(
    entries,
    'inventoryPanel',
    'character'
  );

  return {entries, hasEntries: entries.length > 0};
}
```

Validate SVG panels:

```javascript
function buildPortraitPanel(actor) {
  const context = {
    imagePath: actor.img,
    dimensions: {width: 300, height: 400},
    safeArea: {x: 50, y: 50, width: 200, height: 300},
    anchors: {...}
  };

  SentinelIntegration.validateSvgPanelBeforeRender(context, 'portraitPanel');

  return context;
}
```

---

## VISUAL DEV OVERLAY

In **strict mode**, broken panels show a visual warning banner:

```
⚠️ Sentinel: healthPanel contract violation
```

CSS classes applied:
- `.swse-contract-broken` — Added to broken panel
- `.swse-violation-banner` — Injected warning banner
- `.violation-icon` — Warning symbol
- `.violation-text` — Violation message

Styling example:

```css
.swse-contract-broken {
  border: 2px solid #ff6600;
  background-color: rgba(255, 102, 0, 0.1);
  position: relative;
}

.swse-violation-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #ff6600;
  color: white;
  font-weight: bold;
  font-size: 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.violation-icon {
  font-size: 14px;
}
```

---

## COMMON VIOLATIONS AND FIXES

### Violation: Missing Required Key

```
Error: healthPanel missing required key: "woundThreshold"
```

**Root Cause:** Builder forgot to include a key declared in PANEL_REGISTRY.contextContract.required

**Fix:**
1. Check PANEL_REGISTRY for declared required keys
2. Add missing key to builder output
3. Ensure key is not undefined

```javascript
// Before (broken)
function buildHealthPanel(actor) {
  return {
    currentHealth: actor.system.health.value,
    maxHealth: actor.system.health.max
    // Missing: woundThreshold
  };
}

// After (fixed)
function buildHealthPanel(actor) {
  return {
    currentHealth: actor.system.health.value,
    maxHealth: actor.system.health.max,
    woundThreshold: actor.system.health.woundThreshold
  };
}
```

### Violation: Row Missing Field

```
Error: inventoryPanel row 2 missing required field: "id"
```

**Root Cause:** Row transformer not producing all required fields

**Fix:**
1. Check row transformer for missing field
2. Add field extraction/mapping
3. Test transformer with sample data

```javascript
// Before (broken)
function transformInventoryItemRow(item) {
  return {
    name: item.name,
    img: item.img,
    // Missing: id, uuid, type, cssClass, canEdit, canDelete
  };
}

// After (fixed)
function transformInventoryItemRow(item) {
  return {
    id: item._id,
    uuid: item.uuid,
    name: item.name,
    img: item.img,
    type: item.type,
    cssClass: `row--${item.type}`,
    canEdit: true,
    canDelete: true,
    display: {qty: item.system.quantity}
  };
}
```

### Violation: Forbidden Actor.system Access

```
Warn: Panel context has suspicious key: "system"
```

**Root Cause:** Builder copied actor.system directly into panel context

**Fix:**
1. Don't copy raw actor properties
2. Extract only needed values
3. Provide filtered/transformed data

```javascript
// Before (problematic)
function buildAbilitiesPanel(actor) {
  return {
    system: actor.system,  // Copying raw actor.system!
    abilities: actor.system.abilities
  };
}

// After (correct)
function buildAbilitiesPanel(actor) {
  return {
    abilities: {
      strength: {score: actor.system.abilities.strength.value, ...},
      dexterity: {score: actor.system.abilities.dexterity.value, ...},
      // ... other abilities
    }
  };
}
```

### Violation: SVG Safe Area Missing

```
Error: SVG panel missing safeArea definition
```

**Root Cause:** SVG panel builder didn't define content boundaries

**Fix:**
1. Determine safe area (avoid art hotspots)
2. Define x, y, width, height
3. Add to builder output

```javascript
// Before (broken)
function buildPortraitPanel(actor) {
  return {
    imagePath: actor.img,
    dimensions: {width: 300, height: 400}
    // Missing safeArea
  };
}

// After (fixed)
function buildPortraitPanel(actor) {
  return {
    imagePath: actor.img,
    dimensions: {width: 300, height: 400},
    safeArea: {
      x: 50,      // Left margin
      y: 100,     // Top margin
      width: 200, // Usable width
      height: 250,// Usable height
      description: 'Character torso and face area'
    },
    anchors: {...}
  };
}
```

### Violation: Subpartial Data Mismatch

```
Warn: inventory-row-subpartial expects row but received parent context
```

**Root Cause:** Template passing wrong data to subpartial

**Fix:**
1. Check subpartial contract (dataSource should be 'row')
2. Pass row object, not parent context
3. Template loop should pass each row

```handlebars
<!-- Before (wrong) -->
{{#each inventoryPanel.entries}}
  {{>inventory-row-subpartial inventoryPanel}}
{{/each}}

<!-- After (correct) -->
{{#each inventoryPanel.entries}}
  {{>inventory-row-subpartial this}}
{{/each}}
```

---

## MONITORING IN STRICT MODE

When `CONFIG.SWSE.sheets.v2.strictMode = true`:

1. **Contract violations throw errors** (sheet won't render)
2. **Visual overlay injected** (red border + warning banner)
3. **Console errors logged** (with recommendations)
4. **No degraded render** (panel is broken, not partial)

This is for **development only**. Use to catch bugs before release.

### Enable Strict Mode

```javascript
// In Foundry console
CONFIG.SWSE.sheets.v2.strictMode = true;

// Reload sheet
// Violations will throw and stop rendering
```

### Disable Strict Mode

```javascript
CONFIG.SWSE.sheets.v2.strictMode = false;

// Reload sheet
// Violations logged as warnings, sheet renders (degraded)
```

---

## REGISTRY AUDIT

Sentinel can audit registry consistency periodically:

```javascript
// Audit registry
const consistencyOk = SentinelIntegration.auditRegistryConsistency();

if (!consistencyOk) {
  console.warn('Registry has consistency issues');
  // Issues logged automatically
}
```

Audit checks:
- ✓ All panels have matching builders/validators/templates
- ✓ Builder names follow convention
- ✓ Validator names follow convention
- ✓ Templates point to actual files
- ✓ Subpartials properly documented
- ✓ Required keys aligned between registry and builder

---

## BEST PRACTICES

### 1. Always Test Builders in Strict Mode

Before committing:
```javascript
CONFIG.SWSE.sheets.v2.strictMode = true;
// Open sheet and verify no errors
// Fix any violations before submitting PR
```

### 2. Register New Panels Immediately

Register in PANEL_REGISTRY before or alongside builder:
```javascript
PANEL_REGISTRY.panels.newPanel = {
  name: 'newPanel',
  builderName: 'buildNewPanel',
  validatorName: 'validateNewPanel',
  templatePath: 'templates/v2/character/panels/new-panel.hbs',
  contextContract: {
    required: ['field1', 'field2'],
    optional: []
  }
};
```

### 3. Keep Row Transformers Simple and Idempotent

Test transformer with same data twice:
```javascript
const row1 = transformInventoryItemRow(item);
const row2 = transformInventoryItemRow(item);
// row1 === row2 (idempotent)
```

### 4. Always Document Context Contracts

Comments in builder explain what fields panel provides:
```javascript
/**
 * Build health panel
 * @returns {object} Context with:
 *   - currentHealth (number): Current HP
 *   - maxHealth (number): Maximum HP
 *   - woundThreshold (number): Wound threshold
 *   - conditions (array): Condition objects
 */
function buildHealthPanel(actor) { ... }
```

### 5. Test with Edge Cases

Verify builder handles missing/undefined properties:
```javascript
// Test with empty actor
const minimalActor = {system: {}};
const context = buildHealthPanel(minimalActor);
// Should not crash, should have fallback values
```

---

## TROUBLESHOOTING

### Q: "Sentinel: Panel not registered" error

**A:** Panel exists but not in PANEL_REGISTRY.

**Fix:**
1. Check PANEL_REGISTRY has entry
2. Check panel name matches (camelCase)
3. Check sheet type is correct

### Q: "Missing required key" keeps appearing

**A:** Builder not returning declared required key.

**Fix:**
1. Check PANEL_REGISTRY.contextContract.required
2. Add all keys to builder output
3. Don't let any key be undefined

### Q: Visual overlay showing but violations unclear

**A:** Check console logs for Sentinel messages.

**Fix:**
```javascript
// In console
SentinelIntegration.getViolations(true); // Log all violations
```

### Q: Strict mode errors preventing development

**A:** Sentinel caught a real bug; fix it before proceeding.

**Fix:**
1. Read error message and recommendation
2. Apply fix to builder/transformer/template
3. Reload sheet

### Q: Too many warnings in production mode

**A:** Normal; Sentinel is catching violations that would break sheets for players.

**Fix:**
1. Review violations
2. Fix critical violations first
3. Deploy fix in next release

---

## SUMMARY

Sentinel provides:

✅ **Automatic contract enforcement** during sheet rendering
✅ **Clear violation messages** with recommendations
✅ **Visual dev overlay** for broken panels in strict mode
✅ **Registry auditing** to catch misalignment
✅ **Subpartial monitoring** to prevent data shape mismatches
✅ **SVG panel validation** for art-backed panels
✅ **Flexible severity levels** (info/warn/error/critical)

Use Sentinel to:
- Catch violations early (in dev, not after release)
- Understand what's broken and how to fix it
- Prevent future drift from contract standards
- Maintain long-term code quality

---

**Version:** 1.0
**Last Updated:** 2026-03-29
