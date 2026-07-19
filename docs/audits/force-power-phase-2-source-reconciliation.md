# Force Power Phase 2 — Source Reconciliation

Phase 2 inventories the entire Force power pack and records printed-source findings separately from implementation data.

## Authority model

The printed sourcebooks are authoritative. Existing compendium text, tags, `dcChart`, runtime name handlers, and wiki-derived summaries are evidence to compare, not rules authority.

A power is source-authoritative only when it has a record in:

`data/force/force-power-source-reconciliation.json`

and that record contains:

```json
{
  "sourceVerified": true
}
```

Everything else remains `unreviewed` in the generated inventory.

## First reviewed batch

The first batch concentrates on the largest known rules drift in the core Force powers:

### Critical drift

- Farseeing
- Force Disarm
- Move Object
- Rebuke
- Surge
- Vital Transfer

### Major drift

- Battle Strike
- Force Grip
- Force Lightning
- Force Slam
- Force Stun
- Force Thrust

Force Lightning retains its tiered damage progression. Its confirmed damage-type correction is `force`.

## Severity meanings

- `critical`: the current record describes a materially different power or resolution model.
- `major`: formula, damage type, targeting, defense, scaling, duration, or a major rider differs.
- `moderate`: an important resource option, rider, or secondary behavior is absent.
- `minor`: wording, tags, metadata, or display differs without changing the principal mechanic.
- `none`: source-aligned.
- `unreviewed`: inventory only; no rules conclusion has been reached.

## Generated audit

Run:

```bash
node tools/audit-force-power-source-reconciliation.mjs
```

The audit reads every JSONL record in `packs/forcepowers.db` and emits:

- `docs/audits/generated/force-power-source-reconciliation-audit.json`
- `docs/audits/generated/force-power-source-reconciliation-audit.md`

The generator fails when a reviewed source record has no exact pack-name match. This prevents corrections from being attached to the wrong power or silently orphaned by naming drift.

## Phase boundaries

Phase 2 does not rewrite the compendium and does not change runtime behavior.

Later implementation phases consume reviewed records in priority order:

1. critically wrong non-damage powers
2. incorrect or dead modifier automation
3. healing and mitigation
4. straightforward damage
5. condition-track and conditional damage
6. complex multi-mode powers

No power may be marked automation-ready solely because the audit inferred a likely behavior from its current tags or prose.
