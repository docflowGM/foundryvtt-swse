# SWSE Phase 0-B — Nullable Capability Schema v0.5

**Status:** DRAFT, structurally validated, **not source-certified** and not frozen.  
**Scope:** Local-only schema and fixture migration; no production data or GitHub changes.  
**Purpose:** Replace v0.4's thousands of mandatory nested empty placeholders with meaningful nullable capabilities and sparse nested fields, while retaining the same universal vehicle field vocabulary.

## 1. Decision and semantics

Every vehicle entry uses the **same 23 top-level properties**. Each vehicle has access to all the defined nested fields. However, detailed fields are authored only when applicable and supported by an actual source claim.

| Representation | Meaning | Source certification requirement |
|---|---|---|
| `"armament": null` | Verified that this vehicle has no installed weapons | `/armament`: `explicitly-none` or `not-applicable` |
| `"hyperspace": null` | Verified no applicable hyperdrive | `/hyperspace`: `explicitly-none` or `not-applicable` |
| `"defenses": {"shieldRating": null}` | Verified absent/inapplicable shields | `/defenses/shieldRating`: `explicitly-none` or `not-applicable` |
| `"defenses": {"shieldRating": 0}` | Actual published numerical zero | Preserve `0`, never replace with null |
| `"armament": {}` | Placeholder during draft transcription; no positive assertion | Keep review status unfinished, do not certify as unarmed |
| `"armament": {"weaponMounts": [{...}]}` | At least one published installed weapon claim | Identify printed name, installation and source values when established |
| Omitted nested property | Unentered, not printed, or unresolved | When necessary, annotate its JSON Pointer as `not-stated` or `not-yet-reviewed`; do not interpret omission as proof of absence |
| `"systems": null` or `"modifications": null` | Confirmed absent applicable installed systems/modifications | Positive field-state annotation required |

Null is **not** the default for incomplete transcription. This is essential: otherwise the smaller schema would merely conceal the omissions made by the earlier Python scrape.

## 2. Mechanical consequences

- The required root stays uniform across AT-AT, X-wing, capital ship, station, and DP-2. `armament`, `hyperspace`, `systems`, and `modifications` may be null as whole capabilities.
- When `armament` is null, there are no `weaponMounts`, `firingGroups`, `ammo`, or attack-pattern child placeholders. If it is populated, only supported child fields are supplied.
- `hyperspace` contains `primaryMultiplier`, `backupMultiplier`, `navComputer`, etc. only when those properties are relevant and known. A spacecraft can have an applicable nav system even without a conventional hyperdrive; classification is not used to delete fields automatically.
- Existing `defenses` remains a group, because an unshielded vehicle still has Reflex, Fortitude, etc. `shieldRating` can be number, null, or omitted while under review.
- Nested quantities such as cargo, consumables, docking capacity, shield recharge, and prices accept null when *confirmed* absent, or can be omitted from draft objects.
- Weapon-definition records are still independent identities; optional unused top-level profile and resource families can be omitted. Installed mounts remain separate from weapon-definition mechanics.
- The old structured conditional rules and global battery/scale registry are preserved; their execution has **not** been newly certified.

## 3. Migration and regressions

| Test or metric | Result |
|---|---:|
| Source-based illustrative vehicle records validating | **12/12** |
| Intrinsic weapon source-sample records validating | **11/11** |
| Synthetic absence/unknown contrasting examples | **2/2** |
| Null/zero/sparse/structure behavior checks | **11/11** |
| Structural schema errors | **0** |
| Null-without-proof errors in reviewed nullable fields | **0** |
| Old fixture null/empty placeholders (excluding fieldStates) | **2,634** |
| New fixture null/empty placeholders (excluding fieldStates) | **158** |
| Placeholder locations eliminated | **2,476** |
| Nonblank published mechanical/source facts lost under comparison | **0** |
| Fully canon-certified vehicles | **0** |

**Important accounting note:** The v0.4 report's 2,124 count was *unclassified* paths; the 2,634 and 158 figures here are *all* null/empty placeholder locations in the same 12 test records, excluding the field-state ledger. The metrics have different denominators and should not be directly compared.

All nonblank nested source facts were compared by record name and JSON path against the archived v0.4 files. Coralskipper's prior `hyperspace.capability = "unavailable"` is represented by `hyperspace: null` with `fieldStates["/hyperspace"] = "explicitly-none"`; this intentional normalization is accounted for in the comparison.

## 4. Source-sensitive exceptions

- **Model 67 Shrieker:** The weapon line was not printed, but that is not affirmative proof of no equipment. Its `armament` remains a draft sparse object with `not-stated` evidence; it is **not** assigned null.
- **AT-AT / AT-RT:** Ground-only vehicles use `hyperspace: null` with `not-applicable` as an illustrative fixture determination, not an inferred numeric zero.
- **DP-2:** Classification as a hybrid droid-vehicle does not force hyperdrive absence. Its hyperspace evidence remains under review; the future droid refactor does not remove this vehicle record.
- **C-wing Ugly:** Its existing x2 hyperdrive value remains in an object even though some related navigation details are still untranscribed.
- **Cross-book Y-wings:** Separate SR 25 and SR 10 remain unchanged. Their unfinished weapon/hyperdrive entries are sparse objects rather than fabricated nulls.

## 5. Certification gate

Run `python phase0b_certification_gate.py --self-test` for the v0.5 behavioral probes; `python phase0b_certification_gate.py` for structural and absence-state checks; `python phase0b_certification_gate.py --strict` when ready for certification.

The strict check intentionally **fails for the 12 fixtures**: their `rules.reviewStatus` is not `certified`, some pages are unverified, and some fields retain `not-yet-reviewed` or unresolved status. This is correct behavior, not a schema design defect. The schema does not certify content by itself.

**Remaining before freeze:** sourcebook-by-sourcebook transcription policy, completeness definition for genuinely unstated fields, independent weapon identity reconciliation, and the established conditional-rule/scale runtime-consumption audit. No historical source claims or global-rule policies were silently rewritten in this pass.

## 6. Files

- `swse-phase0b-vehicle.schema.json` — v0.5 universal schema.
- `swse-phase0b-vehicle-weapon.schema.json` — v0.5 optional weapon subfamilies.
- `swse-phase0b-vehicle.blank.json` — compact blank template; no assumed absent capabilities.
- `swse-phase0b-null-semantics-examples.json` — **synthetic** verified-absence vs pending-review examples (not published SWSE claims).
- `swse-phase0b-dryrun-fixtures.json`, `swse-phase0b-additional-vehicle-fixtures.json`, `swse-phase0b-variant-fixtures.json`, `swse-phase0b-weapon-stress-fixtures.json` — migrated sample records.
- `phase0b_certification_gate.py` — new v0.5 read-only verifier; strict certification mode.
- `phase0b_upgrade_v05.py`, `phase0b_v05_report.py` — reproducible migration and comparison scripts; original v0.4 inputs held in `_phase0b_v04_snapshots/`.
- `swse-phase0b-v05-nullable-schema-report.json` — machine-readable metrics.
- `swse-phase0b-vehicle-schema.md` — rolling schema reference with this revision documented.

**No GitHub writes or production data updates.**
