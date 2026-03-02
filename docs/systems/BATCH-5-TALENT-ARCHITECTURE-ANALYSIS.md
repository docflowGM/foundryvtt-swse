# BATCH 5: Talent System Architecture Analysis

**Question:** Is the talent system item-based (clean) or rule-based with scattered mutations?

**Answer:** RULE-BASED WITH HEAVY SCATTERED MUTATIONS AND INLINE MATH

---

## Evidence

### Finding 1: No ModifierEngine Usage

**Search Result:** Zero imports of ModifierEngine in any talent file

```bash
grep -n "ModifierEngine\|registerModifier" /scripts/talents/*.js
# Output: (empty)
```

**Implication:** Talents do NOT use centralized modifier system. Bonuses are applied... elsewhere (likely inline).

---

### Finding 2: Extensive Inline Math in DarkSidePowers.js

**Sample Lines:**
```javascript
// Line 195: const halfDamage = Math.floor(damageDealt / 2);
// Line 237: const newHp = Math.max(0, actor.system.hp?.value - dmg.damage);
// Line 293: const damageDice = Math.min(characterLevel, 10);
// Line 313: const newHp = Math.max(0, targetToken.actor.system.hp.value - damageAmount);
// Line 425: const newCondition = Math.max(0, currentCondition - 1);
// Line 485: const crippledSpeed = Math.ceil(originalSpeed / 2);
// ... (30+ more Math. calls)
```

**Pattern:** Every mutation is preceded by inline calculation:
```javascript
const newValue = Math.max(0, oldValue - damage);
await actor.update({ 'system.hp.value': newValue });
```

**Implication:** Bonuses, damage, healing—all calculated inline. Not via ModifierEngine.

---

### Finding 3: Direct Mutations for Every Effect

**DarkSidePowers.js Structure:**
```javascript
async triggerEffect(actor, target, params) {
  // 1. Calculate damage inline
  const damage = Math.floor(roll * modifier);

  // 2. Mutate target
  await actor.update({ 'system.hp.value': newHp });

  // 3. Mutate self (healing, score, etc.)
  await actor.update({ 'system.darkSideScore': score + 1 });

  // 4. Create effect
  await actor.createEmbeddedDocuments('ActiveEffect', [...]);
}
```

**Implication:** No batching. Each effect = multiple separate mutations.

---

### Finding 4: Not Item-Centered

**What We Expected (Item-Based):**
```javascript
// Talent applied:
// - Item added to actor
// - Item's rules define effects
// - RuleElement.apply() executes in one atomic batch
```

**What We Found (Rule-Based):**
```javascript
// Talent executed:
// - Function called directly (not item-driven)
// - Calculates effect
// - Mutates actor via direct calls
// - Creates effect via direct calls
// - No rule composition
```

---

## Architectural Assessment

### Current State: SCATTERED MUTATION SYSTEM

```
Talent Function
  ├─ Calculate damage (inline math)
  ├─ Mutate actor HP (direct update)
  ├─ Mutate dark side score (direct update)
  ├─ Calculate healing (inline math)
  ├─ Mutate self HP (direct update)
  ├─ Create effect (direct createEmbeddedDocuments)
  └─ Create chat message (direct call)

Result: 5-7 separate mutation calls per talent use
```

### Problems This Creates

1. **No Centralized Modifier Authority**
   - Bonuses calculated inline, not via ModifierEngine
   - Impossible to audit modifier stacking
   - Cannot apply/remove bonuses atomically

2. **Scattered Mutations (NOT ATOMIC)**
   - Each calc + mutation is separate transaction
   - Intermediate inconsistent states visible
   - If any mutation fails, partial state applied

3. **Reintroduces Hybrid Logic**
   - We're routing these mutations to ActorEngine
   - But underlying logic remains inline
   - Phase 4 (Modifier Sovereignty) will be hard to implement later

4. **Hook Re-entrance Risk**
   - Each actor.update() triggers hooks
   - Which may apply additional mutations
   - Nested mutation blocks will fire

---

## BATCH 5 Strategy Implication

**This Is NOT a Simple Routing Batch**

BATCH 5 must:
1. **Stage 1:** Categorize mutations AND inline math
2. **Stage 2:** Define atomic talent operations (applyTalent, removeTalent)
3. **Stage 3:** Prevent NEW inline math from surviving (red flag)
4. **Stage 4:** Route mutations through ActorEngine
5. **Stage 5:** Validate under combat

**Cannot blindly route without addressing scattered mutations.**

---

## Categorization Table

### Mutation Scatter in DarkSidePowers.js (21 mutations)

