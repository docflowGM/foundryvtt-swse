# Combat Phase 0D - Damage Rules Fidelity Audit

Audit-only pass. No runtime files were changed.

## Scope

Phase 0D audits damage-rule fidelity against the skeleton combat rules supplied for Damage, Stun Damage, Autofire, Burst Fire, Attacks, and the Phase 0A/0C baselines.

This is not a full rulebook audit yet. It is a first-pass accounting of glaring damage seams in the current repo snapshot.

Covered in this phase:

- Base weapon damage formula
- Half heroic level and ability-to-damage handling
- Two-handed melee damage handling
- Critical damage and area-attack critical handling
- Area attack hit/miss damage behavior
- Evasion interaction with area damage
- Burst Fire damage behavior
- Stun damage behavior
- Damage Threshold and condition-track application
- Damage-button context preservation from attack cards
- Damage authority duplication
- User-requested firing-into-melee/Elusive Target addendum

Not covered deeply in this phase:

- Full feat/talent crosswalk for every damage rider; this belongs to 0H.
- Defense formula correctness; this belongs to a defense-focused audit.
- Exact action routing from combat action cards; this was 0B.
- Complete grapple damage flow; grapple needs its own 0F pass.

## Baseline rule expectations used for this audit

| Rule area | Expected baseline |
|---|---|
| Melee damage | Weapon damage + one-half heroic level + Strength modifier. |
| Thrown melee damage | Weapon damage + one-half heroic level + Strength modifier. |
| Ranged damage | Weapon damage + one-half heroic level. |
| Two-handed melee damage | Add double Strength bonus when wielding a non-light melee weapon two-handed. |
| Minimum damage | A hit deals at least 1 damage even if penalties reduce the result below 1. |
| Critical hit damage | Normal critical hits deal double damage unless a rule changes the multiplier. |
| Area attack criticals | Natural 20 automatically hits affected targets, but area attacks do not deal double damage. |
| Autofire damage | Area attack; hit targets take full damage, missed targets take half damage. GM adjudicates area and affected targets. |
| Evasion | Area attack hit: half damage. Area attack miss: no damage. Does not apply to Burst Fire. |
| Burst Fire | Single-target attack option; -5 attack, +2 weapon dice, 5 shots, not an area attack, no damage on miss. |
| Stun damage | Successful stun attack subtracts half stun damage from HP. If original stun damage equals/exceeds DT, target moves -2 CT. If half damage reduces HP to 0, target moves to bottom of CT and is unconscious. Droids, vehicles, and objects are immune to stun damage. |
| Damage Threshold | DT is a trigger, not damage reduction. Damage meeting or exceeding DT triggers CT movement. |

## Current damage authority map

| Layer | File | Role | Audit status |
|---|---|---|---|
| Chat-facing canonical damage roller | `scripts/combat/rolls/damage.js` | Rolls weapon damage, half-level, ability contribution, passive/talent bonuses, critical multiplier, then posts chat. | Strongest active damage roller, but misses some attack-option context. |
| Legacy/alternate damage roller | `scripts/combat/rolls/attacks.js` | Also exports a `rollDamage()` with CombatOptionResolver damage dice support. | Duplicate authority risk. |
| SWSERoll facade | `scripts/combat/rolls/enhanced-rolls.js` | Public wrapper and legacy autofire/burst helper; delegates basic damage to `damage.js`. | Important live path, but legacy autofire helper is unsafe if called. |
| Combat stat rules | `scripts/engine/combat/combat-stat-rules.js` | Shared helpers for damage ability contribution, critical multiplier, and area attack detection. | Useful SSOT candidate. |
| Damage resolution engine | `scripts/engine/combat/damage-resolution-engine.js` | Applies mitigation, HP damage, threshold evaluation, CT impact, death/destroy logic. | Good DT architecture; stun handling is not RAW by default. |
| Damage mitigation manager | `scripts/engine/combat/damage-mitigation-manager.js` | Applies SR, DR, temp HP, then HP damage. | Good mitigation order, but does not encode area/stun hit/miss transformations. |
| Actor mutation authority | `scripts/governance/actor-engine/actor-engine.js` and `scripts/actors/base/swse-actor-base.js` | Delegates damage application through DamageResolutionEngine and persists HP/CT changes. | Good mutation authority. |
| Chat damage bridge | `scripts/ui/chat/chat-interaction-bridge.js` | Handles chat Roll Damage and Apply Damage buttons. | Major context-loss seam. |
| Ammo system | `scripts/engine/inventory/ammo-system.js` | Knows normal/rapidShot/burstFire/autofire ammo costs. | Useful, but not consistently connected to canonical damage/attack card flow. |

