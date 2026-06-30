# Skill Challenge Complete Audit

This audit verifies that Phase 3.5A through Phase 3.5F are present as one coherent subsystem.

Run:

```bash
node scripts/dev/audit-skill-challenge-complete.mjs --strict
```

The audit checks:

- Engine, state, rules, effects, store, roll adapter, and feat hook modules exist.
- GM Datapad and shell registrations are present.
- Skill rolls call the Skill Challenge roll adapter after canonical skill math.
- Chat buttons resolve through the adapter and remain GM-gated.
- The GM surface supports manual tracker state, effect controls, feat hooks, off-sheet/manual roll entries, and public summary posting.
- Skill Challenge feats remain excluded from static sheet math.

Expected result after Phase 3.5F:

```text
0 errors
```
