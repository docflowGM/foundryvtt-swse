# Implant Store Catalog Audit

Run:

```bash
node scripts/dev/audit-implant-store-catalog.mjs --strict
```

The audit checks that all eight source-listed implants exist in the implant reference catalog, sample item data, equipment-tech pack, aggregate equipment pack, store description dataset, and store category wiring.

Expected result: `199 ok, 0 errors`.
