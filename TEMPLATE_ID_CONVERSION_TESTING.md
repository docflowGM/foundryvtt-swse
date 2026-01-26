# Phase 4: Template ID Conversion Testing Guide

**Date:** 2026-01-26
**Status:** Ready for Testing
**Phases Complete:** 1 (TemplateIdMapper), 2 (Migration Script), 3 (Validation)
**Next:** Run migration and test in Foundry

---

## Overview

This guide walks through testing the ID-based template conversion in Foundry.

**What was changed:**
1. ✅ Created `TemplateIdMapper` utility (Phase 1)
2. ✅ Created migration script (Phase 2)
3. ✅ Added ID validation to template loader (Phase 3)
4. 🔄 Testing and verification (Phase 4 - this document)

---

## Pre-Migration Checklist

- [ ] Make a backup of `data/character-templates.json`
- [ ] Foundry running and game world open
- [ ] Console accessible (F12 in browser)
- [ ] No active character creation sessions

---

## Step 1: Validate Current Templates

Run validation to see which templates can be converted:

```javascript
// In Foundry console (F12):
import { TemplateIdMapper } from './scripts/utils/template-id-mapper.js';

// Validate all current templates
const response = await fetch('data/character-templates.json');
const data = await response.json();
const report = await TemplateIdMapper.validateAllTemplates(data.templates);

console.table({
  'Total': report.totalTemplates,
  'Valid': report.validCount,
  'Invalid': report.invalidCount,
  'Status': report.invalidCount === 0 ? '✅ Ready' : '⚠️ Issues found'
});

// If there are invalid templates, show details:
if (report.invalidCount > 0) {
  console.warn('Issues:', report.issues);
}
```

**Expected Output:**
```
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ Total   │ 16     │
│ Valid   │ 16     │
│ Invalid │ 0      │
│ Status  │ ✅ Ready│
└─────────┴────────┘
```

If you see invalid templates, you'll need to:
1. Fix the missing items in the data (add them to compendiums)
2. Or remove those templates from the JSON
3. Then re-run validation

---

## Step 2: Run Migration

Run the migration script to convert templates to ID format:

```javascript
// In Foundry console:
import { migrateTemplatesToIds } from './scripts/maintenance/migrate-templates-to-ids.js';

const result = await migrateTemplatesToIds();
console.log(JSON.stringify(result, null, 2));
```

**What you'll see:**
```
🔄 Template Migration to Compendium IDs
Loading templates...
✅ Loaded 16 templates
Template IDs:
  - jedi_guardian: Guardian
  - jedi_consular: Consular
  - jedi_defender: Defender
  - ... (12 more)

📋 Validation Phase
Validating 16 templates...
✅ Validation Results:
   Valid:   16/16
   Invalid: 0/16

🔀 Conversion Phase
Converting 16 valid templates...
✅ jedi_guardian
✅ jedi_consular
✅ jedi_defender
... (13 more)

✅ Converted 16 templates

📤 Output Generation
✅ Output generated
   Version: 2
   Templates: 16/16
   Format: ID-based (compendium IDs)

📊 Migration Summary
[table of results]

📋 Next Steps:
1. Copy the JSON output below
2. Open data/character-templates.json in an editor
3. Replace entire content with the output
4. Save the file
5. Reload Foundry to verify templates load
```

---

## Step 3: Save Migration Output

The migration script outputs the new template data. You need to save this to the file:

### Option A: Copy/Paste (Safest)
1. In the console output, find the large JSON object
2. Right-click → Copy the entire `result` object
3. Open `data/character-templates.json` in your editor
4. Select all (Ctrl+A)
5. Paste the result
6. Save the file

### Option B: Export to File (Automated)
```javascript
// In Foundry console:
import { migrateTemplatesToIds } from './scripts/maintenance/migrate-templates-to-ids.js';

const result = await migrateTemplatesToIds();

// Create download blob
const json = JSON.stringify(result, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'character-templates.json';
a.click();
URL.revokeObjectURL(url);

console.log('✅ File downloaded as character-templates.json');
```

