# Species Phase 4: Special Attribute Rules

This pass finishes the known species-choice follow-ups from Phase 3.

## Arkanian Offshoot

Arkanian Offshoot remains one species row. Its species details rail exposes the required `Genetic Engineering` choice:

- +2 Dexterity, -2 Constitution
- +2 Strength, -2 Constitution

The selection is committed into the pending species context and the species ability modifiers are applied from that selected profile.

## Republic Clone

Republic Clone no longer asks for its attribute emphasis in the species details rail. The Attribute step owns that interaction.

When Republic Clone is selected, the Attribute step starts in a species-fixed mode using the canonical clone array:

- STR 15
- DEX 13
- CON 10
- INT 12
- WIS 10
- CHA 8

The player then distributes two +1 increases, mirroring the level 4 attribute increase step. The implementation limits this to one +1 per ability by default, so the clone player chooses two different abilities.

If a player needs to use a normal attribute generation method instead, the Attribute step provides an override button. Clicking it switches back to normal attribute generation, records a zero-cost approval request in the GM Datapad approvals queue, whispers online GMs, and shows a local notification.

## Files touched

- `scripts/apps/progression-framework/steps/species-step.js`
- `scripts/apps/progression-framework/steps/attribute-step.js`
- `scripts/engine/progression/helpers/build-pending-species-context.js`
- `templates/apps/progression-framework/steps/attribute-work-surface.hbs`
- `packs/species.db`
- `data/species-canonical-stats.json`
- `data/species-traits.json`
- `data/species-traits-migrated.json`
