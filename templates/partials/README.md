# Template Partials

Reusable Handlebars components for SWSE character sheets.

## Usage

Include partials in your templates:

```handlebars
{{> ability-scores}}
{{> defenses defenses=system.defenses}}
{{> skill-row}}
{{> item-controls}}
```

## Registration

These partials are automatically loaded via `preloadHandlebarsTemplates()` in `scripts/load-templates.js`.

## Available Partials

- **ability-scores.hbs**: Full ability scores section with base/racial/modifier/temp inputs
- **defenses.hbs**: Defense calculation rows (Fortitude/Reflex/Will)
- **skill-row.hbs**: Individual skill row for skills list
- **item-controls.hbs**: Standard edit/delete buttons for items

## Best Practices

1. Keep partials focused on a single component
2. Use descriptive parameter names
3. Document expected context variables in comments
4. Test partials with missing/undefined values
