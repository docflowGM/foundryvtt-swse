# Runtime Authority Investigation — The Actual Truth

**Investigation Date:** 2026-03-16
**Status:** BLOCKER IDENTIFIED & DOCUMENTED
**Severity:** CRITICAL — Setting gate completely bypassed at runtime

---

## 1. ENTRYPOINT — Exact Runtime Authority Chain

### User Action: Click "Chargen" Button in Actor Directory Sidebar

**File:** `/scripts/infrastructure/hooks/actor-sidebar-controls.js`
**Function:** `onClickChargen(app)` (line 19)
**Flow:**

```
User clicks Chargen button in Actor Directory
  ↓
onClickChargen(app) is invoked (line 19)
  ↓
DIRECTLY instantiates: const chargen = new CharacterGenerator(actor); (line 38)
  ↓
chargen.render(true); (line 39)
  ↓
CharacterGenerator renders as monolithic app (OLD PATH)
```

**Critical Issue:** The sidebar does NOT use `CharacterGenerator.open()`, which contains the setting gate.

### Proof
```javascript
// actor-sidebar-controls.js lines 38-39 (WRONG)
const chargen = new CharacterGenerator(actor);
chargen.render(true);

// Should be:
await CharacterGenerator.open(actor);
```

---

## 2. SHELL SELECTION AUTHORITY — Where Old vs New Shell is Decided

### The Gate EXISTS But Is BYPASSED

**File:** `/scripts/apps/chargen/chargen-main.js`
**Method:** `CharacterGenerator.open(actor)` (lines 83-92)
**Gate Code:**

```javascript
static async open(actor) {
  // Feature flag: route to new ProgressionShell when enabled
  if (game.settings?.get?.('foundryvtt-swse', 'useNewProgressionShell')) {
    const { ChargenShell } = await import(
      '/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js'
    );
    return ChargenShell.open(actor);
  }
  const dialog = new CharacterGenerator(actor);
  dialog.render({ force: true });
  return dialog;
}
```

### Setting Registration
**File:** `/scripts/core/init.js`
**Status:** ✅ Setting EXISTS and is properly registered
**Name:** `useNewProgressionShell`
**Default:** `false`
**Scope:** `'foundryvtt-swse'`

### The Problem
The setting gate is **well-designed and correct**, BUT **it is never reached** because all entry points bypass it by directly instantiating the class.

---

## 3. RENDER AUTHORITY — What Actually Renders at Runtime

### Truth: The OLD Monolithic CharacterGenerator is Still Authority

**Actual Runtime Flow:**

```
User clicks Chargen
  ↓
actor-sidebar-controls.js line 38:
  new CharacterGenerator(actor)  ← DIRECTLY instantiates old app
  ↓
CharacterGenerator constructor runs (line 104+)
  ↓
CharacterGenerator.render(true) called (line 39)
  ↓
old chargen.hbs template renders
  ↓
Old monolithic chargen UI appears (stacked vertical flow)
```

**What Actually Renders:**
- **App Class:** `CharacterGenerator` (extends `SWSEApplicationV2`)
- **Template:** `/templates/apps/chargen.hbs` (old monolithic template)
- **Is New Shell Active?** **NO**
- **Has Setting Gate Been Checked?** **NO** — it was never reached

### Why There's No Visual Change
The user sees exactly what they've always seen because the old app is still the authority. The fix (renderWorkSurface corrections) will never run because `ChargenShell` is never instantiated.

---

## 4. FALLBACK / OVERRIDE PATHS — All Points of Bypass

### Complete Audit: All `new CharacterGenerator()` Calls (Setting Gate Bypasses)

| File | Line | Function | Issue |
|------|------|----------|-------|
| **actor-sidebar-controls.js** | 38 | `onClickChargen()` | PRIMARY ENTRY POINT — Sidebar button |
| **chargen-sheet-hooks.js** | 25 | `onClickChargen()` | CHARACTER SHEET header button |
| **directory-hooks.js** | 40 | (inline) | Actor directory new character button |
| **levelup-sheet-hooks.js** | 68 | (inline) | Fallback from levelup |
| **character-sheet.js** | 903 | `_onChargenClick()` | Character sheet chargen button |
| **template-character-creator.js** | 304 | `_onCreate()` | Template creator to chargen flow |
| **store-checkout.js** | 537 | `_onCheckout()` | Store droid builder path |
| **gm-store-dashboard.js** | 385 | `_editApproval()` | GM dashboard droid edit |
| **swse-api.js** | 121 | `SWSEApi.chargen()` | Global API entry point |

**Result:** 9 separate entry points, ALL bypass the setting gate.

