# SWSE Droid Component Canonicalization and Garage / Chargen / Store Refactor — Fresh-Chat Handoff

**Date verified:** 2026-11-02  
**Repository:** \`docflowGM/foundryvtt-swse\`  
**Branch:** \`audit/droid-publication-census-2026-10-29\`  
**Verified pre-handoff HEAD:** \`93198a3c728e65f135f52c3508f80ee7c76f66d7\`  
**Mission:** Independently certify published SWSE droid-component identities, costs, installation/eligibility rules, action/resource mechanics and provenance, then prepare an evidence-driven one-catalog refactor for Garage, PC/follower chargen, and Store. Do not conflate this with published stock-droid statblock hydration or claim runtime behavior without testing.

## 1. Project context and owner intent

This is the \`foundryvtt-swse\` implementation of *Star Wars Saga Edition* in Foundry VTT v13, converging on its V2 architecture. The owner wants the Droid Garage, Droid Builder and Store to offer **every canonically supported droid part**, correctly priced, mechanically accurate and equally legal across all entry points. Source is the printed books; code and existing packs are implementation targets, not printed-rule authority.

Continue actual work in rolling source-verified batches, **commit and push each meaningful sprint**, and verify exact GitHub readback and branch HEAD. Do not merely provide plans if the user says "continue"/"keep trucking." Do not merge to \`main\` without explicit owner authorization. Do not change production component definitions or world actors as part of source-evidence work without authorization. The user has assigned later post-merge Foundry runtime implementation/testing to **Claude** in the related stock-droid track; the next ChatGPT must explicitly distinguish source certification, migration specification, permitted code work and runtime acceptance rather than silently claiming all these happened.

### Important separate project: published stock-droid canonicalization

- Frozen publication census: **234 source-specific statblock claims** over 14 books. They are publication claims, **not 234 unique purchasable model families**.
- *Scavenger's Guide to Droids* (SGD): **46/46 source-structure hydrated** (most recent completed YVH-Series Battle Droid, SGD-DROID-046, printed pp.158–159).
- Strict source-mechanical stock-droid certifications: **0/46 SGD**, **0/234 overall**. Foundry runtime not tested.
- The stock record field \`systems.installed[]\` is an **audit of items printed on a specific stock model**, not the authoritative Garage's purchasable part catalog. Do not copy stock parts into player store listings or assume printed installed means factory-equipped, active, PC-legal or attack-executable.
- Independent stock-model source ledger: \`data/canonical/droids/source-books/sgd.json\`.
- Stock hydration closeout: \`data/audits/droids/sgd-mechanical-hydration-closeout.json\`.
- Full checkpoint: \`docs/audits/droids/sgd-closeout-and-component-catalog-sprint-001.md\`.

## 2. Already-completed canonical component census — DO NOT REDO FROM ZERO

The authoritative earlier Phase 0-3H identity/presence census is in \`docs/audits/item-canonicalization-rolling-authority.md\`, section "Droid systems: census and repo reconciliation" (2026-10-05 baseline). It counted:

| Measure | Baseline |
|---|---:|
| Published canonical droid component identities | **122** |
| Core Rulebook identities | 55 |
| SGD identities | 67 |
| Represented in existing registry | 99 |
| KEEP | 92 |
| EDIT: rename/variant reconciliation | 7 |
| ADD: missing published identity | 23 |
| Repo-only or unsupported candidates | 5 |

Those are **identity/presence counts**, NOT 122 complete source-mechanical certificates. The baseline also measured **112 returned \`getAllDroidPartDefinitions()\` records**, **105 unique displayed names**, and **84 raw \`DROID_SYSTEMS\` IDs; these are October 5 observations, not guaranteed current counts.** Duplicate aliases and implementation variants prevent using 112 as a count of distinct published parts.

**New machine-readable frozen migration queue:** \`data/audits/droids/component-canonical-migration-backlog.json\`. It has **35 items = 23 ADD + 7 EDIT + 5 repo-only**, with source status and explicit nonproduction guardrails. Created/read-back verified 2026-11-02. Do not report those 35 as implemented.

### All 23 missing published component identities (ADD candidates)

1. Diagnostics Package
2. Internal Storage
3. Spring-Loaded Mechanism
4. Locked Access
5. Antitheft Comlink Locator
6. Collapsible Construction
7. Courier Compartments
8. Droid Oil Bath
9. Earphone Binary-to-Basic Translator
10. Emergency Oxygen Supply
11. Holographic Game System
12. Interference Generator
13. Remote Viewer
14. Rental Restraining Bolt
15. Repulsorcam
16. Silence-Bubble Generator
17. Space-Beacon Launcher
18. Video Screen
19. Voice-Print Command Lock
20. Droid Battle Station
21. Droid Command Station
22. Droid Recharge Station
23. Droid Socket

Four of these 23 now have PDF-reviewed source facts: Antitheft Comlink Locator, Collapsible Construction, Repulsorcam, Silence-Bubble Generator. **19 missing ADD candidates still need an individual source-fact review.** "ADD" means canonical source identity exists but **does not authorize creating a production item before full certification/migration review**.

### All seven EDIT identities

| Printed canonical identity | Existing representation | Reconciliation |
|---|---|---|
| Remote Processor | \`remote\`, Remote Processor (External) | Rename or canonical alias |
| Secondary Battery | \`battery-backup\` / Battery Backup System | Canonical alias |
| Translator Unit | Basic / Advanced / Universal Translator | **One published identity**, with printed variants |
| Projectile Hand | \`projectile-appendage\` | Rename/alias |
| Laminanium Plating | Light and heavy plating entries | **One published identity**, light/heavy table variants |
| Communications Countermeasure System | \`communications-countermeasures\` | Rename/alias |
| Weapon Detector | \`weapon-detector-package\` | Rename/alias |

Do not collapse legitimately distinct published SR 5/10/15/20 shields or distinct Hardened Systems variants merely to simplify catalog identity.

### Five repo-only / unsupported candidates

- \`military\` (Military Processor)
- \`manipulator-arm\` (Manipulator Arm)
- \`repulsor-lift\` (Repulsor Lift)
- \`self-repair-kit\` (Self-Repair Kit)
- \`miniaturized-self-destruct-system\` (Miniaturized Self-Destruct System)

These are **review/remove/remap candidates, not permission to delete them**. In particular \`miniaturized-self-destruct-system\` is consumed by **live damage mechanics**, so migration must preserve that behavior even if the item identity changes. Saved actor/world references and legacy aliases must be checked first.

## 3. Existing live V2 architecture: single-source-of-truth boundaries

**Underlying broad system data:** \`scripts/data/droid-systems.js\` (\`DROID_SYSTEMS\`). Includes source-like names, descriptions, costs, weights, cost formulas, restrictions; the progression Droid Builder directly reads this data.

**Canonical live droid-part registry:** \`scripts/data/droid-part-schema.js\`. It overlays \`DROID_SYSTEMS\` with \`RAW_OVERLAY\` and exports \`getDroidPartDefinition()\`, \`getAllDroidPartDefinitions()\`, \`normalizeDroidPartId()\`, \`hydrateDroidPart()\`, \`computeDroidPartCost()\`, \`computeDroidLocomotionCost()\`, and related functions. This is the **Garage/sheet/runtime part definition authority**. Do not fork an app-local registry or add pricing to the separate prerequisite compatibility module.

**Garage mutation:** \`scripts/engine/customization/droid-customization-engine.js\` via \`DroidCustomizationEngine\`. \`getAvailableSystems()\` iterates \`getAllDroidPartDefinitions()\`; preview calculates price; apply goes through \`TransactionEngine\` / \`ActorEngine\`. Current code enforces some restrictions (such as primary/backup processors); that is NOT evidence that every published prerequisite or action is enforced.

**Garage UI:** \`scripts/apps/customization/customization-bay-app.js\`. Existing Modify/Browse works. Previous audit documented Store Quote, Chargen Draft and Build New as future/nonfunctional contexts; do not claim these are equivalent working builder flows without re-verifying. An older Garage/Shipyard audit reported an incorrect wallet actor in Asset Bay, but later patches/work may have changed this: **trace current code before treating that historic issue as still open**.

**PC/normal chargen:** \`scripts/apps/progression-framework/steps/droid-builder-step.js\` reads \`DROID_SYSTEMS\` directly and implements degree/size, categories, credit budgets, core defaults, selections and validation. Code presently seeds free heuristic processor, default locomotion and two hands for some PC flows; distinguish the **currently coded behavior** from independently verified printed rules. Store "Build Custom Droid" directs into this progression workflow.

**Follower droid chargen:** \`scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js\` shares the mature base builder and applies follower-specific chassis constraints. See \`docs/audits/follower-droid-chassis-step-consolidation-phase-6.md\`. Preserve this constrained mode; do not accidentally treat follower permissions as ordinary PC rights.

**Store:** \`scripts/apps/store/store-checkout.js\` delegates custom droid building through the progression flow (\`createCustomDroid\` → \`buildDroidWithBuilder\`), not the Garage UI. Stock-droid purchases use the Store/transaction/actor-creation path. Future Store part pricing must match the canonical registry without a separate invented part-price table.

**Runtime installed-component state:** \`system.installedSystems\` is **authoritative after creation**. \`system.droidSystems\` can be chargen draft/stock snapshot and is not an equally authoritative installation store. Embedded Items and old mods have lower-precedence compatibility roles. Common read model: \`scripts/domain/droids/droid-installed-component-resolver.js\`. Read authority documentation \`docs/audits/droid-authority-consolidation-phase-1.md\` and \`-phase-2.md\`.

**Separate prerequisite module:** \`scripts/domain/droids/droid-part-schema.js\` is for identity/feat or talent prerequisites; despite its name it is not a second price/effect registry to maintain. Prior Phase 1 deliberately separated it.

**Legacy standalone builder:** \`scripts/apps/droid-builder-app.js\` has temporary placeholder catalogs (e.g., Simple/Standard/Advanced/Elite Processor). Prior audits report it is effectively unused. It is **not** canonical and must not be repurposed as published source evidence.

**Compendium placement:** Structural droid systems should **not** be copied into \`packs/equipment.db\`. Ordinary character equipment and integrated weapon Items retain their own V2 equipment/combat ownership. Respect universal equipment/weapon/mount state rather than creating a competing droid attack engine.

## 4. Completed component source-fact Sprint 001 — eight of the catalog candidates

Machine evidence: \`data/audits/droids/component-source-facts-sgd-sprint-001.json\`. Visually inspected relevant *Scavenger's Guide to Droids* **printed pp.55, 58, 59, 62** and source rules; audit-only, **no live registry changes and zero end-to-end certifications**.

| Component | Printed credits | Printed weight | Status | Key mechanical fact / blocker |
|---|---:|---:|---|---|
| Scomp Link | 100 | 1 kg | Overlay-only existing | +2 equipment bonus to Use Computer to Access Information when computer is Helpful/Friendly. **Confirmed static defect:** no cost; shared cost function can return 0. |
| YV Sensor Package | 1,000 | 3 kg | Existing | +10 Perception to detect Yuuzhan Vong within **12 squares and line of sight**, Military. Existing catalog says "NOT available at chargen"; cited passages don't establish universal ban. Do not simply remove rule without wider audit. |
| Sensor Booster | 200 | 5 kg | Existing | Up to **2 km sensor range** with Sensor Pack. Registry permits Improved Sensor Package alternative; printed equivalence not yet proven. |
| Sensor Countermeasure Package | 1,000 | 2 kg | Existing | Opposed Use Computer vs Perception, **nonvisual sensor detection**; not a blanket Stealth bonus; verify actual contest engine. |
| Silence-Bubble Generator | 3,500 | 20 × cost factor kg | **Missing** | Standard action, 3-square radius, -10 Perception for outside listener trying to hear inside. |
| Repulsorcam | 1,000 | 20 kg | **Missing** | Detach and operate within 12 squares, speed 4, 2-hour recording, Ref 16/Fort 10, 4-hour cell; optional separate charger +150 credits. Separate object/control/resourcing proof required. |
| Antitheft Comlink Locator | 100 | 0.5 kg | **Missing** | Trackable covert distress signal to master's comlink, continues after deactivation until destroyed. |
| Collapsible Construction | 2,000 × cost factor | 10 × cost factor kg | **Missing** | Size reduced one category **while shut down**, standby brain, reactivation standard action. Not a standing active combat-size bonus. |

**Important:** A source-fact set verified is NOT a release-mechanically-certified part. For these eight, **0/8** are certified end-to-end across price, installation, modifiers, chargen and Store. No tests were executed demonstrating those three applications' parity. In \`component-source-facts-sgd-sprint-001.json\`, each entry has precise source and finding IDs.

### Specific Scomp Link pricing defect

\`'scomp-link'\` is in \`RAW_OVERLAY\` but is not backed by a \`DROID_SYSTEMS\` row specifying 100 credits/1 kg. \`getDroidPartDefinition('scomp-link')\` yields no substantive price, and \`computeDroidPartCost()\` can reach a fallback of **0 credits**. This is static source-vs-repo evidence, **not a reproduced purchase at Foundry runtime**. Correct this only through a controlled source-certified registry migration, with cost and application parity tests; do not invent a second price source.

## 5. Required definition-level certification contract

For every distinct canonical printed part, record at least:

1. **Identity:** stable canonical ID; exact printed name; sourcebook and **printed page**; exact variant relationships; existing names/aliases; source confidence and unresolved ambiguity.
2. **Acquisition:** published credits, formulas / cost factor, currency and size dependencies, weight and weight formula, availability/restriction labels, GM approval requirements if actually implemented as policy; explicitly distinguish availability from PC chargen prohibition.
3. **Installation host:** droid size/degree/processor prerequisites, slots and **physical location**, appendage count, exclusivity, capacity, power/processor/receiver interactions, equipment vs chassis distinction, install/removal requirements, upgrade/replacement and what is factory vs separately carried.
4. **Runtime mechanical specification:** passive modifiers with target/bonus type, stacking, prerequisite and trigger, action type and frequency, range/radius, target defenses and opposed checks, duration, ammunition/charge usage, cooldown, disabled/offline effects, integrated weapons/mount/grip and V2 combat/vehicle action ownership.
5. **Application parity:** droid Garage listing/quote/install, chargen starting choices/legal budget, follower-specific restrictions and Store new-droid request all resolve the **same certified definition and price**. State deliberately when a route must not offer the part.
6. **Evidence & acceptance:** unit/source tests, negative illegal-build cases, alias migration snapshots, post-install/remove persistence, accurate wallet debit and rollback, no duplicated effects, integration/Foundry runtime acceptance owned as agreed.

An incomplete item remains \`SOURCE_REVIEW_PENDING\`, \`BLOCKED_CONFLICT\`, \`DATA_RECONCILED\` or equivalent. **Do not manufacture a "mechanically certified" count from schema validity or presence in an array.** No executable attack/mount rights from stock statblock text alone.

### Representation constraints

- Canonical published **identity** need not equal one purchase variant, one installed instance, one UI card or one actor Item. Translator Unit and Laminanium Plating each need **one canonical identity with typed choices**.
- Keep **source rules** and **runtime effects** as separate layers; source claim \`!=\` runtime implementation.
- Unknown, unprinted, contradictory, out-of-scope or GM-house-ruled facts remain marked and provenance-linked. PDFs override TXT/OCR when ambiguous; render actual printed pages and review columns, footnotes and adjacent sidebars. OCR is an index, never sole numerical authority.
- Never convert a printed price cap, availability string or model-specific NPC system into a global chargen restriction without source proof.
- Preserve all existing saved-actor references, aliases and store linkages until a tested migration.
- Do not create a second component catalog in Garage, Store, follower builder or the general equipment pack.
- Never claim Node, Python, CI or Foundry runtime tests that were not executed.

## 6. Suggested phased workplan for the new ChatGPT

**C0 — Refresh, scope and reconcile (first action).** Fetch the actual branch HEAD; compare the four committed audit artifacts with the current code and \`docs/audits/item-canonicalization-rolling-authority.md\` Phase 0-3H. Detect newer concurrent edits. Confirm 122 published identities / 35 migration cases are still the latest audited census, not necessarily unchanged runtime counts. Preserve 46-stock-droid closeout; don't re-open its hydration to accomplish component work. Identify the existing cross-book component source count before claiming 122 is an all-14-book complete set.

**C1 — Source-fact Sprint 002: remaining missing ADD items.** Review the **19 unreviewed missing names** using Core and SGD PDFs/TXTs, starting with **Diagnostics Package, Internal Storage, Locked Access and Spring-Loaded Mechanism**. Work in meaningful batches (approximately 8–15 components), record printed book/page, price/weight/availability/formulas, prerequisites, complete mechanical rules, host interactions and unknowns. Source-check every claim against rendered PDF. Do not add production entries during this pass. Commit a machine-readable evidence packet and Markdown checkpoint, and verify Git readback.

**C2 — Canonical identity and variant reconciliation.** Source-certify the 7 EDIT families in detail; formally specify alias/variant migration and regression cases (especially Translator Unit, Laminanium Plating and Remote Processor). Independently review five repo-only candidates against all available printed sources; deletion of \`miniaturized-self-destruct-system\` is blocked by live mechanics. Reconcile all earlier 92 KEEP entries against the printed mechanics, not just their names.

**C3 — Coverage extension.** The initial 122 identities are from **Core + SGD**. Search the other official books for additional *purchasable general droid systems* rather than assuming the 122 are universally exhaustive. Separate unique NPC-only one-off systems from player-market components and record whether published purchase/installation rights exist.

**C4 — Produce the single canonical specification.** Map each distinct verified part to current \`DROID_SYSTEMS\` / \`droid-part-schema.js\`, approved variant data, source pages, formulas, legal predicates, effect/action predicates, proper V2 ownership, and migration decision. Add fail-closed validation and deterministic parity fixtures. Keep this specification as the definitive handoff for implementation rather than creating competing docs as authorities.

**C5 — Approved production migration and test.** Only after the owner authorizes an implementation tranche, propose/review minimal edits to the **existing** registry and consumers. Prefer migration-safe IDs and adapters over rewriting Garage, chargen and Store at once. Test costs/weights/availability, variant selection, cross-app visibility, illegal builds, actor snapshots, install/remove, wallet identity, transaction rollback, virtual weapon mount and action math. Leave source-only rules nonexecutable until independently implemented and accepted. Coordinate later Foundry/Claude runtime responsibility.

**C6 — Closeout.** Publish honest counts of source facts, complete source-mechanical certificates, published coverage, implemented parts, tested apps and outstanding blockers **separately**. Do not merge without owner approval.

## 7. Required first practical sprint outputs

For Sprint 002, supply:
- An actual sourcebook page audit and per-part canonical source-fact JSON with all important formulas and restrictions for the selected **unreviewed missing ADD** entries.
- A per-part registry comparison showing source-only/missing/overlay/alias/variant status; no fabricated canonical ID and no silent "best fit" source.
- A table of blockers, contradictions, conditional mechanics and needed V2 host/attack/transaction authority.
- A reproducible validation/test command or code plus exact results. Distinguish unexecuted tests from passing tests.
- A Markdown checkpoint and Git commit SHA; fetch-back verify every written file and the branch HEAD.
- An explicit next-sprint target and **no unsupported promotion to full certification**.

## 8. Mandatory starting reads and GitHub pointers

**Primary context:**

1. \`docs/audits/droids/sgd-closeout-and-component-catalog-sprint-001.md\`
2. \`data/audits/droids/component-source-facts-sgd-sprint-001.json\`
3. \`data/audits/droids/component-canonical-migration-backlog.json\`
4. \`docs/audits/item-canonicalization-rolling-authority.md\` — **Phase 0-3H**
5. \`data/audits/droids/sgd-mechanical-hydration-closeout.json\`
6. \`scripts/data/droid-systems.js\`
7. \`scripts/data/droid-part-schema.js\`
8. \`scripts/engine/customization/droid-customization-engine.js\`
9. \`scripts/apps/progression-framework/steps/droid-builder-step.js\`
10. \`scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js\`
11. \`scripts/apps/store/store-checkout.js\`
12. \`scripts/domain/droids/droid-installed-component-resolver.js\`
13. \`docs/audits/droid-authority-consolidation-phase-1.md\`, \`-phase-2.md\`
14. \`docs/audits/follower-droid-chassis-step-consolidation-phase-6.md\`

**Printed sources available to project context:** \`Star Wars Saga Edition.pdf\` / \`Core Rulebook_djvu.txt\`; \`SW Saga - Scavenger's Guide to Droids (optimized).pdf\` / \`Scavenger's Guide to Droids_djvu.txt\`, plus other Saga Edition PDFs and \`All Books_djvu.txt\`. Confirm they are mounted before reading; no text-only numerical certification.

**Latest source-state commits (all audit branch, readback verified):**
- \`98eff1b02da0d0634bed8202c91acee807e69064\` — SGD YVH 046 final source ledger hydration.
- \`d1c747831a60cdbc4373ec3a3b01e6548d8bb5ae\` — SGD 46/46 structural closeout manifest.
- \`594422a3d08b688fbaed9e215373d3dced299186\` — 8-component source-fact packet.
- \`9df555d2036cf2f221e6a2c8a7a785c86b229277\` — 35-entry canonical component migration queue.
- \`93198a3c728e65f135f52c3508f80ee7c76f66d7\` — unified checkpoint documentation (pre-handoff branch HEAD).

**GitHub connector:** Use \`tools.mcp__GitHub__fetch_file\`, \`create_file\`, \`update_file\`, \`compare_commits\` inside \`functions.exec\`; don't guess repository paths/commit state or claim a commit before exact readback. Container cloning of GitHub failed previously due network resolution; GitHub connector is available. PDFs/TXTs are project attachments available in \`/mnt/data\` when mounted. Use rendered PDF pages whenever source text is ambiguous.

**Validation context:** \`tools/verify-item-weapons-authority.mjs\` is the item canonicalization verifier. The stock-droid \`tools/audits/droids/verify_sgd_ledger.py\` is separate and was committed without running against remote ledger. Custom JS structure/null-state checks did run for all 46 SGD source records; **do not reinterpret those as component catalog/runtime tests**.

## 9. Instructions to act on immediately

Begin by verifying HEAD and loading the committed component backlog and first source-fact packet. Then **perform Source Component Sprint 002** on missing published entries, starting with Diagnostics Package / Internal Storage / Locked Access / Spring-Loaded Mechanism. Do actual source review, commit evidence/checkpoint, and report exact numbers. Ask for owner adjudication only on irreducible conflicting published rules or permissions; otherwise keep moving and flag unresolved mechanics. Do not divert into the 234-stock-droid source-entry project except when a published statblock provides relevant **nonauthoritative corroboration** for a component.

**Final distinction to preserve:** identity enumerated ≠ source rules certified ≠ catalog migrated ≠ implementation tested ≠ Foundry runtime certified. The end state is **one actual canonical source-backed part authority** consumed consistently by Garage, chargen and Store, with legitimate exceptions clearly modeled and tested.
