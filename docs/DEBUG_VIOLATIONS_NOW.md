# Debug the Exact Violations NOW

The contract enforcer has been updated to print the exact selectors of all violating elements.

## Step 1: Open a character sheet in Foundry

In the browser console (F12), you will see the contract enforcer output showing the 18 scroll owners and 1 illegal panel scroller.

**Copy and paste the selectors it prints.**

---

## Step 2: Get detailed info on the violations

**Run this in the browser console:**

```javascript
import { CharacterSheetContractEnforcer } from '/systems/foundryvtt-swse/scripts/sheets/v2/contract-enforcer.js';

const app = document.querySelector('.application.swse-character-sheet');

// Print all 18 scroll owners with their element details
console.log('\n=== ALL 18 SCROLL OWNERS ===');
CharacterSheetContractEnforcer.debugScrollOwners(app);

// Print the 1 illegal inner panel scroller
console.log('\n=== ILLEGAL PANEL SCROLLERS ===');
CharacterSheetContractEnforcer.debugIllegalPanelScrollers(app);

// Debug why .window-content min-height isn't working
console.log('\n=== WINDOW-CONTENT MIN-HEIGHT DEBUG ===');
CharacterSheetContractEnforcer.debugWindowContentMinHeight(app);
```

---

## Step 3: Capture the output

You will get three detailed reports:

### Report 1: All 18 Scroll Owners
```
1. form.swse-character-sheet-form > .sheet-shell > .sheet-body > .tab.active
   Classes: ...
   Overflow-Y: auto
   ScrollHeight: 2731
   ClientHeight: 941
   Can scroll: true

2. [other scrollers...]
...
```

**Copy this list exactly.**

### Report 2: Illegal Inner Panel Scrollers  
```
1. form > .sheet-body > .tab > .swse-panel--something
   Classes: ...
   Overflow-Y: auto
   CSS Rule to Remove: overflow-y: auto
```

**Copy this selector exactly.**

### Report 3: Window-Content Min-Height Debug
```
Element: .window-content
Computed min-height: auto  ← This should be 0px
Computed height: 941px
Inline style attribute: (none)
Display: flex
...
```

---

## Step 4: Report findings

Once you run these, you will have:

1. **Exact list of 18 scroll owner selectors** - which ones are legitimate? Which are fragments?
2. **Exact selector of 1 remaining illegal panel scroller** - what element is it?
3. **Why .window-content min-height is auto** - which CSS rule is causing it?

Then you can tell me:
- "The 18 scroll owners are: [list]"
- "The illegal panel is: [selector]"
- "The .window-content is getting min-height: auto from: [CSS rule]"

**And then we fix those exact rules.**

---

## The Goal

Stop saying "I removed this rule."
Start saying "I killed overflow-y: auto from [exact selector] in [exact file]."

The debug output gives you the exact selectors. Use those, not assumptions.
