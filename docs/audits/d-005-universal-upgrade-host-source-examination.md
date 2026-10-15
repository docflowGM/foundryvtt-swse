# D-005 — Universal-upgrade host prerequisites: printed-page source examination

**Status: RESEARCH_EVIDENCE_ONLY / NO LIFT.** Independent audit, 2026-10-15. **No** modification of the immutable v1.5 registry, status ledger, specification records, generator, Phase 1a, runtime code, implementation flags, rules register, owner decisions, or game behavior.

## 1. Source authority and audited scope

The Project Owner-supplied *Star Wars Saga Edition: Scum and Villainy* PDF was inspected visually at printed **pp. 40–42**, which contain Table 2-3 **Universal Upgrades** and the surrounding printed definitions. Uploaded PDF SHA-256: `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`. For reproducibility, high-resolution visual page raster SHA-256s: p.40 `f249247300b2cf8f2f2fb08329acf60d48af209b3de58b8fd6a5f7c7cdb109eb`; p.41 `c4d99643c4c6fdd34084d479fd4cc4aaaf015522ec880bc91a06289d5d8f0141`; p.42 `1598fffa2c442a608cd9b29970facc7e05dd21bb076633d56fd976029fecadd3`. These hashes attest to the PDFs/renders actually read, not a separate authenticated errata.

**Pinned baseline:** `main` commit `6ecbed3efcb020ce2b23963c2f207014ca32cfad`, ledger `D-005`, component `hostPrerequisites`. **35** typed domain IDs across **15** canonical parent definitions: weapon **11**, armor **9**, equipment **15**. The full 35-ID audit membership is printed in §3; it is drawn from the **status ledger itself**, not invented domain eligibility.

**Excluded distinction:** Table 2-3 prints **Droidification**, but it is `sv-droidification` excluded from equipment-modifications scope with **zero typed domains**. Do not treat it as a 36th blocked ID or use it to permit droid/vehicle modification.

**Source meaning:** The universal-upgrades introduction says these can apply to a wide range of gear, but **most modifications have limitations**; some have armor/weapon-specific rules. A row in the table or a domain ID in the registry is not evidence of an **unconditionally legal individual host**. This report reads each printed host restriction and separates that fact from a future executable host evaluator.

## 2. Printed source host predicates (one row per canonical parent)

| Parent definition | Printed page | Source-supported host restriction / effect distinction | Required evidence for a future host verdict (engineering interpretation) |
|---|---|---|---|
| `sv-cheater` | 40 | Cheater is a hand-held device disguised as an accessory to ordinary working equipment for cheating at sabacc. | Host must be an appropriate small/hand-held equipment context capable of housing the cheater; no automatic eligibility for arbitrary gear. |
| `sv-cloaked` | 40 | Cloaking muffles noise and disguises energy signature and appearance; printed text specifically discusses weapons and armor. Cloaked armor does not aid Stealth but does affect Deception to appear ordinary. | Host must be a discrete piece of equipment whose own emissions/appearance can be cloaked, with domain-specific printed effects. |
| `sv-dual-gear` | 41 | One piece of equipment is built into another; the embedded piece cannot exceed the primary's size; the two pieces normally cannot act simultaneously. Embedded item has separate full acquisition price. | Must identify TWO distinct owned compatible equipment pieces, sizes and current containment/dual-gear state; do not accept arbitrary blank host. |
| `sv-electrograpple-handle` | 41 | Magnetized grappling-handle segment lets wearer retrieve a carried device and can be used in escaping a restraint; example describes a weapon pretending to be discarded. | Host must physically support an added grippable handle and retrieval behavior; client-selected domain alone does not prove fit. |
| `sv-environmental-sealing` | 41 | Protective coatings, gaskets and sealants prevent ordinary environmental failures to the EQUIPMENT; not damage protection from fire weapons, corrosive attacks or the wearer's environment. | Host must have a meaningful environmental-sealing subject (a piece of equipment); user/wearer protection does not follow. |
| `sv-extra-power-source` | 41 | Any equipment that runs on energy cells or power packs may be modified to have two such power sources; recharges at normal cost. | Require verified energy-cell or power-pack powered host and ability to carry an added source; a generic `poweredArmor` flag alone is not proof of energy cell/power pack. |
| `sv-memory-upgrade` | 41 | Device must have an Intelligence score, such as a computer; ordinary upgrade improves Intelligence and memory; the book explicitly excludes droids including droidified equipment. | Require source-trusted Int-bearing DEVICE identity that is not a droid/droidified host. |
| `sv-memory-upgrade-advanced` | 41 | Advanced tier increases Intelligence and storage and REPLACES the standard memory-upgrade benefit. | Require same Int-bearing nondroid device host and reject simultaneous base+advanced benefit stacking; model replacement of base effect. |
| `sv-miniaturized` | 41 | Equipment weighs half as much and becomes one physical size smaller; melee weapons reduce damage die by one step due to loss of mass/contact surface. | Require equipment with source-confirmed size/weight and any weapon-specific damage-die facts needed; `::armor` membership alone does not settle armor size interaction. |
| `sv-recognition-system` | 41 | Owner recognition means item will not function for another operator; programming takes one minute and DC 30 Use Computer; examples include preventing weapon activation and activation passphrase. | Require a functioning controllable item with meaningful recognized owner/operator, and a trusted programming/ownership condition. |
| `sv-remote-activation` | 41 | Can activate equipment using a code from commlink; examples explosives, holoprojectors, computer programs, droids, and remote gear; any commlink can be used if right frequency/code discovered. | Require host with actual activatable function and approved remote-control pathway; don't assign arbitrary remote actions to inert gear. |
| `sv-secret-compartment` | 41–42 | Equipment can conceal a separate smaller piece of gear. Contents must be one size smaller than the HOST's actual size, not the Equipment Sizes page's game shorthand. | Require known physical host actual size, concealed-content size and capacity, and present content or valid empty compartment. |
| `sv-silverplate` | 42 | Surface process applies to any piece of gear and grants +2 DR capped at 20 to the ITEM; armor silverplate explicitly does not grant wearer's DR; has separate protection against targeted armor attacks. | Require material gear with a surface suitable for coating; item DR effect must target the owned ITEM only. |
| `sv-spring-loaded` | 42 | A one-hand-held item can be spring loaded to be readied by a switch; printed examples include pistols, grenades and datapads. | Require an item usable/held in one hand, and a suitable quick-ready or hidden stowage configuration. |
| `sv-storage-capacity` | 42 | Gear can visibly carry other smaller gear within or on it; maximum host carrying depends on size/weight as printed; distinct from hidden Secret Compartment. | Require geometry/weight/size storage facts sufficient to carry smaller items, not just membership in weapon, armor or equipment domains. |

