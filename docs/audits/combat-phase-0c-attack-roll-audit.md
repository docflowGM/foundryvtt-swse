# Combat Phase 0C — Attack Roll Rules Fidelity Audit

Audit-only pass. No runtime files were changed.

## Scope

Phase 0C audits attack-roll fidelity against the skeleton rules baseline supplied for Combat 101, Attacks, Actions in Combat, Autofire/Burst Fire, Stun, Damage, Defenses, and Grappling. This is not a full rulebook audit yet. It is a first-pass accounting of glaring attack-roll seams in the current repo snapshot.

Covered in this phase:

- Attack roll formula and bonus sources
- Target defense comparison
- Natural 1 / natural 20 / critical hit treatment
- Range penalty support
- Proficiency penalty support
- Attack options that influence attack rolls
- Preroller context handoff into the attack resolver
- Damage-button context preservation where it directly affects attack-roll outcome integrity
- Strict `>` versus `>=` checks for attack/DC-style success tests

Not covered deeply in this phase:

- Full damage-rule audit, except where attack cards lose damage-critical context
- Grapple state machine details beyond attack-roll comparisons
- Defense formula correctness; that belongs to later defense-focused audit work
- Feat/talent crosswalk completeness; 0C only records attack-roll-relevant seams found while tracing

## Baseline rule expectations used for this audit

| Rule area | Expected baseline |
|---|---|
| Attack success | Attack roll total meets or exceeds target defense. `total >= defense`. |
| Melee attack formula | `1d20 + BAB + Strength modifier` before other valid modifiers. |
| Ranged attack formula | `1d20 + BAB + Dexterity modifier + range penalty` before other valid modifiers. |
| Proficiency | Nonproficiency applies `-5`. |
| Range penalties | Point-blank `0`, short `-2`, medium `-5`, long `-10`. |
| Natural 20 | Automatic hit and critical hit for normal attacks. |
| Natural 1 | Automatic miss. |
| Area attack criticals | Natural 20 automatically hits all affected targets, but area attacks do not deal double damage. |
| Shooting/throwing into melee | Ranged or thrown attacks into melee take `-5` unless Precise Shot suppresses it. |
| Attack option context | Feats/talents such as Careful Shot, Deadeye, Powerful Charge, Improved Disarm, Burst Fire, etc. should only activate when the runtime passes the required context. |

## Current attack-roll authority map

The repo does not have a single clean attack-roll authority. It has a few layered paths:

| Layer | File | Role | Audit status |
|---|---|---|---|
| Canonical attack math and chat | `scripts/combat/rolls/attacks.js` | Computes attack bonus, rolls d20, compares target defense, posts SWSE chat card. | Strongest current attack path. |
| SWSERoll facade | `scripts/combat/rolls/enhanced-rolls.js` | Public compatibility wrapper with dialogs, roll history, autofire/full attack legacy helpers. | Important but has context-shape drift. |
| Combat stat helper | `scripts/engine/combat/combat-stat-rules.js` | Shared helper for attack ability, range penalty, area attack detection, damage ability. | Useful SSOT candidate for math helpers. |
| Older combat utility | `scripts/combat/utils/combat-utils.js` | Duplicate attack/damage helper used by older enhanced rolls/combat systems. | Duplicate authority risk. |
| Combat option resolver | `scripts/engine/combat/combat-option-resolver.js` | Applies feat/talent attack-option metadata when context is correct. | Good metadata bridge, but context handoff is weak. |
| Roll Configurator V2 | `scripts/rolls/roll-config.js` | Main dialog collecting cover, target mode, range band, toggles, combat options. | UI is useful, but it returns `aiming/charging` under `situational`, while resolver expects `aim/charge`. |
| Chat damage bridge | `scripts/ui/chat/chat-interaction-bridge.js` | Handles Roll Damage buttons from chat. | Loses most attack-option context. |
| Full attack executor | `scripts/engine/combat/full-attack-executor.js` | Multiattack orchestration via canonical `rollAttack()`. | Good direction, but damage context handoff remains thin. |

