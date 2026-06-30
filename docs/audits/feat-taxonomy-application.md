# Feat Taxonomy Application Audit

Run:

```bash
node scripts/dev/audit-feat-taxonomy-application.mjs --strict
```

The audit verifies:

- `data/feat-catalog.json` and `packs/feats.db` contain matching feat counts.
- Every feat has a valid primary bucket and subbucket.
- Every active subbucket has at least two feats.
- `GM / Metadata` and source-review feats include explanatory reasons.
- Known false Force-keyword cases are not classified as Force feats.
- The separate source-review queue contains descriptions and proposed bucket/subbucket values.

Generated reports:

```text
docs/audits/generated/feat-taxonomy-application-report.json
docs/audits/generated/feat-taxonomy-application-report.md
```
