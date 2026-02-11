# Dialog Pattern Blueprint: Complete Inventory & Categorization

**Date:** 2025-02-11
**Scope:** All 164 Dialog instances across 83 files
**Status:** Blueprint Complete (NOT YET CONVERTED)

---

## Executive Summary

This document categorizes all 164 Dialog usages across the SWSE system into 7 pattern types. Each pattern has a conversion complexity assessment and risk level. **Phase 1** will convert chargen only (14 instances) with zero-surface validation before proceeding further.

---

## Pattern Type 1: Simple Confirm (Dialog.confirm())

**Count:** 42 instances
**Description:** Two-button prompts returning Promise<boolean>
**Complexity:** LOW
**Risk:** MINIMAL

### Key Characteristics:
- Uses `Dialog.confirm({ title, content, defaultYes: boolean })`
- Returns boolean (true = accept, false = deny)
- No custom buttons, no form inputs
- Typically used for user acknowledgment before destructive actions

### Files & Line References:

```
1. scripts/species/species-reroll-handler.js:87
2. scripts/houserules/houserule-menus.js:340
3. scripts/core/world-data-loader.js:458
4. scripts/engine/MetaTuning.js:290
5. scripts/hooks/follower-hooks.js:60
6. scripts/drag-drop/drop-handler.js:57, 221, 343, 382 (4 instances)
7. scripts/hooks/combat-hooks.js:138
8. scripts/apps/droid-builder-app.js:618, 703 (2 instances)
9. scripts/gm-tools/homebrew-manager.js:263
10. scripts/apps/chargen-improved.js:98
11. scripts/apps/vehicle-modification-app.js:746, 788 (2 instances)
12. scripts/apps/upgrade-app.js:256, 370, 393 (3 instances)
13. scripts/apps/levelup/npc-levelup-entry.js:112, 136, 151 (3 instances)
14. scripts/apps/nonheroic-units-browser.js:273
15. scripts/apps/store/store-checkout.js:271, 364, 425, 482, 944, 1120 (6 instances)
16. scripts/apps/chargen/chargen-class.js:38
17. scripts/apps/chargen/chargen-species.js:317
18. scripts/apps/chargen/chargen-main.js:2200, 2241, 2317, 2610, 2819 (5 instances)
19. scripts/apps/levelup/levelup-class.js:346
20. scripts/apps/follower-creator.js:557
21. scripts/apps/item-selling-system.js:71, 100 (2 instances)
22. scripts/apps/levelup/levelup-main.js:1656, 1686 (2 instances)
23. scripts/gm-store-dashboard.js:305, 405, 493 (3 instances)
24. scripts/actors/vehicle/swse-vehicle-core.js:258
```

### Conversion Strategy:
```javascript
// FROM:
const confirmed = await Dialog.confirm({
  title: 'Delete Item?',
  content: '<p>Are you sure?</p>'
});

// TO:
const confirmed = await confirm({
  title: 'Delete Item?',
  content: '<p>Are you sure?</p>'
});
```

**Import Required:**
```javascript
import { confirm } from '../utils/ui-utils.js';
```

---

## Pattern Type 2: Simple Prompt (Dialog.prompt())

**Count:** 5 instances
**Description:** Single text input prompts returning Promise<string|null>
**Complexity:** LOW
**Risk:** MINIMAL

### Key Characteristics:
- Uses `Dialog.prompt({ title, content, label, callback })`
- Returns string (user input) or null (cancelled)
- Single input field, typically for naming/numeric values
- No complex validation (validation happens in callback)

### Files & Line References:

```
1. scripts/apps/chargen/chargen-languages.js:404
2. scripts/components/combat-action-bar.js:294
3. scripts/apps/template-character-creator.js:638
```

### Pattern Sample:
```javascript
// Line 404 - chargen-languages.js
const customLanguage = await Dialog.prompt({
  title: 'Create Custom Language',
  label: 'Language Name:',
  callback: (lang) => { /* ... */ }
});
```

