# Character Sheet Button Handler Matrix

Complete reference showing every button type, location, handler, and status.

## Summary

| Total Buttons | Working | Missing | Dead Code | Integration Issues |
|---------------|---------|---------|-----------|-------------------|
| 24 | 17 (71%) | 5 (21%) | 1 (4%) | 1 (4%) |

---

## Buttons by Tab

### PERSISTENT HEADER

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| Level Up | persistent-header.hbs:15 | `.level-up` | `_onLevelUp()` | ✓ WORKS |
| Character Generator | persistent-header.hbs:20 | `.character-generator` | `_onOpenCharGen()` | ✓ WORKS |
| Open Store | persistent-header.hbs:23 | `.open-store` | `_onOpenStore()` | ✓ WORKS |

**Implementation**: Direct jQuery binding (line 160-162)

---

### SUMMARY TAB

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| Initiative Roll | summary-tab.hbs:12 | `.rollable` | `_onRoll()` | ✓ WORKS |
| Ability Check | summary-tab.hbs:296 | `.rollable` | `_onRoll()` | ✓ WORKS |
| Skill Check | summary-tab.hbs:318 | `.rollable` | `_onRoll()` | ✓ WORKS |
| Weapon Attack | summary-tab.hbs:56 | `.rollable` | `_onRoll()` | ✓ WORKS |
| Weapon Damage | summary-tab.hbs:64 | `.rollable` | `_onRoll()` | ✓ WORKS |

**Implementation**: Base class direct binding (base-sheet.js:216)

---

### COMBAT TAB

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| Add Weapon | combat-tab.hbs:115 | `[data-action="createItem"][data-type="weapon"]` | `_onCreateItem()` | ✓ WORKS |
| Weapon Edit | combat-tab.hbs:105 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Weapon Delete | combat-tab.hbs:108 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |
| Weapon Attack Roll | combat-tab.hbs:88 | `[data-action="rollAttack"]` | `_onRollAttack()` | ✓ WORKS |
| Weapon Damage Roll | combat-tab.hbs:94 | `[data-action="rollDamage"]` | `_onRollDamage()` | ✓ WORKS |
| Add Armor | combat-tab.hbs:146 | `[data-action="createItem"][data-type="armor"]` | `_onCreateItem()` | ✓ WORKS |
| Armor Edit | combat-tab.hbs:136 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Armor Delete | combat-tab.hbs:139 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |
| Add Feat | combat-tab.hbs:169 | `[data-action="createItem"][data-type="feat"]` | `_onCreateItem()` | ✓ WORKS |
| Feat Edit | combat-tab.hbs:159 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Feat Delete | combat-tab.hbs:162 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |
| **Combat Action Post** | combat-tab.hbs:200 | `.action-name.rollable` | `_onPostCombatAction()` | ⚠️ CONFUSED |
| Combat Action Search | combat-tab.hbs:181 | `.combat-action-search` | `_onFilterCombatActions()` | ✓ WORKS |
| Combat Action Type Filter | combat-tab.hbs:185 | `.action-type-filter` | `_onFilterCombatActions()` | ✓ WORKS |
| Talent Enhancement Toggle | combat-tab.hbs:239 | `.talent-enhancement-toggle` | `_onToggleTalentEnhancement()` | ✓ WORKS |
| Feat Action Toggle | feat-actions-panel.hbs:14 | `.feat-action-toggle` | `_onToggleFeatAction()` | ✓ WORKS |
| Feat Action Slider | feat-actions-panel.hbs:52 | `.feat-action-slider-input` | `_onUpdateVariableAction()` | ✓ WORKS |
| Feat Action Use | feat-actions-panel.hbs:82 | `.feat-action-use` | `_onUseFeatAction()` | ✓ WORKS |

**Implementation**: Mix of direct jQuery (feat actions) and data-action (weapons/armor)

---

### FORCE TAB (CRITICAL ISSUES)

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| Spend Force Point (Reroll) | force-tab.hbs:34 | `[data-action="spendForcePoint"][data-type="reroll"]` | `_onSpendForcePoint()` | ✓ WORKS |
| Spend Force Point (Avoid Death) | force-tab.hbs:37 | `[data-action="spendForcePoint"][data-type="avoid-death"]` | `_onSpendForcePoint()` | ✓ WORKS |
| Spend Force Point (Reduce Dark) | force-tab.hbs:40 | `[data-action="spendForcePoint"][data-type="reduce-dark"]` | `_onSpendForcePoint()` | ✓ WORKS |
| Rest Force | force-tab.hbs:43 | `[data-action="restForce"]` | `_onRestForce()` | ✓ WORKS |
| **Add Power to Suite** | force-tab.hbs:61 | `[data-action="addToSuite"]` | _onAddToSuite() | ❌ MISSING |
| **Remove Power from Suite** | force-tab.hbs:97 | `[data-action="removeFromSuite"]` | _onRemoveFromSuite() | ❌ MISSING |
| Use Power | force-tab.hbs:93 | `[data-action="usePower"]` | `_onUsePower()` | ✓ WORKS |
| Regain Force Power | force-tab.hbs:89 | `[data-action="regainForcePower"]` | `_onRegainForcePower()` | ✓ WORKS |
| Add Force Secret | force-tab.hbs:137 | `[data-action="createItem"][data-type="feat"]` | `_onCreateItem()` | ✓ WORKS |
| Force Secret Edit | force-tab.hbs:121 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Force Secret Delete | force-tab.hbs:124 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |
| Add Force Technique | force-tab.hbs:168 | `[data-action="createItem"][data-type="feat"]` | `_onCreateItem()` | ✓ WORKS |
| Force Technique Edit | force-tab.hbs:152 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Force Technique Delete | force-tab.hbs:155 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |

