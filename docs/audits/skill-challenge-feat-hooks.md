# Skill Challenge Feat Hooks Audit - Phase 3.5E

This audit verifies that the Skill Challenge feat hook layer is present without polluting static actor math.

## Expected behavior

- Skill Challenge feats are represented as runtime hooks.
- Skill Challenge feats remain excluded from static sheet math.
- GM confirmation is required for every hook.
- Once-per-challenge usage is stored on the Skill Challenge state object.
- Last Resort records a reroll opportunity; it does not roll automatically.
- Recovery removes a failure only when the GM applies the feat from the tracker.
- Catastrophic Avoidance only appears when a catastrophic failure preview exists for the acting hero.

## Run

```bash
node scripts/dev/audit-skill-challenge-feat-hooks.mjs --strict
```
