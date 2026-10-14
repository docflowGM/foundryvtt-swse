> **Historical checkpoint: superseded by v0.5 nullable-field policy.** These pass counts describe earlier schema versions. Current policy and tests are documented in [the v0.5 report](swse-phase0b-v05-nullable-schema-report.md).

# SWSE Phase 0-B — Vehicle Weapon Authority Stress Test

**Status:** PASS — structural and selected semantic fixture validation. **NOT a certified canonical weapon or vehicle database.**  
**Universal vehicle schema:** `swse.vehicle.phase0b.draft-0.3` (unchanged).  
**Weapon schema:** `swse.vehicle-weapon.phase0b.draft-0.3` (revised).  
**Run:** 40/40 checks passed; 11 weapon/delivery/payload examples, 2 installation examples, 4 new full-shape vehicle specimens.  
**Authority:** Printed sourcebook TXT; C-wing additionally checked against *Scum and Villainy* p.66 rendered PDF. Old compendium data was not used.

## 1. Why the weapon schema changed

The original weapon schema (`draft-0.1`) contained free-text fields for damage, special effects, ammunition, and ranges. That can pass JSON shape validation while obscuring crucial mechanical differences. The revised contract adds mandatory typed `profilesTyped`, `intrinsicRules`, `installationConstraints`, `configurationStates`, `compatiblePayloadKeys`, `definitionKind`, `identityStatus`, `baseWeaponKey`, and `fieldStates`. Previous flat `attackProfiles` remains present only as **non-executable legacy-draft evidence**, not a second runtime authority.

Each typed profile has distinct **attack resolution, damage ownership, area geometry, resource accounting, structured effects, and execution status**. Source descriptions/predicates that are not machine-executable must remain marked `needs-consumer` or `requires-ontology`. No compiler or runtime path was introduced.

## 2. Weapon and payload samples

| Source example | Domain | Damage/behavior | Attack resolution | Identity standing |
|---|---|---|---|---|
| Laser cannon, light | intrinsic-weapon | 3d10 x2 | attack-vs-defense | unreconciled |
| Ion cannon, light | intrinsic-weapon | 3d10 x2 | attack-vs-defense | unreconciled |
| Concussion missile, medium | payload | 9d10 x2 | attack-vs-defense | unreconciled |
| Armor-piercing medium concussion missile | payload | 9d10 x2 | attack-vs-defense | composed-sample |
| Concussion missile launcher, medium | delivery-platform | payload-derived | attack-vs-defense | unreconciled |
| Tractor beam | special-emitter | none | attack-then-opposed | unreconciled |
| Gravity well projector | special-emitter | none | attack-vs-fixed | unreconciled |
| Space mine, standard | deployable | 7d10 x2 | automated-attack | unreconciled |
| Turbolaser, heavy | intrinsic-weapon | 7d10 x5 | attack-vs-defense | unreconciled |
| Shieldbuster torpedo | payload | 10d10 x2 | attack-vs-defense | unreconciled |
| Hapan triple ion cannon | intrinsic-weapon | 5d10 x5 | attack-vs-defense | unreconciled |

**Sources and caveats:** *Starships of the Galaxy* weapon-system discussion, weapon table, mine, shieldbuster and projectile rules; *Core Rulebook* tractor-beam vehicle combat rules. These are selective evidence-based **schema probes**, not Phase 2 primary-source certified records. Publication pages remain pending except where previously checked, and the composed armor-piercing medium missile is explicitly marked `composed-sample`, not invented as a separate proven published identity. Some attack damage types remain intentionally unspecified when the sampled source field did not state them.

### Verified distinctions captured

- **Fire-link is not a weapon battery.** The source explicitly distinguishes fire-linked turbolasers (sometimes casually called batteries) from game-rule weapon batteries. Fire-linked double weapons add a die; optional link configurations can be switched with a swift action where source permits. Link states are *installation configurations*, not new intrinsic weapon types.
- **Payload and launcher are separate.** Medium concussion missile launcher carries 16 missiles; the missile contributes its own damage and splash rules. The armor-piercing option additionally has penetration 10 against DR/SR and an attack penalty of 5. Original launcher base damage must not be given a missile's dice.
- **A special weapon can deal no HP damage.** Gravity-well projector targets a 4×4 starship-scale area against fixed Reflex 10 and restricts hyperdrive activation for ships starting a turn in its field.
- **Tractor beam resolution is sequential.** Hit vs Reflex first, then opposed grapple; maintaining or pulling requires further checks. It is not a normal damage roll.
- **Space mines are deployed objects**, with their own attack and triggered area effects, not a reusable gun attached to the firing actor for the rest of the turn.
- **Shieldbusters are target-dependent.** Their damage and SR effect are not a simple unconditional weapon multiplier.
- **Hapan triple ion cannons** illustrate a weapon with an autofire capability that cannot make a starship-scale area attack; mode availability and area permission must be independent.
- **Installed gunner attack bonuses are not intrinsic weapon modifiers.** Published ship ATK values remain in vehicle armament claims and are resolved through the existing vehicle combat authority later.

