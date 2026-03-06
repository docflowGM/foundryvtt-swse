# RULE System Migration Guide

**Status**: Phase 4E - Content Validation
**Last Updated**: 2026-03-05
**Session**: claude/swse-v13-rule-phase-mOf20

---

## Executive Summary

RULE tokens are **behavioral switches only** — binary capability flags that block or enable mechanics without numeric modification, duration, or condition gating.

This document captures learned constraints, governance principles, and migration patterns from the first real-content validation (Uncanny Dodge II → CANNOT_BE_FLANKED).

---

## What is a RULE?

A RULE is a frozen, boolean token attached to an actor at prepare time that represents a **static capability or negation**.

### Valid RULE Use Cases
- **Immunities**: Immune to condition X (fear, poison, disease, etc.)
- **Negations**: Cannot be affected by X (flanked, surprised, flat-footed)
- **Senses**: Has capability X (darkvision, blindsense, etc.)
- **Permissions** (param-scoped): Can use skill X even if untrained

### Invalid RULE Use Cases
- **Numeric modifications**: +1 to attack (use MODIFIER instead)
- **Conditional gating**: "When you do X, gain Y" (use ACTIVE)
- **Skill substitution**: "Use UtF in place of Knowledge" (use ACTIVE)
- **Duration-based effects**: Lasts N rounds (use Active Effect)
- **Stacking mechanics**: "Stack with other bonuses" (use MODIFIER)

---

## Governance: Enums Exist Without Integration

**KEY PRINCIPLE**: Defining a RULE enum is cheap. Integrating it into resolution sites is the real work.

When you add a RULE enum to `rule-enum.js` and `rule-definitions.js`:
- ✓ You can immediately migrate content to use it
- ✓ Validation will accept it
- ✓ RuleCollector will aggregate it
- ✓ ResolutionContext can query it
- ✗ It won't actually *do* anything until a resolution site checks it

This prevents mid-flight enum discovery during content migration. Define generously at the start; integrate deliberately when ready.

**Example**: EVASION and IMPROVED_EVASION are defined but not yet integrated into damage resolution. That's fine. When you later wire them, they're ready.

---

## Complete RULES Enum (41 total)

Defined but not all integrated yet.

### Status & Effect Immunities (19)
- IMMUNE_FEAR
- IMMUNE_POISON
- IMMUNE_DISEASE
- IMMUNE_RADIATION
- IMMUNE_MIND_AFFECTING
- IMMUNE_SLEEP
- IMMUNE_PARALYSIS
- IMMUNE_STUN
- IMMUNE_DAZE
- IMMUNE_NAUSEA
- IMMUNE_SICKENED
- IMMUNE_FATIGUE
- IMMUNE_EXHAUSTION
- IMMUNE_BLEED
- IMMUNE_BLINDNESS
- IMMUNE_DEAFNESS
- IMMUNE_DEATH_EFFECTS
- IMMUNE_CRITICAL_HITS
- IMMUNE_PRECISION_DAMAGE

### Senses & Detection (8)
- DARKVISION
- LOW_LIGHT_VISION
- BLINDSENSE
- BLINDSIGHT
- TREMORSENSE
- SCENT
- SEE_INVISIBLE
- TRUE_SIGHT

### Combat Targeting & Position (8)
- IGNORE_COVER
- IGNORE_CONCEALMENT
- IGNORE_TOTAL_CONCEALMENT
- CANNOT_BE_FLANKED ✓ *integrated*
- CANNOT_BE_SURPRISED
- RETAINS_DEX_TO_REFLEX_WHEN_FLAT_FOOTED
- IMMUNE_FLAT_FOOTED

### Opportunity & Provocation (2)
- DOES_NOT_PROVOKE_AOO
- IMMUNE_AOO

### Skill Permission (Param Rules, 2)
- TREAT_SKILL_AS_TRAINED (params: {skillId})
- ALLOW_UNTRAINED_USE (params: {skillId})

### Area Effect Mitigation (2)
- EVASION
- IMPROVED_EVASION

---

## Migration Pattern

### Step 1: Validate Content Fit

Ask: Does this talent/feat fit the RULE model?

**✓ YES if:**
- "Immune to X" or "Cannot be X'd"
- "Gains sense X"
- "Is considered trained in skill X" (true training flag, not substitution)
- No conditions, no contextual gating

