# SWSE V2 Character Sheet: Interaction Wiring Audit

**Status:** SHELL ALIVE, INTERACTION LAYER READY FOR WIRING
**Date:** 2026-03-15
**Phase:** Behavior Layer Implementation (No Redesign Required)

---

## Executive Summary

The SWSE V2 character sheet is **structurally stable**. All tabs render, navigation works, and the template/context hydration layer is healthy. However, the **interaction contract** is only **60% complete**:

- ✅ Header buttons are **fully wired** (Level Up, Store, Mentor, Conditions)
- ✅ Skills tab is **fully functional** with real actor data
- ✅ Combat actions render and can trigger dialogs
- ✅ Attack cards template exists with flip animation support
- ⚠️ Combat attacks need data hydration (currently empty in template)
- ❌ Talents tab is a placeholder (no actor talent data)
- ❌ Gear tab is a placeholder (no inventory rendering)
- ❌ Relationships tab is a placeholder (future phase)
- ❌ Force tab exists only if actor is Force Sensitive

---

## Part 1: What's Already Wired ✅

### 1.1 Header Button Actions (WORKING)

**Location:** `scripts/sheets/v2/character-sheet.js` lines 682–732
**Template:** `templates/actors/character/v2/character-sheet.hbs` lines 85–111

| Button | data-action | Handler | Status |
|--------|-------------|---------|--------|
| Level Up | `cmd-levelup` | Opens `SWSELevelUpEnhanced` | ✅ Working |
| Store | `cmd-store` | Opens `SWSEStore` | ✅ Working |
| Talk to Mentor | `open-mentor` | Calls `_openMentorConversation()` | ✅ Working |
| Conditions | `cmd-conditions` | Switches to overview tab | ✅ Working |
| Chargen | `cmd-chargen` | Opens `CharacterGenerator` | ✅ Working |

**Callable Systems Already Available:**
- `SWSELevelUpEnhanced` — robust progression UI (location: `scripts/apps/levelup/levelup-main.js`)
- `SWSEStore` — gear/equipment purchasing (location: `scripts/apps/store/store-main.js`)
- `MentorChatDialog` — mentor interaction flow (imported, line 6)
- Conditions UI — exists via health panel scrolling (overview tab)

---

### 1.2 Skills Tab (FULLY HYDRATED)

**Status:** COMPLETE AND FUNCTIONAL

The Skills tab is rendering real actor data:
- ✅ Skill list displays correctly
- ✅ Filter input bound to `data-action="filter-skills"`
- ✅ Sort dropdown bound to `data-action="sort-skills"`
- ✅ Each skill shows: total, ability, trained status, focused status
- ✅ Skill click handlers wired in `_activateSkillsUI()`

**Context provided by `_prepareContext()`:**
```javascript
derived.skills.list = [
  { key, label, total, ability, trained, focused, ... }
]
```

---

### 1.3 Combat Tab Partial Infrastructure

**Status:** TEMPLATE READY, DATA INCOMPLETE

**What exists:**
- `CombatRollConfigDialog` is wired (line 909, 946)
- Action click handlers exist (lines 900–911)
- Use action button handlers exist (lines 935–948)
- Attack card template exists but needs data

**Actions handler (`_activateCombatUI`):**
```javascript
html.querySelectorAll('[data-action="swse-v2-use-action"]').forEach(button => {
  button.addEventListener("click", { signal }, async (event) => {
    const actionId = button.dataset.actionId;
    const combatActions = this.actor.getFlag(game.system.id, "combatActions") ?? {};
    const data = combatActions[actionId];
    if (data) new CombatRollConfigDialog(this.actor, data).render(true);
  });
});
```

---

## Part 2: What Needs Hydration

### 2.1 Combat Tab: Attacks Not Rendering

**Problem:** The template expects `combat.attacks` array, but context provides empty array.

**Template location:** `templates/actors/character/v2/partials/attacks-panel.hbs`
**Expected structure:**
```javascript
combat = {
  attacks: [
    {
      id, name, weaponId, weaponName, weaponType,
      attackTotal, damageFormula,
      critRange, critMult,
      breakdown: { attack: [...], damage: [...], conditional: [...] },
      weaponProperties: { keen, flaming, frost, shock, vorpal }
    }
  ]
}
```

