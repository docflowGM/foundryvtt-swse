# Shell Template Bypass Investigation

## Critical Evidence from Live Run

### Console Finding: "No matching progression app found"
```javascript
const apps = [...foundry.applications.instances.values()];
const app = apps.find(a => a.actor?.name === "ceci" &&
                           (a.currentStep === "name" || a.currentStep === "abilities"));
// Result: 'No matching progression app found'
```

**What this means**:
- The app does NOT have property `currentStep` with values "name" or "abilities"
- OR the property name is different
- OR the actor search is wrong
- **Most likely**: CharacterGenerator IS running, but property name is different

---

### Screenshot Finding: Legacy Single-Column Template

User observed:
- **Window chrome**: Generic Foundry default (not custom shell)
- **Content layout**: Single vertical stack (long column)
- **NO visible**: Header, footer, utility bar, multi-region composition
- **No obvious**: Rail separation, section boundaries, new shell styling
- **Conclusion**: This looks like OLD chargen.hbs template, NOT new progression-shell.hbs

---

## Two-Layer Problem Identified

### Layer 1: Wrong Outer Shell Template
- **Old Shell** (`chargen.hbs`): Single monolithic template, long vertical column
- **New Shell** (`progression-shell.hbs`): Multi-region composition (mentor-rail, progress-rail, utility-bar, work-surface)
- **Screenshot shows**: Old shell structure
- **Diagnosis**: PARTS map is pointing to wrong template

### Layer 2: Wrong App Identity Metadata
- **Metadata shows**: id='mentor-chat-dialog', title='NPC Level Up'
- **Should show**: id='chargen' or 'character-generator', title='Character Generator'
- **Diagnosis**: ApplicationV2 ID generation or render-time override

### Layer 3: CSS Not Matching
- **Expected CSS classes**: `.progression-shell`, `.mentor-rail`, `.progress-rail`, etc.
- **Screenshot shows**: Generic Foundry window with no visible new shell classes
- **Diagnosis**: Either CSS not loaded, or selectors don't match DOM

---

## Revised Diagnostic Commands

### Command 1: Find The Actual App (Revised)
```javascript
// Find the progression app by visual inspection instead of property name
const allApps = [...foundry.applications.instances.values()];
const candidates = allApps.filter(app =>
  (app.title && app.title.includes('Generator')) ||
  (app.title && app.title.includes('NPC')) ||
  (app.id && app.id.includes('chargen')) ||
  (app.id && app.id.includes('mentor')) ||
  (app.constructor.name.includes('Character'))
);

console.log('CANDIDATE APPS:', candidates.map(app => ({
  id: app.id,
  title: app.title,
  className: app.constructor.name,
  // Check actual property names, not assumed ones
  properties: Object.getOwnPropertyNames(app).slice(0, 20),
  stepPropertyOptions: [
    app.currentStep,
    app.current_step,
    app.activeStep,
    app.step,
    app.stepId,
    app.currentStepId
  ].filter(v => v !== undefined)
})));
```

### Command 2: Check PARTS Map (Old vs New)
```javascript
const app = [...foundry.applications.instances.values()][0];

if (app && app.constructor.PARTS) {
  const parts = app.constructor.PARTS;
  const partsKeys = Object.keys(parts);

  const isOldShell = partsKeys.includes('content') && partsKeys.length === 1;
  const isNewShell = partsKeys.includes('shell') || partsKeys.includes('mentorRail');

  console.log('PARTS ANALYSIS:', {
    partsKeys: partsKeys,
    isOldShell: isOldShell,
    isNewShell: isNewShell,
    templates: Object.entries(parts).map(([key, val]) => ({
      part: key,
      template: val.template
    })),
    diagnosis: isOldShell ? 'OLD SHELL (chargen.hbs)' : isNewShell ? 'NEW SHELL (progression-shell.hbs)' : 'UNKNOWN'
  });
}
```

