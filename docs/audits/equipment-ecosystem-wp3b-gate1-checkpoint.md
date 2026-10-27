# WP3-B / TI4-B G18 / G36 — Gate 1 checkpoint and blocker report

**Status:** stopped at the authorized security gate. Gate 1 cannot be completed from the development environment. Gates 2–5 are blocked on an architectural decision. Nothing that executes a player-originated mutation was written. Not self-certified; awaiting owner decision and independent review.
**Base:** `main` @ `cdb1a012e3b71a2b21cde4ed02f5e668cf3e52b7` (EQ-INT-1 merge).
**Statuses:** probe `IMPLEMENTED` + `OFFLINE_TESTED` (probe logic only). Identity mechanism `RUNTIME_UNVERIFIED`. Nothing `FOUNDRY_TESTED`.

## 1. Blocker A — Gate 1 needs a live Foundry V13 world (runtime)

Gate 1 asks whether a GM-side executor can learn the real sender of a request without trusting a payload user id. That is a property of the Foundry **server**, and offline code cannot establish it. The development container has no Foundry V13 installation, and no user computer is attached to this session. As the directive requires, player-execution enablement stops here: no asserted-identity fallback is adopted.

**Delivered so the owner can run it:** `tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js`. This is a console script; it is not shipped and the system never loads it.

| Step | Where | What |
|---|---|---|
| 1 | GM client, browser console | paste the file → installs `createChatMessage` / `updateChatMessage` listeners |
| 2 | a **non-GM** player client (separate profile or machine), in a world with **one GM and two non-GM users** | paste the same file → sends every case, then an attempt manifest, all whispered to the GMs; prints PLAYER RESULTS |
| 3 | GM client | `SWSE_WP3B_GATE1.report('<user id the operator logged in as on the player client>')` → GM REPORT; then `SWSE_WP3B_GATE1.cleanup()` |

Keep **both** outputs, with their nonces, message ids and the Foundry build, for reconciliation.

The required player cases:

| Case | What it sends |
|---|---|
| `honest` | an ordinary message |
| `forged-author-other-player` | `author` set to the second non-GM player |
| `forged-author-gm` | `author` set to a GM |
| `claim-only` | a payload naming someone other than the sender, with the author left alone |
| `manifest` | the attempt manifest: one entry per case with its nonce, outcome (`created` / `rejected: …` / `skipped: …`) and message id |

`tamper-own-message` (editing the honest message after creation) is informational and is recorded in the manifest.

**Identity basis (corrected in R1):** identity is judged against the player login the **operator confirms** when calling `report()`. `senderUserId` and every other payload field are reconciliation aids only and never count as identity. One run is bounded empirical evidence for one world and one Foundry build. It is not a general authentication guarantee.

**Verdict rule (R1; fails closed; missing evidence never counts as success):**
- **`OBSERVED_SOUND`**: only if every one of these holds:
  - the operator confirmed an existing non-GM player;
  - a manifest from that player was received;
  - `honest` and `claim-only` were created and delivered, attributed to the confirmed player by both the stored `author` and the creation hook's `userId`;
  - `claim-only` asserts a different identity;
  - each forged case was attempted against an identity other than the player and was either **rejected and never delivered**, or **delivered but rewritten** to the confirmed player;
  - every received probe message is attributed to the confirmed player.
- **`NOT_VERIFIED_FAILED`**: contrary evidence:
  - a forged author was stored as the forged user (`forgeryAccepted`);
  - a "rejected" attempt arrived anyway;
  - any message was attributed to someone other than the confirmed player.
- **`NOT_VERIFIED_INCOMPLETE`**: missing evidence:
  - no operator confirmation, or the confirmed user is a GM or unknown;
  - no manifest;
  - a case missing from the manifest or skipped (for example, no second player);
  - a case reported created but never received;
  - a claim-only message whose claim equals the player.

Any accepted post-creation update shows the executor must bind to the **creation snapshot**.

