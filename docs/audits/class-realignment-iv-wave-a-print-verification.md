# Class Realignment IV — Wave A independent printed-source review

**Date:** 2026-11-07  
**Scope:** Review of draft PR #1121 at `48dce9b132393d7d19f0a9649294695332490a46`.  
**Authority:** User-supplied printed-page PDF scans. Book TXT/OCR and `data/class-features.json` used only as locators and comparison material.  
**Change type:** Documentation review only. No runtime, pack, registry, or actor data changed.  
**Certification boundary:** `PRINTED_RULE_REVIEWED` is not `OFFLINE_TESTED`, `RUNTIME_IMPLEMENTED`, or `FOUNDRY_V13_CERTIFIED`.

## A. Wave A corrections to PR #1121

### The five CF-RD-001 OCR gaps are source-access issues, not owner rules choices

The five printed feature paragraphs are legible in the supplied PDFs. They should **not** remain blocked on the owner providing scans:

| Feature | Printed authority | Independently verified requirements |
|---|---|---|
| Tough as Durasteel (Martial Arts Master) | *Galaxy at War* p. 33 | Beginning class L2, damaging a target with an unarmed attack while wearing no armor or light armor grants **bonus hit points equal to Martial Arts Master class level**. The benefit increases at even class levels. Do not silently reinterpret `bonus hit points` as a generic healing or stacking temporary-HP effect without inspecting the receiving HP authority. |
| Fugitive (Outlaw) | *Scum and Villainy* p. 35 | Once per encounter, when taking **Withdraw**, add one square to the allowed movement at Outlaw L2; increase by one square at L4/6/8/10, to +5 at L10. Terrain and placement remain GM/Foundry movement decisions; no automatic token teleport. |
| Mark (Assassin) | *Scum and Villainy* p. 30 | At encounter start select one visible target. Damage bonus vs mark is half Assassin level (floor); damage against the marked target **also gains full Assassin level** when the target is flat-footed. When mark drops to 0 HP, transfer to another visible target as a free action. As a swift action, sacrifice the marked damage bonus to make target flat-footed against your next attack before end of turn; then lose the mark for the rest of that encounter. These are separate riders; do not omit the flat-footed damage or sacrifice/transfer rules. |
| Score (Charlatan) | *Scum and Villainy* p. 32 | A full-round action observing one target enables Deception rerolls against that target through encounter end, **keeping the better result**. |
| No Tools Required (Improviser) | *Rebellion Era Campaign Guide* p. 42 | Always counts as using an appropriate **tool kit or security kit** for Mechanics/Use Computer checks that ordinarily require one; ownership/equipping a physical kit is not required. This does not waive unrelated prerequisites, access, or skill conditions. |

### Five proposed conflict decisions against the printed pages

| Decision | Direct printed review | Consequence |
|---|---|---|
| CF-RD-002 Veteran Privateer | *The Force Unleashed Campaign Guide* p. 52 and *Scum and Villainy* p. 34 both describe **an attack roll**, not melee only. TFU specifies free action, +2 competence, floor(Master Privateer level/2) uses per encounter. | Correct `data/class-features.json` scope and summary **after** source amendment review. Do not add a melee filter. |
| CF-RD-003 Independent Spirit | *The Force Unleashed Campaign Guide* p. 48 confirms once per encounter, reaction, morale bonus to one chosen Defense, floor(Independent Droid level/2). **No explicit duration or one-incoming-roll restriction is printed in its paragraph.** | This is a genuine unresolved expiry/scope rule. Do not silently install the registry's single-roll constraint as RAW. Keep effects blocked pending explicit rule interpretation; pure entitlement display is possible. |
| CF-RD-004 Unflinching | *Knights of the Old Republic Campaign Guide* pp. 44–45 confirms reaction, bonus **equal to full Gladiator class level**, to Fortitude Defense + Damage Threshold OR Will Defense, through start of next turn; declare before outcome. Uses are 1 at L2, +1 at every later even class level (floor(level/2)). | The current registry's **summary, bonus metadata and uses metadata already encode this correctly**. Wave A's claim that the registry assigns a half-level bonus is inaccurate. Correct the Wave A matrix/decision evidence; do not change a correct registry to fix an invented discrepancy. |
| CF-RD-005 Surprise Attack | *Clone Wars Campaign Guide* p. 47 clearly says the **first attack roll in a round against that target** when the target is unaware or denied Dex to Reflex; bonus half Vanguard level. | Remove OCR-legibility hold. Ensure per-round qualifying first-attack logic; no unearned bonus on later attacks. |
| CF-RD-006 Vehicle Dodge | *Core Rulebook* p. 207 explicitly states dodge bonuses **stack with one another**; bonus half Ace Pilot level on piloted vehicle's Reflex, lost when Dex bonus to Reflex is lost. | Preserve normal dodge-type stacking and prohibit only duplicate application of this *same* class feature. Do not implement an across-the-board no-dodge-stacking rule. |

### Printed confirmation for the proposed Wave B start

