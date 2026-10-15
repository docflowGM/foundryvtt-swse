# SWSE V2 — Template retrofit GM-approval design proposal

**Status: `ENGINEERING_PROPOSAL`, documentation only.** No code, data, registry, ledger, register or gameplay change; no V2 executor exists or is proposed here; nothing is merged. Base: `main` at `fb6d6db33eb80a1079dd144c971b982984223b42`.

This responds to the handoff's third deliverable: describe how the reviewer-reported owner policy **OWNER-TEMPLATE-RETROFIT** could reuse the existing GM-approval path, without assuming that path's code can be reused until an architectural review says so.

## 1. The policy being served (as reported; the Project Owner should confirm the wording)

- A template is an inherent property of an acquired item.
- Applying a template to existing owned gear later is a **request**, sent to the existing GM-approval workflow used for ship and droid modifications.
- A printed conversion procedure takes precedence where one exists. Otherwise the GM decides legality, requirements, credit and material cost, and elapsed time for that request.
- A denial changes nothing: no item, credit or state mutation.
- Template rarity, eligibility and stacking limits still apply.
- This is policy, not a published rule. It does not settle the rest of D-013, and it does not authorize G6.

## 2. What exists today (read-only findings)

| Finding | Evidence |
|---|---|
| The Approvals surface is `GMApprovalsSurfaceService` with `GMApprovalOperationsService` orchestrating decisions | `scripts/ui/shell/gm/` |
| Approval keys are typed `kind:id`; the kinds recognised by `parseApprovalKey` are `droid`, `custom` and `game` | `GMApprovalOperationsService.js` lines 28-35 |
| `custom` entries live in the world setting `pendingCustomPurchases` and are approved by index; they carry `ownerActorId`, `draftActorId`, `costCredits`, `draftData`, and `type`/`approvalKind` | `approvePendingCustom`, lines 461-493 |
| Credits already move only through `TransactionEngine`, `StoreEngine`, `ActorEngine` and `GameCreditEscrowService`; the service header states it keeps credits and assets inside those authorities | file header comment |
| Droid approval finalizes with a GM edit step (`finalizeWithEdits` / `applyInlineApprovalEdits`) before approval | lines 38-58 |
| Denial of a request goes through `denyRequest`, which routes by kind | line 58 onwards |

The handoff calls the existing path the one used for "ship/droid modifications". In the repository the visible kinds are droid builds, custom purchases and game settlements; no ship-modification approval kind is visible in the files read, so the path's exact scope for ships is not established here.

## 3. Proposal (all `ENGINEERING_PROPOSAL`)

### 3.1 Keep the two flows distinct

| Flow | What it is | Authority |
|---|---|---|
| Canonical purchased variant | A templated item bought or granted as a whole (inherent template) | Store/catalog purchase through `TransactionEngine`; no GM modification request |
| GM-requested retrofit | A request to apply a template to an owned item | The approvals surface; the GM's decision supplies legality, cost, time |

Mixing them would let a retrofit be priced as a purchase, or a purchase be treated as a GM adjudication.

### 3.1a Acquired templated items keep published restrictions

Purchasing or being granted an item that already has a template (the inherent-property flow) must respect the published rarity, availability, eligibility and stacking restrictions of that template, and the GM's availability controls for the store or campaign. The retrofit policy does not relax any of them for purchases, and a templated purchase is never routed through the retrofit request.

### 3.2 A new approval kind, not a new workflow

A retrofit request would be one more approval kind in the existing `kind:id` scheme, with its own request record and its own approve/deny operations, alongside `droid`, `custom` and `game`. It must not be routed through the existing `custom` purchase mutation path: that path (`approvePendingCustom`) is shaped around a draft actor and a credit cost and has not been reviewed as safe for applying a template to an existing item. Reuse of the approvals surface (listing, display, GM decision UI) is viable; reuse of the custom-purchase mutation is not assumed. It would not introduce a second approvals surface, ledger or credit path. Whether it can reuse the `pendingCustomPurchases` setting (a purchase-shaped record) or needs its own store is an architectural question for review: that record carries a draft actor and a credit cost, neither of which describes "apply template T to item I with GM-set terms".

### 3.3 Request contents (identity only)

The request holds identities and the requester's note, nothing computed by the client: `ownerActorId`, target item id, template typed-definition id, requester note, and a requested-at stamp. Eligibility, rarity, stacking, price, time and legality are **not** accepted from the request; the GM supplies cost and time, and the planner/catalog supply the template's own facts.

**Trusted server-side validation (required, `ENGINEERING_PROPOSAL`).** Identities submitted by a client are claims, not facts. Before a request is queued and again at approval time, the server side must independently verify from live trusted data: (1) the requester owns the actor and has permission to act for it; (2) the target item exists, is owned by that actor and is a permitted host type; (3) the template identity resolves to a canonical template definition in the catalog (not a client-supplied name or id string); (4) the approving user is a GM; and (5) none of the above changed between request and approval (re-verified at approval, not trusted from the stored request). A client-supplied cost, legality flag, time or eligibility result is ignored. A request that fails any check is rejected with no mutation.

### 3.4 Approval and denial

- **Approve:** the GM enters legality, requirements, credit and material cost and elapsed time. Applying the template and charging the cost happen together or not at all (Q-033; the executor's atomic strategy must exist first, so approval cannot be wired to a mutation yet).
- **Deny:** a denial records the decision (and reason) in the approval record only. No item, actor, credit, ledger or flag mutation. This is a test case for the future implementation.
- **Printed procedure present:** the printed values are displayed to the GM as the default and the GM may not silently replace a printed requirement; how a printed procedure overrides GM entry needs a decision from the source records (Q-005 follow-up), not an assumption.

### 3.5 What the V2 modification system contributes

Only reads: template facts from the catalog, slot and eligibility checks through `ModificationSlotAuthority` and the legality module, and template rarity and stacking limits from certified definitions. Template eligibility rules are not yet certified (Report 01 describes templates as manufacturing processes; per-template hosts, stacking and cost transformations are open), so a request cannot be validated automatically today.

## 4. Open questions for review (none answered here)

| ID | Question | Who |
|---|---|---|
| T-1 | Does a ship-modification approval kind exist, and what exactly does "the existing GM-approval workflow" cover? The visible kinds are droid, custom and game | Project Owner / reviewer to confirm scope; Claude to trace |
| T-2 | Can `pendingCustomPurchases` carry a retrofit request, or does it need its own record? | Claude + reviewer (architecture) |
| T-3 | When a printed conversion procedure exists, may the GM override its values? | Source records, then Project Owner only if the text is silent or conflicting |
| T-4 | How does a retrofit interact with stacking limits and with the install/remove slot accounting? | Source records (Q-005 family), then engineering |
| T-5 | What proves atomicity of "apply template and charge cost"? | Q-033 |

## 5. Not proposed

No executor, no `CommandBus` command, no change to the approvals services, no settings, no UI, no data change, no automatic template eligibility, and no retrofit of items on denial or on timeout.
