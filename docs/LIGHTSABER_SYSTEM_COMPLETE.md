# Lightsaber Construction & Attunement System - Complete Implementation

**Status**: ✅ **THREE LAYERS COMPLETE**
**Latest Commit**: `fc508d4` - Miraj UI popup added
**Total Implementation**: Skeleton → Eligibility → Attunement → UI

---

## 🎯 **System Architecture Overview**

```
User Actions
    ↓
LightsaberConstructionUI (ApplicationV2)
    ├→ Calls getConstructionOptions() [Pure Query]
    ├→ Calls attemptConstruction() [Engine]
    │   ├→ Eligibility Check (fail-fast)
    │   ├→ Item Resolution
    │   ├→ Compatibility Validation
    │   ├→ DC/Cost Calculation
    │   ├→ Credit Validation
    │   ├→ Roll Execution
    │   └→ Atomic Mutation (on success)
    │
    └→ On Success:
       └→ MirajAttunementApp (popup)
           └→ User chooses: Yes/No
               └→ WeaponsEngine.attuneLightsaber()
                   ├→ Precondition Checks
                   ├→ Force Point Deduction
                   ├→ Set flags.swse.attunedBy
                   └→ getWeaponModifiers() applies +1 bonus
```

---

## 📋 **Layer 1: Construction Engine**

**File**: `scripts/engine/crafting/lightsaber-construction-engine.js`

### Public API
```javascript
LightsaberConstructionEngine.getConstructionOptions(actor)
  → { chassis: [], crystals: [], accessories: [] }

LightsaberConstructionEngine.attemptConstruction(actor, config)
  → { success, reason?, itemId?, finalDc?, rollTotal?, modifier?, cost? }
```

### Constructor Flow
1. **Input Validation** - Actor and config present
2. **Eligibility Check** (fail-fast) - See Layer 2
3. **Item Resolution** - Resolve chassis, crystal, accessories by ID
4. **Compatibility Check** - Verify upgrades fit chassis
5. **DC Calculation** - baseDc + crystal.modifier + accessory.modifiers
6. **Cost Calculation** - chassis.cost + crystal.cost + accessory.costs
7. **Credit Validation** - Fail if insufficient funds
8. **Roll Execution** - `1d20 + actor.skills.useTheForce.total`
9. **Atomic Mutation** (on success only):
   - Deduct credits via ActorEngine
   - Create weapon via ActorEngine
   - Inject metadata: builtBy, builtAt, attunedBy: null

### Result Examples

**Success**:
```javascript
{
  success: true,
  itemId: "abc123",
  finalDc: 25,
  rollTotal: 28,
  modifier: 15,
  cost: 3000
}
```

**Failure** (eligibility):
```javascript
{ success: false, reason: "insufficient_heroic_level" }
```

**Failure** (roll):
```javascript
{
  success: false,
  reason: "roll_failed",
  finalDc: 25,
  rollTotal: 18,
  modifier: 15
}
```

---

## 🔒 **Layer 2: Eligibility Gating**

**Location**: `scripts/engine/crafting/lightsaber-construction-engine.js` - `#validateEligibility()`

### Level Gating
Based on `game.settings.get("swse", "lightsaberConstructionMode")`:

- **"raw"** (default): Heroic Level ≥ 7
- **"heroicAndJedi"**: Heroic Level ≥ 7 AND Jedi Level ≥ 1
- **"jediOnly"**: Jedi Level ≥ 7

Uses proper authorities:
- `getHeroicLevel(actor)` from level-split.js ✓
- `getClassLevel(actor, "jedi")` from level-split.js ✓
- NO raw `actor.system.level` access ✓

### Feat Requirements
- **Force Sensitivity**: `item.system.id === "swse-feat-force-sensitivity"`
  - Also checks `actor.system.forceSensitive === true` flag
- **Lightsaber Proficiency**: `item.system.id === "swse-feat-weapon-proficiency-lightsabers"`

NO name-based fallback (drift vector removed).

### Failure Reasons
```
insufficient_heroic_level
insufficient_jedi_level
missing_force_sensitivity
missing_lightsaber_proficiency
eligibility_check_error
```