- **Familiar Foe**, *Core Rulebook* p. 209: full-round observation only after enemy has already acted in combat; floor(Bounty Hunter level/2) to attack rolls vs that enemy and to Reflex against that enemy's attacks through encounter end.
- **Targeted Suspect**, *The Force Unleashed Campaign Guide* p. 45: same observation and target-acted gate; floor(Enforcer level/2) to attack rolls and qualifying Deception, Perception and Persuasion checks against the observed opponent, through encounter end.
- These two share the observation lifecycle, not an unrestricted global buff. Their target ownership, encounter scope, source-class level and per-target defenses/skills differ.
- Both are **printed-source reviewed**, **not implemented**. Do not treat an OCR match as a complete engine contract.

## B. Important correction: grant plumbing exists; feature identity is incomplete

PR #1121 says a new class-level-to-owned-Item grant path must exist before any consumer can work. The stronger, directly verified statement is:

1. `scripts/engine/progression/utils/levelup-entitlement-manifest.js` already reads the selected class's **canonical** `level_progression[].features[]`, recognizes `class_feature` / `scaling_feature`, and returns `automaticClassFeatures`.
2. `scripts/apps/progression-framework/shell/progression-finalizer.js` already materializes these as locked owned `feat` Items with `sourceType: 'class-feature'`; it uses `featureKey` for keyed scaling upsert and otherwise falls back to name-based duplicate suppression.
3. `scripts/engine/progression/utils/class-scaling-feature-upsert.js` already plans typed ActorEngine updates for a keyed scaling Item and rejects duplicates/regressions.
4. The initial Wave A grep establishes that the 18 features lack **keyed `featureKey` rows**, not that their named class-feature grants never materialize. An actual new-actor LevelUp test must resolve the latter question.
5. A runtime consumer that requires `system.featureKey` will still not recognize a name-only Item. **Close the key gap through the existing class-pack/entitlement/finalizer authority; do not introduce a new grant registry or direct Item mutation path.**
6. Because `packs/classes.db` is the operational class SSOT, inspect its maintained source/build pipeline and guard/fingerprint tests before adding stable keys. Do not edit generated packs blindly or bypass protected class baselines.

### Required grant-path test matrix before Wave B mechanics

- New actor entering the prestige class; acquiring the feature at its printed class level; no grant at earlier levels.
- `featureKey` identity is stable and unique for a granted feature and cannot collide with similarly named talent/feat.
- Re-level the same prestige class to next even level: preserve one scaling feature Item and replace its value; no duplicates or phantom grants.
- Level a different class: the prestige feature does **not** scale from heroic/character/other class level.
- Reopen and finalize progression; rollback/failure paths preserve actor state.
- Multi-class or same-name feature across publications: preserve exact owning-class identity.
- ActorEngine transaction, protected-data and offline tests; actual Foundry V13 tests remain separate.

## C. Specific Claude Wave B engineering directive

1. **First submit a short grant-path design note** identifying the exact existing owner files, class pack data/build origin, keys for Familiar Foe and Targeted Suspect, what will be changed, and fail-closed cases. No new registry, no direct actor mutation, no created map engine.
2. Update the Wave A matrix to remove resolved OCR source blocks and correct Unflinching/entitlement-path findings. Preserve CF-RD decision history: append resolutions, never silently rewrite the original pending entries. CF-RD-003 stays unresolved.
3. For both observed-target features, use explicit actor/target IDs; a player/GM confirms a valid target and that it has acted. Spend **one full-round action** through existing action authority, not a custom counter.
4. Store exactly one encounter-scoped observation grant per source feature/target. Reuse existing encounter identity and effect/transaction lifecycle; do not invent a second combat-state store. Define target deletion, actor deletion, encounter-end cleanup, duplicate activation and resuming combat after reload.
5. Thread eligible bonuses through **existing** attack, target-specific Reflex and skill roll authorities. Avoid persistent global `system.defenses.reflex` mutation and avoid granting Targeted Suspect skill bonuses for unrelated targets/checks.
6. Require attack/defense/skill positive and negative tests, multi-actor isolation, class-level scaling, action exhaustion, stale target and encounter cleanup, actor/reload/rollback tests, protected-class-data checks and full rolling suite.
7. Present all resulting implementation PRs as draft/unmerged for independent review. Exact-head CI success is required but not a Foundry certification. Keep the seven reserved Force prestige features and seven GM_FIRST features outside Wave B.

## D. Disposition

- **Source access:** the five CF-RD-001 features can be advanced to `PRINTED_RULE_REVIEWED`. They remain `RUNTIME_NOT_IMPLEMENTED`.
- **Resolved printed-text conflicts:** CF-RD-002, 004, 005, 006 have a documented printed answer above; registry edits require separate tests and review.
- **True unresolved rules choice:** CF-RD-003 Independent Spirit duration/scope.
- **Architecture finding:** the grant path needs **stable keyed identity and integration proof**, not wholesale creation.
- **Wave B:** design note + key evidence first; then Familiar Foe / Targeted Suspect only. `FOUNDRY_V13`: NOT_RUN.

**No production data or code was altered by this review.**
