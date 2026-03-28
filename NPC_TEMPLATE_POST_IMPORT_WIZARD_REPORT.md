# NPC Template Post-Import Customization Wizard Report

**Date**: 2026-03-28
**Version**: 2.0 (Phase 2 - Optional Post-Import Customization)
**System**: SWSE Foundry VTT v1.2.1
**Status**: Complete & Ready for Testing

---

## 1. Phase 2 Implementation Summary

Successfully implemented optional post-import customization wizard that allows users to adjust NPC details before finalization. Users now have two choices after selecting a template:

- **Import Now** - Direct import with template defaults (fast path)
- **Customize & Import** - Lightweight wizard for quick adjustments (customization path)

---

## 2. Design Principles Met

### 2.1 Lightweight & Practical ✅

- **Scope Limited**: Only editable fields: Name, Portrait, Notes, Biography
- **No Full Builder**: Does not expose class levels, abilities, or progression logic
- **Fast Path Available**: "Import Now" button for users who want quick import
- **Template Authority Preserved**: Imported data remains based on template

### 2.2 Compendium Templates Authoritative ✅

- Statblock data loaded from templates
- Custom data only supplements, doesn't replace base template
- Original statblock preserved in actor flags
- All template data (abilities, defenses, items) unaffected by customization

### 2.3 Seamless Integration ✅

- Added naturally to existing import flow
- No disruption to Phase 1 direct import
- Optional - fully backwards compatible
- User controls path (Import Now vs Customize)

---

## 3. Component Architecture

### 3.1 NPCImportCustomizationWizard (`scripts/apps/npc-import-customization-wizard.js`)

**Type**: DialogV2-based application

**Responsibility**: Collect and return custom NPC data before import

**Key Features**:
- Portrait picker with preview
- Live portrait preview updates
- Name field (required)
- Notes field (optional, short form)
- Biography field (optional, long form)
- Template metadata display for context
- Callback pattern for parent coordination

**Lifecycle**:
1. Created when user clicks "Customize & Import"
2. Displays template information for context
3. User edits fields
4. User clicks "Finalize & Import"
5. Validation checks (name required)
6. Callback executed with custom data
7. Parent importer executes import with custom data

**Data Structure Returned**:
```javascript
{
  name: "Custom NPC Name",           // Required
  portrait: "path/to/portrait.webp", // Optional (defaults to template)
  notes: "Quick notes...",           // Optional
  biography: "Full biography..."     // Optional
}
```

### 3.2 Handlebars Template (`templates/apps/npc-import-customization-wizard.hbs`)

**Features**:
- Portrait picker with visual preview
- Form fields with placeholder text
- Form hints explaining each field
- Template metadata panel (read-only) showing:
  - Source template name
  - Species
  - Class levels
  - Info note about full customization post-import
- Responsive grid layout
- SWSE theme styling (dark mode with accent colors)

**Layout**:
```
┌─ Header ─────────────────────────┐
│ Title + Subtitle                 │
├──────────────────────────────────┤
│ Portrait Preview + Picker        │
├──────────────────────────────────┤
│ Name Input (required)            │
├──────────────────────────────────┤
│ Notes Textarea (optional)        │
├──────────────────────────────────┤
│ Biography Textarea (optional)    │
├──────────────────────────────────┤
│ Template Info Panel (read-only)  │
├──────────────────────────────────┤
│ [Cancel]  [Finalize & Import]   │
└──────────────────────────────────┘
```

### 3.3 NPCTemplateImporter Updates (`scripts/apps/npc-template-importer.js`)

**Changes**:
- Added import of `NPCImportCustomizationWizard`
- Split `_onImport()` into three methods:
  - `_onImportNow()` - Direct import, no wizard
  - `_onImportAndCustomize()` - Open wizard, import with custom data
  - `_executeImport(template, customData)` - Core import logic
- Updated event listeners for two-button pattern
- Passes customData to import engine

