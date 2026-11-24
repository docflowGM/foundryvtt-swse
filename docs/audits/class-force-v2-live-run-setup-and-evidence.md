# Class/Force V2 — Foundry v13 live-run setup, console recipes and evidence record

Companion to `class-force-v2-foundry-v13-acceptance-matrix.md` (the scenario list). **Nothing is `FOUNDRY_TESTED` until a person has executed a row in a live GM + player session and attached the evidence below.** This document only prepares that run.

## 0. Run record (fill in per run; one copy per session)
| Field | Value |
| --- | --- |
| Branch / exact HEAD SHA | `integration/class-force-v2-20261122` @ `________` (at preparation: `f65a60410`) |
| System id / manifest version / compatibility | `foundryvtt-swse` / `4.3.0` / min 13, verified 14 (from `system.json`) |
| Foundry core version / build | ________ |
| World name, created from a CLEAN copy of | ________ |
| GM client (browser, OS) / Player client (browser, OS, **different machine**) | ________ / ________ |
| Date, tester(s) | ________ |
| World clock at start (`game.time.worldTime`) | ________ |
| Baseline snapshot saved (export of each fixture actor + combat) | file names ________ |

## 1. Setup (repeatable)
1. Create a fresh world, install the system at the SHA above (git checkout of the branch into `Data/systems/foundryvtt-swse`), enable no other modules.
2. Users: one GM; one Player user (`Player1`). Give Player1 **Owner** of the player-owned actors below and **no** access to the others. Do not use a GM-flagged account as the player.
3. World settings: leave Last Grasp / Emergency Patch **off** except rows I1/I2 (then switch both on, note the time).
4. Create the fixtures below from compendium content (never hand-typed rules text). Record each actor's id (`actor.id`) in the table.
5. Create one Scene with tokens for every combatant, start ONE Combat, roll initiative so the order is: Target PC, Sith Lord, Ally, Engineer, Alchemist (rows C3 reorders it later).
6. Export every fixture actor (right-click > Export Data) and the combat as the **baseline**; re-export after each row that mutates state.

| Fixture | Type / build | Owner | Key starting state | Actor id |
| --- | --- | --- | --- | --- |
| Sith Lord | character with the Sith Lord class (levels as required by the class feature) | GM | Dark Side Score >= Wisdom score (e.g. DSP 14, WIS 12); Temptation available | ____ |
| Target PC | character | Player1 | FP 3/5, Destiny 2, credits 1000, DSP 2 | ____ |
| Ally PC | character | Player1 | FP 3/5 (WatchCircle recipient) | ____ |
| Jedi Master | character with Jedi Master class | Player1 | Serenity/Fearless eligible | ____ |
| Force Disciple | character with Force Disciple class | Player1 | Indomitable; has a Prophet vision requested (`flags.swse.forceDiscipleProphetAwards` row with `visionRequested:true, pendingGmVision:true`) | ____ |
| Sith Lord (suspended) | same class, DSP < Wisdom | GM | for the "not immune" check | ____ |
| WatchCircle actor | character with WatchCircle Initiate + a ready Farseeing | Player1 | normal FP 3, temporary FP 2 | ____ |
| Vehicle + Engineer | vehicle with `crewPositions.pilot` and `.engineer` set to the PC names; engineer PC | Player1 (engineer/pilot) | hull 0 for Last Grasp row | ____ |
| Alchemist | character with Force Alchemy | Player1 | FP 3, credits 1000, DSP 2 | ____ |
| Hostile Mind-Affecting source | NPC with a Fear / Mind-Affecting effect available (descriptor flag set on the ActiveEffect) | GM | | ____ |

## 2. GM console recipes (exact, one actor and one receipt at a time)
Never run these over all actors and never script a blanket reconcile. Always identify the receipt first.
```js
// 1) INVENTORY — read-only. Replace the actor id.
const a = game.actors.get('ACTOR_ID');
game.swse.forcePointReceipts.listUnsettled(a);          // -> [{ receiptId, abilitySourceRef, reactionEventId, spent, adjudicatedBy, ... }]

// 2) DECIDE (outside the console): did the paid effect really happen?
//    - APPLIED (chat card of the effect exists, the attack event was consumed, the effect/condition is on the target)  -> 'finalize'
//    - PROVEN NOT APPLIED (no effect, no consumed event, GM verified at the table)                                      -> 'rollback'
//    - UNCERTAIN -> do NOT choose; leave the receipt committed (it stays in the inventory) until verified.

// 3a) Effect applied -> make the spend final (also delivers its Temptation trigger exactly once)
await game.swse.forcePointReceipts.reconcile(a, 'RECEIPT_ID', { decision: 'finalize', reason: 'effect applied: <what you verified>' });

// 3b) Proven not applied -> return exactly this receipt (never a whole balance)
await game.swse.forcePointReceipts.reconcile(a, 'RECEIPT_ID', { decision: 'rollback', reason: 'no effect applied: <what you verified>' });

// 4) Re-run (1): the receipt must be gone. Calling (3a)/(3b) again must report { reconciled:false } and change nothing.
```
Evidence to capture: the listUnsettled output before and after, the receipt's `reconciliation` object (`actor.flags.swse.forcePointLedger.receipts`), the actor's FP before/after.