**Currently provided in context (line 360–362):**
```javascript
const combat = {
  attacks: derived?.attacks?.list ?? []  // ← LIKELY EMPTY
};
```

**What needs to happen:**
- Check if `derived.attacks.list` is populated by the actor system
- If not, call `ActorEngine` or attack calculation method to hydrate `derived.attacks`
- Ensure each attack object has the shape expected by the template

**Callable method to investigate:**
- `ActorEngine.computeAttacks()` (imported line 2)
- `CombatExecutor` (imported line 14)
- Check character actor's `mirrorAttacks()` function (character-actor.js line 70)

---

### 2.2 Talents Tab: Complete Placeholder

**Problem:** Template is hardcoded placeholder text ("Talents tab online").

**Location:** `templates/actors/character/v2/character-sheet.hbs` lines 393–402

**What's needed:**
1. Replace placeholder with real talent list
2. Render actor's talent items
3. Show talent source/class info
4. Add talent activation/status indicators

**Data likely available:**
```javascript
derived.talents = {
  groups: [],  // Talent groups (line 190)
  list: []     // Talent list (line 191)
}
```

**Callable actor method:**
- `actor.items.filter(i => i.type === 'talent')` — get all talent items

**Template pattern to follow:**
- See `templates/actors/character/tabs/talents-tab.hbs` (legacy, but shows structure)
- Or use actions panel pattern (see line 7–75 of actions-panel.hbs)

---

### 2.3 Gear Tab: Complete Placeholder

**Problem:** Template is hardcoded placeholder text ("Gear tab online").

**Location:** `templates/actors/character/v2/character-sheet.hbs` lines 416–424

**What's needed:**
1. Render inventory items (weapons, armor, equipment, consumables)
2. Show equipped status
3. Provide equip/unequip buttons
4. Show quantity and weight per item
5. Provide click-to-open-sheet on items

**Data already exists in context:**
```javascript
inventory = {
  weapons: [...],    // line 523
  armor: [...],
  equipment: [...],
  consumables: [...]
}
```

**Inventory structure (from line 450–458):**
```javascript
{
  type: 'weapon' | 'armor' | 'equipment' | 'consumable',
  id, name, img,
  system: { weight, quantity, equipped, ... }
}
```

**Callable methods:**
- `InventoryEngine.toggleEquip(actor, itemId)` (line 878)
- `InventoryEngine.removeItem(actor, itemId)` (line 875)
- `item.sheet.render(true)` (line 881)

**Wiring pattern already exists:**
- See `_activateInventoryUI()` (lines 825–892) — all handlers already in place
- Template just needs to render the inventory data

---

### 2.4 Relationships Tab: Future Phase (Lower Priority)

**Status:** Can remain placeholder unless system has relationship data.

**Question to ask:**
- Does the actor system have relationship/NPC tracking data?
- If yes, it would likely be in `actor.system.relationships` or actor flags

---

## Part 3: Code Ready for Wiring

### 3.1 Action Handler Framework (Already Established)

The sheet already uses standard patterns:

```javascript
html.querySelectorAll('[data-action="action-name"]').forEach(button => {
  button.addEventListener("click", { signal }, async (event) => {
    event.preventDefault();
    // Handler logic
  });
});
```

This pattern is used for:
- Header buttons ✅
- Combat actions ✅
- Skills filtering ✅
- Inventory operations ✅

**To add new actions:** Follow this pattern and add to `activateListeners()` method.

---

### 3.2 Context Preparation Pattern (Established)

The `_prepareContext()` method already:
1. Calls `actor.system.derived` (line 175)
2. Normalizes nested structures (lines 189–199)
3. Computes visual arrays (Force Points, DSP segments, etc.)
4. Builds complex context objects (inventory, combat, etc.)
5. Merges into `finalContext` (lines 518–560)

**To add new context:** Follow the `combat` and `forcePoints` examples (lines 360–373).

---

## Part 4: Priority Implementation Order

