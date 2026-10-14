# SWSE Phase 0-B — Universal Vehicle Authority Schema

**Status:** DRAFT v0.5 · sourcebook-informed · machine-validation passes · **not canon-certified / not frozen**

**Scope:** One common canonical JSON shape for every vehicle statblock in the 14 provided SWSE sourcebooks, including ground vehicles, ships, stations, hybrid droid-vehicles and named/modified variants. This is an authority record, not a Foundry Actor instance.

## 1. Design decisions

1. **Same schema for every vehicle.** AT-AT, X-wing, Golan platform and DP-2 probe droid all use exactly the same required top-level groups and the same available nested field definitions. Category does not delete fields. Verified absent optional capabilities may be `null`; untranscribed nested fields are omitted instead of padded with placeholders.
2. **One record per printed statblock/source configuration.** Same-name ships from different books do not overwrite each other. A book entry key is not a canonical model key.
3. **Published fact versus missing fact.** Numeric 0, no system, unreported and inapplicable are distinct. A `null` denotes confirmed absence/inapplicability and must carry a positive `fieldStates` explanation for source-sensitive fields. An omitted nested value or sparse draft object is not proof of absence. Numeric 0 remains a value.
4. **Printed values and interpretation are separate.** CL is retained as printed, even if its balance is questionable. Crew attack/skill bonuses are recorded as published stock-crew values, not pasted into intrinsic weapon math.
5. **Ship equipment is a relationship, not duplicated weapon definitions.** `armament.weaponMounts[]` records printed armament groups and known mounting facts without inferring unprinted physical mount counts; separate vehicle-weapon authority identifies executable weapon attack/payload profiles. Reuse the existing SWSE weapon and damage architecture in implementation.
6. **No legacy-data inference.** Inaccurate scraped compendiums are comparisons only, not the source for new canonical numbers. Missing stats do not default to zero.
7. **No data loss from exceptional mechanics.** Rare statblock features go into typed special-rules records, and any unidentified printed fact becomes an explicit `exceptions.unmappedFacts[]` certification blocker.

## 2. Architecture and source/variant identity

```text
Published book statblock entry (sourceEntryKey)
           |
           v
Common family/model lineage (vehicleFamilyKey; reconciled later)
           |
           +----> printed configuration or variant (variantKey)
                         |
                         +----> installed weapon mount -> canonical weapon profile
                         |
                         +----> installed systems/modifications
                         |
                         v
                 Generated Foundry V2 vehicle Actor defaults
                         |
                         v
                 Live scene/token state (current HP, SR, ammo, crew)
```

Important: the published entry never stores current HP, current SR, remaining missiles, crew Actor UUIDs, crew initiative in play, equipped upgrades added by a player, or other mutable state. Those belong on the runtime Actor and owned installed-equipment instances.

### Example — two published Y-wing claims

| Field | Core Rulebook | Starships of the Galaxy |
|---|---|---|
| Printed name | Koensayr Y-wing Starfighter | Koensayr BTL-S3 Y-wing |
| Size | Gargantuan | Gargantuan |
| HP | 120 | 120 |
| SR | **25** | **10** |
| Record identity | Separate source entry | Separate source entry |

**Do not overwrite SR 25 with SR 10** or silently call one “wrong.” The variant/errata/identity reason is unresolved pending Phase 1. A sourcebook + model + configuration selector will let a GM intentionally choose the intended statblock. Page is deliberately unfilled in the demonstration fixture rather than guessed.

## 3. Sourcebook survey

All 14 separate TXT sourcebooks were searched for vehicle statblocks and uncommon rules fields. This is a format/field discovery pass; **not** an exhaustive line-by-line verification of every statblock. Ambiguous numbers and OCR errors must be checked in PDFs during authoring.

| Sourcebook | Examined example(s) | Schema pressure / unusual fields |
|---|---|---|
| Core Rulebook | AT-ST walker; Koensayr Y-wing | Vehicle size/combat, defenses, cover, crew/passengers, two movement scales |
| Starships of the Galaxy | BTL-S3 Y-wing; Coralskipper; Acclamator | Starship-scale movement, armament batteries, emplacement points, special/organic starships |
| Clone Wars Campaign Guide | G9 Rigger; MedStar-class frigate | Carried craft, large crews, mixed capital-ship and fighter/transport armament |
| Knights of the Old Republic Campaign Guide | AeroChaser speeder; Star Saber; light shuttle | Speeder types, jump-memory droid navigation, emplacement points |
| Force Unleashed Campaign Guide | Speeder Escort; Flare-S swoop | Used/new prices, airborne and ground vehicle speeds |
| Galaxy at War | Freeco speeder; Imperial Landing Craft | Mobile base modifications, troop capacity and multiple carried vehicle types |
| Galaxy of Intrigue | PTV-2100 Incarcerator; luxury groundspeeder | Special passenger groups such as prisoners; civilian and modified ships |
| Jedi Academy Training Manual | Chu'unthor | Colossal capital-ship/station size and unusual ship identity |
| Legacy Era Campaign Guide | Scarlet Star; Golan VIII platform | Named modified transport, station mobility and tactical-fire special rules |
| Rebellion Era Campaign Guide | Bantha-II cargo skiff; Storm IV cloud car | Open/exposed passenger and ground/air vehicle formats |
| Scum and Villainy | C-wing / X-TIE uglies; YT-1250 | Hybrid/modified hulls, nonstandard equipment; TXT/OCR degraded |
| Scavenger's Guide to Droids | DP-2 Probe Droid | Dual starfighter/ground-vehicle droid, zero crew, independent droid statistics and payloads |
| Threats of the Galaxy | CEC VCX-350 Light Freighter; Bloodfin speeder bike | Complete ship statblock and a ground vehicle; prior ship census missed freighter |
| Unknown Regions | Land Crawler; Star Seeder-class Colony Ship | Tracked/wheeled ground designs, colonization capital ship and unusual operations |

