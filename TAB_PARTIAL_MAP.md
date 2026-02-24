# Tab-Partial Map (Recommended Implementation)

## CHARACTER SHEET

| Tab | Primary Partial | Secondary Partials | Notes |
|-----|-----------------|-------------------|-------|
| overview | identity-strip.hbs | ability-scores.hbs, defenses.hbs, hp-condition-panel.hbs | Dashboard view |
| combat | attacks-panel.hbs | initiative-control.hbs, actions-panel.hbs, combat-action-table.hbs | Action-focused |
| skills | skills-panel.hbs | skill-actions-panel.hbs, skill-action-card.hbs | Read-only or interactive |
| talents | Talents.hbs | talent-abilities-panel.hbs, ability-card.hbs, xp-panel.hbs | Tree + abilities |
| feats | feat-actions-panel.hbs | ability-card.hbs, item-controls.hbs | Benefit display |
| force | Force.hbs | dark-side-panel.hbs, second-wind-panel.hbs | Power list + resources |
| gear | inventory-panel.hbs | inventory-weapon-card.hbs, inventory-armor-card.hbs, inventory-item-card.hbs | Item management |
| biography | persistent-header.hbs | ability-block.hbs, suggestion-card.hbs | Narrative content |
| other | crew-action-cards.hbs | suggestion-card.hbs, item-controls.hbs | Linked actors |

---

## DROID SHEET

| Tab | Primary Partial | Secondary Partials | Notes |
|-----|-----------------|-------------------|-------|
| overview | identity-strip.hbs | ability-scores.hbs, droid-systems-panel.hbs, hp-condition-panel.hbs | Status dashboard |
| combat | attacks-panel.hbs | actions-panel.hbs, combat-action-card.hbs, defenses.hbs | Weapon + maneuvers |
| skills | skills-panel.hbs | skill-action-card.hbs, feat-actions-panel.hbs | Programmed skills |
| talents | Talents.hbs | talent-abilities-panel.hbs, ability-card.hbs | Upgrade tree |
| abilities | abilities-panel.hbs | ability-card.hbs, ability-block.hbs | Core functions |
| systems | droid-systems-panel.hbs | droid-builder-budget.hbs, droid-build-history.hbs, inventory-panel.hbs | Hardpoints + budget |
| gear | inventory-panel.hbs | inventory-item-card.hbs, item-controls.hbs | Equipment slots |
| other | persistent-header.hbs | crew-action-cards.hbs, suggestion-card.hbs | Owner/creator info |

---

## NPC SHEET

| Tab | Primary Partial | Secondary Partials | Notes |
|-----|-----------------|-------------------|-------|
| overview | persistent-header.hbs | ability-scores.hbs, defenses.hbs, hp-condition-panel.hbs | Quick summary |
| combat | attacks-panel.hbs | combat-action-table.hbs, actions-panel.hbs, initiative-control.hbs | Battle-ready info |
| abilities | abilities-panel.hbs | ability-card.hbs, ability-block.hbs | Trait display |
| talents | Talents.hbs | talent-abilities-panel.hbs, ability-card.hbs | Talent benefits |
| stats | ability-scores.hbs | skill-row-static.hbs, defenses.hbs, defense-breakdown-tooltip.hbs | Math breakdown |
| force | Force.hbs | dark-side-panel.hbs, ability-card.hbs | Force powers (if any) |
| gear | inventory-panel.hbs | inventory-weapon-card.hbs, inventory-armor-card.hbs, inventory-item-card.hbs | Equipment list |
| systems | abilities-panel.hbs | ability-card.hbs, feat-actions-panel.hbs | Special mechanics |
| beast | abilities-panel.hbs | ability-card.hbs, skill-row-static.hbs | Creature traits |

---

## VEHICLE SHEET

