# Class Phase 6F-9 — Shaper Lore

**Date:** 2026-11-03  
**Base:** merged main at `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f9-shaper-lore`  
**Status:** implementation pushed; exact-head CI and live Foundry v13 tests are separate gates.

## Printed source

*Legacy Era Campaign Guide*, Shaper prestige class, **Shaper Lore**: when making Knowledge (Life Sciences) or Treat Injury checks concerning biotech devices, gain a bonus equal to **one-half the Shaper class level (rounded down)**, irrespective of device size or complexity. The class progression is +1 at Shaper 2, +2 at 4, +3 at 6, +4 at 8, +5 at 10.

This is not a passive bonus to every Knowledge or Treat Injury check. The type of object is situational and must be known from the actual task.

## Implementation

- `scripts/engine/skills/class-shaper-lore.js`: pure eligibility and bonus authority, derived only from a genuinely owned Shaper class Item, not character level, species, a feat or an item name. Accepts Knowledge (Life Sciences) and Treat Injury aliases.
- `scripts/rolls/skills.js`: adds the proper bonus to the existing `RollCore.execute()` skill roll when `options.biotechDevice === true`, and includes clear feature-source evidence in the chat flavor, skill flags, and class situational line. Other skills and ordinary non-biotech checks remain unchanged.
- `scripts/rolls/roll-config.js`: when an eligible Shaper opens the relevant skill dialog, shows a **Biotech device** checkbox with the exact class bonus and a note that this is GM-adjudicated. Defaults to unchecked. The same pure helper updates the live preview, and the committed checkbox value travels to the roll execution.
- `tests/class-phase-6f9-shaper-lore.test.mjs`: executable bonus schedule tests and wiring regressions for the skill roll and dialog.

## Guardrails

- No new permanent derived-skill bonus is stored. A biotech device context is required for **each check**; the bonus is not granted just for being a Shaper or having biotech equipment.
- No new action economy, skill feat, or equipment hook authority is introduced. The original skill roll and its standard proficiency/training restrictions remain in force.
- Direct call sites using `rollSkill(actor,skillKey)` without explicitly passing `biotechDevice:true` do not gain an unproven situational bonus. Where a UI caller does not open the Roll Config dialog, GM or user code must explicitly supply the biotech context; such callers warrant further coverage review.
- Class lore and grants are isolated to this feature; no compendium/class Item record is rewritten.
- Live Foundry v13 skill check UI, skill result card display, direct macros, skill aliases, Take 10/20, and total arithmetic need runtime verification before merging.