### Conversion Strategy:
```javascript
// FROM:
const input = await Dialog.prompt({
  title: 'Enter Name',
  label: 'Name:'
});

// TO:
const input = await prompt({
  title: 'Enter Name',
  label: 'Name:'
});
```

**Import Required:**
```javascript
import { prompt } from '../utils/ui-utils.js';
```

---

## Pattern Type 3: Multi-Button Choice (new Dialog, 2-3 buttons)

**Count:** 25 instances
**Description:** Dialogs with simple button choices, no form inputs
**Complexity:** LOW
**Risk:** LOW

### Key Characteristics:
- `new Dialog()` with 2-3 button options
- No form fields, no complex HTML
- Simple state resolution based on button click
- Examples: "Roll/Average/Cancel", "Accept/Deny", "Option1/Option2/Cancel"

### Files & Line References:

```
1. scripts/engine/npc-levelup.js:155 (Roll/Avg/Cancel)
2. scripts/engine/npc-levelup.js:204 (HP Gain selection)
3. scripts/engine/npc-levelup.js:247 (Feat selection choice)
4. scripts/engine/TalentAbilitiesEngine.js:1232
5. scripts/talents/dark-side-powers-init.js:43 (Swift Power selection)
6. scripts/talents/dark-side-powers-init.js:431 (Confirm dialog)
7. scripts/talents/dark-side-talent-mechanics.js:321
8. scripts/combat/saber-lock-mechanics.js:147
9. scripts/apps/proficiency-selection-dialog.js:173
10. scripts/apps/prerequisite-builder-dialog.js:200
11. scripts/helpers/swse-dialog-helper.js:75 (Custom dialog)
12. scripts/apps/chargen/chargen-droid.js:1182
13. ... and ~13 more instances
```

### Pattern Sample:
```javascript
// Line 155 - npc-levelup.js: 3-button HP choice
new Dialog({
  title: 'Nonheroic HP Gain',
  content: '<p>Choose how to add HP for this nonheroic level.</p>',
  buttons: {
    roll: { label: 'Roll (1d4+CON)', callback: () => resolve('roll') },
    avg: { label: 'Average (2+CON)', callback: () => resolve('avg') },
    cancel: { label: 'Cancel', callback: () => resolve(null) }
  },
  default: 'roll',
  close: () => resolve(null)
}).render(true);
```

### Conversion Approach:
Convert to ApplicationV2 with simple button dispatch in activateListeners():
```javascript
export class HpGainDialog extends ApplicationV2 {
  static PARTS = {
    main: { template: 'systems/foundryvtt-swse/templates/dialogs/hp-gain.hbs' }
  };

  async _onRender(context, options) {
    const el = this.element;
    el?.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      this.resolve(btn.dataset.action); // 'roll', 'avg', 'cancel'
      this.close();
    });
  }
}
```

---

## Pattern Type 4: Form-Based Dialog (new Dialog with form fields)

**Count:** 20 instances
**Description:** Dialogs containing form fields (text input, select, radio, etc.)
**Complexity:** MEDIUM
**Risk:** LOW-MEDIUM

### Key Characteristics:
- `new Dialog()` with HTML form structure
- Multiple input fields (text, select, checkbox, etc.)
- Form data extracted in callback via `html.find()`
- Used for data entry workflows

### Files & Line References:

```
1. scripts/apps/custom-item-dialog.js:15, 182, 334, 421, 545, 651 (6 instances - Weapon/Armor creation)
2. scripts/talents/dark-side-powers-init.js:43, 198, 244, 367, 500, 569, 633, 712, 802, 852 (10 instances)
3. scripts/apps/template-character-creator.js:238, 450, 670, 1087 (4 instances)
4. scripts/apps/store/store-checkout.js:1081 (Droid template selection with select field)
5. ... and ~4 more instances
```