## 4. Primary JSON groups

| Required group | What it represents |
|---|---|
| `identity` | Publication-entry identity remains distinct from underlying chassis and configuration |
| `publication` | Source locator, not yet an adjudicated provenance ledger |
| `classification` | Typed classification and raw classification kept separate |
| `challenge` | Published CL is a label, not authority for replacement calculations |
| `geometry` | Combat fighting space, size and cover are independent. Enclosure is not derived blindly from cover. |
| `movement` | Movement supports any number of modes and both tactical scales |
| `hyperspace` | Unknown and explicit absence are different; navicomputer may be droid-provided |
| `defenses` | Exact published defenses, including shield and special defenses |
| `durability` | Statblock durability separate from encounter mutable values |
| `abilities` | Vehicle ability scores and stock-crew skill outcomes; do not infer unspecified scores |
| `combat` | Published combat summary; crew-derived figures must not become immutable weapon math |
| `armament` | Mounts are vehicle-owned; canonical weapon mechanics will live in a separate registry |
| `crew` | Default printed crew and crew-operated stations, not current actor links |
| `capacity` | Passengers, cargo, consumables and carried craft; preserve printed units |
| `systems` | Installed starship/vehicle systems, including unusual technology |
| `modifications` | Both emplacement points and other modification slots (not assumed synonyms) |
| `economics` | Separate new vs used and priced vs not-for-sale |
| `text` | Derived descriptions distinguish player summary from authority |
| `exceptions` | Catch-all for unusual rules; not a license to quietly skip data |
| `fieldStates` | JSON Pointer statuses: not-stated, not-applicable, explicitly-none, unclear-source, not-yet-reviewed. Each unresolved authored field requires a reason at certification. |

## 5. Full fixed-field dictionary

Every fixed field below remains **available in the JSON Schema**, but not every field is instantiated in the blank template or each vehicle. Only the 23 top-level properties are universally required; nested source-specific properties are present when needed and supported by evidence. An unpopulated nested array is generally **omitted**, not stored as `[]`. Nested array structures are defined separately below.

### `identity`

| Property | Source intent |
|---|---|
| `identity.sourceEntryKey` | Unique ID for this particular book/printed statblock entry; do not use ship name alone |
| `identity.vehicleFamilyKey` | Shared family/design lineage key, nullable until Phase 1 identity reconciliation |
| `identity.variantKey` | Stable variant key distinct from common family ID |
| `identity.name` | Published heading/name |
| `identity.manufacturer` | Manufacturer where given |
| `identity.model` | Exact model code e.g. BTL-S3 |
| `identity.className` | Class text e.g. frigate or T-65B |
| `identity.variantLabel` | Published variant/loadout/individual identifier |
| `identity.variantKind` | stock, named-ship, modified, alternate-loadout, revision, era, unknown |
| `identity.baseVehicleKey` | Explicit parent vehicle identity if confirmed; never automatic from name |
| `identity.aliases` | Alternative names from source |
| `identity.uniqueNamedVessel` | True for specific vessel such as Millennium Falcon |

### `publication`

| Property | Source intent |
|---|---|
| `publication.book` | Full book title |
| `publication.page` | Printed sourcebook page, not PDF index |
| `publication.statblockOrdinalOnPage` | Ordinal when multiple statblocks share printed page |
| `publication.printedTitle` | Book heading exactly or normalized only for transcription issues |
| `publication.printedTypeLine` | Classification/size line |
| `publication.edition` | SWSE, errata revision if known |
| `publication.entryNotes` | Editorial notes, OCR exceptions; not a provenance adjudication |

### `classification`

| Property | Source intent |
|---|---|
| `classification.primaryCategory` | ground-vehicle, airspeeder, starfighter, space-transport, capital-ship, space-station, fixed-emplacement, watercraft, other |
| `classification.chassisType` | walker, tracked, wheeled, speeder, shuttle, cruiser, freighter, station, etc. |
| `classification.mobilityDomains` | Multiple operating environments |
| `classification.combatScale` | Scales in which source supplies operation |
| `classification.role` | Roles from printed identification |
| `classification.constructionType` | mechanical, organic-living, hybrid, unknown |
| `classification.printedSize` | Complete published size including parenthetical subgroup |
| `classification.size` | fine, diminutive, tiny, small, medium, large, huge, gargantuan, colossal |
| `classification.colossalSubtype` | frigate, cruiser, station or other original subtype if given |
| `classification.sizeModifierPrinted` | Only if explicitly printed or tabulated as source claim |

### `challenge`

| Property | Source intent |
|---|---|
| `challenge.cl` | Published challenge level; do not recalculate to reflect perceived balance |
| `challenge.raw` | Printed CL text |
| `challenge.notes` | Source qualification |

### `geometry`