## Findings by rule area

### 1. Basic melee/ranged attack math is mostly aligned in the canonical path

Evidence:

- `scripts/combat/rolls/attacks.js` uses `SchemaAdapters.getBAB(actor)` and `getWeaponAttackAbility(actor, weapon)` to build attack bonus.
- `scripts/engine/combat/combat-stat-rules.js` defaults ranged non-melee weapons to Dexterity and melee weapons to Strength.
- `scripts/engine/combat/combat-stat-rules.js` maps range bands to `short -2`, `medium -5`, and `long -10`.
- `scripts/combat/rolls/attacks.js` applies nonproficiency as `-5` when `actorIsProficientForAttack()` returns false.

Audit result: **mostly strong**.

Caveats:

- Thrown weapon classification is not fully trustworthy. `isThrownMeleeWeapon()` exists for damage ability contribution, but attack ability selection uses the broader ranged/melee test. Depending on item data shape, thrown melee weapons may be treated as ranged Dexterity attacks instead of melee/thrown Strength attacks unless item metadata explicitly sets `attackAttribute`.
- There are duplicate math helpers in `scripts/combat/utils/combat-utils.js`, so different call paths may compute attack bonus differently.

### 2. Meets-beats is mostly correct for attack rolls

Evidence:

- Canonical `rollAttack()` uses `roll.total >= targetReflex`.
- Narration helper path also uses `attackRoll.total >= targetReflex`.
- Full-attack executor delegates each attack to canonical `rollAttack()`.
- Enhanced full-attack path uses `roll.total >= targetReflex`.
- Critical confirmation in `roll-config.js` uses `roll.total >= targetDefense`.

Audit result: **strong for normal attack-vs-defense resolution**.

Caveat:

- Grapple has known strict comparison seams from 0A/0B and remains a separate high-risk opposed-check area.

### 3. Natural 20 is represented, but natural 1 is not faithfully represented in the canonical path

Evidence:

- Canonical `rollAttack()` checks `Number(d20) === 20` for critical behavior.
- It does not appear to force `isHit = false` when `d20 === 1`.
- Therefore, a natural 1 with enough bonus can still appear as a hit if `roll.total >= target defense`.

Audit result: **high-severity rules gap**.

Expected later fix:

- Attack result should compute natural d20 first.
- If natural 1, force miss regardless of total.
- If natural 20, force hit regardless of target defense and mark critical where the rule applies.
- Area attacks need a special critical rule: natural 20 auto-hits all affected targets but does not double damage.

### 4. Expanded critical ranges may over-promote hits to criticals

Evidence:

- Canonical `rollAttack()` treats `d20 >= criticalThreshold` and `isHit !== false` as `isCritical`.
- There is no confirmation path in canonical `rollAttack()` for expanded threat ranges.
- `roll-config.js` has critical-confirmation support, but the canonical attack path does not appear to call it.

Audit result: **medium/high risk**.

Why this matters:

- If a future feat/talent sets `criticalThreatNaturalMin` below 20, the canonical path may treat the expanded threat as critical without confirmation or without separating “threat” from “confirmed critical.”
- Normal SWSE natural 20 critical behavior is fine as a baseline; expanded threat support needs its own rule-specific confirmation handling if the project intends to support expanded ranges.

### 5. Area attack critical handling is only protected in the damage path if area context survives

Evidence:

- `scripts/combat/rolls/damage.js` avoids critical multiplication when `isAreaAttack(weapon, context)` is true.
- `scripts/engine/combat/combat-stat-rules.js` can detect area attacks from `context.areaAttack` / `context.isAreaAttack` or item system flags/text.
- Chat damage buttons in `scripts/ui/chat/chat-interaction-bridge.js` pass only `isCritical`, `critMultiplier`, `twoHanded`, and `target`; they do not pass attack mode, area attack, burst fire, autofire, hit/miss, range band, or combat option selections.

Audit result: **high risk**.

Impact:

