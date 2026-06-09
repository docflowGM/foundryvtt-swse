# Combat Phase 0B — Combat Action Routing Audit
**Scope:** audit only. No runtime files changed. This pass inventories combat-action data, visible routing, action economy assumptions, and the user addendum that SWSE checks should use **meet-or-exceed** unless a specific rule says otherwise.
## Executive summary
- The combat action data is present, but the live sheet path is not treating the data as a clear routing contract.
- The character combat-action pack has **42** entries. All **42** have `system.executable=false` in the pack, but the mapper drops that field; the sheet therefore renders many reference actions as clickable executable actions.
- **9** pack actions have `actionType=compound`; the sheet groups only full-round/standard/move/swift/free/reaction, so those compound entries are likely hidden when the compendium path succeeds.
- The action economy engine and policy layer show significant seams: policy calls appear to pass the wrong object shape, and full-round action handling does not match the pasted skeleton rule that full-round consumes Standard + Move + Swift.
- The Fight Defensively / Total Defense paths are split across combat-action data, status flags, active effects, quick actions, and feat-action data; current code does not consistently spend RAW Standard action cost or apply the Acrobatics-trained `+5/+10` Reflex upgrade.
- The main attack roll path uses `>=` correctly for attack vs defense. The biggest strict-greater-than violation found in this pass is the enhanced grappling opposed check.

## Current runtime routing shape observed
1. Character sheet context tries `CombatActionsMapper.init()` and `CombatActionsMapper.getAllCombatActions()` first.
2. `CombatActionsMapper._normalizeAction()` returns key/name/actionType/cost/notes/relatedSkills, but drops pack fields such as `executable`, `toggleable`, `domain`, `category`, `actionTypeRaw`, and `ammoConsumption`.
3. The sheet `registerAction()` sets `executable: action.executable !== false`. Because the mapper omitted `executable`, reference entries become executable.
4. The sheet groups actions by normalized action economy, but only emits groups in this order: full-round, standard, move, swift, free, reaction. Any `compound` group is built but not emitted.
5. Clicking an action attempts one of several routes: manual/reference, fullAttack, attack-like, skill-backed, then generic `CombatEngine.executeAction()`. The core CombatEngine only implements Coup de Grace for universal `combat:N` actions.

## Counts
| Item | Count |
|---|---:|
| Character combat actions in JSON | 42 |
| Character combat actions in pack | 42 |
| Pack actionType `compound` | 9 |
| Pack actionType `full-round` | 5 |
| Pack actionType `move` | 7 |
| Pack actionType `standard` | 15 |
| Pack actionType `swift` | 6 |
| Pack entries with `system.executable=false` | 42 |
| Pack compound actions likely not emitted into visible lanes | 9 |
| Rendered non-compound actions whose source says executable=false | 33 |
| Feat combat action definitions | 41 |

## High-priority 0B seams
### combat-action-pack-executable-dropped-by-mapper
- **Severity:** high
- **System:** combat-actions
- **Finding:** All 42 combat-action compendium entries have system.executable=false, but CombatActionsMapper._normalizeAction does not preserve executable. The character sheet then treats missing executable as true, creating clickable Use buttons for reference actions.
- **Recommended phase:** Phase 1

### compound-actions-hidden-from-pack-rendering
- **Severity:** high
- **System:** combat-actions
- **Finding:** Compendium actionType=compound normalizes to the literal string compound in the sheet, but combatActions.groups only renders known economy lanes. Nine compound actions likely vanish from the combat tab when the compendium loads.
- **Affected actions:** Fight defensively, Charge, Use Computer / Access information, Use the Force (example: Move Light Object / Breath Control), Snipe, First Aid / Revivify / Treat Injury, Escape bonds / Escape net, Perception / Notice targets, Autofire
- **Recommended phase:** Phase 1

### action-economy-policy-argument-shape-mismatch
- **Severity:** high
- **System:** action-economy
- **Finding:** _applyActionEconomy calls Policy.wouldPermit(payload) and Policy.handle(payload), but ActionPolicyController.wouldPermit expects a consume result and handle expects {actor,result,actionName}. This can make strict/loose enforcement unreliable.
- **Recommended phase:** Phase 1