| Property | Source intent |
|---|---|
| `geometry.lengthMeters` | Printed dimensional length |
| `geometry.widthMeters` | Printed width |
| `geometry.heightMeters` | Printed height |
| `geometry.characterScaleWidthSquares` | Published character-scale fighting-space width |
| `geometry.characterScaleLengthSquares` | Published character-scale fighting-space length |
| `geometry.starshipScaleWidthSquares` | Starship-scale fighting-space width |
| `geometry.starshipScaleLengthSquares` | Starship-scale fighting-space length |
| `geometry.reachSquares` | Character scale reach where given |
| `geometry.coverCrew` | none, normal, improved, total, mixed or raw qualifier |
| `geometry.coverPassengers` | Passenger cover; may differ from crew |
| `geometry.enclosure` | enclosed, open, partially-enclosed, mixed, unknown |
| `geometry.exposedStations` | Positions without full enclosure |
| `geometry.notes` | Special combat occupancy rules |

### `movement`

| Property | Source intent |
|---|---|
| `movement.speedModes` | All published character and starship movement modes |
| `movement.maxVelocityKmh` | Published universal top speed if statline lists one |
| `movement.sublightDrive` | Drive type/rating when printed; no invented conversion |
| `movement.atmosphericCapability` | capable, incapable, limited, unknown |
| `movement.spaceflightCapability` | capable, incapable, limited, unknown |
| `movement.maximumAltitudeMeters` | Published operational ceiling, if any |
| `movement.turningOrManeuverability` | Source-specific restriction or rating |
| `movement.minimumSpeed` | Published forced minimum speed, if any |
| `movement.hoverCapability` | Confirmed can hover, false only if printed explicitly |
| `movement.specialMovement` | Movement powers: SLAM, unusual drives, etc. |
| `movement.raw` | Short published full Speed line |

### `hyperspace`

| Property | Source intent |
|---|---|
| `hyperspace.capability` | equipped, unavailable, optional, external, unknown |
| `hyperspace.primaryMultiplier` | Published hyperdrive x rating |
| `hyperspace.backupMultiplier` | Published backup x rating |
| `hyperspace.navComputer` | installed, none, astromech, jump-memory, biological, external, other, unknown |
| `hyperspace.jumpMemoryCount` | Number of preprogrammed jumps, if printed |
| `hyperspace.astromechRequirement` | R2, utility droid, optional or mandatory if specified |
| `hyperspace.routeConstraints` | Known limitation or source specific rule |
| `hyperspace.raw` | Printed Hyperdrive + navicomputer text |

### `defenses`

| Property | Source intent |
|---|---|
| `defenses.reflex` | Published Reflex Defense |
| `defenses.reflexFlatFooted` | Published flat-footed Reflex |
| `defenses.fortitude` | Published Fortitude Defense |
| `defenses.will` | Published Will Defense when printed |
| `defenses.armorBonus` | Printed armor contribution |
| `defenses.otherDefenseBonuses` | Vehicular Combat and special conditionals |
| `defenses.vehicularCombatIncluded` | Indicates named VC modifier in statblock if present |
| `defenses.damageReduction` | Published DR; null not equivalent to DR 0 |
| `defenses.shieldRating` | Published SR |
| `defenses.shieldType` | Conventional, organic/dovin-basal, directional, unusual |
| `defenses.shieldRecharge` |  |
| `defenses.shieldArcs` | Special printed shield arcs/segments |
| `defenses.immunities` | Source-specified immunities |
| `defenses.resistances` | Special defenses and typed resistances |
| `defenses.vulnerabilities` | Ion vulnerability, weaknesses |
| `defenses.otherDefenses` | Special defenses not mapped above |

### `durability`

| Property | Source intent |
|---|---|
| `durability.hitPoints` | Published hp baseline; NOT current runtime actor HP |
| `durability.damageThreshold` | Published threshold |
| `durability.hardness` | Object rules hardness, if ever explicit; not assumed to equal DR |
| `durability.conditionTrackRules` | Special threshold/track rules |
| `durability.criticalDamageRules` | Critical/subsystem vulnerability rules |
| `durability.repairRules` | Repair/damage-control rules specific to design |
| `durability.failureModes` | Special destruction/disabled/ion behavior |

### `abilities`

| Property | Source intent |
|---|---|
| `abilities.str` | Published vehicle STR |
| `abilities.dex` | Published vehicle DEX |
| `abilities.con` | Published CON; may be expressly dash |
| `abilities.int` | Published vehicle INT |
| `abilities.wis` | Published WIS |
| `abilities.cha` | Published CHA |
| `abilities.initiativePrinted` | Published Initiative bonus |
| `abilities.perceptionPrinted` | Published Perception bonus |
| `abilities.senses` | Published senses |
| `abilities.skills` | All published Skills line values |
| `abilities.languages` | If statblock actually includes languages |

### `combat`

| Property | Source intent |
|---|---|
| `combat.baseAttackBonusPrinted` | Published crew/sample Base Atk value |
| `combat.grappleBonusPrinted` | Published Grp value |
| `combat.rangedAttackLine` | Short source Ranged line, including AND/OR choices |
| `combat.meleeAttackLine` | Melee line when present |
| `combat.attackOptions` | Attack Options list |
| `combat.specialActions` | Special action definitions if printed |
| `combat.feats` | Printed source-specific crew/vehicle feat references |
| `combat.talents` | Printed source-specific references |
| `combat.tacticalFire` | Capital/space-station tactical fire effects |
| `combat.otherCombatRules` | Combat exceptions not otherwise accommodated |

### `armament`

