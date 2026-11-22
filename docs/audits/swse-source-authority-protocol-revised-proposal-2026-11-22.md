# SWSE Source Authority Protocol — revised proposal

**Status: PROPOSAL. NOT ADOPTED. Documentation only.** It takes effect only if the project owner explicitly approves it as a policy change. It does not change the V2 architecture, `CLAUDE.md`, any register entry, any runtime or any data. It revises the historical proposal in PR #1046, which is **not** adopted or merged as written. If a statement here ever conflicts with `CLAUDE.md` or an existing owner ruling, `CLAUDE.md` and the ruling win.

## 1. Purpose
Keep three existing principles exactly as they are: published rules are authoritative and are not invented; unverified mechanics do not become executable; genuine ambiguities are decided by the project owner. The protocol only standardizes **how source evidence travels** between a person who can read the printed books, the implementer who works in a repository, and the owner who rules. It adds no new authority to anyone.

## 2. Roles

| Responsibility | Who |
| --- | --- |
| Read the printed/rendered pages; produce the certification record; name themselves | Named source reviewer |
| Implement an approved record in the repository; run tests and CI | Implementer (Claude Code) |
| Independent pre-merge review of the implementation **and** of the evidence | A reviewer other than the one who wrote the record |
| Rules adjudications, source-policy rulings, blocker lifts, runtime enablement, security-sensitive changes | **Project owner only** |

The implementer is an implementer, not a rules adjudicator. A role may be filled by a person or a tool, but the record must always say which one and under what name.

## 3. The certification record
One self-contained message or repository file per claim set.

| Field | Content |
| --- | --- |
| `recordId` | `SCR-<register id>-<n>` |
| `registerEntry` | The decision ids addressed |
| `reviewer` | **Name and role** of whoever read the pages (a person, or a named tool with its version). "The reviewer" or "someone" is not valid |
| `publication` | Exact title and edition as printed |
| `pages` | Every **printed** page examined, plus the PDF page if known, and the **span** when a passage runs across pages (e.g. starts p.14, continues p.15) |
| `evidenceConfidence` (per page) | One of the labels in §4. The implementer copies it verbatim |
| `excerpt` | Only the **short necessary excerpt** of the printed text (a clause or one table row), in quotation marks, with heading and page |
| `paraphrase` | A faithful paraphrase of every passage relied on, so a reader can follow without the book. Not a copy of whole passages or tables |
| `establishes` | What the text explicitly establishes, one numbered claim each, pointing at an excerpt or paraphrase |
| `doesNotEstablish` | What a reader might assume but the text does not say |
| `applicability` | Which register definitions the passages govern, and which not, with reasons |
| `unresolved` | Open questions, each classed `RESEARCH` (other publications could answer) or `OWNER` (sources silent or conflicting) |
| `requestedAction` | The repository change the record supports. It is a **request**, never an authorization |
| `ownerRulings` | References to any existing owner source-policy ruling that applies (decision id, date). Empty means none exists |

Whole verbatim passages and full tables are **not** required in the repository. Short excerpts plus faithful paraphrase and page references are the standard; the printed book remains the authority and is consulted by the reviewer.

## 4. Evidence confidence labels
| Label | Meaning |
| --- | --- |
| `RENDERED_PAGE_VISUAL` | The reviewer read the rendered page image |
| `OCR_TEXT_LAYER` | Text layer / OCR only; wording and numerals unverified |
| `SECONDARY_SOURCE` | Quoted from a non-printed source (fan wiki, summary, prior audit); never sufficient to certify |
| `NOT_INSPECTED` | No direct inspection; the claim is carried forward on someone else's word |

Rules: (a) the implementer records the label exactly as given and **never upgrades** it; (b) a claim whose pages are all `OCR_TEXT_LAYER` or weaker may be recorded as an *observation* but may not support `SOURCE_VERIFIED`; (c) a status may be **downgraded** by anyone who finds an error, and upgraded only by a new record from a reviewer who actually inspected the page; (d) when direct inspection is unavailable, the repository text says so explicitly ("not inspected by the implementer", naming who did inspect, if anyone).

