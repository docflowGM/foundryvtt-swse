# Modification Modal Shell Refactor - Compatibility Audit Report

**Date**: April 9, 2026  
**Scope**: Base shell refactor impact on all ModificationModalShell subclasses  
**Status**: ⚠️ CRITICAL ISSUES FOUND

---

## Executive Summary

The refactored `ModificationModalShell` introduces a new contract-based architecture with lifecycle hooks:
- `getHeaderContent()` → `{title, subtitle}`
- `getMainContent()` → `{list, detail}` (replacing old `{content, regions}`)
- `getFooterContent()` → `{totalCost, wallet, canConfirm}`

**Result**: 3 out of 5 subclasses are incompatible. However, due to AppV2's PARTS override behavior, **they appear to work but are using legacy templates**, not the new shell.

---

## Detailed Audit Results

### ✅ MeleeWeaponModificationApp (NEW - Refactored)

| Property | Value |
|----------|-------|
| **Status** | ✅ FULLY COMPATIBLE |
| **Extends** | ModificationModalShell |
| **Overrides** `getHeaderContent()` | ✅ Yes |
| **Overrides** `getMainContent()` | ✅ Yes (returns `{list, detail}`) |
| **Overrides** `getFooterContent()` | ✅ Yes (returns `{totalCost, wallet, canConfirm}`) |
| **Custom PARTS** | ❌ No (uses shell template) |
| **attachEventListeners()** | ✅ Yes (wires to new DOM structure) |
| **Uses new template** | ✅ `modification-modal-shell.hbs` |
| **Validation** | ✅ Proper single-select + apply pattern |

**Verdict**: Ready for testing.

---

### ❌ ArmorModificationApp (LEGACY - NOT MIGRATED)

| Property | Value |
|----------|-------|
| **Status** | ⚠️ SILENT INCOMPATIBILITY |
| **Extends** | ModificationModalShell |
| **Overrides** `getHeaderContent()` | ❌ No |
| **Overrides** `getMainContent()` | ❌ No |
| **Overrides** `getFooterContent()` | ❌ No |
| **Custom PARTS** | ✅ Yes (`armor/armor-modification.hbs`) |
| **attachEventListeners()` | ✅ Yes (legacy event wiring) |
| **Uses new template** | ❌ No (uses old template via PARTS override) |
| **Multi-select model** | ✅ Yes (expects `selectedUpgrades[]`) |

**Template Analysis**:
- Still uses `.armor-preview-container` (visual preview)
- Uses `.ls-panels-grid` multi-panel layout
- Uses `.armor-upgrade-card` multi-select cards
- Uses `.armor-apply-button` trigger
- Expects `tintColor`, `affordabilityClass`, `canAfford` in context

**Problem**: App doesn't implement new contract methods, so if shell template were used, it would show placeholder text. However, AppV2's PARTS override mechanism allows the app to keep using its old template and code.

**Verdict**: ⚠️ Works but doesn't adopt new architecture. Silently ignores refactor.

---

### ❌ BlasterCustomizationApp (LEGACY - NOT MIGRATED)

| Property | Value |
|----------|-------|
| **Status** | ⚠️ SILENT INCOMPATIBILITY |
| **Extends** | ModificationModalShell |
| **Overrides** `getHeaderContent()` | ❌ No |
| **Overrides** `getMainContent()` | ❌ No |
| **Overrides** `getFooterContent()` | ❌ No |
| **Custom PARTS** | ✅ Yes (`blaster/blaster-customization.hbs`) |
| **attachEventListeners()` | ✅ Yes (legacy event wiring) |
| **Uses new template** | ❌ No (uses old template via PARTS override) |
| **UI Pattern** | Single-select (radio button style) |

**Template Analysis**:
- Uses `.blaster-color-cell` grid layout (live color selector)
- Uses `.blaster-fx-button` button group (FX type selection)
- Uses `.blaster-apply-button` trigger
- Uses CSS variables (`--selected-bolt-color`) for live preview

**Problem**: Same as armor - doesn't implement new contract methods.

**Verdict**: ⚠️ Works but doesn't adopt new architecture. Silently ignores refactor.

---

### ⚠️ DroidModificationApp (SEPARATE ARCHITECTURE)

| Property | Value |
|----------|-------|
| **Status** | ⚠️ NOT AFFECTED (intentional) |
| **Extends** | BaseSWSEAppV2 (NOT ModificationModalShell) |
| **Architecture** | Custom transaction/review pipeline |
| **Template** | `droid-modification/droid-modification-app.hbs` |
| **Responsibility** | Transaction UI only, no direct mutations |
| **Review Pipeline** | Submits to GM review (PHASE 4 STEP 5) |

**Verdict**: Safe - has its own complete architecture independent of modal shell.

---

### ⚠️ VehicleModificationApp (SEPARATE ARCHITECTURE)

| Property | Value |
|----------|-------|
| **Status** | ⚠️ NOT AFFECTED (intentional) |
| **Extends** | SWSEApplication (NOT ModificationModalShell) |
| **Architecture** | Starship builder with narrator (Marl Skindar) |
| **Template** | `vehicle-modification.hbs` |
| **Pattern** | Wizard-style step progression |
| **Features** | Interactive modification browsing, cost calculator, narrator dialogue |

**Verdict**: Safe - has its own complete architecture independent of modal shell.

