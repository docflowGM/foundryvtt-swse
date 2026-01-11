# Character Sheet Button Functionality Audit

## Summary
**Total Buttons Found:** 60+
**Broken/Missing Handlers:** 8
**Status:** ISSUES FOUND - Requires fixes

---

## ✅ Working Buttons

### Header Buttons (persistent-header.hbs)
- ✅ `.level-up` → `_onLevelUp` (line 303)
- ✅ `.character-generator` → `_onCharacterGenerator` (line 304)
- ✅ `.open-store` → `_onOpenStore` (line 305)
- ✅ `.pick-species-btn` → `_onPickSpecies` (line 306)
- ✅ `.add-class-btn` → `_onAddClass` (line 307)
- ✅ `.roll-force-point` → `_onRollForcePoint` (line 318)

### Condition Track (condition-track.hbs)
- ✅ `.track-step` → `_onConditionTrackClick` (line 310)
- ✅ `.track-button.improve` → `_onRecoverCondition` (line 311)
- ✅ `.track-button.worsen` → `_onWorsenCondition` (line 312)

### Summary Tab Buttons (summary-tab.hbs)
- ✅ `[data-action="rollAttack"]` → `_onRollAttack` (line 327)
- ✅ `[data-action="rollDamage"]` → `_onRollDamage` (line 328)
- ✅ `.spend-destiny-btn` → `_onSpendDestinyPoint` (line 443)
- ✅ `.fulfill-destiny-btn` → `_onFulfillDestiny` (line 428)
- ✅ `.reset-destiny-btn` → `_onResetDestiny` (line 433)
- ✅ `.enable-destiny-btn` → `_onEnableDestiny` (line 438)
- ✅ `.rollable` elements → `_onRoll` (base-sheet line 318)

### Combat Tab Buttons (combat-tab.hbs)
- ✅ `[data-action="createItem"]` (weapon/armor/feat) → `_onItemCreate` (base-sheet)
- ✅ `.item-control.item-edit` → `_onItemControl` (base-sheet line 199)
- ✅ `.item-control.item-delete` → `_onItemControl` (base-sheet line 200)
- ✅ `[data-action="rollCombatAction"]` → `_onPostCombatAction` (line 329)

### Force Tab Buttons (force-tab.hbs)
- ✅ `[data-action="spendForcePoint"]` → `_onSpendForcePoint` (line 321)
- ✅ `[data-action="restForce"]` → `_onRestForce` (line 324)
- ✅ `[data-action="addToSuite"]` → `_onAddToSuite` (line 322)
- ✅ `[data-action="removeFromSuite"]` → `_onRemoveFromSuite` (line 323)
- ✅ `[data-action="usePower"]` → `_onUsePower` (line 319)
- ✅ `[data-action="regainForcePower"]` → `_onRegainForcePower` (line 320)

### Talents Tab Buttons (talents-tab.hbs)
- ✅ `[data-action="toggleTree"]` → `_onToggleTree` (line 332)
- ✅ `[data-action="selectTalent"]` → `_onSelectTalent` (line 333)
- ✅ `[data-action="viewTalent"]` → `_onViewTalent` (line 334)
- ✅ `[data-action="filterTalents"]` → `_onFilterTalents` (line 335)
- ✅ `[data-action="create"]` (talent) → `_onItemCreate` via dispatcher (line 180)

### Skills Tab Buttons (skills-tab.hbs)
- ✅ `.roll-skill` → `_onSkillRoll` (line 366)
- ✅ `.skill-action-roll` → `_onSkillActionRoll` (line 372)
- ✅ `.skill-expand-btn` → `_toggleSkillPanel` (line 379)
- ✅ `.filter-btn` → `_onSkillFilterChange` (line 408)
- ✅ `.sort-select` → `_onSkillSortChange` (line 414)
- ✅ `.skill-favorite-toggle` → `_onToggleSkillFavorite` (line 420)

### Import/Export Tab Buttons (import-export-tab.hbs)
- ✅ `.export-character-json-btn` → `_onExportCharacterJSON` (line 465)
- ✅ `.export-template-btn` → `_onExportTemplate` (line 470)
- ✅ `.import-character-btn` → `_onImportCharacter` (line 475)

### Progression & Dark Side
- ✅ `.roll-attributes-btn` → `_onRollAttributes` (line 315)
- ✅ `.reduce-dsp` → `_onReduceDSP` (line 449)
- ✅ `.increase-dsp` → `_onIncreaseDSP` (line 454)
- ✅ `.dark-inspiration` → `_onDarkInspiration` (line 459)

### Feat Actions Panel (feat-actions-panel.hbs)
- ✅ `[data-action="toggleFeatAction"]` → `_onToggleFeatAction` (line 1501)
- ✅ Partially working for some abilities from talents

### Starship Maneuvers (if applicable)
- ✅ Direct listeners for maneuvers section (lines 346-363)

---

## ❌ BROKEN/MISSING Handlers

### 1. Talent Abilities Panel - Method Name Mismatches

The talent abilities panel uses `data-action` attributes that don't match the handler method names:

**Problem:** The data-action dispatcher expects method names like `_onExpandAbility`, but the actual methods are named `_onExpandAbilityCard`, etc.

