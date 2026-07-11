# Phase 3B — Shield & Damage-Reduction SSOT Design

**Status:** Design document only. **No code, no schema migration, no new actor fields, no resolver changes** are made by this phase. Everything below labeled "proposed" requires sign-off before any implementation phase begins.

**The question this phase must answer:** *What is the single source of truth for shields and damage reduction?*

**Why go slow:** Track 3A retargeted force buffs onto an existing SSOT (the ModifierEngine intent domains). Shield/DR is different — there is **no** canonical authority today; the values are fragmented across 3–5 representations and the combat readers read a derived layer that nothing populates. Defining this SSOT wrong would create a second HP/DR-style authority. So this is design-first.

---

## Executive summary of the current reality

- **Shield and DR both have a "phantom" derived layer.** `ShieldMitigationResolver` reads `system.derived.shield.current`; `DamageReductionResolver` reads `system.derived.damageReduction.{highestValue,all,value}`. **`DerivedCalculator` computes neither** (confirmed: zero `shield`/`damageReduction` references in `derived-calculator.js`). The only writer of `derived.shield.current` was the now-removed-in-spirit force raw-AE hack; for DR the derived path is simply always empty for characters.
- **Shield state is fragmented across ~5 representations**; DR across 3, plus a **separate** typed-resistance system.
- **Shield "degradation" is never persisted.** The mitigation pipeline is pure and returns `srRemaining`/`srDegraded` in its result payload, but **no code writes shield state back** to the actor. So SR today behaves as a *static per-hit soak*, not a depleting resource — despite the resolver implementing RAW degradation.
- **Force typed energy DR is unreadable.** `EnergyResistance`/`NegateEnergy` wrote `derived.damageReduction.energy`; the resolver only reads `highestValue/all/value`, never `.energy`.

---

## Current-state map — SHIELD

```
WRITERS (fragmented)                          READERS (divergent)
─────────────────────────                     ──────────────────────────────
system.shields {value,max,rating,regenRate}   ShieldMitigationResolver (combat)
   (base template; also vehicles)      ─┐        → system.derived.shield.current   ← populated by NOBODY
system.shieldRating (ad-hoc; not in base) │     immunity-resistance-adapter (cards)
system.currentSR (ad-hoc)                 ├──▶     → derived.shield.max/current ?? system.shieldRating ?? system.currentSR
Item.armor.shieldRating                   │     PanelContextBuilder (sheet)
system.derived.shield.* (force raw-AE,   ─┘        → derived.shield.current ?? system.shields.value ?? system.currentSR ?? system.shieldRating
   dead)                                        DamageMitigationManager result payload
                                                   → srRemaining/srDegraded  (NOT written back)
```

Evidence: `shield-mitigation-resolver.js:43-47,104-135`; `immunity-resistance-adapter.js:100-108,445`; `PanelContextBuilder.js:132-133`; `template.json Actor.templates.base.shields = {value,max,rating,regenRate}`; `damage-mitigation-manager.js:101-118,182-187` (pure, no write-back).

## Current-state map — DAMAGE REDUCTION

```
WRITERS                                        READER (single: DamageReductionResolver)
─────────────────────────                     ──────────────────────────────
system.damageReduction (base, generic)   ─┐    highest-of:
system.derived.damageReduction.*         ─┤      1. derived.damageReduction.highestValue ?? .all ?? .value  ← empty for chars
   (force raw-AE .energy/.all, mostly     │      2. system.damageReduction  (base, generic)
   dead)                                   ├──▶   3. item abilityMeta.rules DAMAGE_REDUCTION /
item abilityMeta.rules (DAMAGE_REDUCTION, │         CONTEXTUAL_DAMAGE_REDUCTION  ← TYPED-aware, works
   CONTEXTUAL_DAMAGE_REDUCTION; TYPED)    ─┘    (no stacking; lightsaber/bypass rules honored)

SEPARATE, PARALLEL typed system (NOT read by the DR resolver):
damage-type-rules.js → damageResistances / damageResistance  (typed "resistance" entries
   from flags / system / items)  ← its own mitigation concept, distinct axis
```

