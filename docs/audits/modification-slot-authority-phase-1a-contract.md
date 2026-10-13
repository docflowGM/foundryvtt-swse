# ModificationSlotAuthority — Phase 1a Contract Proposal

**Status:** contract only, for owner and independent-reviewer approval. **No resolver code, test code, catalog, pack or consumer change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `cc5f8fbcc98396e189c93e7ac07f97345e1d170c` (`origin/main`, Phase 0 audit merged via PR #1031).
**Binding inputs:** the merged Phase 0 audit (`docs/audits/weapon-modification-convergence-phase-0-audit.md`), handoff v2 sections 0A and 2, and the Phase 0 review decisions. Where this proposal and those differ, they win.
**Labels:** **BINDING** = already decided. **PROPOSAL** = my drafting, requires approval. **DECISION** = a choice only the owner/reviewer may make (section 14); the contract states the option and does not pick it.

## 1. Scope

In scope for the *eventual* Phase 1a implementation: one new, pure, read-only module and its deterministic tests (section 12). In scope for **this** step: the written contract.

Out of scope, now and in 1a: any change to the Workbench, `UpgradeSlotEngine`, `SafetyEngine`, `StructuralChangeEngine`, `InstallRemoveEngine`, `UpgradeService`, catalogs, packs, combat code, `ActorEngine`, droid or vehicle systems; any data migration; any `WeaponModificationEngine`; any effect resolution. Existing services stay operational and unaware of the module.

## 2. Principles (BINDING unless marked)

1. **Read-only and pure.** No `ActorEngine`, `update`, `setFlag`, `unsetFlag`, Foundry document mutation, network, clock or randomness. Same input, same output. Input objects are never mutated.
2. **Unknown is never zero.** An unverified or unresolved quantity is reported as `null` with a status and a reason. It is never coerced to `0` or `1`, and never summed into a figure that is presented as certified. An *explicit certified* `0` is valid.
3. **No false certification.** A numeric `free` (and `total`) is returned only when `totals.status === "certified"`. Otherwise those fields are `null`.
4. **Fail closed.** A newly requested operation is allowed only when capacity is certified (section 9).
5. **Legacy evidence is evidence.** `system.upgradeSlots` and `stockSlotOverride` are preserved and reported but never become the base and never feed totals.
6. **Trusted domain.** The host domain comes from `item.type` only. Never from name, `system.category`, flags, or mutable descriptive fields.
7. **No source invention.** Every certified number cites a source reference. Anything not certified is `unresolved`.
8. **Separate typed domain policies** (weapon, armor, equipment) over a single arithmetic core. No shared untyped modification schema.
9. **Source-specific legality stays where it is.** The module answers capacity questions only. It decides nothing about eligibility, cost, DC, feats, stacking or effects.

## 3. API (PROPOSAL)

```
resolveSlotState(item, context?) -> SlotState
previewChange(item, change, context?) -> ChangeDecision      // see DECISION D1 on whether this ships in 1a
```

Both are synchronous, side-effect free, and never throw for malformed item data. They return `status: "unresolved"` / `"unsupported"` instead. Programmer errors (e.g. `previewChange` called with an unknown `change.kind`) return a `ChangeDecision` with `decision: "unresolved"` and reason `UNKNOWN_CHANGE_KIND`, also without throwing.

**`item`:** a Foundry `Item` or a plain object with the same fields (`type`, `id`, `system`, `flags`). Treated as a read-only snapshot.

**`context` (all optional, all injected so the module has no import-time coupling):**

| Field | Purpose |
|---|---|
| `canonicalWeaponLookup(item)` | Existing weapon-registry accessor (`canonicalWeaponStateOf` shape: `legacy` / `canonical` / `unresolved`). If absent, canonical weapon identity is `unresolved`, never assumed legacy. |
| `slotCostLookup(upgradeKey)` | Verified-identity mapping from an upgrade key to a certified slot cost, or `null`. Absent means no catalog cost is available. |
| `baselineTable` | The certified baseline table (section 5). Defaults to the table in the module; injectable for tests. |

The module imports no Foundry globals and no consumer module.

## 4. Output shape (PROPOSAL)

```jsonc
{
  "contractVersion": 1,
  "domain": "weapon" | "armor" | "equipment" | null,        // from item.type only
  "item": { "id": "<id|null>", "type": "<item.type|null>" },
  "status": "resolved" | "partial" | "conflicted" | "unresolved" | "unsupported",

  "base": {
    "status": "certified" | "unresolved",
    "value": 1 | null,
    "basis": "raw-default" | "canonical-record" | "authored-custom" | null,
    "source": { "ref": "scum-and-villainy:p37", "certification": "reviewer-verified-pdf" } | null,
    "classification": { "weaponClass": "ordinary|lightsaber|unknown", "armorWeightClass": "light|medium|heavy|shield|unknown", "powered": "declared-true|declared-false|undeclared" },
    "reasons": []                                              // reason codes when unresolved
  },

  "adjustments": [                                             // ordered, stable
    {
      "id": "structural:size-increase",                        // stable key; never duplicated
      "kind": "size-increase" | "strip" | "tech-specialist-device-slot" | "other",
      "status": "verified" | "unverified" | "unresolved",
      "slots": 1 | null,                                       // signed integer; null unless verified
      "provenance": { "path": "flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied", "instanceId": null },
      "source": { "ref": "...", "certification": "..." } | null,
      "reasons": []
    }
  ],

  "occupied": [                                                // one entry per distinct installed upgrade
    {
      "id": "<instanceId|derived stable key>",
      "upgradeKey": "<key|null>",
      "cost": 0 | 1 | 2 | 3 | null,                            // null = unresolved; explicit certified 0 stays 0
      "costBasis": "instance-recorded" | "catalog-verified" | "unresolved",
      "definition": "mapped" | "unmapped",
      "representations": ["canonical", "system.installedUpgrades", "flags.swse.blasterUpgrades"],
      "reasons": []
    }
  ],

  "pools": {                                                   // separate, named; never merged into a general count
    "general":   { "status": "...", "reasons": [] },
    "lightsaber": {
      "applicable": false,
      "chassisCapacityEvidence": { "value": null, "status": "evidence-only" },
      "crystal":              { "status": "unresolved", "reasons": ["LIGHTSABER_POOL_UNCERTIFIED"] },
      "constructionAccessory": { "status": "unresolved", "reasons": ["LIGHTSABER_POOL_UNCERTIFIED"] }
    }
  },

  "totals": {
    "status": "certified" | "unresolved" | "conflicted",
    "total": 3 | null,                                         // base + verified adjustments, only when certified
    "used": 2 | null,                                          // sum of occupied costs, only when every cost is resolved
    "free": 1 | null,                                          // total - used, only when certified
    "overflow": false | null,                                  // true/false only when certified
    "unverifiedAdjustmentCount": 0,
    "unresolvedOccupiedCount": 0
  },

  "legacy": {
    "evidence": [
      { "field": "system.upgradeSlots", "value": 3, "classification": "unknown", "usedInTotals": false },
      { "field": "flags.foundryvtt-swse.customization.overrides.stockSlotOverride", "value": null, "classification": "legacy-evidence", "usedInTotals": false }
    ],
    "explainedBy": "none" | "base-plus-recorded-grants",       // see DECISION D4
    "representations": { "canonical": true, "systemInstalledUpgrades": false, "legacyFlagArrays": ["blasterUpgrades"] }
  },

  "conflicts":  [ { "code": "REPRESENTATION_MISMATCH", "subject": "…", "detail": {…} } ],
  "unresolved": [ { "code": "TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED", "subject": "…", "blocksInstall": true } ],
  "diagnostics": [ { "code": "…", "detail": {…} } ]              // non-blocking observations
}
```

Rules for the shape:

- All lists are ordered deterministically (adjustments: fixed kind order then id; occupied: canonical order then id; conflicts/unresolved: code then subject).
- Output is JSON-serializable, with no functions, no `undefined`, no references into the input.
- `null` means "not determined". `0` means "determined to be zero". They are never interchangeable.
- `totals.total`, `used`, `free` and `overflow` are `null` unless `totals.status === "certified"`. There is **no partial arithmetic field** (see DECISION D2).

## 5. Base policy per domain (BINDING values; PROPOSAL for structure)

Certified baseline (*Scum and Villainy* p. 37, reviewer-verified; v2 section 0A):

| Domain / class | Base | Basis |
|---|---|---|
| weapon, ordinary | 1 | `raw-default` |
| equipment | 1 | `raw-default` |
| armor, light | 1 | `raw-default` |
| armor, medium | 2 | `raw-default` |
| armor, heavy | 3 | `raw-default` |

Explicit stock-item exceptions ("specific item models may have more") are honored **only** from a certified published record or an expressly authored custom base (DECISION D3). The module reads no name and no regex.

**Always `unresolved` (no value invented):**

| Case | Reason code |
|---|---|
| Powered armor (`system.isPoweredArmor === true`), any weight class | `POWERED_ARMOR_PRECEDENCE_UNRESOLVED` |
| Armor whose weight class is `shield` or not one of light/medium/heavy | `ARMOR_CLASS_UNCERTIFIED` |
| Lightsaber general-upgrade capacity | `LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED` |
| Weapon with a declared-but-unresolvable canonical identity | `CANONICAL_IDENTITY_UNRESOLVED` |
| Item type not weapon / armor / equipment (incl. `weaponUpgrade`, which is a component, not a host) | `status: "unsupported"` |
| Droid or vehicle actor-sourced items | `status: "unsupported"` (untouched) |

**Domain identification (PROPOSAL, DECISION D5 for the armor class source):**

- `item.type === "weapon"` → weapon; `"armor"` → armor; `"equipment"` → equipment. `bodysuit`, `blaster` and `gear` are not Item types in `template.json`; they are `unsupported`.
- Lightsaber is a weapon sub-case. It is identified from the canonical record when the lookup resolves it, otherwise from `system.subtype === "lightsaber"` recorded as `declared` (not canonical).
- Armor weight class is read from `system.armorType` ∈ {light, medium, heavy}. Production armor packs carry this field (light 27, medium 22, heavy 14, shield 7). It is a data field, not a name, but it is mutable; the module records it as `declared`.
- **Powered status:** only an explicit boolean `system.isPoweredArmor` counts. No production armor record sets it (all 133 are `undeclared`), so the module reports `powered: "undeclared"` and treats it as not powered **with a diagnostic**, and never infers it from the name. See DECISION D6 on whether `undeclared` should instead block.

## 6. Adjustments (source-attributed)

An adjustment is a separately traced capacity change, counted at most once by stable key.

| Kind | Source path (read raw, not via `SafetyEngine.normalize...`) | Status | Slots |
|---|---|---|---|
| `size-increase` | `flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied` | `verified` | `+1`, at most once |
| `strip` | each distinct valid entry of `...structural.strippedAreas` | `verified` | `+1` per distinct valid area for the domain |
| `tech-specialist-device-slot` | `flags.swse.techSpecialist.traits[]` entry `tech_device_upgrade_slot` | **`unverified`** | **`null`** (contributes no verified capacity) |

Rules:

- **`slots` is `null` unless `status === "verified"`.** An `unverified` or `unresolved` adjustment contributes **zero verified capacity** and **forces `totals.status` away from `certified`**. It is not recorded as a certified `+0`. (This is the corrected intent of old test 13.)
- Duplicate stable keys, a `strippedAreas` entry outside the domain's valid areas, or `sizeIncreaseApplied` on an armor already heavy (the Scum and Villainy heavy-armor restriction) produce a `conflicts[]` entry; the entry's `slots` is `null`.
- The "neither method more than once" sentence (S&V p. 37) versus "each stripped feature grants a slot" (p. 38) is a rules tension. This contract counts distinct recorded areas as the existing engine does, and flags the question (DECISION D7). It does not decide it.
- `system.upgradeSlots` is **never** an adjustment (BINDING decision 1).

## 7. Occupied slots

Sources, read raw and merged by upgrade identity:

| Representation | Path |
|---|---|
| canonical | `flags.foundryvtt-swse.customization.installedUpgrades[]` |
| legacy summary | `system.installedUpgrades[]` |
| legacy flag arrays | `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods}` |

Cost resolution per occupant, in order:

1. A finite, non-negative integer on the instance (`slotCost`, or `slotsUsed` for legacy summaries) → `costBasis: "instance-recorded"`. An explicit `0` is valid.
2. Otherwise `slotCostLookup(upgradeKey)` with a verified identity mapping → `costBasis: "catalog-verified"`.
3. Otherwise `cost: null`, `costBasis: "unresolved"`, reason `SLOT_COST_UNRESOLVED`. Missing, negative, non-finite or non-integer values land here. **The `|| 0` coercion that `SafetyEngine`'s legacy recovery performs is not reproduced.**

Identity and representation rules:

- The same upgrade present in several representations is **one** occupant with all representations listed (never double-counted).
- If the canonical array exists and an upgrade appears only in a legacy representation, or the reverse, raise `REPRESENTATION_MISMATCH` and keep the occupant with its best available cost. This is the Phase 0 section 4.2 coexistence scenario.
- If no canonical array exists, legacy representations are read, including `blasterUpgrades`, which the existing adapter omits.
- Duplicate `instanceId` → `DUPLICATE_INSTANCE_ID`. Missing `instanceId` → a derived stable key plus a diagnostic.
- An occupant whose key has no verified mapping is `definition: "unmapped"`. A recorded cost is still accepted as an installed fact, with diagnostic `UNMAPPED_DEFINITION`; the module does not cost it from any catalog (BINDING decision 3).
- A recorded cost that disagrees with `slotCostLookup` (e.g. the Improved Energy Cell 1-vs-2 discrepancy) raises `COST_DISAGREES_WITH_CERTIFIED`. The module does not choose between them.

## 8. Totals and status algebra

`totals.status`:

- `certified` — requires **all** of: `base.status === "certified"`; no adjustment with status other than `verified`; no `conflicts[]`; no occupant with `cost === null`; no applicable unresolved pool blocking the general count.
- `conflicted` — any `conflicts[]` entry (takes precedence over `unresolved`).
- `unresolved` — otherwise.

When `certified`: `total = base.value + Σ verified adjustment slots`; `used = Σ occupied cost`; `free = total − used`; `overflow = free < 0`. Overflow is reported, never clamped.

Top-level `status`: `unsupported` if the domain is unsupported; else `resolved` when `totals.status === "certified"`; `conflicted` when `totals.status === "conflicted"`; `partial` when base is certified but totals are not; `unresolved` when base is unresolved.

## 9. `previewChange` decisions (PROPOSAL; shipping scope is DECISION D1)

```
change = { kind: "install", upgradeKey, cost?: int }                    // cost: verified or recorded cost for the new occupant
       | { kind: "remove", instanceId }
       | { kind: "structural", op: "size-increase" | "strip", area? }

ChangeDecision = {
  decision: "allow" | "deny" | "unresolved",
  reasons: [ { code, subject } ],
  before: SlotState,
  after:  SlotState | null       // computed on a copy; null when it cannot be computed
}
```

- **install:** `allow` only if `before.totals.status === "certified"`, the new occupant's cost is resolved (explicit certified `0` allowed), and `after.free >= 0`. `deny` when certified and `after.free < 0` (`INSUFFICIENT_SLOTS`). `unresolved` in every other case (base unresolved, unverified adjustment, unknown or missing cost, conflict, unsupported domain, unresolved pool). **`unresolved` must be treated by every future consumer as not-allowed.**
- **remove:** removing an occupant cannot create overflow, so it does not require certified capacity. `allow` if the instance exists; `deny` with `UNKNOWN_INSTANCE` otherwise. The result still reports `after.status`.
- **structural:** `allow` per section 6 rules and `after.free >= 0`; `deny` or `unresolved` as for install. Whether a strip/size change must also revalidate existing occupancy is evaluated here only as `after.overflow`; no write occurs.
- `previewChange` never validates eligibility, funds, DCs, feats or effects.

## 10. Lightsaber pools (BINDING: separate and unresolved)

For a weapon identified as a lightsaber, `pools.lightsaber` reports named pools separately: chassis capacity evidence, focusing crystal, construction accessory allowance, and general upgrades. Chassis `upgradeSlots` 2/3 and crystal/accessory `upgradeSlots: 1` appear only as `chassisCapacityEvidence` / diagnostics, never as capacity or cost. The Jedi Academy one-modification allowance and its Tech Specialist exception are not encoded. All pools are `unresolved` with `LIGHTSABER_POOL_UNCERTIFIED`, and `base` for the general pool is `unresolved`. Dual-phase two-crystal settings are not modeled.

## 11. Invariants

| ID | Invariant |
|---|---|
| I1 | Pure and deterministic: same input gives deep-equal output across calls. |
| I2 | Input is never mutated (verified with a deep-frozen input). |
| I3 | Output is JSON-serializable and contains no live references into the input. |
| I4 | Never throws for malformed, partial or hostile item data. |
| I5 | `null` never becomes `0` (or `1`) anywhere in the output. |
| I6 | `totals.total`, `used`, `free`, `overflow` are non-null only when `totals.status === "certified"`. |
| I7 | An `unverified`/`unresolved` adjustment has `slots: null` and prevents certification. |
| I8 | Each grant and each occupant is counted at most once by stable key across all representations. |
| I9 | `system.upgradeSlots` and `stockSlotOverride` never appear in a total; both appear in `legacy.evidence` when present. |
| I10 | The domain is derived from `item.type` alone; renaming an item or editing `system.category` never changes the domain, base or status. |
| I11 | Powered status is never derived from a name. |
| I12 | Lightsaber pools are never summed into the general count. |
| I13 | Overflow is reported, never clamped. |
| I14 | The module imports no consumer, no `ActorEngine`, and calls no mutation API. |
| I15 | `previewChange` returns `allow` only when `before` is certified and `after.free >= 0`. |

## 12. Testing contract (for the eventual 1a implementation)

Deterministic unit tests on plain-object fixtures; no Foundry runtime.

1. Ordinary weapon, equipment: base 1, certified; a 2-cost install is denied, a 1-cost install allowed on an empty item, a certified `0`-cost install allowed.
2. Light / medium / heavy armor: bases 1 / 2 / 3, certified.
3. Powered armor (`isPoweredArmor: true`) of each weight class: `base.status` unresolved with `POWERED_ARMOR_PRECEDENCE_UNRESOLVED`; `totals.free === null`; install `unresolved`.
4. A renamed item ("Power Armor", "Heavy Plate") and an item with a forged `system.category` keep the classification derived from `item.type` and declared fields; no name influence.
5. `armorType: "shield"` and unknown weight class: `ARMOR_CLASS_UNCERTIFIED`.
6. `system.upgradeSlots` present with any value (1, 3, 0, garbage): appears in `legacy.evidence`, `usedInTotals: false`; totals identical with and without it.
7. `stockSlotOverride` present: evidence only; base unchanged.
8. Size increase recorded: exactly one `+1` adjustment; duplicate flag does not double-count.
9. Two distinct valid strips: two `+1` adjustments; a repeated area or an area outside the domain list: conflict, `slots: null`.
10. **Corrected test 13:** a `tech_device_upgrade_slot` trait record yields an adjustment with `status: "unverified"`, `slots: null`, zero verified contribution, `totals.status !== "certified"`, `totals.free === null`, `unresolved[]` containing `TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED`, and `previewChange(install)` returns `unresolved`. It is never reported as a certified `+0`, and the same item without the trait is certified.
11. Installed upgrade with explicit `slotCost: 0`: counted as 0, cost resolved. Cost missing, negative, `NaN`, string or fractional: `cost: null`, `SLOT_COST_UNRESOLVED`, totals not certified, install `unresolved`.
12. Cost from `slotCostLookup` only with a verified mapping; unmapped key with no recorded cost stays unresolved.
13. Same upgrade in canonical array and `system.installedUpgrades` and a legacy flag array: one occupant, three representations, not double-counted.
14. Canonical array present plus an upgrade only in `system.installedUpgrades`, and likewise only in `flags.swse.blasterUpgrades`: `REPRESENTATION_MISMATCH`, status `conflicted`.
15. No canonical array, legacy arrays only (including `blasterUpgrades`): occupants recovered once each.
16. Duplicate `instanceId`: `DUPLICATE_INSTANCE_ID`, conflicted.
17. Recorded cost differing from the injected certified cost: `COST_DISAGREES_WITH_CERTIFIED`; neither value silently chosen.
18. Overflow: more occupied than total reports `overflow: true`, `free` negative, not clamped.
19. Lightsaber: general base unresolved; chassis `upgradeSlots` and crystal/accessory `1` appear only as evidence; pools separate and `LIGHTSABER_POOL_UNCERTIFIED`.
20. `weaponUpgrade`, unknown item type, null/undefined/array/primitive input: `unsupported` or `unresolved` as specified, no throw.
21. Declared-but-unresolvable canonical weapon identity (lookup returns `unresolved`): `CANONICAL_IDENTITY_UNRESOLVED`, fail closed; lookup absent: same.
22. `previewChange` table: install allow / deny / unresolved; remove of existing and unknown instance; structural size/strip including strip on a domain-invalid area; `after` computed without mutating `before`.
23. Determinism: shuffled input array order yields identical output; repeated calls deep-equal.
24. Immutability: a deep-frozen input does not throw and is unchanged.
25. Static guard: the module source contains none of `ActorEngine`, `.update(`, `setFlag`, `unsetFlag`, `game.`, `fetch(`, `Date.now`, `Math.random`.
26. No-regression guard: a test asserting no existing file under `scripts/` imports the new module.

## 13. Reason-code registry (initial)

`POWERED_ARMOR_PRECEDENCE_UNRESOLVED` · `ARMOR_CLASS_UNCERTIFIED` · `LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED` · `LIGHTSABER_POOL_UNCERTIFIED` · `CANONICAL_IDENTITY_UNRESOLVED` · `TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED` · `SLOT_COST_UNRESOLVED` · `REPRESENTATION_MISMATCH` · `DUPLICATE_INSTANCE_ID` · `COST_DISAGREES_WITH_CERTIFIED` · `UNMAPPED_DEFINITION` · `LEGACY_VALUE_MISMATCH` · `INVALID_STRIP_AREA` · `DUPLICATE_ADJUSTMENT` · `SIZE_INCREASE_NOT_PERMITTED` · `UNKNOWN_INSTANCE` · `UNKNOWN_CHANGE_KIND` · `INSUFFICIENT_SLOTS` · `UNSUPPORTED_DOMAIN`.

## 14. Decisions requested (not resolved here)

| ID | Question | Options | My note |
|---|---|---|---|
| D1 | Does `previewChange` ship in Phase 1a, or only `resolveSlotState`? | (a) both in 1a; (b) `resolveSlotState` only, `previewChange` in 1b | The fail-closed decision is the point of the contract, but it is the first thing consumers will want. Either is read-only. |
| D2 | Allow any partial numeric (e.g. "verified-only capacity") when totals are uncertified? | (a) none, as drafted; (b) a clearly named `verifiedOnly` block | (a) removes the chance of a consumer treating a partial as a decision value. |
| D3 | Source for "explicit stock-item exceptions" and "authored custom base" | (a) none exist yet, base is RAW default only; (b) a certified exception table; (c) a typed custom-base field | No certified exception list exists in the repo. Until one does, a legacy item with a non-default stored `system.upgradeSlots` is a mismatch (D4), not an exception. |
| D4 | When `system.upgradeSlots` ≠ the RAW base plus recorded verified grants | (a) `LEGACY_VALUE_MISMATCH` conflict, totals `conflicted`; (b) diagnostic only, totals still computed from RAW base | (a) is the conservative reading of "legacy without a recoverable baseline remains unresolved". It would mark many shipped records as conflicted, for example 13 of the 15 lightsaber chassis in `weapons-lightsabers.db`, which store `2`. When the stored value equals base plus recorded grants it is `explainedBy: "base-plus-recorded-grants"` and not a conflict. |
| D5 | Armor weight class source | (a) `system.armorType` as `declared`; (b) require a canonical armor record (none exists today) | Production packs carry `armorType`; there is no armor canonical registry in the audited code. |
| D6 | `isPoweredArmor` absent (every shipped armor record) | (a) treat as not powered, with a diagnostic; (b) mark base `unresolved` for all armor | (b) would make all shipped armor unresolved until data is authored. (a) risks certifying a genuinely powered armor that lacks the flag. |
| D7 | Strip/size-increase counting | (a) size once, each distinct valid area once (matches existing engine and S&V p. 38); (b) hold strip count `unresolved` pending the "neither method more than once" reading | A source-reading question for the architects. |
| D8 | Should the module carry its own certified slot-cost table (to catch the Improved Energy Cell 1-vs-2 error) or rely only on injected `slotCostLookup`? | (a) injected only; (b) a small certified table in the module | (b) adds a second catalog; (a) leaves the discrepancy detectable only when a caller injects the certified value. |
| D9 | File location and name | proposed `scripts/engine/customization/modification-slot-authority.js` and `tests/modification-slot-authority.test.mjs` | Matches repo conventions; no existing file is touched. |

## 15. What this contract deliberately does not do

It does not fix C1-C11 in the Phase 0 audit, change any consumer, correct the Improved Energy Cell catalog value, define the Workbench catalog mapping, choose powered-armor precedence, encode any lightsaber or Tech Specialist rule, migrate data, or touch droids and vehicles. Those remain separately gated.
