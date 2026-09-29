# Talent Canonicalization Phase 3 - Production Repair Plan

**Status:** PHASE 3B COMPLETE — PHASE 3C READY  
**Date:** 2026-09-27  
**Predecessor:** Phase 2 source certification complete  
**Canonical publication workload:** 1,182 / 1,182 certified  
**Merged canonical tree memberships:** 1,180

## Purpose

Phase 3 converts the completed Phase 1D structural authority and Phase 2 source-certified content authority into deterministic production talent records for the SWSE Foundry VTT system.

Phase 3 must not re-derive rules from current repository talent text. The audit artifacts and primary-source-backed canonical datasets are the authority.

Canonical identity is never talent name alone. Production matching must remain scoped by canonical talent-tree identity plus talent name, with source provenance used as an additional guard when needed.

---

# Phase 3A - Build the merged canonical production authority

## Goal

Create one durable machine-readable canonical talent dataset from the Phase 1D registry and all 14 Phase 2 sourcebook datasets.

This dataset should become the repair/build authority rather than making later tooling depend directly on 14 independent audit files.

## Required work

1. Inspect the repository and determine the actual production authority/generation path for talents.
2. Identify whether `data/fixes/talents.fixed.json`, source JSON, packs, build scripts, migration scripts, or another path is authoritative.
3. Do not assume the audit comparison mirror is itself the production source.
4. Merge Phase 2 publication records into canonical identities keyed by:
   - `canonicalTreeKey`
   - talent name
5. Reconcile the 1,182 publication claims into the 1,180 merged canonical tree memberships.
6. Preserve source provenance for talents published or expanded in multiple books.
7. Produce a persistent canonical dataset, provisionally:
   - `data/canonical/talents.json`
   - or the repository-native equivalent if inspection proves a better location/schema.

## Minimum canonical record contract

```json
{
  "canonicalIdentity": "<canonicalTreeKey>|<talent name>",
  "canonicalTreeKey": "<origin source>|<tree>",
  "name": "<talent name>",
  "tree": "<canonical tree display name>",
  "benefit": "<canonical published rules text>",
  "description": "<canonical/full player-readable rules text>",
  "summary": "<short derived player-facing summary>",
  "prerequisites": "<canonical printed prerequisites>",
  "source": "<canonical publication/source metadata>",
  "page": "<printed page>",
  "publications": [],
  "provenance": {}
}
```

## 3A acceptance gates

- [x] Actual production talent authority/build path identified.
- [x] 1,180 merged canonical identities represented exactly once.
- [x] No global-name-only merge logic.
- [x] Same-name identities remain separate by canonical tree.
- [x] All 1,182 publication claims reconcile into the merged graph.
- [x] Canonical text, prerequisites, source/page, and derived summaries survive the merge.
- [x] Publication provenance is preserved.
- [x] No production talent mutation yet.

---

# Phase 3B - Generate the exact production repair manifest

## Goal

Compare the merged canonical authority against the actual production talent source and produce a deterministic mutation plan before changing production.

Every canonical identity must receive an explicit disposition.

## Required dispositions

| Disposition | Meaning |
|---|---|
| `KEEP` | Identity and production content are already canonical |
| `UPDATE_CONTENT` | Correct identity/tree; rules text or prerequisites need repair |
| `UPDATE_METADATA` | Source/page/summary or related metadata needs repair |
| `CREATE` | Canonical production identity is missing |
| `CORRECT_TREE` | Existing canonical talent is attached to the wrong tree |
| `IDENTITY_SPLIT` | Same-name collision requires distinct documents |
| `REMOVE_CONTAMINATION` | Record contains homebrew, another identity, or later-source contamination |
| `REVIEW_EXTRA` | Repository item is not represented in canonical authority |

The current Phase 2 figure of 333 missing publication mappings must **not** be treated as 333 documents to create. Phase 3B must compare the **1,180 merged identity graph** against actual production content.

## 3B acceptance gates

