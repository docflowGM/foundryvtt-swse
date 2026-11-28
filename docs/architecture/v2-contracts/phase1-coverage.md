# Phase 1 coverage (generated)

Every taxonomy domain has a contract or an explicit disposition. Generated at `f734b4d`. Validation: 30 sidecars, 756 unique IDs, 1946 evidence references checked against the audited commit, **0 unresolved**, 0 errors, 0 warnings (`data/audits/architecture-census/contracts/validation.json`).

| Domain | Kind | Files | Runtime modules | Disposition | Responsibilities | Findings |
|---|---|---:|---:|---|---:|---:|
| `actor-core` | mechanical | 133 | 37 | contract B-ACT | 15 | 15 |
| `abilities-effects` | mechanical | 129 | 91 | contract B-ABL | 12 | 9 |
| `progression` | mechanical | 571 | 367 | contract B-PRG | 15 | 23 |
| `classes` | mechanical | 134 | 11 | contract B-CLS | 9 | 6 |
| `species` | mechanical | 267 | 19 | contract B-SPC | 12 | 6 |
| `skills` | mechanical | 87 | 34 | contract B-SKL | 10 | 7 |
| `feats` | mechanical | 720 | 105 | contract B-FEA | 15 | 14 |
| `talents` | mechanical | 440 | 36 | contract B-TAL | 13 | 13 |
| `force` | mechanical | 322 | 55 | contract B-FRC | 15 | 12 |
| `combat` | mechanical | 431 | 174 | contract B-CMB | 11 | 12 |
| `rolls` | mechanical | 36 | 24 | contract B-ROL | 8 | 5 |
| `equipment` | mechanical | 377 | 92 | contract B-EQP | 7 | 8 |
| `customization` | mechanical | 172 | 59 | contract B-CUS | 9 | 8 |
| `store-economy` | mechanical | 162 | 39 | contract B-STO | 8 | 9 |
| `vehicles` | mechanical | 764 | 119 | contract B-VEH | 16 | 12 |
| `droids` | mechanical | 472 | 47 | contract B-DRD | 12 | 6 |
| `npc-followers` | mechanical | 169 | 28 | contract B-NPC | 13 | 9 |
| `mentor-suggestion` | feature | 568 | 240 | contract B-MEN | 15 | 15 |
| `galactic-profiles` | feature | 211 | 167 | contract B-GAL | 9 | 9 |
| `holonet` | feature | 94 | 75 | contract B-HOL | 12 | 9 |
| `games` | feature | 115 | 32 | contract B-GAM | 8 | 6 |
| `houserules` | feature | 43 | 25 | contract B-HRL | 7 | 5 |
| `chat` | infrastructure | 15 | 7 | contract B-CHT | 5 | 4 |
| `ui-shell` | presentation | 464 | 179 | contract B-UIS | 13 | 13 |
| `governance` | infrastructure | 100 | 86 | contract B-GOV | 9 | 7 |
| `settings-config` | infrastructure | 11 | 4 | contract B-SET | 4 | 2 |
| `data-registries` | infrastructure | 54 | 12 | contract B-DAT | 6 | 4 |
| `infrastructure` | infrastructure | 117 | 110 | contract B-INF | 11 | 8 |
| `migration` | infrastructure | 31 | 24 | contract B-MIG | 3 | 4 |
| `compat-patches` | infrastructure | 19 | 17 | contract B-PAT | 6 | 7 |
| `dev-tooling` | tooling | 280 | 23 | non-runtime disposition — Tooling, not a runtime authority. Governed by A-13 (offline evidence only) and by the rule that tools never write production data unless explicitly scoped. Contract: none beyond A-level; individual tools are attributed to the domain they audit. | 0 | 0 |
| `testing` | tooling | 44 | 0 | non-runtime disposition — Test infrastructure. Tests establish only the behaviour they exercise (A-13). CI runs top-level tests/*.test.mjs only; nested tests are not run. | 0 | 0 |
| `documentation` | evidence | 102 | 1 | non-runtime disposition — Evidence and history. Authoritative documents are indexed in docs/architecture/v2-contracts/README.md; consolidation candidates are listed in Phase 2 (no deletions in Phases 0–2). | 0 | 0 |
| `compendium-packs` | data | 77 | 0 | non-runtime disposition — Pack sources declared in system.json. Content ownership follows the item domain (feats, talents, …); manifest mismatches are CR-12. | 0 | 0 |
| `localization` | data | 25 | 0 | non-runtime disposition — lang/*.json declared in system.json. No mechanical authority. | 0 | 0 |
| `assets` | asset | 109 | 0 | non-runtime disposition — Static assets consumed by templates/styles/data. Owned by the referencing domain; unreferenced assets are listed in reachability.json. | 0 | 0 |
| `repo-config` | configuration | 16 | 0 | non-runtime disposition — Manifest, template.json schema, CI workflows. template.json is the actor/item data-shape authority (schema changes are out of scope for Phases 0–2). | 0 | 0 |
