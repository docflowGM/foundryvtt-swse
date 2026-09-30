# Phase 3D-1 — Production Extras Census

Read-only census of the **92** production talent records that Phase 3C protected (90 production-only deferred + 2 review-only extras).
Machine-readable source: `data/audits/talent-phase-3d-production-extras-census.json` (regenerate with `node tools/build-talent-phase-3d-census.mjs`).
No production data was modified. `provisionalDisposition` is a heuristic, not a decision; every record is `UNADJUDICATED`.

## Grouping analysis (analysis only)

- **byGroup**: REVIEW_EXTRA = 2, DEFERRED_PRODUCTION_ONLY = 90
- **byRegistryStatus**: REVIEW_EXTRA = 2, REPO_TREE_PRESENT = 39, REPO_ONLY_NONCANONICAL_HOMEBREW = 38, SOURCE_VERIFIED_SPECIAL_TREE = 10, UNREGISTERED_OR_NONCANONICAL_TREE = 2, REPO_ONLY_SPECIAL_OR_UNRESOLVED = 1
- **sameNameCanonicalExists**: yes = 4, no = 88
- **nameFoundInSourcebookText**: yes = 35, no = 57
- **hasHeadingLikeSourcebookLine**: no = 87, yes = 5
- **treeMissingFromPack**: no = 90, yes = 2
- **productionSourceField**: no-source-field (records carry no source/page in production) = 92
- **carriesAbilityMeta**: yes = 92
- **referenceClassesPresent**: ACTOR_OR_PACK_DATA = 6, AUDIT_HISTORY = 92, DOC_OR_CLEANUP_PLAN = 56, GENERATED_DERIVED_DATA = 30, OTHER_DATA = 1, STRUCTURAL_RUNTIME_REGISTRY = 92, STRUCTURAL_TREE_MEMBERSHIP = 92, TEST = 7, TOOL = 6
- **referencedByActorOrPackData**: yes = 6, no = 86
- **provisionalDisposition**: REVIEW_REQUIRED = 82, KEEP_NONBOOK_SUPPORTED = 10

### Records per tree

| Tree | Records |
|---|---|
| Jumptrooper [25d99948c9cb41ad] | 7 |
| Smashball Pro [bfc1356c66c74783] | 4 |
| Bomarr Monk [8955568285ba4115] | 3 |
| Beastwarden [ed899f9f41fc1391] | 3 |
| Cloner [8e44e56069274319] | 3 |
| Mercenary [4007fa87192b5884] | 3 |
| Infamy [c1be604242cb328f] | 2 |
| Morgukai Warrior [0a61ab9ece844326] | 2 |
| Dark Side [de95d37c72b1c4cd] | 2 |
| Cowardice [acb91d3803eb4fcd] | 2 |
| Force Item [01e443d93e47f9c4] | 2 |
| Warrior [13776eed744d410c] | 2 |
| Alter [6ac3416fb6aada56] | 2 |
| Sorcerer Of Tund [cfd358ef61fb47bd] | 2 |
| Mechanic [38d7c18ce4664c66] | 2 |
| Inspiration [72d32ebcbb607314] | 2 |
| Science [00cb74839a524276] | 2 |
| Sith [d1037bc7a08ea80b] | 2 |
| Dathomiri Witch [ad16f3e5f4f7441b] | 2 |
| Jedi Investigator [44554c28675292b6] | 2 |
| Defensive Duelist [fc978e442f544dbe] | 2 |
| Master of Teräs Käsi [ba726f623e42f849] | 1 |
| Bothan Spynet [d20682671d035cef] | 1 |
| Midichlorian [e85cb1a787e24cac] | 1 |
| Rebel Recruiter [a2c6962521c29361] | 1 |
| Brawler [67fdd8dce9abd6c1] | 1 |
| Control [d3661aa9906bdc79] | 1 |
| Naval Officer [057a978a7dc1d5a7] | 1 |
| Gladiatorial Combat [12a2a02b0901605d] | 1 |
| Dark Side Devotee [dark-side-devotee] | 1 |
| Force Adept [e35ee41362604227] | 1 |
| Pistoleer [ed77ab2e234089ed] | 1 |
| Sith Alchemy [a67faf2ae089ab5d] | 1 |
| Jedi Weapon Master [7db97c2c7ebca579] | 1 |
| Specialized Droid [cec49bc60d1646b1] | 1 |
| Disciple Of Twilight [4da769d7c5f44232] | 1 |
| Privateer [df6678946610c554] | 1 |
| Influence [8375b9b26b679901] | 1 |
| Wingman [5f355ad4093d2bf8] | 1 |
| Ember Of Vahl [c6eee4889411411b] | 1 |
| Force Warrior [11f99465ba4847e2] | 1 |
| Commando [798ed0945cbdac1c] | 1 |
| Jedi Guardian [jedi-guardian] | 1 |
| Jedaii Ranger [dcac793cc9fe42a7] | 1 |
| Gunslinger [cb6f775cd227a3e3] | 1 |
| Implant [d8a71a6c5b2b7581] | 1 |
| Mystic [a3d0b7c9a6d041f2] | 1 |
| Master Of The Amphistaff [d5b60c4f058c4085] | 1 |
| Chalactan Adept [f3881205595248d4] | 1 |
| Critical Master [71e99c646b18d85c] | 1 |
| Piracy [61db5e2c0c44ef67] | 1 |
| Felucian Shaman [8a61bf426391431b] | 1 |
| Galactic Senator [feb08c2834a447ab] | 1 |
| Exceptional Followers [37f3554a2f30425a] | 1 |
| Jedi Consular [e99cfa9db8493573] | 1 |
| Treatment [c1cf52502cf74435] | 1 |
| Melee Duelist [1381bb8c9a838279] | 1 |
| Sense [d6b4331c0e31f7e3] | 1 |
| Blackguard Wilder [d2535361d1b146cd] | 1 |
| Misfortune [67b59e020c1660eb] | 1 |

