# SWSE Droid Audit — SGD Source Hydration Closeout and Component Certification Sprint 001

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Status:** 46/46 SGD publication records source-structured; **0/46 mechanically certified**; component catalog source-fact pass begun; production unchanged.

## 1. SGD: final source-identity hydration complete

The printed *Scavenger's Guide to Droids* has **46 frozen publication identities** of the project's **234 total**, including the previously separated DP-2 vehicle-primary identity. All 46 records have passed a dedicated structural hydration sprint (001–015, 016–030, 031–045, and 046).

The last claim, **SGD-DROID-046 YVH-Series Battle Droid**, was visually reviewed against **printed pp.158–159** (PDF pages 159–160). This sprint hydrated 13 printed component instances, 2 physical hands, walking speed 6, three classes (soldier 5, scout 3, elite trooper 1), the three printed languages, blaster cannon and vibroblade possessions, and separately identified cannon ammunition and two alternate cannon power levels. Every published attack row stays **source-only**, not an executable weapon permission.

**New unresolved contradictions:**

- `SGD-046-SCAN-ACTION-COST-CONFLICT`: Yuuzhan Vong Scan is a **full-round** action in main prose but **two swift actions** in the protocol.
- `SGD-046-TAUNT-ACTION-AND-TARGET-CONFLICT`: Yuuzhan Vong Taunt is a **free action affecting all eligible Yuuzhan Vong** in main prose but **two swift actions affecting at most three** in the protocol.

