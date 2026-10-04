# Feat Tags — Production Reconciliation (report-only)

Authority: `data/audits/feat-tags-pass2-semantic-authority.json` — Pass 2 working authority, owner adjudication Batch 1 (not production-final). Join key: canonical ID. **No production record was changed.**

## Totals

| Item | Value |
| --- | ---: |
| canonicalAssignments | 353 |
| canonicalPresentInProduction | 351 |
| canonicalMissingFromProduction | 2 |
| implementationDerivatives | 6 |
| noncanonicalRecords | 33 |
| productionRecords | 390 |
| productionPartitionCheck | 390 |
| recordsExactlyMatching | 0 |
| recordsWithProductionTagsOutsideVocabulary | 351 |
| recordsWithEmptyProductionTags | 0 |
| tagsToAddTotal | 1537 |
| tagsToAddForPresentRecords | 1525 |
| tagsToRemoveTotal | 3073 |
| tagsToRemoveOutsideVocabulary | 2755 |
| tagsToRemoveInsideVocabulary | 318 |
| tagsAlreadyMatchingTotal | 271 |
| catalogPackTagMismatches | 0 |

Missing canonical identities (reported, not created): `c352f81dde5c9dff`, `c9c4130a55761330`.

## Partition

Production 390 records = 351 canonical + 6 implementation derivatives + 33 noncanonical (partition check 390). 2 canonical identities have no production record.

## Implementation derivatives (isolated; canonical tags are not transferred)

| Repo ID | Name | Parent | Production tags |
| --- | --- | --- | --- |
| `2d680cc46a7972da` | Weapon Proficiency (Simple Weapons) | Weapon Proficiency (`ecc2471ac96ec2d4`) | 12 |
| `765ff8a34e58acac` | Weapon Proficiency (Rifles) | Weapon Proficiency (`ecc2471ac96ec2d4`) | 14 |
| `8329a353aa3899be` | Weapon Proficiency (Heavy Weapons) | Weapon Proficiency (`ecc2471ac96ec2d4`) | 14 |
| `e5d361d01d1b44e4` | Weapon Proficiency (Pistols) | Weapon Proficiency (`ecc2471ac96ec2d4`) | 14 |
| `cf28ec45cabaff59` | Advanced Melee Weapon Proficiency | Weapon Proficiency (`ecc2471ac96ec2d4`) | 13 |
| `41a9ce755ecffb5b` | Heavy Weapon Proficiency | Weapon Proficiency (`ecc2471ac96ec2d4`) | 14 |

## Noncanonical records (isolated; not in canonical authority)

33 records; none appears in the semantic authority (0 found).

## Canonical feats

