# Claude/Codex prompt — Phase 5 Scavenger's Guide to Droids feat parity

## Non-negotiable behavior

You must follow these principles:

1. Think before coding.
2. Simplicity first.
3. Surgical changes only.
4. Goal-driven execution.

Do not rewrite unrelated droid systems. Do not invent a general droid workbench. Do not convert contextual droid feats into passive static bonuses.

## Task

Run and satisfy:

```bash
node scripts/dev/audit-scavengers-droids-feat-parity.mjs --strict
```

Use the manifest at:

```text
data/feat-source-parity/scavengers-droids-feat-parity-manifest.json
```

## Expected result

The current feat catalog and pack should contain all Scavenger's Guide to Droids feat entries and preserve their sourcebook attribution. The implementation metadata should keep runtime/contextual feats out of static sheet math.

## Implementation rules

- Action feats should become action-card or GM-confirmed workflow candidates, not passive bonuses.
- Damage Conversion and Ion Shielding should hook into damage/condition-track workflows only after GM confirmation exists.
- Droid Shield Mastery and Shield Surge require a shield subsystem and should not be implemented through derived defenses.
- Droid Focus requires selected droid-degree scope and should be repeatable only across different degrees.
- Logic Upgrade: Skill Swap belongs in progression/choice handling.
- Sensor Link is table-context metadata until there is a sensor-sharing UI.

## Out of scope

- Droid chassis/species implementation.
- Droid manufacturer traits.
- Droid equipment/accessory imports.
- Droid station automation.
- Droid codex stat block actorization.
- Droid-as-equipment/companion architecture.
