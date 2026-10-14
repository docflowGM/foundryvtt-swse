# ModificationSlotAuthority — Phase 1a Contract (revision 2)

**Status:** contract only, for owner and independent-reviewer approval. **No resolver code, test code, catalog, pack or consumer change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `cc5f8fbcc98396e189c93e7ac07f97345e1d170c` (`origin/main`, Phase 0 audit merged via PR #1031).
**Binding inputs:** the merged Phase 0 audit (`docs/audits/weapon-modification-convergence-phase-0-audit.md`), handoff v2 sections 0A and 2, and the independent review of this contract (decisions D1-D9 and mandatory corrections 1-7, recorded in section 13). Where this document and those differ, they win.
**Labels:** **LOCKED** = decided by the review. **PROPOSAL** = my drafting, needs approval. **OPEN** = a question only the owner/reviewer may settle (section 14); the contract states the facts and does not choose.

**Revision 2** replaces revision 1 (`854f2f1`). Changes: Phase 1a is `resolveSlotState` only (D1); no partial totals (D2); no custom-base or exception table (D3); legacy-mismatch comparison only where meaningful (D4); `system.armorType` is declared evidence and stock class is kept distinct from current class (D5, correction 3); unknown powered status is unresolved (D6); at most one strip is certifiable (D7); injected certified definitions carry identity and provenance, and recorded costs are evidence (D8, correction 1); upgrade identity is not an upgrade key (correction 2); weapon classification needs trusted evidence (correction 4); `previewChange` and its tests are removed (correction 6).

## 1. Scope

In scope for the *eventual* Phase 1a implementation: one new, pure, read-only module exposing `resolveSlotState`, and its deterministic tests (section 11). In scope for **this** step: the written contract.

Out of scope, now and in 1a: any change to the Workbench, `UpgradeSlotEngine`, `SafetyEngine`, `StructuralChangeEngine`, `InstallRemoveEngine`, `UpgradeService`, catalogs, packs, combat code, `ActorEngine`, droid or vehicle systems; data migration; `WeaponModificationEngine`; effect resolution; **`previewChange` and any hypothetical-operation API** (deferred, section 12).

## 2. Principles

1. **Read-only and pure** (LOCKED). No `ActorEngine`, `update`, `setFlag`, `unsetFlag`, document mutation, network, clock or randomness. Same input, same output. Inputs are never mutated.
2. **Unknown is never zero** (LOCKED). An unverified, unrecorded or ambiguous quantity is `null` with a status and reason. It is never coerced to `0` or `1`. An *explicit certified* `0` is valid.
3. **Certified means independently sourced** (LOCKED, correction 1). A value is certified only when it comes from a certified source: the baseline table, a trusted classification, or an injected certified definition carrying identity and provenance. **A value recorded on the Item is a claim, not a certification.** A recorded value without certified authority is evidence; a recorded value that disagrees with a certified one is a conflict, and neither wins silently.
4. **No false certification.** `total`, `used`, `free` and `overflow` are non-null only when `totals.status === "certified"`. There is no partial arithmetic field (D2).
5. **Legacy is evidence.** `system.upgradeSlots` and `stockSlotOverride` are preserved and reported, never a base, never an adjustment.
6. **Trusted domain.** The host domain comes from `item.type` alone. A *class within a domain* (ordinary vs lightsaber weapon; armor stock weight class; powered status) needs trusted evidence (section 5), never a name.
7. **Stock vs current.** Published stock classification and current (possibly modified) classification are distinct fields. Where stock cannot be recovered the base is unresolved.
8. **No source invention.** Every certified number cites a source reference.
9. **Separate typed domain policies** (weapon, armor, equipment) over one arithmetic core. No shared untyped modification schema. No droid or vehicle rules.
10. **Capacity only.** The module decides nothing about eligibility, cost, DC, feats, stacking or effects.

## 3. API (LOCKED scope: D1; PROPOSAL: signature)

```
resolveSlotState(item, context?) -> SlotState
```

Synchronous, side-effect free, never throws for malformed item data (returns `unresolved` / `unsupported`). `item` is a Foundry `Item` or an equivalent plain object (`type`, `id`, `system`, `flags`), treated as a read-only snapshot.

**`context` (all optional, injected; the module imports no Foundry global and no consumer):**

| Field | Shape | Purpose |
|---|---|---|
| `canonicalWeaponLookup(item)` | `{ state: "canonical", identityKey, weaponClass: "ordinary" \| "lightsaber" \| "unknown", source } \| { state: "legacy" } \| { state: "unresolved", reason }` | Trusted weapon identity. `weaponClass` is supplied by the lookup from structured record data. How the later adapter derives it from the registry is OPEN (D11). Absent lookup is treated as `unresolved`, never as `legacy`. |
| `trustedClassification` | `{ weaponClass?, armorStockClass?, powered?, evidenceRef }` | Caller-supplied trusted evidence (for example from a future canonical-armor record or a reviewed GM classification). **Never read from the item.** It is the explicit input that reconciles tests which need a resolved class (section 11). |
| `certifiedDefinitionLookup(upgradeKey)` | `{ definitionId, upgradeKey, certifiedCost: int ≥ 0, source: { ref, certification } } \| null` | Certified slot-cost definitions with identity and provenance (D8, correction 1). The module holds no cost catalog of its own. |
| `baselineTable` | section 5 table | Defaults to the module's table; injectable for tests. |

## 4. Output shape (PROPOSAL)

```jsonc
{
  "contractVersion": 1,
  "domain": "weapon" | "armor" | "equipment" | null,          // item.type only
  "item": { "id": "<id|null>", "type": "<item.type|null>" },
  "status": "resolved" | "partial" | "conflicted" | "unresolved" | "unsupported",

  "base": {
    "status": "certified" | "unresolved",
    "value": 1 | null,
    "basis": "raw-default" | null,
    "source": { "ref": "scum-and-villainy:p37", "certification": "reviewer-verified-pdf" } | null,
    "classification": {
      "weapon": { "class": "ordinary" | "lightsaber" | "unverified", "evidence": "canonical-lookup" | "trusted-input" | "none" },
      "armor": {
        "stockClass":   { "value": "light|medium|heavy" | null, "status": "trusted" | "declared-unmodified" | "unrecoverable" | "unclassified", "evidence": "…" },
        "currentClass": { "value": "<system.armorType|null>", "status": "declared-evidence" },
        "powered":      { "value": true | false | null, "status": "trusted" | "declared" | "unknown" }
      }
    },
    "reasons": []
  },

  "adjustments": [                                             // ordered, stable
    { "id": "structural:size-increase", "kind": "size-increase" | "strip" | "tech-specialist-device-slot",
      "status": "verified" | "unverified" | "unresolved",
      "slots": 1 | null,                                       // non-null only when verified
      "provenance": { "path": "…", "instanceId": null },
      "source": { "ref": "…", "certification": "…" } | null,
      "reasons": [] }
  ],

  "occupied": [                                                // one entry per proven-distinct installation
    { "id": "<instanceId|derived key>",
      "upgradeKey": "<key|null>",
      "identity": "instance-id" | "key-only",                  // see section 7
      "representations": [ { "source": "canonical|system.installedUpgrades|flags.swse.<array>", "ref": "<instanceId|index>" } ],
      "recordedCost": 1 | null,                                // the claim on the Item
      "certified": { "definitionId": "…", "cost": 2, "source": { "ref": "…", "certification": "…" } } | null,
      "cost": 2 | null,                                        // = certified.cost when certified; otherwise null
      "costStatus": "certified" | "recorded-uncertified" | "conflict" | "unresolved",
      "reasons": [] }
  ],

  "pools": {
    "general": { "status": "certified" | "unresolved", "reasons": [] },
    "lightsaber": {
      "applicable": false,
      "chassisCapacityEvidence": { "value": null, "status": "evidence-only" },
      "crystal": { "status": "unresolved", "reasons": ["LIGHTSABER_POOL_UNCERTIFIED"] },
      "constructionAccessory": { "status": "unresolved", "reasons": ["LIGHTSABER_POOL_UNCERTIFIED"] }
    }
  },

  "totals": {
    "status": "certified" | "unresolved" | "conflicted",
    "total": 3 | null, "used": 2 | null, "free": 1 | null, "overflow": false | null,
    "unverifiedAdjustmentCount": 0,
    "uncertifiedOccupiedCount": 0
  },

  "legacy": {
    "evidence": [ { "field": "system.upgradeSlots", "value": 3, "classification": "unknown", "usedInTotals": false },
                  { "field": "flags.foundryvtt-swse.customization.overrides.stockSlotOverride", "value": null, "classification": "legacy-evidence", "usedInTotals": false } ],
    "comparison": { "performed": false, "reason": "BASELINE_NOT_CERTIFIED", "explainedBy": null }
  },

  "conflicts":  [ { "code": "…", "subject": "…", "detail": {} } ],
  "unresolved": [ { "code": "…", "subject": "…", "blocksCertification": true } ],
  "diagnostics": [ { "code": "…", "detail": {} } ]
}
```

Shape rules: lists are ordered deterministically; output is JSON-serializable with no `undefined`, functions or references into the input; `null` ≠ `0`; no partial-arithmetic field exists (D2).

## 5. Base policy

### 5.1 Certified baseline table (LOCKED; *Scum and Villainy* p. 37, reviewer-verified)

| Domain / class | Base |
|---|---|
| weapon, ordinary | 1 |
| equipment | 1 |
| armor, light | 1 |
| armor, medium | 2 |
| armor, heavy | 3 |

No custom-base field and no stock-exception table in 1a (D3). Exception evidence (for example a stored `system.upgradeSlots` that differs from the table) is preserved in `legacy.evidence`; the module never invents a stock capacity from it.

### 5.2 Weapon classification (correction 4; LOCKED principle, PROPOSAL mechanics)

`item.type === "weapon"` selects the weapon policy but **does not** make the weapon ordinary: it may be a lightsaber. The class comes only from trusted evidence, in this order:

1. `context.canonicalWeaponLookup(item)` returning `state: "canonical"` with `weaponClass` → class and `evidence: "canonical-lookup"`.
2. `context.trustedClassification.weaponClass` → `evidence: "trusted-input"`.
3. Otherwise `class: "unverified"`, `base` unresolved, reason `WEAPON_CLASS_UNVERIFIED`.

A lookup that is absent, returns `legacy`, or returns `unresolved` yields case 3 (a declared-but-unresolvable canonical identity additionally reports `CANONICAL_IDENTITY_UNRESOLVED`). `system.subtype`, name and `system.category` are never used to certify a class. A class of `lightsaber` leaves the general base unresolved (`LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED`) and activates the separate lightsaber pools (section 9). A class of `unknown` is treated as unverified.

*Consequence to note:* a self-built or homebrew weapon with no canonical identity and no trusted input is unresolved in 1a. That is the intended fail-closed behavior.

### 5.3 Armor classification (D5, D6, correction 3)

Two fields are kept distinct: `stockClass` (the published class the base is derived from) and `currentClass` (`system.armorType`, declared evidence only).

`stockClass` is determined as follows, first match wins:

1. `trustedClassification.armorStockClass` ∈ {light, medium, heavy} → `status: "trusted"`.
2. Otherwise, if **no size increase is recorded in any representation** (`flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied`, `flags.swse.customizationStructural.sizeIncreaseApplied`, `system.sizeIncreaseApplied`) and `system.armorType` ∈ {light, medium, heavy} → `value = armorType`, `status: "declared-unmodified"` (declared evidence, accepted only because no recorded operation could have changed it).
3. Otherwise → `value: null`, `status: "unrecoverable"` (a size increase is recorded and no trusted stock class is supplied) or `"unclassified"` (class absent, `shield`, or not light/medium/heavy). Base unresolved: `ARMOR_STOCK_CLASS_UNRECOVERABLE` / `ARMOR_CLASS_UNCERTIFIED`.

Why a recorded size increase makes the stock class unrecoverable: `StructuralChangeEngine.applySizeIncrease` writes the next weight class into `system.armorType` (`structural-change-engine.js:85`), while the Workbench records `sizeIncreaseApplied` without changing `armorType`. The two paths are indistinguishable from the data, so the current class cannot be trusted as stock. The module therefore never combines `currentClass` with a size-increase adjustment to compute the base; a medium armor enlarged to heavy cannot receive heavy stock capacity plus another `+1`.

`powered` (D6): `system.isPoweredArmor` is `true`/`false` only when it is a boolean (`status: "declared"`), or taken from `trustedClassification.powered` (`"trusted"`). Absent or non-boolean is `unknown`, **not** `false`, and is never inferred from the name. Base is resolved only when `powered` is known `false`. Known `true` → `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`. `unknown` → `POWERED_STATUS_UNKNOWN`.

*Consequence to note:* none of the 133 shipped armor records sets `isPoweredArmor`, so every shipped armor Item resolves with an unresolved base in Phase 1a unless a trusted classification is supplied. Newly created armor from `item-defaults.js` carries `isPoweredArmor: false` and can resolve. This follows from D6 and is not worked around.

### 5.4 Equipment

`item.type === "equipment"` → base 1, `raw-default`, certified. No powered, droid or vehicle classification is applied (those are out of scope).

### 5.5 Unsupported

Item types other than weapon, armor and equipment (including `weaponUpgrade`, which is a component, and any of `bodysuit`, `blaster`, `gear`, which are not Item types in `template.json`) → `status: "unsupported"`, `UNSUPPORTED_DOMAIN`.

## 6. Adjustments

An adjustment is a separately traced capacity change, counted at most once by stable key. Sources are read raw (not through `SafetyEngine.normalizeCustomizationState`).

| Kind | Source path | Status | Slots |
|---|---|---|---|
| `size-increase` | `flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied` | `verified` | `+1`, at most once |
| `strip` (exactly one valid recorded area) | `...structural.strippedAreas` | `verified` | `+1` |
| `strip` (two or more distinct valid areas) | same | `unresolved` | `null` for every recorded area (D7) |
| `tech-specialist-device-slot` | `flags.swse.techSpecialist.traits[]` entry `tech_device_upgrade_slot` | `unverified` | `null` |

Rules:

- **`slots` is non-null only when `status === "verified"`.** `unverified` and `unresolved` adjustments contribute **no verified capacity** and **prevent certification** (they are not a certified `+0`).
- **Strips (D7):** the general rules at *Scum and Villainy* pp. 37-38 restrict repeating a method for gaining slots unless an exception permits it, and award capacity for stripped elements. One valid recorded strip contributes `+1`. With two or more distinct recorded strips, the module cannot tell which is the one source-supported application, so **none** is certified; each is listed `unresolved` with `MULTIPLE_STRIPS_UNRESOLVED` and the full area list in `detail`. This is not an interpretation that repeated stripping is legal or illegal.
- Size increase and one strip are separate methods and may both contribute once each.
- A `strippedAreas` entry outside the domain's valid areas, a duplicate area, or a recorded size increase on an armor whose trusted/declared-unmodified stock class is heavy → a `conflicts[]` entry (`INVALID_STRIP_AREA`, `DUPLICATE_ADJUSTMENT`, `SIZE_INCREASE_NOT_PERMITTED`); the adjustment's `slots` is `null`.
- `system.upgradeSlots` is never an adjustment.

## 7. Occupied slots, identity and cost

### 7.1 Representations (read raw)

| Representation | Path | Carries an instance id? |
|---|---|---|
| canonical | `flags.foundryvtt-swse.customization.installedUpgrades[]` | yes (`instanceId`) when written by `InstallRemoveEngine` or the Workbench |
| legacy summary | `system.installedUpgrades[]` | `id` when written by `InstallRemoveEngine` (mirrors `instanceId`); none when written by `UpgradeService` |
| legacy key arrays | `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods}` | no: keys only |

### 7.2 Identity (correction 2)

An `upgradeKey` is not an installation identity. Rules:

- **Proven mirror:** entries in different representations are the same installation only when they carry the **same non-empty instance id**. They are then one `occupied` entry with `identity: "instance-id"` and all representations listed.
- **Key-only entries** (legacy key arrays, or summaries without an id) cannot be proven to mirror any other entry. A key-only entry that appears **in exactly one representation** is its own `occupied` entry (`identity: "key-only"`). A key that appears **in two or more representations without an instance-id proof**, or more than once within one representation, is **ambiguous**: it produces `AMBIGUOUS_IDENTITY` (a conflict, `totals.status: conflicted`) and the candidates are listed **unmerged**, with no count asserted. The module does not collapse them (undercount) and does not sum them (overcount).
- Duplicate instance id within or across entries with differing keys → `DUPLICATE_INSTANCE_ID`.
- Missing id on a canonical entry → a derived stable key plus diagnostic `INSTANCE_ID_MISSING`; it is treated as key-only for proof purposes.

*Consequence to note (OPEN, D10):* the repo's own writers reject duplicate keys per item (`SafetyEngine` duplicate-install guard; the Workbench `duplicate_upgrade` validation), and the Workbench writes the canonical flag and the `flags.swse.*` key array together. Under the rule above, a Workbench-modified item is therefore `AMBIGUOUS_IDENTITY` until D10 is decided. The contract does not treat writer-side uniqueness as proof.

### 7.3 Cost (correction 1)

Per occupant:

- `recordedCost`: a finite, non-negative integer on the instance (`slotCost`, or `slotsUsed` on legacy summaries), else `null`. Strings, negatives, `NaN`, fractions and absent values are `null`. **The `|| 0` coercion in legacy recovery is not reproduced.**
- `certified`: the result of `certifiedDefinitionLookup(upgradeKey)` (identity, certified cost, source), else `null`.
- `costStatus`:
  - `certified`: `certified` present and (`recordedCost` is `null` or equal). `cost = certified.cost`. An explicit certified `0` is valid.
  - `conflict`: `certified` present and `recordedCost` present and different → `COST_DISAGREES_WITH_CERTIFIED`. `cost: null`. Neither value is chosen.
  - `recorded-uncertified`: no certified definition, `recordedCost` present → `cost: null`, reason `COST_UNCERTIFIED`. The recorded number is evidence only.
  - `unresolved`: neither → `cost: null`, `SLOT_COST_UNRESOLVED`.
- Only `costStatus: "certified"` contributes to `used`. Everything else prevents certification.

Consequence: with no `certifiedDefinitionLookup` injected, any item with an installed upgrade is not certified, and an item with no installed upgrades can still be. The known Improved Energy Cell discrepancy (repo 1, published 2) surfaces as `COST_DISAGREES_WITH_CERTIFIED` once a certified definition for that key is supplied; this contract does not correct the catalog.

## 8. Totals, legacy comparison and status algebra

`totals.status`:

- `certified` requires **all** of: `base.status === "certified"` (which implies resolved classification, known powered status for armor, and a non-lightsaber weapon class); every adjustment `verified`; no `conflicts[]`; no `unresolved[]` entry with `blocksCertification`; every occupant `costStatus: "certified"`; no applicable unresolved pool.
- `conflicted`: any `conflicts[]` entry (takes precedence over `unresolved`).
- `unresolved`: otherwise.

When certified: `total = base.value + Σ verified adjustment slots`; `used = Σ certified occupant cost`; `free = total − used`; `overflow = free < 0` (never clamped). Otherwise those four fields are `null`.

Top-level `status`: `unsupported` for an unsupported domain; `resolved` when certified; `conflicted` when conflicted; `partial` when the base is certified but totals are not; `unresolved` when the base is unresolved.

**Legacy mismatch comparison (D4).** `legacy.comparison.performed` is `true` only when **all** hold: `base.status === "certified"`; every adjustment is `verified`; no conflicts; the weapon is not a lightsaber (the unresolved lightsaber pool is never compared against a default); and `system.upgradeSlots` is a finite integer ≥ 0. Then:

- `legacy value === base + Σ verified adjustments` → `explainedBy: "base-plus-recorded-grants"`.
- otherwise → conflict `LEGACY_VALUE_MISMATCH` (with the stored value and the computed figure in `detail`); `totals.status: conflicted`.

When any precondition fails, `performed: false` with the first failing reason (`BASELINE_NOT_CERTIFIED`, `ADJUSTMENT_HISTORY_INCOMPLETE`, `LIGHTSABER_POOL_UNRESOLVED`, `LEGACY_VALUE_ABSENT`). The stored value is never used to compute anything.

## 9. Lightsaber pools (LOCKED: separate and unresolved)

For a weapon whose trusted class is `lightsaber`, `pools.lightsaber` reports separately: chassis capacity evidence (stored chassis `upgradeSlots`), focusing crystal, construction accessory allowance, and general upgrades. Chassis `upgradeSlots` 2/3 and crystal/accessory `upgradeSlots: 1` appear only as evidence/diagnostics, never as capacity or cost. The Jedi Academy one-accessory allowance and its Tech Specialist exception are not encoded. Dual-phase two-crystal settings are not modeled. All lightsaber pools are `unresolved` (`LIGHTSABER_POOL_UNCERTIFIED`) and a lightsaber never reaches `certified`.

## 10. Invariants

| ID | Invariant |
|---|---|
| I1 | Pure and deterministic: same input gives deep-equal output. |
| I2 | Input is never mutated (verified with a deep-frozen input). |
| I3 | Output is JSON-serializable and holds no references into the input. |
| I4 | Never throws on malformed, partial or hostile item data. |
| I5 | `null` never becomes `0` or `1` anywhere in the output. |
| I6 | `total`, `used`, `free`, `overflow` are non-null only when `totals.status === "certified"`. |
| I7 | A non-`verified` adjustment has `slots: null` and prevents certification. |
| I8 | A recorded cost is never used as a certified cost; a recorded/certified disagreement is a conflict. |
| I9 | Occupants merge only on equal non-empty instance id; key equality alone never merges or counts. |
| I10 | `system.upgradeSlots` and `stockSlotOverride` never feed a total or a base; both appear in `legacy.evidence` when present. |
| I11 | The domain comes from `item.type` alone. Renaming an item, or editing `system.category`/`system.subtype`, never changes domain, class, base or status. |
| I12 | Powered status is never derived from a name; unknown powered status never certifies. |
| I13 | Armor stock class and current class are separate fields; the base never uses `currentClass` when a size increase is recorded unless a trusted stock class is supplied. |
| I14 | At most one strip is ever certified; two or more distinct strips certify none. |
| I15 | Lightsaber pools are never summed into the general count and a lightsaber never certifies. |
| I16 | Overflow is reported, never clamped. |
| I17 | The module imports no consumer, no `ActorEngine`, and calls no mutation API. |
| I18 | Weapon, armor and equipment policies are separate; no armor rule applies to a weapon or equipment and vice versa. |

## 11. Testing contract (for the eventual 1a implementation; `resolveSlotState` only)

Deterministic unit tests on plain-object fixtures; no Foundry runtime. Tests needing a resolved weapon class inject `canonicalWeaponLookup` or `trustedClassification`; the contradiction in revision 1 is removed because a missing lookup and no trusted input is a test of its own (case 4), not of the ordinary-weapon baseline (case 3).

1. Equipment: base 1, certified; with no installed upgrades `totals.status` is certified, `free === 1`.
2. Weapon with `canonicalWeaponLookup` → `ordinary`: base 1 certified.
3. Weapon with `trustedClassification.weaponClass: "ordinary"` and no lookup: base 1 certified, `evidence: "trusted-input"`.
4. Weapon with **no lookup and no trusted input**, and the same with lookup returning `legacy`/`unresolved`: `class: "unverified"`, base unresolved, `WEAPON_CLASS_UNVERIFIED` (plus `CANONICAL_IDENTITY_UNRESOLVED` when unresolved); `item.type === "weapon"` alone never certifies. A forged `system.subtype: "ordinary"` changes nothing.
5. Weapon classed `lightsaber` (lookup or trusted): general base unresolved; pools separate and `LIGHTSABER_POOL_UNCERTIFIED`; never certified; chassis `upgradeSlots` and crystal/accessory `1` appear only as evidence.
6. Armor light/medium/heavy with `isPoweredArmor: false`, no size increase, `armorType` declared: bases 1/2/3, `stockClass.status: "declared-unmodified"`, certified.
7. Armor with `isPoweredArmor` absent or non-boolean: `powered: unknown`, `POWERED_STATUS_UNKNOWN`, base unresolved, `free === null`. With `trustedClassification.powered: false` and a trusted/declared class: certified.
8. Armor with `isPoweredArmor: true`, any class: `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`.
9. **Modified armor:** `armorType: "heavy"` plus a recorded size increase and no trusted stock class: `stockClass.status: "unrecoverable"`, base unresolved, `ARMOR_STOCK_CLASS_UNRECOVERABLE`; it never reports base 3 plus the `+1`. With `trustedClassification.armorStockClass: "medium"`: base 2 plus one verified `+1`, total 3, `currentClass` reported separately as evidence only. A trusted `heavy` plus a recorded size increase: `SIZE_INCREASE_NOT_PERMITTED`.
10. Armor `armorType: "shield"`, unknown or absent: `ARMOR_CLASS_UNCERTIFIED`.
11. A renamed item ("Power Armor", "Heavy Plate") and a forged `system.category` do not change domain, class or status.
12. `system.upgradeSlots` (1, 3, 0, garbage, absent) appears in `legacy.evidence` with `usedInTotals: false`; totals identical with and without it. `stockSlotOverride` present: evidence only, base unchanged.
13. **Legacy comparison (D4):** with a certified base and verified adjustments, a stored value equal to base + grants gives `explainedBy`; a different value gives `LEGACY_VALUE_MISMATCH`. With an unresolved base, an unverified/unresolved adjustment, a conflict, or a lightsaber, `performed: false` and no mismatch is raised.
14. Size increase recorded once: exactly one verified `+1`; a repeated flag does not double-count.
15. **One strip:** one valid area → one verified `+1`. **Two or more distinct valid strips:** every area `unresolved`, `slots: null`, `MULTIPLE_STRIPS_UNRESOLVED` with the area list, totals not certified. An invalid or duplicate area → conflict. Size increase plus one strip → both verified.
16. **Corrected Tech Specialist test:** a `tech_device_upgrade_slot` trait record yields `status: "unverified"`, `slots: null`, no verified contribution, `totals.status !== "certified"`, `free === null`, `TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED` in `unresolved[]`. It is never a certified `+0`; the same item without the trait certifies.
17. **Cost trust:** a certified definition with cost 2 and a recorded cost 1 → `costStatus: "conflict"`, `COST_DISAGREES_WITH_CERTIFIED`, `cost: null`, neither chosen. Recorded cost only (no definition) → `recorded-uncertified`, `cost: null`, not certified. Definition only (no recorded cost) → `certified`. Certified definition with cost `0` → counts as 0 and stays certified. Recorded `0` with no certified definition stays `recorded-uncertified`.
18. Recorded cost missing, negative, `NaN`, string, fractional, with no certified definition: `unresolved`, `SLOT_COST_UNRESOLVED`; never `0` or `1`.
19. **Identity:** two installed upgrades with the same `upgradeKey` and different instance ids → two occupants, not merged. The same instance id in canonical and `system.installedUpgrades` → one occupant, two representations. Same key in canonical and in a legacy key array without an id proof → `AMBIGUOUS_IDENTITY`, candidates unmerged, no count asserted, `conflicted`. Same key twice in one representation → `AMBIGUOUS_IDENTITY`. A key present in exactly one key-only representation → its own occupant. Duplicate instance id → `DUPLICATE_INSTANCE_ID`. No canonical array and legacy arrays only (including `blasterUpgrades`): each read once.
20. Canonical array present plus an upgrade only in `system.installedUpgrades`, and likewise only in `flags.swse.blasterUpgrades`: both reported as occupants of unproven identity; totals not certified.
21. Overflow: more certified occupied than total reports `overflow: true`, negative `free`, not clamped.
22. `weaponUpgrade`, unknown type, `null`/`undefined`/array/primitive input: `unsupported` or `unresolved` as specified; no throw.
23. Determinism: shuffled input array order gives identical output; repeated calls deep-equal.
24. Immutability: a deep-frozen input does not throw and is unchanged.
25. Static guard: the module source contains none of `ActorEngine`, `.update(`, `setFlag`, `unsetFlag`, `game.`, `fetch(`, `Date.now`, `Math.random`.
26. No-regression guard: no existing file under `scripts/` imports the new module.

There are **no `previewChange` tests** in Phase 1a.

## 12. Deferred: installation decisions

`previewChange` (hypothetical install, remove and structural operations) is not part of Phase 1a and has no tests here. The requirement it will have to meet is retained: **a later installation decision must fail closed.** It may allow a new occupant only from a certified `before` state with a certified cost for the new occupant and `after.free >= 0`; `unresolved` must be treated as not allowed by every consumer. Its contract needs separate approval.

## 13. Decisions locked by the review

| ID | Decision (as supplied) | Where applied |
|---|---|---|
| D1 | Phase 1a implements `resolveSlotState` only; `previewChange` and its tests deferred. | 1, 3, 11, 12 |
| D2 | No partial numeric totals. | §2 #4, 4, 8 |
| D3 | No custom-base field or stock-exception table; preserve exception evidence; report unresolved; invent no capacities. | 5.1 |
| D4 | Unexplained legacy slot-value mismatch is a conflict only where an independently certified baseline and adjustment history make comparison meaningful; never compare an unresolved lightsaber pool to a default. | 8 |
| D5 | `system.armorType` is declared evidence, not immutable stock class; a size increase may have changed it; unrecoverable original classification stays unresolved. | 5.3 |
| D6 | Absent or non-boolean `isPoweredArmor` is unknown, not false; known powered stays unresolved until precedence is certified; no name inference. | 5.3 |
| D7 | One valid recorded strip may contribute `+1`; multiple distinct strips stay unresolved and are reported. | 6 |
| D8 | Injected certified slot-cost definitions only, no duplicate catalog; definitions carry identity and provenance. | 3, 7.3 |
| D9 | Source `scripts/engine/customization/modification-slot-authority.js`; tests `tests/modification-slot-authority.test.mjs`. | n/a |
| C1 | Recorded cost is evidence, not certified; disagreement is a conflict. | §2 #3, 7.3, I8 |
| C2 | Do not merge upgrades by key; dedupe only proven mirrors; ambiguous identity blocks certification. | 7.2, I9 |
| C3 | Stock vs current armor class distinct; unrecoverable stock fails closed. | 5.3, I13 |
| C4 | Weapon class needs trusted identity evidence; reconcile tests via an explicit trusted input. | 5.2, 11 |
| C5 | Revise status algebra and tests; `null` stays unknown. | 8, 11 |
| C6 | Remove or defer `previewChange` tests. | 11, 12 |
| C7 | Keep the three domain policies separate; no droid or vehicle rules. | §2 #9, I18 |

## 14. Open questions (not resolved here; the contract states facts only)

| ID | Question | Facts |
|---|---|---|
| D10 | May writer-side uniqueness (the repo's own `SafetyEngine` duplicate-install guard and Workbench `duplicate_upgrade` validation, which reject duplicate keys per item) count as proof that a key-only legacy mirror describes the same installation as an id-bearing entry? | Without it, every Workbench-modified item (it writes the canonical flag and `flags.swse.*` key array together) is `AMBIGUOUS_IDENTITY` and not certifiable in 1a. With it, the key-only mirror could be linked only when exactly one id-bearing entry has that key. This contract applies the stricter rule. |
| D11 | How does the later registry adapter derive `weaponClass` (`ordinary` / `lightsaber`) from a canonical record without using names? | `canonicalWeaponStateOf` returns `blaster` and `rangedEnergy` but no lightsaber flag; the registry has structured weapon-group data. That adapter is outside 1a; the module only consumes the lookup's `weaponClass`. |
| D12 | Is it acceptable that, per D6, every shipped armor record (none sets `isPoweredArmor`) resolves with an unresolved base in 1a until trusted classification is supplied? | Stated as a consequence in 5.3; not worked around. |
| D13 | Where a size increase is recorded on armor and a trusted stock class is supplied, is a `currentClass` that is neither the stock class nor the next class up a conflict? | The contract currently reports `currentClass` as evidence only and performs no consistency check, to avoid inventing a rule. |

## 15. What this contract deliberately does not do

It does not fix the Phase 0 contradictions C1-C11, change any consumer, correct the Improved Energy Cell catalog value, define the Workbench catalog mapping, choose powered-armor precedence, resolve repeated stripping, encode any lightsaber or Tech Specialist rule, define installation decisions, migrate data, or touch droids and vehicles. Those remain separately gated.
