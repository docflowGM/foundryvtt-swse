# Phase 3 · D4 — Typed Damage Mitigation Design (Qualified DR + Resistance/Immunity)

**Status:** ✅ **Typed resistance implemented** (this slice). Qualified DR (`DR X/exception`) already landed in D3; immunity landed in D4A. This slice adds the typed-**resistance** mitigation stage (applies-to), consolidates "reduce type X by N" into it, moves resistance out of packet-prep to after DR, and neutralizes the dead Force `derived.damageReduction.energy` writes. See §10 for as-built status. Vulnerability and effect/condition immunity remain out of scope.

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

## 6. Resolver order — ✅ DECIDED (revised)

**Canonical mitigation order (signed off):**
1. **Shield Rating (SR)** → absorb + degrade. *The shield is an external energy barrier; the attack interacts with it before the target's biology/material immunities matter.*
2. **Immunity** (damage-type) → zero immune damage components. *SR has already resolved/depleted; immunity only blocks what would reach DR/HP.*
3. **Damage Reduction** (generic + `DR/exception`).
4. **Typed Resistance** (applies-to, e.g. Energy Resistance).
5. **HP** (Temp HP then real HP).
6. **Special damage** (ion/stun/scale) — own rules; document interactions, do not restructure.

Rationale: **SR before immunity.** A poison shot against a shielded droid still resolves against SR first (SR absorbs/depletes); if damage penetrates, the droid's immunity blocks it afterward. **Implication:** when immunity cancels post-SR damage, HP takes 0 but any SR depletion caused by the incoming attack **remains valid**.

> **Implementation implication (behavior change):** the current code applies immunity + typed resistance at **packet prep** (`damage-packet-rules.js:379-381`), *before* SR. The agreed order requires **moving both immunity and typed resistance to after SR** — immunity right after SR (before DR), typed resistance after DR (before HP). Both are deliberate, visible changes (mixed shield + immunity/resistance cases) and must be covered by tests. Immunity is a first-class stage (D4A); see `phase-3-d4a-immunity-design.md`.

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
4. **Ordering (decided):** move the typed-resistance stage out of packet-prep to **after DR, before HP** (immunity stays first, SR before resistance). Add it as an explicit mitigation stage alongside SR/DR/TempHP; cover mixed shield+resistance cases with tests.

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

---

## 10. Implementation status (as built — typed resistance slice)

**Order delivered:** `Shield Rating → Immunity → Damage Reduction → Typed Resistance → Temp HP → HP → special`. Resistance is a distinct stage **after DR, before Temp HP**, on both mitigation paths.

### Canonical resistance collector + matcher — `scripts/engine/combat/damage-type-rules.js`

- `collectDamageTypeResistances(actor)` → `{ types, byType, sources }`. Consolidates two families of "reduce type X by N" (applies-to):
  1. `kind:'resistance'` protections from `collectDamageProtections` (species / actor / flags / AE `effectType:'damageReduction'`+`drType` flag / item `RESISTANCE` rules).
  2. Item `DAMAGE_REDUCTION`/`CONTEXTUAL_DAMAGE_REDUCTION` rules that declare `damageTypes` **and no exceptions** — applies-to, so they are resistance, not DR.
  Highest-only per damage type (`byType`); non-damage types filtered by the same `isDamageType` gate as immunity.
- `resistanceForComponentTypes(declaredTypes, resistances)` → highest-only matching amount, using `DamageTypeRules.matches` (identical alias semantics to DR exceptions and immunity: fire/ion/… → energy).
- Both exposed on the `DamageTypeRules` export.

### Derived projection — `scripts/actors/derived/derived-calculator.js`

- Projects `system.derived.damageResistances = collectDamageTypeResistances(actor)` after `damageImmunities` (try/catch fallback `{types:[],byType:{},sources:[]}`). DerivedCalculator remains the sole projector.

### Mitigation stage — single-total (`damage-mitigation-manager.js`) and multi-component (`damage-component-mitigation.js`)

- New **Typed Resistance** stage after DR, before Temp HP. Reads `system.derived.damageResistances` with a `collectDamageTypeResistances(actor)` fallback. Per component: highest-only subtraction against matching declared types. An immune component is already `0` before this stage, so resistance never double-counts it.
- Records `resistance.applied` / `resistance.types` on the result, `afterResistance` in the flow, and per-component `mitigation.resistanceApplied` / `resistanceSource` + `resistedBy`. Attribution is kept distinct (immunity vs DR vs resistance never conflated).

### Consolidation & cleanup

- **DR resolver** (`damage-reduction-resolver.js`): the typed applies-to item-DR fold (`collectItemDamageReduction` typed pass) is removed. The resolver now handles **only** generic DR, `DR X/exception` (canonical entries), and lightsaber/bypass-DR. Generic item DR still arrives via `getCanonicalDamageReductionEntries`.
- **Multi-component path**: the former per-component "typed DR pass" is replaced by the resistance stage (it was applies-to = resistance all along).
- **Packet prep** (`damage-component-rules.js`): resistance is no longer applied in `applyTargetComponentProtections` (it ran pre-SR). Immunity stays there for now (D4A owns its move). Removes the visible pre-SR reduction so **SR resolves/depletes first and only post-SR/DR damage is resisted**.
- **Force Energy Resistance / Negate Energy** (`force-power-effects-engine.js`): the dead `system.derived.damageReduction.energy` raw AE writes (no reader; violated "AEs never write `system.derived.*`") are removed. Energy Resistance keeps working via its `effectType:'damageReduction'`+`drType:'energy'` flag → canonical resistance entry. Negate Energy carried no `drType`, so it was already a no-op; wiring it through the resistance layer is a deliberate behavior change **deferred** to a follow-up.

### Tests (22/22 PASS, node harness against real resolvers)

Collector highest-only + poison-excluded + typed-item-DR→resistance + DR-exception-not-resistance; ER10 vs energy/fire(alias)/ vs fire-res-not-energy; multi energy+kinetic only-energy-reduced; **SR + ER: SR absorbs/degrades first, resistance only on the remainder (the agreed visible change)**; immunity+resistance no double-count; DR+resistance ordering; multiple sources highest-only; lightsaber bypasses DR but resistance still applies; typed item DR applied at the resistance stage.

### Non-goals honored

No Shield Rating math change, no immunity-semantics change, no DR redesign (only removed the typed-applies-to fold), no effect/condition immunity, no vulnerability, no Force Shield, no compatibility-wrapper removal, no broad UI overhaul.
