# SWSE Prestige-Class Talent-Tree Access — Primary-Source and Repository Audit

**Date:** 2026-11-15
**Type:** Source-backed, read-only corrective audit and handoff. No production pack, class baseline, rules engine, or survey runtime has been modified.
**Repository snapshot:** \`docflowGM/foundryvtt-swse\`, \`refactor/mentor-surveys-v2-cutover\` @ \`b9b3750aed4059d1ccd0fa656979ce10e35b9ff1\` (current snapshot inspected). The audit is independently published for use by the V2 class/tree authority and Claude survey cutover.
**Primary authority:** Visually inspected page images from the user-supplied *Star Wars Saga Edition Core Rulebook*, *Scum and Villainy*, *The Force Unleashed Campaign Guide*, and *Scavenger's Guide to Droids*. TXT OCR was used for location, not sole certification.
**Repository authority inspected:** \`packs/classes.db\` (37 classes), \`packs/talent_trees.db\` (177 tree records), \`data/fixes/class-talent-tree-bindings.json\` (35 bindings).

## Executive findings

1. **Jedi Knight has explicit cross-class tree access.** Core p.217–218 permits Armor Specialist (Soldier), Lightsaber Combat (Jedi), Duelist, and Lightsaber Forms. Do not limit Jedi Knight to a self-named Jedi Knight tree; do not infer unrestricted access to *every* Jedi or Soldier tree.
2. **Sith Apprentice also has explicit cross-class tree access.** Core p.222–223 permits Armor Specialist, Lightsaber Combat, Duelist, and Sith. Additional trees in the current pack require per-book expansion verification, not deletion merely because Core lists four.
3. **Jedi Master has a broader Force alternative, not automatic inheritance of all Jedi Knight trees.** Core p.220: Duelist OR any eligible Force talent tree in Chapter 6, subject to prerequisites and tradition rules. **Lightsaber Forms is not granted by this sentence**, despite being a Jedi Knight tree.
4. **Sith Lord has the equivalent Force alternative.** Core pp.224–225: Sith OR any eligible Force talent tree in Chapter 6, subject to prerequisites.
5. **Force Disciple has the same overlooked Force alternative.** Core p.215: Force Adept OR any eligible Force talent tree in Chapter 6. The repository currently lists only Force Adept.
6. **General Force talents have a second, universal access route.** Core p.100: any Force Sensitive character receiving an ordinary talent may choose from the four general Force trees (Alter, Control, Dark Side, Sense), and a qualifying Force-tradition member may select from the relevant tradition tree. Dark Side has its own Dark Side Score condition. This is not prestige inheritance and should be modeled as a *conditional, global alternative at the talent-selection step*, not merely hard-coded as additional always-legal trees on individual class records.
7. **Charlatan Fortune is a confirmed omission.** *Scum and Villainy* p.31 states that a Charlatan may select from Trickery, Disgrace, or Fortune. The class pack and class-to-tree bindings list only the first two. Fortune exists as a canonical tree record.
8. **Independent Droid's Elite Droid access is printed expansion content, not a spurious tree.** *The Force Unleashed Campaign Guide* p.47 initially grants Autonomy and Specialized Droid. *Scavenger's Guide to Droids* pp.28–29 adds new Independent Droid talents and a **New Elite Droid Talent Tree** explicitly within the Independent Droid prestige-class section. Preserve all three authorized trees.
9. **Independent Droid also has a positional ID defect.** Its \`talentTreeIds\` array is ordered Specialized Droid / Elite Droid / Autonomy, but \`talentTreeSourceIds\` points by index to Autonomy / Specialized Droid / Elite Droid. Its Autonomy UUID is dashed and differs from the 32-hex compendium \`_id\`. Neither index-zipping nor the bad UUID is safe.
10. **Assassin and Infiltrator each retain a raw display-name string in the \`system.talent_trees\` ID array.** Their separate \`talentTreeSourceIds\` and UUID lists correctly resolve GenoHaradan and Bothan SpyNet. Repair the raw fields using the protected baseline process; do not invent trees.

## Primary-source talent-access matrix

| Class | Printed rule / accessible trees | Exact source | Current repository | Disposition |
|---|---|---|---|---|
| Jedi Knight | Armor Specialist; Lightsaber Combat; Duelist; Lightsaber Forms | Core pp.217–218, Class Features → Talents | Pack includes all four plus later-book Jedi trees | Core baseline **certified**; audit added trees against their own source before activation |
| Sith Apprentice | Armor Specialist; Duelist; Lightsaber Combat; Sith | Core pp.222–223, Class Features → Talents | Pack includes four plus Sith Alchemy and Sith Commander | Core baseline **certified**; two additions require expansion provenance |
| Jedi Master | Duelist; **any eligible Chapter 6 Force talent tree** | Core p.220, Class Features → Talents | Pack/binding list only Duelist | **Missing eligible Force alternative**; do not grant every Jedi Knight tree |
| Sith Lord | Sith; **any eligible Chapter 6 Force talent tree** | Core pp.224–225, Class Features → Talents | Pack/binding list only Sith | **Missing eligible Force alternative**; do not grant every Sith Apprentice tree |
| Force Disciple | Force Adept; **any eligible Chapter 6 Force talent tree** | Core p.215, Class Features → Talents | Pack/binding list only Force Adept | **Missing eligible Force alternative** |
| Charlatan | Trickery; Disgrace; Fortune | *Scum and Villainy* p.31, Class Features → Talents | Pack/binding list Trickery, Disgrace; Fortune tree record exists | **Definite omission** |
| Independent Droid | Autonomy; Specialized Droid; plus Elite Droid added by subsequent supplement | *Force Unleashed* p.47; *Scavenger's Guide to Droids* pp.28–29 | Pack three; binding two; source-ID positions misaligned and UUID malformed | **Preserve Elite Droid** and repair registry bindings, ordered alignment and UUID |
| Infiltrator | Camouflage; Spy; Infiltration; Bothan SpyNet | *Force Unleashed* p.49 | Pack has canonical source IDs but one raw display-name reference | Raw field **ID defect**, not a missing legitimate tree |
| Assassin | Assassin; GenoHaradan; Misfortune; Malkite Poisoner | *Scum and Villainy* pp.28–30 and *Threats of the Galaxy* p.13 (Malkite expansion) | Pack has canonical source IDs but one raw display-name reference | Raw field **ID defect**, not a reason to delete GenoHaradan |

**Scope qualification:** This matrix certifies the named access rules from the inspected printed sections. It is **not** a complete book-by-book certification of all later expansion trees or of every individual talent's prerequisites. Later books may expand class access; do not remove supplemental trees merely because Core predates them.

## Canonical tree IDs verified in \`packs/talent_trees.db\`

| Tree | Canonical \`_id\` |
|---|---|
| Armor Specialist | \`17cec542331cb4e4\` |
| Lightsaber Combat | \`2359c05ff13f3feb\` |
| Duelist | \`b3c5d90b5036f39b\` |
| Lightsaber Forms | \`2bc2572e852832e4\` |
| Sith | \`d1037bc7a08ea80b\` |
| Force Adept | \`e35ee41362604227\` |
| Alter | \`6ac3416fb6aada56\` |
| Control | \`d3661aa9906bdc79\` |
| Sense | \`d6b4331c0e31f7e3\` |
| Dark Side | \`de95d37c72b1c4cd\` |
| Fortune | \`cee9b9398682b7d0\` |
| Autonomy | \`9fe73a3703fa45fca628fd43cae6bf7f\` |
| Specialized Droid | \`cec49bc60d1646b1\` |
| Elite Droid | \`b968ecab63bc4cf4\` |
| GenoHaradan | \`da7b731a3e434a7a\` |
| Bothan SpyNet | \`d20682671d035cef\` |

## Exact repository defects

**Charlatan** \`system.talentTreeIds = ["disgrace","trickery"]\`. Canonical Fortune ID \`cee9b9398682b7d0\` is absent from \`talentTreeSourceIds\` and class-to-tree binding. Printed p.31 confirms its inclusion. Correct all recognized class authorities through their sanctioned update process.

**Jedi Master / Sith Lord / Force Disciple**: Current class tree arrays only list \`duelist\`, \`sith\`, \`force_adept\` respectively. Their class texts name a *selection-rule family*: any eligible Chapter 6 Force talent tree. Implement this family once in the canonical talent-selection eligibility authority, deduplicate with the global Force Sensitivity alternative, and honor tradition-specific membership and Dark Side gates. Avoid enumerating an unqualified blanket of Force-tradition trees on every class.

**Independent Droid — three nonaligned arrays**:
- \`talentTreeIds = ["specialized_droid","elite_droid","autonomy"]\`
- \`talentTreeSourceIds = ["9fe73a3703fa45fca628fd43cae6bf7f","cec49bc60d1646b1","b968ecab63bc4cf4"]\`
- These source IDs resolve in sequence to **Autonomy / Specialized Droid / Elite Droid**, not the slugs at the same array indices.
- \`talentTreeUuids[0] = "Compendium.foundryvtt-swse.talent_trees.9fe73a37-03fa-45fc-a628-fd43cae6bf7f"\` uses a dashed UUID instead of \`Compendium.foundryvtt-swse.talent_trees.9fe73a3703fa45fca628fd43cae6bf7f\`.
- \`data/fixes/class-talent-tree-bindings.json\` lists only Autonomy and Specialized Droid; it omits the supplemental Elite Droid tree. Fix without dropping Elite Droid.

**Assassin**: \`system.talent_trees[3]\` contains \`"GenoHaradan"\`; canonical ID is \`da7b731a3e434a7a\`.

**Infiltrator**: \`system.talent_trees[1]\` contains \`"Bothan SpyNet"\`; canonical ID is \`d20682671d035cef\`.

**Full 37-class position-integrity scan:** Compared each class's \`talentTreeIds\`, \`talentTreeSourceIds\`, \`system.talent_trees\` and \`talentTreeUuids\` against the 177-tree pack. Exactly **six mismatched positions across three classes** were found: Independent Droid (three slug↔source-ID positions and one UUID), Assassin (one raw string), Infiltrator (one raw string). All other inspected array-position references resolved.

**Extra pack↔binding differences requiring a separate expansion-source pass:** after punctuation/diacritic normalization, Independent Droid pack has \`elite_droid\` absent from bindings (**source-confirmed valid**). Martial Arts Master has \`martial_arts_forms\` and \`unarmed_mastery\` present in pack but not bindings, plus an encoding/slug mismatch around Teräs Käsi. Elite Trooper has \`squad_leader\` present in pack but not bindings, plus the same Teräs Käsi slug/encoding mismatch. Do **not** classify these additions as invalid from string comparison alone: verify each printed expansion book and named identity first.

## Architectural correction: do not model prestige access as transitive inheritance

**Wrong:** \`Jedi Master → every Jedi Knight tree → every Jedi tree\`; \`Sith Lord → every Sith Apprentice tree\`; or \`has previous class levels → automatically add that prior class's talent-tree list to current prestige talent slot\`.

**Correct:** A talent slot belongs to a **specific class level**. The player may select from (a) that class's explicitly authorized trees, including named borrowed trees and certified sourcebook expansions, or (b) a legally available Force talent alternative under the general Force Sensitivity rules and any explicitly granted prestige-class selection rule. Every talent's individual prerequisites and tradition/species/Force restrictions remain hard gates. Previously acquired talents remain owned, but do not expand the newly earned class level's tree access by themselves.

A single canonical accessor should return a typed, provenance-backed set for \`(actor, classId, classLevel, pendingContext)\`, with eligibility checked at candidate resolution and **no class-name substring matching**. Distinguish exact granted tree IDs from **rules-family alternatives** (e.g. \`general_force_talents\`, \`force_tradition_talent\`); do not treat access and ownership as the same fact.

## Implementation ownership and test gates

1. Work in the **canonical V2 class/talent authority stream**, not inside the Mentor survey UI. \`packs/classes.db\` is protected by \`tests/class-pack-protected-guard.test.mjs\`. Do not bypass its verified baseline. Class/tree-data owners should make authorized corrections and deliberately update tests/baseline in one cohesive change.
2. Audit every class's tree access from its original source and later-expansion books; record explicit per-source access and conditional alternatives. This audit certifies the specific rows above, **not all 32 prestige classes**.
3. Test one talent slot each for Jedi Knight, Jedi Master, Sith Apprentice, Sith Lord, Force Disciple, Charlatan, Independent Droid, Assassin, and Infiltrator; include both in-list and out-of-list choices and multiple-class characters.
4. Prove Jedi Knight may take Lightsaber Combat and Armor Specialist but is not granted every Jedi/Soldier tree; Jedi Master can take an eligible general Force talent but not automatically Lightsaber Forms; Sith Lord and Force Disciple get general Force alternatives.
5. Prove a Force Sensitive character can use a general Force tree during an ordinary talent selection; Force tradition options require membership; Dark Side requires the appropriate score. A character without Force Sensitivity must not acquire them from generic talent slots.
6. Assert \`talentTreeIds[i]\` resolves to the same tree as \`talentTreeSourceIds[i]\`, and \`talentTreeUuids[i]\` resolves to the exact 32-hex tree ID; no raw display names in ID fields.
7. Preserve exact tree identity for same-name talents; never deduplicate solely by display string; no unsupported prestige abilities narrated as already owned before finalization.
8. Once canonical corrections pass, update \`docs/audits/swse-rules-decisions-pending.md\` entry \`MSV-RD-006\` with source-certified findings and separately track unresolved expansions. Remove the now-certified rows from survey quarantine **only after** the corrected canonical runtime authority and tests are committed.
9. No migrations or compatibility shims; no edits to Claude's actively changing \`refactor/mentor-surveys-v2-cutover\` branch during this audit.

## Outstanding and not asserted here

- Additional Jedi Knight/Sith Apprentice expansion tree identities beyond their Core baseline require source-by-source certification; the current pack contains more than the Core minimum.
- Martial Arts Master and Elite Trooper supplemental tree disagreements need visual printed-page confirmation, including the Teräs Käsi encoding identity.
- This review did not perform live Foundry v13 tests; it proves source rules and repository state at the snapshot, not end-to-end class talent selector behavior.
- Existing system house rules, including Sith class Dark Side Score treatment, are preserved as distinct owner decisions; this audit does not overturn them.
