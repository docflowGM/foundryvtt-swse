# SWSE Droid Canonization — Mechanical Hydration Handoff (2026-10-29)

**OWNER DIRECTION / START HERE FOR A FRESH CHAT**

The task is a **total canonical replacement of the existing Droid compendiums**, which are considered inaccurate and non-authoritative. The existing droid pack records **must not** be used to fill sourcebook omissions or copied forward as a repair baseline. Work exclusively from published Saga Edition books, source rules and independently checked evidence. **Do not implement or register replacement packs yet.** First solidify the universal droid source schema, then mechanically hydrate the **234 immutable publication-specific claims in descending book census size**, one sourcebook at a time. Continue in rolling, Git-checkpointed fashion. Do not merge to `main` without owner approval.

## Verified starting state

- Repository: `docflowGM/foundryvtt-swse`.
- Droid audit branch to continue: `audit/droid-publication-census-2026-10-29`. Read the branch's current actual HEAD; do not assume the commit recorded here is still HEAD. Original 14-book census push: `201642a98dc630d0a6692b5bf6612f996d1e397a`.
- Source identity registry: `data/audits/droids/droid-publication-census.json`, **234** unique printed statblock claims from **14** books; `docs/audits/droids/droid-publication-census.md`; original source-rules review `docs/audits/droids/SWSE_Droid_Rules_to_Schema_v0_15.md`.
- New proposed universal droid schema: `data/audits/droids/universal-droid-source-entry.schema.json` plus matching `universal-droid-source-entry.blank.json`, generator, validator, scope probe and design review. This is **draft v0.1, not frozen, not populated or runtime certified**.
- Machine-readable largest-first schedule: `data/audits/droids/droid-mechanical-hydration-queue.json`. Use this file as the ordered worklist, checking it against the source census at every checkpoint.
- Census format inventory: **219 droid-character claims**, **13 vehicle-format droid claims**, **2 droid-squad claims**. They are publication claims, not 234 distinct factory model families, and not 234 independent droid Actors. Published names matching across books remain separate source identities until deliberately reconciled.
- **25** linked same-publication alternate/repeated presentations remain linked, not independent factory model entries.
- `Jedi Academy Training Manual` has **0 statblock claims**, but important Shard/Iron Knight, droid shell, and subelectronic converter rules requiring a **rules-only final checkpoint**.

### IMPORTANT vehicle authority reality check

The universal vehicle work is the architectural model, particularly the 23-root-group vehicle source schema, typed nested structures and `fieldStates`, source-vs-instance separation, deterministic native Foundry V13 packs, and strict mechanical trust gates. Vehicle reference artifacts were found on `audit/universal-vehicles-phase1`, including:

- `data/audits/vehicles/swse-phase0b-vehicle.schema.json`
- `docs/audits/vehicles/swse-phase2c-null-semantics-contract.md`
- `docs/audits/vehicles/universal-vehicle-phase4d-native-runtime-acceptance.md`

**Do not assume every vehicle feature has merged just because a conversation says so.** At the time of this handoff, GitHub's `main` ref did not expose `data/audits/vehicles/`; the separately readable `audit/universal-vehicles-phase1` branch contained the vehicle implementation and schema references. Re-check repository refs/current integration in the new chat. Do not overwrite or fork the vehicle source of truth to accommodate droids.

## Mandatory source authority and null contract