### Pattern Sample:
```javascript
// Line 15 - custom-item-dialog.js: Weapon creation form
const dialog = new Dialog({
  title: 'Create Custom Weapon',
  content: `
    <form class="swse-custom-item-form">
      <div class="form-group">
        <label>Weapon Name:</label>
        <input type="text" name="name" value="Custom Weapon" required/>
      </div>
      <div class="form-group">
        <label>Damage:</label>
        <input type="text" name="damage" value="1d8" placeholder="e.g., 2d8, 3d6"/>
      </div>
      <div class="form-group">
        <label>Damage Type:</label>
        <select name="damageType">
          <option value="energy" selected>Energy</option>
          <option value="kinetic">Kinetic</option>
        </select>
      </div>
      <!-- ... more fields ... -->
    </form>
  `,
  buttons: {
    save: {
      label: 'Create Weapon',
      callback: (html) => {
        const name = html.find('input[name="name"]').val();
        const damage = html.find('input[name="damage"]').val();
        const damageType = html.find('select[name="damageType"]').val();
        // Process form data
      }
    },
    cancel: { label: 'Cancel' }
  }
});
```

### Conversion Approach:
Use ApplicationV2 template system with form fields:
```javascript
export class WeaponCreatorDialog extends ApplicationV2 {
  static PARTS = {
    main: { template: 'systems/foundryvtt-swse/templates/dialogs/weapon-creator.hbs' }
  };

  _prepareContext() {
    return {
      damageTypes: ['energy', 'kinetic', 'ion']
    };
  }

  async _onRender(context, options) {
    const el = this.element;
    el?.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const form = el.querySelector('form');
      const data = new FormData(form);
      this.resolve(Object.fromEntries(data));
      this.close();
    });
  }
}
```

---

## Pattern Type 5: Informational Dialog (Display-only, no input)

**Count:** 10 instances
**Description:** Dialogs showing read-only content with acknowledgment button only
**Complexity:** LOW
**Risk:** MINIMAL

### Key Characteristics:
- `new Dialog()` with static HTML content only
- Single "OK" or "Close" button
- No form inputs, no state modification
- Used for status messages, confirmations, help text

### Files & Line References:

```
1. scripts/core/v1-api-scanner.js:191
2. scripts/ui/ArchetypeUIComponents.js:205
3. scripts/progression/ui/progression-ui.js:18, 63 (2 instances)
4. scripts/apps/chargen-narrative.js:435
5. scripts/apps/chargen-init.js:106
6. scripts/mentor/mentor-selector.js:97
7. scripts/apps/follower-creator.js:100
8. ... and ~2 more instances
```

### Pattern Sample:
```javascript
// Typical informational dialog
new Dialog({
  title: 'Status Information',
  content: '<p>This is a read-only message.</p>',
  buttons: {
    ok: { label: 'OK', callback: () => { /* nothing */ } }
  }
}).render(true);
```

### Conversion Approach:
Simple ApplicationV2 with no input handling required - mainly template rendering.

---

## Pattern Type 6: Complex Stateful Interaction (new Dialog with state mutations)

**Count:** 35 instances
**Description:** Dialogs that modify component state in callbacks, often within app instances
**Complexity:** MEDIUM-HIGH
**Risk:** MEDIUM

### Key Characteristics:
- `new Dialog()` with complex content and multiple buttons
- Callback functions modify parent component state (`this.property = value`)
- Often called from within ApplicationV2 app methods
- State changes trigger re-renders of parent components
- Examples: Mentor suggestion toggles, Feat filtering, Step navigation

### Files & Line References (Sample):

```
**Chargen Files (PHASE 1):**
1. scripts/apps/chargen/chargen-main.js:1875 (Mentor suggestion dialog - toggles suggestionEngine)
2. scripts/apps/chargen/chargen-main.js:2162 (Complex step navigation)

**Other Files:**
3. scripts/apps/mentor/mentor-survey.js:667 (Mentor acceptance - resolve(true/false))
4. scripts/mentor/mentor-translation-settings.js:128
5. scripts/mentor/mentor-guidance.js:66
6. scripts/apps/gm-droid-approval-dashboard.js:185
7. scripts/talents/dark-side-devotee-macros.js:97, 157, 217 (3 instances)
8. scripts/talents/dark-side-powers-init.js:149, 244, 367, 431, 500, 569, 633, 712, 802, 852 (10 instances)
9. scripts/talents/light-side-talent-macros.js:97, 168, 240, 309, 401, 470, 565 (7 instances)
10. scripts/talents/scout-talent-mechanics.js:1280, 1324, 1378, 1425 (4 instances)
11. scripts/talents/soldier-talent-mechanics.js:771
12. ... and more
```