Evidence: `damage-reduction-resolver.js:210-229,296-302,138-158`; `damage-type-rules.js:282-349`; base field `template.json Actor.templates.base.damageReduction=0`; typed-DR rule authors: droid-combat feats, lightsaber crystals, `rule-definitions.js`.

---

## Key findings (the design must resolve these)

1. **No derived authority exists.** The readers assume a resolved derived layer that `DerivedCalculator` never produces. This is the gap the force raw-AE writes were hacking around.
2. **Shield is not currently a resource.** Degradation is computed but never persisted. Decision required: *is SR a depleting resource or a static soak?*
3. **Five shield representations, three DR representations, plus a parallel resistance system.** No single stored source.
4. **Typed vs generic is inconsistent.** DR resolver: typed only via item rules; derived/base paths generic-only. Force energy DR went to a typed derived key nothing reads. A separate `damageResistances` axis exists for typed resistance.
5. **Cross-reader divergence.** Combat reads `derived.shield.current`; sheet/cards read base fields with different precedence. Even if we populate derived, the base-field readers must be reconciled or they will disagree.

---

## Proposed canonical model (for agreement — not yet implemented)

Design principle (hard rule, carried from the audit): **raw ActiveEffects must never write `system.derived.*`.** Effects/powers write *canonical stored state* or feed *ModifierEngine*; `DerivedCalculator` is the only writer of the derived projection the resolvers read.

### Target flow

```
Current writer (power/feat/item/armor)
        │  writes canonical STORED state or a ModifierEngine DR source
        ▼
Canonical stored state
   • Shield:  system.shields = { value, max, rating, regenRate }   (already in template)
   • DR:      ModifierEngine "damageReduction" domain  +  system.damageReduction (base)  +  item rules
        │
        ▼
DerivedCalculator resolution  (ONLY writer of the derived projection)
   • system.derived.shield   = { current, max, source }   ← from system.shields (+ armor/temp sources)
   • system.derived.damageReduction = { highestValue, byType:{energy,…}, sources[] }
        │
        ▼
ShieldMitigationResolver  reads ONLY system.derived.shield.current/max/source   (unchanged contract)
DamageReductionResolver   reads ONLY system.derived.damageReduction             (single representation)
```

### Shield — recommended: **persistent resource, `system.shields` as SSOT**

- **Canonical stored state:** `system.shields = { value, max, rating, regenRate }` (already exists in the base template — no new field needed). `value` = current SR, `max`/`rating` = ceiling.
- **DerivedCalculator** projects `system.derived.shield.{current,max,source}` from `system.shields` (+ `Item.armor.shieldRating`, + any temporary SR source). Resolver contract unchanged.
- **Depletion becomes real:** the damage flow persists `srRemaining` back to `system.shields.value` via **ActorEngine** (the mitigation manager stays pure; a thin ActorEngine step applies the returned `srRemaining`). This is the one genuinely new behavior and needs its own review.
- **Force Shield** grants temporary SR by raising `system.shields` through ActorEngine (option 3: ActorEngine-managed resource) — never by writing derived.
- *Alternative (S2):* keep SR a static computed soak (no persistence), drop degradation. Simpler, less RAW-accurate. **Not recommended** but listed for the decision.

### DR — recommended: **`system.derived.damageReduction` as the single read representation**