### full-round-engine-does-not-match-skeleton-rule
- **Severity:** high
- **System:** action-economy
- **Finding:** ActionEngine comments/code model a full-round action as consuming standard+move while leaving swift available. The pasted skeleton says a full-round action sacrifices Standard, Move, and Swift. This needs RAW/house-rule confirmation but is a glaring baseline mismatch.
- **Recommended phase:** Phase 1

### combat-action-context-not-preserved-to-roll
- **Severity:** high
- **System:** attack-routing
- **Finding:** Attack-like action cards reach SWSERoll.rollAttack with modResult/options but not the full source actionData/actionId context. This risks losing autofire, charge, disarm, grapple, and burst-fire intent before CombatOptionResolver/damage can use it.
- **Recommended phase:** Phase 2

### core-combat-action-engine-only-implements-coup-de-grace
- **Severity:** medium
- **System:** combat-engine
- **Finding:** CombatEngine.executeAction only special-cases universal combat:9 Coup de Grace. Other core combat actions warn/not implemented if they fall through to this engine.
- **Recommended phase:** Phase 1

### meets-beats-grapple-strict-greater
- **Severity:** high
- **System:** grapple
- **Finding:** Enhanced grappling opposed check uses strict >, making ties fail for attacker. Flagged by user addendum.
- **Recommended phase:** Phase 0F / Phase 6

## Combat action inventory accounting
| Action | Pack type | Raw type | Cost | Source executable | Visible from pack? | Phase 0B risk tags |
|---|---|---|---:|---:|---:|---|
| Second Wind | `swift` | swift | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Aid another | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, skill-dc-result-application-required |
| Fight defensively | `compound` | standard (or full-round variant) |  | False | False | hidden-from-lanes-compound |
| Attack (single) | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, attack-context-required |
| Charge | `compound` | standard (move your speed, min 2 sq) |  | False | False | hidden-from-lanes-compound, attack-context-required |
| Run | `full-round` | full-round | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Brace Autofire-Only Weapon | `standard` | 2 swift actions | 2 | False | True | source-nonexecutable-but-sheet-renders-use, raw-cost-misclassified-as-standard, multi-cost-not-modeled-by-economy |
| Stand up from prone | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Switch Weapon Mode | `swift` | swift | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Use Computer / Access information | `compound` | varies (full-round/1 min/1 hr) |  | False | False | hidden-from-lanes-compound |
| Draw or Holster Weapon | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Aim | `swift` | swift | 2 | False | True | source-nonexecutable-but-sheet-renders-use |
| Feint | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, skill-dc-result-application-required |
| Use the Force (example: Move Light Object / Breath Control) | `compound` | varies (move/standard/swift/full-round) |  | False | False | hidden-from-lanes-compound |
| Disarm | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, attack-context-required |
| Ready or Recovery actions for vehicles | `standard` | varies (swift, 3 swifts) |  | False | True | source-nonexecutable-but-sheet-renders-use, raw-cost-misclassified-as-standard |
| Grapple / Grab | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, attack-context-required |
| Disengage / Withdraw | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Burst Fire | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, attack-context-required |
| Snipe | `compound` | standard + move |  | False | False | hidden-from-lanes-compound |
| First Aid / Revivify / Treat Injury | `compound` | full-round (first aid) / full-round (revivify) |  | False | False | hidden-from-lanes-compound, skill-dc-result-application-required |
| Draw concealed item (conceal/seek) | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Escape bonds / Escape net | `compound` | standard / full-round |  | False | False | hidden-from-lanes-compound |
| Reload | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Treat Poison | `full-round` | full-round | 1 | False | True | source-nonexecutable-but-sheet-renders-use, skill-dc-result-application-required |
| Feign Haywire | `full-round` | full-round | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Create a Diversion to Hide | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use, skill-dc-result-application-required |
| Anticipate Enemy Strategy | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use, skill-dc-result-application-required |
| Maiming Foes | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Fall prone | `swift` | swift | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Tumble | `standard` | part of move |  | False | True | source-nonexecutable-but-sheet-renders-use, raw-cost-misclassified-as-standard |
| Coup de Grace | `full-round` | full-round | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Drop an item | `swift` | swift | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Manipulate an item | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Ready an action (prepare) | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Activate an item | `swift` | swift | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Area Attack (burst/splash/cone) | `standard` | standard | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Perception / Notice targets | `compound` | reaction / standard |  | False | False | hidden-from-lanes-compound |
| Recover | `standard` | 3 swift actions | 3 | False | True | source-nonexecutable-but-sheet-renders-use, raw-cost-misclassified-as-standard, multi-cost-not-modeled-by-economy |
| Autofire | `compound` | swift + standard |  | False | False | hidden-from-lanes-compound, attack-context-required |
| Move your speed / Move action | `move` | move | 1 | False | True | source-nonexecutable-but-sheet-renders-use |
| Full attack | `full-round` | full-round | 1 | False | True | source-nonexecutable-but-sheet-renders-use |