### Pattern Sample (Chargen - Phase 1):
```javascript
// Line 1875 - chargen-main.js: Mentor suggestion dialog
const dialog = new Dialog({
  title: `${mentorName}'s Feat Suggestions`,
  content: content,  // Complex HTML
  buttons: {
    accept: {
      label: 'Show Suggestions Inline',
      callback: async () => {
        this.suggestionEngine = true;  // <-- STATE MUTATION
        await this.render();            // <-- PARENT RE-RENDER
      }
    },
    cancel: {
      label: 'Cancel',
      callback: () => {
        // DOM cleanup
        if (wasFilterActive) {
          const checkbox = document.querySelector('.filter-valid-feats');
          if (checkbox) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }
  },
  default: 'accept'
}, { classes: ['feat-suggestions-dialog', 'holo-window'] });
```

### Conversion Approach:
These require careful conversion to maintain state mutation semantics:
```javascript
export class MentorSuggestionDialog extends ApplicationV2 {
  constructor(parentApp, mentorName, options) {
    super(options);
    this.parentApp = parentApp;
    this.mentorName = mentorName;
  }

  static PARTS = {
    main: { template: 'systems/foundryvtt-swse/templates/dialogs/mentor-suggestion.hbs' }
  };

  async _prepareContext() {
    return { mentorName: this.mentorName, /* content data */ };
  }

  async _onRender(context, options) {
    const el = this.element;
    el?.querySelector('[data-action="accept"]')?.addEventListener('click', async () => {
      this.parentApp.suggestionEngine = true;
      await this.parentApp.render();
      this.close();
    });
  }
}
```

---

## Pattern Type 7: Nested Async Dialogs

**Count:** 5 instances
**Description:** Dialogs that programmatically create other dialogs
**Complexity:** HIGH
**Risk:** MEDIUM-HIGH

### Key Characteristics:
- Dialog.confirm/new Dialog called within another dialog's callback
- Promise chains with multiple dialog awaits
- State dependencies between nested dialogs
- Complex flow control

### Files & Line References:

```
1. scripts/apps/store/store-checkout.js:1081 + :1120 (Nested: Template selection → Confirm builder launch)
2. scripts/apps/levelup/levelup-main.js:1686 + chain (Complex nested confirmations)
3. scripts/talents/dark-side-powers-init.js:802 (Weapon dialog nested inside power dialog)
4. scripts/talents/light-side-talent-mechanics.js:1272 (Power dialog nested)
5. scripts/apps/item-selling-system.js:71 + :100 (Sale flow with nested dialogs)
```

### Pattern Sample:
```javascript
// store-checkout.js: Nested dialogs
const selectedTemplateId = await new Promise((resolve) => {
  new Dialog({
    title: 'Select Droid Template',
    content: templateHTML,
    buttons: {
      select: {
        callback: (html) => {
          selectedTemplateId = html.find('#template-select').val();
          resolve();  // First dialog resolves
        }
      }
    }
  }).render(true);
});

if (!selectedTemplateId) return;

