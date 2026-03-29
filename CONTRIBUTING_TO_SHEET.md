# Contributing to the SWSE V2 Character Sheet

Welcome! This guide explains how to safely extend and maintain the SWSE V2 character sheet architecture.

## Quick Start for Contributors

### Understanding the Architecture

The sheet uses a **panelized, contract-driven** architecture:

1. **Builders** shape actor data into panel view models
2. **Templates** display panel contexts without modification
3. **Validators** enforce contracts at multiple layers
4. **Assertions** verify render output matches expectations

This separation prevents:
- Data structure guessing
- Silent failures
- Template sprawl
- Regression of architecture

### Core Concepts

**Panel Context:** A normalized view model for one section (e.g., healthPanel, inventoryPanel)

**Builder:** Function that transforms actor data into a panel context (buildHealthPanel())

**Validator:** Function that checks a panel context matches its contract (validateHealthPanel())

**Contract:** The required and optional keys for a panel, defined in PANEL_REGISTRY

---

## Common Tasks

### I Want to Change How a Panel Displays

#### ❌ DON'T modify the template alone
Templates should trust that builders provide correct data.

#### ✅ DO this instead:

1. **Understand the panel flow:**
   - Check SHEET_MANIFEST.md for the panel
   - Find its builder (e.g., buildHealthPanel)
   - Find its template (e.g., hp-condition-panel.hbs)

2. **If it's a data issue:**
   - Modify the builder in PanelContextBuilder.js
   - Example: `healthPanel.hp.displayText = ...`
   - Run: `CONFIG.SWSE.strictMode = true` and reload to test

3. **If it's a display issue:**
   - Modify the template (it can trust panel data)
   - Don't add logic—the builder should have normalized it
   - Example: Use `{{healthPanel.hp.percent}}` not `{{actor.system.hp.value / actor.system.hp.max}}`

4. **Add to validator if needed:**
   - If you added a new key to the panel, add to requiredKeys/optionalKeys in PANEL_REGISTRY
   - Add validation logic in PanelValidators.js

### I Want to Add a New Panel

See **SHEET_MANIFEST.md** "How to Add a New Panel" section.

Steps:
1. Add entry to PANEL_REGISTRY.js
2. Create builder in PanelContextBuilder.js
3. Create validator in PanelValidators.js
4. Create template (using panel context, not raw actor data)
5. Include template in master sheet template
6. Run verification: `node scripts/verify-panel-alignment.js`

### I Want to Add a New Row/Entry Type

Example: Adding a new item category to inventory.

1. **Define in PANEL_REGISTRY:**
   ```javascript
   rowContract: {
     type: 'YourRowType',
     shape: ['id', 'name', 'system.value', ...],
     ...
   }
   ```

2. **Normalize in builder:**
   - Transform raw items into your row shape
   - Ensure all required fields exist
   - Compute any display values

3. **Validate in validator:**
   - Check array structure
   - Validate each row has required fields
   - Test with CONFIG.SWSE.strictMode = true

4. **Render in template:**
   - Iterate the array
   - Trust the builder has normalized data
   - Don't add computation in template

### I Found a Bug in the Sheet Display

1. **Enable debug mode:**
   ```javascript
   game.swse.toggleLayoutDebug()
   ```

2. **Enable strict mode:**
   ```javascript
   CONFIG.SWSE.strictMode = true
   // Reload sheet
   ```

3. **Check console for errors:**
   - Missing required keys?
   - Validator failures?
   - PostRender assertion failures?

4. **Identify the layer:**
   - Builder issue? → Fix in PanelContextBuilder.js
   - Validator issue? → Fix in PanelValidators.js
   - Template issue? → Fix in template, verify it uses panel context
   - Layout issue? → Check CSS geometry variables

5. **Create a test:**
   - Minimal example that reproduces issue
   - Test with strict mode enabled
   - Verify fix with debug mode

### I Want to Understand the Data Flow

Check the code in this order:

1. **Source:** `scripts/sheets/v2/character-sheet.js`
   - Line ~906: `panelBuilder.buildAllPanels()`
   - This calls all 14 builders and returns panel contexts

2. **Builders:** `scripts/sheets/v2/context/PanelContextBuilder.js`
   - Shows how raw actor data becomes panel context
   - Each `buildXPanel()` function shapes data
   - Call `_validatePanelContext()` to enforce contract

3. **Validation:** `scripts/sheets/v2/context/PanelValidators.js`
   - Shows validation logic for each panel
   - Returns `{ valid, errors }`
   - Referenced by builders via `_validatePanelContext()`

4. **Templates:** `templates/actors/character/v2/partials/*.hbs`
   - Each template consumes its panel context
   - Use {{panelName.key}} to access data
   - Never normalize or compute—trust the builder

5. **PostRender:** `scripts/sheets/v2/context/PostRenderAssertions.js`
   - Validates rendered DOM matches contract
   - Checks for expected elements
   - Verifies SVG structure

---

## The Architecture Contract

### What Templates CAN Do
✅ Display data from panel contexts
✅ Use conditional logic on panel values
✅ Iterate arrays provided by panels
✅ Format display values
✅ Add click handlers for actions

### What Templates MUST NOT Do
❌ Access raw actor.system paths
❌ Access raw actor.flags paths
❌ Normalize or sort data
❌ Compute derived values
❌ Reference legacy flat context (hp, inventory, etc.)

### What Builders MUST Do
✅ Transform all required actor data into panel context
✅ Normalize all rows/entries using RowTransformers
✅ Provide computed display values
✅ Call _validatePanelContext() for enforcement
✅ Return complete panel context object

