# Phase 1a armor stock capacity — source contradiction and amendment test plan

**Status: DOCUMENTED SOURCE CONFLICT + ENGINEERING PROPOSAL.** This file makes **no** Phase 1a contract, code, schema, registry, ledger or gameplay change; does **not** adopt a mirrored erratum or lift D-012. Authored 2026-10-15 as a follow-up to Q-003 / Q-016 and the D-012 source audit.

## Source-by-source visual evidence

| Printed source | Statement observed on rendered book page | Evidence class |
|---|---|---|
| *Scum and Villainy* **p. 37**, **Upgrade Slots** | General stock equipment: 1 unused slot. Additional p. 37 sentence assigns **2** free slots to medium armor and **3** to heavy armor. | BOOK_PAGE_VISUALLY_VERIFIED |
| *Scum and Villainy* **p. 44**, **Armor Upgrades** | Armor generally has **1** free slot, whereas powered armor has **2**. No weight-class progression stated. | BOOK_PAGE_VISUALLY_VERIFIED |
| *Scum and Villainy* **p. 48**, **Beskar'gam** | **Non-powered** beskar'gam expressly receives **2** free slots. It is a named, printed exception; being non-powered does not force its capacity to 1. | BOOK_PAGE_VISUALLY_VERIFIED |
| *Scum and Villainy* **p. 48**, **GTU AV-1C Combat Armor** | Explicitly powered heavy armor with **2** free slots (not 3). | BOOK_PAGE_VISUALLY_VERIFIED |
| *Scum and Villainy* **p. 48**, **GTU AV-1S Scout Armor** | Explicitly powered medium armor with **2** free slots. | BOOK_PAGE_VISUALLY_VERIFIED |
| *Scum and Villainy* **p. 49**, **Krail 210 Personal Armor** | Explicitly powered medium armor with **2** free slots. | BOOK_PAGE_VISUALLY_VERIFIED |
| Purported January 2009 S&V errata (archived publisher-page PDF hosted by a third party) | Reports a **replacement** of p. 37's medium/heavy progression sentence, introducing a powered exception and definition. | ERRATA_CANDIDATE; original publisher custody NOT authenticated |

## Narrow, reproducible conflict

The **same published printing** says p. 37 heavy armor has 3 free slots and p. 44 armor generally has 1 and powered armor 2. Further, p. 48 explicitly names a **powered heavy armor** with 2 free slots. The p. 37 heavy 3-versus-p. 48 powered heavy 2 conflict requires reconciliation even before errata authentication.

The likely canonical resolution, **conditional on authenticated correction**, is:

- General ordinary equipment: 1 free slot.
- Ordinary armor, any weight class: 1 free slot, **except** explicitly stated stock exceptions.
- Powered armor, any weight class: 2 free slots, **except** explicit published item-specific exceptions.
- Named exceptions such as non-powered beskar'gam retain their source-printed capacity; no heuristic override from item name or armor weight.

**These are NOT implemented values or new owner rules.** The exact replacement operation and the published meaning of powered armor must be authenticated and certified. In particular, Phase 1a cannot repair this by merely adding a powered exception while leaving non-powered medium=2, heavy=3.

## Existing Phase 1a contract / code impact

Current baseline in `scripts/engine/customization/modification-slot-authority.js`:

| Key | Current read-only value | Reconciliation required |
|---|---|---|
| `armor:light` | 1 | Likely unchanged, conditional on source outcome |
| `armor:medium` | 2 | Conflicts with general p. 44 rule; errata candidate likely lowers default to 1 |
| `armor:heavy` | 3 | Conflicts with p. 44 and explicit powered-heavy AV-1C value 2 |
| Powered armor | `POWERED_ARMOR_PRECEDENCE_UNRESOLVED` when trusted true | Needs source-defined 2-slot candidate only after contract amendment |
| Beskar'gam and other source exceptions | Not an approved automatic override of the baseline | Requires per-item source-certified exception provenance and an approved mechanism; **Phase 1a contract originally prohibited an uncatalogued exception table** |

The broader `docs/audits/modification-slot-authority-phase-1a-contract.md` is an independently reviewed authority. A future adjustment to its baseline is a **separate contract amendment**, not an editorial fix to a table or a patch to a caller. Continue to fail closed on untrusted stock class or powered status.

## Proposed tests (not executed or authorized)

| Case | Source-driven expected capacity *if authenticated* | Important assertions |
|---|---:|---|
| Stock non-powered light armor, no item exception | 1 | Only with trusted non-powered fact and stock classification |
| Stock non-powered medium armor, no item exception | 1 | Regression catches legacy baseline 2 |
| Stock non-powered heavy armor, no item exception | 1 | Regression catches legacy baseline 3 |
| Powered light armor | 2 | Explicit trusted powered source; raw flag alone not enough |
| Powered medium armor (AV-1S/Krail 210) | 2 | Ignore legacy weight-class 2 by coincidence; provenance is powered |
| Powered heavy armor (AV-1C) | 2 | Regression catches legacy heavy baseline 3 |
| Non-powered beskar'gam light/medium/heavy | 2 | Named item exception must be source-certified and trusted; *not* inferred from weight |
| Ordinary armor with schema default `isPoweredArmor:false` only | Unresolved (`null`) | Do not treat default as trusted stock evidence |
| Unresolved armor `system.armorType` or stock/current mismatch | Unresolved or conflicted (`null`) | Preserve Phase 1a source trust and size-change contract |
| An item with one extra slot from **certified** Tech Specialist feat | Stock capacity plus 1 | Source and unique provenance + per-item once-only; cannot be trusted from client flag or applied before D-008 release |
| Equipment with a strip/size increase | Follow separately verified adjustment | Never conflate a **stock** exception with structural capacity changes; existing D-002/D-003 and D16/D17 safeguards stay intact |

## Ordered acceptance path

1. Authenticate *Scum and Villainy* January 2009 errata original/independently verified facsimile (Q-003 / E-Q1–E-Q2). Preserve the original p. 37 replacement's exact operation and an artifact hash.
2. Author a source examination reconciling p. 37/p. 44/p. 48/p. 49 plus any other explicitly exceptional armor in the registry; the source record should identify the named host, not just the armor's class.
3. Submit a **new reviewed Phase 1a contract amendment**, resolving how certified host-specific exceptions are represented without an unapproved name heuristic or silent exception table.
4. Only after acceptance, change the single slot-authority producer; write isolated regression tests for every row above; preserve external caller read-only and fail-closed semantics.
5. Independently review any ledger/register/specification or D-012 changes; no automatic blocker lift, no G4–G9 permission.

**This file is a test plan. It has made no change to Phase 1a.** Publisher-original authentication is the unresolved evidence gate.
