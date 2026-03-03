# CSS Architecture Governance for FoundryVTT SWSE System

**Version**: 2.0 (Post-Refactor)
**Last Updated**: March 3, 2026
**Status**: ACTIVE GOVERNANCE

---

## 1. Architecture Overview

The SWSE CSS system uses a **layered, scoped architecture** that prevents unintended style leakage into Foundry core UI while maintaining full visual control over SWSE application windows.

### The Five-Layer System

```
┌─────────────────────────────────────────────┐
│ 5. THEMES                                   │  Color palettes, visual variants
│    (styles/themes/*.css)                    │
├─────────────────────────────────────────────┤
│ 4. APPS & SHEETS                            │  Component-level styling
│    (styles/apps/, styles/sheets/)           │
├─────────────────────────────────────────────┤
│ 3. COMPONENTS                               │  Buttons, forms, tabs, panels
│    (styles/components/)                     │
├─────────────────────────────────────────────┤
│ 2. STRUCTURAL SAFETY                        │  AppV2 layout normalization
│    (styles/core/appv2-structural-safe.css)  │
├─────────────────────────────────────────────┤
│ 1. VARIABLES & FOUNDATIONS                  │  Design tokens, core rules
│    (styles/core/variables.css, ...)         │
└─────────────────────────────────────────────┘
```

---

## 2. The Scoping Doctrine

### Foundational Rule
**SWSE styles NEVER target Foundry core classes or elements.**

Foundry core elements that must remain untouched:
- `.window-app`, `.app`, `.dialog` - Window containers
- `.window-header`, `.window-content` - Window structure
- `.sidebar`, `#ui-left`, `#ui-right` - UI containers
- `.scene-list`, `.actor-directory`, `.item-directory` - Directory components
- `.rollable`, `.chat-message`, `.chat-control` - Chat/game elements
- Any Foundry icon buttons, controls, or default UI

### Approved Scope Patterns

#### Pattern 1: ApplicationV2 Sheet Windows
```css
/* ✅ CORRECT - Only affects SWSE sheet windows */
.application.swse {
  /* Your CSS here */
}

.application.swse button,
.application.swse input,
.application.swse select {
  /* Form control styling */
}
```

**Scope**: Only AppV2 sheets opened through SWSE system
**Safety**: Cannot affect Foundry chrome because `.application.swse` is unique to SWSE windows

#### Pattern 2: Generic SWSE App Containers
```css
/* ✅ CORRECT - For non-AppV2 SWSE components */
.swse-app {
  /* Your CSS here */
}

.swse-app button,
.swse-app input {
  /* Form elements inside .swse-app container */
}
```

**Scope**: Custom app containers with explicit `.swse-app` class
**Safety**: Only affects elements within explicitly marked containers

#### Pattern 3: Custom Component Classes
```css
/* ✅ CORRECT - Most flexible approach */
.ability-card {
  /* Custom component styling */
}

.ability-card button,
.ability-card .expand-icon {
  /* Nested element styling */
}

/* Usage in HTML: <div class="ability-card"> ... </div> */
```

**Scope**: Custom component namespaces (no framework collision)
**Safety**: Zero risk of affecting other systems

#### Pattern 4: Theme-Scoped Styling
```css
/* ✅ CORRECT - For theme-specific overrides */
[data-theme="holo"] .swse input {
  color: var(--swse-primary);
  border-color: var(--swse-accent);
}

body.swse-theme-holo .swse-app {
  background: var(--swse-bg-dark);
}
```

**Scope**: Only applied when specific theme is active
**Safety**: Attribute selectors create intentional scope boundaries

#### Pattern 5: Sheet-Specific Classes
```css
/* ✅ CORRECT - Sheet-specific scoping */
.swse-character-sheet {
  /* Character sheet styles */
}

.swse-character-sheet .sheet-tabs {
  /* Nested elements */
}

/* Also acceptable: */
.swse-app-app.sheet.actor {
  /* Actor sheet specific */
}
```

**Scope**: Sheets with unique class identifiers
**Safety**: Multiple sheets don't collide

### Forbidden Patterns

