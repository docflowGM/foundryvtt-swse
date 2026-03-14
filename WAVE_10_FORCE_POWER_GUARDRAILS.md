# Wave 10 Force Power Guardrails

## CRITICAL: Four Interlocking Force Power Entitlement, Legality & Selection Modes

The Force Power step must support four distinct operational modes that interact in complex ways:

### Mode 1: Normal New Selection
- Character gains new Force Power picks (level-up, feat grant, class grant)
- Selections added to existing known powers
- Supports: stacking, restricted pools, moral alignment validation

### Mode 2: Restricted Bonus Selection
- Character has conditional bonus slots (e.g., Telekinetic Prodigy)
- Bonus slots constrain selectable pool (e.g., "telekinetic powers only")
- Respects all other rules within the constrained set

### Mode 3: Dark-Side Remediation
- Character switched to dark-side class (Sith Apprentice/Lord)
- Previously known [Light] powers are now invalid
- Player must replace invalid powers with legal alternatives
- Replacement selections respect all normal rules

### Mode 4: Retrain/Rebuild
- `allowSuiteReselection` house rule is enabled
- Player chooses to fully rebuild Force Power set on level-up
- Existing powers cleared, capacity recalculated fresh
- Entire set is selected anew (not additive)
- All normal rules still apply to new set

All four guardrails must be enforced simultaneously.

---

## Guardrail 1: Multiple Entitlement Sources (NOT Just Force Training)

### Sources Found in Repo:
1. **Force Training Feat** (1 + WIS/CHA modifier)
   - Per feat instance: `Math.max(1, 1 + wisMod)`
   - House rule option: use CHA instead of WIS
   - Can have multiple Force Training feats

2. **Class-Level Grants** (from level progression)
   - Example: Jedi level 3 grants 1 force power
   - Source: `FORCE_POWER_DATA.classes[className][level].powers`
   - Compendium override: `levelProgression[].force_power_grants`

3. **Template-Based Grants** (from applied templates)
   - Source: `FORCE_POWER_DATA.templates[templateId].powers`

4. **Generic Feat Grants** (not just Force Training)
   - Source: `compendium.feats[featName].system.forcePowerGrants`
   - Fallback: `FORCE_POWER_DATA.feats[featName].grants`

5. **Telekinetic Prodigy Talent** (Restricted Bonus Slot)
   - **CRITICAL RESTRICTION**: One conditional bonus slot per Force Training feat instance
   - **Restricted Pool**: Only telekinetic descriptor powers OR "Move Object"
   - Not a free selection — subject to legality rules

### Shell Responsibility:
- Scan all five sources
- Compute total picks from all sources
- Respect restricted pools (e.g., "telekinetic powers only" from Telekinetic Prodigy)
- Track picks per source in footer (optional, for transparency)

### UI Display:
```
Force Powers Remaining: 4 (Force Training ×2: +2 | Class: Jedi +1 | Template: Force Adept +1)
```

---

## Guardrail 2: Duplicate Selection Legality (Stacking Model)

### Rule:
Force Power selections CAN be duplicated. Each duplicate = additional use, NOT error.

### Model:
- **Store as**: `Map<powerId, count>` NOT `Set<powerId>`
- **Display as**: "Move Object ×2, Surge ×1" NOT just list of unique powers
- **Counts toward**: Total picks remaining, summing all counts
- **Legality**: No inherent restriction on same power selected twice (unless authority says otherwise)

### Interaction:
- Single click = focus (details panel updates)
- "Choose" button = increment count by 1
- Remove power = set count to 0 (not displayed)
- Footer counts total selections: "Move Object ×2 + Surge ×1 = 3 total, 1 remaining"

### Details Panel Button Text:
- First selection: "Add Power"
- Later selections: "Add Another Use"

---

## Guardrail 3: Retrain/Repick House Rule (Existing System)

### System Found:
- **SuiteReselectionEngine**: Existing system for clearing and reselecting Force Powers
- **House Rule Setting**: `allowSuiteReselection` (GM-only, default false)
  - When enabled: Force Powers and Starship Maneuvers may be fully reselected during level-up
  - Flow: Clear existing → Recalculate capacity → Open picker → Validate → Apply