| Property | Source intent |
|---|---|
| `armament.weaponMounts` | Every physical weapon or firing station entry from source |
| `armament.firingGroups` | AND/OR attack declarations, linked weapons, batteries |
| `armament.carriedPayloads` | Missile/torpedo/rocket complement or other ordnance |
| `armament.weaponOptions` | Special firing restrictions/capabilities |
| `armament.unresolvedWeaponNames` | No generic stand-in allowed |
| `armament.notes` | Weapon listing reconciliation notes |

### `crew`

| Property | Source intent |
|---|---|
| `crew.crewCount` | Published crew complement |
| `crew.minimumOperatingCrew` | Minimum effective crew if printed |
| `crew.crewQuality` | untrained, normal, skilled, expert, ace, heroic, custom, other |
| `crew.crewDescriptor` | Printed modifiers or distribution such as 1 pilot plus two gunners |
| `crew.crewIsOptional` | Vehicle autonomous or controlled remotely if stated |
| `crew.autonomy` | crewed, autonomous, remote-controlled, biological-operator, other, unknown |
| `crew.stations` | Crew roles and controls |
| `crew.stockCrewSpecialRules` | Crew-specific or command rules |
| `crew.raw` | Printed Crew field |

### `capacity`

| Property | Source intent |
|---|---|
| `capacity.passengerCount` | Numeric passenger capacity if unqualified |
| `capacity.passengerGroups` | Passenger roles and constraints |
| `capacity.cargo` |  |
| `capacity.cargoMetricTons` | Standardized metric tonnes only when verified conversion; never replace published original |
| `capacity.consumables` |  |
| `capacity.carriedCraft` | Statblock carried craft with quantities |
| `capacity.escapePods` | Published escape pod number |
| `capacity.dockingCapacity` |  |
| `capacity.towCapacity` |  |
| `capacity.lifeSupport` | Capacity/absence/requirements |
| `capacity.storageNotes` | Special cargo/passenger tradeoffs |

### `systems`

| Property | Source intent |
|---|---|
| `systems.installed` | All nonweapon installed systems from publication |
| `systems.sensors` | Dedicated sensor and detection packages |
| `systems.communications` | Communications and jammers |
| `systems.tractorBeams` | Nonweapon-mode tractor equipment, if source describes it this way |
| `systems.propulsion` | Engine/sublight/SLAM components |
| `systems.power` | Power generation/allocation |
| `systems.environment` | Life-support, airlocks, environmental protection |
| `systems.security` | Cloaking/security/detection countermeasures |
| `systems.interfaces` | Astromech sockets, droid brains, computer interfaces |
| `systems.miscellaneous` | Other systems |

### `modifications`

| Property | Source intent |
|---|---|
| `modifications.emplacementPointsTotal` | Printed base total, if given |
| `modifications.emplacementPointsUsed` | Printed used points, if given |
| `modifications.emplacementPointsRemaining` | Printed remaining points, not automatically inferred here |
| `modifications.modificationSlotsTotal` | Source-defined slots, when applicable |
| `modifications.modificationSlotsUsed` | Slots consumed, when printed |
| `modifications.modificationSlotsRemaining` | Remaining slots when printed |
| `modifications.installed` | Published permanent changes and packages |
| `modifications.templates` | e.g. junker, advanced or other source-defined templates |
| `modifications.constraints` | Size/cost/restrictions on modification |
| `modifications.notes` | Source notes; do not infer emplacement points from later-size defaults |

### `economics`

| Property | Source intent |
|---|---|
| `economics.priceNew` |  |
| `economics.priceUsed` |  |
| `economics.availability` | Licensed, Restricted, Military, Illegal, Rare, Unique, etc. |
| `economics.availabilityNotes` | Market or source qualifications |
| `economics.serviceOrMaintenanceCosts` | If source explicitly gives operating costs |
| `economics.acquisitionRestrictions` | License/availability conditions |
| `economics.notes` | Do not fill a new price from commentary on hypothetical market value |

### `text`

| Property | Source intent |
|---|---|
| `text.summary` | Short original player-facing summary, not a copied publication paragraph |
| `text.mechanicalNotes` | Brief mechanical overview assembled from certified data |
| `text.sourceNotes` | Concise transcriber remarks, not long verbatim source passages |
| `text.displayName` | UI display override if needed |
| `text.tags` | Friendly filters |

### `exceptions`

| Property | Source intent |
|---|---|
| `exceptions.specialRules` | Rare mechanics outside normal domains |
| `exceptions.unmappedFacts` | Every unmapped printed field blocks certification, not discarded |
| `exceptions.ambiguities` | Unresolved questions |
| `exceptions.transcriptionWarnings` | Readability issues in TXT requiring visual PDF review |
| `exceptions.manualReviewRequired` | Whether an editor must inspect ambiguous material |

### `fieldStates`

JSON Pointer to the exact leaf/array requiring explanation. Accepted reasons: `not-stated`, `not-applicable`, `explicitly-none`, `unclear-source`, `not-yet-reviewed`. Unknown is *not* a synonym for zero. Example: `"/hyperspace/primaryMultiplier": "not-applicable"` on a grounded walker, while an unidentified freighter might have `"not-yet-reviewed"`.

## 6. Nested object shapes

The schema includes typed definitions for these repeated structures; all of their fields are required **within each array/object member**.

### `quantity`

