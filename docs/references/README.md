# Star Wars Saga Edition System for Foundry VTT

A complete implementation of the Star Wars Saga Edition ruleset for Foundry VTT, featuring automated character generation, comprehensive combat mechanics, Force powers, vehicles, and extensive game rules.

**Version:** 1.2.0
**Foundry Compatibility:** v13+ (CSS Layers future-proof for v14+)
**License:** MIT

---

## Getting Started

### Installation

1. In Foundry VTT, go to **Add-on Modules** → **Install System**
2. Search for **Star Wars Saga Edition**
3. Click **Install**

### First-Time Setup

- **Create a Character:** Use the Character Generator tool (built-in)
- **Import Content:** All content packs load automatically
- **Customize:** Check Settings for house rules and compatibility options

---

## Features

### Core Gameplay

- ✅ Full character sheet (v2 Application framework)
- ✅ Automated character generation (8-step wizard)
- ✅ Combat system with actions, maneuvers, and tactics
- ✅ Force power system with talent trees
- ✅ Vehicle combat (starships, speeders, walkers)
- ✅ Extensive skill system with contextual bonuses

### Developer Features

- ✅ ESLint with v13+ compatibility rules
- ✅ Pre-commit hooks (prevent bad code)
- ✅ Icon system (centralized, frozen constants)
- ✅ Comprehensive CONTRIBUTING.md
- ✅ UI Invariants documentation
- ✅ v14 Readiness checklist

---

## Contributing

**Read CONTRIBUTING.md first.** It documents the 6 critical UI Invariants that keep the system stable.

### Quick Start for Contributors

```bash
# Install dependencies
npm install

# Run linter (enforces v13+ rules)
npm run lint
npm run lint:fix

# Format code
npm run format

# Validate mentor dialogues
npm run validate:mentor-dialogue

# Run tests
npm run test
```

### UI Invariants (Critical)

These rules prevent silent failures in Foundry v13+. See **CONTRIBUTING.md** for details:

1. ❌ **No jQuery** – Use standard DOM APIs (`querySelector`, `addEventListener`, etc.)
2. ❌ **No `.element[0]`** – Use `this.element` directly
3. ❌ **No CSS transforms on critical containers** – Use CSS containment
4. ✅ **All icons from `ICONS` constant** – Use `{{getIconClass 'iconName'}}`
5. ✅ **Character sheet template validation** – Constructor checks template path
6. ✅ **CharGen render assertions** – Catches missing content early

### Icon System

All FontAwesome icons come from `scripts/utils/icon-constants.js`:

**In Templates:**

```handlebars
<i class='{{getIconClass "success"}}'></i>
<button><i class='{{getIconClass "delete"}}'></i> Delete</button>
```

**In JavaScript:**

```javascript
import { createIcon, applyIcon, ICONS } from '../../scripts/utils/icon-constants.js';

const icon = createIcon('warning');
container.appendChild(icon);
```

**To Add New Icons:**

1. Add to `ICONS` constant
2. Use in templates/code
3. Pre-commit hook validates immediately

---

## Code Quality

### Linting & Pre-Commit

Pre-commit hooks run automatically:

- **ESLint** checks for jQuery patterns, deprecated DOM access
- **Icon Validator** ensures `{{getIconClass}}` uses valid keys
- **Prettier** formats code

If a commit is rejected:

```bash
npm run lint:fix  # Fix auto-fixable issues
npm run format    # Reformat code
git add .
git commit -m "fix: ..."
```

### GitHub Actions

CI runs on every PR:

- ✅ ESLint validation
- ✅ Code formatting checks
- ✅ Icon key validation
- ✅ Unit tests
- ✅ Mentor dialogue validation

---

## Architecture

### Key Files

```
scripts/
├── sheets/v2/           # Character sheets (V2 Application)
├── apps/chargen/        # Character generator
├── utils/icon-constants.js  # Centralized icon map (frozen)
├── core/config.js       # System configuration
└── validate/            # Runtime validators

templates/
├── actors/              # Sheet templates
├── apps/                # Dialog templates
└── partials/            # Reusable components

styles/
├── core/                # Base styles + v13 rules
└── themes/              # Holo, High Contrast, etc.

docs/
├── UI-INVARIANTS.md     # Critical rules for code
├── V14_READINESS.md     # v14 migration plan
└── CONTRIBUTING.md      # Developer guidelines
```

### Technology Stack

- **Framework:** Foundry VTT v13+ (Application V2)
- **Templating:** Handlebars
- **Styling:** SCSS → CSS (with CSS Layers)
- **Icons:** FontAwesome v6 (centralized constants)
- **Build:** Node.js (npm scripts)

---

## Foundry Version Support

| Version | Status         | Notes                                       |
| ------- | -------------- | ------------------------------------------- |
| v12     | ⚠️ Deprecated  | Use system v1.1.x                           |
| v13     | ✅ **Current** | Fully supported, v13+ guarantees tested     |
| v14+    | 🚀 Planned     | CSS Layers ready, migration path documented |

See **docs/V14_READINESS.md** for v14 migration checklist.

---

## Troubleshooting

### Blank Character Sheet

The sheet uses HandlebarsApplicationMixin + template validation. If you see a blank sheet:

1. Check browser console (F12) for errors
2. Verify `DEFAULT_OPTIONS.template` is set
3. Ensure template file exists

The constructor throws immediately if the template path is missing.

### Missing Icons

Icons should display as FA v6 glyphs. If you see a "?" or placeholder:

1. Check that `{{getIconClass}}` is used in templates
2. Verify the icon key exists in `scripts/utils/icon-constants.js`
3. Pre-commit hooks prevent unknown keys from being committed

### CharGen Not Rendering

CharGen has render assertions that log warnings for empty steps. If a step is blank:

1. Check browser console for `[SWSE CharGen] Step ... rendered no content`
2. Verify template path is correct
3. Check that selectors match template IDs

---

## Performance

### Optimizations

- ✅ Lazy loading for large compendiums
- ✅ CSS containment for layout performance
- ✅ Frozen icon constants (no runtime mutation)
- ✅ Template preloading for CharGen

### Monitoring

Enable **Dev Mode** to get extra guardrails:

- jQuery pattern warnings
- Render depth assertions
- Template resolution checks

---

## Resources

- **Official Docs:** https://foundryvtt.wiki
- **System Issues:** GitHub Issues
- **Contributing:** See **CONTRIBUTING.md**
- **UI Invariants:** See **docs/UI-INVARIANTS.md**
- **v14 Readiness:** See **docs/V14_READINESS.md**

---

## License

Star Wars Saga Edition System for Foundry VTT is licensed under the MIT License.

The Star Wars Saga Edition ruleset is copyright Wizards of the Coast.

---

**Last Updated:** 2026-02-04
**Maintained By:** Community Contributors
**Status:** Actively Maintained for Foundry v13+
