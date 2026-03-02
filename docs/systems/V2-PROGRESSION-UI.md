# Progression UI - Foundry V2 API Migration Guide

## Overview

All progression-related UI classes (chargen, level-up, mentor dialogs, debug panels) have been refactored to use the **Foundry VTT v13 V2 Application API**. This ensures compatibility with current and future Foundry releases.

## Why V2 API?

- **Foundry v13+ requirement**: New Foundry versions deprecate the V1 Application/FormApplication API
- **Better architecture**: V2 provides cleaner separation of concerns via `HandlebarsApplicationMixin`
- **Proper lifecycle**: `_prepareContext()` and `_onRender()` replace the implicit `getData()`/`activateListeners()` pattern
- **Type safety**: Explicit lifecycle methods make dependencies clearer

## Classes Refactored

### Character Generation (3 classes)
1. **CharacterGenerator** (`scripts/apps/chargen/chargen-main.js`)
2. **CharacterGeneratorImproved** (`scripts/apps/chargen-improved.js`)
3. **CharacterGeneratorNarrative** (`scripts/apps/chargen-narrative.js`)

### Level-Up System (3 classes)
1. **SWSELevelUpEnhanced** (`scripts/apps/levelup/levelup-main.js`)
2. **SWSELevelUpEnhanced** (`scripts/apps/levelup/levelup-enhanced.js`)
3. **GMDebugPanel** (`scripts/apps/levelup/debug-panel.js`)
4. **PrestigeRoadmap** (`scripts/apps/levelup/prestige-roadmap.js`)

### Mentor Dialogs (2 classes)
1. **MentorChatDialog** (`scripts/apps/mentor-chat-dialog.js`)
2. **MentorReflectiveDialog** (`scripts/apps/mentor-reflective-dialog.js`)

## Base Classes

### For Simple Applications
```javascript
import SWSEApplicationV2 from './base/swse-application-v2.js';

export default class MyApp extends SWSEApplicationV2 {
  async _prepareContext() {
    // Return context for template
    return { /* data */ };
  }

  async _onRender(html, options) {
    // Set up event listeners
    // All queries scoped to this.element
  }
}
```

### For Form Applications
```javascript
import SWSEFormApplicationV2 from './base/swse-form-application-v2.js';

export default class MyForm extends SWSEFormApplicationV2 {
  async _prepareContext() {
    return { /* data */ };
  }

  async _onRender(html, options) {
    // Event listeners
  }

  async _updateObject(event, formData) {
    // Handle form submission
    // Call progression engine, NOT direct actor mutations
  }
}
```

## Key API Changes

### Before (V1)
```javascript
async getData() {
  const context = await super.getData();
  context.myData = ...;
  return context;
}

activateListeners(html) {
  super.activateListeners(html);
  html.find('.button').click(() => { ... });
}
```

### After (V2)
```javascript
async _prepareContext() {
  const context = await super._prepareContext();
  context.myData = ...;
  return context;
}

async _onRender(html, options) {
  await super._onRender(html, options);
  this.element.querySelector('.button')?.addEventListener('click', () => { ... });
}
```

## Critical Rules

### ✅ DO:
- Extend `SWSEApplicationV2` or `SWSEFormApplicationV2`
- Use `_prepareContext()` for data preparation
- Use `_onRender()` for event listener setup
- Scope DOM queries to `this.element`
- Call progression engine APIs (ProgressionEngine, ChargenController, etc.)
- Use `await this.render()` if you need to re-render
- Handle errors gracefully with `this._handleError()`

### ❌ DON'T:
- Use `getData()` - it's no longer called
- Use `activateListeners()` - use `_onRender()` instead
- Directly mutate `this.actor` data
- Use global `$` jQuery selectors
- Call `render()` without await
- Rely on old FormApplication `_updateObject()` patterns
- Create global listeners outside `_onRender()`

## Error Handling

All V2 base classes include built-in error handling:

```javascript
_handleError(context, error) {
    console.error(`[${this.constructor.name}:${context}]`, error);
    ui.notifications?.error(`Error in ${this.constructor.name}: ${error.message}`);
}
```

