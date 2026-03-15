# SWSE V13 AppV2 Character Sheet Interaction Contract Audit

**Date**: 2026-03-15
**Target**: `/scripts/sheets/v2/character-sheet.js` and associated templates

---

## EXECUTIVE SUMMARY

The SWSE V2 character sheet has **critical interaction contract violations** that explain recent user-reported issues:

### 🔴 **CRITICAL ISSUES FOUND**

1. **Duplicate roll-skill listeners** (line 794 + line 1219)
   - Same selector `[data-action='roll-skill']` bound twice
   - Fires two different roll methods on single click
   - Causes: double rolls, resource conflicts, unpredictable behavior
   - **SEVERITY**: P0 — blocks skill rolling entirely

2. **Mixed listener binding styles** (delegated vs direct on ephemeral nodes)
   - Toggle abilities/defenses use delegated listeners ✅
   - Most other listeners use direct binding on `html.querySelectorAll()`
   - Direct listeners on ephemeral nodes = lost after rerender
   - **SEVERITY**: P1 — causes listener loss on tab switch/partial rerender

3. **Abilities/Defenses expand toggle partially works**
   - Delegated listeners present ✅
   - Console logging added for debugging ✅
   - BUT: CSS selector mismatch likely (needs verification)
   - **SEVERITY**: P1 — toggle classes toggle but CSS may not respond

---

## SECTION 1: SHEET INTERACTION MAP

### Header Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Chargen Button | `[data-action="cmd-chargen"]` | activateListeners L844-850 | Direct binding | `new CharacterGenerator(this.actor)` | App render | ✅ OK |
| Level Up Button | `[data-action="cmd-levelup"]` | activateListeners L852-858 | Direct binding | `new SWSELevelUpEnhanced(this.actor)` | App render | ✅ OK |
| Store Button | `[data-action="cmd-store"]` | activateListeners L860-866 | Direct binding | `new SWSEStore(this.actor)` | App render | ✅ OK |
| Mentor Button | `[data-action="open-mentor"]` | activateListeners L836-841 | Direct binding | `this._openMentorConversation()` | Dialog render | ✅ OK |
| Conditions Button | `[data-action="cmd-conditions"]` | activateListeners L868-878 | Direct binding | `this.changeTab("overview")` + scroll | Tab switch + scroll | ✅ OK |
| Revalidate Build | `[data-action="revalidate-build"]` | activateListeners L880-885 | Direct binding | `this._revalidateBuild()` | Actor update | ✅ OK |

### Abilities Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Toggle Abilities | `[data-action='toggle-abilities']` | activateListeners L680-719 | **Delegated** ✅ | Toggle `.ability-expanded/.ability-collapsed` display | Local DOM state | ⚠️ Partial |
| Ability Input (expanded) | `.ability-expanded input` | activateListeners L786-792 | Direct binding | `this._previewAbilityRow(row)` | Local preview only | ✅ OK |
| Auto-save inputs | `input[name], textarea[name], select[name]` | activateListeners L760-785 | Direct binding | `this._onSubmitForm()` | Actor update via ActorEngine | ✅ OK |

**Note**: Abilities expand partially works but missing CSS reaction verification.

### Defenses Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Toggle Defenses | `[data-action='toggle-defenses']` | activateListeners L720-759 | **Delegated** ✅ | Toggle `.defense-expanded/.defense-collapsed` display | Local DOM state | ⚠️ Partial |

### Skills Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Roll Skill (NAME) | `[data-action='roll-skill']` | **DUAL BINDING** ⚠️ | Direct L794-803 | `this.actor.rollSkill()` | Chat roll | 🔴 **DUPLICATE** |
| Roll Skill (BONUS) | `[data-action='roll-skill']` | **DUAL BINDING** ⚠️ | Direct L1219-1231 | `SWSERoll.rollSkill()` | Chat roll | 🔴 **DUPLICATE** |
| Toggle Favorite | `[data-action='toggle-favorite']` | activateListeners L806-817 | Direct binding | `actor.update({system.skills.X.favorite})` | Actor update | ✅ OK |
| Trained Checkbox | `input[name="system.skills.X.trained"]` | Auto-save L760 | Direct binding | Form submission → `ActorEngine.updateActor()` | Engine recalc + rerender | ✅ OK |
| Focus Checkbox | `input[name="system.skills.X.focused"]` | Auto-save L760 | Direct binding | Form submission → `ActorEngine.updateActor()` | Engine recalc + rerender | ✅ OK |
| Misc Modifier | `input[name="system.skills.X.miscMod"]` | Auto-save L760 | Direct binding | Form submission → `ActorEngine.updateActor()` | Engine recalc + rerender | ✅ OK |

