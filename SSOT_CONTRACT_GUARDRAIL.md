# SWSE SSOT (Single Source of Truth) Contract Guardrail

**Effective**: 2026-05-12  
**Status**: Locked (Phases 0-8 complete)  
**Scope**: All current and future actor-facing code

---

## Canonical Contracts (Locked)

### Ability Scores

| Layer | Path | Read/Write | Owner |
|-------|------|-----------|-------|
| **Input (Persistent)** | `system.attributes.str.base` | Write ✓ | Progression, character creation, items |
| **Input (Persistent)** | `system.attributes.str.racial` | Write ✓ | Species/background grants |
| **Input (Persistent)** | `system.attributes.str.enhancement` | Write ✓ | Item effects, ability-granting items |
| **Input (Persistent)** | `system.attributes.str.temp` | Write ✓ | Spell effects, temporary bonuses |
| **Alias (Compat)** | `system.abilities.str.*` | Read only | Legacy code, metadata flags |
| **Output (Computed)** | `system.derived.attributes.str.total` | **DerivedCalculator only** | Never write directly |
| **Output (Computed)** | `system.derived.attributes.str.mod` | **DerivedCalculator only** | Never write directly |

**Rule**: New code must write to `system.attributes.*` input layers. Never write to `system.abilities.*` (alias) or `system.derived.attributes.*` (computed). DerivedCalculator owns all computed output.

### Species / Race

| Path | Use | Status |
|------|-----|--------|
| `system.species` | Canonical species identifier | Use this |
| `system.race` | Legacy fallback (compat only) | Do not use for new code |

**Rule**: New code must use `system.species`. If legacy `system.race` appears in data, treat as compatibility layer only; mechanics should not depend on it.

### Class / Level

| Path | Use | Status |
|------|-----|--------|
| `system.progression.classLevels` | Per-class levels array | Canonical for mechanics |
| `system.level` | Total heroic level (aggregate) | Canonical for display/calcs |
| `system.class` | Legacy scalar display | Manual/chargen fallback only |

**Rules**:
- `system.level = sum(classLevels[*].level)` when classLevels exists
- Mechanics must read `classLevels` for multiclass logic
- Never use scalar `system.class` for game mechanics
- `system.class` is display-only fallback

### Attack Bonus (BAB)

| Path | Use | Status |
|------|-----|--------|
| `system.derived.bab` | Effective BAB (calculated or manual) | Read for display/use |
| `system.baseAttackBonus` | Manual BAB override | Write only when no progression data exists |

**Rule**: Do not write `system.derived.bab` directly. It is computed by BABCalculator from classLevels. Manual `system.baseAttackBonus` is used only when progression data is unavailable (manual/NPC statblock mode).

### Half-Level

**Formula**: `floor(total_heroic_level / 2)`

**Rule**: Calculate from total heroic level (via `getLevelSplit()` or `getHeroicLevel()`). Do not divide class count. Do not divide twice.

### Origin Fields (Separate)

```
system.background
system.event
system.profession
system.planetOfOrigin
```

**Rule**: Keep separate. Do not consolidate or treat one as fallback for another.

### Credits & Resources

| Path | Use | Status |
|------|-----|--------|
| `system.credits` | Actor credits balance | Canonical persistent field |

**Rule**: Store systems write only via ActorEngine. Credits are canonical actor data.

### Notes / Biography

| Path | Use | Status |
|------|-----|--------|
| `system.notes` | Free-form character notes | Canonical persistent field |

**Rule**: Notes are user-editable metadata. Do not write programmatically except for chargen summaries.

---

## Code-Level Rules

### When Writing Actor Data

✅ **DO**:
- Use `ActorEngine.updateActor(actor, {...})` for all actor mutations
- Write to `system.attributes.*.{base,racial,enhancement,temp}` for ability changes
- Write to `system.progression.classLevels` for class/level changes
- Delegate derived calculation to `DerivedCalculator`
- Use prepared context/view-models in sheets