| Field | Purpose |
|---|---|
| `value` | Published or normalized numerical value, never inferred without marking derivation |
| `unit` | Physical unit, e.g. kg, metric-ton, m, days, months, years, credits, squares, km/h |
| `raw` | Short printed source field, preserving unusual qualifiers |
| `qualifier` | e.g. approximately, each, external, up to, carried |

### `skill`

| Field | Purpose |
|---|---|
| `name` | Skill name |
| `printedModifier` | Published signed bonus |
| `governingAbility` | When specified |
| `attribution` | vehicle-crew derived, computer, autonomous, or unspecified |
| `conditions` | Restrictions/skill mode |
| `raw` | Short printed skill notation |

### `rule`

| Field | Purpose |
|---|---|
| `key` | Stable proposed mechanic identifier |
| `label` | Rule/ability name |
| `category` | rule family, e.g. special-system, weakness, aura, mobility, attack, action |
| `summary` | Short original paraphrase only; no full-book rules copied |
| `activation` | Activation trigger/time |
| `resource` | Cost or consumption expression |
| `effect` | Mechanical effect represented in future typed schema |
| `limits` | Conditions/restrictions |
| `reference` | Book page or other publication pointer when established |
| `implementationStatus` | unclassified, structured, requires-consumer, unsupported |

### `speed`

| Field | Purpose |
|---|---|
| `mode` | walking, tracked, wheeled, repulsorlift, flying, swimming, hovering, burrowing, starship-flight, other |
| `scale` | character or starship |
| `squaresPerMove` | Printed speed in squares |
| `maxVelocityKmh` | Maximum listed velocity, if any |
| `altitudeMeters` | Maximum operating altitude, if stated |
| `terrainRestrictions` | Conditions for speed mode |
| `raw` | Short printed speed clause |

### `station`

| Field | Purpose |
|---|---|
| `stationKey` | Stable role key for this statblock |
| `role` | pilot, copilot, gunner, commander, engineer, system-operator, other |
| `count` | Number of stations for role |
| `minimumCrew` | Minimum operators when stated |
| `skill` | Relevant operating skill if printed |
| `controls` | Controlled functions |
| `restrictions` | Unusual staffing or assistance requirements |

### `passengerGroup`

| Field | Purpose |
|---|---|
| `group` | troops, prisoners, droids, passengers, external riders, etc. |
| `count` | Printed number |
| `conditions` | Restrictions |
| `raw` | Printed passenger clause |

### `carriedCraft`

| Field | Purpose |
|---|---|
| `name` | Carried craft or vehicle |
| `count` | Published count |
| `category` | Ship, walker, speeder, escape pod, unspecified |
| `raw` | Original shorthand |

### `weaponMount`

| Field | Purpose |
|---|---|
| `mountKey` | Unique physical mount key within this vehicle source entry |
| `weaponDefinitionKey` | Separate canonical weapon authority key; null until identity certified |
| `printedName` | Source weapon name; always preserve exact model/descriptor |
| `weaponCount` | Number of individual weapons installed; distinct from batteries/mount count |
| `mountCount` | Physical mounting count when discernible |
| `configuration` | Single, double, quad, linked, battery, other printed configuration |
| `location` | Physical location on vehicle, if given |
| `firingArc` | Front, rear, port, starboard, dorsal, turret, all, other or null |
| `mountType` | fixed, turret, swivel, external, internal, other or null |
| `fireLinked` | Weapon fire linking status when established |
| `batteryGroupKey` | Battery membership identifier, if battery |
| `gunnerStationKey` | Linked crew station key only when actually certified; raw role lives in `operatorRolePrinted` |
| `gunnerCount` | Crew needed for weapon/battery as published |
| `firingScale` | character, starship, dual, other |
| `attackBonusPrinted` | Published ATK bonus, not gunner intrinsic bonus |
| `attackBonusAutofirePrinted` | Autofire alternate attack bonus if shown |
| `damagePrinted` | Damage dice/special as published; parser must not guess |
| `damageMultiplierPrinted` | x2/x5/x10 if actually in source |
| `damageTypePrinted` | Ion/stun/other if specified |
| `rangePrinted` | Ranges or relative range class from source |
| `criticalPrinted` | Critical effect/range when specified |
| `attackModes` | Published attack capabilities |
| `ammo` | Per-mount missiles/torpedoes/shots if stated |
| `payloadNames` | Payload references |
| `alternateFireGroupKey` | Firing mode group used in the Ranged OR/AND attack line |
| `specialRules` | Special weapon behavior |
| `raw` | Short printed weapon statline |
| `resolutionStatus` | unresolved, printed-only, matched-canonical, source-verified |

### `fireGroup`

| Field | Purpose |
|---|---|
| `groupKey` | Stable local group name |
| `label` | Print-facing attack choice or battery group |
| `operator` | and, or, battery, single, simultaneous, special |
| `mountKeys` | Participating mounts |
| `attackBonusPrinted` | Group printed attack modifier if any |
| `specialNotes` | OR/AND alternatives, crew coordination, battery attack bonuses |

### `system`

| Field | Purpose |
|---|---|
| `systemKey` | Registry key after later reconciliation |
| `printedName` | Named installed equipment |
| `category` | sensors, computer, life-support, propulsion, tractor, shield, stealth, docking, communications, other |
| `quantity` | Number of installed components if printed |
| `rating` |  |
| `functionSummary` | Concise printed mechanic summary |
| `status` | installed, optional, specified-absent, unverified |
| `raw` | Short printed line |

### `modification`

