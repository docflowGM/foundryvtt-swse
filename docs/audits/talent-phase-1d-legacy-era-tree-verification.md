# PHASE 1D-LECG FINDINGS - Legacy Era Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary sources used:**
- `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`
- `Legacy Era Campaign Guide_djvu.txt` for indexing/search

> **Evidence rule:** the TXT corpus was used to locate sections and enumerate names quickly. The relevant sourcebook pages were rendered and visually checked before structural conclusions were promoted to source-certified status.

---

# 1. Scope

The earlier Phase 1C Legacy pass already source-certified the **Provocateur** talent tree and its special Charlatan access rule.

This pass covers the remaining Legacy Era class/prestige-class tree origins, Legacy additions to pre-existing talent trees, and source-scoped class access grants to pre-existing trees.

The 13 previously pending origin trees are:

| Tree | Class access | Canonical origin talents |
|---|---|---:|
| Brute Squad | Soldier | 6 |
| Yuuzhan Vong Biotech | Scoundrel | 5 |
| Versatility | Scout | 5 |
| Force Hunter | Bounty Hunter | 6 |
| Protection | Elite Trooper | 8 |
| Carbineer | Gunslinger | 8 |
| Jedi Refugee | Jedi Knight | 4 |
| Fugitive Commander | Officer | 6 |
| Sith Commander | Sith Apprentice | 4 |
| Knight's Armor | Imperial Knight | 5 |
| Knight's Resolve | Imperial Knight | 5 |
| Implant | Shaper | 5 |
| Shaper | Shaper | 5 |
| **Total** |  | **72** |

All 13 repository class-access edges match the primary source.

**Access verdict:** `ACCESS_CORRECT` x13.

---

# 2. Heroic-class tree origins

## Brute Squad - Soldier

Canonical membership:

1. Gang Leader
2. Melee Assault
3. Melee Brute
4. Melee Opportunist
5. Squad Brutality
6. Squad Superiority

Repository:

- tree id `7bcd1d892f2e9ae7`
- 6/6 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Yuuzhan Vong Biotech - Scoundrel

Canonical membership:

1. Biotech Adept
2. Bugbite
3. Curved Throw
4. Surprising Weapons
5. Veiled Biotech

Repository:

- tree id `33c3210fcac8c664`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Versatility - Scout

Canonical membership:

1. Adapt and Survive
2. Defensive Protection
3. Quick on Your Feet
4. Ready and Willing
5. Unbalancing Adaptation

Repository:

- tree id `ab2c265c4b2f54f6`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 3. Prestige-class tree origins

## Force Hunter - Bounty Hunter

Canonical membership:

1. Force Blank
2. Lightsaber Evasion
3. Precision Fire
4. Steel Mind
5. Strong-Willed
6. Telekinetic Resistance

Repository:

- tree id `29b16e48a3dbf165`
- 6/6 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Protection - Elite Trooper

Canonical membership:

1. Armored Guard
2. Bodyguard's Sacrifice
3. Guard's Endurance
4. Lifesaver
5. Out of Harm's Way
6. Roll With It
7. Take the Hit
8. Ward

Repository:

- tree id `c92c2cbc79b8a515`
- all 8 canonical members are present
- repository also includes **Harm's Way**

The sourcebook mentions **Harm's Way** inside the Protection rules text as an example of another means by which the character may take damage. It is not printed as a ninth Protection talent.

Therefore the repository has converted a rules cross-reference into tree membership.

**Verdict:**
- canonical membership represented: 8/8
- `Harm's Way`: `WRONG_EXTRA_TREE_MEMBERSHIP_CONFIRMED`

No production correction is made in Phase 1D. The later correction manifest should remove the Protection membership edge while preserving the actual talent identity wherever its canonical tree/source requires it.

## Carbineer - Gunslinger

Canonical membership:

1. Blowback
2. Close Contact
3. Multiattack Proficiency (rifles)
4. Old Faithful
5. Opportunity Fire
6. Rifle Master
7. Shoot from the Hip
8. Snap Shot

Repository:

- tree id `1933731cc59f8463`
- 8/8 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Jedi Refugee - Jedi Knight

Canonical membership:

1. Cover Your Tracks
2. Difficult to Sense
3. Force Veil
4. Jedi Network

Repository:

- tree id `e303ddd025779062`
- 4/4 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Fugitive Commander - Officer

Canonical membership:

1. Disciplined Trickery
2. Group Perception
3. Hasty Withdrawal
4. Stalwart Subordinates
5. Stay in the Fight
6. Stealthy Withdrawal

