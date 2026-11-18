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