**Issues**:
- ❌ Add/Remove from suite buttons have NO handlers
- ✓ Alternative: ForceSuiteComponent has handlers (not integrated)

---

### TALENTS TAB (CRITICAL ISSUES)

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| **Toggle Tree** | talents-tab.hbs:24 | `[data-action="toggleTree"]` | _onToggleTree() | ❌ MISSING |
| **Select Talent** | talents-tab.hbs:42 | `[data-action="selectTalent"]` | _onSelectTalent() | ❌ MISSING |
| **View Talent** | talents-tab.hbs:89 | `[data-action="viewTalent"]` | _onViewTalent() | ❌ MISSING |
| Create Custom Talent | talents-tab.hbs:96 | `[data-action="createItem"][data-type="talent"]` | `_onCreateItem()` | ✓ WORKS |

**Issues**: 
- ❌ All three talent tree interactions missing handlers
- ❌ Cannot expand/collapse talent trees
- ❌ Cannot select talents from character sheet
- ❌ Cannot view talent details

---

### INVENTORY TAB

| Button | Template | Class/Selector | Handler | Status |
|--------|----------|---|---------|--------|
| Add Equipment | inventory-tab.hbs:33 | `[data-action="createItem"][data-type="equipment"]` | `_onCreateItem()` | ✓ WORKS |
| Equipment Edit | inventory-tab.hbs:22 | `[data-action="edit"]` | `_onItemControl()` | ✓ WORKS |
| Equipment Delete | inventory-tab.hbs:26 | `[data-action="delete"]` | `_onItemControl()` | ✓ WORKS |

**Implementation**: Data-action dispatcher

---

## Event Binding Patterns

### Pattern 1: Direct jQuery Binding
Used for character-specific sheet actions

```javascript
html.find('.level-up').click(this._onLevelUp.bind(this));
html.find('.character-generator').click(this._onOpenCharGen.bind(this));
html.find('.open-store').click(this._onOpenStore.bind(this));
html.find('.action-name.rollable').click(this._onPostCombatAction.bind(this));
html.find('.feat-action-toggle').click(this._onToggleFeatAction.bind(this));
html.find('.feat-action-slider-input').on('input', this._onUpdateVariableAction.bind(this));
html.find('.feat-action-use').click(this._onUseFeatAction.bind(this));
html.find('.talent-enhancement-toggle').on('change', this._onToggleTalentEnhancement.bind(this));
```

**Location**: `swse-character-sheet.js:160-177`

**Pros**: 
- Explicit and clear
- Can use specific event types (input, change, etc.)

**Cons**:
- Not scalable
- Scattered throughout code
- Doesn't use base class dispatcher

### Pattern 2: Data-Action Dispatcher
Used by base class for generic actions

```javascript
html.on('click', '[data-action]', this._onAction.bind(this));
```

**Location**: `base-sheet.js:210`

**How it works**:
1. Any element with `data-action="foo"` triggers `_onAction()`
2. `_onAction()` extracts `data-action` value
3. Converts to method name: `foo` → `_onFoo`
4. Calls that method if it exists

**Used in templates**:
- `data-action="createItem"` → `_onCreateItem()`
- `data-action="usePower"` → `_onUsePower()`
- `data-action="regainForcePower"` → `_onRegainForcePower()`
- `data-action="rollAttack"` → `_onRollAttack()`
- `data-action="rollDamage"` → `_onRollDamage()`
- etc.

**Pros**:
- Scalable
- Consistent with Foundry patterns
- Base class handles dispatch

**Cons**:
- Limited to `click` events
- Method names must follow convention

### Comparison

| Aspect | Direct Binding | Data-Action |
|--------|---|---|
| Events | Any (click, input, change) | Click only |
| Scalability | Poor | Good |
| Maintainability | Medium | Good |
| Foundry Standard | No | Yes |
| Used by SWSE | Yes (old pattern) | Yes (new pattern) |

