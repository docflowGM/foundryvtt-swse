# Phase 3 · D4 — Typed Damage Mitigation Design (Qualified DR + Resistance/Immunity)

**Status:** Design document only. **No code, no resolver change, no ActiveEffect retargeting, no schema migration.** Proposal for sign-off.

**Scope:** D4 = typed damage mitigation — qualified Damage Reduction (`DR X / exception`) and the `damageResistances` / immunity axis. Shield (D1/D2) is done and untouched. Generic DR (D3) is touched only for shape-compatibility.

## Executive correction (per the RAW addendum)

Saga Edition does **not** have a separate "typed DR" mechanic. There is **one** Damage Reduction mechanic with an optional qualifier:

- `DR X` — reduces all qualifying damage by X.
- `DR X / exception` — DR X against everything **except** the listed type (the exception **bypasses** the DR; D&D-style notation, e.g. `DR 5/energy` = no DR vs energy, DR 5 vs all else).

This **supersedes the D3 `byType` proposal.** The canonical DR shape becomes a list of `{ value, exceptions[] }` entries; generic DR is simply `exceptions: []`. **D3 implementation should adopt this entry shape from the start** rather than building `byType` and removing it.

Separately, `damageResistances` (typed flat reduction that **applies only to** a type, e.g. Energy Resistance) and **immunity** (negation) are a **distinct** layer — related to DR (both subtract a number) but with **opposite qualifier semantics** (resistance = *applies-to* a type; DR exception = *bypassed-by* a type) and a different pipeline stage. **Keep them distinct** (matches the stated preference and RAW).

---

## 1. Current typed-mitigation writers

| Source | Where | Shape | Layer today |
|---|---|---|---|
| **Force: Energy Resistance / Negate Energy** | `force-power-effects-engine.js:311/452` | raw AE → `derived.damageReduction.energy` (**dead**; resolver never reads `.energy`) **AND** effect flag `effectType:'damageReduction'` + `drType:'energy'` + `drValue` → **resistance** (works) | resistance (via flag) + dead DR write |
| **Force: Force Body** | `:416` | raw AE → `derived.damageReduction.all` (generic) | generic DR (D3) |
| **Item / armor rules** | `abilityMeta.rules` `CONTEXTUAL_DAMAGE_REDUCTION` w/ `damageTypes` | item rule; **applies-to** semantics (`ruleMatchesDamageContext` returns true when damage *is* one of the types) | DR resolver (typed) |
| **Species traits** | `derived.speciesResistances` / `speciesImmunities`; structured species rules | resistance / immunity entries | resistance/immunity |
| **Feats/talents** | `talents.js` DR (generic, base field); talent `damageReduction.ignoreUntilEndOfTurn` flag | base field / flag | generic DR / special |
| **`damageResistances` / `damageResistance`** | `actor.system`, flags, AE, items → `collectDamageProtections` | `{type, amount}` typed flat reduction; also `immunities` | resistance/immunity |
| **Immunities** | `system.immunities`, droid poison immunity, Yuuzhan-Vong force immunity | negation | immunity |
| **force-alchemy item DR** | `force-alchemy-mechanics-service.js:946` | item `system.damageReduction.{value,type}` object | item DR (object shape — inconsistent) |
| **Import/migration** | droid/vehicle importers; species migration `type:'damageReduction'` rules | numbers / rules | mixed |

## 2. Current typed-mitigation readers

| Reader | Reads | Semantics |
|---|---|---|
| **`DamageReductionResolver`** (mitigation stage 2) | item `CONTEXTUAL_DAMAGE_REDUCTION` w/ `damageTypes` (applies-to) + generic | highest-only; typed = applies-to |
| **`applyTargetComponentProtections`** (`damage-component-rules.js:296-308`) | `resistance` entries (per component) | flat reduce `amount - resistance` (highest-only); `<=0` → suppressed |
| **`applyDamageTypeProtectionToPacket`** (`damage-type-rules.js:501-511`) | `immunity` entries | negate (amount=0) |
| **`immunity-resistance-adapter`** (cards) | `collectDamageProtections` typed list + base DR | display |
| **damage pipeline** | `damage-packet-rules.js:379-381` runs immunity+resistance at **packet prep**, before `DamageMitigationManager` (SR→DR→TempHP) | ordering |
| Force execution | `targetSuppressesForceEffect` (Yuuzhan-Vong force immunity) | suppress force effects |
| Vehicle/droid | ion/stun special handling; vehicle `derived.damage.reduction` | out of scope |

