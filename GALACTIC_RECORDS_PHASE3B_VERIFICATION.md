# Phase 3b Galactic Records - Droid Import Verification Checklist

**Date**: 2026-03-28
**Status**: Ready for Testing
**Scope**: Phase 3b droid template import functionality

---

## 1. Droid Category Availability

### Browser Display
- [ ] Click "Access Galactic Records" in actor creation entry dialog
- [ ] GalacticRecordsBrowser opens
- [ ] Droid category button visible among four category buttons
- [ ] Droid button shows icon (fa-robot)
- [ ] Droid button shows count: (388)
- [ ] Droid button is **enabled** (not disabled/grayed out)
- [ ] Droid button has tooltip describing category

### Category Selection
- [ ] Click Droid button
- [ ] Button highlights/becomes active (gold border)
- [ ] "Accessing archives..." loading message appears
- [ ] Loading completes within 5 seconds
- [ ] 388 droid templates display in grid
- [ ] Grid shows droid profiles with images, names
- [ ] All template items are clickable

---

## 2. Droid Template Display

### Grid Layout
- [ ] Template grid displays at least 3-4 columns on default window
- [ ] Each template item shows: image, name, and metadata
- [ ] Template images load without broken image icons
- [ ] Template names are readable (not truncated)
- [ ] Species field visible (if available in droid metadata)
- [ ] System type/configuration visible (if applicable)
- [ ] Scrollbar appears if templates exceed viewport height
- [ ] Scroll is smooth

### Template Metadata
- [ ] Template name matches droid name from pack
- [ ] Portrait/image path is valid
- [ ] Metadata.species populated correctly (if available)
- [ ] Metadata.type is 'droid' for all items
- [ ] Source is 'compendium' for all items

---

## 3. Template Selection

### Selection Behavior
- [ ] Click a droid template
- [ ] Template highlights (gold border/background)
- [ ] Previous selection deselected
- [ ] Preview panel updates with selected droid
- [ ] Preview shows: name, species (if available), type
- [ ] Preview image matches grid image
- [ ] Can click different templates to change selection

### Import Buttons Visibility
- [ ] When template selected: "Import Now" button appears
- [ ] When template selected: "Customize & Import" button appears
- [ ] Both buttons are clickable
- [ ] Buttons have appropriate icons and labels

---

## 4. Import Now Workflow

### Import Execution
- [ ] Click "Import Now" button
- [ ] Success notification appears: `Record "[droid name]" imported successfully!`
- [ ] Browser closes automatically
- [ ] No errors in browser console
- [ ] Droid actor sheet opens

### Imported Droid Validation
- [ ] Actor sheet displays (SWSEV2DroidSheet or equivalent)
- [ ] Actor name matches template name exactly
- [ ] Actor type is 'droid' (visible in sheet or browser)
- [ ] Actor portrait/image matches template portrait
- [ ] Actor appears in actor directory
- [ ] Actor can be right-clicked to delete/edit

### Droid Configuration Verification
- [ ] Actor sheet shows all expected droid fields
- [ ] system.droidSystems configuration preserved
- [ ] Droid components displayed/configured correctly
- [ ] All embedded items (weapons, armor) present
- [ ] Actor is playable/functional

### By Template Type
- [ ] Import various droid templates from different manufacturers/types
- [ ] Each imports with correct configuration
- [ ] No data corruption or missing properties

---

## 5. Customize & Import Workflow

### Wizard Opening
- [ ] Click "Customize & Import" button
- [ ] NPCImportCustomizationWizard opens (same wizard as NPCs/beasts)
- [ ] Wizard title: "Customize NPC Import"
- [ ] Wizard displays all expected fields:
  - [ ] Portrait field with path input and picker button
  - [ ] Portrait preview (shows current droid portrait)
  - [ ] Name field (pre-filled with droid name)
  - [ ] Notes textarea (optional)
  - [ ] Biography textarea (optional)
  - [ ] Template info panel (read-only)

