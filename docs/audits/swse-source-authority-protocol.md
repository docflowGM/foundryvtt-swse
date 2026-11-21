# SWSE Source Authority Protocol (proposal)

**Status: proposal for owner and independent-reviewer approval. Documentation only.** It changes how source evidence moves between the people and tools on this project. It does **not** change the V2 architecture, the certification statuses, the rules-decision register, or any rule.

## 1. Why

The V2 modification system rests on three principles that stay exactly as they are: published rules are authoritative and are not invented; unverified mechanics cannot become executable; genuine ambiguities are documented and decided by the project owner.

What slowed the D-001, D-013 and D-015 work was **evidence transfer**, not those principles. The independent reviewer can open the uploaded sourcebook PDFs; the implementer (Claude Code) works in a cloud container that holds only the repository, its OCR text layers and whatever images are attached directly to a message. Links to a page image in another environment do not resolve for the implementer. The result was a loop: inspect, report, request the image again, repeat.

## 2. Roles

| Responsibility | Who |
|---|---|
| Read the original sourcebook PDFs, verify published rules and printed pages, produce the certification record | Independent reviewer (ChatGPT, with the uploaded books) |
| Implement approved certification records in the repository (register rows, specification records, ledger, regenerated data, tests) | Claude Code |
| Run tests and CI | Claude Code |
| Independently review code and certification, including against the original PDF, before anything merges | Independent reviewer |
| Decide genuine rules ambiguities, conflicts and policy | Project owner |

Claude Code does not need to inspect a page that the reviewer has verified and documented in a sufficiently traceable record. The review before merge is still independent and still checks the implementation against the PDF; it is not duplicated by the implementer.

## 3. The certification record (the approved implementation input)

A record is the text of one message or one repository file. It must be self-contained, because images and links may not be reachable by the implementer. Required fields:

| Field | Content |
|---|---|
| `recordId` | `SCR-<register id>-<n>`, for example `SCR-D-015-1` |
| `registerEntry` | The D-number(s) the record addresses |
| `publication` | Exact book title and edition, as printed |
| `pages` | Every printed page examined, with the PDF page if known |
| `verificationActor` | Who read the pages, and how: for each page, `visual` (read from the rendered page) or `ocr-only`. The implementer copies this verbatim and never upgrades it |
| `transcription` | Verbatim text and tables of every passage relied on, with its heading, so the implementer can quote it without the image |
| `establishes` | What the passages explicitly establish, one numbered item per claim, each pointing at a transcription passage |
| `doesNotEstablish` | What a reader might assume but the text does not say (for example, that a shared slot cost implies a shared installation procedure) |
| `applicability` | Which register definitions, by parent id, the passages govern, and which they do not, with the reason |
| `unresolved` | Questions the text leaves open. Each is classed `RESEARCH` (other publications could answer it) or `OWNER` (the sources are silent or conflict) |
| `requestedAction` | The repository change the record supports: add a specification record, add a partial lift, move an entry to `DEFERRED_RULES_REVIEW`, or record a finding with no lift |

## 4. What Claude Code does with a record

1. **Implements** it faithfully: the transcription goes into a `docs/audits/` note; register rows, specification records, partial lifts and ledger changes follow the existing generator rules; the runtime data is regenerated, never edited.
2. **Records provenance honestly.** Evidence text names the verification actor exactly as the record gives it, for example "verified from the rendered page by the independent reviewer; not inspected by the implementer". It never claims direct inspection of a page it did not see.
3. **Stops at the guardrails.** A record cannot make the implementer certify more than `establishes` says, infer an installation procedure from slot-cost compatibility, resolve an item classed `OWNER`, or skip the independent review. Anything that needs an owner ruling is logged in the register as `DEFERRED_RULES_REVIEW` with no recommended ruling, and unrelated work continues.
4. **Pushes a draft PR and stops** for independent review. Source certifications, partial lifts and ledger changes never merge without that review.

## 5. Tooling that already enforces the boundary (unchanged)

The generator rejects a lift without the evidence its classification requires and without citing an existing repository file; pins every ledger scope row; refuses a complete mechanic while a blocker is open; and cannot make a definition selectable on a ledger entry alone. Checking that an evidence file exists does not establish that its contents justify a release; that remains the independent review's job.

## 6. Applied to the open items

- **D-015.** The reviewer supplies a record covering Core Rulebook printed pp. 68-70 (Trained Only; task-specific kit requirements; the absence of an explicit general installation requirement in the examined sources). Claude implements it and, if the record supports it, prepares the D-015 lift for review.
- **D-013 (KOTOR accessories).** The reviewer supplies a record for printed pp. 75-76. If the record establishes that the text is silent on installation, that is an `OWNER`-class finding and the entry moves to `DEFERRED_RULES_REVIEW` for the project owner; no further images are requested.
- **The remaining 156 definitions** follow the same loop, one family per record.

## 7. What this does not change

CLAUDE.md, the register's append-only history, the certification statuses, the G8 loader boundary and the rule that Claude Code is an implementer and not a rules adjudicator are unchanged. Adopting this protocol as a standing instruction in CLAUDE.md is a separate change that the owner decides.
