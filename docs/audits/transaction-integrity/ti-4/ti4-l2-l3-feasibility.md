# TI-4 Phase 0 — L2/L3 Feasibility

**Status:** research and `DESIGN_PROPOSAL`. **No L2/L3 implementation is authorized.** No Foundry runtime is available in this environment, and the Foundry v13/v14 API documentation and server source were **not** consulted offline; statements about Foundry platform behavior are therefore labelled `RUNTIME_UNVERIFIED` and must be confirmed against the v13 API reference and a live world before any design relies on them. Statements about *this repository* are `SOURCE_VERIFIED`.

`system.json` declares compatibility minimum 13, verified 14, maximum 14 (`system.json:7-11`). Feasibility conclusions apply to v13 and must be re-checked on v14.

## 1. What the repository already proves it can do

| Capability | Evidence | Relevance |
|---|---|---|
| GM-executed requests over the system socket | `holonet-socket-service.js:63-140`: players `emit` a request with a `requestId`; every active GM receives it; `HolonetGmAuthority.isPrimaryActiveGm()` lets exactly one GM client act | a working **single-writer GM route** pattern already exists, for Holonet records only |
| Known limit of that pattern | `holonet-gm-authority.js:23-30`: two browser tabs of the **same** GM user both evaluate as authoritative (Foundry exposes no per-connection identity there) | single-writer is not airtight without a per-connection claim |
| Request dedupe by id | socket sync handler records seen `publicationEventId`s (`holonet-socket-service.js:65-80`) | in-memory, per client — L1 only |
| Optimistic revision check on a document | `engine/combat/full-attack-message-state.js:184-195` `appendRevision(... expectedRevision ...)` re-reads the message, compares `activeRevision`, returns `conflict:'stale-revision'`, then one `message.update()` | an **application-level version field** pattern exists (read-compare-write; not atomic across the await, but narrows the window and detects staleness) |
| Document revision reads for caches | `derived-calculator.js:111-133` uses `actor._stats?.modifiedTime` | a platform revision stamp is available for *detection* |
| Persisted soft locks with write-then-reread | `follower-slot-service.js:301-351` (TTL reservations) | soft cross-client reservation pattern exists; not CAS |
| Durable receipts | equipment journal, snapshot ring, `storeAcquisition` marker | L3 building blocks (see recovery design §3) |

## 2. Questions the directive asks, and the honest answers

| # | Question | Finding | Label |
|---|---|---|---|
| 1 | Is there an authoritative GM execution route? | Yes for Holonet (above). **No** route exists for credits, FP, equipment, approvals, progression or followers: these run on the acting client directly, subject only to document permissions. A GM-socket route for AMTs would be a new, larger design with the same-user-two-tabs weakness. | `SOURCE_VERIFIED` |
| 2 | How would requests be authenticated/authorized? | The socket payload carries `requesterId`; the GM executor must **re-derive authorization from fresh documents** (owner of the actor/item, GM status of the *sender*) and never trust payload fields. The existing Holonet handler does not demonstrate sender verification beyond `requesterId` in the payload; Foundry's socket relay semantics (whether the server stamps the sender) are `RUNTIME_UNVERIFIED`. | `RUNTIME_UNVERIFIED` |
| 3 | Can one GM act as the mutation coordinator? | Yes as a *single-writer convention* **iff every writer of the protected resource is routed through it**. Players can edit documents they own directly (sheet fields, any `actor.update`), and Foundry has no per-field write lock, so direct writers (G03: 29 inline FP spenders, ~31 absolute writers, sheet credit button, etc.) bypass the coordinator. Single-writer therefore requires G01/G03 enforcement **first**. | `SOURCE_VERIFIED` (writers) / `RUNTIME_UNVERIFIED` (permission model) |
| 4 | How does ownership change when a GM disconnects? | Existing pattern: "primary active GM" is recomputed from `game.users`; a disconnect changes the primary on the next evaluation. In-flight operations owned by the departing GM are lost (in-memory state) — an `INDETERMINATE` for the requester unless receipts are durable and the new GM can classify them (recovery design §4). | `SOURCE_VERIFIED` (recompute) / design gap |
| 5 | Can state versions be checked reliably? | A revision *stamp* exists for detection (`_stats.modifiedTime`) and an application version counter can be added on a flag. Check-then-write across clients is **not** atomic unless the platform offers a conditional write. | `RUNTIME_UNVERIFIED` (conditional-write capability) |
| 6 | Is compare-and-swap available? | No supported CAS API is used or referenced anywhere in this repository (grep for `expectedRevision|compareAndSwap|ifRevision|CAS` in `governance`/`engine` finds only the chat-message revision check). The TI-2/TI-3 documents already classify credit/FP read-modify-write as `INTENTIONAL_LIMITATION` for this reason. Whether the v13 server applies a document update as a diff atomically with respect to other updates to the same document is platform behavior to be verified; **do not assume** conditional semantics. | `RUNTIME_UNVERIFIED` |
| 7 | What if a write commits but the acknowledgement is lost? | Indistinguishable from not-committed at the client today. Only a durable receipt keyed by `operationId`, read back after reconnect, resolves it; no domain except the `storeAcquisition` marker and the equipment journal has one. | `SOURCE_VERIFIED` (current state) |
| 8 | How can durable operation receipts be retained? | See recovery design §3: per-domain records written **before** the first mechanical write and outside any scope the operation's own compensation restores. | `DESIGN_PROPOSAL` |
| 9 | How can interrupted operations be recovered after reload? | Persisted phase + evidence + a GM reconcile operation (recovery design §4). Today only equipment has the persisted phase; nothing has the operation. | `DESIGN_PROPOSAL` |

