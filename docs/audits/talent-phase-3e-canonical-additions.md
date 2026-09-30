# Phase 3E-1 — Authority addendum for the seven known canonical cases

Data: `data/audits/talent-phase-3e-canonical-additions.json` · Checker: `tools/check-talent-phase-3e-additions.mjs` · Tests: `tests/talent-phase-3e-additions.test.mjs`.
**No production data was changed.** This checkpoint separates two things Phase 3D had blurred: *authority gaps* (the certified Phase 1D/2/3A layer is missing seven identities) and *production defects* (content/metadata on those seven records).

## Why an addendum and not an edit

The certified Phase 1D registry, Phase 2 content and Phase 3A `canonical/talents.json` are inputs the Phase 3B builders re-derive and **byte-compare**; the 3B manifests are immutable instructions. Editing them would break the tripwires and rewrite certified history. The addendum layers on top, using the same identity rule (`treeOrigin|tree|name`), so the authority becomes `1,182 + 7 = 1,189` claims and `1,180 + 7 = 1,187` identities, which equals production.

## The completeness equation (enforced by the checker)

The 1,180 certified identities map 1:1 to 1,180 production ids through the Phase 3B manifests (`identityResolution.productionRecordId | createRecordId`). The 1,187-record production pack therefore has **exactly seven ids outside the certified authority** — `192279eaa0b61d36, 208e1e15e989323f, 62d461ae3b0fcfa9, 7f4edcb8aa830972, 86c10d63bba2d9c8, d7870d0940a3ce0b, f9352f317ad2f695` — and they are precisely the addendum's additions. A production record with no claim, or an addition with no production record, fails the gate.

## The seven

| Identity | Tree | Publication | Page | Verification |
|---|---|---|---|---|
| Ranged Disarm | Gunslinger (Core) | Core Rulebook, tree origin | **217** | **PDF_VERIFIED** — exact wording, no prerequisite |
| Trigger Work | Gunslinger (Core) | Core Rulebook, tree origin | **217** | **PDF_VERIFIED** — exact wording, no prerequisite |
| Move Massive Object | Alter (Core) | Legacy Era Campaign Guide, expansion | *PDF required* | TXT_CONFIRMED text; prerequisites Telekinetic Power, move object |
| Telekinetic Stability | Control (Core) | Legacy Era Campaign Guide, expansion | *PDF required* | TXT_CONFIRMED text; no prerequisite printed |
| Dark Preservation | Dark Side (Core) | Legacy Era Campaign Guide, expansion | *PDF required* | TXT_CONFIRMED text; prerequisite Power of the Dark Side |
| Hard Target | Commando (Core) | Threats of the Galaxy, expansion | *PDF required* | TXT_CONFIRMED text; prerequisite Tough as Nails |
| Stolen Form | Sith (Core) | Threats of the Galaxy, expansion | **81** | PDF_VERIFIED (owner): existence, page, tree, prerequisites (any one Force technique, Weapon Focus (lightsabers)), rules; exact wording not yet transcribed |

Tree-roster deltas: Gunslinger origin roster **5 → 7** (matches the PDF-verified source census); one expansion entry each for Alter, Control, Dark Side (LECG), Commando and Sith (Threats). No page number is stored until the PDF gives it — the checker refuses an invented page for a `PDF_REQUIRED` row.

## Production defects found (separate from the authority gap; not repaired here)

Identity and tree are correct for all seven (`identityAndTreeCorrect`). What is wrong is content/metadata, to be repaired only through the manifest → dry-run → apply → verify contract:

1. **`source`/`page` are missing on all seven production records.**
2. **Three benefits omit printed rules content:** Move Massive Object (Force Point cost and the damage rule), Telekinetic Stability (Force Point cost), Dark Preservation (Force Point cost).
3. **One prerequisite is incomplete:** Move Massive Object is `Telekinetic Power` in production; print says `Telekinetic Power, move object`.
4. Trigger Work and Hard Target match print exactly; Ranged Disarm differs only editorially (capitalisation, no "(see Disarm, page 152)"); Stolen Form cannot be compared until its wording is transcribed.

The checker accepts production in either the audited state or the authority-equal (repaired) state, so the later repair will not turn the gate red.

## Open PDF items (owner)

Printed pages for Move Massive Object, Telekinetic Stability and Dark Preservation (Legacy Era Campaign Guide) and Hard Target (Threats of the Galaxy); exact wording of Stolen Form (Threats p.81). Everything else for these seven is settled.