### Priority 1 (High Impact, Low Effort): Gear Tab

**Effort:** 2–3 hours
**Impact:** Immediate usability

1. Create `templates/actors/character/v2/partials/gear-panel.hbs`
2. Render `inventory.weapons`, `inventory.armor`, `inventory.equipment`
3. Hook into existing `_activateInventoryUI()` handlers (already wired)
4. Show equipped status, quantity, weight

**Example structure:**
```hbs
{{#each inventory.weapons as |weapon|}}
  <div class="gear-row" data-item-id="{{weapon.id}}">
    <span class="gear-name">{{weapon.name}}</span>
    <span class="gear-qty">{{weapon.system.quantity}}</span>
    <button data-action="equip" data-item-id="{{weapon.id}}">
      {{#if weapon.system.equipped}}Unequip{{else}}Equip{{/if}}
    </button>
  </div>
{{/each}}
```

---

### Priority 2 (Medium Impact, Medium Effort): Combat Tab Attacks

**Effort:** 3–4 hours
**Impact:** Core functionality for combat-focused play

1. Audit `derived.attacks` population — check if `ActorEngine` is computing them
2. If empty, call attack computation method in `_prepareContext()`
3. Ensure `combat.attacks` array has the shape expected by attacks-panel.hbs
4. Verify `CombatRollConfigDialog` integration works end-to-end

**Key question:** Where does `derived.attacks.list` get populated?
- Likely in `character-actor.js` `mirrorAttacks()` function (line 70)
- Or computed async by a `DerivedCalculator`

---

### Priority 3 (Medium Impact, Medium Effort): Talents Tab

**Effort:** 3–4 hours
**Impact:** Character build visibility

1. Query `actor.items.filter(i => i.type === 'talent')`
2. Group talents (if system has groups)
3. Create partial template with talent cards
4. Show source, description, active/passive status

**Callable to check:**
- Does `derived.talents.groups` already have data?
- If not, build grouping logic similar to inventory/weapons

---

### Priority 4 (Low Priority): Relationships Tab

**Effort:** 2–4 hours (TBD based on system structure)
**Impact:** Narrative support, not core to sheet function

---

## Part 5: Testing Strategy

After implementing each tab:

1. **Render Test:** Tab displays without JavaScript errors
2. **Data Test:** Verify expected data is present (weapons, talents, etc.)
3. **Action Test:** Buttons/clicks trigger expected handlers
4. **Integration Test:** Changes propagate to actor when Save is pressed
5. **Edge Case Test:** Empty inventory, no talents, force-insensitive actor, etc.

---

## Part 6: Code Locations Reference

| What | Where |
|------|-------|
| Sheet class | `scripts/sheets/v2/character-sheet.js` |
| Actor data model | `scripts/actors/v2/character-actor.js` |
| Sheet template | `templates/actors/character/v2/character-sheet.hbs` |
| Attack partial | `templates/actors/character/v2/partials/attacks-panel.hbs` |
| Actions partial | `templates/actors/character/v2/partials/actions-panel.hbs` |
| InventoryEngine | `scripts/engine/inventory/InventoryEngine.js` |
| ActorEngine | `scripts/governance/actor-engine/actor-engine.js` |
| CombatRollConfigDialog | `scripts/apps/combat/combat-roll-config-dialog.js` |
| SWSELevelUpEnhanced | `scripts/apps/levelup/levelup-main.js` |
| SWSEStore | `scripts/apps/store/store-main.js` |

---

## Part 7: No Blockers Identified

- ✅ No architectural redesign needed
- ✅ No missing dependencies
- ✅ No broken render cycle
- ✅ Action handler framework established
- ✅ Callable systems available
- ✅ Context preparation layer working
- ✅ Tab infrastructure solid

This is a **pure wiring task**, not a stabilization panic task.

---

## Recommendation

Begin with **Priority 1 (Gear Tab)** as a warm-up, then move to **Priority 2 (Combat Attacks)** as core functionality. Both are gated on existing infrastructure and follow established patterns.

Once those two tabs are hydrated, the sheet crosses from "facade" to "functional MVP."