## Findings by rule area

### 1. Base damage math is partly strong

Evidence:

- `scripts/combat/rolls/damage.js` uses weapon base damage plus `getEffectiveHalfLevel(actor)`.
- `scripts/engine/combat/combat-stat-rules.js` adds Strength for melee or thrown melee damage by default.
- `scripts/engine/combat/combat-stat-rules.js` supports two-handed damage and prevents double Strength for light weapons when context says the weapon is light.
- NPC statblock mode can use printed flat damage formulas rather than recalculating.

Audit result: mostly strong.

Caveats:

- The duplicate `rollDamage()` in `scripts/combat/rolls/attacks.js` applies CombatOptionResolver damage dice more directly than `scripts/combat/rolls/damage.js` does.
- Depending on which damage roller a chat button reaches, damage riders such as Burst Fire, Rapid Shot, Deadeye, and Mighty Swing can diverge.
- Minimum 1 damage is not clearly enforced in the roll formula or post-roll result. If penalties can reduce damage below 1, that needs explicit handling later.

### 2. Damage authority is split

Evidence:

- `scripts/combat/rolls/damage.js` exports one `rollDamage()`.
- `scripts/combat/rolls/attacks.js` also exports a different `rollDamage()`.
- `scripts/combat/rolls/enhanced-rolls.js` imports the `damage.js` roller.
- Older UI adapters and combat systems also expose damage buttons or helpers.

Audit result: high architectural risk.

Impact:

- Attack-option damage dice can apply in one path and not another.
- Critical/context flags can be preserved in one path and lost in another.
- Fixing one damage roller later may not fix every damage button.

Recommended later direction:

- Pick one canonical damage roller.
- Make attack chat cards persist a complete damage context snapshot.
- Make every Roll Damage button call the same damage service.

### 3. Critical damage is only safe when area context survives

Evidence:

- `scripts/combat/rolls/damage.js` avoids critical multiplication when `isAreaAttack(weapon, context)` returns true.
- `isAreaAttack()` can read `context.areaAttack` or `context.isAreaAttack` and some item flags/text.
- Chat Roll Damage buttons only pass `isCritical`, `critMultiplier`, and `twoHanded`. They do not pass `areaAttack`, `autofire`, `burstFire`, `attackMode`, hit/miss outcome, or target-specific outcome.

Audit result: high risk.

Impact:

- A natural 20 Autofire attack can incorrectly double damage if the damage button forgets that the attack was an area attack and the weapon item is not independently flagged as an area weapon.
- This is especially risky for Autofire because the area-attack status is usually a selected firing mode, not a permanent item trait.

### 4. Area attack hit/miss damage is not represented in the canonical damage flow

Evidence:

- Autofire/Burst Fire special handling exists in legacy `enhanced-rolls.js`.
- The canonical attack card/damage-button flow does not appear to preserve per-target area hit/miss results.
- `DamageResolutionEngine` receives a numeric damage amount; it does not know whether this target was hit by an area attack, missed by an area attack, had Evasion, or should receive half/no damage.

Audit result: high rules-fidelity gap.

Correct automation boundary:

- The system should not place templates or decide all affected targets.
- The system should automate the damage transformation once the GM/player says whether a selected target was hit or missed by an area attack.
- A later UI could offer damage buttons like `Apply Full`, `Apply Half`, and `Apply None (Evasion)` on an Autofire chat card.

### 5. Evasion metadata exists, but the live damage path is not trustworthy

Evidence:

- The Evasion talent has `AREA_DAMAGE_MITIGATION` metadata: on hit half damage, on miss no damage, and applies to piloted vehicle.
- The metadata says it is implemented by enhanced-rolls area attack damage resolution.
- The legacy `enhanced-rolls.js` autofire helper checks Evasion on `actor.items`, where `actor` is the attacker, not the target.
- The canonical damage flow does not appear to check target Evasion before applying damage.