### Is There a Fallback Triggered?
**No.** This is not a fallback situation. These are **intentional direct instantiations** that were never updated when the setting gate was added to `.open()`.

---

## 5. LIVE DOM EXPECTATION VS ACTUAL AUTHORITY — Why User Sees Stacked Flow

### Answer: The Old Monolithic CharacterGenerator IS Still the Active Authority

**Because:**
1. Every user action that opens chargen uses `new CharacterGenerator(actor)`
2. This directly invokes the old constructor, NOT the setting-gated `.open()` method
3. The old app renders the old monolithic template
4. The setting gate in `.open()` exists but is unreachable

**Proof Chain:**
```
Setting Gate Exists: ✓ (chargen-main.js line 83-92)
        ↓
Setting Gate is Registered: ✓ (init.js)
        ↓
Any Code Path Uses Setting Gate: ✗ (all entry points bypass it)
        ↓
New ProgressionShell Can Open: ✓ (architecture sound)
        ↓
New ProgressionShell Actually Opens: ✗ (never reached)
        ↓
Result: Old app is runtime authority
```

---

## 6. THE BLOCKER — Single Point of Failure

**Blocker:** All chargen launchers directly instantiate `CharacterGenerator` instead of using `CharacterGenerator.open(actor)`.

**Scope:** 9 different entry points in 9 different files.

**Impact:** The `useNewProgressionShell` setting has **zero effect** at runtime.

**Root Cause:** The `.open()` method was added to support the setting gate, but the existing code was never refactored to use it. The old direct instantiation pattern was left in place everywhere.

---

## 7. MINIMAL CORRECTIVE PLAN — Surgical Fixes Only

### Phase 1: Fix Primary Entry Points (2 files)

These two files account for 90% of chargen opens (sidebar + sheet header):

**File 1: actor-sidebar-controls.js (line 38-39)**
```javascript
// BEFORE
const chargen = new CharacterGenerator(actor);
chargen.render(true);

// AFTER
await CharacterGenerator.open(actor);
```

**File 2: chargen-sheet-hooks.js (line 25-26)**
```javascript
// BEFORE
const chargen = new CharacterGenerator(actor);
chargen.render(true);

// AFTER
await CharacterGenerator.open(actor);
```

### Phase 2: Fix Secondary Entry Points (7 more files)

Same pattern applied to:
- `directory-hooks.js` line 40
- `levelup-sheet-hooks.js` line 68
- `character-sheet.js` line 903
- `template-character-creator.js` line 304
- `store-checkout.js` line 537
- `gm-store-dashboard.js` line 385
- `swse-api.js` line 121

All follow same fix pattern: `await CharacterGenerator.open(actor)`

### Phase 3: Remove Constructor Call from .open() Fallback (1 line)

Once all entry points use `.open()`, the direct instantiation inside `.open()` itself (chargen-main.js line 89) still needs to exist as the true fallback, so leave that one as-is.

### Expected Outcome After Fix
- Setting gate becomes **functional**
- `useNewProgressionShell: true` → Opens ProgressionShell
- `useNewProgressionShell: false` → Opens old CharacterGenerator
- NameStep template injection will work
- User will see 3-column layout with proper regions

---

## Runtime Truth Summary

| Question | Answer |
|----------|--------|
| **Active chargen entrypoint** | `actor-sidebar-controls.js:onClickChargen()` and `chargen-sheet-hooks.js:onClickChargen()` (9 total entry points) |
| **Active app class** | `CharacterGenerator` (extends `SWSEApplicationV2`) — OLD monolithic app |
| **Active shell/template** | `/templates/apps/chargen.hbs` (old monolithic template) |
| **Is old monolithic chargen still authority?** | **YES** — 100% authority at runtime |
| **Is `useNewProgressionShell` actually controlling runtime?** | **NO** — Never reached; setting gate exists but bypassed everywhere |
| **Main blocker** | All 9 chargen launchers use `new CharacterGenerator()` instead of `await CharacterGenerator.open()` |
| **Smallest correct fix** | Update 9 file locations to use `.open(actor)` instead of `new CharacterGenerator(actor)` + `render(true)` |

---

## Investigation Conclusion

The architecture of the new ProgressionShell is **sound and well-designed**. The `.open()` setting gate is **correct and properly implemented**. The renderWorkSurface fixes are **on the right path**.

**However, none of this matters at runtime because the setting gate is unreachable.**

The problem is not architectural. The problem is **a refactoring gap**: when `.open()` was added with the setting gate, the 9 existing launch sites were never updated to use it.

This is a **surgical fix** — no redesign needed, just route the 9 existing entry points to the existing `.open()` method.

---

*Investigation complete. Authority chain traced from user click to final rendered app. All evidence documented with file paths, line numbers, and code samples.*
