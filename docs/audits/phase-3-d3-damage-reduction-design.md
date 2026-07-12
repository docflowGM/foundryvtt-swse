# Phase 3 · D3 — Generic Damage-Reduction SSOT Design

**Status:** Design document only. **No code, no resolver change, no schema migration, no ActiveEffect retargeting.** Everything below is a proposal for sign-off.

**Scope:** D3 = the **generic** DR single-source-of-truth. **D4** (typed DR / energy resistance / the parallel `damageResistances` axis) is explicitly out of scope and remains untouched. Shield (D1/D2) is already resolved and implemented separately; DR work does not touch it.

**The question D3 answers:** *What is the single source of truth for generic damage reduction?*

**Recommended answer (matches the stated preference):** `DerivedCalculator` projects all generic DR sources into **`system.derived.damageReduction.all`** (a number) with a **breakdown**, and `DamageReductionResolver` reads only that for generic DR. Typed DR waits for D4.

---

## Current-state map — generic DR

### Writers (sources)

| Source | Where | Representation | Class |
|---|---|---|---|
| **Base actor field** | `template.json Actor.templates.base.damageReduction = 0` (number) | `system.damageReduction` (generic number) | stored input |
| Tech-specialist customization | `tech-specialist-modification-service.js:373` | `system.damageReduction += amount` | stored input |
| **Talents** | `talents.js:97` ("DR 5", mode 5 OVERRIDE), `:107` ("Improved DR", mode 2 ADD) | core-AE write to `system.damageReduction` | stored input (via core AE) |
| GM edit / sheet | `GMApprovalsSurfaceService.js:210`, `character-sheet*/form.js` | `system.damageReduction` editable | stored input |
| **Item / rule DR** | `abilityMeta.rules` type `DAMAGE_REDUCTION` / `CONTEXTUAL_DAMAGE_REDUCTION`; authors incl. `lightsaber-crystals-map.js`, droid-combat feat hooks, species migration (`migrate-species-to-structured-rules.js:571`) | item rule `{value, damageTypes?}` (generic when no `damageTypes`) | stored-on-item |
| **Force DR (generic)** | `force-power-effects-engine.js:416` Force Body | raw AE → `system.derived.damageReduction.all` (**dead-ish**; read by resolver but never projected/removed cleanly) | temporary effect |
| Import | `stock-droid-importer-engine.js:200/242`, `vehicle-import-normalizer.js:486` | `damageReduction` number | migration data |

> **Typed sources (D4, listed for boundary only, NOT D3):** item `CONTEXTUAL_DAMAGE_REDUCTION` with `damageTypes`; force `derived.damageReduction.energy` (Energy Resistance / Negate Energy); the parallel `damageResistances`/`damageResistance` axis (`damage-type-rules.js`); force-alchemy item `system.damageReduction.{value,type}` object shape.

### Readers

| Reader | Reads | Notes |
|---|---|---|
| **`DamageReductionResolver`** (combat) | `derived.damageReduction.{highestValue,all,value}` **+** base `system.damageReduction` **+** item rules — highest-only | `:212,218,225,298-300`. The multi-source view. |
| **Info card** (`immunity-resistance-adapter.getActorDamageReduction`) | base `system.damageReduction` only | `:92`. Misses item-rule + force DR → **diverges from combat**. |
| **Sheet** (`PanelContextBuilder.js:136`) | base `system.damageReduction` only | display/edit. |
| Chat/log (`damage-log-formatter.js:97-163`, `damage-mitigation-manager.js:230`) | the resolver *result* (`mitigation.damageReduction.applied/source`) | not actor state — unaffected. |
| Store/forms | base `system.damageReduction` | display/edit. |
| Vehicles (`vehicle-derived-builder.js:144`, `vehicle-calculations.js:133`) | `system.damageReduction` → `derived.damage.reduction` | **different derived key**, vehicle-only — out of scope. |

### Key findings

1. **Two disagreeing "views" of DR.** Combat resolves the highest of (base + derived + item rules); the sheet/card show only the base field. Item-rule DR and force generic DR appear in combat but not on the sheet — a live inconsistency.
2. **No derived authority exists for characters.** `DerivedCalculator` never writes `derived.damageReduction` (only the vehicle builder writes the unrelated `derived.damage.reduction`). The resolver's `derived.damageReduction.*` reads are populated only by the dead-ish force raw-AE writes.
3. **Shape drift on `system.damageReduction`.** Canonically a number (template `0`), but force-alchemy uses an `{value,type}` object (on items). Any object value read as `Number(...)` collapses to `0`. (Typed/D4, but flagged.)
4. **Stacking is highest-only** in the resolver today (RAW: DR does not stack, highest applies). The SSOT must preserve highest-only.

---

## Proposed canonical flow (D3)

```
Generic DR sources
  • base system.damageReduction (GM / tech-specialist / talents via core AE)
  • item abilityMeta.rules DAMAGE_REDUCTION with NO damageTypes (generic)
  • ModifierEngine "damageReduction" domain (Force Body & future temp DR → a modifier, NOT a derived write)
        │
        ▼
DerivedCalculator  (ONLY writer of system.derived.*)
   computes system.derived.damageReduction.all = highest generic source
   + records system.derived.damageReduction.sources[] (breakdown)
        │
        ▼
system.derived.damageReduction  (single generic representation)
        │
        ▼
DamageReductionResolver  reads ONLY derived.damageReduction.all for generic DR
   (keeps bypass rules: lightsaber, bypassDR, ignore-DR-if-overcome)
   (typed item-rule path stays until D4)
Sheet / card / tooltip  read the same derived.damageReduction.all → no more divergence
```

