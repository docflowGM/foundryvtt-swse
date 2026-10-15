# SWSE V2 — GM-controlled installation checks and optional equipment/facility bonuses

**Classification:** Project Owner policy direction (2026-10-15), plus explicitly labeled engineering proposals. **Documentation only.** Not published SWSE source, not adopted executable mechanics, not a blocker lift, and not authority to alter G4–G9.
**Scope:** Ordinary equipment-upgrade installation under *Scum and Villainy* printed p. 39 / Table 2-2. Any extension to removal, scratch-built upgrades, specific specialist feats or other procedures requires its own rule/owner review.

## 1. Explicit owner direction

The Project Owner stated:

> I would posit that the taking ten or twenty for regular installation should be sent for approval to the GM, who should be able to auto allow taking 20, 10 or auto reject, or approve/reject on a case by case via houserules. Typically, tool kits allow a bonus towards the roll itself, but does not seem to be a prerequisite to do it. A further bonus is given if they have a facility like a workshop to do the installation as per usual, but again, that is usually up to GM fiat.

Interpret as the owner's direction to **provide GM-controlled house-rule choices**, not as an assertion that either the Core or S&V printed text grants universal bonuses or permits take 20 despite failure penalties. The owner has **not** specified a universal numeric kit bonus, a workshop bonus, a default policy mode, or an automatic retry/cost resolution. Do not invent any of these.

## 2. Separate published baseline from optional house rules

| Operation / input | Published rules, as directly visually checked | Owner's GM policy / limits |
|---|---|---|
| **Take 10, ordinary installation** | Core p. 60 allows take 10 for a trained user not rushed, threatened or distracted; Mechanics p. 70 generally permits take 10. S&V p. 39 has no special prohibition. | Offer GM-controlled approval policy; GM may automatically allow or refuse or rule per request within the future house-rules UX. This is a policy/permission layer, not a rewording of the published conditions. |
| **Take 20, ordinary installation** | Core p. 60 requires no penalty for failure; S&V p. 39 has failure and retry consequences. Printed baseline is **not eligible** for automatic take 20. | GM may expressly allow take 20 as a **campaign house-rule exception**, or reject/decide case-by-case. A global auto-allow setting must be GM-authorized and explicitly marked `HOUSE_RULE`; it must never be labeled `PUBLISHED_RULE`. |
| **Tool kit, ordinary installation** | Core Mechanics p. 70 grants optional +5 to the *Jury-Rig* use and specifically requires tools for *Modify Droid* and *Repair*; those paragraphs do **not** grant a universal toolkit bonus or requirement to S&V Table 2-2. S&V pp. 37–41 print no generic toolkit prerequisite. | No automatic toolkit prerequisite or invented generic bonus. The GM can choose a house-rule circumstance/equipment modifier, with a **GM-provided numeric value** (or approved policy), separate from printed specific-use bonuses. |
| **Workshop / facility, ordinary installation** | S&V p. 39 narrates work in an “overheated workshop” but does not specify a universal facility prerequisite or bonus. | GM may grant an explicitly chosen optional facility modifier as a house rule; **no printed numeric amount** is inferred. |
| **Tech Specialist feat** | *Starships of the Galaxy* p. 21 separately forbids taking 10 or 20 on its Tech Specialist modification check. | **Not in this ordinary-installation house-rule scope**. Extending the exception would require a distinct owner decision and a visibly identified rules override, not accidental reuse of Table 2-2 settings. |
| **Removal, failed install, costs, and transactions** | S&V p. 39 defines distinct removal and failure consequences; retry-cost basis is not fully specified. | Owner Q-021–Q-024 / Q-029 rulings continue separately. No GM take-20 allowance silently waives cost, time, failure consequences, deactivated-state rulings or transaction guards. |

## 3. Proposed house-rule UX contract (ENGINEERING_PROPOSAL; not an owner-approved schema)

The future **world-level GM-controlled** house-rules interface for *ordinary Table 2-2 installation only* should offer clear approval behavior, with no player-side direct authorization. Suggested policy mode names (names are *proposals*, not a committed data schema):

- `AUTO_ALLOW_TAKE_10`: a trained character's take-10 request may be approved automatically under campaign policy. **If the Core no-rush/no-threat/no-distraction conditions are met**, this is approval of an otherwise published option; **if they are not met and the GM nevertheless permits it**, the GM is expressly applying a separately audited house-rule exception. Do not conflate these two sources of authority.
- `AUTO_ALLOW_TAKE_20_HOUSERULE`: GM has knowingly chosen an exception to the printed Core failure-penalty constraint for this operation; UI must visibly label it as house-rule behavior.
- `AUTO_REJECT_TAKE_10_20`: refuse these alternatives for the governed operation. Rejecting a take-10 request that otherwise meets Core's printed conditions is itself a restrictive GM house-rule policy, not a claim that published SWSE forbids it.
- `REQUEST_GM_DECISION`: route each request to the GM's approval surface for approve/reject, optionally recording a reason and terms.

**Configuration shape is not yet decided.** Whether to provide one global mode, separate take-10 and take-20 policies, request-specific exceptions and inheritance/default priority needs an implementation design review. No default mode is authorized by this note. No client-side toggle, text field or item flag can assert GM approval.

**Approval alone is not an install transaction.** The eventual check still needs a certified mechanic, valid trained installer, applicable DC, legal host, valid budget, time and source/owner decisions, slot state, and Q-033 transactional safety. Taking 10 means a check die value of 10; taking 20 means an explicitly GM-authorized house-rule resolution that must account for the printed time and failure penalties through the GM's adjudication. Neither mode may silently turn unknown attempt costs into zero or mark failure consequences absent.

Tool-kit and facility adjustments should be distinct typed entries in an audit trail: `source: OWNER_HOUSE_RULE`, `value: GM_AUTHORIZED_NUMBER`, `reason`, `gmId`, `targetItemId`, `actorId`, and `scope`. This is only a **suggested audit shape**, not authorized production fields. Never auto-apply Core Jury-Rig's printed +5 to a different Mechanics use.

## 4. Evidence and owner-policy boundaries

- Direct source reconciliation: `docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md` (same research branch), Core pp. 60, 68–70, S&V pp. 37–41.
- Existing owner policy: Q-021, Q-022, Q-023, Q-024, Q-026, Q-029 in draft PR #1047. This supplemental policy is **not** a replacement for any of them.
- D-015 remains `PENDING_SOURCE_VERIFICATION` in the machine-enforced register; source research does not equal register certification. D-014 remains open; Q-025 source reconciliation is not erased.
- A successful GM approval for a *house rule* is not a certification, selector unlock, execution permission or bypass of `EXECUTOR_NOT_CERTIFIED`, G6, G7, or TransactionEngine/ActorEngine.
- Neither the UI modes nor GM-supplied bonuses have been coded or tested here. No source claim for a universal toolkit/workshop modifier is made.

**Unresolved design inputs:** GM default mode; whether take 10 and 20 use separate settings; any per-table GM-defined kit/facility numeric values; how a take-20 waiver handles time, cost and intermediate failure states; exactly how and when approvals are auditable and consumed. Record these as future implementation choices rather than assuming values.
