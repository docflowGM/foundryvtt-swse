# Class/Force V2 — Foundry v13 live acceptance matrix (to be executed; nothing below is certified)

Branch `integration/class-force-v2-20261122`. Every line is **offline-tested only** until a human runs it in Foundry v13 with a **GM client and a separate player client** (player owns the test character; the GM does not). Record result, date, build SHA and tester per row; a row is `FOUNDRY_TESTED` only when it passes live.

Setup: world with 3 actors — Sith Lord (GM-run NPC or PC, class level with DSP >= Wisdom), Target PC (player-owned), Ally PC; one started combat; world clock available; settings: Last Grasp / Emergency Patch off unless the row says otherwise.

| # | Area | Steps (live) | Expected | Offline coverage |
| --- | --- | --- | --- | --- |
| A1 | Force Point spend + finalize | player spends a Force Point on a roll bonus; roll completes | one receipt `committed -> finalized`; pool -1; ledger visible after reload | class-force-v2-temptation-trigger, v2 receipt suites |
| A2 | Failed paid roll | cancel/fail a paid roll | receipt rolled back exactly; unrelated regain preserved | trigger suite, attunement/ActiveAdapter/alchemy suites |
| A3 | Round cap | second counted spend same round | refused with reason, nothing charged | force-v2 service tests |
| B1 | Destiny spend | player spends a Destiny Point | separate Destiny ledger receipt, never in the FP ledger | trigger suite D1-D9 |
| C1 | Temptation mark | GM activates Temptation on Target (LOS confirmed) | action paid before roll; mark on Target only if the check beats Will; exact turn stamped | activation-stages (source-order) — **needs live roll stack** |
| C2 | Temptation spend (same round) | player spends FP/Destiny inside the window | one pending-target-choice per active source; owner (not GM) is prompted | trigger suite, owner-routing |
| C3 | Initiative reorder | after C1 the GM reorders initiative; player spends next round before/after the source | window follows combatant identity (open only before the source's turn) | turn-identity suite |
| C4 | Late delivery / reload | disconnect the player's client between spend and consequence; reload | consequence still created once from spend-time evidence; mark never reactivated | trigger suite C1-C11, W8 |
| C5 | Concurrent receipts | player spends FP and Destiny at once | both consequences recorded, no "already running" rejection | W10 |
| C6 | Two Sith Lords mark each other | both activate in the same round | no deadlock; both marks present | activation-stages (serializer) — live needed |
| C7 | Capped condition track | choose "condition" when the track cannot move the full steps | choice stays pending, nothing resolved | 6N/6U guard |
| D1 | GM time | advance world time in the GM clock UI | measured durations (regimen entitlements) change only with world time, never wall-clock | v2-gm-authoritative-time |
| E1 | Serenity (Jedi Master) | Serenity header control, natural-20 eligibility | window follows combat rounds only | serenity suites |
| E2 | Prophet | GM clicks "Prophet — Review Vision" on a Force Disciple with a pending vision | narrative recorded, Destiny left "GM adjudicated separately" | 6P Prophet tests |
| F1 | Immunity | Force Disciple (Indomitable) / Jedi Master (Fearless) vs a Mind-Affecting / Fear effect, Adept/Master Negotiator, Dampen Presence, Yarkora Confusion, Caamasi Pacifism | no CT shift, no effect created, card says immune; Sith Lord below the Wisdom threshold is NOT immune | 6O/6Q/6R/6S suites |
| G1 | Reactions | Block/Deflect with a verified attack event; a paid registered reaction with and without GM adjudication; stale chat button as a non-owner | verified event required; uncontracted paid reaction denied without GM adjudication; non-owner refused; registered cost charged even if the caller omits it | class-phase-6z (13), 03b suites |
| G2 | Reaction settlement | force a finalize failure (e.g. disconnect mid-reaction) | `paymentSettlement` reported; applied reaction not refunded; receipt reconcilable | class-phase-6z failure injection |
| H1 | WatchCircle Initiate | ready Farseeing, DC 15 check, ally with an actor | one normal point leaves, one arrives, no V2 spend receipt, no Temptation; cancelling the dialog keeps Farseeing | watchcircle-exemption (10) |
| H2 | Drain Force | trigger on a Force-sensitive target | target loses a point; actor not charged | classification test |
| I1 | Last Grasp / Emergency Patch (house rules ON) | vehicle at 0 hull with a PC pilot; engineer repair | typed house-rule contract authorizes; one receipt; failed check still consumes (provisional FP-RD-015) | threshold suite |
| J1 | Force Alchemy | rite with a Force Point cost | FP part V2-paid; **credits/DSP rollback is NOT certified atomic** (known open risk) | alchemy suite (FP part only) |
| K1 | Retired legacy | confirm no Dark/Light Side or non-Force macro entry points exist (`game.swse`/`window.SWSE`) and published talents still appear on sheets | nothing legacy is callable; talents present | legacy-talent-retirement guard |
| L1 | Cross-client | repeat C2/C4/G1 with GM and player on different machines | hooks are client-local; the durable outbox, not hooks, carries delivery | trigger suite (single process) — **cannot be proven offline** |

Not covered by this matrix (open, not claimed): Force Alchemy multi-resource atomicity; Last Grasp timing/cap exceptions (FP-RD-015); unresolved reaction receipts after a client closes (no reconciliation tool yet); reactions other than Block/Deflect/Force Fortification rely on chat-dataset context.
