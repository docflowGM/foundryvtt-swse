# Phase 5A — Exact DevTools Inspection Commands

**Open:** Browser DevTools (F12) → Console tab  
**Paste each command below, one at a time, into the console**

---

## PART 1: DOM CHAIN VERIFICATION

### Command 1.1: Verify Full DOM Chain Exists

```javascript
// Verify the exact DOM chain from template
const app = document.querySelector('.application.swse-character-sheet');
const windowContent = app?.querySelector('.window-content');
const wrapper = windowContent?.querySelector('.swse-character-sheet-wrapper');
const form = wrapper?.querySelector('form.swse-character-sheet-form');
const shell = form?.querySelector('section.sheet-shell');
const sheetBody = form?.querySelector('.sheet-body');
const activeTab = form?.querySelector('.tab.active');

console.log('=== DOM CHAIN VERIFICATION ===');
console.log('✓ .application.swse-character-sheet:', !!app);
console.log('✓ .window-content:', !!windowContent);
console.log('✓ .swse-character-sheet-wrapper:', !!wrapper);
console.log('✓ form.swse-character-sheet-form:', !!form);
console.log('✓ section.sheet-shell:', !!shell);
console.log('✓ .sheet-body:', !!sheetBody);
console.log('✓ .tab.active:', !!activeTab);
console.log('');
console.log('Chain complete:', !!activeTab ? 'YES ✅' : 'NO ❌');
```

**Expected Output:**
```
=== DOM CHAIN VERIFICATION ===
✓ .application.swse-character-sheet: true
✓ .window-content: true
✓ .swse-character-sheet-wrapper: true
✓ form.swse-character-sheet-form: true
✓ section.sheet-shell: true
✓ .sheet-body: true
✓ .tab.active: true

Chain complete: YES ✅
```

---

### Command 1.2: Capture Exact Class Names

```javascript
// Verify exact classes on each critical element
const app = document.querySelector('.application.swse-character-sheet');
const form = document.querySelector('form.swse-character-sheet-form');
const shell = document.querySelector('.sheet-shell');
const body = document.querySelector('.sheet-body');
const tab = document.querySelector('.tab.active');

console.log('=== EXACT ELEMENT CLASSES ===');
console.log('App:', app?.className);
console.log('Form:', form?.className);
console.log('Shell:', shell?.className);
console.log('Body:', body?.className);
console.log('Tab:', tab?.className);
```

**Expected Output:** Shows all class lists matching the template structure.

---

## PART 2: PROBE VERIFICATION

### Command 2.1: Check if Probes Are Visible (After Adding Rules)

```javascript
// Verify the probes are rendering after you add the CSS rules
const form = document.querySelector('form.swse-character-sheet-form');
const body = document.querySelector('.sheet-body');
const tab = document.querySelector('.tab.active');

const formStyle = getComputedStyle(form);
const bodyStyle = getComputedStyle(body);
const tabStyle = getComputedStyle(tab);

console.log('=== PROBE VISIBILITY CHECK ===');
console.log('');
console.log('PROBE 1 - Magenta Outline (Form):');
console.log('  outline:', formStyle.outline);
console.log('  visible:', formStyle.outline.includes('magenta') || formStyle.outline.includes('rgb(255, 0, 255)') ? '✅ YES' : '❌ NO');
console.log('');
console.log('PROBE 2 - Cyan Shadow (Sheet Body):');
console.log('  box-shadow:', bodyStyle.boxShadow);
console.log('  visible:', bodyStyle.boxShadow.includes('cyan') || bodyStyle.boxShadow.includes('rgb(0, 255, 255)') ? '✅ YES' : '❌ NO');
console.log('');
console.log('PROBE 3 - Lime Outline (Active Tab):');
console.log('  outline:', tabStyle.outline);
console.log('  visible:', tabStyle.outline.includes('lime') || tabStyle.outline.includes('rgb(0, 255, 0)') ? '✅ YES' : '❌ NO');
console.log('');
console.log('PROBE 4 - Height Forcing (Active Tab):');
console.log('  min-height:', tabStyle.minHeight);
console.log('  background:', tabStyle.backgroundColor);
console.log('  applied:', (tabStyle.minHeight.includes('300') || parseInt(tabStyle.minHeight) >= 300) ? '✅ YES' : '❌ NO');
```

