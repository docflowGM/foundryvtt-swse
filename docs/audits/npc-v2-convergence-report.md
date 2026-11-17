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
- **Persistence of brand-new NPCs is unverified.** `launchNewProgression` builds a transient (`parent:null`) actor, as the existing character flow does; I could not find in static inspection where it is persisted before `applyActorUpdateAtomic` (which requires an id). I did not invent a persistence path. The new GM buttons use the same route as "Chargen". If the live test shows the NPC is not created, that is a pre-existing shell defect to fix for characters and NPCs together.
- Statblock conversion flips authority before the shell finishes; a cancel leaves a `progression`-authority NPC (recoverable via snapshot / Revert to Statblock).
- Weapon-group restriction for Weapon Proficiency is enforced after the shared choice dialog returns (the dialog lists all groups), not by filtering the dialog.
- Step UI classes, the entry dialog and the Actor Directory buttons need a live window; only their contracts are tested. Step ordering of `nonheroic-starting-feats` before `general-feat` is requested by the adapter; whether the shell re-sorts by node order was not verified.
- Out of scope / left: Ride in the Nonheroic class skills (RD-002); template creator (`template-character-creator.js`) overlaps only for `character` actors and was not touched; no `npc`-type template flow exists.