Neither conflict was silently resolved. The optional **YVH Guardian** variant (12 hours reprogramming; DC 25 Use Computer; trades a soldier talent for Harm's Way) and printed recommended heroic **stock battle-droid chassis** are recorded as separate creation/change routes, not factory baseline characteristics.

### Verification actually executed

- **46/46** recursively checked against the draft schema's available types, required fields, enumerated values, references and additional-property declarations, using custom JS (not an actual Python Draft 2020-12 runner).
- **46/46** source `fieldStates` null/empty-pointer semantics checks passed.
- **46/46** frozen census/backlog name, page and identity parity checks passed.
- No printed attack groups were promoted to executable.
- The YVH record's 13 components, 2 locations, 9 class levels, 3 languages, 2 possessions and 2 unresolved contradictions were verified by a separate closeout guard.

**Not claimed:** original repository Python `jsonschema.Draft202012Validator`, full Foundry V13 actor/roll suite, source-complete mechanical certification, executable weapon mounts or store/chargen parity. The checked-in Python validator `tools/audits/droids/verify_sgd_ledger.py` is available to run in a checked-out repository, but was not run against the remote data in this session. Claude owns future post-merge runtime implementation/testing under the project's separation-of-responsibilities rule.

## 2. Component source-fact Sprint 001 — eight parts

The dedicated component work is **not** a continuation of the stock-model data; it addresses what the player can actually buy, install, build and use.

Primary source: *Scavenger's Guide to Droids*, printed **pp.55, 58–59, 62** (visually verified PDF table and full mechanical paragraphs).

| Component | Printed price | Printed weight | Registry at this branch | Source/mechanics finding |
|---|---:|---:|---|---|
| Scomp Link | 100 credits | 1 kg | Overlay only | **Pricing defect:** missing registry cost means Garage cost function can return 0; helpful/friendly Access Information +2 only |
| YV Sensor Package | 1,000 credits | 3 kg | Base + overlay | +10 Perception detecting Yuuzhan Vong **within 12 squares and line of sight**; Military. Catalog says "NOT available at chargen", which is **not established by the cited paragraphs** |
| Sensor Booster | 200 credits | 5 kg | Base | Maximum sensor reach **2 km**, requires installed sensor pack; acceptability of Improved Sensor Package as alternative needs proof |
| Sensor Countermeasure Package | 1,000 credits | 2 kg | Base + overlay | Use Computer against Perception **from nonvisual sensors only**; no general invisibility bonus |
| Silence-Bubble Generator | 3,500 credits | 20 × cost factor kg | **Missing** | Standard action, 3-square sound-dampening radius, −10 outside-listener Perception |
| Repulsorcam | 1,000 credits | 20 kg | **Missing** | Detachable, 12-square max separation, 2-hour recording, speed 4, Ref 16/Fort 10, cell runs 4 hours; separate charging device +150 credits |
| Antitheft Comlink Locator | 100 credits | 0.5 kg | **Missing** | Covert and trackable distress signal to owner's comlink; continues after deactivation until destruction |
| Collapsible Construction | 2,000 × cost factor credits | 10 × cost factor kg | **Missing** | One-size smaller **only while shut down**; brain in standby; reactivation standard action |

**Evidence status:** all eight independently identified **price/weight/rule facts are PDF-verified**. Their **full Garage/chargen/Store mechanical-release certification remains pending**. No new runtime item, modifier or legal choice was created. The current catalog's YV/booster/interaction restrictions are **not** assumed to be published law solely because they appear in code.

### Concrete blocker: Scomp Link cost

- `scripts/data/droid-part-schema.js` provides `'scomp-link'` only in `RAW_OVERLAY`; its backing `scripts/data/droid-systems.js` lacks an entry, so `getDroidPartDefinition('scomp-link')` has no source price.
- `computeDroidPartCost` ultimately returns **0** when no price, costFormula or costMultiplier is found.
- The printed table gives **100 credits, 1 kg**, while the mechanical paragraph restricts the **+2 equipment bonus to Use Computer / Access Information** against a **helpful/friendly** computer.
- **Do not hotfix a second pricing registry.** Any eventual correction must use the existing canonical registry and prove parity in Garage, the progression droid-builder, and Store checkout.

This is a **static code/source discrepancy**, not a claim that a Foundry runtime purchase has been reproduced.

## 3. Canonical catalog migration backlog — 35 change candidates

The earlier independently maintained **item canonicalization Phase 0-3H** already established **122 published droid-system identities**: Core 55 and Scavenger's Guide 67. At its 2026-10-05 checkpoint, 99 identities were represented; **92 KEEP**, **7 EDIT**, **23 ADD**, and **5 repo-only/unsupported candidates** existed. Those counts are **baseline evidence**, not a fresh all-book mechanic certification.

Machine-readable backlog `data/audits/droids/component-canonical-migration-backlog.json` now freezes the **23 missing ADD**, **7 identity/collapsing EDIT**, and **5 repo-only** candidate records (35 total), preserving their actions without editing production code. Among the ADD cases, Antitheft Locator, Collapsible Construction, Repulsorcam and Silence-Bubble Generator now have individual PDF-verified source facts.

**Important guardrails:**

1. Do **not** put structural droid systems in `packs/equipment.db` or create competing app-local part catalogs.
2. The Garage and sheet consume `scripts/data/droid-part-schema.js` over `scripts/data/droid-systems.js`; the live progression Droid Builder still reads `DROID_SYSTEMS` directly. Confirm actual per-item feature and cost parity, not mere shared file references.
3. `system.installedSystems` is the post-creation canonical installation ledger. `system.droidSystems` is the chargen draft/stock snapshot; neither this source ledger nor a printed statblock rewrites those runtime semantics.
4. Preserve world actor ID/alias dependencies when merging variants (Translator Unit, Laminanium Plating and others).
5. Do not remove live `miniaturized-self-destruct-system` code without independently migrating its actual self-destruct damage logic.
6. No source-only audit entry grants component purchase, installation or attack permission.

## 4. Committed files and exact evidence

- `data/canonical/droids/source-books/sgd.json` — final YVH primary-source hydration.
- `data/audits/droids/sgd-mechanical-hydration-closeout.json` — frozen 46/46 hydration (not certification) proof.
- `data/audits/droids/component-source-facts-sgd-sprint-001.json` — eight component price/weight/mechanical source-fact records; recorded blockers.
- `data/audits/droids/component-canonical-migration-backlog.json` — 23/7/5 migration queue; no registry writes.
- This document — checkpoint for the next sprint and implementation handoff.

## 5. Next source certification milestones

**Component Sprint 002:** First finish the **19 still-unreviewed missing ADD identities**, prioritizing core installable components (Diagnostics Package, Internal Storage, Locked Access, Spring-Loaded Mechanism), then original SGD device/support entries. Inspect the printed Core and SGD pages; separately record every size factor, weight, target, number of uses, install prerequisite and cost. Map variants via exact published identities. Subsequently source-certify the 7 EDIT families and 5 repo-only decisions before requesting runtime changes.

**Stock-model certification:** Continue work on the 46 SGD publication records as an independent track: feat/talent instance proof, attacks and physical mounts, protocol conflicts, printed inventory provenance, vehicle authority and PC creation. A source record cannot receive a strict mechanical certificate merely because its schema and inventory are populated.

**Zero certification inflation:** 46/46 hydrated `!=` 46/46 mechanically certified; 8 source-fact reviewed components `!=` 8 Store-certified purchasable components. The authoritative goal is eventually one publishable mechanical specification per distinct component consumed consistently by Garage, chargen and Store.
