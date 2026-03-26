# Mentor Portrait Issue: salty.webp vs salty.png

## Problem Identified

The system is configured to load mentor portraits from:
- `systems/foundryvtt-swse/assets/mentors/salty.webp`

But upon inspection, there is a critical file mismatch:

### File Analysis

**salty.png:**
- Size: 788 KB
- Dimensions: 873 x 873 pixels
- Format: Actual PNG image data
- Purpose: Full-resolution mentor portrait

**salty.webp:**
- Size: 128 KB
- Dimensions: 256 x 256 pixels
- Format: Actually PNG image data (mislabeled - should be .png, not .webp)
- Purpose: Thumbnail or lower-resolution version

### Why This Is a Problem

1. **File Extension Mismatch**: The `salty.webp` file is actually PNG data with the wrong file extension
2. **Resolution Mismatch**: The system is loading the 256x256 thumbnail instead of the 873x873 full-resolution image
3. **Quality Issue**: The mentor portrait in the UI will be small and blurry
4. **Compatibility**: Not all browsers handle mis-labeled files gracefully

## Locations Needing Updates

### 1. Mentor Data Definition Files
**Files that need updating:**
- `/scripts/apps/mentor/mentor-dialogues.data.js`
- `/scripts/engine/mentor/mentor-dialogues.data.js`

**Current line:**
```javascript
'portrait': 'systems/foundryvtt-swse/assets/mentors/salty.webp',
```

**Should be changed to:**
```javascript
'portrait': 'systems/foundryvtt-swse/assets/mentors/salty.png',
```

### 2. Progression Shell Fallback
**File:** `/scripts/apps/progression-framework/shell/progression-shell.js`
**Current line (around 260):**
```javascript
portrait: olSalty?.portrait ?? 'systems/foundryvtt-swse/assets/mentors/salty.webp',
```

**Should be changed to:**
```javascript
portrait: olSalty?.portrait ?? 'systems/foundryvtt-swse/assets/mentors/salty.png',
```

### 3. Dialogue Files
**File:** `/data/dialogue/mentors/ol_salty/ol_salty_dialogues.json`
**Current line:**
```json
"avatar": "systems/foundryvtt-swse/assets/mentors/salty.webp",
```

**Should be changed to:**
```json
"avatar": "systems/foundryvtt-swse/assets/mentors/salty.png",
```

## Solution Options

### Option A: Use Correct PNG File (Recommended)
Update all references from `salty.webp` to `salty.png`

**Advantages:**
- Uses the full-resolution portrait
- Fixes the file extension mismatch
- Single change location (all references updated together)
- PNG format is well-supported

**Steps:**
1. Update mentor-dialogues.data.js (both files)
2. Update progression-shell.js fallback path
3. Update ol_salty_dialogues.json
4. Test that mentor portrait displays correctly

### Option B: Create Proper WebP File
Convert salty.png to proper WebP format

**Advantages:**
- Maintains WebP format (better compression)
- Improves performance (smaller file size)
- Consistent with WebP naming

**Disadvantages:**
- More work
- Requires image conversion tool
- Must ensure proper WebP conversion quality

### Option C: Delete Mislabeled File
Remove the mis-labeled salty.webp file and ensure all paths use salty.png

**Advantages:**
- Eliminates confusion
- Prevents accidental loading of thumbnail

**Steps:**
1. Delete `assets/mentors/salty.webp`
2. Update all paths to use `salty.png` (Option A steps)
3. Test thoroughly

## Recommended Fix

**Use Option A** (update paths to salty.png):

This is the quickest, most reliable fix because:
1. The salty.png file is already the correct full-resolution image
2. PNG format is universally supported
3. Changes are minimal and localized
4. No loss of quality

### Steps to Implement

1. **Update mentor-dialogues.data.js (apps version):**
   - Find: `'portrait': 'systems/foundryvtt-swse/assets/mentors/salty.webp',`
   - Replace with: `'portrait': 'systems/foundryvtt-swse/assets/mentors/salty.png',`

2. **Update mentor-dialogues.data.js (engine version):**
   - Same change as above

3. **Update progression-shell.js:**
   - Find: `portrait: olSalty?.portrait ?? 'systems/foundryvtt-swse/assets/mentors/salty.webp',`
   - Replace with: `portrait: olSalty?.portrait ?? 'systems/foundryvtt-swse/assets/mentors/salty.png',`

4. **Update ol_salty_dialogues.json:**
   - Find: `"avatar": "systems/foundryvtt-swse/assets/mentors/salty.webp",`
   - Replace with: `"avatar": "systems/foundryvtt-swse/assets/mentors/salty.webp",`

5. **Test:**
   - Open chargen
   - Navigate to species step
   - Verify Ol' Salty portrait displays (not blank or tiny)
   - Verify portrait is crisp and clear (full resolution)

## Testing Checklist

After implementing the fix:

- [ ] Mentor portrait appears in species step
- [ ] Portrait is 256x256+ pixels (not tiny)
- [ ] Portrait is clear and crisp (not blurry)
- [ ] Portrait loads without errors in console
- [ ] Mentor name "Ol' Salty" displays correctly
- [ ] Mentor dialogue appears and updates
- [ ] Other mentor functionality works (Ask Mentor button, etc.)

## File Status Summary

| File | Current | Should Be | Issue |
|------|---------|-----------|-------|
| `assets/mentors/salty.png` | 873x873 PNG | Keep as-is | Full resolution, correct format |
| `assets/mentors/salty.webp` | 256x256 (PNG data) | Delete or fix | Mislabeled, thumbnail size |
| `mentor-dialogues.data.js` (2 files) | salty.webp | salty.png | Wrong file referenced |
| `progression-shell.js` | salty.webp | salty.png | Fallback uses wrong file |
| `ol_salty_dialogues.json` | salty.webp | salty.png | JSON config wrong |

## Additional Recommendations

1. **Audit other mentor images**: Check if other mentor portrait files have similar issues
   ```bash
   file /assets/mentors/*.webp
   ```

2. **Standardize format**: Decide on PNG vs WebP and be consistent
   - Option A: Use PNG for all (simpler, universal)
   - Option B: Convert all to WebP (better compression)

3. **Verify dimensions**: Ensure all mentor portraits are appropriate resolution
   - Current usage: 58x58 pixels in template (width="58" height="58")
   - Full resolution: 256x256 or larger recommended for quality display

## Mentor Portrait Template Details

**Template file:** `templates/apps/progression-framework/mentor-rail.hbs`
**Template code:**
```hbs
{{#if mentor.portrait}}
  <img src="{{mentor.portrait}}" alt="{{mentor.name}}" width="58" height="58">
{{else}}
  <i class="fas fa-user-astronaut"></i>
{{/if}}
```

The template displays the portrait at 58x58 CSS pixels but loads the full-resolution image, which is appropriate for:
- Quality on high-DPI screens (retina displays)
- Consistent quality across zoom levels
- Future use at larger sizes

Using a 256x256 source (salty.webp) for 58x58 display would cause blurriness and quality loss.
Using 873x873 (salty.png) is the correct approach.