---

## Issues Requiring Implementation

### ISSUE 1: Add `_onAddToSuite()` Handler

**Current State**:
- Template calls it: `data-action="addToSuite"`
- No handler in `SWSECharacterSheet`
- Alternative handler exists in unused `ForceSuiteComponent`

**Solution Options**:

**Option A**: Add direct method to SWSECharacterSheet
```javascript
async _onAddToSuite(event) {
  event.preventDefault();
  const itemId = event.currentTarget.dataset.itemId;
  const power = this.actor.items.get(itemId);
  
  if (!power) {
    ui.notifications.error('Power not found');
    return;
  }
  
  const suitePowers = this.actor.items.filter(i => 
    i.type === 'forcepower' && i.system.inSuite
  );
  
  const maxSuite = this.actor.system.forceSuite?.max || 6;
  if (suitePowers.length >= maxSuite) {
    ui.notifications.warn('Force Suite is full!');
    return;
  }
  
  await power.update({'system.inSuite': true});
  ui.notifications.info(`Added ${power.name} to suite`);
}
```

**Option B**: Integrate ForceSuiteComponent.attachListeners()
```javascript
// In activateListeners() method:
if (this.options.editable) {
  ForceSuiteComponent.attachListeners(html, this.actor);
}
```

### ISSUE 2: Add `_onRemoveFromSuite()` Handler

**Current State**:
- Template calls it: `data-action="removeFromSuite"`
- No handler in `SWSECharacterSheet`
- Alternative handler exists in unused `ForceSuiteComponent`

**Solution**:
```javascript
async _onRemoveFromSuite(event) {
  event.preventDefault();
  const itemId = event.currentTarget.dataset.itemId;
  const power = this.actor.items.get(itemId);
  
  if (!power) {
    ui.notifications.error('Power not found');
    return;
  }
  
  await power.update({'system.inSuite': false});
  ui.notifications.info(`Removed ${power.name} from suite`);
}
```

### ISSUE 3: Add `_onSelectTalent()` Handler

**Current State**:
- Template calls it: `data-action="selectTalent"`
- No handler at all
- Need to implement talent selection logic

**Solution**:
```javascript
async _onSelectTalent(event) {
  event.preventDefault();
  const talentId = event.currentTarget.dataset.talentId;
  const talent = this.actor.items.get(talentId);
  
  if (!talent) {
    ui.notifications.error('Talent not found');
    return;
  }
  
  // TODO: Implement talent selection logic
  // This should update the character's talent selections
  ui.notifications.info(`Selected talent: ${talent.name}`);
}
```

### ISSUE 4: Add `_onToggleTree()` Handler

**Current State**:
- Template calls it: `data-action="toggleTree"`
- No handler at all

**Solution**:
```javascript
async _onToggleTree(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const treeContainer = button.closest('.talent-tree');
  const treeContent = treeContainer.querySelector('.tree-content');
  
  if (!treeContent) return;
  
  const isHidden = treeContent.style.display === 'none';
  treeContent.style.display = isHidden ? 'block' : 'none';
  
  const icon = button.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-chevron-down', !isHidden);
    icon.classList.toggle('fa-chevron-up', isHidden);
  }
}
```

### ISSUE 5: Add `_onViewTalent()` Handler

**Current State**:
- Template calls it: `data-action="viewTalent"`
- No handler at all

**Solution**:
```javascript
async _onViewTalent(event) {
  event.preventDefault();
  const talentId = event.currentTarget.dataset.talentId;
  const talent = this.actor.items.get(talentId);
  
  if (!talent) {
    ui.notifications.error('Talent not found');
    return;
  }
  
  await talent.sheet.render(true);
}
```

### ISSUE 6: Fix `_postCombatActionDescription()` ReferenceError

**Current State** (line 379):
```javascript
async _postCombatActionDescription(actionName, actionData) {
  const actionRow = $(event.currentTarget).closest('.combat-action-row');
  // ^ UNDEFINED: 'event' is not a parameter
```

**Solution** (simple - remove unused line):
```javascript
async _postCombatActionDescription(actionName, actionData) {
  const actionType = actionData.action.type;
  const notes = actionData.notes;
  // ... continue as before
}
```

---

## Implementation Checklist

- [ ] Fix line 379 - Remove undefined `event` reference
- [ ] Add `_onAddToSuite()` method
- [ ] Add `_onRemoveFromSuite()` method
- [ ] Add `_onSelectTalent()` method
- [ ] Add `_onToggleTree()` method
- [ ] Add `_onViewTalent()` method
- [ ] Test all Force tab buttons
- [ ] Test all Talents tab buttons
- [ ] Remove dead code `_onRollCombatAction()` (optional refactoring)
- [ ] Standardize event binding patterns (optional refactoring)

