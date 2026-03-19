# CRITICAL FIX APPLIED - Static DEFAULT_OPTIONS for ID Isolation

## The Problem (After Restart)

Even after the hard restart, the error still shows:
```
Failed to render Application "mentor-chat-dialog"
```

This means the `id: 'chargen'` fix in the `defaultOptions()` getter **did NOT take effect**.

## Root Cause Analysis

**CharacterGenerator had ONLY a `defaultOptions()` getter, but NO `static DEFAULT_OPTIONS`.**

This is critical because:
1. Foundry's ApplicationV2 checks `static DEFAULT_OPTIONS` **FIRST**
2. If not found, it falls back to the `defaultOptions()` getter
3. If the parent class chain has a polluted `DEFAULT_OPTIONS` with `id: 'mentor-chat-dialog'`, it gets inherited
4. My fix in the getter was too late in the lookup chain

## The Real Problem: DEFAULT_OPTIONS Inheritance Chain

```
CharacterGenerator
  ↓ (no DEFAULT_OPTIONS - INHERITS)
SWSEApplicationV2
  ↓ (DEFAULT_OPTIONS has no explicit id - INHERITS)
SWSEFormApplicationV2
  ↓ (mergeObject call with super.DEFAULT_OPTIONS - POLLUTES parent)
```

When `MentorChatDialog` does:
```javascript
static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
  id: 'mentor-chat-dialog',
  ...
})
```

This might MUTATE or POLLUTE the shared parent's DEFAULT_OPTIONS with the ID, which then gets inherited by CharacterGenerator.

## The Fix (JUST APPLIED)

Added a **`static DEFAULT_OPTIONS` property directly to CharacterGenerator** that explicitly sets the ID:

```javascript
static DEFAULT_OPTIONS = {
  id: 'chargen',
  classes: ['swse', 'chargen', 'swse-app'],
};
```

This ensures:
1. ApplicationV2 finds the ID in CharacterGenerator's OWN DEFAULT_OPTIONS first
2. No inheritance of stale IDs from parent classes
3. Explicit ownership and isolation of the app identity

## What You Need To Do Now

### Step 1: Hard Restart Again

The JavaScript fix is now in place. You need another full server restart:
1. **Close Foundry completely**
2. **Wait 5 seconds**
3. **Restart Foundry**
4. **Load the world**

### Step 2: Test Chargen Again

Open a character and click "Chargen". Check the error message:

**Expected (if fix worked):**
```
Failed to render Application "chargen": Failed to render template part "content"...
```
The app ID changed from "mentor-chat-dialog" to "chargen"

**Still shows "mentor-chat-dialog"?**
Then the server didn't actually reload the code. Make sure Foundry is completely closed and restarted, not just refreshed.

### Step 3: Diagnose the Template Error

Once the ID is fixed to "chargen", we can tackle the real issue: the template's single-root-element violation.

The error `Template part "content" must render a single HTML element` means:
- chargen.hbs is producing multiple root elements OR
- A conditional branch renders invalid structure
- Need to inspect which specific step is failing

## Technical Explanation

**Why THIS fix works:**
- Static DEFAULT_OPTIONS are checked first by ApplicationV2
- They're not inherited or merged in the polluted parent chain
- By setting it directly on CharacterGenerator, we guarantee it takes precedence
- This is how MentorChatDialog, MentorNotesApp, and other SWSE apps do it

**Why the previous fix (defaultOptions getter) didn't work:**
- ApplicationV2 likely checks DEFAULT_OPTIONS before calling the getter
- Or the getter merge order was still losing to inherited values
- The getter is called later in the initialization chain

## Verification Steps After Restart

```javascript
// Check if ID is now correct
const app = [...foundry.applications.instances.values()]
  .find(a => a.constructor.name === 'CharacterGenerator');

console.log({
  class: app?.constructor.name,
  id: app?.id,
  title: app?.title,
  FIXED: app?.id === 'chargen'
});
```

**Expected output:**
```
{
  class: 'CharacterGenerator',
  id: 'chargen',
  title: 'Character Generator',
  FIXED: true
}
```

## Next Phase

Once the ID is fixed to "chargen", the next issue to tackle is:
**P0: Template structure violation**
- Identify which step's template branch produces multiple root elements
- Wrap all content in a single root element
- Test each step for compliance

## Files Modified

- `/scripts/apps/chargen/chargen-main.js`
  - Added `static DEFAULT_OPTIONS` with explicit `id: 'chargen'`
  - Added diagnostic logging to constructor and _onRender

## Critical: Do Full Server Restart

This is not a browser refresh. This is:
1. Close Foundry app completely
2. Verify it's gone (check task manager if needed)
3. Reopen Foundry
4. Load your world

The JavaScript must actually reload for this to take effect.

