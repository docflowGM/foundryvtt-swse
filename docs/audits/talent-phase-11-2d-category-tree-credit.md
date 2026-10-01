# Phase 11-2D — category has zero tree-credit authority

Owner ruling: **category is classification/access metadata, not tree membership.** A talent receives tree credit only from explicit structured tree-identity fields and certified membership (`TalentTreeDB.getTreeIdsForTalentId`). `system.tags` (Phase 11-2C) and now `talent.category` / `talent.system.category` are not tree-identity candidates in `getCanonicalTalentTreeIds`. No pack, tag, category value or membership list was changed.

## Before / after (tree-credit audit, `data/audits/talent-phase-11-2c-tree-credit-repair.json`)

| Measure | Before (11-2C, main) | After (11-2D) |
|---|---:|---:|
| credits from structured fields without certified membership | 59 | 0 |
| of which from the category field | 59 | 0 |
| checker reads category for tree identity | n/a (read) | false |
| checker reads tags for tree identity | false | false |
| primary trees resolved / unresolved | 1187 / 0 | 1187 / 0 |
| certified relationships unresolved | 0 | 0 |
| polluting tag credits (old) / remaining | 298 / 0 | 298 / 0 |
| tag credits mirroring membership, restored by authority | 79 / 79 | 79 / 79 |

The audit now splits old credits by origin (tag / category / both) and **fails** (non-zero exit, in the CI gate) if any credit comes from a tag or the category field, if the checker reads either for tree identity, or if any certified identity is unresolved. Of the old credits, 59 false category credits are now gone (54 category-only, 5 also granted by a tag); 55 category credits that happened to equal a talent's own primary tree remain resolved through certified membership.

## The 59 affected talents (category equals a tree they do not belong to)

| Category / false tree | Certified actual tree | Talents |
|---|---|---:|
| Bounty Hunter | Force Hunter | 6 |
| Bounty Hunter | Gand Findsman | 5 |
| Force Adept | Beastwarden | 5 |
| Force Adept | Force Item | 8 |
| Force Adept | Imperial Inquisitor | 4 |
| Force Adept | Mystic | 4 |
| Force Adept | Telepath | 5 |
| Gunslinger | Carbineer | 8 |
| Gunslinger | Pistoleer | 4 |
| Improviser | Procurement | 5 |
| Shaper | Implant | 5 |

Sourcebooks: Legacy Era Campaign Guide 19; Jedi Academy Training Manual 14; Scum and Villainy 9; Rebellion Era Campaign Guide 5; Saga Edition Core Rulebook 4; Force Unleashed Campaign Guide 4; Clone Wars Campaign Guide 2; Knights of the Old Republic Campaign Guide 2.

