# Feat Category Restick Fix

This patch fixes a category contamination bug where `non-force` metadata tags were treated as positive Force evidence. That caused broad legal feat pools to aggregate under the Force category.

## Fixes

- `non-force` is no longer interpreted as `force`.
- Feat browse categories now resolve in this order:
  1. explicit non-general feat type
  2. canonical metadata feat type
  3. positive force/species/droid/faction/destiny heuristics
  4. weapon/armor proficiency
  5. skill
  6. combat
  7. general/uncategorized fallback
- Legal-only and Show All modes now use the same hydrated feat records with explicit availability flags.
- Show All mode can display unavailable feats as locked/faded while still allowing focus/details.
- Commit is blocked for unavailable feats.
- Details rail now receives availability, missing prerequisite, blocker, owned/granted, and short-summary fields.
- Category groups use a stable display order instead of whatever order the registry emitted.

## Validation

Local normalization of `packs/feats.db` after this patch produced a spread across Combat, Weapon & Armor, Force, Skill, Species, Droid/Cybernetics, Faction, Team, General, and Destiny/Story instead of collapsing into Force.
