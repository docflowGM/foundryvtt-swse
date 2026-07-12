# Phase 3 · Component-Damage Pipeline Design (D4A prerequisite)

**Status:** Design only. **No code.** Prerequisite for D4A (immunity) — D4A cannot be implemented safely until the mitigation pipeline handles damage components through every stage.

**Finalized mitigation order:** **Shield Rating → Immunity → Damage Reduction → Typed resistance → HP → special (ion/stun/scale).**

## TL;DR

A component-aware mitigation path **already exists and is wired** (`resolveComponentMitigation`, invoked by `DamageMitigationManager.resolve`). Two gaps block the finalized order:

1. **Immunity and typed resistance run at packet-prep, *before* SR** (`damage-packet-rules.js:379-381`). They must move **into** the mitigation stage, after SR.
2. **The component path only activates for >1 component**; single-component attacks run a total-only path. Immunity/DR-exception/resistance are all inherently **per-type**, so mitigation should carry a component array **uniformly** (even for one component).

Recommendation: **normalize to a component array for every attack and run all stages on it**, with immunity slotted in right after SR.

---

## Current-state map

### Packet build (components are preserved)

- `damage-packet-builder.buildDamageComponents` → `packet.components[]`, each `{ amount, type, damageTypes[], label, source, … }`. `hasMixedComponents = components.length > 1` (`:200-211`).
- **A collapsed single `damageType` string also exists** (`damage-packet-builder.js:283/355`, `damage-packet-rules.js:273/318/354`) for single-type consumers and for `context.damageType` passed to resolvers.
- So both representations coexist: the **component array** (authoritative for mixed) and a **collapsed string** (used by the single-total path and resolver context).

### Mitigation dispatch

- `DamageMitigationManager.resolve` (`:83-92`) calls `resolveComponentMitigation(...)` first; if it returns non-null (**>1 component**) it returns that; otherwise it runs the **single-total** SR→DR→TempHP path.
- `resolveComponentMitigation` returns `null` when `components.length <= 1` (`damage-component-mitigation.js:214`).

### How the existing component path mitigates (`damage-component-mitigation.js`)

- `normalizeComponents` → array with per-component `input/afterShield/afterDR/afterTempHP`, proportionally scaled so the parts sum to the rolled total (`:52-114`).
- **SR:** `ShieldMitigationResolver.resolve({ damage: total })`, then `distributeReduction(components,'afterShield', srApplied)` spreads the absorbed amount **proportionally** across components (`:228-229`).
- **Generic DR:** resolved on the total (`onlyGenericDamageReduction`), then distributed (`:233-246`).
- **Typed DR:** resolved **per component** (`onlyTypedDamageReduction`) (`:254-264`).
- **Temp HP:** distributed. `makeBreakdown` builds the stage breakdown for chat (`:166-208`).

### Immunity / resistance today (the misplacement)

- `applyDamageTypeProtectionToPacket` (immunity → negate) and `applyTargetComponentProtections` (per-component immunity negate + resistance flat-reduce) run at **packet prep** (`damage-packet-rules.js:379-381`), **before** the mitigation manager — i.e., before SR. Immune components are zeroed pre-SR, so SR never "sees" them.

---

## Answers to the six questions

1. **Does the current packet preserve component breakdown?** **Yes** — `packet.components[]`. But a collapsed `damageType` string also exists, and single-component attacks run a total-only mitigation path, so the breakdown isn't used uniformly.
2. **Where is damage type collapsed to a single string?** `damage-packet-builder.js:283/355` (`damageType: type`) and `damage-packet-rules.js:273/318/354` (`options.damageType`). The single-total mitigation path and resolver `context.damageType` consume the collapsed value.
3. **Per-component or a component array through each stage?** A **hybrid already exists**. Recommendation: **carry one component array through every stage** (normalize single-component to a 1-element array) so immunity/DR-exception/resistance evaluate per type uniformly.
4. **How does SR reduce mixed components?** SR resolves on the **total**, then the absorbed amount is distributed **proportionally** across components (`distributeReduction`). SR is undifferentiated absorption, so proportional is defensible — but "SR distribution policy" is a decision to confirm (proportional vs largest-first).
5. **After SR, how does immunity remove only immune components?** Today it doesn't run there (it's pre-SR). Proposed: an **immunity stage right after SR** that sets `afterShield = 0` for components whose type ∈ `derived.damageImmunities.types` (and not bypassed). SR depletion (computed on the pre-immunity total) is **preserved**.
6. **How are chat cards/tooltips shown?** `makeBreakdown` produces per-stage breakdown; `mitigationResult.components` carries per-component data to the result; `damage-log-formatter` renders SR/DR lines. Per-component detail is available and should gain an immunity line.

