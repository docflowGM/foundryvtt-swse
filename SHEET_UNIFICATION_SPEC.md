# Sheet Structural Unification - V2 Compliance Spec

**Status**: In Progress
**Last Updated**: 2026-02-24

## Architecture Requirements (Non-Negotiable)

✅ ActorEngine is the ONLY mutation authority
✅ ModifierEngine is the ONLY modifier authority
✅ RollCore is the ONLY dice authority
✅ Sheets must NOT call actor.update directly
✅ Sheets must NOT compute derived values
✅ Sheets must NOT read settings
✅ All logic delegated to domain services
✅ No partial duplication
✅ No inline logic in HBS
✅ No domain logic in sheets

---

## CHARACTER Sheet Structure

### Tab Layout (Required)

1. **overview** → persistent-header + identity-strip + ability-scores + defenses + hp-condition-panel + initiative-control
2. **combat** → attacks-panel + actions-panel + combat-action-table
3. **skills** → skills-panel + skill-actions-panel
4. **talents** → Talents.hbs + Feats.hbs + talent-abilities-panel.hbs
5. **force** → Force.hbs + dark-side-panel.hbs (conditional: forceSensitive)
6. **gear** → inventory-panel.hbs
7. **relationships** → crew-action-cards.hbs
8. **notes** → ability-block.hbs + suggestion-card.hbs
9. **resources** → xp-panel.hbs (optional)

### Current Issues
- ❌ Duplicate "feats" tab (lines 133-134, 222-239)
- ❌ "other" tab instead of "relationships"
- ❌ Biography is separate; should consolidate to "notes"
- ❌ Missing "resources" tab for XP panel
- ❌ skills-panel missing skill-actions-panel
- ❌ talents tab is empty (missing talent-abilities-panel.hbs)

### Required Fixes
- Remove duplicate feats tab
- Consolidate biography into notes tab
- Create relationships tab with crew-action-cards
- Create resources tab with xp-panel
- Add skill-actions-panel to skills tab
- Add talent-abilities-panel.hbs to talents tab
- Move persistent-header to overview tab (phase it in)

---

## DROID Sheet Structure

### Tab Layout (Required)

1. **overview** → persistent-header + identity-strip + ability-scores + defenses + hp-condition-panel
2. **combat** → attacks-panel + actions-panel + defenses
3. **skills** → skills-panel
4. **talents** → Talents.hbs + talent-abilities-panel.hbs
5. **abilities** → abilities-panel.hbs
6. **systems** → droid-systems-panel + droid-builder-budget + droid-build-history
7. **gear** → inventory-panel.hbs
8. **relationships** → crew-action-cards.hbs
9. **notes** → suggestion-card.hbs

### Current Status
✅ Mostly compliant
- ⚠️ "other" tab may need renaming to "relationships"
- ❌ Missing "notes" tab

---

## NPC Sheet Structure

### Tab Layout (Required)

1. **overview** → persistent-header + identity-strip + ability-scores + defenses + hp-condition-panel
2. **combat** → attacks-panel + combat-action-table + actions-panel
3. **abilities** → abilities-panel.hbs
4. **talents** → Talents.hbs
5. **force** → Force.hbs (conditional: forceSensitive)
6. **systems** → abilities-panel.hbs (if isDroid)
7. **beast** → abilities-panel.hbs (if creatureType="beast")
8. **gear** → inventory-panel.hbs
9. **relationships** → crew-action-cards.hbs
10. **notes** → suggestion-card.hbs

### Current Status
✅ Mostly compliant
- ⚠️ "stats" tab may need consolidation
- ❌ Missing "relationships" and "notes" tabs
- ⚠️ Empty tabs (talents, force, gear) need population

---

## Button Wiring Audit

### Required Actions
All buttons must use `data-action` attributes and route through:
- **Mutation**: ActorEngine.apply()
- **Dice**: RollCore methods
- **Items**: InventoryEngine methods
- **Abilities**: AbilityEngine methods
- **Modifiers**: ModifierEngine methods

### Add/Edit/Remove Patterns

**Feats/Talents:**
- Add → opens item dialog OR freebuilder
- Edit → opens item sheet
- Remove → ActorEngine.removeItem()
- Use/Activate → RollCore.outputToChat()

**Gear/Weapons/Armor:**
- Add → opens item creation
- Edit → opens item sheet
- Remove → ActorEngine.removeItem()
- Equip/Unequip → InventoryEngine.toggleEquip()
- Sell → EconomyService (if exists)

**Skills/Attributes:**
- Click → RollCore.rollSkill() or RollCore.rollAbility()
- Edit → _updateObject() form handling only

---

## Character Generator Integration

For species/class/talent selection:

**Option A: Manual**
→ FreeBuilder interface
→ Creates custom entry
→ ActorEngine.apply() handles mutation

**Option B: Selection Dialog**
→ Opens CharacterGeneratorApp
→ On completion, returns mutationPlan
→ ActorEngine.apply() handles mutation

Sheet MUST NOT apply data directly.

---

## Form Field Handling

All editable fields MUST:
- Use proper `name` attributes
- Be submitted via _updateObject()
- NOT mutate outside Foundry form handling
- Work with data-dtype for proper casting

---

## Partial Reference Standards

When including a partial, always use full system path:

```handlebars
{{> "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs"}}
```

Never use relative paths:
```handlebars
<!-- ❌ WRONG -->
{{> ./identity-strip.hbs}}
```

---

## Tab Navigation Implementation

Each sheet class MUST define:

```javascript
static TAB_MAP = {
  overview: "overview",
  combat: "combat",
  skills: "skills",
  talents: "talents",
  force: "force",
  gear: "gear",
  relationships: "relationships",
  notes: "notes",
  resources: "resources"
};
```

Map canonical names to local tab IDs for consistency.

---

## Validation Checklist

### Before Commit

- [ ] No duplicate partials in any template
- [ ] No inline business logic in HBS
- [ ] All buttons have `data-action` attributes
- [ ] All mutations route through ActorEngine
- [ ] All dice rolls route through RollCore
- [ ] All item operations route through InventoryEngine
- [ ] Form fields use proper name attributes
- [ ] TAB_MAP defined in all sheet classes
- [ ] Conditional tabs work correctly
- [ ] Drop zones properly configured
- [ ] No direct actor.update() calls
- [ ] All partials use full system paths
- [ ] Character-specific partials not in droid/npc sheets
- [ ] Droid-specific partials not in character/npc sheets

---

## Implementation Priority

1. **Character Sheet** - Remove duplicates, add missing tabs
2. **Droid Sheet** - Add missing notes tab
3. **NPC Sheet** - Add missing relationships/notes tabs
4. **Button Wiring** - Audit and fix all action handlers
5. **Tab Navigation** - Ensure TAB_MAP consistency
6. **Drop Handling** - Verify DropResolutionEngine integration

---

## Reference Documents

- V2 COMPLIANT directive (user provided)
- ActorEngine: governance/actor-engine/actor-engine.js
- DropResolutionEngine: engines/interactions/drop-resolution-engine.js
- ModifierEngine: engines/effects/modifiers/ModifierEngine.js
- RollCore: (to be located)
