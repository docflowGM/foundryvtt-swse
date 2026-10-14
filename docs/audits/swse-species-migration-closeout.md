# SWSE species migration — closeout report (draft PR #1037)

**Answer: yes — the species migration is complete enough to enter final live Foundry v13 validation.** No migration blocker remains that can be resolved without an owner ruling or a live run. Everything below is `OFFLINE_TESTED` at best; nothing is `FOUNDRY_TESTED`.

## 1. Species records in the pack

`packs/species.db` holds **161 species records**: 120 inside the audit inventory and 41 outside it (`swse-species-outside-inventory.md`). The 120 audited records carry the 129 publication profiles (eight multi-publication species — the seven groups plus Barabel — have 17 profiles between them). No record was deleted, renamed or merged; all legacy variant ids still resolve.

## 2. Audited publication profiles (129)

| Status | Profiles |
|---|---|
| Hydrated as complete source snapshots (bulk compiler, includes both Barabel publications and Lugubraa) | 93 |
| Core Rulebook profiles reconciled on their base records and trait-verified | 19 |
| Multi-publication snapshots (Bith, Chadra-Fan, Chagrian, Chiss, Krevaaki, Neimoidian, Yuuzhan Vong), trait-verified | 15 |
| **Reconciled and offline-tested** | **127** |
| Explicitly deferred | 2 (Dashade, Shard) |

## 3. Explicitly deferred profiles

| Profile | Why | Cannot apply wrong mechanics because |
|---|---|---|
| Dashade (GAW-2I-02) | Traits block prints no Automatic Languages line (RD-016, smallest decision and recommendation recorded) | no snapshot; legacy record grants only Dashadi, never Basic (pinned) |
| Shard (JATM-2J-01) | Needs a V2 droid shell that retains Constitution and supplies locomotion (`swse-species-shard-droid-integration.md`) | selection requires the droid builder (`species-droid-shell`), Constitution retained, no natural weapons (pinned) |

Lugubraa (UR-2B-13) is **no longer a hold**: it is hydrated with its two natural attacks as text only, because no damage type is printed anywhere (RD-015). Replica Droid (outside inventory) stays deferred to the droid framework; O'reenian stays under RD-020.

## 4. Verified publication variants

Trait-level verification against each snapshot's own book (`tests/species-multi-publication-trait-verification.test.mjs`, 17 snapshots: the 15 above plus both Barabel publications): ability modifiers, automatic languages, trait names, key words in the printed text and the snapshot text, and measured automation. Publication independence is asserted explicitly (Yuuzhan Vong Technophobic, Chagrian Breathe Underwater, Bith Evolved Intellect and Heightened Awareness, Chadra-Fan Heightened Awareness, Neimoidian conditional feats). Explicit publication selection (no silent default, no combined profiles, legacy actors restored from their own recorded configuration) is covered by `tests/species-publication-selection.test.mjs`. Scum and Villainy Barabel (p.155) is not recoverable from the local OCR; it was verified against the PDF in the Phase 4-B audit and is pinned here by name/automation only.

## 5. Mechanical status (112 verified traits in 36 profiles)

Correctly automated 36 · partially automated 1 · display-only because the engine lacks the mechanic 66 · display-only because an owner ruling is needed 9 · incorrectly automated 0. Per-trait detail: `swse-species-mechanical-completeness.md`. The bulk-hydrated profiles are summarized in `swse-species-implementation-status.md` (91 structured rules, 8 verified activated abilities, 18 natural attacks as weapon items, 6 engine entries suppressed because the engine differs from the printed rule, 199 display-only features).

A profile whose canonical text is correctly represented is **not** counted as unimplemented merely because a trait is display-only.

## 6. Demonstrated incorrect automation

Found and fixed, all in this branch: Duros Expert Pilot and Aqualish Expert Swimmer were "keep the better result" although the text says the reroll must be accepted (parser fix; same fix corrects Barabel/Chadra-Fan/O'reenian/Tusken Raider base-record rerolls to the outcome their own text states). Earlier batches fixed unprinted Core extras and engine entries that differ from print (see git history). **None is known to remain.** The unverified outside-inventory records still apply mechanics from unverified text (for example O'reenian rerolls); that hazard is pre-existing, documented, and listed under post-migration work.

## 7. Outstanding owner rulings (all `DEFERRED_RULES_REVIEW`, no blocker for live testing)

RD-015 Lugubraa damage types · RD-016 Dashade languages (recommendation: A, Dashadi only) · RD-018 gameplay for a species without a walk speed (Celegian) · RD-020 near-Human mechanism / O'reenian · RD-021 Ewok "speak only" · RD-022 Neimoidian (GOI) "trained feat" wording · RD-023 Chagrian (Clone Wars) "breathe normally" · plus RD-002…RD-014 as recorded in `swse-rules-decisions-pending.md`. Resolved: RD-001, RD-012, RD-017, RD-019.

## 8. To test in live Foundry v13

Every row of `swse-species-live-foundry-checklist.md` (creation, species switching and legacy actors, proficiency suppression, conditional feats and their hooks, natural weapons, movement, multi-publication selection, held profiles, regression pass). None has been run.

## 9. Before PR #1037 can merge

1. The live checklist passes in Foundry v13 and results are recorded (`FOUNDRY_TESTED` only for rows actually run).
2. Any runtime regression found is fixed and re-tested.
3. Species tests and validators pass; the full suite shows only the five accepted Force-power failures (baseline below).
4. Open rulings are resolved or knowingly left deferred by the project owner.
5. Explicit project-owner approval. The PR stays draft until then.

## 10. Separate post-migration projects (not migration blockers)

- Trait precedence for non-snapshot records: stop name-only stubs shadowing canonical text, gated per independently verified record (unlocks ~14 Core rerolls, 6 conditional feats, 2 fixed feats) with tests proving unverified records are unaffected.
- Universal mechanics: low-light/darkvision and concealment, Take 10, regeneration, breath holding, equipment grants, trip immunity, conditional defenses, application-limited rerolls.
- V2 droid framework: Shard, Replica Droid.
- Gating or verifying the 41 outside-inventory records' unverified mechanics; a generic near-Human mechanism (RD-020).
- Hutt/other species size rules and the remaining display-only bulk-profile features.
- Force-power refactor (separate branch): start with the offline harness and Foundry import resolution.

## Offline regression status

Accepted baseline failures (project-owner directive): `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`. Final offline run: 463 tests, 458 passing, exactly these 5 failing. GitHub reports no CI check runs for the branch, so CI is not claimed.