## Records

| ID | Name | Tree | Registry status | Same-name canon | In sourcebook TXT | Ref files (actor/pack data) | Provisional |
|---|---|---|---|---|---|---|---|
| `a7d8c4da96eacad4` | Notorious | Infamy | REVIEW_EXTRA | 2 | Clone Wars Campaign Guide; Core Rulebook | 22 (3) | REVIEW_REQUIRED |
| `222327492c484b4a` | Teräs Käsi Basics | Master of Teräs Käsi | REVIEW_EXTRA | 1 | Galaxy At War; Threats of the Galaxy | 15 (2) | REVIEW_REQUIRED |
| `0c9b0788ad42450c` | Extended Critical Range | Bothan Spynet | REPO_TREE_PRESENT | 0 | Force Unleashed Campaign Guide; Unknown Regions | 5 (0) | REVIEW_REQUIRED |
| `0cdd50aaa65e4360` | Voices | Midichlorian | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Clone Wars Campaign Guide; Galaxy At War | 6 (0) | REVIEW_REQUIRED |
| `0de7338c2b984b96` | Droid Receptacle | Bomarr Monk | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `0e6854d8aacc48dc` | Stay in the Fight (Recruit) | Rebel Recruiter | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `125b5aa00f5a4d0a` | Morgukai Resolve | Morgukai Warrior | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `12e6b524fc6959b6` | Unbalance Strike | Brawler | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `14cc3ddc051f4ece` | Animal Companion | Beastwarden | REPO_TREE_PRESENT | 0 | Unknown Regions | 5 (0) | REVIEW_REQUIRED |
| `192279eaa0b61d36` | Dark Preservation | Dark Side | SOURCE_VERIFIED_SPECIAL_TREE | 0 | Legacy Era Campaign Guide | 10 (2) | KEEP_NONBOOK_SUPPORTED |
| `1bda3fdaa84240d3` | Mobility | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Clone Wars Campaign Guide; Core Rulebook | 7 (0) | REVIEW_REQUIRED |
| `208e1e15e989323f` | Telekinetic Stability | Control | SOURCE_VERIFIED_SPECIAL_TREE | 0 | Legacy Era Campaign Guide | 9 (0) | KEEP_NONBOOK_SUPPORTED |
| `213d97c2cbbd4f81` | Not in the Face | Cowardice | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `23852d30490fc1e4` | Combined Fire (Naval) | Naval Officer | REPO_TREE_PRESENT | 0 | — | 9 (0) | REVIEW_REQUIRED |
| `247b9ba1f8d34683` | Retrovirus | Cloner | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `271024ca2ac6c04b` | Multiattack Proficiency (exotic) | Gladiatorial Combat | REPO_TREE_PRESENT | 0 | Knights of the Old Republic Campaign Guide | 10 (0) | REVIEW_REQUIRED |
| `2c27842384e55cb2` | Mercenary's Grit | Mercenary | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `2f6bdc483d8f4aa8` | Serene Courage | Bomarr Monk | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `35350a8b3d2a4810` | Empowered | Force Item | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Core Rulebook | 7 (0) | REVIEW_REQUIRED |
| `395daa7cd6f14b8f` | Rough Landings | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 8 (0) | REVIEW_REQUIRED |
| `3cc9552cfab59676` | Embrace Dark Side | Dark Side Devotee | UNREGISTERED_OR_NONCANONICAL_TREE | 0 | — | 11 (0) | REVIEW_REQUIRED |
| `3df46d093b31411d` | Indomitable class feature | Force Adept | REPO_TREE_PRESENT | 0 | — | 9 (0) | REVIEW_REQUIRED |
| `3faa4d16e28d43e4` | Weapon Proficiency (Simple Weapons) | Warrior | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Core Rulebook | 6 (0) | REVIEW_REQUIRED |
| `433c2e9c0e71aceb` | Flanking Foe | Pistoleer | REPO_TREE_PRESENT | 0 | — | 12 (0) | REVIEW_REQUIRED |
| `4632b4bf79044752` | Nature Sense | Beastwarden | REPO_TREE_PRESENT | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `4d6c2d2398c33ba7` | Sith Alchemy (craft) | Sith Alchemy | REPO_TREE_PRESENT | 0 | — | 9 (0) | REVIEW_REQUIRED |
| `4d7d5a38d0394e4c` | Force Bond | Alter | SOURCE_VERIFIED_SPECIAL_TREE | 0 | Knights of the Old Republic Campaign Guide | 6 (0) | KEEP_NONBOOK_SUPPORTED |
| `4dfad6e363c11acf` | Improvised Weapon Masteryy | Jedi Weapon Master | REPO_TREE_PRESENT | 0 | — | 8 (0) | REVIEW_REQUIRED |
| `5644990a390a4178` | Hotwire | Specialized Droid | REPO_TREE_PRESENT | 0 | Core Rulebook; Force Unleashed Campaign Guide | 5 (0) | REVIEW_REQUIRED |
| `57c770c7924e4241` | Cloak of Shadows | Disciple Of Twilight | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 6 (0) | KEEP_NONBOOK_SUPPORTED |
| `585227ba15d24a37` | Inspire Fear | Infamy | REPO_TREE_PRESENT | 0 | Core Rulebook; Legacy Era Campaign Guide | 7 (0) | REVIEW_REQUIRED |
| `588c176b47724734` | Feign Harmlessness | Cowardice | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `5e4a7f98b1e74326` | Adept Spellcaster | Sorcerer Of Tund | REPO_ONLY_NONCANONICAL_HOMEBREW | 1 | Jedi Academy Training Manual; Threats of the Galaxy | 8 (0) | REVIEW_REQUIRED |
| `6021056231839e7c` | Multiattack Proficiency (advanced melee) | Privateer | REPO_TREE_PRESENT | 0 | Force Unleashed Campaign Guide; Knights of the Old Republic Campaign Guide | 12 (0) | REVIEW_REQUIRED |
| `61c9413bde23411a` | Extended Sputters | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `62d461ae3b0fcfa9` | Move Massive Object | Alter | SOURCE_VERIFIED_SPECIAL_TREE | 0 | Legacy Era Campaign Guide | 9 (0) | KEEP_NONBOOK_SUPPORTED |
| `62e70280d08f43ec` | Allure | Influence | REPO_TREE_PRESENT | 0 | Rebellion Era Campaign Guide; Unknown Regions | 6 (0) | REVIEW_REQUIRED |
| `67a08d46f24c4fdd` | Crash Landings | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Unknown Regions | 8 (0) | REVIEW_REQUIRED |
| `6f3641f0ff39fc90` | Escort | Wingman | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Core Rulebook | 10 (0) | REVIEW_REQUIRED |
| `707dd4f0b5c744a6` | Special: | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Clone Wars Campaign Guide; Core Rulebook | 7 (0) | REVIEW_REQUIRED |
| `714c38c0498a4eaf` | Empowered Weapon | Ember Of Vahl | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 7 (0) | KEEP_NONBOOK_SUPPORTED |
| `747458ee63cd4a2a` | Defensive Roll | Force Warrior | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `77ab82670aa14f33` | Smashball Pass | Smashball Pro | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `78955cbbe9504d7f` | Patient Builder | Mechanic | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `7a58134276d64561` | Calming Aura | Beastwarden | REPO_TREE_PRESENT | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `7f4edcb8aa830972` | Hard Target | Commando | REPO_TREE_PRESENT | 0 | Threats of the Galaxy | 12 (2) | REVIEW_REQUIRED |
| `816ac9cc1e6c413b` | Force Meld | Jedi Guardian | UNREGISTERED_OR_NONCANONICAL_TREE | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `81cd2a2473e248a0` | In Balance | Jedaii Ranger | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `85e348f24a144e1c` | Inspired | Inspiration | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Core Rulebook | 6 (0) | REVIEW_REQUIRED |
| `85e9699cee664641` | Identify Creature | Science | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `86c10d63bba2d9c8` | Trigger Work | Gunslinger | REPO_TREE_PRESENT | 0 | Core Rulebook; Threats of the Galaxy | 13 (3) | REVIEW_REQUIRED |
| `893158dcfe246ad7` | Implant (general) | Implant | REPO_TREE_PRESENT | 0 | — | 12 (0) | REVIEW_REQUIRED |
| `8a6fc1f368226b7b` | Sith Alchemy (create) | Sith | REPO_TREE_PRESENT | 0 | — | 11 (0) | REVIEW_REQUIRED |
| `8d70989dc42f4829` | Suktub Defender | Smashball Pro | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `9319584186ce4228` | Dathomiri Hunter | Dathomiri Witch | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 7 (0) | KEEP_NONBOOK_SUPPORTED |
| `933240d6581843b9` | Lasting Ichor Item | Force Item | REPO_TREE_PRESENT | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `96a833f805df1be1` | Regimen Mastery | Mystic | REPO_TREE_PRESENT | 0 | Jedi Academy Training Manual | 8 (0) | REVIEW_REQUIRED |
| `9780298d28d64954` | Centerbreaker Charge | Smashball Pro | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `a0c4b4b252ee4c96` | Cortosis Staff Block | Morgukai Warrior | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `a1ef8440f49847f1` | Linebreaker Charge | Smashball Pro | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `a36f9a2eb2424f86` | Amphistaff Block | Master Of The Amphistaff | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `a4629f24bd571414` | Mercenary's Determination | Mercenary | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `a76198e5da0f6368` | Echoes of the Force | Jedi Investigator | REPO_TREE_PRESENT | 0 | — | 8 (0) | REVIEW_REQUIRED |
| `a9a84d42b75f4fb1` | Lesser Mark of Illumination | Chalactan Adept | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `ab6efafd94ad044e` | Extended Critical Range (heavy) | Critical Master | REPO_TREE_PRESENT | 0 | Force Unleashed Campaign Guide | 9 (0) | REVIEW_REQUIRED |
| `b1669310f65d42b7` | Engineering Savant | Mechanic | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `b28f312432d79e77` | Keep Them Reeling (Piracy) | Piracy | REPO_TREE_PRESENT | 0 | — | 8 (0) | REVIEW_REQUIRED |
| `b431ca7ea00947b9` | Delusion | Sorcerer Of Tund | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Force Unleashed Campaign Guide | 5 (0) | REVIEW_REQUIRED |
| `b9fce171cad543d7` | Clone Scientist | Cloner | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `c086c6265e224637` | Shedding of the Body | Bomarr Monk | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `c6a65be235c34a6f` | Bolster | Inspiration | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Core Rulebook | 5 (0) | REVIEW_REQUIRED |
| `cb261592f68849a5` | Infused Weapon | Felucian Shaman | REPO_ONLY_SPECIAL_OR_UNRESOLVED | 0 | Force Unleashed Campaign Guide | 5 (0) | REVIEW_REQUIRED |
| `cc1cf3a694244618` | Diplomatic Poise | Galactic Senator | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `cc78c981176d4fed` | Avoid Collisions | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | Core Rulebook; Galaxy At War | 7 (0) | REVIEW_REQUIRED |
| `cc938ba0542c97e4` | Unclouded Judgement | Jedi Investigator | REPO_TREE_PRESENT | 0 | — | 8 (0) | REVIEW_REQUIRED |
| `d1418afeaa3f40ec` | Reflexive Tilting | Jumptrooper | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `d49ca4c47e704a96` | Defensive Stance | Defensive Duelist | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `d7870d0940a3ce0b` | Ranged Disarm | Warrior | REPO_TREE_PRESENT | 0 | Core Rulebook; Galaxy of Intrigue | 10 (0) | REVIEW_REQUIRED |
| `d9cb414fe4734507` | Mass Cloning | Cloner | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 5 (0) | REVIEW_REQUIRED |
| `e09d40421ade49e8` | Binding Sickle | Dathomiri Witch | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 6 (0) | KEEP_NONBOOK_SUPPORTED |
| `e6055a514a784387` | Akk Dog Master | Exceptional Followers | REPO_ONLY_NONCANONICAL_HOMEBREW | 1 | Clone Wars Campaign Guide | 10 (0) | REVIEW_REQUIRED |
| `e9541e13afbb4a41` | Steady Strike | Defensive Duelist | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `ea6ee6fad799491e` | Jedi Healer | Jedi Consular | REPO_TREE_PRESENT | 0 | Clone Wars Campaign Guide; Legacy Era Campaign Guide | 6 (0) | REVIEW_REQUIRED |
| `ebc1d6e79fa543c9` | Steady Hands | Treatment | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
| `f0851e0e5a1ac771` | Multiattack Proficiency (advanced melee) | Melee Duelist | REPO_TREE_PRESENT | 0 | Force Unleashed Campaign Guide; Knights of the Old Republic Campaign Guide | 11 (0) | REVIEW_REQUIRED |
| `f123e0682ef74583` | Reference Book: Star Wars Saga Edition Starships of the Galaxy | Sense | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 5 (0) | KEEP_NONBOOK_SUPPORTED |
| `f2df5596a9db40c1` | Blackguard Initiate | Blackguard Wilder | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 6 (0) | REVIEW_REQUIRED |
| `f5a4088480c005ae` | Dastardly Attack | Misfortune | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `f785208aa6774cd7` | Dark Side Maelstrom | Dark Side | SOURCE_VERIFIED_SPECIAL_TREE | 0 | — | 6 (0) | KEEP_NONBOOK_SUPPORTED |
| `f9352f317ad2f695` | Stolen Form | Sith | REPO_TREE_PRESENT | 0 | Threats of the Galaxy | 11 (2) | REVIEW_REQUIRED |
| `fbaab00b6eab02a3` | Mercenary's Teamwork | Mercenary | REPO_TREE_PRESENT | 0 | — | 10 (0) | REVIEW_REQUIRED |
| `fd87928650da45fd` | Poisoncraft | Science | REPO_ONLY_NONCANONICAL_HOMEBREW | 0 | — | 7 (0) | REVIEW_REQUIRED |
