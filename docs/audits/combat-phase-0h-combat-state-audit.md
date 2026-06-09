# Combat Phase 0H - Combat State Audit

Audit only. No runtime files were changed.

## Scope

This pass audits combat states that should be stored, displayed, applied to rolls/defenses, and expired at the correct time. It focuses on:

- Aim
- Brace
- Prone
- Cover and improved cover
- Fight Defensively
- Full Defense / Total Defense
- Charge
- Flat-Footed
- Helpless
- Grabbed, Grappled, and Pinned
- Stunned and Unconscious
- Recover action
- Second Wind
- Condition Track penalties
- Current Conditions and Effects visibility
- Action economy state that gates these modes

This audit does not fix any behavior. It identifies storage authority, live routing risk, and rules-fidelity seams.

## Executive finding

Combat state is currently split across too many authorities. The repo has useful pieces, but no single combat-state authority owns the full lifecycle for declaration, action cost, math application, display, and expiration.

Current authorities found:

- `actor.flags.foundryvtt-swse.combatStatus` through `scripts/combat/combat-status.js`
- Active Effects through `scripts/combat/active-effects-manager.js`
- Condition Track fields under `actor.system.conditionTrack`
- actor action fields under `actor.system.actionEconomy` and `actor.system.actions`
- v2 action economy flags through `scripts/engine/combat/action/action-economy-persistence.js`
- combatant resource checks such as `combatant.resources.swift`
- roll-dialog-only situational flags from `scripts/rolls/roll-config.js`
- legacy/parallel UI components such as `scripts/components/combat-action-bar.js` and `scripts/components/condition-track.js`

The biggest risk is not that combat states are missing. The biggest risk is that the same state can be represented in multiple incompatible ways, and each path applies a different subset of the rules.

## Highest priority findings

### 1. Action economy math is a foundational seam

`ActionEngine` is intended to be the pure v2 authority for action economy. However, its current degradation logic appears reversed against the supplied SWSE action rules.

The supplied action rule baseline says:

- Standard can be exchanged downward into Move or Swift.
- Move can be exchanged downward into Swift.
- Swift cannot be exchanged upward.
- Full-Round action sacrifices Standard, Move, and Swift.

Current code in `scripts/engine/combat/action/action-engine-v2.js` appears to do the reverse in several places:

- `payStandard()` can consume Move or Swift when Standard is unavailable.
- `payMove()` can consume Swift when Move is unavailable.
- Full-Round comments and logic consume Standard + Move while leaving Swift available.

This affects every combat state that spends actions: Fight Defensively, Full Defense, Aim, Brace, Recover, Second Wind, Charge, reload, and future attack modes.

Classification: high severity, automate, prerequisite for implementation phases.

### 2. Fight Defensively and Full Defense have multiple authorities

Evidence:

- `CombatStatusResolver` has flag-based `defensiveMode` values and applies +2/+5 Reflex bonuses.
- `SWSEActiveEffectsManager` creates Active Effects for `fighting-defensively` and `total-defense`.
- Active Effects adjust bonuses dynamically for trained Acrobatics: +5 Fight Defensively and +10 Total Defense.
- Roll config has its own Fight Defensively UI path and explains RAW vs houserule modes.
- Combat action bar has another toggle path that spends its own action source.

Rules problem:

- RAW Fight Defensively is a Standard Action: -5 attack, +2 Reflex until start of next turn.
- RAW Total Defense is no attacks until next turn, +5 Reflex.
- If trained in Acrobatics, those become +5 and +10.
- A houserule can allow Move or Swift cost, but that needs to be explicit and setting-gated.

Current seam:

- The flag resolver does not check Acrobatics and always gives +2/+5.
- The Active Effect path does check Acrobatics and can give +5/+10.
- It is unclear which one is live in the redesigned combat tab.
- Attack locking for Full Defense is available in `CombatStatusResolver.getAttackAdjustment()`, but the canonical attack path does not clearly use that resolver end-to-end.

Classification: high severity, automate with houserule-aware action cost.

### 3. Combat Status panel controls may not be live in the concept combat tab

`templates/actors/character/v2/partials/combat-status-panel.hbs` exposes controls for cover, defensive mode, prone, broadcast status, and safe zone declaration.

However, a search of the current snapshot found the relevant `data-action` values mostly only in the template, not in sheet event handlers. The active concept combat tab also does not include this partial directly in the inspected snapshot.