- Even if the attack card knows it was Autofire or an area attack, the damage button can forget that fact.
- If the weapon item itself is not flagged `areaAttack`/`isAreaAttack`, the damage path may multiply critical damage incorrectly for an area attack.
- Burst Fire should not be an area attack, but Autofire should be. Current context preservation is not reliable enough to guarantee this distinction across chat damage buttons.

### 6. Shooting or throwing into melee is metadata-only / not clearly applied

Evidence:

- `CombatOptionResolver` contains a Precise Shot option that suppresses `firingIntoMeleePenalty`.
- No clear attack path was found that detects “target adjacent to ally / shooting or throwing into melee” and adds the `-5` penalty.
- Because the base penalty is missing or GM/manual-only, Precise Shot suppression has nothing reliable to suppress.

Audit result: **high rules-fidelity seam**.

Automation boundary recommendation:

- Do not automate map adjacency or target-allied melee validation by default.
- Do add a preroller checkbox: “Shooting/throwing into melee (-5)”.
- If actor has Precise Shot, either hide/disable that penalty or auto-suppress it with a visible note.

### 7. Preroller combat-option context does not line up with resolver context requirements

Evidence:

- `roll-config.js` returns quick toggles as `result.situational.aiming`, `result.situational.charging`, etc.
- It also adds flat situational bonuses for Aim/Charge/Flank/Higher Ground/Point Blank.
- `CombatOptionResolver` requires `context.aim === true` for Careful Shot / Deadeye and `context.charge === true` for Powerful Charge / Charging Fire.
- The canonical attack call receives the dialog result, but no bridge was found that maps `situational.aiming` to `aim` or `situational.charging` to `charge`.

Audit result: **high-severity context seam**.

Impact examples:

- Careful Shot and Deadeye may not activate from the Aiming checkbox unless some other code sets `aim: true`.
- Powerful Charge and Charging Fire may not activate from the Charging checkbox unless some other code sets `charge: true`.
- The player may see a generic +2 “Charging” bonus while charge-dependent feat/talent rules remain asleep.

### 8. The dialog currently adds generic situational bonuses that may double-count or incorrectly simplify rules

Evidence:

- `roll-config.js` adds `+2` for aiming, `+2` for charging, `+2` for flanking, `+1` for higher ground, and `+1` for point blank directly into `situationalBonus`.

Audit result: **medium/high risk**.

Why this is risky:

- Aim does not normally grant a flat `+2` attack bonus by itself; it enables ignoring cover and enables feats like Careful Shot/Deadeye.
- Charge grants a melee attack bonus, but ranged charge variants like Charging Fire explicitly change the normal charge behavior.
- Point Blank Shot is feat-gated; the quick toggle may add `+1` even if the actor does not have the feat unless the UI elsewhere gates it.

Recommended later direction:

- Quick toggles should set context flags first.
- Rule engines and feat/talent metadata should decide whether bonuses apply.
- GM/manual situational modifier should remain as a separate generic box.

### 9. SWSERoll facade has attack-result shape drift

Evidence:

- `enhanced-rolls.js` imports canonical `rollAttack()` from `attacks.js`.
- Canonical `rollAttack()` returns an attack result object with `roll`, `total`, `atkBonus`, `isHit`, `isCritical`, `resolvedTarget`, etc.
- `enhanced-rolls.js` treats the return value like a Foundry Roll and tries to read `roll.swseAttackContext`, `roll.dice`, and other Roll-shaped properties.

Audit result: **high runtime/UX risk**.

Impact:

- Attack chat may be posted correctly by the canonical path, but the SWSERoll wrapper result may record null/incorrect `d20`, `attackBonus`, `isHit`, `targetReflex`, or critical details.
- Downstream systems that rely on the SWSERoll return shape may behave as if the hit/crit/target data is missing.

### 10. Autofire helper is not safe as a current authority

Evidence:

- `enhanced-rolls.js` has a legacy `rollAutofire()` helper that attempts to implement Autofire and Burst Fire.
- It references `mode` while determining d20, but `mode` is not defined in that function scope.
- It checks Evasion on the attacker instead of on each target.
- In the Burst Fire miss branch, it appears to apply half damage on miss even though Burst Fire is a single-target attack and should miss normally.
- It uses its own damage call and target loop rather than the canonical attack-card/damage-button flow.