**Probe logic test:** `tests/wp3b-gate1-identity-probe-logic.test.mjs`, **17/17** after R1, using simulated server behaviour.
- **R1 fail-before at `2514219`:** 5/16. Some of those 5 passed only because the verdict string was renamed. The old probe returned `IDENTITY_MECHANISM_OBSERVED_SOUND` when only an honest message was delivered, and when no forged attempt was ever observed.
- **Mutations:** 11 verdict-gate mutants, all killed. They were: missing case ignored, skipped counted as pass, claim-only equal claim, payload sender used as identity, accepted forgery undetected, hook user unchecked, created-but-unseen passing, GM accepted as player (both gates), rejected-but-delivered ignored, missing manifest, and the global attribution rule off.
- **Equivalent mutants (recorded):** removing only the GM incomplete-reason line, which is enforced again where the player id is computed; and an earlier misplaced payload-sender mutant.

## 2. Blocker B — the coordinator WP3-B extends is not on `main` (architecture)

WP3-B is specified as a transport and executor around the **WP3-A coordinator** (`equipment-state-coordinator.js`, `equipment-transaction-journal.js`, `intent-fingerprint.js` with its tested pure SHA-256, `equipment-state-reader.js`, `weapon-record-invariants.js`). Those exist only on `audit/equipment-ecosystem-e0-e1` (commits `7a95453`…`cb2cec7`, after the EQ-INT-1 boundary). They depend on **WP1, the clean-break weapon schema**: `template.json` and the item defaults replace `system.equipped`/`dualWielded`/`wieldedTwoHanded` with `weaponPosture`/`weaponOccupancy`, and there is no migration. On `main` the readers still use the legacy fields. Bringing WP1–WP3-A into `main` alone would make newly created weapons read as unequipped, which is the cutover the directive excludes. Writing Gates 2–5 directly on `main` would mean a second coordinator, journal and hash, which "do not introduce another equipment-state authority" forbids.

G18's target (`InventoryEngine.js:240` minting a fresh `randomID` per call) is also WP4 code, not on `main`.

**Options (owner decision; no recommendation is binding):**

| Option | What it means | Consequence |
|---|---|---|
| **B-1** | Build WP3-B/G18/G36 on the equipment lineage (from `audit/equipment-ecosystem-e0-e1` or the TI-1 head) as its own reviewable draft PR, integrated later with the cutover (EQ-INT-2) | Reuses the existing authority; no player-visible change on `main`; deviates from "branch from `main`" |
| **B-2** | First integrate WP1–WP3-A into `main` (an EQ-INT-1b), then build WP3-B from `main` | Requires the existing-character data policy and changes new-weapon behaviour on `main` before WP4–WP9: effectively starts the cutover |
| **B-3** | Wait: do Gate 1 first, then choose B-1 or B-2 knowing whether the identity route exists | No implementation until the probe result is in |

**Owner decision (2026-10-27): B-3, then B-1; not B-2.** Complete and review the probe, run it in a throwaway Foundry V13 world (one GM, two non-GM users), and only if identity is established develop WP3-B/G18/G36 on the existing equipment lineage, integrated with the cutover. Engineering preference was the same: Without a verified identity mechanism the transport has no safe design target. B-1 keeps the single coordinator authority and leaves `main` behaviour unchanged until the convergence gate.

## 3. What is already settled (for when the gates open)

These are recorded so they are not re-decided:
- **Spend-last action economy:** approved conditionally in WP3-A, with spend idempotent by `requestId` marker. No `undoLast`, no whole-actor restore.
- **Lease/epoch is advisory only:** it cannot authorize a mutation on its own (WP3-B requirement 3).
- **SHA-256 already exists:** the pure, vector-tested `intent-fingerprint.js` works over HTTP. No second hash will be added.
- **Journal phases and request handling already exist:** PREPARED/APPLIED/FINALIZED/NOT_APPLIED/PARTIAL/INDETERMINATE, `REQUEST_ID_CONFLICT` and `DUPLICATE_UNRESOLVED`. G36 adds a GM-only reconcile that classifies from the journal plus current state and never replays.

## 4. Not done (by directive)

No socket handler, player route, executor lease, journal reconcile operation, InventoryEngine change, WP1–WP9 integration, EQ-001–EQ-004 ruling, character migration or legacy deletion.
