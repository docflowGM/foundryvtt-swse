# SWSE Progression Shell Metadata Contamination Audit

## Executive Summary

**Issue**: CHARACTER actor chargen is rendering correct progression steps (name → abilities) but app.id and app.title show NPC/mentor values:
- app.id = 'mentor-chat-dialog' (should be CharacterGenerator derived)
- app.title = 'NPC Level Up' (should be 'Character Generator')

**Investigation Status**: Tracing exact origin of metadata override

---

## Metadata Value Sources (Ground Truth)

### Where 'mentor-chat-dialog' ID comes from:
**File**: `/scripts/mentor/mentor-chat-dialog.js` (Line 104)
```javascript
id: 'mentor-chat-dialog',
```
- ONLY location in codebase where this ID is set
- MentorChatDialog class: Used for mentor conversation UI
- NOT instantiated in the chargen/levelup code paths

### Where 'NPC Level Up' title comes from:
**File**: `/scripts/apps/levelup/npc-levelup-entry.js` (Line 18)
```javascript
window: {
  title: 'NPC Level Up',
  ...
}
```
- ONLY location in codebase where this exact title is set
- SWSENpcLevelUpEntry class: Dead code (never instantiated)
- Search result: Zero instantiations of `new SWSENpcLevelUpEntry`

### Where correct 'Character Generator' title SHOULD come from:
**File**: `/scripts/apps/chargen/chargen-main.js` (Line 327)
```javascript
static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ['swse', 'chargen', 'swse-app'],
    width: 900,
    height: 700,
    title: 'Character Generator',  ← CORRECT VALUE
    resizable: true,
    draggable: true,
    ...
  });
}
```

---

## Code Path Verification (Entry Points to Chargen)

### Path 1: Sheet Button Handler
**File**: `/scripts/sheets/v2/character-sheet.js`
```javascript
html.querySelectorAll('[data-action="cmd-chargen"]').forEach(button => {
  button.addEventListener("click", async ev => {
    ev.preventDefault();
    const chargen = new CharacterGenerator(this.actor);  // ← DIRECT INSTANTIATION
    chargen.render(true);
  }, { signal });
});
```
- Direct instantiation: `new CharacterGenerator(actor)`
- No options passed → uses CharacterGenerator.defaultOptions
- Expected title: 'Character Generator'

### Path 2: Header Control Hook
**File**: `/scripts/infrastructure/hooks/chargen-sheet-hooks.js`
```javascript
async function onClickChargen(app) {
  const actor = app?.actor ?? app?.document;
  if (actor.type !== 'character') return;

  SWSELogger.log(`[Chargen Header] Opening Chargen for: ${actor.name}`);
  const chargen = new CharacterGenerator(actor);  // ← DIRECT INSTANTIATION
  chargen.render(true);
}
```
- Direct instantiation: `new CharacterGenerator(actor)`
- No options passed → uses CharacterGenerator.defaultOptions
- Expected title: 'Character Generator'

