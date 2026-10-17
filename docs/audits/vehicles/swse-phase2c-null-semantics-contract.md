# SWSE Vehicle Phase 2C — Null Semantics and Evidence Contract

**Authority:** User clarification following Phase 2C Checkpoint 8. This is a data-model evidence rule; it does not replace the published SWSE sourcebooks or grant stock-weapon attack authorization.

## Rule

A persisted `null` is appropriate **only when the field and its entire nested structure have no known information**. A parent object with any verified descendant must remain an object. Unknown individual children of an otherwise known object may individually remain `null`; do not null out the parent.

There are four separate evidence states, and they must not be conflated:

| State | Persistence | Example |
| --- | --- | --- |
| Known quantity, including zero | Accurate scalar | `shieldRating: 0` for a printed unshielded ship |
| Explicit absence | Explicit absence/empty value matching the schema | `weapons: []` on an unarmed stock ship; `carried_craft: "None"` when printed as none; `vehicleHasCarriedCraft: false` |
| Source silent / genuinely unknown | `null` at the informationless field, or an explicit undecided evidence state; keep any known siblings | Action VI `vehicleHasNavicomputer: null` because its published line does not specify one; Consular-class `maxVelocityKmh: null` when no maximum velocity is printed |
| Property not stored in the historical snapshot | The key is **absent** and remains absent when recording historical observations | `observedState: "MISSING"` with no `observed` key in the CP8A/CP8B manifests |

An *unreviewed* field is **not** necessarily source-silent. Distinguish `NOT_REVIEWED` from `SOURCE_SILENT_CONFIRMED`, where the audit schema supports these states. Never infer `false`, `0`, `[]`, `"None"`, or a firing arc solely because a value is unknown. Conversely, never use `null` to erase an explicitly printed absence.

## Nested example

Correct (the `cost` parent has known children):

```json
{
  "cost": { "new": 98500, "used": 23000 },
  "vehicleHasNavicomputer": true,
  "vehicleHasAdvancedNavicomputer": null,
  "carried_craft": "None",
  "weapons": [{
    "id": "4d5b3422047f5eb8-weapon-1",
    "operatorStation": "gunner",
    "firingArc": "fixed-forward"
  }]
}
```

Incorrect: `cost: null` if either price is known; `weapons: null` on a printed unarmed ship; `carried_craft: null` when the source says none; `vehicleHasNavicomputer: false` merely because the source says nothing about the navcomputer.

The rule applies to persisted source/compendium/actor data. A **runtime function returning `null`** to indicate *no trusted binding* (for example `resolveTrustedStockAttackGroup()`) is a separate API-result convention and is intentionally unchanged.

## CP8 correction and audit record

- Four pilot source claims from *Starships of the Galaxy* strictly certified by Phase 2B CP16 remain the only scoped ship population.
- All four had `carried_craft: null` in the prior pack even though each printed profile certifies no carried craft. Changed to `carried_craft: "None"` with `vehicleCarriedCraftRaw: "None"`; the known false `vehicleHasCarriedCraft` remains false.
- `data/audits/vehicles/swse-phase2c-cp8-stock-pack-remediation-manifest.json`: **18** previously fake `observed: null` markers for `MISSING` historical fields removed.
- `data/audits/vehicles/swse-phase2c-cp8b-derived-metadata-remediation.json`: **8** more missing historical properties now omit their `observed` key.
- Historical `observedState: "NULL"` is still faithfully retained wherever old JSON truly contained `null`. Such historical evidence may reflect a now-corrected error (for example an old page/source value); it does **not** endorse that old null as valid under this contract.
- The CP8A read-only verifier now checks `observedState` and the *presence* of `observed`, preventing undefined-versus-null conflation.
- Post-hydration CP8C checks assert printed absence, unknown navcomputer state, populated parent objects and preserved unarmed arrays.

**Current pilot pack hashes after these changes:**

- `packs/vehicles-space-transports.db`: `65f516504a7ecfa007924e8161c3a876954f13d3`
- `packs/vehicles-capital-ships.db`: `8f333b91b684e90f50384dd61a39e5fa80b27994`

The remaining nullable fields were inspected against available ledger semantics. A null secondary URL means a URL has not been established; it does not negate a separately verified printed `sourcebook` and `page`. A null single-value estimated price does not invalidate separately known `cost.new` and `cost.used`.

## Constraints preserved

No modification installation rules, Pure/Modified state implementation, new ship variants, runtime stock attacks, invented unprinted capabilities or printed-source mutations are authorized by this clarification. D01/D02/D03 and D04-DENY remain unchanged. The stock attack authority remains empty.

## Regression commands (execute in a full repository checkout)

```sh
node --test tests/phase2c_cp8_remediation_manifest.test.mjs
node --test tests/phase2c_cp8_post_hydration.test.mjs
node tools/audits/vehicles/verify_phase2c_cp8_post_hydration.mjs --repo-root .
```

Independent GitHub source/pack readback was performed. The full Node suite and a live Foundry V13 test have **not** been run in this environment; do not conflate readback with executable test certification.
