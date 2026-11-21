# SWSE Force V2 — Checkpoint 03B: Per-Ability Force Point Contract Mapping Ledger (FP-RD-003)

**Status:** scaffold generated 2026-11-18. Every row is `DEFERRED_RULES_REVIEW` / not `MECHANIC_SPECIFIED` until its columns are filled from the printed source (source text is under `reference/sourcebooks/`). A row becomes automatable only when it has an entry in `ABILITY_OPTION_CONTRACTS` (`scripts/engine/force/force-points-service.js`) and a behavioral test. No ability is currently automated for players; GMs may adjudicate explicitly (recorded reason).

Columns to complete per ability: owned canonical source item; book + printed page (+ errata); trigger/event; action economy; selected target/item instance; once-per-use / per-round rules; round-cap exemption (only if printed); receipt finalization point; compensation on failed effect.

| Source ref | Call site | Owned source | Book/page | Trigger | Action economy | Target/instance | Use limits | Round-cap exemption | Finalize at | Compensation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `consular:applySkilledAdvisor` | `scripts/engine/talent/consular-talent-actions.js:377` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `consular:promptBattleMeditation` | `scripts/engine/talent/consular-talent-actions.js:745` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `consular:promptEntreatAid` | `scripts/engine/talent/consular-talent-actions.js:556` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `consular:promptExposingStrike` | `scripts/engine/talent/consular-talent-actions.js:841` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `consular:promptForceOfWill` | `scripts/engine/talent/consular-talent-actions.js:571` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `enhanced-rolls:_processEnhancements` | `scripts/combat/rolls/enhanced-rolls.js:1875` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:${title}` | `scripts/engine/talent/force-adept-talent-actions.js:238` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-executor-option:_spendForcePointForTalent` | `scripts/engine/force/force-executor.js:623` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-power:resolveNegateEnergy` | `scripts/engine/force/force-power-final-integration.js:85` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `guardian-spirit:manifest` | `scripts/engine/talent/guardian-spirit-actions.js:181` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `jedi-prestige:promptApprenticeBoon` | `scripts/engine/talent/jedi-prestige-talent-actions.js:296` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `jedi-prestige:promptForceRevive` | `scripts/engine/talent/jedi-prestige-talent-actions.js:245` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `jedi-prestige:promptShareTalent` | `scripts/engine/talent/jedi-prestige-talent-actions.js:326` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `jedi-prestige:promptUncloudedJudgement` | `scripts/engine/talent/jedi-prestige-talent-actions.js:427` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber-form:djem-so` | `scripts/engine/talent/lightsaber-form-engine.js:281` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber-form:promptJuyo` | `scripts/engine/talent/lightsaber-form-engine.js:311` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber:promptBlock` | `scripts/engine/talent/lightsaber-talent-actions.js:253` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber:promptDeflect` | `scripts/engine/talent/lightsaber-talent-actions.js:311` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber:promptForceFortification` | `scripts/engine/talent/lightsaber-talent-actions.js:460` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `lightsaber:promptImprovedLightsaberThrow` | `scripts/engine/talent/lightsaber-talent-actions.js:482` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `meta-resource-feat:applyTemporaryDefenseRule` | `scripts/engine/feats/meta-resource-feat-resolver.js:930` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `meta-resource-feat:resolveAttackRerollButton` | `scripts/engine/feats/meta-resource-feat-resolver.js:525` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `meta-resource-feat:resolveFullAttackRerollButton` | `scripts/engine/feats/meta-resource-feat-resolver.js:795` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sentinel:promptDarkRetaliation` | `scripts/engine/talent/sentinel-talent-actions.js:427` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sentinel:promptForceHaze` | `scripts/engine/talent/sentinel-talent-actions.js:346` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:${title}` | `scripts/engine/talent/sith-talent-actions.js:158` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:Force Power Adept` | `scripts/engine/talent/force-adept-talent-actions.js:395` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:Long Call` | `scripts/engine/talent/force-adept-talent-actions.js:453` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:Attune Weapon` | `scripts/engine/talent/force-adept-talent-actions.js:509` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:Empower Weapon` | `scripts/engine/talent/force-adept-talent-actions.js:524` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `force-adept:Unsettling Presence` | `scripts/engine/talent/force-adept-talent-actions.js:611` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Dark Healing` | `scripts/engine/talent/sith-talent-actions.js:363` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Dark Healing Field` | `scripts/engine/talent/sith-talent-actions.js:401` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Dark Side Master` | `scripts/engine/talent/sith-talent-actions.js:444` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Wicked Strike` | `scripts/engine/talent/sith-talent-actions.js:462` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Bonded Mount` | `scripts/engine/talent/sith-talent-actions.js:566` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Channel Aggression` | `scripts/engine/talent/sith-talent-actions.js:621` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Channel Anger` | `scripts/engine/talent/sith-talent-actions.js:634` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |
| `sith:Crippling Strike` | `scripts/engine/talent/sith-talent-actions.js:656` | | | | | | | | | | `DEFERRED_RULES_REVIEW` |

