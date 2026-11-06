# Droid V2 - Gate C-1: appendage instance identity (2026-11-06)

**Branch:** `feature/v2-unified-wave-1` (from the verified unified baseline `968b257`). **Scope:** one bounded, unblocked Gate C wave. **Not live-tested:** nothing here has run in Foundry V13.

## Baseline verification (before any change)

| Check | Result |
|---|---|
| Documented integration SHA `14572e1` | ancestor of `968b257` and of `main` (`de196e5`); `main` and `feature/v2-unified-completion` are tree-identical |
| Handoff statement "main unchanged at `c367552`" | **stale**: the owner merged PR #1110, #1111 and #1109 into `main` on 2026-11-06. The handoff's permanent rule (no merge to `main` without owner authorization) is unaffected: the owner did it |
| Supported rolling suite | **613 passed / 0 failed**, 5 documented exclusions (re-run in this session, not carried forward) |
| Vehicle `--check` builders (coverage, 100% analysis, evidence verification, weapon readiness, P6B deferred work, unarmed) | all "up to date"; 542/846, 177/391, 335/391, 30/49 reproduce exactly |
| `build-droid-component-source-status --check` | current: 122 identities, 99 PASS / 23 HOLD |
| Droid strict guards | write-authority passes; `authority-ssot`, `calculation-mode-authority`, `reconciliation-authority` fail exactly as the handoff states; output is unchanged by this wave (only the scanned-file count moved by +1) |

## Problem

`system.installedSystems` was keyed by canonical part id, so a droid could not hold two hands; Core p.190 allows any number of appendages. The Garage assigned `left-arm` / `right-arm` / `additional-N` by array length (invented anatomy), appendage enhancements were written into the physical `appendages` list, the E2A projection deliberately returned zero allocatable appendages for lack of confirmed slot + instance, and Gate A's typed `requiresAppendage` prerequisite could never be satisfied because nothing assigned an `instanceId` (enhancements were fail-closed unpurchasable).

## Contract (no new ledger, no new rules)

`system.installedSystems` remains the one installation ledger. A physical appendage is now **one ledger record with its own identity**:

```
installedSystems["hand--inst-9f3a2b1c"] = {
  id: "hand", instanceId: "inst-9f3a2b1c", locationId: "appendage-slot-1", ...usual fields
}
```

- **part** = `id` (what kind), **instance** = `instanceId` (which one), **location** = `locationId` (where; an opaque token, never "left-arm"). This is the OA-8 vocabulary the equipment layer already defined; the ledger key is opaque and is never parsed.
- Minted only by `DroidCustomizationEngine` (the single mutation authority) through `TransactionEngine.executeAssetCustomizationTransaction`. `droidSystems.appendages` is a display mirror carrying the same identity; `auditAppendageMirror` refuses all customization of a droid whose ledger and mirror disagree.
- Entries without `instanceId` are legacy evidence and keep their old meaning. Nothing is migrated (no active player droids).
- No capacity, maximum, capability or anatomy is invented. `canHold` / `canWield` stay unknown.

## Changes

| File | Change |
|---|---|
| `scripts/domain/droids/droid-appendage-instance.js` (new, pure) | identity vocabulary, validation, minting, ledger scan, dependents, mirror audit, one `isPhysicalAppendageDefinition` predicate (the projection now uses it) |
| `scripts/engine/customization/droid-customization-engine.js` | change sets accept `{id, hostInstanceId}` (add) and `{id, instanceId}` (remove); mints identity; removes exactly one instance; refuses ambiguous bare ids, hosts with fitted parts, fitting to a host removed in the same change, and inconsistent records; passes the ledger-derived host to the shared quote/prerequisite authority; non-base appendage parts go to `appendageEnhancements`; invented `left-arm`/`right-arm`/`additional-N` naming deleted |
| `scripts/domain/droids/droid-installed-component-resolver.js` | groups by `canonicalId#instanceId` when an instance is established; exposes `instanceId`, `locationId`, `hostInstanceId`; unchanged for entries without an instance |
| `scripts/engine/equipment/droid-appendage-projection.js` | a component whose primary source is the ledger and which carries instance + location is promoted to a confirmed appendage; everything weaker stays unresolved evidence |
| `scripts/sheets/v2/droid-sheet/droid-systems-resolver.js` | one row per physical instance (it used to collapse same-kind appendages to one row) |
| `scripts/engine/upgrades/UpgradeService.js` | the Workshop addresses an identified instance by part id + instance id (its raw ledger key is opaque), never raw-deletes an identified instance (that would orphan the display mirror), and labels instances by name |
| `scripts/data/droid-part-schema.js` | `hydrateDroidPart` accepts any iterable for `installedIds` (see Defects) |