---

## Recommended design

**Unify on a component array through the whole mitigation stage.** One path, `components.length >= 1`.

```
buildDamageComponents → packet.components[]        (unchanged)
        │
        ▼  (mitigation manager; NO immunity/resistance at packet prep anymore)
normalize to component array (>=1)
        │
        ▼  1. Shield Rating   — resolve on total; distribute srApplied across components; persist SR depletion (done, D1/D2)
        ▼  2. Immunity        — per component: type ∈ damageImmunities.types (not bypassed) → afterShield = 0
        ▼  3. Damage Reduction — generic on total+distribute; DR "exception" evaluated per component type
        ▼  4. Typed resistance — per component (applies-to type), highest-only  [D4, not now]
        ▼  5. Temp HP         — distribute
        │
        ▼ recombine → hpDamage (sum of surviving components)
```

- **Move immunity + typed resistance out of packet-prep** into stages 2 and 4. Packet-prep keeps **type normalization** and protection *collection*; **application** moves into the ordered mitigation stage.
- **Immunity is per-component** and only for **damage-type** immunities (`derived.damageImmunities.types` — see D4A). Effect/condition immunity stays in the effect layer.
- **DR exception is per-component** by nature (`DR 10/energy` reduces the kinetic component, not the energy one) — the component array makes this correct; the collapsed string cannot express it.
- **SR depletion preserved** when immunity zeroes the remainder (aligns with the shield implementation and the finalized order).

### Worked examples

| Attack | Components | Behavior |
|---|---|---|
| **10 energy + 5 poison** (poison as *damage*) | `[energy 10, poison 5]` | SR absorbs from total, distributed; **after SR**, immune-to-poison → poison component → 0; energy proceeds to DR/HP. SR still depleted. |
| **10 fire + 10 slashing**, target has `DR 10/energy` | `[fire→energy 10, slashing→kinetic 10]` | DR exception = "bypassed by energy": DR 10 applies to the **kinetic** component (→0), **not** the fire component. Only possible per-component. |
| **20 energy/fire** | `[energy 20]` (single) | 1-element array; SR → DR → HP normally. Uniform path. |
| **poison *effect*, no poison damage component** | `[]` poison-damage; effect only | Mitigation stage does **nothing** to HP; poison **effect** handled/blocked by the effect layer (droid poison immunity lives here, not in the damage stage). |

---

## Decisions to confirm before D4A code

- **D-C1. Unify vs keep fast path:** always run the component-array path (recommended) vs keep the single-total shortcut and add immunity to both. Unify = one code path, less drift.
- **D-C2. SR distribution policy:** proportional (current) vs largest-component-first. Affects which component's post-SR remainder survives to be immune-zeroed. Recommend proportional (RAW SR is undifferentiated).
- **D-C3. Rounding:** components are integer-floored with last-takes-remainder today; confirm that stays the rule after adding the immunity stage.
- **D-C4. Where immunity reads:** `system.derived.damageImmunities.types` (D4A projection) — confirms this pipeline consumes only the damage-type projection, never raw effect-immunity lists.

---

## Do-not-touch list

- **Shield math** (D1/D2) — SR resolves + depletes first, unchanged; only its position relative to immunity is formalized.
- **DR math / resistance math** — unchanged; only their **order** (post-SR) and **per-component application** change.
- **Effect/condition immunity** (poison, disease, mind-affecting, radiation) — effect layer, not the damage stage.
- **Special ion/stun/scale** — own rules; document interactions only.
- **No immunity implementation yet** — this doc is the prerequisite; D4A implements immunity after these decisions are signed off.
- No resolver edits, ActiveEffect retargeting, or schema migration in this design phase.