Note: `force-adept:<title>` and `sith:<title>` refs are built from the talent title at run time; one row per distinct title is required (see the `spendOneForcePoint(actor, '<title>')` call sites in those files).


## Batch 1 — lightsaber-talent-actions.js (2026-11-18)

Pattern (reusable): `ABILITY_OPTION_CONTRACTS[ref]` in `scripts/engine/force/ability-option-contracts.js` = { kind, itemType, slug, actionCost, priorSpendExempt, source }. `evaluateAbilityContract` re-checks, from live state at authorization time: owned enabled instance by canonical identity (`canonical-ability-identity.js`; name only for items with no canonical identity), the triggering attack event (attacker-side record), action timing, and one payment per (event, ability). The talent action pays at the last cancellable point (`payForcePoint`), runs the effect, then `settleForcePoint` finalizes at the applied boundary or compensates exactly.

| Ref | Source | Owned by | Trigger | Action | Round limit | Finalize at | Compensation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lightsaber:promptForceFortification` | Core Rulebook, Duelist tree | canonical `force-fortification` | verified critical hit (hit and critical) scored against the actor | reaction | check against PRIOR spends waived by the printed text; spend still recorded | after the talent card is published | exact receipt rollback if the card fails | `IMPLEMENTED`, `OFFLINE_TESTED` |
| `lightsaber:promptImprovedLightsaberThrow` | Force Unleashed Campaign Guide, New Duelist Talents | canonical `improved-lightsaber-throw` | none | standard action (own turn only) | counted (no printed exception) | after the card is published | exact rollback if the pull-back/card step throws | `IMPLEMENTED` with a gap: finalization is at card publication, NOT at an executed thrown-lightsaber area attack, because no canonical thrown-lightsaber area-attack path exists (Lightsaber Throw is itself card-only). Open item. |
| `lightsaber:promptBlock` (adjacent ally) | Core official errata p.41 (text not in the repo; relied on the 03B policy statement and Sheltering Stance, KOTOR p.?) | canonical `block` | verified pending melee attack on an adjacent ally (scene distance <= 1 square) | reaction | counted (default; no exception stated) | after the Use the Force check executes | exact rollback if the check never rolls | `IMPLEMENTED`, `OFFLINE_TESTED`; live scene-distance behavior unverified |
| `lightsaber:promptDeflect` (adjacent ally) | as above | canonical `deflect` | verified pending ranged attack on an adjacent ally | reaction | counted | as above | as above | as above |

Sheltering Stance: the Force Point is waived only when the actor owns canonical `sheltering-stance` AND the adjacent-ally attack is verified (the former checkbox no longer waives anything). Known limits: a rerolled critical hit supersedes its event, so Force Fortification is not offered after a reroll; the protect-adjacent flow uses the blocker's own consumed list (the ally may still answer separately).

## FREEZE (2026-11-18, owner direction): peripheral 03B consumer work stops here

Foundational 03B (shared authorization, ActorEngine receipts, round limit, rollback, death rescue, reaction events) stays. Further per-ability contracts are **paused**; the 35 uncertified rows in this ledger remain `DEFERRED_RULES_REVIEW` / uncertified and are resumed after 03C-03E, using the batch-1 pattern. Outstanding batch-1 items:
1. Improved Lightsaber Throw publishes a card without executing the area attack (no canonical thrown-lightsaber attack path).
2. Improved Lightsaber Throw checks own-turn eligibility but does not debit the standard action from the action-economy authority.
3. Stale UI text in `askUseTemporaryPoint` (said temporary points count toward the round limit) - **fixed** in the 03C opening commit.
4. Live Foundry v13 / two-client verification of every reaction path.

## Batches 2-4 — talent contracts (appended 2026-11-18; Batch 1 and the FREEZE note above preserved)

Evidence method: each contract's Force Point sentence (repository talent pack text) was matched against the repository OCR of the cited book with 9-word windows (`docs` evidence: matches listed). Core Rulebook OCR is partly damaged; where a window failed the text was read directly (Force Haze L3645, Djem So L20828, Juyo L20835 — Juyo's action word is dropped by the OCR; "swift" is taken from the pack text). Shared transaction: `scripts/engine/force/contracted-force-point.js` (`beginContractedForcePoint`/`settle`, `runContractedForcePoint`): debit the printed action (ActionEconomyConsumption), pay through ForcePointsService/ActorEngine (contract re-verified), finalize only after the effect applied, otherwise refund the exact Force Point and the action. Use limits are read from the actor's own receipts (`checkContractLimit`). Tests: `tests/force-v2-03b-talent-contracts.test.mjs`.

Payment status vs effect status are separate: **Payment certified** = ownership, trigger, timing, round limit, settlement verified (`IMPLEMENTED`, `OFFLINE_TESTED`). **Effect** = what the ability actually does in Foundry: *automated* (state/mechanics written), *assisted* (Active Effect / flag + card; the table applies the math), or *card*.

| Ref | Source (book, page) | Action | Trigger / limit | Effect | Status |
| --- | --- | --- | --- | --- | --- |
| `consular:applySkilledAdvisor` (FP option) | Core p.40 (9/9 windows) | full-round | — | assisted (skill bonus AE on ally) | payment certified |
| `consular:promptEntreatAid` | Legacy Era p.26 (25/25) | swift | once per round | assisted (pending aid flag) | payment certified |
| `consular:promptForceOfWill` | FUCG p.24 (27/27) | swift | — | assisted (Will insight AE flags; range not enforced) | payment certified |
| `consular:promptBattleMeditation` | Core p.40 (29/29) | full-round | — | assisted (attack insight AE flags) | payment certified |
| `consular:promptExposingStrike` | Clone Wars p.21 (22/22) | free | own verified lightsaber HIT this round on that target | assisted (flat-footed AE flag) | payment certified; "deal damage" approximated by a hit (FP-RD-015) |
| `sentinel:promptForceHaze` | Core p.41 (read directly) | standard | — | assisted (UTF roll + card) | payment certified |
| `lightsaber-form:djem-so` | Core p.218 (read directly) | reaction | verified melee HIT against you this round; once per round | card (the immediate attack is made by the player) | payment certified |
| `lightsaber-form:promptJuyo` | Core p.218 (read directly) | swift | once per encounter | assisted (designation flag; reroll is manual) | payment certified |
| `jedi-prestige:promptShareTalent` | JATM p.20 (31/31) | standard | once per day (world clock) | card | payment certified |
| `force-adept:Attune Weapon` | Core p.214 (3/3) | full-round | — | as existing code (weapon flag) | payment certified |
| `force-adept:Empower Weapon` | Core p.214 (3/3) | full-round | — | as existing code (weapon flag) | payment certified |
| `force-adept:Unsettling Presence` | FUCG p.43 (11/11) | standard | — | assisted | payment certified |
| `force-adept:Force Power Adept` | Core p.214 (10/17 + read) | part of the activation | — | as existing code (two checks, keep better) | payment certified |
| `force-adept:Long Call` | Unknown Regions p.30 (19/19) | part of the telepathy use | FP mode only | assisted | payment certified |
| `sith:Dark Healing` | Core p.223 (13/13) | standard | — | automated (attack vs Fort, damage, healing) | payment certified |
| `sith:Dark Side Master` | Core p.223 (17/17) | part of the reroll | — | automated (keeps better result) | payment certified |
| `sith:Wicked Strike` | Core p.224 (12/17) | free | own verified lightsaber CRITICAL this round on that target | automated (condition track -2) | payment certified |
| `sith:Crippling Strike` | Core p.213 (15/25) | free | own verified CRITICAL this round on that target | assisted (speed flag) | payment certified |
| `sith:Channel Anger` | Core p.213 (27/27) | swift | — | assisted (rage state flag) | payment certified |
| `sith:Bonded Mount` | JATM p.18 (26/26) | full-round | — | card | payment certified |
| `force-executor-option:Aversion` | Clone Wars p.53 (15/15) | swift | — | assisted (AE + flag) | payment certified |
| `force-executor-option:Illusion` | FUCG p.87 (15/15) | standard | — | automated (UTF vs Will roll) | payment certified |

Still uncertified (fail closed: explicit, attributable GM adjudication only), with the reason:

| Ref | Why |
| --- | --- |
| `sentinel:promptDarkRetaliation` | trigger "targeted by a [dark side] power" has no verified event producer |
| `jedi-prestige:promptForceRevive` | trigger "ally affected by your Battle Meditation reduced to 0 HP" has no verified event |
| `jedi-prestige:promptApprenticeBoon` | trigger "ally's Use the Force check" has no verified event |
| `jedi-prestige:promptUncloudedJudgement` | trigger "target of a mind-affecting power/talent" has no verified event |
| `sith:Channel Aggression` | trigger requires a verified flanked / Dex-denied target state |
| `sith:Dark Healing Field` | action cost not printed in the source text |
| `force-adept:Focused Force Talisman` / `Greater …` | needs the talisman's selected-power activation event; existing effect recovers ALL copies by name (printed: "regain that spent power") |
| `guardian-spirit:manifest`, `force-power:resolveNegateEnergy`, `enhanced-rolls:_processEnhancements`, `meta-resource-feat:*`, `reaction:*` | see Batch 5 notes below |