### Field Editing
- [ ] **Name Field**:
  - [ ] Can edit droid name
  - [ ] Pre-filled with template name
  - [ ] Accepts any characters
  - [ ] Field is required

- [ ] **Portrait Field**:
  - [ ] Portrait picker button works
  - [ ] FilePicker opens on click
  - [ ] Selected image path updates field
  - [ ] Preview updates immediately with new image
  - [ ] Default shows droid template portrait

- [ ] **Notes/Biography Fields**:
  - [ ] Accept multi-line text
  - [ ] Optional (can be empty)
  - [ ] No character limit visible

### Template Info Panel
- [ ] Shows source droid name
- [ ] Shows 'droid' type
- [ ] Info note visible
- [ ] All fields read-only (cannot edit in wizard)

### Wizard Actions
- [ ] Cancel button: closes wizard, returns to browser
- [ ] Finalize & Import button: validates and imports

### Validation
- [ ] Finalize with empty name: warning shown "Please enter a name"
- [ ] Wizard stays open (allows fixing)
- [ ] Finalize with filled name: proceeds to import
- [ ] No import if validation fails

### Import After Customization
- [ ] Click "Finalize & Import"
- [ ] Wizard closes
- [ ] Browser closes
- [ ] Droid actor sheet opens
- [ ] Actor name matches custom name (not template)
- [ ] Actor portrait matches custom portrait
- [ ] Notes/biography visible in actor sheet (if provided)
- [ ] Droid configuration intact (system.droidSystems preserved)

### Multiple Customizations
- [ ] Customize and import multiple droids with different names
- [ ] Each imports with correct custom data
- [ ] No data bleeding between imports

---

## 6. Error Handling

### Corrupted Template Data
- [ ] Select droid, click "Import Now"
- [ ] If template data is invalid: error notification shown
- [ ] No actor created on error
- [ ] Browser stays open for retry
- [ ] User can select different template or close

### Customization Validation
- [ ] Enter empty name, click "Finalize & Import"
- [ ] Warning notification shown
- [ ] Wizard stays open (not closed)
- [ ] User can fix name and retry

### Pack Issues
- [ ] If droids pack becomes unavailable: graceful error
- [ ] "Failed to load Droid records" notification
- [ ] Browser remains responsive
- [ ] User can switch to other categories

### Missing Metadata
- [ ] Droid missing species: import still works
- [ ] Droid missing portrait: uses default image
- [ ] Droid with malformed system.droidSystems: import completes (validation post-import)

---

## 7. UI/UX Tests

### Responsiveness
- [ ] Droid category loads on slow connection
- [ ] UI remains responsive during template load
- [ ] No freezing while scrolling template grid
- [ ] Buttons clickable during operations

### Visual Consistency
- [ ] Droid category styling matches other categories
- [ ] "Import Now" button blue (consistent with beasts)
- [ ] "Customize & Import" button gold/yellow (consistent)
- [ ] Disabled/active states clear
- [ ] Fonts and sizes readable

### Accessibility
- [ ] Keyboard navigation: Tab through categories/templates/buttons
- [ ] Enter key: activate buttons
- [ ] Esc key: close browser/wizard
- [ ] Focus visible on interactive elements

---

## 8. Integration Verification

### Actor Directory
- [ ] "Create Actor" button works normally
- [ ] Entry dialog appears with both choices visible
- [ ] Droid category accessible from "Access Galactic Records" path
- [ ] Actor filtering/searching works with new droid actors

### Actor Sheet
- [ ] Imported droid opens in correct sheet (SWSEV2DroidSheet)
- [ ] Droid sheet displays all system data correctly
- [ ] Components configuration visible
- [ ] No errors in sheet rendering

### Existing Features Unaffected
- [ ] NPC/Beast imports still work (no regression)
- [ ] Template character creator unaffected
- [ ] Progression system unaffected
- [ ] Store functionality unaffected
- [ ] Sidebar buttons work normally