**✗ NO if:**
- "When you do X, gain Y"
- "Substitute skill A for skill B"
- "Gain +5 to attack"
- "Lasts N rounds"

### Step 2: Prepare Talent Metadata

Update the talent in `packs/talents.db`:

```json
{
  "name": "Talent Name",
  "type": "talent",
  "system": {
    "executionModel": "PASSIVE",
    "subType": "RULE",
    "abilityMeta": {
      "rules": [
        {
          "type": "RULE_TYPE_NAME",
          "description": "Human-readable description"
        }
      ]
    }
  },
  "effects": []  // Remove old Active Effects
}
```

### Step 3: Validate with isValidRule()

```javascript
import { isValidRule } from "./rule-enum.js";

if (!isValidRule(rule.type)) {
  throw new Error(`Invalid rule: ${rule.type}`);
}
```

### Step 4: Test End-to-End

1. Load talent → PassiveAdapter → RuleCollector
2. Verify frozen _ruleSet contains rule
3. Confirm ResolutionContext can query it
4. Test removal scenario (rule cleared on talent deletion)

### Step 5: Smoke Test Combat Behavior

Verify the rule *blocks* the intended mechanic correctly (or *enables* if it's a sense/permission).

---

## Uncanny Dodge II: Reference Implementation

**Talent**: Uncanny Dodge II
**Rule**: CANNOT_BE_FLANKED
**Status**: ✓ Migrated and validated

### Changes Made
- Added `executionModel: "PASSIVE"` to system
- Added `subType: "RULE"` to system
- Moved logic to `abilityMeta.rules[0]` with type CANNOT_BE_FLANKED
- Removed old Active Effect (system.flanking.immunity)
- Rule now processed through RuleCollector during prepare

### Integration Point
- **Location**: `scripts/combat/utils/combat-utils.js::getFlankingBonus()`
- **Query**: `context.hasRule(RULES.CANNOT_BE_FLANKED)`
- **Effect**: Returns 0 if rule present, else normal +2 bonus

### Validation Results
- ✓ End-to-end: Rule flows through RuleCollector → frozen _ruleSet
- ✓ Combat: Flanking bonus blocked (2 → 0)
- ✓ Removal: Rule cleared on talent deletion
- ✓ Reload: Rule persists across prepare cycles
- ✓ Backward compatible: Legacy code without context still works

---

## Content Candidates for Next Migration

### Ready (Enum-Complete)
These map cleanly to existing enums with no context gating:

- **Fortified Body**: IMMUNE_POISON + IMMUNE_DISEASE + IMMUNE_RADIATION
  - *(All three enums exist; unconditional immunities)*

- **Indomitable (class feature)**: IMMUNE_MIND_AFFECTING
  - *(Enum exists; likely unconditional)*

- **"[Jedi Master PL1]"** (if present): IMMUNE_FEAR
  - *(Enum exists; typical class feature immunity)*

### Deferred (Requires ACTIVE or Enum Expansion)
- **Insight of the Force**: Skill substitution logic (not RULE-eligible)
- **Scholarly Knowledge**: Need to clarify if training or substitution
- **Drain Knowledge**: Need to check context gating
- **Boarder**: Check if IGNORE_COVER is unconditional or action-specific
- **Curved Throw**: Check if IGNORE_COVER has conditions

---

## Key Learned Constraints

### Constraint 1: RULE Blocks, Not Grants
A RULE prevents something from happening or declares a static capability. It doesn't grant:
- Bonus dice
- Numeric modifiers
- Conditional actions
- Optional mechanics

**Wrong**: "Gain extra attack"
**Right**: "Retain Dex to Reflex when flat-footed"

### Constraint 2: No Conditions Inside RULE
A RULE is a boolean token. Conditions belong in ACTIVE or the resolution site.

**Wrong**:
```json
{
  "type": "IMMUNE_POISON",
  "onlyAgainst": "organic"  // NO
}
```

**Right**: Define IMMUNE_POISON unconditionally; let resolution site check context if needed.

### Constraint 3: Skill Rules Are Permission Tokens, Not Substitution
TREAT_SKILL_AS_TRAINED marks a skill as trained for training checks. It doesn't enable skill substitution.

**RULE-eligible**:
- "You are considered trained in Pilot"
- "You can use Stealth even if untrained"

**NOT RULE-eligible**:
- "Use UtF instead of Knowledge"
- "Substitute Deception for Persuasion"

### Constraint 4: Param Rules Must Not Gate Context
The only params allowed are for **scoping a permission to a specific resource** (skillId, weaponGroup, etc.), not for adding conditions.

**Right**: `TREAT_SKILL_AS_TRAINED { skillId: "pilot" }`
**Wrong**: `IMMUNE_POISON { onlyAgainst: "humanoid" }` (that's a condition)

### Constraint 5: Enum Density Matters
Each enum added multiplies the validation surface. Keep the enum lean but complete.

**Principle**: Better to define 41 unused enums now than to discover #42 mid-migration.

---

## Integration Checklist

Before migrating content to a new RULE type:

- [ ] Enum already defined in `rule-enum.js`?
- [ ] Definition added to `rule-definitions.js`?
- [ ] Validator accepts it? (via `isValidRule()`)
- [ ] Resolution site ready (or deferred knowingly)?
- [ ] End-to-end test passes (load → collect → query)?
- [ ] Combat/mechanic smoke test passes?
- [ ] Documented in next section below?

---

## Current Integration Status

| Rule | Enum | Defined | Integrated | Tested |
|------|------|---------|-----------|--------|
| IMMUNE_FEAR | ✓ | ✓ | – | – |
| IMMUNE_POISON | ✓ | ✓ | – | – |
| IMMUNE_DISEASE | ✓ | ✓ | – | – |
| IMMUNE_RADIATION | ✓ | ✓ | – | – |
| IMMUNE_MIND_AFFECTING | ✓ | ✓ | – | – |
| CANNOT_BE_FLANKED | ✓ | ✓ | ✓ | ✓ |
| TREAT_SKILL_AS_TRAINED | ✓ | ✓ | – | – |
| *(others)* | ✓ | ✓ | – | – |

- Enum = in rule-enum.js
- Defined = in rule-definitions.js
- Integrated = resolution site checks it
- Tested = validation + smoke test passed

---

## Talent Data Example

**Before** (Active Effect):
```json
{
  "name": "Uncanny Dodge II",
  "type": "talent",
  "system": {
    "benefit": "Cannot be flanked.",
    "description": "You cannot be flanked."
  },
  "effects": [
    {
      "changes": [
        { "key": "system.flanking.immunity", "mode": 5, "value": "true" }
      ]
    }
  ]
}
```

**After** (RULE):
```json
{
  "name": "Uncanny Dodge II",
  "type": "talent",
  "system": {
    "benefit": "Cannot be flanked.",
    "description": "You cannot be flanked.",
    "executionModel": "PASSIVE",
    "subType": "RULE",
    "abilityMeta": {
      "rules": [
        {
          "type": "CANNOT_BE_FLANKED",
          "description": "You cannot be flanked"
        }
      ]
    }
  },
  "effects": []
}
```

---

## Next Steps

### Phase 4E (Current)
1. ✓ Expand enum to maximal catalog (41 types)
2. ✓ Migrate Uncanny Dodge II (validation)
3. ✓ Smoke test combat behavior
4. → Migrate Fortified Body (3 immunities, enum-complete)

### Phase 5 (Future)
- Integrate remaining immunity enums into condition application
- Wire Evasion/Improved Evasion into damage resolution
- Consider ACTIVE or SUBSTITUTION layer for skill replacement feats

### Phase 6+ (Deferred)
- Expand RULE system to conditional gating (if needed)
- Support duration-based rules (if needed)
- Add new enum categories beyond current 41

---

## References

- **rule-enum.js**: RULES definition (41 types)
- **rule-definitions.js**: Type specs and descriptions
- **RuleCollector**: Aggregates rules during prepare
- **ResolutionContext**: Queries rules during resolution
- **PassiveAdapter**: Routes PASSIVE/RULE to RuleCollector
- **combat-utils.js**: Example integration (getFlankingBonus)

---

## Questions?

If unsure whether content fits RULE:
1. Check "Valid RULE Use Cases" section
2. Apply "5 Constraints" test
3. If still unsure → DEFER and document as "Requires ACTIVE/DERIVED"
