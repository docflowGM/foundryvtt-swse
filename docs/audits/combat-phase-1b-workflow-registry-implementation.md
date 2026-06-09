# SWSE Combat Phase 1B - Workflow Registry Implementation

Runtime implementation phase. This pass adds the first thin combat workflow SSOT layer without rewriting attack, damage, grapple, healing, ammo, or state rules.

## What was added

Phase 1B added a new workflow shim under:

```text
scripts/engine/combat/workflow/
```

Files:

- `combat-action-normalizer.js`
- `combat-context-builder.js`
- `combat-workflow-result.js`
- `combat-workflow-registry.js`

## Design intent

The new layer is an orchestrator/registry, not a combat rules replacement.

It owns:

- action metadata normalization;
- workflow mode inference;
- context object creation;
- workflow handler lookup;
- structured result wrapping;
- safe fallback to legacy/specialized authorities.

It does not own:

- attack math;
- damage math;
- full attack sequencing;
- feat/talent option rules;
- ammo accounting;
- Second Wind rules;
- grapple rules;
- healing/repair rules;
- actor mutation;
- map/LoS/AoE enforcement.

## Current routing model

The character sheet combat action path now enters `CombatWorkflowRegistry` first. The registry normalizes the action, builds a shared context, then hands execution back to the existing sheet execution adapter.

This is intentionally conservative. Existing runtime behavior remains behind the old sheet execution path, but actions now pass through a single context-preserving shim before execution.

## Mapper alignment

`CombatActionsMapper` now preserves important routing fields instead of flattening them away:

- `resolutionMode`
- `executable`
- `manualResolution`
- `gmManaged`
- `automationBoundary`
- `spendAction`
- `contextTags`
- `requiredContext`
- `resources`
- `ruleData`
- source metadata
- raw system payload

This lets future phases activate existing feat/talent/action metadata rather than reconstructing context from UI strings.

## Why this is intentionally thin

The Phase 0/1A audits showed that the repo already has many partial SSOTs. Replacing them would create a parallel combat engine. Phase 1B instead creates the missing aggregator layer that can call those existing authorities consistently.

## Next safe phase

The next phase should harden the registry routing one handler at a time:

1. move Full Attack from legacy adapter to a direct registered handler;
2. move manual/reference actions to a direct registered handler;
3. move skill actions to a direct registered handler;
4. make attack context survive into chat/damage buttons;
5. only then begin rules corrections such as Burst Fire, Autofire, Stun/Ion, Fight Defensively, and Grapple.
