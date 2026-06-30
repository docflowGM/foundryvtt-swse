# Core Rulebook Feat Implementation Readiness Audit

Run:

```bash
node scripts/dev/audit-core-rulebook-feat-implementation-readiness.mjs --strict
```

The audit validates the Core Rulebook feat implementation backlog and the source-review list.

It checks that every entry has:

- source-derived description/benefit summary
- expected implementation mode
- implementation home
- observed implementation metadata
- accuracy status
- rationale
- corrective action where needed

It also emits:

- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.md`

## Important distinction

`implemented` is not enough. This audit tracks whether a feat appears to be implemented correctly.

For example, a feat that grants a special attack option is not correct if it is only modeled as a static sheet modifier. The expected implementation mode must match the source benefit.
