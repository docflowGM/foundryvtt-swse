# Contributing to SWSE System

Welcome! This guide covers the essentials for contributing to the Star Wars Saga Edition system for Foundry VTT.

## Table of Contents

- [Getting Started](#getting-started)
- [Code Standards](#code-standards)
- [UI Invariants (Critical)](#ui-invariants-critical)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

---

## Getting Started

1. **Clone the repo** and switch to the development branch
2. **Read the SWSE Architecture** (see `/scripts/README.md` if available)
3. **Review recent commits** to understand current patterns
4. **Ask questions** in Issues before starting major work

---

## Code Standards

### JavaScript / TypeScript

- **Use modern ES6+ syntax** (arrow functions, destructuring, const/let)
- **No jQuery** – Foundry v13+ uses vanilla DOM APIs
- **No var** – Always use const/let
- **Avoid console.log in production** – Use `SWSELogger.log()` instead
- **Prefer async/await** over .then() chains

Example:

```javascript
// ✅ GOOD
const element = this.element.querySelector('.my-selector');
const updated = await actor.update({ 'system.hp': 50 });

// ❌ BAD
const element = $(this.element).find('.my-selector')[0];
actor.update({ 'system.hp': 50 }).then(() => { /* ... */ });
```

### Handlebars Templates

- **Use centralized icons** via `{{getIconClass 'iconName'}}`
- **No inline styles** – Use CSS classes instead
- **Prefer semantic HTML** – Use `<button>` not `<div onclick>`

Example:

```handlebars
{{!-- ✅ GOOD --}}
<i class="{{getIconClass 'success'}}"></i>
<button class="btn-primary" type="button">Click me</button>

{{!-- ❌ BAD --}}
<i class="fas fa-check"></i>
<div onclick="myFunction()">Click me</div>
```

### CSS

- **Use CSS containment** for layout-critical containers
- **No transform/filter on Foundry UI containers** (breaks z-index)
- **Prefer CSS Custom Properties** for theming
- **Namespace custom classes** with `swse-` prefix

Example:

```css
/* ✅ GOOD */
.swse-my-component {
  display: flex;
  gap: var(--swse-spacing-default);
}

/* ❌ BAD */
.my-component {
  display: flex;
  transform: scale(1.1); /* On a critical container */
}
```

---

## UI Invariants (Critical)

These are non-negotiable rules for Foundry v13+ compatibility. Violations break the system silently.

### 1. No jQuery on HTMLElement

**Rule:** Never use jQuery methods on HTMLElement.

Foundry v13+ removed jQuery from element objects. Methods like `.find()`, `.text()`, `.show()`, `.hide()` **will not work**.

**Guardrail:** In dev mode, a warning logs if these methods are detected on HTMLElement.

```javascript
// ❌ BROKEN
const title = this.element.find('.title'); // undefined
this.element.show(); // TypeError

// ✅ CORRECT
const title = this.element.querySelector('.title');
this.element.style.display = 'block';
```

### 2. DOM Access: element vs element[0]

**Rule:** Use `this.element` directly, never `this.element[0]`.

In Foundry v2 Applications, `this.element` is already an HTMLElement, not a jQuery object.

```javascript
// ❌ BROKEN
const node = this.element[0].querySelector(...); // undefined[0] error

// ✅ CORRECT
const node = this.element.querySelector(...);
```

### 3. CSS Containment Contract

**Rule:** Critical Foundry containers (#sidebar, #sidebar-content, .app.window-app) **must always have:**
- `position: relative`
- `contain: layout paint`

**Never apply** `transform`, `filter`, or `backdrop-filter` to these containers (breaks z-index stacking).

```css
/* ✅ REQUIRED */
#sidebar {
  position: relative;
  contain: layout paint;
}

/* ❌ FORBIDDEN */
#sidebar {
  filter: drop-shadow(0 0 10px blue); /* Creates stacking context corruption */
  transform: translateX(10px); /* Breaks z-index stacking */
}
```

If you need glow/blur effects, wrap with an inner `<div>`:

```html
<div id="sidebar">
  <div class="sidebar-effects"><!-- Apply filter/transform here --></div>
  <div id="sidebar-content"><!-- Original content --></div>
</div>
```

### 4. Icon System: Always Use Centralized Constants

**Rule:** All FontAwesome icons must come from `scripts/utils/icon-constants.js`.

Never hardcode icon classes. This prevents the 142-icon refactor disaster.

**In Templates:**
```handlebars
{{!-- ✅ GOOD --}}
<i class="{{getIconClass 'success'}}"></i>
<i class="{{getIconClass 'warning'}}"></i>

{{!-- ❌ BAD --}}
<i class="fas fa-check"></i>
<i class="fa-solid fa-triangle-exclamation"></i>
```

**In JavaScript:**
```javascript
import { createIcon, applyIcon, ICONS } from '../../scripts/utils/icon-constants.js';

// ✅ GOOD
const icon = createIcon('success');
container.appendChild(icon);

// ❌ BAD
const icon = document.createElement('i');
icon.className = 'fas fa-check';
```

When FontAwesome upgrades, update `icon-constants.js` once → everywhere works.

### 5. Character Sheet: Template Validation

**Rule:** The character sheet constructor validates that `DEFAULT_OPTIONS.template` exists.

If the template path is broken or missing, the sheet will throw immediately instead of rendering blank.

```javascript
// ✅ SAFE – Throws if template path is wrong
constructor(options = {}) {
  super(options);
  if (!this.constructor.DEFAULT_OPTIONS?.template) {
    throw new Error("SWSEV2CharacterSheet: Missing template path");
  }
}
```

### 6. CharGen: Render Assertions

**Rule:** After rendering each step, assert that the step container has content.

```javascript
if (this.currentStep) {
  const stepContainer = this.element.querySelector(`[data-step="${this.currentStep}"]`);
  if (stepContainer && stepContainer.children.length === 0) {
    console.warn(`[SWSE CharGen] Step "${this.currentStep}" rendered no content`);
  }
}
```

This catches selector mismatches and missing templates early.

---

## Testing

### Before You Commit

1. **Test in Foundry** with dev tools open (F12)
2. **Check browser console** for errors (including 🟡 warnings)
3. **Test with devMode enabled** (logs extra guardrail warnings)
4. **Run linters** if available (see below)

### If You Break An Invariant

The system will tell you:

- **No-jQuery Guardrail**: Yellow warning in console (dev mode only)
- **Missing Template**: Red error on sheet open
- **CharGen Blank Step**: Yellow warning during render
- **CSS Containment**: Z-index bugs, phantom scrolls, tab bleed (harder to debug — just don't do it)

---

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

<optional body>

<footer if referencing an issue>
```

**Types:**
- `feat:` – New feature
- `fix:` – Bug fix
- `docs:` – Documentation
- `refactor:` – Code restructuring (no behavior change)
- `test:` – Tests
- `ci:` – CI/CD configuration

**Examples:**

```
feat: Add new talent tree visualization

Implements interactive D3.js-based talent tree for CharGen step.

Closes #123
```

```
fix: Prevent sidebar icon overlap in holo theme

Changed overflow from hidden to auto on sidebar-content children.
Prevents content clipping while maintaining containment.
```

---

## Pull Requests

### Before Opening a PR

1. **Rebase on main** (don't merge commits)
2. **Add a clear title** (not "Fix stuff")
3. **Reference related Issues** (#123)
4. **Test in Foundry** manually

### PR Template

```markdown
## Summary
What does this PR do? (1-2 sentences)

## Changes
- Bullet list of specific changes
- Include file paths if architectural changes

## Testing
How should this be tested? Include steps.

## Checklist
- [ ] No jQuery methods on HTMLElement
- [ ] All icons use {{getIconClass}}
- [ ] CSS containment rules respected
- [ ] No console errors in dev tools
- [ ] Commit messages follow convention
- [ ] Related Issues referenced
```

### Code Review Guidelines

When reviewing PRs, check:

1. **UI Invariants** – Does it follow the rules above?
2. **Performance** – Any heavy loops or memory leaks?
3. **Accessibility** – Does it work with screen readers?
4. **Backwards Compatibility** – Does it break existing features?
5. **Tests Pass** – Do all tests pass?

---

## Useful Resources

- **Foundry VTT Docs**: https://foundryvtt.wiki/en/home
- **SWSE System Docs**: Check the repo README
- **FontAwesome v13 Icons**: https://fontawesome.com/icons
- **Handlebars Docs**: https://handlebarsjs.com/

---

## Questions?

- Open an Issue for bugs or feature requests
- Start a Discussion for design questions
- Check closed Issues/PRs for context

Thanks for contributing!
