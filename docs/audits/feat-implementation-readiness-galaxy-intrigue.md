# Galaxy of Intrigue Feat Implementation Readiness Audit

Run:

```bash
node scripts/dev/audit-galaxy-intrigue-feat-implementation-readiness.mjs --strict
```

The audit validates the Galaxy of Intrigue implementation backlog and source-review list.

It checks that every feat has:

- source-derived description/benefit summary
- expected implementation mode
- implementation home
- observed implementation metadata
- accuracy status
- rationale
- corrective action where needed

## Accuracy standard

`implemented` is not enough. A feat must be implemented in the correct mechanical shape.

Examples:

- A reaction feat needs a reaction prompt/resource/duration workflow.
- A Skill Challenge feat needs a Skill Challenge runtime hook, not static skill math.
- A table-positioning feat may remain partial if line of sight, range, ally targeting, or map context is not proven.
