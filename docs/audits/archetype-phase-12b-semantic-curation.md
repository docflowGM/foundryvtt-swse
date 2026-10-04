SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY ACTIVE
Certified: 30 / 297 archetypes
Current execution: 12B-SCOUT-02 — 20 new records + 1 explicit revision
Required baseline for current execution: e1def6aad1085b966cdd2382626fa6fbefbff9a3
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

Purpose

This is the rolling human owner authority for archetype semantic curation. The companion JSON is the machine authority. Claude is an executor: it applies certified arrays exactly and does not decide semantic meaning.

Companion: archetype-phase-12b-semantic-curation.json

Curation rules

1. Narrative identity defines what the archetype is.
2. Signature exact mechanics show how that identity is expressed.
3. Supporting mechanics reinforce but do not automatically define identity.
4. Only the frozen 190-tag ontology may be used.
5. Class is a route, not ownership.
6. Parent tags do not automatically inherit to specializations.
7. Recommended feat/talent tags are evidence, not a bag of tags to copy wholesale.
8. Optional routes stay supporting unless the archetype itself requires them.

Primary tags

Identity-defining evidence. A strong match should meaningfully support recognition of the archetype.

Supporting tags

Strongly characteristic but nonessential evidence. They reinforce the archetype without becoming requirements.

────────

Rolling Certified Census