- [x] Every canonical identity has one repair disposition.
- [x] Every production-only/extra record is classified.
- [x] Same-name hazards explicitly protected.
- [x] Create/update/tree-correction counts reconcile.
- [x] Manifest is reproducible from canonical authority + production source.
- [x] No production mutation occurs until this manifest is certified.

---


## Phase 3B closeout authority

Global Phase 3B certification is recorded in:

- `data/audits/talent-phase-3b-global-closeout.json`
- `docs/audits/talent-phase-3b-global-closeout.md`
- `tools/check-talent-phase-3b-global-closeout.mjs`

The global reconciliation caught and corrected the Core/JATM same-name `Charm Beast` production collision before Phase 3C. Phase 3C may begin only when the global closeout checker passes.

# Phase 3C - Apply production talent repair

## Goal

Apply the certified Phase 3B repair manifest to the true production talent authority.

## Required field contract

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical/full player-readable rules text

system.summary
    = concise derived player-facing summary

system.prerequisites
    = canonical printed prerequisite text

source/page
    = correct canonical sourcebook + printed page
```

If the repository schema stores these fields differently, adapt to the production schema while preserving the semantic contract.

## Safety rules

- Never mutate by display name alone.
- Resolve by canonical tree identity + talent name.
- Preserve stable IDs when repairing an existing canonical identity unless the production architecture proves replacement is required.
- Do not overwrite one same-name talent with another.
- Do not silently promote named sub-actions, class features, sidebars, or table rows into talents.
- Canonical full text remains mechanical authority; summary remains derived convenience text.
- Repair scripts must be deterministic and rerunnable.

## 3C acceptance gates

- [ ] Certified repair manifest applied exactly.
- [ ] Existing IDs preserved wherever safe.
- [ ] Missing canonical identities created.
- [ ] Wrong-tree identities corrected without collapsing collisions.
- [ ] Contaminated records cleaned.
- [ ] Canonical fields populated.
- [ ] Production diff matches the certified manifest and nothing else.

---

# Phase 3D - Noncanonical and legacy content policy

## Goal

Classify production content intentionally excluded from canonical SWSE rather than deleting it during canonical repair.

Current structural authority includes:

- 19 confirmed noncanonical/homebrew trees
- 1 obsolete split fragment
- extra repository tree memberships
- malformed/duplicate/wrong-tree records discovered by the audit

Possible final dispositions:

```text
canonical
optional/homebrew
deprecated/legacy
delete
```

## Safety rule

Phase 3C must not delete noncanonical material merely because it is not RAW. Classification and removal/migration are separate decisions.

---

# Phase 3E - Foundry/runtime validation

## Goal

Verify that the newly canonicalized database behaves correctly in Foundry v13 and the V2 framework migration.

Validation should cover at minimum:

- compendium loading
- talent browser/search
- tree display and membership
- prerequisites
- class/prestige talent access
- drag/drop
- character advancement
- actor-owned talent behavior
- same-name talents
- source/page display
- quick summary vs. full description presentation
- migrations
- automation/rules metadata that references talents
- assumptions anywhere in runtime code that talent names are globally unique

## Stop gate

Phase 3 is complete only when production data is canonical **and** runtime consumers handle the canonical identity model safely.

---

# Controlling authorities

Structural authority:

- `data/audits/talent-canonical-tree-registry.json`
- `data/audits/talent-phase-1d-structural-correction-manifest.json`

Content authority:

- all 14 `data/audits/talent-phase-2-*-content.json` sourcebook datasets
- `data/audits/talent-phase-2-closeout.json`

Human-readable closeout:

- `docs/audits/talent-phase-2-closeout.md`

Primary-source rule:

TXT/DJVU remains the fast searchable/transcription layer. Rendered sourcebook PDF pages remain final authority whenever wording, page layout, hierarchy, prerequisites, same-name identity, sidebars, or OCR are ambiguous.

# Immediate next action

Begin **Phase 3A** by inspecting the merged repository state and identifying the actual production talent generation/source path before creating or modifying any production talent record.
