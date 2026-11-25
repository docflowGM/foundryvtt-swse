# Acceptance procedures for realignment changes

Every realignment change (Phases 3B–3O) is verified in two **separate** tiers. A passing CI run never satisfies tier 2.

| Tier | What it proves | Status words |
|---|---|---|
| 1 — Offline | Node tests and static guards pass: logic against shims/mocks, import graph, architecture ratchet | `IMPLEMENTED`, `OFFLINE_TESTED` |
| 2 — Live Foundry V13 | The behavior was observed in a running Foundry V13 world | `FOUNDRY_TESTED` (requires `foundryEvidence` in the tracker) |

## Tier 1 — required for every change
1. **Reproduce first.** Add a regression test that fails on the pre-fix code (or, for structural work, a test/probe establishing behavioral equivalence and reachability). Record the test file in the tracker (`--test`).
2. Focused test(s) for the changed module pass: `node tests/<name>.test.mjs`.
3. Whole rolling suite passes: `node tools/run-rolling-tests.mjs`.
4. Syntax: `node tools/run-rolling-syntax-check.mjs`.
5. Architecture ratchet: `NODE_TOOLS=<acorn dir> node tools/architecture-census/check-architecture.mjs` (no new violations; run `--lower` to lock in improvements).
6. Repository validators relevant to the change: `node tools/validate-partials.mjs`, `node tools/validate-data.js`, `node tools/check-system-manifest.mjs`, `node tools/check-shell-mutation-contract.mjs --strict`, and any domain guard named in the finding.
7. Tracker: `node tools/architecture-census/tracker.mjs set <ID> <STATUS> --commit <sha> --test <file> --note "…"`, then `tracker.mjs check`.
8. If a change deletes files: grep exact path and basename across the repo (JS, HBS, CSS `url()`, JSON, `system.json`, packs), re-run `build-census.mjs --current` and confirm the module count fell and nothing became newly unreachable.

## Tier 2 — live Foundry V13 acceptance (run when a Foundry world is available)
Record for each run: Foundry version, system commit, world, date, tester, and per-step pass/fail with notes in `data/audits/architecture-census/implementation/foundry-acceptance/<phase>-<date>.md`. Only then may the tracker set `FOUNDRY_TESTED` with `foundryEvidence` pointing at that file. If no Foundry is available, leave `foundryAcceptance: NOT_RUN` and keep the procedure below as the pending checklist.

### Common preconditions
New world on V13; install the system from the branch; a level-5 Soldier/Jedi character, a droid, an NPC, a vehicle; GM + one player client connected; open the browser console and watch for errors during every step.

### Checklists by domain
**Actor mutation (3D)** — Edit a field on each sheet type; verify persistence after reload; verify a player cannot edit another owner's actor; verify no console errors; verify the sheet does not fully re-render for tab/expand-only actions.

**Force Points (3B)** — Grant bonus FP from each source (Guardian Spirit, Force Flow, sheet adjustment, feat); spend normal and bonus FP; reload; spend again; verify balance never increases without a grant and a bonus point is never spendable twice; verify chat/receipts; repeat from the player client and the GM client.

**Credits and transactions (3C)** — Buy item, droid and vehicle; force a mid-purchase failure (e.g. insufficient permission or a deliberately invalid item) and verify no created actor/item remains and credits are unchanged; sell; trade between two actors including a failure path; re-run a progression credit grant twice; Party Fund spend.

**Progression (3G)** — Level-1 chargen to completion; cancel mid-wizard and verify the actor is unchanged; resume; multiclass; prestige eligibility; level-up with feat/talent/skills/ability increase; species with choices; droid and follower chargen.

**Combat (3E)** — Melee, ranged, autofire, burst, full attack, critical (no confirmation roll), reaction, damage with shield/DR/threshold, condition track, second wind, vehicle attack; verify action economy and chat cards; verify the Combat Action Browser runs an action.

**Equipment/customization (3I)** — Equip/unequip, wield, install and remove an upgrade, workbench flow, purchase through Store, encumbrance; reload and verify.

**Vehicles/droids (3J)** — Vehicle sheet crew assignment, weapon station attack, installation job; droid construction through readiness validation.

**UI (3M)** — Character, NPC, droid, vehicle sheets; Holopad surfaces; Store; progression shell; no V1 deprecation warnings; no duplicate listeners after repeated open/close.

**Mentor/suggestions (3K)** — Level-1 survey end to end; cancel/restart; suggestions appear and do not write to the actor during evaluation.

**Holonet/games (3L)** — Send/receive messages; job/intel flows; Holopad game session start/finish; wager flow only where approved.