### When This Applies:
During level-up, if:
1. `allowSuiteReselection` setting is enabled
2. Player wants to rebuild Force Power selection with new capacity
3. GM initiates suite reselection dialog

### Shell Responsibility:
1. **Recognize retrain mode** when SuiteReselectionEngine.clearAndReselectForcePowers() is called
2. **Start with cleared slate** — no previously known powers shown as "must keep"
3. **Recalculate capacity fresh** — use latest class/feat grants
4. **Offer full rebuildable set** — player can select any legal power combination
5. **Respect all other rules**:
   - Duplicate selections still allowed if authority permits
   - Restricted pools (Telekinetic Prodigy) still apply
   - Moral alignment (dark-side) still enforced
6. **Footer should show**: "Rebuild Force Powers: X selections available" (not "X remaining")
7. **Finalization** applies the new set, replacing old set completely

### Interaction:
- Normal level-up: Step appears as conditional, player makes new selections
- With retrain enabled: Step appears, but offers "Rebuild Force Powers" button
- Click "Rebuild": clears old, shows fresh picker with current capacity
- All selection rules (stacking, restricted pools, alignment) still apply
- Final set replaces old set completely

---

## Guardrail 4: Dark-Side Invalidation & Remediation

### System Found:
- Force Powers have `moralSlant` field:
  - `'sith_only'` → Illegal for Light characters (DSP === 0)
  - `'jedi_only'` → Illegal for Dark characters (DSP > 0)
  - `'sith_favored'` / `'jedi_favored'` → Soft penalty (not hard block)

- Sith progression classes exist:
  - Sith Apprentice, Sith Lord (Dark Side aligned)
  - Jedi classes (Light Side aligned)

### When This Applies:
Character selects Sith Apprentice or Sith Lord class → Previously known [Light] powers become invalid.

### Shell Responsibility:
1. **Detect invalidation**: Scan previously known Force Powers vs new class alignment
2. **Inform player**: "X previously known powers are no longer legal for your current class"
3. **Enable remediation**: Allow replacing invalid powers with legal ones
4. **Track replacement count**: Footer shows "3 replacement powers required"
5. **Validate pool**: Replacement selections must still obey all other rules (restricted pools, etc.)
6. **Block finalization**: Character cannot finish unless all Force Powers are legal

### Replacement Workflow:
```
Previously Known Powers:
- Force Light [Light] ← INVALID for Sith Apprentice
- Sever Force [Light] ← INVALID for Sith Apprentice
- Move Object (allows all) ← still valid

Footer:
3 replacement Force Powers required
1 replacement power remaining
```

Player selects replacements from legal pool:
- Force Lightning (dark-side only, now allowed)
- Grip (dark-aligned, now allowed)
- etc.

### Details Panel in Replacement Mode:
- Show "This power is no longer legal for your class"
- Offer "Replace" instead of "Add Power"
- Link back to which invalid power is being replaced

---

## Interaction Matrix: All Four Guardrails Together

| Scenario | Guardrail 1 | Guardrail 2 | Guardrail 3 | Guardrail 4 | Result |
|----------|-------------|-------------|-------------|-------------|--------|
| Force Training +1 pick, no special talents | Counts from Force Training | Can duplicate any legal power | No moral conflict | Not retrain mode | Player selects 1 power from legal pool, can stack |
| Force Training ×2 (+2 picks) + Telekinetic Prodigy talent | 2 picks from Force Training; TP grants 1 bonus slot restricted | Telekinetic powers can be duplicated | No conflict | Not retrain mode | Player selects: 1 telekinetic, 2 from general pool; any can be duplicated |
| Character switches from Jedi to Sith Apprentice | Recount entitlements | Duplicate rule still applies | [Light] powers now invalid; must replace | Not retrain mode | Player must replace invalid [Light] powers with legal ones |
| Level-up with retrain enabled (allowSuiteReselection=true) | Recalculate capacity fresh from new class/feats | Duplicate rule still applies | New alignment applied to fresh set | **RETRAIN MODE**: Clear old, rebuild from scratch | Player rebuilds entire Force Power set with new capacity; all rules still apply |

---

## Implementation Checklist for Wave 10

### Step Mode Detection:
- [ ] Check if `allowSuiteReselection` setting is enabled
- [ ] Detect if SuiteReselectionEngine.clearAndReselectForcePowers() was called
- [ ] Determine active mode: normal | retrain | remediation

