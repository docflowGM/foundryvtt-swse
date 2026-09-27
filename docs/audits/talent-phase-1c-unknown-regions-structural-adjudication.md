# PHASE 2 SUPERSEDING CORRECTION — 2026-09-27

The Phase 2 page/hierarchy pass corrected two Phase 1C membership interpretations below:

- **Exile:** canonical talents are Arrogant Bluster, Band Together, Galactic Guidance, Rant, Self-Reliant. **Strength in Numbers** and **Temporary Allies** are actions inside Band Together.
- **Warrior:** canonical talents are Champion, Quick Study, Simple Opportunity, Warrior's Awareness, Warrior's Determination. **Disarming Hit** and **Masterful Strike** are actions inside Champion.

Therefore the five class trees audited in this document contain **23**, not 27, standalone talent identities. The machine authority is the corrected `data/audits/talent-canonical-tree-registry.json`.

---

# PHASE 1C-UR FINDINGS - The Unknown Regions Structural Talent Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:**  
- `docs/audits/talent-phase-1a-repository-graph-census.md`
- `docs/audits/talent-phase-1b-fandom-reference-diff.md`

**Primary source:** `SW_Saga_The_Unknown_Regions.pdf`  
**Primary-source pages inspected:** printed pp. 19-23

> **Scope:** This sub-phase adjudicates the Unknown Regions structural discrepancy queue: Noble -> Exile, Scoundrel -> Outsider, Scout -> Master Scout / Mobile Scout, Soldier -> Warrior, plus tree membership and wrong-tree claims.

---

# 1. Sourcebook verdict

The sourcebook directly supports all five Phase 1B Unknown Regions class/tree relationships.

| Class | Talent tree | Printed page |
|---|---|---:|
| Noble | Exile | 19-20 |
| Scoundrel | Outsider | 20-21 |
| Scout | Master Scout | 21-22 |
| Scout | Mobile Scout | 22-23 |
| Soldier | Warrior | 23 |

**All five Phase 1B Unknown Regions class-usage rows are primary-source confirmed.**

Current class documents omit all five access edges.

**Disposition:** `ACCESS_ERROR_CONFIRMED` x5

---

# 2. Exile Talent Tree - Noble

Canonical membership across pp. 19-20:

1. Arrogant Bluster
2. Band Together
3. Strength in Numbers
4. Temporary Allies
5. Galactic Guidance
6. Rant
7. Self-Reliant

Current repository tree:

```text
Exile
id: 0b5857edbcf049a2
talents:
- Galactic Guidance
```

Correctly represented:

- Galactic Guidance

Missing correct Exile identities:

- Arrogant Bluster
- Band Together
- Strength in Numbers
- Temporary Allies
- Rant
- Self-Reliant

## Same-name hazard: Strength in Numbers

The repository already contains a `Strength in Numbers` talent in the Republic Commando tree whose benefit grants +2 Damage Reduction while near an ally.

The Unknown Regions Exile `Strength in Numbers` is a different mechanic: it grants nearby allies a Will Defense bonus.

Therefore this is a distinct same-name published talent identity.

**Disposition:**
- tree membership: 1/7 correct
- 5 ordinary missing talents
- 1 missing same-name variant

---

# 3. Outsider Talent Tree - Scoundrel

Canonical membership across pp. 20-21:

1. Oafish
2. Outsider's Eye
3. Outsider's Query
4. Wary

Current repository tree:

```text
Outsider
id: b15586b9c9554cf8
talents:
- Outsider's Eye
```

Missing:

- Oafish
- Outsider's Query
- Wary

**Disposition:**
- tree membership: 1/4 correct
- missing content: 3 talents

---

# 4. Master Scout Talent Tree - Scout

The sourcebook introduces Master Scout on pp. 21-22 and explicitly notes that several of its talents draw upon talents from multiple Scout trees.

Canonical membership:

1. Piercing Hit
2. Quicktrap
3. Speedclimber
4. Surprisingly Quick
5. Tripwire

Current repository tree:

```text
Master Scout
id: dca33c0215264a02
talents:
- Long Stride
- Tripwire
- Jury-Rigger
- Acute Senses
```

Only **Tripwire** actually belongs to the published Master Scout tree.

The other three current tree claims are prerequisite/source talents from other Scout trees, not Master Scout membership:

- Long Stride
- Jury-Rigger
- Acute Senses

The sourcebook itself demonstrates this by citing them as prerequisites to Master Scout talents.

Missing canonical Master Scout talents:

- Piercing Hit
- Quicktrap
- Speedclimber
- Surprisingly Quick

**Disposition:**
- `TREE_MEMBERSHIP_ERROR_CONFIRMED` x3 current claims
- tree membership: 1/5 correct
- `MISSING_CONTENT_CONFIRMED` x4