| Field | Purpose |
|---|---|
| `name` | Published modification, template, upgrade or replacement |
| `category` | modification type |
| `emplacementPoints` | Points consumed if printed |
| `slotsConsumed` | Slots consumed if printed |
| `isNonstandard` | Nonstandard per source, if stated |
| `installed` | Part of published source configuration |
| `notes` | Brief mechanical details |

### `price`

| Field | Purpose |
|---|---|
| `amountCredits` | Published price in credits |
| `status` | priced, not-for-sale, no-price-stated, estimated, variable, unavailable, ambiguous |
| `raw` | Printed amount or phrase |
| `qualifier` | Excludes weapons, black-market, approximate, etc. |

## 7. Weapon authority — avoid repeating the earlier weapon migration mistake

`armament.weaponMounts[]` **only** stores details about how a weapon is installed on this particular vehicle: mount key, number of weapons, battery/fire linkage, arcs, gunners, printed attack bonus and damage line, and missile complement. It references `weaponDefinitionKey` only when that identity is verified.

`swse-phase0b-vehicle-weapon.schema.json` is a separate draft for the intrinsic canonical weapon definition, with weapon categories, executable attack profiles, alternate modes, damage and scaling, ammunition, payloads and special effects. Its design must reconcile with the repo’s already-established canonical weapon runtime (`WeaponRuntimeResolver`/`ResolvedAttackProfile`) and v2 damage packet. No new parallel roll/damage pipeline is authorized.

**Example:** A large capital ship with 10 turbolasers does not carry 10 copies of the canonical turbolaser damage definition. It carries one or more mounting/firing group entries referencing the same weapon authority, each with its own counts, firing arc and crew operation. The printed capital-ship gunner attack bonus stays in the source entry for provenance/comparison only.

## 8. Categories are multidimensional, not exclusive

- **Primary category**: e.g. ground-vehicle (with walker chassis), starfighter, capital ship, station, fixed emplacement or ridden mount. A biological ridden creature should carry its own creature/ride restrictions rather than be forced into spaceship defaults.
- **Chassis and propulsion**: walker, tracked, wheeled, speeder, droid-propelled, repulsorlift, living vessel, etc.
- **Operating environments**: ground, atmosphere, space, water, stationary; these are an array.
- **Scale**: character and/or starship; recorded movement modes and fighting spaces are separate.
- **Physical construction**: machine, living/organic, hybrid. Organic ships are not forced into ordinary shield/armor assumptions.

Two source examples show why: the **DP-2 Probe Droid** is identified as a Large *starfighter/ground vehicle* and has 0 crew. A **Golan VIII Space Defense Platform** is a station but its printed statblock lists a conditional starship-scale fly speed. Neither can be handled by `if category=station then speed=0`, or by making all vehicles require a pilot.

## 9. Missing-data and certification contract

| Case | How it is recorded |
|---|---|
| Source explicitly says no passengers | `passengerCount: 0` or `fieldStates["/capacity/passengerCount"]: "explicitly-none"` when only textual none is available |
| No hyperdrive applicable to a conventional AT-AT | `primaryMultiplier: null` + `not-applicable` |
| Hyperdrive not given for a particular spacecraft | `primaryMultiplier: null` + `not-stated` (after confirming omission) |
| Reading blocked by OCR | `null` + `unclear-source` and issue in `exceptions.transcriptionWarnings` |
| Shield rating explicitly absent | `shieldRating: 0` if published 0; otherwise `null` + `explicitly-none` |
| Source says “not available for sale” | `economics.priceNew.status: not-for-sale`, `amountCredits: null` |
| No weapon line in a printed unarmed vehicle | `armament.weaponMounts: []`, status `explicitly-none` if verified |
| Printed rules do not fit the current schema | `exceptions.unmappedFacts[]` and certification fails pending schema extension |

The JSON Schema validates the **shape**, not whether all values have been faithfully transcribed. Phase 2 must add a semantic validator enforcing all null/empty authored fields have appropriate statuses, mount and station keys are valid, physical speed units are consistent, weapon quantities/firing groups reconcile, and no `unmappedFacts` remain at certification.

## 10. Variants and publication conflicts

Use three keys, rather than deduping by name: `sourceEntryKey` uniquely identifies the printed statblock; `vehicleFamilyKey` later connects confirmed related models; `variantKey` denotes a distinct physical/loadout/era/configuration version. A named ship has its own source entry and `uniqueNamedVessel=true`, possibly with a `baseVehicleKey` when that derivation is actually established.

**No automatic precedence.** Different CL, weapons, stats, SR, installed equipment, crew complement and cost in different books remain different publication claims. Later sourcebooks do not erase earlier sourcebook identities. Phase 1 may annotate additive reprints, corrections, revisions or genuine variants, but no source claim is destroyed.

## 11. Validation and edge fixtures

- Draft 2020-12 schema passes `jsonschema.Draft202012Validator.check_schema`.
- The complete blank record validates against the universal vehicle schema.
- Two separately instantiated Y-wing demonstration records validate with the same fixed structure; SR 25 and SR 10 remain separate.
- Vehicle-mounted weapon authority schema passes Draft 2020-12 schema validation.
- Schema **not yet frozen**; six adversarial fixtures are now structurally tested, while a vehicle with no weapons, an exposed-crew craft, a Scum and Villainy ugly fighter, and independent weapon authority claims remain for testing before freeze.

## 12. Local deliverables and rollout

