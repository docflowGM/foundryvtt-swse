# SWSE Holo SVG Kit

This pack contains 44 SVG assets designed to match the blue holo / datapad language discussed for chargen, sheets, store, droids, and starship UIs.

## Structure
- `general/` core sheet and chargen regions
- `specialized/` force, starship, crew, droid systems
- `shapes/` buttons, pills, frames, icons, text boxes

## Suggested mappings to repo partials
- `general/attributes-panel.svg` → `templates/partials/ability-scores.hbs`
- `general/skills-panel.svg` → `templates/partials/skill-row-static.hbs`, `templates/partials/skill-actions-panel.hbs`
- `general/weapons-panel.svg` → `templates/actors/npc/npc-weapon-block.hbs`, weapon/inventory sheet regions
- `general/tabs-bar.svg` → `templates/partials/tab-navigation.hbs`
- `general/actions-table.svg` → `templates/ui/action-palette.hbs`, `templates/partials/feat-actions-panel.hbs`
- `general/talent-table.svg` → `templates/partials/talent-abilities-panel.hbs`
- `specialized/force-suite-hand.svg` + `specialized/force-power-card.svg` → force suite / force deck UI
- `specialized/starship-maneuvers-hand.svg` → `templates/partials/starship-maneuvers-panel.hbs`
- `specialized/crew-positions-panel.svg` → `templates/partials/crew-action-cards.hbs`
- `specialized/droid-systems-panel.svg` → droid sheet and droid builder views
- `general/store-panel.svg` + `general/filter-sort-search-bar.svg` → store app/card grid
- `general/chargen-shell-frame.svg` → progression framework shell / visual planning

## Notes
- These are starter frames and components, not final production wires.
- They are intentionally self-contained SVGs so you can slice, inline, or use as backgrounds.
- You do **not** need one unique SVG for every partial. Reuse `partial-frame.svg`, `text-box.svg`, button variants, pills, and a few specialized panels across many partials.
