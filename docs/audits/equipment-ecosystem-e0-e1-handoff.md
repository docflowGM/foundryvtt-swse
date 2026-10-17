# Universal Equipment Ecosystem — E0–E1 Handoff

**Branch:** `audit/equipment-ecosystem-e0-e1` (from `185dac1bded12f5e40cb851539c0a912f42fc24d`)
**Authorization used:** E0 + E1, documentation and read-only verification only.
**Not started:** E2. Not authorized: any of E2–E9.

Role statement: Claude executed the directive. No rules question was decided, no sourcebook was researched, no schema was selected, no scope was widened. Everything uncertain is listed in §6-§7 for the project owner.

## 1. Executive findings

1. **Weapon `equipped` already means "drawn".** `toggleEquip` on a weapon is routed to Draw/Stow (Move action; Swift with Quick Draw), and the sheet labels the state "Drawn"/"Stowed". The plan's concern that `equipped` "also functions as" a drawn/readied flag is confirmed — it *is* the drawn flag. Consequence: legacy `equipped: true` must be mapped to exactly one new posture by an owner decision (OA-1); otherwise 30+ readers change behaviour.
2. **The canonical predicate is not just posture.** `isItemEquipped()` also returns true for `system.active`, `equippable.active` and `activation.active` (activation), and at least **eight other, narrower predicates** answer the same question with different field sets (matrix §3). Several combat readers (Full Attack, dual-wield, feat option gating) read only `system.equipped` or only `equippable.equipped`.
3. **No hand-occupancy model exists.** The nearest things are the grip *choice* `FS.wielded`, the `isOffhand`/`slot==='offhand'` designation and the held-together group. There is no EQUIPPED-but-not-READIED state and no actor anatomy input to any grip function.
4. **No structured species anatomy exists.** Codru-Ji "Extra Arms" and Ryn "Prehensile Tail" are display-only prose traits in complete-snapshot variants. A `multiLimb` rule type is emitted by an old migration script but nothing consumes it.
5. **Optional anatomy is feasible without breaking snapshot authority, but not as a new top-level variant field by default.** `applyCompleteSnapshot` is a whitelist: an unlisted field is silently dropped. Anatomy can ride in a trait's `rules[]` (copied wholesale), or the whitelist can be extended deliberately (OA-7).
6. **Droids: component truth exists; instance-level appendage identity does not.** The Garage writes a per-entry `location` (`left-arm`, `right-arm`, `additional-<length+1>`), but `additional-N` is length-derived, the installer's `#upsertArrayEntry` appears to **replace** a same-part-type entry rather than add one (static read, not exercised — a prerequisite finding for "droid adds an approved manipulator"), the installed-component resolver groups by component *type*, and the sheet slot builder falls back positionally. Appendage-capability data lives in **three differently shaped sources** (canonical registry `scripts/data/droid-part-schema.js` with no manipulation fields; builder catalog `scripts/data/droid-systems.js` with `canManipulate`/`canAttack`; the non-canonical adapter `scripts/domain/droids/droid-part-schema.js`, whose `resolveAppendageSlots` has no callers). Note the directive's named file `domain/droids/droid-part-schema.js` is the *adapter*, not the canonical registry. Per-appendage stable IDs would be new work (OA-8).
7. **The mutation guard is not a lock.** `ActorEngine._inFlightMutations` is a reference-counted re-entry marker read by reactive hooks; it does not serialize two player requests. Economy rollback is `Persistence.undoLast` (last-entry undo). No multi-item posture+spend transaction exists. `applyMutationPlan({transactional:true})` provides snapshot/restore but has not been used for owned-item posture changes.
8. **The "zero-hand wrist rocket" premise is not stated by the repository's canonical records.** Records classify wrist/forearm-mounted weapons but the code comment states they "do not say that a worn weapon occupies, frees or needs a hand"; exactly one identity states `handsRemainFree`/`wornNotHeld`. This is a source question (SRC-3), not an engineering choice.
9. **There is no armor→weapon host relationship** (only a bare `system.weaponMount` boolean written by a customization effect, with no reader) and no droid part→weapon link. Weapon→weapon mounting through `FireStateStore` is the only host relationship with identity.
10. **Dead/unclear writers.** `SWSEActorBase.setItemEquipped` family and `ui/inventory-handlers.js` + `weapon-config-dialog` have no call sites found (static read); both bypass `InventoryEngine`. `setStockState` and `setWielding` have no production caller either (tests only). Armor equip/unequip spends no action and has no test.
11. **Baseline is green.** 31/31 relevant offline test files exit 0 (§4).

## 2. Answers to the three audit questions raised by the owner

