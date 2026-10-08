# Phase 5D-E — Canonical single-attack special effect consumption

Branch `audit/weapon-phase-5d-e-special-effects`, stacked on `audit/weapon-phase-5d-d-range-resource-consumption`.

## 1. Scope and non-goals

The selected canonical attack form already supplies profile, proficiency (5D-A), selection/ability provenance (5D-B), damage (5D-C) and range/resource (5D-D). 5D-E makes the **structured special mechanics of that same form** take effect for a *single attack*, using the systems that already exist. The canonical resolver is the **rule selector**; existing engines are the **executors**. No second damage engine, effect engine, ledger or chat flow was added.

Out of scope (→ 5D-F): dual wield, double-weapon full attacks, Multiattack/Double/Triple Attack, Autofire/Burst convergence, multi-target attack shape / area resolution, configuration-change action economy, host-weapon double-weapon execution.

## 2. Corrected 5D-D baseline

5D-D head after the Darkstick/Static Pike data-defect correction: `4477323d4` (CI on PR #1009: **success**). Full suite at that SHA: 328 passed / 0 failed / 5 documented exclusions. That is the baseline this phase is measured against.

## 3. Special-mechanic census (all 203 identities)

`node tools/census-weapon-special-mechanics.mjs [--check]` → `data/audits/weapon-phase-5d-e-special-mechanic-census.json`. It executes the real runtime (`buildAttackForms` → `resolveCanonicalDamage` → `extractSpecialMechanics`) under the repo's Foundry shim, so it states what the live pipeline classifies. Deterministic, no timestamps; a test fails if the committed file is stale.

| | |
|---|---|
| identities | 203 (72 carry at least one mechanic) |
| offered forms (incl. payload forms) | 265 (96 carry at least one mechanic) |
| mechanics by policy | AUTO 58 · PROMPT 8 · DEFER 44 · VALIDATION_ONLY 20 · DISPLAY_ONLY 3 |
| unclassified | 0 |
| resolve errors | 0 |

## 4. Taxonomy (family → policy → timing)

Classification is by **schema structure** (field names / enumerated values), never by weapon name or description text. The single table is `FAMILIES` in `scripts/items/weapon-runtime/special-mechanics.js`; the census embeds it.

| family | policy | timing | count |
|---|---|---|---|
| damage-multiplier | AUTO | on-damage-roll | 2 |
| critical-die-replace | AUTO | on-critical | 2 |
| critical-bonus-damage | AUTO | on-critical | 1 |
| damage-rider | AUTO | on-damage-roll | 1 |
| native-stun | AUTO | on-attack | 16 |
| attack-resolution (Fortitude/Will defense) | AUTO | on-attack | 4 |
| dr-ignore | AUTO | on-damage-roll | 24 |
| attack-modifier-auto (target size) | AUTO | on-attack | 2 |
| ct-rider | AUTO | after-damage | 4 |
| ct-overwhelming-stun | AUTO | after-damage | 2 |
| attack-modifier-prompt | PROMPT | on-attack | 7 |
| dr-conditional | PROMPT | on-attack | 1 |
| ct-rider-prompt | PROMPT | after-damage | 0 (fallback for CT riders with a non-standard trigger) |
| grab-grapple | DEFER | on-hit | 12 |
| payload-effect | DEFER | on-hit | 8 |
| defensive-interaction | DEFER | continuous | 5 |
| special-action (Pin/Trip/Venom Spit) | DEFER | on-attack | 4 |
| status-condition (prone/disabled/…) | DEFER | after-damage | 4 |
| prepared-attack | DEFER | on-attack | 4 |
| persistent-effect | DEFER | turn-start | 2 |
| multi-attack-interaction | DEFER | on-attack | 2 |
| return-recovery | DEFER | on-attack | 2 |
| activation-effect | DEFER | on-attack | 1 |
| firing-constraint | VALIDATION_ONLY | on-attack | 20 |
| display-note | DISPLAY_ONLY | continuous | 3 |

Nothing executable was labeled DISPLAY_ONLY for lack of a consumer: the three DISPLAY_ONLY entries are printed notes with no structured mechanic (two payload notes, one "shot origin is concealed" statement).

## 5. AUTO / PROMPT / DEFER decisions

* **AUTO** — fully structured and observable; executed through an existing system (sections 7–13).
* **PROMPT** — executable once someone supplies a fact the runtime cannot observe (e.g. "wielder Strength below 15", "target is an unattended object"). One yes/no question, answer stored (section 6), never re-asked. With no answer the mechanic is **surfaced as unresolved and not applied** (never guessed).
* **DEFER** — needs a subsystem owned by a later phase (grapple state machine, multi-target area, turn-start persistence, multi-attack, prone/disabled setters). The form still resolves; the mechanic is recorded and shown in the census; nothing is fabricated.
* **VALIDATION_ONLY** — `firingConstraints` (20). Recorded and classified; **not yet enforced** — enforcement belongs with the multi-attack rules in 5D-F (they constrain Double/Triple/Rapid Shot).

## 6. Architecture and persistence

```
rollAttack ── prepareCanonicalSpecialMechanics ──► resolveCanonicalDamage(...).mechanics  (pure, special-mechanics.js)
   │  attack-stage: conditional attack modifiers → existing situationalContributions → resolveAttackStageModifiers
   │  defense: alternateDefenseOf(mechanics) → existing resolveTargetContext/targetContext.defenseType
   │  after the roll: evaluateAttackOutcomeSpecials → workflowContext.special { mechanics, answers, unresolved,
   │                                                                        records[], attackTotal, drInteraction }
   ▼
chat card (data-workflow-context, serializer round-trips `special`)
   ▼
rollDamage ── resolveCanonicalDamage ► composition (multiplier / critical effects) ► main card
   │            └─ damage riders ► separate damage card (own dice, own type)
   ▼
Apply Damage (chat-interaction-bridge) ── DamagePacket (components tagged `bypass-dr`) ── DamageSystem.applyPacketToActor
   └─ applyCanonicalSpecialEffects ► CombatTargetEffectAdapter ► ActorEngine.setConditionStep   (receipt per message+target)
```

* `workflowContext.special` is whitelisted JSON (`summarizeSpecial` in `combat-context-serializer.js`) and survives Attack → Chat Card → Damage → Apply Damage.
* PROMPT answers: attack-stage answers live in `special.answers`; Apply-time answers are stored in the damage message flag `swse.specialAnswers`. Either way an answer is looked up before any question is asked.
* The live prompt provider is a single `DialogV2.confirm` registered in `init-hooks.js`; tests inject their own. No provider → unanswered → surfaced.
* Executed-once guarantee for CT effects: message flag `swse.specialEffectReceipts`, key `recordId:targetId` (parallel to the existing damage receipt).

## 7. Damage multipliers

`damageMultiplier` ≠ 1 (Light Concussion Missile ×2, Proton Torpedo single-target ×2) is consumed **inside `resolveDamageComposition`/`buildDamageFormula`**: it wraps the weapon dice (steps and extra weapon dice included): `(4d10) * 2 + ability + …`. The payload-resolved value *replaces* the profile value (`payload ?? profile`, already how the resolver reports it), so it is never applied twice. The critical multiplier then multiplies the whole formula as before (`((4d10)*2 + …) * 2`).

Assumption to confirm: the printed "6d10x2" notation is read as "×2 applies to the weapon's dice, bonuses are added after". The multiplier ordering with a critical (both multiply) is also an assumption; no source rule found in the repo contradicts it. Flagged in section 16.

## 8. Damage riders

A profile-owned `damageComponents` entry beyond the primary component (Neuronic Whip `slashing-rider` 1d4) is a **separate damage event**: rolled from its own dice only (no ability/half-level/critical), typed by its canonical component, posted as its own damage card (`flags.swse.damageRider`) that flows through the unchanged Apply Damage → DamagePacket path with its own receipt. A stun main card does not make the rider stun. AND damage types (Bowcaster energy AND piercing) remain **one** component/one event — no rider.

Resolver fix: in stun mode with an explicit stun definition the profile's `stun` component duplicated the primary stun component; it is now skipped so the stun dice are rolled once.

## 9. Condition-track riders and stun special rules

* `move-target-condition-track` effects with a recognised trigger (`successful-hit`; `damage-dealt-and-attack-roll-equals-or-exceeds-defense`; `attack-roll-equals-or-exceeds-both-defenses`) are evaluated at attack time against the attack total and the target's defenses, stored as records, and executed at Apply Damage through `CombatTargetEffectAdapter.applyFromAttackResult` → `ActorEngine.setConditionStep` (plus `setConditionPersistent` when the effect is persistent). "Damage dealt" is verified from the target's actual HP loss.
* Undeterminable (no attack total / no readable defense): PROMPT once at Apply Damage.
* **Shock Stick** (`operation.overwhelmingStunRule`): stun damage (pre-halving, i.e. the card's raw amount) ≥ the target's current HP → five condition-track steps through the same adapter; the existing cap clamps.
* **Native stun** (`stun.capability = native-stun`, 16 forms): the effective damage mode is `stun` (normal does not exist). Before this, forms such as Stun Pistol/Deck Sweeper/Sonic Stunner/Neuronic Whip/Shock Stick resolved to *no damage* or normal energy damage unless the mode was set by hand.

## 10. Payload effects

Flash (blinded 1d4 rounds, area), stun gas (no damage and no structured effect) and nerve toxin (`conditionTrackSteps -2` after a secondary Fortitude attack) are area / secondary-attack / status effects with no single existing executor → **DEFER**. Their data persists with the selected payload (`specialEffects`), the forms stay refused for ordinary damage (nothing fabricated), and the incomplete ones are listed as completeness issues.

## 11. Alternate defense

`attackResolution.defense` of `fortitude`/`will` (Concussion Rifle, Gas Grenade, Radiation Grenade, Squib Tensor Rifle) now selects the defense the attack roll is compared to, through the existing target-defense authority (`targetContext.defenseType` → `resolveTargetContext`). Reflex remains the default; an explicit `targetContext` still wins. Previously these forms were silently compared to Reflex.

## 12. Damage reduction interaction

The weapon's structured `damageReductionInteraction.mode = ignore` (24 forms: lightsaber family) is carried as `special.drInteraction` and tags every damage component `bypass-dr` in `buildDamageComponents`. The **existing** `DamageReductionResolver.componentBypassesDamageReduction` already honors that tag; nothing bypasses `DamagePacket`/mitigation. This replaces reliance on the weapon *name* (`isLightsaberish`) for canonical weapons: a renamed canonical lightsaber still ignores DR. Shield Rating is a separate mitigation stage and is unaffected (the canonical exception text says so). `mode = conditional` (one weapon: "target is an unattended object") is a PROMPT.

## 13. Conditional attack modifiers

Attack-roll modifiers with a structured target-size condition are **AUTO** from the target actor's `system.size` and injected through the existing typed `situationalContributions` pipeline (-10 vs smaller than Huge for the two missile profiles). Modifiers whose condition is free text or a non-observable object (mounted, Strength threshold) are **PROMPT**. Modifiers about Double/Triple Attack/Rapid Shot, Block/Deflect checks or the wielder's defenses are **DEFER**.

## 14. Special actions (Pin, Trip, Venom Spit)

Amphistaff Pin/Trip/Venom Spit have no ordinary damage and replace the attack. They remain **refused** by the 5D-C no-ordinary-damage guard (nothing rolled, no substitute damage), and their mechanics are classified `special-action` / DEFER. Wiring them to the grapple/trip systems needs their multi-step workflows (5D-F or later).

## 15. Timing model

Every family carries one explicit timing from: `on-attack`, `on-hit`, `on-miss`, `on-damage-roll`, `on-critical`, `after-damage`, `after-mitigation`, `turn-start`, `turn-end`, `continuous`. Implemented in 5D-E: on-attack, on-damage-roll, on-critical, after-damage (at Apply Damage). `on-miss`, `after-mitigation` (beyond the DR tag), `turn-start`/`turn-end` are defined in the vocabulary and used only by DEFER families.

## 16. Tests

`tests/weapon-phase-5d-e-special-effects.test.mjs` (14 checks) covers: profile mechanics resolved; sibling profile does not inherit; payload effects persist and are not turned into damage; critical effects only on a critical; multiplier via composition and with a critical; rider separate / AND types one event; native stun; on-hit CT rider (hit only), alternate defense, execution once through the existing CT infrastructure, damage-dealt and overwhelming-stun gates; DR bypass reaching the packet components and the existing resolver; unsupported special action fail-closed; PROMPT answers stored and not re-asked (attack and Apply time) and unresolved mechanics surfaced; automatic target-size modifier without a prompt; legacy and stock droid/NPC flat contracts unchanged; corrected Darkstick/Static Pike thrown forms still available and ranged; census current and complete.

Required regression suites remain green (5D-A 14, 5D-B 14, 5D-C 10, 5D-D 21, thrown correction 8, runtime/registry/negative/consumption-map, full suite).

## 17. DATA_DEFECT / completeness findings

None of these were "fixed" in data; each is recorded.

1. **Darkstick return-to-hand** — only the threshold (`returnOnAttackExceedsReflexBy: 5`) is structured; the effect/action is not. Recorded as a completeness issue (DEFER). Not invented, does not block the attack.
2. **Forms with neither damage nor structured effect** (refused, nothing invented): Adhesive Grenade, Ascension Gun / Heavy Variable Blaster ascension form, Net, Smoke Grenade, Targeting Laser, Wrist Rocket Launcher stun-gas payload.
3. **Multiplier semantics** (section 7) — "×N applies to weapon dice" and multiplier × critical both multiplying are inferred, not source-confirmed.
4. **Rider and critical hits** — whether a separately-rolled rider (Neuronic Whip) is multiplied on a critical is not stated; it is not multiplied.
5. Native-stun stunning-gauntlet unarmed form still resolves damage via the unarmed Item compatibility base (5D-C `deferred: damage-mode:inherited`), unchanged.

## 18. Deferred (not done in 5D-E)

Grab/grapple/net/snare effects (12), payload effects (8), defensive interactions (5), prone/disabled status setters (4), prepared attacks/bracing (4), persistent/recurring effects incl. Garrote/Electronet/Tehkla bleeding (2+), multi-attack interactions (2), return/recovery (2), special actions (4), activation effects (1, Sith Sword), firing-constraint **enforcement** (20), area/`onMiss` half-damage resolution, `ignoredDefenseComponents` (Targeting Laser).

## 19. Validation

Run on the final tree: all focused tests above; `node tools/census-weapon-special-mechanics.mjs --check`; canonical/production/registry builder `--check`s; `verify-canonical-production`; `validate-partials`; `validate-data`; `system.json` JSON parse; `node --check` of every changed JS; rolling runner **329 passed / 0 failed / 5 documented exclusions** (new baseline 329 = 328 + the 5D-E test).

## 20. Intentionally not changed

Canonical weapon data and production packs (no data edits); actor data shape; multi-attack/autofire; area resolution; the old Action Palette / standalone UIs; ammunition spending (still only `AmmoSystem.spendForWorkflow`).

## 21. Foundry smoke checklist — **NOT RUN** (no Foundry runtime in this environment)

1. Attack with a Concussion Rifle at a target whose Fortitude > Reflex: card shows Fortitude comparison; hit/miss follows it.
2. Squib Tensor Rifle hit → Apply Damage → target moves one condition-track step once; second click does not repeat it.
3. Light Concussion Missile vs Medium target: -10 shown in the attack breakdown; vs Huge target: not applied; damage formula shows `(4d10) * 2`.
4. Neuronic Whip: two cards (stun 2d8, slashing 1d4); applying both gives stun to the stun track and slashing to HP.
5. Shock Stick stun damage ≥ target HP → target drops to unconscious on the condition track.
6. Renamed canonical lightsaber vs a DR 10 target: damage not reduced.
7. Arggarok with Str < 15: one dialog; the next attack from the same card does not ask again.
8. Closing the dialog leaves the modifier unapplied and a GM-adjudication warning appears.
9. Amphistaff Pin / Trip / Venom Spit still show "no ordinary damage" and roll nothing.
10. Legacy homebrew weapon attack/damage unchanged.

## 22. Proposed 5D-F

Multi-attack convergence on the selected form: Double/Triple Attack, Rapid Shot/Strike, Autofire/Burst, dual wield and double-weapon full attacks, enforcement of `firingConstraints`, per-attack resource/sequence-penalty accounting for forms with mode-specific costs, and the host-weapon double-weapon execution that 5D-C/D deferred. After that: area/multi-target attack shape (half damage on miss, payload effects, grab/net/snare via the grapple system) and persistent turn-start effects.
