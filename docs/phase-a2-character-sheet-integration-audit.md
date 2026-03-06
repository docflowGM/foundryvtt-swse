# Phase A2: Character Sheet Integration Audit

## Overview

**Phase A2** is a diagnostics-only audit framework for validating SWSE V2 character sheets against five integration criteria:

| Component | What | Why | Status |
|-----------|------|-----|--------|
| **A2.1** | Partials Display | Verify all expected UI regions render correctly | ✅ Core |
| **A2.2** | Roll Engine | Ensure all rolls route through SWSEChat/canonical engine | ✅ Critical |
| **A2.3** | Field Persistence | Validate form edits persist through ActorEngine | ✅ Core |
| **A2.4** | Position Stability | Confirm window position preserved on updates | ✅ Secondary |
| **A2.5** | Atomic Recalculation | Verify updates are transactional, no partial state | ✅ Core |

**Purpose**: Establish a baseline of sheet integration health before Phase B surgical fixes.

---

## Running Phase A2 Audits

### Option 1: Full Audit (All Checks)

```javascript
// Run on selected actor (first character found)
await game.SWSE.debug.auditors.characterSheetA2.runOnSelected();

// Run on specific actor
await game.SWSE.debug.auditors.characterSheetA2.audit(game.actors.get('actor-id'));
```

### Option 2: Quick Integration Test (Phase B Validation)

After fixes, run the smoke test harness:

```javascript
// Run on selected actor
await game.SWSE.debug.auditors.characterSheetA2.test();

// Run on specific actor
await game.SWSE.debug.auditors.characterSheetA2.test(game.actors.get('actor-id'));
```

---

## Understanding A2 Results

### Output Format

```
============================================================
  SWSE V2 CHARACTER SHEET INTEGRATION AUDIT (Phase A2)
============================================================

📊 SUMMARY
   Total Findings: 3
   ❌ Errors: 2
   ⚠️  Warnings: 1

──────────────────────────────────────────────────────────
❌ ERRORS (MUST FIX)
──────────────────────────────────────────────────────────

[1] Partial not found (css selectors)
    Component: abilities-panel
    📝 Fix: Verify template includes partial or CSS selector is correct

[2] Field did not persist: Actor Name
    Field: name
    📝 Fix: Verify _updateObject() routes field changes to ActorEngine
```

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **❌ ERROR** | Critical integration failure; must fix before Phase B | Blocking; blocks fixes |
| **⚠️  WARNING** | Potential issue; review recommended | Non-blocking; check before Phase B |

---

## A2.1: Partials Display Audit

### What It Checks

- ✅ All expected partial regions exist in rendered sheet
- ✅ Partials are visible (not display:none, visibility:hidden, opacity:0)
- ✅ Partials have non-zero dimensions
- ✅ Partial content is populated (not empty)

### Expected Partials (Character Sheet)

```
Required:
  • identity-strip       — Actor name, class, level
  • abilities-panel      — STR, DEX, CON, INT, WIS, CHA
  • skills-panel         — Skill list with modifiers
  • attacks-panel        — Combat action cards
  • defenses-panel       — Defense breakdown
  • inventory-panel      — Equipment, weapons, armor
  • hp-condition-panel   — HP, temp HP, condition track

Optional:
  • feats-panel          — Feats list
  • talents-list         — Talent grid
  • force-suite          — Force powers hand/discard
  • combat-action-table  — Combat action summary
```

### Common A2.1 Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| "Partial not found" | Template missing `{{> partial/name}}` | Add partial include to template |
| "Hidden" | CSS visibility/display issues | Check .hbs template CSS classes; verify no global overrides |
| "Empty" | Context data not supplied | Check `_prepareContext()` provides data for partial |
| "Zero-dimension" | Parent container too small | Verify parent flexbox/grid allows child expansion |

---

## A2.2: Roll Engine Audit

### What It Checks

- ✅ All roll controls (buttons with `[data-action="roll-*"]`) are present
- ✅ Roll controls are not disabled
- ✅ Roll handlers are wired (sheet method or event delegation)
- ✅ Calls route through canonical engine (SWSEChat.postRoll)

