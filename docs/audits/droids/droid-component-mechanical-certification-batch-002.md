> **Errata precedence:** Wizards of the Coast official errata changes Synchronized Fire Circuits to **+5 total** on the qualifying successful Aid Another check, superseding this historical packet's +4 base-book rule and its incorrect claim that existing +5 was a defect. Small-or-smaller accessory weight factors are also corrected by Core p186. The machine packet preserves its original source-review history; `data/audits/droids/droid-component-official-errata-authority-001.json` is authoritative for corrected values.

# Droid Component Mechanical Certification — Batch 002

**2026-11-02** · **25 unique Core Rulebook identities evaluated** · **19 PASS / 6 HOLD**

Source scope: visually rendered Core pp.187–197, including Tables 11-2, 11-3, 11-5 and all relevant descriptive sections. This is **source mechanical certification**, not production behavior testing.

## Certification ledger

The existing Batch 001 certified 25. Batch 002 adds **19** source-mechanically complete cases, bringing the cumulative status to **44/122**, with **78 not certified** (including six HOLDs). No Garage, PC chargen, follower, Store, or Foundry runtime validations have been executed.

| Identity | Source status | Published price authority |
|---|---|---|
| Walking | HOLD | No separate purchase |
| Wheeled | HOLD | No separate purchase |
| Tracked | HOLD | No separate purchase |
| Hovering | HOLD | No separate purchase |
| Flying | HOLD | No separate purchase |
| Stationary | PASS | null credits |
| Hardened Systems x2 | PASS | 1000 × CF |
| Hardened Systems x3 | PASS | 2500 × CF |
| Hardened Systems x4 | PASS | 4000 × CF |
| Hardened Systems x5 | PASS | 6250 × CF |
| Shield Generator, SR 5 | PASS | 2500 × CF |
| Shield Generator, SR 10 | PASS | 5000 × CF |
| Shield Generator, SR 15 | PASS | 7500 × CF |
| Shield Generator, SR 20 | PASS | 10000 × CF |
| Self-Destruct System | HOLD | 20 × maximum explosion damage |
| Basic Processor | PASS | No separate purchase |
| Remote Processor | PASS | 5/50/500/5000 km options |
| Remote Receiver | PASS | -500 credits |
| Backup Processor | PASS | 100 credits |
| Synchronized Fire Circuits | PASS | 150 credits |
| Restraining Bolt | PASS | 5 credits |
| Droid Caller | PASS | 10 credits |
| Diagnostics Package | PASS | 250 credits |
| Secondary Battery | PASS | 400 credits |
| Internal Storage | PASS | 50 credits per kg |

## Six source holds

The five base locomotion systems have all published default speed tables, movement rules and price formula, but the Core does not specify whether its one-tenth Restricted Locomotion discount applies to the separate extra-system surcharge (500/1000/2000/5000 × CF). These combined purchase variants are **HOLD**, not silently adjudicated. The locomotion table also has no weight column: an unlisted weight is not a zero-weight certificate.

Self-Destruct System uses a maximum-damage-derived credit/weight formula, but Tiny and smaller droids explicitly produce no collateral damage, without listed dice. Full all-size purchase certification remains HOLD; a Medium unit's 6d6 gives 720 credits and 3.6 kg.

## High-value source specifications

- **Hardened Systems x2/x3/x4/x5:** Large or larger; Military; source base credits 1,000/2,500/4,000/6,250 ×CF and kilograms 100/250/400/650 ×CF. The multiplier applies to size-based bonus HP and damage threshold. Huge x2 has total size extra HP +40 and threshold +20, not an independent flat equipment modifier.
- **Shields SR5/10/15/20:** Military; base credits 2,500/5,000/7,500/10,000 ×CF and weight 10/20/30/40 ×CF kg; SR10 Small+, SR15 Medium+, SR20 Large+, no distinct SR5 min printed. Damage is reduced by current SR, a qualifying hit reduces it by 5, and three swift actions plus DC20 Endurance restore 5 up to max SR.
- **Remote Processor** is external (ranges 5/50/500/5000km; credits 1k/10k/100k/1m, weights 10/100/1000/10000kg). Remote drone Dex −2. **Remote Receiver** requires no internal processor and reduces *construction cost by 500 credits*; do not provide cash-back store purchases.
- **Backup Processor** costs 100 credits with **no published weight number**, continuing the last orders on link loss. **Synchronized Fire Circuits** costs 150 credits/1kg Military and increases a successful same-controller Aid Another from +2 to **+4 total**; current raw/overlay +5 is a source-to-code defect.
- **Restraining Bolt:** 5cr, printed weight dash; DC10 Mechanics and full-round attach/remove; heuristic self-removal DC20 Charisma then DC15 Mechanics, retry lockout 24 hours on failed Charisma. **Droid Caller:** 10cr/0.2kg, *handheld* (not installed chassis upgrade).
- **Diagnostics Package:** 250cr/4kg and +2 equipment Mechanics only for diagnosis. **Secondary Battery:** 400cr/4kg, 200 hours instead of 100. **Internal Storage:** 50cr per kg of capacity, Small/Medium/Large/Huge/Gargantuan/Colossal maximum 5/10/20/50/500/5000kg; Tiny or smaller prohibited, installed compartment weight unlisted.
- **Stationary** is a no-locomotion chassis condition rather than a standalone free item. **Basic Processor** is a mandatory minimum local processor and has no separately printed purchase price/weight; stock-model PC construction explicitly permits Basic or Heuristic.

## Independent quality status

Machine packet: `data/audits/droids/component-mechanical-certification-batch-002.json`; exact 25 expected behavior fixtures: `data/audits/droids/component-mechanical-certification-batch-002-fixtures.json`; updated ledger: `data/audits/droids/component-mechanical-certification-ledger.json`; reproducible Node validator: `tools/audits/droids/verify_component_mechanical_batch_002.mjs`.

No source ambiguity has been turned into a guessed price. Every PASS record includes source pages, price/weight authority (or explicit non-sale/omission), legal host, installation, actions/resources and effects. Runtime pricing differences are recorded as **production blockers**, not failed source citations. No production code, compendiums, stock droids, actor instances, or Store data changed.
