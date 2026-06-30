# KOTOR Feat Implementation Readiness Audit

This audit is generated from:

- `data/feat-implementation/kotor-feat-implementation-backlog.json`
- `data/feat-implementation/kotor-feat-implementation-review-list.json`
- `scripts/dev/audit-kotor-feat-implementation-readiness.mjs`

Run:

```bash
node scripts/dev/audit-kotor-feat-implementation-readiness.mjs --strict
```

## Results

- Total feats audited: 20
- Review entries: 14

## Status counts

- implemented_correct: 6
- implemented_partial: 14

## Review list policy

Every feat that is not `implemented_correct` must appear in the review list with:

- feat name
- description / benefit summary
- proposed bucket
- proposed subbucket
- proposed implementation mode
- expected rule shape
- observed implementation
- accuracy concern
