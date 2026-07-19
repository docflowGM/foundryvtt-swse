# Startup Regression Root Cause

The production entry point was truncated immediately after the `init` hook. The missing tail contained:

- the system `ready` hook
- `registerLegacyHandlebarsHelpers()`
- legacy `swse` namespace setting registration

The surviving `init` hook still called both missing functions. That raised a `ReferenceError` after sheet registration but before settings, infrastructure hooks, progression readiness hooks, and template preloading.

This single bootstrap failure explains most of the observed cluster:

- Holonet and lightsaber settings were never registered
- progression initialization was never registered
- Handlebars templates were never preloaded, causing the Holopad frame partial failure
- downstream registries ran against incomplete startup state
- the Extra Skill Uses pack appeared absent because the system manifest/bootstrap lifecycle never completed normally

A second startup issue existed in BAB calculation. `prepareDerivedData()` runs while Foundry is still inside `initializeDocuments`, but BAB calculation waited for a custom hook emitted from a `ready` handler. Since `ready` cannot occur until document initialization finishes, the wait could only time out.

The correction:

1. restores the complete bootstrap tail and ready lifecycle;
2. requires template preload success instead of silently continuing;
3. restores legacy helper and setting definitions;
4. makes early heroic BAB preparation nonblocking;
5. preserves exact nonheroic BAB during the early pass;
6. leaves authoritative heroic BAB calculation to the post-registry reconciliation pass;
7. adds source-level regression guards for every required bootstrap seam.