| data-action Attribute | Expected Method | Actual Method | Status |
|----------------------|-----------------|---------------|--------|
| `data-action="expandAbility"` | `_onExpandAbility` | `_onExpandAbilityCard` | ❌ BROKEN |
| `data-action="rollAbility"` | `_onRollAbility` | `_onRollTalentAbility` | ❌ BROKEN |
| `data-action="toggleAbility"` | `_onToggleAbility` | `_onToggleTalentAbility` | ❌ BROKEN |
| `data-action="postAbility"` | `_onPostAbility` | `_onPostTalentAbility` | ❌ BROKEN |
| `data-action="resetEncounterUses"` | `_onResetEncounterUses` | `_onResetAbilityUses` | ❌ BROKEN |
| `data-action="resetDayUses"` | `_onResetDayUses` | `_onResetAbilityUses` | ❌ BROKEN |
| `data-action="useSubAbility"` | `_onUseSubAbility` | **MISSING** | ❌ MISSING |

**Root Cause:** Comments in code (lines 342-343) say "Talent abilities now use data-action dispatcher" but the handler method names were never updated to match the dispatcher's naming convention.

### 2. Feat Actions Panel - Input Event Handler Mismatch

| Template Element | data-action | Problem |
|-----------------|-------------|----------|
| `<input type="range" data-action="updateFeatVariable">` | `updateFeatVariable` | ❌ Input uses `data-action` which only works for clicks, not change events |

**Root Cause:** The `data-action` dispatcher only listens to click events, but this is an `<input type="range">` slider that needs a `change` event listener. Handler exists (`_onUpdateVariableAction`) but isn't connected properly.

---

## Recommended Fixes

### Fix 1: Add Alias Methods for Talent Abilities (swse-character-sheet.js)

Add these alias methods after line 1826 to make the data-action dispatcher work:

```javascript
// ========== TALENT ABILITIES ALIASES FOR DATA-ACTION DISPATCHER ==========
// These aliases enable the data-action dispatcher to work with talent abilities
// The actual implementation is in the longer method names for starship maneuvers compatibility

async _onExpandAbility(event) {
  return this._onExpandAbilityCard(event);
}

async _onRollAbility(event) {
  return this._onRollTalentAbility(event);
}

async _onToggleAbility(event) {
  return this._onToggleTalentAbility(event);
}

async _onPostAbility(event) {
  return this._onPostTalentAbility(event);
}

async _onResetEncounterUses(event) {
  return this._onResetAbilityUses(event);
}

async _onResetDayUses(event) {
  return this._onResetAbilityUses(event);
}

async _onUseSubAbility(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const abilityId = btn.dataset.subAbilityId;
  const talentId = btn.dataset.talentId;

  const abilities = TalentAbilitiesEngine.getAbilitiesForActor(this.actor);
  // Find parent ability
  const parentAbility = abilities.all.find(a =>
    a.isMultiOption && a.subAbilities?.some(sub => sub.id === abilityId)
  );

  if (!parentAbility) {
    return ui.notifications.warn("Sub-ability not found.");
  }

  const subAbility = parentAbility.subAbilities.find(sub => sub.id === abilityId);
  if (!subAbility) {
    return ui.notifications.warn("Sub-ability not found.");
  }

  // Roll the sub-ability
  if (subAbility.rollData?.canRoll) {
    await TalentAbilitiesEngine.rollAbility(this.actor, subAbility, {});
  } else {
    // Post to chat
    const content = `
      <div class="swse-ability-card">
        <div class="ability-card-header">
          <i class="${subAbility.icon}"></i>
          <h3>${subAbility.name}</h3>
          <span class="ability-type-badge type-${subAbility.actionType}">${subAbility.typeLabel}</span>
        </div>
        <div class="ability-card-body">
          <p class="ability-source"><em>From: ${parentAbility.name} (${parentAbility.sourceTalentName})</em></p>
          <p class="ability-description">${subAbility.description}</p>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }

  // Decrement uses if limited
  if (parentAbility.usesData?.isLimited) {
    await TalentAbilitiesEngine.useAbility(this.actor, parentAbility.sourceTalentId);
    this.render();
  }
}
```

### Fix 2: Add Change Listener for Feat Variable Slider (swse-character-sheet.js)

Add this listener in the `activateListeners` method after line 462:

```javascript
// ========== FEAT VARIABLE SLIDER (uses change event, not click) ==========
html.find(".feat-variable-slider").change(ev => this._onUpdateVariableAction(ev));
```

---

## Testing Checklist

After applying fixes, test the following:

### Talent Abilities Panel
- [ ] Click ability card header to expand/collapse
- [ ] Click "Roll [Skill]" button on rollable abilities
- [ ] Click toggle button on toggleable abilities
- [ ] Click "Post to Chat" button
- [ ] Click "Reset Encounter Uses" button
- [ ] Click "Reset Daily Uses" button
- [ ] Click sub-ability "Use" buttons for multi-option abilities
- [ ] Verify uses tracking decrements correctly

### Feat Actions Panel
- [ ] Drag variable slider (e.g., Power Attack) and verify value updates
- [ ] Click toggle button on toggleable feat actions
- [ ] Verify active effects apply correctly

---

## Files to Modify

1. `/home/user/foundryvtt-swse/scripts/actors/character/swse-character-sheet.js`
   - Add alias methods after line 1826
   - Add feat variable slider listener after line 462