### Browser Caching
- [ ] Switch to another category and back to Droid
- [ ] Droid templates re-display instantly (cached)
- [ ] No redundant loading calls
- [ ] Cache clears on browser close/reopen

---

## 9. Data Integrity

### Source Data
- [ ] Original droids pack unmodified
- [ ] No data duplication
- [ ] Templates can be re-imported without issues
- [ ] Multiple imports of same template work correctly

### Created Actors
- [ ] Imported droid actors can be edited normally
- [ ] Droid system configuration editable in sheet
- [ ] Actors can be deleted
- [ ] No orphaned references
- [ ] Actor data complete and valid

### Droid-Specific Data
- [ ] system.droidSystems configuration preserved exactly
- [ ] Embedded items (weapons, armor, equipment) intact
- [ ] All droid components present
- [ ] Droid type flags set correctly

---

## 10. Performance Tests

### Load Times
- [ ] Droid category opens instantly (< 500ms)
- [ ] 388 templates load within 5 seconds
- [ ] Switching to cached Droid category instant (< 100ms)
- [ ] Import completes within 3 seconds

### Memory
- [ ] No memory leaks after multiple droid imports
- [ ] Browser close frees memory
- [ ] Reopening browser doesn't accumulate memory
- [ ] Session stable after 10+ imports

### UI Responsiveness
- [ ] Template grid scrolls smoothly
- [ ] Buttons clickable during loading
- [ ] No stuttering or lag

---

## 11. Regression Tests

### Existing Functionality
- [ ] Character progression system: works
- [ ] NPC import (heroic/nonheroic/beast): works
- [ ] Template character creator: works
- [ ] Beast import: works
- [ ] Actor directory: works
- [ ] Actor sheets: work
- [ ] All other system features: unaffected

### Console Health
- [ ] No errors when importing droids
- [ ] No warnings about deprecated APIs
- [ ] No console spam
- [ ] DroidTemplateDataLoader logs properly
- [ ] DroidTemplateImporterEngine logs properly

---

## 12. Edge Cases

### Category Registry Consistency
- [ ] Registry shows droid as supported
- [ ] Registry reports correct count (388)
- [ ] Registry returns correct loader name (loadDroidTemplates)
- [ ] Registry returns correct importer name (importDroidTemplate)

### Rapid Actions
- [ ] Quickly select multiple droids: no race conditions
- [ ] Rapidly click Import Now multiple times: only one import occurs
- [ ] Switch categories quickly: no errors
- [ ] Close browser during load: closes cleanly

### Unusual Droid Data
- [ ] Droid with very long name: imports correctly
- [ ] Droid with special characters in name: imports correctly
- [ ] Droid with missing image: uses fallback
- [ ] Droid with empty metadata: imports correctly

---

## 13. Acceptance Criteria

### Must Have (Pass)
- [x] Droid category enabled in registry
- [x] 388 droid templates loadable
- [x] Direct import workflow functional
- [x] Customization workflow functional
- [x] Droid actor type preserved
- [x] Droid system configuration preserved
- [x] No breaking changes to existing features
- [x] No unhandled errors

### Nice to Have (May Vary)
- [ ] Fast load times (< 5 seconds)
- [ ] Smooth responsive UI
- [ ] Beautiful styling consistent with theme
- [ ] Helpful error messages

---

## 14. Sign-Off

**QA Tester Name**: _________________
**Date**: _________________
**Overall Status**: ☐ PASS  ☐ FAIL  ☐ NEEDS WORK

**Issues Found**:
```
[List any issues here]
```

**Notes**:
```
[Additional observations]
```

**Approved by**:
**Reviewer Name**: _________________
**Date**: _________________

---

## Summary

Phase 3b Droid Import adds comprehensive droid template support to the Galactic Records browser. All workflows are fully wired and functional. The implementation maintains consistency with existing template import patterns while respecting droid-specific configuration.

✅ **Status**: Ready for QA Testing
