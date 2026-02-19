# PHASE 2 VALIDATION REPORT — Authority Read Verification
**Status**: ⚠️ **INCOMPLETE** — Authority computed but consumers outdated

---

## CRITICAL FINDING

**Phase 2 Achievement (✅)**: DerivedCalculator computes all derived values

**Phase 2 Problem (❌)**: **The entire codebase still reads from OLD locations**

| Component | Status | Issue |
|-----------|--------|-------|
| DerivedCalculator | ✅ Computes | Writes to system.derived.* ✓ |
| Consumers (UI, Engine, Apps) | ❌ Outdated | Still read from system.* ✗ |
| **Authority** | **❌ BROKEN** | **Computed in one place, read from another** |

---

## READS OF OLD LOCATIONS (Should use system.derived.*)

### Ability Modifiers — OUTDATED READS

Files reading `system.attributes.*.mod` (should read `system.derived.attributes.*.mod`):
1. **chargen-main.js** — `actor.system.attributes.con.mod`
2. **houserule-mechanics.js** — `actor.system.attributes.con.mod`
3. **skills-reference.js** — `actor.system.attributes.dex.mod`

**Impact**: Chargen and skill calculations may not reflect authoritative modifiers.

---

### Defense Totals — MASSIVE OUTDATED READS

Files reading `system.defenses.*.total` (should read `system.derived.defenses.*.total`):

1. **chargen-abilities.js**
   - Reads: `characterData.defenses.fort.total`
   - Reads: `characterData.defenses.reflex.total`
   - Reads: `characterData.defenses.will.total`

2. **chargen-main.js**
   - Reads: `characterData.defenses.fort.total`

3. **nonheroic-units-browser.js**
   - Reads: `unit.defenses.reflex.total`, `unit.defenses.fortitude.total`, `unit.defenses.will.total`

4. **vehicle-weapons.js**
   - Reads: `target.system.defenses.reflex.total`

5. **DefenseSystem.js**
   - Reads: `sys.defenses.reflex.total`
   - Reads: `sys.defenses.flatFooted.total`

6. **character-sheet.js** (V2)
   - Reads: `defenses.fort.total`, `defenses.ref.total`, `defenses.will.total`

7. **pdf-field-map.js**
   - References: `defenses.fort.total`, `defenses.ref.total`, `defenses.will.total`

8. **combat/systems/vehicle/vehicle-weapons.js**
   - Reads: `target.system.defenses.reflex.total`

**Impact**: All sheets and combat calculations use old, non-authoritative values.

---

### HP Max — WIDESPREAD OUTDATED READS

Files reading `system.hp.max` (should prefer `system.derived.hp.max`):

Chargen/App layer:
1. chargen-class.js — Sets/reads hp.max
2. chargen-main.js — Reads hp.max for validation
3. chargen-improved.js — Reads/writes hp.max
4. follower-creator.js — Reads/writes hp.max
5. follower-manager.js — Writes hp.max
6. levelup-main.js — Reads hp.max
7. nonheroic-units-browser.js — Displays hp.max

Engine layer:
8. DraftCharacter.js — Updates hp.max
9. ProgressionSession.js — Updates hp.max

Combat layer:
10. combat-action-bar.js — Reads hp.max for healing
11. chat-commands.js — Reads hp.max to restore HP

Drop/Drag:
12. drop-handler.js — Writes hp.max

**Impact**: Chargen, progression, combat all work with potentially stale values.

---

## WRITES TO OLD LOCATIONS (Should write ONLY to system.derived.*)

Critical violation: Some code is **WRITING** to `system.defenses.*` and `system.hp.*` instead of letting DerivedCalculator own these:

1. **actor-data-model.js** — Still computing/writing:
   - `this.defenses.reflex.total = ...`
   - `this.defenses.fort.total = ...`
   - `this.defenses.will.total = ...`
   - `this.damageThreshold = this.defenses.fort.total`

2. **drop-handler.js**
   - `updates['system.defenses.${key}.total'] = value.total`
   - `updates['system.hp.max'] = ...`

