# SWSE Template Optimization Report
Generated: 2025-10-12 16:17:21

## Actions Performed

### 1. Backup Creation
- Location: C:\Users\Owner\Documents\GitHub\foundryvtt-swse\template_backups\20251012_161721
- Original templates backed up before any modifications

### 2. Removed Duplicate Files
- Consolidated character-sheet templates
- Removed .backup files (these should be handled by Git)

### 3. Created Partials Directory
- Location: templates/partials/
- Extracted common components:
  - ability-scores.hbs
  - defenses.hbs
  - tab-navigation.hbs

### 4. Standardized Structure
- Ensured consistent use of templates/actor/ directory
- Removed redundant templates/actors/ directory (if applicable)

## Recommendations for Further Optimization

### 1. Use Partials
Update your templates to use the new partials:

```handlebars
{!-- Instead of repeating ability scores markup --}
{> ability-scores}
```

### 2. Register Partials
In your system's JavaScript (e.g., swse.js), register partials:

```javascript
Hooks.once('init', function() {
  // Register partials
  loadTemplates([
    'systems/swse/templates/partials/ability-scores.hbs',
    'systems/swse/templates/partials/defenses.hbs',
    'systems/swse/templates/partials/tab-navigation.hbs'
  ]);
});
```

### 3. Consistent Naming
- Use .hbs extension for all Handlebars templates
- Use kebab-case for file names (e.g., character-sheet.hbs)

### 4. Template Organization
```
templates/
├── actor/
│   ├── character-sheet.hbs
│   ├── npc-sheet.hbs
│   ├── droid-sheet.hbs
│   └── vehicle-sheet.hbs
├── item/
│   └── item-sheet.hbs
├── apps/
│   ├── chargen.hbs
│   └── narrative-chargen.hbs
└── partials/
    ├── ability-scores.hbs
    ├── defenses.hbs
    └── tab-navigation.hbs
```

### 5. Future Improvements
- Consider creating more granular partials (e.g., skill-row, item-card)
- Implement a template inheritance system if needed
- Add template validation/linting