- **DamageReductionResolver reads exactly one thing:** `system.derived.damageReduction` (a `{ highestValue, byType, sources[] }` object). It stops reading base `system.damageReduction` and item rules directly.
- **DerivedCalculator resolves** `system.derived.damageReduction` from all canonical sources: base `system.damageReduction`, item `abilityMeta.rules` DR (typed + generic), and a **ModifierEngine "damageReduction" domain** (the resolver already *claims* this in its header comment but never uses it).
- **Force DR:**
  - **Force Body (generic DR)** → a temporary ModifierEngine damageReduction modifier (option 1), resolved into `derived.damageReduction.highestValue`.
  - **Energy Resistance / Negate Energy (typed energy)** → typed DR feeding `derived.damageReduction.byType.energy` **or** the existing `damageResistances` axis — see Typed-DR decision below.

### Typed DR / resistance — recommended: **one typed axis**

- **Inventory of typed mitigation today:** item `CONTEXTUAL_DAMAGE_REDUCTION` rules (typed, read by DR resolver); droid-combat feat DR; lightsaber-crystal DR; the separate `damageResistances`/`damageResistance` system in `damage-type-rules.js`; force energy DR (dead).
- **Decision required:** SWSE has no distinct "resistance" mechanic separate from typed DR — energy resistance *is* DR vs energy. Recommend **consolidating typed mitigation onto `derived.damageReduction.byType`** and having the resolver support typed DR natively (it currently only gets typed via item rules). Clarify the role of the parallel `damageResistances` system or fold it in. Until consolidated, do **not** add a second typed path for force powers.

---

## Answers to the four questions

1. **Shield**
   - *Persistent actor resource?* **Recommended yes** — `system.shields.value` as stored current SR.
   - *Force Shield grants temporary SR?* **Yes**, by raising `system.shields` via ActorEngine (not derived).
   - *What should the resolver consume?* **`system.derived.shield.current`** (unchanged), projected by DerivedCalculator from `system.shields`. Not `system.shieldRating`/`system.currentSR` — those get reconciled into `system.shields` and the divergent sheet/card readers repointed.
   - *Or remain a derived value each recalc?* Only as the *projection*; the *authority* is stored `system.shields`.

2. **Damage Reduction**
   - *Canonical source?* **`system.derived.damageReduction`**, resolved by DerivedCalculator from base field + item rules + ModifierEngine DR domain.
   - *How do Force powers grant it?* Generic → **temporary DR modifier** (ModifierEngine); typed energy → **typed DR** on `byType.energy` (pending the typed-axis decision).
   - *Resolver consumes exactly one representation?* **Yes — `system.derived.damageReduction` only.**

3. **DerivedCalculator**
   - Adds a shield step (`system.shields` → `derived.shield`) and a DR step (all sources → `derived.damageReduction`). **Raw ActiveEffects never write `system.derived.*`** — they write `system.shields`/DR modifiers, and DerivedCalculator projects.

4. **Typed DR**
   - Typed DR exists today only via item rules + the parallel `damageResistances` system. Recommend the resolver support typed DR **natively** via `derived.damageReduction.byType`, unifying the axis. Inventory above.

---

## Open decisions requiring sign-off before implementation

- **D1. Shield model:** persistent depleting resource (S1, recommended) vs static computed soak (S2)? This decides whether ActorEngine gains a shield-persistence step.
- **D2. Shield field consolidation:** adopt `system.shields` as the single stored authority and repoint the `system.shieldRating` / `system.currentSR` / sheet/card readers? (Reconciliation, not a new field.)
- **D3. DR single representation:** collapse the resolver's three read paths into `system.derived.damageReduction` only?
- **D4. Typed axis:** unify typed energy DR onto `derived.damageReduction.byType`, and decide the fate of the parallel `damageResistances` system (fold in vs keep separate)?
- **D5. Scope split for implementation:** shield and DR are independent SSOTs and could be two separate implementation PRs.

Once D1–D4 are agreed, implementation proceeds in this order: (1) DerivedCalculator resolution steps reading canonical state; (2) repoint resolvers to the single representation; (3) migrate force powers (and reconcile the fragmented base fields); (4) add ActorEngine shield-depletion persistence if S1 is chosen.

**No implementation, schema change, new field, or resolver edit is made until the above is approved.**
