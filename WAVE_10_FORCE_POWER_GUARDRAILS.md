# Wave 10 Force Power Guardrails

## CRITICAL: Three Interlocking Force Power Entitlement & Legality Rules

The Force Power step must enforce all three of these simultaneously. They interact in complex ways.

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

## Guardrail 3: Dark-Side Invalidation & Remediation

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

## Interaction Matrix: All Three Guardrails Together

| Scenario | Guardrail 1 | Guardrail 2 | Guardrail 3 | Result |
|----------|-------------|-------------|-------------|--------|
| Force Training +1 pick, no special talents | Counts from Force Training | Can duplicate any legal power | No moral conflict | Player selects 1 power from legal pool, can stack |
| Force Training ×2 (+2 picks) + Telekinetic Prodigy talent | 2 picks from Force Training; TP grants 1 bonus slot restricted to telekinetic powers | Telekinetic powers can be duplicated; other picks can be duplicated | No conflict | Player selects: 1 telekinetic (counts toward TP bonus), 2 from general pool; any can be duplicated |
| Character switches from Jedi to Sith Apprentice | Recount entitlements (some class grants change) | Duplicate rule still applies | [Light] powers now invalid; must replace | Player must replace invalid [Light] powers with legal ones; can still duplicate remaining selections |

---

## Implementation Checklist for Wave 10

### ForcePowerStep.onStepEnter():
- [ ] Call `_computeTotalEntitlements()` scanning all five sources
- [ ] Check for restricted pools (Telekinetic Prodigy)
- [ ] Check for moral conflicts between previously known powers and new class
- [ ] If conflicts detected, shift step into "remediation mode"

### Stacking Model:
- [ ] Use `Map<powerId, count>` for tracking committed selections
- [ ] Display "Power ×2" in all UI surfaces
- [ ] Count button increments, doesn't toggle

### Dark-Side Remediation:
- [ ] Detect invalid [Light] powers in existing actor state
- [ ] Compute replacement count = count of invalid powers
- [ ] Filter selectable pool to legal alignment only
- [ ] Show "replacement mode" messaging in details panel + footer
- [ ] Block Next button until all replacements selected

### Mentor Integration:
- [ ] Mentor reacts to moral slant conflicts ("The path you've chosen... may require sacrifice")
- [ ] Ask Mentor can suggest compatible powers for new alignment

### Footer Display:
- [ ] Normal mode: "X Force Powers remaining"
- [ ] Stacked display: "Move Object ×2 | Surge ×1"
- [ ] Remediation mode: "3 replacement Force Powers required | 1 remaining"

---

## Test Scenarios for Wave 10

1. **Multi-source entitlements**: Force Training ×2 + Class Jedi (level 3) + generic feat grant = 5 total picks → player selects 5 distributed across powers
2. **Telekinetic Prodigy restricted pool**: Player has TP talent + Force Training ×1 → 1 bonus slot restricted to telekinetic; 1 general slot
3. **Duplicates with restricted grants**: Player has 3 picks; selects Move Object ×2, Surge ×1 → valid (respects duplication AND restricted pool)
4. **Dark-side invalidation**: Character was Light (knew "Force Light"), selects Sith Apprentice → triggers "replace [Light] power" workflow
5. **Replacement mode**: In remediation mode, player can duplicate replacements too (e.g., Force Lightning ×2 as replacement)

---

## References

- `telekinetic-prodigy-hook.js`: Restricted bonus slot logic
- `force-training.js`: Multi-instance grant logic (1 + WIS/CHA)
- `force-power-engine.js`: Entitlement detection from all sources
- `ForceOptionSuggestionEngine.js`: Moral slant validation (sith_only, jedi_only, etc.)
- `dark-side-devotee-mechanics.js`: Dark-side effects on behavior
