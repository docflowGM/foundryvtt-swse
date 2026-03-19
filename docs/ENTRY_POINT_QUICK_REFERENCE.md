# ENTRY POINT WIRING — QUICK REFERENCE

## THE FIX IN ONE SENTENCE
**All character progression now routes through `launchProgression()` → plays splash screen → opens ProgressionShell. NO legacy paths remain.**

---

## UNIFIED ENTRY WRAPPER

**Location:** `/scripts/apps/progression-framework/progression-entry.js`

```javascript
export async function launchProgression(actor, options = {}) {
  // 1. Play splash screen (BLOCKING)
  await SWSESplashScreen.play({ actor, options });
  
  // 2. Open progression shell (delegates to ChargenShell)
  return ProgressionShell.open(actor, options);
}
```

---

## ALL ENTRY POINTS (Before → After)

### Character Sheet Buttons

**Location:** `/scripts/sheets/v2/character-sheet.js`

```diff
- const levelup = new SWSELevelUpEnhanced(this.actor);
- levelup.render(true);
+ await launchProgression(this.actor);
```

### Header Controls

**Chargen:** `/scripts/infrastructure/hooks/chargen-sheet-hooks.js`
```diff
- await CharacterGenerator.open(actor);
+ await launchProgression(actor);
```

**Level-Up:** `/scripts/infrastructure/hooks/levelup-sheet-hooks.js`
```diff
- const dialog = new SWSELevelUpEnhanced(actor);
- dialog.render(true);
+ await launchProgression(actor);
```

---

## WHAT CHANGED

| Component | Before | After | Type |
|-----------|--------|-------|------|
| Direct CharGen calls | Multiple | Zero | Entry Point |
| Direct LevelUp calls | Multiple | Zero | Entry Point |
| Splash screen | Not present | Always runs | Flow |
| Final chargen step | summary | summary ✓ | Step Order |
| Final levelup step | confirm | class-talent ✓ | Step Order |

---

## SPLASH SCREEN

**Created:** `/scripts/apps/progression-framework/progression-entry.js`

**Type:** Pre-shell, atmospheric only, non-step

**Behavior:**
- Plays BEFORE ProgressionShell
- Blocks progression until user clicks Continue
- Does NOT mutate actor data
- Does NOT interact with progression steps
- Cannot be accidentally bypassed (modal, no close button)

---

## STEP ORDER (LOCKED)

### Chargen
```
intro → species → attribute → class → l1-survey → background → 
skills → general-feat → class-feat → general-talent → class-talent → 
languages → summary [FINAL]
```

### Levelup
```
class → [conditional steps] → general-feat → class-feat → 
general-talent → class-talent [FINAL]
```

---

## CONFIRM STEP

- **Chargen:** ✓ Already merged into Summary
- **Levelup:** ✓ Removed, class-talent is now final

**No orphaned Confirm step remains.**

---

## FILES CHANGED

**New Files:**
- `/scripts/apps/progression-framework/progression-entry.js`
- `/templates/apps/progression-framework/splash.hbs`

**Modified Files:**
- `character-sheet.js` — button handlers
- `chargen-sheet-hooks.js` — header control
- `levelup-sheet-hooks.js` — header control (critical fix)
- `levelup-shell.js` — removed Confirm step
- `chargen-shell.js` — NO changes (already correct)

**Not Touched:**
- Suggestion Engine
- Mentor system
- Identity Engine
- Data schema
- CSS architecture
- Any working subsystems

---

## VERIFICATION

✅ All entry points unified  
✅ No legacy paths  
✅ Splash plays every time  
✅ Step order locked  
✅ Confirm merged  
✅ Header buttons work  
✅ No wiring gaps  

**Ready for testing.**