1. **Printed source is authoritative.** TXT OCR is an index, never final numerical authority. Render the actual PDF page and review complete statblocks, adjacent rule text, two-column positions, sidebars, footnotes, attack lines and named variants. Record the **printed page**, PDF page index and TXT line anchors separately.
2. **One immutable publication source entry per census `listingId`**. Never silently replace a book's printed statblock with another book's version, even when the models are apparently identical. New provenance and model-family links must not overwrite publication facts.
3. **Null is not permission.** If the book does not establish a child value, keep a `null` with a `fieldStates` JSON Pointer of `not-stated`, or omit an unreviewed child with `not-yet-reviewed`. No inferred component access, infinite slots, upgraded weapon, free gear, zero score, boolean false or legal modification arises from source silence. The schema verifier requires pointer evidence for persisted nulls.
4. **Preserve known siblings.** If a parent has any known descendants it stays an object. Put null on the individual unknown child. Null the entire parent only when none of its children have a source-established value; annotate that parent status.
5. **Explicit absence is different from silence.** A printed zero is numeric `0`; a printed unarmed inventory can be a verified `[]` with `explicitly-none`; a printed missing Constitution score is `null` with explicit missing-score evidence. A field not yet checked is neither source silence nor confirmed absence. Avoid fabricated placeholder values.
6. **Printed contradictions are preserved.** Store both alternatives in `exceptions.sourceContradictions` and block strict certification if they affect mechanics until source-supported adjudication/owner decision. Never quietly pick an attractive value.
7. **Global droid rules and special exceptions are separate.** Approved `DROID-RULE-001`: Scavenger's Guide to Droids supersedes Core **only where rules are directly incompatible and have the same scope**. Compatible additions coexist; Core governs unaddressed matters. Don't assume later supplements override earlier book rules wholesale.
8. **Mechanical certification is independent.** `certification.identityStatus` (source identity), `mechanicalStatus` (complete source-backed mechanics) and `runtimeStatus` (Foundry testing) are separate. PDF checking or schema JSON validity is **not** certification of the entire droid.

## Fixed book order — largest census to smallest

| Pass | Book ID | Book | Claims | Running mechanical target |
|---:|---|---|---:|---:|
| 1 | SGD | Scavenger's Guide to Droids | **46** | 46 |
| 2 | CLONE | Clone Wars Campaign Guide | **40** | 86 |
| 3 | THREATS | Threats of the Galaxy | **29** | 115 |
| 4 | KOTOR | Knights of the Old Republic Campaign Guide | **24** | 139 |
| 5 | GAW | Galaxy at War | **22** | 161 |
| 6 | REBELLION | Rebellion Era Campaign Guide | **15** | 176 |
| 7 | CORE | Saga Edition Core Rulebook | **13** | 189 |
| 8 | LEGACY | Legacy Era Campaign Guide | **12** | 201 |
| 9 | FORCE | The Force Unleashed Campaign Guide | **11** | 212 |
| 10 | GOI | Galaxy of Intrigue | **8** | 220 |
| 11 | UNKNOWN | The Unknown Regions | **6** | 226 |
| 12 | SCUM | Scum and Villainy | **5** | 231 |
| 13 | SOTG | Starships of the Galaxy | **3** | 234 |
| 14 | JATM | Jedi Academy Training Manual | **0** | 234 (rules-only) |

**The ordering is owner-mandated.** Tie-breaker: original census sequence. Do not start by hydrating Core because it is the base rules book. You may consult its general printed rules during SGD hydration, but Core's 13 statblock records wait for pass 7. Consult the vehicle authority whenever a hybrid entry requires it, but do not change the book queue.

## Mechanical hydration: workflow for EACH book

### Phase A — preflight and schema stress test

1. Read branch HEAD, current census and queue; verify source PDF and TXT names, exact `listingId` set and book count from the census. No legacy Droid compendium values as source input.
2. Review schema v0.1 and current edits. Before bulk work on SGD, stress-test representative droids (factory stock chassis, fully built model, heavily armed multi-appendage model, unusual movement/remote processor, droid PC, and vehicle-format DP-2) and identify schema deficiencies. Treat changes as proposed v0.2+ with diff/migration notes; freeze only after owner approval, not by silent schema drift.
3. The printed book may have variable chapter page offsets; establish the PDF↔printed-page mapping against the rendered scan. Use TXT for indexing and PDF for final fields.
4. Create a **source-only per-book ledger** in `data/canonical/droids/source-books/<bookId-lowercase>.json` (new directory, no production packs). It must contain exactly that book's census IDs and no new entries unless separately approved by the owner following a census amendment.

### Phase B — per-statblock field hydration

For **each** publication claim, collect and verify:

- Identification: immutable `sourceEntryKey`, published name, printed page(s), printed type line, degree if printed, size, manufacturer/model/variant, named identity and alternate-view anchors.
- Stats and progression: CL, classes/levels/BAB, ability scores (including actual missing CON), Initiative, senses, Perception, languages, every skill, feat, talent, Force Point/Dark Side or special progression field when printed.
- Defense/durability: HP, threshold, Ref/flat-footed/Fort/Will, armor, DR, immunity, SR, special reductions/vulnerabilities, condition/repair rules.
- Movement/anatomy: all movement modes, reach, fighting space, physical legs/manipulators/tool appendages, redundant/multi-instance arms, mode-switch restrictions. **Never infer one action per arm.**
- Systems and processor: installed factory components and instance IDs, true inventory versus sample loadout, locomotion, sensors, software, programming constraints, shutdown/standby, remote control, independence, self-destruct, accessories and source-only notes.
- Equipment/combat: owned weapons/possessions versus built-in mounts; exact printed attack alternatives, areas, damage/critical, ammo, operators, feat/talent modifiers and special combat predicates. Preserve printed totals separately from derived rules; never double-add BAB, INT or crew modifiers. **Source-listed attacks do not automatically grant trusted executable stock attacks.**
- Economics/construction: new/used credits, availability, starting packages, restrictions, model-specific hero eligibility. Keep printed **stock** model and actual **PC creation** rules distinct.
- Every known field needs provenance at least at the applicable printed source line/page and section/attack row; every unknown, silence, explicit none or contradiction needs `fieldStates` or typed exception evidence. Never substitute legacy pack values.

### Phase C — reconciliation without destroying source facts

- Keep base factory source, named individual/encounter loadout, protocol re-expression, and modifications separate. Same-book repeats link back to the census `alternativePresentations` record; do not produce extra claim IDs.
- Preserve cross-book appearances as **separate publication claims**; attach provisional identity-family candidates only with evidence. Do not block mechanical progress on global family-name deduplication.
- **Vehicle-format droids (13 across corpus):** use a `vehicleLink` to the existing canonical vehicle `sourceEntryKey`. The vehicle engine owns ship/ground movement, defense, HP, crew/gunnery and source attack groups. Droid layers own only verified droid traits/command/autonomy/exception rules. Do not install duplicate weapon systems or create separate conflicting vehicle actors. Fail closed on untrusted mounts and attack rights.
- **Squads (2):** preserve printed aggregate mechanics and membership; do not turn one squad statblock into independent factory model records.
- **Shard/Iron Knight and Replica Droid PCs:** `DROID-ARCH-002` owner decision: these were intentionally deferred from the Species refactor for Droid-PC integration. Shards retain special occupant/species traits in a mechanical shell; replica droids use source-defined PC traits rather than copying NPC level packages. No separate character progression engine.
- **Scum & Villainy Droidification:** device-to-droid process is neither a normal chassis model nor a ship-actor rewrite; reuse equipment modification architecture where source-supported.

### Phase D — independent acceptance and Git checkpoint

1. Assert **exact ID parity and count parity** with the frozen census; all repeated forms linked, no ID loss/creation, no cross-book overwrite.
2. Run Draft 2020-12 JSON Schema and `verify_schema.py` semantic null/empty-array rules. Add **independent fixture tests** for printed exceptions and hostile input: omissions cannot become upgrades; written zero cannot become null; known parent survives unknown child; wrong component identity/slot rejected; no implicit stock attack trust.
3. Re-read independent critical PDF evidence and source sidebars, not just OCR. Produce a **field discrepancy ledger** with preexisting source conflicts, possible OCR defects, and any unresolved certification blockers. Record per-claim mechanic status; `BLOCKED` is a valid honest book outcome.
4. Write a short `docs/audits/droids/hydration-<bookId-lowercase>-checkpoint.md` stating number reviewed, number certified, blocked/review-required IDs, schema discoveries, Source/PDF anchors, tests run, and unchanged production boundary.
5. Update `data/audits/droids/droid-mechanical-hydration-queue.json`: `status`, `certifiedClaimCount`, exact checkpoint commit, and unresolved issues. **Do not mark a book `MECHANICALLY_CERTIFIED` merely because identity coverage is 100%.**
6. Commit and push the book checkpoint **only to the droid-audit branch**. Verify GitHub branch HEAD and remote readback. Do **not** merge to `main` or modify registered old/new compendiums. If large, commit a clearly named PARTIAL checkpoint before stopping; resume from exactly that pushed head next turn/chat.
7. Roll directly to the next largest remaining book without asking again, unless a source conflict needs an actual owner ruling or the branch has conflicting writes.

## Special issue watchlist by book

