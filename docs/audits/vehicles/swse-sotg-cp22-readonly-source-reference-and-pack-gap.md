# SotG CP22 — Authoritative read-only source consumer and legacy pack quarantine

## Decision
The 15 owner-approved CP21 adjudications are now exposed through a **single canonical domain evidence read path**:

`scripts/domain/vehicles/vehicle-evidence-authority.js` → `vehicle-cp22-source-view.js` → generated `vehicle-cp22-source-catalog.generated.js`.

The generated module is deterministically compiled from the **immutable CP16 source ledger** and the **owner-approved CP21 manifest**, with no independently maintained in-code set of revised stat values. The compiler's `--check` mode enforces exact file content and the 13 legacy pack candidate identities. The catalogue lives under `scripts/` because the current ZIP packaging includes `scripts/` but not the historical audit `data/` source files.

### Supported read API

`resolveCP21ApprovedPublicationReference(sourceEntryKey)` returns cloned original printed facts, cloned original attack rows, and the approved **effective** view and policies. It verifies every field/row override preimage and returns strict read-only statuses:

- `APPROVED_PUBLICATION_REFERENCE_ONLY` for an approved identity and valid preimages.
- `NOT_VERIFIED_FOR_OPERATION` for unknown source keys or invalid authority/preimage.

All responses have `foundryStockAttackTrusted:false`, `mechanicalCertificationGranted:false`, `actorMutationAllowed:false`, `productionHydrationPermitted:false`, and no installed weapon binding.

This is the **published source read path**, not a second actor computation engine. Future verified source-to-actor hydration must consume this view (after authenticating installed compendium identity), rather than introducing a parallel calculator or trusting editable actor fields.

## Discovered legacy pack disparity (blocking automatic actor adoption)

Current repository vehicle packs contain legacy actor snapshots with `system.sourcebook: ""`, `system.page: null`, no canonical `stockSourceEntryKey`, and often incorrect or incomplete weapons/stats relative to the original book. Examples:

- Advanced V-19 legacy `initiative: "+5"` versus approved effective **+12**.
- Recusant legacy point-defense attack `+16/+14` versus approved detailed **+14/+12**; some damage rows also differ.
- Pellaeon legacy `flatFooted:14` already agrees with adjudication **14**, but some weapon damage rows differ from printed attack-group evidence.
- Immobilizer legacy vehicle is empty of its original weapon groups and has `reflexDefense:10`, not the printed **17**.
- TIE Bomber's legacy `initiative:"+4"` agrees with approved +4, but its source provenance is still absent.
- Starfighter and transport legacy pack entries may omit their published weapon rows entirely.

Therefore **name, pack id, document id, or an editable actor flag cannot certify a source binding**. The repo has 13 exact observed `pack+document ID+name` CP21 candidates. Marauder Corvette and Mon Calamari Star Defender do not have corresponding verified candidate mappings in this slice; neither is silently fabricated.

`inspectCP21LegacyPackCandidate()` is an informational, exact-tuple **warning only**. The Vehicle Import Wizard displays this warning in Preview and Confirm to prevent the false impression that the approved CP21 stats are already carried through the old packs. It does **not** change `VehicleImportEngine.buildImportPlan`, replace the actor's system fields, create or trust weapon rows, or write flags.

## Evidence preservation and regression

- Source PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- CP20: 100/100 source-fidelity records unchanged.
- CP21: all 15 approved adjudication decisions unchanged, including 17 historically absent weapon-row keys.
- Strict mechanical backlog: 100; four historical strict source certificates unchanged.
- Trusted Foundry stock weapon registry: **0**.
- Pure/Modified engine, compendium document bytes, actors, stock attack execution and native pack builder: **unchanged**.

Tests verify exact source copies versus ledger, each named effective override, defensive cloning, false source IDs, unchanged trusted stock group count, 13 pack hints, and warning-only UI wiring. Existing CP9A/CP9C tests are rerun.

## Next necessary phase (not accomplished here)

**CP23 authenticated pack reconciliation.** Rebuild per-source stock vehicle pack records from the CP16+CP21 source view without inventing missing mounts; establish immutable installed document and import transaction provenance; verify actor mutation invalidation, operator/crew assignments and station identities through the Pure/Modified instance architecture. Only then individually certify weapon mount topology/geometry and grant runtime attack authorization after real Foundry V13 E2E tests.

Do not flip the empty `vehicle-stock-attack-authority.js` registry simply because this read-only reference exists.
