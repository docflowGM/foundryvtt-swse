# SWSE NPC V2 Convergence — Implementation & Verification Report

Baseline: `2752618f0a4c98ec14d98f1a3f74033c3dae4c2a` (= `origin/main` HEAD at the start of this pass; the original audit commit, so no finding had been fixed upstream and no NPC branch/PR existed). Branch: `claude/determined-clarke-zm9qn2`.

Status vocabulary per `CLAUDE.md`: every item below is `IMPLEMENTED` + `OFFLINE_TESTED` at most. **Nothing here is `FOUNDRY_TESTED`.** Rules questions are in `swse-rules-decisions-pending.md` (SWSE-NPC-RD-001..003).

## Resolution matrix

| Issue | Status | Root cause | Correction |
|---|---|---|---|
| NPC-001 | FIXED (offline) | Adapter suppressed the class step but nothing committed a class; Summary + Finalizer require `selections.class`. Also: `createNonheroicClassModel({system:{level}})` let a trailing `...overrides` replace the merged `system`, so any override-built class (incl. ClassStep's) lost `isNonheroic`/`classId`/hit die. | Seeder commits the synthetic Nonheroic class through `session.commitSelection('class')` (shape of `normalizeClass`) for implicit Nonheroic chargen only; adapter `validateReadiness` fails closed if it is missing; model keeps its merged `system`. Heroic chargen untouched. |
| NPC-002 | FIXED (offline) | Hand-maintained allowlist (17 families, 7 not on the printed list), selection by document id, whole-array commit that erased other feats, session identity key and plan-builder name-dedupe both collapsed repeatable scoped feats. | One source-backed rule (`NONHEROIC_STARTING_FEAT_RULE`, Core p.277, nine options) + pure `validateNonheroicStartingFeats`; step rewritten (identity+scope keys, canonical `FeatChoiceDialog`/`FeatChoiceResolver`, hydrate from session, preserves other draft feats); session `_entryIdentityKey` and `FeatTalentPlanBuilder` are scope-aware; `grantSource:'class:nonheroic'` provenance; general-feat step restored for Nonheroic chargen. |
| NPC-003 | FIXED (offline) | Nonheroic branch used `character.abilities.int.mod` (stale actor data). | Formula extracted unchanged to `resolveTrainedSkillAllowance` (pending INT + species + Human/bonus-skill, min 1; Core: 1 + Int, minimum 1); SkillsStep delegates, reconciles excess on re-entry; adapter re-checks at finalization. |
| NPC-004 | FIXED (offline) | Seeder used `actor.system.classes[id].level \|\| actor.system.level`. | Per-class level from the class item only; missing level reported (`levelMissing`), never fabricated; totals from `getLevelSplit()`; implicit Nonheroic never applies when heroic class items exist. |
| NPC-005 | FIXED (offline); reverse direction = SWSE-NPC-RD-001 | Entry offered Nonheroic after heroic levels; ClassStep refused it. | One `evaluateNonheroicTransition()` used by the entry (button disabled + reason, handler blocks) and ClassStep. Behavior preserved from ClassStep; Core is silent on heroic→Nonheroic (deferred, not decided). |
| NPC-006 | FIXED (offline); conversion path needs live test | Fallback `return 'nonheroic'`; class text outranked class items; adapter claimed `imported-statblock`/`standard`. | `getNpcIdentityConflicts()` + `identityConflicts`/`identityAmbiguous` on `getNpcProfileState`; class records outrank pack/text heuristics; progression entry resolves `{subtype,reason}` with **no default** and routes the GM to the NPC level-up dialog; Nonheroic adapter handles only `nonheroic`; entry requires explicit GM confirmation + snapshot before switching a statblock NPC to calculated progression (authority persisted via `ActorEngine.updateActor`); new NPCs are created with an explicit track written into `npcProfile`. |
| NPC-007 | FIXED | Unreferenced packet builders with generic placeholder `Heroic`/Nonheroic classes. | `npc-progression-engine.js` deleted; snapshot helpers moved to `SnapshotManager` (`hasSnapshots`, `getLatestSnapshotInfo`, `revertToLatestSnapshot`); 3 callers + 1 contract test updated. |

## Authorities (post-change)
- NPC creation entry: `launchNewProgression({actorType:'npc', subtype:'heroic'|'nonheroic'})` (Actor Directory GM buttons) → `launchProgression`. Existing NPCs: `SWSENpcLevelUpEntry` → `launchProgression`.
- Subtype resolver: `_resolveNpcProgressionSubtype` (progression-entry.js) over `getNpcProfileState` (npc-mode-adapter.js). Statblock calculation mode: `resolveNpcCalculationMode` (unchanged).
- Nonheroic class model & rules: `scripts/engine/progression/utils/nonheroic-class-model.js`.
- Feat acquisition/legality: `AbilityEngine.evaluateAcquisition`, `FeatChoiceResolver`, finalization prerequisite re-check (`finalization-prerequisite-validator.js`, unchanged), `FeatTalentPlanBuilder` for materialization.
- Skill/ability projection: `resolveTrainedSkillAllowance` (pending session attributes). Level split: `getLevelSplit`.
- Finalizer/mutation: `ProgressionFinalizer` → `ActorEngine`. Snapshots: `SnapshotManager`.
- Competing executable authority remaining: none introduced. Surviving exception: `getFeatSelectionScopeKey` mirrors `FeatChoiceResolver.getSelectedChoiceKey` for the common shapes because it must be import-free (used by the session and the pure rules module); a drift test is a recommended follow-up.

## Mechanical rules (source: `reference/sourcebooks/Core Rulebook_djvu.txt`, "Nonheroic Characters", printed p.277)
1. Starting feats: three, from the nine printed options; Skill Focus/Skill Training repeatable, each for a different skill → `NONHEROIC_STARTING_FEAT_RULE`.
2. General feats: "gain feats normally as they advance in level (Table 3-1)", in addition to class feats → Nonheroic chargen keeps `general-feat` (SWSE-NPC-RD-003: Table 3-1 level-1 cell not legible in the repo OCR).
3. Trained skills: 1 + Int modifier, minimum 1 → `resolveTrainedSkillAllowance` with the synthetic class `trainedSkills: 1`.
4. BAB: printed Nonheroic table, unchanged (`NONHEROIC_BAB_TABLE`; level 3 = +2).
5. HP: 1d4 + Con per level (class record `hitDie 1d4`; HP application itself unchanged and **not exercised** by this suite).
6. Defenses: nonheroic levels add no class bonus (class record zeros; defense math unchanged and not exercised).
7. Mixed advancement: Nonheroic→heroic multiclass allowed (p.277); reverse = SWSE-NPC-RD-001.
8. Talents: none for Nonheroic (class record `talentTrees: []`, step suppression unchanged).
9. Imported statblocks: `sourceAuthority 'statblock'` preserved by the mode adapter; conversion only via explicit GM confirmation.
Discrepancy found, not changed: printed Nonheroic class-skill list has no Ride; the model lists it (SWSE-NPC-RD-002).

## Examples (real fixture output, `node` against the real modules)
```
=== Example 1: Nonheroic 1 (INT 16, chargen fixture) ===
{
 "class": {
  "id": "nonheroic",
  "name": "Nonheroic",
  "level": 1,
  "isNonheroic": true,
  "classId": "nonheroic",
  "hitDie": "1d4",
  "babProgression": "nonheroic",
  "defenses": {
   "fortitude": 0,
   "reflex": 0,
   "will": 0
  },
  "forcePoints": false
 },
 "bab_level1": 0,
 "trainedSkillsAtINT16": 4,
 "trainedSkillsAtINT8": 1,
 "startingFeatRule": {
  "count": 3,
  "options": [
   "armor-proficiency-light",
   "armor-proficiency-medium",
   "skill-focus",
   "skill-training",
   "weapon-proficiency-advanced-melee",
   "weapon-proficiency-heavy-weapons",
   "weapon-proficiency-pistols",
   "weapon-proficiency-rifles",
   "weapon-proficiency-simple"
  ]
 },
 "levelSplit": {
  "heroicLevel": 0,
  "nonheroicLevel": 1,
  "totalLevel": 1
 }
}
=== Example 2: Nonheroic 3 / Soldier 2 ===
{
 "levelSplit": {
  "heroicLevel": 2,
  "nonheroicLevel": 3,
  "totalLevel": 5
 },
 "seederContext": {
  "totalNonheroicLevel": 3,
  "heroicLevel": 2,
  "totalClassLevel": 5,
  "nonheroicClasses": [
   {
    "id": "n",
    "name": "Nonheroic",
    "level": 3,
    "levelMissing": false,
    "isNonheroic": true
   }
  ]
 },
 "nonheroicBabAtClassLevel3": 2,
 "profileKind": "heroic",
 "transitions": {
  "toSoldier3": {
   "allowed": true,
   "code": "nonheroic-to-heroic",
   "reason": ""
  },
  "addNonheroic": false
 }
}
=== Example 3: Imported statblock ===
{
 "before": {
  "sourceAuthority": "statblock",
  "mode": "play",
  "calculationMode": "statblock",
  "kind": "heroic",
  "imported": true
 },
 "afterOpeningProgressionAdapterSeed": null,
 "adapterHandlesImportedStatblock": false,
 "unknownNpc": {
  "identityAmbiguous": true,
  "kind": "standard"
 },
 "conflict": [
  {
   "code": "profile-vs-class-items",
   "declared": "nonheroic",
   "derived": "heroic",
   "message": "NPC profile says \"nonheroic\" but its embedded class records are heroic."
  }
 ]
}
=== Example 4: Repeatable feat ===
[
 {
  "name": "Skill Focus",
  "selectedChoice": "perception",
  "selectionId": "feat-skill-focus::perception",
  "instance": "feats-0",
  "grantSource": "class:nonheroic",
  "slotType": "nonheroic-starting"
 },
 {
  "name": "Skill Focus",
  "selectedChoice": "stealth",
  "selectionId": "feat-skill-focus::stealth",
  "instance": "feats-1",
  "grantSource": "class:nonheroic",
  "slotType": "nonheroic-starting"
 },
 {
  "name": "Armor Proficiency (Light)",
  "selectedChoice": null,
  "selectionId": "feat-armor-proficiency-light-",
  "instance": "feats-2",
  "grantSource": "class:nonheroic",
  "slotType": "nonheroic-starting"
 }
]
```
Notes: Example 3 shows the statblock fixture's authority/mode/calculation mode and that the Nonheroic adapter no longer claims `imported-statblock`; the "after attempting progression" state is enforced by control flow (entry dialog requires confirmation and takes a snapshot before any authority write) and is verified by source-contract test + the live procedure below, not by a running Foundry. HP/defense/BAB totals for a finished actor come from the derived calculators, which this suite does not run; only the class-record inputs are shown.

## Test results
`node --test tests/npc-v2-convergence.test.mjs` → 35 pass / 0 fail. Coverage map: T01/T02/T03/T04/T05/T06/T07/T08/T09/T10/T11/T12/T13/T14/T15/T16/T17/T18/T19/T21/T22/T24/T25*/T26/T27 in that file. *T25 = source-contract only (the existing finalization prerequisite validator is unchanged and is not driven with a real feat document in Node).
- NPC-T20 (failed finalization rollback) and T23 (follower regression): not new tests; covered by existing suites `ti4c0-g06-rollback-verification`, `ti4c0-g06s1-exact-snapshot`, `ti4c0-g11-follower-rollback`, `follower-*`, all passing. The finalizer's own transaction code is untouched.
- Full repo run, every `tests/*.test.mjs` (725 files), baseline vs. changed tree: baseline 718 pass / 6 fail. Changed tree, first full run: 718 pass / 7 fail (the new file passing, plus one regression, `species-core-trait-verification`, which greps `skills-step.js` for `humanBonus`; the formula moved to `trained-skill-allowance.js`, so the observer helper now reads both files). After that fix I re-ran that test (pass) and every test whose name matches npc/nonheroic/follower/skill/feat/class/snapshot/species/progression/architecture/level/minion/phase5/ti3/ti4/rollback/droid: only `phase5-force-healing-mitigation` fails, which also fails on the baseline. A second complete 725-file run on the final tree was not repeated. The 6 baseline failures are unrelated and unchanged: `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`, `rolling-ci-support-check`.
- Static: `node --check` on every changed JS; `node tools/validate-partials.mjs` OK; `node tools/validate-data.js` passed; `system.json` valid.

## Live Foundry procedure (required before FOUNDRY_TESTED)
1. GM → Actors tab → **Nonheroic NPC**: confirm the class step is absent, a Nonheroic class item (level 1, d4) and `npcProfile` (kind nonheroic, authority progression) exist after finish, **and the new NPC actually persists in the world** (see risks).
2. INT 16 → 4 skill picks; lower INT to 10 before Summary → picks reconcile to 1.
3. Starting feats: only the nine options; two Skill Focus (different skills) both appear as embedded items with `system.selectedChoice`; ordinary general-feat step still appears.
4. Level-up dialog: Nonheroic 3 → Soldier 1; Nonheroic 3/Soldier 2 → Soldier 3; heroic NPC → Nonheroic button disabled with reason.
5. Import a statblock NPC → Heroic/Nonheroic prompts the conversion confirm; cancel leaves it untouched; confirm then **Revert to Statblock** restores values.
6. NPC with profile "nonheroic" but Soldier class item → advancement blocked with the conflict message.
7. Minion: level-up blocked. Cancel mid-finalization / close the shell: no partial actor state.

## Risks / limitations
- **(Superseded by the PR #1158 review corrections below: persistence is now implemented and tested offline; live verification still required.) Persistence of brand-new NPCs was unverified.** `launchNewProgression` builds a transient (`parent:null`) actor, as the existing character flow does; I could not find in static inspection where it is persisted before `applyActorUpdateAtomic` (which requires an id). I did not invent a persistence path. The new GM buttons use the same route as "Chargen". If the live test shows the NPC is not created, that is a pre-existing shell defect to fix for characters and NPCs together.
- **(Superseded: conversion is now transactional, see Blocker 3.)** Statblock conversion flipped authority before the shell finished; a cancel leaves a `progression`-authority NPC (recoverable via snapshot / Revert to Statblock).
- Weapon-group restriction for Weapon Proficiency is enforced after the shared choice dialog returns (the dialog lists all groups), not by filtering the dialog.
- Step UI classes, the entry dialog and the Actor Directory buttons need a live window; only their contracts are tested. Step ordering of `nonheroic-starting-feats` before `general-feat` is requested by the adapter; whether the shell re-sorts by node order was not verified.
- Out of scope / left: Ride in the Nonheroic class skills (RD-002); template creator (`template-character-creator.js`) overlaps only for `character` actors and was not touched; no `npc`-type template flow exists.


---

# PR #1158 independent-review corrections (2026-11-18)

Reviewed commit: `5995af80c`. Five blockers were reported; all are corrected on the same branch (PR stays a draft). **Everything below is offline-tested (Node, real modules, Foundry boundary faked). Nothing is `FOUNDRY_TESTED`.**

## Root cause and implementation per blocker

| # | Root cause | Implementation |
|---|---|---|
| 1 Persistence | `launchNewProgression()` builds a `parent:null` draft; the finalizer's `create` bucket only creates *other* actors, and `ActorEngine` needs a persisted id, so nothing ever saved the NPC. | New `shell/progression-actor-persistence.js`. `ProgressionShell._onFinalizeProgression` materializes the world actor **once, after validation and before the durability flush/plan** (abandoned drafts never persist), re-points `shell.actor` and `session.actorId`, and removes the actor *this attempt* created if the plan definitely fails (an indeterminate rollback keeps it). `ProgressionFinalizer.finalize` fails closed on an unsaved draft. Class embedding is now idempotent per progression session (a retried finalization previously re-added the class and would double a level). |
| 2 Statblock bypass | `_resolveNpcProgressionSubtype` trusted `options.subtype`/declared profile before checking authority. | New pure `evaluateNpcProgressionGuard()` (npc-mode-adapter.js) called first in `launchProgression` and again inside `ProgressionFinalizer.finalize` (defense in depth, any entry point). Blocks: statblock-controlled (calculation mode, source authority or Play mode) without an authorized conversion, identity conflicts, and heroic→Nonheroic. Authorization = conversion token whose target matches the requested subtype **and** whose origin snapshot exists on the actor. Dependents (beast/mount/follower/minion/privateer) and blank drafts are exempt. |
| 3 Snapshot target / transactional | Entry wrote authority before the shell finished, then took a second snapshot; revert used the *latest* snapshot. | Entry now only takes a `kind:'statblock-conversion-origin'` snapshot and passes `statblockConversion:{target,originSnapshot}` through `launchProgression` → `ProgressionSession`. The finalizer writes the authority switch **inside the same plan** (so cancel/failure writes nothing). `SnapshotManager`: origin snapshots are never trimmed; `getStatblockOriginSnapshot` (exact timestamp + kind via the recorded conversion), `revertToStatblockOrigin`; "Revert to Statblock" and "Undo Last Level-Up" are separate actions. |
| 4 Identity on multiclass | Stored `npcProfile.kind` was never updated when a Soldier class was added, so the class-record resolver reported a false conflict. | `classKindFromEntries` + `buildNpcProfileReconciliationPatch` (pure); the finalizer applies the patch in the same plan from the class items it adds. Level accounting stays in `getLevelSplit` (unchanged). |
| 5 Feat resurrection | One-entry feat arrays are treated as singleton merges by the session. | `_commitNormalized(…, options)` forwards options; the starting-feat step commits with `{replace:true}` (the session's existing replacement option). Global merge behavior is unchanged for every other consumer. |

## Changed files (this correction pass, final line ranges)
| File | Lines | Blocker |
|---|---|---|
| `scripts/apps/progression-framework/shell/progression-actor-persistence.js` (new) | 1-80 | 1 |
| `scripts/apps/progression-framework/shell/progression-shell.js` | 26, 286, 4067-4068, 4106-4125, 4178, 4210, 4218-4227 | 1, 3 |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | 36-38, 376-394, 1390-1412, 1869-1881 | 1, 2, 3, 4 |
| `scripts/apps/progression-framework/shell/progression-session.js` | 41-46 | 3 |
| `scripts/apps/progression-framework/progression-entry.js` | 23-24, 272-295 | 2 |
| `scripts/actors/npc/npc-mode-adapter.js` | 11-12, 110-122, 471-595 | 2, 4 |
| `scripts/engine/progression/utils/snapshot-manager.js` | 47-82, 167-204 | 3 |
| `scripts/apps/levelup/npc-levelup-entry.js` | 8-9, 47-200, 247-350 | 3 |
| `templates/apps/npc-levelup-entry.hbs` | 83, 124-128 | 3 |
| `scripts/apps/progression-framework/steps/step-plugin-base.js` | 538, 551-552 | 5 |
| `scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js` | 443-446 | 5 |
| `tests/npc-pr1158-review-corrections.test.mjs` (new) | all | 1-5 |
| `tests/npc-v2-convergence.test.mjs` | 407-414 (T18 updated to the new conversion contract) | 3 |
| `docs/audits/swse-rules-decisions-pending.md` | 3628-3640 (+ reviewer-recommendation entry) | rules |

## New tests
`node --test tests/npc-pr1158-review-corrections.test.mjs` — **20 pass / 0 fail** on the fixed tree. The same file run against the reviewed commit `5995af80c` (copied into a throwaway worktree): **19 fail / 1 pass** (the single pass, "B5 (before)", deliberately documents the old merge behavior). Many "before" failures are because the corrected APIs did not exist at `5995af80c`; the behavioral ones are B5 (resurrected picks) and B4 (false identity conflict after Soldier 1), both asserted explicitly in the test.
| Blocker | Tests | Key assertions |
|---|---|---|
| 1 | persistence classification; abandoned-draft/once-only creation; fail-closed finalizer; **integration** draft→materialize→finalize→reload; shell wiring | world has 0 actors while drafting; exactly 1 after; reload has persistent id, `type npc`, Nonheroic class level 1, two scoped Skill Focus feats, name, profile authority; second finalize adds no actor and no extra items; unsaved-draft finalize returns `success:false` and the engine is never called |
| 2 | direct `subtype` heroic/nonheroic against plain/declared-profile/`calculationMode:'statblock'` NPCs; conflicts; transition; token validation; real `finalize` refusal; guard-before-trust ordering | blocked with `statblock-conversion-required` / `identity-conflict` / `transition-not-allowed`; matching token + real origin snapshot passes; wrong-target or missing snapshot does not; published HP/authority untouched after a blocked finalize |
| 3 | exact reversion; undo ≠ revert; trim survival; cancel/fail leaves authority | authorizing changes nothing; origin restore equals the pristine state (level, HP, defenses, BAB, attacks, classes, mode, authority, calculation mode) after a later ordinary snapshot exists; origin survives 14 further snapshots; a failing plan leaves `sourceAuthority:'statblock'` |
| 4 | Nonheroic 3 → Soldier 1 → Soldier 2 → reopen → reload; reconciliation edge cases | patch = `kind/legalProfile → heroic`; split 2/3/5; no conflict; Soldier 3 allowed, Nonheroic blocked; survives reload; dependents/undeclared/consistent profiles untouched |
| 5 | before-defect; 3→2→1→0 with concurrent general feat; repeatable Skill Focus; session recovery; merge unchanged elsewhere | only the general feat remains at 0; deleted picks never return; recovery keeps the one remaining scoped pick |

## Fixtures (actual output of a scratch script built from the test fixtures, real modules)
**Persistence (before → after)**
```json
{
 "before": {
  "worldActors": 0,
  "draftId": null,
  "draftIsTransient": true
 },
 "finalizeOnUnsavedDraft": {
  "success": false,
  "error": "Finalization requires a persisted world actor; the draft actor has not been created yet"
 },
 "after": {
  "success": true,
  "worldActors": 1,
  "id": "world-1",
  "type": "npc",
  "name": "Persisted Pete",
  "items": [
   "class:Nonheroic",
   "feat:Skill Focus(perception)",
   "feat:Skill Focus(stealth)",
   "feat:Armor Proficiency (Light)"
  ],
  "profile": {
   "kind": "nonheroic",
   "sourceAuthority": "progression"
  },
  "calculationMode": "progression",
  "levelSplit": {
   "heroicLevel": 0,
   "nonheroicLevel": 1,
   "totalLevel": 1
  },
  "chargenComplete": true
 }
}
```
**Statblock conversion, cancellation, exact reversion.** `original` = `afterAuthorizeBeforeFinalize` (`unchangedByAuthorization: true`); after the converted plan authority is `progression` at level 3 / HP 41 / BAB 5; after "Revert to Statblock" the state equals the original (`exactMatch: true`) even though a later ordinary snapshot existed. Note: HP/defenses/BAB/attacks in this fixture are stored `system` fields restored by the real SnapshotService; no derived-data recalculation runs here.
```json
{
 "guardWithoutToken": "statblock-conversion-required",
 "guardWithToken_blocked": false,
 "original": {
  "level": 2,
  "hpMax": 33,
  "bab": 4,
  "defenses": {
   "reflex": {
    "total": 17
   },
   "fortitude": {
    "total": 15
   },
   "will": {
    "total": 12
   }
  },
  "attacks": [
   {
    "name": "Blaster Rifle",
    "bonus": 6
   }
  ],
  "classes": [
   "Soldier 2"
  ],
  "mode": "play",
  "sourceAuthority": "statblock",
  "calculationMode": "statblock"
 },
 "converted": {
  "level": 3,
  "hpMax": 41,
  "bab": 5,
  "classes": [
   "Soldier 3"
  ],
  "mode": "progression",
  "sourceAuthority": "progression",
  "calculationMode": "progression"
 },
 "revertedToOriginal_equalsOriginal": true
}
```
**Nonheroic 3 → Soldier 1 → Soldier 2**
```json
{
 "nonheroic3": {
  "storedKind": "nonheroic",
  "derivedKind": "nonheroic",
  "conflicts": 0,
  "split": {
   "heroicLevel": 0,
   "nonheroicLevel": 3,
   "totalLevel": 3
  },
  "next": {
   "heroic": "ok",
   "nonheroic": "ok"
  }
 },
 "patchOnFirstSoldierLevel": {
  "system.npcProfile.kind": "heroic",
  "system.npcProfile.legalProfile": "heroic"
 },
 "withoutReconciliation_reviewedDefect": {
  "conflicts": 1,
  "guard": "identity-conflict"
 },
 "soldier1": {
  "storedKind": "heroic",
  "derivedKind": "heroic",
  "conflicts": 0,
  "split": {
   "heroicLevel": 1,
   "nonheroicLevel": 3,
   "totalLevel": 4
  },
  "next": {
   "heroic": "ok",
   "nonheroic": "BLOCKED"
  }
 },
 "soldier2_reopened": {
  "storedKind": "heroic",
  "derivedKind": "heroic",
  "conflicts": 0,
  "split": {
   "heroicLevel": 2,
   "nonheroicLevel": 3,
   "totalLevel": 5
  },
  "next": {
   "heroic": "ok",
   "nonheroic": "BLOCKED"
  }
 }
}
```
**Feat removal / session recovery**
```json
{
 "afterEachRemoval": [
  {
   "3 picks": [
    "Alertness",
    "Skill Focus(perception)",
    "Skill Focus(stealth)",
    "Armor Proficiency (Light)"
   ]
  },
  {
   "2 picks": [
    "Alertness",
    "Skill Focus(perception)",
    "Skill Focus(stealth)"
   ]
  },
  {
   "1 pick": [
    "Alertness",
    "Skill Focus(stealth)"
   ]
  },
  {
   "0 picks": [
    "Alertness"
   ]
  }
 ],
 "beforeFix_oneEntryCommitWithoutReplace": [
  "Skill Focus(perception)",
  "Armor Proficiency (Light)(undefined)",
  "Skill Focus(stealth)"
 ],
 "recoveredSession": [
  "Alertness",
  "Skill Focus(stealth)"
 ]
}
```

## Rules decisions
Reviewer recommendations are recorded in `swse-rules-decisions-pending.md` as **recommendations, not owner rulings**; RD-001..004 remain `DEFERRED_RULES_REVIEW`. No code or data changed on their strength (Ride is still in the model; profile starting-feat check is still skipped for profile sessions).

## Remaining live-Foundry tests (not run)
1. Actor Directory → Heroic/Nonheroic NPC: abandon at several steps (no actor in the sidebar); finish (one actor, sheet opens, reload world: class/feats/profile intact, derived stats calculated).
2. Force a finalization failure (e.g. disable a required compendium): confirm the draft actor is removed and a retry creates exactly one.
3. Imported statblock: Heroic/Nonheroic → confirm dialog → cancel the shell at each step → open the actor: statblock authority and values unchanged. Complete the level-up → authority `progression`. Revert to Statblock → original HP, defenses, BAB, attacks, items restored; "Undo Last Level-Up" restores only the last level.
4. Nonheroic 3 → Soldier 1 → Soldier 2 → reopen the level-up dialog (no conflict banner).
5. Nonheroic starting feats: pick three, remove down to zero while the general-feat step holds a pick; reload mid-way (session recovery).
6. Direct macro call `launchProgression(actor, {subtype:'heroic'})` on a statblock NPC is refused.

## Unresolved risks
- `ProgressionShell` finalize wiring (materialize/discard) is verified by source-contract and by tests of its building blocks; the shell class itself is not instantiable in Node.
- A brand-new NPC's autosaved session snapshot is keyed by a draft with no id until finalization; whether the earlier (pre-existing) session-storage writes for an unsaved draft behave is unverified.
- An unused conversion-origin snapshot remains if a GM cancels after confirming (harmless, labeled, never trimmed).
- `ProgressionFinalizer` levelup compilation for a real multiclass plan was not run end to end; Blocker 4 is verified through the pure reconciliation patch applied with the harness engine, plus a source-contract check that the finalizer applies it in the plan.
- Page citation: reviewer cites the Nonheroic page as p.278; earlier repo entries say p.277.
