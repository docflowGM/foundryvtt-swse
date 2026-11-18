# Class Realignment IV — Phase 6AD: Temptation exact-turn identity

**Date:** 2026-11-17  
**Parent:** Phase 6AC draft PR #1162 at `90bcbfbfa05e45c641294c9eee39f896f52c7ef5`.  
**Scope:** Sith Lord Temptation's asynchronous caster-action / target-ledger boundary, not general Force content or resource execution.

## Verified correctness gap after Phase 6AC

Phase 6AC deliberately split activation into separate caster and target actor
queues. The first phase spends a standard action and resolves Persuasion
against Will. The second phase, which may execute after queued actor
mutations or other asynchronous work, checks `isCurrentTurn(sith,combat)`
again.

**That check alone does not establish the original action turn.** A GM or
automated combat transition can advance initiative and later return to the
same Sith Lord, making `isCurrentTurn` true despite the earlier Persuasion
roll belonging to another round. A delayed target write would then build
a mark using the later round's `combat.round/turn` and a completed action
from the earlier turn, changing the printed duration and potentially
creating a consequence without a qualifying current-turn action.

## Bounded correction

- Add pure `temptationActionTurnStamp(combat)` and
  `sameTemptationActionTurn(stamp, combat)` in the existing Temptation
  state authority. Stamp only encounter ID, round, turn index, and combatant
  ID; do not persist a second state record.
- Capture the stamp **before** spending the standard action.
- After Persuasion, require the still-current turn to match the stamp
  exactly in addition to the existing class/actor checks.
- Stage the immutable stamp with the successful result across the queue
  handoff. Inside the target queue, compare it to a **fresh**
  `activeCombat()` read, recheck active Sith Lord class entitlement, and
  re-plan the mark using that current Combat document.
- Any changed round, turn, combatant identity, encounter identity or stopped
  combat fails closed without writing a mark. Because the roll/action were
  already completed, report a post-roll GM-review outcome rather than
  refunding a successful check.
- Preserve class authority, actor queues, ActorEngine mutations,
  resource receipts and action economy. No new gameplay engine or socket.

## Regression

`tests/class-phase-6ad-temptation-action-turn-snapshot.test.mjs`:
- Snapshot is a frozen exact turn identity.
- Still-current turn passes even when represented by a different but
  equivalent Combat data object.
- Sith Lord on a later round, another turn index, another combatant, another
  encounter, or a stopped/invalid encounter is rejected.
- Original source procedure captures the stamp before action payment,
  validates after the roll and revalidates inside the target queue before
  persisting the mark via ActorEngine.
- Phase 6AC's static target-lock regression is updated for the stronger
  error description.

## Certification boundary and remaining work

This is a same-client temporal consistency safeguard. It does **not**
authenticate `swse.resourceSpent` across multiple clients or add a
server-side compare-and-swap transaction. Do not use an unauthenticated
socket payload to impose a Temptation consequence. Missing, stale or
unloaded synthetic actors, multiple GMs and remote owner reconnects still
require actual Foundry V13 testing and authority design.

All Force-class implementation PRs remain draft/unmerged pending exact-head
CI, independent review and Foundry multiplayer acceptance.
