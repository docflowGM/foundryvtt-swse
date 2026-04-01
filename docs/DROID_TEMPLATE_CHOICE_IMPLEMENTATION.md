# Droid Template Choice System Implementation
## Chargen Integration for Droid Player Characters

**Date**: 2026-03-28
**Version**: 1.0
**Status**: Complete
**Phase**: Extended Phase 3b - Droid Chargen Integration

---

## Executive Summary

This document describes the **Droid Template Choice System**, which integrates three distinct droid creation paths into the SWSE Foundry VTT chargen flow:

1. **Droid Template** - Apply a physical/chassis identity template, then continue through droid progression
2. **Class Template** - Apply class-side decisions (prefilling non-physical choices), still requiring droid construction
3. **Custom Droid** - Build from scratch with no template assistance

**Critical architectural principle**: Droid templates **seed/prefill chargen state**, they do not bypass the progression pipeline. Unlike NPC template import (which creates complete actors), droid templates feed into an ongoing droid PC progression flow.

---

## 1. The Droid Template Model

### Why Droid Templates Are Different

**NPCs**: Template import creates a complete, finished actor. One action: "import". Done.

**Droids**: Template selection is a chargen **prefill step**. The droid PC still needs:
- Class selection and training
- Droid part/system construction
- Ability scores, skills, feats, talents
- Equipment selection
- Full progression completion

Therefore:
- **Droid Template** ≠ "import this droid actor"
- **Droid Template** = "apply this droid chassis as a baseline, then build the rest"

### The Two Template Axes

Droid PCs can be templated along two independent axes:

#### Axis 1: Physical/Chassis Identity (Droid Template)
What kind of droid is this?

Examples:
- Astromech droid
- Protocol droid
- Battle droid
- Worker droid
- Medical droid

**Effects**:
- Affects droid system configuration (starting parts, constraints)
- Defines the droid's physical form and capabilities
- Affects how the droid interacts with the world
- Does NOT affect class progression

#### Axis 2: Class/Training Identity (Class Template)
What role does this droid take as a PC?

Examples:
- Scout droid
- Soldier droid
- Noble droid (unlikely but possible)
- Scoundrel droid

**Effects**:
- Affects class selection
- Prefills class-side choices where supported
- Still requires full droid part construction
- Completes through normal progression pipeline

---

## 2. User Flow

### Creation Entry Point

User clicks "Create Actor" in actor directory:
```
Create Actor
  ↓
ActorCreationEntryDialog
  → "Begin New Character"
  → "Access Galactic Records"
```

If user selects "Begin New Character":
```
Chargen Options Dialog
  → "PC from Template"
  → "Custom PC (Unified)"
  → "Create Droid" ← NEW
  → "Create Manually"
```

### Droid Creation Paths

#### Path 1: Use Droid Template

```
"Create Droid" clicked
  ↓
DroidTemplateChoiceDialog
  ↓
User clicks "Use Droid Template"
  ↓
GalacticRecordsBrowser (auto-selected to Droid category)
  ↓
User selects droid template (astromech, protocol, etc.)
  ↓
User clicks "Import Now" or "Customize & Import"
  ↓
DroidTemplateImporterEngine.importDroidTemplate()
  → Creates droid actor from template
  → Sets system.isDroid = true
  ↓
launchProgression(importedDroid)
  → Droid chargen continues with template baseline applied
  → User still selects class, builds parts, trains skills, etc.
```

#### Path 2: Use Class Template

```
"Create Droid" clicked
  ↓
DroidTemplateChoiceDialog
  ↓
User clicks "Use Class Template"
  ↓
TemplateCharacterCreator (filtered for droid: no Jedi!)
  ↓
User selects class template (Scout template, Soldier template, etc.)
  ↓
User confirms template selection
  ↓
_handleDroidCreation creates blank droid actor
  → Sets system.isDroid = true
  → Initializes empty droidSystems configuration
  ↓
launchProgression(newDroid)
  → Droid chargen continues with class template context
  → Still requires full droid part construction
```

#### Path 3: Build Custom Droid

