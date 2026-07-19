# Force Power Phase 3 — Critical Corrections

Phase 3 corrects the four highest-priority non-damage powers whose current behavior materially differs from the printed rules:

- Surge
- Rebuke
- Force Disarm
- Farseeing

## Runtime behavior

`phase3-force-power-corrections.js` installs a guarded override into `ForcePowerEffectsEngine` during Force-power hook initialization.

### Surge

Surge no longer routes through the legacy damage-bonus handler. It creates source-aligned ModifierEngine intents for:

- Jump
- speed

The modifier values are selected from the verified DC tiers.

### Rebuke, Force Disarm, and Farseeing

These powers are marked as assisted automation because their full behavior requires interaction models that do not yet exist:

- reacting to another Force-power check and redirecting it
- substituting a Force check into the complete disarm combat procedure
- choosing a known creature, checking its Will Defense, and adjudicating narrative information

The Phase 3 correction layer deliberately returns no generic ActiveEffect for these powers. This prevents their previous incorrect daze, generic-control, or sense effects from being applied.

## Compendium migration

Run the deterministic migration:

```bash
node tools/migrate-phase3-force-power-corrections.mjs --write
```

The migrator:

- requires exact matches for all four power names
- writes verified `system.resolution` data
- replaces materially incorrect summary/effect text
- corrects tags and action metadata
- rewrites Surge's DC chart
- refuses to continue when any expected power is absent

Run without `--write` for a dry-run verification.

## Scope limits

This phase does not implement automatic Rebuke prompting/redirection, full disarm resolution, Farseeing target history, or Force Point option execution. Those mechanics remain clearly marked `partial` rather than being represented by incorrect generic effects.
