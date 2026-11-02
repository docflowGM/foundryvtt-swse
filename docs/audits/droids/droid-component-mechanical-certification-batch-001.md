# SWSE Droid Component — Full Source-Mechanical Certification, Batch 001

**Date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. **Authority:** Core Rulebook and *Scavenger's Guide to Droids*, printed PDF pages individually rendered and inspected. **Scope: 25 distinct frozen canonical identities.**

## Certification level

**25/25 PASS — complete published-source mechanical specification.** This is the *source-mechanical* tier, not a declaration that live Garage, PC chargen, follower, Store or Foundry correctly implements those rules. All 25 have established source identity, printed price/weight or formula, legal availability, physical host, relevant installation check/time, conditional effects, actions/resources and exceptions (including express source non-statements where applicable). Every field belongs in `data/audits/droids/component-mechanical-certification-batch-001.json`.

**Cumulative two-book baseline:** 25 source-mechanically certified out of 122; 97 still awaiting strict certification. Production catalog certifications **0**, cross-application parity **0**, Foundry runtime certifications **0**.

## Source authority and shared rules

- **Droid cost factors (Core p187 Table 11-2):** Fine 20, Diminutive 10, Tiny 5, Small 2, Medium 1, Large 2, Huge 5, Gargantuan 10, Colossal 20.
- **Modification checks (Core p197):** appendages DC20 Mechanics/1 hour; accessories DC15 Mechanics/1 hour; primary processors DC20 Use Computer **and** DC20 Mechanics/1 day. Self-install/replacement on locomotion, appendage or accessory carries -5 Mechanics; no self processor replacement.
- **Droid armor (Core pp193,196; SGD p54):** integrated armor does not stack its Reflex armor bonus with worn armor; light/medium/heavy ACP -2/-5/-10 applies to unproficient attack rolls plus Acrobatics, Climb, Endurance, Initiative, Jump, Stealth and Swim; proficiency negates; base movement speed unchanged; heavy run x3; max Dexterity bonuses apply. Rare armor black-market listing is **usually** double, a contextual market rule, not an unconditional source base-price change.
- **Appendages (Core pp189-190,194):** all five have complete nine-size unarmed damage tables; strength modifier added. Multiple appendages confer no additional actions or attacks. Source cost and mass multiply by canonical cost factor.
- **Sensors (Core pp195–197):** Improved Sensor Package +2 equipment Perception plus low-light that ignores darkness concealment except total; Darkvision ignores darkness concealment including total. Neither bypasses unrelated concealment.

## Certified identities

| # | Component | Published base credits | Published base kg | Specific condition/benefit |
|---:|---|---:|---:|---|
| 1 | Plasteel Shell | 400 × CF | 2 × CF | Ref +2; max Dex +5; light |
| 2 | Quadanium Shell | 900 × CF | 3 × CF | Ref +3; max Dex +4; light |
| 3 | Durasteel Shell | 1600 × CF | 8 × CF | Ref +4; max Dex +4; light |
| 4 | Quadanium Plating | 2500 × CF | 10 × CF | Ref +5; max Dex +3; light |
| 5 | Durasteel Plating | 3600 × CF | 12 × CF | Ref +6; max Dex +3; light |
| 6 | Quadanium Battle Armor | 4900 × CF | 7 × CF | Ref +7; max Dex +3; medium |
| 7 | Duranium Plating | 6400 × CF | 16 × CF | Ref +8; max Dex +2; medium |
| 8 | Durasteel Battle Armor | 9600 × CF | 8 × CF | Ref +8; max Dex +3; medium |
| 9 | Mandalorian Steel Shell | 8100 × CF | 9 × CF | Ref +9; max Dex +3; heavy |
| 10 | Duranium Battle Armor | 10000 × CF | 10 × CF | Ref +10; max Dex +2; heavy |
| 11 | Neutronium Plating | 12100 × CF | 20 × CF | Ref +11; max Dex +1; heavy |
| 12 | Duravlex Shell | 1000 × CF | 10 × CF | Ref +4; max Dex +3; light |
| 13 | Crystadurium Plating | 50000 × CF | 30 × CF | Ref +10; max Dex +2; heavy |
| 14 | Probe | 2 × CF | 0.5 × CF | Nine-size damage table; no bonus extra attacks |
| 15 | Instrument | 5 × CF | 1 × CF | Nine-size damage table; no bonus extra attacks |
| 16 | Tool | 10 × CF | 2 × CF | Nine-size damage table; no bonus extra attacks |
| 17 | Claw | 20 × CF | 5 × CF | Nine-size damage table; no bonus extra attacks |
| 18 | Hand | 50 × CF | 5 × CF | Nine-size damage table; no bonus extra attacks |
| 19 | Improved Sensor Package | 200 | 2.5 | LOW_LIGHT |
| 20 | Darkvision | 150 | 1.5 | DARKVISION |
| 21 | Internal Comlink | 250 | 0.1 | Integrated standard comlink |
| 22 | Vocabulator | 50 | 0.5 | Factory inclusion for non-Binary speech |
| 23 | Heuristic Processor | 2000 | 5 | Normal untrained skill rules; nonproficiency -5 |
| 24 | Credit Reader | 50 | 1 | Scoped +5 Perception; free count |
| 25 | Remote Starship Starter | 50 | 2 | Preflight only, not piloting |

*CF = published droid size cost factor, not the current defective Garage factor.*

## High-impact runtime gaps, not source-certificate failures

1. **Size cost factor:** shared current Garage helper disagrees on seven of nine sizes. This is an unresolved production blocker affecting all factor-based items in this batch.
2. **Probe, Instrument, Tool:** printed unarmed damage table permits attacks for certain sizes, but raw catalog disables attack flags. Full printed attack matrices are in the packet.
3. **Credit Reader:** published **50 credits, 1 kg, Licensed**; current overlay-only registry can return zero in a default quote path. No completed Store purchase has been tested.
4. **Built-in armor:** stacking, proficiency ACP on attacks and skills, max Dex, heavy run, Crystadurium's **1 blaster damage per die** and Duravlex's **+10 equipment Fortitude vs fire/heat** require runtime tests.
5. **Internal Comlink:** core p134 standard short range 50km/low orbit. Long-range, video, holographic and encryption are *separately priced standard comlink options*, not free with integrated 250-credit basic version.
6. **Vocabulator:** factory standard when designed to speak non-Binary; avoid duplicate charge.
7. **Remote Starship Starter:** signal preflight, free diagnostic return; does **not** pilot, attack or launch ship systems remotely.

## Validation, signatures and next group

Machine certificate: `data/audits/droids/component-mechanical-certification-batch-001.json`  
Ledger: `data/audits/droids/component-mechanical-certification-ledger.json`  
Validator: `tools/audits/droids/verify_component_mechanical_batch_001.mjs`

Authoring-time assertions checked 25 unique IDs directly against frozen 122 ledger, formula and size tables, armor classes, appendage matrices, page mapping and source-certified flags. The validator is committed as a reproducible Node command; no Foundry, application or broad CI checks were run.

Next batch: 25 **different** frozen identities, preferentially shield generators, hardening, self-destruct, locomotion, control and action-resource systems. If any cannot reach full mechanical completeness, mark **HOLD** with source blockers rather than falsely certifying it. Production changes require separate authorization.