| Talent ID | Talent | Source | Page | Category | Certified primary tree |
|---|---|---|---:|---|---|
| `2fdf215a5da99e00` | Adrenaline Implant | Legacy Era Campaign Guide | 47 | Shaper | Implant |
| `aa9b67c6737c2549` | Attune Weapon | Saga Edition Core Rulebook | 214 | Force Adept | Force Item |
| `c006a4be6de26139` | Black Market Buyer | Rebellion Era Campaign Guide | 43 | Improviser | Procurement |
| `9b337a844329fa17` | Blowback | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `9c88f3f82e6e2082` | Bonded Mount | Jedi Academy Training Manual | 18 | Force Adept | Beastwarden |
| `cddfb9833c7d3344` | Channel Vitality | Jedi Academy Training Manual | 18 | Force Adept | Mystic |
| `bab9a1ce285f98b9` | Charm Beast | Jedi Academy Training Manual | 18 | Force Adept | Beastwarden |
| `7d30702a5a2640a4` | Close Contact | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `084423db749d2bb3` | Closed Mind | Jedi Academy Training Manual | 18 | Force Adept | Mystic |
| `0e36a04342959256` | Cower Enemies | Force Unleashed Campaign Guide | 42 | Force Adept | Imperial Inquisitor |
| `c41461c3bdd0165d` | Dash and Blast | Scum and Villainy | 27 | Gunslinger | Pistoleer |
| `5218d5971b78119b` | Empower Weapon | Saga Edition Core Rulebook | 214 | Force Adept | Force Item |
| `b15fa2f45baf55ea` | Entreat Beast | Jedi Academy Training Manual | 18 | Force Adept | Beastwarden |
| `08e904def2f9ea5c` | Esoteric Technique | Jedi Academy Training Manual | 18 | Force Adept | Mystic |
| `85318987b48d5caa` | Excellent Kit | Rebellion Era Campaign Guide | 43 | Improviser | Procurement |
| `661c2c0665e911f6` | Findsman Ceremonies | Scum and Villainy | 26 | Bounty Hunter | Gand Findsman |
| `e8fe6087eef386c7` | Findsman's Foresight | Scum and Villainy | 26 | Bounty Hunter | Gand Findsman |
| `12eea831f06c45f7` | Focused Force Talisman | Clone Wars Campaign Guide | 40 | Force Adept | Force Item |
| `cdcdb85912d9eb67` | Force Blank | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `2acaa4620d396fe9` | Force Interrogation | Force Unleashed Campaign Guide | 43 | Force Adept | Imperial Inquisitor |
| `66b23ee79bd33bf1` | Force Talisman | Saga Edition Core Rulebook | 214 | Force Adept | Force Item |
| `86565bbe8b8fd1a2` | Force Throw | Knights of the Old Republic Campaign Guide | 38 | Force Adept | Force Item |
| `4ae840aaa4e0eba0` | Greater Focused Force Talisman | Clone Wars Campaign Guide | 40 | Force Adept | Force Item |
| `0c636cdbb63cdba3` | Greater Force Talisman | Saga Edition Core Rulebook | 214 | Force Adept | Force Item |
| `52a4914cca90cc4d` | Guaranteed Shot | Scum and Villainy | 28 | Gunslinger | Pistoleer |
| `223ba62ffbabb9c2` | Hailfire | Scum and Villainy | 28 | Gunslinger | Pistoleer |
| `76ff0ba56aa3864b` | Inquisition | Force Unleashed Campaign Guide | 43 | Force Adept | Imperial Inquisitor |
| `5cd160036d6bba05` | Just What Is Needed | Rebellion Era Campaign Guide | 43 | Improviser | Procurement |
| `b3ce8b08a8cb95fa` | Lightsaber Evasion | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `ccaa66ed749e3317` | Mind Probe | Jedi Academy Training Manual | 18 | Force Adept | Telepath |
| `ecb678c47bb2cb43` | Multiattack Proficiency (rifles) | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `4ec766d6818c373f` | Mystic Mastery | Jedi Academy Training Manual | 18 | Force Adept | Mystic |
| `970d8d555645604d` | Old Faithful | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `b08c8efbea22f604` | Omens | Scum and Villainy | 26 | Bounty Hunter | Gand Findsman |
| `b5eba49d8305b689` | Only the Finest | Rebellion Era Campaign Guide | 43 | Improviser | Procurement |
| `f5fcf2752e99961a` | Opportunity Fire | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `2da74bc3f4d45d2d` | Perfect Telepathy | Jedi Academy Training Manual | 18 | Force Adept | Telepath |
| `bef731c3743c2c7f` | Precision Fire | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `58e37d40d3aa7d4b` | Precision Implant | Legacy Era Campaign Guide | 47 | Shaper | Implant |
| `d043a3c0494345ac` | Primitive Block | Knights of the Old Republic Campaign Guide | 38 | Force Adept | Force Item |
| `546034f073eab1fd` | Psychic Citadel | Jedi Academy Training Manual | 18 | Force Adept | Telepath |
| `202a117b1b203951` | Psychic Defenses | Jedi Academy Training Manual | 18 | Force Adept | Telepath |
| `94b1951d4795f602` | Resilience Implant | Legacy Era Campaign Guide | 47 | Shaper | Implant |
| `d24b04541998b27b` | Rifle Master | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `f09f37cda0fc10e1` | Right Gear for the Job | Rebellion Era Campaign Guide | 43 | Improviser | Procurement |
| `554e245686231855` | Shoot from the Hip | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `2c1268268212d135` | Snap Shot | Legacy Era Campaign Guide | 41 | Gunslinger | Carbineer |
| `0a65325a98b108a7` | Soothing Presence | Jedi Academy Training Manual | 18 | Force Adept | Beastwarden |
| `d6d3b0a2ec01ca9a` | Speed Implant | Legacy Era Campaign Guide | 47 | Shaper | Implant |
| `19ba6767726bdc86` | Steel Mind | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `cb0dcc59f7ced910` | Strength Implant | Legacy Era Campaign Guide | 47 | Shaper | Implant |
| `5621a55aea1936b2` | Strong-Willed | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `d61e3a2afe8ab339` | Target Visions | Scum and Villainy | 26 | Bounty Hunter | Gand Findsman |
| `203464310c5c2492` | Telekinetic Resistance | Legacy Era Campaign Guide | 40 | Bounty Hunter | Force Hunter |
| `443bfe7fa33dd627` | Telepathic Intruder | Jedi Academy Training Manual | 19 | Force Adept | Telepath |
| `028e4e50565971ee` | Temporal Awareness | Scum and Villainy | 26 | Bounty Hunter | Gand Findsman |
| `c219dc05ccc7db81` | Twin Shot | Scum and Villainy | 28 | Gunslinger | Pistoleer |
| `dd488c2dc43d14ab` | Unsettling Presence | Force Unleashed Campaign Guide | 43 | Force Adept | Imperial Inquisitor |
| `b6e75c52f5d66ade` | Wild Sense | Jedi Academy Training Manual | 18 | Force Adept | Beastwarden |