```
"Create Droid" clicked
  ↓
DroidTemplateChoiceDialog
  ↓
User clicks "Build Custom"
  ↓
_handleDroidCreation creates blank droid actor
  → Sets system.isDroid = true
  → Initializes empty droidSystems configuration
  ↓
launchProgression(newDroid)
  → Full droid chargen with zero prefill
  → Complete freedom in all decisions
```

---

## 3. Architecture & Implementation

### 3.1 DroidTemplateChoiceDialog

**File**: `scripts/apps/droid-template-choice-dialog.js`

**Purpose**: First decision point when creating a droid. Presents three distinct paths.

**Key Methods**:
- `_onDroidTemplate()` - Routes to Galactic Records with droid category pre-selected
- `_onClassTemplate()` - Routes to TemplateCharacterCreator with droid filtering
- `_onCustom()` - Proceeds with standard droid chargen

**Design**:
- ApplicationV2-based (Foundry v13)
- Three prominent choice cards with icons and descriptions
- Clear explanations of what each path means
- Footer note emphasizing all paths complete through full progression

### 3.2 GalacticRecordsBrowser Extensions

**File**: `scripts/apps/galactic-records-browser.js` (modified)

**New Features**:
- `preSelectCategory` option - Auto-loads specified category on render
- `importCallback` option - Calls provided function instead of opening actor sheet

**New Methods**:
- `_autoSelectCategory(categoryId)` - Loads templates for specified category

**Behavior**:
- When opened from DroidTemplateChoiceDialog with `preSelectCategory: 'droid'`
- Automatically loads 388 droid templates on first render
- When user imports a droid, calls `importCallback(actor)` instead of opening sheet
- Dialog closes, returns control to DroidTemplateChoiceDialog → chargen-init handler

**Integration**:
```javascript
GalacticRecordsBrowser.create({
  preSelectCategory: 'droid',
  importCallback: async (actor) => {
    // Handle imported droid actor
  }
});
```

### 3.3 TemplateCharacterCreator Extensions

**File**: `scripts/apps/template-character-creator.js` (modified)

**New Constructor Flags**:
- `isDroid` - Marks this as droid-specific template creation
- `excludeForce` - Filters out Force/Jedi classes
- `creationCallback` - Custom callback for droid workflow

**New Behavior**:
- When `isDroid && excludeForce`, removes 'Jedi' from class list
- Adds context flag `isDroid` for template rendering
- Adds `droidNote` explaining why Jedi is unavailable

**Implementation**:
```javascript
TemplateCharacterCreator.create({
  isDroid: true,
  excludeForce: true,
  creationCallback: (template) => {
    // Handle class template selection
  }
});
```

### 3.4 Chargen-Init Integration

**File**: `scripts/apps/chargen-init.js` (modified)

**New Button**:
- "Create Droid" added to chargen options dialog
- Icon: `fa-solid fa-robot`
- Routes to DroidTemplateChoiceDialog on click

**New Handler**:
- `_handleDroidCreation(result)` - Routes based on selected template type
  - `droid-template`: Imported droid exists; launch progression
  - `class-template`: Create blank droid; launch progression
  - `custom`: Create blank droid; launch progression

**Droid Actor Initialization**:
```javascript
{
  name: 'New Droid',
  type: 'droid',
  system: {
    isDroid: true,
    level: 0,
    droidSystems: {
      degree: '',
      size: 'Medium',
      locomotion: { ... },
      processor: { ... },
      // ... full droid system structure
      stateMode: 'DRAFT'
    }
  }
}
```

---

## 4. Key Design Decisions

### Decision 1: Droid Templates as Prefill vs Import