**New Flow**:
```
User selects template
  ↓
User clicks "Import Now" OR "Customize & Import"
  ├─ Import Now:
  │   └─ _executeImport(template, null)
  │       └─ Engine creates actor with template defaults
  │
  └─ Customize & Import:
      └─ _onImportAndCustomize()
          └─ Opens NPCImportCustomizationWizard
              └─ User fills form
                  └─ Clicks "Finalize & Import"
                      └─ _executeImport(template, customData)
                          └─ Engine creates actor with customized name/portrait/notes
```

### 3.4 NPCTemplateImporterEngine Updates (`scripts/engine/import/npc-template-importer-engine.js`)

**Changes**:
- All import methods now accept optional `customData` parameter:
  - `importBeastTemplate(actorId, customData)`
  - `importNonheroicTemplate(template, customData)`
  - `importHeroicTemplate(template, customData)`
- Updated `_buildActorFromStatblock()` to apply custom data
- Applied custom data includes:
  - **name**: Override actor display name
  - **portrait**: Override actor image and token image
  - **notes/biography**: Applied to system.biography field

**Data Application Logic**:

**Beast Import with Custom Data**:
```javascript
// Load from compendium
const newActorData = foundry.utils.deepClone(actorData);

// Apply custom overrides
if (customData) {
  newActorData.name = customData.name || newActorData.name;
  newActorData.img = customData.portrait || newActorData.img;
  if (newActorData.prototypeToken) {
    newActorData.prototypeToken.img = customData.portrait || newActorData.prototypeToken.img;
  }
}

// Create actor
const actor = await Actor.create(newActorData);

// Apply biography
if (customData && (customData.notes || customData.biography)) {
  const bio = [customData.notes, customData.biography]
    .filter(t => t?.trim())
    .join('\n\n');
  await actor.update({ 'system.biography': bio });
}
```

**Nonheroic/Heroic Import with Custom Data**:
```javascript
// Use custom name in actor data
const actorName = customData?.name || template.name;
const portrait = customData?.portrait || 'defaults';

// Build actor with custom name and portrait
const actor = await _buildActorFromStatblock(
  actorName,
  statblock,
  npcType,
  customData
);

// Biography applied inside _buildActorFromStatblock
```

---

## 4. User Experience Flow

### 4.1 Complete Flow Chart

```
┌─ Actor Directory ──────────────────────┐
│ [Import NPC] [Templates] [Store] [GM]  │ ← Sidebar buttons
└────────────────────────────────────────┘
              ↓ User clicks "Import NPC"
┌─ NPC Template Importer ────────────────┐
│ Step 1: Select Category                │
│  [Beast] [Nonheroic] [Heroic]         │
└────────────────────────────────────────┘
              ↓ User clicks category
┌─ Template Loader (async) ──────────────┐
│ Loading templates...                    │
└────────────────────────────────────────┘
              ↓ Templates loaded
┌─ NPC Template Importer ────────────────┐
│ Step 2: Select Template                │
│ [Template Grid showing images]         │
└────────────────────────────────────────┘
              ↓ User clicks template
┌─ NPC Template Importer ────────────────┐
│ Step 3: Choose Import Method           │
│                                        │
│ [Import Now] [Customize & Import]     │
└────────────────────────────────────────┘
         ↙                            ↘
    Import Now              Customize & Import
        ↓                         ↓
  Execute Import         ┌─ Customization Wizard ─┐
        ↓                │ Portrait Picker       │
  Create Actor           │ Name Field            │
        ↓                │ Notes Field           │
  Open Sheet             │ Biography Field       │
        ↓                │ [Cancel] [Finalize]  │
    DONE                 └──────────────────────┘
                              ↓
                         User Confirms
                              ↓
                        Execute Import
                        (with custom data)
                              ↓
                          Create Actor
                              ↓
                           Open Sheet
                              ↓
                             DONE
```

### 4.2 Interaction Patterns

**Portrait Picker Button**:
- Opens FilePicker dialog
- User browses for image
- Selection applied to text input
- Preview updates immediately
- Supports webp, png, jpg

