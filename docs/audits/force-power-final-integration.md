# Force Power Final Integration

This pass closes the planned core Force-power phases and replaces direct hook-level installation of Phases 3–6 with one integration entry point.

## Consolidated installation

`installFinalForcePowerIntegration()` now owns runtime installation order:

1. critical non-damage corrections
2. modifier automation
3. healing outcomes
4. direct damage outcomes
5. condition-track and complex assisted plans

This does not delete the phase modules. They remain focused implementation units, but hooks no longer know about each individual phase.

## Force Stun

Force Stun now resolves against Will Defense and moves the target down the condition track by:

- 1 step when the check meets Will
- 1 additional step for every 5 points by which the check exceeds Will
- 1 additional step when the printed Force Point option is selected

The condition-track mutation routes through `ActorEngine.updateActor()`.

## Force Thrust

Force Thrust now returns an explicit opposed-movement plan rather than a generic condition or damage effect. The plan records:

- Use the Force check total
- Strength-check opposition
- source-directed movement
- whether a collision occurred
- whether collision damage still requires resolution

Movement geometry and collision damage remain assisted because they depend on canvas position, intervening objects, and GM adjudication.

## Force Grip

Force Grip now returns a sustained damage/action-restriction plan with:

- Fortitude Defense
- maintenance state
- required reroll on maintenance
- Force Point option state
- explicit markers for unresolved damage tiers and action restriction

No unsupported generic stunned effect is created.

## Move Object

Move Object now has a multi-mode outcome plan that records:

- size tier from the Use the Force result
- primary and optional secondary targets
- Will resistance for unwilling targets
- Reflex Defense for the second target attack
- whether both targets can take damage
- concentration and resource-option state

The resolver intentionally remains assisted for movement placement, object mass validation, attack confirmation, and final damage because those depend on scene geometry and user choices.

## Completion boundary

The core source-reviewed powers now have one of three explicit statuses:

- automatic: the runtime can apply the outcome safely
- assisted: the runtime creates a complete adjudication plan without inventing scene decisions
- deferred: source or runtime prerequisites are still missing

This removes silent fake automation. Complex powers no longer write generic effects that misrepresent their printed rules.