**Expected Output (if probes are working):**
```
=== PROBE VISIBILITY CHECK ===

PROBE 1 - Magenta Outline (Form):
  outline: 4px solid magenta
  visible: ✅ YES

PROBE 2 - Cyan Shadow (Sheet Body):
  box-shadow: inset 0px 0px 0px 3px cyan
  visible: ✅ YES

PROBE 3 - Lime Outline (Active Tab):
  outline: 3px dashed lime
  visible: ✅ YES

PROBE 4 - Height Forcing (Active Tab):
  min-height: 300px
  background: rgba(0, 255, 0, 0.0196...)
  applied: ✅ YES
```

---

## PART 3: CSS RULES VERIFICATION

### Command 3.1: Check v2-sheet.css Is Loaded

```javascript
// Verify v2-sheet.css is in the loaded stylesheets
const sheets = Array.from(document.styleSheets);
const v2Sheet = sheets.find(s => s.href && s.href.includes('v2-sheet.css'));

console.log('=== V2-SHEET.CSS VERIFICATION ===');
console.log('File loaded:', !!v2Sheet ? '✅ YES' : '❌ NO');
console.log('URL:', v2Sheet?.href);
console.log('Disabled:', v2Sheet?.disabled ? '⚠️ YES (PROBLEM)' : 'No (OK)');
console.log('');

// Try to read rule count (may fail due to CORS)
try {
  const ruleCount = v2Sheet?.cssRules.length;
  console.log('Rule count:', ruleCount);
  console.log('File is loaded and readable ✅');
} catch (e) {
  console.log('Cannot read rules (CORS protected), but file is loaded');
}
```

**Expected Output:**
```
=== V2-SHEET.CSS VERIFICATION ===
File loaded: ✅ YES
URL: http://localhost:30000/systems/foundryvtt-swse/styles/sheets/v2-sheet.css
Disabled: No (OK)

Rule count: 234
File is loaded and readable ✅
```

---

### Command 3.2: Check All Related CSS Files

```javascript
// Check all character sheet related CSS files
const sheets = Array.from(document.styleSheets);
const cssFiles = [
  'v2-sheet.css',
  'character-sheet.css',
  'character-sheet-overflow-contract.css',
  'character-sheet-svg-panels.css'
];

console.log('=== RELATED CSS FILES ===');
cssFiles.forEach(file => {
  const found = sheets.find(s => s.href && s.href.includes(file));
  console.log(`${file}: ${found ? '✅ LOADED' : '❌ NOT LOADED'}`);
});
```

**Expected Output:**
```
=== RELATED CSS FILES ===
v2-sheet.css: ✅ LOADED
character-sheet.css: ❌ NOT LOADED  ← This is expected! It's not in system.json
character-sheet-overflow-contract.css: ✅ LOADED
character-sheet-svg-panels.css: ✅ LOADED
```

---

## PART 4: COMPUTED STYLES — WINNING RULES

### Command 4.1: Form Element Styles

```javascript
// Inspect form.swse-character-sheet-form computed values
const form = document.querySelector('form.swse-character-sheet-form');
const style = getComputedStyle(form);

console.log('=== FORM.SWSE-CHARACTER-SHEET-FORM STYLES ===');
console.log('display:', style.display);
console.log('flex:', style.flex);
console.log('flex-direction:', style.flexDirection);
console.log('flex-grow:', style.flexGrow);
console.log('flex-basis:', style.flexBasis);
console.log('height:', style.height);
console.log('min-height:', style.minHeight);
console.log('min-width:', style.minWidth);
console.log('overflow:', style.overflow);
console.log('');
console.log('Expected values:');
console.log('  display: flex ✓');
console.log('  flex: 1 1 0% (or similar) ✓');
console.log('  height: 100% ✓');
console.log('  overflow: hidden ✓');
```

**Expected Output (if Phase 4 rules apply):**
```
=== FORM.SWSE-CHARACTER-SHEET-FORM STYLES ===
display: flex
flex: 1 1 0%
flex-direction: column
flex-grow: 1
flex-basis: 0%
height: 100%
min-height: 0px
min-width: 0px
overflow: hidden

Expected values:
  display: flex ✓
  flex: 1 1 0% (or similar) ✓
  height: 100% ✓
  overflow: hidden ✓
```

---

### Command 4.2: Sheet Body Styles