### Command 3: Analyze DOM Structure
```javascript
// Get the progression app
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));

if (app && app.element) {
  const html = app.element.outerHTML;

  // Check for old shell indicators
  const hasOldShellClasses =
    html.includes('swse-chargen-window') ||
    html.includes('chargen-content') ||
    html.includes('step-content');

  // Check for new shell indicators
  const hasNewShellClasses =
    html.includes('progression-shell') ||
    html.includes('mentor-rail') ||
    html.includes('progress-rail') ||
    html.includes('utility-bar') ||
    html.includes('work-surface');

  // Check for new shell data attributes
  const hasDataParts =
    html.includes('data-part="mentorRail"') ||
    html.includes('data-part="progressRail"') ||
    html.includes('data-part="utilityBar"');

  console.log('DOM STRUCTURE ANALYSIS:', {
    hasOldShellClasses: hasOldShellClasses,
    hasNewShellClasses: hasNewShellClasses,
    hasDataParts: hasDataParts,
    firstThousandChars: html.substring(0, 1000),
    diagnosis: hasOldShellClasses && !hasNewShellClasses ?
      'OLD TEMPLATE (chargen.hbs)' :
      hasNewShellClasses && !hasOldShellClasses ?
      'NEW TEMPLATE (progression-shell.hbs)' :
      'MIXED OR UNKNOWN'
  });
}
```

### Command 4: Check Rendered Template Structure
```javascript
const app = [...foundry.applications.instances.values()]
  .find(a => a.element);

if (app && app.element) {
  // Check for key structural elements
  const checks = {
    'Content div': app.element.querySelector('.chargen-content'),
    'Step content': app.element.querySelector('.step-content'),
    'Mentor rail': app.element.querySelector('[data-part="mentorRail"]'),
    'Progress rail': app.element.querySelector('[data-part="progressRail"]'),
    'Utility bar': app.element.querySelector('[data-part="utilityBar"]'),
    'Work surface': app.element.querySelector('[data-part="workSurface"]'),
    'Step buttons': app.element.querySelector('.step-buttons'),
    'Next button': app.element.querySelector('[data-action="next-step"]'),
    'Shell wrapper': app.element.querySelector('.progression-shell'),
    'Old window wrapper': app.element.querySelector('.swse-chargen-window')
  };

  const structureAnalysis = {};
  for (const [name, element] of Object.entries(checks)) {
    structureAnalysis[name] = {
      found: !!element,
      className: element?.className
    };
  }

  console.log('DOM STRUCTURE ELEMENTS:', structureAnalysis);
  console.log('TEMPLATE DIAGNOSIS:',
    structureAnalysis['Content div'].found && !structureAnalysis['Mentor rail'].found
      ? 'OLD TEMPLATE (chargen.hbs)'
      : structureAnalysis['Mentor rail'].found
      ? 'NEW TEMPLATE (progression-shell.hbs)'
      : 'MIXED OR UNKNOWN'
  );
}
```

### Command 5: Root Cause Determination
```javascript
// Comprehensive diagnostic
const apps = [...foundry.applications.instances.values()];
const progressApp = apps.find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));

if (progressApp) {
  const PARTS = progressApp.constructor.PARTS;
  const partsKeys = Object.keys(PARTS);
  const element = progressApp.element;

  const isOldTemplate =
    (partsKeys.length === 1 && partsKeys[0] === 'content') ||
    element.outerHTML.includes('chargen-content');

  const isNewTemplate =
    partsKeys.includes('shell') ||
    partsKeys.includes('mentorRail') ||
    element.outerHTML.includes('progression-shell');

  console.log('=== ROOT CAUSE ANALYSIS ===');
  console.log({
    feature_flag_useNewProgressionShell: game.settings.get('foundryvtt-swse', 'useNewProgressionShell'),
    app_class: progressApp.constructor.name,
    app_id: progressApp.id,
    app_title: progressApp.title,
    parts_map_type: isOldTemplate ? 'OLD (content only)' : isNewTemplate ? 'NEW (shell + rails)' : 'UNKNOWN',
    template_being_rendered: isOldTemplate ? 'chargen.hbs' : isNewTemplate ? 'progression-shell.hbs' : 'UNKNOWN',
    diagnosis: [
      isOldTemplate && !isNewTemplate ? '❌ WRONG SHELL: Using old chargen.hbs instead of new progression-shell.hbs' : '',
      isNewTemplate && isOldTemplate ? '⚠️  MIXED: Both old and new templates detected' : '',
      !isOldTemplate && !isNewTemplate ? '❓ UNKNOWN: Neither old nor new template detected' : '',
      progressApp.id !== 'chargen' && progressApp.id !== 'character-generator' ?
        `❌ WRONG METADATA: app.id='${progressApp.id}' (should be 'chargen' or 'character-generator')` : '',
      progressApp.title !== 'Character Generator' ?
        `❌ WRONG TITLE: app.title='${progressApp.title}' (should be 'Character Generator')` : ''
    ].filter(d => d)
  });
}
```