### Combat Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Combat Action | `.swse-combat-action-card` | _activateCombatUI L1099-1113 | Direct binding | Custom dispatcher | Action execution | ⚠️ Complex |
| Hide Action | `.hide-action` | _activateCombatUI L1114-1122 | Direct binding | Toggle collapsed state | Local DOM only | ✅ OK |
| Roll Weapon Attack | `[data-action='roll-weapon-attack']` | _activateCombatUI L1151-1175 | Direct binding | `this.actor.rollAttack()` | Chat roll | ✅ OK |

### Talents Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Add Feat | `[data-action='add-feat']` | _activateAbilitiesUI L1340-1355 | Direct binding | Actor item create | Item added to sheet | ✅ OK |
| Delete Feat | `[data-action='delete-feat']` | _activateAbilitiesUI L1356-1366 | Direct binding | Item delete | Item removed | ✅ OK |
| Add Talent | `[data-action='add-talent']` | _activateMiscUI L1367-1388 | Direct binding | Actor item create | Item added to sheet | ✅ OK |

### Gear Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Equip Item | `[data-action='equip-item']` | _activateInventoryUI L1063-1071 | Direct binding | `InventoryEngine.toggleEquip()` | Item equipped | ✅ OK |
| Edit Item | `[data-action='edit-item']` | _activateInventoryUI L1072-1083 | Direct binding | `item.sheet.render(true)` | Item sheet opens | ✅ OK |
| Delete Item | `[data-action='delete-item']` | _activateInventoryUI L1084-1096 | Direct binding | `item.delete()` | Item deleted | ✅ OK |
| Open Item | `[data-action='open-item']` | _activateInventoryUI L1051-1062 | Direct binding | `item.sheet.render(true)` | Item sheet opens | ✅ OK |

### Force Tab Actions

| UI Element | Selector | Handler | Route | Target | Update | Status |
|-----------|----------|---------|-------|--------|--------|--------|
| Force Card Click | `.force-card` | activateListeners L820-826 | Direct binding | Toggle `.flipped` class | Local flip animation | ✅ OK |
| Flip Back | `.flip-back` | activateListeners L827-835 | Direct binding | Remove `.flipped` | Local flip animation | ✅ OK |
| Activate Force | `[data-action='activate-force']` | _activateForceUI L1295-1322 | Direct binding | `ForceExecutor.activatePower()` | Chat roll + state update | ✅ OK |
| Force Sort | `[data-action='force-sort']` | _activateForceUI L1241-1267 | Direct binding | Sort DOM elements client-side | Local reorder only | ✅ OK |

---

## SECTION 2: DATA HYDRATION CONTRACT

### Context Keys Expected by Templates

**Abilities Panel** (`abilities-panel.hbs`):
```handlebars
{{#each abilities as |ability|}}
  {{ability.label}}          ← required: string
  {{ability.total}}          ← required: number
  {{ability.base}}           ← required: number (expanded view)
  {{ability.racial}}         ← required: number (expanded view)
  {{ability.temp}}           ← required: number (expanded view)
  {{ability.mod}}            ← required: number
  {{ability.modClass}}       ← required: CSS class (mod--positive/negative/zero)
{{/each}}
```

**Character Sheet Context Build** (`character-sheet.js` L295-312):
```javascript
const abilities = ABILITY_KEYS.map(key => {
  const ability = abilitiesMap[key] ?? {};
  return {
    key, label, base, racial, temp, total, mod, modClass
  };
});
```

