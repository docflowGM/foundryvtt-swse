# P6B production sprint report

Branch `audit/universal-vehicles-phase1`, PR #1092 (draft). Offline only: Foundry V13 runtime was not available, so
everything below is `OFFLINE_INTEGRATED` / `LIVE_RUNTIME_PENDING`. Nothing is marked `LIVE_RUNTIME_VERIFIED`.
The deferred items are tracked one by one in `data/audits/vehicles/p6b-deferred-work.json`
(rendered: `p6b-deferred-work.md`). Rules questions are in `docs/audits/swse-rules-decisions-pending.md`.

## Counts (catalog 187)

| Status | Before P6B-1 | After P6B-3 |
|---|---|---|
| SOURCE_VERIFIED | 174 | 174 |
| MECHANIC_SPECIFIED | 39 | 54 |
| Installable | 39 | 54 |
| Operationally integrated (offline) | 39 | 51 |
| LIVE_RUNTIME_VERIFIED | 0 | 0 |
| Combat-usable weapons | 0 | 0 |

The 3 specified-but-not-applied rows are sensor arrays: Intelligence is computed and shown, but nothing reads it yet.

## Workstreams

| Workstream | Delivered | Tests |
|---|---|---|
| P6B-1 | regenerating shields (recharge 10), SLAM (+5/+10 Pilot to increase speed), navicomputer +5 / advanced +10 astrogation | p18 (7) |
| P6B-2 | cargo pods, sensor arrays, sensor enhancement package, extended range, hangar bays, cryogenic chambers | p19 (7) |
| P6B-3 | custom-built ships apply certified effects through the same authority as published ships; weapon execution stays closed (guard test) | p20 (6) |

## Backlog by unlock value

### 1. Owner rulings (each unlocks implemented-ready code)

| Ruling | Unlocks |
|---|---|
| V-P2-04 installed-weapon firing arcs | the whole weapon family (P6B-D-019, -009, -020, -003, -004): biggest unlock |
| V-P6A-03 launcher capacity and cost basis | launchers, ammunition loading and expenditure (P6B-D-019) |
| V-P6-02 replacing an existing system | 6 sublight drives; shield/hyperdrive replacement (P6B-D-002) |
| V-P6-01 bulkhead HP rounding | 3 reinforced bulkheads (P6B-D-001) |
| V-P6B-02 unit conversions | cargo pods and extended range on most hulls (181 kg-cargo hulls, 279 week/month/year hulls); smuggler compartments (P6B-D-010) |
| V-P6B-03 slave-circuit rounding | 3 slave circuit rows (P6B-D-013) |
| V-P6B-01 limited navicomputer | 1 row (P6B-D-005) |
| V-P6-03 stacking of same-kind systems | second armor/jets/shields (already fail-closed) |

### 2. Missing source evidence (PDF checks)

- Escape pods: size restriction column vs prose, fractional per-bay count (P6B-D-011).
- Passenger seating/quarters, medical suite: "size modifier" capacity basis (P6B-D-012).
- 25 legacy accessory rows with unverified effect text (P6B-D-016); com jammers (P6B-D-007).

### 3. Engineering dependencies

- Jammers need a cross-vehicle temporary condition, starship-scale range and opposed checks (P6B-D-003).
- Combat thrusters need dogfight/maneuver eligibility and capital-weapon targeting (P6B-D-004).
- Droid repair team: condition-track automation; suggest a GM-prompted roll first (P6B-D-014).
- Action and narrative accessories with no consumer: jettison, transponders, cloaking, docking clamps, transceivers, luxury (P6B-D-015).
- Hangar/cryogenic occupancy roster (P6B-D-017); detachable cargo pod option (P6B-D-018).
- Custom frames: cargo/consumables base and structured speed modes (P6B-D-021, -022).

### 4. Live runtime testing (P6B-D-008)

Run in a V13 world: recharge shields with regenerating shields; SLAM speed check; astrogation and sensor rolls with
bonuses; cargo pod Dex penalty in Reflex/Initiative; a custom-built ship with shields/armor/jets showing and using
the effective values in combat; plus the P6A acceptance checklist.

### 5. Polish

- Navicomputer training clause has no consumer (P6B-D-006).

## Safety boundaries kept

- No weapon, launcher or ammunition installable; sealed entries keep `executable: false`; 0 trusted stock attack groups.
- The 429 canonical published identities are untouched; no world migration added.
- Unknowns refuse with a reason (`CARGO_UNIT_NOT_TONS`, `CONSUMABLES_UNIT_CONVERSION_UNRULED`,
  `CAPACITY_FRACTIONAL_FOR_HULL_SIZE`, `INTELLIGENCE_UNKNOWN`, ...); none becomes 0.
- Custom-ship effects apply only from an APPROVED, digest-verified construction record. Frame abilities come from the
  stock-frame table, never from editable actor data.