The future evaluator would also need the separately noted special handling: `sv-cheater`: Eligible host facts and whether this is a separate attached device versus upgrade need consumer design. `sv-cloaked`: Armor benefit is NOT a blanket Stealth bonus; weapon use imposes a printed use-time check penalty. `sv-dual-gear`: Separate power sources for powered dual items is a purported erratum, not authenticated in this review. `sv-electrograpple-handle`: Do not infer all armor/containers are eligible; only weapon/equipment typed domains in ledger. `sv-environmental-sealing`: Avoid treating this as armor environmental protection for the wearer. `sv-extra-power-source`: Multiple upgrades repeatable per source; ensure no unsupported multiplication of base shots. `sv-memory-upgrade`: Do not apply to all generic electronics, any living character or droids. `sv-memory-upgrade-advanced`: Tier relationship requires certified state transformation, not additive bonuses. `sv-miniaturized`: Rule does not authorize shrinking beyond rules-defined sizes or ignoring explicit melee damage loss. `sv-recognition-system`: Not a blanket armor Reflex/defense bonus; programming is a separate published use. `sv-remote-activation`: Mention of remotely activating a droid does not make droid mods part of V2. `sv-secret-compartment`: Avoid a generic inventory-capacity or backpack effect unrelated to concealment. `sv-silverplate`: Published Quick Draw sentence is a candidate erratum to move to Spring Loaded; don't certify it here. `sv-spring-loaded`: Erratum possibly moves Quick Draw clause from Silverplate into this section. Do not assert this effect without authenticated errata. `sv-storage-capacity`: No extra modification slots are granted; storage is physical item capacity, not upgrade slots.

## 3. Complete typed-domain scope: 35 exact IDs

**Interpretation column `CONDITIONAL_SOURCE_PREDICATE` means the book provides a restriction or example, not that any proposed host is legal.** None of these entries is production `SOURCE_VERIFIED` or `MECHANIC_SPECIFIED` merely because of this report. The G3 host evaluator framework still has no certified evaluators.

