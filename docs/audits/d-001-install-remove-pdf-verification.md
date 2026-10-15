# D-001 — PDF-verified source certification: installing and removing an upgrade

**Status of this document:** source transcription and reconciliation for register entry D-001. It supersedes nothing: the earlier OCR-only note (`d-001-install-remove-source-examination.md`, PR #1041) is preserved unchanged as historical evidence. This document records the primary-source reading; the register, ledger and specification records that cite it are separate, reviewable changes in the same PR.

## 1. Source and method

| Item | Value |
|---|---|
| Publication | *Star Wars Saga Edition: Scum and Villainy* (registry book id `scum-and-villainy`) |
| Printed page | **39** (running header "Chapter II / Outlaw Tech"; the PDF page is the reviewer's, one higher) |
| Sections on the page | "Increasing Equipment Size" (end), "Installing Upgrades", **Table 2-2: Upgrade Installation**, "Restricted Upgrades" |
| Evidence | Image of the printed page supplied to this session by the independent reviewer, file SHA-256 `fa4c7131829212cec52bb8fd887402aafbdb4b0a9cb6cdfaa246db0d79ca9fc1` (210,492 bytes, WebP). Inspected directly in this session; the OCR layer was **not** used for any value below |
| Not done | The page image itself is not committed (copyright); only its hash and this transcription are |
| Cross-check | The values were compared with the independent reviewer's transcription in the review message; they agree in every value (section 4) |

## 2. What the OCR layer could not give (recorded for provenance)

The OCR of the same section (`reference/sourcebooks/Scum and Villainy_djvu.txt`, lines 2328-2357) was illegible for the numerals and the table; this reading replaces it as the authority per the sourcebook README ("the corresponding PDF remains the final source authority").

## 3. Transcription (printed page 39)

### 3.1 Installing Upgrades — text, as printed

> Installing an upgrade can take anywhere from a few minutes of work to week of frustrating machining and retooling in an overheated workshop. The amount of time and Mechanics check DC required depends on the number of upgrade points required and the quality of the upgrade (commercially bought or scratch-built):
>
> A scratch-built upgrade costs twice as much as a commercially bought upgrade. After the time listed above, make a Mechanics check against the appropriate DC. On a success, the upgrade is installed and functioning properly. On a failure, the upgrade doesn't work properly; you may attempt the Mechanics check again, but each retry requires the same amount of time and costs half as much as the original attempt.

### 3.2 Table 2-2: Upgrade Installation, as printed

| Upgrade points | Commercially bought | Scratch-built |
|---|---|---|
| 0 | DC 10, 10 minutes | DC 15, 1 hour |
| 1 | DC 20, 1 hour | DC 25, 1 day (8 hours) |
| 2 or more | DC 30, 1 day (8 hours) | DC 35, 1 week (5 days) |

### 3.3 Removing an upgrade — text, as printed

> Removing an upgrade requires the same amount of time, but reduce the Mechanics DC by 5. On a failure, the upgrade has been deactivated but not removed; you may attempt the Mechanics check again (which requires the same amount of time). If you don't care about removing the upgrade intact, reduce the time required to the next lowest increment (for example, from 1 day to 1 hour, or 1 hour to 10 minutes), but the upgrade is automatically destroyed on a failed check. Once the upgrade is successfully removed (or destroyed), the upgrade slot that was occupied becomes available again.

## 4. Reconciliation with the review message

| Element | Review message | Printed page | Result |
|---|---|---|---|
| Table 2-2 (all six cells) | as above | as above | Agree |
| Scratch-built costs twice a commercially bought upgrade | yes | yes | Agree |
| Failed installation: retry, same time, half the original attempt's cost | yes | yes | Agree |
| Removal: same time, DC reduced by 5 | yes | yes | Agree |
| Failed ordinary removal: deactivated, not removed; may retry | yes | yes | Agree |
| Expedited removal: next lowest time increment; destroyed on a failed check | yes | yes | Agree |
| Successful removal or destruction frees the slot | yes | yes | Agree |

## 5. What the page establishes, and what it does not

**Established by the printed page (explicit, unambiguous):** the Table 2-2 DC and time for each upgrade-point row and quality; the doubled cost of a scratch-built upgrade; the Mechanics check against the table DC after the listed time; success installs a functioning upgrade; failure leaves a non-functioning upgrade and allows retries at the same time; removal takes the same time at DC minus 5; failed ordinary removal deactivates without removing and allows retries; expedited removal shortens the time by one increment and destroys the upgrade on a failed check; a removed or destroyed upgrade frees its slot.

**Not stated on the page. Items 1-5 are register entry D-014 (`DEFERRED_RULES_REVIEW`); item 6 is register entry D-015 (`PENDING_SOURCE_VERIFICATION`). Nothing below may be implemented or assumed, and both entries are machine-enforced as open `installProcedure` blockers on the 76 governed definitions:**

1. The basis of "costs half as much as the original attempt" (what monetary cost an attempt has: the upgrade's price, labor or materials). The page does not define it. Whether successive retries compound is not stated either; the literal text says each retry costs half of the original attempt.
2. Expedited removal when the table time is already the shortest increment (10 minutes): "the next lowest increment" is undefined below it. The page gives only two examples (1 day to 1 hour, 1 hour to 10 minutes); 1 week to 1 day follows the table order but is not printed.
3. What "deactivated" means mechanically (whether the upgrade's effects are suspended) and whether a deactivated or a failed-installation upgrade still occupies a slot; the page states only that a successful removal or destruction frees the slot.
4. The state after a failed installation beyond "doesn't work properly" (whether it counts as installed and occupies a slot).
5. The meaning of the parenthetical time equivalents ("1 day (8 hours)", "1 week (5 days)") for game-time tracking is recorded verbatim; no conversion is implied.
6. Who may attempt (skill training, tools, workshop) is not stated on this page beyond "make a Mechanics check" and a descriptive mention of an "overheated workshop". This is a **source-research question, not an owner decision**: the Core Rulebook's Mechanics entry was examined through the repository OCR layer (`reference/sourcebooks/Core Rulebook_djvu.txt`, lines 6833-6990). It reads "Trained Only"; its listed uses (Disable Device, Handle Explosives, Jury-Rig, Modify Droid, Recharge Shields, Regulate Power, Repair, Repair Droid, Repair Object) do not include installing an equipment upgrade; "requires tool kit" is attached only to Modify Droid, Repair and Repair Droid; and its Retry paragraph says a Mechanics check can usually be retried. OCR is not the final authority, so nothing is certified; the PDF confirmation is tracked as register entry **D-015** (`PENDING_SOURCE_VERIFICATION`).

## 6. Which definitions the published procedure governs

The procedure is keyed on "the number of upgrade points required", which is the printed **Upgrade Points** column of Scum and Villainy Tables 2-3, 2-4 and 2-5. This is the same term the page uses, so the table applies to the upgrade options in those tables whose printed Upgrade Points value is a fixed integer.

| Group | Typed domain definitions | Disposition |
|---|---|---|
| Scum and Villainy Tables 2-3/2-4/2-5 upgrade options with a fixed printed upgrade-point value | **76** | Governed. `installProcedure` is specified from this page (specification records) |
| `sv-retractable-stock` (upgrade points conditional, 0 or 1) | 1 | The row key is not determinable until D-004 is resolved; **not** specified |
| `sv-droidification` | 0 (excluded scope, no typed definitions) | Not applicable |
| All other definitions (KOTOR accessories, Tech Specialist traits, lightsaber crystals and accessories, templates, biotech, talents, Rebellion/Clone Wars/Galaxy at War/Galaxy of Intrigue/Force Unleashed items, the core rulebook entry, the web enhancement) | the remaining 155 | Not governed by this page on the evidence examined; each has, or lacks, its own procedure. **Not specified**; tracked by new register entry D-013 |

The eight KOTOR Table 5-6 accessories are the closest case. Their printed text says the upgrade slot cost is "for use with the gear enhancement system in Scum and Villainy" and the registry ties them to this procedure, but that text does not state that the installation roll of Table 2-2 governs them, so they are left to D-013 rather than certified by inference.

Totals: 76 specified + 156 under D-013 = 232 typed definitions.

## 7. Certified facts versus an implementation-ready procedure

The printed facts above are certified. They are not a complete mechanical procedure: D-014 and D-015 leave sub-flows undefined or unverified. The specification records therefore carry `coverage: PUBLISHED_FACTS`: they make `installProcedure` **`SOURCE_VERIFIED`** for the 76 governed definitions but never `MECHANIC_SPECIFIED`. While D-014 or D-015 is open for a definition, the generator refuses a `COMPLETE_MECHANIC` record for that component, refuses implementation evidence for it, and refuses to make the definition runtime-selectable. Lifting D-014 needs an owner ruling; lifting D-015 needs confirmed source text; only then can a reviewed `COMPLETE_MECHANIC` record exist.

## 8. Releasing definitions from D-013

D-013's base scope is every typed definition. The 76 governed definitions are released by an appended, evidence-bound **Partial lift** row naming the 56 parent definitions with this document as evidence. Any later family (for example the eight KOTOR accessories) is released the same way, by appending a Partial lift row that names the parent definitions and cites source and evidence; the generator requires the cited file to exist, rejects unknown or out-of-scope definitions, and pins the scope row by hash so an altered exception list releases nothing. A partial lift removes a blocker only; certification still needs its own specification records.

## 9. Effect on the system

- D-001 (`PENDING_SOURCE_VERIFICATION`) is resolved by this page: the DC, time, scratch-built cost, failure and removal facts are verified from the primary source. The remaining gaps are split: D-014 (the page is silent: policy questions) and D-015 (training and tool requirements: a research question).
- Verifying the printed `installProcedure` facts does **not** make anything installable or selectable, and does not make the procedure implementation-ready. For the 76 governed definitions the other components (host prerequisites, effects, price handling, host evaluator, implementation, Foundry testing) are unchanged, and every selectability guard still applies.
- No gameplay code, executor, loader or character data changes.
