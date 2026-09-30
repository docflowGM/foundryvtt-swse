# Phase 3E — Canonical Corpus Completion: plan and checkpoint structure

Base: merged `main` @ `f3395d22201718d46954e359bd1c78f472cdc78c` (Phase 3D closed). Branch: `audit/talent-phase-3e-corpus-completion`.
**Goal:** prove the cleaned canonical corpus is **complete** against the published SWSE talent corpus, not merely internally clean.
**Denominator:** the 14 audited sourcebooks. The Phase 3D homebrew packs are explicitly outside it. Nothing in 3E touches production until a census says what is wrong.

## 1. Stock-taking: the authority layers that exist

| Layer | Artifact | What it says today | Mutability |
|---|---|---|---|
| Structure (Phase 1D) | `data/audits/talent-canonical-tree-registry.json` | 197 tree entries; per-tree origin roster + expansion publications + class access (e.g. Core *Gunslinger* = 5 origin talents) | certified |
| Claims (Phase 2) | `data/audits/talent-phase-2-<book>-content.json` ×14, `talent-phase-2-closeout.json` | 1,182 publication claims (910 origin + 272 expansion) | certified |
| Identities (Phase 3A) | `data/canonical/talents.json` | 1,180 canonical identities (1 multi-publication) | generated from the two layers above |
| Instructions (Phase 3B) | `data/audits/talent-phase-3b-*-manifest.json` ×14, closeout | immutable migration instructions; builders **re-derive and byte-compare** | immutable; editing inputs breaks the tripwires |
| Production | `packs/talents.db` (canonical pack) | **1,187** = the 1,180 certified identities **+ the 7 Phase 3D cases** | live |

`1,187 − 1,180 = 7` is exactly the seven known cases: Move Massive Object, Telekinetic Stability, Dark Preservation, Trigger Work, Hard Target, Stolen Form (the six `KEEP_CANONICAL_ADDITIONAL_PUBLICATION` records) and Ranged Disarm (`CORRECT_IDENTITY`, Warrior → Gunslinger).
They are in production and certified by the Phase 3D manifest, but **no Phase 1D/2/3A authority artifact knows about them**: the authority layer is one step behind production by exactly these seven identities.

## 2. The known weakness this plan is built around

Every authority layer above derives from the same first-pass source reading. Phase 1D verified trees against OCR text of two-column pages; Core *Gunslinger* lists 5 talents in Phase 1D but the TXT shows **7** (Ranged Disarm and Trigger Work sit across the page break), and canonical *Damaging Disarm* names Ranged Disarm as a prerequisite that has no canonical identity.
So comparing production to the Phase 2 claims again would be circular: it would confirm 1,180 and learn nothing. Completeness needs **independent, source-first discovery**, with the claims layer as the thing being tested.

## 3. Structure

### 3E-1 — Reconcile the seven known cases (authority layer, not production)
- Do **not** edit certified Phase 1D/2/3A/3B artifacts: the 3B builders byte-compare them, and they are immutable instructions.
- Add one **authority addendum** `data/audits/talent-phase-3e-canonical-additions.json`: for each case, the publication claim (sourcebook, printed page, tree, prerequisites, rules text, verification status and evidence), its production `_id`, and the tree-roster delta it implies (Gunslinger origin roster 5 → 7; Move Massive Object / Telekinetic Stability / Dark Preservation as Core-tree expansions in LECG; Hard Target in Threats *Commando*; Stolen Form in Threats *Sith*).
- Separate *documentation/authority gaps* from *production defects*: production is already correct for all seven; any real defect found (e.g. a production text that differs from print) is reported, not silently fixed.
- Verification levels follow the established vocabulary (`TXT_CONFIRMED`, `PDF_CONFIRMED`, `TXT_AMBIGUOUS_PDF_REQUIRED`, …). PDFs are not in the repository; PDF findings come from the project owner, as in Phases 3B/3D.

### 3E-2 — Source-first census (Core *Gunslinger* first, then the same tools over the corpus)
Independent discovery methods, each producing **candidates for adjudication**, never auto-repairs:
1. **Tree-roster extraction** from the TXT tree sections (Core first), compared with the Phase 1D roster, the canonical corpus and production.
2. **Prerequisite-closure check:** every talent named in any canonical prerequisite must resolve to a canonical talent, feat, power, class feature or skill; unresolved names are missing-talent candidates (this is how Ranged Disarm shows up).
3. **Stat-block census:** every talent named in a published NPC stat block must resolve to a canonical name (this is how Dark Preservation, Hard Target, Trigger Work and Stolen Form show up). OCR noise is expected, so matches are fuzzy and leftovers are triaged by hand.
4. **Tree-heading inventory:** every "… TALENT TREE" heading in the TXT must map to a registry tree.
Deliverables: `docs/audits/talent-phase-3e-core-gunslinger-census.md` (+ JSON) first; then one census per book that the tools flag.
Wherever the TXT is damaged or a page boundary is ambiguous the item is marked `PDF_REQUIRED` and listed for the owner — no exact canonical text is manufactured from partial OCR.
**Nothing is repaired until the census for that unit is complete.**

### 3E-3 — Publication-to-production reconciliation (the finish line)
`tools/reconcile-talent-publication-corpus.mjs`, reusing the certified claims **plus the 3E addendum** (no second authority system), proves:
- every certified claim maps to exactly one canonical production record, and every canonical production record maps to a certified claim;
- detects: claim with no record · record with no claim · one (publication, tree, name) → many records · wrong tree · wrong source/page · unresolved same-name cross-tree ambiguity (19 known groups);
- homebrew packs excluded from the denominator (asserted).
Wired into the state-aware CI gate and covered by tests; its expected totals are **derived** from claims + addendum, never hard-coded targets.

## 4. Checkpoints
1. **This plan** (docs only).
2. **3E-2a** Core *Gunslinger* source pass: census + PDF-required list → owner confirmation.
3. **3E-1** addendum + reconciliation of the seven (and the Gunslinger roster once confirmed).
4. **3E-2b…n** per-book census units flagged by the tools, each committed and pushed when certified.
5. **3E-3** reconciler, gate, tests, final 3E certification and PR.

## 5. Boundaries (not in 3E)
No global normalization of the ~80 stale `system.treeId` slugs (Phase 3F, after the corpus is frozen); no structured-prerequisite runtime-identity redesign; no homebrew enablement; no unrelated V2 runtime refactors.
Canonical production changes happen only for a *proven* omission or identity error, through the same manifest → dry-run → apply → verify contract used in 3C/3D, never as a side effect of documentation work.
