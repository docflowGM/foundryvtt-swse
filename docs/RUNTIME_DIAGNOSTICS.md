# Runtime Diagnostics for Shell Metadata/Composition Issue

## Browser Console Commands for Live Debugging

### 1. Check Feature Flag Status
```javascript
// Is new progression shell enabled?
const newShellEnabled = game.settings.get('foundryvtt-swse', 'useNewProgressionShell');
console.log('useNewProgressionShell:', newShellEnabled);
// Expected: true or false
```

### 2. Check Which Apps Are Open
```javascript
// List all open applications
console.log('Open Apps:', Object.entries(ui.windows).map(([id, app]) => ({
  id: id,
  title: app.title,
  appId: app.id,
  className: app.constructor.name,
  hasElement: !!app.element
})));
```

### 3. Inspect the Chargen App Directly
```javascript
// Find the chargen app
const chargenApp = Object.values(ui.windows).find(app =>
  app.constructor.name.includes('Character') ||
  app.title.includes('Generator') ||
  app.title.includes('NPC') ||
  app.id.includes('chargen') ||
  app.id.includes('mentor')
);

if (chargenApp) {
  console.log('CHARGEN APP FOUND:', {
    id: chargenApp.id,
    title: chargenApp.title,
    className: chargenApp.constructor.name,
    constructor: chargenApp.constructor,
    PARTS: chargenApp.constructor.PARTS,
    element: {
      className: chargenApp.element?.className,
      id: chargenApp.element?.id,
      html: chargenApp.element?.outerHTML.substring(0, 200)
    }
  });
} else {
  console.log('No chargen app found');
}
```

### 4. Check PARTS Map (Which Template Structure?)
```javascript
// Get the app
const app = Object.values(ui.windows)[0]; // Or use chargenApp from above

if (app) {
  console.log('PARTS STRUCTURE:', {
    hasOldParts: 'content' in (app.constructor.PARTS || {}),
    hasNewParts: 'shell' in (app.constructor.PARTS || {}),
    partsKeys: Object.keys(app.constructor.PARTS || {}),
    templates: Object.values(app.constructor.PARTS || {}).map(p => p.template)
  });
}
```

### 5. Inspect Actual DOM Structure (Old vs New)
```javascript
// Search for old shell indicators
const hasOldShellClasses = document.querySelector('.swse-chargen-window') !== null;
const hasNewShellClasses = document.querySelector('.progression-shell') !== null;

console.log('DOM STRUCTURE:', {
  'Has .swse-chargen-window': hasOldShellClasses,
  'Has .progression-shell': hasNewShellClasses,
  'Has [data-part="mentorRail"]': document.querySelector('[data-part="mentorRail"]') !== null,
  'Has [data-part="progressRail"]': document.querySelector('[data-part="progressRail"]') !== null,
  'Has [data-part="utilityBar"]': document.querySelector('[data-part="utilityBar"]') !== null,
  'Has [data-part="workSurface"]': document.querySelector('[data-part="workSurface"]') !== null,
  'Has .chargen-content': document.querySelector('.chargen-content') !== null,
  'Has .mentor-rail': document.querySelector('.mentor-rail') !== null,
  'Has .progress-rail': document.querySelector('.progress-rail') !== null,
  'Has .utility-bar': document.querySelector('.utility-bar') !== null,
});
```

### 6. Check Template Currently Rendering
```javascript
// Get the app
const app = Object.values(ui.windows).find(a => a.element);

if (app && app.element) {
  // Check if old or new template is rendering
  const content = app.element.outerHTML;

  console.log('TEMPLATE INDICATORS:', {
    'Contains chargen.hbs markers': content.includes('chargen-content') && content.includes('step-content'),
    'Contains progression-shell.hbs markers': content.includes('mentor-rail') && content.includes('progress-rail'),
    'First 300 chars': content.substring(0, 300),
    'Element classes': app.element.className,
    'Element id': app.element.id
  });
}
```

### 7. Check Metadata at Key Points
```javascript
// Get the progression app
const app = Object.values(ui.windows).find(a =>
  a.title.includes('Generator') ||
  a.title.includes('NPC') ||
  a.id.includes('chargen') ||
  a.id.includes('mentor')
);

if (app) {
  console.log('METADATA STATE:', {
    'app.id': app.id,
    'app.title': app.title,
    'app.constructor.name': app.constructor.name,
    'super.defaultOptions().title': app.constructor.prototype?.constructor?.name,
    'defaultOptions.title': app.constructor.defaultOptions?.title,
    'DEFAULT_OPTIONS.title': app.constructor.DEFAULT_OPTIONS?.title,
    'Element data attributes': {
      'data-app-id': app.element?.getAttribute('data-app-id'),
      'data-window-title': app.element?.getAttribute('data-window-title')
    }
  });
}
```

### 8. Verify Step Progression Logic
```javascript
// Check if chargen steps are running (for confirmation)
const app = Object.values(ui.windows)[0];

if (app) {
  console.log('STEP STATE:', {
    'currentStep': app.currentStep,
    'currentStepIndex': app.currentStepIndex,
    'characterData.name': app.characterData?.name,
    'stepData size': app.stepData?.size || 'N/A',
    'actor.name': app.actor?.name,
    'actor.type': app.actor?.type,
    'steps array length': app.steps?.length || 'N/A'
  });
}
```