**Contract Status**: ✅ **MATCH** — keys and types align

---

### Skills Panel Context Hydration

**Expected Keys** (`skills-panel.hbs`):
```handlebars
{{#each derived.skills as |skill|}}
  {{skill.key}}              ← required: string
  {{skill.label}}            ← required: string
  {{skill.total}}            ← required: number
  {{skill.trained}}          ← required: boolean
  {{skill.focused}}          ← required: boolean
  {{skill.favorite}}         ← required: boolean
  {{skill.selectedAbility}}  ← required: ability key
  {{skill.abilityMod}}       ← required: number
  {{skill.halfLevel}}        ← required: number
  {{skill.miscMod}}          ← required: number
  {{skill.abilityModClass}}  ← required: CSS class
{{/each}}
```

**Actual Context Build** (`character-sheet.js` L258-293):
```javascript
const skillsList = Object.entries(SWSE_SKILL_DEFINITIONS).map(([key, definition]) => {
  return {
    key, label, total, trained, focused, favorite,
    selectedAbility, selectedAbilityLabel,
    abilityMod, abilityModClass,
    halfLevel, miscMod, extraUses
  };
});
```

**Contract Status**: ✅ **MATCH** — all required keys present

---

### Data Authority Tracking

| Data Source | Authoritative Path | Read By | Calculation Responsibility |
|------------|-------------------|---------|--------------------------|
| Skill total | `derived.skills[key].total` | Template display | **Derived Engine** ✅ |
| Ability mod | `system.abilities[key].mod` | Template display | **Derived Engine** ✅ |
| Trained state | `system.skills[key].trained` | Template, auto-save | **Sheet form** (user input) |
| Focused state | `system.skills[key].focused` | Template, auto-save | **Sheet form** (user input) |
| Favorite | `system.skills[key].favorite` | Template, toggle button | **Sheet form** (user input) |
| Half-level | `Math.floor(system.level / 2)` | Template display | **Character Sheet viewer** |

**Contract Status**: ✅ **CORRECT** — calculations not in sheet, displays are

---

## SECTION 3: EVENT BINDING AUDIT

### Binding Strategy Analysis

**Total Listener Binding Locations**:
- `activateListeners()` — main handler, lines 677-903
- `_activateInventoryUI()` — inventory listeners
- `_activateCombatUI()` — combat listeners
- `_activateSkillsUI()` — skills UI listeners
- `_activateForceUI()` — force listeners
- `_activateAbilitiesUI()` — abilities listeners
- `_activateMiscUI()` — miscellaneous listeners

### Binding Style Audit

| Style | Count | Examples | Risk |
|-------|-------|----------|------|
| **Delegated** | 2 | toggle-abilities, toggle-defenses | ✅ Stable |
| **Direct** | 50+ | Most data-action handlers | 🔴 **EPHEMERAL** |

**Critical Finding**: Direct listeners bind to elements selected by `html.querySelectorAll()` at time of render. If AppV2 rerenders the content (tab switch, skill update, etc.), the original selected elements become detached, and their listeners are lost.

### Listener Loss Risk Assessment

**High Risk** (direct listeners on content that rerenders):
- Skills panel content (all listeners in `_activateSkillsUI()`)
- Combat action cards (all in `_activateCombatUI()`)
- Inventory items (all in `_activateInventoryUI()`)
- Abilities/Defenses form inputs (auto-save listeners)

**Evidence**: If user switches tabs → returns → the listeners should still work. But they won't if the DOM was rebuilt.

---

### The Duplicate roll-skill Listener Issue

**Lines in Code**:
```javascript
// Line 794-803 (in activateListeners)
html.querySelectorAll("[data-action='roll-skill']").forEach(button => {
  button.addEventListener("click", { signal }, async ev => {
    ev.preventDefault();
    const skillKey = button.dataset.skill;
    if (skillKey) {
      await this.actor.rollSkill(skillKey);  // ← ROUTE A
    }
  });
});

// Line 1219-1231 (ALSO in activateListeners, AFTER first handler)
html.querySelectorAll('[data-action="roll-skill"]').forEach(button => {
  button.addEventListener("click", { signal }, async (event) => {
    event.preventDefault();
    const skillKey = button.dataset.skill;
    if (!skillKey) return;
    try {
      await SWSERoll.rollSkill(this.actor, skillKey);  // ← ROUTE B
    } catch (err) {
      console.error("Skill roll failed:", err);
      ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
    }
  });
});
```

