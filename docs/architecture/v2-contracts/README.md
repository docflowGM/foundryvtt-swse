# SWSE V2 ownership contracts — master index

**Status: PROPOSED reconciled contracts awaiting project-owner approval.** They do not replace any existing authority. Each statement carries its own label (`OBSERVED` / `APPROVED` with a cited source / `PROPOSED` / `CONFLICT` / `UNVERIFIED` / `UNIMPLEMENTED` / `DEFERRED_RULES_REVIEW` / `FOUNDRY_ACCEPTANCE_REQUIRED`). Audited commit `f734b4d`. Format: [`_contract-template.md`](_contract-template.md).

## Hierarchy

| Level | Document | Purpose |
|---|---|---|
| A — system-wide | [A-global-invariants.md](A-global-invariants.md) | 18 invariants (A-01…A-18), their sources and measured conformance; single home for each global rule |
| Cross-domain | [X-integration-contracts.md](X-integration-contracts.md) | 12 integration flows (X-01…X-12): one authority per step |
| B — domain (with embedded C — subsystem) | table below | ownership, interfaces, dependencies, invariants, tests, conformance per domain |
| Registers | [contradiction-register.md](contradiction-register.md) · [unresolved-ledger.md](unresolved-ledger.md) | existing-contract contradictions; unimplemented / deferred-rules / Foundry-acceptance items |
| Matrices (generated) | [authority-matrix.md](authority-matrix.md) · [dependency-matrix.md](dependency-matrix.md) · [traceability.md](traceability.md) · [phase1-coverage.md](phase1-coverage.md) | responsibility→owner; domain→domain; requirement→code→test; coverage |

Machine-readable: `data/audits/architecture-census/contracts/` (sidecars in `domains/`, plus `contract-index.json`, `authority-matrix.json`, `dependency-matrix.json`, `traceability.json`, `unresolved-ledger.json`, `contradictions.json`, `phase1-coverage.json`, `validation.json`, `invariant-probes.json`). Regenerate and verify with `node tools/architecture-census/assemble-contracts.mjs [--check]`.

## Totals

30 domain contracts (every code-bearing domain) plus non-runtime dispositions for 7 domains; 308 responsibilities (`R-*`); 49 subsystem contracts (`C-*`); 82 domain contradictions (`CR-<CODE>-*`) plus 12 global (`CR-01`…`CR-12`); 215 unresolved-ledger items (100 `FOUNDRY_ACCEPTANCE_REQUIRED`, 77 `DEFERRED_RULES_REVIEW`, 38 `UNIMPLEMENTED`); 111 of 308 requirements have no named or direct test. Validation: 756 unique IDs; 1,946 evidence references resolve at `f734b4d`; 0 errors.

## Domain contracts

| Contract | Domain | Responsibilities | Subsystem contracts | Contradictions | Unimplemented | Phase 2 findings |
|---|---|---:|---:|---:|---:|---:|
| [B-ABL](B-ABL-abilities-effects.md) | `abilities-effects` | 12 | 2 | 2 | 0 | 9 |
| [B-ACT](B-ACT-actor-core.md) | `actor-core` | 15 | 3 | 5 | 1 | 15 |
| [B-CHT](B-CHT-chat.md) | `chat` | 5 | 0 | 1 | 1 | 4 |
| [B-CLS](B-CLS-classes.md) | `classes` | 9 | 1 | 2 | 0 | 6 |
| [B-CMB](B-CMB-combat.md) | `combat` | 11 | 2 | 5 | 2 | 12 |
| [B-CUS](B-CUS-customization.md) | `customization` | 9 | 1 | 3 | 1 | 8 |
| [B-DAT](B-DAT-data-registries.md) | `data-registries` | 6 | 0 | 1 | 0 | 4 |
| [B-DRD](B-DRD-droids.md) | `droids` | 12 | 1 | 2 | 1 | 6 |
| [B-EQP](B-EQP-equipment.md) | `equipment` | 7 | 1 | 2 | 1 | 8 |
| [B-FEA](B-FEA-feats.md) | `feats` | 15 | 3 | 3 | 3 | 14 |
| [B-FRC](B-FRC-force.md) | `force` | 15 | 4 | 3 | 3 | 12 |
| [B-GAL](B-GAL-galactic-profiles.md) | `galactic-profiles` | 9 | 2 | 2 | 3 | 9 |
| [B-GAM](B-GAM-games.md) | `games` | 8 | 2 | 1 | 2 | 6 |
| [B-GOV](B-GOV-governance.md) | `governance` | 9 | 2 | 3 | 2 | 7 |
| [B-HOL](B-HOL-holonet.md) | `holonet` | 12 | 3 | 3 | 2 | 9 |
| [B-HRL](B-HRL-houserules.md) | `houserules` | 7 | 0 | 2 | 0 | 5 |
| [B-INF](B-INF-infrastructure.md) | `infrastructure` | 11 | 1 | 3 | 0 | 8 |
| [B-MEN](B-MEN-mentor-suggestion.md) | `mentor-suggestion` | 15 | 3 | 6 | 3 | 15 |
| [B-MIG](B-MIG-migration.md) | `migration` | 3 | 0 | 2 | 1 | 4 |
| [B-NPC](B-NPC-npc-followers.md) | `npc-followers` | 13 | 1 | 2 | 1 | 9 |
| [B-PAT](B-PAT-compat-patches.md) | `compat-patches` | 6 | 0 | 3 | 0 | 7 |
| [B-PRG](B-PRG-progression.md) | `progression` | 15 | 4 | 5 | 3 | 23 |
| [B-ROL](B-ROL-rolls.md) | `rolls` | 8 | 0 | 1 | 0 | 5 |
| [B-SET](B-SET-settings-config.md) | `settings-config` | 4 | 0 | 0 | 0 | 2 |
| [B-SKL](B-SKL-skills.md) | `skills` | 10 | 1 | 2 | 0 | 7 |
| [B-SPC](B-SPC-species.md) | `species` | 12 | 2 | 3 | 1 | 6 |
| [B-STO](B-STO-store-economy.md) | `store-economy` | 8 | 2 | 4 | 2 | 9 |
| [B-TAL](B-TAL-talents.md) | `talents` | 13 | 3 | 2 | 2 | 13 |
| [B-UIS](B-UIS-ui-shell.md) | `ui-shell` | 13 | 2 | 4 | 1 | 13 |
| [B-VEH](B-VEH-vehicles.md) | `vehicles` | 16 | 3 | 5 | 2 | 12 |

## Approval

Nothing here is approved until the owner says so. Recommended review order: Level A (especially `A-OPEN-01`: commit the owner standing instructions), the global contradiction register, then the domain contracts in the Phase 3 priority order given in `docs/audits/architecture-census/phase-2-reconciliation-report.md`.