```javascript
// Inspect .sheet-body computed values
const body = document.querySelector('.sheet-body');
const style = getComputedStyle(body);

console.log('=== .SHEET-BODY STYLES ===');
console.log('display:', style.display);
console.log('flex:', style.flex);
console.log('flex-direction:', style.flexDirection);
console.log('flex-grow:', style.flexGrow);
console.log('flex-basis:', style.flexBasis);
console.log('min-height:', style.minHeight);
console.log('overflow:', style.overflow);
console.log('');
console.log('Expected values:');
console.log('  display: flex ✓');
console.log('  flex: 1 1 0% ✓');
console.log('  overflow: hidden ✓');
```

---

### Command 4.3: Active Tab Styles

```javascript
// Inspect .tab.active computed values
const tab = document.querySelector('.tab.active');
const style = getComputedStyle(tab);

console.log('=== .TAB.ACTIVE STYLES ===');
console.log('display:', style.display);
console.log('flex:', style.flex);
console.log('flex-direction:', style.flexDirection);
console.log('flex-grow:', style.flexGrow);
console.log('flex-basis:', style.flexBasis);
console.log('min-height:', style.minHeight);
console.log('overflow-y:', style.overflowY);
console.log('overflow-x:', style.overflowX);
console.log('');
console.log('Expected values:');
console.log('  display: flex ✓');
console.log('  flex: 1 1 0% ✓');
console.log('  overflow-y: auto ✓');
console.log('  overflow-x: hidden ✓');
```

---

## PART 5: SHEET IDENTITY VERIFICATION

### Command 5.1: Check Sheet Class and Actor

```javascript
// Verify this is the expected SWSEV2CharacterSheet
const form = document.querySelector('form.swse-character-sheet-form');
const appRoot = document.querySelector('.application.swse-character-sheet');

// Find the UI window
const windowId = appRoot?.getAttribute('data-appid') || appRoot?.id;
const app = ui.windows[windowId] || Array.from(ui.windows.values()).find(w => 
  w.element && w.element.querySelector('form.swse-character-sheet-form')
);

console.log('=== SHEET IDENTITY ===');
console.log('Sheet Class:', app?.constructor?.name);
console.log('Is SWSEV2CharacterSheet:', app?.constructor?.name === 'SWSEV2CharacterSheet' ? '✅' : '⚠️');
console.log('Template:', app?.template);
console.log('Actor Type:', app?.actor?.type);
console.log('Is Character (not NPC/Droid):', app?.actor?.type === 'character' ? '✅' : '⚠️');
console.log('');
console.log('App Classes:', appRoot?.className);
console.log('Has swse-character-sheet:', appRoot?.classList.contains('swse-character-sheet') ? '✅' : '❌');
```

**Expected Output:**
```
=== SHEET IDENTITY ===
Sheet Class: SWSEV2CharacterSheet
Is SWSEV2CharacterSheet: ✅
Template: /systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs
Actor Type: character
Is Character (not NPC/Droid): ✅

App Classes: application swse-character-sheet sheet actor character swse-sheet v2
Has swse-character-sheet: ✅
```

---

## PART 6: SCROLL OWNER AUDIT

### Command 6.1: Find All Scroll Owners

```javascript
// Find all elements with actual scrolling ability
const allElements = document.querySelectorAll('form.swse-character-sheet-form *');
const scrollOwners = [];

allElements.forEach(el => {
  const style = getComputedStyle(el);
  const hasVerticalScroll = (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                           el.scrollHeight > el.clientHeight;
  const hasHorizontalScroll = (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
                             el.scrollWidth > el.clientWidth;
  
  if (hasVerticalScroll || hasHorizontalScroll) {
    scrollOwners.push({
      selector: el.className || el.tagName,
      tagName: el.tagName,
      classes: el.className,
      overflowY: style.overflowY,
      overflowX: style.overflowX,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    });
  }
});

console.log('=== SCROLL OWNERS ===');
console.log('Total:', scrollOwners.length);
scrollOwners.forEach((owner, i) => {
  console.log(`\n${i+1}. ${owner.tagName}.${owner.classes}`);
  console.log('   overflow-y:', owner.overflowY);
  console.log('   scrollHeight > clientHeight:', owner.scrollHeight, '>', owner.clientHeight);
});

console.log('\n=== VERDICT ===');
if (scrollOwners.length === 1 && scrollOwners[0].classes.includes('active')) {
  console.log('✅ PASS: Only .tab.active scrolls');
} else if (scrollOwners.length === 0) {
  console.log('⚠️ NO SCROLLERS: Check if content is small');
} else {
  console.log('❌ FAIL: Multiple scroll owners found');
}
```

