# PHASE 1A FINDINGS - Repository Talent Graph Census

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent audit:** `docs/audits/talent-phase-0-reconciliation.md`  
**Baseline:** `main@4a2d095d96774c3cd49ab68b6c43e8e9a3db0cde`

> **Scope rule:** Phase 1A is repository-only. No Fandom claim and no sourcebook claim is treated as authority here. This file freezes what the repository currently says so Phase 1B/1C can compare it against external/reference evidence.

---

## 1. Census summary

| Object / relationship | Count |
|---|---:|
| Talent documents in `packs/talents.db` | **1,024** |
| Talent-tree documents in `packs/talent_trees.db` | **190** |
| Class documents in `packs/classes.db` | **37** |
| Tree -> talent edges | **1,024** |
| Unique talent IDs claimed by trees | **1,024** |
| Talents claimed by more than one tree | **0** |
| Talents claimed by no tree | **0** |
| Tree references to missing talent IDs | **0** |
| Tree `talentIds` / `talentNames` mismatches | **0** |
| Class -> tree edges in class documents | **173** |
| Trees claimed by >=1 class document | **121** |
| Trees with >1 class claimant | **27** |
| Trees with no class-document claimant | **71** |
| Class references to nonexistent tree IDs | **2 raw-field references** |
| Duplicate tree refs inside a class | **0** |
| Class `talent_trees` vs `talentTreeSourceIds` disagreements | **2 classes** |
| `talent_tree_class_map.json` entries | **136** |
| Pack-tree vs class-map access mismatches | **17** |
| Class-map names with no exact tree-name match | **3** |
| Duplicate talent names across distinct IDs | **9 name groups** |
| Talent document tree-name vs claiming tree mismatch | **2 talents** |

---

# 2. Primary structural invariant - CONFIRMED

The repository currently satisfies the user-provided invariant:

> **Every one of the 1,024 talent documents is claimed by exactly one talent tree.**

Proof from the current pack:

- 1,024 talent documents;
- 1,024 tree -> talent edges;
- 1,024 unique claimed talent IDs;
- 0 duplicate tree claims;
- 0 unclaimed talent IDs;
- 0 tree references to nonexistent talent IDs.

This is a strong structural foundation for the source audit.

### Audit consequence

The canonical audit unit can safely be the current tree claim:

```text
repository tree
    -> claimed talent
```

and Phase 1B/1C can ask whether that one-to-one repository claim is canonically correct.

---

# 3. Tree-side names are internally coherent

For all 190 tree documents:

- `system.talentIds.length` matches `system.talentNames.length`;
- each listed talent name matches the actual current talent document for that ID;
- no tree lists a missing talent document.

**Repository-internal status:** CLEAN.

This is not RAW certification. It only means the tree pack is internally synchronized with the talent pack.

---

# 4. Two talent documents disagree with their sole claiming tree

Although every talent is claimed exactly once, two talent documents carry a different declared tree name than the tree that actually claims them.

| Talent | Talent ID | Claiming tree | Talent document declares |
|---|---|---|---|
| Sentinel Strike | `cf2d518039afd828` | Jedi Shadow | Jedi Sentinel |
| Sentinel's Gambit | `df40e8294bd43fe7` | Jedi Shadow | Jedi Sentinel |

These are **confirmed repository contradictions**.

Phase 1A does not decide which side is canonically right. Phase 1C must verify these against the sourcebooks before changing either record or tree membership.

**Status:** `SOURCE_REVIEW_REQUIRED`

---

# 5. Class -> tree graph

The 37 class documents currently claim 173 class/tree edges.

## Base classes

| Class | Claimed talent trees |
|---|---|
| Jedi | Jedi Consular; Jedi Guardian; Jedi Sentinel; Lightsaber Combat |
| Noble | Influence; Inspiration; Leadership; Lineage; Fencing; Ideologue; Disgrace; Collaborator; Loyal Protector; Provocateur; Gambling Leader; Superior Skills |
| Scoundrel | Fortune; Misfortune; Slicer; Spacer; Outlaw Tech; Malkite Poisoner; Run and Gun; Smuggling; Opportunist; Recklessness; Yuuzhan Vong Biotech |
| Scout | Awareness; Camouflage; Fringer; Survivor; Hyperspace Explorer; Spy; Reconnaissance; Surveillance; Unpredictable; Versatility |
| Soldier | Armor Specialist; Brawler; Commando; Weapon Specialist; Rocket Jumper; Mercenary; Squad Leader; Trooper; Ambusher; Brute Squad |

## Prestige / advanced classes