Audit result: critical seam.

Impact:

- Evasion may exist in data but not reliably work in the actual chat damage path.
- If the legacy autofire helper is live, it appears to check the wrong actor.
- If the canonical path is live, it does not appear to have enough target-specific area outcome context to apply Evasion.

Expected later behavior:

- Autofire hit against target with Evasion: half damage.
- Autofire miss against target with Evasion: no damage.
- Burst Fire: Evasion does not apply because Burst Fire is not an area attack.

### 6. Burst Fire is metadata-rich but damage-context fragile

Evidence:

- The Burst Fire feat contains explicit attack-option metadata: requires ranged/autofire, -5 attack, +2 weapon dice, 5 ammo, and non-stacking with Deadeye/Rapid Shot.
- The legacy Autofire/Burst Fire helper manually builds a virtual weapon with `+2` dice.
- The legacy Burst Fire miss branch appears to assign half damage on miss, which is incorrect for a single-target attack.
- The canonical chat Roll Damage button does not appear to preserve `burstFire` context unless it is reconstructed from current actor/weapon state.

Audit result: high risk.

Expected later behavior:

- Burst Fire should be a single-target attack.
- It should deal no damage on a miss.
- It should not trigger Evasion.
- Its +2 weapon dice must survive from the attack option selection into the damage roll.
- It should consume 5 shots or at minimum produce a clear spend-ammo action/reminder.

### 7. Stun damage is not RAW-complete

Evidence:

- Weapon/item data supports `damageType: "stun"` and stun properties.
- `DamageResolutionEngine` passes `isStun` into `ThresholdEngine.evaluateThreshold()` when `damageType === 'stun'`.
- `ThresholdEngine` only applies the special stun threshold behavior when the `stunThresholdRule` house-rule setting is enabled, and that setting defaults to false.
- The core damage application does not clearly halve stun damage before subtracting HP.
- The core damage application does not clearly prevent stun damage against droids, vehicles, or objects.

Audit result: critical rules-fidelity gap.

Expected later behavior:

- On successful stun attack, HP loss should be half the rolled stun damage.
- Damage Threshold comparison should use the original stun damage before halving.
- If original stun damage meets/exceeds DT, move target -2 CT.
- If half stun damage reduces HP to 0, move target to bottom of CT and knock unconscious without death-by-natural-1 recovery consequences.
- Droids, vehicles, and objects should be immune to stun damage unless a specific ion/droid rule redirects it.

Open design question:

- The repo has a `stunThresholdRule` house rule that resembles part of RAW. We should decide whether that setting is misnamed/misclassified, or whether the system intentionally made stun threshold optional. Based on the pasted baseline, this should be RAW behavior, not an optional variant.

### 8. Damage Threshold architecture is mostly aligned, but some rule names are misleading

Evidence:

- `DamageEngine` explicitly documents that DT is a trigger, not damage reduction.
- `DamageResolutionEngine` applies mitigation first, then checks threshold.
- `ThresholdEngine.evaluateThreshold()` uses `damage >= dt`, matching meets-beats logic.
- The same threshold engine supports house rules like double threshold and persistent DT penalties.

Audit result: mostly strong.

Caveat:

- Stun threshold behavior is gated behind a house rule despite the skeleton rule saying stun damage equal/exceeding DT moves the target -2 CT.
- Because the threshold engine receives mitigated damage, we need a later rules decision for whether stun DT should compare against original stun damage, post-SR/DR stun damage, or post-halved HP damage. The pasted rule says before being halved.

### 9. Damage application is target-selected rather than attack-target-specific

Evidence:

- The chat Apply Damage button path calls `DamageSystem.applyToSelected(amount, { checkThreshold: true })`.
- That applies damage to currently selected tokens rather than necessarily applying to the original attack target.

Audit result: medium/high risk.

This may be intentional for GM control, but it has consequences:

- It supports table-style adjudication.
- It also makes per-target area outcomes, Evasion, stun immunity, and target-specific mitigation hard to automate unless the Apply Damage button carries target/outcome metadata.

Recommended later direction:

- Keep GM control, but provide target-aware optional buttons.
- Example: Autofire card can show `GM adjudicated - select affected targets, then choose Full/Half/None`.

