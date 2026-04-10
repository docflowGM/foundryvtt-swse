# Item Editor Form Submission - P0 Bug Audit

## Problem Identified

Clicking Confirm button causes the Foundry client to reload and DOM breaks. This indicates **native form submission is escaping the app's controlled lifecycle** instead of being intercepted by Foundry's AppV2 form handler.

---

## Audit Results

### ✅ Template Structure (CORRECT)
**File**: `templates/items/base/item-sheet.hbs`

```handlebars
Line 7:    <form class="..." id="item-sheet-form">
Line 476:  <button type="button" class="swse-btn ... close-btn">Cancel</button>
Line 490:  <button type="submit" class="swse-btn ... item-editor__footer-confirm">Confirm</button>
Line 496:  </form>
```

**Status**: ✓ Form wraps entire document
**Status**: ✓ Cancel is `type="button"` 
**Status**: ✓ Confirm is `type="submit"` (correct for triggering form submission)

---

### ⚠️ Form Configuration (CONFIGURED)
**File**: `scripts/items/swse-item-sheet.js` lines 24-28

```javascript
form: {
  handler: SWSEItemSheet.#onSubmitForm,
  submitOnChange: true,
  closeOnSubmit: false
}
```

**Status**: ✓ Handler is specified
**Status**: ⚠️ Handler is a STATIC private method (potential context binding issue)

---

### 🔴 Form Handler - CRITICAL ISSUE FOUND
**File**: `scripts/items/swse-item-sheet.js` lines 343-386

```javascript
static async #onSubmitForm(event, form, formData) {
  event.preventDefault();  // ✓ Correct

  // ... form data processing ...

  const actor = this.item?.actor;  // 🔴 PROBLEM: static method, `this` is undefined
  const flatData = foundry.utils.flattenObject(data);

  if (this.item?.isEmbedded && actor) {  // 🔴 PROBLEM: `this` is undefined
    try {
      await actor.updateOwnedItem(this.item, flatData);  // 🔴 `this.item` fails
      return;
    } catch (err) {
      console.error('[Item Sheet] Form submission failed:', err);
      ui.notifications.error(`Failed to save item: ${err.message}`);
      return;
    }
  }

  await this.item.update(flatData);  // 🔴 `this.item` fails
}
```

---

## Root Cause Analysis

**The handler is declared as `static async #onSubmitForm(event, form, formData)`**

In a static method:
- `this` is **undefined** (static methods don't have instance context)
- Line 368: `const actor = this.item?.actor;` → **TypeError**
- Line 374: `await actor.updateOwnedItem(this.item, flatData);` → **TypeError**
- Line 385: `await this.item.update(flatData);` → **TypeError**

### What Happens When Handler Throws Error:

1. User clicks Confirm (type="submit")
2. Form submission triggers → Foundry's form handler is called
3. Handler runs, tries to access `this.item` → **TypeError: Cannot read property 'item' of undefined**
4. Error silently caught OR not caught properly
5. Form submission is not properly prevented
6. **Native browser form submission takes over** → page reload/navigation
7. DOM breaks, game client reloads

---

## Why This Worked Before (If It Did)

The form might not have been tested with actual item saving, OR the static method binding behavior changed in a Foundry version update, OR the form wasn't actually being submitted before the refactor changed something.

---

## The Fix Required

The handler must have access to the app instance (`this`). Two options:

### Option A: Non-Static Handler (Recommended)
```javascript
async #onSubmitForm(event, form, formData) {
  event.preventDefault();
  const data = foundry.utils.expandObject(formData.object);
  // ... rest of logic ...
  // `this` is now the app instance, `this.item` works
  const actor = this.item?.actor;  // ✓ Works
  await this.item.update(flatData);  // ✓ Works
}
```

Then update the config:
```javascript
form: {
  handler: this.#onSubmitForm,  // Bound to instance, not static class
  submitOnChange: true,
  closeOnSubmit: false
}
```

**Caveat**: Non-static instance methods don't work in Foundry's form config the same way. Need to verify binding.

### Option B: Receive app instance as parameter
Check if Foundry's form handler passes `this` as part of the handler invocation context. If it uses `.call(this, ...)` or `.bind(this)`, the handler would work even if declared static.

**This is the most likely scenario** — the static handler SHOULD receive proper binding from Foundry's AppV2, but if there's an error inside the handler, it would break the form submission.

---

## Diagnostic: Check for Silent Errors

The handler might be throwing an error that's being caught silently. Add logging to verify:

**Option 1: Check Browser Console**
After clicking Confirm:
- Open DevTools Console (F12)
- Look for any TypeErrors about "this is undefined" or "Cannot read property 'item'"

**Option 2: Add Temporary Logging**
In the handler (line 368), add:
```javascript
console.log('[onSubmitForm] this =', this);
console.log('[onSubmitForm] this.item =', this?.item);
```

If `this` is undefined → static method binding is broken
If `this.item` is undefined → app instance exists but doesn't have the item

---

## Required Validation After Fix

After applying the fix:

1. **Verify handler receives correct context**
   - Is `this` the app instance?
   - Does `this.item` exist and have the item data?

2. **Verify preventDefault() is working**
   - No page reload on Confirm click
   - No navigation event
   - Form submission stays within app lifecycle

3. **Verify data actually saves**
   - Inspect network tab or item data after clicking Confirm
   - Confirm the item.update() or updateOwnedItem() actually completes
   - Check that no errors are silently caught

4. **Verify close behavior**
   - closeOnSubmit is false → app should stay open after confirm
   - No DOM breaks or resets

---

## Immediate Actions Required

1. **Verify the real symptom**
   - Open DevTools Console
   - Click Confirm
   - Check for errors about `this` being undefined

2. **Check Foundry's form handler binding**
   - How does AppV2 invoke the handler?
   - Does it use `.call(instance, ...)` to bind context?
   - Or does the handler need to be non-static?

3. **Fix the handler**
   - If static, verify Foundry binds it correctly (check Foundry docs)
   - If not, convert to instance method
   - Add console.log to verify `this` and `this.item` exist

4. **Test the fix**
   - Click Confirm
   - Verify no reload/navigation
   - Verify item saves
   - Verify app stays open

---

## Files Involved

| File | Issue | Fix |
|------|-------|-----|
| `scripts/items/swse-item-sheet.js` | Static handler without instance context | Make handler non-static OR verify Foundry binding |
| `templates/items/base/item-sheet.hbs` | Form structure is correct | No change needed |

---

**Status**: P0 - Form submission broken, blocking all item editing