| Class | Claimed talent trees |
|---|---|
| Ace Pilot | Expert Pilot; Gunner; Spacer; Squadron Leader; Blockade Runner; Wingman |
| Assassin | Misfortune; Malkite Poisoner; Assassin; Genoharadan |
| Bounty Hunter | Awareness; Bounty Hunter; Misfortune; Gand Findsman; Force Hunter |
| Charlatan | Disgrace; Trickery |
| Corporate Agent | Leadership; Lineage; Corporate Power |
| Crime Lord | Infamy; Influence; Mastermind |
| Droid Commander | Inspiration; Leadership; Droid Commander |
| Elite Trooper | Camouflage; Commando; Weapon Master; Master of Teräs Käsi; Mandalorian Warrior; Critical Master; Melee Specialist; Republic Commando; Protection |
| Enforcer | Survivor; Enforcement |
| Force Adept | Dark Side Devotee; Force Adept; Force Item; Imperial Inquisitor; Beastwarden; Mystic; Telepath |
| Force Disciple | Force Adept |
| Gladiator | Armor Specialist; Awareness; Gladiatorial Combat |
| Gunslinger | Awareness; Fortune; Gunslinger; Pistoleer; Carbineer |
| Imperial Knight | Armor Specialist; Duelist; Lightsaber Combat; Knight's Armor; Knight's Resolve |
| Improviser | Outlaw Tech; Procurement; Improviser |
| Independent Droid | Autonomy; Specialized Droid; Elite Droid |
| Infiltrator | Camouflage; Bothan Spynet; Infiltration; Spy |
| Jedi Knight | Armor Specialist; Duelist; Lightsaber Combat; Lightsaber Forms; Jedi Battlemaster; Jedi Shadow; Jedi Watchman; Jedi Archivist; Jedi Healer; Jedi Artisan; Jedi Instructor; Jedi Investigator; Jedi Refugee; Jedi Weapon Master |
| Jedi Master | Duelist |
| Martial Arts Master | Awareness; Master of Teräs Käsi |
| Master Privateer | Infamy; Spacer; Privateer; Piracy |
| Medic | Survivor; Advanced Medicine |
| Melee Duelist | Brawler; Weapon Specialist; Melee Duelist |
| Military Engineer | Outlaw Tech; Military Engineer |
| Officer | Commando; Leadership; Military Tactics; Naval Officer; Fugitive Commander; Rebel Recruiter |
| Outlaw | Fringer; Survivor; Slicer; Outlaw |
| Pathfinder | Awareness; Survivor; Pathfinder |
| Saboteur | Misfortune; Slicer; Sabotage; Turret |
| Shaper | Advanced Medicine; Implant; Shaper |
| Sith Apprentice | Armor Specialist; Duelist; Lightsaber Combat; Sith; Sith Alchemy; Sith Commander |
| Sith Lord | Sith |
| Vanguard | Awareness; Survivor; Vanguard |

---

# 6. Two class records contain stale/name-form tree references

Two class documents have `system.talent_trees` values that are not actual tree IDs, while their parallel `talentTreeSourceIds` fields correctly point at an existing tree document.

## Assassin

```text
system.talent_trees:
  GenoHaradan              <- not a tree ID

system.talentTreeSourceIds:
  da7b731a3e434a7a          -> Genoharadan
```

## Infiltrator

```text
system.talent_trees:
  Bothan SpyNet             <- not a tree ID

system.talentTreeSourceIds:
  d20682671d035cef          -> Bothan Spynet
```

These create the two apparent "missing tree reference" hits when reading `talent_trees` literally.

**Phase 1A disposition:** confirmed repository field drift, not yet corrected.

The source-ID graph resolves both class relationships successfully.

---

# 7. Class-map drift - 17 current mismatches

Comparing class documents against `data/talent_tree_class_map.json` finds **17 tree access mismatches**.

| Tree | Class documents claim | `talent_tree_class_map.json` claims |
|---|---|---|
| Override | none | Droid Commander |
| Exile | none | Noble |
| Warrior | none | Soldier |
| Anticipation | none | Noble |
| Brigand | none | Scoundrel |
| Veteran | none | Soldier |
| Advance Patrol | none | Scout |
| Autonomy | Independent Droid | none |
| Shockboxer | none | Soldier |
| Outsider | none | Scoundrel |
| Mobile Scout | none | Scout |
| Sharpshooter | none | Gunslinger |
| Bothan Spynet | none | Infiltrator |
| Provocateur | Noble | Charlatan, Noble |
| Genoharadan | none | Assassin |
| Master Scout | none | Scout |
| Revolutionary | none | Scoundrel |

This is the strongest Phase 1A evidence that the repository currently has **more than one competing class/tree access representation**.

No side is declared canonical yet.

Phase 1B should compare these relationships against the Fandom reference index; Phase 1C must settle discrepancies from primary books.

---

# 8. Three class-map names have no exact tree-name match

`data/talent_tree_class_map.json` contains exact keys that do not match a current talent-tree document name:

- `Espionage`
- `Master of Intrigue`
- `Skill Challenge`

At least one obvious naming-style issue exists elsewhere in the pack (`Master Of Intrigue` vs `Master of Intrigue`), but Phase 1A does not normalize names or infer canonical spelling.

**Status:** `REPOSITORY_NAMING_RECONCILIATION_REQUIRED`

---

# 9. Seventy-one trees currently have no class-document claimant

This is **not automatically an error**.

Many are clearly Force trees, Force-tradition trees, degree-droid trees, species/special trees, or other non-class access structures.

The 71 are:

