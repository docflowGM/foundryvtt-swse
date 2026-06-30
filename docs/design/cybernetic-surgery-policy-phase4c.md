# Implants Phase 4C: Cybernetic Surgery Policy

Phase 4A implemented the narrow implant penalties. Phase 4B exposed implant tagging and actor visibility. Phase 4C locks down the adjacent Cybernetic Surgery feat so it cannot accidentally become fake passive automation.

## Decision

Cybernetic Surgery is a **manual GM/player procedure reference**.

It is not a passive modifier, not a static actor effect, and not an automatic installation button. The feat tells the table that the character can perform cybernetic installation procedures using the source rules.

## Why this is different from Implant Training

Implant Training has simple runtime consequences that the system can implement safely:

- suppress the normal implant Will Defense penalty
- suppress the extra condition-track step from active implants

Cybernetic Surgery is different. It involves a procedure: target, surgeon, tools, time, Treat Injury check, failure/retry handling, and item installation. That is GM-facing workflow state, not static math.

## Runtime policy

Cybernetic Surgery should remain classified as:

```text
implementationStatus: manual_gm_player_procedure_reference
mechanicsMode: procedure_reference
applicationScope: cybernetic_installation_procedure
staticSheetPolicy: exclude
rulesAutomationPolicy: no_passive_automation
```

GM/player note:

```text
Cybernetic Surgery is a medical procedure, not a passive modifier. Use the source rules with your GM for time, tools, Treat Injury checks, failure/retry handling, and what item becomes installed.
```

## Guardrails

- Do not grant a static actor bonus from Cybernetic Surgery.
- Do not automatically install cybernetics or implants when the feat is acquired.
- Do not classify generic cybernetics or prostheses as KOTOR-style implants unless an item is explicitly tagged as an implant.
- Do not apply Implant Training benefits through Cybernetic Surgery.
- Do not put Cybernetic Surgery into defense, skill, attack, damage, or condition-track aggregators.

## Future optional work

A future cybernetics procedure tracker could be useful, but it should be its own subsystem:

```text
scripts/engine/cybernetics/CyberneticProcedureEngine.js
scripts/apps/cybernetics/cybernetics-workbench.js
templates/apps/cybernetics/cybernetics-workbench.hbs
data/cybernetics/procedure-rules.json
```

That future app should track surgeon, patient, item, tools, elapsed time, Treat Injury result, failure/retry state, and final GM-confirmed installation. It should not replace GM adjudication.

## Gear Tab Implant Partial

Phase 4C also adds a dedicated non-droid Gear tab implant management partial:

```text
systems/foundryvtt-swse/templates/actors/character/v2/partials/gear/implants-panel.hbs
```

This partial is intentionally actor-sheet UX for explicit implant state, not a Cybernetic Surgery workflow. It appears only for non-droid actors and surfaces:

- current Implant Training status
- active implant penalty summary
- tagged implant rows
- tag/untag, install/uninstall, and activate/deactivate actions
- an empty-state note explaining that generic cybernetics/prostheses should remain untagged unless the GM wants implant drawbacks to apply

All mutation buttons route through `InventoryEngine` methods instead of direct item updates:

```text
InventoryEngine.toggleImplantTag
InventoryEngine.toggleImplantInstalled
InventoryEngine.toggleImplantActive
```

The purpose is to give players and GMs one obvious management home while preserving the rules boundary: Cybernetic Surgery remains a manual medical procedure, and implants remain explicit tagged equipment.