**Name Field**:
- Required field
- Validation on finalize
- If empty, shows warning: "Please enter a name for the NPC"

**Notes & Biography**:
- Optional fields
- Combined and applied to actor.system.biography
- Separated by double newline if both provided

**Template Info Panel**:
- Shows source template details (read-only)
- Displays species and class levels for context
- Info note: "You can adjust more details after the actor is created using the full character sheet."
- Helps user understand they're not limited to wizard fields

---

## 5. Safe Field Selection

### 5.1 Fields Included (Safe to Edit)

| Field | Type | Reason | Impact |
|-------|------|--------|--------|
| **Name** | Required | Display/organizational | No game mechanics |
| **Portrait** | Optional | Visual customization | Token image only |
| **Notes** | Optional | Quick reference | Meta/biography only |
| **Biography** | Optional | Full lore | Meta/biography only |

**Safety Analysis**:
- None of these fields affect derived calculations
- None require re-computation of stats/defenses/BAB
- All are safe to change after actor creation
- User can further edit all fields in character sheet afterward

### 5.2 Fields Intentionally Excluded

| Field | Reason for Exclusion |
|-------|----------------------|
| **Ability Scores** | Would require full recomputation of derived values (AC, saves, skills, BAB) |
| **Class Levels** | Progression engine required; outside scope of lightweight wizard |
| **Skills** | Dependent on abilities and class; would break if standalone |
| **Feats/Talents** | Progression dependencies; source compendium required |
| **Equipment** | Item relationships; too complex for lightweight wizard |
| **HP** | Derived from ability (CON) and class; would be invalid if changed without recompute |

**Design Decision**: Keep wizard lightweight and practical. Full stat/progression customization should happen via character sheet after import, or user should select different template.

---

## 6. Error Handling & Cancellation

### 6.1 Wizard Cancellation

**If user clicks Cancel**:
1. Wizard closes
2. Parent importer dialog remains open
3. Template still selected
4. User can try again or import directly

**If user closes wizard window**:
- Same behavior as Cancel
- No partial state left behind

### 6.2 Validation

**On Finalize**:
```javascript
if (!customData.name || !customData.name.trim()) {
  ui.notifications.warn('Please enter a name for the NPC');
  // Wizard stays open, user can fix
  return;
}
```

**Name Trimmed**:
```javascript
customData.name = customData.name.trim();
```

### 6.3 Import Failure

If actor creation fails during `_executeImport()`:
1. Error caught and logged
2. User shown: "Failed to import NPC template" (generic)
3. Dialog closed (inconsistent state avoidance)
4. User can retry from actor directory sidebar

---

## 7. Integration Points

### 7.1 New Dependencies

- `NPCImportCustomizationWizard` imported in `npc-template-importer.js`
- `NPCImportCustomizationWizard` uses `FilePicker` (Foundry core)
- No new system dependencies

### 7.2 Modified Methods

| File | Method | Change |
|------|--------|--------|
| `npc-template-importer.js` | `_onImport()` | Removed; split into `_onImportNow()` and `_onImportAndCustomize()` |
| `npc-template-importer.js` | `_onRender()` | Updated event listeners for two buttons |
| `npc-template-importer-engine.js` | `importBeastTemplate()` | Added `customData` parameter |
| `npc-template-importer-engine.js` | `importNonheroicTemplate()` | Added `customData` parameter |
| `npc-template-importer-engine.js` | `importHeroicTemplate()` | Added `customData` parameter |
| `npc-template-importer-engine.js` | `_buildActorFromStatblock()` | Added `customData` parameter |
| `npc-template-importer.hbs` | Footer buttons | Changed from one "Import Template" to two buttons: "Import Now" and "Customize & Import" |

### 7.3 No Breaking Changes

- Phase 1 import remains fully functional
- "Import Now" button provides original direct-import UX
- All existing code paths unchanged (only extended)
- Optional feature - doesn't affect other systems

---