| Feat | Canonical ID | Status | Prod tags | Add | Remove (in vocab / outside) | Match | Warnings |
| --- | --- | --- | ---: | ---: | --- | ---: | --- |
| Starship Designer | `e9147ce66a783fbb` | present | 11 | 7 | 0 / 9 | 2 | 1 |
| Starship Tactics | `376d805d1b73f7e6` | present | 11 | 4 | 0 / 10 | 1 | 1 |
| Tactical Genius | `da8e272f5dae09b9` | present | 6 | 5 | 0 / 5 | 1 | 1 |
| Tech Specialist | `42e2404790756700` | present | 10 | 14 | 0 / 8 | 2 | 1 |
| A Few Maneuvers | `b3dfdfd783cf16be` | present | 6 | 4 | 0 / 5 | 1 | 1 |
| Suppression Fire | `b3984239e21c64ca` | present | 11 | 8 | 2 / 8 | 1 | 1 |
| Momentum Strike | `cf278001c780f3f9` | present | 8 | 8 | 1 / 6 | 1 | 1 |
| Mounted Defense | `acb7efcc70769b9f` | present | 8 | 6 | 1 / 5 | 2 | 1 |
| Follow Through | `f2cbe2ac10195858` | present | 7 | 4 | 1 / 6 | 0 | 1 |
| Force Regimen Mastery | `1e0222988b4e8714` | present | 8 | 2 | 0 / 7 | 1 | 1 |
| Long Haft Strike | `b60e581b6c102cfc` | present | 8 | 3 | 1 / 7 | 0 | 1 |
| Relentless Attack | `30cb2abcd11bf1bd` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Unswerving Resolve | `98d9c2c211a7a458` | present | 10 | 4 | 4 / 6 | 0 | 1 |
| Aiming Accuracy | `80805c30ea6dd11e` | present | 7 | 4 | 1 / 6 | 0 | 1 |
| Damage Conversion | `1f404db00518aeed` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Distracting Droid | `6557f371e55b900a` | present | 10 | 7 | 3 / 6 | 1 | 1 |
| Droid Focus | `f4f3706e393976b3` | present | 12 | 7 | 1 / 10 | 1 | 1 |
| Droid Shield Mastery | `d518e8c1220af930` | present | 12 | 4 | 2 / 8 | 2 | 1 |
| Erratic Target | `99e4f98cbcbdd9e1` | present | 6 | 4 | 1 / 5 | 0 | 1 |
| Ion Shielding | `43a4b873d9a9984d` | present | 8 | 2 | 1 / 6 | 1 | 1 |
| Logic Upgrade: Skill Swap | `d48614f7ae500a5b` | present | 8 | 2 | 1 / 7 | 0 | 1 |
| Mechanical Martial Arts | `b9d4eb946079b555` | present | 11 | 5 | 3 / 7 | 1 | 1 |
| Multi-Targeting | `cefb9edb540745d6` | present | 6 | 4 | 1 / 5 | 0 | 1 |
| Pincer | `09d4eedfce05c6a3` | present | 10 | 2 | 2 / 5 | 3 | 1 |
| Pinpoint Accuracy | `47c92eae6c1a0b84` | present | 9 | 3 | 1 / 7 | 1 | 2 |
| Sensor Link | `e95252c02d2ae129` | present | 7 | 7 | 1 / 5 | 1 | 1 |
| Shield Surge | `e3b2b8360fb05d82` | present | 8 | 7 | 2 / 5 | 1 | 1 |
| Slammer | `9c9e98a70538855c` | present | 8 | 9 | 2 / 6 | 0 | 1 |
| Tool Frenzy | `203f7fa521105d0b` | present | 6 | 6 | 1 / 5 | 0 | 1 |
| Turn and Burn | `6342effd242f0b61` | present | 12 | 4 | 1 / 7 | 4 | 1 |
| Attack Combo (Fire and Strike) | `52f1a7f7eb33a1f4` | present | 9 | 6 | 1 / 7 | 1 | 1 |
| Attack Combo (Melee) | `5f479944307731d1` | present | 9 | 5 | 1 / 7 | 1 | 1 |
| Attack Combo (Ranged) | `b573d4f48af37b42` | present | 7 | 5 | 0 / 7 | 0 | 1 |
| Autofire Assault | `c973e43c85382068` | present | 11 | 6 | 1 / 10 | 0 | 1 |
| Autofire Sweep | `fbd561777651635e` | present | 11 | 3 | 1 / 10 | 0 | 1 |
| Biotech Specialist | `bf6c01fa590a3f75` | present | 8 | 13 | 0 / 7 | 1 | 1 |
| Biotech Surgery | `77dba0a49c63e42d` | present | 14 | 4 | 5 / 8 | 1 | 1 |
| Brink of Death | `f4e8244a4c8bb9a0` | present | 7 | 2 | 1 / 6 | 0 | 1 |
| Feat of Strength | `9af3ba38a2c671b8` | present | 7 | 8 | 0 / 7 | 0 | 1 |
| Fatal Hit | `ebe730776cd3e310` | present | 9 | 3 | 2 / 6 | 1 | 1 |
| Galactic Alliance Military Training | `03593bdccdd70fa2` | present | 12 | 3 | 0 / 11 | 1 | 1 |
| Grapple Resistance | `09faea502795c45f` | present | 9 | 3 | 2 / 6 | 1 | 1 |
| Knock Heads | `c0bd186e6fb23619` | present | 8 | 4 | 0 / 6 | 2 | 1 |
| Multi-Grab | `821e127ba3b83c1a` | present | 9 | 2 | 0 / 6 | 3 | 1 |
| Rancor Crush | `931fae85d3d53c07` | present | 8 | 4 | 0 / 8 | 0 | 1 |
| Return Fire | `80c52cf7838095c1` | present | 11 | 3 | 2 / 7 | 2 | 1 |
| Returning Bug | `74dc095d9ab94915` | present | 6 | 2 | 0 / 6 | 0 | 1 |
| Vehicle Systems Expertise | `d7736c072de9b86c` | present | 9 | 7 | 1 / 7 | 1 | 1 |
| Zero Range | `0dbd1d12c0b99725` | present | 8 | 4 | 1 / 7 | 0 | 1 |
| Accelerated Strike | `167c394e90424916` | present | 9 | 3 | 1 / 7 | 1 | 1 |
| Conditioning | `0ac76f1c0c1677cb` | present | 11 | 11 | 0 / 10 | 1 | 1 |
| Critical Strike | `d9ecf143e6a9f889` | present | 8 | 6 | 1 / 7 | 0 | 1 |
| Echani Training | `f362e5a4ad0a98bd` | present | 12 | 4 | 1 / 8 | 3 | 1 |
| Force Readiness | `8a78270d15aa4738` | present | 8 | 1 | 0 / 6 | 2 | 1 |
| Flurry | `0536f81eff886234` | present | 8 | 3 | 0 / 8 | 0 | 1 |
| Gearhead | `3b9b60551a3379ce` | present | 9 | 6 | 0 / 9 | 0 | 1 |
| Implant Training | `ce009e054ef1681f` | present | 10 | 2 | 1 / 8 | 1 | 1 |
| Improved Rapid Strike | `cb6aea7e256e4c8c` | present | 8 | 4 | 1 / 7 | 0 | 1 |
| Increased Agility | `be1b2f8015c971a5` | present | 10 | 6 | 0 / 10 | 0 | 1 |
| Logic Upgrade: Self-Defense | `191aacaecaa92ce1` | present | 10 | 3 | 3 / 6 | 1 | 1 |
| Logic Upgrade: Tactician | `a75d5d6b3ce5bc6f` | present | 8 | 5 | 2 / 6 | 0 | 1 |
| Mandalorian Training | `6723270208549f73` | present | 8 | 6 | 0 / 8 | 0 | 1 |
| Poison Resistance | `2624254a23604d5b` | present | 8 | 5 | 0 / 8 | 0 | 1 |
| Power Blast | `935212056c7968c8` | present | 7 | 5 | 0 / 7 | 0 | 1 |
| Quick Skill | `95020f2ce5ad0e88` | present | 6 | 4 | 0 / 6 | 0 | 1 |
| Republic Military Training | `2bdb31b248f680e3` | present | 11 | 6 | 0 / 11 | 0 | 1 |
| Sith Military Training | `526109c14cc81285` | present | 10 | 8 | 0 / 10 | 0 | 1 |
| Sniper Shot | `94fc90a53d747f84` | present | 8 | 3 | 2 / 6 | 0 | 1 |
| Tumble Defense | `1e21ddf471811265` | present | 9 | 6 | 3 / 6 | 0 | 1 |
| Withdrawal Strike | `caad1a8c13bf01a1` | present | 9 | 6 | 2 / 7 | 0 | 1 |
| Advantageous Attack | `9de63b7a605768c2` | present | 7 | 2 | 0 / 7 | 0 | 1 |
| Advantageous Cover | `289588197d691d64` | present | 9 | 2 | 0 / 7 | 2 | 1 |
| Angled Throw | `c060d4cb33df501a` | present | 12 | 4 | 2 / 10 | 0 | 1 |
| Bad Feeling | `37aa58a3833bf34a` | present | 7 | 5 | 0 / 5 | 2 | 1 |
| Blaster Barrage | `50903195fbb5d090` | present | 14 | 6 | 3 / 10 | 1 | 1 |
| Controlled Rage | `c120ef1fe27225af` | present | 12 | 0 | 2 / 9 | 1 | 1 |
| Crossfire | `6e3b0ca6413e607c` | present | 9 | 4 | 2 / 7 | 0 | 1 |
| Cunning Attack | `8d1747eda25693b0` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Focused Rage | `c2da9691c1bb9742` | present | 10 | 1 | 2 / 8 | 0 | 1 |
| Improved Bantha Rush | `34bc0c5808778bf5` | present | 8 | 4 | 1 / 7 | 0 | 1 |
| Informer | `f313d17068d1cdea` | present | 12 | 7 | 0 / 11 | 1 | 1 |
| Mighty Throw | `99b2114bb2fbc209` | present | 9 | 3 | 1 / 8 | 0 | 1 |
| Natural Leader | `d41076e442832c3e` | present | 6 | 4 | 1 / 5 | 0 | 1 |
| Powerful Rage | `e9d1e9099a3e4ecc` | present | 13 | 5 | 2 / 11 | 0 | 1 |
| Rapport | `a2708e8daf121947` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Recall | `c352f81dde5c9dff` | MISSING | — | 4 | 0 / 0 | 0 | 1 |
| Savage Attack | `aaa730a68f195111` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Scavenger | `6cf1898b8c3c837c` | present | 8 | 5 | 1 / 7 | 0 | 1 |
| Strafe | `f4604b0d477e5fe7` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Swarm | `643c54c206ed5f64` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Unleashed | `bcc7f3fe56008a28` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Anointed Hunter | `4dc36deda6faf597` | present | 5 | 4 | 0 / 5 | 0 | 1 |
| Artillery Shot | `fb64065b4a779cd8` | present | 11 | 3 | 1 / 10 | 0 | 1 |
| Coordinated Barrage | `c51d23038e2862e6` | present | 12 | 4 | 3 / 8 | 1 | 1 |
| Droidcraft | `ae4dece84c32c3ac` | present | 8 | 2 | 0 / 6 | 2 | 1 |
| Droid Hunter | `5d17898fc9652370` | present | 8 | 1 | 1 / 6 | 1 | 1 |
| Experienced Medic | `5e1e84d933295217` | present | 10 | 5 | 0 / 8 | 2 | 1 |
| Expert Droid Repair | `029c3935e9bed6eb` | present | 8 | 3 | 0 / 6 | 2 | 1 |
| Flash and Clear | `a16af4c63582b44a` | present | 11 | 4 | 1 / 10 | 0 | 1 |
| Flood of Fire | `6335692284f98ec6` | present | 10 | 5 | 0 / 10 | 0 | 1 |
| Grand Army of the Republic Training | `72146d8a36d77736` | present | 6 | 3 | 0 / 5 | 1 | 1 |
| Gunnery Specialist | `70962165bed8e5ed` | present | 8 | 5 | 1 / 5 | 2 | 1 |
| Jedi Familiarity | `fc56de4d0d15c95c` | present | 11 | 6 | 3 / 8 | 0 | 1 |
| Leader of Droids | `59e495de34a23def` | present | 11 | 5 | 2 / 8 | 1 | 1 |
| Overwhelming Attack | `7df64382f1a0a892` | present | 7 | 6 | 1 / 6 | 0 | 1 |
| Pall of the Dark Side | `8d164553709dd068` | present | 16 | 6 | 0 / 14 | 2 | 1 |
| Separatist Military Training | `477b62d36e012719` | present | 11 | 3 | 1 / 10 | 0 | 1 |
| Spray Shot | `0066c394e5d636fb` | present | 10 | 3 | 1 / 9 | 0 | 1 |
| Trench Warrior | `7d8366d0481d76e2` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Unstoppable Force | `0a6c87a410bee1f2` | present | 10 | 4 | 0 / 8 | 2 | 1 |
| Unwavering Resolve | `53f600d68f3afdc3` | present | 12 | 4 | 1 / 10 | 1 | 1 |
| Wary Defender | `d6e528de87b25b95` | present | 6 | 4 | 0 / 6 | 0 | 1 |
| Acrobatic Ally | `723563f70bd7f28f` | present | 7 | 8 | 0 / 6 | 1 | 1 |
| Acrobatic Dodge | `cda6cb7b58f96a2f` | present | 9 | 8 | 2 / 6 | 1 | 1 |
| Combat Trickery | `9ad13542c8370aef` | present | 10 | 7 | 0 / 8 | 2 | 1 |
| Elder's Knowledge | `6ba02f4dd4c3bfe5` | present | 11 | 7 | 0 / 10 | 1 | 1 |
| Frightening Cleave | `8b2f7862b3c76e61` | present | 9 | 6 | 1 / 7 | 1 | 1 |
| Grab Back | `e306ecce877537a9` | present | 9 | 4 | 1 / 6 | 2 | 1 |
| Halt | `89c5695c7435b733` | present | 10 | 4 | 1 / 7 | 2 | 1 |
| Heavy Hitter | `a16df0d4edf3e7bf` | present | 7 | 7 | 0 / 5 | 2 | 1 |
| Hold Together | `2eb0c304d99ef6ee` | present | 7 | 6 | 0 / 6 | 1 | 1 |
| Hyperblazer | `cab4954728195119` | present | 10 | 4 | 2 / 8 | 0 | 1 |
| Improved Sleight of Hand | `58d3d0aece0f3bdc` | present | 10 | 7 | 0 / 10 | 0 | 1 |
| Improvised Weapon Mastery | `b754b5e064c20cc0` | present | 6 | 5 | 0 / 6 | 0 | 1 |
| Instinctive Attack | `70f27646ad28816a` | present | 10 | 2 | 0 / 7 | 3 | 1 |
| Instinctive Defense | `b26497554169ac38` | present | 10 | 1 | 1 / 6 | 3 | 1 |
| Intimidator | `f0afba1763ddff90` | present | 7 | 4 | 1 / 6 | 0 | 1 |
| Maniacal Charge | `4330126d10dccd71` | present | 12 | 9 | 2 / 10 | 0 | 1 |
| Mounted Combat | `af5caa92d8fc0e3a` | present | 6 | 12 | 0 / 6 | 0 | 1 |
| Nikto Survival | `6179746c48e30c26` | present | 12 | 3 | 0 / 11 | 1 | 1 |
| Targeted Area | `9c904590c02fb30a` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Trample | `e5a77e8e4754fa5b` | present | 7 | 9 | 0 / 7 | 0 | 1 |
| Wilderness First Aid | `171f0d8d997c8bbc` | present | 14 | 5 | 1 / 12 | 1 | 1 |
| Adaptable Talent | `25ce950a142f969d` | present | 6 | 1 | 0 / 6 | 0 | 1 |
| Bone Crusher | `eccb2b4dbdbfa324` | present | 11 | 2 | 1 / 8 | 2 | 1 |
| Brilliant Defense | `e0cdeb7d44cf44fd` | present | 10 | 3 | 1 / 7 | 2 | 1 |
| Channel Rage | `14f0d916e9228368` | present | 10 | 4 | 1 / 8 | 1 | 1 |
| Cut the Red Tape | `2bb34366776f0371` | present | 12 | 6 | 1 / 11 | 0 | 1 |
| Demoralizing Strike | `691b3a9309b28e60` | present | 10 | 5 | 2 / 7 | 1 | 1 |
| Disturbing Presence | `25ba21b021086a71` | present | 10 | 8 | 1 / 9 | 0 | 1 |
| Expert Briber | `a6890bb21adad47e` | present | 7 | 3 | 0 / 6 | 1 | 1 |
| Flèche | `29173ea2d8416eea` | present | 6 | 6 | 0 / 6 | 0 | 1 |
| Forceful Recovery | `627b92fefdc552d2` | present | 13 | 3 | 2 / 9 | 2 | 1 |
| Grazing Shot | `1228a537592ad145` | present | 8 | 5 | 1 / 7 | 0 | 1 |
| Hobbling Strike | `ccc7a6e191e811a4` | present | 9 | 5 | 1 / 7 | 1 | 1 |
| Improved Opportunistic Trickery | `bb7a952715116e00` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Indomitable Personality | `d7a139003afc04b8` | present | 8 | 6 | 0 / 7 | 1 | 1 |
| Master of Disguise | `b531781f373c3031` | present | 7 | 3 | 0 / 6 | 1 | 1 |
| Meat Shield | `e85f36d48d9c6989` | present | 9 | 4 | 1 / 8 | 0 | 1 |
| Opportunistic Trickery | `8cf12d528b0d0478` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Recurring Success | `5535b5d495f381f5` | present | 6 | 3 | 0 / 6 | 0 | 1 |
| Resolute Stance | `63dbb0e9623f7fce` | present | 8 | 5 | 0 / 8 | 0 | 1 |
| Sadistic Strike | `ad2b32e5dfa38a3f` | present | 9 | 3 | 1 / 8 | 0 | 1 |
| Silver Tongue | `8ff15069dbf6270d` | present | 8 | 4 | 0 / 6 | 2 | 1 |
| Skill Challenge: Catastrophic Avoidance | `2cc20fb67232f92f` | present | 6 | 2 | 0 / 6 | 0 | 1 |
| Skill Challenge: Last Resort | `db547ac84af63b06` | present | 9 | 4 | 2 / 6 | 1 | 1 |
| Skill Challenge: Recovery | `ef64dc738a6afeeb` | present | 9 | 3 | 2 / 7 | 0 | 1 |
| Stand Tall | `51a2fdd9a7965111` | present | 7 | 6 | 0 / 6 | 1 | 1 |
| Wookiee Grip | `de584ec0aaddcbad` | present | 9 | 5 | 0 / 9 | 0 | 1 |
| Burst of Speed | `cbea70febcf834cd` | present | 9 | 1 | 0 / 6 | 3 | 1 |
| Close Combat Escape | `1ec2b64343aca60e` | present | 8 | 7 | 0 / 6 | 2 | 1 |
| Collateral Damage | `4cc4f4afdcf6e4f8` | present | 7 | 5 | 0 / 7 | 0 | 1 |
| Cornered | `e8e6b74907471ad5` | present | 6 | 2 | 0 / 6 | 0 | 1 |
| Deadly Sniper | `6fb0f56dd9b9b75c` | present | 10 | 5 | 1 / 9 | 0 | 1 |
| Deceptive Drop | `75ce7688bdfb0b23` | present | 8 | 4 | 0 / 7 | 1 | 1 |
| Desperate Gambit | `8baf83743668f63a` | present | 7 | 3 | 0 / 6 | 1 | 1 |
| Duck and Cover | `44cce39d67c0979d` | present | 10 | 6 | 2 / 8 | 0 | 1 |
| Fleet-Footed | `e896798c6d194345` | present | 7 | 2 | 0 / 6 | 1 | 1 |
| Friends in Low Places | `e18eecc0f21a95f4` | present | 7 | 6 | 0 / 6 | 1 | 1 |
| Hasty Modification | `40429365d8f28219` | present | 6 | 4 | 1 / 5 | 0 | 1 |
| Hideous Visage | `2956acfbfd27967d` | present | 8 | 10 | 0 / 8 | 0 | 1 |
| Impersonate | `2def724bf673c2fc` | present | 7 | 3 | 0 / 6 | 1 | 1 |
| Impetuous Move | `f401ac70ee67def1` | present | 9 | 5 | 0 / 8 | 1 | 1 |
| Impulsive Flight | `6356fd5ea46b9c6c` | present | 6 | 4 | 0 / 6 | 0 | 1 |
| Knife Trick | `61c053191d05d0a2` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Lightning Draw | `1f594024b4757109` | present | 7 | 3 | 0 / 6 | 1 | 1 |
| Metamorph | `f59c9679c02b8896` | present | 6 | 6 | 0 / 6 | 0 | 1 |
| Opportunistic Retreat | `513f0d9e7eb6965b` | present | 8 | 4 | 1 / 6 | 1 | 1 |
| Resurgence | `005e922d0430d86b` | present | 13 | 0 | 2 / 8 | 3 | 1 |
| Signature Device | `313095ada7504547` | present | 8 | 4 | 1 / 6 | 1 | 1 |
| Slippery Maneuver | `03e16cbf16cdc81d` | present | 6 | 5 | 1 / 5 | 0 | 1 |
| Staggering Attack | `c9c4130a55761330` | MISSING | — | 8 | 0 / 0 | 0 | 1 |
| Stay Up | `4788389dadb5cb0a` | present | 9 | 3 | 1 / 7 | 1 | 1 |
| Superior Tech | `a717435c8094e7fb` | present | 8 | 17 | 0 / 7 | 1 | 1 |
| Tactical Advantage | `2942c0676644251b` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Wicked Strike | `5bef5e65e532ba7c` | present | 8 | 5 | 1 / 7 | 0 | 1 |
| Bantha Herder | `982b00394a73719e` | present | 7 | 6 | 1 / 6 | 0 | 1 |
| Battering Attack | `01dee6f32bbd8f85` | present | 9 | 4 | 0 / 8 | 1 | 1 |
| Destructive Force | `42dc0158ce091479` | present | 13 | 4 | 0 / 12 | 1 | 1 |
| Disabler | `94023012303ad257` | present | 7 | 7 | 1 / 6 | 0 | 1 |
| Dive for Cover | `2866d953b4b6245d` | present | 12 | 7 | 2 / 9 | 1 | 1 |
| Fight Through Pain | `a51721a36b699c7c` | present | 9 | 4 | 0 / 8 | 1 | 1 |
| Forceful Blast | `c2538c3a906700ae` | present | 14 | 5 | 2 / 12 | 0 | 1 |
| Force of Personality | `baff0da30d0bc8ee` | present | 14 | 3 | 0 / 13 | 1 | 1 |
| Fortifying Recovery | `28a02f0e5412dd53` | present | 11 | 4 | 2 / 8 | 1 | 1 |
| Mission Specialist | `b7f51561e60fefe6` | present | 9 | 3 | 1 / 7 | 1 | 1 |
| Never Surrender | `8a86aa95c54f6dad` | present | 10 | 7 | 1 / 9 | 0 | 1 |
| Officer Candidacy Training | `d976f03c298fb1be` | present | 5 | 3 | 0 / 5 | 0 | 1 |
| Opportunistic Shooter | `4595bed5d4117164` | present | 6 | 3 | 0 / 6 | 0 | 1 |
| Pistoleer | `da2e6fb7a11b3d63` | present | 8 | 5 | 1 / 7 | 0 | 1 |
| Predictive Defense | `25aaf859b6109c02` | present | 10 | 1 | 1 / 8 | 1 | 1 |
| Resilient Strength | `a65c4d3ad1c3202f` | present | 10 | 2 | 0 / 8 | 2 | 1 |
| Riflemaster | `22d0f64aa8ac99df` | present | 8 | 5 | 1 / 7 | 0 | 1 |
| Risk Taker | `6ef0920984de0ed0` | present | 9 | 8 | 0 / 9 | 0 | 1 |
| Sport Hunter | `8778b4271420f789` | present | 6 | 8 | 0 / 6 | 0 | 1 |
| Staggering Attack | `192923f60db38831` | present | 8 | 3 | 0 / 7 | 1 | 1 |
| Steadying Position | `8b1a9adee4e2e78e` | present | 9 | 5 | 0 / 8 | 1 | 1 |
| Hijkata Training | `6dcb59b199dba6a1` | present | 10 | 12 | 1 / 7 | 2 | 1 |
| K'tara Training | `1dfbddf5f1aa57c3` | present | 10 | 9 | 1 / 7 | 2 | 1 |
| K'thri Training | `b00e0a883da4edda` | present | 10 | 8 | 2 / 6 | 2 | 1 |
| Stava Training | `836f80dd762cf155` | present | 12 | 6 | 2 / 6 | 4 | 1 |
| Tae-Jitsu Training | `6b6a0dc594ad4e3c` | present | 10 | 10 | 1 / 7 | 2 | 1 |
| Teräs Käsi Training | `b0feacaeae4860e9` | present | 11 | 2 | 1 / 7 | 3 | 1 |
| Wrruushi Training | `1d0291d930abda15` | present | 11 | 7 | 2 / 7 | 2 | 1 |
| Aquatic Specialists | `55483fd350b3ba28` | present | 14 | 4 | 1 / 12 | 1 | 1 |
| Ascension Specialists | `125c328c4573890a` | present | 14 | 4 | 1 / 12 | 1 | 1 |
| Covert Operatives | `75daa55c22ffed5e` | present | 18 | 4 | 3 / 13 | 2 | 1 |
| Medical Team | `1d27dfb8ce491836` | present | 16 | 4 | 0 / 12 | 4 | 1 |
| Mounted Regiment | `0e9aa3d941f4eb80` | present | 16 | 8 | 1 / 14 | 1 | 1 |
| Nimble Team | `752b00692fa5376b` | present | 14 | 4 | 1 / 12 | 1 | 1 |
| Slicer Team | `77c897590b4000f6` | present | 14 | 6 | 0 / 12 | 2 | 1 |
| Technical Experts | `18779d9a72b47a12` | present | 16 | 4 | 0 / 13 | 3 | 1 |
| Tireless Squad | `b648515a5e8dd612` | present | 14 | 5 | 0 / 12 | 2 | 1 |
| Unhindered Approach | `72183c573d1cc44e` | present | 14 | 4 | 1 / 12 | 1 | 1 |
| Unified Squadron | `b1970c18996d44dd` | present | 14 | 3 | 1 / 11 | 2 | 1 |
| Wary Sentries | `0053d97632b02e4a` | present | 14 | 4 | 1 / 12 | 1 | 1 |
| Wilderness Specialists | `daf0594fbb48e61e` | present | 14 | 4 | 0 / 12 | 2 | 1 |
| Assured Attack | `adc9cac4d22b3090` | present | 8 | 2 | 0 / 7 | 1 | 1 |
| Deft Charge | `225c535ebc74e54a` | present | 13 | 2 | 3 / 9 | 1 | 1 |
| Fast Surge | `05d8053002347946` | present | 13 | 1 | 3 / 8 | 2 | 1 |
| Imperial Military Training | `7de37c473be72f87` | present | 10 | 5 | 0 / 10 | 0 | 1 |
| Moving Target | `34071c4705615ce8` | present | 6 | 5 | 0 / 6 | 0 | 1 |
| Prime Shot | `dec7203bc81176dc` | present | 9 | 4 | 2 / 7 | 0 | 1 |
| Rapid Reaction | `12d064d086102ff0` | present | 7 | 2 | 0 / 6 | 1 | 1 |
| Rebel Military Training | `b4c1dbb468777c09` | present | 12 | 5 | 0 / 12 | 0 | 1 |
| Recovering Surge | `5ba03b04f0f1c7d7` | present | 13 | 2 | 2 / 10 | 1 | 1 |
| Unstoppable Combatant | `fa8a56961708bbdc` | present | 9 | 2 | 0 / 8 | 1 | 1 |
| Vehicular Surge | `5e471161ad85b040` | present | 12 | 3 | 2 / 8 | 2 | 1 |
| Vitality Surge | `a12f6fd51e121a30` | present | 13 | 2 | 3 / 9 | 1 | 1 |
| Ample Foraging | `223a5c14f2ea4737` | present | 8 | 5 | 0 / 7 | 1 | 1 |
| Binary Mind | `33905755bbb1ca10` | present | 9 | 3 | 2 / 7 | 0 | 1 |
| Bothan Will | `d40dea327376ec90` | present | 9 | 2 | 1 / 7 | 1 | 1 |
| Bowcaster Marksman | `db82e1df17c3110b` | present | 9 | 3 | 0 / 7 | 2 | 1 |
| Clawed Subspecies | `edd8bb64c18d9a8a` | present | 11 | 2 | 1 / 9 | 1 | 1 |
| Confident Success | `139a80972fc3b8ee` | present | 9 | 5 | 2 / 7 | 0 | 1 |
| Darkness Dweller | `eaf7079b977d60b7` | present | 9 | 3 | 0 / 9 | 0 | 1 |
| Deep Sight | `e4de79f4993a6690` | present | 10 | 4 | 0 / 10 | 0 | 1 |
| Devastating Bellow | `9f1305cc6ada5d7a` | present | 7 | 2 | 0 / 7 | 0 | 1 |
| Disarming Charm | `9567c9e2fe8416e6` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Fast Swimmer | `d874a33284de77e4` | present | 9 | 3 | 0 / 9 | 0 | 1 |
| Flawless Pilot | `87969fb8b12ff507` | present | 15 | 2 | 2 / 11 | 2 | 1 |
| Forest Stalker | `febbb0f05c8a0883` | present | 14 | 3 | 2 / 11 | 1 | 1 |
| Fringe Benefits | `b1299c242802a260` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Gungan Weapon Master | `f916516eeeaae10b` | present | 12 | 3 | 0 / 10 | 2 | 1 |
| Hunter's Instincts | `d2e86b15327ae544` | present | 14 | 3 | 2 / 11 | 1 | 1 |
| Imperceptible Liar | `ec8b6bb889f65dea` | present | 11 | 3 | 0 / 9 | 2 | 1 |
| Inborn Resilience | `9d70c309eb95da5e` | present | 9 | 1 | 1 / 7 | 1 | 1 |
| Increased Resistance | `0365722a629eed1f` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Instinctive Perception | `bf71e5f4171547ef` | present | 12 | 5 | 2 / 9 | 1 | 1 |
| Jedi Heritage | `d3c4ae9f793b8573` | present | 16 | 2 | 1 / 12 | 3 | 1 |
| Justice Seeker | `3595086bb17d4303` | present | 8 | 2 | 1 / 7 | 0 | 1 |
| Keen Scent | `46d70ac7db6872f6` | present | 10 | 3 | 0 / 10 | 0 | 1 |
| Lasting Influence | `ad740c563485664d` | present | 9 | 4 | 0 / 9 | 0 | 1 |
| Master Tracker | `d133d3fad058c35f` | present | 13 | 4 | 0 / 11 | 2 | 1 |
| Mind of Reason | `987bdca14576cf2f` | present | 9 | 5 | 0 / 9 | 0 | 1 |
| Mon Calamari Shipwright | `bb16070b5fdfccf4` | present | 8 | 8 | 0 / 8 | 0 | 1 |
| Nature Specialist | `f965ca153bb13aaf` | present | 13 | 4 | 0 / 11 | 2 | 1 |
| Perfect Intuition | `5a2ba2f28bc5ee01` | present | 14 | 2 | 2 / 11 | 1 | 1 |
| Perfect Swimmer | `70c842436bbb6330` | present | 14 | 2 | 2 / 11 | 1 | 1 |
| Pitiless Warrior | `08896a9f860ebca9` | present | 9 | 2 | 1 / 8 | 0 | 1 |
| Primitive Warrior | `047f06ec480d841f` | present | 10 | 3 | 0 / 10 | 0 | 1 |
| Quick Comeback | `21a0af5ef58172a0` | present | 9 | 5 | 0 / 9 | 0 | 1 |
| Read the Winds | `f5be1207aa6b1817` | present | 7 | 5 | 0 / 7 | 0 | 1 |
| Regenerative Healing | `be1346b0cfb5ea78` | present | 13 | 2 | 1 / 11 | 1 | 1 |
| Resurgent Vitality | `47f21e32233bb910` | present | 15 | 2 | 2 / 11 | 2 | 1 |
| Scion of Dorin | `08a15012d82f0d16` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Sharp Senses | `2357f4a68fe571fb` | present | 13 | 3 | 0 / 11 | 2 | 1 |
| Shrewd Bargainer | `df58db54c4b53539` | present | 7 | 4 | 0 / 7 | 0 | 1 |
| Spacer's Surge | `dd6ad0e712e9a314` | present | 13 | 5 | 4 / 9 | 0 | 1 |
| Strong Bellow | `1a9091174116f6ff` | present | 8 | 2 | 0 / 8 | 0 | 1 |
| Sure Climber | `f8748ba7993b6b17` | present | 12 | 3 | 0 / 12 | 0 | 1 |
| Survivor of Ryloth | `90a258aae2583994` | present | 9 | 6 | 0 / 9 | 0 | 1 |
| Thick Skin | `e97cc5c5128a55ce` | present | 7 | 3 | 0 / 7 | 0 | 1 |
| Unwavering Focus | `0214e9586b6c8bb5` | present | 7 | 6 | 0 / 7 | 0 | 1 |
| Veteran Spacer | `423c5fffe7abe449` | present | 9 | 5 | 0 / 9 | 0 | 1 |
| Warrior Heritage | `a9a59c85cddbda1f` | present | 8 | 3 | 0 / 8 | 0 | 1 |
| Wroshyr Rage | `2ed1a3257175feb9` | present | 13 | 2 | 3 / 10 | 0 | 1 |
| Acrobatic Strike | `419a502e59264382` | present | 8 | 7 | 1 / 7 | 0 | 1 |
| Armor Proficiency (Heavy) | `859d6b9f49118499` | present | 13 | 9 | 1 / 11 | 1 | 1 |
| Armor Proficiency (Light) | `773ec00effc7e96f` | present | 13 | 9 | 1 / 11 | 1 | 1 |
| Armor Proficiency (Medium) | `d445051370a88a7f` | present | 13 | 9 | 1 / 11 | 1 | 1 |
| Bantha Rush | `fc1e5f0a2367debb` | present | 7 | 5 | 1 / 6 | 0 | 1 |
| Burst Fire | `0d4d7c147c48cdab` | present | 10 | 4 | 2 / 8 | 0 | 1 |
| Careful Shot | `62fdf44c56b24507` | present | 8 | 4 | 2 / 6 | 0 | 1 |
| Charging Fire | `a945e2f5ffb5a7ed` | present | 8 | 4 | 0 / 8 | 0 | 1 |
| Cleave | `32d1cd4b09ec0d3b` | present | 10 | 4 | 3 / 7 | 0 | 1 |
| Combat Reflexes | `7146640744fdf052` | present | 11 | 4 | 3 / 7 | 1 | 1 |
| Coordinated Attack | `964f0781b3e3fc37` | present | 7 | 7 | 1 / 6 | 0 | 1 |
| Crush | `7bc21d4a74b95be5` | present | 11 | 4 | 2 / 6 | 3 | 1 |
| Cybernetic Surgery | `b3965f7a31f310ec` | present | 14 | 4 | 4 / 9 | 1 | 1 |
| Deadeye | `6e47c132fbedde08` | present | 6 | 6 | 1 / 5 | 0 | 1 |
| Dodge | `45366d4f3a5e443d` | present | 9 | 3 | 2 / 6 | 1 | 1 |
| Double Attack | `357807a5ceb77203` | present | 7 | 3 | 1 / 6 | 0 | 1 |
| Dreadful Rage | `9244159a233a101a` | present | 10 | 4 | 2 / 8 | 0 | 1 |
| Dual Weapon Mastery I | `84d8866a57381620` | present | 9 | 4 | 3 / 5 | 1 | 1 |
| Dual Weapon Mastery II | `c7c99a77ebee1c0c` | present | 9 | 4 | 3 / 5 | 1 | 1 |
| Dual Weapon Mastery III | `ea684defcd3222ca` | present | 9 | 4 | 3 / 5 | 1 | 1 |
| Exotic Weapon Proficiency | `1ea7da65feb15b18` | present | 15 | 3 | 0 / 15 | 0 | 1 |
| Extra Rage | `c01f64239af7705d` | present | 10 | 2 | 2 / 8 | 0 | 1 |
| Extra Second Wind | `4e57ee834c301ad8` | present | 8 | 3 | 1 / 6 | 1 | 1 |
| Far Shot | `b5a8d5899e02139c` | present | 8 | 3 | 2 / 6 | 0 | 1 |
| Force Boon | `53444cc061d81627` | present | 8 | 4 | 2 / 5 | 1 | 1 |
| Force Sensitivity | `ddbeb23013d9e917` | present | 12 | 1 | 0 / 10 | 2 | 1 |
| Force Training | `9b7b869a86f39190` | present | 17 | 2 | 0 / 14 | 3 | 1 |
| Great Cleave | `8a5cb28f625d6f02` | present | 8 | 4 | 1 / 7 | 0 | 1 |
| Improved Charge | `0166fcdddc548545` | present | 9 | 3 | 1 / 8 | 0 | 1 |
| Improved Defenses | `f8e2a30390d870e7` | present | 8 | 2 | 2 / 5 | 1 | 1 |
| Improved Disarm | `ce473e52f90b160a` | present | 6 | 3 | 0 / 6 | 0 | 1 |
| Improved Damage Threshold | `96666de28ba99b64` | present | 11 | 2 | 1 / 8 | 2 | 1 |
| Linguist | `5afd91fb081e576b` | present | 12 | 2 | 0 / 12 | 0 | 1 |
| Martial Arts I | `92f927c92ded9fcf` | present | 11 | 5 | 1 / 9 | 1 | 1 |
| Martial Arts II | `5bedd71f0eead6b9` | present | 11 | 4 | 1 / 9 | 1 | 1 |
| Martial Arts III | `97dbebe63aa6af79` | present | 11 | 4 | 1 / 9 | 1 | 1 |
| Melee Defense | `3a847230d573a623` | present | 10 | 5 | 2 / 6 | 2 | 1 |
| Mighty Swing | `dd2c0e394cdf08ba` | present | 9 | 4 | 0 / 7 | 2 | 1 |
| Mobility | `ff8eaa4e2f6d1cf1` | present | 9 | 3 | 0 / 7 | 2 | 1 |
| Pin | `c238f3f722689a3a` | present | 9 | 5 | 0 / 7 | 2 | 1 |
| Point-Blank Shot | `05459ac4d439f229` | present | 11 | 4 | 2 / 9 | 0 | 1 |
| Power Attack | `3f76464c43c73f84` | present | 13 | 4 | 3 / 10 | 0 | 1 |
| Powerful Charge | `e73873cdc77a6451` | present | 9 | 7 | 1 / 8 | 0 | 1 |
| Precise Shot | `c180eee7d3bc29b2` | present | 11 | 3 | 2 / 9 | 0 | 1 |
| Quick Draw | `44705a692e2f01a6` | present | 10 | 1 | 1 / 7 | 2 | 1 |
| Rapid Shot | `94b8751efb03536a` | present | 11 | 4 | 2 / 9 | 0 | 1 |
| Rapid Strike | `ccb33e58342499a3` | present | 12 | 4 | 2 / 10 | 0 | 1 |
| Running Attack | `4d6a68d553fb0449` | present | 13 | 4 | 4 / 8 | 1 | 1 |
| Shake It Off | `3036290329d5b3e6` | present | 9 | 2 | 0 / 7 | 2 | 1 |
| Skill Focus | `1592aaedf4b6e40a` | present | 10 | 1 | 0 / 10 | 0 | 1 |
| Skill Training | `a9f6de36f24ef202` | present | 14 | 1 | 0 / 14 | 0 | 1 |
| Sniper | `56367f3943ee8c17` | present | 12 | 5 | 3 / 9 | 0 | 1 |
| Strong in the Force | `71892687abbed346` | present | 8 | 1 | 0 / 5 | 3 | 1 |
| Surgical Expertise | `f9ae5b531ae01fd0` | present | 9 | 4 | 2 / 7 | 0 | 1 |
| Throw | `3eed0b4f1227cf91` | present | 10 | 7 | 1 / 7 | 2 | 1 |
| Toughness | `11db29efd899c438` | present | 11 | 1 | 2 / 8 | 1 | 1 |
| Trip | `a8511e47656ef4dd` | present | 10 | 4 | 1 / 7 | 2 | 1 |
| Triple Attack | `648a4f16669056f0` | present | 9 | 3 | 3 / 6 | 0 | 1 |
| Triple Crit | `3d4a4e93ced26712` | present | 8 | 3 | 3 / 5 | 0 | 1 |
| Vehicular Combat | `1f2f70d34a17667d` | present | 8 | 6 | 0 / 7 | 1 | 1 |
| Weapon Finesse | `252b67d6e31c377e` | present | 13 | 3 | 1 / 11 | 1 | 1 |
| Weapon Focus | `c41814601364b643` | present | 12 | 3 | 0 / 12 | 0 | 1 |
| Weapon Proficiency | `ecc2471ac96ec2d4` | present | 14 | 2 | 1 / 13 | 0 | 1 |
| Whirlwind Attack | `600f43af4edb16f7` | present | 11 | 4 | 1 / 10 | 0 | 1 |
| Dreadful Countenance | `2e5ada2de01fff4d` | present | 6 | 7 | 0 / 6 | 0 | 1 |
| Rapid Assault | `4be60753991eec43` | present | 7 | 6 | 0 / 7 | 0 | 1 |

Per-feat tag arrays and warning text are in the JSON report.
