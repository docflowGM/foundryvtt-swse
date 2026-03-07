# V2 APPLICATION BUTTON HANDLER PATTERNS

## Governance Rule

All V2 applications (extending ApplicationV2 or FormApplicationV2) **MUST** use standardized button handler patterns to ensure:
- Consistent event binding lifecycle
- Proper cleanup on app destroy
- Accessibility compliance
- Easy debugging and maintenance

---

## STANDARD PATTERN (Recommended)

### Template (*.hbs)
```handlebars
<button type="button" [data-action]="actionName" data-value="optional-value">
  Button Label
</button>
```

### JavaScript (_onRender or equivalent)
```javascript
async _onRender(context, options) {
  await super._onRender(context, options);
  const root = this.element;

  // Bind all [data-action] handlers
  root.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => this._handleAction(e));
  });
}

// Single handler method dispatches to specific actions
_handleAction(event) {
  const action = event.currentTarget.getAttribute('data-action');
  const value = event.currentTarget.getAttribute('data-value');

  switch(action) {
    case 'add-item':
      this._onAddItem(value);
      break;
    case 'remove-item':
      this._onRemoveItem(value);
      break;
    case 'confirm':
      this._onConfirm();
      break;
    default:
      console.warn('Unknown action:', action);
  }
}

// Specific action handlers
_onAddItem(value) { /* ... */ }
_onRemoveItem(value) { /* ... */ }
_onConfirm() { /* ... */ }
```

---

## ANTI-PATTERNS (Do NOT Use)

### ❌ Direct onclick attributes
```handlebars
<!-- BAD: Inline event handlers -->
<button onclick="game.swse.doSomething()">Click</button>
```
**Why**: Not AppV2-compliant, no lifecycle control, not accessible.

### ❌ Inconsistent class-based selectors
```javascript
// BAD: Mix of .class-name-btn, [data-action], custom binding
root.querySelector('.approve-btn').addEventListener(...);
root.querySelector('[data-action="reject"]').addEventListener(...);
root.querySelectorAll('.custom-action').forEach(...);
```
**Why**: Inconsistent patterns are hard to maintain and debug.

### ❌ Early binding before super._onRender
```javascript
_onRender(context, options) {
  // BAD: This runs before super() completes
  this.element.querySelector('button').addEventListener('click', ...);

  await super._onRender(context, options);
}
```
**Why**: Element may not exist yet, causing crashes.

---

## SPECIAL CASES

### Form Fields (Inputs, Textareas)
```javascript
// Standard form fields use 'change' event, not 'click'
root.querySelectorAll('[name]').forEach(field => {
  field.addEventListener('change', (e) => this._onFieldChange(e));
});

_onFieldChange(event) {
  const name = event.currentTarget.name;
  const value = event.currentTarget.value;
  // Update internal state or trigger validation
}
```

### Toggle Buttons (Checkboxes)
```handlebars
<input type="checkbox" [data-action]="toggleSetting" name="setting-name" />
```

### Custom Sub-actions (Nested elements)
```javascript
// If button contains icons/nested elements:
root.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Find the actual button, not child elements
    const actionBtn = e.currentTarget.closest('[data-action]');
    if (actionBtn) {
      this._handleAction(actionBtn);
    }
  });
});
```

---

## CLEANUP & LIFECYCLE

### Automatic Cleanup (Recommended)
ApplicationV2 automatically removes all listeners when the app is destroyed. No manual cleanup needed.

### Manual Cleanup (If Needed)
```javascript
destroy() {
  // Only needed if using event delegation on document or window
  document.removeEventListener('custom-event', this._boundHandler);
  super.destroy();
}
```

---

## MIGRATION PATH

### Current Non-Standard Patterns in V2 Apps

| App | Current Pattern | Status | Priority |
|-----|-----------------|--------|----------|
| Store | [data-action] + classes | ✅ Standard | Compliant |
| GM Store Dashboard | [data-action] | ✅ Standard | Compliant |
| GM Droid Dashboard | .class-btn | ⚠️ Inconsistent | Low - works, should align |
| Levelup | Custom bindClick() | ⚠️ Custom | Low - abstraction functional |
| Chargen | Custom handlers | ⚠️ Custom | Low - complex wizard, acceptable |
| XP Calculator | [data-action] | ✅ Standard | Compliant |
| Force Pickers | Direct handlers | ✅ Standard | Compliant |

**Decision**: Only GM Droid Dashboard should be refactored to [data-action] standard. Others are acceptable or intentionally specialized.

---

## ACCESSIBILITY COMPLIANCE

All buttons must include:
- `type="button"` (explicit type)
- `aria-label` or meaningful text content
- Keyboard navigation support (automatic with `<button>`)
- Focus visible state (CSS: `.app:focus-visible { ... }`)

### Example
```handlebars
<button type="button"
        [data-action]="addItem"
        [aria-label]="'Add ' + item.name"
        {{#unless isEnabled}}disabled{{/unless}}>
  <i class="fa-solid fa-plus"></i>
  Add
</button>
```

---

## DEBUGGING TIPS

### Check Handler Binding
```javascript
// In console, inspect a button element:
const btn = document.querySelector('[data-action="confirm"]');
getEventListeners(btn); // Chrome DevTools
btn.onclick; // Should be null (using addEventListener)
```

### Verify _onRender Runs After Super
```javascript
async _onRender(context, options) {
  console.log('Before super:', this.element); // May be undefined
  await super._onRender(context, options);
  console.log('After super:', this.element);  // Now available

  // Safe to bind handlers here
  this.element.querySelectorAll('[data-action]').forEach(...);
}
```

---

## SUMMARY

✅ **Required**: [data-action] pattern for consistency
✅ **Required**: Binding in _onRender after super()
✅ **Required**: Accessibility attributes
⚠️ **Optional**: Custom patterns allowed if well-documented
❌ **Forbidden**: Inline onclick attributes, early binding, jQuery event methods

**Governance Priority**: LOW (patterns mostly compliant, cosmetic alignment needed)