### Expected Roll Controls

```
[data-action="roll-attack"]   — Attack roll button
[data-action="roll-skill"]    — Skill roll button
.rollable                     — Generic rollable elements
```

### Common A2.2 Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| "No handler found" | Button missing `data-action` | Add `data-action="roll-attack"` to button |
| "Handler mismatch" | Sheet missing `_onRollAttack()` method | Implement handler or use event delegation |
| "Bypass detected" | Roll bypasses SWSEChat | Ensure handler calls `SWSEChat.postRoll()` |

### Handler Wiring Pattern

```javascript
// In character-sheet.js activateListeners()
html.querySelectorAll('[data-action="roll-attack"]').forEach(btn => {
  btn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const roll = new Roll('1d20 + @attack', { attack: 5 });
    await roll.evaluate({ async: true });

    // ✅ CORRECT: Route through SWSEChat
    await SWSEChat.postRoll({
      roll,
      actor: this.document,
      flavor: 'Attack Roll'
    });
  });
});
```

---

## A2.3: Form Field Persistence Audit

### What It Checks

- ✅ Form fields can be edited
- ✅ Changes trigger `change` / `input` events
- ✅ Sheet's `_updateObject()` processes the delta
- ✅ Actor document receives the update via ActorEngine
- ✅ Change persists after rerender

### Test Fields

```
name              — Actor name (primary identity field)
system.biography  — Biography sections (if present)
```

### Common A2.3 Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| "Field did not persist" | `_updateObject()` not called or not routing to ActorEngine | Verify sheet extends ActorSheetV2; check _updateObject implementation |
| "Field not found" | Sheet template doesn't have input with selector | Add `<input name="name" value="{{document.name}}">` |
| "Update error" | ActorEngine.update() throws | Check ActorEngine for schema/validation errors |

### Proper Field Binding Pattern

```hbs
{{!-- In character-sheet.hbs --}}
<input type="text" name="name" value="{{document.name}}" />

{{!-- Or for nested fields --}}
<input type="text" name="system.biography.main" value="{{system.biography.main}}" />
```

```javascript
// In character-sheet.js
async _updateObject(event, formData) {
  // AppV2 / HandlebarsApplicationMixin handles merging
  return this.document.update(formData);
  // ✅ This goes through governance layer automatically in V13
}
```

---

## A2.4: Position Stability Audit

### What It Checks

- ✅ Sheet window position (left, top, width, height) before update
- ✅ Performs a small update (harmless flag)
- ✅ Verifies position unchanged after update

### Common A2.4 Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Position moved" | `_onRender()` forces reposition via `bringToFront()` | Don't call `setPosition()` in render; use AppV2 APIs only |
| "Rerender triggers resize" | Template has root `height: 100%` or `display: flex` | Check CSS; avoid root-level flex on sheet body |

---

## A2.5: Atomic Recalculation Audit

### What It Checks

- ✅ ActorEngine.recalcAll() exists and is callable
- ✅ actor.system.derived exists (where recalculated state lives)
- ✅ Updates don't trigger cascading partial re-updates

### Common A2.5 Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "ActorEngine not found" | Module import failed | Ensure `/scripts/governance/actor-engine/actor-engine.js` exists |
| "No derived state" | DerivedCalculator not populating actor.system.derived | Verify actor hooks call ActorEngine.recalcAll() |
| "Cascading updates" | Update handler calls update() again | Consolidate updates; use applyActorUpdateAtomic |

---

## Phase B: Surgical Fixes

### Allowed Fix Types

Once A2 identifies failures, Phase B makes **targeted, minimal changes**:

| Category | Examples | Constraints |
|----------|----------|-------------|
| **Roll Handlers** | Add `data-action` → implement handler → route via SWSEChat | No roll logic changes |
| **Template/Context** | Fix partial includes; supply context data | No schema changes |
| **Field Binding** | Add missing `name` attributes; wire input→update | No new fields |
| **Position** | Remove forced `setPosition()` calls; preserve `.position` | AppV2 APIs only |
| **Atomic Updates** | Consolidate multi-step updates; use ActorEngine | No game logic changes |