**Expected Output (on SUCCESS):**
```
=== SCROLL OWNERS ===
Total: 1

1. SECTION.tab active flexcol
   overflow-y: auto
   scrollHeight > clientHeight: 2400 > 830

=== VERDICT ===
✅ PASS: Only .tab.active scrolls
```

**On FAILURE (multiple scrollers):**
```
=== SCROLL OWNERS ===
Total: 3

1. FORM.swse-character-sheet-form ...
   overflow-y: auto
   scrollHeight > clientHeight: 2600 > 941

2. SECTION.sheet-body ...
   overflow-y: auto
   scrollHeight > clientHeight: 2300 > 880

3. SECTION.tab.active ...
   overflow-y: auto
   scrollHeight > clientHeight: 2400 > 830

=== VERDICT ===
❌ FAIL: Multiple scroll owners found
```

---

## PART 7: PHASE 4 REPAIR VERIFICATION

### Command 7.1: Comprehensive Repair Check

```javascript
// Verify all Phase 4 repairs are applied at runtime
const form = document.querySelector('form.swse-character-sheet-form');
const windowContent = form.parentElement.parentElement.parentElement; // up to window-content
const sheetBody = form.querySelector('.sheet-body');
const activeTab = form.querySelector('.tab.active');

const checks = {
  'form: display flex': getComputedStyle(form).display === 'flex',
  'form: flex-direction column': getComputedStyle(form).flexDirection === 'column',
  'form: flex 1 1 0%': getComputedStyle(form).flexBasis === '0%',
  'form: height 100%': getComputedStyle(form).height === '100%',
  'form: overflow hidden': getComputedStyle(form).overflow === 'hidden',
  'body: display flex': getComputedStyle(sheetBody).display === 'flex',
  'body: flex-direction column': getComputedStyle(sheetBody).flexDirection === 'column',
  'body: flex 1 1 0%': getComputedStyle(sheetBody).flexBasis === '0%',
  'body: overflow hidden': getComputedStyle(sheetBody).overflow === 'hidden',
  'tab: flex 1 1 0%': getComputedStyle(activeTab).flexBasis === '0%',
  'tab: overflow-y auto': getComputedStyle(activeTab).overflowY === 'auto',
  'tab: overflow-x hidden': getComputedStyle(activeTab).overflowX === 'hidden'
};

console.log('=== PHASE 4 REPAIR VERIFICATION ===');
let passCount = 0;
Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  if (passed) passCount++;
});

console.log(`\nPassed: ${passCount}/${Object.keys(checks).length}`);
console.log(passCount === Object.keys(checks).length ? '✅ ALL REPAIRS VERIFIED' : '❌ SOME REPAIRS MISSING');
```

**Expected Output (if Phase 4 repairs are working):**
```
=== PHASE 4 REPAIR VERIFICATION ===
✅ form: display flex
✅ form: flex-direction column
✅ form: flex 1 1 0%
✅ form: height 100%
✅ form: overflow hidden
✅ body: display flex
✅ body: flex-direction column
✅ body: flex 1 1 0%
✅ body: overflow hidden
✅ tab: flex 1 1 0%
✅ tab: overflow-y auto
✅ tab: overflow-x hidden

Passed: 12/12
✅ ALL REPAIRS VERIFIED
```

---

## QUICK REFERENCE

### If you want ONE command that tells you everything:

```javascript
const form = document.querySelector('form.swse-character-sheet-form');
const body = document.querySelector('.sheet-body');
const tab = document.querySelector('.tab.active');
const fs = getComputedStyle(form);
const bs = getComputedStyle(body);
const ts = getComputedStyle(tab);

console.log('QUICK STATUS:');
console.log('Form:', fs.display, fs.flex, fs.height, fs.overflow);
console.log('Body:', bs.display, bs.flex, bs.overflow);
console.log('Tab:', ts.overflow + '-y, ' + ts.overflowX);
console.log('Scroll owner:', tab.scrollHeight > tab.clientHeight ? 'Tab ✅' : 'None/Other ❌');
```

---

## IMPORTANT NOTES

1. **Run commands one at a time**, not all at once
2. **Screenshot each result** for the audit report
3. **Hard refresh first** (Ctrl+Shift+R) before running
4. **Foundry must be running** on localhost:30000 (or your port)
5. **Character sheet must be open** when you run these commands
6. **No errors means console is working** — missing elements mean DOM mismatch
