# Implant Effects Audit

Run:

```bash
node scripts/dev/audit-implant-effects.mjs --strict
```

The audit verifies:

- the implant effect rules module exists;
- all eight catalog implants have effect metadata;
- Sub-electronic Converter is metadata/manual except for Will Defense penalty;
- runtime hook files reference `ImplantEffectRules`;
- pack entries and sample items carry implant effect identifiers.