## 3. Distinguishing the mechanics

| Mechanic | Qualifier | Effect | Canonical home |
|---|---|---|---|
| **Generic DR** (`DR X`) | none | −X flat | DR (`exceptions:[]`) |
| **Qualified DR** (`DR X / exception`) | **bypassed-by** type | −X unless damage is the exception | DR (`{value, exceptions[]}`) |
| **Typed resistance** (`Energy Resistance`, "DR X vs energy") | **applies-to** type | −X only for that type | **resistance layer** |
| **Immunity** | applies-to type | negate (0) | immunity layer |
| **Vulnerability** | applies-to type | ×2 (or similar) | **not implemented** (only scale double-damage exists) |
| **Shield Rating** | — | absorb + degrade | shields (done, D1/D2) |
| **Ion / stun** | damage type | own tracks (ion vs droids/vehicles/shields; stun track) | special-damage rules (unchanged) |

## 4. Are `damageResistances` and DR the same mechanic?

**Related but distinct — keep separate.** The audit confirms the preference and RAW:

- **DR** = flat reduction with a **bypassed-by** qualifier (`DR X/exception`). Applied in the SR→DR mitigation stage.
- **Resistance** = flat reduction with an **applies-to** qualifier (Energy Resistance), plus **immunity** (negate). Applied at packet/component prep.
- They subtract a number, but the qualifier semantics are **opposite** and they sit at **different pipeline stages**. Merging would conflate "bypassed-by" with "applies-to."
- **However, there is real duplication to fix:** "reduce type X by N" (applies-to) is currently modeled in **both** the DR resolver (item `CONTEXTUAL_DAMAGE_REDUCTION`) **and** the resistance layer. D4 should **consolidate applies-to typed reduction into the resistance layer**, leaving the DR resolver for generic + `DR/exception` only. Energy Resistance's dead `derived.damageReduction.energy` write is removed (it already works as a resistance entry).

## 5. Proposed canonical shapes

**Damage Reduction (unifies D3 generic + D4 qualified):**
```js
system.derived.damageReduction = {
  all: 10,                                   // highest GENERIC-applicable DR for quick reads
  entries: [                                 // qualified DR, RAW DR X / exception
    { value: 10, exceptions: [] },           // DR 10
    { value: 15, exceptions: ['lightsabers'] } // DR 15/lightsabers
  ],
  sources: [ { label, value, exceptions, origin } ]
}
```
Resolver: effective DR = **highest** `entries[i].value` whose `exceptions` does **not** include the incoming damage type (highest-only, RAW no-stacking). Generic = `exceptions:[]`.

**Resistance / immunity (keep the existing protection layer; optionally project for a single read):**
```js
// Authoritative collection stays via collectDamageProtections (sources unchanged).
// OPTIONAL later: project a resolved snapshot for UI/one-read:
system.derived.damageProtections = {
  resistances: [ { type:'energy', amount:10, source } ],  // applies-to, highest-only per type
  immunities:  [ { type:'ion', source } ],
  // vulnerabilities: []   // reserved; not implemented today
}
```
Immunity = negate. Resistance = flat reduce (highest-only per type). No merge with DR.

## 6. Proposed resolver order

**Current effective order:** immunity + typed resistance (packet prep) → **SR → DR → Temp HP**.

**Proposed canonical order (for sign-off — RAW ordering of resistance vs SR needs a decision):**
1. **Immunity** → negate, stop.
2. **Shield Rating (SR)** → absorb + degrade *(RAW: SR absorbs first among reductions)*.
3. **Damage Reduction** (generic + `DR/exception`).
4. **Typed Resistance** (applies-to, e.g. Energy Resistance).
5. **Temp HP**.
6. **Special damage** (ion/stun/scale) — own rules; document interactions, do not restructure.