---

## Expected Outcomes

### If Old Template Is Active (Most Likely)
```
ROOT CAUSE ANALYSIS:
app_class: CharacterGenerator
parts_map_type: OLD (content only)
template_being_rendered: chargen.hbs
diagnosis: [
  "❌ WRONG SHELL: Using old chargen.hbs instead of new progression-shell.hbs"
  "❌ WRONG METADATA: app.id='mentor-chat-dialog' (should be 'chargen' or 'character-generator')"
  "❌ WRONG TITLE: app.title='NPC Level Up' (should be 'Character Generator')"
]
```

**What to fix**:
1. Ensure PARTS map is using new shell template
2. Fix app.id metadata
3. Fix app.title metadata
4. Verify CSS loads for new shell

### If New Template Is Active But Wrong CSS
```
ROOT CAUSE ANALYSIS:
app_class: ChargenShell
parts_map_type: NEW (shell + rails)
template_being_rendered: progression-shell.hbs
diagnosis: [
  "⚠️  CSS MISMATCH: DOM structure is correct but styling not applied"
]
```

**What to fix**:
1. Verify new shell CSS file is loaded
2. Check CSS selectors match rendered DOM classes
3. Verify no conflicting old CSS

---

## Three Distinct Failure Scenarios

### Scenario 1: Wrong Template (Most Likely)
- **Evidence**: PARTS map shows only `{ content }`, not `{ shell, mentorRail, ...}`
- **Evidence**: DOM contains `.chargen-content` and `.step-content`, not `.progression-shell`
- **Fix**: Update PARTS map or template path in CharacterGenerator
- **Impact**: New shell features (mentor-rail, progress-rail) never render

### Scenario 2: Template Registered But Not Mounted
- **Evidence**: PARTS map is correct, but DOM shows old structure
- **Evidence**: Template loaded but parts not rendered
- **Fix**: Verify ApplicationV2 is mounting parts correctly
- **Impact**: Template loaded but parts never inserted into DOM

### Scenario 3: New Template + Wrong CSS
- **Evidence**: PARTS map is correct, DOM has data-part attributes, but styling is missing
- **Evidence**: Structure is right but no visual separation/styling
- **Fix**: Load CSS or fix selectors
- **Impact**: Structure correct but UI not styled

---

## Quick Copy-Paste Diagnostic

```javascript
// Run this while progression app is open
const app = [...foundry.applications.instances.values()]
  .find(a => a.title?.includes('Generator') || a.title?.includes('NPC'));

if (app) {
  const partsKeys = Object.keys(app.constructor.PARTS);
  const html = app.element.outerHTML.substring(0, 500);
  const isOld = partsKeys[0] === 'content' && partsKeys.length === 1;
  const isNew = partsKeys.includes('shell');

  console.log({
    app_id: app.id,
    app_title: app.title,
    parts: partsKeys,
    template_type: isOld ? 'OLD chargen.hbs' : isNew ? 'NEW progression-shell.hbs' : 'UNKNOWN',
    html_start: html,
    verdict: isOld ? '❌ WRONG TEMPLATE - using old shell' : isNew ? '✅ CORRECT TEMPLATE - using new shell' : '❓ UNKNOWN'
  });
}
```

---

## Key Insight

The screenshot + console evidence strongly suggests:
1. **CharacterGenerator** is instantiated (correct)
2. **Old chargen.hbs template** is being rendered (WRONG)
3. **chargen.hbs PARTS map** is active (WRONG)
4. **Metadata is contaminated** (WRONG)

This is a **template path/PARTS map issue**, NOT just a CSS issue.

The fix is to ensure the app uses the correct template structure, not just patch CSS.

