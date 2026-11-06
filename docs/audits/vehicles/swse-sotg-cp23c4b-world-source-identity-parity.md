# Starships of the Galaxy CP23-C4B — World Actor identity versus canonical source identity

**Status:** structural world/source verification complete as an audit-only gate. **Receipt issuance remains disabled** because the fifteen staged canonical source Actors are not part of an authenticated registered native pack.

## Problem corrected

The CP23-C2 read-only comparator requires the actor-shaped document's `_id` to equal the CP23-B source-draft `_id`. That is appropriate for verifying the isolated draft, but it would reject a perfectly ordinary GM replacement import where an existing **world Actor has its own unrelated Foundry document ID**.

CP23-C4B separates those two identities before comparison, WITHOUT weakening the trust boundary:

- The source `_id` is one of fifteen hard-pinned CP23-C3 unarmed native document IDs.
- The target **world Actor ID** is authenticated independently as a live reference in `game.actors`; it is not used as a fake source identity and may differ.
- The actor's data-model/toObject ID must agree with the live Actor document ID. Copied references and forged data snapshots fail.
- The comparison uses an in-memory, normalized **copy** of the world Actor's configuration with the expected source ID, never rewriting the world Actor's ID or persistent fields.
- Only limited current HP, temporary HP, and current shields can vary, as previously approved for CP23-C2; item installations, shipyard modification, name/type/portrait, base stats, weapon groups, max HP/SR, altered crew and provenance flags block parity.
- The native source must come from the expected Actor pack; a registered pack read must return the **same exact document object**. The active GM and world reference must be stable across the read.
- A matching native source and world Actor leads only to `CP23C4B_MATCHED_UNAUTHENTICATED_NATIVE_CANDIDATE`, and ALL trust fields are false.

## Source authority

`scripts/domain/vehicles/vehicle-cp23c4b-source-anchors.generated.js` is a frozen runtime-facing mirror of the immutable CP23-B Actor drafts and CP23-C3 individual native staging JSON files. It contains 15 distinct source identities and per-document pinned Git blob SHA values.

`tools/audits/vehicles/build_sotg_cp23c4b_world_anchors.mjs --check` recompiles and validates it **byte for byte** from:

- CP23-C3 stage manifest Git blob `6c3e3ded146a300c4d16af66b9db2cff7e88145e`;
- CP23-B proposal Git blob `a9170481f9c0bb34fe31741b7194ac54e2933501`;
- all 15 stage JSON document Git blob hashes;
- `system.json`, which must still NOT register either audit-only pack.

This embedded mirror documents *proposed* source identity, not a verified release pack. It is not a second combat calculation engine and must not become an actor import shortcut.

## Runtime API

- `inspectCP23C4BWorldInstallationCandidate({actor,sourceDocument,mode,preserve,game})`: read-only matching/refusal, with GM, world membership, native pack and source/target identity gates. It does **not** call ActorEngine, set world settings, create embedded documents, mutate Actors or return a verified source-binding receipt.
- `verifyCP23C4BClaimedReceipt(receipt,actor,game)`: **unconditionally DENIES**, regardless of what a caller, user setting or Actor flag claims. No issuer or valid verified receipt schema exists in this checkpoint.
- `tests/phase2c_cp23c4b_world_identity.test.mjs`: all 15 source cases with distinct world IDs, permitted transient state changes, every tested invalid source and Actor mutation, GM/pack/world reference spoofing, async reference changes, and rejected forged receipt payloads.

These APIs are exported by the existing vehicle evidence authority façade but are not an import hook and not a combat authorization path.

## Security and correctness qualifications

Successful source/Actor equality does **not** prove that the Actor was installed through ActorEngine or that the pack's compiled LevelDB bytes are authenticated. The test harness can construct a fake but structurally equal native pack object; that is exactly why the result remains *unauthenticated*. The repository has no live Foundry V13 installation attestation, transactionally consistent cross-client GM receipt store or mutation/event invalidation coverage sufficient to issue verified receipts.

The existing CP23-C4A world setting contains **unverified legacy import observations only**. It must never be reused as trusted source authority, even when its entries match the world Actor and the CP23-C3 source catalogue.

## What remains in CP23-C4C

1. Independently verify the proposed GM-only unarmed source pack, its compiled native LevelDB identity and release manifest under a real Foundry V13 runtime, then review/approve pack registration.
2. Govern the exact source-to-world replace transaction with ActorEngine and post-recalc readback, including error recovery/rollback and preserving the world Actor's actual identity.
3. Implement a separately versioned **outside-Actor GM receipt authority**, which cannot be minted from arbitrary Actor flags, legacy observations or a copied source snapshot. Test concurrent GM writers and receipt revocation.
4. Enforce read-time verification and mutation invalidation (ActorEngine, raw Foundry updates, embedded Items, vehicle configuration, pack version updates and Pure/Modified) with live E2E.
5. Keep trusted stock attack registry empty until each physical mount, arc, battery, operator and firing action is mechanically certified.

**Final CP23-C4B authority state: zero authenticated source installations, zero verified receipts, zero physical mount certificates, zero trusted stock attacks.**
