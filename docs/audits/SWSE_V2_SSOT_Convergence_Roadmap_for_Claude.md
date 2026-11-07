# SWSE V2 - Convergence Roadmap for Claude

| | |
|---|---|
| **Repo** | `docflowGM/foundryvtt-swse` |
| **Scope** | READ-ONLY planning. Nothing in this file has been executed; no production file was changed by the audit. |
| **Observed HEADs** | #1117 `1d09d4203be7a9ed72b157b1fb1dc3b40bea0b42`; #1116 `202082309628ea2c6088e5806ab03a08b7ed77fd`; #1092 `e844aba1bbbb9b2a66f860bf579cf476d43c40f7`; `origin/main` `de196e5a4`; integration `8ad8ca41e` |
| **Date/time** | 2026-11-06 UTC |
| **Evidence level** | See the Ledger: `CODE_VERIFIED` / `TEST_REPRODUCED` / `INFERRED` / `UNVERIFIED`; nothing `RUNTIME_CONFIRMED` |
| **Foundry status** | Not Foundry-tested. Every wave below that touches Foundry-only paths needs a real v13 world pass before `main`. |
| **Siblings** | [Architecture Map](SWSE_V2_SSOT_Master_Architecture_Map.md) - [Consumer Ledger](SWSE_V2_SSOT_5_Category_Consumer_Ledger.md) |

**Audit/change ledger:** 2026-11-06 v1.