### Path 3: Level-Up Entry Point (Incomplete Character Route)
**File**: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` (Lines 67-68)
```javascript
if (incompleteReason) {
  const { default: CharacterGenerator } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
  new CharacterGenerator(actor).render(true);  // ← DIRECT INSTANTIATION
}
```
- Dynamic import of chargen-main.js
- Direct instantiation: `new CharacterGenerator(actor)`
- No options passed → uses CharacterGenerator.defaultOptions
- Expected title: 'Character Generator'

**All three code paths instantiate CharacterGenerator directly with no options.** Expected behavior: All should produce title='Character Generator'.

---

## Base Class Hierarchy

### CharacterGenerator Constructor
**File**: `/scripts/apps/chargen/chargen-main.js` (Lines 94-97)
```javascript
constructor(actor = null, options = {}) {
  super(options);  // ← Passes options to parent (SWSEApplicationV2)
  this.actor = actor;
  this.actorType = options.actorType || 'character';
  // ... rest of init
}
```
- Calls `super(options)` which is SWSEApplicationV2 constructor
- No ID property set → AppV2 must generate default

### SWSEApplicationV2 Base Class
**File**: `/scripts/apps/base/swse-application-v2.js`

**Static DEFAULT_OPTIONS** (Lines 8-20):
```javascript
static DEFAULT_OPTIONS = {
  classes: ['swse', 'swse-window'],
  position: {
    width: 600,
    height: 'auto'
  },
  window: {
    resizable: true,
    draggable: true,
    frame: true
  },
  actions: {}
  // NO id or title defined
};
```

**Merged defaultOptions** (Lines 22-34):
```javascript
static get defaultOptions() {
  const base = super.defaultOptions ?? {};
  const o = foundry.utils.mergeObject({}, this.DEFAULT_OPTIONS);

  // Legacy v1-style aliases
  if (o.position?.width !== undefined) {o.width = o.position.width;}
  if (o.position?.height !== undefined) {o.height = o.position.height;}
  if (o.window?.resizable !== undefined) {o.resizable = o.window.resizable;}
  if (o.window?.draggable !== undefined) {o.draggable = o.window.draggable;}
  if (o.window?.frame !== undefined) {o.popOut = o.window.frame;}

  return foundry.utils.mergeObject(base, o);
  // Merges parent options with SWSEApplicationV2.DEFAULT_OPTIONS
  // NO id or title override here
}
```

**Inheritance Chain**:
1. CharacterGenerator extends SWSEApplicationV2
2. SWSEApplicationV2 extends HandlebarsApplicationMixin(ApplicationV2)
3. ApplicationV2 is Foundry's base class

---

## Possible Sources of Metadata Contamination

### Theory 1: ApplicationV2 Default ID Generation
When no `id` is provided, Foundry's ApplicationV2 might:
- Generate ID from class name: "character-generator" (lowercase)
- Or use some other heuristic

**Evidence Against**: SWSEApplicationV2 doesn't override ApplicationV2's ID generation, but CharacterGenerator gets 'mentor-chat-dialog' instead of a CharacterGenerator-derived ID.

### Theory 2: Legacy V1 defaultOptions Still Active
CharacterGenerator uses V1-style `defaultOptions()` (lines 322-334) instead of V2-style `DEFAULT_OPTIONS`.

**Check Required**: Does this cause AppV2 to use V1 metadata from somewhere?

### Theory 3: App Registry Collision
ApplicationV2 or Foundry might have an app registry that maintains singleton instances.

**Check Required**: Is there a stale MentorChatDialog instance being reused?

### Theory 4: Wrapper/Shell Inheritance
A parent app or wrapper might be setting child app metadata.

**Evidence Against**: No code paths show a wrapper layer before CharacterGenerator is instantiated.

### Theory 5: Render-Time Metadata Override
Some hook in _onRender or _prepareContext might override id/title.

**Check Required**: SWSEApplicationV2._onRender() (lines 44-54) only calls guardOnRender and validateTemplate. No metadata override visible.

### Theory 6: Mentor-Related Integration Interference
MentorInteractionIntegration imported in chargen-main.js might somehow interfere.

**Check Required**: Module is imported but only used for suggestion enrichment, not app metadata.

---

## Facts Established

✅ CharacterGenerator SHOULD have title='Character Generator'
✅ CharacterGenerator has NO explicit id property (AppV2 generates)
✅ All three entry points directly instantiate `new CharacterGenerator(actor)` with no overriding options
✅ No code path shows instantiation of MentorChatDialog or SWSENpcLevelUpEntry for CHARACTER actors
✅ 'mentor-chat-dialog' id ONLY exists in mentor-chat-dialog.js
✅ 'NPC Level Up' title ONLY exists in npc-levelup-entry.js
✅ Chargen steps ARE running correctly (name → abilities progression confirmed by user)
✅ Metadata conflict is ONLY at app shell level, not in step execution logic

---

## Hypothesis

**Most Likely**: There is a **render-time metadata assignment or ApplicationV2 ID inheritance issue** that causes:
1. CharacterGenerator.render() is called correctly
2. AppV2 begins rendering
3. At some point before or during _onRender(), ApplicationV2 assigns an ID
4. Either:
   - The ID assignment pulls from wrong class (inheritance confusion)
   - Or a global app reference is using a cached/stale app ID
   - Or there's a V1/V2 API compatibility issue with merged options

---

## Critical Questions

1. **What ID does ApplicationV2 auto-generate for a class with no explicit id?**
   - Should be: "character-generator" or similar
   - Actually gets: 'mentor-chat-dialog'
   - This is the smoking gun

2. **Where is the 'NPC Level Up' title coming from?**
   - Code shows CharacterGenerator.defaultOptions.title = 'Character Generator'
   - But runtime shows 'NPC Level Up'
   - Is defaultOptions being overridden after merge?

3. **Is there an ApplicationV2 app registry that's caching stale metadata?**
   - Check foundry.applications registry for "mentor-chat-dialog" entries
   - Check if render() is reusing instead of creating

4. **Is there a Foundry bug or behavior where V1-style defaultOptions() causes metadata bleeding?**
   - CharacterGenerator uses `static get defaultOptions()` (V1 style)
   - ApplicationV2 uses `static DEFAULT_OPTIONS` (V2 style)
   - Mismatch might cause weird merge behavior

---

## Next Steps for Resolution

1. **Add Runtime Logging**
   - Log CharacterGenerator.defaultOptions before render()
   - Log app.id and app.title in _onRender()
   - Determine WHEN metadata changes

2. **Check ApplicationV2 Behavior**
   - Review Foundry's ApplicationV2 ID generation logic
   - Check for singleton instance reuse
   - Verify DEFAULT_OPTIONS/defaultOptions merge behavior

3. **Audit Inheritance Chain**
   - Trace exactly what happens in SWSEApplicationV2.defaultOptions()
   - Verify mergeObject order (which options win?)
   - Check if parent class's id is bleeding through

4. **Search for Dynamic ID Assignment**
   - Look for `this.id =` or `app.id =` assignments
   - Check _onRender() lifecycle hooks
   - Review all mixins (HandlebarsApplicationMixin)

5. **Test Isolation**
   - Create minimal CharacterGenerator test with console logs
   - Verify id and title at each lifecycle stage
   - Confirm metadata is actually from mentor-chat-dialog source

---

## Recommended Fix

Once root cause is identified:
1. If V1/V2 compatibility issue: Convert CharacterGenerator to pure V2-style DEFAULT_OPTIONS
2. If id inheritance issue: Explicitly set `id: 'chargen'` in CharacterGenerator.defaultOptions
3. If ApplicationV2 behavior: File Foundry issue or apply workaround in _onRender()
4. If render override: Find and remove the override, or use correct value

---

## Related Files & References

- Entry Point Hooks: `/scripts/infrastructure/hooks/chargen-sheet-hooks.js`
- Sheet Button: `/scripts/sheets/v2/character-sheet.js`
- Level-Up Router: `/scripts/infrastructure/hooks/levelup-sheet-hooks.js`
- CharacterGenerator: `/scripts/apps/chargen/chargen-main.js`
- Base Class: `/scripts/apps/base/swse-application-v2.js`
- Conflicting IDs Source: `/scripts/mentor/mentor-chat-dialog.js` (line 104)
- Conflicting Title Source: `/scripts/apps/levelup/npc-levelup-entry.js` (line 18)

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| CharacterGenerator is being instantiated (not MentorChatDialog) | 95% | Code path review, user reports chargen steps running |
| Title should be 'Character Generator' but shows 'NPC Level Up' | 100% | Code inspection + user runtime evidence |
| Metadata conflict is real, not user misinterpretation | 100% | User provided console evidence of app.id and app.title |
| Root cause is V1/V2 API or AppV2 ID generation issue | 85% | Process of elimination; only 4 possible sources found |
| Fix requires deep ApplicationV2 investigation | 80% | Evidence points to behavior outside our codebase |