| File | Purpose |
|---|---|
| `swse-phase0b-vehicle.schema.json` | Universal source-entry record schema v0.5; 23 required top-level properties (21 data/control groups plus schemaVersion and recordType) |
| `swse-phase0b-vehicle.blank.json` | Compact 23-key blank with sparse nested groups, ready for transcription |
| `swse-phase0b-vehicle-weapon.schema.json` | Separate weapon authority draft |
| `swse-phase0b-variant-fixtures.json` | Two separate source claims demonstrating non-destructive variants |
| `swse-phase0b-vehicle-schema.md` | This design reference and full data dictionary |
| `swse-phase0-ship-census.json` / `.md` | Rolling ship census updated by one recovered Threats entry (now 312 preliminary entries) |

No repository writes, branches, pushes, or production data changes were made.

## 13. Adversarial schema stress test (draft-0.3)

Six different sourcebook statblocks passed the **shape** test and 20 independent semantic checks. These specimens are recorded in `swse-phase0b-dryrun-fixtures.json` and the machine/human reports `swse-phase0b-dryrun-report.json` / `.md`. They remain illustrative and not canon-certified.

New fixed fields: `classification.secondaryCategories`, `classification.entityNature`, `publication.sourceRepresentations`, `geometry.occupantCoverModifiers`, `weaponMount.operatorRolePrinted`, and `weaponMount.batteryCountPrinted`. These preserve hybrid droid classification, the X-wing astromech cover bonus, and distinguish printed batteries/operators from inferred mount counts and resolved crew stations.

At v0.3 this section described a prior count; the current v0.5 universal contract has 23 required top-level properties: `schemaVersion`, `recordType`, and 21 data/control groups (including `rules`). All six source fixtures and both previously created Y-wing variant fixtures are updated to the same v0.3 schema. **No category-specific removal of groups is permitted.** Hyperdrive availability and other unknowns must not be inferred from category alone.

**Still open:** typed conditional predicate grammar; certification validator for nested data/field states; separate intrinsic weapon-definition stress test; wider unusual-vehicle sampling; line-by-line source completeness review. Draft success is not publication certification or runtime certification.
## 14. Independent weapon authority stress test (Phase 0-B continuation)

The universal vehicle schema remains `swse.vehicle.phase0b.draft-0.3`. The independent weapon schema advanced to `swse.vehicle-weapon.phase0b.draft-0.3` after eleven weapon/payload/control probes, two installation compositions, and four additional universal vehicle probes. See `swse-phase0b-weapon-stress-report.md` for primary evidence and 37 passing semantic/structural checks. Neither schema nor content is frozen.

**New weapon schema fixed top-level fields:** `definitionKind`, `identityStatus`, `authorityStatus`, `baseWeaponKey`, `profilesTyped`, `intrinsicRules`, `configurationStates`, `compatiblePayloadKeys`, `deliveryMechanism`, `installationConstraints`, `fieldStates`. They supplement source-entry identity, published tables, and earlier nonexecuting flat evidence.

**Typed attack profile:** `profileKind`, `resolution` (attack-vs-defense, fixed DC, follow-up opposed check, autonomous trigger), `damage` (owner, dice, multiplier, types), `area` (shape, sizes, scale and miss outcome), `resource` (capacity, type, units, consumption), `effects` (typed operation and predicate), `specialConditions`, and `executionStatus`. Status does not imply a runtime implementation exists.

**New invariant:** an installed battery's count, a ship's printed crew attack bonus, ammunition carried, and gun mount count remain *vehicle-specific*; intrinsic weapon damage or effects, payload rules, cost, and emplacement constraints live in independent authority. Fire-link modifiers are neither weapon batteries nor a reason to duplicate generic weapon definitions.

**Unarmed fixture:** A vehicle missing a Ranged line gets empty `armament.weaponMounts` but `fieldStates["/armament/weaponMounts"] = "not-stated"` unless the book affirmatively establishes it has no weapons. The C-wing fixture verified from its PDF lists SR 30, and the eight carried proton torpedoes must not be equated with eight mounted launchers.

See the standalone report for remaining publication, field-state and runtime-semantic certification gates.


## Phase 0-B continued: semantic contract v0.4

The universal schema now includes the required `rules` group, typed conditional-expression nodes (`atom`, `all`, `any`, `not`, `unresolved`), typed effect timing, and global-rule references. Source-global vehicle combat calculations stay outside per-ship JSON. The weapon schema adds `conditionalMechanics`, per-profile predicate AST slots and typed ammunition stock owner / expenditure basis. Fire groups gain nullable verified weapon-count and aiding-gunner fields. See `swse-phase0b-semantic-contract-report.md` for source checks, test results and strict-gate blockers.

**Current certification state:** 31/31 targeted v0.4 regression checks pass, but strict nested field-state gate is incomplete in all 12 illustrative vehicle records. There are 2,124 unclassified null/empty-array paths; no automatic status assignments were fabricated. All schema outputs remain draft.


## Phase 0-B continued: v0.5 nullable capabilities / sparse fields (current policy)

**This section supersedes earlier v0.3/v0.4 instructions that required every nested field or every empty array to have its own placeholder.** Older test results and schema descriptions above are retained as historical context only.



Every vehicle entry uses the **same 23 top-level properties**. Each vehicle has access to all the defined nested fields. However, detailed fields are authored only when applicable and supported by an actual source claim.