| Power | Inline Calcs | Mutations | Pattern | Risk |
|-------|--------------|-----------|---------|------|
| Swift Power | 1 | 1 (flag set) | Simple | LOW |
| Dark Side Savant | 0 | 1 (flag set) | Simple | LOW |
| Drain Life Force | 3 | 4 (target HP, self HP, self score, effect) | Complex | HIGH |
| Deadly Throw | 2 | 2 (target HP, condition) | Medium | MEDIUM |
| Wrath of the Dark Side | 4 | 3 (target HP, condition, effect) | Complex | HIGH |
| Crippling Strike | 3 | 2 (speed, condition) | Complex | HIGH |
| Channel Aggression | 1 | 1 (self update) | Simple | MEDIUM |
| Drain Force Points | 2 | 2 (target FP, self FP) | Medium | MEDIUM |
| Consume Essence | 5 | 4 (damage, healing, self update, effect) | Complex | HIGH |
| (and more...) | ~30+ | ~21 | ~95% have inline math | **SYSTEMIC** |

---

## Policy Implications

After routing BATCH 5, policies should be:

```javascript
_getOperationPolicy(operation) {
  return {
    // ... existing ...
    'applyTalent': {
      maxMutations: 5,           // Multiple effects = multiple mutations
      exactDerivedRecalcs: 1     // But only ONE recalc at end
    },
    'removeTalent': {
      maxMutations: 3,
      exactDerivedRecalcs: 1
    }
  };
}
```

**Note:** These numbers (5, 3) are HIGHER than BATCH 4 because talent effects ARE scattered.

---

## Inline Math Red Flags (For Code Review)

During BATCH 5 routing, flag these patterns as "needs Phase 4 planning":

```javascript
// RED FLAG: Inline modifier calculation
const bonus = actor.system.level + (actor.system.abilities.dex.mod * 2);

// RED FLAG: Inline damage calculation
const damage = Math.floor(roll * 1.5) + modifier;

// RED FLAG: Inline condition adjustment
const newCondition = Math.max(0, currentCondition - penalty);

// YELLOW FLAG: Inline state mutation
actor.system.hp.value -= damage;  // (especially if followed by await actor.update())
```

These should all be:
1. Calculated (OK)
2. Passed to ActorEngine (OK)
3. But NOT allowed to bypass ModifierEngine once Phase 4 starts

---

## Execution Plan Refinement

Given that talent system is **heavily scattered**:

### Phase 1: Still Low-Risk
- destiny-effects.js (1 simple mutation)
- droid-appendage-utils.js (1 simple mutation)
- force-power-manager.js (1 simple mutation)
- **No inline math to worry about**

### Phase 2: ELEVATED RISK
- actor-utils.js (3 mutations) - likely has inline calcs
- actor-hooks.js (3 mutations) - may trigger cascades
- dark-side-talent-mechanics.js (1 mutation) - probably has inline calcs
- light-side-talent-mechanics.js (4 mutations) - probably has inline calcs
- dark-side-devotee-mechanics.js (5 mutations) - definitely has inline calcs

### Phase 3: CRITICAL ANALYSIS REQUIRED
- DarkSidePowers.js (21 mutations + 30+ inline calculations)

**Cannot route blindly. Must:**
1. Map every mutation to its calculation
2. Verify calculation isn't duplicated elsewhere
3. Ensure inline math won't reappear
4. Define atomic boundaries
5. Plan Phase 4 path for ModifierEngine migration

### Phase 4: Infrastructure Update
- hardening.js (3 mutations) - snapshot/rollback must still work after routing

---

## Questions Before Proceeding

1. **Inline Math Audit:** Should we extract all Math calculations into a separate utility first, or route mutations as-is?

2. **Atomic Boundaries:** Should `applyTalent()` be a new ActorEngine operation that batches all 5 mutations, or remain scattered?

3. **Phase 4 Planning:** Should BATCH 5 include "prevent new inline math" as a hard constraint, or soft guideline?

4. **Rollback Safety:** Hardening snapshots talent state. Does current inline math affect snapshot integrity?

---

## Recommendation

**BATCH 5 IS NOT "JUST ROUTING"**

It requires:
1. **Deep code review** of each talent before routing
2. **Audit of inline math** to prevent Phase 4 reintroduction
3. **Policy definition** for scattered mutations
4. **Atomic operation design** (applyTalent, removeTalent)
5. **Combat validation** to ensure effects still work

**Timeline:** Likely 200+ minutes, not 165.

**Approach:**
- Keep BATCH 4 testing independent (parallel)
- Pause BATCH 5 routing until we:
  1. Define atomic talent operations
  2. Audit all inline math
  3. Set hard constraints on what's allowed

---

## Current Status

- [x] BATCH 4 routing complete
- [x] BATCH 4 testing ready
- [x] BATCH 5 scope identified (12 files, 48 mutations)
- [x] BATCH 5 architecture analyzed
- [ ] BATCH 5 inline math audit
- [ ] BATCH 5 atomic operation design
- [ ] BATCH 5 routing strategy finalized

**Next:** Audit inline math, define atomic operations, refine plan.