## Baseline action coverage gaps from the pasted skeleton
| Skeleton action | Finding |
|---|---|
| Delay | No core combat-action entry found. Could be initiative tracker behavior later, but it is not represented in action cards. |
| Group Feint | Not in combat-actions pack/json. It appears in extraskilluses.json, so it may surface through skill-use UI rather than combat action lanes. |
| Escape from Grapple | Not a dedicated combat-action. Grapple / Grab references Acrobatics escape; Escape bonds/net is not the same state-machine action. |
| Activate Force Power by exact action cost | Only generic variable Use the Force action exists; actual force power cards likely own this elsewhere. Combat-action baseline does not route specific power cost. |

## Compound / misclassified action accounting
### Compound actions likely hidden from the compendium route
- **Fight defensively** — raw `standard (or full-round variant)`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Charge** — raw `standard (move your speed, min 2 sq)`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Use Computer / Access information** — raw `varies (full-round/1 min/1 hr)`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Use the Force (example: Move Light Object / Breath Control)** — raw `varies (move/standard/swift/full-round)`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Snipe** — raw `standard + move`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **First Aid / Revivify / Treat Injury** — raw `full-round (first aid) / full-round (revivify)`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Escape bonds / Escape net** — raw `standard / full-round`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Perception / Notice targets** — raw `reaction / standard`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.
- **Autofire** — raw `swift + standard`; pack `actionType=compound`; likely not emitted because `compound` is not in the sheet economy order.

### Raw action costs misclassified as standard in the pack
- **Brace Autofire-Only Weapon** — raw `2 swift actions`, pack `standard`, cost `2`.
- **Ready or Recovery actions for vehicles** — raw `varies (swift, 3 swifts)`, pack `standard`, cost `None`.
- **Tumble** — raw `part of move`, pack `standard`, cost `None`.
- **Recover** — raw `3 swift actions`, pack `standard`, cost `3`.



## User addendum — Fight Defensively / Total Defense RAW audit criterion
The user supplied the RAW baseline for this phase: **Fight Defensively is a Standard Action**. It gives `-5` to attack rolls and `+2` dodge Reflex until the start of the next turn. If the character is trained in Acrobatics, that Reflex bonus becomes `+5`. If the character chooses to make no attacks until the next turn, Total Defense gives `+5` dodge Reflex, or `+10` if trained in Acrobatics.

Phase 0B accounting from the current snapshot:

| Area | Current evidence | 0B finding |
|---|---|---|
| Core combat action data | `data/combat-actions.json` and `packs/combat-actions.db` describe Fight Defensively as `compound` with notes mentioning the Acrobatics upgrade. | The rule text is partly present, but because `compound` lanes are not emitted by the combat tab, the action can disappear from the visible action board. |
| Combat status resolver | `scripts/combat/combat-status.js` hardcodes Fighting Defensively as `+2` Reflex and Full Defense as `+5` Reflex. | Missing Acrobatics-trained upgrade to `+5/+10`. |
| Active effects manager | `scripts/combat/active-effects-manager.js` hardcodes `fighting-defensively` as `-5 attack / +2 Reflex` and `total-defense` as `+5 Reflex`. | Missing Acrobatics-trained upgrade and not clearly tied to the same combat-status SSOT. |
| Attack preroller path | `scripts/sheets/v2/character-sheet.js` only spends action economy for preroller Fight Defensively when the houserule setting is `swift`; default RAW does not appear to consume the Standard action in this attack-dialog route. | The attack-dialog toggle can behave like an attack stance instead of a Standard Action. This is a RAW mismatch unless the world explicitly selected a house-rule mode. |
| Combat action bar path | `scripts/components/combat-action-bar.js` has a helper where default cost is `standard`, `rai` is no cost, and `swift` is swift. | This path has better RAW cost awareness, but it is separate from the combat-tab/preroller path and still lacks a Move-action house-rule option. |
| Houserule setting | `fightDefensivelyActionMode` supports `default`, `rai`, and `swift`. | The user wants the eventual house-rule choices to include alternate Move or Swift action cost. Current settings include Swift but not Move; RAI is a separate no-extra-cost mode that should be reviewed. |
| Feat action data | `data/feat-combat-actions.json` defines `defensive-fighting` as Swift, `+2 Reflex`, `-2 attacks`; `total-defense` as Standard, `+2 to all defenses`, cannot attack. | These entries do not match the RAW baseline and are likely legacy/incorrect if they surface in player-facing action lists. |

Audit-only conclusion: Fight Defensively should be tracked as a high-priority Phase 1/8 seam. It is both an **action-routing/economy** issue and a **defense-calculation** issue. Later implementation should not merely toggle a mode; it must know whether the world is using RAW Standard, house-rule Move, house-rule Swift, or some explicitly chosen stance mode, and it must compute the Acrobatics-trained bonus.

## Meets-beats audit addendum
Rule criterion for later phases: attack/check totals should succeed on **total >= defense/DC** unless a specific rule says ties are handled differently.
| Finding | File | Result |
|---|---|---|
| grapple-opposed-strict-greater | `scripts/combat/systems/grappling-system.js:119` | Opposed grapple check uses strict >. Per the user addendum and Grab/Grapple source baseline, attacker should win ties where the rule says equals or exceeds. |
| opposed-skill-strict-greater-tie-null | `scripts/rolls/skills.js:239-240` | Generic opposed checks intentionally produce no winner on ties. This is not globally wrong, but any attacker-vs-defense or attacker-meets-defender use of this helper would violate meet-or-exceed. |
| vehicle-dogfighting-opposed-strict-greater | `scripts/engine/combat/subsystems/vehicle/vehicle-dogfighting.js:117` | Vehicle dogfighting opposed result uses strict >. Needs rule-source confirmation later; flag for Phase 0 vehicle combat rather than immediate character-combat fix. |
| attacks-main-meets-beats-ok | `scripts/combat/rolls/attacks.js:378` | Primary attack path appears to use meet-or-exceed correctly. |
| attacks-legacy-meets-beats-ok | `scripts/combat/rolls/attacks.js:559` | Secondary/legacy attack path also appears to use meet-or-exceed correctly. |
| reaction-skill-dc-meets-beats-ok | `scripts/engine/combat/reactions/reaction-registry.js:811, 891, 950` | Sample reaction resolver checks use meet-or-exceed correctly. |

## Feat combat-action notes from 0B
- `data/feat-combat-actions.json` is a separate action source. It has toggles/modifiers and source-gated actions, but it is not the same as core combat actions.
- `defensive-fighting` and `total-defense` are currently universal feat-action entries with toggleable active-effect behavior. These need reconciliation with the core combat status system and the user-facing Fight Defensively / Full Defense controls.
- Many non-toggle feat actions are displayed as available actions but do not have a dedicated executor in this route. That is acceptable only if they are clearly marked manual/reference; otherwise they create false automation.

## Phase recommendation after 0B
Do not start mechanical fixes until 0C/0D confirm attack and damage authority. When implementation begins, Phase 1 should first establish a routing contract: `resolutionMode`, `actionCost`, `contextTags`, `gmManaged`, and whether an action is `manual/reference/executable`. That will prevent the current problem where data exists but the sheet guesses intent.
