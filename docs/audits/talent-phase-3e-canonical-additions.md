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
| Move Massive Object | Alter (Core) | Legacy Era Campaign Guide, expansion | **55** | **PDF_VERIFIED** (owner): Force Point requirement, full area-attack procedure; prerequisites Telekinetic Power, move object |
| Telekinetic Stability | Control (Core) | Legacy Era Campaign Guide, expansion | **55** | **PDF_VERIFIED** (owner): spend a Force Point to negate forced movement; no prerequisite |
| Dark Preservation | Dark Side (Core) | Legacy Era Campaign Guide, expansion | **55** | **PDF_VERIFIED** (owner): Force Point + Dark Side Score +1; prerequisite Power of the Dark Side |
| Hard Target | Commando (Core) | Threats of the Galaxy, expansion | **95** | **PDF_VERIFIED** (owner): exact wording; prerequisite Tough as Nails |
| Stolen Form | Sith (Core) | Threats of the Galaxy, expansion | **81** | PDF_VERIFIED (owner): existence, page, tree, prerequisites (any one Force technique, Weapon Focus (lightsabers)), rules, exact wording now transcribed |

Tree-roster deltas: Gunslinger origin roster **5 → 7** (matches the PDF-verified source census); one expansion entry each for Alter, Control, Dark Side (LECG), Commando and Sith (Threats). Every page now comes from the owner's PDF pass; the checker still refuses an invented page for any `PDF_REQUIRED` row.

## Production defects found (separate from the authority gap; not repaired here)

Identity and tree are correct for all seven (`identityAndTreeCorrect`). What is wrong is content/metadata, to be repaired only through the manifest → dry-run → apply → verify contract:

1. **`source`/`page` are missing on all seven production records.**
2. **Three benefits omit printed rules content:** Move Massive Object (Force Point cost and the damage rule), Telekinetic Stability (Force Point cost), Dark Preservation (Force Point cost).
3. **One prerequisite is incomplete:** Move Massive Object is `Telekinetic Power` in production; print says `Telekinetic Power, move object`.
4. Trigger Work and Hard Target match print exactly; Ranged Disarm differs only editorially (capitalisation, no "(see Disarm, page 152)"); Stolen Form differs only editorially (capitalisation, "benefits", "a different Talent from the Lightsaber Forms Talent Tree" vs "a different lightsaber form"). The three Legacy production benefits (Force Point costs, Move Massive Object's damage procedure) and Move Massive Object's missing `move object` prerequisite are **confirmed real defects** by the PDF.

The checker accepts production in either the audited state or the authority-equal (repaired) state, so the later repair will not turn the gate red.

## Open PDF items

None. The owner PDF pass resolved LECG p.55 (x3), Threats p.95 and Stolen Form's exact wording (p.81). Source/page metadata and the benefit corrections are a separate, not-yet-authorized manifest-driven production repair unit.