Wrap risky operations:
```javascript
async _prepareContext() {
  try {
    // Your data prep code
    return context;
  } catch (error) {
    this._handleError('_prepareContext', error);
    return {}; // Safe fallback
  }
}
```

## Templates

All progression templates are compatible with V2. They:
- Use standard Handlebars syntax (no V1-specific helpers)
- Receive context from `_prepareContext()` directly
- Don't rely on side effects in the template
- Reference context fields explicitly

Example template expectations:
```handlebars
{{#each items}}
  <button data-item="{{this.name}}">{{this.name}}</button>
{{/each}}
```

## Progression Engine Integration

All UI classes maintain their relationship with the progression engine:

**DO NOT change:**
- ProgressionEngine calls
- ChargenController interactions
- Mentor resolution logic
- Data shape/structure

**Progression engine is the SSOT** (Single Source of Truth) for:
- Which items can be selected
- Prerequisites and validations
- Class/feat/talent entitlements
- Mentor guidance logic

## Testing Checklist

✓ Chargen opens and renders without errors
✓ Navigation forward/backward works
✓ Mentor dialogs appear and respond correctly
✓ Level-up flow completes successfully
✓ No duplicate event listeners on re-render
✓ No console errors from Foundry rendering pipeline
✓ No warnings in browser console
✓ Form submissions call progression engine APIs
✓ Errors display user-friendly notifications

## Migration Troubleshooting

### Issue: "Cannot read property '_prepareContext' of undefined"
**Fix:** Ensure you're extending `SWSEApplicationV2` or `SWSEFormApplicationV2`

### Issue: Event listeners not firing
**Fix:** Make sure listeners are attached in `_onRender()`, not elsewhere. Use `this.element.querySelector()`.

### Issue: Template not rendering
**Fix:** Verify `_prepareContext()` returns the expected context shape. Check browser console for data validation errors.

### Issue: Form submission doesn't work
**Fix:** Ensure `_updateObject()` is defined and calls the progression engine, not direct actor mutations.

### Issue: Duplicate listeners after re-render
**Fix:** Remove/destroy old listeners before adding new ones in `_onRender()`. Or use `.addEventListener` with proper cleanup.

## Adding New Progression UI

When creating new progression-related UI:

1. **Extend the right base class:**
   ```javascript
   import SWSEApplicationV2 from '../base/swse-application-v2.js';
   export default class MyProgressionApp extends SWSEApplicationV2 {
   ```

2. **Implement required methods:**
   ```javascript
   async _prepareContext() { /* data prep */ }
   async _onRender(html, options) { /* listeners */ }
   ```

3. **Use progression engine APIs:**
   ```javascript
   import ProgressionEngine from '../engine/progression-engine.js';
   await ProgressionEngine.selectFeat(actor, feat);
   ```

4. **Define defaultOptions:**
   ```javascript
   static get defaultOptions() {
     return foundry.utils.mergeObject(super.defaultOptions, {
       template: "systems/foundryvtt-swse/templates/apps/my-app.hbs",
       width: 600,
       height: "auto"
     });
   }
   ```

## FAQ

**Q: Can I still use jQuery?**
A: Avoid it. Use native DOM APIs scoped to `this.element`.

**Q: Do I need to call super._prepareContext()?**
A: Only if your parent class implements it. Check the inheritance chain.

**Q: What about Dialog windows?**
A: Dialog is handled by Foundry and doesn't need refactoring. Just don't call `.render(true)` on it.

**Q: Will old V1 code still work?**
A: No. You must refactor to V2. The system has fully transitioned.

**Q: What if I have custom Handlebars helpers?**
A: They still work. Register them as usual and use in templates.

## References

- [Foundry VTT V2 API Documentation](https://foundryvtt.com/)
- [HandlebarsApplicationMixin](https://foundryvtt.com/api/)
- [SWSE Progression Engine](../scripts/engine/progression-engine.js)
- [Base V2 Classes](../scripts/apps/base/)

## Refactor History

- **2025-02-02**: Initial V2 migration of all progression UI classes
- **Base classes**: `swse-application-v2.js`, `swse-form-application-v2.js`
- **9 classes refactored**: Chargen (3), Level-up (4), Mentor dialogs (2)
- **Full error handling** integrated into base classes