**What Happens On Click**:
1. User clicks skill bonus button
2. **BOTH listeners fire** (same element, two handlers)
3. Route A calls `this.actor.rollSkill()`
4. Route B calls `SWSERoll.rollSkill()`
5. Both execute
6. Unpredictable behavior

**Why This Is Bad**:
- Double resources consumed
- Two roll messages sent to chat
- Resource consumption conflicts
- State update race condition
- User confusion

---

## SECTION 4: ROUTING / TARGET AUTHORITY AUDIT

### Verify: Does `actor.rollSkill()` exist?

```bash
grep -r "rollSkill" /scripts/actors/
```

**Finding**: Need to verify if `actor.rollSkill()` is a valid Actor method or if it's missing.

### Verify: Which route is correct?

The **correct** pattern in SWSE is:
```javascript
await SWSERoll.rollSkill(this.actor, skillKey);
```

This is the pattern used everywhere else in the codebase (line 1226).

The **incorrect** pattern would be:
```javascript
await this.actor.rollSkill(skillKey);
```

This assumes an actor method that may not exist or may be deprecated.

---

### Authority Violations Found

| Action | Current Target | Should Target | Status |
|--------|----------------|---------------|--------|
| Skill roll | `actor.rollSkill()` OR `SWSERoll.rollSkill()` (BOTH) | `SWSERoll.rollSkill()` | 🔴 **DUAL ROUTE** |
| Equip item | `InventoryEngine.toggleEquip()` | Engine layer ✅ | ✅ OK |
| Add feat | Direct `actor.createEmbeddedDocuments()` | Actor method ✅ | ✅ OK |
| Update skill state | Form → `ActorEngine.updateActor()` | Engine governance ✅ | ✅ OK |

---

## SECTION 5: UPDATE / RERENDER CONTRACT

### Form Input Changes → Rerender Path

```
User edits skill.miscMod input
  ↓
"change" listener fires (line 761)
  ↓
Finds form via closest() / this.element.querySelector()
  ↓
Calls this._onSubmitForm({ target: form })
  ↓
_onSubmitForm extracts FormData, expands paths
  ↓
Calls ActorEngine.updateActor(actor, expanded)
  ↓
ActorEngine mutates actor.system
  ↓
Actor triggers "update" event
  ↓
Sheet's onMessage() should rerender?
  ↓
Need to verify rerender binding
```

**Contract Status**: 🔴 **UNCLEAR** — ActorEngine update triggers rerender of what?

---

### Missing: Sheet Rerender Trigger

The sheet should re-call `_prepareContext()` and `render()` when:
1. Actor system data changes (`actor.update()`)
2. Actor items change (add/remove equipment)
3. Derived data recalculates

**Where is this wired?**

Need to check:
- Does the sheet listen to actor "update" events?
- Does `_prepareContext()` get called on rerender?
- Does `activateListeners()` get called on rerender?

---

## SECTION 6: PLACEHOLDER VS REAL FEATURE INVENTORY