```css
/* ❌ WRONG - Global selector affects Foundry UI */
.swse button { }
.swse input { }
.swse select { }

/* ❌ WRONG - Targets framework classes */
button { }
input { }
.flexrow button { }
.window-header { }
.sidebar { }

/* ❌ WRONG - Global element selectors */
a { }
p { }
h1 { }

/* ❌ WRONG - ID-based targeting */
#app { }
#board { }
#ui-left { }
```

**Why they fail**: When `.swse` class is applied to `<body>` by the theme manager, these selectors match ALL buttons/inputs/etc. on the page, breaking Foundry core UI.

---

## 3. Variable System

### Design Tokens (Canonical Source)
**File**: `styles/core/variables.css`

All variables defined at `:root` level:
```css
:root {
  /* Colors */
  --swse-primary: #9ed0ff;
  --swse-bg-dark: #0a0f1a;

  /* Spacing */
  --swse-space-md: 8px;

  /* Typography */
  --swse-font: "Rajdhani", sans-serif;
}
```

**Usage Rule**: Always use CSS variables, never hardcode colors or spacing.

### Variable Categories

| Category | Examples | When to Use |
|----------|----------|-------------|
| **Colors** | `--swse-primary`, `--swse-accent`, `--swse-danger` | All color properties |
| **Spacing** | `--swse-space-md`, `--swse-space-lg` | Padding, margin, gaps |
| **Typography** | `--swse-font`, `--swse-font-size-md` | Font family, sizes |
| **Effects** | `--swse-glow`, `--swse-shadow` | Box shadows, glows |
| **Layout** | `--swse-radius`, `--swse-gap` | Border radius, flex gaps |
| **Z-Index** | `--swse-z-modal`, `--swse-z-tooltip` | Layering, stacking |

### Variable Naming Convention

```
--swse-[category]-[modifier]-[variant]

Examples:
--swse-bg-dark          ← background, dark variant
--swse-text-primary     ← text, primary variant
--swse-space-md         ← spacing, medium
--swse-font-size-lg     ← typography, size, large
--swse-border-active    ← border, active state
```

### Theme Variable Overrides

**File**: `styles/themes/holo.css` (and other theme files)

Themes **only override CSS variables**, never add layout rules:

```css
[data-theme="holo"] {
  --swse-primary: #00aaff;      ← Override color
  --swse-bg-dark: #0a1f35;      ← Override background
  /* NO layout rules, NO selectors beyond variable overrides */
}
```

---

## 4. File Organization

### Directory Structure
```
styles/
├── core/                          ← Foundation layer
│   ├── variables.css              ← Design tokens
│   ├── swse-base.css              ← Base element styles
│   ├── appv2-structural-safe.css  ← AppV2 layout rules
│   └── canvas-safety.css          ← Canvas rendering fixes
│
├── components/                    ← Reusable components
│   ├── buttons.css
│   ├── forms.css
│   ├── tabs.css
│   ├── panels.css
│   └── [custom-component].css
│
├── sheets/                        ← Sheet-specific styling
│   ├── character-sheet.css
│   ├── droid-sheet.css
│   └── vehicle-sheet.css
│
├── apps/                          ← App-specific styling
│   ├── chargen/
│   ├── levelup.css
│   └── store.css
│
├── dialogs/                       ← Dialog styling
│   └── holo-dialogs.css
│
├── themes/                        ← Theme variants
│   ├── holo.css
│   ├── high-contrast.css
│   └── [custom-theme].css
│
└── archive/                       ← Experimental/deprecated
    └── sheets-v3/
```

### Load Order (system.json)
CSS files load in this order to ensure proper cascade:

1. **Core variables** - Design token definitions
2. **Core foundations** - Base rules, structural safety
3. **Components** - Reusable component styles
4. **Layouts** - Sheet and app layouts
5. **Dialogs** - Dialog-specific styling
6. **Sheets** - Full sheet styles
7. **Apps** - Application-specific styles
8. **Themes** - Color/visual overrides (loads last, highest specificity)

**Why this order matters**:
- Variables load first (needed by everything)
- Structural rules load early (provide foundation)
- Themes load last (can override everything else)
- Prevents cascading failures and style conflicts

---

## 5. Component Patterns

### Creating a New Component