| Typed definition ID | Printed pages | Source/host decision needed | Component disposition |
|---|---|---|---|
| `sv-cheater::equipment` | 40 | Host must be an appropriate small/hand-held equipment context capable of housing the cheater; no automatic eligibility for arbitrary gear. | `D-005 OPEN / NO-LIFT` |
| `sv-cloaked::weapon` | 40 | Host must be a discrete piece of equipment whose own emissions/appearance can be cloaked, with domain-specific printed effects. | `D-005 OPEN / NO-LIFT` |
| `sv-cloaked::armor` | 40 | Host must be a discrete piece of equipment whose own emissions/appearance can be cloaked, with domain-specific printed effects. | `D-005 OPEN / NO-LIFT` |
| `sv-cloaked::equipment` | 40 | Host must be a discrete piece of equipment whose own emissions/appearance can be cloaked, with domain-specific printed effects. | `D-005 OPEN / NO-LIFT` |
| `sv-dual-gear::equipment` | 41 | Must identify TWO distinct owned compatible equipment pieces, sizes and current containment/dual-gear state; do not accept arbitrary blank host. | `D-005 OPEN / NO-LIFT` |
| `sv-electrograpple-handle::weapon` | 41 | Host must physically support an added grippable handle and retrieval behavior; client-selected domain alone does not prove fit. | `D-005 OPEN / NO-LIFT` |
| `sv-electrograpple-handle::equipment` | 41 | Host must physically support an added grippable handle and retrieval behavior; client-selected domain alone does not prove fit. | `D-005 OPEN / NO-LIFT` |
| `sv-environmental-sealing::weapon` | 41 | Host must have a meaningful environmental-sealing subject (a piece of equipment); user/wearer protection does not follow. | `D-005 OPEN / NO-LIFT` |
| `sv-environmental-sealing::armor` | 41 | Host must have a meaningful environmental-sealing subject (a piece of equipment); user/wearer protection does not follow. | `D-005 OPEN / NO-LIFT` |
| `sv-environmental-sealing::equipment` | 41 | Host must have a meaningful environmental-sealing subject (a piece of equipment); user/wearer protection does not follow. | `D-005 OPEN / NO-LIFT` |
| `sv-extra-power-source::weapon` | 41 | Require verified energy-cell or power-pack powered host and ability to carry an added source; a generic `poweredArmor` flag alone is not proof of energy cell/power pack. | `D-005 OPEN / NO-LIFT` |
| `sv-extra-power-source::armor` | 41 | Require verified energy-cell or power-pack powered host and ability to carry an added source; a generic `poweredArmor` flag alone is not proof of energy cell/power pack. | `D-005 OPEN / NO-LIFT` |
| `sv-extra-power-source::equipment` | 41 | Require verified energy-cell or power-pack powered host and ability to carry an added source; a generic `poweredArmor` flag alone is not proof of energy cell/power pack. | `D-005 OPEN / NO-LIFT` |
| `sv-memory-upgrade::equipment` | 41 | Require source-trusted Int-bearing DEVICE identity that is not a droid/droidified host. | `D-005 OPEN / NO-LIFT` |
| `sv-memory-upgrade-advanced::equipment` | 41 | Require same Int-bearing nondroid device host and reject simultaneous base+advanced benefit stacking; model replacement of base effect. | `D-005 OPEN / NO-LIFT` |
| `sv-miniaturized::weapon` | 41 | Require equipment with source-confirmed size/weight and any weapon-specific damage-die facts needed; `::armor` membership alone does not settle armor size interaction. | `D-005 OPEN / NO-LIFT` |
| `sv-miniaturized::armor` | 41 | Require equipment with source-confirmed size/weight and any weapon-specific damage-die facts needed; `::armor` membership alone does not settle armor size interaction. | `D-005 OPEN / NO-LIFT` |
| `sv-miniaturized::equipment` | 41 | Require equipment with source-confirmed size/weight and any weapon-specific damage-die facts needed; `::armor` membership alone does not settle armor size interaction. | `D-005 OPEN / NO-LIFT` |
| `sv-recognition-system::weapon` | 41 | Require a functioning controllable item with meaningful recognized owner/operator, and a trusted programming/ownership condition. | `D-005 OPEN / NO-LIFT` |
| `sv-recognition-system::armor` | 41 | Require a functioning controllable item with meaningful recognized owner/operator, and a trusted programming/ownership condition. | `D-005 OPEN / NO-LIFT` |
| `sv-recognition-system::equipment` | 41 | Require a functioning controllable item with meaningful recognized owner/operator, and a trusted programming/ownership condition. | `D-005 OPEN / NO-LIFT` |
| `sv-remote-activation::weapon` | 41 | Require host with actual activatable function and approved remote-control pathway; don't assign arbitrary remote actions to inert gear. | `D-005 OPEN / NO-LIFT` |
| `sv-remote-activation::armor` | 41 | Require host with actual activatable function and approved remote-control pathway; don't assign arbitrary remote actions to inert gear. | `D-005 OPEN / NO-LIFT` |
| `sv-remote-activation::equipment` | 41 | Require host with actual activatable function and approved remote-control pathway; don't assign arbitrary remote actions to inert gear. | `D-005 OPEN / NO-LIFT` |
| `sv-secret-compartment::weapon` | 41–42 | Require known physical host actual size, concealed-content size and capacity, and present content or valid empty compartment. | `D-005 OPEN / NO-LIFT` |
| `sv-secret-compartment::armor` | 41–42 | Require known physical host actual size, concealed-content size and capacity, and present content or valid empty compartment. | `D-005 OPEN / NO-LIFT` |
| `sv-secret-compartment::equipment` | 41–42 | Require known physical host actual size, concealed-content size and capacity, and present content or valid empty compartment. | `D-005 OPEN / NO-LIFT` |
| `sv-silverplate::weapon` | 42 | Require material gear with a surface suitable for coating; item DR effect must target the owned ITEM only. | `D-005 OPEN / NO-LIFT` |
| `sv-silverplate::armor` | 42 | Require material gear with a surface suitable for coating; item DR effect must target the owned ITEM only. | `D-005 OPEN / NO-LIFT` |
| `sv-silverplate::equipment` | 42 | Require material gear with a surface suitable for coating; item DR effect must target the owned ITEM only. | `D-005 OPEN / NO-LIFT` |
| `sv-spring-loaded::weapon` | 42 | Require an item usable/held in one hand, and a suitable quick-ready or hidden stowage configuration. | `D-005 OPEN / NO-LIFT` |
| `sv-spring-loaded::equipment` | 42 | Require an item usable/held in one hand, and a suitable quick-ready or hidden stowage configuration. | `D-005 OPEN / NO-LIFT` |
| `sv-storage-capacity::weapon` | 42 | Require geometry/weight/size storage facts sufficient to carry smaller items, not just membership in weapon, armor or equipment domains. | `D-005 OPEN / NO-LIFT` |
| `sv-storage-capacity::armor` | 42 | Require geometry/weight/size storage facts sufficient to carry smaller items, not just membership in weapon, armor or equipment domains. | `D-005 OPEN / NO-LIFT` |
| `sv-storage-capacity::equipment` | 42 | Require geometry/weight/size storage facts sufficient to carry smaller items, not just membership in weapon, armor or equipment domains. | `D-005 OPEN / NO-LIFT` |

