# Phase 3 · D4A — Immunity Layer (implementation plan)

**Status:** ✅ **Implemented.** Damage-type immunity stage lands after SR, before DR, on both mitigation paths. Effect/condition immunity remains out of scope (documented only). See §9 for the as-built status.

**Finalized mitigation order:** **Shield Rating → Immunity → Damage Reduction → Typed resistance → HP → special (ion/stun/scale).**

**Goal:** make **damage-type immunity** a first-class mitigation stage that runs **immediately after Shield Rating** and before DR/resistance/HP.

## Guiding distinction (the crux)

Two different things are called "immunity" today; D4A owns only the first:

- **Damage-type immunity** — no HP damage of that *damage type* (types in the damage taxonomy: `kinetic`, `energy` [+ `fire`/`cold`/`electricity`/`acid`/`sonic`], `ion`, `stun`). **D4A scope.**
- **Effect/condition immunity** — blocks a *secondary effect or condition* (poison, disease, radiation, mind-affecting). Applied where effects/conditions are applied, **not** in the damage-mitigation stage. **Out of scope; documented only.**

Consequence: **droid "immune to poison" is an effect immunity** (poison is a Fortitude/condition effect via `poison-engine`, never a damage component) and must **not** zero HP damage in the mitigation stage. Likewise "immune to mind-affecting" must not zero psychic *damage* unless that damage component is actually tagged with a matching damage type.

---

## 1. Current-state map

### Immunity writers (sources → `collectDamageProtections` kind `immunity`)

| Source | Where | Notes |
|---|---|---|
| Species | `system.derived.speciesImmunities`; structured species rules | mixed damage + effect types |
| Actor fields | `system.immunities`, `system.damageImmunities`, `system.damageImmunity`, `system.damageProtections` | `damage-type-rules.js:344-350` |
| Flags | `flags.swse.damageImmunities/damageImmunity/damageProtections/typedDamageProtections` | `:312-318` |
| Active Effects | `effect.flags.swse.damageProtections/damageImmunities` | `:327-328` |
| **Droid** | `getDroidImmunities` → "Poison" (display); poison-engine canonical | **effect immunity, NOT damage-type** |
| Yuuzhan-Vong | `targetSuppressesForceEffect` / force immunity | force-effect suppression (special) |
| Items | item-level protection values | via `collectDamageProtections` item scan |

### Immunity readers

| Reader | Where | Effect |
|---|---|---|
| `applyDamageTypeProtectionToPacket` | `damage-type-rules.js:501-511` | negate (amount=0) at **packet prep** (before SR) |
| `applyTargetComponentProtections` | `damage-component-rules.js:286-294` | per-component negate at **packet prep** |
| `targetHasDamageImmunity` | `damage-type-rules.js:376` | boolean check |
| Cards | `immunity-resistance-adapter` (droid + typed immunity cards) | display only |
| `collectDamageProtections` | `damage-type-rules.js:338` | the collection authority |

### Key findings

1. **Immunity currently runs before SR** (packet prep). The finalized order needs it **after SR**. This is the central change.
2. **The immunity list mixes damage-type and effect/condition types.** Matching is by damage type against a component's `damageTypes`, so today an effect-only immunity only bites if a component happens to carry that type — fragile. D4A must filter to damage-type immunities explicitly.
3. **No `derived.damageImmunities` exists** — clean slate for a canonical projection.
4. **Droid poison immunity is effect-only** and must be excluded from the damage stage.

---

## 2. Proposed canonical shape

```js
// Damage-type immunities — the ONLY thing the mitigation stage reads.
system.derived.damageImmunities = {
  types: ["ion", "energy"],                 // canonical damage types only
  sources: [ { type: "ion", source: "Droid Chassis" } ]
}

// Effect/condition immunities — RESERVED, not written or read by D4A.
// Consumed by effect/condition application (poison-engine, condition rules), a
// separate layer. Documented here only so the split is explicit.
// system.derived.effectImmunities = { types: ["poison","mind-affecting","disease","radiation"], sources: [...] }
```