Then save the downloaded file to `data/character-templates.json`.

---

## Step 4: Reload Foundry

**Critical:** Reload Foundry to load the new template data:

1. Press **F5** or use browser "Reload Page"
2. Wait for Foundry to fully load
3. Check console for any [SSOT] warnings

**Expected console output:**
```
SWSE | Templates using ID-based format (v2)
SWSE | Loaded 16/16 character templates (ID-based format)
```

If you see errors, check:
- File saved correctly (valid JSON syntax)
- All closing braces present
- No trailing commas

---

## Step 5: Verify Templates Load

Check that templates loaded successfully:

```javascript
// In Foundry console:
import { CharacterTemplates } from './scripts/apps/chargen/chargen-templates.js';

const templates = await CharacterTemplates.getTemplates();
console.log(`Loaded ${templates.length} templates:`);

templates.forEach(t => {
  console.log(`  ✅ ${t.id}: ${t.name} (${t.class})`);
});

// Show structure of first template
console.log('\nFirst template structure:');
console.log(templates[0]);
```

**Expected output:**
```
Loaded 16 templates:
  ✅ jedi_guardian: Guardian (Jedi)
  ✅ jedi_consular: Consular (Jedi)
  ✅ jedi_defender: Defender (Jedi)
  ... (13 more)

First template structure:
{
  id: "jedi_guardian"
  name: "Guardian"
  class: "Jedi"
  archetype: "Guardian"
  speciesId: "species-mirialan"
  classId: "06f4d9029debf827"
  featIds: ["0053d97632b02e4a"]
  talentIds: ["001ae84d5862af55"]
  ... (other ID fields)
}
```

If templates don't load:
1. Check file syntax (copy into JSONLint.com)
2. Check file location (`data/character-templates.json`)
3. Check that file was saved properly
4. Look for [SSOT] validation warnings in console

---

## Step 6: Test Chargen with ID-Based Templates

Start character creation and test template selection:

### Test 1: Load Templates in Chargen
1. Create a new character
2. Go to **Templates** step
3. Select a template (e.g., "Guardian")
4. Observe:
   - ✅ Template displays correctly
   - ✅ No console errors
   - ✅ Mentor dialogue shows

### Test 2: Apply Template
1. Select a template
2. Click "Apply Template"
3. Observe:
   - ✅ Abilities apply correctly
   - ✅ Species is selected
   - ✅ Class is set
   - ✅ No [SSOT] warnings in console

### Test 3: Complete Chargen
1. Apply template
2. Continue through chargen steps:
   - ✅ Confirm species selection
   - ✅ Confirm class selection
   - ✅ Select feats (from template)
   - ✅ Select talents (from template)
   - ✅ Complete character creation
3. Observe:
   - ✅ No console errors
   - ✅ Character sheet renders
   - ✅ All template data applied

### Test 4: Level-Up with ID-Based Templates
1. Open an existing character
2. Go to **Level Up**
3. Observe:
   - ✅ No template errors
   - ✅ Progression works normally
   - ✅ No [SSOT] warnings

---

## Step 7: Verify Data Integrity

Check that all template IDs are valid:

```javascript
// In Foundry console:
import { CharacterTemplates } from './scripts/apps/chargen/chargen-templates.js';

const templates = await CharacterTemplates.getTemplates();

let allValid = true;
for (const t of templates) {
  const errors = await CharacterTemplates._validateSingleTemplate(t);
  if (errors.length > 0) {
    console.warn(`❌ ${t.id}:`, errors);
    allValid = false;
  } else {
    console.log(`✅ ${t.id}: all IDs valid`);
  }
}

console.log(allValid ? '\n✅ All templates valid!' : '\n⚠️ Some templates have issues');
```

**Expected output:**
```
✅ jedi_guardian: all IDs valid
✅ jedi_consular: all IDs valid
✅ jedi_defender: all IDs valid
... (13 more)

✅ All templates valid!
```

---

## Step 8: Check for [SSOT] Warnings

