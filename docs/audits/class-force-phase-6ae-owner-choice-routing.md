# Class Realignment IV — Phase 6AE: Temptation target-choice ownership

**Date:** 2026-11-17  
**Parent:** Phase 6AD draft PR #1163 at `d27136dc94473a658f6abd358bd9e65f6e0d0641`.  
**Scope:** User-interface routing of an already committed Sith Lord Temptation consequence. No new spending, socket, or gameplay state authority.

## Verified selection problem

`registerSithLordTemptationHooks()` consumes the locally emitted
`swse.resourceSpent` receipt and, when it installs pending consequences,
immediately calls `resolvePending(event.actor)` on **the same client**.

This is appropriate when the affected character's player initiated the
spend. It is not appropriate when a GM spends on a connected player's
behalf: the same code automatically opens the consequence-choice dialog
on the GM's client. The printed rule gives the affected character the
choice (or the GM where the actor is not player-controlled). GM authority
to adjudicate an unresolved event does not mean that the GM should
automatically take that choice from an online owner.

## Bounded correction

- Add pure `shouldAutoPromptTemptationChoice(target,{user,users})`.
- If the local caller is a **non-GM owner**, continue the existing
  post-commit prompt.
- If a **GM** spent on behalf of a target with a connected non-GM OWNER,
  leave the consequence pending on the existing target-owned
  `TEMPTATION_EVENTS_PATH` ledger and show the GM an informational notice.
  The player can resolve it using the existing actor-sheet
  **Temptation — Resolve** control. The GM can still invoke the same
  manual review control for adjudication.
- If no connected non-GM owner is present (such as a GM-controlled NPC
  or an offline player's character), retain the existing GM fallback.
- Unverifiable owner permissions fail closed on automatic selection.
- Do not create a remote dialog, fake receipt, socket transport,
  second spend listener, or new ledger.

## Tests

`tests/class-phase-6ae-temptation-owner-choice-routing.test.mjs` verifies:
local player owner, non-owner, GM spending on active owner, alternative
Foundry Users collection shapes, GM NPC/offline-owner fallback, permission
exception, and receipt-before-dialog ordering in the current hook.
It also verifies the existing sheet review affordance is still present.

## Remaining acceptance gates

1. A connected player on another client **will not be automatically shown a
   dialog** by this change. The pending ledger is synchronized by Foundry
   Document updates; the player must use the existing sheet control.
   In Foundry V13 verify actor-sheet rerender, visible pending count,
   actual owner permissions and GM notice.
2. This patch is not a reliable distributed committed-spend transport.
   `swse.resourceSpent` is still emitted locally and ActorEngine receipt
   delivery failure is not durably queued. Do not invent consequences
   from a client-supplied socket message or resource pool deltas.
3. Multiple player owners or simultaneous GM/manual adjudication can race
   across different clients; existing in-process actor serializers are not
   cross-client CAS.
4. Keep the Force Powers/Techniques/Secrets and Ship Maneuvers refactor
   as the authority for its own content/execution. This patch only
   changes Temptation's UI decision routing.
5. Independent review, exact-head CI, and actual Foundry V13 multiplayer
   acceptance are required before merging any stacked Force-class PR.