Current seam:

- The desired declared-state model exists in code.
- The UI controls may not be wired to mutate that model.
- The concept combat tab may be showing a compact status strip instead of the actual controls.

Classification: medium-high severity, routing/display seam.

### 4. Aim, Charge, and Brace are not durable combat states yet

Aim and Charge appear mainly as roll-dialog situational options. `scripts/rolls/roll-config.js` returns:

- `situational.aiming`
- `situational.charging`

Prior audits found resolver logic often expects context names like `aim` and `charge`. That creates a context mismatch.

Charge should be a Standard Action attack/movement context with a defense consequence and charge-gated feat/talent context. The legacy combat action bar creates a custom Charging ActiveEffect and spends Full-Round, which conflicts with the current baseline that Charge is a Standard Action.

Brace is needed for autofire-only weapons and should consume two Swift Actions immediately before the qualifying attack. I did not find a durable brace state with correct action economy, expiration, and autofire-only gating in the state layer.

Classification: high severity for Charge/Brace, medium-high for Aim.

### 5. Recover action counts progress but does not clearly spend canonical swift actions

`ActorEngine.recoverConditionStep()` has a strong calculation skeleton. It tracks three spent Recover actions across same or consecutive rounds with `flags.foundryvtt-swse.conditionRecoverProgress`, and it blocks persistent conditions.

However, the function itself does not spend canonical v2 swift actions. Other UI paths may call it directly.

Current seam:

- Recover progress can increment without proving the actor actually spent a Swift Action in the same canonical action economy state.
- Other condition track components use `actor.system.actions?.swift?.available` or actor methods, not the v2 action economy persistence layer.

Classification: high severity, action economy integration seam.

### 6. Second Wind rules are strong, but action economy validation is split

`SecondWindRules` has good calculation logic:

- heroic/nonheroic eligibility
- half-HP requirement
- encounter flag
- healing equals max(floor(maxHP/4), Constitution score)
- feat and houserule hooks

`ActorEngine.applySecondWind()` handles HP mutation, use consumption, encounter flag, condition recovery hooks, and feat rules.

Current seam:

- `SecondWindRules.canUseSecondWind()` checks `combatant.resources.swift`, not the v2 action economy flag persisted by `ActionEconomyPersistence`.
- `ActorEngine.applySecondWind()` itself does not spend action economy; callers must remember to do it.
- Legacy UI paths spend swift through older action systems.

Classification: medium-high severity, mostly integration not math.

### 7. Condition Track display and status effect automation are not the same thing

The repo has a baseline condition track representation in `SWSEActiveEffectsManager.CONDITION_EFFECTS`:

- Normal
- -1
- -2
- -5
- -10
- Helpless

That is good for display/status icons.

However, `scripts/houserules/houserule-status-effects.js` has a separate auto-apply mapping that maps condition track levels to Fatigued, Exhausted, Stunned, and Helpless. That looks RAW-unsafe unless explicitly treated as a houserule.

Current seam:

- Condition Track penalty should apply to attacks, skill checks, ability checks, and defenses as the core numeric penalty.
- It should not automatically become unrelated conditions like Fatigued or Stunned unless a houserule says so.

Classification: medium-high severity, houserule boundary seam.

### 8. Current Conditions and Effects visibility has an adapter seam

`ActorEffectsAggregator` is a useful direction: it collects condition track, poison, recurring damage, weapon effects, immunities, rage, Active Effects, system active effects, item notes, and resource rules.

However, `scripts/engine/effects/adapters/active-effect-adapter.js` appears to call private methods that are not declared in that file. The aggregator catches adapter failures and logs warnings, so Active Effects may silently fail to display while the rest of the stack continues.

Classification: medium severity, display-only but player-facing.

## State-by-state audit

### Aim

Expected rule behavior:

- Aim generally requires two Swift Actions.
- It applies to the next qualifying ranged attack.
- It should be consumed by that attack or invalidated when interrupted by incompatible actions.
- GM adjudicates line of sight and target continuity.

Current evidence:

- Roll dialog offers an Aiming checkbox and adds +2 situational attack bonus.
- Prior audits found context mismatch: `situational.aiming` vs resolver expectations like `aim`.
- There is no clear durable aim state with two-swift progress and next-attack consumption in the inspected state layer.

Audit classification: partial, mostly roll-dialog-only.