## 3. What each failing-by-design row needs (how to induce it live)
- **Disconnect after payment (G2/J2):** player spends on a paid reaction/rite, then closes the browser tab at the moment the roll dialog opens; reload; run recipe 1 as GM.
- **Disconnect after effect (C4):** player spends inside the Temptation window; close the tab before the choice dialog; reload; the pending choice must still exist once.
- **Two clients, one target (C5/C6):** GM and player act within one second of each other; export the target's ledger afterwards.
- **Alchemy failures (J1):** (a) block the effect step by giving the rite an invalid target; (b) close the player tab right after the FP is paid; (c) change the actor's credits from the GM client between the rite start and its finish. Expected: inverse-delta compensation, unrelated change preserved; ambiguous cases end as `ForceAlchemyUnresolvedError` + a `committed` receipt, never an auto-refund.

## 4. Per-row evidence record (copy one block per matrix row)
```
Row: <id from the matrix>      Build SHA: <sha>      Date/time (wall + world): <...>
Clients: GM <browser>, Player <browser/machine>
Steps performed (exact): ...
Expected: ...            Observed: ...            Result: PASS / FAIL / BLOCKED
Evidence: baseline export <file>, after export <file>, screenshots <files>, console output <file>
Ledger excerpt (receipt ids, states): ...
Notes / defects filed: ...
```
A row may be marked `FOUNDRY_TESTED` only with a PASS block that has all fields and evidence files. FAIL or BLOCKED rows go to the defect list, not to certification.

## 5. Residual engineering concerns to watch during the run (open; not resolved by offline tests)
1. **Alchemy applied-vs-not detection compares numeric balances.** An unrelated equal-sized debit/gain landing in the same instant can masquerade as the rite's write, and the read-modify-write can race another writer. The inverse-delta compensation fixes the old whole-balance clobber and the reproduced apply-then-throw cases but does NOT prove exact compensation under concurrent change. No durable rite idempotency key exists across reloads (the `applying` slot with `pendingCosts` is evidence, not certified idempotence). Scenarios to add and observe: concurrent credit/DSP changes between read, write, re-read and compensation; two activations of the same rite; client closes after payment vs after effect creation; a stale retry against an existing `applying` slot. Required behavior: fail closed to GM review on ambiguity; never guess an auto-refund.
2. **Credit authority.** Alchemy credits change through `ActorEngine.updateActor`, not the store `TransactionEngine` credit ledger, so there is no GM-visible credit audit entry for a rite. `TransactionEngine` is itself documented as not multi-document atomic and allow-lists store/GM/holonet contexts; routing a rite through it would not make FP+DSP+credits atomic and would need a bounded, designed extension (not a fictitious store context). Disposition for now: **OPEN design item**; during the run, record whether the missing credit audit entry confuses reconciliation.
3. **Receipt reconciliation is a console API, not UI.** The actor ledger does not prove whether a reaction effect happened; the GM's verification is the evidence, recorded in the receipt's `reconciliation` field. Test duplicate GM calls and two GM-clock timings.
4. **FP-RD-015 remains OWNER-CONFIRMATION-PENDING** (Last Grasp timing deferred; Emergency Patch failed-check charge provisional). Rows I1/I2 observe, they do not decide.
5. Cross-client delivery is hook-local; the durable outbox carries delivery. Rows C4/C5/L1 are the only proof of that.

## 6. Order of execution (suggested)
A1-A3, B1 (spends and ledgers) -> D1 (clock) -> C1-C3 (Temptation mark / spend / reorder) -> C4-C7 (reload, concurrency, mutual marks, cap) -> E1-E2 -> F1 -> G1-G2 -> H1-H2 -> J1-J2 -> I1-I2 (switch the house rules on) -> K1 -> L1 (repeat C2/C4/G1 across two machines). Re-export baseline between groups so a failure can be bisected.
