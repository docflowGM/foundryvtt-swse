# PHASE 1: REAL STATE AUDIT AND CONTRACT MAP

## Executive Summary

This audit maps the **actual runtime state** of the normal character sheet, identifies **data mismatches** between layers, explains why **tab/body blanking occurs**, and documents **dead code paths** that need cleanup.

The character sheet is functional but fights itself in three key areas:
1. **Tab state is managed in TWO overlapping systems** (UIStateManager + direct DOM toggle)
2. **XP field name mismatch** between form and schema
3. **Dead panel mappings** in visibility manager (notes tab doesn't exist)

---

## SECTION A: TAB ACTIVATION ANALYSIS

### A1. Actual Tabs in Template

The character-sheet.hbs template defines these tabs (line 160–169):
- overview (active by default on initial render)
- abilities
- skills
- combat
- talents
- force (conditional: `{{#if actor.system.forceSensitive}}`)
- gear
- biography
- relationships

**Total: 9 tabs (8 always visible, 1 conditional)**

Located in: `templates/actors/character/v2/character-sheet.hbs:160-169`

### A2. Tab Navigation Structure

**Tab buttons:**
- Selector: `[data-action="tab"]`
- Data attributes: `data-tab`, `data-group`, `data-tab-group`
- Group: all set to `"primary"`

**Tab panels:**
- Selector: `.tab[data-tab-group="primary"]` or `.tab[data-group="primary"]`
- Each panel has a matching `data-tab` attribute
- Initial active class: `.active` on overview panel only

### A3. Tab Switching Logic (activateListeners, line 1454)

```javascript
html.addEventListener("click", ev => {
  const tabLink = ev.target.closest("[data-action='tab']");
  if (!tabLink) return;
  const tabName = tabLink.dataset.tab;
  if (!tabName) return;
  
  ev.preventDefault();
  ev.stopPropagation();
  
  // Two systems being called in parallel:
  this.visibilityManager?.setActiveTab?.(tabName);
  this.uiStateManager?._activateTab?.(tabLink);
  
  // THEN hard DOM toggle happens AFTER both managers:
  const panels = html.querySelectorAll(".sheet-body > .tab");
  panels.forEach(panel => {
    const isActive = panel.dataset.tab === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
    panel.style.display = isActive ? "flex" : "none";
  });
}, { signal });
```

**CRITICAL ISSUE #1: Tab state is owned by THREE systems simultaneously:**

1. **UIStateManager._activateTab(tabButton)** (line 300-326)
   - Deactivates all buttons and panels in group
   - Activates requested button and matching panel
   - Updates this.state.activeTabs[tabGroup] = tabName

2. **PanelVisibilityManager.setActiveTab?.(tabName)** (inherited from base class)
   - Expected to track which tab is active
   - No direct evidence of implementation in character-specific override

3. **Direct DOM toggle in handler** (lines 1473-1479)
   - Unconditionally sets `.active` class and display styles
   - Happens AFTER both managers are called
   - **This means the hard DOM toggle can OVERRIDE the managers**

**Why body goes blank:**
If rerender happens during tab transition and UIStateManager is not properly capturing/restoring state, the hard DOM toggle resets visibility AFTER the new DOM is rendered. If the new DOM doesn't have the correct active panel hydrated, the body stays blank.

---

## SECTION B: PANEL VISIBILITY MANAGER AUDIT

### B1. Current Tab-to-Panel Mapping (line 19-30)

```javascript
this.tabPanels = {
  overview: ['portraitPanel', 'biographyPanel', 'healthPanel', 'combatStatsPanel', 'secondWindPanel', 'defensePanel'],
  abilities: ['abilitiesPanel', 'racialAbilitiesPanel'],
  skills: ['skillsPanel'],
  combat: ['maneuverPanel', 'darkSidePanel'],
  talents: ['talentPanel', 'featPanel'],
  force: ['forcePowersPanel'],
  gear: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
  biography: ['biographyPanel'],
  relationships: ['relationshipsPanel', 'languagesPanel'],
  notes: ['combatNotesPanel']
};
```

### B2. Tab Mapping Mismatch

**DEAD MAPPING FOUND:**
The `notes` tab is mapped to `['combatNotesPanel']` but:
- No `notes` tab button exists in character-sheet.hbs
- No `.tab[data-tab="notes"]` panel exists in template
- This is leftover from a previous design iteration

**Impact:** Low, because the notes tab never activates (no button to click it). But it pollutes the state manager and creates search noise.

### B3. Conditional Panels

```javascript
this.conditionalPanels = {
  forcePowersPanel: {
    condition: (actor) => actor.system?.forceSensitive === true,
    reason: 'not force sensitive'
  },
  starshipManeuversPanel: {
    condition: (actor) => actor.type === 'vehicle' || actor.system?.isVehicle === true,
    reason: 'not a vehicle'
  }
};
```

**Issue:** `starshipManeuversPanel` is listed as character-conditional, but it's actually:
1. Never mapped in `tabPanels` (not used on character sheet)
2. Should only appear on vehicle sheet
3. This is a vehicle-specific panel leaking into character sheet conditional logic

---

## SECTION C: FORM FIELD / PERSISTENCE CONTRACT AUDIT

### C1. Form Field Schema

FORM_FIELD_SCHEMA defined at line 69:
- 3966 lines total
- HP-related: `system.hp.value`, `system.hp.max`, `system.hp.temp`, `system.hpBonus`
- Abilities: `system.abilities.[key].[base|racial|temp]`
- Defenses: `system.defenses.[fort|ref|will].miscMod`
- Skills: `system.skills.[skillKey].miscMod`
- XP/Progression: **`'system.xp': 'number'`** ← CRITICAL MISMATCH HERE
- Resources: `system.destinyPoints.[value|max]`, `system.forcePoints.[value|max]`

### C2. XP Field Name Mismatch

**In xp-panel.hbs (line 17):**
```handlebars
<input type="number" name="system.xp.total" value="{{xpData.total}}" ...>
```

**In character-sheet.js schema (line 136):**
```javascript
'system.xp': 'number'
```

**MISMATCH:**
- Template uses: `system.xp.total`
- Schema expects: `system.xp` (flat, not nested)

**Impact:** When form submits with `name="system.xp.total"`, the schema will NOT coerce it as a number. The persistence handler will treat it as a string write path that doesn't match the schema, potentially causing:
- Silent type coercion failures
- XP not persisting correctly
- XP tracking becoming unreliable

**Root Cause:** The actor data model appears to use `system.xp.total` (nested), but the FORM_FIELD_SCHEMA was written as if it's `system.xp` (flat).

---

## SECTION D: CONTEXT/PANEL CONTRACT ANALYSIS

### D1. Health Panel Example

From character-sheet.js _prepareContext (derived object setup):

```javascript
derived.defenses ??= {};
const defenseNames = [
  { key: 'fortitude', label: 'Fortitude' },
  { key: 'reflex', label: 'Reflex' },
  { key: 'will', label: 'Will' }
];
for (const { key } of defenseNames) {
  if (!derived.defenses[key]) {
    derived.defenses[key] = { total: 10 };
  } else if (typeof derived.defenses[key] === 'number') {
    const val = derived.defenses[key];
    derived.defenses[key] = { total: val };
  }
}
```

**Context Contract:**
- healthPanel expects: `derived.defenses.fortitude.total`, `derived.defenses.reflex.total`, etc.
- Template uses: `{{derived.defenses.fortitude.total}}`
- Fallback: Ensures all three defenses exist with `.total` property

This is well-constructed but relies on defensive initialization in _prepareContext.

### D2. Skills Panel Contract

Skills are computed in _prepareContext (line 613-657):
- Takes `system.skills` and `derived.skills` (from derived calculator)
- Builds `skillsList` array with normalized shape
- Stores back in `derived.skills`

**Contract:**
Each skill must have:
```javascript
{
  key,
  label,
  total,           // from derived engine
  trained,
  focused,
  favorite,
  selectedAbility,
  selectedAbilityLabel,
  abilityMod,
  halfLevel,
  miscMod,
  extraUses: []
}
```

This is well-defined and appears stable.

### D3. Tab Panel Mappings vs Actual Partials

The header comment claims panels include "portraitPanel" and "biographyPanel" in overview, but:
- These are not separate panel sections with their own builders
- They are actually included as partial renders within the overview tab
- This is a semantic inconsistency (panels vs partials)

---

## SECTION E: PROGRESSION ENTRYPOINTS AUDIT

### E1. Progression Launch Locations

**Import statement (line 16):**
```javascript
import { launchProgression, launchFollowerProgression } from ".../progression-entry.js";
```

**Chargen/Levelup button (line 1826):**
```javascript
const button = ev.target.closest('[data-action="cmd-chargen"], [data-action="cmd-levelup"]');
if (!button) return;
await launchProgression(this.actor);
```

Trigger: Header action buttons (line 147-149 in template)

**Roll for Attributes button (line 1839):**
```javascript
const button = ev.target.closest('[data-action="roll-attributes"]');
if (!button) return;
await launchProgression(this.actor, { currentStep: 'attribute' });
```

Template: abilities-panel.hbs (line 8), button exists ✓

**Identity selection buttons (line 1860):**
- cmd-select-class → 'class' step
- cmd-select-species → 'species' step
- cmd-select-background → 'background' step
- cmd-select-homeworld → 'background' step
- cmd-select-profession → 'background' step

All launch progression framework correctly.

**Conclusion:** Roll for Attributes button already exists and is wired. No new implementation needed for Phase 7.

---

## SECTION F: MIGRATION RESIDUE AUDIT

### F1. Backup Files Found

**In scripts/sheets/v2:**
- character-sheet.js.pre_phase_b
- character-sheet.js.pre_phase_c
- character-sheet.js.pre_phase_e
- character-sheet.js.pre_phase_f
- character-sheet.js.pre_phase_h
- character-sheet.js.pre_phase_h4
- character-sheet.js.exactfix.bak

**In templates/actors/character/v2/partials:**
- attacks-panel.hbs.pre_phase_b
- skills-panel.hbs.pre_phase_b
- initiative-control.hbs.pre_phase_b
- skills-panel.hbs.pre_phase_h2
- resources-panel.hbs.pre_phase_b

**Total: 12 backup files**

These files:
- Are not imported or executed
- Create search clutter (grep finds them)
- Should be archived outside runtime tree

---

## SECTION G: CODE SIZE AND COMPLEXITY

### G1. Main Files

```
scripts/sheets/v2/character-sheet.js    3966 lines
templates/actors/character/v2/character-sheet.hbs  1035 lines
styles/sheets/v2-sheet.css              6541 lines
```

Total: ~11,500 lines in primary files

### G2. Listener Accumulation in activateListeners

The activateListeners method contains:
- HP input handler
- Form submit handler
- Help mode toggle
- Tab switching
- Abilities panel toggle
- Defenses panel toggle
- Ability rolls
- Initiative rolls
- Form change listener (auto-save)
- Skill rolls
- Many more action handlers

Each is a delegated event listener on the root html element. Total count: ~30+ listeners

This is not inherently bad (delegation is efficient), but it makes the method large and hard to reason about.

---

## SECTION H: PERSISTENCE DIAGNOSTIC NOISE

### H1. Console Logging

The form submission path contains excessive logging:
```javascript
console.log('[PERSISTENCE] ─── SUBMIT EVENT FIRED ───');
console.log('[PERSISTENCE] Event target:', ev.target.tagName, ev.target.className);
console.log('[PERSISTENCE] defaultPrevented BEFORE:', ev.defaultPrevented);
// ... more logs
console.log('[LIFECYCLE] Submit listener attached successfully');
console.log('[LIFECYCLE] Will listener survive? Checking signal status:', ...);
```

**Impact:** Every form change floods the console with diagnostic output. This is necessary during migration but not appropriate for production play.

---

## SECTION I: VISUAL INCONSISTENCIES

### I1. Inline Styles in Template

Character-sheet.hbs contains:
- `<div class="turn-hint" style="font-size: 0.75rem; opacity: 0.7; margin-top: 6px; text-align: center; padding: 4px 0; border-top: 1px solid rgba(124,232,255,0.2);">`

This is a complete CSS definition in the template, not a temporary diagnostic.

### I2. SVG-era Assumptions in Partials

Many partials still reference SVG-backed panel structure:
- `.swse-panel__frame`
- `.swse-panel__content`
- `.swse-panel__overlay`

But the current design is moving to a flat baseline. These should be cleaned up as part of Phase 4.

---

## SECTION J: SUMMARY OF FINDINGS

### Critical Issues (must fix for stability)

| Issue | Location | Severity | Phase |
|-------|----------|----------|-------|
| Tab state managed by TWO systems | activateListeners + UIStateManager | CRITICAL | 2 |
| XP field name mismatch | xp-panel.hbs vs FORM_FIELD_SCHEMA | HIGH | 3 |
| Dead "notes" tab mapping | PanelVisibilityManager | MEDIUM | 1 |
| Vehicle conditional logic in character sheet | PanelVisibilityManager | MEDIUM | 1 |

### High-Impact Issues (improve maintainability)

| Issue | Location | Impact | Phase |
|-------|----------|--------|-------|
| 12 backup files in runtime tree | scripts/sheets/v2, templates/... | Search clutter | 1 |
| Excessive persistence logging | character-sheet.js | Console noise | 3 |
| Inline styles in templates | character-sheet.hbs | Visual ownership unclear | 4 |
| activateListeners is 1500+ lines | character-sheet.js | Hard to maintain | 8 |

### No Issues

- Roll for Attributes button already exists ✓
- launchProgression is properly imported and called ✓
- Form field schema is mostly complete (except XP)
- Abilities/Skills/HP contexts are well-normalized

---

## SUCCESS CRITERIA FOR PHASE 1

✅ **Exactly why tab/body blanking happens:**
- Rerender captures tab state with UIStateManager
- But hard DOM toggle in click handler can override it
- If rerender doesn't hydrate the correct active panel, body stays blank
- **Root cause:** Two systems (UIStateManager + direct toggle) not perfectly synchronized

✅ **Current data contracts for major panels:**
- Health: `{hp, bonusHp, shield, damageReduction, conditionTrack, conditionSlots}`
- Defenses: `{{derived.defenses.fortitude.total}}` (requires .total property)
- Skills: `{key, label, total, trained, focused, favorite, selectedAbility, abilityMod, halfLevel, miscMod, extraUses}`
- All normalized in _prepareContext

✅ **Where sheet fights itself:**
1. Tab state: UIStateManager vs direct DOM toggle
2. XP persistence: nested field name vs flat schema
3. Visibility mappings: dead notes tab, vehicle panel in character sheet
4. Console noise: persistent debug logging
5. Search pollution: 12 backup files

---

## NEXT STEP

Ready to proceed to **Phase 2: Tab State and Body Hydration Stabilization**

The plan will be to:
1. Make UIStateManager the sole owner of tab state
2. Remove the hard DOM toggle override
3. Add render invariant checks for invalid tab state
4. Test that body never goes blank on tab switch or rerender