| Question | Answer |
|---|---|
| Can the species refactor support optional anatomy without compromising publication-specific authority? | **Yes, with a choice.** (a) Inside a trait's `rules[]`: no code change to the snapshot projection; publication-scoped; needs owner approval of a rule vocabulary extension. (b) New variant field: requires adding it to the `applyCompleteSnapshot` whitelist (otherwise dropped silently), must keep "no base inheritance". A base-level default can never reach a complete-snapshot actor, so the two-arm default must live in the resolver (OA-7). |
| Does the droid system already have stable identities for individual installed appendages? | **No (not instance-level).** Component *type* identity exists and the Garage writes a per-entry `location` key, but `additional-N` is length-derived, a same-type install appears to replace the earlier entry, the resolver collapses same-type components into one row, and positional fallbacks can assign a slot the part did not declare (static read). Disabled/missing component state exists; a severed/damaged-appendage notion does not (OA-4, OA-8). |
| Can existing inventory mutations safely support multi-item transitions without a second mutation authority? | **Partly; not proven.** Several owned-item updates can be sent in one `ActorEngine.updateOwnedItems` array, and spend→write→rollback is an established pattern for a single spend. Gaps: last-entry-undo economy rollback, no serialization of concurrent requests, best-effort `FS` writes, post-write side effects outside rollback, no verification step. E5 must resolve OA-9 before any coordinator performs a real transition (authority contract §7.2-7.3). A second mutation authority is not required — `ActorEngine` remains the only writer. |

## 3. Reusable versus missing

### Reusable as-is (confirmed present)

`InventoryEngine` spend→write→rollback pattern; `ActorEngine.updateOwnedItems`/`applyMutationPlan`; `ActionEconomyConsumption` + `resolveActionCost('drawOrHolsterWeapon')`; `FireStateStore` (`FS`, host mount, stock, wielded, held-together); `resolveWielding`, `resolveEffectiveWieldingSize`, `classifySize`, `wornClassOf`, `hostEligibility`; `DualWieldCombatShapeResolver`; `applySpeciesVariantProfile` and `actorUsesResolvedSnapshot`; `resolveInstalledDroidComponents` (state, conflicts); `DroidSlotGovernanceEngine`; `isArmorItemEquipped` (single-predicate model); `buildWeaponReadinessView`; `RowTransformers`/`PanelContextBuilder`; existing weapon/armor cards and handlers; `docs/architecture/swse-automation-authority.md` unknown/GM-adjudication policy.

### Missing (verified)

EQUIPPED posture; per-manipulator occupancy and anatomy resolver; structured species anatomy; instance-level droid appendage IDs; armor/droid host links; stock and grip production UI; transition planner/coordinator; Assisted Hand Management; shared effective equipment view; posture migration/versioning (baseline §9).

### Highest-risk coupling points

R-1 posture/activation coupling in `isItemEquipped`; R-2 predicate divergence; R-3 alias writers vs readers; R-7 cache signatures; A16 light-sync watch list; creation-time `equipped:true` producers (matrix §6).

### Conflicting existing authorities

Two parallel two-handed paths (`resolveWielding` canonical vs legacy `wieldedTwoHanded`/`twoHanded`/`system.hands`/name regex in D5, D6); two droid appendage slot-key spellings; two sheet template families; a duplicated equip predicate in three sheet-layer files (E2, E4, E5); recorded Codru-Ji grapple/grab bonus differing across layers (species domain, see EQUIP-RD-001).

## 4. Validation results (exact)

Environment: Node `v22.22.0`, Linux container, repository root as cwd, **offline** (in-repo Foundry shim; no Foundry instance). Command per file: `node tests/<file>`, 300 s timeout. No test/tool/production file edited. `git status` clean after the runs.

Result: **31 executed, 31 exit 0, 0 failed.** Full list with self-reported counts is in baseline §2.1. Highlights:

| File | Result |
|---|---|
| `weapon-readiness-production-path.test.mjs` | exit 0, 9 checks |
| `weapon-readiness-ui-contract.test.mjs` | exit 0, 14 checks |
| `weapon-phase-5d-i-d-b1-mounting.test.mjs` | exit 0, 11 checks |
| `weapon-phase-5d-i-d-b2-wielding-size.test.mjs` | exit 0, 8 checks |
| `weapon-phase-5d-i-d-b5-stock.test.mjs` | exit 0, 4 checks |
| `droid-item-classification.test.mjs` | exit 0, banner pass |
| `droid-installed-component-resolver.test.mjs` | exit 0, banner pass |
| `species-*` suites (6 files) | exit 0, PASS (93 profiles in invariants) |
| `weapon-phase-5d-i-c-c-reaction-defense.test.mjs` | exit 0, 73 checks |
| `weapon-phase-5d-i-c-b-grapple-control.test.mjs` | exit 0, 97 checks |

