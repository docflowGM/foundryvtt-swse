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
| 2 | a **non-GM** player client (separate profile or machine) | paste the same file → sends the cases below, whispered to the GMs |
| 3 | GM client | `SWSE_WP3B_GATE1.report()` → JSON verdict; then `SWSE_WP3B_GATE1.cleanup()` |

The player cases:

| Case | What it sends |
|---|---|
| `honest` | an ordinary message |
| `forged-author-other-player` | `author` set to another player |
| `forged-author-gm` | `author` set to a GM |
| `claim-only` | a payload naming someone else, with the author left alone |
| `tamper-own-message` | the creator edits its message after creation |

**Verdict rule (fails closed):** `IDENTITY_MECHANISM_OBSERVED_SOUND` only if all of these hold, otherwise `NOT_VERIFIED`:
- an honest request was delivered;
- its stored `author` and the creation hook's `userId` both equal the real sender;
- no forged author was ever stored as the forged user;
- the claim-only message's author is the real sender.

A sound result holds for that Foundry build and server only, so the report records `game.version` and the build; it must be repeated after a Foundry upgrade. Any accepted post-creation update shows that the executor must bind to the **creation snapshot** and treat later edits as tampering.

**Probe logic test:** `tests/wp3b-gate1-identity-probe-logic.test.mjs`, 6/6, using simulated server behaviour.
- Covered: a sound server; a server that stores a forged author; a mismatched hook user; no delivery; a forged author rewritten to the true sender; the player-side case set.
- Mutations killed: the forged-author check, the hook-user check, and the player never sending a forged author.
- One equivalent mutant: the separate "honest delivered" check is already implied by the author-match check.

## 2. Blocker B — the coordinator WP3-B extends is not on `main` (architecture)

WP3-B is specified as a transport and executor around the **WP3-A coordinator** (`equipment-state-coordinator.js`, `equipment-transaction-journal.js`, `intent-fingerprint.js` with its tested pure SHA-256, `equipment-state-reader.js`, `weapon-record-invariants.js`). Those exist only on `audit/equipment-ecosystem-e0-e1` (commits `7a95453`…`cb2cec7`, after the EQ-INT-1 boundary). They depend on **WP1, the clean-break weapon schema**: `template.json` and the item defaults replace `system.equipped`/`dualWielded`/`wieldedTwoHanded` with `weaponPosture`/`weaponOccupancy`, and there is no migration. On `main` the readers still use the legacy fields. Bringing WP1–WP3-A into `main` alone would make newly created weapons read as unequipped, which is the cutover the directive excludes. Writing Gates 2–5 directly on `main` would mean a second coordinator, journal and hash, which "do not introduce another equipment-state authority" forbids.

G18's target (`InventoryEngine.js:240` minting a fresh `randomID` per call) is also WP4 code, not on `main`.

**Options (owner decision; no recommendation is binding):**

| Option | What it means | Consequence |
|---|---|---|
| **B-1** | Build WP3-B/G18/G36 on the equipment lineage (from `audit/equipment-ecosystem-e0-e1` or the TI-1 head) as its own reviewable draft PR, integrated later with the cutover (EQ-INT-2) | Reuses the existing authority; no player-visible change on `main`; deviates from "branch from `main`" |
| **B-2** | First integrate WP1–WP3-A into `main` (an EQ-INT-1b), then build WP3-B from `main` | Requires the existing-character data policy and changes new-weapon behaviour on `main` before WP4–WP9: effectively starts the cutover |
| **B-3** | Wait: do Gate 1 first, then choose B-1 or B-2 knowing whether the identity route exists | No implementation until the probe result is in |

Engineering preference: **B-3, then B-1.** Without a verified identity mechanism the transport has no safe design target. B-1 keeps the single coordinator authority and leaves `main` behaviour unchanged until the convergence gate.

## 3. What is already settled (for when the gates open)

These are recorded so they are not re-decided:
- **Spend-last action economy:** approved conditionally in WP3-A, with spend idempotent by `requestId` marker. No `undoLast`, no whole-actor restore.
- **Lease/epoch is advisory only:** it cannot authorize a mutation on its own (WP3-B requirement 3).
- **SHA-256 already exists:** the pure, vector-tested `intent-fingerprint.js` works over HTTP. No second hash will be added.
- **Journal phases and request handling already exist:** PREPARED/APPLIED/FINALIZED/NOT_APPLIED/PARTIAL/INDETERMINATE, `REQUEST_ID_CONFLICT` and `DUPLICATE_UNRESOLVED`. G36 adds a GM-only reconcile that classifies from the journal plus current state and never replays.

## 4. Not done (by directive)

No socket handler, player route, executor lease, journal reconcile operation, InventoryEngine change, WP1–WP9 integration, EQ-001–EQ-004 ruling, character migration or legacy deletion.