Status labels: **DONE IN BRANCH** (on #1117, unmerged, offline-tested), **READY FOR OWNER APPROVAL**, **BLOCKED ON SOURCE**, **BLOCKED ON V13 RUNTIME**, **REQUIRES INTEGRATION**. A wave may carry several.

## 0. Rules for every wave

- One draft PR per wave, stacked on the current branch tip; never `main`; re-verify the exact SHA before starting (the stack moved during earlier audits).
- Reuse ActorEngine, TransactionEngine, the Droid rules profile/resolver/quote/ledger, the Vehicle installation service/ledger/preflight. **No new installation engine, no new component database, no parallel ledger.**
- Fail closed on unknown. No rulings in code; unresolved rules go to `docs/audits/swse-rules-decisions-pending.md` as `DEFERRED_RULES_REVIEW`.
- Positive **and** negative tests, with at least one mutation check per new guarantee (revert the fix, the test must fail).
- Report exact-head CI from `get_check_runs`, not from a `check_suite` event; say "offline only" until a v13 pass exists.

## 1. Already done in branch (do not redo)

| Item | Where | Proof reran in this audit |
|---|---|---|
| F7 confirmed-ledger removal/resale | `droid-customization-engine.js` (`collectConfirmedComponents`) | `tests/droid-garage-resale-evidence.test.mjs` pass; guard 5a-5d pass |
| F1 uniform confirmed-ledger modifier rule + profile | `droid-rules-profile.js`, `ModifierEngine.js:346,1688-1721` | `tests/droid-rules-profile.test.mjs` pass |
| F2 ledger/draft-only prerequisites; named-part identity match | `scripts/domain/droids/droid-part-schema.js` | `tests/droid-prerequisite-evidence.test.mjs` pass |
| F5 stock raw-clone fallback removed | `scripts/engine/droids/droid-factory.js` | `tests/droid-factory-stock-contract.test.mjs` pass |
| Garage consumers on profile, no `type` impersonation | engine, `UpgradeService.js:132`, `customization-bay-app.js:347`, hotfix | droid tests 44/44 |
| Six dead droid modules + dialog/template/CSS removed | PR #1117 stage 5 | `tests/droid-dead-surface-removed.test.mjs` pass |
**All unmerged and not Foundry-tested.**

## 2. Dependency-ordered waves

### W0 - Branch/base reconciliation - READY FOR OWNER APPROVAL, REQUIRES INTEGRATION
`origin/main` already contains merge #1109 of `integration/v2-vehicles-droids-2026-11`; HEAD is 14 commits ahead / 2 behind main (merge-base `968b25702`). Owner decides: retarget the #1112-#1117 stack onto current `main` (merge `main` into the stack) or keep stacked drafts. **Stop gate:** no code wave starts until the owner names the base. Test: after any merge/retarget, rerun the Section 4 fixtures and the 625-test rolling suite.

### W1 - Vehicle unpaid-writer closure (FIRST UNBLOCKED WAVE) - READY FOR OWNER APPROVAL
- **Scope:** make `UpgradeService.applyUpgrade`/`removeUpgrade` refuse `vehicle-actor-*`; extend the Vehicle `preUpdateActor` guard family so `system.installedSystems` on a `vehicle` Actor cannot be written except by the one sanctioned legacy lane (or at all, per W3 decision).
- **Retain:** `VehicleInstallationService`, sealed flag ledger, `canonicalBlock`, Droid delegation in `UpgradeService` (`itemId` `droid-actor-*`).
- **Files/functions:** `scripts/engine/upgrades/UpgradeService.js` `applyUpgrade` (`:635-640`), `removeUpgrade` (`:738-745`); optionally `scripts/actors/vehicle/vehicle-precreate-hooks.js` new `guardLegacyVehicleInstalledSystems`; `scripts/engine/upgrades/UpgradeCommands.js` unchanged. UI: have the Upgrade surface hide/disable the vehicle record (`UpgradeService.js:144-155` `collectOwnedUpgradeRecords`) instead of offering an action that throws.
- **Prerequisite source rulings:** none.
- **Positive tests:** Droid `applyUpgrade` still routes to `DroidCustomizationEngine` and charges; item upgrades unchanged; `VehicleInstallationService` still installs and writes only `flags.swse.vehicleInstallations`.
- **Negative tests:** `applyUpgrade({itemId:'vehicle-actor-X'})` and `removeUpgrade(...)` throw with zero `ActorEngine.applyMutationPlan` calls and zero wallet change (published, custom and legacy-shaped vehicle fixtures); direct `ActorEngine.updateActor(vehicle,{'system.installedSystems':...})` rejected by the guard unless a sanctioned token is present; a pre-existing raw `system.installedSystems` entry produces no modifier (couples to W2).
- **Mutation checks:** re-add the raw write -> test fails; remove the guard -> test fails.
- **Expected state change:** no Vehicle gains installed systems without Shipyard/legacy paid lane; none removed for free.
- **Branch/PR:** `feature/v2-vehicle-upgrade-writer-closure` stacked on the owner-approved base; draft.
- **Stop gate:** if any caller other than UpgradeService is found writing the field, stop and report.

### W2 - Identity and modifier fallbacks - READY FOR OWNER APPROVAL
- **Scope:** (a) `ModifierEngine._followsDroidRules` (`:1657-1665`): import the profile statically or fail closed (return false and surface an error), never `actor.type === 'droid'`. (b) `_getVehicleModModifiers` (`:1809+`): stop reading raw `system.installedSystems` for any vehicle that carries a published source or a verified construction record; custom-only scope only if the owner approves (W3).
- **Tests:** simulated import failure grants no droid-component modifier (negative); same ledger hardware gives a PC droid and an NPC follower the same modifier exactly once (positive); raw tampered `system.installedSystems` on a published hull has zero effect on `getEffectiveVehicleDerived` and on `ModifierEngine` totals; certified sealed installation still applies once (no double count). Mutation: restore fallback / restore raw read -> fail.
- **Depends on:** W1 (so no new raw writes appear). **Status add-on:** REQUIRES INTEGRATION (vehicle effective projector lives on the Vehicle branch lineage; ancestry verified).

### W3 - Vehicle customization convergence - BLOCKED ON OWNER RULING (custom hulls), then READY
- **Needed ruling (not mine):** what a *custom/unpublished* vehicle may do (legacy paid Bay lane vs custom construction project flow `custom-vehicle-construction-service.js`), and its trust level. Do not erase the capability; do not give a custom hull published-source trust.
- **Scope after ruling:** `CustomizationBayApp` Shipyard mode (`:584-607,1146-1149`) navigates to the vehicle sheet Shipyard for published hulls; `VehicleCustomizationEngine` mutation retired after the last caller moves; `canonicalBlock` kept until deletion.
- **Tests:** published hull never reaches `VehicleCustomizationEngine` mutation; custom hull behaves per ruling; owner wallet charged exactly once.

### W4 - Follower Garage proxy retirement - REQUIRES INTEGRATION, BLOCKED ON V13 RUNTIME
- **Scope:** delete `scripts/patches/follower-droid-garage-hotfix.js` and its registration (`runtime-bugfix-hotfixes-init.js:16,38`) after proving the Bay (`#getWalletActor`, `walletActor` option already passed at `customization-bay-app.js:523`) and `TransactionEngine.executeAssetCustomizationTransaction` handle owner-pays/follower-receives natively; keep owner resolution as a real service.
- **Tests (offline):** owner debited once, follower ledger changed, follower wallet unchanged, preview shows owner credits; failure restores both. **Runtime (v13):** NPC follower opens Garage, preview/apply end-to-end.
- **Stop gate:** any wallet misdirection.

### W5 - Dead-code deletion - READY FOR OWNER APPROVAL (static), BLOCKED ON V13 RUNTIME (final)
Candidates with static negative evidence (Ledger Section 8): `infrastructure/hooks/assets-hooks.js`, `domain/vehicles/vehicle-transaction-service.js`, `apps/vehicle-modification-manager.js` (+ replace the pinning test assertion at `tests/vehicle-universal-phase4e-p6-modification-rules.test.mjs:290-293`). Each deletion: re-grep imports, templates, CSS, `system.json`, packs; extend `droid-dead-surface-removed`-style scanner; V13 startup shows no missing-module error. Quarantine (do not delete) if the owner wants GM approval history preserved.

### W6 - Droid Store per-model honesty - BLOCKED ON SOURCE
- **Scope:** a read-only crosswalk from each of the 234 source identities (`data/canonical/droids/source-books/*.json`) and the 194-record pack to a status in {`STOCK_STATBLOCK_ONLY`, `CONSTRUCTED_CERTIFIED`, `UNAVAILABLE_FOR_CONSTRUCTED_HARDWARE`}; Store shows/permits accordingly. Promote a model only when its factory systems are source-certified with book/page. **Never infer a processor, hands or systems from a name.** Do not delete `packs/droids.db` until the Store reads the replacement listing source.
- **Tests:** unresolved model cannot be sold as a constructed build; stock purchase keeps stock-statblock mode and creates no ledger; failed normalization leaves no Actor and no debit; identity-collision fixtures.

### W7 - Droid 0 HP / ion (F3) and damage-classification migration - BLOCKED ON SOURCE
Needs printed Core pages and an owner ruling on follower shape. Only then migrate `damage-resolution-engine.js:412-470` and `damage-packet-rules.js:171-185` to the profile, changing only the specific decision branches. Fixtures: native droid, NPC-typed droid follower, ordinary NPC, vehicle/starfighter, beast.

### W8 - Heuristic Processor defaults (G5) - BLOCKED ON SOURCE
Four construction-default sites; a rules grant. Source ruling first; no silent grant or removal.

### W9 - Vehicle stock-weapon certification - BLOCKED ON SOURCE
Small published-page batches; each group needs book/page, crew, arc, scale, ammunition; keep `SOURCE_ONLY` otherwise. Negative combat tests run before costs.

### W10 - Cross-domain integration and release gate - REQUIRES INTEGRATION, BLOCKED ON V13 RUNTIME
Full regression (Section 4), Foundry v13 world pass (create/open/roll/GM/save/reload for each asset lifecycle), native pack readback of 429 vehicles, exact-head CI. **No `main` merge before independent owner review and runtime evidence.**

## 3. Branch / PR strategy

Keep #1116 as the audit record. Land waves as small draft PRs: W0 decision -> W1 -> W2 -> (W3 after ruling) -> W4/W5 -> source-blocked waves as rulings arrive -> W10. Each PR description: SHA, what changed, files, tests run and results, exact-head CI, "offline only" statement.

## 4. Cross-domain regression fixtures (run after each relevant wave)

Organic PC creation (unchanged); PC droid + NPC follower with identical confirmed hardware (same modifiers once); two identical appendage instances; mirror-only / Item-only / stock-display hardware (no resale, no modifier, no prerequisite, blocks duplicate buy); stock-statblock suppression; source-HOLD component (blocked with reason); Store droid purchase and failure (no Actor, no debit); owner vs follower wallets separate; canonical Vehicle purchase with printed price and unpriced rejection; **Vehicle via generic Upgrade UI/CommandBus (no shadow write, no free system)**; sealed Shipyard job/EP/ammunition; source-weapon attack denial before costs; crew/arc/unknown SR stays unknown; failed two-Actor transaction leaves honest state; Actor/Item persistence after reload (runtime).

## 5. Precise tests required before `main` could ever be merged

1. Exact-head GitHub checks green for every stacked PR and the combined head. 2. Full rolling suite and all strict guards at the merge SHA. 3. Vehicle native QA (`node --test tests/vehicle-universal-phase*.test.mjs`, canonical `--check` builders) at the merge SHA. 4. W1/W2 negative tests with mutation checks. 5. Foundry v13 acceptance script executed in a throw-away world with cleanup verified (no orphan Actors, no duplicate credit rows, no residual trust flags). 6. Owner sign-off on every `DEFERRED_RULES_REVIEW` that the merge would touch.

## 6. Next command for the first unblocked wave (do NOT execute under the audit command)

> Work in `docflowGM/foundryvtt-swse` on a new draft branch stacked on the owner-approved base (verify the exact current SHA first; never `main`). Implement **W1 only**. Verify the callers of `UpgradeService.applyUpgrade/removeUpgrade` (`CommandBus` `APPLY_ITEM_UPGRADE`/`REMOVE_ITEM_UPGRADE`, `ShellHost._wireUpgradeSurfaceEvents`, `SWSEUpgradeApp`) and that nothing else writes `system.installedSystems` on a `vehicle`. Make the `vehicle-actor-*` branches fail closed with zero ActorEngine calls; keep Droid delegation and `VehicleInstallationService` untouched; add a `preUpdateActor` guard for raw `system.installedSystems` writes on vehicles. Add the positive, negative and mutation tests listed under W1, run the Vehicle universal tests, the six strict droid guards and the rolling suite, keep the PR draft, report the exact commit and exact-head CI, and state "offline only, not Foundry-tested". Do not build a new installation engine, change pricing, touch source HOLDs, or begin W2.