## 5. What the implementer does with a record
1. Implements only what `establishes` supports, using existing generators and authorities, with excerpts/paraphrase and provenance copied honestly.
2. **Stops at the guardrails** (§6). It does not resolve `OWNER`-class questions, infer behavior from silence, or fill gaps from lore or another edition.
3. Opens a draft PR and waits for independent review. Source certifications, register changes and anything touching a rules mechanic never merge on the implementer's say-so alone.

## 6. Hard limits (nothing in this protocol relaxes these)
- **No autonomous blocker lifts.** Only the project owner lifts a `DEFERRED_RULES_REVIEW` blocker or authorizes runtime enablement. A record may *recommend*; it cannot lift.
- **No uncertified blocker lift by implication.** Evidence about one definition does not lift a blocker on another; partial lifts name exactly what they cover.
- **No overwrite of current authority.** The protocol never replaces a current SSOT, errata ruling, decisions-register entry or certified record. Corrections go through the normal change path, with the original preserved (append-only registers stay append-only).
- **Source-policy rulings stay with the owner.** Choosing between conflicting publications or errata, or deciding what to do when sources are silent, is an owner decision recorded in the register with its date and implementing commit.
- **Security-sensitive and rules adjudications keep human owner consent**, including anything that changes bonuses, stacking, action economy, or what an automation does to a player's character.
- **No certification status is implied by merging.** `SOURCE_VERIFIED`, `DATA_RECONCILED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED` and `FOUNDRY_TESTED` remain independent, per `CLAUDE.md`.

## 7. Independent pre-merge review
Before a source-certification or register PR merges: (1) a reviewer other than the record's author checks that every claim traces to a page with an honest confidence label; (2) CI and the data/register guards pass; (3) the PR description states exactly what was and was not inspected, by whom; (4) where an owner ruling is invoked, the PR links the ruling. A merge records what was verified, not more.

## 8. Worked example — real, from this repository
`SCR-ILLUSION-1` (illustrative; the correction itself was recorded on PR #1171 and merged as #1178).

| Field | Value |
| --- | --- |
| `reviewer` | Project owner, from rendered page images |
| `publication` | *Knights of the Old Republic Campaign Guide*; *Jedi Academy Training Manual* |
| `pages` | KOTOR printed p.52 (PDF 53). JATM: talent begins on printed p.14 and **the size-penalty paragraph runs onto printed p.15** (PDF 16) |
| `evidenceConfidence` | KOTOR p.52 `RENDERED_PAGE_VISUAL`; JATM p.14–15 `RENDERED_PAGE_VISUAL`; the repository's prior text `OCR_TEXT_LAYER` |
| `excerpt` | "-10 for Colossal (frigate) or larger illusions" |
| `establishes` | 1. The largest illusion-size penalty is -10 in both books. 2. The repository's KOTOR evidence text read "~10", an OCR error |
| `doesNotEstablish` | Nothing about other edition/book wording differences, which are preserved as-is |
| `requestedAction` | Correct the evidence record only; confirm the active talent already reads -10; do not overwrite production data |
| `ownerRulings` | Owner authorization on PR #1171, 2026-11-21/22 |

It shows why the page **span** field exists (a p.14-only citation was incomplete for the number), why confidence is recorded per page, and why the correction stayed evidence-only: the active talent was already correct, and the generated canonical mirror was regenerated only after a separate approval and with a full diff.

## 9. What this does not change
`CLAUDE.md`; the append-only decisions register; the certification statuses; the rule that the implementer is not a rules adjudicator; the V2 architecture; and every existing owner ruling. Adoption, amendment or rejection of this proposal is the owner's decision alone.

## 10. Differences from the #1046 proposal
| #1046 | This revision |
| --- | --- |
| Verbatim text and tables of every passage in the repository | Short necessary excerpt + faithful paraphrase + page reference |
| Reviewer unnamed ("independent reviewer") | Named reviewer and role required |
| `visual` / `ocr-only` per page | Four labels incl. `SECONDARY_SOURCE` and `NOT_INSPECTED`; per-page; never upgraded |
| No page-span field | Span required when a passage crosses pages |
| Pre-merge review by "the independent reviewer" | Reviewer other than the record's author; owner consent for rules adjudications |
| Silent on overwriting current authority | Explicitly never overwrites SSOT/errata/register history |
| Silent on blocker lifts beyond partial lifts | Owner-only; records may recommend, never lift |
