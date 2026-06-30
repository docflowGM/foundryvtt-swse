# Skill Challenge Roll Integration Audit

Run:

```bash
node scripts/dev/audit-skill-challenge-roll-integration.mjs --strict
```

The audit verifies that Phase 3.5D:

- hooks after canonical skill roll chat rendering,
- does not duplicate skill math,
- only offers active Skill Challenges,
- requires GM confirmation before tracker mutation,
- wires chat review buttons through the central chat interaction bridge,
- leaves Skill Challenge feat hooks for a later phase.