---

## Impact Summary Table

| App | Status | Issue | Impact |
|-----|--------|-------|--------|
| **Melee** | ✅ Refactored | None | Uses new shell architecture |
| **Armor** | ⚠️ Legacy | No contract impl | Uses old template (silent override) |
| **Blaster** | ⚠️ Legacy | No contract impl | Uses old template (silent override) |
| **Gear** | ⚠️ Legacy | No contract impl | Uses old template (silent override) |
| **Droid** | ✅ Separate | N/A | Independent architecture |
| **Vehicle** | ✅ Separate | N/A | Independent architecture |

---

## The Silent Incompatibility Problem

### What Happens Now:

1. **Old apps (Armor, Blaster, Gear)** define `static PARTS = { form: { template: "custom-template.hbs" } }`
2. **Foundry AppV2** respects subclass PARTS and uses the custom template instead of base shell template
3. **Apps render with old layout** but don't benefit from shell refactor
4. **New contract methods** (getMainContent, getFooterContent, getHeaderContent) are never called
5. **Shell template** is never used for these apps

### What Should Happen (Ideally):

1. Old apps should be **migrated to new contract** and use shell template
2. Old templates should be **deprecated and removed**
3. All modification UIs should use **unified 2-panel shell**
4. Code duplication should be **eliminated**

### The Risk:

If someone removes the old templates or the custom PARTS definitions without migrating the apps, these UIs will break silently because they fall back to placeholder text instead of proper rendering.

---

## Backward Compatibility Verdict

**The refactor introduced backward incompatibility through SILENT OVERRIDE:**

- ✅ Old apps still render (they use their own PARTS)
- ✅ Old event handling still works (custom attachEventListeners)
- ❌ Old apps don't implement new contract (no getMainContent, etc.)
- ❌ If PARTS override is removed, apps will display placeholder text
- ❌ New architecture benefits are not realized by 3 of 5 apps

---

## Gating Conditions Analysis

From user's explicit validation requirements:

### (1) Melee renders correctly?

**Status**: ✅ NEEDS TESTING
- New template structure in place
- Event wiring updated for new DOM structure
- Footer contract properly implemented
- **Still need to test**: Actual rendering, scrolling, footer display

### (2) Melee applies correctly?

**Status**: ✅ NEEDS TESTING
- Validation logic in place (slots, credits, duplicates)
- ModificationIntentBuilder integration verified
- Credit cost calculation correct
- **Still need to test**: Apply button click, cost deduction, item update

### (3) No other subclasses silently broken?

**Status**: ⚠️ PARTIALLY PASSED
- **Droid** & **Vehicle**: Safe (separate architectures)
- **Armor**, **Blaster**, **Gear**: Working but not migrated (silent override)
- **Not broken yet**, but vulnerable to future changes

---

## Recommendations

### Immediate (Blocking Armor Rollout):

1. **Test melee** thoroughly against gating conditions 1-2
2. **Verify** no other subclasses have lost functionality
3. **Confirm** that old apps still use their custom templates
4. Document PARTS override behavior in base shell

### Short-term (Before Armor Migration):

1. **Choose architecture for Armor**:
   - Option A: Migrate to new contract + shell template (like melee)
   - Option B: Keep old template + add new methods as no-ops
2. **Replicate pattern** for Blaster, Gear
3. **Remove** old templates once migration complete
4. **Add safety checks** to prevent silent fallback to placeholder text

### Medium-term (Architecture Stability):

1. **Enforce contract** in base shell (throw error if not overridden)
2. **Remove old template references** once all apps migrated
3. **Add integration tests** for all modification UI workflows
4. **Document** the contract clearly for future subclasses

---

## Files Referenced

**Base Shell** (Refactored):
- `/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js`
- `/systems/foundryvtt-swse/templates/apps/base/modification-modal-shell.hbs`
- `/systems/foundryvtt-swse/styles/apps/modification-modal-shell.css`

**Melee** (Refactored):
- `/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js`
- `/systems/foundryvtt-swse/styles/apps/melee-modification.css`

**Legacy Apps** (Still using old templates):
- `/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js`
- `/systems/foundryvtt-swse/templates/apps/armor/armor-modification.hbs`
- `/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js`
- `/systems/foundryvtt-swse/templates/apps/blaster/blaster-customization.hbs`
- `/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js`
- `/systems/foundryvtt-swse/templates/apps/gear/gear-modification.hbs`

**Separate Architecture** (Not affected):
- `/systems/foundryvtt-swse/scripts/apps/droid-modification-app.js`
- `/systems/foundryvtt-swse/scripts/apps/vehicle-modification-app.js`

---

## Validation Checklist

- [ ] Melee renders with correct 2-panel layout
- [ ] Melee footer displays cost/wallet correctly
- [ ] Melee selection updates detail panel without lag
- [ ] Melee confirm applies upgrade and deducts credits
- [ ] Melee validation rejects: duplicates, insufficient credits, full slots
- [ ] Armor still renders with old template (verify PARTS override works)
- [ ] Blaster still renders with old template (verify PARTS override works)
- [ ] Gear still renders with old template (verify PARTS override works)
- [ ] No console errors or placeholder text in any app
- [ ] Item editor 3-rail layout (header/body/footer) still works

---

**Report Status**: COMPLETE - Ready for testing phase