### 9. Check Rendered Parts
```javascript
// List all rendered part containers
const app = Object.values(ui.windows)[0];

if (app && app.element) {
  const parts = app.element.querySelectorAll('[data-part]');
  console.log('RENDERED PARTS:', {
    count: parts.length,
    partNames: Array.from(parts).map(p => p.getAttribute('data-part')),
    partDetails: Array.from(parts).map(p => ({
      name: p.getAttribute('data-part'),
      className: p.className,
      hasContent: p.innerHTML.length > 0
    }))
  });
}
```

### 10. Search for Template in Handlebars Cache
```javascript
// Check if Foundry's template cache has loaded the expected template
const chargenTemplate = Object.keys(Handlebars.partials || {}).filter(k =>
  k.includes('chargen') || k.includes('progression')
);

console.log('CACHED TEMPLATES:', chargenTemplate);
```

---

## Step-by-Step Diagnostic Flow

### When App Opens (Name Step)
1. Run **Command 1** to check feature flag
2. Run **Command 2** to list open apps
3. Run **Command 3** to inspect the chargen app
4. Run **Command 4** to check PARTS structure
5. Note the output

### After Entering Name (Transitioning to Next Step)
1. Run **Command 5** to check DOM structure
2. Run **Command 6** to verify which template is rendering
3. Run **Command 7** to check metadata
4. Run **Command 8** to verify steps are progressing
5. Look for any console errors during step transition

### If Step Transition Crashes
1. Check browser console for error messages
2. Run **Command 3** again to see if app is still there
3. Run **Command 7** to see if metadata changed
4. Check network tab for failed template loads

---

## Expected Output Patterns

### Pattern A: OLD Shell + Wrong Metadata (Scenario A)
```
useNewProgressionShell: false
CHARGEN APP: className='CharacterGenerator', id='mentor-chat-dialog', title='NPC Level Up'
PARTS: { content: { template: 'chargen.hbs' } }
DOM: .swse-chargen-window=true, .progression-shell=false
TEMPLATE: Contains 'chargen-content' and 'step-content'
```

### Pattern B: NEW Shell + Correct Metadata (Scenario B)
```
useNewProgressionShell: true
CHARGEN APP: className='ChargenShell', id='progression-chargen', title='Character Progression: ...'
PARTS: { shell, mentorRail, progressRail, utilityBar }
DOM: .swse-chargen-window=false, .progression-shell=true
TEMPLATE: Contains 'mentor-rail' and 'progress-rail'
```

### Pattern C: Mixed Shell Issues
```
useNewProgressionShell: false
CHARGEN APP: className='CharacterGenerator', id='character-generator', title='Character Generator'
DOM: .swse-chargen-window=true, .progression-shell=false
TEMPLATE: Contains 'chargen-content'
METADATA: Correct values, DOM/template correct
STATUS: Everything working normally
```

---

## If Metadata Is Wrong But Steps Work

This indicates:
1. **Entry point is correct**: CharacterGenerator instantiated
2. **Step logic is correct**: Progression working
3. **Metadata assignment is broken**: ID/title contaminated
4. **Root cause**: ApplicationV2 ID generation or render-time override

**Fix location**: CharacterGenerator or ApplicationV2 metadata assignment

---

## If Template Is Wrong

This indicates:
1. **PARTS map is pointing to wrong template**: Defined incorrectly
2. **Handlebars compilation failed**: Template not loading
3. **Feature flag caused wrong entry**: New shell should be used

**Fix location**: PARTS definition or feature flag

---

## If DOM Structure Is Wrong

This indicates:
1. **Template loaded but parts not mounted**: Rendering issue
2. **CSS selectors don't match**: Layout broken
3. **Handlebars partial system failed**: Part containers not created

**Fix location**: Template or CSS

---

## Logging Output Location

### Console Logging
- Browser DevTools → Console tab
- Accessible via F12 or right-click → Inspect → Console

### SWSE Logger Output
- If game.settings.get('foundryvtt-swse', 'debugMode') is true:
  - Same console
  - Prefixed with `[ClassName]`

### Diagnostic Logs Added to Code
- `/scripts/apps/chargen/chargen-main.js`:
  - Line 336-342: `defaultOptions` logging
  - Line 1530-1540: `_onRender` metadata logging

---

## Commands to Copy-Paste

```javascript
// Quick diagnostic - paste all at once:
console.log('=== QUICK DIAGNOSTIC ===');
console.log('Feature flag:', game.settings.get('foundryvtt-swse', 'useNewProgressionShell'));
const app = Object.values(ui.windows)[0];
if (app) {
  console.log('App class:', app.constructor.name);
  console.log('App id:', app.id);
  console.log('App title:', app.title);
  console.log('Parts keys:', Object.keys(app.constructor.PARTS || {}));
  console.log('Old shell DOM:', !!document.querySelector('.swse-chargen-window'));
  console.log('New shell DOM:', !!document.querySelector('.progression-shell'));
}
```