|ID                            |Archetype                   |Tranche|Primary                                                                    |Supporting                                                                                     |
|------------------------------|----------------------------|------:|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
|`fringer`                     |Fringer                     |01     |`exploration`, `perception`, `survivability`, `survival`                   |`endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech`                  |
|`scavenger`                   |Scavenger                   |01     |`equipment`, `mechanics`, `tech`                                           |`crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer`|
|`bounty_hunter`               |Bounty Hunter               |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting`    |
|`sector_ranger`               |Sector Ranger               |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`control`, `initiative`, `knowledge`, `pilot`, `ranged`                                        |
|`frontier_marshal`            |Frontier Marshal            |01     |`ally_support`, `leadership`, `perception`, `persuasion`, `support`        |`control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork`     |
|`force_hunter`                |Force Hunter                |01     |`anti-force`, `perception`, `pursuit`, `survival`, `tracking`              |`force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting`            |
|`sniper`                      |Sniper                      |01     |`precision`, `ranged`, `setup`, `sniper`, `targeting`                      |`ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth`                      |
|`saboteur`                    |Saboteur                    |01     |`infiltration`, `mechanics`, `stealth`, `tech`, `trap`                     |`burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer`                      |
|`partisan`                    |Partisan                    |01     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                 |`deception`, `evasion`, `initiative`, `perception`, `social`                                   |
|`pilot`                       |Pilot                       |01     |`pilot`, `pursuit`, `space`, `vehicle`                                     |`initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork`                     |
|`astrogator`                  |Astrogator                  |02     |`exploration`, `pilot`, `space`, `use_computer`                            |`knowledge`, `perception`, `vehicle`                                                           |
|`racer`                       |Racer                       |02     |`initiative`, `pilot`, `pursuit`, `vehicle`                                |`mobility`, `movement`, `perception`, `space`                                                  |
|`disaster_responder`          |Disaster Responder          |02     |`ally_support`, `recovery`, `support`, `survivability`, `treat_injury`     |`endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival`             |
|`explorer`                    |Explorer                    |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle`                              |
|`pathfinder`                  |Pathfinder                  |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `evasion`, `stealth`, `support`, `survivability`                                  |
|`survivalist`                 |Survivalist                 |02     |`endurance`, `resilience`, `survivability`, `survival`                     |`climb`, `mobility`, `perception`, `recovery`, `swim`                                          |
|`search_and_rescue_specialist`|Search-and-Rescue Specialist|02     |`ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`|`endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury`                    |
|`first_contact_specialist`    |First-Contact Specialist    |02     |`exploration`, `knowledge`, `persuasion`, `social`                         |`gather_information`, `perception`, `support`                                                  |
|`galactic_archaeologist`      |Galactic Archaeologist      |02     |`exploration`, `investigation`, `knowledge`, `perception`                  |`survival`, `use_computer`                                                                     |
|`prospector`                  |Prospector                  |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mechanics`, `mobility`                                              |
|`naturalist`                  |Naturalist                  |02     |`exploration`, `knowledge`, `perception`, `survival`                       |`beast`, `treat_injury`                                                                        |
|`colony_pioneer`              |Colony Pioneer              |02     |`crafting`, `mechanics`, `support`, `survival`                             |`ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech`                   |
|`beast_hunter`                |Beast Hunter                |02     |`beast`, `perception`, `pursuit`, `survival`, `tracking`                   |`endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting`                       |
|`beast_handler`               |Beast Handler               |02     |`beast`, `perception`, `survival`                                          |`beast_companion`, `persuasion`, `ride`, `support`                                             |
|`beast_rider`                 |Beast Rider                 |02     |`beast`, `mount`, `ride`, `rider`, `survival`                              |`endurance`, `initiative`, `mobility`, `movement`, `perception`                                |
|`devaronian_wanderer`         |Devaronian Wanderer         |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `mechanics`, `pilot`, `survivability`, `tech`                                     |
|`blazing_chain_raider`        |Blazing Chain Raider        |02     |`force`, `force_power`, `force_training`, `pilot`, `space`                 |`damage`, `fear`, `intimidation`, `social`, `vehicle`                                          |
|`salvager`                    |Salvager                    |02     |`equipment`, `exploration`, `mechanics`, `repair`, `tech`                  |`crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer`                  |
|`scavenger_droid`             |Scavenger Droid             |02     |`droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`        |`crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer`              |
|`jawa_sandcrawler_salvager`   |Jawa Sandcrawler Salvager   |02     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                     |`crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle`                |

────────

Revision Log

REV-001 — Scavenger resources removal

The tranche-1 Scavenger record used resources as a primary tag. This is incorrect under the frozen ontology: resources means spendable game resources, not salvage, material resources, or valuable junk.

Certified correction:

• remove resources from scavenger.metadata.tags.primary;
• remove it from metadata.tags.all;
• remove it from metadata.tagProvenance.phase12b.curated.primary;
• make no other Scavenger semantic change in this revision.

This is an explicit owner revision and must not be treated as silent history rewriting.

────────

Current Tranche — 12B-SCOUT-02

Selection is deterministic: the remaining 15 Scout-first parent archetypes, followed by the first 5 Scout-first specializations in dataset order. This does not imply Scout ownership.

Current 20 new records:

astrogator, racer, disaster_responder, explorer, pathfinder, survivalist, search_and_rescue_specialist, first_contact_specialist, galactic_archaeologist, prospector, naturalist, colony_pioneer, beast_hunter, beast_handler, beast_rider, devaronian_wanderer, blazing_chain_raider, salvager, scavenger_droid, jawa_sandcrawler_salvager

Certified Record Notes

Astrogator (astrogator)

• Identity: Hyperspace navigation specialist defined by plotting routes, operating in space, piloting, and computer-assisted astrogation.
• Primary: exploration, pilot, space, use_computer
• Supporting: knowledge, perception, vehicle
• Foundation routes: scout, scoundrel, noble
• Signature skills: useComputer, pilot
• Signature talent trees: Knights of the Old Republic Campaign Guide|Hyperspace Explorer, Saga Edition Core Rulebook|Spacer
• Signature talents: Knights of the Old Republic Campaign Guide|Hyperspace Explorer|Deep-Space Gambit, Saga Edition Core Rulebook|Spacer|Spacehound
• Signature feats: skill_focus, vehicular_combat

Racer (racer)

• Identity: Competitive vehicle pilot whose identity is speed, fast reactions, pursuit, maneuver, and winning dangerous races.
• Primary: initiative, pilot, pursuit, vehicle
• Supporting: mobility, movement, perception, space
• Foundation routes: scout, scoundrel
• Signature skills: pilot, initiative
• Signature talent trees: Saga Edition Core Rulebook|Expert Pilot, Knights of the Old Republic Campaign Guide|Run and Gun
• Signature talents: Saga Edition Core Rulebook|Expert Pilot|Relentless Pursuit, Knights of the Old Republic Campaign Guide|Run and Gun|Slippery Strike
• Signature feats: vehicular_combat, a_few_maneuvers

Disaster Responder (disaster_responder)

• Identity: Emergency specialist who enters catastrophic environments to stabilize people, systems, and situations under extreme pressure.
• Primary: ally_support, recovery, support, survivability, treat_injury
• Supporting: endurance, healing, mechanics, medical, perception, repair, survival
• Foundation routes: scout, soldier, noble
• Signature skills: perception, treatInjury
• Signature talent trees: Saga Edition Core Rulebook|Survivor, Force Unleashed Campaign Guide|Advanced Medicine
• Signature talents: Saga Edition Core Rulebook|Survivor|Extreme Effort, Force Unleashed Campaign Guide|Advanced Medicine|Bring Them Back
• Signature feats: surgical_expertise

Explorer (explorer)

• Identity: Unknown-region and expedition specialist whose identity is discovery, navigation through dangerous environments, awareness, and survival.
• Primary: exploration, perception, survival
• Supporting: endurance, knowledge, mobility, pilot, space, vehicle
• Foundation routes: scout, noble
• Signature skills: survival, perception
• Signature talent trees: Knights of the Old Republic Campaign Guide|Hyperspace Explorer, Unknown Regions|Master Scout
• Signature talents: Knights of the Old Republic Campaign Guide|Hyperspace Explorer|Deep-Space Gambit
• Signature feats: skill_focus, wilderness_first_aid

Pathfinder (pathfinder)

• Identity: Route-finding specialist who gets a group through hostile terrain by identifying hazards, choosing paths, and surviving ahead of the main body.
• Primary: exploration, mobility, perception, survival
• Supporting: endurance, evasion, stealth, support, survivability
• Foundation routes: scout
• Signature skills: survival, perception
• Signature talent trees: Rebellion Era Campaign Guide|Pathfinder, Saga Edition Core Rulebook|Awareness
• Signature talents: Rebellion Era Campaign Guide|Pathfinder|Safe Zone, Saga Edition Core Rulebook|Awareness|Acute Senses
• Signature feats: skill_focus, wilderness_first_aid

Survivalist (survivalist)

• Identity: Self-reliant wilderness survivor defined by endurance, resistance to hardship, environmental competence, and staying alive without infrastructure.
• Primary: endurance, resilience, survivability, survival
• Supporting: climb, mobility, perception, recovery, swim
• Foundation routes: scout
• Signature skills: survival, endurance
• Signature talent trees: Saga Edition Core Rulebook|Survivor, Unknown Regions|Master Scout
• Signature talents: Saga Edition Core Rulebook|Survivor|Surefooted
• Signature feats: skill_focus

Search-and-Rescue Specialist (search_and_rescue_specialist)

• Identity: Search-and-rescue specialist who locates missing people in dangerous environments and gets them back alive.
• Primary: ally_support, perception, recovery, support, survival, tracking
• Supporting: endurance, healing, medical, pilot, survivability, treat_injury
• Foundation routes: scout, soldier
• Signature skills: survival, perception
• Signature talent trees: Rebellion Era Campaign Guide|Pathfinder, Force Unleashed Campaign Guide|Advanced Medicine
• Signature talents: Rebellion Era Campaign Guide|Pathfinder|Bunker Blaster, Force Unleashed Campaign Guide|Advanced Medicine|Steady Under Pressure
• Signature feats: skill_focus

First-Contact Specialist (first_contact_specialist)

• Identity: Exploration-facing cultural and diplomatic specialist who handles encounters with unfamiliar peoples through knowledge, observation, and social competence.
• Primary: exploration, knowledge, persuasion, social
• Supporting: gather_information, perception, support
• Foundation routes: scout, noble
• Signature skills: persuasion, knowledgeSocialSciences
• Signature talent trees: Unknown Regions|Master Scout, Galaxy of Intrigue|Skill Challenge
• Signature talents: Galaxy of Intrigue|Skill Challenge|Learn from Mistakes
• Signature feats: skill_focus

Galactic Archaeologist (galactic_archaeologist)

• Identity: Scholar-adventurer who investigates ruins, lost civilizations, artifacts, and forgotten history in hazardous field conditions.
• Primary: exploration, investigation, knowledge, perception
• Supporting: survival, use_computer
• Foundation routes: scout, noble
• Signature skills: knowledgeGalacticLore, perception
• Signature talent trees: Knights of the Old Republic Campaign Guide|Hyperspace Explorer, Galaxy of Intrigue|Superior Skills
• Signature talents: Knights of the Old Republic Campaign Guide|Hyperspace Explorer|Deep-Space Gambit, Galaxy of Intrigue|Superior Skills|Reliable Boon
• Signature feats: skill_focus

Prospector (prospector)

• Identity: Frontier seeker who locates valuable deposits and claims in dangerous places through fieldcraft, observation, and technical competence.
• Primary: exploration, perception, survival
• Supporting: endurance, knowledge, mechanics, mobility
• Foundation routes: scout, scoundrel
• Signature skills: survival, perception
• Signature talent trees: Saga Edition Core Rulebook|Fringer, Rebellion Era Campaign Guide|Improviser
• Signature talents: Saga Edition Core Rulebook|Fringer|Long Stride, Rebellion Era Campaign Guide|Improviser|Improvised Device
• Signature feats: skill_focus
• Owner note: Do not use resources: in the frozen ontology that tag means spendable game resources, not mineral deposits or salvage claims.

Naturalist (naturalist)

• Identity: Field observer who studies living environments, species, habitats, and ecological conditions through exploration and practical wilderness expertise.
• Primary: exploration, knowledge, perception, survival
• Supporting: beast, treat_injury
• Foundation routes: scout, noble
• Signature skills: knowledgeLifeSciences, survival
• Signature talent trees: Unknown Regions|Master Scout, Galaxy of Intrigue|Superior Skills
• Signature talents: Galaxy of Intrigue|Superior Skills|Assured Skill
• Signature feats: skill_focus

Colony Pioneer (colony_pioneer)

• Identity: Settlement builder who creates a functioning community where infrastructure is weak or absent, combining survival, construction, repair, and mutual support.
• Primary: crafting, mechanics, support, survival
• Supporting: ally_support, endurance, leadership, repair, survivability, tech
• Foundation routes: scout, noble, soldier
• Signature skills: survival, mechanics
• Signature talent trees: Saga Edition Core Rulebook|Survivor, Rebellion Era Campaign Guide|Pathfinder
• Signature talents: Saga Edition Core Rulebook|Survivor|Surefooted, Rebellion Era Campaign Guide|Pathfinder|Escort Fighter
• Signature feats: skill_focus

Beast Hunter (beast_hunter)

• Identity: Hunter specialized in locating, pursuing, and confronting dangerous creatures in their own environments.
• Primary: beast, perception, pursuit, survival, tracking
• Supporting: endurance, initiative, precision, ranged, stealth, targeting
• Foundation routes: scout, soldier
• Signature skills: survival, perception
• Signature talent trees: Saga Edition Core Rulebook|Bounty Hunter, Saga Edition Core Rulebook|Awareness
• Signature talents: Saga Edition Core Rulebook|Bounty Hunter|Hunter's Mark, Saga Edition Core Rulebook|Awareness|Acute Senses
• Signature feats: skill_focus, point_blank_shot

Beast Handler (beast_handler)

• Identity: Animal specialist who works with dangerous creatures through familiarity, training, control, care, transport, or partnership.
• Primary: beast, perception, survival
• Supporting: beast_companion, persuasion, ride, support
• Foundation routes: scout, noble
• Signature skills: survival, perception
• Signature talent trees: Unknown Regions|Master Scout, Saga Edition Core Rulebook|Survivor
• Signature talents: Saga Edition Core Rulebook|Survivor|Surefooted
• Signature feats: skill_focus
• Owner note: beast_companion is supporting, not primary: handling can involve training/transport/control without a single bonded companion.

Beast Rider (beast_rider)

• Identity: Mounted wilderness combatant and traveler whose identity centers on a living mount and coordinated rider-mount action.
• Primary: beast, mount, ride, rider, survival
• Supporting: endurance, initiative, mobility, movement, perception
• Foundation routes: scout, soldier
• Signature skills: ride, survival
• Signature talent trees: Unknown Regions|Mobile Scout, Saga Edition Core Rulebook|Survivor
• Signature talents: Saga Edition Core Rulebook|Survivor|Extreme Effort
• Signature feats: mounted_combat, skill_focus

Devaronian Wanderer (devaronian_wanderer)

• Identity: Species-specific Fringer expression built around Devaronian wanderlust, self-reliant travel, mobility, perception, and survival.
• Primary: exploration, mobility, perception, survival
• Supporting: endurance, mechanics, pilot, survivability, tech
• Foundation routes: scout, scoundrel
• Signature skills: survival, perception
• Signature talent trees: Saga Edition Core Rulebook|Fringer, Saga Edition Core Rulebook|Survivor
• Signature talents: Saga Edition Core Rulebook|Fringer|Fringe Savant, Saga Edition Core Rulebook|Survivor|Sprint
• Signature feats: skill_focus

Blazing Chain Raider (blazing_chain_raider)

• Identity: Intrinsic Force-sensitive pirate-raider whose identity combines fleet life, piloting, raiding, intimidation, and a practical Force tradition.
• Primary: force, force_power, force_training, pilot, space
• Supporting: damage, fear, intimidation, social, vehicle
• Foundation routes: scout, scoundrel
• Signature skills: pilot, persuasion
• Signature talent trees: Scum and Villainy|Piracy, Force Unleashed Campaign Guide|Privateer
• Signature talents: Scum and Villainy|Piracy|Bloodthirsty, Force Unleashed Campaign Guide|Privateer|Boarder
• Signature feats: force_training
• Owner note: Force access is intrinsic; force/force_power/force_training are identity-defining here, unlike optional Force routes.

Salvager (salvager)

• Identity: Professional wreck and derelict recovery specialist who extracts value from abandoned ships, battlefields, and machinery through technical expertise.
• Primary: equipment, exploration, mechanics, repair, tech
• Supporting: crafting, droid, modification, perception, survival, use_computer
• Foundation routes: scout, scoundrel
• Signature skills: mechanics, perception
• Signature talent trees: Rebellion Era Campaign Guide|Improviser, Saga Edition Core Rulebook|Fringer
• Signature talents: Rebellion Era Campaign Guide|Improviser|Capture Droid, Saga Edition Core Rulebook|Fringer|Fringe Savant
• Signature feats: skill_focus

Scavenger Droid (scavenger_droid)

• Identity: Self-maintaining droid survivor that keeps itself functioning by scavenging, jury-rigging, repairing, and repurposing discarded technology.
• Primary: droid, jury_rig, mechanics, repair, survivability, tech
• Supporting: crafting, equipment, modification, perception, survival, use_computer
• Foundation routes: scout, scoundrel
• Signature skills: mechanics, perception
• Signature talent trees: Rebellion Era Campaign Guide|Improviser, Saga Edition Core Rulebook|Fringer
• Signature talents: Rebellion Era Campaign Guide|Improviser|Improved Jury-Rig, Saga Edition Core Rulebook|Fringer|Fringe Savant
• Signature feats: skill_focus

Jawa Sandcrawler Salvager (jawa_sandcrawler_salvager)

• Identity: Jawa scavenger-specialist centered on salvage, improvised repair, technical reuse, and operating from a Sandcrawler-based salvage culture.
• Primary: equipment, jury_rig, mechanics, repair, tech
• Supporting: crafting, modification, perception, survival, use_computer, vehicle
• Foundation routes: scout, scoundrel
• Signature skills: mechanics, perception
• Signature talent trees: Rebellion Era Campaign Guide|Improviser, Saga Edition Core Rulebook|Fringer
• Signature talents: Rebellion Era Campaign Guide|Improviser|Improved Jury-Rig, Saga Edition Core Rulebook|Fringer|Long Stride
• Signature feats: skill_focus

────────

Claude Execution Contract — Current Run

The companion JSON is authoritative. For this run Claude must:

1. Verify e1def6aad1085b966cdd2382626fa6fbefbff9a3 is an ancestor of the working branch.
2. Apply only the 20 IDs in currentExecution.newRecordIds plus the one revision ID scavenger.
3. For each execution record replace exactly:
  • metadata.tags.primary
  • metadata.tags.supporting
  • metadata.tags.all
  • metadata.tagProvenance
4. Do not touch the other nine already-applied tranche-1 records.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or the ontology.
6. Perform the maintenance rulings below exactly.
7. Validate all supplied tags against the 190-tag ontology and run the Phase 12A SSOT validator/tests.
8. Stop rather than infer if any authority mismatch occurs.

────────

Maintenance Owner Rulings

M-001 — Phase 12A fingerprint is historical

Do not rewrite data/audits/archetype-phase-12a-runtime-ssot.json. Its output fingerprint is the certified Phase 12A baseline:

a8e08c6347a2126ba7647f0a671034857099d1b797e383a9417e873a048d3cae

In tests/archetype-phase-12a-runtime-ssot.test.mjs, change only the stale fingerprint assertion so it asserts audit.output.sha256 equals that certified historical SHA rather than comparing it to the current curated data/archetypes.json bytes. Rename that test to make clear that Phase 12A is a historical certified baseline. Leave the other assertions in that test intact.

M-002 — Phase 12B is a separate deterministic overlay

Do not fold Phase 12B curation into tools/build-archetype-phase-12a-runtime-ssot.mjs.

Add:

tools/apply-archetype-phase-12b-semantic-curation.mjs

Its exact contract:

• read data/archetypes.json;
• read data/audits/archetype-phase-12b-semantic-curation.json;
• apply all cumulative certified records[] exactly, replacing only the four semantic fields;
• validate every supplied tag against the frozen ontology;
• validate the resulting 297-record dataset with validateArchetypeDataset;
• support --check, where applying the cumulative authority to the current file must produce zero diff;
• no inference, no parent inheritance, no scoring changes.

Reconstruction order is therefore:

1. Phase 12A builder creates the normalized baseline.
2. Phase 12B overlay applies the rolling semantic curation authority.

M-003 — Put the rolling authority in the repo

Commit copies of these rolling files at:

• data/audits/archetype-phase-12b-semantic-curation.json
• docs/audits/archetype-phase-12b-semantic-curation.md

These two files remain the single rolling authority for future tranches. Update them; do not create competing tranche-specific authority files.

────────

Progress

• Certified: 30 / 297
• Applied before this run: 10 / 297 at e1def6aa…
• New this tranche: 20
• Explicit revisions this tranche: 1 (scavenger)
• Remaining uncurated after application: 267
• Next: continue Scout-first specializations in dataset order.
• Shadow scoring: still deferred.
