# Phase 5D-F — Canonical multi-attack / fire-mode convergence

Branch `audit/weapon-phase-5d-f-multiattack-convergence`, stacked on `audit/weapon-phase-5d-e-special-effects` (PR #1010).

## 1. Corrected 5D-E baseline

* 5D-E head after the multiplier/critical correction: `8a195b67d` (PR #1010).
* Rolling suite at that SHA: **330 passed / 0 failed / 5 documented exclusions**.
* 5D-F result: **331 passed / 0 failed / 5 documented exclusions** (330 + the 5D-F test file).

The correction (Core Rulebook: weapon damage × multiplier; Legacy Era Campaign Guide: extra weapon damage before the multiplier; a critical doubles everything including multiplied weapons; the Neuronic Whip rider is doubled on a critical) is exercised again here (check "corrected 5D-E multiplier staging and critical stacking still hold").

## 2. Existing multi-attack architecture (investigation)

No new engine was added. The paths found and what each now consumes:

| path | role | before | now |
|---|---|---|---|
| `scripts/combat/multi-attack.js` `buildFullAttackSequence` | **the** penalty/plan authority (Normal, Double, Triple, Two-Weapon, Double-Weapon) | weapon group from name/`proficiency`/`subcategory`/range text; double weapon from name list/`properties`; proficiency from `system.proficient`; Double/Triple from feat-name group set | canonical-first for all of those (selected form's structured group/identity, profile/host double weapon, real proficiency); every plan entry now carries `form`, `fireMode`, `attackIndex`, `handRole`, `endId` |
| `calculateFullAttackConfig` (dialog config) | second planner | group sets | same canonical join (`actorHasMultiAttackFor`) |
| `engine/combat/combined-full-attack-planner.js` | Double/Triple × dual-wield combos | group sets | same canonical join |
| `engine/combat/dual-wield-combat-shape-resolver.js` | dual-wield/double-weapon penalty shape | text heuristics, `system.proficient`, reads a fake **Two-Weapon Fighting** feat (−8) | canonical double weapon, canonical proficiency, off-hand by structural eligibility, fake feat removed (−10 base) |
| `engine/combat/full-attack-executor.js` | rolls the plan | rolled `attack.weapon` with the Item's default profile; ammo aggregate from a form-blind cost | rolls each attack with ITS OWN form selection; costs each attack from its own form; asks host-config conditions once; per-attack context |
| `engine/combat/features/combat-feature-handlers.js` `executeCombatFeatureMultiattack` | second executor (per-attack dialogs) | default profile | seeds each roll from the planned form (a dialog selection wins) |
| `combat/rolls/enhanced-rolls.js` `rollAutofire` | independent Autofire/Burst path (deferred in 5D-C/D) | `system.properties`, `computeAttackBonus`, `system.ammunition` + fixed 10/5, virtual weapon with rewritten dice | canonical form, composition, units and damage (section 7) |
| `engine/combat/combat-option-resolver.js` + `weapon-target-gate-classifiers.js` | Rapid Shot/Strike/Burst option gating | text/Item based | structured shape gates (sections 5–6) |

## 3. Canonical capability model

`scripts/items/weapon-runtime/attack-shape.js` (pure; selected form only; never a name or Item projection):

* **fireModes**: `single`, `autofire` (profile `rateOfFire` contains `A`, or an autofire mode), `autofireOnly` (`firingConstraints.autofireOnly`, or a rate of fire that lists `A` without `S`), `burstEligible` (= autofire).
* **multiShot**: `prohibited` (`firingConstraints.prohibitsMultiShotAbilities`), `maxShotsPerRound`, `prohibitedAbilities` (declared `PROHIBITED` ability relations), alternating-round/reload flags (recorded).
* **doubleWeapon**: `profile` (the selected configuration's profiles carry the `doubleWeapon` quality: native double weapons, Amphistaff quarterstaff) or `host-configuration` (a valid host augmentation); `pending` when its conditions are unanswered.
* **dualWield**: `eligibleAsSecondWeapon`, `handsRemainFree`, `wornNotHeld` (from the weapon `operation`).
* **groupKey / exoticIdentity**: the structured proficiency family and exotic identity a feat choice joins to.

`resolveAttackShapeFor` / `shapeOfWeapon` (attack-consumer) are the safe entry points; legacy weapons return `{source:'legacy'}` and keep every legacy path.

## 4. Ability + weapon selector joins

* Weapon side: canonical selected-form structure only (group, exotic identity, capabilities).
* Ability side: the feat's own choice — `selectedChoice` (object/array/string), the actor-level repeatable choice store (`flags.swse.choices.double_attack_weapon`), or the legacy feat-name parenthetical (the old carrier of the same choice).
* Join (`featChoiceMatchesShape`): exotic **identity** equality, or proficiency **group** equality. A bare "exotic" token never matches (exotic weapons are chosen individually). Feat identity is the canonical feat identity (`…::double-attack`) or the base name.
* No feat rule was put in the weapon registry and no weapon list in a feat.

## 5. Rapid Shot / Rapid Strike

* Offered iff the actor owns the ability **and** the selected form qualifies (attack type from the selected profile's branch, structured prohibitions).
* Rapid Shot/Burst Fire carry `expendsMultipleShots`; `CombatOptionResolver` removes them when the form has `prohibitsMultiShotAbilities` or a declared `PROHIBITED` relation (Light Concussion Missile, Flechette Launcher, Black Powder Pistol, Disruptor, … — structure, not names).
* `rollAttack` refuses a forced Rapid Shot/Burst Fire on such a form **before** any cost (`ATTACK_SHAPE_ILLEGAL`).
* Rapid Strike: gated by the selected melee branch (the Lanvarok disc profile is ranged → not offered); −2 attack and +1 weapon die come from the existing option on that profile.
* Weapon-declared multi-attack modifiers are consumed at attack time from the **active** shape (previously DEFER in 5D-E): Heavy Slugthrower Pistol −1 with Double/Triple Attack/Rapid Shot, Power Hammer −2 with Double/Triple Attack/Rapid Strike, Zhaboka/Shyarn remove the Rapid Strike penalty.

## 6. Double / Triple Attack, Autofire, Burst Fire

* **Double/Triple**: legal only with the exact canonical feat choice matching the selected form (group or identity), Triple additionally needs Double for the same selector, and the form's firing constraints must allow N shots in one sequence (`sequenceConstraintViolation`: prohibits multi-shot, `maxShotsPerRound`). Each attack of the sequence carries the same selected form.
* **Autofire** (`rollAutofire`): selects the canonical form (the unique autofire-capable form when none is chosen; refused when none) and consumes — attack composition via `computeFinalAttackComposition` (proficiency of the form, canonical range band penalty, typed modifiers; the autofire −5 / braced −2 counted once), canonical autofire units (`resourceConsumption.autofireUnits`, e.g. 10; legacy 10 fallback), canonical damage through `rollDamage` with the form record. Existing area-attack math (targets, half damage, Evasion) is untouched.
* **Burst Fire**: offered only when the form can autofire **and** the actor has the feat; forced on a non-autofire form it is refused before any spend. Its −5 comes from the option once; its +2 weapon dice come through the one damage composition (the virtual-weapon rewrite is retired for canonical weapons).
* **Autofire-only forms** (section 12) refuse a normal single attack.

## 7. Dual wield and Sith Lanvarok

* Dual-wield penalty: −10 base; Dual Weapon Mastery I/II/III → −5/−2/0 **only when proficient** with both forms (canonical, actor-dependent proficiency of the selected form instead of `system.proficient`).
* The removed fake **Two-Weapon Fighting** feat is no longer read anywhere in the resolver (it previously yielded −8).
* **Sith Lanvarok** (`eligibleAsSecondWeaponForTwoWeaponFighting`, `handsRemainFree`, `wornNotHeld`): when no off-hand is designated, a structurally eligible equipped weapon is the off-hand (planner and resolver); no feat, no name.

## 8. Double weapons, Vibrobayonet host configuration, Amphistaff

* Native double weapons (profile quality, e.g. double-bladed lightsaber, quarterstaff): both ends resolve as their own profiles (`end1`/`end2`), each plan entry carries its profile.
* **Vibrobayonet + rifle**: a double weapon **only** in the valid host configuration (`mounted-on-rifle` and the host stock not folded). The "stock folded" condition is a stored PROMPT answer (asked once per sequence; unanswered ⇒ not a double weapon). Ends resolve as their own definitions: end A = Vibrobayonet primary, end B = `Club/Baton` primary, via a new form key `endId` (+ `hostIdentityKey`) that survives the workflow context. Detached = Vibrodagger, not the mounted double weapon; a rifle alone is never a double weapon.
* **Amphistaff**: only the quarterstaff configuration exposes two ends (`quarterstaff-end1/2`); spear and whip configurations are single-ended. Pin/Trip/Venom Spit remain deferred (special-action family).

## 9. Resource preflight and spending

* `_aggregateFullAttackAmmo` costs each attack from its own canonical form (Variable Blaster mode ×5 per attack, melee ends of a host weapon free, each dual-wield weapon against its own pool) and aggregates per weapon; the executor preflights the **whole** sequence before spending action economy or ammunition. An unresolvable end/form refuses the entire sequence before anything is spent.
* Spending itself is unchanged (`AmmoSystem.spendForWorkflow` inside each `rollAttack`, rolled back by the executor if a later attack fails).

## 10. Workflow context per attack

Every attack's chat/workflow context carries `weaponForm` (incl. `endId`, `hostIdentityKey`), stored `special.answers`, and a new `attackShape` record (`fireMode`, `attackIndex`, `sequenceLength`, `sequenceId`, `packageType`, `handRole`, `endId`). Damage clicked from attack #2 resolves attack #2's form (test: Vibrobayonet end vs club end → 2d6 vs 1d6).

## 11. Firing constraints

| constraint | enforcement |
|---|---|
| `prohibitsMultiShotAbilities` | Rapid Shot/Burst Fire removed + refused; Double/Triple Attack refused (planner) |
| declared `PROHIBITED` ability relation | same |
| `maxShotsPerRound` | refuses a same-weapon multi-attack sequence longer than the limit |
| `autofireOnly` / rate of fire `[A]` | a normal single attack is refused; Burst Fire needs autofire |
| `firesOnAlternatingRounds`, `cooldownRounds`, `reloadRequiredAfterEachShot`, `preparedAttack` | **recorded, not enforced** — they need per-round state (see 14) |

## 12. DATA_DEFECT / consumer-defect findings

1. **Consumer defect, fixed**: `rollAutofire` referenced an undefined `attackRerollOptions`, so every Autofire/Burst Fire threw a ReferenceError after ammunition was consumed and damage cards posted ("Autofire roll failed"). It is now built as `rollAttack` does.
2. **Consumer defect, fixed**: damage-time option gating (Burst Fire/Deadeye dice) used the Item projection's attack type; it now uses the selected canonical form's branch.
3. **Fake feat dependency removed** (Two-Weapon Fighting −8).
4. **Autofire-only forms enforced from `rateOfFire`**: `weapon-e-web-repeating-blaster`, `weapon-heavy-assault-blaster`, `weapon-heavy-repeating-blaster`, `weapon-light-repeating-blaster`, `weapon-repeating-blaster-carbine`, `weapon-rotary-blaster-cannon/autofire`, `weapon-subrepeating-blaster`. If any of these should also fire single shots, the canonical `rateOfFire` is the field to correct — Heavy Assault Blaster is the one to verify against its source.
5. Weapon Specialization/Weapon Focus are still matched by the legacy scoped-feat resolver (feat name + choice string vs weapon name/group text), not canonical selectors (stage is correct, identity matching is not).
6. `abilityInteractions` relations not consumed: `TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT` (Sidearm Blaster Pistol); `rangeTreatedAs: Pistol` (Sith Lanvarok) has no consumer (group stays exotic).
7. The host rifle is not an owned-item relationship: the valid-configuration check relies on the configuration and the stored "stock folded" answer, not on a linked rifle item.

## 13. Legacy behavior

Legacy/homebrew weapons keep every existing path (group-name Double/Triple Attack, property double weapons, `calculateFullAttackConfig`, `computeAttackBonus` autofire, virtual-weapon Burst Fire). Stock droid/NPC flat contracts are untouched (no canonical multiplier/shape applied on a flat contract).

Remaining legacy reads inside these paths (all guarded to non-canonical weapons): `getWeaponGroup` name/proficiency/subcategory/range heuristics, `isDoubleWeapon` name list/`properties`, `system.proficient`, `isOffhand`/`slot` equip flags, `weaponText` size/quality heuristics in the dual-wield resolver, feat/talent **names** (ability identity) for Multiattack Proficiency.

## 14. Tests

`tests/weapon-phase-5d-f-multiattack-convergence.test.mjs` — 16 check groups: single attack unchanged; Rapid Shot ability+capability and structured prohibition (before spend); Rapid Strike selected profile; Double/Triple exact choice join (group, exotic identity, wrong choice, firing constraints); Autofire form/range/damage/units; real `rollAutofire` end to end (canonical, Burst, refusal, legacy); Burst Fire both gates and autofire-only; weapon-declared multi-attack modifiers; dual wield + DWM + proficiency gate + no fake feat + Sith Lanvarok; native/host/detached/folded double weapons; Amphistaff configurations; resource preflight (partial spending prevented); per-attack workflow context and per-attack damage; corrected 5D-E multiplier/critical; stock droid; legacy multi-attack.

Regression suites green: 5D-A 14, 5D-B 14, 5D-C 10, 5D-D 21, thrown correction 8, 5D-E 14 + 10, runtime/registry/negative/consumption-map, phase 2/4 delegation and sequence-identity guards.

## 15. Validation

`node --input-type=module --check` on every changed module; census `--check`; canonical/production/registry builder `--check`s; `verify-canonical-production`; `validate-partials`; `validate-data`; `system.json` parse; full rolling runner **331 passed / 0 failed / 5 documented exclusions**.

## 16. Intentionally not done / deferred

* Per-round firing state: `firesOnAlternatingRounds`, `cooldownRounds`, reload-after-each-shot, prepared attacks/bracing (needs round/economy state).
* Grapple/net/snare, Pin/Trip, poison/disease, payload status effects, automatic token-distance range selection, broad configuration-switching action economy (all explicitly out of scope).
* The legacy `rollAutofire` still posts its own summary card (one per attack roll, one attack roll for all targets); it does not create a per-target attackShape context.
* Multiattack Proficiency / Weapon Specialization identity matching on canonical selectors.

## 17. Foundry smoke checklist — **NOT RUN**

1. Full Attack dialog with Double Attack (Pistols) on a renamed canonical pistol: offered; on a rifle: not offered.
2. Light Concussion Missile / Flechette Launcher: Rapid Shot not in the attack dialog.
3. Arc blaster Autofire and Burst Fire: summary card posts, 10/5 shots consumed once, no "Autofire roll failed".
4. Vibrobayonet mounted: Double-Weapon package asks "host rifle stock folded?" once, rolls vibrobayonet then club end; damage buttons differ.
5. Amphistaff in whip configuration: no Double-Weapon package.
6. Sith Lanvarok worn with a held rifle: Two-Weapon package offers the Lanvarok as the off-hand.

## 18. Recommended next phase (5D-G)

Per-round firing state (alternating-round/cooldown/reload/prepared-attack constraints through the existing action-economy/round tracker), canonical selector identity for the remaining name-matched feats (Weapon Specialization/Focus, Multiattack Proficiency), grapple/net/snare and Pin/Trip on the existing grapple system, payload status effects, and the area/multi-target attack shape (autofire area, `onMiss` half damage) as one attack-shape pass.