Repository:

- tree id `61b74c82cb56876c`
- 6/6 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Sith Commander - Sith Apprentice

Canonical membership:

1. Desperate Measures
2. Focus Terror
3. Incite Rage
4. Power of Hatred

Repository:

- tree id `4d5ac20318ef56b6`
- 4/4 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Knight's Armor - Imperial Knight

Canonical membership:

1. Armored Augmentation I
2. Armored Augmentation II
3. Armor Mastery
4. Cortosis Defense
5. Cortosis Retaliation

Repository:

- tree id `ea01d740c91888b3`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

### Identity warning: Armor Mastery

Legacy's **Armor Mastery** in Knight's Armor is a distinct tree-scoped identity from the Core Rulebook **Armor Mastery** in Armor Specialist.

The repository correctly uses a different talent ID for the Knight's Armor record. The canonical registry must continue treating these as tree-scoped identities rather than merging on display name alone.

## Knight's Resolve - Imperial Knight

Canonical membership:

1. Knight's Morale
2. Oath of Duty
3. Praetoria Ishu
4. Praetoria Vonil
5. Strength of the Empire

Repository:

- tree id `8048efd85ae61101`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Implant - Shaper

Canonical membership:

1. Adrenaline Implant
2. Precision Implant
3. Resilience Implant
4. Speed Implant
5. Strength Implant

Repository tree:

```text
Implant
id: d8a71a6c5b2b7581

members:
- Implant (general)
- Adrenaline Implant
- Precision Implant
- Resilience Implant
- Strength Implant
- Speed Implant
```

There is no printed Legacy Era talent named **Implant (general)**. The source has general Implant rules immediately before the named talent entries; that explanatory material appears to have been converted into a talent record.

The repository even has a historical fixer assertion treating `Implant (general)` as an expected Implant-tree record, showing that this contamination was later normalized into the data rather than remaining an isolated import artifact.

**Verdict:**
- canonical membership represented: 5/5
- `Implant (general)`: `NONCANONICAL_GENERAL_RULES_RECORD_CONFIRMED`

A later correction pass should retire/remove this record after reference checks. It should not be treated as a sixth canonical Implant talent.

## Shaper - Shaper prestige class

Canonical membership:

1. Biotech Mastery
2. Expedient Mending
3. Expert Shaper
4. Master Mender
5. Skilled Implanter

Repository:

- tree id `cdbee578d65154fc`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 4. Legacy additions to pre-existing trees

Legacy Era does not only introduce new trees. It adds talents to pre-existing trees.

| Existing tree | Legacy additions | Repo correct-tree representation |
|---|---|---:|
| Jedi Consular | Aggressive Negotiator; Consular's Wisdom; Entreat Aid | 3/3 |
| Jedi Guardian | Defensive Acuity | 1/1 |
| Jedi Sentinel | Dark Side Bane | 1/1 |
| Lightsaber Combat | Cortosis Gauntlet Block; Precision | 2/2 |
| Misfortune | Seducer; Seize Object | 1/2 |
| Brawler | Grabber; Hammerblow; Strong Grab | 3/3 |
| Weapon Specialist | Improved Suppression Fire | 1/1 |
| **Total** | **13 identities** | **12/13** |

## The missing expansion identity: Seducer

The Legacy Era source places **Seducer** in the **Misfortune** talent tree.

Current repository Misfortune membership includes **Seize Object** but not **Seducer**.

The repository also contains a talent named **Seducer** in the **Influence** tree, with a different repository identity. That record must not be moved or merged merely because the display names match.

This is exactly the identity problem the Phase 1D registry was designed to prevent:

```text
display name != universal talent identity
canonical identity = source + tree + talent
```

**Legacy verdict:** the Misfortune-scoped Seducer identity is `MISSING_FROM_CANONICAL_TREE`.

A later identity/content pass must compare the Influence-scoped Seducer record against its own source before deciding whether the repo needs:
- two separate same-name talent records,
- a rename/disambiguation,
- or reconstruction of one corrupted record.

Phase 1D does not collapse them.

---

# 5. Source-scoped access grants to pre-existing trees

Legacy also gives new prestige classes access to trees that originated in earlier books.

These grants need provenance in the canonical registry even though the repository's aggregate class-access graph already contains them.

## Imperial Knight

The Imperial Knight has access to:

- Armor Specialist
- Lightsaber Combat
- Duelist
- Knight's Armor
- Knight's Resolve

The first three are pre-existing trees. Their aggregate repo access is correct, but the registry previously lacked the Legacy Era source-publication edge.