This is a strong example of a previous repository tree-cleanup pass preserving prerequisite talents as if they were members of the prestige tree.

---

# 5. Mobile Scout Talent Tree - Scout

Canonical membership across pp. 22-23:

1. Battle Mount
2. Expert Rider
3. Terrain Guidance
4. Mechanized Rider

Current repository tree:

```text
Mobile Scout
id: c7a4e66f46044c7a
talents:
- Expert Rider
```

Missing:

- Battle Mount
- Terrain Guidance
- Mechanized Rider

**Disposition:**
- tree membership: 1/4 correct
- missing content: 3 talents

---

# 6. Warrior Talent Tree - Soldier

Galaxy text on p. 23 presents Warrior under Soldier.

Canonical membership:

1. Champion
2. Disarming Hit
3. Masterful Strike
4. Quick Study
5. Simple Opportunity
6. Warrior's Awareness
7. Warrior's Determination

Current repository tree:

```text
Warrior
id: 13776eed744d410c
talents:
- Weapon Proficiency (Simple Weapons)
- Warrior's Awareness
- Ranged Disarm
```

Only **Warrior's Awareness** belongs to the published Warrior tree.

The other two current claims are wrong-tree content:

- Weapon Proficiency (Simple Weapons)
- Ranged Disarm

The sourcebook uses Weapon Proficiency (simple weapons) as a prerequisite for **Simple Opportunity**; it is not itself a Warrior talent.

`Ranged Disarm` is a separate talent elsewhere in the system and is not listed in this Warrior tree.

Missing canonical Warrior talents:

- Champion
- Disarming Hit
- Masterful Strike
- Quick Study
- Simple Opportunity
- Warrior's Determination

**Disposition:**
- `TREE_MEMBERSHIP_ERROR_CONFIRMED` x2
- tree membership: 1/7 correct
- `MISSING_CONTENT_CONFIRMED` x6

---

# 7. Unknown Regions structural completeness summary

| Tree | Canonical talents | Correct repo members | Missing correct identities | Wrong current claims |
|---|---:|---:|---:|---:|
| Exile | 7 | 1 | 6 | 0 |
| Outsider | 4 | 1 | 3 | 0 |
| Master Scout | 5 | 1 | 4 | 3 |
| Mobile Scout | 4 | 1 | 3 | 0 |
| Warrior | 7 | 1 | 6 | 2 |
| **Total** | **27** | **5** | **22** | **5** |

Only **5 of 27** canonical talent identities in these five audited Unknown Regions trees are currently represented in the correct tree.

In addition, **5 current tree claims are source-confirmed wrong**.

---

# 8. Source-confirmed future correction packet

## Class access additions

- Noble -> Exile
- Scoundrel -> Outsider
- Scout -> Master Scout
- Scout -> Mobile Scout
- Soldier -> Warrior

## Remove wrong tree claims

From Master Scout:

- Long Stride
- Jury-Rigger
- Acute Senses

From Warrior:

- Weapon Proficiency (Simple Weapons)
- Ranged Disarm

These records should not necessarily be deleted; their correct owners/trees must be preserved.

## Missing talent identities

22 source-confirmed missing/correct-tree identities.

One, Exile `Strength in Numbers`, is a same-name variant and must remain distinct from the Republic Commando talent.

---

# 9. What this sub-phase does NOT yet certify

Still pending:

- exact source text normalization
- prerequisites and structured prerequisite representation
- action/trigger/target/duration/usage extraction
- abilityMeta correctness
- runtime owner
- automation ceiling
- movement/mount/grapple/skill runtime requirements
- progression tests

---

# 10. Phase 1C-UR stop gate

- [x] Render and visually inspect the relevant Unknown Regions pages.
- [x] Confirm all five class/tree access relationships.
- [x] Confirm canonical tree membership.
- [x] Compare membership against current repository.
- [x] Identify five wrong-tree repository claims.
- [x] Identify the distinct Exile `Strength in Numbers` same-name variant.
- [x] Identify 22 missing/correct-tree talent identities.
- [x] Make no production/data changes.
- [x] Publish findings before continuing.

# Verdict

The Unknown Regions discrepancy is not just missing class access. It exposes **both missing content and false tree membership**.

Across Exile, Outsider, Master Scout, Mobile Scout, and Warrior:

- 27 published talent identities exist;
- only 5 are currently in the correct tree;
- 22 correct identities are absent;
- 5 current tree claims are source-confirmed wrong.

The next sourcebook in the structural queue is **Legacy Era Campaign Guide** for Provocateur, but that primary PDF is not currently among the uploaded project sources. The next directly available primary-source adjudication is **Scum and Villainy** for GenoHaradan.
