# SWSE Species/Races — Health Audit Phase 0

**Date:** 2026-10-12  
**Branch:** `audit/species-health-phase-0`  
**Baseline:** `main` at `3e02e822624e832ce43447c03b5d403be4d9ae14`  
**Machine census:** `data/audits/species-health-phase-0-census.json`  
**Scope:** Read-only structural + consumer-path inspection; selected Core/Clone Wars published-source probes. **Not full sourcebook certification; not live Foundry execution.**

## Health verdict

**Data structure: STRONG. Rule-consumer consistency: AT RISK. Source provenance: PARTIAL.**

Species does **not** need a wholesale rewrite. The current registry and species materialization architecture should be preserved. Unlike classes, however, the live species trait sidecars must be audited because they can introduce mechanical effects that disagree with the canonical species pack.

| Measure | Current result |
|---|---:|
| Unique species records in `packs/species.db` | **161/161** |
| `species-traits.json` entries | **161** |
| `species-traits-migrated.json` entries | **161** |
| Existing canonical stats reference | **131** |
| Canonical descriptions reference | **131** |
| Complete finite 6-attribute maps | **161/161** |
| Size / ability parity with reference for 131 matched entries | **131/131** |
| Structured pack canonical traits | **424** across corpus |
| Species without pack `canonicalTraits` | **30** |
| Species without a player description | **31** |
| Species lacking explicit source metadata | **58** |
| Species with pack vs sidecar canonical-trait membership differences | **25** |
| Species with defined variant profiles | **15** |
| Explicit special ability-choice species | **2** |
| Primitive / class-grant suppression marked | **15** |
| Species using droid-builder/acts-as-droid | **2** |
| Species with natural weapon definitions | **6** |
| Total structured rules on migrated sidecar traits | **126** |

**Important interpretation:** 25 membership differences are not 25 confirmed data defects. Many result from supplemental species with legacy sidecar trait records and empty pack `canonicalTraits`. Those need rule-by-rule reconciliation. The number measures representation differences, **not** an error count.

**Old documentation is stale:** Prior reports mention 161, 162 or 163 species at different historical checkpoints. Current `main` has **161**, and both sidecars also have **161**.

## Proven live data architecture

```text
packs/species.db
    -> SpeciesRegistry (enumeration)
    -> species-step / build-pending-species-context
    -> SpeciesGrantLedgerBuilder
       + data/species-traits-migrated.json supplementary trait/rule objects
    -> applyCanonicalSpeciesToActor
    -> derived combat / skills / actor resources

Parallel passive route:
data/species-traits.json
    -> SpeciesTraitPassiveAdapter.registerFromActor
    -> RuleCollector / PassiveAdapter
    -> derived passive modifiers
```

`tools/sync-species-sidecars-from-pack.mjs` preserves existing `structuralTraits` when nonempty. Regenerating the sidecar from the pack is **not enough** to remove stale executable mechanics. It copies the existing sidecar semantics forward. Do not blindly regenerate and assume parity.

## Highest-priority findings

### SP-001 — Twi'lek: contradictory passive trait rules (HIGH, source-verified)

The Core Rulebook Twi'lek species traits (printed p.32) and the **pack** agree: `Deceptive` reroll, `Great Fortitude` granting **+2 species to Fortitude**, and `Low-Light Vision`.

`data/species-traits.json`, however, carries `Graceful` (+2 Reflex) and `Persuasion Training` (+5 Persuasion) under `structuralTraits`. `SpeciesTraitPassiveAdapter` considers structural **and** canonical traits, and parses defense/skill bonus text into passive modifiers. This is a concrete source-incompatible consumer-data declaration. No live actor was run, so duplicate/extra application is a *runtime risk* rather than observed live damage.

**Surgical target:** sidecar trait declarations, corresponding migrated rules, and passive/ledger regression tests. Do not change canonical Twi'lek race stats to match the obsolete sidecar.

### SP-002 — Wookiee: extra sidecar Fortitude bonus (HIGH, source-verified)

Core Rulebook printed p.32 Wookiee species traits include ability modifiers, recuperation, Rage, weapon familiarity, climbing and intimidation abilities. No independent +2 species Fortitude Defense is printed. But sidecar `structuralTraits` includes `Endurance: A Wookiee gains a +2 species bonus to Fortitude Defense`, eligible for `SpeciesTraitPassiveAdapter` processing.

The Wookiee pack ability modifiers are **+4 STR / +2 CON / -2 DEX / -2 WIS / -2 CHA**, as expected. There is no pack-vs-reference ability mismatch here.

**Surgical target:** identify source for any later-book grant before removing; if not sourced, correct sidecars and test effect registration. Separately verify the natural `Claws` weapon item, which may intersect cultural prohibition and/or supplements.

### SP-003 — Republic Clone: +2 choice vs two +1 UI metadata (MEDIUM)