Hard rule preserved: **raw ActiveEffects never write `system.derived.*`.** Force Body's generic DR becomes a ModifierEngine DR modifier (same pattern as Track 3A), which `DerivedCalculator` folds into `.all`.

---

## Target shape for `system.derived.damageReduction`

```js
system.derived.damageReduction = {
  all: 10,                         // canonical GENERIC DR (highest of generic sources); 0 if none
  sources: [                       // breakdown for UI/tooltip transparency (all generic contributors)
    { label: 'Armor Plating', value: 10, origin: 'item' },
    { label: 'Damage Reduction 5 (talent)', value: 5, origin: 'base' }
  ],
  // byType: {}   ← RESERVED for D4 (typed). Not written or read in D3.
}
```

- **`all`** = single number, **highest-only** (RAW: no stacking). Not a sum.
- **`sources`** = non-authoritative breakdown (for tooltips / "why is my DR 10").
- **`byType`** reserved but unused in D3. D3 must not populate or read it; the resolver's typed item-rule path is left intact for D4.
- Keep `highestValue`/`value` as **read-compat aliases** during migration if cheap, or point the resolver straight at `.all` (it already reads `.all` first).

---

## What stays stored vs computed

| DR kind | Stored authority (unchanged) | Computed into `.all` |
|---|---|---|
| Permanent armor DR | item `abilityMeta.rules` (generic) | yes |
| Species DR | structured species rule | yes |
| Feat/talent DR | base `system.damageReduction` (talents) / item rule | yes |
| Tech-specialist / GM DR | base `system.damageReduction` | yes |
| Force **temporary** generic DR (Force Body) | a ModifierEngine DR modifier (temporary effect) — **not** a derived write | yes |
| Item-derived DR | item rules | yes |

Principle: **sources remain stored** where they already live; only the **resolved generic value** is computed into `derived.damageReduction.all`. Nothing writes `system.derived.*` except `DerivedCalculator`.

---

## Migration / fallback policy

- **Keep `system.damageReduction` as a stored input.** It stays GM-editable and remains a legitimate source that `DerivedCalculator` reads. It is simply no longer read *directly* by the resolver.
- **Resolver fallback during rollout:** while migrating, the resolver may read `derived.damageReduction.all ?? system.damageReduction` so a not-yet-projected actor never loses DR. Remove the fallback once projection is verified to enumerate every source.
- **Force Body:** retarget its raw `derived.damageReduction.all` write to a ModifierEngine generic-DR modifier (force-power track work) so it flows through projection. Until then, the resolver's temporary read of `.all` keeps it working — but `DerivedCalculator` must not clobber a force-written `.all` (mirror the shield "stored" guard, or complete the Force Body retarget first).
- **Repoint sheet/card/tooltip** to `derived.damageReduction.all` so displayed DR matches combat.

---

## Implementation phases (when D3 is approved — not now)

1. **Project:** `DerivedCalculator` computes `derived.damageReduction.{all,sources}` from base field + generic item rules + ModifierEngine DR domain. (Adds a derived step; no resolver change yet.)
2. **Repoint readers:** sheet/card/tooltip read `derived.damageReduction.all`.
3. **Collapse resolver (generic):** `DamageReductionResolver` reads only `derived.damageReduction.all` for generic DR; keep typed item-rule path + bypass rules. Add the migration fallback, then remove it.
4. **Retarget Force Body** generic DR to a ModifierEngine modifier (coordinate with force-power shield track).

---

## Risks

- **Missed source → DR drop.** If projection fails to enumerate a current source, combat DR silently decreases. Mitigation: enumerate every writer in this doc; keep the resolver fallback to base field until parity is verified with a damage test.
- **Visible DR changes on the sheet.** Repointing the card/sheet to `.all` will *increase* shown DR where item-rule/force DR was previously hidden. Intended fix, but a visible change to communicate.
- **Force Body ordering.** If `DerivedCalculator` writes `.all` while Force Body still raw-writes `.all`, order matters (projection would clobber the force value). Resolve by retargeting Force Body first, or a "stored"-style guard as done for shield.
- **Highest-only regressions.** Must preserve non-stacking. Summing sources instead of max would inflate DR.
- **Vehicle divergence.** Vehicles use `derived.damage.reduction` (different key). Do not unify here.

---

## Explicit "do not touch yet" list

- **Typed DR (D4):** item `CONTEXTUAL_DAMAGE_REDUCTION` typed rules, force `derived.damageReduction.energy` (Energy Resistance / Negate Energy), the `damageResistances`/`damageResistance` axis, and the force-alchemy `{value,type}` shape. **D3 does not merge generic and typed** unless D4 proves they are the same mechanic.
- **Shield (D1/D2):** done — untouched by DR work.
- **Bypass / ignore-DR rules** (lightsaber, `bypassDR`, ignore-DR-if-overcome): keep in the resolver, unchanged.
- **Vehicle DR** (`derived.damage.reduction`): separate vehicle track.
- **No ActiveEffect retargeting** in D3 design; Force Body retarget is an implementation-phase task after sign-off.

---

## D3 vs D4 boundary (explicit)

- **D3 = generic DR SSOT** → `system.derived.damageReduction.all` (+ breakdown), highest-only, resolver reads only that for generic.
- **D4 = typed DR** → `system.derived.damageReduction.byType`, energy resistance, and reconciling the parallel `damageResistances` system. Decides whether typed DR and "resistance" are one mechanic. Starts only after D3 is merged.
