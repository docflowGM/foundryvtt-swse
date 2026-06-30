# Implant Content Readiness Audit

Run this audit after applying Phases 4A through 4D:

```bash
node scripts/dev/audit-implant-content-readiness.mjs --strict
```

The audit verifies that:

- `ImplantRules` remains the runtime authority.
- The Gear tab implant panel from Phase 4C exists.
- Implant reference data requires explicit tags.
- Generic cybernetics, prosthetics, biotech, and droid systems are not implants by default.
- Sample test items demonstrate active implant, inactive implant, and non-implant cybernetic cases.
- Cybernetic Surgery remains manual/source-referenced and excluded from static sheet automation.

Generated reports:

```text
docs/audits/generated/implant-content-readiness-report.json
docs/audits/generated/implant-content-readiness-report.md
```

## Expected result

A clean strict audit should report zero errors. Warnings are treated as failures in strict mode.
