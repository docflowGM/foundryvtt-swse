# TI-4A report-only authority inventory — main@4392c90dc324a0474e9ca470c514f4ec1a8fcc37

Schema `ti4a-authority-inventory/1` · config `ti4a-authority-config/1` · report-only · 2227 files scanned (scripts, index.js).

Totals: **374** records — 157 direct writers, 163 delegated calls, 54 unresolved uses; **22** direct writers are UNCLASSIFIED (not in the Phase 0 census, not an authority file, not a documented exception); 72 delegated calls come from files outside the census (informational — calling an authority is the supported path).

## By protected family

| Family | direct writers | delegated calls | unresolved uses | read refs | writers: authority-internal / exception / Phase 0 / UNCLASSIFIED |
|---|---:|---:|---:|---:|---|
| credits | 29 | 54 | 7 | 13 | 7 / 3 / 18 / 1 |
| forcePoints | 58 | 35 | 9 | 22 | 3 / 4 / 45 / 6 |
| ammunitionFireState | 6 | 28 | 4 | 8 | 6 / 0 / 0 / 0 |
| actionEconomy | 0 | 12 | 0 | 0 | 0 / 0 / 0 / 0 |
| equipmentState | 0 | 0 | 0 | 0 | 0 / 0 / 0 / 0 |
| upgradeModificationState | 22 | 3 | 16 | 167 | 7 / 0 / 12 / 3 |
| progressionEntitlements | 8 | 7 | 9 | 28 | 3 / 0 / 2 / 3 |
| ownershipFollowersAssignments | 17 | 22 | 8 | 101 | 8 / 0 / 1 / 8 |
| gmApprovalState | 17 | 2 | 1 | 52 | 5 / 0 / 11 / 1 |

## Files with an UNCLASSIFIED direct writer

- `scripts/apps/minion-creator.js` — ownershipFollowersAssignments
- `scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js` — forcePoints, progressionEntitlements
- `scripts/apps/progression-framework/shell/mutation/progression-metadata-plan-builder.js` — progressionEntitlements
- `scripts/apps/progression-framework/shell/progression-finalizer.js` — forcePoints
- `scripts/apps/progression-framework/steps/attribute-step.js` — gmApprovalState
- `scripts/domain/droids/droid-converted-system-reconciliation-service.js` — upgradeModificationState
- `scripts/domain/droids/droid-modification-factory.js` — upgradeModificationState
- `scripts/domain/followers/follower-talent-detach-plan.js` — ownershipFollowersAssignments
- `scripts/domain/vehicles/vehicle-modification-factory.js` — upgradeModificationState
- `scripts/patches/follower-droid-garage-hotfix.js` — credits
- `scripts/patches/follower-orphan-transfer-hotfix.js` — ownershipFollowersAssignments
- `scripts/patches/follower-repeatable-entitlement-hotfix.js` — ownershipFollowersAssignments
- `scripts/sheets/v2/character-sheet/form.js` — forcePoints
- `scripts/utils/schema-adapters.js` — forcePoints

## Files outside the census with an unresolved use (surfaced, not judged)

- `scripts/apps/progression-framework/shell/progression-finalizer.js` — forcePoints
- `scripts/dialogs/entity-dialog/validation.js` — ammunitionFireState
- `scripts/domain/droids/droid-converted-system-reconciliation-classifier.js` — upgradeModificationState
- `scripts/domain/droids/droid-installation-reconciler.js` — upgradeModificationState
- `scripts/domain/droids/droid-installed-component-resolver.js` — upgradeModificationState
- `scripts/engine/abilities/passive/passive-adapter.js` — progressionEntitlements
- `scripts/engine/customization/modification-slot-authority.js` — upgradeModificationState
- `scripts/engine/customization/safety-engine.js` — upgradeModificationState
- `scripts/items/item-defaults.js` — ammunitionFireState
- `scripts/sheets/v2/character-like-sheet.js` — ownershipFollowersAssignments
- `scripts/sheets/v2/character-sheet/form.js` — forcePoints
- `scripts/sheets/v2/character-sheet/resource-editor.js` — forcePoints
- `scripts/sheets/v2/npc/npc-sheet-helpers.js` — credits, forcePoints
- `scripts/ui/shell/AlliesSurfaceService.js` — ownershipFollowersAssignments
- `scripts/utils/schema-adapters.js` — forcePoints

## Limitations

- Lexical analysis, not a JavaScript parser: no scope, type, or data-flow analysis.
- Aliases are not followed: `const p = "system.credits"; update({[p]: v})` is reported as unresolved-use at the literal, not as a write.
- Computed or concatenated paths (`"system." + key`, template literals with substitutions) are not resolved and can be missed (false negatives).
- Dynamic dispatch, `Reflect`, `eval`, bracket-notation property writes with non-literal keys, and writes inside generated code are invisible.
- Writes performed by other modules, macros, compendium/data scripts, templates (.hbs) or the Foundry core are out of scope; only scripts/ and index.js are scanned.
- A payload key (`"system.credits": v`) is treated as write-intent even if the object is never passed to an update call (possible false positive).
- A delegated call is reported at the call site; whether the callee behaves correctly is NOT assessed.
- Comments are excluded; string contents are kept (so a protected path inside a log message appears as unresolved-use).
- A bare identifier with a protected name (a local variable, parameter, or destructured binding) is treated as a local binding, not a field write; a write through a destructured or aliased object reference is a false negative.
- A payload-key lookalike (for example a type-coercion map `{ "system.credits": "number" }`) is reported as a payload-key write: lexical analysis cannot distinguish it (known false positive).
- Regex-literal and template-literal detection is heuristic; a lexing failure degrades to unresolved findings, never to silence.