| Tab | Primary Partial | Secondary Partials | Notes |
|-----|-----------------|-------------------|-------|
| overview | identity-panel.hbs | hp-condition-panel.hbs, defenses-panel.hbs, crew-panel.hbs | Status at a glance |
| systems | resource-cartridges.hbs | damage-threshold-panel.hbs, inventory-panel.hbs, item-controls.hbs | Upgrades + mods |
| weapons | attacks-panel.hbs | combat-action-table.hbs, inventory-weapon-card.hbs, item-controls.hbs | Firepower display |
| crew | crew-panel.hbs | crew-action-cards.hbs, skill-action-card.hbs, item-controls.hbs | Crew roster |

---

## SUGGESTED NEW TABS

### Character Sheet
**NEW: "Relationships" tab** (split from "other")
- **Primary:** crew-action-cards.hbs
- **Secondary:** suggestion-card.hbs, item-controls.hbs
- **Reason:** "Other" tab is too vague; relationships deserve own space
- **Alternative:** Keep "other" but rename to "Companions"

**OPTIONAL: "Resources" tab** (consolidate from multiple)
- **Primary:** xp-panel.hbs
- **Secondary:** second-wind-panel.hbs, dark-side-panel.hbs (if Force user)
- **Reason:** XP, second wind, destiny, force points all in one place

### Droid Sheet
**NEW: "Relationships" tab** (split from "other")
- **Primary:** crew-action-cards.hbs
- **Secondary:** suggestion-card.hbs
- **Reason:** Same as character sheet

**OPTIONAL: "Build Config" tab** (split from "systems")
- **Primary:** droid-builder-budget.hbs
- **Secondary:** droid-build-history.hbs, inventory-panel.hbs
- **Reason:** Heavy systems tab could benefit from dedicated builder UI

### NPC Sheet
**NEW: "Notes" tab** (if not in overview)
- **Primary:** persistent-header.hbs
- **Secondary:** suggestion-card.hbs, ability-block.hbs
- **Reason:** NPCs benefit from extensive DM notes

**OPTIONAL: "Relationships" tab**
- **Primary:** crew-action-cards.hbs
- **Secondary:** suggestion-card.hbs
- **Reason:** Link to allies, minions, patrons

### Vehicle Sheet
**NEW: "Cargo" tab** (split from "systems")
- **Primary:** inventory-panel.hbs
- **Secondary:** inventory-item-card.hbs, item-controls.hbs
- **Reason:** Cargo and upgrades are different concerns; clarity for both

**NEW: "Hangar" tab** (for vehicle groups)
- **Primary:** crew-action-cards.hbs (adapted for vehicles)
- **Secondary:** item-controls.hbs
- **Reason:** Support multi-vehicle management (fleets, wings)

---

## IMPLEMENTATION PRIORITY

### Must Have (Use These)
- ✅ All current tabs with suggested partials
- ✅ Identity/header partials on overview tabs
- ✅ Ability-card.hbs (most versatile)
- ✅ inventory-panel.hbs for gear/cargo
- ✅ attacks-panel.hbs for combat

### Should Have (Recommended)
- ⭐ Separate "Relationships" tab (Character + Droid + NPC)
- ⭐ Separate "Cargo" tab (Vehicle)
- ⭐ Rename "other" to "Companions" (clarity)

### Nice to Have (Optional)
- 💡 "Resources" tab consolidation (Character)
- 💡 "Build Config" tab (Droid)
- 💡 "Notes" tab (NPC)
- 💡 "Hangar" tab (Vehicle fleets)

---

## PARTIAL REUSABILITY MATRIX

```
ability-card.hbs         → 12+ tab combinations
inventory-panel.hbs      → 8+ tab combinations
attacks-panel.hbs        → 8+ tab combinations
ability-scores.hbs       → 7+ tab combinations
defenses.hbs             → 6+ tab combinations
item-controls.hbs        → 6+ tab combinations
abilities-panel.hbs      → 5+ tab combinations
persistent-header.hbs    → 5+ tab combinations
crew-action-cards.hbs    → 4+ tab combinations
suggestion-card.hbs      → 4+ tab combinations
hp-condition-panel.hbs   → 4+ tab combinations
actions-panel.hbs        → 4+ tab combinations
```

Most efficient: Use partials that appear 5+ times