```css
/* styles/components/my-custom-component.css */

/* 1. NAMESPACE - Create unique class */
.my-custom-component {
  background: var(--swse-bg-light);
  padding: var(--swse-space-md);
  border: 1px solid var(--swse-border-default);
}

/* 2. SCOPED CHILDREN - All selectors start with namespace */
.my-custom-component .header {
  font-weight: bold;
  color: var(--swse-text-primary);
}

.my-custom-component button {
  background: var(--swse-accent);
}

/* 3. STATES - Modifier classes for variations */
.my-custom-component.expanded .body {
  display: block;
}

.my-custom-component.collapsed .body {
  display: none;
}

/* 4. RESPONSIVE - Breakpoints if needed */
@media (max-width: 768px) {
  .my-custom-component {
    flex-direction: column;
  }
}

/* 5. ACCESSIBILITY - Support reduced motion */
@media (prefers-reduced-motion: reduce) {
  .my-custom-component {
    transition: none;
  }
}
```

**Usage in system.json**:
```json
{
  "styles": [
    "styles/components/my-custom-component.css"
  ]
}
```

### Adding Component to a Sheet

```css
/* styles/sheets/character-sheet.css */
@import url("../components/my-custom-component.css");

.swse-character-sheet .my-custom-component {
  /* Sheet-specific overrides if needed */
  width: 100%;
}
```

---

## 6. Theme System

### How Themes Work

1. **Theme variables defined** in `styles/core/variables.css`:
   ```css
   :root { --swse-primary: #9ed0ff; }
   [data-theme="holo"] { --swse-primary: #00aaff; }
   ```

2. **Theme applied** via `data-theme` attribute or class on body:
   ```html
   <body data-theme="holo">
   <!-- OR -->
   <body class="swse-theme-holo">
   ```

3. **Components use variables** (automatically themed):
   ```css
   .my-button {
     color: var(--swse-primary);  ← Automatically uses theme color
   }
   ```

### Adding a New Theme

1. **Define variables** in `styles/core/variables.css`:
   ```css
   [data-theme="my-theme"] {
     --swse-primary: #ff00ff;
     --swse-bg-dark: #1a0a1a;
   }
   ```

2. **Create theme file** `styles/themes/my-theme.css`:
   ```css
   [data-theme="my-theme"] .swse {
     /* Theme-specific overrides if needed */
   }
   ```

3. **Register in system.json**:
   ```json
   {
     "styles": [
       "styles/themes/my-theme.css"
     ]
   }
   ```

**Important**: Theme files should ONLY override CSS variables and provide optional visual tweaks. They must NOT add layout rules or change the DOM structure.

---

## 7. Critical Rules (Enforcement)

### Rule 1: Selector Scope
```
NEVER use broad selectors:
  ❌ .swse button         (affects all buttons in body.swse)
  ❌ .swse input          (affects all inputs in body.swse)
  ❌ .swse select         (affects all selects in body.swse)

ALWAYS scope narrowly:
  ✅ .application.swse button
  ✅ .swse-app button
  ✅ .my-component button
  ✅ [data-theme="holo"] .swse input
```

### Rule 2: Variable Usage
```
NEVER hardcode:
  ❌ color: #9ed0ff;
  ❌ padding: 8px;
  ❌ background: #0a0f1a;

ALWAYS use variables:
  ✅ color: var(--swse-primary);
  ✅ padding: var(--swse-space-md);
  ✅ background: var(--swse-bg-dark);
```

### Rule 3: Foundry Core Protection
```
NEVER target:
  ❌ .window-app, .dialog, .app
  ❌ .window-header, .window-content
  ❌ #sidebar, #ui-left, #ui-right
  ❌ Global element selectors (button, input, a, etc.)

ALWAYS scope to SWSE containers:
  ✅ .application.swse button
  ✅ .swse-app input
  ✅ .my-component a
```

### Rule 4: Layer Isolation
```
Variables layer:
  - Can modify anything below
  - Must not contain layout rules

Components layer:
  - Can override variables
  - Must not affect Foundry core

Sheets/Apps layer:
  - Can override components
  - Must maintain sheet structure

Themes layer:
  - Can override colors (variables)
  - Must NOT add layout or structural rules
```