### Forbidden Changes

❌ Broad CSS rewrites
❌ Core Foundry overrides
❌ Mechanic changes
❌ New mutation surfaces
❌ Bypass governance layers

---

## Phase B: Integration Test (Harness)

After fixes, validate with quick smoke tests:

```javascript
// Run all Phase B tests
const results = await game.SWSE.debug.auditors.characterSheetA2.test();

// Output:
// ✅ PASSED: 5  |  ❌ FAILED: 0  |  ⏭️  SKIPPED: 0
// ─────────────────────────────────────
// ✅ PASSES:
//    • Sheet Renders Without Errors
//    • Attack Roll Button Exists
//    • Skill Roll Button Exists
//    • Core Panels Visible
//    • Actor Name Persists
//    • Window Position Stable After Update
```

### Test Harness Tests

1. **Sheet Renders** — HTML content present and visible
2. **Attack Roll** — Button present and clickable
3. **Skill Roll** — Button present and clickable
4. **Core Panels** — Abilities, Skills, HP panels visible
5. **Name Persistence** — Actor name update persists
6. **Position Stable** — Window position preserved on update

---

## Governance Compliance

All A2 audits and Phase B fixes **must comply** with:

✅ **V13/AppV2 Architecture**
- No direct actor.update() outside ActorEngine
- Use async Roll evaluation
- AppV2 lifecycle compliance

✅ **CSS Isolation (XCSS)**
- Namespaced classes only (.swse-*, .sheet-*, .component-*)
- No global overrides
- No @layer declarations

✅ **Mutation Governance**
- All rolls → SWSEChat.postRoll()
- All updates → ActorEngine pipeline
- No ChatMessage.create() from sheets

✅ **Sentinel Monitoring**
- Don't disable enforcement
- Don't alter CSS in ways that trigger sidebar state change
- Report degradation before proceeding

---

## Example: Full A2 Audit Run

```javascript
// 1. Open browser console (F12)
// 2. Select a character actor and open its sheet
// 3. Run audit:

await game.SWSE.debug.auditors.characterSheetA2.runOnSelected();

// Expected healthy output:
// ============================================================
//   SWSE V2 CHARACTER SHEET INTEGRATION AUDIT (Phase A2)
// ============================================================
//
// 📊 SUMMARY
//    Total Findings: 0
//    ❌ Errors: 0
//    ⚠️  Warnings: 0
//
// ✅ All audits passed! Sheet integration is healthy.
```

---

## Troubleshooting

### Audit won't run

- Ensure actor has a sheet open: `actor.sheet.render(true)`
- Ensure actor is character type: `actor.type === 'character'`
- Check browser console for import errors

### "ActorEngine not found"

- Verify `/scripts/governance/actor-engine/actor-engine.js` exists
- Check system.json loads index.js before sheets are registered

### "Field does not persist"

- Verify sheet template has `<input name="fieldName" />`
- Check `_updateObject()` receives formData and calls `this.document.update()`
- Verify ActorEngine hooks are wired in actor `_preCreate` / `_preUpdate`

### "Position moves on update"

- Don't call `setPosition()` in render phase
- Check CSS doesn't have `height: 100%` at sheet body root
- Use AppV2's position tracking instead

---

## Next Steps

After A2 diagnostics:

1. **Identify** failures from audit output (errors + warnings)
2. **Prioritize** by severity (errors first)
3. **Fix** using Phase B surgical approach
4. **Validate** with test harness
5. **Document** changes in commit messages
6. **Repeat** until all tests pass

---

## Reference

- **Audit**: `game.SWSE.debug.auditors.characterSheetA2.audit(actor)`
- **Run on Selected**: `game.SWSE.debug.auditors.characterSheetA2.runOnSelected()`
- **Test Harness**: `game.SWSE.debug.auditors.characterSheetA2.test(actor)`
- **CLAUDE.md**: V2 Governance + CSS Isolation rules
- **actor-engine.js**: Canonical mutation surface
- **SWSEChat**: Canonical roll output surface
