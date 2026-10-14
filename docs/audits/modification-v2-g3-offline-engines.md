# SWSE V2 Modification — G3 Offline Catalog, Planner and Legality Framework

**Gate:** G3 of the approved architecture (merged in #1039; G2 merged at `e7f8d904840bec3cc3abc7970a4c30ac4557dcbb`). **Offline, pure and unwired.** No Foundry runtime loading (G8), no executor or workbench (G6), no effect projection (G5), no cutover (G9). No existing file imports these modules; the generated data is never read by them — every function receives its data as an argument.

## Modules (`scripts/engine/customization/modification-v2/`)

| Module | Purpose |
|---|---|
| `modification-catalog.js` | Frozen, read-only index over a caller-supplied `swse.modification.runtime/1` document. Checks internal consistency (typed ids = parent + `::` + domain, boolean per-domain selectability, no parent-level flag, host eligibility never established) and fails closed. Copies the input. It **does not verify provenance or integrity** (`integrity: 'not-verified-by-catalog'`); that is the G8 loader's job. |
| `modification-price.js` | Tagged price mirror. Only a stated, non-negative credit amount is computable; `unknown`, percentage, multiplier, procedure, force-point, component and not-for-sale prices stay non-numeric. An unknown price is never 0 (D-006). |
| `modification-slot-closure.js` | Builds Phase 1a's `certifiedDefinitionLookup`. Answers for exactly the 49 accounting-eligible typed definitions; `upgradeKey` = typed id; `definitionId` in the returned object is the typed id, as Phase 1a validates it. |
| `modification-legality.js` | Fails-closed host-eligibility framework. Only a registered, named evaluator returning `legal`/`illegal` with non-empty evidence can establish anything. G3 ships no evaluators, so every answer is `not_established`. |
| `modification-planner.js` | Pure install/removal planner. Phase 1a is **injected** (it has no importer by contract and its guard test stays unchanged); `slotView()` is a read-only adapter exposing V2 instance records under the field names Phase 1a reads. |

## Plan output (`planVersion: 1`)

`operation`, `typedDefinitionId`, `definitionId`, `domain`, `executable`, sorted `blockers` (`{code, detail}`), `deferrals` (open register entries with classification and component), `price`, `slotImpact` (`total/used/free/cost/freeAfter`, all null unless Phase 1a certified), `host`.

Blocker codes: `OPERATION_INVALID`, `CATALOG_MISSING`, `DEFINITION_UNKNOWN`, `ITEM_INVALID`, `ITEM_DOMAIN_UNKNOWN`, `DOMAIN_MISMATCH`, `NOT_SELECTABLE`, `EXCLUDED_SCOPE`, `NOT_INSTALLABLE_CANDIDATE`, `NON_GENERAL_POOL`, `COMPONENT_UNVERIFIED`, `INSTALL_PROCEDURE_NOT_SPECIFIED`, `OPEN_REGISTER_ENTRY`, `HOST_NOT_ESTABLISHED`, `HOST_ILLEGAL`, `PRICE_UNKNOWN`, `PRICE_NOT_COMPUTABLE`, `SLOT_COST_UNCERTIFIED`, `SLOT_STATE_UNRESOLVED`, `SLOT_OVERFLOW`, `REMOVE_INSTANCE_ID_INVALID`, `REMOVE_INSTANCES_NOT_ARRAY`, `REMOVE_INSTANCE_RECORD_MALFORMED`, `REMOVE_INSTANCE_ID_DUPLICATE`, `REMOVE_INSTANCE_NOT_FOUND`, `REMOVE_INSTANCE_MISMATCH`, `REMOVE_INSTANCE_DOMAIN_MISMATCH`, `EXECUTOR_NOT_CERTIFIED`.

Removal identity (review correction): an installed identity is exactly `{ instanceId, typedDefinitionId, domain }`, each a non-empty string with a known domain consistent with the typed id's `::domain` suffix. Removal is refused when the requested `instanceId` is empty or not a string, the container is not an array, any record on the host is malformed, any instance id is duplicated, there is not exactly one matching record, or the matching record's `typedDefinitionId` or `domain` disagrees with the request or the host Item.

## Interim policy encoded

Plans are descriptions, diagnostics, cost information and read-only planning (architecture 9.2). `EXECUTOR_NOT_CERTIFIED` is always present until gate G6 supplies an executor with a proven all-or-nothing mutation strategy (the `TransactionEngine` snapshot-failure limitation, architecture 5.5), so `executable` is **always false** in G3. Removal is as blocked as installation: the removal procedure is part of the uncertified D-001. With the real catalog every one of the 232 typed definitions is `NOT_SELECTABLE` and `HOST_NOT_ESTABLISHED`. After the D-001 resolution, 76 have a verified `installProcedure` and 156 still carry the open D-013 entry.

## What the tests prove (`tests/modification-v2-offline.test.mjs`)

Catalog counts (186/232/49/0) and immutability; fail-closed on tampered documents; price tagging; the closure answers for exactly 49 ids and, through the adapter, lets the real Phase 1a certify a recorded installation (and refuses without it); legality failure modes; no real definition is executable; stable reason codes; refusal (never a throw) for bad arguments; removal requires the exact instance; determinism and non-mutation of frozen inputs; and, on a **synthetic** fully certified definition, that only `EXECUTOR_NOT_CERTIFIED` remains while overflow, host verdicts, price kinds and slot-authority failures each produce their own blocker. Static guards: the modules contain no engine, Foundry, I/O, clock or random access and import only each other; no runtime file imports them.

## Not done

No loader, executor, atomic transaction strategy, workbench, effect projection or consumer re-pointing. Specialist legality evaluators are not written (they need specified host requirements). D-001 remains `PENDING_SOURCE_VERIFICATION` (see `d-001-install-remove-source-examination.md`, PR #1041).