## 8. Files Created/Modified

### 8.1 New Files

| File | Purpose | Size |
|------|---------|------|
| `scripts/apps/npc-import-customization-wizard.js` | Customization wizard app | ~2 KB |
| `templates/apps/npc-import-customization-wizard.hbs` | Wizard UI template | ~4 KB |

### 8.2 Modified Files

| File | Changes |
|------|---------|
| `scripts/apps/npc-template-importer.js` | Import wizard; split import logic; update event handlers; add callbacks |
| `scripts/engine/import/npc-template-importer-engine.js` | Accept custom data in all import methods; apply to created actors |
| `templates/apps/npc-template-importer.hbs` | Change import button to "Import Now" / "Customize & Import"; update button styling |

---

## 9. Testing Checklist

### 9.1 Phase 2 Specific Tests

**Customization Wizard**:
- [ ] Wizard opens when "Customize & Import" clicked
- [ ] Portrait picker opens FilePicker
- [ ] Portrait preview updates on selection
- [ ] Name field is required (validation works)
- [ ] Notes and Biography fields accept multi-line text
- [ ] Template info displays correctly (species, classes, source)
- [ ] Cancel button closes wizard without importing
- [ ] Finalize button validates and closes wizard
- [ ] Finalize button triggers parent import

**Import with Custom Data**:
- [ ] Beast template import applies custom name
- [ ] Beast template import applies custom portrait to actor AND token
- [ ] Nonheroic template import applies custom name
- [ ] Nonheroic template import applies custom portrait
- [ ] Heroic template import applies custom name
- [ ] Heroic template import applies custom portrait
- [ ] Custom notes and biography applied to system.biography field
- [ ] Notes and biography combined with newline separator if both provided
- [ ] Only one of notes/biography applied if only one provided
- [ ] Template abilities/defenses/HP unaffected by customization

**Direct Import (Unchanged)**:
- [ ] "Import Now" still works without wizard
- [ ] Direct import uses template defaults for name/portrait
- [ ] Direct import fast path (no extra dialog)
- [ ] Beast import unaffected
- [ ] Nonheroic import unaffected
- [ ] Heroic import unaffected

**UI/UX**:
- [ ] Two buttons visible and properly styled
- [ ] "Import Now" (blue) distinguished from "Customize & Import" (gold)
- [ ] Buttons only appear when template selected
- [ ] Cancel button works from both dialogs
- [ ] Error notifications work
- [ ] Success notifications show correct actor name

### 9.2 Regression Tests

- [ ] Character template creation unaffected
- [ ] Store functionality unaffected
- [ ] Actor directory functionality unaffected
- [ ] No console errors during import
- [ ] No console errors during customization
- [ ] Sidebar buttons load correctly
- [ ] Non-GM users still blocked from import

---

## 10. Performance Considerations

### 10.1 Wizard Performance

**Dialog Creation**: Negligible
- Simple DialogV2 with small form
- No large data loads
- No computed properties

**FilePicker**: Standard Foundry
- Uses native Foundry FilePicker
- Performance depends on file system

**Import with Custom Data**: Same as Phase 1
- No additional processing
- Custom data applied via simple field updates
- No re-computation needed

### 10.2 Memory

**Wizard State**: Minimal
```javascript
this.customData = {
  name: string,
  portrait: string,
  notes: string,
  biography: string
}
```

No large collections or nested data structures.

---

## 11. Known Limitations

### 11.1 Phase 2 Limitations

- **No bulk renaming**: Each import is one wizard instance
- **No portrait preview in list**: Template grid shows template portrait, not custom
- **No undo**: If custom portrait path is wrong, user must edit actor sheet after
- **Limited validation**: Only name validation; no image validation

### 11.2 Intentional Constraints

- **Scope**: Lightweight wizard only, not full character builder
- **Field selection**: Only safe, non-derived fields
- **No progression**: Does not trigger progression engine
- **No compendium linking**: Custom data doesn't link to compendium sources