- **`DerivedCalculator` projects** `damageImmunities` from `collectDamageProtections` immunity entries, **filtered to canonical damage types** (`normalizeDamageTypeKey` ∈ {kinetic, energy, fire, cold, electricity, acid, sonic, ion, stun}). Non-damage types are excluded (they belong to effect immunity).
- **Raw ActiveEffects never write `system.derived.*`** — sources stay where they are; DerivedCalculator is the only projector.
- `sources[]` for UI/tooltip transparency.

---

## 3. Reader/writer flow

```
Immunity sources (species / actor / flags / items / AE)   effect immunities (poison, mind-affecting, …)
        │  collectDamageProtections (kind: immunity)                 │  (kept in collectDamageProtections;
        ▼                                                            ▼   NOT projected by D4A)
DerivedCalculator  → system.derived.damageImmunities.types   effect/condition application layer (unchanged)
        │
        ▼
Mitigation pipeline (NEW immunity stage, after SR):
  for each remaining damage component:
    if component.damageType ∈ damageImmunities.types AND not bypassed → component → 0 (to DR/HP)
  (SR depletion from this attack already applied and is preserved)
        │
        ▼
DR → typed resistance → HP
Cards/sheets read system.derived.damageImmunities for display
```

---

## 4. Semantics

- **Damage-type immunity** → that damage component deals **0 HP damage**; it still triggered SR resolution/depletion if it hit the shield.
- **Effect/condition immunity** → blocks the secondary effect/condition only; **not** an HP-damage zero. Out of D4A.
- **Bypass** honored: `isDamageProtectionBypassed` (e.g., a source that says "ignores immunity") still applies.
- **Immunity ≠ resistance**: immunity negates a matching component; resistance subtracts a number (D4, separate).

---

## 5. Mitigation pipeline position & multi-type handling

- **Position:** a distinct stage **immediately after Shield Rating**, before DR. Move immunity out of packet prep into this stage.
- **SR interaction:** SR resolves and depletes first (unchanged shield behavior); immunity zeroes immune components from the **post-SR** remainder. If immunity zeroes everything left, **HP takes 0 but SR depletion stands**.
- **Multi-type rule:** operate **per damage component**. Remove only the components whose type is immune; non-immune components continue. **Do not cancel the whole attack** unless *all* remaining components are immune.
- **Component awareness:** the mitigation manager currently takes a single `damage` number, while immunity is inherently per-component. Implementation must make the SR→Immunity boundary component-aware (either run mitigation per component, or carry component breakdown through SR so immunity can drop immune components from the remainder). **This is the main implementation design decision** and should be settled before coding.

---

## 6. Implementation phases (after approval)

1. **Project** `system.derived.damageImmunities.{types,sources}` in `DerivedCalculator` from `collectDamageProtections`, filtered to canonical damage types. (No pipeline change yet; add the projection + cards read it.)
2. **Add the immunity mitigation stage** after SR in the mitigation manager (component-aware); remove immunity from packet prep. Preserve SR depletion when immunity zeroes the remainder.
3. **Repoint cards/tooltips** to `derived.damageImmunities` for damage-type immunity display (keep effect-immunity cards as-is).
4. Leave effect/condition immunity untouched (separate future layer).

## 7. Tests

- Immune to `ion`, no shield: ion attack → 0 HP.
- Immune to `ion`, **shielded**: ion attack → **SR absorbs/depletes normally**, penetrating damage → 0 HP (SR still reduced if it degraded).
- Multi-type (kinetic + ion), immune to ion: only ion component removed; kinetic proceeds through DR/HP.
- **Droid vs poison**: poison is an effect, not a damage component → **HP damage unaffected by the mitigation stage**; poison effect still blocked by the effect layer (unchanged).
- Immune to `mind-affecting` but hit by untyped/kinetic damage → **no HP change from immunity** (damage not tagged mind-affecting).
- Bypass source vs immunity → immunity does not apply.
- Non-immune attack → pipeline unchanged.

## 8. Explicit "do not touch yet" list