- **SGD (46)**: controlling droid rules, 12 protocol representations, DP-2 hybrid; physical appendage/mount distinctions, Factory vs PC build cost. Greatest initial schema stress.
- **CLONE (40)**: B1 squad, autonomous droid vehicles and integrated GAT droid brain, multiple factory and encounter variants. Preserve distinct authority from Vehicle V2.
- **THREATS (29)**: Replica Droid p.153 PC creation, NPC exemplars (Guri), buzz droid attachment, B3/B3-A variants, explicit heroic eligibility.
- **KOTOR (24)**: Basilisk war droid vehicle; named personalities, Rakatan/Krath models, heroic template. No factory template guess.
- **GAW (22)**: automated sentry scene bonuses and duplicated presentations; Purge Trooper/special damage; GAT as vehicle; count six linked repeats separately from primary IDs.
- **REBELLION (15)**: FX-7 20 hands, remote trainer/HT Drones, Dark Trooper armor vs body, LOM/4-LOM and named IG-88.
- **CORE (13)**: global base rules, named R2-D2/C-3PO, standard degree and chassis; reconfirm global conflict precedence.
- **LEGACY (12)**: LV8 printed degree omission, HV-7 ×3 lifting, installed weapon-hand replacement and FEG starship crew role.
- **FORCE (11)**: FX-6/Q7/BD-3000, three distinct junk models, PROXY, special reprogramming/representation.
- **GOI (8)**: 5-BT external bracelet, NR-1100 discrepancy, 3D-4 sample concealed loadout vs unarmed factory, FIII footman, MRD-39B self-destruct HP threshold and attack geometry.
- **UNKNOWN (6)**: six protocol re-expressions, MULE self-diagnostic skill +9/+11 discrepancy, Wanderer Perception +6/+12, explicit storage and appendages.
- **SCUM (5)**: mining droid same-book repeat, Droidification equipment upgrade, Memory Upgrade not for droids, 8D8 vs 8D identity caution.
- **SOTG (3)**: Vulture/Droid Tri-Fighter/Scarab already in vehicle source audit; link existing source keys and preserve all untrusted physical weapon mount/arc restrictions. No separate droid ship records with independent ship stats.
- **JATM (0)**: rules-only closing appendix for Shards/Iron Knights, subelectronic converter, occupant vs shell and Force interactions; no invented droid statblocks.

## Strict checkpoint reporting template

```text
Book: <title>  | Priority <N/14> | Expected publication claims: <N>
Baseline census ID count: <N>; exact unchanged IDs: <yes/no>
PDF source pages reviewed: <...> ; TXT anchors reviewed: <...>
Mechanically certified records: <x/N>; partial: <y>; blocked: <z>
Actual fields added: <...>; source disagreements: <...>; null/silence states: <...>
Schema gaps/proposed changes: <...>; tests run: <command + result>
Vehicle / Shard / Replica / squad exceptions: <...>
Changed audit files: <...>; production packs: unchanged; runtime: not tested
Git branch: <...> | Git commit: <verified hash> | remote readback: <verified>
Next work: <same book remainder or next descending-census book>
```

## Endgame — after all books, NOT during hydration

- Frozen mechanically certified canonical source authority with separate source-claim/model-family/variant layers; unresolved issues kept explicit.
- Deterministic native Foundry V13 droid Actor packs generated **from canonical source records only**, with 219 character claims, 13 vehicle-format references and 2 squad representations handled by their owning engine/category, not a blind one-pack-per-claim assumption.
- Clean break from old inaccurate Droid compendiums (no legacy-player-droid migration as previously approved). New registration, V2 Droid PC builder and sheet integration, Shard/Replica route, certified modifications/slots, and live Foundry V13 acceptance all require **separate authorization and gates**.
- Do not manufacture missing mechanical fields to get a green build. Proper incompleteness is safer than false canon.

## First instruction to a new assistant

**Start with SGD, 46/234.** Read the three canonical baseline droid audit files, this handoff, queue JSON, schema/validator and the vehicle null-semantics contract. Re-check current repository branch and source PDF/TXT. Stress-test v0.1 against a deliberately varied SGD sample; record any schema changes before bulk hydration. Then hydrate all 46 SGD claims, do PDF-backed mechanical review, report certified-versus-blocked separately, write a named SGD checkpoint, and push only the droid audit branch. Continue with Clone Wars (40) after SGD closes. Do not ask the owner to repeat this workflow.
