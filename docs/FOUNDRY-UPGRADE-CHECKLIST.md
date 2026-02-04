# SWSE Foundry Upgrade Checklist

This checklist helps system maintainers verify SWSE compatibility when upgrading to a new Foundry version.

**Why this exists:**

- Foundry breaks things in predictable ways
- This checklist catches them before release
- Turns archaeology into a procedure

---

## Pre-Upgrade

- [ ] Read Foundry release notes and migration guide
- [ ] Backup your current working system
- [ ] Note Foundry's breaking changes (especially to AppV2, CSS, icons)
- [ ] Create an issue tracking the upgrade (for reference)

---

## Step 1: Verify Icon System

**Problem it prevents:** FontAwesome version changes breaking all icons

### Checklist

- [ ] Check Foundry's FA version in release notes
- [ ] Cross-reference with `scripts/utils/icon-constants.js`
- [ ] Run smoke test: `window.SWSE.smokeTest()`
- [ ] Verify icon test in browser console shows no "unknown icon" errors
- [ ] If new FA version: update icon names using FA migration guide

**If icons are broken:**

```bash
npm run lint  # Will catch deprecated patterns
```

Then update `icon-constants.js` with new icon names. Each icon in the constant should correspond to FA's current naming scheme.

---

## Step 2: Verify Character Sheet Rendering

**Problem it prevents:** Blank sheets due to template or context changes

### Checklist

- [ ] Open dev mode: Settings → Core → Enable Dev Mode
- [ ] Open a character sheet
  - [ ] Check browser console for `[SWSE] Partial failed to register` errors
  - [ ] Check for `getData() missing system data` errors
  - [ ] Verify all tabs render (summary, abilities, skills, combat, etc.)
  - [ ] Click between tabs (forces re-renders)
- [ ] Modify a character value (test reactivity)
- [ ] Close and reopen the sheet

**If sheets are blank:**

1. Check console for errors
2. Verify template exists: `grep "character-sheet.hbs" index.js`
3. Check `_prepareContext()` returns valid system data
4. Run ESLint: `npm run lint`

---

## Step 3: Verify CharGen Rendering

**Problem it prevents:** Steps rendering blank, stale data, or async race conditions

### Checklist

- [ ] Create a new character via CharGen
  - [ ] Each step renders (chevrons appear)
  - [ ] No "Step X rendered no content" warnings in console
  - [ ] Scrolling preserves position
  - [ ] Going back/forward doesn't lose data
  - [ ] Data diff logs appear in dev mode (shows state changes)
- [ ] Use the CharGen mentor (test async loading)
- [ ] Skip a step, then jump back (test state consistency)
- [ ] Finish character creation and verify data is complete

**If CharGen is broken:**

1. Check for "rendered no content" warnings (step logic issue)
2. Check network tab for failed compendium loads
3. Run `window.SWSE.smokeTest()` to verify templates
4. Check console for state diff logs (shows what changed)

---

## Step 4: Test UI Invariants

**Problem it prevents:** Silent failures from Foundry API changes

### Checklist

- [ ] Run ESLint: `npm run lint`
  - Should have NO errors (only warnings are acceptable)
  - jQuery pattern checks (already banned)
  - DOM API checks (element[0] access banned)
- [ ] Run tests: `npm test`
  - All tests should pass
- [ ] Check CSS containment still works
  - Open sidebar (should not overflow into main content)
  - Check that z-index stacking is correct in dialogs

---

## Step 5: Run Smoke Tests

**Problem it prevents:** Missing globals, broken configs, or incomplete initialization

```javascript
// In browser console (dev mode only):
window.SWSE.smokeTest();
```

This checks:

- [ ] Foundry globals present
- [ ] SWSE config loaded
- [ ] Icon constants available
- [ ] Character sheets registered
- [ ] Handlebars helpers registered
- [ ] CSS styling applied

**Expected output:**

