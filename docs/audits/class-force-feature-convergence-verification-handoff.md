# Force Prestige-Class Features — Convergence Verification Handoff

**Repository:** `docflowGM/foundryvtt-swse` · Foundry VTT **v13**, V2 Framework migration  
**Prepared:** 2026-11-07 · **Status:** Source/data & bounded implementation complete; **live Foundry certification outstanding**.  
**Scope:** *Star Wars Saga Edition Core Rulebook* Force Prestige Classes, plus Imperial Knight (Legacy Era).

## Source-class authority (verified against `packs/classes.db` on `main`)

| Class | Actual class Item `system.classId` / pack `_id` | Published feature work |
| --- | --- | --- |
| Force Adept | `289fcf920ef0e184` | Base defenses; odd-level talent choices, even-level Force Techniques |
| Force Disciple | `ef6fe8fdbbd884b4` | Indomitable, Prophet, class/Force Secret cadence |
| Jedi Knight | `fb5c2644f988e6bf` | Prestige access, defenses, talent and Force Technique cadence |
| Imperial Knight | `ec505163e5647cc6` | Legacy Era access/oath and armor prerequisites, defenses, choices |
| Jedi Master | `07a64453f95e04f2` | Fearless, Serenity, Force Secret cadence |
| Sith Apprentice | `1ba03b2d00245906` | Ongoing Dark Side Score gate; Fallen Jedi Light Side Force restriction; choices |
| Sith Lord | `2f7cfdc115c640a5` | Ongoing Dark Side Score gate; Fearless, Temptation, Force Secrets |

The IDs above are **read from actual production data** and are not names/keys inferred from test fixtures. Core source class source review and general data convergence were merged earlier as **#1107** and **#1108**. These only prove code/data alignment, not every user workflow.

## Ten linked, unmerged, draft implementation PRs

| Sequence | PR | Scope and owner |
| --- | --- | --- |
| 6J | [#1120](https://github.com/docflowGM/foundryvtt-swse/pull/1120) | Sith Apprentice Fallen Jedi Force-power use gate |
| 6K | [#1122](https://github.com/docflowGM/foundryvtt-swse/pull/1122) | Shared typed fear/mind effect suppression |
| 6L | [#1123](https://github.com/docflowGM/foundryvtt-swse/pull/1123) | Force Disciple Prophet instant level-up DP vs GM vision choice |
| 6M | [#1124](https://github.com/docflowGM/foundryvtt-swse/pull/1124) | Jedi Master Serenity full-round trance, swift emergence, next-round natural20 |
| 6N | [#1125](https://github.com/docflowGM/foundryvtt-swse/pull/1125) | Sith Lord Temptation target-owned, confirmed FP/DP spend consequences |
| 6O | [#1128](https://github.com/docflowGM/foundryvtt-swse/pull/1128) | Defers provisional attack FP receipt until nonrefundable transaction |
| 6P | [#1129](https://github.com/docflowGM/foundryvtt-swse/pull/1129) | V13 actor-sheet controls for Serenity, Temptation, and pending target adjudication |
| 6Q | [#1130](https://github.com/docflowGM/foundryvtt-swse/pull/1130) | Consular and Sentinel Mind-Affecting effects guard Indomitable |
| 6R | [#1131](https://github.com/docflowGM/foundryvtt-swse/pull/1131) | Both ActorEngine ActiveEffect writers reject explicitly typed immune effects |
| 6S | [#1132](https://github.com/docflowGM/foundryvtt-swse/pull/1132) | Yarkora Confusion/Caamasi Pacifism guards and no legacy AE fallback |

Each PR is **stacked on the preceding branch**, not directly on `main`. Do not squash-merge all as independent main branches without rebasing/retargeting in order, or reintroduce duplicate delta changes.

## Correctness and single-authority invariants

1. All class-feature entitlement checks read real owned Class Items, `packs/classes.db` IDs and the existing `apexClassFeatureAccess` / `forceDiscipleClassLevel` rules. Feats named after classes cannot impersonate them.
2. Sith Lord/Sith Apprentice features are suspended when **Dark Side Score below Wisdom**, rather than deleting class levels or reclassifying powers by thematic names.
3. **Indomitable/Fearless** suppress only typed Mind-Affecting/Fear effects, not all Persuasion, Force powers, or emotions. Apply at both the incoming effect boundary **and** earlier consumer-specific non-ActiveEffect mutation sites.
4. **Prophet** prompts immediately at Force Disciple level-up, saves explicit player choice, and writes its Destiny Point award and keyed Prophet ledger in the **same** ActorEngine progression mutation plan. Actual vision content/new Destiny is **GM adjudicated**.
5. **Serenity** spends V2 full-round/swift actions; while tranced denies positive Dex contribution to Reflex (no double Pin/shield penalty). First eligible **following-round** attack/Use the Force check is a real Foundry evaluated d20 showing natural 20; no fake +20 modifier or standalone rolling engine.
6. **Temptation** costs a standard action, requires a GM-confirmed one-target LOS and Persuasion versus Will. A successful check alone never adds DSP/condition. On real spent FP target chooses **+1 DSP or one worse condition step**; on real spent DP **+2 DSP or two worse steps**. The choice is target-owned, keyed and persisted, and expires at Sith Lord's next turn.
7. A **provisional, later-rolled-back** attack FP spend must never trigger Temptation. RollCore's FP bonus-die path likewise defers its notification until the paid main check evaluates successfully. All resource pool mutations use ActorEngine authorities.
8. Actor-engine effect governance cannot be evaded by the retired species `system.activeEffects` fallback. Explicitly typed immunities are rechecked when an ActiveEffect is created.
9. Do not silently treat unit tests, source grep or green CI as an actual Foundry client/runtime acceptance.

## Verification work to finish before merge

**CI gate:** Every relevant PR's **exact-head rolling validation** must pass, not just provenance/vehicle jobs. Review failures separately, and ensure all descendants contain parent corrections. The rolling suite intentionally excludes five separately documented pre-existing Force-power-track failures; **do not call those five certified.**

**Foundry runtime gate (required):** With character and NPC test actors, verify class identities; UI controls; GM/player permissions; actual action economy; all Force Point spend paths (bonus die, direct spend, attack transaction, Force-point enhancement); transaction rollback; natural 20 chat cards and outcomes; round transitions; source actor's next turn; new combat; actor reload; target-owned consequence resolution; and both governed AE creation methods.

**Distributed event gate:** Foundry `Hooks.callAll` is **client-local**, and the Temptation spend receipt currently has no cross-client durable message bus. Explicitly test GM/player clients and inactive/unloaded targets; implement receipt transport or a reliable server-side / GM-run persistent delivery if any real spend fails to trigger the target choice. Do not infer resource spends from arbitrary manual pool edits.

**Identity + source gap:** Mind-Affecting gameplay may include direct Condition Track/flag updates that do not create ActiveEffects and do not traverse common suppression; maintain a source-mapped inventory rather than claiming blanket immunity. Other equipment/feat initiatives are outside this bounded Force-class feature pass.

**Release decision:** No live Foundry V13 execution harness and no multi-client integration environment were available to this GitHub-only reviewer. Until those gates are met, leave these PRs **draft/unmerged** and describe the work as **implemented for review**, not complete runtime certification.
