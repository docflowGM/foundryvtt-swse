# Force Suite Tab Template Wiring Fix

**Date:** 2026-05-18  
**Status:** ✅ FIXED & VALIDATED  
**Syntax Validation:** ✅ Pass (Node.js --check)

---

## Problem

**Error Message:**
```
The partial systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs could not be found
```

**Impact:** Character sheet fails to render completely because the new force-suite-tab template cannot be resolved.

**Root Cause:** The new `force-suite-tab.hbs` template file exists on disk but is not registered in the Handlebars template loader. When `force-tab.hbs` attempts to include it with:

```handlebars
{{> "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs"}}
```

The partial cannot be found because it hasn't been preloaded by Foundry's Handlebars engine.

---

## Root Cause Analysis

**File:** `scripts/core/load-templates.js`

This file defines the authoritative template registry that gets preloaded during `Hooks.once('init')`. All handlebars templates must be listed here to be available for rendering.

**What Was Missing:**
1. `force-suite-tab.hbs` — not in CHARACTER_V2_CONCEPT_TEMPLATES array
2. `force-suite-card.hbs` — not in CHARACTER_V2_CONCEPT_TEMPLATES array (referenced by force-suite-tab.hbs)

**Why It Broke:**
- New force-suite-tab was created and included in force-tab.hbs
- But the template registration wasn't updated
- When character sheet renders and tries to include force-suite-tab, Handlebars can't find it
- Entire character sheet render fails

---

## Solution

**File Modified:** `scripts/core/load-templates.js`

**Changes Made:**

1. Added `force-suite-card.hbs` to CHARACTER_V2_CONCEPT_TEMPLATES (line 48)
   - Location: panels section, alphabetically after force-secrets-panel
   
   ```javascript
   'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/force-suite-card.hbs',
   ```

2. Added `force-suite-tab.hbs` to CHARACTER_V2_CONCEPT_TEMPLATES (line 79)
   - Location: tabs section, alphabetically before force-tab
   
   ```javascript
   'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs',
   ```

**Why This Works:**

1. During system initialization, `preloadHandlebarsTemplates()` is called
2. All templates in SWSE_TEMPLATES array are passed to `foundry.applications.handlebars.loadTemplates()`
3. Handlebars registers each template as a partial
4. When force-tab.hbs renders and includes force-suite-tab.hbs, the partial is now available
5. force-suite-tab.hbs can then include force-suite-card.hbs for each power card
6. Character sheet renders without errors

---

## Validation

**Syntax Check:**
```bash
node --check scripts/core/load-templates.js
✅ PASS (no output = no errors)
```

**Template Registration Verification:**
```bash
grep -n "force-suite" scripts/core/load-templates.js

48:  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/force-suite-card.hbs',
79:  'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs',

✅ Both templates now registered
```

**File Existence Verification:**
```bash
ls -la templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs
ls -la templates/actors/character/v2-concept/partials/panels/force-suite-card.hbs

✅ Both files exist on disk
```

---

## Testing Procedure

### Pre-Deployment
1. Backup `scripts/core/load-templates.js`
   ```bash
   cp scripts/core/load-templates.js scripts/core/load-templates.js.backup
   ```

2. Deploy fixed file
   ```bash
   # Copy the fixed scripts/core/load-templates.js to your system
   ```

3. Restart Foundry VTT
   - Close Foundry completely
   - Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Delete)
   - Restart Foundry

### Runtime Test

1. **Character Sheet Rendering**
   - Open any character sheet
   - **Expected:** Character sheet renders without errors
   - **Check:** Browser console has no Handlebars missing partial errors

2. **Force-Sensitive Character**
   - Create or open a Force-sensitive character (level 1+)
   - Navigate to the **Force** tab
   - **Expected:** Force tab loads without "partial could not be found" error
   - **Verify:** Force Suite section displays:
     - Character name and subtitle
     - Use the Force skill bonus
     - Force Points value
     - Dark Side Score (if applicable)

3. **Force Powers Display**
   - **Expected:** Force powers render with proper card layout
   - **Verify:** Each power card shows:
     - Power name
     - Action type (Standard, Move, Swift, etc.)
     - Cost indicators
     - Description/summary

4. **Lightsaber Forms (if applicable)**
   - **Expected:** Form powers display in separate section
   - **Verify:** Form powers render with proper styling

5. **Discard Pile**
   - **Expected:** Discard pile section displays
   - **Verify:** Recovery buttons work:
     - Rest (1 min)
     - Natural 20
     - Spend Force Point

6. **Browser Console**
   - Open DevTools (F12)
   - Look for errors containing:
     - "partial could not be found"
     - "force-suite-tab"
     - "force-suite-card"
   - **Expected:** No such errors

---

## Deployment Checklist

- [ ] Backup scripts/core/load-templates.js
- [ ] Deploy fixed scripts/core/load-templates.js
- [ ] Close Foundry VTT
- [ ] Clear browser cache
- [ ] Restart Foundry
- [ ] Open character sheet (force-sensitive preferred)
- [ ] Verify Force tab renders without errors
- [ ] Check browser console for Handlebars errors
- [ ] Test force powers display
- [ ] Test form powers display (if any)
- [ ] Test discard pile and recovery buttons

---

## Rollback Procedure

If issues arise:

```bash
# Restore backup
cp scripts/core/load-templates.js.backup scripts/core/load-templates.js

# Restart Foundry and clear cache
```

---

## Why This Was Missed

The force-suite-tab.hbs was newly created today and included directly in force-tab.hbs. However, the template registration in `load-templates.js` wasn't updated to include the new partials. In Foundry v13+, all handlebars templates must be explicitly registered in the loader during initialization.

---

## Related Files

**Affected By This Fix:**
- `templates/actors/character/v2-concept/partials/tabs/force-tab.hbs` — includes force-suite-tab.hbs
- `templates/actors/character/v2-concept/partials/tabs/force-suite-tab.hbs` — includes force-suite-card.hbs
- `templates/actors/character/v2-concept/partials/panels/force-suite-card.hbs` — renders individual force power cards

**Template Registration:**
- `scripts/core/load-templates.js` — defines SWSE_TEMPLATES array (NOW FIXED)

---

## Status

✅ **Fixed**  
✅ **Syntax Validated**  
✅ **Registered in Template Loader**  
✅ **Ready for Deployment**

---

## Next Steps

After deploying this fix:

1. Clear Foundry cache and restart
2. Open a Force-sensitive character sheet
3. Navigate to Force tab
4. Verify all sections render (powers, forms, discard pile)
5. Monitor browser console for any remaining template errors

The Force power abilityMeta contract violation fix (from previous work) and this template wiring fix together should allow Force powers to display and function correctly on character sheets.

---

**Implementation Date:** 2026-05-18  
**Fixed By:** Claude (Anthropic)  
**Status:** Production Ready