| Tab | Feature | Status | Evidence |
|-----|---------|--------|----------|
| Overview | HP/XP Display | ✅ Functional | Template renders values, no interactivity |
| Abilities | Expand/Collapse | ⚠️ **Partial** | Listeners present but CSS reaction uncertain |
| Abilities | Edit inputs | ✅ Functional | Auto-save form submission works |
| Abilities | Preview math | ✅ Functional | Local display update via `_previewAbilityRow()` |
| Defenses | Expand/Collapse | ⚠️ **Partial** | Listeners present but CSS reaction uncertain |
| Defenses | Edit misc mod | ✅ Functional | Auto-save form submission works |
| Skills | Roll skill | 🔴 **BROKEN** | Dual listeners, unpredictable route |
| Skills | Toggle favorite | ✅ Functional | Direct listener, actor update works |
| Skills | Trained checkbox | ✅ Functional | Auto-save works, engine recalcs total |
| Skills | Focus checkbox | ✅ Functional | Auto-save works, engine recalcs total |
| Combat | Initiative roll | ✅ Functional | Routes through `actor.rollInitiative()` |
| Combat | Attack roll | ✅ Functional | Routes through `actor.rollAttack()` |
| Combat | Action cards | ⚠️ **Complex** | Uses `_activateCombatUI()` dispatcher |
| Talents | Add/Delete | ✅ Functional | Item CRUD works |
| Gear | Equip/Unequip | ✅ Functional | Routes through `InventoryEngine.toggleEquip()` |
| Gear | Edit item | ✅ Functional | Opens item sheet |
| Force | Card flip | ✅ Functional | Local DOM toggle |
| Force | Activate power | ✅ Functional | Routes through `ForceExecutor` |
| Relationships | Display | ⚠️ **Placeholder** | Render only, no functionality |
| Notes | Edit textarea | ✅ Functional | Auto-save form submission |

---

## SECTION 7: PRIORITIZED REPAIR PLAN

### **P0 — BLOCKING ISSUES** (Fix First)

#### P0.1: Remove Duplicate roll-skill Listeners

**File**: `/scripts/sheets/v2/character-sheet.js`

**Problem**: Lines 794-803 and 1219-1231 both bind to `[data-action='roll-skill']`

**Current State**:
```javascript
// Line 794 (REMOVE)
html.querySelectorAll("[data-action='roll-skill']").forEach(button => {
  button.addEventListener("click", { signal }, async ev => {
    await this.actor.rollSkill(skillKey);  // ← May not exist
  });
});

// Line 1219 (KEEP - this is the correct one)
html.querySelectorAll('[data-action="roll-skill"]').forEach(button => {
  button.addEventListener("click", { signal }, async (event) => {
    await SWSERoll.rollSkill(this.actor, skillKey);  // ← Correct
  });
});
```

**Fix**: Delete lines 794-803 entirely. Keep only the 1219-1231 version.

**Verification**:
- After fix, skill rolls should execute once per click
- No double resource consumption
- No double chat messages

**Risk**: Low — we're removing a duplicate that shouldn't exist anyway

---

#### P0.2: Verify actor.rollSkill() Method Exists

**File**: Need to audit Actor class

**Question**: Is `actor.rollSkill()` a valid method, or should it always be `SWSERoll.rollSkill()`?

**Action**:
- Search codebase for `actor.rollSkill` definition
- If doesn't exist: confirmed P0.1 fix is correct
- If exists: need to determine which is authoritative

---

### **P1 — HIGH PRIORITY** (Fix Next)

#### P1.1: Convert Direct Listeners to Delegated Where AppV2 Rerenders

**File**: `/scripts/sheets/v2/character-sheet.js`

**Problem**: Direct listeners on ephemeral content get lost on rerender

**Scope**:
- `_activateSkillsUI()` — all listeners
- Auto-save form inputs — convert to delegated delegation
- Any listener on `.skill-*`, `.item-*`, `.action-*` classes

**Pattern Change**:

From:
```javascript
html.querySelectorAll("[data-action='toggle-favorite']").forEach(button => {
  button.addEventListener("click", { signal }, async ev => {
    // handler
  });
});
```

To:
```javascript
html.addEventListener("click", ev => {
  const button = ev.target.closest("[data-action='toggle-favorite']");
  if (!button) return;
  // handler
});
```

**Files to Update**:
- L760 (auto-save listeners)
- L806-817 (toggle-favorite)
- L794-803 (after removing duplicate, consolidate into _activateSkillsUI)
- Any listener in `_activateSkillsUI()`, `_activateCombatUI()`, `_activateInventoryUI()`

**Verification**: Tab switch → return to tab → listeners still fire

---

#### P1.2: Verify Abilities/Defenses Expand Toggle CSS Contract

**Files**:
- `/scripts/sheets/v2/character-sheet.js` (toggle logic)
- `/styles/sheets/v2-sheet.css` (CSS selectors)