// THEN: Second dialog
const confirmed = await Dialog.confirm({  // <-- NESTED
  title: 'Launch Droid Builder?'
});
```

### Conversion Approach:
Use ApplicationV2 modal system with sequential renderings or shared context.

---

## Summary by Category

| Pattern Type | Count | Complexity | Risk | Phase 1 (Chargen) | Notes |
|---|---|---|---|---|---|
| 1. Simple Confirm | 42 | LOW | MINIMAL | 5 | Replace with `confirm()` helper |
| 2. Simple Prompt | 5 | LOW | MINIMAL | 1 | Replace with `prompt()` helper |
| 3. Multi-Button Choice | 25 | LOW | LOW | 1 | Simple ApplicationV2 conversion |
| 4. Form-Based | 20 | MEDIUM | LOW-MED | 2 | Template + form data handling |
| 5. Informational | 10 | LOW | MINIMAL | 1 | Basic template rendering |
| 6. Complex Stateful | 35 | MEDIUM-HIGH | MEDIUM | 4 | Parent reference required |
| 7. Nested Async | 5 | HIGH | MEDIUM-HIGH | 0 | Do AFTER foundational work |
| **TOTAL** | **164** | — | — | **14** | — |

---

## Phase 1: Chargen-Only Conversion (14 instances)

This phase converts only files in `scripts/apps/chargen/**`:

### File-by-File Breakdown:

**1. chargen-class.js (1 instance)**
- Line 38: `Dialog.confirm()` - Simple confirmation → Use `confirm()` helper
- Complexity: LOW
- Risk: MINIMAL

**2. chargen-species.js (1 instance)**
- Line 317: `Dialog.confirm()` - Simple confirmation → Use `confirm()` helper
- Complexity: LOW
- Risk: MINIMAL

**3. chargen-droid.js (1 instance)**
- Line 1182: `new Dialog()` - Multi-button choice (3 options) → ApplicationV2
- Complexity: LOW
- Risk: LOW

**4. chargen-languages.js (1 instance)**
- Line 404: `Dialog.prompt()` - Text input → Use `prompt()` helper
- Complexity: LOW
- Risk: MINIMAL

**5. chargen-feats-talents.js (1 instance)**
- Line 353: `new Dialog()` - Multi-button choice → ApplicationV2
- Complexity: LOW
- Risk: LOW

**6. chargen-templates.js (1 instance)**
- Line 452: `new Dialog()` - Form-based dialog → ApplicationV2 + template
- Complexity: MEDIUM
- Risk: LOW

**7. chargen-backgrounds.js (1 instance)**
- Line 336: `new Dialog()` - Complex stateful (mentor suggestion display) → ApplicationV2
- Complexity: MEDIUM
- Risk: LOW

**8. chargen-main.js (7 instances)**
- Line 1875: `new Dialog()` - Complex stateful (mentor suggestion toggle) → ApplicationV2
- Line 2162: `new Dialog()` - Complex step navigation → ApplicationV2
- Lines 2200, 2241, 2317, 2610, 2819: `Dialog.confirm()` - 5 simple confirmations → Use `confirm()` helper
- Complexity: MEDIUM (one instance) + LOW (five instances)
- Risk: LOW-MEDIUM

**9. chargen-improved.js (1 instance)**
- Line 98: `Dialog.confirm()` - Simple confirmation → Use `confirm()` helper
- Complexity: LOW
- Risk: MINIMAL

---

## Validation Strategy: Zero-Surface Grep

After Phase 1 completion, run:
```bash
grep -r "new Dialog\|Dialog\.confirm\|Dialog\.prompt" \
  scripts/apps/chargen/ \
  --include="*.js"
```

**Expected Result:** 0 matches (all instances converted)

---

## Next Steps

1. ✅ **Blueprint Created** (this document)
2. ⏳ **Phase 1 Execution** (Chargen-only conversion - 14 instances)
   - Convert chargen/*.js files
   - No other files touched
3. ⏳ **Zero-Surface Validation**
   - Run grep validation
   - Confirm 0 Dialog matches in chargen/
4. ⏳ **User Approval**
   - Review Phase 1 results
   - Approve proceeding to Phase 2 (Combat/Utilities)
5. ⏳ **Phase 2+ Execution** (After approval)
   - Talents: ~30 instances
   - Combat: ~15 instances
   - Utilities/Helpers: ~90 instances

---

**Do NOT proceed to Phase 2 until:**
- Phase 1 completely converted and committed
- Zero-surface validation passed
- User explicitly approves continuation

