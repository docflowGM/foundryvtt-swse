# Reconciliation V2 — Foundry V13 Acceptance Package (PR #1145 + PR #1146)

**Status: PREPARED, NOT EXECUTED.** No test case below has been run in Foundry V13. Everything verified so far was verified under the Node test shim, which
fakes Foundry, `ActorEngine` internals, compendiums and the sheet. Nothing in this document is a runtime result, and nothing may be recorded as passed
until a named tester has performed it and attached evidence.

- Code under test: PR #1146 head (stacked on PR #1145 head `44cc3c7`). Record the exact SHA in the matrix header before testing.
- Neither PR may be merged. Test in a dedicated world with disposable or duplicated actors.
- Reviewer-accepted at Node level: HP authority (PR #1145); R17-F1…F5 corrections (PR #1146, `0cb4bf6`).

## 0. Test world setup

1. Fresh world on Foundry V13 with the system checked out from the PR #1146 branch (it contains PR #1145's commits).
2. Two clients: one logged in as **GM**, one as **Player** who owns the player test actors (Gate 5). Use two real browser sessions.
3. Back up the world before starting (Resolve and level-up mutate actors).
4. House rules (module settings, scope `world`, namespace `foundryvtt-swse`), reset to the defaults below before each gate unless a case overrides them:

| Setting key | Default | Values used in tests |
|---|---|---|
| `hpGeneration` | `average` | `roll`, `average`, `maximum`, `average_minimum` |
| `maxHPLevels` | `1` | `0`, `1`, `3` |
| `levelUpHpRecoveryMode` | `none` | `none`, `refillToMax`, `increaseCurrentByMaxGain` |
| `talentEveryLevel` | per world default | on/off (Gate 1 house-rule actor only) |
| `armoredDefenseForAll` | per world default | on/off (Gate 1 house-rule actor only) |

Change settings from the system configuration screen (Game Settings → Configure Settings → System). From the console the standard Foundry call is
`game.settings.set('foundryvtt-swse', '<key>', <value>)`.

## 1. Evidence and inspection methods (only things that exist)

- **Actor data:** the standard Foundry document properties, e.g. `game.actors.getName('<name>').system.hp.max`, `.system.progression.hpLedger`,
  `.system.progression.hpGainHistory`, `.system.progression.lastForcePointRefresh`, `.system.forcePoints`, `.system.derived.meta`, `.system.droidSystems`,
  `.system.storeAcquisition`, `.flags.swse.reconciliationIgnored`, `.flags.swse.overrides`, `.flags.swse.speciesGrantManifest`, `.flags.swse.storeDroidConstruction`.
  Capture with `JSON.stringify(<value>, null, 2)` or a screenshot of the console.
- **Derived-calculation completion:** this PR adds a Foundry hook event. To observe it, paste in the console *before* the action:
  `Hooks.on('swseDerivedApplied', (actor, sig) => console.log('swseDerivedApplied', actor.name, sig, performance.now()))`.
  This is the only logging hook the PRs add; there is no other console API, test hook or debug flag for reconciliation. Do not rely on anything else.
- **Performance:** the browser Performance panel; optionally enable the existing setting `performanceDiagnostics` (read by `isPerformanceDiagnosticsEnabled`, which also
  turns on with `debugMode`) and capture what the system already logs. No new timing API exists.
- **UI:** header `!` (`data-action="open-validation-report"`, character v2-concept header) opens the *Character Validation* overlay (overlay id `character-validation`).
  Overlay controls: Resolve `data-action="resolve-finding"`, Ignore (×) `data-action="ignore-finding"`, Restore / Clear `data-action="restore-finding"`; sections
  *Optional (not an error)* (optional actions), *Cannot be verified (informational)* (notes), *Ignored warnings*.
- Screenshots must show the sheet header and, where relevant, the open overlay. Console captures must include the actor name.

Evidence naming: `<gate>-<case id>-<n>.png|.txt`, stored with the test report (not in the repository).

## 2. Fixtures

Create each fixture through the **system's own flows** where the case says "wizard", and by hand (drag items, edit fields) where it says "manual". Do not create fixtures by
pasting JSON into actors; that bypasses the provenance this package tests.

| ID | Actor | How built | Purpose |
|---|---|---|---|
| F1 | Level 1 Human Soldier | Character generation wizard, all choices made | Silent Success baseline |
| F2 | Level 1 Soldier (manual) | Empty character; drag Soldier class, one feat, one class talent, set abilities by hand | Manual build with no provenance |
| F3 | Level 5 Soldier 3 / Scout 2 | Wizard to level 1, then level-up with multiclass | Multiclass BAB / defenses / feats / talents |
| F4 | Level 8 Jedi with Force Training | Wizard + level-ups; take Force Training | Force powers, Force Points |
| F5 | Character with rolled HP history | Wizard, then level-ups with `hpGeneration=roll` | HP preservation, CON changes |
| F6 | Character with GM-edited maximum | F2 copy; GM edits Force Points maximum in the resource editor | Override provenance |
| F7 | Store-built custom droid | Store → droid build flow (`buildDroidWithBuilder`), GM approves, purchase completes; **no armor selected** | Construction authority |
| F8 | Published stock droid | Import from the stock droid compendium (calculation mode `stock-statblock`) | Statblock authority preserved |
| F9 | Converted playable droid | F8 copy converted through the existing droid statblock conversion workflow | Converted droid not judged as custom |
| F10 | Large mixed inventory | F2 copy with ≥ 60 mixed items (weapons, armor, equipment, some with no weight) | Encumbrance evidence, memo, performance |
| F11 | Template-default manual character | New character, drag class only; leave `system.forcePoints.max` at its default | Uninitialized Force Points |
| F12 | Published NPC | Compendium NPC | NPC not treated as a heroic PC |

Before each case, state the fixture's initial values (copy from the console) in the evidence file.

## 3. Gate 1 — Character Review and Silent Success

Role for all Gate 1 cases: **GM** unless stated (a Player pass is repeated in Gate 5).

**1.1 Wizard-built character is silent.** Fixture F1. State: defaults. Actions: open the sheet; wait for the sheet to settle (no further repaint for 3 s).
Expected sheet: no header `!`. Persistent data: unchanged (compare `JSON.stringify(actor.toObject())` before and after opening; they must be identical). Findings/optional: none.
Authorities exercised: `ProgressionReconciler.safeReconcileActor` (sheet projection), derived lifecycle. Pass: no `!`, no actor mutation. Fail: any `!`, any actor update. Evidence: header screenshot, before/after JSON diff.

**1.2 Manual build is silent for provenance alone.** Fixture F2 (all entitlements satisfied by hand). Actions as 1.1. Expected: no `!` merely because items lack acquisition records or certification.
Pass: no `!`. Fail: any finding whose text refers to missing history/certification. Evidence: screenshot; list of items with their `system.acquisition` (may be empty).

**1.3 Multiclass character is silent.** Fixture F3. Expected: no `!`; BAB/defense notes may appear *inside* the overlay only if the overlay is opened through another finding (see 1.7). Pass: no `!`.

**1.4 House-rule character is silent.** Fixture F1 copy with `armoredDefenseForAll` on and `talentEveryLevel`/`talentEveryLevelExtraL1` as configured. Expected: house-rule grants present → no `!`; no finding for the free grant. Pass: no `!`. Fail: a `MISSING_HOUSE_RULE_*` finding while the grant exists.

**1.5 One certified missing selection → exactly one actionable finding.** Fixture F1 copy; delete its single class talent item. Expected sheet: `!` with count `1`; opening the overlay shows one row (class talent); Resolve opens the matching selection step (reconcile mode; no level change). Persistent data: no change until the player completes the step. Findings: one `MISSING_CLASS_TALENT` (`id` `slot:…-class-talent-…`). Authorities: reconciler slot accounting, `levelup-shell` focused step routing (`_openProgressionReconciliationStep`). Pass: exactly one finding; Resolve opens only that selection; completing it clears the `!`. Fail: more than one finding, or the step restarts level-up/chargen. Evidence: overlay screenshot; `system.level` before/after.

**1.6 Ignore persists.** Continue from 1.5 (do not complete the step). Click ×. Expected: `!` disappears; `flags.swse.reconciliationIgnored` gains one record with that `id`. Close and reopen the sheet, reload the browser: still no `!`. Pass/fail as stated. Evidence: flag JSON, screenshots.

**1.7 Informational notes never raise a `!`.** F4 with Force Training and fewer Force powers than the Force Training selections currently open (keep one power unselected); F10 (items without weight). Expected: **no header `!`**. To see the notes, open the overlay from another finding (create the 1.5 condition on the same actor). In *Cannot be verified (informational)*: the Force Training note must say selections "may be unspent" and that the record "does not say which power came from which source"; the weight note must name items without a recorded weight. Pass: notes appear only inside the overlay and are worded as uncertainty. Fail: a `!` caused by a note; wording that states a confirmed missing choice (see §8, limitation L2).

**1.8 NPC and stock droid are not judged as heroic PCs.** F12, F8. Expected: no `!`. Pass: no `!`.

## 4. Gate 2 — HP and Force Point historical correctness

Role: **GM** (settings, level-ups); repeat the level-up cases as the **Player** owner where noted.

**2.1 Level-up under each generation method.** Fixture F1 copy per method. For `hpGeneration` ∈ {`roll`, `average`, `maximum`, `average_minimum`} with `maxHPLevels=1`, level up once.
Expected sheet: `roll`/`average_minimum` require the player to roll (or explicitly choose Maximum); `average`/`maximum` resolve automatically. Persistent data:
`system.hp.max` increased by the displayed gain; `system.progression.hpGainHistory` has a new record with `characterLevel`, `classId`, `className`, `classLevel`, `hitDie`, `amount`,
`generationMethod`, `rolledResult` (rolls only; `null` otherwise), `constitutionModifier`, `houseRules` {hpGeneration, maxHPLevels, levelUpHpRecoveryMode}, `sessionId`, `timestamp`;
`system.progression.hpLedger` = {`conMod`, `featBonus`, `bonus`, `level`} with `level` equal to the new level. Authorities: `HPGeneratorEngine.resolveMethod`, `SummaryStep`,
`ProgressionEconomyPlanBuilder` (live writer), `ProgressionMetadataPlanBuilder`. Pass: every field above present and consistent with the roll shown. Fail: a missing/zero fabricated value
(absent hit die or roll must be `null`), or the ledger absent after level-up. Evidence: the history record JSON; the ledger JSON.

**2.2 Automatic maximum levels take precedence.** `hpGeneration=average`, `maxHPLevels=3`; level a fixture to level 3. Expected: level 2 and 3 gains equal die + CON modifier (maximum), not the average;
record shows `autoMaximum: true`. Pass/fail by amount. Evidence: records.

**2.3 Player may choose Maximum under Roll.** `hpGeneration=roll`: use the "take maximum" control in the level-up summary. Expected: gain = die + CON; record `generationMethod: 'maximum'`, `playerChoice: true`.

**2.4 Pending roll invalidation.** `hpGeneration=roll`; roll in the level-up summary but do not finish. Change one input in turn and return to the summary: (a) switch `hpGeneration` to `average_minimum` (GM, other client); (b) change `maxHPLevels` so the level becomes automatic maximum; (c) change the CON score so the modifier changes; (d) pick a different class. Expected each time: the earlier roll/choice is discarded and the result is recomputed under the new inputs; the finished record's `houseRules` matches the settings in force at finalization. Pass: no stale roll carried into a changed context. Fail: a record whose method/roll disagrees with its `houseRules`. Evidence: summary screenshots before/after, final record.

**2.5 History is not rewritten by later rule changes.** Fixture F5 (levels 2–4 rolled). Set `hpGeneration=maximum`, `maxHPLevels=5`, close and reopen the sheet (there is no separate recheck control in this build). Expected: `hpGainHistory` amounts and `hp.max` unchanged; no HP finding. Pass: byte-identical history and `hp.max`.

**2.6 CON change applies a verified delta once.** Fixture F5 with a ledger. Raise CON by 2 (modifier +1) — via the sheet's ability editor. Expected: `hp.max` increases by (modifier change × `hpLedger.level`) once; `hpLedger.conMod` updated; history untouched; repeating the edit to the same value changes nothing; lowering back reverses exactly. Authority: `ActorEngine.recomputeHP` via the HP recompute hooks. Pass: arithmetic matches; idempotent. Fail: any reroll, any change to `hpGainHistory`. Evidence: before/after `hp.max` and ledger. (HP-001 — a level-up and a CON change committed together — is **not** tested here; it is an open rules question.)

**2.7 Toughness gained and removed.** Add then delete the Toughness feat. Expected: `hp.max` changes by +level then −level (`MAX_BONUS_PER_LEVEL` value 1); `hpLedger.featBonus` follows. Pass: exact.

**2.8 Current-HP recovery modes.** Fixture F1 copy damaged to ~50% before level-up, for `levelUpHpRecoveryMode` ∈ {`none`, `refillToMax`, `increaseCurrentByMaxGain`}. Expected: `none` keeps `hp.value`; `refillToMax` sets it to the new max; `increaseCurrentByMaxGain` adds the gained amount (capped at max). A CON change or feat edit (2.6, 2.7) must **not** alter `hp.value`. Pass: all four.

**2.9 Legacy character without a ledger is preserved.** Take a pre-existing character with `hp.max` set and no `system.progression.hpLedger` (or delete the field on a disposable copy via the data editor). Open and edit CON. Expected: `hp.max` unchanged on the first recompute; a baseline ledger is recorded; no `!`; no migration prompt. Pass.

**2.10 Imported NPC / manual class level.** F12 and an F2 copy whose level field is raised by hand. Expected: `hp.max` preserved; no HP finding.

**2.11 HP finding semantics.** Create a ledger mismatch on a disposable copy: set `hpLedger.conMod` lower than the real modifier **without** letting the recompute hook run (edit the flag/field via the data editor, then change nothing else) — expected: a `!` with an HP finding that is **review-only (no Resolve button)** and Ignorable. Reset and confirm the `!` clears. Pass: no Resolve offered for HP. Fail: any HP Resolve button.

**2.12 Force Point maximum — every classification.** Role: GM, then Player.

| Sub-case | Fixture / state | Expected |
|---|---|---|
| 2.12a correctly initialized | F1, `forcePoints.max` equals `5 + floor(level/2)` + Force Point feat bonuses | VALID, silent, no optional action |
| 2.12b uninitialized | F11 (`forcePoints.max` 0, no `lastForcePointRefresh`) | **no `!`**; overlay (open via another finding) shows *Optional (not an error)* with a "Set to N" button |
| 2.12c matches last progression write | F1 copy; add Force Boon (or raise level by hand) so the formula changes while `forcePoints.max` still equals `progression.lastForcePointRefresh.newMax` | **no `!`**; optional action with the text "Nothing records whether you meant to keep it" |
| 2.12d unknown provenance | F2 copy; Player sets `forcePoints.max` to an arbitrary value in the resource editor | no `!`; optional action; no `flags.swse.overrides` record |
| 2.12e documented GM override | F6: GM edits the maximum in the resource editor | `flags.swse.overrides.forcePointsMax` = {`value`, `authority: 'gm'`, `setBy`, `setByName`, `setAt`}; no `!`, no optional action while the value equals the record |
| 2.12f stale override | F6 then change the value from another path (Player edit or data editor) | record no longer honored; classified as unknown provenance (2.12d) |
| 2.12g spent Force Points | any actor, spend points | never a finding |

Authorities: `forcePointMaxAdapter` over `calculateMaxForcePointsForBuildPlan`; `resource-editor.js` override stamping (GM only). Pass: no Force Point `!` ever appears. Fail: any `!` or finding code `FORCE_POINT_*`.

**2.13 Optional Force Point action (safe Resolve).** From 2.12b (GM and Player owner): click "Set to N". Expected: `system.forcePoints.max` = N through `ActorEngine.updateActor`; `system.progression.lastForcePointRefresh` = {`reason: 'reconciliation-resolve'`, `previousMax`, `newMax`, `timestamp`, …}; the optional entry disappears; a second click is impossible (control gone) and a double-click does not write twice. Stale rejection: open the overlay in two tabs; apply in tab A; apply in tab B → expected "Your character changed while this was open" and no write. Also: change the Force Point maximum or a Force Point feat between opening the overlay and clicking → rejected. Pass/fail by those outcomes and the flag/field values. Evidence: before/after fields, notification text.

## 5. Gate 3 — Derived-calculation lifecycle, async settling, sheet refresh

Role: **GM**. Install the console hook from §1 first.

**3.1 Open sheet settles without false `!`.** Fixture F3. Open the sheet; observe the header during the first 5 s. Expected: no `!` at any moment; `swseDerivedApplied` logged at least once with a signature; afterwards `system.derived.meta.appliedSignature` is non-null. Pass: no flash of `!`. Fail: a transient `!`. Evidence: screen recording of the header (or frame-by-frame screenshots) + console log.

**3.2 Edit while open (abilities).** Change STR/DEX/CON by hand. Expected: derived values update; the event fires per applied pass; no `!` appears between the edit and the settled state; no repeated rerender loop (see 3.6). Pass.

**3.3 Class / level change while open.** Drag a second class onto F2, or level up F3. Expected: BAB/defense *notes* (informational, overlay only) may appear after settling but **never** `BAB_MISMATCH` or `DEFENSE_MISMATCH` findings and never a `!` from them. Persistent data: class ledger and items consistent. Pass: no BAB/defense `!`.

**3.4 Equipment and modifier change.** On F10 add/remove armor, a weapon with no recorded weight, and an item granting a permanent BAB modifier (use an existing feat/talent/item that adds to `bab.total`; record which). Expected: derived BAB includes the modifier (`system.derived.bab` = class BAB + `system.derived.babAdjustment`); **no BAB finding or note** for a legitimate modifier; the carried-weight informational note updates after the gear edit (memo includes gear stamps). Pass.

**3.5 Destination reset and reapplication.** Trigger a world reload with the sheet open (F5) or force a re-prepare by editing and undoing a field. Expected: after Foundry rebuilds `system.derived`, the lifecycle returns to current; the event fires again; the sheet repaints once; no `!`. Evidence: console log.

**3.6 No render loop.** With the Performance panel recording, open F3 and leave the sheet idle for 30 s after settling. Expected: no continuous repainting; at most the initial settle repaint(s). Fail: a repaint at a steady cadence. Evidence: performance trace.

**3.7 Startup provisional BAB.** Reload the world and open F3 immediately (before the world has finished loading, if possible), then wait. Expected: no BAB-related `!` at any time. Record any case where `system.derived.bab` was provisional (heroic BAB equal to the adjustment only) while `appliedSignature` was already stamped — that would confirm the limitation in §8 (L4). Pass: no `!`; record observations.

**3.8 House-rule change while open.** Toggle `talentEveryLevel` while F3's sheet and overlay are open. Expected: the open sheet refreshes (no stale `!` or stale overlay content); no loop. Pass.

**3.9 Cache coherence.** Edit a field, then repeatedly reopen the overlay. Expected: the overlay content always matches the current data; a derived pass that lands without an actor update (3.1) is reflected without needing another edit.

## 6. Gate 4 — Store-built, stock and converted droids

**Pre-check P4 (source observation to confirm first).** In source, the `!` button (`data-action="open-validation-report"`) exists only in the *character* v2-concept header
(`templates/actors/character/v2-concept/partials/frame/header-block.hbs`); the droid header (`templates/actors/droid/v2/partials/frame/header-block.hbs`) contains no such control.
Which header template the droid sheet actually renders must be confirmed on site. Open F7, F8, F9 and note whether any validation control is present. If a droid cannot display Character Review, a droid finding (`DROID_CONSTRUCTION_INCOMPLETE`) can **never be seen by a user** —
record this as a **display defect (blocks 4.2), not a pass**.

Role: **GM + Player** for 4.1 (Store flow); **GM** otherwise.

**4.1 Valid Store-built droid, no armor, is silent.** Fixture F7 built through the Store: Player starts the build, submits, GM approves the quoted amount, purchase completes. Expected persistent data: `system.droidSystems.stateMode: 'FINALIZED'`, no `system.droidSystems.armor`,
`system.storeAcquisition.source: 'store-droid-construction'`, `flags.swse.storeDroidConstruction` present. Expected sheet: no `!`/no finding (if the droid sheet shows one, fail). Authorities: `quoteDroidBuild`, `buildCustomDroidActorData`, `droidConstructionAdapter`. Pass: warning-free. Fail: any construction warning.

**4.2 Required system removed from a test copy.** Duplicate F7; delete its processor and all appendages (data editor). Expected: a review-only finding naming the missing systems ("processor", "appendage"), Ignorable, **no Resolve**; nothing is auto-installed. Persistent data unchanged by reconciliation. Pass (only if P4 shows the finding can be displayed). Evidence: overlay screenshot.

**4.3 Catalog drift is not an error.** Duplicate F7; set one component id to a non-existent id. Expected: no finding (unverifiable). Pass.

**4.4 Unknown-provenance finalized droid is not judged.** Duplicate F7; delete `system.storeAcquisition` and `flags.swse.storeDroidConstruction`; also remove the processor. Expected: no finding (governing requirements not established). Pass.

**4.5 Unfinalized build.** Duplicate F7 with `stateMode: 'PENDING'` and a missing processor. Expected: no finding.

**4.6 Stock droid.** F8. Expected: no finding, published statblock values untouched (compare `system` before/after opening). Pass: identical data.

**4.7 Converted playable droid.** F9 (has `flags.swse.stockDroidImport` and/or `stockDroidConversion`). Expected: no custom-construction finding even with no components. Also: a custom droid with only `system.droidCalculationMode = 'playable-derived'` set explicitly and no conversion flags **is evaluated** (not skipped) — duplicate F7, set the mode, remove the processor → expected finding (subject to P4).

## 7. Gate 5 — GM/player permissions, concurrency, Ignore and Resolve

**5.1 Player owner sees and acts on findings for their actor.** Player opens F1 copy with the 1.5 condition. Expected: `!`, overlay, Resolve (opens step), Ignore works and persists (`flags.swse.reconciliationIgnored` written by the player's update). Pass.

**5.2 Non-owner cannot mutate.** A second Player (no ownership) opens the actor as observer if the system allows it. Expected: Ignore/Resolve/optional Force Point action are refused or hidden; no data change. Fail: any mutation.

**5.3 GM-only override stamping.** Player edits the Force Point maximum → no `flags.swse.overrides.forcePointsMax`; GM edit → record exists (2.12d/e). Verify with both clients.

**5.4 ActorEngine guards.** Perform 2.13 as GM and as Player owner. Record whether `ActorEngine.updateActor` accepts writes to `system.progression.lastForcePointRefresh` and `flags.swse.overrides.forcePointsMax` for each role and whether any mutation-guard warning is logged. Fail: a rejected write that still reports success in the UI.

**5.5 Double-click and concurrency.** Double-click Resolve on a slot finding (opens the step once, no duplicate step); double-click the optional Force Point action (one write). Two GM clients Resolve the same finding simultaneously (one succeeds, the other reports it no longer applies or `stale`). Pass.

**5.6 Stale Resolve rejection.** 2.13's two-tab scenario with both clients. Pass: second attempt writes nothing.

**5.7 Ignore persistence across sessions.** Ignore a finding (1.6), log out, log in as a different user with access: the finding stays ignored; Restore from the overlay brings it back; a materially changed discrepancy (level up) appears as a new finding and the old record is listed as stale with a Clear button.

**5.8 Persistence after reload.** Reload the world after 2.13, 1.6 and 2.1; all flags/fields persist; no new findings appear spontaneously.

## 8. Gate 6 — Performance, caching and normal gameplay

Role: **GM**. Capture timings in the Performance panel; record the machine and world size.

**6.1 Sheet-open latency.** F3 and F10: time from click to first complete paint, cold (first open after reload) and warm (reopen). Record values; there is no pass number from the Node benchmark (cold reconcile ≈ 2–4 ms there) — the Foundry targets are for the owners to set; the case passes only when the numbers are recorded and no regression versus the same actor on the base branch (checkout PR #1145's parent) is visible.

**6.2 Repeated rerender count.** Count sheet repaints during 3.2 and 3.8; record per action.

**6.3 Level-up transaction.** Time the finalize step of a level-up on F3 on both branches; confirm no extra writes beyond HP/ledger/progression fields (inspect the actor update log if available through the standard Foundry `Hooks.on('updateActor', …)` listener — record each update's changed keys).

**6.4 Large inventory.** F10: add/remove items in a burst; the carried-weight note and memo remain correct; no stall.

**6.5 Ordinary combat activity does not break reconciliation.** In a combat with F3: apply damage and healing, spend Force Points, advance turns, make attack and skill rolls. Expected: no `!` appears or disappears because of these; `hp.max`, `hpLedger` and `forcePoints.max` unchanged; no extra mutation of reconciliation flags. Note: damage/healing bumps the actor modification stamp, so the next sheet read recomputes the report once (owner decision D-4 keeps this); record how often the overlay/header is recomputed.

**6.6 Memo behavior.** Same state, repeated sheet reads: identical output; any actor edit refreshes it.

## 9. Known baseline failures (document separately)

The Node suite has exactly five failing files, all failing identically at PR #1145's merge base `33ce3f7` (before any HP or reconciliation work), unrelated to these PRs. Do not treat
them as acceptance failures and do not "fix" them in this effort:

`tests/force-power-final-integration.test.mjs`, `tests/phase3-force-power-corrections.test.mjs`, `tests/phase4-force-modifier-automation.test.mjs`,
`tests/phase5-force-healing-mitigation.test.mjs`, `tests/phase6-force-direct-damage.test.mjs`.
Observed cause: the missing module `scripts/combat/damage-system.js` imported by `scripts/engine/force/phase6-force-direct-damage.js`.
`tests/rolling-ci-support-check.test.mjs` takes ≈ 109 s and passes when allowed to finish.

## 10. Unresolved rules register (preserved; no rule is inferred by this package)

Source: `docs/audits/swse-rules-decisions-pending.md`. All remain `DEFERRED_RULES_REVIEW`.

| ID | Subject |
|---|---|
| HP-001 | A level-up and a CON change committed in one transaction: which modifier the new level's gain uses |
| RECON-001 | Multiclass talent cadence |
| RECON-002 | Droid ability-score increases |
| RECON-003 | Nonheroic / mixed actors |
| RECON-004 | HP above the audited maximum |
| RECON-005 | Talent cadence under `talentEveryLevel` and how heroic-cadence talents combine with class-table talents |
| RECON-006 | Force Training: attribution of owned powers to feat instances, repeated instances, whether a later ability-modifier change is retroactive |
| RECON-007 | Trained-skill entitlement under the skill house rules |

No test case in this package may be passed or failed on the basis of how any of these is resolved.

## 11. Architectural limitations to record in the acceptance report

- **L1 — BAB and class-defense arithmetic is not consolidated.** `ProgressionReconciler._computeExpectedDerivedStats()` still sums class progression independently of
  `BABCalculator` / `DefenseCalculator` / the modifier authority. Differences are INFORMATIONAL notes only. The comparison removes the stored `derived.babAdjustment`, but this
  has not been proven complete for every modifier source. Not a certification of BAB or defenses.
- **L2 — Force Training retroactivity and attribution are unresolved (RECON-006).** The informational message ("some may be unspent … does not say which power came from which source") is a lower-bound
  statement against the *current* dynamic formula. It must never be presented as, or read as, a confirmed missing choice.
- **L3 — Derived values are prepared in memory.** Defenses, initiative, grapple, damage threshold and skill totals are not independently verified.
- **L4 — Provisional startup BAB.** `BABCalculator` returns a provisional heroic BAB while class data is loading; whether such a value can survive in `DerivedCalculator`'s compute cache after loading is not verified (3.7).
- **L5 — Droid findings may not be displayable** (P4).
- **L6 — Species values are not verified** (informational manifest check only); Force Point overrides are recorded only for GM edits through the sheet resource editor.
- **L7 — Domains deferred or informational-only:** damage threshold/DR/shields, skills, equipment armor effects, modification slots (two slot authorities coexist), combat statistics, movement. See `reconciliation-v2-17-domain-implementation-report.md`.
- **L8 — Memo:** keyed on the actor modification stamp (damage/healing invalidates once per read) by owner decision D-4.

## 12. Pass/fail matrix

Header to complete before testing: SHA under test: ______ ; Foundry build: ______ ; world/system version: ______ ; GM tester: ______ ; Player tester: ______ ; date: ______.
Result values: PASS / FAIL / BLOCKED / N-A (with reason). A case is PASS only with evidence attached.

| Case | Gate | Needs | Severity if failed | Result | Tester | Evidence ref | Notes |
|---|---|---|---|---|---|---|---|
| 1.1 | 1 | GM | Critical | | | | |
| 1.2 | 1 | GM | Critical | | | | |
| 1.3 | 1 | GM | Critical | | | | |
| 1.4 | 1 | GM | Critical | | | | |
| 1.5 | 1 | GM | Critical | | | | |
| 1.6 | 1 | GM | Critical | | | | |
| 1.7 | 1 | GM | Critical | | | | |
| 1.8 | 1 | GM | Major | | | | |
| 2.1 | 2 | GM (+Player) | Critical | | | | |
| 2.2 | 2 | GM | Critical | | | | |
| 2.3 | 2 | GM | Major | | | | |
| 2.4 | 2 | GM (two clients) | Critical | | | | |
| 2.5 | 2 | GM | Critical | | | | |
| 2.6 | 2 | GM | Critical | | | | |
| 2.7 | 2 | GM | Major | | | | |
| 2.8 | 2 | GM | Critical | | | | |
| 2.9 | 2 | GM | Critical | | | | |
| 2.10 | 2 | GM | Major | | | | |
| 2.11 | 2 | GM | Critical | | | | |
| 2.12a–g | 2 | GM, Player | Critical | | | | |
| 2.13 | 2 | GM, Player | Critical | | | | |
| 3.1 | 3 | GM | Critical | | | | |
| 3.2 | 3 | GM | Major | | | | |
| 3.3 | 3 | GM | Critical | | | | |
| 3.4 | 3 | GM | Critical | | | | |
| 3.5 | 3 | GM | Major | | | | |
| 3.6 | 3 | GM | Critical | | | | |
| 3.7 | 3 | GM | Major | | | | |
| 3.8 | 3 | GM | Major | | | | |
| 3.9 | 3 | GM | Major | | | | |
| P4 | 4 | GM | Critical (display) | | | | |
| 4.1 | 4 | GM + Player | Critical | | | | |
| 4.2 | 4 | GM | Major | | | | |
| 4.3–4.5 | 4 | GM | Major | | | | |
| 4.6 | 4 | GM | Critical | | | | |
| 4.7 | 4 | GM | Major | | | | |
| 5.1 | 5 | Player | Critical | | | | |
| 5.2 | 5 | Player (non-owner) | Critical | | | | |
| 5.3 | 5 | GM + Player | Major | | | | |
| 5.4 | 5 | GM + Player | Critical | | | | |
| 5.5 | 5 | GM (two clients) | Major | | | | |
| 5.6 | 5 | GM + Player | Critical | | | | |
| 5.7 | 5 | GM + Player | Major | | | | |
| 5.8 | 5 | GM | Major | | | | |
| 6.1–6.6 | 6 | GM | Major (record numbers) | | | | |

## 13. Final acceptance gate

All of the following must hold before **any** merge discussion; otherwise the answer is **do not merge**:

1. Every *Critical* case is PASS with evidence. A single Critical FAIL or BLOCKED blocks both PRs.
2. No unsupported header `!` appears in any case on any valid fixture (F1–F6, F10–F12 and valid droid fixtures).
3. No actor data is changed by opening a sheet, opening the overlay, or running reconciliation (only explicit player/GM actions change data).
4. HP: no historical gain, rolled result or `hp.max` is altered by a settings change, a repeated recompute, or a CON/feat delta applied twice.
5. No `FORCE_POINT_*`, `BAB_MISMATCH` or `DEFENSE_MISMATCH` finding is ever produced (they were intentionally removed); optional actions never raise a `!`.
6. P4 is resolved: either the droid sheet displays Character Review (and 4.2 passes) or the limitation is recorded and accepted by the owner.
7. The Gate 6 numbers are recorded and the owners accept them; a visible regression versus the base branch is a FAIL.
8. The unresolved register (§10) and limitations (§11) are carried into the acceptance report unchanged; no ruling is inferred from this testing.
9. The four authority-consolidation workstreams (Force Point pure calculation, BAB/class-defense convergence, Force Training attribution, modification-slot authority) are **not started** until this acceptance has been recorded.

**Merging is prohibited while any Critical runtime failure remains.** Passing this package establishes runtime acceptance of the implemented checkpoints only; it does **not**
certify the 17-domain mechanical scope.
