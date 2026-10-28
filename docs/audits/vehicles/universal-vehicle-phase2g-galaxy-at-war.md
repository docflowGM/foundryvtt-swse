# Universal vehicles Phase 2-G — Galaxy at War

**Checkpoint:** Whole-book source-mechanical staging complete — **11 / 11** publication-specific vehicle records under universal draft-v0.5, with **strict mount/mechanical certification still pending**.

## Census and source

| Category | Source identities |
| --- | ---: |
| Existing previously source-reviewed spacecraft | 5 |
| Newly transcribed ground/air/utility vehicles | 6 |
| **Total** | **11** |
| Printed source attack-group entries | **17** (13 historical + 4 new) |
| New strictly certified physical weapon mounts | **0** |
| Production packs, Foundry Actors, runtime modifications | **0** |

Primary PDF: *Galaxy at War*, SHA-256 `9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a`. The six new vehicle statblocks were directly read from printed pp62-64, 179 and 216, corresponding to physical PDF pp63-65,180,217. Old ship canonical evidence in `data/canonical/vehicles/ships.json` was reused; three sparse or conflicting ship segments were directly checked at printed pp65,67 and 192. Searchable DJVU text was used as navigation only.

## Outputs

- `data/audits/vehicles/swse-universal-phase2g-galaxy-at-war-staged.json`: all 11 complete universal record envelopes and printed-source mechanics where available.
- `data/audits/vehicles/swse-universal-phase2g-galaxy-at-war-fixtures.json`: six primary-source vehicle snapshots and direct-review notes for the Citadel, Corona and YU-410.
- `tests/vehicle-universal-phase2g-galaxy-at-war.test.mjs`: whole-book census, recursive schema validation, source-identity, printed-stat, and exception tests.
- Frozen Phase 1 ledger `data/audits/vehicles/swse-universal-phase1g-galaxy-at-war.json` unchanged.

## Specific distinctions

- **Freeco Speeder** is one CL6 covered speeder, with a +7 dual laser cannon attack and +2 autofire modifier. Its low altitude/rough terrain narrative remains a pending rule, not an invented movement limit.
- **Shelter Speeder** is a CL4 medical airspeeder with a 4-passenger cabin and 2 additional patient places, one carried speeder bike, printed atmosphere/hazard protections, and a conditional +5 equipment Fortitude benefit. No stock weapons are inferred.
- **WLO-5 Speeder Tank** has CL6, heavy laser cannon and printed +5 equipment bonus for repair/modification. The scan literally reads `Cost 115,00 credits (65,000 used)`: new price is stored as **ambiguous**, not silently rounded or guessed. Pirate-upgraded guns are not part of the stock profile.
- **Drop Pod** is an air vehicle, not a starship solely because it has starship-scale movement. It transports one Gargantuan-or-smaller vehicle, has no passengers, and operates under a droid brain; release/destruction mechanics remain pending.
- **T8 Loading Vehicle** is CL1, wheeled, unarmed and not a speeder. Its adventure appearance is a complete vehicle statblock.
- **Ground Armored Tank** has one CL10 printed source identity despite four encounter instances. Vehicular Combat and its **Shock and Awe (Fire Effect)** radius/condition-track mechanic are retained for typed runtime handling, not automatically executed.
- **Citadel-class Cruiser** printed p192 supplements the sparse historical canonical snapshot. Both ranged tractor-beam +3 and detail +1 are preserved without deciding which to normalize.
- **Corona-class Armed Transport** scanned price is **3.7 million credits** (2.0 million used), correcting text-extraction punctuation. Printed carried shuttles and tanks and the -20 capital-target restriction are retained.
- **YU-410 Light Freighter** printed p65 genuinely says `DR 15; DR 20`, despite narrative mentioning shields; the second DR is **not** silently converted to SR20. Its header Initiative -5 and Skills Initiative -2 remain distinct. The ship's cargo-concealment +5 bonus requires a typed consumer.

## Acceptance boundary

All staged entries preserve book/page identity, published fields and source exceptions under the existing `swse.vehicle.phase0b.draft-0.5` schema. The 17 attack rows are *source group evidence only*, not physical mounts, firing arcs or executable weapon authorities. Specialty conditions, optional configurations and source conflicts are separately carried for later review. This checkpoint is **not** a Foundry V13/V2 runtime vehicle deployment.

**Next book:** Galaxy of Intrigue, Phase 2-H, whole-book checkpoint.
