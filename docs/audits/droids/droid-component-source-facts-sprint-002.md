# Droid Component Source-Fact Sprint 002 — 8 missing ADD identities

**Audit date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. **Read-only catalog baseline:** `112bbb5e34eb6420a6a7b5ceba77da9249f992be`.  
**Machine evidence:** `data/audits/droids/component-source-facts-sprint-002.json`.

## Source inspection and counts

Visually inspected the *Core Rulebook* printed pp. **193–195** (PDF pages 194–196) and *Scavenger's Guide to Droids* printed pp. **56–58** (PDF pages 57–59). Cross-checked source descriptions and tables, not just TXT/OCR. Eight backlog ADD identities source-reviewed in this sprint, added to four missing-ADD source reviews in Sprint 001 = **12 of 23**, leaving **11 missing ADD identities unreviewed**. Counting all eight previous source-fact sets, **16 total source-fact sets** across both packets. **0 complete mechanical certificates, 0 production writes, 0 parity tests and 0 Foundry runtime certifications.** One explicit published price conflict is retained.

| Canonical printed name | Book / printed pages | Table price | Table weight | Source status |
|---|---|---|---|---|
| Diagnostics Package | Core 193, 194 | 250 | 4 | PDF_VERIFIED |
| Internal Storage | Core 194 | 50/kg | — | PDF_VERIFIED |
| Spring-Loaded Mechanism | Core 194, 195 | 150 | 3 | PDF_VERIFIED |
| Locked Access | Core 194, 195 | 50 | — | PDF_VERIFIED |
| Courier Compartments | SGD 56, 58 | 200 | 2 x cost factor | PDF_VERIFIED |
| Droid Oil Bath | SGD 56, 58 | 500 (disputed) | 600 x cost factor | PDF_VERIFIED_CONFLICT_UNRESOLVED |
| Earphone Binary-to-Basic Translator | SGD 57, 58 | 20 | 0.5 | PDF_VERIFIED |
| Emergency Oxygen Supply | SGD 57, 58 | 200 | 20 | PDF_VERIFIED |

The checked exact names and proposed slugs are **absent from both** `scripts/data/droid-systems.js` and `scripts/data/droid-part-schema.js` at the read-only baseline. The provisional slug values in the JSON are **audit proposals, not production IDs**.

## Mechanically significant source facts

- **Diagnostics Package:** 250 credits, 4 kg; +2 *equipment* on Mechanics checks **to diagnose problems** only (Core pp.193–194), not general repairs.
- **Internal Storage:** 50 credits per kg of **purchased capacity**; max carrying capacity Small 5 kg, Medium 10, Large 20, Huge 50, Gargantuan 500, Colossal 5,000. Tiny or smaller not eligible. Contents must not be silently treated as weightless (Core p.194).
- **Spring-Loaded Mechanism:** 150 credits, 3 kg; Small/Medium/Large may launch stored item **up to 4 kg** within **4 squares** as standard action. Ranged attack vs Reflex 10 for a target square; miss scatters to random adjacent square. A readied catch (person in reach on successful launch) takes DC 10 Dexterity check and is a move action. Huge+ is described as not typically practical, **not an explicit automatic ban** (Core pp.194–195).
- **Locked Access:** 50 credits, **Licensed**, printed dash for weight. Prevents an opponent shutting down a nonhelpless droid until disabled or otherwise helpless (Core pp.194–195). Not permanent immunity to shutdown.
- **Courier Compartments (corrected 2026-11-02):** 200 credits; printed weight cell `2 x cost factor`. The four printed mounting locations are **torso, arm, leg, head**. Torso can conceal an item three sizes smaller; arm **or leg** four sizes smaller; head five sizes smaller. Detection uses Perception vs droid Will +5; a plasma *toaster* doubles compartment price (SGD pp.56,58). The earlier omitted-leg ambiguity was a review error, not a published conflict.
- **Droid Oil Bath:** Bath immersion for 30 minutes can unlock another second wind that day. **CONFLICT:** table price **500** vs prose prices **100/1,000/5,000/10,000** credits by increasing droid size; table weight prints `600 x cost factor` without unit. **Not demonstrated to be installable**: likely external maintenance equipment rather than a part of droid chassis. Do not invent a Garage component (SGD pp.56,58).
- **Earphone Binary-to-Basic Translator:** Table **20 credits**, **0.5 kg**; Basic-output jack translator with listener-worn receiver. Large-headphone version and pricier earbud version; earbud detection Perception DC 20. **No printed price** for earbud variant (SGD pp.57–58).
- **Emergency Oxygen Supply:** 200 credits; table weight prints **20** without unit. Torso tank with oxygen for a Medium creature for **30 minutes**. Connecting vac suit is swift, securing face mask is standard; refilling not specified (SGD pp.57–58).

## Blockers, decisions and ownership

**Publication ambiguity:** Oil Bath conflicting costs, earbud variant price, and omitted weight units are left explicit. **Architecture:** Oil bath should not be copied into installedSystems until published installation authorization exists. Other missing parts need controlled registry and pricing implementation, and specific action/resource/physical installation authority; the PDF does not prove any working current app.

`scripts/data/droid-part-schema.js` stays the live part authority, layered over `scripts/data/droid-systems.js`. PC chargen currently uses the latter directly, so eventual migration must route all four consumers to consistent legal/pricing behavior. `system.installedSystems` remains the post-creation ledger. The separate prerequisite helper in `scripts/domain/droids/droid-part-schema.js` is **not** a new price registry. No changes were made to those files or any actors.

## Validation

Authoring assertions checked eight unique names/IDs, one source conflict, evidence-page +1 mapping, counts 12/23 reviewed and 11 outstanding, with zero promoted runtime certificates. **PASS (source packet structural assertions)**. A reproducible local validator is committed at:

```sh
node tools/audits/droids/verify_component_source_facts_sprint_002.mjs
```

Not executed for this source-only sprint: broad Node test suite, GitHub Actions CI, Foundry runtime, Garage installing/pricing, PC/follower chargen, Store checkout, actor save/load, or combat/action mechanics. Do not count schema validation as integration testing.

## Next source batch

Complete the remaining eleven missing ADD reviews: Holographic Game System, Interference Generator, Remote Viewer, Rental Restraining Bolt, Space-Beacon Launcher, Video Screen, Voice-Print Command Lock, and Droid Battle/Command/Recharge Stations and Droid Socket. Distinguish vehicle/station equipment from installable body components. Follow with seven EDIT families and five repo-only cases; retain miniaturized self-destruct dependency until migration is proven.

### 2026-11-02 PDF correction — Courier Compartments

Printed SGD p.56 states **four** locations: torso, **arm or leg**, head. The earlier three-location reading was incorrect and is superseded by the corrected JSON and bullet above. The substantive source-price conflict remains Droid Oil Bath. This correction makes no production registry change.
