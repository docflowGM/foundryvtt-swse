# ModificationSlotAuthority — Phase 1a Contract (revision 4)

**Status:** contract only, for owner and independent-reviewer approval. **No resolver code, test code, catalog, pack or consumer change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `cc5f8fbcc98396e189c93e7ac07f97345e1d170c` (`origin/main`, Phase 0 audit merged via PR #1031).
**Binding inputs:** the merged Phase 0 audit (`docs/audits/weapon-modification-convergence-phase-0-audit.md`), handoff v2 sections 0A and 2, and the independent review of this contract (decisions D1-D13, mandatory corrections 1-7 and provenance corrections A-B, recorded in section 13). Where this document and those differ, they win.
**Labels:** **LOCKED** = decided by the review. **PROPOSAL** = my drafting, needs approval. **OPEN** = a question only the owner/reviewer may settle (section 14); the contract states the facts and does not choose.

**Revision 4** (this revision) applies the third review: D14 approved (a raw `armorType: "light"` is unproven stock evidence; the D13 consistency check must not let a default-injected current class create a blocking contradiction); the legacy slot comparison now distinguishes `authored-stock` (compared to the certified stock baseline only) from `calculated-total` (baseline plus verified adjustments), and an authored stock value that differs from the baseline is `STOCK_EXCEPTION_UNCERTIFIED`, not a mismatch; and a failed, unresolved, contradictory or unknown canonical weapon identity can no longer be overridden by a lower-trust `trustedClassification.weaponClass`. Changes are in sections 3, 4, 5.2, 5.3, 8, 10, 11, 13, 13A and 14.

**Revision 3** added, from the second review of this contract: D10-D13 locked (strict identity; canonical-registry weapon classification; shipped armor may stay unresolved in read-only 1a; armor-class consistency conflict) and two provenance corrections: **A** a schema-generated `system.upgradeSlots` is not evidence of an authored or calculated capacity, and **B** a schema-generated `isPoweredArmor: false` is not evidence that armor is non-powered. Revision 3 changes sections 2, 3, 4, 5.2, 5.3, 8, 10, 11, 12-14 and adds a reason-code registry (section 13A). It also records one new fact for the reviewer (D14).

**Revision 2** replaced revision 1 (`854f2f1`). Changes: Phase 1a is `resolveSlotState` only (D1); no partial totals (D2); no custom-base or exception table (D3); legacy-mismatch comparison only where meaningful (D4); `system.armorType` is declared evidence and stock class is kept distinct from current class (D5, correction 3); unknown powered status is unresolved (D6); at most one strip is certifiable (D7); injected certified definitions carry identity and provenance, and recorded costs are evidence (D8, correction 1); upgrade identity is not an upgrade key (correction 2); weapon classification needs trusted evidence (correction 4); `previewChange` and its tests are removed (correction 6).

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
11. **A schema default is not evidence** (LOCKED, corrections A and B). `item-defaults.js` injects `system.upgradeSlots: 1` for weapons, armor and equipment (lines 182, 241, 300) and `system.isPoweredArmor: false` for armor (line 240). A stored value whose origin as an authored, calculated or published fact is not established is **declared-unproven evidence**: preserved, reported with a diagnostic, never used to certify a classification or to raise a blocking conflict, and never used in totals.

## 3. API (LOCKED scope: D1; PROPOSAL: signature)

```
resolveSlotState(item, context?) -> SlotState
```

Synchronous, side-effect free, never throws for malformed item data (returns `unresolved` / `unsupported`). `item` is a Foundry `Item` or an equivalent plain object (`type`, `id`, `system`, `flags`), treated as a read-only snapshot.

**`context` (all optional, injected; the module imports no Foundry global and no consumer):**

| Field | Shape | Purpose |
|---|---|---|
| `canonicalWeaponLookup(item)` | `{ state: "canonical", identityKey, weaponClass: "ordinary" \| "lightsaber" \| "unknown", source } \| { state: "legacy" } \| { state: "unresolved", reason }` | Trusted weapon identity. `weaponClass` is supplied by the lookup from structured record data. The eventual adapter must derive it from structured canonical fields (D11, section 5.2). Absent lookup is treated as `unresolved`, never as `legacy`. |
| `trustedClassification` | `{ weaponClass?, armorStockClass?, powered?, legacySlotValueOrigin?, evidenceRef }` | Caller-supplied trusted evidence with verified provenance (for example from a future canonical-armor record, a reviewed GM classification, or a producer-specific migration record). **Never read from the item.** `powered` is `true`/`false`. `legacySlotValueOrigin` is `"authored-stock"` or `"calculated-total"` and establishes the origin of the stored `system.upgradeSlots` for the section 8 comparison. `weaponClass` can resolve only a weapon that `canonicalWeaponLookup` reports as genuinely `legacy` (section 5.2); it never overrides a canonical result. It is the explicit input that reconciles tests which need a resolved class (section 11). |
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
      "weapon": { "class": "ordinary" | "lightsaber" | "unverified", "evidence": "canonical-lookup" | "trusted-input" | "none" },   // trusted-input only for a lookup-confirmed legacy weapon
      "armor": {
        "stockClass":   { "value": "light|medium|heavy" | null, "status": "trusted" | "declared-unmodified" | "declared-unproven" | "unrecoverable" | "unclassified", "evidence": "…" },
        "currentClass": { "value": "<system.armorType|null>", "status": "declared-evidence" },
        "powered":      { "value": true | false | null, "status": "trusted" | "declared-unproven" | "unknown" },
        "consistency":  { "performed": false, "reason": "NO_RECORDED_SIZE_INCREASE", "expectedCurrentClasses": null }
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
    "valueOrigin": "authored-stock" | "calculated-total" | "unknown",
    "comparison": { "performed": false, "basis": "stock-baseline" | "baseline-plus-adjustments" | null, "reason": "LEGACY_VALUE_ORIGIN_UNKNOWN", "explainedBy": "stock-baseline" | "baseline-plus-adjustments" | null }
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

**Precedence (LOCKED, third review): a canonical failure is never overridden by lower-trust evidence.** `context.canonicalWeaponLookup(item)` is consulted first:

| Lookup result | Outcome |
|---|---|
| `canonical` with `weaponClass` `ordinary` or `lightsaber` | Class from the lookup, `evidence: "canonical-lookup"`. If `trustedClassification.weaponClass` is also present and **differs**, the result is conflict `WEAPON_CLASS_CONTRADICTION` (blocking); neither value is chosen (see OPEN D15). A matching trusted value changes nothing. |
| `canonical` with `weaponClass` `unknown` (unknown or contradictory structured fields) | Class `unverified`, `WEAPON_CLASS_UNKNOWN_CANONICAL`. **`trustedClassification.weaponClass` is ignored for classification** and `diagnostics` records that it was present. |
| `unresolved` (declared identity cannot be resolved, registry not loaded, identity contradictory) | Class `unverified`, `CANONICAL_IDENTITY_UNRESOLVED`. **`trustedClassification.weaponClass` does not override it.** |
| `legacy` (the lookup reports a genuinely legacy/custom weapon with no canonical identity) | `trustedClassification.weaponClass` ∈ {`ordinary`, `lightsaber`} → class with `evidence: "trusted-input"`; otherwise class `unverified`, `WEAPON_CLASS_UNVERIFIED`. |
| no `canonicalWeaponLookup` injected | Class `unverified`, `CANONICAL_LOOKUP_ABSENT`. Without a lookup the module cannot know whether a canonical identity is declared, so trusted input is not applied. |

`system.subtype`, name and `system.category` are never used to certify a class. The existing registry remains the classification authority; this module only consumes its result.

A class of `lightsaber` leaves the general base unresolved (`LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED`) and activates the separate lightsaber pools (section 9). A class of `unknown` is treated as unverified.

*Consequence to note:* a self-built or homebrew weapon with no canonical identity and no trusted input is unresolved in 1a. That is the intended fail-closed behavior.

### 5.3 Armor classification (D5, D6, D12, D13, correction 3, correction B)

Two fields are kept distinct: `stockClass` (the published class the base is derived from) and `currentClass` (`system.armorType`, declared evidence only).

`stockClass` is determined as follows, first match wins:

1. `trustedClassification.armorStockClass` ∈ {light, medium, heavy} → `status: "trusted"`. A trusted stock class takes precedence over any declared value.
2. Otherwise, if **no size increase is recorded in any representation** (`flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied`, `flags.swse.customizationStructural.sizeIncreaseApplied`, `system.sizeIncreaseApplied`):
   - `system.armorType` ∈ {medium, heavy} → `value = armorType`, `status: "declared-unmodified"` (D5; accepted because no recorded operation could have changed it and `item-defaults.js` does not produce these values by default).
   - `system.armorType === "light"` → `value: null`, `status: "declared-unproven"`, reason `ARMOR_STOCK_CLASS_UNPROVEN` (D14). `item-defaults.js` supplies `armorType: 'light'` for new armor (line 226) and normalization resets any invalid class to `'light'` (line 591), so a raw `light` is evidence only and is not a certified stock baseline. The base is unresolved until a trusted stock class is supplied.
3. Otherwise → `value: null`, `status: "unrecoverable"` (a size increase is recorded and no trusted stock class is supplied) or `"unclassified"` (class absent, `shield`, or not light/medium/heavy). Base unresolved: `ARMOR_STOCK_CLASS_UNRECOVERABLE` / `ARMOR_CLASS_UNCERTIFIED`.

If a trusted stock class exists and no size increase is recorded, a declared `currentClass` that differs from it does not change the base (the trusted class governs); it is reported as diagnostic `ARMOR_CLASS_DIFFERS_FROM_TRUSTED_STOCK`. No new armor rule is defined.

Why a recorded size increase makes the stock class unrecoverable: `StructuralChangeEngine.applySizeIncrease` writes the next weight class into `system.armorType` (`structural-change-engine.js:85`), while the Workbench records `sizeIncreaseApplied` without changing `armorType`. The two paths are indistinguishable from the data. The module never combines `currentClass` with a size-increase adjustment to compute the base: a medium armor enlarged to heavy cannot receive heavy stock capacity plus another `+1`.

**Powered status (D6, correction B).** `item-defaults.js` initializes `isPoweredArmor: false` for every new armor Item, so a raw `false` cannot be told apart from an authored one.

- `trustedClassification.powered` (`true` or `false`, with `evidenceRef`) → `status: "trusted"`. **Only a trusted `false` can establish non-powered armor.**
- A raw boolean `system.isPoweredArmor` is retained as `status: "declared-unproven"` evidence. Unless trusted input supplies the same fact, a raw `false` yields `POWERED_STATUS_UNPROVEN` and a raw `true` yields `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`; either leaves the base unresolved.
- Absent or non-boolean is `unknown` (`POWERED_STATUS_UNKNOWN`), unresolved, and is never inferred from the name.
- A trusted `true` → `POWERED_ARMOR_PRECEDENCE_UNRESOLVED` (precedence is uncertified); the base stays unresolved.
- A raw boolean that **disagrees** with a trusted value is not a conflict that selects either; the trusted value governs the classification and the disagreement is a diagnostic (`POWERED_RAW_DISAGREES_WITH_TRUSTED`) so a masked classification is visible.

**Armor-class consistency (D13, with D14 provenance caution).** The check runs only when all hold: a trusted `armorStockClass`; a size increase recorded in any representation; and a declared `currentClass` of light, medium or heavy. The expected current classes are the stock class and the valid next class under the existing structural transition (`StructuralChangeEngine`: light → medium, medium → heavy; heavy has no next class, and a recorded size increase on a trusted heavy armor already raises `SIZE_INCREASE_NOT_PERMITTED`). Then:

- `currentClass` in the expected set → consistent (`performed: true`).
- `currentClass` is `medium` or `heavy` and not in the expected set → conflict `ARMOR_CLASS_INCONSISTENT` (stock, current and expected set in `detail`).
- `currentClass` is `light` and not in the expected set → **no conflict**. A raw `light` may be a schema default or a reset of invalid input (D14), so it cannot independently contradict trusted stock history. The result is an `unresolved[]` entry `ARMOR_CLASS_CONSISTENCY_UNRESOLVED` (blocks certification).
- Required evidence absent (no trusted stock class, no recorded size increase, or `currentClass` absent, `shield` or unrecognized): `consistency.performed` is `false` with the reason; when a trusted stock class and a recorded size increase exist but `currentClass` cannot be read, `ARMOR_CLASS_CONSISTENCY_UNRESOLVED` is added.

No new armor transitions are defined.

*Consequence to note (D12, LOCKED as acceptable for read-only 1a only):* none of the 133 shipped armor records sets `isPoweredArmor`, and newly created armor carries a schema-defaulted `false`. Under the rules above **every armor Item resolves with an unresolved base in Phase 1a unless a trusted classification supplies `powered: false`**. This is not approval to leave armor unresolved permanently: source-backed classification and migration must exist before any live consumer integration.

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

*Consequence to note (D10, LOCKED):* the repo's own writers reject duplicate keys per item (`SafetyEngine` duplicate-install guard; the Workbench `duplicate_upgrade` validation), and the Workbench writes the canonical flag and the `flags.swse.*` key array together. Writer-side uniqueness is **not** proof of identity, so a Workbench-modified item is `AMBIGUOUS_IDENTITY` in Phase 1a. A later producer-specific migration adapter may establish proof that the records describe the same installation; that adapter is outside Phase 1a and must prove identity, not merely match names or keys.

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

**Legacy `system.upgradeSlots` comparison (D4, correction A, third review).** The stored value is never used to compute anything. Because `item-defaults.js` writes `upgradeSlots: 1` into new weapons, armor and equipment, a stored value of unknown origin may be a schema default. `legacy.valueOrigin` is `authored-stock` or `calculated-total` **only** when `trustedClassification.legacySlotValueOrigin` says so; otherwise `unknown`. The two origins mean different things and are compared against different figures:

| Origin | Compared against | Equal | Different |
|---|---|---|---|
| `authored-stock` | the certified **stock baseline** (`base.value`), **without** any adjustment | `explainedBy: "stock-baseline"` | `STOCK_EXCEPTION_UNCERTIFIED` (an `unresolved[]` entry that blocks certification). **Not** a `LEGACY_VALUE_MISMATCH`: the value may be a legitimate item-specific stock exception, and no exception rule or capacity is certified. The module assigns it no capacity and creates no exception table. |
| `calculated-total` | certified baseline **plus** verified adjustments | `explainedBy: "baseline-plus-adjustments"` | conflict `LEGACY_VALUE_MISMATCH`; `totals.status: conflicted` |
| `unknown` | nothing | n/a | no conflict; diagnostic only |

Preconditions: `base.status === "certified"`; the weapon is not a lightsaber (an unresolved lightsaber pool is never compared against a default); `system.upgradeSlots` is a finite integer ≥ 0. For `calculated-total` additionally every adjustment is `verified` and there are no conflicts. When a precondition fails, `comparison.performed` is `false` with the first failing reason (`BASELINE_NOT_CERTIFIED`, `ADJUSTMENT_HISTORY_INCOMPLETE`, `LIGHTSABER_POOL_UNRESOLVED`, `LEGACY_VALUE_ABSENT`).

With `unknown` origin, `comparison.performed` is `false` with `LEGACY_VALUE_ORIGIN_UNKNOWN`, and if a certified total exists a non-blocking diagnostic `LEGACY_VALUE_PROVENANCE_UNKNOWN` reports the stored value, the stock baseline, the computed total and whether the stored value differs from each, as information only. In every case the stored value stays in `legacy.evidence` and never changes a calculated capacity.

*Consequence to note:* with no trusted origin supplied (the situation for all current Items), neither the blocking mismatch nor `STOCK_EXCEPTION_UNCERTIFIED` fires in Phase 1a. That is the intended conservative outcome until origin metadata exists; it is not a claim that stored values are correct.

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
| I10 | `system.upgradeSlots` and `stockSlotOverride` never feed a total or a base; both appear in `legacy.evidence` when present. A stored `system.upgradeSlots` of unknown origin never raises a blocking conflict. |
| I11 | The domain comes from `item.type` alone. Renaming an item, or editing `system.category`/`system.subtype`, never changes domain, class, base or status. |
| I12 | Powered status is never derived from a name. Only a trusted `powered: false` establishes non-powered armor; a raw boolean (including a schema-defaulted `false`) and an unknown status never certify. |
| I13 | Armor stock class and current class are separate fields; the base never uses `currentClass` when a size increase is recorded unless a trusted stock class is supplied. |
| I14 | At most one strip is ever certified; two or more distinct strips certify none. |
| I15 | Lightsaber pools are never summed into the general count and a lightsaber never certifies. |
| I16 | Overflow is reported, never clamped. |
| I17 | The module imports no consumer, no `ActorEngine`, and calls no mutation API. |
| I18 | Weapon, armor and equipment policies are separate; no armor rule applies to a weapon or equipment and vice versa. |
| I21 | A failed, unresolved, contradictory or unknown canonical weapon identity is never replaced by a lower-trust classification; trusted input applies only to a lookup-confirmed legacy weapon. |
| I22 | A raw `armorType: "light"` never establishes a certified stock class, and never creates a blocking contradiction by itself. |
| I23 | An authored-stock legacy value is compared only to the stock baseline, never to a total that includes adjustments; a differing authored stock value is `STOCK_EXCEPTION_UNCERTIFIED`, never `LEGACY_VALUE_MISMATCH`. |
| I19 | A value that may have been injected by `item-defaults.js` is declared-unproven evidence and is never used to certify, to compute, or to raise a blocking conflict. |
| I20 | Armor-class consistency is evaluated only from a trusted stock class, a recorded size increase and a declared current class; no armor transition beyond the existing structural rules is defined. |

## 11. Testing contract (for the eventual 1a implementation; `resolveSlotState` only)

Deterministic unit tests on plain-object fixtures; no Foundry runtime. Tests needing a resolved weapon class inject `canonicalWeaponLookup` or `trustedClassification`; the contradiction in revision 1 is removed because a missing lookup and no trusted input is a test of its own (case 4), not of the ordinary-weapon baseline (case 3).

1. Equipment: base 1, certified; with no installed upgrades `totals.status` is certified, `free === 1`.
2. Weapon with `canonicalWeaponLookup` → canonical `ordinary`: base 1 certified, `evidence: "canonical-lookup"`.
3. Weapon with lookup `{ state: "legacy" }` and `trustedClassification.weaponClass: "ordinary"`: base 1 certified, `evidence: "trusted-input"`. With lookup `legacy` and no trusted input: `WEAPON_CLASS_UNVERIFIED`.
4. **Canonical precedence (third review):** each of the following with `trustedClassification.weaponClass: "ordinary"` present stays unresolved and is never certified as ordinary: (a) lookup `unresolved` → `CANONICAL_IDENTITY_UNRESOLVED`; (b) lookup `canonical` with `weaponClass: "unknown"` → `WEAPON_CLASS_UNKNOWN_CANONICAL`, with a diagnostic that trusted input was ignored; (c) lookup absent → `CANONICAL_LOOKUP_ABSENT`; (d) lookup `canonical` `lightsaber` with trusted `ordinary` → `WEAPON_CLASS_CONTRADICTION`, conflicted, neither chosen; (e) lookup `canonical` `ordinary` with trusted `ordinary` → certified, no conflict. A forged `system.subtype: "ordinary"` changes nothing in any case. `item.type === "weapon"` alone never certifies.
5. Weapon classed `lightsaber` (lookup or trusted): general base unresolved; pools separate and `LIGHTSABER_POOL_UNCERTIFIED`; never certified; chassis `upgradeSlots` and crystal/accessory `1` appear only as evidence.
6. Armor with `trustedClassification.powered: false`, no recorded size increase: `armorType: "medium"` → base 2 and `"heavy"` → base 3, `stockClass.status: "declared-unmodified"`, certified. **`armorType: "light"` with no trusted stock class → `stockClass.status: "declared-unproven"`, `ARMOR_STOCK_CLASS_UNPROVEN`, base unresolved.** With `trustedClassification.armorStockClass: "light"` and `powered: false` → base 1, `trusted`, certified.
6a. **Default-created armor (D14 regression):** a new armor Item carrying only `item-defaults.js` values (`armorType: "light"`, `isPoweredArmor: false`, `upgradeSlots: 1`, nothing recorded) is **unresolved** even when `trustedClassification.powered: false` is supplied, until a trusted stock class is also supplied; `free === null`. With both trusted, it certifies with total 1. A default-created armor whose true published class was medium or heavy but which holds the default `light` is never certified as light armor.
7. Armor with `isPoweredArmor` absent or non-boolean and no trusted input: `powered: unknown`, `POWERED_STATUS_UNKNOWN`, base unresolved, `free === null`.
8. **Powered provenance (correction B):** (a) a raw `isPoweredArmor: false` with no trusted input → `declared-unproven`, `POWERED_STATUS_UNPROVEN`, base unresolved, not certified, even for an otherwise complete item; (b) a **powered armor Item whose missing published classification is masked by a schema-defaulted `false`** (raw `false`, no trusted input) is never certified as non-powered; (c) the same Item with `trustedClassification.powered: true` → `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`; (d) a raw `false` against a trusted `true` → the trusted value governs and `POWERED_RAW_DISAGREES_WITH_TRUSTED` is emitted; (e) a raw `true` with no trusted input → `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`, any weight class.
9. **Modified armor:** `armorType: "heavy"` plus a recorded size increase and no trusted stock class: `stockClass.status: "unrecoverable"`, base unresolved, `ARMOR_STOCK_CLASS_UNRECOVERABLE`; never base 3 plus `+1`. With `trustedClassification.armorStockClass: "medium"` and `powered: false`: base 2 plus one verified `+1`, total 3, `currentClass` reported separately as evidence. A trusted `heavy` plus a recorded size increase: `SIZE_INCREASE_NOT_PERMITTED`.
9a. **Class consistency (D13, D14):** all cases have a trusted stock class and a recorded size increase. Stock `light`: current `light` or `medium` → consistent; `heavy` → `ARMOR_CLASS_INCONSISTENT`. Stock `medium`: current `medium` or `heavy` → consistent; current `light` → **no conflict**, `ARMOR_CLASS_CONSISTENCY_UNRESOLVED` (a raw `light` cannot independently contradict trusted history). Stock `heavy`: `SIZE_INCREASE_NOT_PERMITTED`. No recorded size increase or no trusted stock class: `performed: false`, no conflict. Current class absent/`shield`/garbage: `ARMOR_CLASS_CONSISTENCY_UNRESOLVED`. With a trusted stock class, no size increase and a differing declared current class: the base uses the trusted class and `ARMOR_CLASS_DIFFERS_FROM_TRUSTED_STOCK` is a non-blocking diagnostic.
10. Armor `armorType: "shield"`, unknown or absent: `ARMOR_CLASS_UNCERTIFIED`.
11. A renamed item ("Power Armor", "Heavy Plate") and a forged `system.category` do not change domain, class or status.
12. `system.upgradeSlots` (1, 3, 0, garbage, absent) appears in `legacy.evidence` with `usedInTotals: false`; totals identical with and without it. `stockSlotOverride` present: evidence only, base unchanged.
13. **Legacy comparison (D4, correction A, third review):**
    - (a) **`authored-stock`:** stored value equal to the stock baseline → `explainedBy: "stock-baseline"`. Stored value different from the baseline (for example `2` on an ordinary weapon) → `STOCK_EXCEPTION_UNCERTIFIED`, unresolved, blocks certification, **no** `LEGACY_VALUE_MISMATCH`, no capacity assigned, no exception table consulted.
    - (b) **Stock vs structural (regression):** an ordinary weapon whose stock capacity is `1` (stored `1`, origin `authored-stock`) with a separately recorded size increase granting `+1`: the stored `1` is compared to the stock baseline `1` and is explained; it is **not** compared to `2`; the calculated `total` is `2`.
    - (c) **`calculated-total`:** stored value equal to baseline + verified adjustments → `explainedBy: "baseline-plus-adjustments"`; different → `LEGACY_VALUE_MISMATCH`, conflicted. In the case of (b), stored `2` is explained and stored `1` is a mismatch.
    - (d) **origin unknown (the default):** no conflict and no `STOCK_EXCEPTION_UNCERTIFIED` for any stored value; `performed: false`, `LEGACY_VALUE_ORIGIN_UNKNOWN`; with a certified total a `LEGACY_VALUE_PROVENANCE_UNKNOWN` diagnostic reports the figures; totals are identical to the same item without the field.
    - (e) **default-injected `upgradeSlots: 1` regression** on a medium armor (certified base 2) and a heavy armor (certified base 3), each with trusted `powered: false` and a trusted stock class and no trusted origin: `certified` with `total` 2 and 3, **no** conflict, diagnostic present. Likewise an ordinary weapon and equipment carrying the default `1`.
    - (f) an unresolved base, a lightsaber, or (for `calculated-total`) an unverified/unresolved adjustment or a conflict: `performed: false` with the specific reason, never a mismatch.
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
| D10 | Keep strict legacy identity. Writer-side duplicate-key prevention is not proof of a shared installation. Deduplicate only proven mirrors; preserve and report `AMBIGUOUS_IDENTITY`. A future producer-specific migration adapter may establish proof; not part of 1a. | 7.2 |
| D11 | Weapon class from the canonical registry: `record.weaponGroup` (lightsaber group), `schemaFamily.proficiency` as a consistency check. Module stays injected and imports no registry. Never names or mutable legacy category fields. Contradictory canonical classifications stay unresolved. | 3, 5.2 |
| D12 | Shipped armor lacking trusted powered classification may stay unresolved in read-only 1a. Not approval to leave all armor unresolved permanently; source-backed classification and migration are required before live consumer integration. | 5.3 |
| D13 | Report a conflict when trusted stock class, a recorded size increase and a declared current class match neither stock nor the valid next class, using the existing structural transition rules. Report unresolved when evidence is absent. No new transitions. | 5.3, I20 |
| D14 | A raw `armorType: "light"` is unproven stock evidence (schema default and normalization reset). Trusted stock provenance is required for light; medium/heavy keep D5's declared-unmodified reading when no size increase is recorded; trusted stock takes precedence; ambiguity stays unresolved. A default-injected current class cannot independently create a blocking D13 contradiction. | 5.3, I22 |
| L | Legacy slot comparison: `authored-stock` vs stock baseline only; `calculated-total` vs baseline plus verified adjustments; unknown is diagnostic-only; an authored stock value differing from the baseline is `STOCK_EXCEPTION_UNCERTIFIED`, not a mismatch; no exception table or capacity. | 8, I23 |
| W | A canonical identity that is declared but unresolved, contradictory or of unknown class is never overridden by `trustedClassification.weaponClass`; trusted input may resolve only a genuinely legacy/custom weapon. | 5.2, I21 |
| A | A schema-defaulted `system.upgradeSlots` is not evidence of authored or calculated capacity. No blocking `LEGACY_VALUE_MISMATCH` unless origin is established; otherwise preserve as evidence, emit a diagnostic, never change capacity. Regression tests for default-injected `1` on medium and heavy armor. | 2 #11, 8, 11 #13 |
| B | A schema-defaulted `isPoweredArmor: false` is not evidence of non-powered armor. Only trusted classification with verified provenance certifies; a raw boolean is declared evidence; unproven origin stays unresolved. Regression test for a powered armor masked by a default `false`. | 2 #11, 5.3, 11 #8 |
| C1 | Recorded cost is evidence, not certified; disagreement is a conflict. | §2 #3, 7.3, I8 |
| C2 | Do not merge upgrades by key; dedupe only proven mirrors; ambiguous identity blocks certification. | 7.2, I9 |
| C3 | Stock vs current armor class distinct; unrecoverable stock fails closed. | 5.3, I13 |
| C4 | Weapon class needs trusted identity evidence; reconcile tests via an explicit trusted input. | 5.2, 11 |
| C5 | Revise status algebra and tests; `null` stays unknown. | 8, 11 |
| C6 | Remove or defer `previewChange` tests. | 11, 12 |
| C7 | Keep the three domain policies separate; no droid or vehicle rules. | §2 #9, I18 |

## 13A. Reason-code registry

Blocking conflicts: `WEAPON_CLASS_CONTRADICTION` · `AMBIGUOUS_IDENTITY` · `DUPLICATE_INSTANCE_ID` · `COST_DISAGREES_WITH_CERTIFIED` · `LEGACY_VALUE_MISMATCH` (only with established origin) · `ARMOR_CLASS_INCONSISTENT` · `INVALID_STRIP_AREA` · `DUPLICATE_ADJUSTMENT` · `SIZE_INCREASE_NOT_PERMITTED`.

Blocking unresolved: `WEAPON_CLASS_UNVERIFIED` · `CANONICAL_IDENTITY_UNRESOLVED` · `LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED` · `LIGHTSABER_POOL_UNCERTIFIED` · `ARMOR_STOCK_CLASS_UNRECOVERABLE` · `ARMOR_CLASS_UNCERTIFIED` · `ARMOR_CLASS_CONSISTENCY_UNRESOLVED` · `ARMOR_STOCK_CLASS_UNPROVEN` · `STOCK_EXCEPTION_UNCERTIFIED` · `WEAPON_CLASS_UNKNOWN_CANONICAL` · `CANONICAL_LOOKUP_ABSENT` · `POWERED_STATUS_UNKNOWN` · `POWERED_STATUS_UNPROVEN` · `POWERED_ARMOR_PRECEDENCE_UNRESOLVED` · `MULTIPLE_STRIPS_UNRESOLVED` · `TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED` · `COST_UNCERTIFIED` · `SLOT_COST_UNRESOLVED`.

Non-blocking diagnostics: `ARMOR_CLASS_DIFFERS_FROM_TRUSTED_STOCK` · `TRUSTED_WEAPON_CLASS_IGNORED` · `LEGACY_VALUE_PROVENANCE_UNKNOWN` · `POWERED_RAW_DISAGREES_WITH_TRUSTED` · `INSTANCE_ID_MISSING` · `UNSUPPORTED_DOMAIN` (as `status: unsupported`).

Comparison-skipped reasons: `LEGACY_VALUE_ORIGIN_UNKNOWN` · `BASELINE_NOT_CERTIFIED` · `ADJUSTMENT_HISTORY_INCOMPLETE` · `LIGHTSABER_POOL_UNRESOLVED` · `LEGACY_VALUE_ABSENT` · consistency-skipped: `NO_RECORDED_SIZE_INCREASE` · `NO_TRUSTED_STOCK_CLASS` · `CURRENT_CLASS_UNREADABLE`.

## 14. Open questions (not resolved here; the contract states facts only)

D10-D14 are locked (section 13). One drafting point remains for the reviewer:

| ID | Question | Facts |
|---|---|---|
| D15 | When `canonicalWeaponLookup` returns a successful class and `trustedClassification.weaponClass` **differs**, is the right outcome a blocking `WEAPON_CLASS_CONTRADICTION` (as drafted), or should the canonical class simply govern with a diagnostic? | The review requires that a *failed* canonical identity not be overridden by lower-trust input and that the registry remain the authority. It does not address a successful canonical class contradicted by a trusted input. Drafted as a conflict (fail closed, neither chosen); canonical-governs-with-diagnostic is the alternative. Neither certifies the trusted value. |

## 15. What this contract deliberately does not do

It does not fix the Phase 0 contradictions C1-C11, change any consumer, correct the Improved Energy Cell catalog value, define the Workbench catalog mapping, choose powered-armor precedence, establish the registry adapter or any migration adapter, resolve repeated stripping, encode any lightsaber or Tech Specialist rule, define installation decisions, migrate data, or touch droids and vehicles. Those remain separately gated.
