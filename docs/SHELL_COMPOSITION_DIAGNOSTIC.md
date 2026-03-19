# SWSE Shell Composition Diagnostic

## Critical Discovery: Two Distinct App Architectures

### OLD ARCHITECTURE (CharacterGenerator - DEFAULT)
**File**: `/scripts/apps/chargen/chargen-main.js`

```javascript
static PARTS = {
  content: {
    template: 'systems/foundryvtt-swse/templates/apps/chargen.hbs'
  }
};
```

- **Template**: Single monolithic template (chargen.hbs)
- **Parts Map**: Only `content` part (one big template)
- **Layout**: Single-column layout with all UI in one file
- **Shell regions**: NO mentor-rail, NO progress-rail, NO utility-bar
- **Entry method**: `new CharacterGenerator(actor).render(true)`
- **Feature flag dependency**: NONE - runs by default

### NEW ARCHITECTURE (ProgressionShell - OPTIONAL)
**File**: `/scripts/apps/progression-framework/shell/progression-shell.js`

```javascript
static PARTS = {
  shell: {
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/progression-shell.hbs',
  },
  mentorRail: {
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/mentor-rail.hbs',
  },
  progressRail: {
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/progress-rail.hbs',
  },
  utilityBar: {
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/utility-bar.hbs',
  },
};
```

- **Templates**: Multi-part modular templates (6 separate files)
- **Parts Map**: `shell`, `mentorRail`, `progressRail`, `utilityBar` (+ step work surface)
- **Layout**: 6 named regions (mentor-rail, progress-rail, utility-bar, work-surface, details-panel, action-footer)
- **Shell regions**: YES - full shell composition with rails and bars
- **Entry method**: Requires feature flag `useNewProgressionShell = true`
- **Feature flag dependency**: YES - only runs when setting is enabled

---

## User's Evidence vs. Architecture

**What the user observed**:
- Chargen steps ARE running correctly (name → abilities progression)
- But app shows wrong metadata (id='mentor-chat-dialog', title='NPC Level Up')
- DOM might not match expected new shell structure

**Analysis**:
1. ✅ Steps are running correctly = step logic is correct
2. ❌ Wrong metadata = app shell identity is wrong
3. ❓ Is the template the old chargen.hbs or the new progression-shell.hbs?

---

## Critical Template Audit Questions

### Question 1: What Template Is Actually Rendering?

**OLD** (`chargen.hbs`):
- Single root element: `<div class="swse-chargen-window flexcol">`
- Contains: name input, species selector, class selector, abilities, skills, etc. ALL IN ONE FILE
- CSS classes: `.swse-chargen-window`, `.chargen-content`, `.step-content`
- NO mentor-rail, NO progress-rail, NO utility-bar structure

**NEW** (`progression-shell.hbs`):
- Root element: `<div class="progression-shell">`
- Contains: Multiple part placeholders with `{{#block name "mentorRail"}}`, `{{#block name "progressRail"}}`, etc.
- CSS classes: `.progression-shell`, `.mentor-rail`, `.progress-rail`, `.utility-bar`
- YES mentor-rail, YES progress-rail, YES utility-bar regions

**To Determine Which**: Search the rendered DOM for these classes/structure

---

### Question 2: What PARTS Map Is Active?

Check in browser console:
```javascript
// If old CharacterGenerator is active:
window.ui.windows[appId].PARTS
// Should return: { content: { template: 'chargen.hbs' } }

// If new ProgressionShell is active:
window.ui.windows[appId].PARTS
// Should return: { shell, mentorRail, progressRail, utilityBar }
```

**Current Status**: UNKNOWN - need runtime check

---

### Question 3: Are Shell Regions Actually Mounted?

**Expected in NEW shell**:
- DOM element with class `.progression-shell`
- Sub-elements: `[data-part="mentorRail"]`, `[data-part="progressRail"]`, `[data-part="utilityBar"]`, `[data-part="workSurface"]`

**Expected in OLD shell**:
- DOM element with class `.swse-chargen-window`
- NO data-part attributes
- Single content div with all UI

**To Determine**: Inspect actual DOM in browser developer tools

---

### Question 4: Does CSS Match Rendered DOM?

**NEW shell CSS targets**:
```css
.progression-shell { /* outer container */ }
.progression-shell .mentor-rail { /* left column */ }
.progression-shell .progress-rail { /* middle column */ }
.progression-shell .work-surface { /* main content area */ }
.progression-shell .details-panel { /* right panel */ }
.progression-shell .action-footer { /* bottom buttons */ }
```

**OLD shell CSS targets**:
```css
.swse-chargen-window { /* outer container */ }
.chargen-content { /* content area */ }
.step-content { /* step-specific content */ }
.step-buttons { /* navigation buttons */ }
```

**To Determine**: Check if CSS selectors are matching actual DOM structure

---

### Question 5: What Template Path Is In This App's PARTS?

**Check in console**:
```javascript
app.constructor.PARTS
// OR
Object.getPrototypeOf(app).PARTS
```

**Expected OLD**:
```
{ content: { template: 'systems/foundryvtt-swse/templates/apps/chargen.hbs' } }
```

**Expected NEW**:
```
{ shell: { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/progression-shell.hbs' }, ... }
```

---

## Feature Flag Check

**Setting Name**: `useNewProgressionShell`
**Location**: `/scripts/core/init.js` (lines 26-34)
**Default Value**: `false`
**Current Value**: ?