1stdegree Droid; 2nddegree Droid; 3rddegree Droid; 4thdegree Droid; 5thdegree Droid; Advance Patrol; Agent Of Ossus; Aingtii Monk; Alter; Anticipation; Bando Gora Captain; Baran Do Sage; Believer Disciple; Blackguard Wilder; Blazing Chain; Bomarr Monk; Brigand; Chalactan Adept; Cloner; Control; Cowardice; Dark Side; Dathomiri Witch; Defensive Duelist; Disciple Of Twilight; Ember Of Vahl; Exceptional Followers; Exile; Felucian Shaman; Force Warrior; Galactic Senator; Genohardan; Guardian Spirit; Iron Knight; Jal Shey; Jedaii Ranger; Jensaarai Defender; Jumptrooper; Keetael; Kilian Ranger; Korunnai Adept; Krath; Light Side; Luka Sene; Master Of Intrigue; Master Of The Amphistaff; Master Scout; Matukai Adept; Mechanic; Midichlorian; Mobile Scout; Morgukai Warrior; Order of Shasa; Outsider; Override; Revolutionary; Science; Sense; Seyugi Dervish; Sharpshooter; Shockboxer; Smashball Pro; Sorcerer Of Tund; Treatment; Tyia Adept; Veteran; Warden Of The Sky; Warrior; White Current Adept.

A rough repository-tag grouping gives:

- **36** Force / Force-tradition tagged;
- **6** droid/degree-droid tagged;
- **1** explicitly species-tagged;
- **28** other/unclassified by those broad tag tests.

The "other" group is precisely where Phase 1B's class-usage reference comparison will be useful. Several already appear in `talent_tree_class_map.json` with class claims even though the class documents do not claim them.

---

# 10. Duplicate talent names - 9 legitimate-or-suspicious identity groups

The repository has nine normalized name groups containing more than one talent document.

Because every document is separately claimed by exactly one tree, these must **not** be auto-deduplicated.

| Name | Tree claims |
|---|---|
| Adept Spellcaster | Dathomiri Witch; Sorcerer Of Tund |
| Force Treatment | Force Adept; Jedi Healer |
| Armor Mastery | Armor Specialist; Knight's Armor |
| Multiattack Proficiency (rifles) | Weapon Master; Carbineer |
| Multiattack Proficiency (advanced melee) | Privateer; Melee Duelist |
| Ruthless | Assassin; Mercenary |
| Keep it Together | Fringer; Expert Pilot |
| Akk Dog Master | Korunnai Adept; Exceptional Followers |
| Seize the Moment | Outlaw; Provocateur |

**Phase 1A rule:** name equality is not identity equality.

Each pair must be source-verified independently under its claiming tree.

---

# 11. What Phase 1A proves

### Confirmed

1. The current talent pack has 1,024 records.
2. The current talent-tree pack has 190 records.
3. Every current talent ID is claimed by exactly one current tree.
4. No tree has a broken talent-ID reference.
5. Tree-side talent names are synchronized with talent documents.
6. Class documents expose a usable class -> tree source-ID graph.
7. Shared tree access exists and is common: 27 tree documents are claimed by multiple classes.
8. There are concrete competing repository representations of class/tree access.
9. There are nine same-name multi-record talent groups that must not be name-deduped.
10. There are two direct talent/tree declaration contradictions requiring source adjudication.

### Not proven

Phase 1A proves **none** of the following:

- that any tree name is canonical;
- that any class should canonically access a given tree;
- that any talent belongs to its current tree;
- that a same-name pair represents legitimately distinct RAW talents;
- that any source/page/prerequisite/description is correct.

Those are Phase 1B/1C questions.

---

# 12. Phase 1A findings requiring follow-up

## High-priority structural reconciliation

- Sentinel Strike: Jedi Shadow claim vs Jedi Sentinel declaration.
- Sentinel's Gambit: Jedi Shadow claim vs Jedi Sentinel declaration.
- 17 class-document / class-map access disagreements.
- 3 class-map names without exact tree-name matches.
- Assassin `GenoHaradan` raw ref vs `Genoharadan` source-ID tree.
- Infiltrator `Bothan SpyNet` raw ref vs `Bothan Spynet` source-ID tree.

## Source-review groups

- all 71 trees without a class-document claimant;
- all 9 duplicate talent-name groups;
- all class/tree access edges once Phase 1B imports the external reference matrix.

---

# 13. Phase 1A stop gate

- [x] Count current talents.
- [x] Count current talent trees.
- [x] Count current classes.
- [x] Freeze tree -> talent graph.
- [x] Prove no talent is multiply claimed.
- [x] Prove no talent is unclaimed.
- [x] Check missing tree -> talent references.
- [x] Freeze class -> tree graph.
- [x] Identify shared class access.
- [x] Identify class-map drift.
- [x] Identify current same-name talent groups.
- [x] Identify direct tree-declaration contradictions.
- [x] Make **no RAW claims and no production/data changes**.

## Phase 1A verdict

**Repository graph is strong on `Tree -> Talent` integrity but materially less coherent on `Class -> Tree` authority.**

That is exactly the split Phase 1B should attack next using the Fandom talent-tree/class-usage index as a reference comparison, followed by Phase 1C sourcebook adjudication.
