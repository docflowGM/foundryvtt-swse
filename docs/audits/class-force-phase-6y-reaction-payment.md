# Class Force Phase 6Y — Reaction payment / Temptation receipt convergence

**Date:** 2026-11-17
**Parent:** Class Force Phase 6X draft PR #1154 at `1be23e63bc6097602859f4da50a578d4d9f12328`.
**Scope:** Existing reaction payment boundary only; does not change Force Power / Technique / Secret / maneuver execution.
**Status:** Implemented as draft, exact-head CI and Foundry V13 live verification required.

## Verified defect and reachability

`scripts/ui/chat/chat-interaction-bridge.js` invokes
`ReactionEngine.resolveReaction({reactionKey,attacker,defender,attackContext})`.
`scripts/engine/combat/reactions/reaction-engine.js` previously:

1. Used the optional caller `forcePointCost` (which the chat bridge did not
   supply) instead of authoritative `reactionDef.cost.forcePoints`.
   Thus the registered Force Reflection cost of **1 FP** was not enforced on
   that path.
2. Ran the handler **before** checking its paid FP cost, allowing effects to
   resolve on an unpaid action if the resource had been spent elsewhere.
3. Deducted a raw `system.forcePoints.value` delta through
   `ActorEngine.updateActor`, bypassing `swse.resourceSpent` for Sith Lord
   Temptation.
4. Returned success and consumed the frequency limit even when a handler
   threw or returned `success:false`.

The registry's first-wave `force-point` and `destiny-point` fallback
handlers also directly wrote the two resources. They could display a
successful spend at zero and missed typed receipts. Their ability to run is
conditional on the legacy fallback registration being live; this patch does
not claim these handlers are reached in every current V13 scene.

## Bounded corrections

- Pay the maximum of `reactionDef.cost.forcePoints` and any explicit
  caller-added cost. Never allow a caller to waive the declared cost.
- Reject non-integer, negative or otherwise invalid costs before running
  the handler.
- Use `ActorEngine.spendForcePoints` **before** invoking the reaction
  handler; require `spent === cost` for effect admission. ActorEngine
  alone owns bonus-first FP pool allocation and typed post-commit receipt.
- If payment is partially committed, return failure **without running the
  handler** and require GM review. Do not attempt an unverified cross-pool
  refund, which could corrupt bonus FP entries.
- An attempted reaction's actual resource cost stays committed if the
  reaction's roll/handler fails. This preserves the old payment-on-attempt
  behavior, but no longer falsely reports success or records an activation.
  The receipt represents a real spend, not a successful defense.
- Route fallback Force/Destiny payment through
  `ActorEngine.spendForcePoints` / `spendDestinyPoints`. Show failure
  when no point was paid.
- No new resource issuer, socket bridge, compatibility store, or direct
  actor mutation. No effect on unrelated zero-cost reactions.

## Additional verified chat-runtime mismatch

The existing ReactionEngine used `SWSEChat.postMessage()` at both its
frequency-block and successful-resolution paths, but
`scripts/chat/swse-chat.js` exposes `postHTML()`, not `postMessage()`.
This could throw after an otherwise valid effect and committed FP spend,
misreporting the mechanical result. The code now uses a single local
`postReactionStatus()` formatting helper around the canonical
`SWSEChat.postHTML()` API. It escapes reaction label and message text and
logs failed chat delivery instead of reclassifying a completed mechanical
reaction as a failure. The unit tests assert the real supported method and
exercise nonfatal chat display errors.

## Verification

`tests/class-phase-6y-reaction-committed-payment.test.mjs` loads the real
ReactionEngine via the existing Foundry test shim and grafts the real
ActorEngine FP authority. It checks registered costs, receipt-before-handler
ordering, bonus FP allocation, insufficient payment, failed paid attempt,
free reaction, invalid cost, and static regression coverage for both
fallback payment paths.

## Remaining release gates and risks

1. Verify **actual** Force Reflection reaction on Foundry V13 and ensure
   the reaction is authorized by owned abilities and valid attack
   context. Registration/global-key ownership and reactions not enforcing
   all contextual conditions are separate correctness concerns.
2. Paid reaction handlers may have irreversible side effects. If a
   post-payment handler throws, the spend remains committed and must be
   handled by the GM; do not silently refund without transactional
   effect compensation.
3. The legacy fallback registration itself is conditional. Verify whether
   both fallback resource buttons are actually exposed; avoid claiming a
   runtime path based only on matching source text.
4. The parallel Force Power/Technique/Secret/Ship Maneuver refactor owns
   its content and executor APIs. This PR must not overwrite its changes.
5. Multi-client Temptation delivery is still unverified. Local
   `Hooks.callAll` notifications are not distributed transport.
6. CI green != Foundry V13 certification. All Force 6J–6Y PRs remain
   stacked drafts for independent integration review.