## Defects found

1. **Pre-existing, fixed:** `DroidSystemsResolver` passes a `Set` as `installedIds`; `hydrateDroidPart` called `.map` on it, so the V2 droid sheet Systems read model threw for any droid with a builder-configured part. Reproduced on a clean checkout of `968b257`; the guard is the `droid-gate-c1-sheet-rows` test.
2. **Pre-existing, fixed:** appendage enhancements, mounts and appendage weapons were written into the physical `appendages` list with an invented arm location.
3. **Regression path caught before commit:** the Upgrade Workshop passed a raw ledger key to the engine and fell back to a raw ledger delete when the engine refused it. With opaque instance keys that would have orphaned the mirror row. Reproduced by `droid-gate-c1-workshop-removal` against the unfixed Workshop, then fixed.
4. **Pre-existing, NOT fixed (latent, fail-closed):** `resolveDroidComponentQuote` hands `appendageBaseCost` to every `appendageEnhancements` price function, but `magnetic-hands` and `multifunction-apparatus` are priced from the size factor, not from a host appendage. Any caller that ever supplied a base cost would misprice them. Today none does, so they are blocked. Fixing it needs a typed per-component price basis read from the source tables (Gate C-2).
5. **Pre-existing invented limit, reported not changed:** `UpgradeService.getSlotUsage` hard-codes `max: 10` for a droid's installed ledger and gates the Workshop apply button on it, while the repository's own source review says no universal droid slot pool is printed. Recorded as `DROID-RD-003`.

## Not done (deliberately)

Chargen and follower seeding of instance records; Garage catalog UI instance picker (the Garage can add several appendages but, until its UI names an instance, removing one when more than one of a kind exists is refused as ambiguous); an automatic repair for ledger/mirror disagreement; host-priced quote wiring for Telescopic Appendage (DROID-RD-002); installed-vs-possessed; chassis host eligibility; Store financial atomicity; dead parallel droid files; the three droid strict guards; GaW droid ledger review; live Foundry V13 acceptance.

## Rulings requested

DROID-RD-001 (Stabilized Mount: appendage vs fitting), DROID-RD-002 (Telescopic Appendage host kinds) and DROID-RD-003 (Workshop 10-system cap) are in `docs/audits/swse-rules-decisions-pending.md`, status `DEFERRED_RULES_REVIEW`. Gate C-1 follows the repository's existing behavior and chooses none of them.

## Evidence

- New tests (4 files): `droid-appendage-instance-identity` (pure helpers), `droid-gate-c1-appendage-instances` (18 groups, real engine / real catalog / real quote authority, shared fake ActorEngine), `droid-gate-c1-sheet-rows`, `droid-gate-c1-workshop-removal`.
- Mutation checks (deliberate defects injected, observed to fail, then reverted): removing a hand also removes its siblings; ambiguity guard disabled; host-removal guard disabled; the Workshop's raw fallback (reproduced as a failure before the fix).
- **Full supported rolling suite on the Wave 1 tree (before the Workshop fix and this documentation): 616 passed / 0 failed**, 5 documented exclusions unchanged (613 baseline + 3 new test files that existed at the start of that run).
- **Final-head rolling run (commit `30f5883`, after the Workshop fix and these docs): 617 passed / 0 failed**, 5 documented exclusions unchanged (613 baseline + the 4 new test files). Local, offline, Node 22.
- 39 related droid / customization / equipment-E2 / follower / ti4c0-g35 suites pass individually; the five suites that parse the rules register pass; `phase-5c` negative test and classification `--check` pass; `validate-partials`, `validate-data`, `system.json` pass.
- Droid strict guards: output identical to baseline except the scanned-file count; `check-droid-installation-write-authority --strict` passes.
- Certification (CLAUDE.md section 6): `SOURCE_VERIFIED` (Core p.190, per the repository's source review; OCR only here), `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED`. Not `FOUNDRY_TESTED`. `DEFERRED_RULES_REVIEW`: DROID-RD-001, -002, -003.

## Next

Gate C-2 host-priced quotes (typed price basis) and installed-vs-possessed; Gate C-3 chargen/follower seeding and Garage UI; then delete the dead droid files and close the strict guards; then Store atomicity; then live Foundry V13.
