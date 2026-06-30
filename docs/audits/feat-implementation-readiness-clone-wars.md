# Clone Wars Campaign Guide Feat Implementation Accuracy Audit

Run:

```bash
node scripts/dev/audit-clone-wars-feat-implementation-readiness.mjs --strict
```

The audit verifies:

- all 20 Clone Wars Campaign Guide feat entries are present in the backlog,
- every non-correct feat appears in the review list,
- every entry has a description, proposed bucket/subbucket, expected rule shape, observed implementation, and accuracy concern,
- feats with area/autofire/resource/conditional-defense metadata are not falsely marked fully correct before their runtime consumers exist.
