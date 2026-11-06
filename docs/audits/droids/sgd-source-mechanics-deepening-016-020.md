# SWSE Droid Source Mechanics — Deepening Sprint 016–020 (M8)

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Source:** *Scavenger's Guide to Droids*, printed pp.98–107 (PDF pages 99–108). Ten complete source pages visually inspected.

## Result and authority boundary

Five SGD droid source identities were deepened, not replaced. **10 nonfactory configuration variants**, **21 protocol actions**, **10 model-specific constraints**, **4 distinct heroic-construction route notes** and **2 unresolved source contradictions** have new evidence-bearing, source-only claims. No runtime abilities, automatic feats, weapon-mount permissions, factory equipment or executable vehicle actions were created.

The book still has **46/46 structurally hydrated records and 0/46 strictly source-mechanically certified**. The 14-book publication census remains **234 identities, 0 certified**.

## SGD-DROID-016 — G2 Repair Droid (pp.98–99)

The printed *Patch Job* narrative replaces a normal full-round repair with a **standard action**, while the protocol lists **one swift action once per turn** and temporary restoration equal to its Mechanics check result. Captured as `SGD-016-PATCH-JOB-ACTION-CONFLICT`, **unresolved**.

Four protocol actions: Patch Job; Recharge Shields (two swift, Mechanics check, restore five SR, no printed DC); Regulate Power (two swift, Mechanics check, one vehicle condition step, no printed DC); Run Diagnostics (two swift; successful diagnosis grants owner +2 circumstance on repair).

Three **optional** configurations: Copilot (new tool appendage/scomp link and retrained Pilot/Skill Focus); Explosives Detector (hardened x3, +30 HP, +15 threshold, two extra tools and 5kg storage); Scavenger (replace legs with repulsorlift, additional sensors, Survival retraining and external storage or 25kg affixed cargo shell). Each retains printed DCs, costs where actually stated, required time and conditional exchanges.

Hero creation instead uses stock mechanic chassis, patch job in place of ordinary chassis equipment, and separately purchased tool kit. No factory free piloting, flight or extra equipment was inferred.

## SGD-DROID-017 — GD16-Series Pilot Droid (pp.100–101)

Five protocol actions: Copilot; Recharge Shields (DC20); Regulate Power (DC20); Sensor Crown (single target through encounter); and Vehicle Link.

The main *Vehicle Link* paragraph describes **standard-action** establishment and routine command, while the protocol gives **one swift action once per turn** for routine commands. New `SGD-017-VEHICLE-LINK-ACTION-CONFLICT` is unresolved. Its friendly-computer requirement remains a hard restriction. *Simultaneous Operation* is **twice per encounter**, and its extra swift is **vehicle-specific**, not a generic third action.

Two optional variants: Advanced Espionage (Stealth training plus Camouflage talent) and Precision Flight (Pilot training, Skill Focus, DC25 Mechanics for 20,000-credit sensor upgrade over three days, DC30 Use Computer for algorithms). Taking 20 is confined to printed precision flight/docking and collision reactions.

The playable chassis is a distinct stock battle droid path, not automatic ownership of published scout 3/soldier 2 levels.

## SGD-DROID-018 — GX1-Series Battle Droid (pp.102–103)

Four protocol actions: normal rifle and Rapid Shot alternative, Repositioning Routings on an eligible ally falling to 0 HP, and once-turn Retrieve Item. Four hands do not imply four attacks.

Two optional variants: Armored Courier (replaces internal glowrod with tight-beam transmitter, optional encryption and erase-memory hardware) and Airdrop Droid (remove standard battle armor, construct airdrop armor shell, 4,500 credits, 24 hours, DC25 Mechanics). The book explicitly says this **does not grant flying speed**. Factory model remains hero-prohibited.

## SGD-DROID-019 — GY-I Information Analysis Droid (pp.104–105)

Three protocol actions: Analyze Data (+2 Gather Information aid), Diagnosis (free Knowledge [life sciences] check with +5), Expert Opinion (one swift Knowledge check).

Two optional variants: Astromech conversion (DC25 Use Computer reprogram, DC30 Mechanics physical removal and slot installation, DC15 Mechanics full-round hyperdrive attachment; stored jumps equal Intelligence score), and Financial Wizard (replace processor with fourth-degree battle processor using Mechanics versus current Will). The latter modifies only an owner's existing **Wealth talent** level-up calculation, requires involvement in finances, and **cannot stack multiple such droids**. The optional Knowledge (bureaucracy) street-value check is also source-recorded.

## SGD-DROID-020 — H-1ME Battle Mechanic Droid (pp.106–107)

Five protocol actions: Identify Technology, Mechanical Assistance, Pickpocket (Stealth vs Perception), Recharge Shields and Regulate Power. Preventive Maintenance heals the *vehicle*, **Challenge Level HP per eight hours**, only to its normal maximum, and may occur in hyperspace.

The optional Missile Droid configuration has three separate checks with construction and reprogramming gates: DC11 Use Computer (1 hour), DC25 Mechanics housing (1 hour), DC25 Mechanics missile loading (1 hour); H-1ME cannot do or assist with the third. Failures cost persistent condition steps until the printed repair check; the pilot has a swift-action deactivation option if the missile is off course. This is **not an innate missile attack or extra locomotion mode**.

## Validation and nonclaims

- Confirmed exact SGD identity/name/printed-page key for each of 016–020 and preserved all 46 identities.
- Confirmed 21 unique protocol actions, 10 unique optional variants, 10 constraints, 4 heroic route notes, 2 unresolved conflicts; every new claim has an SGD printed-page/PDF-page source and `executionStatus: source-only`.
- Asserted all 46 mechanical statuses remain non-certified and all published attack rows remain `source-only`.
- **Not run:** full Python Draft202012 schema validator, repository tests, cross-domain canonical rules/mount graph, Foundry V13 runtime. Structural in-memory guards are not a substitute for these tests.
- **No mutation:** production compendiums, scripts, item registry, Store, Garage, chargen or other audit workstreams.

**Machine manifest:** `data/audits/droids/sgd-source-mechanics-sprint-016-020.json`.

**Next:** SGD-DROID-021–025 second source pass and eventual canonical trait/feat/talent/equipment reconciliation. No certification promotion until proven.