Recommended boundary: automate action cost, state progress, and next-attack consumption; GM adjudicates LoS and target validity.

### Brace

Expected rule behavior:

- For autofire-only weapons, two Swift Actions immediately before the attack can brace.
- Bracing reduces the autofire/Burst Fire penalty to -2 for eligible autofire-only weapons.
- It should expire after the qualifying attack or if the sequence is interrupted.

Current evidence:

- Previous audits found braced autofire support in attack-option logic, but not a complete state lifecycle.
- No clear durable brace status and action-cost path found in this 0H pass.

Audit classification: missing/incomplete state lifecycle.

Recommended boundary: automate weapon eligibility, two-swift spend, and expiration; GM adjudicates unusual bracing circumstances.

### Prone

Expected rule behavior:

- Prone changes defense/attack interactions and can be toggled by actions such as falling prone or standing.
- Exact effects should follow SWSE, not DnD AC terminology.

Current evidence:

- `CombatStatusResolver` models prone vs Reflex: +5 vs ranged, -5 vs melee.
- Roll config has a prone situational option with older-looking text: `Prone (-2 melee, +2 ranged)`.
- `houserule-status-effects.js` also has Prone modifiers with DnD-ish AC language.
- The combat status UI has a prone toggle, but live handler evidence is unclear.

Audit classification: partially modeled, inconsistent values/authority.

Recommended boundary: automate declared prone status and math; GM adjudicates exact line/cover edge cases.

### Cover and Improved Cover

Expected rule behavior:

- Cover should be GM/player declared, not map geometry automation.
- Cover affects Reflex Defense and can be suppressed by some options such as Aim or special rules.

Current evidence:

- `CombatStatusResolver` has cover values: none, partial, cover, improved, total.
- It applies partial +2, cover +5, improved +10, and total cover as blocked unless overridden.
- It supports cover suppression context.
- Active Effects for cover exist but carry no mechanical updates.

Audit classification: good declared-state foundation, unclear UI mutation path.

Recommended boundary: automate declared cover math; GM handles whether cover exists.

### Fight Defensively

Expected rule behavior:

- RAW: Standard Action.
- -5 attack until start of next turn.
- +2 dodge Reflex until start of next turn.
- Trained Acrobatics: +5 instead.
- Houserule can change cost to Move or Swift if enabled.

Current evidence:

- Active Effect path models -5 attack and +2/+5 Reflex depending Acrobatics.
- Flag resolver models +2 only, no Acrobatics.
- Roll dialog has houserule-aware UI but is disabled under RAW default.
- Combat action bar has its own cost logic.

Audit classification: substantial logic exists, but fragmented.

Recommended boundary: automate cost, attack penalty, Reflex bonus, Acrobatics bonus, and expiration.

### Full Defense / Total Defense

Expected rule behavior:

- No attacks until next turn.
- +5 Reflex, or +10 with trained Acrobatics.
- Should not allow attacks of opportunity.

Current evidence:

- Active Effect path models +5/+10 with Acrobatics.
- Flag resolver models +5 only.
- `CombatStatusResolver.getAttackAdjustment()` can block attacks while Full Defense is active.
- It is unclear whether canonical attack and reaction/AoO paths consume that block consistently.

Audit classification: substantial logic exists, but fragmented.

Recommended boundary: automate Reflex bonus, attack lock, AoO/reaction attack lock, expiration.

### Charge

Expected rule behavior:

- Standard Action baseline in the supplied skeleton.
- Move speed in straight line and make melee attack.
- Attack/defense consequences and charge-gated feats/talents depend on charge context.
- GM adjudicates path legality.

Current evidence:

- Roll dialog has `situational.charging` and adds +2 attack.
- Legacy combat action bar creates a custom Charging ActiveEffect and spends Full-Round.
- Context name mismatch remains: `charging` vs `charge`.

Audit classification: unsafe/inconsistent state-context path.

Recommended boundary: automate action cost and roll context; GM adjudicates movement path.

### Flat-Footed

Expected rule behavior:

- Lose Dexterity bonus to Reflex Defense.
- Common in surprise/opening combat until acting.
- Cannot take Free Actions when Flat-Footed under supplied actions source.

Current evidence:

- No clear canonical flat-footed state lifecycle found in this pass.
- Defense calculation elsewhere may support Dex-lost scenarios, but state storage/expiration was not evident.