❌ **DO NOT**:
- Write directly to `system.abilities.*` (alias, not source of truth)
- Write to `system.derived.*` fields (computed output only)
- Write to `system.attributes.*.{mod,total}` (computed fields)
- Bypass `ActorEngine` for actor data mutations
- Rely on scalar `system.class` for game mechanics

### When Adding Items/Effects

✅ **DO**:
- Target canonical persistent ability input paths in item effects
- Use `system.attributes.str.base` (or .racial/.enhancement/.temp)
- Let DerivedCalculator compute totals/mods
- Write metadata flags to `system.abilities.*` if necessary for compat

❌ **DO NOT**:
- Write ability modifiers/totals directly
- Target computed fields (`system.derived.attributes.*.mod/total`)
- Create new compendium entries that write to aliases or computed fields

### When Adding New Actor Types

✅ **DO**:
- Inherit `DerivedCalculator` pattern from character/NPC
- Use same `system.attributes.*` ability schema unless explicitly documented otherwise
- Document any intentional differences from character contract
- Delegate derived computation to established pipeline

❌ **DO NOT**:
- Create custom ability-score paths without documenting the difference
- Write computed fields directly
- Assume new actor types have different contracts without explicit documentation

### When Creating Compendium Data

✅ **DO**:
- Define grants/bonuses using canonical persistent paths
- Let character creation/progression pipeline apply correctly
- Use `system.attributes.*.racial` for species bonuses
- Use `system.attributes.*.enhancement` for item enchantments

❌ **DO NOT**:
- Write ability mods/totals in compendium effects
- Use `system.abilities.*` for production ability grants
- Target `system.derived.*` in item effects
- Create computed-field dependencies in prerequisites

---

## Actor-Type Contracts

### Character

- ✅ Uses `system.attributes.*` for ability input
- ✅ Uses `DerivedCalculator` for derived output
- ✅ Can be progression-driven or manual
- ✅ Canonical: `system.progression.classLevels` when progression is active

### NPC

- ✅ **Shares identical derived contract with Character** (intentional)
- ✅ Uses `system.attributes.*` for ability input (same schema as Character)
- ✅ Can be progression mode (calculated) or statblock mode (manual)
- ✅ Mode is explicit and documented (no accidental hybrid writes)
- ✅ If future NPC-specific logic needed, architecture supports separate `computeNpcDerived()` logic

### Future Actor Types

- Document ability-score contract explicitly in data model
- If sharing character contract, state "uses character SSOT"
- If different, document the difference and why
- Always inherit DerivedCalculator pattern unless explicitly justified

---

## When This Contract Changes

1. **Minor fixes** (e.g., bug in DerivedCalculator): Update without phase change
2. **Backwards-incompatible changes** (e.g., new actor type with different contract): Document as phase boundary and update this guardrail
3. **Deprecations** (e.g., system.race no longer used): Mark as deprecated, maintain compat, update guardrail

---

## Reference

- Character sheet SSOT: `docs/audits/character-sheet-ssot-resolution-plan.md`
- Store/NPC/Compendium SSOT: `docs/audits/store-npc-compendium-ssot-audit.md`
- Locked contracts: Phase 0-8 audit (complete)
- DerivedCalculator: `scripts/actors/derived/derived-calculator.js`
- Actor Engine: `scripts/governance/actor-engine/actor-engine.js`

---

## Checklist for Code Review

When reviewing any actor-facing code change:

- [ ] No writes to `system.abilities.*` (except metadata flags)
- [ ] No writes to `system.derived.attributes.*.{mod,total}`
- [ ] Ability writes target `system.attributes.*.{base,racial,enhancement,temp}`
- [ ] All actor mutations use ActorEngine
- [ ] NPC changes do not break character contract equivalence (unless explicitly documented)
- [ ] Compendium effects use canonical paths
- [ ] New actor types document their contract explicitly
- [ ] No scalar `system.class` used for game mechanics
- [ ] BAB logic sums classLevels (not counts classes)
- [ ] Half-level uses total heroic level (not class count)

---

**Issued**: Phases 0-8 SSOT cleanup complete  
**Authority**: Character sheet and derived-calculator architecture  
**Status**: Locked until next published version
