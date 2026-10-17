# The Unknown Regions — Phase 2B Full Book Source Closure

**Status: 12/12 existing Phase 1 publication-specific starship records reviewed; zero strict mechanical certifications.**

## Authority and scope

- The primary authority is the uploaded original `SW_Saga_The_Unknown_Regions.pdf`, SHA-256 `43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b`. Every reviewed statblock was checked on a rendered image. Embedded PDF text was used to collate facts, not as the sole authority. Physical 1-based PDF page = printed page +1.
- The remote Phase 1 identity roster is `data/audits/vehicles/swse-phase1-vehicle-provenance.json`, blob `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; verified on branch `audit/vehicle-phase-0-1-canonical-foundation` at HEAD `49fabf107f287b8147a59b75a9dd09e49ed7426f`.
- Source review closes **only** the twelve Phase 1 publication identities, without changing the earlier Phase 1 canonical baseline, any production packs, compendium data, actor engines, or Foundry V2 runtime.
- **Additional identity candidate:** An *independent fully printed CL 5 statblock* for `Uulshos Manufacturing Deep-X Explorer` appears on printed p.51 yet is absent from the twelve Phase 1 IDs. This is a Phase 1 census gap requiring separate formal reconciliation, NOT permission to append an unreviewed or unauthorized production record. The p.51 SRV-1 tracked ground vehicle and p.58 Landing Sphere air vehicle are outside this ship census.

## Book closeout counts

| Measure | Result |
|---|---:|
| Existing Phase 1 publication identities | 12 |
| Existing identities primary-source reviewed | 12 |
| Remaining reviews of those identities | 0 |
| Distinct detailed weapon attack-profile rows | 22 |
| Phase 2C discovery-only cases | 35 |
| Published conflict rows explicitly preserved | 2 |
| Additional uncensused complete ship statblocks flagged | 1 (Deep-X) |
| Strict full-field + physical-mount mechanical certificates | 0 / 12 |

## All twelve source-reviewed publication identities

| Printed page | Published identity | CL | Attack groups | Important evidence |
|---|---|---:|---:|---|
| 59 | Hoersch-Kessel Vaya-class Scout Ship | 9 | 2 | DC20 Pilot/condition-track engine stall (p58); laser + concussion projectiles |
| 52 | JumpMaster 5000 Scout Ship | 8 | 1 | Single pilot; x3/backup x15; modified Punishing One is narrative-only |
| 133 | Killik Dartship | 9 | 1 | Ram 6d6+14, plus one additional die per concurrent ram; no printed SR or hyperdrive |
| 58 | Kuat Drive Yards Star Seeder-class Colony Ship | 9 | 2 | Six turbolaser + tractor batteries; contradictory -20/Colossal versus -17/Capital modifiers |
| 57 | Loronar Corporation SkyBlind Recon Ship | 8 | 1 | Sensor-baffled hull (no numeric Stealth bonus); landing-sphere-linked cargo |
| 56 | Mesens Corporation SCT Scout Craft | 12 | 2 | Turret and point-defense groups; turbolaser -16 for small targets; statblock p56-57 |
| 55 | MRX-BR Pacifier Combat/Contact Vessel | 9 | 2 | Alternate laser/torpedo attack modes; 8 torpedo payload; first-contact/assault usage |
| 151 | Royal Fortune Light Clipper | 15 | 3 | 38 narrated laser cannons; 8 battery attack groups; Fotia's Fire delayed damage |
| 55 | Sienar Fleet Systems Mu-2 Model 2 Shuttle | 8 | 1 | Only Model 2 statblock; sensor checks +5; narrative Model 1 not separate |
| 52 | SoroSuub Drexl-class "Planetary Defender" Starfighter | 10 | 2 | Astromech skill substitutions; +5 cover notation; no printed hyperdrive |
| 56 | SoroSuub Preybird-class Starfighter | 10 | 2 | Laser autofire option with missing detailed autofire attack modifier |
| 154 | Surfeik Cruiser | 16 | 3 | 33 lasers / 11 batteries; projectile splash, prisoner shields, pseudograv interdiction |

## Primary source conflicts and unfilled source data

1. **Star Seeder (p.58), turbolaser row.** The footnote says apply **-20 attack** against targets **smaller than Colossal**, but the detailed row says **-17** against targets **smaller than Capital**. These differ in both resulting modifier and target category. The full source is preserved without choosing one.
2. **Star Seeder (p.58), tractor-beam row.** The identical discrepancy occurs for the tractor-beam battery. It is a second affected attack group, recorded as a separate conflict row, not claimed to be a distinct editorial root cause.
3. **Preybird (p.56).** The block lists autofire among attack options; the detailed laser attack row does not print an autofire modifier. This is marked source-silent, not a numerical source conflict, and no autofire number is invented.
4. **SkyBlind (p.57).** The spherical/sensor-baffled hull is described as difficult to detect, but no published numerical concealment/sensor penalty is stated. Preserve narrative evidence only.
5. **Drexl (p.52), Killik (p.133).** Unprinted hyperdrive fields are explicitly source-silent, not automatically set to "none". Killik SR likewise has no printed value.
6. **Surfeik (pp.154-155).** Living-shield blisters are only on dedicated combat versions. Pseudograv field does not deal HP damage and uses a targeted area with Reflex 10; implementation cannot become a normal energy damage attack.
7. **Royal Fortune (p.151).** Narrative reports 38 independent laser cannons, 19 port/19 starboard, two quad batteries fore/aft and one central Fotia's Fire cannon, while the attack line lists 8 laser-cannon battery groups. Do not extrapolate group size or physical topology from crew-per-battery labels.

## Mechanics worth explicit future modeling

- **Vaya engine failure:** On being moved down the condition track by attack damage, pilot must make DC 20 Pilot check or lose movement through end of their next turn. (Printed p.58.)
- **Killik Dartship Ram:** 6d6+14 collision damage, replacing normal size damage; multiple same-round successful rams each gain an additional die. (p.133.)
- **Mu-2 sensor package:** Operator receives +5 equipment bonus to Perception and Use Computer checks when operating sensors. (p.55.)
- **SkyBlind landing sphere:** Printed cargo 50 tons with sphere, doubles without; landing sphere is a separately statblocked air vehicle, not a starship. (p.57-58.)
- **Royal Fortune Fotia's Fire:** 7d10x2 immediate with 2d10x2 for two later rounds, as printed. (p.151.)
- **Surfeik pseudograv:** 2x2 or 3x3 starship-scale area attack vs Reflex 10; denies starting hyperdrive in covered squares and forces in-transit hyperspace ships to realspace. (p.155.)
- **Surfeik living shields:** Avoidance attack -10, but battery, splash, and area attacks cannot avoid the prisoner blisters. This applies to dedicated combat versions, not every ship of the class. (pp.154-155.)

## Certification backlog

All 12 records remain `fullFieldCertified=false` and `fullWeaponMountReconciled=false`. In particular, complete independent mount positions, battery assignments, firing arcs, exact gunner assignment topology, group-weapon equivalence and scripted/GM-adjudicated runtime special mechanics must be resolved separately. Source facts are not to be silently replaced by inferred SWSE generic defaults, prior unrelated statblocks or in-universe fiction.

## Validation and release guards

Run `python tools/audits/vehicles/check_unknown_regions_phase2b_book.py --repo-root . --source-pdf /path/to/SW_Saga_The_Unknown_Regions.pdf`; optionally use `--phase1 /path/to/swse-phase1-vehicle-provenance.json --require-phase1` for full external Phase1 comparison.

The validator enforces the fixed 12-entry key/title/page identity set, PDF SHA256, 12/12 reviewed count, weapon row inventory, source conflicts, discovery-only segregation, Deep-X flag, no mechanical certificates and no silent hydration. Passing it is **not** a claim that repo-wide regressions or strict weapon-mount certification have been run.

**GitHub:** Deliverable is changed-files ZIP only; no push/commit and no production file mutation.
