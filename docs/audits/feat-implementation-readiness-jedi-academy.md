# Jedi Academy Training Manual Feat Implementation Readiness Audit

Run:

```bash
node scripts/dev/audit-jedi-academy-feat-implementation-readiness.mjs --strict
```

This audit verifies:

- all eight Jedi Academy Training Manual feats are represented;
- every entry has description, proposed bucket/subbucket, expected rule shape, observed implementation, and accuracy finding;
- non-correct feats appear in the review list;
- misleading Force taxonomy is rejected for Fast Surge;
- Force Regimen Mastery and Keen Force Mind cannot be marked correct until their runtime hooks are proven.
