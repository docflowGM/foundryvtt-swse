# Starships of the Galaxy Feat Implementation Readiness Audit

Run:

```bash
node scripts/dev/audit-starships-feat-implementation-readiness.mjs --strict
```

The audit verifies:

- Starships of the Galaxy feat presence in `data/feat-catalog.json` and `packs/feats.db`.
- Backlog entries have descriptions, expected implementation modes, observed status, and next steps.
- Starship Designer remains metadata-only and excluded from static sheet math.
- Starship Tactics and Tactical Genius remain partial until their maneuver-suite runtime systems are proven.

Generated outputs:

- `docs/audits/generated/starships-feat-implementation-readiness-report.json`
- `docs/audits/generated/starships-feat-implementation-readiness-report.md`
