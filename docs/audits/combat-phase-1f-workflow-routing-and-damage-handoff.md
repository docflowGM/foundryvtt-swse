# Combat Phase 1F — Workflow Routing Completion and Damage Handoff Hardening

Runtime files changed in this phase. This remains Phase 1 road-building: no Burst Fire, Autofire, Grapple, Stun/Ion, or healing rule engines were rewritten.

## Purpose

The uploaded 1D/1E work made action economy and workflow context much safer, but the current repo snapshot still had a hard dependency seam: the character sheet imported the Combat Workflow Registry while the workflow folder only contained the serializer. This phase closes that gap and hardens the chat damage button handoff so later damage packet work receives the attack context instead of reconstructing it from button scraps.

## What changed

- Added the missing thin workflow modules:
  - `combat-action-normalizer.js`
  - `combat-context-builder.js`
  - `combat-workflow-result.js`
  - `combat-workflow-registry.js`
- The registry delegates to existing sheet/combat handlers; it does not replace combat math.
- Combat action mapping now preserves routing metadata instead of dropping it.
- Combat action fallback JSON and the combat-actions compendium DB now carry explicit routing metadata for the highest-risk core actions:
  - Attack (single)
  - Area Attack
  - Full Attack
  - Aid Another
  - Autofire
  - Burst Fire
  - Fight Defensively
  - Aim
  - Brace Autofire-Only Weapon
  - Reload
  - Second Wind
  - Charge
  - Disarm
  - Grapple / Grab
  - Feint
  - Tumble
  - First Aid / Revivify / Treat Injury
- Workflow summaries now include durable transport fields:
  - workflowId
  - contextTags
  - ruleData
  - stun/ion flags
  - top-level route/resource metadata
- Holo damage buttons and Full Attack damage buttons now include direct data attributes for:
  - workflowId
  - actionId
  - attackMode
  - contextTags
  - hit/miss
  - natural 1 / natural 20
  - areaAttack
  - burstFire
  - autofire
  - stun
  - ion
  - ammoCost
- Chat damage button handlers merge direct button data with encoded workflow context before calling `SWSERoll.rollDamage()`.
- Damage roll chat cards now preserve workflow context in message flags.
- The enhanced roll wrapper now correctly unwraps canonical attack results while preserving workflow context/action metadata.

## What this intentionally does not fix yet

- Burst Fire bonus damage or ammo spending.
- Autofire area damage and Evasion behavior.
- Stun/Ion packet math.
- Grapple state machine.
- Healing/repair resolution.
- Map-based area automation.

Those systems now have a safer route/context packet to consume in later phases.