## 4. Source-vs-implementation rejection cases

- Do **not** automatically approve all 35 because the table title says *Universal*: the text explicitly warns of additional limitations.
- Do **not** make `sv-memory-upgrade` legal on droids (including droidified equipment); a device must have an Intelligence score and not be a droid.
- Do **not** interpret the armor/equipment domain as proof that Remote Activation or Recognition System has a meaningful activation/operation pathway.
- Do **not** assume Extra Power Source works without a documented **energy-cell or power-pack** power model.
- Do **not** grant any wearer's damage reduction from Silverplate; it modifies the item's DR. The apparent misplaced Quick Draw sentence is a distinct unauthenticated errata candidate.
- Do **not** infer Secret Compartment capacity from game-categorized size alone; the printed rule uses **actual size**.
- Do **not** treat Storage Capacity as free upgrade points or make dual-gear equipment simultaneously usable without verifying the printed non-simultaneity limit.
- Do **not** apply Miniaturized to a melee weapon without its printed damage-die reduction.
- Do **not** treat printed examples (pistols/grenades/datapads, remote systems) as a universal permission on every item sharing a domain.
- Do **not** adopt the mirrored Dual Gear power-source restriction or the Silverplate/Spring Loaded relocation as publisher-authenticated errata; those are separately pending Q-003.

## 5. Proposed next certification gate; NOT executed here

1. Construct a **trusted host fact schema** covering hand-held/activatable state, power-source type, Int-bearing device versus droid identity, actual size and mass, capacity and compatibility, wearer versus item distinction, dual-gear source/target identities and relevant tier/ownership state.
2. Specify the 15 source predicates in **named, bounded, independently tested** host evaluators; handle each typed domain separately and fail closed for absent facts. Examples on printed pages do not establish universal legal host classes.
3. Resolve effects and source errata separately, particularly Miniaturized damage change, Advanced Memory replacement, Silverplate's non-wearer DR, and Spring Loaded Quick Draw attribution.
4. Review the 35 exact IDs against the then-current ledger and v1.5 registry; propose any **partial D-005 source lift** only with required source evidence, host evaluator and independent review; do **not** bulk-lift now.
5. Run G1, G2, G3, Phase 1a tests and later Foundry v13 host validation; even a future host source lift does **not** remove D-014, cost/effect blockers or `EXECUTOR_NOT_CERTIFIED`.

**Classification:** `BOOK_PAGE_VISUALLY_EXAMINED` research record. **Not** a register decision, host evaluator, or runtime authorization. No owner decision is required for the printed host limitations themselves.
