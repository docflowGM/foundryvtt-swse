# SWSE V2 Modification System — Master Questions and Decisions

**Status: planning and audit document only.** It changes no runtime code, registry, ledger, specification record, generated data or register entry, lifts no blocker, makes no owner ruling, and begins no work on G4-G9. Every question below is open or recorded as already resolved with its evidence; the Answer and Resolution-evidence fields are deliberately blank.

| Item | Value |
|---|---|
| Baseline | `main` at `fb6d6db33eb80a1079dd144c971b982984223b42`, containing all merged work through PR #1045 (G1 validator, A0 generator, G2 runtime data, G3 offline engines, D-001 certification, D-014/D-015 enforcement, D-013 partial-lift mechanism, research notes) |
| Not on `main` | PR #1046 (Source Authority Protocol), still a draft. This audit applies its roles (ChatGPT reads and certifies the PDFs; Claude implements; the owner decides only genuine ambiguities) as a working convention and does not depend on it being merged |
| Read for this audit | The rules-decisions register (D-001 to D-015), the replacement architecture (rev. 3), runtime schema, legacy inventory, G3 offline-engines note, the D-001/D-013/D-015 source examinations, the status ledger, the specification records, the generated runtime data and the generator/validator tests |
| Not reopened | Questions already answered or approved (Part 4B lists them with evidence) |
| Rules | CLAUDE.md "No Unauthorized Rules Decisions": nothing here chooses an interpretation; recommendations are marked as engineering views, not rules |

## Part 1 — Executive summary

### 1.1 Totals

| Measure | Count |
|---|---|
| Questions in this document | 55 (Q-001 to Q-055) |
| Open | 42 |
| Already resolved (recorded so they are not re-asked) | 13 (Q-043 to Q-055) |
| Open by priority | Critical 1, High 19, Medium 18, Low 4 |
| Open by status | NEEDS_SOURCE 19, UNANSWERED 6, OWNER_DECISION 8, BLOCKED_BY_DEPENDENCY 9 |
| Open by who answers | ChatGPT 21 (Part 2), Project Owner 11 (Part 3), Claude + ChatGPT 10 (Part 4A) |
| Open by category | SOURCE_VERIFICATION 21, ARCHITECTURE 8, RULES_AMBIGUITY 5, OWNER_POLICY 6, IMPLEMENTATION 2 |

### 1.2 Where the project stands

- 232 typed definitions exist. 76 are governed by the verified Scum and Villainy page-39 procedure, as published facts only: none is `MECHANIC_SPECIFIED`, implemented, tested, or runtime selectable, and all carry open D-014 and D-015 blockers. 156 are blocked by D-013 (no installation procedure released).
- 84 of 232 typed definitions have a verified cost, 155 have verified descriptions and effects, 76 have verified installation facts, and none has a verified host-prerequisites component. Nothing is selectable.
- D-001 is the only lifted register entry.
- No loader, executor, workbench, effect projection or Foundry test exists for V2 yet (G4-G9 not started).

### 1.3 Source verification

Twenty-one open questions (Q-001 to Q-020 and Q-025) are source verification. All can be answered in parallel by the independent reviewer. The most valuable first returns, in order: Core Rulebook p. 69 (Q-001) and S&V requirement check (Q-002), which close the evidence side of D-015; KOTOR pp. 75-76 (Q-004); the KOTOR template rule (Q-005) and lightsaber record (Q-006), which together cover 78 of the 156 blocked definitions as one research pass (certification still follows per definition or demonstrably uniform family); then Table 2-3 universal upgrade hosts (Q-014), covering 35 definitions.

### 1.4 Owner decisions

Only nine decision groups are proposed for the owner (Part 6, Section B; B2, B4, B5 and B7 are conditional on source returns), and only three of them can be answered now:

1. **D-014 package (Q-021 to Q-024):** four gaps the printed rule leaves undefined. The source is already examined and silent. The owner may keep the sub-mechanics blocked or state the rule.
2. **Unpriced modifications (Q-026):** a policy question that no source can answer.
3. A small GM-override preference (Q-029), which only matters before G6.

The remaining owner questions are conditional on source returns (Q-027, Q-028, Q-030, and a Q-025 escalation only if its source reconciliation finds a genuine ambiguity) or are future authorizations (Q-031, Q-032). Ten register entries (D-002 to D-012) are deliberately not turned into owner questions until a source record shows a real ambiguity (Q-030). Most of them are research gaps, not recorded ambiguities.

### 1.5 Key structural finding about D-013

D-013 is framed as "which installation procedure governs each of the 156 typed definitions". The evidence suggests the real question per family is **which printed mechanism applies the item** (installation, template at manufacture, talent, feat, alchemy, crafting, purchase quality). Most families have their own registry-certified procedure and may have no installation step at all. If the family records (Q-005, Q-008, Q-010) confirm this, the classification decision Q-028 could change which question applies to a family (a classification, not an installation procedure) without touching the immutable v1.5 registry or lifting any blocker. This is a hypothesis that needs the source records; it is not a ruling.

**Certification rule.** A family-level question is a consolidated research task. One pass can cover many definitions, but the certification may differ by item, domain or application mechanism; no blocker changes until the returned record states applicability and evidence for each typed definition, or demonstrates that the family is uniform.

### 1.6 Architectural

Two architecture questions are unusually consequential: **Q-033** (a proven all-or-nothing strategy for install/remove, because `TransactionEngine` does not guarantee atomicity when snapshot creation fails; rated Critical for G6) and **Q-041** (no document names the Foundry v13 runtime that will run G7 certification). Other engineering questions (E-4, E-6, host identity, failed-state storage) are open but mostly depend on source and owner answers.

### 1.7 Critical blockers (what prevents progress today)

| Blocker | Questions | Blocks |
|---|---|---|
| D-015 evidence | Q-001, Q-002 | D-015 lift; executor check requirements |
| D-014 silent gaps | Q-021 to Q-024 | Retry, expedited removal, failed/deactivated states for the 76 |
| D-013 family sourcing | Q-004 to Q-010, Q-027, Q-028 | The 156 typed definitions |
| Host prerequisites missing everywhere | Q-019, Q-035 | Any runtime selectability |
| Atomic strategy | Q-033 | G6, G7 |
| No Foundry runtime named | Q-041 | `FOUNDRY_TESTED` |

### 1.8 Existing blockers versus possible future risks

- **Existing blockers:** everything in 1.7.
- **Possible future risks (nothing contradicts current evidence yet):** errata affecting certified pages (Q-003); trace surprises in the lightsaber and Force Alchemy consumers (Q-039, Q-040); stacking or precedence ambiguities that may appear when D-011 and D-012 sources are read (Q-030); the owner's macro-compatibility and reset authorizations at G9 (Q-031, Q-032).

### 1.9 Reading guide

Part 2 is for the reviewer, Part 3 for the owner, Part 4 for engineering, Part 5 maps dependencies, Part 6 is the compact answer sheet (use it for replies), and Part 7 is the book-and-page queue. No question appears twice; where several definitions share one answer they are grouped.

## Part 2 — Questions for ChatGPT (source verification and evidence supply)