3. **DefenseSystem.js**
   - `sys.defenses.flatFooted.total = ...`

4. **chargen-class.js**
   - `characterData.hp.max = ...`

**These are SHADOW WRITES** — bypassing DerivedCalculator authority.

---

## CORRECT READS (system.derived.*)

Only **5 files** are reading from the correct authority:
- Files that properly use `system.derived.*`

**But these are exceptions, not the rule.** The codebase overwhelmingly reads from `system.*` instead.

---

## WHY THIS MATTERS

Current flow:

```
DerivedCalculator.computeAll()
├─ Computes HP, BAB, defenses
├─ Writes to system.derived.*
└─ ✓ CORRECT

BUT → All consumers still read from system.* ✗ WRONG
├─ chargen reads system.hp.max (old)
├─ sheets read system.defenses.*.total (old)
├─ combat reads system.defenses.reflex.total (old)
└─ Skills read system.attributes.dex.mod (old)

RESULT: Authority computed in one place, consumed from another!
```

**This is a "silent failure"** — everything appears to work because:
- Old code still populates system.* (backward compat in abilities alias)
- UI reads the old values (which exist but aren't authoritative)
- DerivedCalculator computes the NEW values (which nobody reads)

---

## WHAT NEEDS TO HAPPEN FOR PHASE 2 COMPLETION

### Option A: SOFT COMPLETION (Conservative)
Keep backward compat computation in DataModel, update all consumers to read from system.derived.*

**Pros**: Safe, minimum change
**Cons**: Still has duplication, Phase 3 must clean up

### Option B: HARD COMPLETION (Proper)
1. Remove ALL computation from DataModel (no backward compat)
2. Have all consumers read from system.derived.*
3. Implement fallback: if system.derived.* doesn't exist, use computed default
4. Proper async handling: sheets wait for DerivedCalculator completion

**Pros**: True single authority, no duplication
**Cons**: Larger refactor, more testing needed

---

## RECOMMENDATION

**Phase 2 is technically complete for computation authority**, but **incomplete for consumption authority**.

**Correct assessment**:
- ✅ Computation: DerivedCalculator computes all values
- ❌ Consumption: Codebase reads from wrong sources
- ❌ Enforcement: Sentinel doesn't prevent outdated reads

**For TRUE Phase 2 completion**, we need:

1. **Update all UI layers** to read from `system.derived.*`
   - Character sheet
   - Chargen UI
   - Combat display
   - PDF export

2. **Update all engine layers** to read from `system.derived.*`
   - DefenseSystem
   - Combat calculations
   - Skill checks

3. **Redirect all writes** to go through DerivedCalculator (or prevent them)
   - Remove write attempts in apps
   - Remove DataModel writes
   - Sentinel enforcement

4. **Remove backward compat** from DataModel
   - Delete ability.mod computation in abilities alias
   - Delete defense.total computation
   - No residual duplication

---

## PHASE 2 STATUS ASSESSMENT

| Aspect | Status | Details |
|--------|--------|---------|
| **Computation Authority** | ✅ Complete | DerivedCalculator computes all |
| **Consumption Authority** | ❌ Incomplete | 25+ files read from old locations |
| **Write Authority** | ⚠️ Partial | Some shadow writes still exist |
| **Overall Phase 2** | ⚠️ **7/10** | Authority computed, not fully consumed |

---

## RECOMMENDATION FOR NEXT STEPS

**Choice 1: Soft Completion (Faster)**
- Keep current state (DerivedCalculator computes, backward compat maintained)
- Mark Phase 2 as "70% complete"
- Phase 3 will consolidate mutations + authority

**Choice 2: Hard Completion (Cleaner)**
- Refactor all consumers to use system.derived.*
- Remove ALL DataModel computation (no backward compat)
- Make Phase 2 truly 10/10
- Then Phase 3 will be cleaner

**Recommendation**: **HARD COMPLETION** — Do it now, saves rework later. The consumer updates aren't trivial but not massive either. Once done, Phase 3-10 will be clean and unambiguous.

