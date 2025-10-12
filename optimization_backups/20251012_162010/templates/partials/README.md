# Template Partials

This directory contains reusable Handlebars partial templates.

## Usage

In your templates, use partials like this:

```handlebars
{{> ability-scores}}
{{> defenses}}
{{> tab-navigation}}
```

## Available Partials

- **ability-scores.hbs**: Standard ability scores section
- **defenses.hbs**: Fortitude/Reflex/Will defense calculations
- **tab-navigation.hbs**: Standard tab navigation for character sheets

## Creating New Partials

When you notice repeated template code, extract it into a partial:

1. Create a new .hbs file in this directory
2. Move the common code into the partial
3. Replace the original code with `{{> partial-name}}`
4. Register the partial in your system's init hook if needed