These are verification tasks. The answer is a structured certification record under the Source Authority Protocol (PR #1046): book, printed page, verbatim wording, what is established, what is not. None needs a ruling from the Project Owner unless the verified text turns out to be silent or conflicting, in which case the conditional owner question named in each entry applies.

Field legend for every question: **Priority** · **Category** · **Related register entries** · **Affected** · **Question** · **Known facts** · **Sources** · **Options** · **Suggested resolution** · **Who answers** · **Decision impact** · **Status** · **Answer** · **Resolution evidence**.

### 2A. Core Rulebook Mechanics and Scum and Villainy procedure (D-015, D-001 follow-ups)

#### Q-001 — Core Rulebook printed page 69 (Mechanics)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-015 |
| Affected | The 76 governed Scum and Villainy typed definitions (`installProcedure`) |
| Question | What does *Star Wars Saga Edition Core Rulebook* printed page 69 (middle of the Mechanics entry) say, and does any use listed on pages 68-70 concern installing, removing or modifying equipment upgrades, as opposed to droids, devices, explosives or repair? |
| Known facts | Pages 68 and 70 were read visually: Trained Only; security kit for Disable Device; tool kit for Modify Droid, Repair, Repair Droid; Repair Object inherits the Repair tool-kit rule; Retry; Special (take 10 / take 20). Page 69 was seen only as OCR by the implementer; the reviewer reports having located it in the PDF. |
| Sources | Core Rulebook printed pp. 68-70; `docs/audits/d-015-mechanics-requirements-source-examination.md`; OCR `reference/sourcebooks/Core Rulebook_djvu.txt` lines 6833-6990 |
| Options | (a) Page 69 lists no equipment-upgrade use. (b) It lists one (record verbatim). (c) It differs from the OCR materially (record verbatim). |
| Suggested resolution | Supply a certification record for page 69. This is verification, not an owner decision. |
| Who answers | ChatGPT |
| Decision impact | Evidence half of the D-015 lift for 76 definitions. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-002 — Does Scum and Villainy itself state any requirement for the Table 2-2 check?

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-015, D-001 |
| Affected | 76 governed definitions |
| Question | Do *Scum and Villainy* printed pp. 37-41 (Installing Upgrades, Table 2-2, any sidebar or worked example) state any training, tool kit, workshop or equipment requirement for the Mechanics check, or cross-reference the Core Rulebook Mechanics entry? |
| Known facts | Page 39 says the installer makes a Mechanics check and mentions an "overheated workshop" only descriptively. No examined source imposes or waives a tool or workshop requirement. |
| Sources | S&V printed p. 39; `docs/audits/d-001-install-remove-pdf-verification.md` |
| Options | (a) S&V states a requirement. (b) It states none and does not cross-reference. (c) It cross-references the Core Rulebook skill. |
| Suggested resolution | Verify and report. Whether the Core Rulebook's general skill rules (Trained Only, take 10, take 20) determine the check is the source reconciliation Q-025; it reaches the owner only if that reconciliation finds a genuine ambiguity. |
| Who answers | ChatGPT |
| Decision impact | Whether the executor needs a training or tool input (G5/G6) and whether D-015 can lift. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-003 — Errata or revised printings affecting certified pages

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-001, D-014, D-015 |
| Affected | All 232 typed definitions; Table 2-2 and 2-3 values; Core Mechanics entry |
| Question | Is there published errata, a revised printing or an official FAQ entry that changes S&V page 39 / Table 2-2 / Table 2-3 or the Core Rulebook Mechanics entry? If none can be found in the supplied library, which printings were checked? |
| Known facts | All certifications were made against the supplied PDF printings. No errata search is recorded in the repository. |
| Sources | `reference/sourcebooks/` (README: the PDF is the final authority) |
| Options | (a) No errata in the supplied library. (b) Errata found (record book, page, wording). |
| Suggested resolution | Report which printings were checked. This is a possible future risk, not an existing blocker: nothing contradicts current evidence. |
| Who answers | ChatGPT |
| Decision impact | If errata exist, the affected certified rows need re-review. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |

### 2B. D-013 families (the 156 typed definitions)

The 156 definitions fall into the families below. Each family question is a consolidated research task: one pass over the same pages can cover many definitions, but the resulting certification may differ by item, domain or application mechanism. No blocker changes until the returned record states applicability and evidence for each typed definition, or demonstrates that the family is uniform. The audit's key observation: D-013 as framed asks for an "installation procedure" per definition, but many families (templates, talents, feats, crafting, purchase quality) may have **their own** printed mechanism and no installation step at all. The first question for each family is therefore *which printed mechanism governs*, not whether Table 2-2 applies. Registry provenance already carries a role per definition (for example `not_generic_upgrade`), which is evidence for that framing but is not itself a ruling.

| Family | Typed definitions | Question |
|---|---|---|
| KOTOR Table 5-6 accessories | 8 | Q-004 |
| KOTOR templates | 34 | Q-005 |
| Lightsaber crystals and accessories (JATM 20 + 10, KOTOR 14) | 44 | Q-006 |
| Tech Specialist (SoG 9) and Biotech Specialist (Legacy 9) | 18 | Q-007 |
| Sith alchemy (JATM 9, KOTOR 1) | 10 | Q-008 |
| Legacy templates 5, heirloom 12, biotech device 2 | 19 | Q-009 |
| Individual items (CW 3, Core 1, TFU 3, GaW 3, GoI 6, Web 1, Rebellion 5, S&V Retractable Stock 1) | 23 | Q-010 |
| **Total** | **156** | |

#### Q-004 — KOTOR accessories (pp. 75-76)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-013 |
| Affected | `kotor-accessory-armor-reinforcement`, `-beam-splitter`, `-durasteel-bonding`, `-enhanced-energy-projector`, `-hair-trigger`, `-improved-energy-cell`, `-mesh-underlay`, `-tremor-cell` (8 typed definitions) |
| Question | On KOTOR printed pp. 75-76 (PDF pp. 76-77) does the wording match the OCR ("upgrade slot cost ... for use with the gear enhancement system in Scum and Villainy"; most equipment can have only one accessory), and does any text in the chapter (equipment introduction, gear templates, sidebars) state how an accessory is installed or removed? |
| Known facts | OCR states slot costs are for use with the S&V system, a one-accessory-per-item default, and per-accessory host restrictions. No installation, DC, time or Table 2-2 reference exists in the OCR. The implementer has no page image. |
| Sources | KOTOR printed pp. 75-76; `docs/audits/d-013-kotor-accessories-source-examination.md`; OCR lines 6960-7085 |
| Options | (a) Wording matches, no installation text (genuine silence). (b) Text states a procedure (record verbatim). (c) Text explicitly points to S&V installation. |
| Suggested resolution | Report verbatim. (b) or (c) permits a D-013 Partial lift for these 8; (a) is a genuine silence and goes to Q-027. |
| Who answers | ChatGPT |
| Decision impact | Research scope: 8 definitions; any release needs per-definition or demonstrably uniform conclusions. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-005 — KOTOR gear templates

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-013 |
| Affected | 34 `kotor-template-*` typed definitions (registry role `source_item_quality`) |
| Question | What does the book print about how a template is applied: at manufacture, on purchase of a templated item, or by converting an existing item? Is any Table 2-2 step stated? |
| Known facts | The registry classifies these as `published_template`. Their own registry procedure statuses are mostly certified or runtime-pending. |
| Sources | KOTOR gear-templates section (pages to be confirmed by the reviewer); registry `procedures` |
| Options | (a) Applied only at creation or purchase (no installation procedure exists). (b) A conversion procedure is printed (record). (c) Silent. |
| Suggested resolution | Report the printed application rule. If (a), the family is classified under Q-028 rather than answered with Table 2-2. |
| Who answers | ChatGPT |
| Decision impact | Research scope: 34 of 156 definitions; certification per definition or demonstrably uniform family. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-006 — Lightsaber crystals, accessories and the allowance (D-011)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-011, D-013 |
| Affected | 44 definitions: JATM crystals 20, JATM accessories 10, KOTOR crystals 14 |
| Question | What do *Jedi Academy Training Manual* pp. 54 and 60 and the KOTOR crystal text state about (a) the number of accessories a lightsaber may have, (b) any relation of that count to Tech Specialist, (c) whether a chassis has a slot pool at all, (d) whether crystals and accessories are chosen during construction only or may be installed afterwards, and (e) any installation or removal procedure? |
| Known facts | Registry stacking policy `LIGHTSABER_ACCESSORY_ALLOWANCE_PENDING_RECONCILIATION`. Phase 1a never certifies a lightsaber. The current construction path is the lightsaber workbench (`lightsaber-construction-engine.js`), not yet traced. |
| Sources | JATM pp. 54, 60; KOTOR crystal section; legacy inventory rows for the construction engine, crystal map and packs |
| Options | (a) Parts are chosen at construction under their own rules. (b) Post-construction installation is printed. (c) The text is ambiguous about allowance or stacking (this becomes an owner question under Q-030). |
| Suggested resolution | Report verbatim, split into (a)-(e). Do not decide stacking. |
| Who answers | ChatGPT |
| Decision impact | Research scope: D-011 and 44 of 156 definitions; certification per definition or demonstrably uniform family; gates Q-039. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-007 — Tech Specialist and Biotech Specialist traits (D-008, D-009)

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-008, D-009, D-013 |
| Affected | 9 `sog-tech-*` and 9 `legacy-biotech-specialist-*` typed definitions; the 14 superior-tech traits |
| Question | Does the trait `tech_device_upgrade_slot` exist in *Starships of the Galaxy* p. 21; what do the traits grant; where is the Superior Tech source for the 14 traits; and are these traits properties granted by the feat or are they installed? |
| Known facts | Phase 1a treats the device extra slot as `unverified` and never as capacity. Registry role `feat_granted_item_trait`. |
| Sources | SoG p. 21; the Superior Tech source (not yet located); Legacy Era biotech-specialist text |
| Options | (a) Trait exists and grants capacity. (b) It does not exist as printed. (c) Traits are feat-granted with no installation step. |
| Suggested resolution | Report verbatim; locating the Superior Tech source is part of the task. |
| Who answers | ChatGPT |
| Decision impact | Research scope: D-008, D-009 and 18 of 156 definitions; certification per definition or demonstrably uniform family. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-008 — Sith alchemy items and traits

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-013 |
| Affected | 10 definitions (JATM amulet 1, armor traits 4, weapon traits 3, Rapid Alchemy 1; KOTOR talisman 1) |
| Question | What printed procedure creates or applies each item or trait (alchemy rules, time, cost), and is any of them an installed upgrade? |
| Known facts | Registry roles: `wearable_sith_artifact`, `sith_dark_armor_trait`, `sith_melee_weapon_trait`, `talent_temporary_weapon_enhancement`, `alchemically_created_equipment`. Force Alchemy workbench apps exist (NEEDS-TRACE, E-10). |
| Sources | JATM Sith alchemy section; KOTOR Sith alchemy; legacy inventory `apps/force-alchemy/*` |
| Options | (a) Governed by the alchemy procedure. (b) Installed like an upgrade. (c) Silent. |
| Suggested resolution | Report which mechanism governs each. |
| Who answers | ChatGPT |
| Decision impact | Research scope: 10 definitions; certification per definition or demonstrably uniform family; gates Q-040. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-009 — Legacy Era templates, heirlooms, biotech device integration (D-010)

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-010, D-013 |
| Affected | `legacy-weapon-template-antiquated`, `-refitted`, `legacy-biotech-host-template` (5 typed); 12 heirloom; 2 biotech-device (19 total) |
| Question | What do *Legacy Era Campaign Guide* pp. 66, 100, 101 and the heirloom and biotech-device text state about composition with other templates and upgrades, how heirloom benefits attach, and how biotech device integration is applied? |
| Known facts | The registry says further source tests are needed and records no specific gap. |
| Sources | Legacy Era pp. 66, 100, 101; heirloom and biotech pages (reviewer to confirm) |
| Options | (a) Constraints printed. (b) Silent. (c) Conflicting. |
| Suggested resolution | Report verbatim. Keep D-010 separate from the heirloom and biotech residue. |
| Who answers | ChatGPT |
| Decision impact | Research scope: D-010 and 19 of 156 definitions; certification per definition or demonstrably uniform family. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-010 — Individual items and the planned upstream corrections

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-013, D-004, D-006 |
| Affected | 23 definitions: Clone Wars 3, Core self-built lightsaber attunement 1, Force Unleashed 3, Galaxy at War 3, Galaxy of Intrigue 6, Official web 1, Rebellion Era 5, S&V Retractable Stock 1 |
| Question | For each item, which printed mechanism applies it (installation, talent, crafting, purchase quality, conversion) and on which page? Include the upstream corrections named in the architecture (Holo Converter, Halo Lamp, Manual Trigger). |
| Known facts | Registry roles already separate `*_not_generic_upgrade`, `temporary_*` and `purchase_quality` cases from installable ones. Architecture G4 lists the corrections as separate producer-side PRs, each with its source. |
| Sources | Per-item registry provenance; architecture section 7 (G4 row) |
| Options | Per item: installation / talent / crafting / purchase quality / other. |
| Suggested resolution | One record per item or small family. Items that are not installed upgrades are candidates for a non-installation classification (Q-028); the registry is not changed. |
| Who answers | ChatGPT |
| Decision impact | Research scope: the long tail (23 of 156); certification per item. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

### 2C. Procedure and applicability register entries (D-002 to D-007, D-012)

#### Q-011 — Stripping an item (D-002)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-002 |
| Affected | Any strip grant (`sv-stripping-item`) |
| Question | What do *Scum and Villainy* pp. 37-38 state about stripping: which features qualify on which hosts, the drawbacks, whether more than one strip counts, and the restriction on repeating a method for gaining slots? |
| Known facts | Registry: `RULES_OUTLINE_REVIEWED`, "not a free numeric bonus". Phase 1a D16 fails closed. |
| Sources | S&V pp. 37-38; Phase 1a contract section 6 |
| Options | (a) Fully specified. (b) Qualification left to the GM (becomes an owner question under Q-030). (c) Silent. |
| Suggested resolution | Report verbatim. |
| Who answers | ChatGPT |
| Decision impact | Unblocks the structural (slot-gaining) service. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-012 — Increasing size (D-003)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-003 |
| Affected | `sv-increase-size`; armor stock-class derivation |
| Question | What do S&V pp. 38-39 state a size increase changes on weapons versus armor (including armor weight class), and what restrictions are printed? |
| Known facts | The repository's two writers disagree (one rewrites the armor class, the other records a flag). That is an engineering inconsistency unless the printed text is ambiguous. Phase 1a counts a canonical size increase once (+1). |
| Sources | S&V pp. 38-39; Phase 0 audit |
| Options | (a) Weapons and armor effects specified. (b) Ambiguous (owner question under Q-030). |
| Suggested resolution | Report verbatim. |
| Who answers | ChatGPT |
| Decision impact | Structural service and armor stock class. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-013 — Retractable Stock slot cost (D-004)

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-004 |
| Affected | `sv-retractable-stock` (1 definition) |
| Question | What condition selects a slot cost of 0 versus 1 in S&V p. 42 / Table 2-4? |
| Known facts | The registry says only that source-text examination is required. |
| Sources | S&V p. 42, Table 2-4 |
| Options | (a) Condition printed. (b) Ambiguous. |
| Suggested resolution | Report verbatim. |
| Who answers | ChatGPT |
| Decision impact | Slot accounting for one upgrade. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-014 — Table 2-3 universal upgrades: hosts and detail rules (D-005)

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-005 |
| Affected | 16 universal upgrades (35 typed definitions): Cheater, Cloaked, Droidification (excluded scope), Dual Gear, Electrograpple Handle, Environmental Sealing, Extra Power Source, Memory Upgrade, Memory Upgrade Advanced, Miniaturized, Recognition System, Remote Activation, Secret Compartment, Silverplate, Spring Loaded, Storage Capacity |
| Question | For each, which of weapons, armor and equipment may it be installed on, and what detail rules does its printed text give? |
| Known facts | 35 typed definitions have a certified slot cost but an uncertified domain. Each carries the D-005 blocker. Droidification is excluded scope. |
| Sources | S&V Table 2-3 and each upgrade's text (for example p. 41 for Cheater) |
| Options | Per upgrade and per domain: permitted / not permitted / not stated. |
| Suggested resolution | One record per upgrade listing hosts and detail rules. "Not stated" is a legitimate answer and must not be read as permitted. |
| Who answers | ChatGPT |
| Decision impact | Research scope: 35 typed definitions; eligibility is concluded per upgrade and domain, never inferred for the group; also feeds Q-019. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-015 — Computerized Interface Scope and Night Vision Device (D-007)

| Field | Content |
|---|---|
| Priority / Category | Low / SOURCE_VERIFICATION |
| Related | D-007 |
| Affected | Two catalog entries |
| Question | Is each a published modification; what are its slot cost and host? Where is Night Vision Device published? |
| Known facts | The Computerized Interface Scope appears in the *Rebellion Era Campaign Guide* by OCR (2,000 credits, 0.5 kg weapon-mounted scope). No source located for Night Vision Device. Owner ruling: neither is added nor deleted until verified. |
| Sources | Rebellion Era Campaign Guide (OCR only); other books to be searched |
| Options | (a) Published (record). (b) Not published in the library. |
| Suggested resolution | Report; the standing owner ruling stands meanwhile. |
| Who answers | ChatGPT |
| Decision impact | Two entries. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-016 — Powered armor stock slots (D-012)

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-012 |
| Affected | Powered armor capacity |
| Question | What does S&V p. 37 print about powered armor stock capacity, and is there a precedence rule between powered status and weight class? |
| Known facts | The registry outline omits heavy armor and differs from the printed baseline, which indicates an incomplete outline rather than an established ambiguity. Phase 1a leaves it unresolved. KOTOR separately says light powered armor has 2 free upgrade slots when using the S&V rules. |
| Sources | S&V p. 37; KOTOR powered-armor text |
| Options | (a) Precedence printed. (b) No precedence rule (becomes an owner question under Q-030). |
| Suggested resolution | Report verbatim. |
| Who answers | ChatGPT |
| Decision impact | Armor capacity. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-017 — Do Componentization and Excellent Kit print a price? (D-006 evidence check)

| Field | Content |
|---|---|
| Priority / Category | Low / SOURCE_VERIFICATION |
| Related | D-006 |
| Affected | 7 typed definitions (Componentization Basic and Deluxe; Excellent Kit purchased quality) |
| Question | Do *Galaxy of Intrigue* p. 68 and *Rebellion Era* p. 43 print any price? |
| Known facts | The registry records no printed price, so the price is unknown (owner ruling: never zero). The register states this check is not a prerequisite for the policy question Q-026. |
| Sources | GoI p. 68; Rebellion Era p. 43 |
| Options | (a) Confirmed no price. (b) A price is printed. |
| Suggested resolution | Report. If a price exists, the D-006 policy question may shrink. |
| Who answers | ChatGPT |
| Decision impact | Only the size of Q-026. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

### 2D. Component certification common to every definition

#### Q-018 — Slot cost and price certification outside the 76

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | Phase 1b contract; D-004, D-006 |
| Affected | 232 typed definitions: 84 have a verified cost; 148 do not. Prices: 89 are plain credits, 7 are unknown, and the rest use non-numeric kinds. |
| Question | For each non-S&V family (and the rest of the S&V tables), which printed cost and price values are certified: slot cost (fixed, variable, conditional, none) and price (credits, percentage, by-item, none, unpriced)? |
| Known facts | Unknown price is never zero (owner ruling). Slot cost is certified only through the Phase 1b predicate. Non-numeric price kinds are tagged in the registry, not interpreted. |
| Sources | The relevant tables per family; the registry price kinds |
| Options | Per definition: printed numeric / printed non-numeric / not printed. |
| Suggested resolution | Fold this into the family records of Q-004 to Q-010 so each family returns cost and price in the same record. |
| Who answers | ChatGPT |
| Decision impact | Needed for planner pricing and slot closure of every newly released definition. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-019 — Host prerequisites per definition

| Field | Content |
|---|---|
| Priority / Category | High / SOURCE_VERIFICATION |
| Related | D-005, D-013 |
| Affected | All 232 typed definitions: 0 have a verified `hostPrerequisites` component |
| Question | For each family, what host restrictions does the printed text state (for example KOTOR "only pistols, rifles, heavy weapons and exotic ranged weapons", "slashing damage only", "not larger than Medium")? |
| Known facts | Every typed definition has host eligibility `not_established`. KOTOR accessory paragraphs carry per-accessory restrictions in the OCR. Equipment, weapon and armor domains stay separate. |
| Sources | Each item's printed paragraph |
| Options | Per definition: restriction stated verbatim / no restriction stated. |
| Suggested resolution | Return host restrictions in the same family record as Q-004 to Q-010 and Q-014. Do not translate wording into predicates; translation is an engineering step after the wording is certified. |
| Who answers | ChatGPT |
| Decision impact | Required before any definition can be runtime selectable. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

#### Q-020 — Which published effects are unambiguous mechanics (G5)

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-014 (indirectly); CLAUDE.md section 3 |
| Affected | `executableEffect` of every definition: 155 descriptions are verified, 0 effects are mechanically specified |
| Question | For each definition, is the printed effect an unambiguous, stated numeric or rules effect (bonus value, type, duration), or descriptive text that cannot be converted into an automatic benefit without a ruling? |
| Known facts | CLAUDE.md forbids converting descriptive text into an automatic benefit without supporting rules. Effect projection (G5) may be built only for `MECHANIC_SPECIFIED` effects. |
| Sources | Each definition's printed paragraph |
| Options | Per definition: specified / descriptive-only / ambiguous. |
| Suggested resolution | Classify family by family when the family's other components are returned. Start with the 76 governed definitions, which have the most evidence. |
| Who answers | ChatGPT |
| Decision impact | Defines what G5 may automate. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |
### 2E. Reconciliation of the general skill rules with the Table 2-2 check

#### Q-025 — Do the published general skill rules (take 10, take 20, Trained Only) determine the Table 2-2 check?

*Reclassified after the PR #1047 independent review: this is a source-rules reconciliation task first. It is not presented to the owner unless the reconciliation finds a genuine unresolved conflict or ambiguity. The ID is unchanged.*

| Field | Content |
|---|---|
| Priority / Category | Medium / SOURCE_VERIFICATION |
| Related | D-015, D-014, D-001 |
| Affected | 76 governed definitions; check-input contract (Q-037) |
| Question | Applying the published general rules as written, what do they determine for the Table 2-2 Mechanics check on each of: (1) Trained Only for the installer; (2) taking 10 (Core printed p. 60: depends on circumstances); (3) taking 20 (Core printed p. 60: failure must carry no penalty), evaluated against the failure consequences S&V p. 39 prints (retry at half the original attempt's cost, a failed removal leaves the upgrade deactivated, a failed expedited removal destroys it, a failed installation does not work properly)? For each, is the result determinate (permitted, forbidden), or does the text leave a genuine ambiguity or conflict? |
| Known facts | Reported by the independent reviewer and **not seen by the implementer**: Core printed p. 60 states the conditions for taking 10 and taking 20. Read visually by the implementer: Mechanics is Trained Only (p. 68); the Special paragraph allows take 10 and take 20 on a Mechanics check, but not take 20 on a jury-rig (p. 70). S&V p. 39 states its own retry and failure consequences and says nothing about taking 10 or 20. The take-20 evaluation may itself depend on the D-014 gaps (Q-021 to Q-024): whether a stated consequence counts as a "penalty" for failure may turn on what those consequences are. |
| Sources | Core printed pp. 60, 68, 70 (p. 69 via Q-001); S&V printed p. 39; `docs/audits/d-015-mechanics-requirements-source-examination.md` |
| Options | (a) The general rules, applied as written, give a determinate result for each of (1)-(3) (record the result and its basis per rule). (b) For one or more of them the text is genuinely ambiguous or conflicting (record exactly where; only then is a separate owner question raised, under this ID). |
| Suggested resolution | Evaluate first and report per rule. Do not presume that silence in Table 2-2 requires an owner ruling. |
| Who answers | ChatGPT (the implementer cross-checks the cited repository evidence) |
| Decision impact | Whether the executor validates training and allows take 10/20; whether Section B2 is needed at all. |
| Status | NEEDS_SOURCE |
| Answer | |
| Resolution evidence | |

## Part 3 — Questions for the Project Owner (genuine rules gaps and policy)

Only questions the sources cannot answer appear here, or policy that no source can answer. For D-014 the source has already been examined and is silent. No option below is an invented rule: the options are "stay blocked / table adjudication" or "the owner supplies the ruling". The engineering recommendation, where given, concerns what the executor does and not what the rule is.

### 3A. D-014 — gaps in the printed installation and removal procedure (answer as one package)

#### Q-021 — What does an "installation attempt" cost? (D-014 item 1)

| Field | Content |
|---|---|
| Priority / Category | High / RULES_AMBIGUITY |
| Related | D-014, D-001 |
| Affected | The 76 governed definitions; retry logic in the executor |
| Question | S&V p. 39 says a retry costs half as much as the original attempt, and scratch-built items cost twice. What monetary cost does an attempt have, so that "half" and "twice" have a basis? |
| Known facts | Page 39 states the multipliers and does not name the base amount. The upgrade's price, a separate parts cost, and no cost are all unstated. |
| Sources | S&V printed p. 39, Table 2-2 and text; `docs/audits/d-001-install-remove-pdf-verification.md` section 5 |
| Options | (a) Keep retry and scratch-built pricing blocked; the plan shows the printed multipliers as text and the table adjudicates. (b) The owner states the base. |
| Suggested resolution | Engineering view only: (a) is the safe default because nothing in print supports a base. The rule itself is the owner's. |
| Who answers | Project Owner (ChatGPT analysis of the page text may precede) |
| Decision impact | Retry and scratch-built costs in the planner and executor (G3 refusal, G5/G6). |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

#### Q-022 — Expedited removal at the shortest time increment (D-014 item 2)

| Field | Content |
|---|---|
| Priority / Category | Medium / RULES_AMBIGUITY |
| Related | D-014 |
| Affected | Removal planning for 76 governed definitions |
| Question | Expedited removal goes to the next lowest time increment, but destroys the upgrade on a failed check. What applies when the table time is already the shortest (10 minutes)? D-014 also records that the page does not print an example for the 1-week case. |
| Known facts | Table times: 10 min, 1 hr, 1 day (8 hr), 1 week (5 days). The page does not say what lies below 10 minutes. |
| Sources | S&V p. 39 |
| Options | (a) Expedited removal is unavailable at 10 minutes in V2 until ruled. (b) The owner states the rule. |
| Suggested resolution | Engineering view only: (a) until ruled. |
| Who answers | Project Owner |
| Decision impact | Removal planner branch for the shortest increment. |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

#### Q-023 — What is a "deactivated" upgrade, and does it occupy a slot? (D-014 item 3)

| Field | Content |
|---|---|
| Priority / Category | High / RULES_AMBIGUITY |
| Related | D-014 |
| Affected | Failed-removal state; slot closure; Phase 1a accounting |
| Question | After a failed removal the upgrade is "deactivated". Does it still occupy its slot, stop providing its effect, or neither? The same question applies to an upgrade after a failed installation. |
| Known facts | Page 39 says only that a slot is freed on successful removal or destruction. |
| Sources | S&V p. 39 |
| Options | (a) Treat as unresolved: the plan reports the state and the executor does not change slot occupancy or effects. (b) The owner states the rule. |
| Suggested resolution | Engineering view only: (a). Slot occupancy stays as installed. |
| Who answers | Project Owner |
| Decision impact | Instance state shape (Q-038), effect suppression, slot closure. |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

#### Q-024 — State after a failed installation (D-014 item 4)

| Field | Content |
|---|---|
| Priority / Category | High / RULES_AMBIGUITY |
| Related | D-014 |
| Affected | Executor result states; instance records |
| Question | A failed installation "doesn't work properly". Does the upgrade become installed, installed-but-malfunctioning, or not installed; what does it do while malfunctioning? |
| Known facts | The page states the retry rule but defines no state. |
| Sources | S&V p. 39 |
| Options | (a) The executor records a failed attempt as an outcome without creating an installed instance; the table adjudicates. (b) The owner states the rule. |
| Suggested resolution | Engineering view only: (a). |
| Who answers | Project Owner |
| Decision impact | Instance record shape and the executor result enumeration (G6). |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

*Q-025 (take 10 / take 20 / Trained Only on the Table 2-2 check) was moved to Part 2E as a source-rules reconciliation; it reaches the owner only if that reconciliation finds a genuine ambiguity or conflict.*

### 3B. Policy

#### Q-026 — Unpriced modifications (D-006)

| Field | Content |
|---|---|
| Priority / Category | Medium / OWNER_POLICY |
| Related | D-006 |
| Affected | 7 typed definitions: Componentization Basic and Deluxe, Excellent Kit purchased quality |
| Question | How should the V2 workbench treat acquiring or installing a modification with no printed price? |
| Known facts | Unknown price is never zero (owner ruling). The planner already refuses to price an unknown amount. |
| Sources | GoI p. 68; Rebellion Era p. 43; register D-006 |
| Options | (a) Not purchasable through the workbench; shown as unpriced. (b) The GM or owner enters a price at purchase time. (c) Excluded from the workbench catalog. |
| Suggested resolution | Policy is the owner's. Q-017 is a cheap evidence check that may shrink the question. |
| Who answers | Project Owner |
| Decision impact | Purchase and install flow for 7 definitions. |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

#### Q-027 — Policy where a publication is silent on installation (D-013)

| Field | Content |
|---|---|
| Priority / Category | High / OWNER_POLICY |
| Related | D-013 |
| Affected | Any D-013 family whose verified text is silent (candidate: the 8 KOTOR accessories, subject to Q-004) |
| Question | If a publication prints a slot cost "for use with" the S&V system but no installation text, may the S&V Table 2-2 procedure govern it, or does the item stay non-installable in V2 until a source states it? |
| Known facts | Slot cost compatibility alone is not an authorization (review instruction). The text neither authorizes nor excludes Table 2-2. |
| Sources | `docs/audits/d-013-kotor-accessories-source-examination.md` |
| Options | (a) Stay non-installable; description-only (the CLAUDE.md default). (b) Owner rules that Table 2-2 applies to the family. (c) Owner defers per family. |
| Suggested resolution | Ask once, as a standing policy for all silent families, after Q-004 returns. |
| Who answers | Project Owner |
| Decision impact | A single policy answer routes every silent family and avoids per-family rulings. |
| Status | BLOCKED_BY_DEPENDENCY (Q-004) |
| Answer | |
| Resolution evidence | |

#### Q-028 — Classification of items that are not generically installed

| Field | Content |
|---|---|
| Priority / Category | High / OWNER_POLICY |
| Related | D-013 |
| Affected | Families whose printed mechanism is not installation: templates (34 + 5), heirlooms (12), Sith alchemy (10), Tech/Biotech Specialist traits (18), purchase-quality, temporary talent effects |
| Question | When ChatGPT's family records show an item is applied by something other than installation (at manufacture, by a talent, by a feat, by alchemy), how is it classified in V2? The v1.5 canonical registry is immutable (G1); this decision deletes no typed definition and changes no registry record. |
| Known facts | The registry already marks several roles `not_generic_upgrade` and `temporary_*`. Existing specialist engines (Tech Specialist, Force Alchemy, lightsaber workbench) remain consumers of the V2 slot authority, per the architecture. |
| Sources | Registry provenance roles; architecture sections 3 and 7 |
| Options | (a) Not eligible for generic installation: stays in the registry with its printed mechanism recorded, and no D-013 installation procedure is sought for it. (b) Handled by an existing specialist system (Tech Specialist, Force Alchemy, lightsaber workbench) that consumes V2 slot and price authority. (c) Retained as a non-selectable reference: description only, never `runtimeSelectable`. (d) A future canonical-registry version change: outside this decision, requires its own separate authorization and respects the G1 and G9 boundaries. |
| Suggested resolution | The scope decision is the owner's. Evidence-based note: if Q-005, Q-008 and Q-010 find no installation step for a definition, requiring "an installation procedure" for it has no source basis; its classification (a)-(c) is then recorded with per-definition evidence. |
| Who answers | Project Owner, informed by ChatGPT's family records |
| Decision impact | May change which question applies to a family (classification versus installation procedure). It releases no blocker by itself: each definition still needs recorded evidence of its classification, per definition or for a demonstrably uniform family. |
| Status | BLOCKED_BY_DEPENDENCY (Q-005, Q-008, Q-010) |
| Answer | |
| Resolution evidence | |

#### Q-029 — Is there a GM override path for deferred mechanics?

| Field | Content |
|---|---|
| Priority / Category | Medium / OWNER_POLICY |
| Related | D-014, D-002, D-003 |
| Affected | Workbench UX for blocked or deferred operations |
| Question | When a mechanic is `DEFERRED_RULES_REVIEW` (retry, deactivation, expedited removal), should the V2 workbench offer a manual GM-entered outcome, or only show the printed text and refuse? |
| Known facts | The planner reports blockers and always includes `EXECUTOR_NOT_CERTIFIED`. No repository document authorizes a manual override, and a manual outcome would be a gameplay-level decision. |
| Sources | `modification-v2-g3-offline-engines.md`; architecture section 5 |
| Options | (a) Refuse and show printed text only. (b) GM may record an outcome manually, audited, with no automated rules effect. |
| Suggested resolution | Preference decision; none recommended. |
| Who answers | Project Owner |
| Decision impact | Workbench UX (G6); the instance-record shape. |
| Status | OWNER_DECISION |
| Answer | |
| Resolution evidence | |

#### Q-030 — Conditional rulings (placeholder; no owner action now)

| Field | Content |
|---|---|
| Priority / Category | Medium / RULES_AMBIGUITY |
| Related | D-002, D-003, D-004, D-005, D-007, D-008, D-009, D-010, D-011, D-012 |
| Affected | Each of those entries |
| Question | Tracking entry. Each register entry above becomes an owner question **only if** the source record returned for it (Q-006, Q-007, Q-009, Q-011 to Q-016) shows the printed text is ambiguous, silent or conflicting. Currently none is known to be. D-011 stacking and D-012 precedence are the most likely candidates. |
| Known facts | These entries are `DEFERRED_RULES_REVIEW` in the register but classified `PENDING_SOURCE_VERIFICATION` in review (rev. 2): a research gap, not a recorded ambiguity. |
| Sources | Register entries and their review classification rows |
| Options | Per entry after sourcing: resolved by text / owner ruling / stays deferred. |
| Suggested resolution | Do not ask the owner anything for these until a source record shows a real gap. |
| Who answers | Project Owner (only if triggered) |
| Decision impact | Prevents ~10 premature owner questions. |
| Status | BLOCKED_BY_DEPENDENCY (Part 2 returns) |
| Answer | |
| Resolution evidence | |

### 3C. Future authorizations (not needed now)

#### Q-031 — Legacy removal at G9: macro/global compatibility

| Field | Content |
|---|---|
| Priority / Category | Low / OWNER_POLICY |
| Related | Architecture G9, E-7, E-8 |
| Affected | Legacy modification code, globals and launch surfaces listed in `modification-v2-legacy-inventory.md` |
| Question | Is macro or external-script compatibility with legacy globals (for example `applyItemUpgrade` call sites) required, or may they be removed at cutover? |
| Known facts | Project rules require the owner to state macro-compatibility policy before deleting macro-only globals. The inventory classifies dispositions; nothing is deleted until G9. |
| Sources | Legacy inventory; architecture section 7 (G9) |
| Options | (a) No compatibility; delete with the legacy code. (b) Keep thin shims for a stated period. |
| Suggested resolution | Ask at G9, not now. |
| Who answers | Project Owner |
| Decision impact | Shape of the G9 deletion batch. |
| Status | OWNER_DECISION (not yet due) |
| Answer | |
| Resolution evidence | |

#### Q-032 — Authorization for deletion and for any prerelease character reset

| Field | Content |
|---|---|
| Priority / Category | Low / OWNER_POLICY |
| Related | Architecture G9 |
| Affected | Cutover (G9) |
| Question | Does the owner authorize (separately) (a) deleting the legacy implementations at G9 and (b) a prerelease character reset? |
| Known facts | Both require explicit separate owner authorization. Phase 1a keeps legacy-evidence handling until cutover. |
| Sources | Architecture section 7 (G9 row) |
| Options | Authorize deletion / authorize reset / authorize neither. |
| Suggested resolution | Ask when G7 is certified. |
| Who answers | Project Owner |
| Decision impact | G9 cannot start without it. |
| Status | OWNER_DECISION (not yet due) |
| Answer | |
| Resolution evidence | |
## Part 4 — Engineering questions (Claude + ChatGPT)

### 4A. Genuinely undecided

#### Q-033 — Proven all-or-nothing strategy for install/remove (E-5)

| Field | Content |
|---|---|
| Priority / Category | Critical / ARCHITECTURE |
| Related | Architecture 5.5, E-5 |
| Affected | G6 executor; every install and removal |
| Question | Which strategy guarantees an install/remove (item state plus any credit movement) is all-or-nothing, given `TransactionEngine` continues without a rollback snapshot when snapshot creation fails? |
| Known facts | Traced in 5.5: atomicity is not guaranteed for owned-customization changes. The architecture requires a proven, tested strategy before the executor is certified (for example refusing to apply when snapshot creation fails). Hard rule: if any part fails, the whole operation fails. |
| Sources | Architecture 5.5; `TransactionEngine` |
| Options | (a) Refuse to apply when the snapshot cannot be made (fail closed). (b) Fix snapshot-failure handling in `TransactionEngine` itself. (c) A pre-check plus compensating write with proven rollback. The architecture names (a) as an example; the others are engineering candidates. |
| Suggested resolution | Claude to produce a design with failure-injection tests; ChatGPT to review independently before G6. |
| Who answers | Claude + ChatGPT |
| Decision impact | Gate for G6 and G7. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |

#### Q-034 — How weapon projections reach combat (E-4)

| Field | Content |
|---|---|
| Priority / Category | High / ARCHITECTURE |
| Related | E-4 |
| Affected | G5 effect projection (weapons first) |
| Question | How do `weapon-runtime` and `combat-stat-rules` consume modification sources today, so that computed projections reach combat through an existing authority and no stat key is written? |
| Known facts | A trace is required before G5. `effect-resolver` remains the only source of several combat-visible values until G5 covers every specified effect. |
| Sources | Architecture E-4; Phase 0 audit section 5 |
| Options | Determined by the trace (no source-based options yet). |
| Suggested resolution | Claude traces and reports; ChatGPT reviews. |
| Who answers | Claude + ChatGPT |
| Decision impact | G5 design. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |

#### Q-035 — Canonical host identity for armor and equipment (G4)

| Field | Content |
|---|---|
| Priority / Category | High / ARCHITECTURE |
| Related | Architecture G4; D-005; D-012 |
| Affected | Host eligibility for armor and equipment domains |
| Question | Which canonical fields identify an armor or equipment host (as the architecture plans for weapons), and where does the planner get them without trusting caller data? |
| Known facts | G4 supplies certified host-fact inputs, "for example canonical weapon identity", only for specified rules. Domains stay separate. Host eligibility is `not_established` for all definitions. |
| Sources | Architecture section 7 (G4) |
| Options | None yet; depends on which host facts Q-019 certifies. |
| Suggested resolution | Decide after Q-019 returns so the identity carries only fields the rules need. |
| Who answers | Claude + ChatGPT |
| Decision impact | Host eligibility for every definition. |
| Status | BLOCKED_BY_DEPENDENCY (Q-019) |
| Answer | |
| Resolution evidence | |

#### Q-036 — `CommandBus` command and payload (E-6)

| Field | Content |
|---|---|
| Priority / Category | Medium / ARCHITECTURE |
| Related | E-6 |
| Affected | G6 |
| Question | What are the single install/remove command's name and payload, replacing `applyItemUpgrade`, so a client cannot pass price, slot or eligibility data? |
| Known facts | Identity-only payload is the architecture's direction; removal identity is exactly one `{instanceId, typedDefinitionId, domain}`. |
| Sources | Architecture E-6; `modification-v2-g3-offline-engines.md` |
| Options | Open. |
| Suggested resolution | Design in the G6 package; review independently. |
| Who answers | Claude + ChatGPT |
| Decision impact | G6 interface. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |

#### Q-037 — Check outcome and elapsed time as executor inputs

| Field | Content |
|---|---|
| Priority / Category | High / ARCHITECTURE |
| Related | D-015, D-014, Q-025 (source reconciliation) |
| Affected | G6 executor trust boundary |
| Question | How does the Mechanics check outcome (success or failure, take 10/20 if allowed) and the required time (10 minutes to a week) reach the executor: as a roll made through the existing roll engine and passed as a validated server-side input, or as a GM confirmation; and is elapsed time recorded or only displayed? |
| Known facts | The sources require a Mechanics check with a DC and a duration, and the executor must trust neither client data nor invent a clock. No time-passing engine is cited in the audits. |
| Sources | S&V p. 39; architecture section 5 |
| Options | (a) Check rolled via the existing roll path, outcome passed as validated input; time informational. (b) GM confirms outcome; time informational. (c) Integrate with a world-time system if one exists (not yet identified). |
| Suggested resolution | Decide after the Q-025 source reconciliation fixes what the check must enforce (an owner question arises only if Q-025 finds a genuine ambiguity). |
| Who answers | Claude + ChatGPT |
| Decision impact | Install and removal flow. |
| Status | BLOCKED_BY_DEPENDENCY (Q-025 source reconciliation) |
| Answer | |
| Resolution evidence | |

#### Q-038 — Where failed and deactivated states live (E-2)

| Field | Content |
|---|---|
| Priority / Category | Medium / ARCHITECTURE |
| Related | D-014, E-2 |
| Affected | Installed-state shape |
| Question | Instance records are identity-only. If Q-023 and Q-024 define failed or deactivated states, do they extend the record, live in a separate flag, or stay outside the model? |
| Known facts | The canonical flag path is used; E-2 chose identity-only records. |
| Sources | Architecture 3.3, E-2 |
| Options | Depends on the owner's answers. |
| Suggested resolution | Do not design until Q-023 and Q-024 are answered. |
| Who answers | Claude + ChatGPT |
| Decision impact | Instance schema. |
| Status | BLOCKED_BY_DEPENDENCY (Q-023, Q-024) |
| Answer | |
| Resolution evidence | |

#### Q-039 — Lightsaber generator and crystal map trace (E-9)

| Field | Content |
|---|---|
| Priority / Category | Medium / IMPLEMENTATION |
| Related | E-9, D-011 |
| Affected | `lightsaber-construction-engine.js`, `lightsaber-crystals-map.js`, `packs/lightsaber-crystals.db` (28), `packs/lightsaber-accessories.db` (10), registry (34 crystals, 10 accessories) |
| Question | Which module is the authoritative writer of the lightsaber packs, and how does data flow from map to packs to registry? |
| Known facts | Disposition is NEEDS-TRACE; owner requirement: trace before dispositioning; do not hand-edit packs, fix at the generator. |
| Sources | Legacy inventory rows; architecture E-9 |
| Options | Determined by the trace. |
| Suggested resolution | Claude traces (read-only) once Q-006 returns, so the trace is interpreted with the certified rules. |
| Who answers | Claude + ChatGPT |
| Decision impact | Lightsaber consumer re-pointing (G6); pack data. |
| Status | BLOCKED_BY_DEPENDENCY (Q-006) |
| Answer | |
| Resolution evidence | |

#### Q-040 — Force Alchemy services trace (E-10)

| Field | Content |
|---|---|
| Priority / Category | Medium / IMPLEMENTATION |
| Related | E-10 |
| Affected | `apps/force-alchemy/*` (5 files) |
| Question | How do the Force Alchemy services interact with item upgrades, and which parts become consumers of V2? |
| Known facts | Disposition is NEEDS-TRACE; RETAIN as a specialization with its own state. |
| Sources | Legacy inventory; architecture E-10 |
| Options | Determined by the trace. |
| Suggested resolution | Trace after Q-008. |
| Who answers | Claude + ChatGPT |
| Decision impact | Specialist consumer boundary. |
| Status | BLOCKED_BY_DEPENDENCY (Q-008) |
| Answer | |
| Resolution evidence | |

#### Q-041 — Foundry runtime for G7 integration tests

| Field | Content |
|---|---|
| Priority / Category | High / ARCHITECTURE |
| Related | Architecture 3.5, G7 |
| Affected | `FOUNDRY_TESTED` certification |
| Question | Which Foundry v13 runtime (local licensed instance, CI container, manual script) will run the isolated certification route, and who runs it? |
| Known facts | Route 3.5 defines first-time certification without circularity; offline suites run in CI; no document names a Foundry runtime. |
| Sources | Architecture 3.5, section 7 (G7) |
| Options | Open: a written manual smoke script plus a developer-run instance, or automation. |
| Suggested resolution | Answer before G7. Not a rules question. |
| Who answers | Claude + ChatGPT; the owner confirms who can run a Foundry instance |
| Decision impact | No definition can be `FOUNDRY_TESTED` without it. |
| Status | UNANSWERED |
| Answer | |
| Resolution evidence | |

#### Q-042 — Handling of existing worlds' legacy-shaped data at cutover

| Field | Content |
|---|---|
| Priority / Category | Medium / ARCHITECTURE |
| Related | Architecture G9, E-7; Phase 1a D17 |
| Affected | Items carrying legacy installed-upgrade flags |
| Question | Is a one-time migration required, or does development-world data get replaced via the optional reset (owner authorization, Q-032), so that no legacy reader is built? |
| Known facts | Phase 1a retains legacy-evidence handling until cutover; removal is a contract amendment at G9. |
| Sources | Architecture E-7; Phase 1a contract D17 |
| Options | (a) No migration; rely on reset. (b) Write a migration. |
| Suggested resolution | Decide with Q-032. |
| Who answers | Claude + ChatGPT, then the owner (Q-032) |
| Decision impact | Scope of G9. |
| Status | BLOCKED_BY_DEPENDENCY (Q-032) |
| Answer | |
| Resolution evidence | |

### 4B. Already specified by approved architecture (compact; not reopened)

These were decided and merged. They are listed so the questionnaire is complete and so no one re-asks them. Fields not shown are blank or inapplicable (Answer = the stated decision; Priority = n/a).

| ID | Topic | Category | Resolved by (evidence) | Status |
|---|---|---|---|---|
| Q-043 | Install/remove time, DC, retry timing, removal DC-5, destruction on failed expedited removal | SOURCE_VERIFICATION | S&V p. 39 verified (PR #1043); `d-001-install-remove-pdf-verification.md`; register D-001 lifted | ALREADY_RESOLVED |
| Q-044 | One slot authority (Phase 1a `ModificationSlotAuthority`), injected, never imported by consumers | ARCHITECTURE | Phase 1a contract; guard test | ALREADY_RESOLVED |
| Q-045 | Clean replacement of the legacy system, not wrapping | OWNER_POLICY | Owner "Architectural Direction Addendum" | ALREADY_RESOLVED |
| Q-046 | Unknown price is never zero | OWNER_POLICY | Owner ruling; Phase 1b J5 | ALREADY_RESOLVED |
| Q-047 | Weapon, armor and equipment domains are separate; typed definition ids | ARCHITECTURE | Phase 1b J8; runtime schema | ALREADY_RESOLVED |
| Q-048 | Trusted offline producer, frozen validated handle, caller-supplied status never trusted | ARCHITECTURE | G1; `modification-snapshot-producer.mjs` | ALREADY_RESOLVED |
| Q-049 | Facts versus complete mechanic (`PUBLISHED_FACTS` never `MECHANIC_SPECIFIED`) | ARCHITECTURE | PR #1043; generator 1.3.0 | ALREADY_RESOLVED |
| Q-050 | Lift mechanics (pinned scope rows, appended lift rows, evidence files must exist) | ARCHITECTURE | Generator and register enforcement | ALREADY_RESOLVED |
| Q-051 | Non-installability guards G1-G5; selectability conditions (3.4) | ARCHITECTURE | Architecture 3.4; validator | ALREADY_RESOLVED |
| Q-052 | Removal identity is exactly one `{instanceId, typedDefinitionId, domain}` | ARCHITECTURE | G3 (PR #1042 correction) | ALREADY_RESOLVED |
| Q-053 | Interim read-only planning; planner always reports `EXECUTOR_NOT_CERTIFIED` | ARCHITECTURE | G3 offline engines doc | ALREADY_RESOLVED |
| Q-054 | G8 loader packaging allowlist and external integrity pin (proposal; approved separately at G8) | ARCHITECTURE | Architecture 4.5 | ALREADY_RESOLVED (design); approval at G8 |
| Q-055 | Droid and vehicle modification excluded; legacy tests removed with their UI, rule-bearing tests kept or replaced (E-8) | OWNER_POLICY | Project standing rules; architecture E-8 | ALREADY_RESOLVED |
## Part 5 — Dependency matrix

### 5A. Questions to typed definitions

| Typed definitions | Count | Blocking register entries | Questions that release or route them |
|---|---|---|---|
| Governed by S&V p. 39 (published facts only) | 76 | D-014, D-015 (installProcedure); 35 of them also D-005 (host) | Q-001, Q-002 (D-015); Q-021 to Q-024 (D-014); Q-025 (general skill rules); Q-014, Q-019 (host); Q-018, Q-020 |
| KOTOR accessories | 8 | D-013 | Q-004, Q-027, Q-019 |
| KOTOR templates | 34 | D-013 | Q-005, Q-028 |
| Lightsaber crystals and accessories | 44 | D-011, D-013 | Q-006, Q-030, Q-039 |
| Tech and Biotech Specialist | 18 | D-008, D-009, D-013 | Q-007, Q-028 |
| Sith alchemy | 10 | D-013 | Q-008, Q-028, Q-040 |
| Legacy templates, heirlooms, biotech device | 19 | D-010, D-013 | Q-009, Q-028 |
| Individual items | 23 | D-013 (and D-004, D-006 for some) | Q-010, Q-013, Q-017, Q-026 |
| Not typed (structural services) | — | D-002, D-003, D-012 | Q-011, Q-012, Q-016 |
| Catalog entries with open source existence | 2 | D-007 | Q-015 |

The 156 D-013 definitions are the 232 typed definitions minus the 76 governed. Totals: 8 + 34 + 44 + 18 + 10 + 19 + 23 = 156.

### 5B. Questions to gates and functions

| Gate / function | Needs | Blocked on questions |
|---|---|---|
| G4 certified host facts and upstream corrections | Host restrictions, canonical host identity, source corrections | Q-010, Q-019, Q-035 |
| G5 effect projection (only `MECHANIC_SPECIFIED`) | Classified effects; combat consumption trace; Trained Only / check rules | Q-020, Q-034, Q-025 |
| G6 workbench, `CommandBus`, executor | Atomic strategy; command/payload; check and time inputs; failed/deactivated states; specialist consumers | Q-033, Q-036, Q-037, Q-038, Q-039, Q-040, Q-029 |
| G7 Foundry v13 tests (isolated route) | A Foundry runtime and a smoke script | Q-041; every selectable definition needs lifts first |
| G8 runtime loader | Packaging allowlist, external integrity pin (proposal approved separately) | Q-054 (design settled); needs an independent G8 approval; no loader exists |
| G9 cutover | Deletion authorization, macro policy, reset authorization, migration decision | Q-031, Q-032, Q-042 |
| Planner and slot closure for newly released definitions | Slot cost and price certification | Q-018 |
| Retry, scratch-built and expedited-removal planning | Owner rulings | Q-021, Q-022 |
| Slot accounting for Retractable Stock, structural gains, powered armor, size increase | Source records | Q-013, Q-011, Q-016, Q-012 |

### 5C. Question-to-question dependencies

```text
Q-001, Q-002  ──▶ Q-025 (source reconciliation) ──▶ Q-037
Q-025 ─ owner escalation only if a genuine ambiguity is found
Q-004         ──▶ Q-027
Q-005, Q-008, Q-010 ──▶ Q-028
Q-006         ──▶ Q-039 ; Q-030 (stacking, only if ambiguous)
Q-008         ──▶ Q-040
Q-019         ──▶ Q-035
Q-021..Q-024 ──▶ Q-038
Q-032         ──▶ Q-042
Part 2 returns ──▶ Q-030
```

Nothing in Part 2 depends on another question, so all of Part 2 can be answered in parallel.

## Part 6 — Consolidated answer sheet

Answer by number. Each line is a group; the group's question IDs are in brackets. Blank = not yet answered.

### Section A — ChatGPT: return these certification records

| # | Return | Questions | Covers (research scope; certification per definition or uniform family) |
|---|---|---|---|
| A1 | Core Rulebook p. 69 (Mechanics) record | Q-001 | D-015 evidence |
| A2 | S&V pp. 37-41 requirement check (training, tool, workshop) | Q-002 | D-015 evidence |
| A3 | Errata / printing check | Q-003 | Risk register |
| A4 | KOTOR pp. 75-76 accessory record | Q-004 | 8 definitions |
| A5 | KOTOR template application rule | Q-005 | 34 definitions |
| A6 | Lightsaber record (JATM pp. 54, 60; KOTOR crystals), parts (a)-(e) | Q-006 | 44 definitions, D-011 |
| A7 | Tech Specialist / Superior Tech / Biotech Specialist record | Q-007 | 18 definitions, D-008, D-009 |
| A8 | Sith alchemy record | Q-008 | 10 definitions |
| A9 | Legacy Era record (pp. 66, 100, 101; heirloom; biotech device) | Q-009 | 19 definitions, D-010 |
| A10 | Individual-item records (23) and the upstream corrections | Q-010 | 23 definitions |
| A11 | S&V structural records: stripping (pp. 37-38), size increase (pp. 38-39), powered armor (p. 37), Retractable Stock (p. 42 / Table 2-4) | Q-011, Q-012, Q-016, Q-013 | D-002, D-003, D-012, D-004 |
| A12 | Table 2-3 universal upgrades hosts (16 upgrades) | Q-014 | D-005, 35 definitions |
| A13 | Computerized Interface Scope / Night Vision Device search | Q-015 | D-007 |
| A14 | Componentization / Excellent Kit price confirmation | Q-017 | D-006 evidence |
| A16 | Reconcile Core p. 60 (take 10/20), Trained Only and S&V p. 39 failure consequences for the Table 2-2 check | Q-025 | D-015 / executor check contract |
| A15 | Slot cost, price, host restriction and effect classification, returned inside A4-A12 records | Q-018, Q-019, Q-020 | Component certification |

### Section B — Project Owner: decisions (goal: 10 meaningful decisions, most only after Section A)

| # | Decision | Questions | Due |
|---|---|---|---|
| B1 | D-014 package: what an installation attempt costs; expedited removal at the shortest increment; deactivated-state meaning and slot occupancy; failed-installation state (each: stay blocked and table-adjudicated, or you state the rule) | Q-021, Q-022, Q-023, Q-024 | Now (source already examined and silent) |
| B2 (conditional) | Only if A16 finds a genuine unresolved ambiguity or conflict about Trained Only / take 10 / take 20 on the Table 2-2 check | Q-025 escalation | After A16; may never be needed |
| B3 | Policy for unpriced modifications | Q-026 | Now (A14 may shrink it) |
| B4 | Policy where a book is silent on installation | Q-027 | After A4 |
| B5 | Classification of items that are not generically installed (templates, heirlooms, alchemy, specialist traits): not eligible / specialist system / non-selectable reference; registry unchanged | Q-028 | After A5, A8, A10 |
| B6 | Whether a GM manual-outcome path exists for deferred mechanics | Q-029 | Before G6 |
| B7 | Conditional rulings (stripping, size increase, stacking, powered armor, etc.), only if A shows a gap | Q-030 | After Section A |
| B8 | Legacy macro compatibility policy | Q-031 | At G9 |
| B9 | Authorization for deletion and for a prerelease character reset (separately) | Q-032 | At G9 |

### Section C — Claude + ChatGPT: engineering work to schedule (no owner input unless noted)

| # | Work | Questions |
|---|---|---|
| C1 | Atomic install/remove strategy with failure-injection tests | Q-033 |
| C2 | Combat consumption trace for weapon projections | Q-034 |
| C3 | Host identity for armor and equipment | Q-035 |
| C4 | `CommandBus` command and payload | Q-036 |
| C5 | Check outcome and time inputs | Q-037 |
| C6 | Failed/deactivated state storage | Q-038 |
| C7 | Lightsaber and Force Alchemy traces | Q-039, Q-040 |
| C8 | Foundry runtime for G7 | Q-041 |
| C9 | Legacy data handling at cutover | Q-042 |

## Part 7 — Source verification queue (books and pages, consolidated)

| Book | Printed pages / sections | Questions | Notes |
|---|---|---|---|
| Star Wars Saga Edition Core Rulebook | Taking 10 / taking 20 conditions p. 60 (reviewer-reported; not seen by the implementer); Mechanics pp. 68-70 (p. 69 outstanding); Modifying Droids p. 197 only for context, droids out of scope | Q-001, Q-025 | pp. 68 and 70 already read visually; p. 60 to be certified under Q-025 |
| Scum and Villainy | pp. 37-41 (capacity, stripping pp. 37-38, size increase pp. 38-39, Installing Upgrades p. 39, Table 2-2 p. 39, Table 2-3 pp. 40-41 and each upgrade's text, p. 42 Table 2-4) | Q-002, Q-011 to Q-014, Q-016 | p. 39 already verified for the 76 |
| Knights of the Old Republic Campaign Guide | pp. 75-76 accessories and Table 5-6; gear templates section; crystals; powered armor; Sith alchemy | Q-004, Q-005, Q-006, Q-008, Q-016 | Page numbers for templates and crystals to be confirmed by the reviewer |
| Jedi Academy Training Manual | pp. 54, 60; Sith alchemy; crystals; accessories | Q-006, Q-008 | |
| Starships of the Galaxy | p. 21 Tech Specialist table and surrounding text | Q-007 | |
| Superior Tech source | Not located | Q-007 | Locating is part of the task |
| Legacy Era Campaign Guide | pp. 66, 100, 101; heirloom and biotech specialist pages | Q-007, Q-009 | |
| Galaxy of Intrigue | p. 68 Componentization; Holo Converter; Flash Suppressor / Silencer | Q-010, Q-017 | |
| Rebellion Era Campaign Guide | p. 43 Excellent Kit; Computerized Interface Scope; Stygian polymer armor; jury-rigged pack bomb | Q-010, Q-015, Q-017 | Scope is OCR-only so far |
| Clone Wars Campaign Guide | Military Engineer sabotage device; Halo Lamp | Q-010 | |
| The Force Unleashed Campaign Guide | Felucian shaman infusion; Manual Trigger | Q-010 | |
| Galaxy at War | Ion shielding cybernetic prosthesis; stun cloak options | Q-010 | |
| Official web enhancement | Outlaw Tech personalized modifications | Q-010 | |
| All of the above | Errata or revised printings | Q-003 | |

Order of work that minimizes rework: A1/A2 (D-015) and A4 (KOTOR accessories) first, because they unblock the two largest owner groupings; then A5, A6 (78 definitions together); then A12 (35 definitions); then the remainder.
