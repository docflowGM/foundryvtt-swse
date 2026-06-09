# Combat Phase 0C — Meets-Beats / Strict Comparison Audit

Audit-only pass. No runtime files were changed.

## Rule principle

For SWSE attack rolls and DC-style checks, the default rule is:

> Meet or exceed succeeds.

Examples:

- Attack total 18 vs Reflex Defense 18 = hit.
- Skill check total 15 vs DC 15 = success.
- Critical confirmation total equal to target defense = confirmed.
- Opposed checks use `>=` where the specific rule says the actor succeeds if they equal or exceed the opposing result.

## Attack/DC checks reviewed in 0C

| File | Evidence | Status | Notes |
|---|---|---|---|
| `scripts/combat/rolls/attacks.js` | `roll.total >= targetReflex` | Pass | Canonical normal attack path uses meets-beats. |
| `scripts/combat/rolls/attacks.js` | narration helper uses `attackRoll.total >= targetReflex` | Pass | Secondary narration path also uses meets-beats. |
| `scripts/combat/rolls/enhanced-rolls.js` | Autofire target comparison uses `roll.total >= targetReflex` | Pass on comparison | The helper itself has other serious issues, but not strict-greater hit comparison. |
| `scripts/combat/rolls/enhanced-rolls.js` | Enhanced full attack comparison uses `roll.total >= targetReflex` | Pass | Older path; main full attack executor delegates to canonical rollAttack. |
| `scripts/rolls/roll-config.js` | Critical confirmation uses `roll.total >= targetDefense` | Pass | Correct comparison operator. |
| `scripts/rolls/skills.js` | `roll.total >= dc` | Pass spot-check | Broader skill system appears to use meets-beats. Full skill audit belongs outside 0C. |
| `scripts/rolls/saves.js` | `saveRoll.total >= dc` | Pass spot-check | Save/DC comparison appears correct. |
| `scripts/engine/combat/combat-executor.js` | `attackRoll >= targetDefense` | Pass spot-check | Older combat executor comparison is correct. |
| `scripts/engine/combat/reactions/reaction-registry.js` | reaction checks use `total >= attackTotal` or `total >= dc` | Pass spot-check | Block/Deflect-style reactions appear to use meets-beats. |
| `scripts/combat/systems/grappling-system.js` | grapple opposed-check flow previously flagged in 0A/0B | Fail / later audit | Grapple still needs dedicated opposed-check audit and live routing trace. |
| `scripts/engine/combat/starship/enhanced-pilot.js` | strict `pilotCheck > targetPilotCheck` found by search | Flag for later | Starship opposed checks are outside 0C but should be included in later combat-wide strict-comparison pass. |
| `scripts/rolls/roll-config.js` | concealment uses `roll.total > missChance` | Not a DC issue | Concealment percent check is not a “meets beats a DC” comparison. |

## 0C conclusion

The main attack-vs-defense path already respects the user-confirmed “if it meets, it beats” rule.

The strict-comparison risk is now concentrated in:

1. Grapple and opposed combat maneuvers.
2. Starship opposed checks.
3. Any old helper or isolated subsystem not using canonical `rollAttack()` / `rollSkillCheck()`.

## Recommendation for later phases

Create a reusable helper for DC/defense comparisons:

```js
function meetsOrBeats(total, target) {
  return Number.isFinite(Number(total)) && Number.isFinite(Number(target)) && Number(total) >= Number(target);
}
```

Use it for clarity in attack, skill, save, opposed-check, and confirmation code. This avoids future accidental `>` regressions.
