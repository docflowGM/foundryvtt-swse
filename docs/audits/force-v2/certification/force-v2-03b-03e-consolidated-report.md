# Force V2 — Checkpoints 03B → 03E consolidated report (for independent review)

Branch `claude/keen-sagan-jvkazs`, draft PR docflowGM/foundryvtt-swse#1165. **Not merged; do not merge** (per owner directive). Head: `d2578bc`.
Certification statuses are tracked per mechanic, never per book: nothing here is `FOUNDRY_TESTED`.

## Commits since the 03B baseline (main..HEAD = 55 commits; this phase)
| Commit | Checkpoint |
| --- | --- |
| `8b3623e`, `9bf8973` | 03C — suite instance recovery authority |
| `b443ae3` | 03D — maintained Force power instances |
| `d2578bc` | 03E — per-copy identity and Temptation of the Dark Side |
(03B work: earlier commits on the same branch; peripheral 03B consumer work is FROZEN per owner.)

## 03C — Suite recovery (IMPLEMENTED, OFFLINE_TESTED)
Single authority `SuiteInstanceRecovery`; canonical state `system.discarded` for Force powers and maneuvers; proof-gated regain-all (natural 20 with domain-scoped activation check, GM-confirmed `restCompleted`, or GM+reason); starship maneuver activation is a Pilot check (`StarshipManeuverSuite`). Open rulings FP-RD-008/009.

## 03D — Maintained effects (IMPLEMENTED for 5 powers, OFFLINE_TESTED; 2 DEFERRED)
New `ForcePowerMaintenance` (per-activation instance on the caster, own id/effects; `begin/maintain/resolveConcentration/terminate/end`). Contracts from printed text: Energy Resistance, Force Whirlwind (move action, fresh check each round, printed termination), Kinetic Combat (swift maintain; separate standard action to direct; 12-square termination), Resist Force, Valor (multiple instances allowed). Fixes: Resist Force was an unconditional +X to all defenses → now ONE chosen defense (two only with the paid FP option); Valor was applied to the caster, all defenses and attacks → now the chosen ally, Will Defense only. Recovering/deleting a Power copy no longer deletes maintained effects (two `removePowerEffects` calls removed). **Force Grip and Move Object maintenance stay deferred** (FP-RD-011; OCR-damaged Core text, errata not in repo). FP-RD-010 (several instances + damage), FP-RD-012 (engineering: conditional defense bonuses are stored as reminder-only gated effects because no defense call site knows the attack source — they no longer over-grant, but also do not auto-apply).

## 03E — Duplicates and Temptation
Printed rules allow the same Force power (Core, Force Powers) and maneuver (Starships of the Galaxy, Starship Tactics) more than once. Removed name-based filters in `ForcePowerEngine.applySelected` and `StarshipManeuverManager.getAvailableManeuvers`; the progression suite sync now matches the exact copies a session created (markers) instead of every same-name maneuver; owned-copy removal accepts an exact `itemId`; new maneuver items use `discarded`, not legacy `spent`. Temptation of the Dark Side (FUCG p.85) implemented as two separate GM-adjudicated optional pathways (power / talent) with exact Force Point rollback; open FP-RD-013a–e.

## Tests
`for each tests/*.test.{mjs,js}` (752 files, 8-way parallel with the Foundry-shim preload for the 5 Force tests): **752/752 exit 0** at `d2578bc`. New: 03B (4 files, 38 cases), 03C (8), 03D (7), 03E (6). `tests/weapon-3gate-ledger` required regenerating `data/audits/...3gate...json` (generated artifact) after source changes. `tools/validate-partials.mjs`, `tools/validate-data.js`, `system.json` parse: pass. `rolling-ci-support-check` takes ~90 s and can time out under heavy parallel load (passes alone).

## Not verified / blockers
- No live Foundry v13 run, no two-client permission/ownership test, no real compendium `dcChart` run for the maintenance flows → nothing is `FOUNDRY_TESTED`.
- Maintenance has no UI yet (API + executor integration only); concentration/maintain are not auto-triggered from damage/turn hooks (caller supplies the instance) — deliberate until FP-RD-010 is ruled.
- Conditional defense automation (FP-RD-012), Improved Lightsaber Throw area attack/action-economy debit and the 35 uncertified 03B ability contracts remain open.
- Official errata PDF is not in the repository.

## Decisions requested from the owner
FP-RD-008, 009 (03C timing); FP-RD-010, 011 (maintenance); FP-RD-013a–e (Temptation); plus the still-open 03B items listed in the decisions register. Recommended rulings: none (register is the source of truth: `docs/audits/swse-rules-decisions-pending.md`).