### What Builders MUST NOT Do
❌ Modify actor data
❌ Leave data normalization to templates
❌ Skip validation
❌ Provide raw actor objects in context

### What Validators MUST Do
✅ Check required keys exist
✅ Validate data types
✅ Check array structure
✅ Return { valid, errors } object
✅ Catch malformed data

### What Validators MUST NOT Do
❌ Modify the context
❌ Throw errors (return them instead)
❌ Do complex computation
❌ Reference other panels

---

## Testing Your Changes

### Enable Strict Mode

```javascript
// In browser console or config
CONFIG.SWSE.strictMode = true;
// Then reload the sheet
```

Strict mode will:
- Throw on missing required keys
- Throw on validation failures
- Throw on DOM assertion failures
- Show you exactly what broke

### Enable Debug Mode

```javascript
game.swse.toggleLayoutDebug()
// Or in browser console
```

Debug mode will:
- Show 10px grid overlay
- Show content safe area boundaries
- Show overlay positioning
- Mark anchor points

### Manual Verification

```javascript
// Check a specific panel's context
const context = game.user.character.sheet.documentContext;
console.log(context.healthPanel);  // See what builder produced
console.log(context.inventoryPanel);

// Validate panel
import { validateHealthPanel } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelValidators.js';
const result = validateHealthPanel(context.healthPanel);
console.log(result);  // { valid: true/false, errors: [...] }
```

---

## Code Review Checklist

Before submitting changes to the sheet:

### For Builder Changes
- [ ] No raw actor objects in panel context?
- [ ] All required keys provided?
- [ ] _validatePanelContext() called?
- [ ] Rows normalized with RowTransformers?
- [ ] Tested with CONFIG.SWSE.strictMode = true?

### For Template Changes
- [ ] All data from panel context?
- [ ] No raw actor.system reads?
- [ ] No data normalization in template?
- [ ] No raw actor.flags reads?
- [ ] Uses correct panel name (healthPanel, not health)?

### For New Panels
- [ ] Added to PANEL_REGISTRY.js?
- [ ] Builder created and calls buildAllPanels()?
- [ ] Validator created?
- [ ] Template created and uses panel context?
- [ ] PostRenderAssertions defined?
- [ ] verify-panel-alignment.js shows 0 issues?

### For Validator Changes
- [ ] Returns { valid, errors } format?
- [ ] Checks required keys?
- [ ] Validates data types?
- [ ] Tested with invalid data?
- [ ] Updated PANEL_REGISTRY requiredKeys?

---

## Common Mistakes and How to Fix Them

### "My template is blank"
**Likely cause:** Template is reading from wrong context
**Fix:**
1. Check panel name (healthPanel not health)
2. Check builder is being called
3. Enable strict mode to see validation error
4. Check PANEL_REGISTRY for required keys

### "I added a key to the builder but validator complains"
**Likely cause:** Key not in requiredKeys or optionalKeys in PANEL_REGISTRY
**Fix:**
1. Add to PANEL_REGISTRY entry for the panel
2. Add validation in PanelValidators.js
3. Test with strict mode

### "PostRender assertion failed"
**Likely cause:** Template structure doesn't match expectations
**Fix:**
1. Check PostRenderAssertions in PANEL_REGISTRY
2. Verify template has expected CSS selectors
3. Count elements match expectations
4. Enable debug mode to visualize

### "Everything works locally but fails in strict mode"
**Likely cause:** Missing required key or bad validation
**Fix:**
1. Check what strict mode error says
2. Find the missing key or validation issue
3. Add to builder or fix validation
4. Test again with strict mode

### "Changing the template breaks things"
**Likely cause:** Template structure is part of the contract
**Fix:**
1. Check PostRenderAssertions for required CSS classes
2. Check ledger row selectors
3. Check SVG layer structure
4. Don't remove expected elements

---

## Performance Considerations

- **Builders run once per render** - optimize heavy computation here, not in templates
- **Templates render often** - keep templates simple (loops and conditionals only)
- **Validators run in strict mode** - don't make them too heavy, but be thorough
- **PostRender assertions run after every render** - keep them quick

---

## Where to Get Help

1. **Understanding architecture?** → Read SHEET_MANIFEST.md
2. **How to add a panel?** → See SHEET_MANIFEST.md "How to Add a New Panel"
3. **Type definitions?** → Check PanelTypeDefinitions.js (JSDoc comments)
4. **SVG layout?** → See PHASE_4_SVG_CONTRACT_COMPLETION.md and PHASE_4_DEBUG_GUIDE.md
5. **Stuck on an issue?** → Enable strict mode and debug mode, check console

---

## TL;DR - The Golden Rules

1. **Builders shape data** - that's their only job
2. **Templates display data** - they trust builders
3. **Validators enforce contracts** - they catch mistakes
4. **Never put logic in templates** - builders do that
5. **Never skip validation** - it catches bugs early
6. **Run strict mode in development** - it's your safety net
7. **Use debug mode to visualize** - it shows what's happening
8. **Read PANEL_REGISTRY first** - it's the source of truth

---

## Questions?

If you're unsure:
1. Check the panel in SHEET_MANIFEST.md
2. Enable strict mode - it'll tell you what's wrong
3. Look at a similar working panel
4. Enable debug mode to visualize

The architecture is designed to be **self-enforcing**. When you violate a contract, the system tells you immediately.

---

**Last Updated:** Phase 5.9
**Status:** Current and Maintained