Audit result: **critical if live, medium if dead/orphaned**.

Recommended later action:

- Confirm whether any live button routes to `SWSERoll.rollAutofire()`.
- If live, mark it unsafe until corrected.
- Prefer GM-assisted Autofire through the new attack context builder rather than this legacy target-loop implementation.

### 11. Damage button context is too thin to preserve attack-result truth

Evidence:

- Full-attack combined cards include damage buttons with actor, weapon, crit flag, and crit multiplier.
- Chat bridge damage handlers pass only the limited dataset to `SWSERoll.rollDamage()`.
- Attack option selections such as Burst Fire, Rapid Shot, Rapid Strike, Deadeye, two-handed state, area attack, and hit/miss outcome are not consistently preserved.

Audit result: **high risk**, but the detailed fix belongs to Phase 9.

Why it matters to attack audit:

- Attack rolls produce context-sensitive outcomes; damage needs the same context snapshot to remain honest.
- Otherwise, an attack can roll with one set of options, while the damage button rolls with a different or empty option context.

### 12. Duplicate damage rollers increase drift risk

Evidence:

- `scripts/combat/rolls/attacks.js` exports a `rollDamage()` function.
- `scripts/combat/rolls/damage.js` also exports a `rollDamage()` function.
- `enhanced-rolls.js` imports from `damage.js`, while other legacy code may import from `attacks.js`.

Audit result: **architectural risk**.

Recommendation:

- Later cleanup should choose one canonical damage authority and route all attack-card damage buttons through it.

## Meets-beats audit summary

| Area | Evidence | Status |
|---|---|---|
| Attack vs defense | Canonical `rollAttack()` uses `>=`. | Pass |
| Narration attack path | Uses `>=`. | Pass |
| Full attack executor | Delegates to canonical `rollAttack()`. | Pass |
| Enhanced full attack | Uses `>=`. | Pass |
| Critical confirmation | Uses `>=`. | Pass |
| Skills vs DC | Many skill uses use `>=`. Not exhaustive for 0C. | Likely pass |
| Grapple opposed checks | Previously found strict/incorrect comparison risk. | Fail / later phase |
| Pilot opposed checks | `enhanced-pilot.js` has at least one strict `>` opposed check candidate. Not attack-roll scope. | Flag for later |
| Concealment | Uses `roll > missChance`, which is not a DC/defense check. | Not a meets-beats issue |

## Recommended 0C follow-up priorities

These are recommendations only; no fixes were made.

1. **Natural 1 auto-miss / Natural 20 auto-hit normalization**
   - Highest direct rules gap in the canonical attack path.

2. **Attack result shape contract**
   - Decide whether `SWSERoll.rollAttack()` returns a Foundry Roll or the canonical attack result object.
   - Update callers to one shape.

3. **Attack context builder**
   - Convert UI toggles into canonical context keys: `aim`, `charge`, `maneuver`, `areaAttack`, `autofire`, `burstFire`, `shootingIntoMelee`, etc.

4. **Precise Shot / shooting into melee assisted flow**
   - Add manual checkbox and suppression logic, not map automation.

5. **Autofire helper quarantine**
   - Treat legacy `rollAutofire()` as unsafe until live routing is verified.

6. **Damage context snapshot**
   - Attack cards should carry a serialized attack context into the damage button.

## Automation boundary recommendation for attack rolls

Automate:

- BAB + ability + range penalty + proficiency penalty
- Natural 1 / natural 20 attack result behavior
- attack option modifiers when the user intentionally selects the option and the context is valid
- Precise Shot suppression if user checks “shooting/throwing into melee”
- critical multiplier suppression for area attacks when area context is known

Assist / GM-managed:

- Whether a ranged attack is actually shooting into melee
- Whether a target has cover / improved cover / concealment
- Whether the charge path is legal
- Whether a target is inside an area attack
- Which targets are affected by Autofire