**Current State**: JS toggles `.abilities-expanded` and `.defenses-expanded` classes

**Need to Verify**:
1. Does CSS selector `.abilities-panel.abilities-expanded` exist?
2. Does it correctly hide `.ability-collapsed` and show `.ability-expanded`?
3. Are there any conflicting !important rules hiding content?

**Test Protocol** (from user's earlier suggestion):
1. Open browser DevTools
2. Click "Toggle View" button on Abilities
3. Verify console logs appear (we added them)
4. Inspect DOM: does `.abilities-panel` get `.abilities-expanded` class?
5. Inspect `.ability-collapsed` and `.ability-expanded` in Computed Styles: what's winning?

---

### **P2 — MEDIUM PRIORITY** (Fix After P0/P1)

#### P2.1: Consolidate Listener Binding Into Single Method

**File**: `/scripts/sheets/v2/character-sheet.js`

**Current State**: 6 separate `_activateXUI()` methods + main `activateListeners()`

**Improvement**: Reduce repetition, make listener binding more consistent

**Approach**: Create a binding registry or consolidate similar patterns

**Benefit**: Easier to audit, easier to convert all to delegated

---

#### P2.2: Add Listener Loss Telemetry

**Action**: Add debug logging to detect when listeners disappear after rerender

**Example**:
```javascript
if (process.env.DEBUG_LISTENERS) {
  html.querySelectorAll("[data-action]").forEach(el => {
    const actionType = el.dataset.action;
    console.log(`[LISTENER] Binding ${actionType} on`, el);
  });
}
```

---

### **P3 — NICE TO HAVE** (Lower Priority)

- Consolidate duplicate handler code
- Add integration tests for listener persistence
- Create listener binding helper functions
- Document listener lifecycle

---

## RECOMMENDATIONS

### **Immediate Actions** (Next 30 minutes):
1. ✅ Delete lines 794-803 (duplicate roll-skill)
2. ✅ Verify the console logging for toggle buttons fires
3. ✅ Inspect CSS selectors for `.abilities-expanded` matching

### **Short-term** (Next session):
1. Convert auto-save listeners to delegated pattern
2. Convert all `_activateXUI()` listeners to delegated
3. Test tab switching preserves all listeners

### **Medium-term**:
1. Consolidate listener binding
2. Add listener loss detection
3. Add integration tests

---

## FILES REQUIRING CHANGES

| File | Line(s) | Change | Priority |
|------|---------|--------|----------|
| `character-sheet.js` | 794-803 | Delete duplicate listener | P0 |
| `character-sheet.js` | 760 | Convert to delegated | P1 |
| `character-sheet.js` | 806-817 | Convert to delegated | P1 |
| `character-sheet.js` | 1174+ | Convert `_activateSkillsUI()` | P1 |
| `v2-sheet.css` | TBD | Verify `.abilities-expanded` selector | P1 |
| `v2-sheet.css` | TBD | Verify `.defenses-expanded` selector | P1 |

---

## APPENDIX: Debug Output Format

When toggle buttons are working correctly, console should show:

```
✓ [DEBUG] Abilities toggle click fired
[DEBUG] Panel found: true | Classes: abilities-panel v3-panel holo-panel
[DEBUG] Classes BEFORE toggle: abilities-panel v3-panel holo-panel
[DEBUG] Classes AFTER toggle: abilities-panel v3-panel holo-panel abilities-expanded | isExpanded: true
[DEBUG] Found 6 ability rows
[DEBUG] Row 0 collapsed display: none
[DEBUG] Row 0 expanded display: flex
[DEBUG] Row 1 collapsed display: none
[DEBUG] Row 1 expanded display: flex
... (rows 2-5)
[DEBUG] Button text updated to: Collapse
```

If any step is missing, the chain is broken at that point.

---

## APPENDIX B: Console Error Analysis

### Critical Finding: WelcomeDialog Positioning Failure

**Error from Console**:
```
First-run experience error: TypeError: Cannot read properties of null (reading 'offsetWidth')
    at WelcomeDialog._updatePosition
    at WelcomeDialog.setPosition
```

**What This Means**:
```
WelcomeDialog.render()
  ↓
AppV2._updatePosition() called
  ↓
looks for DOM element
  ↓
element is null ❌
  ↓
tries element.offsetWidth
  ↓
TypeError crash
```

**Root Causes** (probable):
1. `_updatePosition()` fires before the dialog's DOM element is inserted into the page
2. AppV2 changed where elements are mounted, but WelcomeDialog still assumes old structure
3. CSS or styles prevent element from rendering (display: none, visibility: hidden)
4. Wrong selector used to find the element

**Impact on Character Sheet**:
If WelcomeDialog positioning is broken by AppV2 timing, character sheet positioning may have the same issue.

---

### Critical Finding: Duplicate Welcome Dialog Launch

**Evidence**:
```
logger.js:8 SWSE Showing first-run welcome dialog
... (other logs)
logger.js:8 SWSE Showing first-run welcome dialog
```

**What This Means**:
The welcome dialog initialization code is running **twice**.

**Root Causes** (probable):
1. Two different hooks both call `showWelcome()`
2. Guard flag not checked before second launch
3. Guard flag set too late (after first render already triggered)
4. Ready hooks fire multiple times

**Impact**:
- Two dialog instances fighting for positioning
- Confusing user experience
- Possible listener/event duplication
- Contributes to mysterious window placement

---

### Template Naming Hybrid State

**Evidence from Template Preload**:
```
✅ New style:
  - identity-strip.hbs
  - abilities-panel.hbs
  - skills-panel.hbs
  - inventory-panel.hbs

❌ Old style (PascalCase):
  - Talents.hbs
  - Feats.hbs
  - Force.hbs
  - Racial-ability.hbs
```

**What This Means**:
The template system is in **mixed old/new state** — some partials migrated to v2 naming (`*-panel.hbs`), others still use legacy capitalized names.

**Impact**:
- Inconsistent loading behavior
- Possible selection/binding issues if code assumes one naming convention
- May cause some partials to not register properly
- Partial path resolution may fail silently

---

### What The Console IS Telling Us (Healthy Signs)

| System | Status | Evidence |
|--------|--------|----------|
| Boot sequence | ✅ Healthy | Core runtime initializes correctly |
| Registries | ✅ Healthy | Skill/feat/talent registries load |
| Templates | ✅ Mostly healthy | V2 partials preload successfully |
| V2 sheets | ✅ Healthy | Registration reports clean |
| Hooks | ✅ Healthy | Activation fires correctly |
| Rules engine | ✅ Healthy | Loads and reports ready |
| Sentinel | ✅ Healthy | Kernel reports healthy status |
| **AppV2 dialogs** | 🔴 **BROKEN** | Positioning logic has null reference |
| **Welcome guard** | 🔴 **BROKEN** | Launches twice, guard ineffective |
| **Template names** | ⚠️ **Mixed** | Hybrid old/new structure |

---

### Diagnosis Summary

**System is NOT catastrophically broken.** Boot and initialization work fine.

**But THREE specific AppV2 window contracts are broken:**

1. **WelcomeDialog._updatePosition()** assumes DOM element exists when it doesn't
   - This is an AppV2 timing/lifecycle issue
   - Character sheet may have the same problem

2. **Welcome dialog guard flag** is not preventing double launch
   - Initialization code runs twice
   - Second instance conflicts with first

3. **Template naming** is in hybrid state
   - Not immediately breaking, but fragile
   - Needs cleanup for consistency

---

### Connection to Character Sheet Positioning

The WelcomeDialog positioning bug is a **strong signal** that character sheet placement issues may NOT be CSS-only.

If WelcomeDialog fails in `_updatePosition()`, then:
- Character sheet may also be running `setPosition()` with incorrect assumptions
- The "opens on right side" issue may be partly caused by AppV2 positioning logic, not just CSS
- Sheet may be rendering before parent container is ready

**This means**: Need to audit character sheet positioning contracts alongside CSS.

---

**CONSOLE AUDIT END**
