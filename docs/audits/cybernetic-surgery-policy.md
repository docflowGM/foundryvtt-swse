# Cybernetic Surgery Policy Audit

Run:

```bash
node scripts/dev/audit-cybernetic-surgery-policy.mjs --strict
```

This audit verifies that Cybernetic Surgery stays metadata/manual and does not become passive sheet math.

It checks:

- `data/cybernetics/cybernetic-surgery-policy.json` exists and declares the manual procedure policy.
- `data/feat-catalog.json` contains Cybernetic Surgery with metadata-only/procedure-reference classification.
- `packs/feats.db` mirrors the same Cybernetic Surgery metadata.
- Cybernetic Surgery has no enabled numeric modifiers.
- Implant Training remains separate from Cybernetic Surgery.
- The policy text includes a GM-facing consult-source note.

This phase intentionally does not add a cybernetics workbench.

## Phase 4C Gear Partial Addendum

The audit now also verifies that the Gear tab includes a dedicated non-droid implant management partial. The partial is required to:

- render through `inventoryPanel.implantPanel`
- exclude droid actors
- expose active-state management actions
- route mutations through `InventoryEngine`
- avoid turning Cybernetic Surgery into passive sheet automation

This keeps implant state manageable from the actor sheet without broadening Cybernetic Surgery beyond metadata/manual source-rule reference.