**Atomic Guarantee**: Eligibility checked BEFORE roll and BEFORE mutation.

---

## ⚡ **Layer 3: Attunement System**

**Location**: `scripts/engine/combat/weapons-engine.js` - `WeaponsEngine.attuneLightsaber()`

### Preconditions
- Weapon type = 'weapon' ✓
- Weapon subtype = 'lightsaber' ✓
- Builder owns weapon: `weapon.flags.swse.builtBy === actor.id` ✓
- Not already attuned: `weapon.flags.swse.attunedBy === null` ✓
- Actor has Force Point: `actor.system.resources.forcePoints.value ≥ 1` ✓

### Mutations (Atomic via ActorEngine)
1. Deduct 1 Force Point
2. Set `flags.swse.attunedBy = actor.id`

### Result
```javascript
{ success: true }  // Success

{ success: false, reason: "not_builder" }  // Failed precondition
{ success: false, reason: "already_attuned" }
{ success: false, reason: "no_force_points" }
{ success: false, reason: "attunement_error" }
```

### Conditional +1 Attack Bonus

**Location**: `WeaponsEngine.getWeaponModifiers()` - "Attuned Lightsaber Bonus" section

Applied only when ALL conditions met:
```javascript
weapon.system.subtype === "lightsaber" &&
weapon.flags.swse.builtBy === actor.id &&    // Built by wielder
weapon.flags.swse.attunedBy === actor.id     // Attuned by wielder
```

Bonus Details:
- Type: UNTYPED (stacks with all bonuses)
- Value: +1
- Target: attack.bonus
- Priority: 45 (after enhancement bonuses)

**NOT Stored**: Conditional only—recomputed each time modifiers are evaluated.

---

## 🎭 **Layer 4: UI Components**

### 4A: Lightsaber Construction Application
**Planned**: Full construction UI with hologram panels
**Template**: `templates/applications/lightsaber/lightsaber-construction.hbs`
**CSS**: `styles/lightsaber-construction.css`

Features:
- Chassis selector panel (top-left)
- Crystal selector panel (top-right)
- Accessory selector panel (right side)
- Summary panel (bottom center)
- Real-time DC/cost preview
- Build button triggers engine

### 4B: Miraj Attunement Popup
**File**: `scripts/applications/lightsaber/miraj-attunement-app.js`
**Template**: `templates/applications/lightsaber/miraj-attunement.hbs`
**CSS**: `styles/miraj-attunement.css`

Triggers After:
- Construction succeeds
- Weapon item created
- Actor has Force Points available

Features:
- Holographic Miraj AI guide
- Glowing holo avatar (animated)
- Narrative prompt about attunement
- Yes/No buttons
- Disabled if no Force Points
- Callback to `WeaponsEngine.attuneLightsaber()`

### 4C: Character Sheet Button (Fallback)
**Planned**: Attune button on lightsaber items

Shows when:
- Item is lightsaber
- Item was built by this actor
- Item not yet attuned

Click handler:
```javascript
await WeaponsEngine.attuneLightsaber(actor, item);
```

---

## 🧪 **Testing Strategy**

### Engine Tests
- ✅ Phase 1: Read tests (getConstructionOptions)
- ✅ Phase 2: Failure path atomicity
- ✅ Phase 3: Success path mutations
- ✅ Phase 3.5: Eligibility gating
- ✅ Phase 4: Compatibility edge cases

### Attunement Tests (Planned)
1. ✓ Constructed but not attuned → no +1 bonus
2. ✓ Attuned by builder → +1 bonus applied
3. ✓ Attuned but wielded by different actor → no +1
4. ✓ Attuned but transferred weapon → only builder benefits
5. ✓ Insufficient Force Points → attunement fails

### UI Tests (Manual)
- [ ] Miraj popup appears after construction
- [ ] Attune button works
- [ ] No Force Points → button disabled
- [ ] Character sheet attune button works

---

## 🔐 **Authority & Integrity**

### Level Authority
✅ Uses `getHeroicLevel()` and `getClassLevel()`
✅ No raw field access
✅ Respects "level-split.js" as single source of truth

