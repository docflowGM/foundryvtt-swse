# Universal Vehicle Phase 2-B — Starships of the Galaxy

## Entire-book mechanical source staging

**Status:** 105/105 publication-specific records populated in universal vehicle schema v0.5. **Strict physical mount certification and runtime integration remain pending.**

This single checkpoint covers all 104 historical ship publication identities from `data/canonical/vehicles/ships.json` and the independently discovered Escape Pod (printed p50, physical scanned PDF p51). It retains printed values rather than backfilling guessed defaults, and attaches 258 historical source attack groups without inventing physical mounts or firing arcs.

| Measure | Result |
| --- | ---: |
| Source identities | 105 / 105 |
| Historical ship records reused | 104 |
| Newly transcribed Escape Pod | 1 |
| Printed source attack groups retained | 258 |
| Strict physical-weapon mount certifications newly granted | 0 |
| Production packs modified | No |
| Generated Foundry Actors modified | No |

## Data and authority

- Source census: `data/audits/vehicles/swse-universal-phase1b-starships-of-the-galaxy.json`
- Historical source fields: `data/canonical/vehicles/ships.json`
- Universal staged dataset: `data/audits/vehicles/swse-universal-phase2b-starships-of-the-galaxy-staged.json`
- Validation: `tests/vehicle-universal-phase2b-sotg.test.mjs`
- Reference: Starships of the Galaxy PDF, SHA-256 `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.

The earlier 104 ship records already underwent published PDF source-review passes. This process **does not assert that all 104 scans were re-read anew in this checkpoint**; the earlier reviewed source authority was converted. The Escape Pod was directly inspected in the supplied scanned source at printed page 50.

### Format and decisions

- Source entry IDs and variant distinctions are unchanged. The hybrid Vulture starfighter/walker remains one record; four station-class hulls remain distinct vessels.
- Core fields include published CL, defenses, HP, threshold, physical dimensions/space where known, movement at character/starship scale, ability scores, skills, crew, capacity, hyperdrive/navcomputer evidence, economics and printed attack information.
- Three explicitly unarmed inherited source records have empty firing groups and explicit absence states. Other records preserve groups as *source attack group evidence* with no executable weapon mounts, arcs or automatic operator bindings.
- Two corvettes have printed variable crew ranges and explicit typical complements, rather than invented fixed staffing.
- Printed absent/unknown/unsupported values are not conflated: `0` means known zero, omitted fields remain unknown, explicit none is recorded in `fieldStates`.
- Published special rules that need new typed operations are retained as source-specific exceptions with pending implementation status; this phase does not certify them as executable mechanics.
- Existing approved effective corrections in `ships.json` remain distinct from printed facts. This staging deliberately does **not** overwrite historical source values with corrected runtime decisions.

## Scope boundary and next book

This is **whole-book source-mechanical hydration**, not full strict weapon mount certification or Foundry V2 vehicle cutover. The outstanding tasks include exceptional special-rule consumer typing, weapon/attack binding, physical arc and mount certifications, plus eventual unified runtime migration. Those must be addressed explicitly rather than implied by the 105-record source completion.

Next book: Clone Wars Campaign Guide (67 Phase 1 vehicle publication identities).