**Command to Check**:
```javascript
game.settings.get('foundryvtt-swse', 'useNewProgressionShell')
// Returns: true or false
```

**If FALSE**: Old CharacterGenerator is used
**If TRUE**: New ProgressionShell is used via ChargenShell

---

## Three Distinct Failure Scenarios

### Scenario A: Wrong App Identity + Correct Old Shell
- **Symptoms**: Steps run correctly, metadata is wrong, DOM structure is old chargen.hbs
- **Root Cause**: CharacterGenerator is instantiated, but metadata is contaminated
- **Fix Location**: CharacterGenerator metadata assignment or ApplicationV2 ID generation
- **Impact**: App works but looks like mentor-chat-dialog

### Scenario B: Correct App + Correct New Shell + Wrong CSS
- **Symptoms**: Steps run correctly, metadata might be right, DOM structure is new shell, but styling is broken
- **Root Cause**: CSS selectors don't match DOM, or CSS is not loaded
- **Fix Location**: CSS file or selector mismatch
- **Impact**: App structure is correct but layout is broken

### Scenario C: Correct App + Wrong Shell Template
- **Symptoms**: Steps run correctly, app is correct, but wrong template is rendering
- **Root Cause**: PARTS map is pointing to wrong template, or feature flag should be enabled
- **Fix Location**: PARTS definition or feature flag
- **Impact**: Step logic runs but outside wrong container

---

## Diagnostic Checklist

- [ ] **Runtime Metadata Check**: Log `app.id`, `app.title`, `this.constructor.name` at render time
- [ ] **PARTS Map Check**: Confirm which PARTS structure is active (OLD vs NEW)
- [ ] **DOM Structure Check**: Inspect for `.swse-chargen-window` (old) vs `.progression-shell` (new)
- [ ] **Shell Region Check**: Look for `[data-part="mentorRail"]`, `[data-part="progressRail"]` (new only)
- [ ] **CSS Class Check**: Search DOM for new shell classes (`mentor-rail`, `progress-rail`, `utility-bar`)
- [ ] **Template File Check**: Search HTML source for template filename (`chargen.hbs` vs `progression-shell.hbs`)
- [ ] **Feature Flag Check**: Confirm `useNewProgressionShell` setting value
- [ ] **Entry Point Check**: Confirm CharacterGenerator or ChargenShell is being instantiated
- [ ] **Console Errors**: Check for template rendering errors or missing partials

---

## Investigation Hypothesis

**Most Likely Scenario**: **Scenario A** - Wrong App Identity + Correct Old Shell
- App is CharacterGenerator (correct)
- Template is chargen.hbs (correct for old shell)
- Steps are running correctly (correct logic)
- BUT: app.id and app.title are contaminated with mentor/NPC values (WRONG)

This would explain:
- ✅ Steps progressing normally
- ✅ Single-column layout (old chargen.hbs)
- ❌ Wrong window title and ID

---

## Alternative Hypothesis

**Less Likely**: **Scenario C** - Correct App + Wrong Template
- If the new ProgressionShell was instantiated but with old template somehow
- Would show new shell structure but with chargen steps
- Requires feature flag override or code path confusion

---

## Next Steps for Resolution

1. **Add Runtime Diagnostics** (Already Done):
   - Log `defaultOptions` at call time
   - Log `app.id`, `app.title` at render time
   - Log PARTS structure at instantiation time

2. **Inspect Actual DOM**:
   - Take screenshot of rendered app
   - Search DOM for `.swse-chargen-window` vs `.progression-shell`
   - Check for mentor-rail, progress-rail regions

3. **Test Feature Flag**:
   - Check current value: `game.settings.get('foundryvtt-swse', 'useNewProgressionShell')`
   - Determine if it should be enabled for this use case

4. **Trace Template Path**:
   - Check console for template loading messages
   - Verify which PARTS templates are actually rendered
   - Look for Handlebars compilation errors

5. **Fix Based on Scenario**:
   - **If A**: Fix metadata assignment in CharacterGenerator or ApplicationV2
   - **If B**: Fix CSS selectors or ensure CSS is loaded
   - **If C**: Enable feature flag or fix template path

---

## Files to Review

- `/scripts/apps/chargen/chargen-main.js` (line 347-350) - OLD PARTS definition
- `/scripts/apps/progression-framework/shell/progression-shell.js` (line 87-100) - NEW PARTS definition
- `/templates/apps/chargen.hbs` - OLD single-column template
- `/templates/apps/progression-framework/progression-shell.hbs` - NEW multi-part shell template
- `/scripts/infrastructure/hooks/chargen-sheet-hooks.js` - Entry point
- `/scripts/infrastructure/hooks/levelup-sheet-hooks.js` - Alternative entry point

---

## Key Difference Summary

| Aspect | OLD (CharacterGenerator) | NEW (ProgressionShell) |
|--------|--------------------------|------------------------|
| PARTS count | 1 | 4+ |
| Template count | 1 | 6+ |
| Root CSS class | `.swse-chargen-window` | `.progression-shell` |
| Has mentor-rail | NO | YES |
| Has progress-rail | NO | YES |
| Has utility-bar | NO | YES |
| Feature flag required | NO | YES |
| Entry point | `new CharacterGenerator()` | `ChargenShell.open()` |
| Metadata concern | Contaminated | Not yet confirmed |