### 10. Damage buttons lose too much attack context

Evidence:

- `templates/chat/holo-roll.hbs` damage action button stores only actor ID, weapon ID, critical flag, crit multiplier, and two-handed flag.
- `scripts/ui/chat/chat-interaction-bridge.js` reconstructs the actor and weapon, then calls `SWSERoll.rollDamage()` with only those limited flags.

Audit result: high risk.

Lost context examples:

- Burst Fire selected
- Rapid Shot selected
- Deadeye selected
- Mighty Swing selected
- Autofire/area attack
- hit or miss for area attack target
- target Evasion
- stun/ion special outcome
- target-specific damage type or mitigation notes
- ammo cost
- non-stacking extra-dice group

Expected later behavior:

- Attack chat should store a serialized `damageContext` snapshot under message flags or button data.
- Damage roll should consume that snapshot, not recompute from current UI state or lose the original attack option.

### 11. Mixed damage type handling is not clearly represented

Evidence:

- The damage type resolver can carry single and multiple damage type values in some attack contexts.
- Damage roll chat generally posts a single damage type string.
- Damage mitigation checks context text and weapon text for damage types.

Audit result: medium risk.

Impact:

- Mixed damage types such as energy/slashing or energy/piercing may not display or feed mitigation/talent interactions consistently.
- This matters for rules where an ability applies to any one component of a mixed damage effect and affects the whole damage result.

### 12. User-requested ranged-into-melee addendum belongs in later attack UI but is relevant to damage rider context

The user requested that when the ranged attack context dialog appears, there should be a `Firing into melee` checkbox that applies the normal -5 penalty.

Audit classification:

- This is primarily an attack-roll UI issue, not a damage roll issue.
- It still belongs in the damage audit ledger because several damage-driving ranged feats rely on the same attack context and because Precise Shot currently has nothing reliable to suppress.

Recommended later behavior:

- Ranged/thrown attacks should show a `Firing into melee (-5)` checkbox.
- If the actor has Precise Shot, the checkbox should either be disabled with a note or allowed but suppressed with a visible explanation.
- This should not use map automation by default.

### 13. Elusive Target should stay GM-adjudicated for now

The user also supplied Elusive Target context: when the defender is fighting in melee, ranged attackers take an additional -5 penalty against that defender, stacking with the normal -5 firing-into-melee penalty for a total of -10.

Audit classification:

- This is not a self-applied defense bonus.
- It is an attacker penalty based on defender state, melee engagement, and target selection.
- It should remain GM-adjudicated/manual in the near term.

Recommended later behavior:

- If the defender has Elusive Target, show a reminder badge on the target/defender summary and/or attack dialog when manually selected.
- Do not try to calculate adjacency/melee engagement automatically.
- Give the ranged attack dialog an optional `Target has Elusive Target (-5)` checkbox or a combined `Firing into melee / Elusive Target` helper.
- Let the GM/player decide when it applies.

## Severity summary

| Finding | Severity | Automation boundary |
|---|---:|---|
| Stun damage RAW incomplete | Critical | Automate |
| Evasion area damage not trustworthy | Critical | Automate after GM chooses affected target/outcome |
| Legacy Autofire/Burst helper unsafe if live | Critical if live | Replace/reroute later |
| Damage authority split | High | Architecture cleanup |
| Damage button context loss | High | Automate context preservation |
| Burst Fire miss/extra dice context fragile | High | Automate |
| Area critical depends on lost context | High | Automate |
| Firing into melee missing UI checkbox | High | Assist/GM-adjudicated trigger |
| Elusive Target | Medium/high | GM managed with manual checkbox/reminder |
| Mixed damage types | Medium | Automate later |
| Apply Damage uses selected tokens | Medium | Preserve GM control but add context-aware options |

## 0D conclusion

The repo has a good damage-resolution backbone for HP, mitigation, and Damage Threshold, but damage roll context is not reliable enough yet. The biggest immediate risks are not the base damage formula; they are context-loss seams around area attacks, Evasion, Burst Fire, stun damage, and chat damage buttons.

For future implementation, the damage phase should not attempt map automation. It should preserve roll context and provide GM-assisted damage choices: full, half, none, stun, nonlethal, and target-specific apply buttons.