## 3. Four additional vehicle probes

| Vehicle | Source | Intended stress | Result |
|---|---|---|---|
| Model 67 Shrieker Speeder Bike | *Legacy Era Campaign Guide* | No printed ranged/weapon line; crew cover none; character-scale repulsor flight | PASS |
| All-Terrain Recon Transport (AT-RT) | *Clone Wars Campaign Guide* | Exposed cockpit and +2 cover; piloted blaster; base statblock preserved | PASS |
| AT-RT civilian grenade-mortar configuration | *Clone Wars Campaign Guide* prose | Replaces blaster with a mortar and 24 grenades; no fabricated independent CL or full second statblock | PASS |
| C-wing Ugly Fighter | *Scum and Villainy*, p.66 PDF | Three mutually exclusive attacks, ion mode, torpedo payload, separate crew operators | PASS |

**Accuracy correction:** the C-wing has **SR 30**. It was caught and corrected during an enlargement of its printed statblock. Its **8 proton torpedoes are structured as ammunition, not proof of eight launchers**.

**Missing-data clarification:** Model 67 has no Ranged/weapon line in the source. Its `armament.weaponMounts` is empty and `fieldStates["/armament/weaponMounts"]` is `not-stated`, **not** `explicitly-none`: textual silence is not proof that the ship cannot carry weapons.

The six earlier complete-shape fixtures (AT-AT, X-wing, Acclamator, Golan VIII, Coralskipper, DP-2) and both Y-wing variant demonstrations still validate unchanged against the common vehicle schema. No category-specific field removal was required.

## 4. Validation evidence

- **40 / 40 passing** targeted schema and semantic assertions.
- Every weapon fixture validates Draft 2020-12; all four additional vehicles, all six prior vehicles, and both Y-wing variants validate the universal schema.
- Negative controls ensure missing mandatory typed profiles, unknown special-effect identifiers, and undeclared fields are rejected.
- Cross-layer checks enforce no guessed weapon mount quantity, no forced provisional identity link, separate payload-damage authority, and explicit unreviewed status.
- A successful JSON Schema validation only verifies *format*. It does **not** establish publication correctness or actual Foundry gameplay consumption.

## 5. Blocking work before schema freeze

1. Canonical source transcription and exact printed pages for all weapon definitions, including verifying global combat rules and damage types. No fixture is currently approved as final canonical authority.
2. Typed predicate grammar and runtime consumer contract for each special effect; text or a status flag is **not executable**.
3. Batch source-to-JSON field coverage and null-status audit, including nested weapon and system arrays.
4. Battery attack calculation, target-size penalties, fire-linked missile consumption, ammo ownership, and range/scale behavior certified against the original books and V2 design.
5. Broader corpus probes for vehicle subsystems, mining, living vessels, docking guns, mounts, alternate armament and environmental movement.

## 6. Local artifacts

- `swse-phase0b-vehicle-weapon.schema.json` — revised `draft-0.3` strict schema.
- `swse-phase0b-weapon-stress-fixtures.json` — eleven weapon/payload/control samples and two separate installation compositions.
- `swse-phase0b-additional-vehicle-fixtures.json` — three universal-schema vehicle samples.
- `swse-phase0b-weapon-stress-report.json` — test-by-test machine-readable checks.
- `swse_phase0b_weapon_stress_build.py` — offline repeatable generator/test script.
- `swse-phase0b-vehicle-schema.md` — rolling schema reference, appended with updated design and boundaries.
- `swse-phase0b-dryrun-report.md` / `.json` — rolling master dry-run summary updated with this pass.

**No GitHub pushes, branch changes, compendium replacements, or Foundry runtime modifications.**

## Phase 0-B continuation: draft v0.4

All 11 vehicle-weapon definitions validate the v0.4 contract. Attack profiles now carry typed condition AST slots and resource stock-ownership/consumption-basis fields. Battery formulas are stored globally; installed firing groups carry explicit counts only when independently verified.

See `swse-phase0b-semantic-contract-report.md` and `swse-phase0b-semantic-contract-report.json` for 31 regression checks, global combat rules and source-status findings. Earlier 40/40 tests were on v0.3 and are recorded as prior historical results; do not add them to the v0.4 checks as though they had been rerun unchanged.
