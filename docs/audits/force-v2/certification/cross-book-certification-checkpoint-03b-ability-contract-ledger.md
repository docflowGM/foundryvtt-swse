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
