# Coordinated workstreams — continuation handoff (2026-11-28)

Stacked on `refactor/v2-architectural-realignment` (PR #1186, draft, do not merge). Merge order: #1186 first, then the branches below.

| Branch | Base | Checkpoints (OFFLINE_TESTED, not FOUNDRY_TESTED) |
| --- | --- | --- |
| `feature/holopad-games-restoration` | realignment @ 018262b6e | 7d643bd96 Dejarik draft dispatch (DJ-01/02/07); bcac3ba5f Pazaak PZ-02/04/05/06/07 |
| `feature/vehicle-crew-rules` | realignment @ 018262b6e | 1b6cded54 VC-01 multi-role, VC-03 single gunner count, VC-04 gunner-N evidence |
| `claude/force-v2-mechanics` | main f734b4d33 | none. Must be rebased/stacked on the realignment branch before Force work. |

## Next unblocked tasks (in order)
1. Vehicle sheet UI-01 (Edit-form names vs `_onSubmitVehicleActorForm` allowlist round-trip test), UI-02 (weapon-card operator label from crew authority), UI-08 (zero bar), UI-07 (header copy), UI-09 (Import button state).
2. Vehicle crew VC-05..VC-10 (System Operator role, action catalog, per-actor action budget, unknown-quality fail-closed).
3. Games: Hintaro/Sabacc/Pazaak layout (CSS, needs runtime measurement), Games landing page, Dejarik board art + hit-map calibration, Pazaak drag-and-drop/image card art, Sabacc dock.
4. Force V2: stack on realignment; the 194 typed definitions (bookwise-v2.9) are audit-only — no runtime loader. Reconcile 194 vs the 212 baseline (Legacy Era Book 7 adds the rest), then build a definition registry + generic defense/DC-tier resolver (FP-RD-012) with behavioral tests.

## Known issues found, not caused by this work
- `tools/sabacc-dejarik-rules-smoke-test.mjs` fails: Sabacc deck has 62 cards, test expects 76 (pre-existing).

## Rules/owner questions
- None new. Pazaak duplicate-card deck policy (PZ-08) and variant questions in the Pazaak handoff §17 remain owner decisions; current unique-card rule was left unchanged.