- **Shield** (D1/D2) — SR stage unchanged except that immunity now runs after it.
- **DR** implementation (D3) — not in D4A.
- **Typed resistance** (D4 main) — not in D4A; stays after DR when implemented.
- **Effect/condition immunity** (poison, disease, mind-affecting, radiation) — separate effect-application layer; D4A only handles damage-type immunity.
- **Droid ion/stun special rules** — not folded into normal immunity; ion/stun as *damage-type* immunity is fine, but droid-specific ion/stun mechanics stay in their own rules.
- **Vulnerability** — not implemented; not added here.
- No resolver edits, ActiveEffect retargeting, or schema migration in this planning phase.

---

## 9. Implementation status (as built)

**Order delivered:** `Shield Rating → Immunity → Damage Reduction → (typed resistance TBD) → Temp HP → HP`. Immunity runs **after** SR on both paths, so SR still resolves and depletes before immunity zeroes any remainder.

### Canonical damage-type set + collector — `scripts/engine/combat/damage-type-rules.js`

- `DAMAGE_TYPE_KEYS = {kinetic, energy, fire, cold, electricity, acid, sonic, ion, stun}` — the closed set the mitigation stage recognizes.
- `isDamageType(type)` — normalizes then tests membership (directly or via one-way alias expansion, e.g. `fire`→`energy`). Non-damage types (`poison`, `disease`, `mind-affecting`, `radiation`) return `false`.
- `collectDamageTypeImmunities(actor)` — walks `collectDamageProtections`, keeps only `kind === 'immunity'` entries whose type passes `isDamageType`, and returns `{ types: [...], sources: [{type, source}] }`. Poison/effect immunities are filtered out here, so they never reach the damage stage.
- Both helpers are exposed on the `DamageTypeRules` export object.

### Derived projection — `scripts/actors/derived/derived-calculator.js`

- Projects `system.derived.damageImmunities = collectDamageTypeImmunities(actor)` right after the shield projection, wrapped in try/catch that falls back to `{ types: [], sources: [] }`.
- DerivedCalculator remains the **sole** projector; raw ActiveEffects never write `system.derived.*`.

### Single-total path — `scripts/engine/combat/damage-mitigation-manager.js`

- **STAGE 1.5** between SR (`currentDamage = shieldResult.damageAfter`) and DR. Reads `actor.system.derived.damageImmunities.types` with a `collectDamageTypeImmunities(actor)` fallback for un-projected actors.
- Declared types gathered from the canonical component (`options.damageComponents[0]` / `canonicalPacket.components[0]`) plus `context.damageTypes`; immunity matched via `DamageTypeRules.matches(declared, type)` (same semantics as DR exceptions). If matched, remaining damage → 0.
- Adds an `Immunity` breakdown row, a `finalResult.immunity = { applied, types }` block, and per-component `immuneTo` + `mitigation.immunityApplied` on the uniform single-component export.

### Multi-component path — `scripts/engine/combat/damage-component-mitigation.js`

- Immunity stage runs after the shield stage (`afterShieldTotal`) and before DR, per component. Each component's declared types (own `type`/`damageTypes`/`originalDamageTypes`) are matched with `DamageTypeRules.matches`; a match sets that component's post-SR remainder to 0 and records `immunityApplied` + `immuneTo`.
- Only matching components are removed — non-immune components proceed to DR/HP; the whole attack is cancelled only if every remaining component is immune.
- `afterImmunityTotal` is computed so DR is not credited with immunity's reduction; result carries `immunity: { applied, types }`.

### Tests (14/14 PASS, node harness against real resolvers)

Helper filters poison out of the collected immunities; energy immunity zeroes energy and fire (alias) but not vs kinetic; fire immunity zeroes fire but not energy (no reverse alias); poison immunity leaves energy/poison-typed damage untouched (poison is not a damage type); lightsaber+energy vs energy immunity → 0 (immunity after SR, DR-bypass irrelevant); SR+immunity (12 dmg, SR 5, energy immune) → HP 0 with SR absorbing 5 / degrading 5 / immunity applied on the 7 remainder; multi-component energy+kinetic vs energy immunity removes only energy (HP 10); all-immune multi-component → HP 0.

### Non-goals honored

No typed resistance, no DR math change (immunity merely precedes it), no Shield Rating math change, no Force Shield, no effect/condition immunity, no removal of compatibility wrappers.