Add Legacy Era `DIRECT_ACCESS_GRANT` provenance for:

- Armor Specialist -> Imperial Knight
- Lightsaber Combat -> Imperial Knight
- Duelist -> Imperial Knight

## Shaper

The Shaper prestige class has access to:

- Advanced Medicine
- Implant
- Shaper

Advanced Medicine originated in The Force Unleashed Campaign Guide. The aggregate repo access is correct, but the registry previously lacked the Legacy source-publication edge.

Add Legacy Era `DIRECT_ACCESS_GRANT` provenance for:

- Advanced Medicine -> Shaper

---

# 6. Structural summary

## New/origin Legacy trees

| Tree | Canonical count | Canonical members represented | Extra / identity issue |
|---|---:|---:|---|
| Brute Squad | 6 | 6 | none |
| Yuuzhan Vong Biotech | 5 | 5 | none |
| Versatility | 5 | 5 | none |
| Force Hunter | 6 | 6 | none |
| Protection | 8 | 8 | extra `Harm's Way` membership |
| Carbineer | 8 | 8 | none |
| Jedi Refugee | 4 | 4 | none |
| Fugitive Commander | 6 | 6 | none |
| Sith Commander | 4 | 4 | none |
| Knight's Armor | 5 | 5 | same-name Armor Mastery correctly remains tree-scoped |
| Knight's Resolve | 5 | 5 | none |
| Implant | 5 | 5 | extra noncanonical `Implant (general)` |
| Shaper | 5 | 5 | none |
| **Total** | **72** | **72** | **2 confirmed extra records/memberships** |

## Legacy expansions of older trees

- canonical expansion identities: **13**
- represented in the correct canonical tree: **12**
- missing from correct tree: **1** - Misfortune-scoped **Seducer**

## Access

- 13/13 origin-tree class-access edges correct
- 4 pre-existing-tree access grants are also correct in aggregate repo data and now receive source-publication provenance

---

# 7. Source-confirmed future correction packet

## Wrong tree membership

- remove **Harm's Way** from **Protection**
- do not delete the talent solely because this edge is wrong; preserve/reconcile its canonical identity separately

## Noncanonical record

- retire/remove **Implant (general)** after reference checks
- it is source explanatory/rules material, not a printed talent identity

## Missing canonical expansion identity

- add/reconstruct the Legacy Era **Seducer** identity in **Misfortune**
- do not blindly move the repo's existing Influence-scoped Seducer
- first adjudicate the same-name Influence identity from its own primary source

## Identity preservation

- keep Knight's Armor **Armor Mastery** distinct from Core Armor Specialist **Armor Mastery**

No production talent-pack changes are made in this phase.

---

# 8. What this pass does NOT yet certify

Still pending:

- full description fidelity for every Legacy talent
- prerequisite fidelity
- abilityMeta/runtime behavior
- automation ceiling
- mechanical owner
- progression tests
- source adjudication of the separate Influence-scoped Seducer identity
- reference impact analysis before retiring `Implant (general)`
- canonical destination/identity reconciliation before altering `Harm's Way`

This pass certifies sourcebook identity, tree membership, expansion membership, and class-access provenance.

---

# 9. Stop gate

- [x] TXT sections indexed.
- [x] Relevant PDF pages rendered and visually checked.
- [x] 13 previously pending Legacy origin trees source-confirmed.
- [x] 72 canonical origin memberships compared to repository.
- [x] 13 Legacy expansion memberships into older trees checked.
- [x] Class access compared to repository.
- [x] Pre-existing-tree access grants provenance identified.
- [x] Protection extra `Harm's Way` membership source-disproved.
- [x] `Implant (general)` classified as noncanonical general-rules contamination.
- [x] Misfortune-scoped `Seducer` identified as the sole missing Legacy expansion membership.
- [x] Same-name identities preserved rather than merged by display name.
- [x] No production/data pack changes made.

# Verdict

The Legacy Era class-tree graph is considerably healthier than the Core/FUC problem areas.

All **72 canonical origin talent identities** across the 13 newly verified trees are represented. The source-confirmed defects are narrow but important:

1. **Protection has one wrong extra membership: Harm's Way.**
2. **Implant has one noncanonical pseudo-talent: Implant (general).**
3. **The Legacy Misfortune-scoped Seducer identity is missing from its correct canonical tree, while another same-name Seducer exists under Influence and must be adjudicated independently.**

The registry should promote these 13 tree origins to primary-source verified, record the 13 Legacy expansion identities, and add the four Legacy source-scoped access grants to pre-existing trees.