### ForcePowerStep.onStepEnter():
- [ ] Call `_computeTotalEntitlements()` scanning all five sources
- [ ] Check for restricted pools (Telekinetic Prodigy)
- [ ] Check for moral conflicts (dark-side invalidation)
- [ ] Check for retrain mode (suite reselection active)
- [ ] Shift into appropriate mode based on conditions

### Normal Mode:
- [ ] Use `Map<powerId, count>` for tracking committed selections
- [ ] Display "Power ×2" in all UI surfaces
- [ ] Count button increments, doesn't toggle

### Retrain Mode:
- [ ] Start with cleared slate (no retained powers shown)
- [ ] Recalculate capacity fresh from current class/feats
- [ ] Allow full rebuild of Force Power set
- [ ] Apply all normal rules (stacking, restricted pools, moral alignment)
- [ ] Footer: "Rebuild Force Powers: X selections available"
- [ ] Final set replaces old set completely in finalization

### Dark-Side Remediation:
- [ ] Detect invalid [Light] powers in existing actor state
- [ ] Compute replacement count = count of invalid powers
- [ ] Filter selectable pool to legal alignment only
- [ ] Show "replacement mode" messaging in details panel + footer
- [ ] Block Next button until all replacements selected

### Mentor Integration:
- [ ] Mentor reacts to moral slant conflicts
- [ ] Mentor acknowledges retrain mode ("A new path requires new choices")
- [ ] Ask Mentor can suggest compatible powers for current mode

### Footer Display:
- [ ] Normal mode: "X Force Powers remaining"
- [ ] Stacked display: "Move Object ×2 | Surge ×1"
- [ ] Retrain mode: "Rebuild Force Powers: X selections available"
- [ ] Remediation mode: "3 replacement Force Powers required | 1 remaining"

---

## Test Scenarios for Wave 10

1. **Multi-source entitlements**: Force Training ×2 + Class Jedi (level 3) + generic feat grant = 5 total picks → player selects 5 distributed across powers
2. **Telekinetic Prodigy restricted pool**: Player has TP talent + Force Training ×1 → 1 bonus slot restricted to telekinetic; 1 general slot
3. **Duplicates with restricted grants**: Player has 3 picks; selects Move Object ×2, Surge ×1 → valid (respects duplication AND restricted pool)
4. **Dark-side invalidation**: Character was Light (knew "Force Light"), selects Sith Apprentice → triggers "replace [Light] power" workflow
5. **Replacement mode**: In remediation mode, player can duplicate replacements too (e.g., Force Lightning ×2 as replacement)
6. **Retrain on level-up (normal)**: Level 1 Jedi has 2 powers (Force Light, Move Object). Level 2 (no retrain) → new power added (total 3). Choose normally.
7. **Retrain with mode enabled**: Level 1 Jedi has 2 powers. Level 2 with `allowSuiteReselection=true` → cleared, recalculate capacity (still 2), player rebuilds from scratch
8. **Retrain with changed capacity**: Level 1 Force Disciple (2 powers). Level 3 becomes Jedi (new capacity 3). Retrain enabled → cleared, recalculate, rebuild with 3 picks
9. **Retrain + dark-side conflict**: Level 1 Jedi (knew "Force Light"). Level 2 becomes Sith Apprentice. Retrain clears old, but [Light] powers filtered from new pool anyway
10. **Retrain + restricted bonus**: Force Training ×2 + TP talent. Retrain → 2 general + 1 TP bonus. Rebuild respects both

---

## References

- `telekinetic-prodigy-hook.js`: Restricted bonus slot logic
- `force-training.js`: Multi-instance grant logic (1 + WIS/CHA)
- `force-power-engine.js`: Entitlement detection from all sources
- `ForceOptionSuggestionEngine.js`: Moral slant validation (sith_only, jedi_only, etc.)
- `dark-side-devotee-mechanics.js`: Dark-side effects on behavior
- `suite-reselection-engine.js`: Clear and reselect workflow for Force Powers and Maneuvers
- `core/settings.js`: `allowSuiteReselection` house rule setting
- `finalize-integration.js`: Triggers suite reselection dialog during level-up
- `suite-reselection-utils.js`: Context validation (`canReselectSuite(context)`)
