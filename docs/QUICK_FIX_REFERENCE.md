# Quick Fix Reference - Shell Metadata & Template Issues

## The Problem in 30 Seconds

Chargen steps ARE working, but:
1. ❌ App shows wrong title: "NPC Level Up" (should be "Character Generator")
2. ❌ App shows wrong ID: "mentor-chat-dialog" (should be "chargen")
3. ❌ Template looks old/legacy (single-column) instead of new shell (multi-region)

## One-Command Diagnosis

```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));

if (app) {
  const parts = Object.keys(app.constructor.PARTS);
  console.log({
    app_id: app.id,
    app_title: app.title,
    parts_type: parts.length === 1 && parts[0] === 'content' ? 'OLD chargen.hbs' : parts.includes('shell') ? 'NEW progression-shell.hbs' : 'UNKNOWN'
  });
}
```

## Three Quick Fixes

### Fix #1: Metadata Wrong (Fast)
**File**: `/scripts/apps/chargen/chargen-main.js` (line 322-334)

**Before**:
```javascript
static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ['swse', 'chargen', 'swse-app'],
    title: 'Character Generator',
```

**After**:
```javascript
static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    id: 'chargen',  // ← ADD THIS LINE
    classes: ['swse', 'chargen', 'swse-app'],
    title: 'Character Generator',
```

### Fix #2: Switch to New Shell (Recommended)
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` (line 67-68)

**Before**:
```javascript
const { default: CharacterGenerator } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
new CharacterGenerator(actor).render(true);
```

**After**:
```javascript
const { ChargenShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js');
ChargenShell.open(actor);
```

And also in `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` (line 25)

### Fix #3: Enable Feature Flag
**Easiest** (if new shell is ready):
```javascript
game.settings.set('foundryvtt-swse', 'useNewProgressionShell', true);
```

Then entry points will automatically route to new shell.

## Decision: Which Fix?

**If new shell is fully tested**: Use Fix #2 or #3
**If old shell needs to stay**: Use Fix #1
**Temporary fix**: Use Fix #3 (feature flag)

## Expected Results After Fix

- ✅ app.id = 'chargen'
- ✅ app.title = 'Character Generator'
- ✅ Window title shows correct name
- ✅ Steps still progress correctly
- ✅ (If using new shell) New multi-region layout appears

## Verification Command

```javascript
const app = [...foundry.applications.instances.values()][0];
console.log('FIXED?', {
  correctId: app.id === 'chargen' || app.id.includes('chargen'),
  correctTitle: app.title === 'Character Generator',
  newShellActive: Object.keys(app.constructor.PARTS).includes('shell')
});
```

## Related Audit Documents

- `INVESTIGATION_SUMMARY_AND_NEXT_STEPS.md` - Full analysis
- `SHELL_COMPOSITION_DIAGNOSTIC.md` - Architecture details
- `SHELL_TEMPLATE_BYPASS_INVESTIGATION.md` - Targeted diagnosis
- `RUNTIME_DIAGNOSTICS.md` - Console commands