Audit classification: likely missing or manual.

Recommended boundary: automate declared flat-footed defense math and display; GM can toggle when initiative/surprise needs it.

### Helpless

Expected rule behavior:

- Helpless is final condition track state and also can arise from other effects.
- Helpless affects Reflex Defense and enables Coup de Grace-style actions.

Current evidence:

- Condition track supports `helpless` as a condition effect/icon.
- `combat-integration.js` blocks recover while helpless.
- Full mechanics of helpless defense math and action lock were not confirmed as canonical across all roll paths.

Audit classification: display exists, mechanical lock needs confirmation.

Recommended boundary: automate defense/action lock where RAW clear; GM adjudicates helpless criteria for Coup de Grace.

### Grabbed, Grappled, and Pinned

Expected rule behavior:

- Needs a three-state machine: Grabbed, Grappled, Pinned.
- Grabbed/Grappled: cannot move and -2 to attacks except natural/light weapons.
- Pinned: cannot act and loses Dex bonus to Reflex.
- Escape rules differ by state.

Current evidence:

- Phase 0F found a useful grappling skeleton, but not RAW-safe.
- In this state audit, the key finding is that these should not be generic Active Effects only; they need state-machine storage with last grapple check, attacker relation, duration, and escape rules.

Audit classification: good skeleton, unsafe state lifecycle.

Recommended boundary: automate state machine, checks, and display; GM adjudicates edge cases and unusual anatomy/items.

### Stunned and Unconscious

Expected rule behavior:

- Stun damage can move targets down the Condition Track and knock creatures unconscious.
- Unconscious state should block actions and affect defense.
- Droids/vehicles/objects are generally immune to stun unless exception.

Current evidence:

- Phase 0G found Stun is mostly type-label/data-only and needs special damage packets.
- State application for unconscious/stunned is not clearly tied to stun damage resolution.
- Houserule status effects include Stunned but may conflate condition track and status effects.

Audit classification: special damage/state connection missing or incomplete.

Recommended boundary: automate if damage packet and target category are known; GM handles exceptions.

### Recover

Expected rule behavior:

- Three Swift Actions to move one step up the Condition Track.
- Can span same or consecutive rounds as allowed by rules text.
- Persistent conditions block recovery.

Current evidence:

- `ActorEngine.recoverConditionStep()` has good progress tracking and persistent check.
- It does not itself spend canonical swift action economy.
- Multiple UI paths call different action availability sources.

Audit classification: good rules skeleton, action economy integration gap.

Recommended boundary: automate swift spend and progress; GM handles edge cases.

### Second Wind

Expected rule behavior:

- Swift Action unless a feat/rule changes it.
- Heal max(one-quarter max HP rounded down, Constitution score).
- Usually once per day/encounter depending table/system rule; feats/houserules modify.

Current evidence:

- `SecondWindRules` and `ActorEngine.applySecondWind()` have strong math and feat hooks.
- Action cost validation still references combatant resources in one path and separate caller-spent actions elsewhere.

Audit classification: strong math, action economy authority gap.

Recommended boundary: automate eligibility, cost, HP healing, use consumption, and display.

## Automation boundary

Automate:

- action economy spend for state activation
- state storage and expiration
- attack/defense modifiers
- attack locks under Full Defense, Pinned, Helpless, Unconscious
- condition track numeric penalties
- second wind and recover calculations
- display of active states and reasons

Assist:

- Aim validity if target/LoS is uncertain
- Charge legality and movement path
- grapple state application in unusual edge cases
- cover/improved cover declarations
- fire/acid extinguishing or treatment details

GM managed:

- whether a creature truly has cover or total cover
- whether a charge path is straight/clear
- exact area effects and LoS
- edge-case helpless/coup de grace setup
- unusual anatomy or item interactions in grapple

## Recommended next implementation dependencies

Before fixing individual states, the system should choose canonical authorities:

1. Canonical action economy: `ActionEconomyPersistence` + corrected `ActionEngine`.
2. Canonical declared tactical state: likely `CombatStatusResolver`, but it must learn Acrobatics-aware bonuses and action-expiration semantics or delegate cleanly to Active Effects.
3. Canonical display: Summary tab current conditions/effects should consume the same state authority, not an independent interpretation.
4. Canonical damage-state bridge: Stun/Ion/Fire/Acid should create state/effect packets only after damage semantics are fixed.

