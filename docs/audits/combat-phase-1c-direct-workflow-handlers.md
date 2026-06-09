# SWSE Combat Phase 1C - Direct Workflow Handler Hardening

Runtime implementation phase. This pass continues the Phase 1B thin workflow SSOT work by moving the safest workflows out of recursive legacy routing and into direct registered handlers.

## Scope

No combat rule corrections were attempted in this phase.

This pass only hardens routing/context alignment for workflows that already had usable authorities:

- Full Attack
- manual/reference combat actions
- skill-backed combat actions
- canonical attack context handoff into attack result/chat metadata

## What changed

### Character sheet workflow handlers

`character-sheet.js` now builds a dedicated handler table for the `CombatWorkflowRegistry` with direct handlers for:

- `fullAttack`
- `manual`
- `reference`
- `skillAction`

Other workflow modes still fall back to the legacy adapter while carrying the normalized `combatContext` forward.

This keeps the shim thin and avoids replacing existing authorities.

### Full Attack routing

Full Attack actions now route directly from the workflow registry to `FullAttackExecutor.execute()` instead of re-entering the large legacy combat action method first.

The workflow context is passed into `FullAttackExecutor` so later phases can preserve package/action/source details across attack results and damage buttons.

### Manual/reference routing

Manual and reference actions now resolve through a direct workflow handler that:

1. derives the action economy type;
2. spends action economy when `spendAction !== false`;
3. announces the manual action through the existing chat-card path.

This keeps GM-managed actions honest without pretending they are fully automated.

### Skill action routing

Skill-backed combat actions now route through a direct workflow handler that:

1. resolves the skill key;
2. opens the Roll Configurator V2 dialog;
3. spends action economy after confirmation;
4. rolls the skill check with combat workflow context preserved.

### Attack context preservation

Canonical weapon attacks now summarize and carry the workflow context into:

- SWSE chat flags under `flags.swse.workflowContext`;
- roll render context under `context.workflowContext`;
- canonical attack result under `attackResult.workflowContext`;
- enhanced roll wrapper result under `workflowContext`.

This is intentionally a lightweight serializable summary, not the full sheet/actor/document object graph.

## What this phase deliberately did not fix

- Burst Fire rules
- Autofire rules
- ammo enforcement
- stun/ion damage
- natural 1/expanded crit handling
- action economy substitution math
- grapple state fidelity
- healing/repair packets
- damage packet modeling

Those are later phases. Phase 1C only makes the workflow road safer.

## Next recommended phase

Phase 1D should harden action economy through the workflow layer:

1. audit/fix full-round action spending so it consumes standard + move + swift as RAW;
2. audit/fix action substitution direction;
3. make workflow actions ask the ActionEngine for spend/availability previews instead of guessing;
4. expose availability reasons to the combat UI without changing rule content yet.
