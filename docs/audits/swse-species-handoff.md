# Species overhaul — handoff and standing directives (draft PR #1037)

## Project-owner directive: Force-power failures are not species blockers

The project owner has explicitly approved deferring the five preexisting Force-power test failures to a separate, later refactor.

Accepted baseline (unrelated to the species migration):

- `force-power-final-integration`
- `phase3-force-power-corrections`
- `phase4-force-modifier-automation`
- `phase5-force-healing-mitigation`
- `phase6-force-direct-damage`

Latest recorded full-suite result: 461 tests, 456 passing, 5 known failures. They stay documented and are never reported as passing.

Rules:

1. Force-power implementation code and its tests are not modified in the species PR just to clear these failures.
2. The full suite runs at major checkpoints and its failures are compared against this five-file baseline.
3. Any new failure — including a new failure inside one of the five files — is a potential regression and is investigated.
4. All species-related regressions are fixed before a merge is requested.
5. Offline testing is never reported as live Foundry v13 certification.

PR and merge policy: species work continues on draft PR #1037. The five failures do not by themselves prevent eventual approval, provided no new regressions exist, all species tests and validators pass, the live Foundry v13 species validation (`docs/audits/swse-species-live-foundry-checklist.md`) is completed, and outstanding species issues and owner decisions are resolved or explicitly deferred. The PR is not merged without project-owner authorization.

Future Force-power refactor: a separate branch and PR after the species work. It should begin by checking the offline test harness and Foundry-specific import resolution before changing any gameplay mechanics.

## Where things stand

See `docs/audits/swse-species-implementation-status.md` (profile counts and holds), `docs/audits/swse-species-mechanical-completeness.md` (measured automation per verified trait), `docs/audits/swse-species-outside-inventory.md` (41 species outside the audit), `docs/audits/swse-rules-decisions-pending.md` (append-only owner decisions).