### 11.3 Future Enhancements

- [ ] Portrait preview in template grid
- [ ] Batch import with customization
- [ ] More fields (faction, alignment, role labels)
- [ ] Custom stat adjustment (with re-computation)
- [ ] Import history / saved configurations
- [ ] Better portrait browser (with filtering)

---

## 12. Code Quality

### 12.1 Standards Met

- ✅ Consistent naming conventions
- ✅ Comprehensive logging
- ✅ Error handling with try/catch
- ✅ Async/await properly used
- ✅ No global state mutations
- ✅ Callback pattern for coordination
- ✅ JSDoc comments on public methods
- ✅ Handlebars template valid
- ✅ CSS scoped to component
- ✅ FilePicker standard Foundry API usage

### 12.2 Backwards Compatibility

- ✅ Phase 1 direct import fully preserved
- ✅ "Import Now" provides original UX
- ✅ All existing code paths work
- ✅ No breaking changes to engine or importer
- ✅ Optional feature doesn't affect other systems

---

## 13. Deployment

### 13.1 Installation

1. Copy new files:
   - `scripts/apps/npc-import-customization-wizard.js`
   - `templates/apps/npc-import-customization-wizard.hbs`

2. Update modified files:
   - `scripts/apps/npc-template-importer.js`
   - `scripts/engine/import/npc-template-importer-engine.js`
   - `templates/apps/npc-template-importer.hbs`

3. No config changes
4. No migrations
5. System restart required

### 13.2 Rollback

If issues occur:
1. Remove customization wizard files
2. Revert importer and engine to Phase 1 versions
3. System restart

---

## 14. Design Decisions

### 14.1 Why Two Buttons Instead of Checkbox?

**Chosen**: Two explicit buttons ("Import Now" / "Customize & Import")

**Reasons**:
- More discoverable than hidden checkbox
- Clear intent for each path
- Reduces accidental wizard opens
- Consistent with other system UX patterns

**Alternative considered**: Single button with toggle for customization
- Less discoverable
- More confusing for new users
- Could be accidentally triggered

### 14.2 Why Not Full Progression Customization?

**Chosen**: Lightweight wizard with only safe fields

**Reasons**:
- Progression engine too complex for quick import
- Users can edit full sheet after
- Lightweight approach keeps wizard fast
- Avoids invalid state (changed ability without recompute)
- Matches design principle: "practical, not comprehensive"

**Alternative considered**: Full progression builder
- Too heavy for quick import
- Duplicates existing progression framework
- Risk of invalid data states
- Outside scope of "import" feature

### 14.3 Why Combine Notes and Biography?

**Chosen**: Both fields combined into system.biography on actor

**Reasons**:
- SWSE actor system has single biography field
- Notes + Biography provides two levels of detail
- Combined with newline separator for clarity
- User can edit/reorganize in sheet later

**Alternative considered**: Separate fields for each
- SWSE system doesn't support two biography fields
- Would require extending system data structure
- Out of scope for this feature

---

## Conclusion

Phase 2 Post-Import Customization Wizard is successfully implemented and fully integrated with Phase 1. The system provides:

✅ **Optional lightweight customization** for name, portrait, notes, and biography
✅ **Direct import path** for users who want template defaults ("Import Now")
✅ **Safe field selection** that doesn't affect game mechanics or require recomputation
✅ **Full backwards compatibility** with Phase 1
✅ **Proper error handling** and validation
✅ **Clean UX** that matches existing SWSE patterns
✅ **No breaking changes** to other systems

Users can now:
1. **Fast Path**: Click "Import Now" for quick import with template defaults
2. **Customization Path**: Click "Customize & Import" for lightweight wizard adjustments
3. **Full Edit**: Always available in actor sheet after import for comprehensive changes

The implementation follows all design principles from the task specification and integrates seamlessly into the existing NPC import system.

---

**Status**: ✅ Phase 1 + Phase 2 Complete
**Date**: 2026-03-28
**Ready for**: Full System Testing