```
✓ All 6 smoke tests passed
```

If any test fails, fix it before releasing.

---

## Step 6: Verify Performance

**Problem it prevents:** Slow renders, memory leaks, or UI jank

### Checklist

- [ ] Open Performance tab in browser dev tools
- [ ] Create a character in CharGen (should be <2s per step)
- [ ] Open a character sheet (should render in <500ms)
- [ ] Edit multiple values in quick succession (no lag)
- [ ] Close all sheets and quit to main scene (no dangling listeners)

---

## Step 7: Integration Tests

**Problem it prevents:** System-specific features breaking silently

### Checklist

- [ ] Create a character with all races/classes (catches data load issues)
- [ ] Assign talents and feats (tests item rendering)
- [ ] Use combat system (tests calculations)
- [ ] Create a vehicle (different actor type)
- [ ] Create a droid (edge case)

---

## Step 8: Final Verification

### Checklist

- [ ] No console errors (warnings OK, errors NOT OK)
- [ ] No console warnings with `[SWSE]` prefix
- [ ] All features work (sheets, CharGen, combat, etc.)
- [ ] Performance is acceptable
- [ ] Documentation still accurate

---

## If Something Breaks

1. **Identify the scope:**
   - Specific sheet/feature broken?
   - Entire system broken?
   - Only in specific conditions?

2. **Check logs:**

   ```javascript
   // In console:
   window.SWSE.smokeTest(); // Diagnose basics
   ```

3. **Inspect the error:**
   - Console errors usually point to the cause
   - Check git diff with previous version
   - Look for deprecated Foundry API usage

4. **Common fixes:**
   - **"Missing helper"** → Check helpers/handlebars/index.js
   - **"Partial not found"** → Check load-templates.js and template path
   - **"Blank sheet"** → Check \_prepareContext() returns data
   - **"jQuery not found"** → Check for jQuery usage (should be none)
   - **"this.element[0]"** → Use this.element directly (V2 API)

5. **Document the fix:**
   - Update this checklist if a new failure type emerges
   - Add to V14_READINESS.md for future reference

---

## After Upgrade (Release)

- [ ] Update system.json `verified` field to new Foundry version
- [ ] Update README with new compatibility info
- [ ] Run `npm run package` (builds distribution)
- [ ] Tag release as `v1.X.Y-foundryXX` (e.g., v1.2.0-foundry14)
- [ ] Write release notes (what changed, what was fixed)
- [ ] Test on live Foundry (not just dev)

---

## Reference: What Breaks in Foundry Upgrades

Based on SWSE's history, these are the areas most likely to break:

| Area               | Common Issues                                | What to Check                        |
| ------------------ | -------------------------------------------- | ------------------------------------ |
| **Icon System**    | FA version changes, icon name deprecations   | `icon-constants.js`, render output   |
| **Application V2** | Lifecycle changes, context shape changes     | `_prepareContext()`, \_onRender()    |
| **CSS**            | Layout changes, new containment requirements | Sidebar, dialog z-index, containment |
| **Handlebars**     | Helper interface changes, template syntax    | helpers/index.js, .hbs files         |
| **Compendiums**    | Load timing changes, pack index structure    | CharGen data loading                 |
| **Security**       | New input sanitization requirements          | Form inputs, chat messages           |

---

## Quick Reference: Smoke Test

**Fastest way to verify system works:**

```javascript
// In browser console:
await window.SWSE.smokeTest();

// Expected: "✓ All X smoke tests passed"
// If failed: Check console.error() output for what broke
```

---

## History of Foundry Breaks in SWSE

- **v12→v13:** jQuery removal, AppV2 lifecycle changes, FontAwesome v6 migration
- **v13→v14:** (anticipated) CSS containment changes, possible icon system updates

---

**Last Updated:** 2026-02-04
**Applies To:** SWSE v1.2+ for Foundry v13+
**Author:** SWSE Maintainers