### Rule 5: No !important
```
❌ Avoid unless absolutely necessary:
  background: var(--swse-primary) !important;

✅ Use specificity instead:
  .application.swse .my-specific-element {
    background: var(--swse-primary);
  }

⚠️ Exceptions (justified):
  .swse-app-app #board canvas { display: block !important; }
    → Canvas rendering requires !important for safety

  .swse-character-sheet .window-content { overflow-y: auto !important; }
    → AppV2 scroll restoration requires !important override
```

---

## 8. Validation Checklist

Before committing CSS changes:

- [ ] **No global selectors** - All selectors scoped to SWSE containers
- [ ] **Variables used** - No hardcoded colors, spacing, fonts
- [ ] **Foundry core untouched** - No `.window-*`, `.sidebar`, `#ui-*` selectors
- [ ] **Load order respected** - File placed in correct directory
- [ ] **Theme-compatible** - Uses CSS variables for colors
- [ ] **Accessibility** - Includes `@media (prefers-contrast: high)` and `@media (prefers-reduced-motion: reduce)`
- [ ] **No inline styles** - All styling in CSS files
- [ ] **Comments documented** - Section headers and complex rules explained

---

## 9. Debugging Guide

### Symptom: Button/Input styling affected in Foundry UI
**Likely cause**: Broad `.swse` selector in component or core file
**Fix**: Change `.swse button` to `.application.swse button`

### Symptom: Sentinel DEGRADED status
**Likely causes**:
1. Global selectors affecting form elements
2. Layout properties affecting non-SWSE windows
3. Z-index conflicts with Foundry UI

**Diagnosis**: Check browser console for affected elements, use DevTools to find offending CSS rule
**Fix**: Scope selector tighter or move rule to appropriate layer

### Symptom: Theme not applying colors
**Likely cause**: Component using hardcoded color instead of variable
**Fix**: Replace `color: #9ed0ff;` with `color: var(--swse-primary);`

### Symptom: Sheet not scrolling properly
**Likely cause**: Missing `min-height: 0;` on flex container
**Fix**: Add to `appv2-structural-safe.css`:
```css
.my-sheet-container {
  min-height: 0;
}
```

---

## 10. Governance

### Who Can Modify CSS
- **System maintainers**: Full access to architecture
- **Feature developers**: Can create components following patterns
- **Theme designers**: Only modify `styles/themes/` and `variables.css`

### Code Review Checklist
```markdown
- [ ] Selectors follow scoping patterns
- [ ] No variables hardcoded
- [ ] No Foundry core selectors
- [ ] Variables layer not modified
- [ ] System.json load order correct
- [ ] Accessibility rules included
- [ ] Comments document complex rules
```

### Migration Path
When introducing new patterns:
1. Document in this file
2. Create example component
3. Update validation checklist
4. Review with team
5. Implement across codebase

---

## 11. History & Migration

### Changes in 2026-03-03 Refactor
- **STEP 1**: Removed 46 dead/deprecated CSS files
- **STEP 2**: Consolidated duplicate rules (393 → 176 lines in core)
- **STEP 3**: Created component layer (forms.css, buttons.css)
- **STEP 3.5**: Fixed broad .swse selectors in appv2-structural-safe.css
- **STEP 5**: Verified theme system using CSS variables
- **STEP 7**: Created this governance document

### Previous Architecture Issues
- ❌ 131 CSS files with 85 orphaned
- ❌ Broad `.swse-app-app` selectors affecting Foundry chrome
- ❌ Box-sizing applied globally to all buttons/inputs
- ❌ SCSS source files with no build pipeline
- ❌ V3 sheet architecture never integrated

### Current State
- ✅ 47 CSS files, all actively used
- ✅ Clean selector scoping with `.application.swse` pattern
- ✅ Structural safety enforced through appv2-structural-safe.css
- ✅ CSS variables system for theming
- ✅ Clear load order and layer isolation

---

## 12. References

- **Design System**: `styles/core/variables.css`
- **Foundry Docs**: https://foundryvtt.com/
- **CSS Variables**: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **AppV2 Pattern**: FoundryVTT v13+ documentation

---

**End of CSS Architecture Governance Document**

For questions or clarifications, contact the SWSE system maintainer.