| Representation | Meaning | Source certification requirement |
|---|---|---|
| `"armament": null` | Verified that this vehicle has no installed weapons | `/armament`: `explicitly-none` or `not-applicable` |
| `"hyperspace": null` | Verified no applicable hyperdrive | `/hyperspace`: `explicitly-none` or `not-applicable` |
| `"defenses": {"shieldRating": null}` | Verified absent/inapplicable shields | `/defenses/shieldRating`: `explicitly-none` or `not-applicable` |
| `"defenses": {"shieldRating": 0}` | Actual published numerical zero | Preserve `0`, never replace with null |
| `"armament": {}` | Placeholder during draft transcription; no positive assertion | Keep review status unfinished, do not certify as unarmed |
| `"armament": {"weaponMounts": [{...}]}` | At least one published installed weapon claim | Identify printed name, installation and source values when established |
| Omitted nested property | Unentered, not printed, or unresolved | When necessary, annotate its JSON Pointer as `not-stated` or `not-yet-reviewed`; do not interpret omission as proof of absence |
| `"systems": null` or `"modifications": null` | Confirmed absent applicable installed systems/modifications | Positive field-state annotation required |

Null is **not** the default for incomplete transcription. This is essential: otherwise the smaller schema would merely conceal the omissions made by the earlier Python scrape.

## 2. Mechanical consequences

- The required root stays uniform across AT-AT, X-wing, capital ship, station, and DP-2. `armament`, `hyperspace`, `systems`, and `modifications` may be null as whole capabilities.
- When `armament` is null, there are no `weaponMounts`, `firingGroups`, `ammo`, or attack-pattern child placeholders. If it is populated, only supported child fields are supplied.
- `hyperspace` contains `primaryMultiplier`, `backupMultiplier`, `navComputer`, etc. only when those properties are relevant and known. A spacecraft can have an applicable nav system even without a conventional hyperdrive; classification is not used to delete fields automatically.
- Existing `defenses` remains a group, because an unshielded vehicle still has Reflex, Fortitude, etc. `shieldRating` can be number, null, or omitted while under review.
- Nested quantities such as cargo, consumables, docking capacity, shield recharge, and prices accept null when *confirmed* absent, or can be omitted from draft objects.
- Weapon-definition records are still independent identities; optional unused top-level profile and resource families can be omitted. Installed mounts remain separate from weapon-definition mechanics.
- The old structured conditional rules and global battery/scale registry are preserved; their execution has **not** been newly certified.

## 3. Migration and regressions

| Test or metric | Result |
|---|---:|
| Source-based illustrative vehicle records validating | **12/12** |
| Intrinsic weapon source-sample records validating | **11/11** |
| Synthetic absence/unknown contrasting examples | **2/2** |
| Null/zero/sparse/structure behavior checks | **11/11** |
| Structural schema errors | **0** |
| Null-without-proof errors in reviewed nullable fields | **0** |
| Old fixture null/empty placeholders (excluding fieldStates) | **2,634** |
| New fixture null/empty placeholders (excluding fieldStates) | **158** |
| Placeholder locations eliminated | **2,476** |
| Nonblank published mechanical/source facts lost under comparison | **0** |
| Fully canon-certified vehicles | **0** |

**Important accounting note:** The v0.4 report's 2,124 count was *unclassified* paths; the 2,634 and 158 figures here are *all* null/empty placeholder locations in the same 12 test records, excluding the field-state ledger. The metrics have different denominators and should not be directly compared.

All nonblank nested source facts were compared by record name and JSON path against the archived v0.4 files. Coralskipper's prior `hyperspace.capability = "unavailable"` is represented by `hyperspace: null` with `fieldStates["/hyperspace"] = "explicitly-none"`; this intentional normalization is accounted for in the comparison.

## 4. Source-sensitive exceptions

- **Model 67 Shrieker:** The weapon line was not printed, but that is not affirmative proof of no equipment. Its `armament` remains a draft sparse object with `not-stated` evidence; it is **not** assigned null.
- **AT-AT / AT-RT:** Ground-only vehicles use `hyperspace: null` with `not-applicable` as an illustrative fixture determination, not an inferred numeric zero.
- **DP-2:** Classification as a hybrid droid-vehicle does not force hyperdrive absence. Its hyperspace evidence remains under review; the future droid refactor does not remove this vehicle record.
- **C-wing Ugly:** Its existing x2 hyperdrive value remains in an object even though some related navigation details are still untranscribed.
- **Cross-book Y-wings:** Separate SR 25 and SR 10 remain unchanged. Their unfinished weapon/hyperdrive entries are sparse objects rather than fabricated nulls.

## 5. Certification gate

Run `python phase0b_certification_gate.py --self-test` for the v0.5 behavioral probes; `python phase0b_certification_gate.py` for structural and absence-state checks; `python phase0b_certification_gate.py --strict` when ready for certification.

The strict check intentionally **fails for the 12 fixtures**: their `rules.reviewStatus` is not `certified`, some pages are unverified, and some fields retain `not-yet-reviewed` or unresolved status. This is correct behavior, not a schema design defect. The schema does not certify content by itself.

**Remaining before freeze:** sourcebook-by-sourcebook transcription policy, completeness definition for genuinely unstated fields, independent weapon identity reconciliation, and the established conditional-rule/scale runtime-consumption audit. No historical source claims or global-rule policies were silently rewritten in this pass.


See `swse-phase0b-v05-nullable-schema-report.md` for the full metric audit and status; all source records remain uncertified.