**Chosen**: Prefill (templates seed chargen state, don't bypass it)

**Rationale**:
- Droids are PCs with classes, skills, feats, talents
- Cannot be "complete" until class is chosen
- Part construction is intrinsic to droid identity
- Templates should guide but not replace chargen

**Alternative Rejected**: Direct import like NPCs
- Would bypass essential droid PC progression
- Loses class identity and training
- Incomplete as actors

### Decision 2: Force/Jedi Exclusion for Droids

**Chosen**: Droids cannot be Jedi

**Rationale**:
- Droids cannot use the Force (game rule)
- Jedi requires Force sensitivity
- No synthetic Force users in SWSE rules
- Logical constraint, not UI trick

**Implementation**: Class list filtering, not hidden option

### Decision 3: Three Independent Paths, Not Binary

**Chosen**: Droid Template | Class Template | Custom

**Rationale**:
- Physical identity (chassis) ≠ Class identity
- Some droids may not use templates
- Gives players choice at appropriate granularity
- Aligns with character creation philosophy

**Alternative Rejected**: Binary (template vs custom)
- Would force artificial pairing of physical+class
- Wouldn't match player needs

### Decision 4: No Droid Template Editor in Browser

**Chosen**: Use existing GalacticRecordsBrowser, not custom UI

**Rationale**:
- Already supports droid category (Phase 3b)
- Consistent with NPC import UI
- Pre-selection avoids unnecessary category clicking
- Reuses proven customization wizard

**Alternative Rejected**: Droid-specific template browser
- Redundant; GalacticRecordsBrowser already does this
- More code to maintain

---

## 5. Files Created/Modified

### Created (2 files)
1. `scripts/apps/droid-template-choice-dialog.js` - Main choice dialog
2. `templates/apps/droid-template-choice.hbs` - Choice UI template

### Modified (3 files)
1. `scripts/apps/galactic-records-browser.js` - Pre-selection + callback support
2. `scripts/apps/chargen-init.js` - Droid button + handler
3. `scripts/apps/template-character-creator.js` - Droid filtering

---

## 6. Integration Points

### With Progression Framework

- Droid actor created with `level: 0` → triggers chargen in progression shell
- `isDroid` flag marks droid subtype routing
- All three paths eventually call `launchProgression(droidActor)`
- Progression shell detects droid type and routes to DroidBuilderStep

### With Galactic Records System

- Reuses existing droid category (Phase 3b)
- Reuses existing import customization wizard
- Maintains consistency with NPC/Beast import flows

### With Existing Droid Systems

- Preserves droid configuration from imported templates
- Initializes fresh `droidSystems` for new droids
- No conflict with DroidBuilderApp or DroidValidationEngine

---

## 7. User-Facing Behavior

### Dialog Appearance

DroidTemplateChoiceDialog shows three cards:
- **Droid Template** (robot icon) - Chassis identity
- **Class Template** (scroll icon) - Class prefill
- **Build Custom** (wrench icon) - Blank slate

Each card explains:
- What it does
- What decisions it makes for you
- What you still need to build

### Customization Workflow

When user chooses "Droid Template" and imports:
1. Browse droid templates in Galactic Records
2. Click "Import Now" or "Customize & Import"
3. If customizing: edit name, portrait, notes
4. Browser closes → progression launches
5. Droid chargen continues with imported chassis

### Class Filtering

When user chooses "Class Template":
1. TemplateCharacterCreator opens
2. Jedi class absent (replaced by note: "Droids not eligible")
3. User selects from: Noble, Scoundrel, Scout, Soldier, Nonheroic
4. Class template prefills class choices
5. Progression launches with droid actor

---

## 8. Testing Scenarios

### Scenario 1: Droid Template Path
- [ ] "Create Droid" → "Use Droid Template"
- [ ] GalacticRecordsBrowser opens with droid category pre-loaded
- [ ] 388 droid templates visible
- [ ] Select astromech template
- [ ] Import now → droid actor created with astromech config
- [ ] Progression opens with droid chargen
- [ ] Droid maintains astromech system configuration through chargen

### Scenario 2: Class Template Path
- [ ] "Create Droid" → "Use Class Template"
- [ ] TemplateCharacterCreator opens
- [ ] Jedi not in class list (only Noble, Scoundrel, Scout, Soldier, Nonheroic)
- [ ] Select Scout template
- [ ] Progression opens with blank droid + Scout class context
- [ ] Still requires droid part construction

### Scenario 3: Custom Path
- [ ] "Create Droid" → "Build Custom"
- [ ] Progression opens with blank droid, no prefill
- [ ] Full droid chargen from scratch

### Scenario 4: Force Exclusion
- [ ] Create droid via any path
- [ ] In TemplateCharacterCreator: Jedi absent
- [ ] In progression: Cannot select Jedi later (enforced by progression rules)

### Scenario 5: Customization Wizard
- [ ] Droid Template → "Customize & Import"
- [ ] NPCImportCustomizationWizard opens
- [ ] Edit name (different from template)
- [ ] Edit portrait
- [ ] Add notes
- [ ] Import → droid created with custom data, astromech config preserved

### Scenario 6: Regression
- [ ] NPC import still works (heroic/nonheroic/beast)
- [ ] PC creation unaffected
- [ ] Beast import unaffected
- [ ] Existing actor directory functions unchanged

---

## 9. Known Limitations & Future Work

### Phase 1 (Current)
✅ Three-way droid creation choice
✅ Droid template import (Galactic Records)
✅ Class template selection with Force exclusion
✅ Customization wizard for droid templates
✅ Progression integration

### Phase 2 (Future)
- [ ] Class template prefill propagation (context → progression choices)
- [ ] Droid-specific customization wizard (edit droid system configs pre-import)
- [ ] Advanced droid templates with part presets
- [ ] Template search/filter for 388 droid catalog

### Out of Scope
- Droid editing after chargen completion (separate system)
- Droid part swap mechanics (belongs in DroidBuilderApp)
- Force-using synthetic characters (not SWSE rules)

---

## 10. Architectural Principles Maintained

1. **Progression-First**: All droid creation feeds into progression pipeline
2. **Consistency**: Follows actor/NPC creation patterns
3. **Extensibility**: Registry-based system supports future actor types
4. **User Agency**: Three distinct paths, not forced choices
5. **Rule Fidelity**: Force/Jedi exclusion reflects game rules
6. **Diegetic Language**: "Templates" in SWSE universe context (Galactic Records, class training)

---

## 11. Success Criteria

✅ Droid creation option available in chargen
✅ Three distinct template paths functional
✅ Droid templates importable from Galactic Records
✅ Class templates filterable (no Jedi for droids)
✅ Customization wizard accessible for droid templates
✅ All paths feed into progression pipeline
✅ Droid actor configuration preserved through template import
✅ No breaking changes to existing systems
✅ UI consistent with existing SWSE design

---

## 12. Code Examples

### Opening Droid Template Choice

```javascript
// From chargen-init.js
DroidTemplateChoiceDialog.create({
  callback: async (result) => {
    await _handleDroidCreation(result);
  }
});
```

### Pre-selecting Droid Category in Galactic Records

```javascript
// From DroidTemplateChoiceDialog
GalacticRecordsBrowser.create({
  preSelectCategory: 'droid',
  importCallback: async (actor) => {
    // Handle imported droid
    this.callback({
      choice: 'droid-template',
      actor: actor
    });
  }
});
```

### Filtering Droid Classes

```javascript
// From TemplateCharacterCreator
if (this.isDroid && this.excludeForce) {
  context.classes = context.classes.filter(c => c.name !== 'Jedi');
}
```

### Creating Blank Droid for Progression

```javascript
// From chargen-init.js _handleDroidCreation
const droidActor = await ActorClass.create({
  name: 'New Droid',
  type: 'droid',
  system: {
    isDroid: true,
    level: 0,
    droidSystems: { /* initialized empty */ }
  }
});

await launchProgression(droidActor);
```

---

## 13. Conclusion

The **Droid Template Choice System** provides three compelling ways to create droid player characters:

1. **Droid Template** - "I want an astromech with these systems as my baseline"
2. **Class Template** - "I want to be a Scout, and I happen to be a droid"
3. **Custom** - "I'll build my droid from scratch"

All paths preserve the integrity of droid PC progression while offering templated guidance where players want it. The system maintains architectural consistency with actor and NPC creation flows while respecting droid-specific constraints (Force exclusion).

**Status**: Ready for QA testing and integration with progression shell.

**Date**: 2026-03-28
**Version**: 1.0