Exclusions/limits: rest of `tests/` (391 entries) not run; `droid-mode-adapter.test.mjs` exits 0 with **no output** (assertion count unknown); `droid-installation-drift-repair-intent-boundary.test.mjs` prints expected injected-failure stack traces and reports pass; nothing is `FOUNDRY_TESTED`.

Pre-commit checklist results are recorded in the PR description (§Validation of this phase's own scope).

## 5. Proposed `OWNER_APPROVAL_REQUIRED` items

OA-1 … OA-14 are defined in the authority contract §12.1. Highest priority for unblocking E2/E3: **OA-7** (anatomy data location), **OA-8** (appendage ID scheme), **OA-4** (unusable-appendage representation), **OA-1/OA-2** (legacy mapping and state home, needed by E5A but shapes E3's outputs).

## 6. Proposed rules-register entries (NOT appended)

`docs/audits/swse-rules-decisions-pending.md` is outside the five authorized output files, so it was **not modified**. The entries below are drafted in the register's format for the owner (or a later authorized change) to append. No sourcebook was consulted; "Source" therefore records the repository record only and states that the printed reference was not researched. No recommended ruling is given; no options are offered because no source-supported options were established.

**EQUIP-RD-001 — Codru-Ji: Extra Arms and Skilled Grappler recorded values**
- Rules domain: species / equipment anatomy · Feature: Extra Arms; Skilled Grappler (variant `codru-ji-leg-2c-03`); base `Quad-Limbed`
- Source: printed book/page **not researched in this phase**; repository records: `packs/species.db` species-codru-ji (variant + base `canonicalStats`), `data/species-traits.json` id `quad-limbed`
- Evidence (paraphrased): the variant records four arms allowing holding up to four items including two two-handed weapons without additional attacks; the base record and the legacy sidecar record different grapple/grab bonus values (+5 vs +2); structured anatomy does not exist
- Confirmed behavior: prose recorded as above; no runtime consumer
- Unresolved question: which recorded values are the published ones, and the structured meaning of "holding capacity" for resolver input
- Options: none established · Recommended ruling: none
- Implementation impact: blocks any structured Codru-Ji anatomy data (E2) and any claim that the grapple value is correct
- Status: `DEFERRED_RULES_REVIEW` · Authority: project owner · Resolution: (blank)

**EQUIP-RD-002 — Armor donning/removal versus the Equip/Stow toggle**
- Domain: equipment · Feature: armor equip/unequip · Source: not researched; repository: `InventoryEngine.toggleEquip` spends no action
- Confirmed behavior (repository): instantaneous toggle with body-armor exclusivity and shield coexistence
- Unresolved: whether published donning/removal timing must apply to the toggle and how
- Options: none established · Recommended ruling: none · Impact: blocks any change to armor equip cost (E5B/E8) · Status `DEFERRED_RULES_REVIEW` · Authority: project owner

**EQUIP-RD-003 — Whether armor-/wrist-/forearm-mounted weapons occupy ordinary manipulators**
- Domain: equipment · Features: Wrist Rocket Launcher, Concealed Dart Launcher, Wrist Blaster, Sith Lanvarok (canonical identities `weapon-wrist-rocket-launcher`, `weapon-concealed-dart-launcher`, `weapon-wrist-blaster`, `weapon-sith-lanvarok`)
- Source: not researched; repository: `data/canonical/weapons.json` operation facts `forearmMounted`, `wornOnWrist`, `wornAs`; `handsRemainFree` + `wornNotHeld` only on Sith Lanvarok; code comment `wielding-size.js:130-136`
- Confirmed (repository): classification only; occupancy not stated except one identity
- Unresolved: occupancy and restrictions for each class of worn/mounted weapon
- Options: none established · Recommended: none · Impact: blocks zero-hand occupancy in E3/E6 for all but sourced cases · Status `DEFERRED_RULES_REVIEW`

**EQUIP-RD-004 — Ryn Prehensile Tail and non-hand holding appendages**
- Domain: species · Feature: Prehensile Tail (variant `ryn-sv-2f-06`) · Source: not researched; repository prose trait only
- Confirmed (repository): display-only text stating hold-but-not-wield and an encumbrance consequence for larger items
- Unresolved: how a holding-only appendage participates in allocation and load in the resolver
- Options: none established · Recommended: none · Impact: blocks structured tail data (E2) · Status `DEFERRED_RULES_REVIEW`

**EQUIP-RD-005 — Droid appendage capabilities**
- Domain: droid equipment · Features: hand, claw, tool, probe, instrument, mount, multifunction apparatus, stabilized mounts · Source: not researched; repository: `scripts/data/droid-systems.js` appendage catalog (`canManipulate`, `canAttack`, features/restrictions); canonical `scripts/data/droid-part-schema.js` `rules` (`weaponCountsAsTwoHanded`, `mountCapacity:3`, `oneMountedToolOrWeaponActive`); adapter overlay traits in `scripts/domain/droids/droid-part-schema.js`
- Confirmed (repository): the three sources are differently shaped; manipulation flags live only in the builder catalog; the canonical `rules` have no consumer
- Unresolved: which appendage types may hold or wield a weapon; effect of multifunction limits and stabilization on occupancy
- Options: none established · Recommended: none · Impact: blocks droid manipulator capabilities beyond installed/enabled state (E2/E3) · Status `DEFERRED_RULES_REVIEW`

**EQUIP-RD-006 — Species with anatomy exceptions beyond Codru-Ji and Ryn**
- Domain: species · Source: not researched · Confirmed (repository): no structured field exists; enumerating from prose is prohibited
- Unresolved: the authoritative list of species with extra, restricted or non-standard holding anatomy
- Impact: blocks completeness of anatomy data (E2) · Status `DEFERRED_RULES_REVIEW`

**EQUIP-RD-007 — Stock-dependent range/proficiency behaviour**
- Domain: weapons · Source: not researched · Referenced by the owner's plan as an independently documented gap; stock state itself (`FS.stock`) exists and is unchanged
- Impact: blocks E7 stock-range/proficiency reconciliation only · Status `DEFERRED_RULES_REVIEW`

## 7. Exact questions requiring the project owner's decision

1. **OA-1:** What should a legacy weapon with `equipped: true` become — `READIED`, `EQUIPPED`, or "ambiguous, report for review"?
2. **OA-2/OA-3:** Where does new posture/occupancy state live (or is it only derived), with what versioning, and how long are legacy aliases dual-written?
3. **OA-7:** Anatomy data location: trait `rules[]`, a new whitelisted snapshot field, or a separate registry?
4. **OA-8:** Stable ID scheme for manipulators (including reconciling `leftArm`/`left-arm`, same-type droid instances).
5. **OA-4, OA-5:** Representation of a severed/unusable appendage; Stow display on fixed mounted weapons.
6. **OA-6:** Representation of the armor→weapon and droid part→weapon host links.
7. **OA-9, OA-10:** Atomicity strategy for multi-item transitions; treatment of the current instantaneous armor toggle.
8. **OA-11, OA-12, OA-14:** Do EQUIPPED-not-READIED weapons appear in attack/reaction sets; per-reader predicate dispositions; fate of the heuristic two-handed paths.
9. **OA-13:** Prune/reroute/keep policy for the unreferenced writers (macro-compat question).
10. **SRC-1…SRC-7 / EQUIP-RD-001…007:** rulings or authorization for the independent reviewer to supply source-verified data.

## 8. Recommendation for the first future production phase (not implemented)

**Authorize E2 (read-only anatomy resolution) next, then E3 (pure capability resolver)** — consistent with the owner's stated sequence. Prerequisites to unblock E2 cleanly: OA-7, OA-8, OA-4, and source-verified inputs for each species/droid fact that is to become data (EQUIP-RD-001, -004, -005, -006). E2 can begin with **no species data at all** — humans and unspecified species via the two-arm default, droids via installed components — and add exceptions only as they are source-verified. E5A (read-only adapter) is the first step that touches the legacy-state ambiguity and should wait for OA-1/OA-2 and the E3 outputs.

## 9. Scope confirmation

- Changed files: exactly the five authorized Markdown files (listed in the PR).
- **No** change to `scripts/`, `templates/`, `styles/`, `packs/`, `data/`, `tests/`, `tools/`, `template.json`, `system.json`, build scripts, canonical species/weapon registries, droid part definitions, modification registries/ledgers/statuses, combat implementations, or actor/item schema.
- No resolver, planner, coordinator, adapter or migration implemented. No pack regenerated. No existing PR retargeted. `main` and existing branches untouched.
- No game data or mechanical flag changed; no gameplay changed.
- **No certification declared.** All behavioural statements are `[CURRENT]` static-read or offline-test statements. Nothing is `SOURCE_VERIFIED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED` or `FOUNDRY_TESTED` as a result of this work.
- Rules register `docs/audits/swse-rules-decisions-pending.md` **not modified** (outside the authorized list); drafts in §6.

## 10. Next authorization needed before E2

1. Owner review of this PR and the contract (approve/modify/reject).
2. Decisions OA-7, OA-8, OA-4 (and, to shape outputs, OA-2).
3. For each datum to be written: a source-verified input from the independent reviewer (EQUIP-RD-001/-004/-005/-006), or an explicit instruction to start with defaults only.
4. An explicit instruction naming E2 as authorized, with its allowed file list.