## 3. Achievable targets (realistic alternatives)

| Target | Mechanism | Guarantee it can honestly claim | Preconditions |
|---|---|---|---|
| **L1 everywhere** | shared guard keys, per-actor serialization, re-read before write, receipt-first writes | no duplication within one client; detection of stale state | TI4-B/C packages; `G28`, `G30` fixed |
| **L2-lite: single-writer GM route for a *narrow* resource family** (e.g., credits through `TransactionEngine`) | all credit mutations execute on the primary active GM; players send intents | at most one executor per intent **if** direct credit writers are closed and the same-user-two-tabs case is excluded by a per-connection claim | G01/G03 enforcement for `system.credits`; sender-verification proof; GM-failover test |
| **L2-detect: application version counter + conflict reporting** | `flags.<scope>.rev` incremented in the same update; writers send `expectedRev`; mismatch → `REFUSED(stale)` (pattern of `appendRevision`) | **detects** most cross-client interleavings after the fact of read; narrows but cannot close the read→write window unless the platform write is conditional | platform conditional-write behavior verified |
| **L3-basic: durable receipts + GM reconcile** | recovery design | interrupted/lost-ack operations identifiable and classifiable; no automatic retry | receipts outside restore scope; reconcile operation |
| **Not achievable via supported APIs (assume until disproven)** | distributed ACID, cross-document atomic commit, true compare-and-swap | — | document as a limitation; keep compensation honest |

## 4. Risks of the single-writer route

1. **Two tabs of one GM** both claim authority (existing documented limitation) → need a per-connection claim token stored in a world flag with expiry, or a rule that mechanics execute only from a GM-focused tab. `RUNTIME_UNVERIFIED`.
2. **Direct writers** (players with owner permission, macros, other modules) bypass the route. Only a call-path guard (CI) and an application-level version check can *detect* them, not prevent them.
3. **Failover** loses in-memory state; reconcile depends on durable receipts.
4. **Latency and UX**: every AMT incurs a socket round trip; acceptable for purchases/approvals, unacceptable for per-attack FP/ammo without batching. Not all domains should move.
5. **Permission model**: whether players may write the world settings behind stock/queues/sessions is `RUNTIME_UNVERIFIED` (inventory G10/P29).

## 5. Required runtime experiments before any L2/L3 claim (to be scheduled in TI4-E)

1. Two clients, one actor, simultaneous `actor.update` of the same flag path: observe merge vs last-write-wins and whether `_stats.modifiedTime` changes monotonically.
2. Two clients, simultaneous relative-style updates of `system.credits` through the existing TE: confirm the lost-update window and measure it.
3. Socket round trip: verify the receiver can establish the **sender's** user id from the relay (not the payload).
4. GM disconnect mid-operation; reconnect; classify via receipt.
5. Write-then-drop-connection: observe whether the update persisted (lost-ack scenario).
6. Non-GM write permission for the world settings used by queues/stock/sessions.
7. Snapshot restore fidelity for embedded ids (Q-033-H9/T13).

Until these run, every L2/L3 statement in this package is a design hypothesis.
