# PHASE 1D - Class Access Provenance Closeout

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Scope

This pass closes the remaining source-scoped class/prestige-class access provenance for canonical talent trees.

The registry already distinguished:

- tree origin,
- talent publication,
- class access publication,
- aggregate canonical access.

The remaining gap was a set of later prestige classes that gain access to pre-existing talent trees.

Primary-source class `Talents` sections were used as authority.

No production class or talent-tree documents are modified in this phase.

---

# 1. Source-confirmed later access grants

## Knights of the Old Republic Campaign Guide

### Gladiator
The Gladiator can select from:
- Armor Specialist
- Awareness
- Gladiatorial Combat

Add provenance:
- Armor Specialist -> Gladiator
- Awareness -> Gladiator

### Melee Duelist
The Melee Duelist can select from:
- Brawler
- Weapon Specialist
- its own published class trees

Add provenance:
- Brawler -> Melee Duelist
- Weapon Specialist -> Melee Duelist

### Corporate Agent
Source grants access to:
- Leadership
- Lineage
- Corporate Power

Add provenance:
- Leadership -> Corporate Agent
- Lineage -> Corporate Agent

---

## Galaxy at War

### Martial Arts Master
Source grants access to:
- Awareness
- Master of Teräs Käsi
- Martial Arts Forms
- Unarmed Mastery

Add provenance:
- Awareness -> Martial Arts Master

The other three relationships are already represented as origin/direct source edges in their own registry entries.

---

## Rebellion Era Campaign Guide

### Pathfinder
Source grants access to:
- Pathfinder
- Awareness
- Survivor

Add provenance:
- Awareness -> Pathfinder
- Survivor -> Pathfinder

---

## Clone Wars Campaign Guide

### Vanguard
Source grants access to:
- Awareness
- Survivor
- Vanguard

Add provenance:
- Awareness -> Vanguard
- Survivor -> Vanguard

### Droid Commander
The class Talents section explicitly grants:
- Droid Commander
- Inspiration
- Leadership

Add provenance:
- Inspiration -> Droid Commander
- Leadership -> Droid Commander

---

## The Force Unleashed Campaign Guide

### Infiltrator
Source grants:
- Camouflage
- Spy
- Infiltration
- Bothan Spynet

Add provenance:
- Camouflage -> Infiltrator

### Master Privateer
Source grants:
- Infamy
- Privateer

Add provenance:
- Infamy -> Master Privateer

Important correction:

The repository/reference layer also claims:

- Spacer -> Master Privateer

The primary-source Talents section does **not** grant Spacer.

Therefore:

`Master Privateer -> Spacer` = `ACCESS_ERROR_SOURCE_DISPROVED`

This edge must not be promoted into canonical access provenance.

### Saboteur
Source grants:
- Slicer
- Misfortune
- Sabotage
- Turret

Add provenance:
- Slicer -> Saboteur
- Misfortune -> Saboteur

### Enforcer
Source grants:
- Survivor
- Enforcement

Add provenance:
- Survivor -> Enforcer

### Medic
Source grants:
- Advanced Medicine
- Survivor

Add provenance:
- Survivor -> Medic

---

## Scum and Villainy

### Outlaw
The source Talents section grants:
- Outlaw
- Slicer
- Fringer
- Survivor

Add provenance:
- Fringer -> Outlaw
- Slicer -> Outlaw
- Survivor -> Outlaw

### Assassin
The source-defined Assassin access set includes its own Assassin tree plus its published supporting trees, including:
- Misfortune
- Malkite Poisoner
- GenoHaradan

Add provenance:
- Misfortune -> Assassin

The Malkite Poisoner and GenoHaradan access relationships are already represented elsewhere in the canonical registry.

---

# 2. Totals

This closeout adds **23 source-confirmed later class-access grants** to pre-existing trees.

It also rejects one secondary/repository claim:

- Master Privateer -> Spacer

That distinction matters because `referenceClassAccess` is evidence, not authority.

The canonical aggregate must be generated from source-scoped `accessPublications[]`, not by copying the secondary reference map.

---

# 3. Registry rule after closeout

For normal class/prestige trees:

```text
aggregateClassAccess
    = union(accessPublications[].classes)
```

For Force/tradition/droid/special access:

- class access remains separate from special access rules;
- tradition membership is not serialized as a fake class relationship.

No fallback to `referenceClassAccess` is permitted once Phase 1D source provenance is complete.

---

# 4. Stop gate

- [x] Gladiator later grants source-verified.
- [x] Martial Arts Master later grant source-verified.
- [x] Pathfinder later grants source-verified.
- [x] Vanguard later grants source-verified.
- [x] Melee Duelist later grants source-verified.
- [x] Infiltrator later grant source-verified.
- [x] Outlaw later grants source-verified.
- [x] Master Privateer source text checked.
- [x] Master Privateer -> Spacer rejected as noncanonical access.
- [x] Droid Commander later grants source-verified.
- [x] Corporate Agent later grants source-verified.
- [x] Assassin later Misfortune grant reconciled.
- [x] Saboteur later grants source-verified.
- [x] Enforcer later grant source-verified.
- [x] Medic later grant source-verified.
- [x] No production data altered.

# Verdict

The Phase 1D class-access provenance layer is now source-complete.

The registry can safely recompute canonical aggregate class access exclusively from `accessPublications[]`, leaving repository/reference mismatches visible as repair work rather than silently canonizing them.
