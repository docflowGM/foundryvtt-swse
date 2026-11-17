# SWSE Galactic Profiles v3 — Local Canonical-Ready Data Package

**Repository staging only. This v3 proposal does not replace the production v2 templates or enable a runtime integration.**

## Package files

- `SWSE_Galactic_Profiles_v3.json`: all 33 remapped characters (23 heroic, 8 nonheroic actors, 2 beasts).
- `SWSE_Galactic_Profiles_Catalog_v3.json`: lightweight UI catalog; one entry per profile.
- `SWSE_Galactic_Profiles_v3.schema.json`: Draft 2020-12 structural JSON Schema.
- `SWSE_Galactic_Profiles_Migration_Report.json`: per-profile issues and preservation checks.
- `SWSE_Galactic_Profiles_Source_Archive.json`: all 33 complete legacy records in their original source-file groups (28 + 5), without fixes or silent deletions.
- `build_galactic_v3.py`: the repeatable converter is supplied in the separate local ZIP artifact, not in this JSON/Markdown staging commit.

## Source of truth

Read-only GitHub sources from `docflowGM/foundryvtt-swse`, branch `feature/chargen-splash-prewarm`, pinned HEAD `b5e2a7514e0d5ea695a4dcf420d7a028c7c4208d`.

## Data contract and assumptions

- `catalog`: human-facing character image, name, description, class, role tags and mentor.
- `identity`: heroic/nonheroic/beast rules track, candidate class/species/background references and explicitly unverified species publication variant.
- `build.attributes`: preserve legacy score values exactly. The legacy source does not reliably establish whether the values are pre- or post-species adjustments. **The compiler must establish this before actor creation.**
- `build.skills`: source skill preserved; `canonicalKeyCandidate` uses the actual V2 finalizer mapping, not a claim that class-skill legality is certified.
- `build.feats.sourceSelections`: groups same-display feat candidates into one possible selection. **Neither candidates nor groups are direct grants**; V2 must derive class/species autogrants and legal general feat entitlements before applying.
- `build.talents.classSlot`: one primary candidate assigned to level-1 class slot for heroic profiles. Same-name duplicate source records are retained under `alternateSourceCandidates`, never counted as second talent. If `talentWiki` house rule is enabled, a distinct additional general talent entitlement is open for player selection; otherwise no extra talent.
- `build.forcePowers`: only the requested power candidates, **not grant authority**. V2 must confirm legal Force Sensitivity, trained Use the Force, Force Training entitlement and number of powers.
- `build.startingPackage.items`: identical source kit IDs, quantities, display names and extra fields. Do **not** recalculate purchasing prices; the equipment is assumed pre-purchased legally per project decision. Reconcile duplicate class starter grants (including Jedi lightsabers) before materializing once.
- `build.startingPackage.wallet`: an **exact final net balance**, including zero; not class starting money or a new shopping budget. Wealth and store grants must not be added again.
- `build.beastSourceMechanics`: entire original beastData preserved for the two beasts, but its Saga RAW status is pending.
- `certification`: deliberately `pendingV2Certification` and `publishableAsReadyToPlay=false` for all 33. Valid JSON is not proof of a legal SWSE character.

## Important: not a drop-in replacement

The current `TemplateRegistry` expects v2 `templates` entries containing fields such as `classId`, `speciesId`, `feats`, `talents`, and `credits` at the top level. This v3 deliberately changes that shape and requires a **new Galactic Profile Compiler and registry/adapter integration**. Do not overwrite the production v2 JSON with this file until that code and Foundry v13 runtime tests are ready.

## Key outstanding content issues

- Three Jedi profiles have requested Force powers with no explicit Force Training feat in their source selections. The conversion does **not** add a free Force Training feat.
- `soldier_gunner`, `soldier_brawler`, and `soldier_tank` each have two representations of the same Devastating Attack talent; only one class-talent candidate is assigned, with the alternative preserved as an alias candidate.
- Multiple other profiles contain feat aliases represented by two different IDs. These are grouped, not double-granted.
- `soldier_rifleman` uses Commanding Presence, with a published same-name talent identity collision that must be resolved before applying.
- The five `nonheroic_*` profiles previously lacked `isNonheroic`; v3 classifies them under the nonheroic track while preserving the original fields in the archive.
- The three nonheroic and two beast records from `nonheroic-templates.json` reference candidate nonheroic class IDs and need V2 subtype checks. Beast special qualities must be checked against printed Saga rules.
- Species publication versions, exact ability score basis, feat/skill entitlements, talent tree eligibility, and final actor materialization remain unverified.

## Validation performed

The conversion runs exhaustive per-profile source-preservation assertions for identity references, complete descriptions/quotes, images, skills, each original feat record, talents including aliases, Force powers, languages, all equipment identities and quantities, exact net credits and full beastData. This is a data conversion verification, **not Foundry runtime or Saga RAW certification**.

## Next implementation step

Use the v3 profile ID to retrieve the record; compile with authoritative V2 registries, selected GM rules and actor context; return a validated, immutable build plan; show that plan in review; on explicit Apply commit its selections to the existing V2 ProgressionSession; then let the existing V2 finalizer materialize the actor with exact single-pass inventory and net credits. Back/Close must never commit the plan.

## Staged custom heroic droid extension (8 additional profiles)

The eight separately authored Level-1 **custom heroic droid** Galactic Profiles have been added under [`droids/`](droids/README.md). This extension preserves the 33 records above unchanged; intended total v3 regression coverage is **41**. Droid mechanical authoring JSON, display-only catalog and droid-specific structural JSON Schema are staged there. **They are not ready to play**, and the production TemplateRegistry still reads v2 until a canonical V2 compiler/finalization integration is implemented and certified. See [`docs/audits/SWSE_Galactic_Profiles_v3_Claude_Implementation_Handoff.md`](../../../docs/audits/SWSE_Galactic_Profiles_v3_Claude_Implementation_Handoff.md).
