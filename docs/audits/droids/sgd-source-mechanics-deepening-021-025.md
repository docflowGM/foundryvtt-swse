# SWSE Droid Source Mechanics — Deepening Sprint 021–025 (M9)

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Source:** *Scavenger's Guide to Droids*, printed pp.108–117 / PDF pp.109–118. Pages rendered and reviewed before record edits.

## Scope and counts

Second-pass source facts only: **5 models, 20 protocol actions, 11 published optional variants, 13 constraints, 3 heroic routes and 3 newly isolated action-cost contradictions.** No playable abilities, weapon integrations, factory changes or runtime code were created. The 46 SGD source identities remain intact and **0/46 strict mechanical certificates** have been issued.

## SGD-DROID-021 — HK-77 Assassin Droid (pp.108–109)

Protocol: Avoid Surprise, Blaster Surge, Salvo, Support Fire. Main *Blaster Surge* requires a **full-round action**, burns **five additional rifle shots**, and forces a **one-round cooldown for that rifle**. Protocol instead presents a **one-swift action** surge. `SGD-021-BLASTER-SURGE-ACTION-CONFLICT` retains both. Salvo is two separate attacks with the two published rifles, not a free attack without mounts.

**Firefighter** replaces BOTH arm-mounted rifles with extinguishers and cartridges (automatic reload 75 credits per appendage; DC15 Mechanics, 2 hours), with optional 200-credit coating +2 Fortitude checks only against high temperatures. **Gambler's Proxy** removes weapons and tools for hands; data package about 50 credits; optional enhanced sensors see through weak objects within 3m, but after ten rounds risk irreversible burnout at Wisdom DC15, increasing by 3 on each subsequent use round. HK-77 is hero-prohibited.

## SGD-DROID-022 — HKB-3 Hunter-Killer Droid (pp.110–111)

Three protocol actions: rifle, Coordinated Tracking and Simultaneous Fire. Up to four droids tracking same target must each be within 30 squares of at least one other HKB, and share highest Survival check. Simultaneous Fire requires **aid another**, supplies attack bonus from distinct helpers, but applies extra damage **only once**, scaled to margin above target Reflex.

Optional **Jammer** (4,000 credits, DC15 Mechanics + DC15 Use Computer, 6h) requires standard action to activate, move to maintain, spans 12 squares, and contests opposed Use Computer from attempts to communicate or scan. It is detectable and does not disrupt its own remote processor. Hunting sensor ignores cover/concealment for **Perception, not attack**. Factory 5-km remote processor remains separate from optional heroic basic/heuristic replacement. Player route uses stock battle-droid chassis, not printed multi-class grants.

## SGD-DROID-023 — KM1 Mining Droid (pp.112–113)

Four protocol actions: Adaptable Programming, Improvised Fire (laser-cutter 12-square limit), Slammer (persistent condition **only when damage exceeds threshold**), and Stability. Factory mining shield SR10 and environmental Endurance reroll are not full hazard immunity.

**Excavation Droid** exchanges cutters for heavy versions, armor for neutronium (+11 armor), reduces speed to 4, and uses Improved Damage Threshold. **Wall Walker** uses climbing claws and anchoring against dislodging. Both are alternative configurations; factory KM1 is hero-prohibited. Attack/mount rules remain uncertified.

## SGD-DROID-024 — M38 Explorer Droid (pp.114–115)

Four protocol actions: Advanced Sensors, Avoid Surprise, Know Direction and Sensor Sweep. All sensing modes are gated by checks and specific range.

**Engineer** adds tools/diagnostics, exchanges Survival for Mechanics and Skill Focus (Perception) for Mechanics, and makes diagnostics + holorecorder check reroll relevant only to Mechanics. **Navicomputer** replaces holorecorder and 5kg storage with six memory units, installs a scomp appendage and changes skills; its bonus Skill Focus (Use Computer) requires that configuration. **Patrol Droid** swaps hand/tool arrangements for rifle, with required proficiency and skill retraining; glowrod aid bonus is illumination-contextual. Heroic M38 uses stock **probe chassis**, not printed scout 2, and cannot legally take Shake It Off with no Constitution score.

## SGD-DROID-025 — MEV-Series Medical Evacuation Droid (pp.116–117)

Five protocols: Diagnosis, First Aid, Folding Repulsorlift Bed, Quick Load, Revivify. Two new conflicts:

- `SGD-025-FOLDING-BED-ACTION-CONFLICT`: **move action** main text vs **one swift** protocol.
- `SGD-025-QUICK-LOAD-ACTION-CONFLICT`: **move action** main text vs **two swift** protocol.

The bed must be deployed to carry a willing/unconscious Medium-or-smaller passenger; deployed footprint 1×2 squares. First Aid requires adjacent DC15 Treat Injury and has once-per-patient-per-day limit. Revivify requires adjacent target at 0 HP and DC20 Treat Injury.

**High-Speed Booster:** printed alternative improvements (Tech Specialist +1 speed or rocket +2 while deployed), rockets have only ten charges and spend two per round. **Improved Enclosure** gives patient cover but makes bed nonfolding and always 1×2, imposes −5 Quick Load circumstance and doubles medpac space to twelve. **Specialized Processor** converts one move to swift per turn only when droid actually moves at least one square. These are optional builds, not stock grants. Hero creation uses distinct stock medical chassis and class/proficiency choices.

## Verification and limitations

Checked 46 unique IDs; five name/page positions; **20 action IDs, 11 variant IDs, 13 constraint IDs**, all PDF/printed-page cited and source-only; all printed attack rows remain non-executable; no record promoted to mechanical certificate. This is an in-memory claim/identity guard, **not** the original Python Draft 2020-12 schema validator, repository-wide test suite, canonical equipment/feat graph, nor Foundry runtime test. Component-refactor files and production code/compendiums were not changed.

**Manifest:** `data/audits/droids/sgd-source-mechanics-sprint-021-025.json`.

**Next:** SGD 026–030, preserving pre-existing MK-Series degree discrepancy without inventing an arbitration.
