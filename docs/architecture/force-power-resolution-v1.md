# Force Power Resolution Schema v1

Phase 1 establishes the data contract only. It does not rewrite the Force power compendium and does not change live Force power execution.

## Authority

`system.resolution` is authoritative only when present with `version: 1`.

Legacy records continue to work through `getForcePowerResolution()`, which creates a conservative compatibility projection from existing fields. Compatibility projections are always marked:

- `automation.status: "metadata"`
- `automation.reviewRequired: true`
- `source.verified: false`

No compatibility projection is permitted to claim rules-complete automation.

## Resolution families

The schema supports:

- fixed DC tiers
- checks against a defense
- opposed checks
- margin-of-success outcomes
- attack substitution
- reaction-opposed resolution
- powers with no check

## Outcome families

Outcomes are typed independently of the power's primary behavior. A power can therefore combine damage, conditions, movement, modifiers, mitigation, information, or other effects without flattening everything into one generic effect string.

## Force damage

`force` is a valid damage type when the printed source explicitly identifies Force damage. The system must not infer Force damage merely because the source is a Force power.

## Automation gate

A power may use `automation.status: "ready"` only when:

- source data has been verified
- `automation.reviewRequired` is false
- all damage outcomes have formulas
- modifier outcomes identify category, target, and amount

## Phase boundaries

Phase 1 adds:

- the JSON Schema
- the runtime compatibility adapter
- semantic validation
- representative fixtures and tests

Phase 1 intentionally does not:

- rewrite `packs/forcepowers.db`
- replace current ForceExecutor behavior
- remove `dcChart`, `effect`, `damage`, or other legacy fields
- claim that legacy heuristic classifications are source-verified
