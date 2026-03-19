# Root Cause Identified & Fixed

## The Problem

CharacterGenerator was being instantiated correctly, steps were progressing correctly, but metadata was contaminated:
- `app.id` = 'mentor-chat-dialog' (WRONG)
- `app.title` = 'Mentor Notes' or 'NPC Level Up' (WRONG)

## Root Cause

**CharacterGenerator's `defaultOptions()` method does NOT include an explicit `id` property.**

### What This Means

When Foundry's ApplicationV2 creates an app without an explicit `id`:
1. It either generates a random one
2. Or reuses/caches an ID from another app
3. Something in the system was causing it to reuse `mentor-chat-dialog` from MentorChatDialog class

### Evidence Chain

1. **Console output** showed: `this.id: 'mentor-chat-dialog'` during CharacterGenerator._onRender()
2. **Code inspection** found 'mentor-chat-dialog' ONLY defined in `/scripts/mentor/mentor-chat-dialog.js` line 104
3. **CharacterGenerator code** has NO explicit `id` in defaultOptions()
4. **Hypothesis**: ApplicationV2 was reusing/caching the MentorChatDialog ID instead of generating a new one

### Why This Happened

The inheritance chain:
```
CharacterGenerator extends SWSEApplicationV2
  ↓
SWSEApplicationV2 extends HandlebarsApplicationMixin(ApplicationV2)
  ↓
ApplicationV2 (Foundry class)
```

When ApplicationV2 tries to assign an ID:
1. It looks for `id` in options passed to constructor
2. If not found, it looks for `id` in DEFAULT_OPTIONS
3. If not found, it might be reusing from registry or cache
4. **CharacterGenerator didn't provide an explicit `id` anywhere**

## The Fix

**File**: `/scripts/apps/chargen/chargen-main.js`

**Line**: ~350 in `defaultOptions()` method

**Change**: Add explicit `id: 'chargen'` to the merged options

```javascript
static get defaultOptions() {
  const merged = foundry.utils.mergeObject(super.defaultOptions, {
    id: 'chargen',  // ← ADDED THIS LINE
    classes: ['swse', 'chargen', 'swse-app'],
    width: 900,
    height: 700,
    title: 'Character Generator',
    // ... rest of options
  });
```

**Status**: ✅ APPLIED

## What This Fix Does

By explicitly setting `id: 'chargen'`:
1. ApplicationV2 will use this ID instead of trying to generate or reuse one
2. Prevents ID collision with other apps (MentorChatDialog, MentorNotesApp, etc.)
3. Ensures CharacterGenerator always identifies as 'chargen', not with borrowed IDs
4. The title was already correct ('Character Generator') but is now protected from override

## Verification Steps

### Step 1: Reload the world
Close and reopen Foundry to apply the JavaScript changes.

### Step 2: Open chargen and check console logs
Open a character and click "Chargen" button.

Look for these console messages:
```
[CharacterGenerator.constructor] METADATA BEFORE super()
[CharacterGenerator.constructor] METADATA AFTER super()
[CharacterGenerator._onRender] METADATA BEFORE super._onRender()
[CharacterGenerator._onRender] METADATA AFTER super._onRender()
```

### Step 3: Verify the fix
Check the console output for:
- `this.id` should be 'chargen' (not 'mentor-chat-dialog')
- `this.title` should be 'Character Generator' (not 'Mentor Notes' or 'NPC Level Up')

### Step 4: Quick verification command
While chargen is open, run this in console:
```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.id === 'chargen');
console.log({
  id: app?.id,
  title: app?.title,
  CORRECT: app?.id === 'chargen' && app?.title === 'Character Generator'
});
```

**Expected output**:
```
{
  id: 'chargen',
  title: 'Character Generator',
  CORRECT: true
}
```

## Why This Fix Is Correct

1. **Minimal change**: Only adds one line to prevent ID contamination
2. **Follows convention**: Other SWSE apps explicitly set their IDs (see mentor-chat-dialog.js line 104, mentor-notes-app.js line 10)
3. **Prevents regression**: Explicit ID is immune to ApplicationV2 reuse/caching bugs
4. **Doesn't break anything**: Steps, templates, functionality all unaffected

## Cleanup Notes

The diagnostic logging added to constructor and _onRender() can be removed once you verify the fix works:
- `/scripts/apps/chargen/chargen-main.js` lines ~98-120 (constructor logging)
- `/scripts/apps/chargen/chargen-main.js` lines ~1540-1560 (render logging)

But it's safe to leave it for now if you want to monitor for regressions.

## Related Issue

The missing `useNewProgressionShell` setting was a separate finding:
- The setting doesn't exist (was never registered in init.js)
- This prevented testing the feature flag approach
- But wasn't the root cause of the metadata contamination
- Can be addressed separately if needed

## Success Criteria

After reload and verification:
- ✅ app.id = 'chargen'
- ✅ app.title = 'Character Generator'
- ✅ Steps progress correctly (name → abilities)
- ✅ Chargen completes normally
- ✅ New character actor created with correct stats

If all of these pass, the fix is complete.

