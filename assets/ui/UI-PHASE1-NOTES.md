# SWSE Holo SVG Integration — Phase 1 / Phase 2 / Phase 3 Notes

## Mounted shared primitives
- Page-frame shell treatment for character sheets and store surfaces
- Partial-frame treatment for common sheet panels, store cards, wallet/banner blocks, and placeholders
- Shared tab skin system on the V2 character sheet tab rail
- Shared button skin system across broad sheet/store controls
- Shared textbox treatment for sheet form fields and store search/filter/sort controls
- Shared divider/title treatment for section bars and store category bars
- Shared chip/badge treatment for tags, rarity, suggestion badges, and counts
- Shared empty-state framing for store empty states and sheet placeholder/empty regions
- Shared row highlight / selected-state overlays for sheet rows and store cards

## Phase 2 completed areas
- Character sheet shell/header/command-bar/tab language strengthened and spread to NPC/Droid V2 sheet shells
- Core overview and broad panel framing extended across HP, defenses, XP, resources, inventory, and dark-side wrappers
- Shared control-cluster styling added for action bars, store controls, and force-suite filters
- Inline styling removed from earlier panels where it had already become a maintenance problem

## Phase 3 mounted areas
- Dense sheet regions: feats, talents, languages, force suite, actions, attacks, gear, inventory rows/cards, and combat action surfaces
- Dense store regions: product cards, vehicle cards, droid cards, cart rows, purchase history, product grids, and operational shop rows
- New dense-region primitives added for card headers, card summaries, row surfaces, chip badges, info pills, and grouped control bars

## Files touched in the current rolling pass
- `styles/ui/swse-holo-phase1.css`
- `templates/actors/character/v2/partials/actions-panel.hbs`
- `templates/actors/character/v2/partials/attacks-panel.hbs`
- `templates/actors/character/v2/partials/feats-panel.hbs`
- `templates/actors/character/v2/partials/force-panel.hbs`
- `templates/actors/character/v2/partials/gear-panel.hbs`
- `templates/actors/character/v2/partials/languages-panel.hbs`
- `templates/actors/character/v2/partials/skills-panel.hbs`
- `templates/actors/character/v2/partials/talents-panel.hbs`
- `templates/actors/character/v2/partials/inventory-item-row.hbs`
- `templates/actors/character/v2/partials/inventory-item-card.hbs`
- `templates/actors/character/v2/partials/inventory-weapon-card.hbs`
- `templates/actors/character/v2/partials/inventory-armor-card.hbs`
- `templates/actors/character/v2/partials/combat-action-table.hbs`
- `templates/actors/character/v2/partials/combat-action-card.hbs`
- `templates/apps/store/store.hbs`
- `templates/apps/store/store-card-grid.hbs`
- `templates/apps/store/product-card-v2.hbs`
- `templates/apps/store/cart-item-v2.hbs`
- `templates/apps/store/droid-card-v2.hbs`
- `templates/apps/store/vehicle-card-v2.hbs`
- `templates/apps/store/purchase-history.hbs`
- `assets/ui/UI-PHASE1-NOTES.md`

## Deferred still
- Bespoke dark-side segmented tracker logic/states
- Specialized second-wind silhouette treatment
- Fully unique force-suite / starship / crew / droid tray systems beyond broad dense-panel mounting
- Store splash / vendor hero / chargen splash work
- Final cleanup/refit pass for exact spacing and system-specific alignment


## Phase 4-7 continuation
- Extended the shared holo layer into store operational shells, cart/history rows, and vehicle/droid storefront cards.
- Mounted specialized system wrappers for Force Suite, Starship Maneuvers, Crew Management, Droid Systems, progression selectors, and both droid builder surfaces.
- Applied splash/cinematic shell hooks to chargen and progression intro/splash surfaces so later refit can tune hero composition without rebuilding wrapper structure.
- Added cross-phase consistency styles for selected, warning, success, empty, and metric-chip states.
- Deferred precision fit/refactor work; this pass is intentionally mount-first and cleanup/refit should happen afterward.

## Fit and Finish Pass
- Normalized shell/header/tab/action spacing across sheet, store, chargen, and splash surfaces.
- Added responsive grid collapse rules for sheet overview, store controls, product rows/cards, and chargen body columns.
- Improved overflow/min-width handling on progression shell summary/work/details panels and common dense regions.
- Preserved mount-first styling while making later visual refit easier.


## Cleanup Round 2
- Tightened panel interior spacing and sticky section/tab headers so long sheet/store surfaces feel more anchored during scroll.
- Improved dense-card, row, badge, and control-cluster wrapping so content behaves better at narrower widths without immediate refit.
- Added a stronger native-feel pass to progression shell panels, detail sections, and card/list rows to reduce mounted-on styling seams before the final visual cleanup.

- Cleanup round 3: tuned dense row/card proportions, sticky header collisions, narrow-width action clustering, and progression shell panel/header behavior for a more native fit before any screen-specific polish.

- Cleanup round 4: mounted the remaining obvious unmapped shells in vehicle sheet, NPC combat sheet, GM store dashboard, and progression mentor/progress/utility surfaces so the broad holo language now reaches the last major operational screens.


## Card schema normalization
- Added four shared card schemas: `ability`, `identity`, `enumerated`, and `choice`.
- Added placeholder/pending/filled state modifiers so the same shell can represent empty slots, in-progress picks, and finalized records.
- Mounted the schema system into V2 sheet header/ability rows, feat/talent/language cards, inventory add slots, store product/cart cards, and chargen overview/identity/choice panels.
- Repeated regions now include visible add/choice cards so new entries can appear in the same family of card silhouettes instead of only being triggered from header buttons.

- Propagated the four-card schema into inventory cards, attack cards, force-tab entry rails, and action-group rows so more repeated renderers now use the same placeholder/filled language.


## Chargen quick-reference refit
- Species middle panel now renders as a compact quick-reference table: species name, size, and attribute adjustments only.
- Feat middle panel now renders name + prerequisite quick-reference rows while detailed rules remain in the right panel.
- Progression shell body panels were hardened so summary, middle body, and right details stay scrollable when content exceeds height.

## Completion pass
- propagated the 4-schema card system further into progression work surfaces:
  - class browser
  - background browser
  - language step
  - summary step
  - shell placeholders (summary/work/details)
- strengthened progression work-surface scrolling so middle-body browsing remains stable on long lists
- kept the implementation data-driven: existing choices populate pre-authored shells rather than generating unique SVG files per record

- Added a dedicated store splash flow patterned after the chargen/progression boot screen.
- New entry path is `SWSEStore.open(actor?)`, which shows the blocking store splash before rendering the live store app.
- Added `templates/apps/store/store-splash.hbs` and `scripts/apps/store/store-splash.js`.

- Store splash parity pass: added chargen-style skip/continue behavior, richer account metadata cards, keyboard handling, live clock cleanup, and centered splash launch flow.