Scan console for any [SSOT] warnings:

```javascript
// In Foundry console, check the full console log for:
// [SSOT] warnings = system detected missing data

// Filter console warnings:
const logs = document.querySelectorAll('[class*="warn"]');
logs.forEach(log => {
  if (log.textContent.includes('[SSOT]')) {
    console.warn('Found [SSOT] warning:', log.textContent);
  }
});
```

**Acceptable [SSOT] warnings:**
- None (if migration was successful)

**Unacceptable [SSOT] warnings:**
- `[SSOT] Template validation failed`
- `[SSOT] IDs not found`
- `[SSOT] Compendium not found`

If you see unacceptable warnings, the migration had issues. Revert and investigate.

---

## Step 9: Revert if Needed

If something breaks, revert to the original:

```javascript
// In Foundry console:
// Copy your backup data back in
// Or use git to restore:
// git checkout HEAD -- data/character-templates.json
```

Then reload Foundry.

---

## Rollback Procedure

If migration fails and you need to rollback:

1. **Restore from backup:**
   ```bash
   # In terminal:
   cp data/character-templates.json.backup data/character-templates.json
   ```

2. **Or use git:**
   ```bash
   git checkout HEAD -- data/character-templates.json
   ```

3. **Reload Foundry** (F5)

4. **Verify** original templates load:
   ```javascript
   const templates = await CharacterTemplates.getTemplates();
   console.log(`Loaded ${templates.length} templates`);
   ```

---

## Success Criteria

Migration is successful when:

- ✅ `data/character-templates.json` has `"version": 2`
- ✅ `loadTemplates()` reports "ID-based format"
- ✅ All 16 templates load without errors
- ✅ `_validateSingleTemplate()` returns 0 errors for each template
- ✅ Chargen templates selection works
- ✅ Template application works
- ✅ No [SSOT] validation warnings in console
- ✅ No [SSOT] missing ID warnings
- ✅ Chargen completion works normally

---

## Troubleshooting

### Issue: "Invalid JSON" error

**Cause:** Syntax error in pasted content

**Fix:**
1. Copy the output again
2. Use JSONLint.com to validate
3. Make sure no trailing commas
4. Check for missing closing braces `}`

### Issue: "Templates using name-based format"

**Cause:** Migration didn't save correctly

**Fix:**
1. Check file content: `cat data/character-templates.json`
2. Verify `"version": 2` is present
3. If not, re-run migration and re-save

### Issue: "[SSOT] ID not found"

**Cause:** An ID doesn't exist in compendium

**Fix:**
1. Run validation: `await TemplateIdMapper.validateAllTemplates()`
2. Check which IDs are invalid
3. Either:
   - Add missing items to compendium
   - Update template to use correct ID
   - Remove problematic template

### Issue: Chargen crashes when applying template

**Cause:** Invalid data structure or missing IDs

**Fix:**
1. Check console for errors
2. Verify `character-templates.json` is valid JSON
3. Run single template validation to find issue
4. Revert and retry migration

---

## Performance Notes

ID-based templates use:
- Direct hash lookups (O(1)) instead of name searches
- Cached compendium indexes
- Fail-fast validation at load time

**Expected performance:**
- Template load: Same or faster
- Template application: Same or faster
- Validation: ~2-5 seconds for 16 templates (one-time, at load)

---

## Next Steps After Testing

If testing passes:

1. ✅ Migration complete and tested
2. Commit changes:
   ```bash
   git add data/character-templates.json
   git commit -m "refactor(templates): Convert to ID-based format (v2)"
   ```
3. Document any issues found
4. Ready for production use

---

## Questions?

If migration fails:
1. Check the troubleshooting section above
2. Verify JSON syntax with JSONLint.com
3. Check that all compendiums are loaded
4. Look for [SSOT] warnings in console

If issues persist:
1. Revert using rollback procedure
2. Document the error
3. Investigate the root cause
4. Retry migration after fixing

---

**Migration is ready to run. Follow Steps 1-9 above.**