> **Open ordering question:** the current code applies typed resistance **before** SR (at packet prep), whereas RAW has SR absorb first. Whether to move resistance after SR/DR is a RAW-ordering decision to confirm before implementation. **Immunity-first** is not negotiable (immune = no damage). Note: the user's starting order listed immunity last — that is corrected here, since immunity must negate before any reduction.

## 7. What D4 does NOT do

- **No shield changes** (D1/D2 done).
- **No generic-DR changes beyond D3 compatibility** — the only D3 impact is adopting the `{value, exceptions[]}` entry shape instead of `byType`.
- **No Force Shield** work.
- **No vehicle shield/DR redesign** (`derived.damage.reduction` stays).
- **No schema migration** unless separately approved.
- **No ActiveEffect retargeting or resolver edits** in this design phase.

---

## Migration / fallback policy

- **Keep `collectDamageProtections` and its sources** as the resistance/immunity authority; D4 does not remove them. An optional `derived.damageProtections` projection is a *read-convenience*, not a new authority — deferred/optional.
- **DR entry model:** `DerivedCalculator` builds `damageReduction.entries` from generic sources (D3) plus qualified sources (`DR X/exception`). During rollout, keep the resolver's fallback to the base field until parity is verified.
- **Consolidate applies-to typed reduction** (item `CONTEXTUAL_DAMAGE_REDUCTION` → resistance layer) in a dedicated step; until then both paths coexist (risk: double reduction — see risks).
- **Remove Force Energy Resistance's dead `derived.damageReduction.energy` write** once confirmed the resistance-entry path covers it (it does, via `effectType/drType`).

## Implementation phases (after sign-off)

1. **DR entry shape:** land `damageReduction.{all,entries,sources}` in the D3 projection (supersede `byType`); resolver computes effective DR via exceptions.
2. **Consolidate applies-to reduction** into the resistance layer; retire item `CONTEXTUAL_DAMAGE_REDUCTION`'s applies-to use (or route it to resistance). Remove Energy Resistance's dead DR write.
3. **Optional protection projection** `derived.damageProtections` for single-read UI, if desired.
4. **Ordering:** implement the agreed resolver order; add an explicit resistance stage if it moves after SR/DR.

## Risks

- **Double reduction during consolidation.** While applies-to typed reduction exists in both the DR resolver (item rules) and the resistance layer, a typed source counted in both would reduce twice. Mitigation: consolidate atomically and test energy/typed cases.
- **Exception-vs-applies-to inversion.** The current item `CONTEXTUAL_DAMAGE_REDUCTION` uses *applies-to*; RAW `DR X/exception` is *bypassed-by*. Mislabeling an entry's `exceptions` as an applies-to list would invert the mechanic. The `{value, exceptions[]}` model must be authored carefully (exceptions = what bypasses).
- **Ordering change is visible.** Moving resistance after SR/DR changes numbers in mixed cases; needs sign-off + tests.
- **Immunity-first must hold** across both the packet layer and any resolver reorg.
- **Lightsaber/bypass interplay.** `lightsabers`/`bypassDR` already zero DR; ensure qualified DR (`DR X/lightsabers`) composes correctly with the existing bypass rules rather than double-handling.

## Explicit "do not touch yet" list

- Shield (D1/D2), Force Shield, vehicle shield/DR, `derived.damage.reduction`.
- The `damageResistances`/immunity **sources** and `collectDamageProtections` collection (kept; only an optional projection is proposed).
- Ion/stun/scale special-damage rules (documented for ordering only).
- Bypass rules (lightsaber, `bypassDR`, ignore-DR-if-overcome) — keep as-is in the resolver.
- No resolver edits, ActiveEffect retargeting, or schema migration in this phase.

## D3 ↔ D4 reconciliation (important)

D4 **replaces D3's reserved `byType`** with the RAW `{value, exceptions[]}` DR entry model. If D3 is implemented first, it should use `damageReduction.entries` (with `exceptions:[]` for generic) so D4 qualified DR is additive, not a rewrite. Typed **applies-to** reduction (Energy Resistance) and immunity remain the separate resistance layer.
