# UI De-texting Notes

This set removes baked-in readable SVG text so the assets can be used as reusable Foundry UI frames with HTML/CSS text layered on top.

## What was removed

- SVG `<text>` elements containing readable labels, placeholder values, tab names, button text, and example content.
- Numeric placeholder values embedded as text.

## What was preserved

- Frame geometry
- Holo glows and decorative lines
- Boxes, rows, pips, bands, and segmentation
- Icons and non-text ornamental shapes

## Files modified

- `general/attributes-panel.svg` — removed 19 text node(s)
- `general/skills-panel.svg` — removed 38 text node(s)
- `general/weapons-panel.svg` — removed 10 text node(s)
- `general/armor-panel.svg` — removed 22 text node(s)
- `general/profile-picture-frame.svg` — removed 2 text node(s)
- `general/biography-panel.svg` — removed 4 text node(s)
- `general/tabs-bar.svg` — removed 6 text node(s)
- `general/hp-meter.svg` — removed 3 text node(s)
- `general/xp-meter.svg` — removed 3 text node(s)
- `general/shield-rating-meter.svg` — removed 3 text node(s)
- `general/damage-resistance-pill.svg` — removed 3 text node(s)
- `general/force-points-dots.svg` — removed 2 text node(s)
- `general/second-wind-panel.svg` — removed 7 text node(s)
- `general/damage-threshold-meter.svg` — removed 3 text node(s)
- `general/feat-table.svg` — removed 23 text node(s)
- `general/talent-table.svg` — removed 20 text node(s)
- `general/actions-table.svg` — removed 26 text node(s)
- `general/extra-skill-uses-panel.svg` — removed 14 text node(s)
- `general/favorite-star.svg` — removed 1 text node(s)
- `general/filter-sort-search-bar.svg` — removed 5 text node(s)
- `general/dark-side-score-tracker.svg` — removed 9 text node(s)
- `general/inventory-panel.svg` — removed 30 text node(s)
- `general/store-panel.svg` — removed 10 text node(s)
- `general/chargen-shell-frame.svg` — removed 4 text node(s)
- `specialized/force-suite-hand.svg` — removed 14 text node(s)
- `specialized/force-suite-discard.svg` — removed 3 text node(s)
- `specialized/force-power-card.svg` — removed 6 text node(s)
- `specialized/starship-maneuvers-hand.svg` — removed 9 text node(s)
- `specialized/crew-positions-panel.svg` — removed 13 text node(s)
- `specialized/droid-systems-panel.svg` — removed 9 text node(s)
- `shapes/button-big.svg` — removed 1 text node(s)
- `shapes/button-small.svg` — removed 1 text node(s)
- `shapes/pill-vertical.svg` — removed 1 text node(s)
- `shapes/pill-horizontal.svg` — removed 1 text node(s)
- `shapes/pill-oblique-right.svg` — removed 1 text node(s)
- `shapes/pill-oblique-left.svg` — removed 1 text node(s)
- `shapes/page-frame.svg` — removed 1 text node(s)
- `shapes/partial-frame.svg` — removed 1 text node(s)
- `shapes/text-box.svg` — removed 1 text node(s)
- `shapes/text-box-small.svg` — removed 1 text node(s)

## Notes

- This pass only removed editable SVG text nodes.
- If any file still contains readable lettering converted into vector paths, it would require manual art cleanup. I did not detect that pattern in this kit during the automated pass.