The Clone Wars Campaign Guide Republic Clone traits specify fixed scores **STR 15, DEX 13, CON 10, INT 12, WIS 10, CHA 8**, then **one chosen ability +2**.

The current pack holds `bonusValue:2` and that source description, and `build-pending-species-context.js` computes `selectedAbility +2`. But the same choice schema advertises `allocationMode:'level-4-two-abilities'`, `maxPerAbility:1`, and helper text instructing **two +1** increases.

**Classification:** confirmed internal metadata/help-text conflict, not a proven misapplied final ability score. Verify the actual species UI, preview, and finalized actor before deciding whether a data-only change is enough.

### SP-004 — Supplemental provenance gap (MEDIUM)

Thirty species in the pack are not represented in `data/species-canonical-stats.json` or the parallel `data/species-canonical-descriptions.json`. Prior species audit documentation explicitly preserved them as supplemental. The 131 reference entries came from an earlier consolidated canonical text, **not a complete book/page claim-by-claim audit**.

Do not call these 30 noncanonical merely because they are absent from the earlier reference. Book/page verification is required before identity deletions, missing-trait backfills or modified stats.

### SP-005 — Parallel semantic authorities (MEDIUM)

`SpeciesGrantLedgerBuilder` ingests supplemental `structuralTraits`/`conditionalTraits`/`activatedAbilities` and appends pack `canonicalTraits` with ID/name deduplication. Separately, `SpeciesTraitPassiveAdapter` consumes `species-traits.json` pseudo passives. The consumer design **can** preserve legacy traits but lacks a fully certified source precedence at the domain level. Need a deterministic rule authority and no-double-grant tests, rather than wholesale data or pipeline replacement.

### SP-006 — Source locators absent (MEDIUM)

**58** species have no `system.source` value. The 131-member reference retains `sourceLine` values from a compiled text, which are **not printed book pages**. Add verified per-book provenance only after a source-specific pass.

### SP-007 — Description coverage (LOW)

**31** species have no visible description. Keep these separate from mechanical blockers.

### SP-008 — Natural-weapon provenance and runtime (MEDIUM)

Six species declare natural weapons: **Barabel, Cathar, Noghri, Togorian, Trandoshan, Wookiee**. Verify source and materialization; do not infer legality from the descriptive Wookiee taboo alone.

### SP-009 — Existing intentionally deferred abilities (MEDIUM)

Earlier implementation documentation explicitly defers complete target application for **Ithorian Bellow**, reaction-window auto-prompting for **Clawdite Startle**, and persistent expiry handling for **Aleena Energy Surge**, among other mechanics. These are known execution gaps, not evidence that the species records are bad. `Shard` and `Replica Droid` need constrained droid-builder smoke checks. Primitive-grant suppression and variant overlay should be tested with representative builds.

## Scope and method limitations

- Static comparison of live `main`, not of old branches.
- Existing compiled canonical stats source provides structural parity, **not independent published proof** for every one of its 131 records.
- Core PDF p.32 was rendered to inspect Twi'lek and Wookiee printed mechanics; Core and Clone Wars searchable text transcriptions were used for verification.
- **No Foundry runtime check or full rolling suite executed.**
- **No production species data changed.**
- A species having a trait defined, or an executor wired, does not prove that the trait is being applied once and at the correct timing.

## Small correction batches recommended

1. **Species patch 001 — Twi'lek + Wookiee passive collision.** Source-proven trait mechanics first; explicit actor-derived before/after tests. Limit edits to appropriate sidecar/consumer and targeted tests. Check book expansions prior to deleting Wookiee sidecar rule.
2. **Species patch 002 — Republic Clone chooser/UI metadata.** Keep one selected +2; validate displayed and committed attribute scores and avoid the level-4 allocation proxy.
3. **Species 1A — Sidecar rule parity census.** Iterate all 161 species; source-check *mechanical* trait meanings, classify high-risk extras, do not assume 25 membership differences are errors.
4. **Species 1B — Supplemental 30 provenance.** Verify by sourcebook; resolve missing descriptions and book/page metadata gradually.
5. **Species 1C — Runtime probes.** Human, Twi'lek, Wookiee, Republic Clone, a variant species, primitive, Shard/Replica Droid, Ithorian, natural weapons. Verify applied exactly once, no accidental legacy/sidecar injection.
6. **Only then** evaluate if any broader architecture reconciliation is needed. No replacement of `SpeciesRegistry`, `SpeciesGrantLedgerBuilder`, CharGen or the v2 progression system is warranted based on this census alone.

**Bottom line:** The species catalog is complete relative to its current 131-member reference, with good ability/size stability. Unlike the class domain, there are verified *rule-semantic conflicts* between canonical species traits and separate executable trait-sidecar definitions. Surgical repairs are feasible, but first reconcile which trait authority is live.