### Roll Pipeline
✅ Uses `RollEngine.safeRoll()`
✅ Delegates all roll execution
✅ No local d20 math reconstruction
✅ Uses modifier-inclusive skill totals

### Feat Authority
✅ Primary: `item.system.id` (structured)
✅ Fallback: Flag-based (forceSensitive)
✅ NO name-based matching (drift vector removed)

### Mutation Authority
✅ All via `ActorEngine`
✅ No direct `actor.update()`
✅ Atomic: mutations only after validation

---

## 📊 **Data Flow Examples**

### Example 1: Heroic 7 Jedi Constructs Standard + Ilum
```
Actor: Heroic 7, Jedi 5, Force Sensitive, Lightsaber Proficient
Config: Standard Hilt (DC 20) + Ilum (DC 0)

Step 1: Eligibility → PASS (heroic 7 ≥ 7)
Step 2: Items → Found all
Step 3: Compatibility → Ilum matches "*"
Step 4: DC → 20 + 0 = 20
Step 5: Cost → 1500 + 0 = 1500
Step 6: Credits → Have 8000 ≥ 1500 ✓
Step 7: Roll → 1d20 + 15 = 24
Step 8: Compare → 24 ≥ 20 ✓ SUCCESS

Mutation:
  • Credits: 8000 → 6500
  • Item created with flags.swse.builtBy = actor.id
  • Popup: MirajAttunementApp appears

Actor has 5 FP → Attune button enabled
Actor clicks YES → Spend 1 FP
  • FP: 5 → 4
  • flags.swse.attunedBy = actor.id
  • Next weapon check: +1 attack bonus applied
```

### Example 2: Heroic 6 Cannot Construct
```
Actor: Heroic 6, Jedi 5

Step 1: Eligibility → FAIL
  Reason: insufficient_heroic_level (6 < 7)

Result: { success: false, reason: "insufficient_heroic_level" }

No roll. No mutation. Early exit.
```

### Example 3: Built Weapon, Low Force Points
```
Weapon: Built by this actor, not attuned
Actor: Has 0 Force Points

Click "Attune" → MirajAttunementApp

FP check → 0 < 1 → Button disabled
No mutation attempted
```

---

## 🚀 **Next Steps**

1. **Create Full Construction UI** (ApplicationV2)
   - Merge template + CSS with engine
   - Wire click handlers
   - Real-time DC/cost preview
   - Build button → attemptConstruction()
   - Success → MirajAttunementApp

2. **Add Character Sheet Button**
   - Show on lightsaber items
   - Only if (built by this actor AND not attuned)
   - Click → attunement dialog

3. **Attunement Test Phase**
   - Verify 5 test scenarios
   - Check +1 bonus is applied correctly
   - Verify bonus disappears if transferred

4. **Optional: Settings UI**
   - Construction mode selector
   - Level gating UI
   - Eligibility rules display

---

## ⚙️ **Technical Summary**

| Component | Status | Authority | Tested |
|-----------|--------|-----------|--------|
| Construction Engine | ✅ Complete | ActorEngine, RollEngine | ✅ Yes |
| Eligibility Gating | ✅ Complete | level-split.js | ✅ Yes |
| Attunement Logic | ✅ Complete | WeaponsEngine | ⏳ Planned |
| Conditional Bonus | ✅ Complete | ModifierEngine | ⏳ Planned |
| Miraj Popup UI | ✅ Complete | ApplicationV2 | ⏳ Manual |
| Construction UI | ⏳ Planned | Foundry forms | ⏳ Future |
| Sheet Button | ⏳ Planned | Item sheet | ⏳ Future |

---

## 📞 **Integration Checklist**

- [ ] Import MirajAttunementApp in construction UI
- [ ] Wire construction success → Miraj popup
- [ ] Add character sheet attune button
- [ ] Test full flow in Foundry
- [ ] Verify +1 bonus in character sheet
- [ ] Test transferred weapons (no bonus for non-builder)
- [ ] Test insufficient Force Points
- [ ] Test UI error handling

---

**Version**: 1.0.0 (Complete Implementation)
**Last Updated**: 2026-03-02
**Architecture**: Layered, authority-driven, testable
