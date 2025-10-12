# SWSE System Optimization Report
Generated: 2025-10-12 16:20:10
Repository: C:\Users\Owner\Documents\GitHub\foundryvtt-swse
Backup Location: C:\Users\Owner\Documents\GitHub\foundryvtt-swse\optimization_backups\20251012_162010

## Summary

### Changes Made (4)
- Created partial: templates/partials/ability-scores.hbs
- Created partial: templates/partials/defenses.hbs
- Created partial: templates/partials/skill-row.hbs
- Created partial: templates/partials/item-controls.hbs

### Warnings (1)

⚠ DUPLICATE ENTRY POINT: Both index.js and swse.js exist, but only index.js is used.
  Recommendation: Remove or rename swse.js to avoid confusion.


## Optimization Recommendations

### 1. Entry Point Consolidation
Your system currently has both `index.js` and `swse.js`. Based on system.json:
- **Active entry point**: index.js (declared in esmodules)
- **Recommendation**: Remove or rename swse.js to avoid confusion, or consolidate functionality

### 2. Template Partial Usage
Template partials have been created in `templates/partials/`. To use them:

```handlebars
{{!-- In your character sheet template --}}
<section class="ability-scores-section">
    <h3>Ability Scores</h3>
    {{> ability-scores}}
</section>

<section class="defenses-section">
    <h3>Defenses</h3>
    {{> defenses defenses=system.defenses}}
</section>
```

### 3. Template Loader Registration
Update `scripts/load-templates.js` to include partials:

```javascript
export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([
    // Existing templates...
    
    // Partials
    'systems/swse/templates/partials/ability-scores.hbs',
    'systems/swse/templates/partials/defenses.hbs',
    'systems/swse/templates/partials/skill-row.hbs',
    'systems/swse/templates/partials/item-controls.hbs'
  ]);
};
```

### 4. Directory Structure (Recommended)
```
foundryvtt-swse/
├── index.js                    # Main entry point (keep)
├── config.js                   # System configuration (keep)
├── system.json                 # Foundry manifest (PROTECTED)
├── template.json               # Data model (PROTECTED)
├── scripts/
│   ├── swse-actor.js
│   ├── swse-item.js
│   ├── load-templates.js
│   └── ...
├── templates/
│   ├── actor/
│   │   ├── character-sheet.hbs   # Primary character sheet
│   │   ├── npc-sheet.hbs
│   │   ├── droid-sheet.hbs
│   │   └── vehicle-sheet.hbs
│   ├── item/
│   │   └── item-sheet.hbs
│   ├── apps/
│   │   └── chargen.hbs
│   └── partials/               # NEW: Reusable components
│       ├── ability-scores.hbs
│       ├── defenses.hbs
│       ├── skill-row.hbs
│       └── item-controls.hbs
└── styles/
    └── ...
```

### 5. Git Workflow
After reviewing changes:

```bash
# Review all changes
git status
git diff

# Stage specific files (don't commit backups)
git add templates/
git add scripts/load-templates.js

# Commit
git commit -m "Optimize templates and create reusable partials"

# DO NOT commit backup files or swse.js unless you're sure
```

### 6. Testing Checklist
Before deploying to Forge:

- [ ] Character sheet loads correctly
- [ ] All tabs function (Skills, Feats, Talents, etc.)
- [ ] Ability scores display and update
- [ ] Defenses calculate properly
- [ ] Items can be added/edited/deleted
- [ ] No console errors
- [ ] All partials render correctly

### 7. Forge Deployment
system.json is protected and unchanged - safe to deploy to Forge.

Version: {self._get_system_version()}
Entry Point: index.js ✓

