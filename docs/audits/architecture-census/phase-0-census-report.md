# Phase 0 — Exhaustive Repository Census

**Audited commit:** `f734b4d33f0e7603856b262f06dd705cc02ab5b8` · **Generator:** `tools/architecture-census/build-census.mjs` (acorn 8 AST) · **Status:** complete for inventory; reachability and authority are graded by confidence (see §9).

This report summarizes the machine-readable census. Every number below is read from `data/audits/architecture-census/` and can be reproduced with the generator. Nothing in the system was changed.

## 1. Deliverables

| # | Deliverable | File(s) |
|---|---|---|
| 1 | Complete file inventory (one entry per tracked file) | `registry/*.json` (21 shards, `registry/index.json`) |
| 2 | Subsystem taxonomy and ownership mapping | `taxonomy.json`, rules in `tools/architecture-census/taxonomy.mjs` |
| 3 | Dependency and import graph | `import-graph.json` (edges, domain edges, cycles, unresolved imports) |
| 4 | Runtime entry-point and reachability report | `reachability.json`, `registrations.json` |
| 5 | Mechanical-authority and state-writer census | `mechanical-authority-census.json`, `state-writers.json` |
| 6 | Complexity and bloat baseline | `census-baseline.json` (`complexity`), `duplication.json` |
| 7 | Coverage proof | `coverage.json` |
| 8 | This report | `docs/audits/architecture-census/phase-0-census-report.md` |

## 2. Repository baseline

| Measure | Value |
|---|---:|
| Tracked files at `HEAD` | **7,881** (all inventoried; 0 missing; 0 duplicate IDs) |
| Bytes tracked | 370.4 MB |
| JavaScript/ESM files parsed | 3,595 (0 parse errors) |
| Runtime modules (`index.js` + `scripts/**`) | 2,379 |
| Runtime SLOC (non-blank, non-comment) | **525,153** of 706,825 JS SLOC overall |
| Import edges | 8,521 static · 3,167 dynamic · 135 re-export |
| Test files | 828 (794 top-level `tests/*.test.mjs` run by CI; 34 nested files are **not** run by CI) |
| Templates (`.hbs`) | 518 |
| Stylesheets (`.css`) | 233 (127 declared in `system.json`) |
| Assets (images, fonts, media) | 921 |
| Data files (`data/**`) | 953 (546 are audit evidence under `data/audits/`) |
| Compendium sources (`packs/**`) | 77 files for 68 declared packs |
| Documentation/evidence files | 1,363 |
| Hooks | 116 distinct hook names, 472 listener sites |
| Settings | 124 distinct keys registered |
| Globals assigned (`game.swse.*`, `globalThis.*`, `window.*`, `CONFIG.SWSE.*`) | 213 distinct |

Files by top directory: scripts 2,423 · docs 1,309 · data 953 · assets 922 · tests 834 · templates 523 · tools 512 · styles 233 · packs 77 · lang 25 · other 70.

## 3. Subsystem taxonomy

37 domains were derived from the actual layout (24 mechanical/feature/infrastructure domains carry runtime code). Every file has exactly one **primary system**; its imports give its **secondary systems**. Assignment basis: path rule 2,307 · vocabulary 4,441 · import-majority (tests/tools) 596 · top-directory fallback 537. *A directory is evidence of intended ownership, not proof of it;* responsibility-level authority is assigned in Phase 1.

Per-domain runtime baseline (`*` direct document-write sites = `update/setFlag/unsetFlag/*EmbeddedDocuments/create/delete` on actor-, item-, effect-, token- or combat-like receivers, outside `tests/` and `tools/`):

| Domain | Kind | Files (all) | Runtime modules | Runtime SLOC | Reachable | Unreachable (SLOC) | Test-only | Modules with CI test | Direct doc-write call sites* | ActorEngine call sites |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `progression` | mechanical | 571 | 367 | 97,737 | 291 | 70 (11,986) | 4 | 283 (77%) | 15 | 87 |
| `ui-shell` | presentation | 464 | 179 | 55,411 | 135 | 44 (6,012) | 0 | 105 (59%) | 17 | 69 |
| `mentor-suggestion` | feature | 568 | 239 | 51,792 | 166 | 69 (10,740) | 2 | 164 (69%) | 27 | 2 |
| `combat` | mechanical | 431 | 174 | 34,726 | 151 | 14 (2,213) | 5 | 141 (81%) | 25 | 128 |
| `galactic-profiles` | feature | 211 | 159 | 28,878 | 7 | 2 (275) | **150** | 157 (99%) | 6 | 0 |
| `feats` | mechanical | 720 | 105 | 22,888 | 56 | 49 (9,828) | 0 | 19 (18%) | 22 | 75 |
| `vehicles` | mechanical | 764 | 119 | 19,968 | 109 | 6 (1,485) | 4 | 100 (84%) | 1 | 66 |
| `holonet` | feature | 94 | 75 | 18,683 | 65 | 10 (632) | 0 | 47 (63%) | 2 | 50 |
| `talents` | mechanical | 440 | 36 | 16,252 | 31 | 4 (1,787) | 0 | 19 (53%) | 74 | 51 |
| `equipment` | mechanical | 377 | 91 | 15,473 | 85 | 3 (1,024) | 3 | 83 (91%) | 24 | 30 |
| `governance` | infrastructure | 100 | 81 | 14,616 | 26 | 54 (9,745) | 0 | 20 (25%) | 1 | 31 |
| `infrastructure` | infrastructure | 117 | 109 | 14,491 | 51 | 51 (6,051) | 1 | 35 (32%) | 19 | 16 |
| `customization` | mechanical | 172 | 59 | 14,114 | 46 | 12 (1,181) | 1 | 45 (76%) | 15 | 21 |
| `force` | mechanical | 322 | 53 | 13,637 | 47 | 5 (826) | 1 | 41 (77%) | 24 | 102 |
| `actor-core` | mechanical | 133 | 37 | 13,592 | 32 | 4 (314) | 1 | 30 (81%) | 26 | 33 |
| `abilities-effects` | mechanical | 129 | 91 | 12,801 | 60 | 30 (2,597) | 0 | 60 (66%) | 11 | 27 |
| `store-economy` | mechanical | 162 | 32 | 10,673 | 32 | 0 (0) | 0 | 31 (97%) | 3 | 19 |
| `droids` | mechanical | 472 | 45 | 10,110 | 35 | 8 (1,474) | 2 | 37 (82%) | 0 | 7 |
| `npc-followers` | mechanical | 169 | 28 | 9,761 | 23 | 5 (866) | 0 | 14 (50%) | 23 | 53 |
| `houserules` | feature | 43 | 25 | 8,356 | 11 | 13 (3,080) | 1 | 10 (40%) | 6 | 16 |
| `games` | feature | 115 | 32 | 8,157 | 32 | 0 (0) | 0 | 31 (97%) | 0 | 0 |
| `skills` | mechanical | 87 | 34 | 7,059 | 31 | 3 (2,864) | 0 | 31 (91%) | 1 | 7 |
| `species` | mechanical | 267 | 19 | 5,578 | 15 | 2 (720) | 1 | 17 (89%) | 2 | 13 |
| `rolls` | mechanical | 36 | 24 | 5,218 | 14 | 7 (710) | 2 | 13 (54%) | 0 | 2 |
| `compat-patches` | infrastructure | 19 | 17 | 3,939 | 17 | 0 (0) | 0 | 6 (35%) | 10 | 15 |
| `data-registries` | infrastructure | 54 | 12 | 3,710 | 7 | 5 (378) | 0 | 6 (50%) | 0 | 0 |
| `classes` | mechanical | 134 | 10 | 3,097 | 9 | 1 (212) | 0 | 8 (80%) | 0 | 0 |
| `chat` | infrastructure | 15 | 7 | 1,365 | 6 | 1 (215) | 0 | 4 (57%) | 0 | 8 |
| `migration` | infrastructure | 31 | 7 | 917 | 1 | 5 (710) | 0 | 1 (14%) | 4 | 6 |
| `settings-config` | infrastructure | 11 | 4 | 288 | 4 | 0 (0) | 0 | 4 (100%) | 0 | 0 |

Non-runtime domains: `documentation` 102, `assets` 109, `compendium-packs` 77, `testing` 44, `localization` 25, `repo-config` 16, `dev-tooling` 280 (most tooling is attributed to the domain it audits).

## 4. Runtime entry points

- **Single ESM entry:** `system.json → esmodules: ["index.js"]`. No `scripts` array, no workers.
- **Sheet registration** (all in `index.js`): `SWSEV2CharacterSheet` (character), `SWSEV2NpcSheet` (npc), `SWSEV2DroidSheet` (droid), `SWSEV2VehicleSheet` (vehicle), `SWSEItemSheet` (items). See Phase 1 contract `UI-01` on the unified-shell direction.
- **Hooks:** the busiest are `ready` (80 listener sites, 34 in reachable files), `createItem` (57/28), `updateItem` (53/23), `init` (22/6), `updateActor` (19/16), `renderApplicationV2` (18/8).
- **Settings:** 124 keys. Registered more than once: `enableEnhancedMassiveDamage` and `maxTemplatesPerItem` (in `scripts/core/init.js` **and** the unreachable copy `scripts/holonet/scripts/core/init.js`; `maxTemplatesPerItem` also in `scripts/core/settings.js`).
- **Dynamic composition:** 3,167 dynamic import edges were resolved (string literals, `abs('…')`/`u('…')`/`new URL('…', import.meta.url)` helper arguments, template-literal globs). 116 dynamic import expressions stay unresolvable statically (variables such as `handlerPath` in `scripts/engine/abilities/active/effect-resolver.js:259`); 112 of them are in tests/tools/docs.

## 5. Dependency structure

- **Static import cycles:** 9 strongly connected components containing 52 files. The largest (18 files) couples `scripts/actors/derived/{defense,derived,hp}-calculator.js` and `level-split.js` with `scripts/engine/combat/combat-roll-math.js` and `combat-stat-rules.js`: derived actor math and combat math import each other. Others: progression engine ⇄ mentor dialogues ⇄ suggestion (11); chat ⇄ roll engine ⇄ damage-packet builder ⇄ skill-feat patches (6); weapon-runtime resolver ring (5); equipment readiness ⇄ fire-state store (3); vehicle installation ledger ring (3).
- **Domain-level layering:** with import edges grouped by domain, **31 domains form a single strongly connected component**. There is no acyclic layering between mechanical domains today. Heaviest cross-domain edges: progression→infrastructure 225, mentor→infrastructure 119, combat→equipment 103, ui-shell→holonet 88, feats→infrastructure 86, progression→mentor 66, feats→actor-core 62, progression→actor-core 60.
- **Unresolved static import in runtime code:** `scripts/holonet/scripts/core/init.js` imports `/systems/foundryvtt-swse/scripts/core/sidebar-structure-diagnostics.js`, which does not exist. The importing file is itself unreachable (see §6).
- **Manifest mismatches:** `system.json` declares packs `packs/vehicles-ground-armor` and `packs/vehicles-hybrids`, but there is no source for either in the repository. Undeclared pack artefacts are tracked: `packs/vehicles-canonical-ships{.db,/LevelDB}`, `vehicles-starships.db`, `vehicles-weapon-emplacements.db`, `vehicles.db`, `feats.db.sha256`.

## 6. Reachability

Runtime modules (`index.js` + `scripts/**`, 2,379):

| Reachability | Modules | Meaning |
|---|---:|---|
| `reachable-static` | 1,483 | On a static import path from `index.js` |
| `reachable-dynamic` | 117 | Reached only through a dynamic `import()` |
| `orphan-unreferenced` | 332 | No importer at all, no path string in runtime text |
| `unreachable-importers-only` | 156 | Imported only by other unreachable modules (dead clusters) |
| `test-only-import` | 178 | Not reachable from `index.js`, but imported by tests |
| `string-referenced-only` | 12 | Path string appears in runtime text but no import |
| `tool-only-import` / `node-tool` / `node-script` | 8 / 70 / 23 | Node CLI scripts living under `scripts/` |

Unreachable modules are graded: `static-proof-no-runtime-path` (no import, no stem mention in any reachable JS/template/data text, no self-registration), `unverified-self-registering` (assigns globals or registers hooks, so it would be live **if** something loaded it), `unverified-name-mentioned-at-runtime`. Totals for orphan + unreachable-cluster modules: 271 static-proof, 132 self-registering, 85 name-mentioned; **79,240 SLOC**. A ten-file random sample of the static-proof grade was re-checked by repository-wide search; none had a runtime consumer.

Largest concentrations of unreachable code: `scripts/generation/**` (the entire Galactic Profiles generator, 150 modules run only by tests), `scripts/engine/feats` (48), `scripts/engine/progression` (42), `scripts/governance/sentinel` (36), `scripts/engine/suggestion` (30), `scripts/apps/progression-framework` (26), `scripts/sheets/v2` (24).

Non-JS reachability: templates 429 runtime-referenced, 43 unreferenced, 44 referenced only from docs/audit data; styles 127 manifest + 34 imported, 67 unreferenced; assets 420 runtime-referenced, 139 unreferenced (1.98 MB), 362 referenced only from docs or audit data. `data/**`: 159 directly referenced, 104 by a specific path pattern, the rest only reachable through two **generic loaders** (`systems/foundryvtt-swse/data/${filename}`), so their runtime use cannot be proven statically.

## 7. Mechanical-authority and state-writer census

**State writers.** 357 direct document-write call sites in 123 runtime files (316 in reachable files); only 21 of them are inside the ActorEngine home `scripts/governance/actor-engine/`. 938 ActorEngine call sites exist in runtime code. 156 assignments target `*.system.derived.*`. 42 `ChatMessage.create` calls sit outside `scripts/chat/swse-chat.js` in 24 files. Highest direct-write concentrations by domain: talents 74 sites in 13 files, mentor-suggestion 27/14, actor-core 26/4, combat 25/12, force 24/4, equipment 24/3, npc-followers 23/8, feats 22/13. *Receiver classification is by expression text (e.g. a variable named `actor`) and is a lead, not a type proof. Some sites are legitimate (world items, ActorEngine internals, documented exceptions); Phase 2 classifies them.*

**Mechanical responsibilities defined in more than one domain** (function names in reachable runtime code, ≥ 4 lines; leads for Phase 2, not findings):

| Responsibility | Reachable definitions | Files | Domains |
|---|---:|---:|---|
| ability-modifier | 40 | 34 | 13 |
| defense-totals | 14 | 12 | 8 (actor-core, combat, force, infrastructure, npc-followers, progression, talents, …) |
| price-computation | 14 | 14 | 8 |
| upgrade-slots | 11 | 10 | 8 |
| modifier-aggregation | 11 | 10 | 7 |
| condition-track-penalty | 11 | 9 | 6 |
| skill-total | 12 | 12 | 6 |
| damage-formula | 20 | 17 | 6 |
| second-wind | 12 | 8 | 5 |
| prerequisite-evaluation | 11 | 6 | 5 |
| attack-bonus | 13 | 12 | 5 |
| encumbrance | 6 | 5 | 5 |
| base-attack-bonus | 9 | 9 | 4 |
| damage-application | 12 | 11 | 4 |

Single-domain (no competing definition found): critical-hit, size-modifier, destiny-points, credit-mutation (by name; the TransactionEngine uses other verbs), hit-points-max.

## 8. Complexity and bloat baseline

| Indicator | Baseline |
|---|---:|
| Unreachable runtime SLOC (orphan + dead clusters) | 79,240 |
| Test-only runtime modules | 178 |
| Static import cycles / files in cycles | 9 / 52 |
| Domains in one SCC | 31 |
| Exact function clones across files (runtime) | 33 groups |
| Structural clones (renamed identifiers) | 34 groups (runtime) |
| Exported symbol names defined in more than one runtime module | 138 |
| Reachable modules with never-imported named exports | 555 (1,700 exports) |
| Runtime hotfix/patch modules (`scripts/patches`, `*-hotfix*`) | 24 |
| Runtime migration modules | 28 |
| Runtime files with `@deprecated`/`DEPRECATED` markers | 64 |
| Runtime files mentioning `legacy` / compat-shim-polyfill | 424 / 244 |
| Runtime modules over 1,500 SLOC | 36 (largest: `holonet-messenger-service.js` 7,055; `character-like-sheet.js` 6,764; `talent-prerequisite-authority.js` 5,985) |
| Direct document writes outside ActorEngine (runtime) | 336 sites |
| `ChatMessage.create` outside swse-chat | 42 sites |

Notable clone groups: `buildSheetActionEconomyContext`, `sanitizeSheetRenderContext` and `documentToTemplateData` are duplicated verbatim between `scripts/sheets/v2/character-like-sheet.js` and `vehicle-actor-sheet.js`; `selectedChoiceFromItem` is copied into seven `scripts/engine/feats/*-feat-normalization-hooks.js` files; `normalizeTextTokens` is copied into six `scripts/engine/suggestion/*` analyzers.

**Performance:** no runtime measurement was taken. Foundry is not available in this environment; per program rules, no performance claim is made from static analysis. Instrumentation points are proposed in Phase 2.

## 9. Coverage and limitations

- **Coverage:** 7,881/7,881 tracked files inventoried; every file has a primary system, a role and a reachability class (`coverage.json`). Verification levels: 3,595 dependency-traced, 3,365 reference-traced (text), 921 binary-inventoried.
- **Domain assignment** is location/vocabulary based for 6,748 files and import-majority for 596; 537 fall back to the top-directory default (mostly docs/data). Responsibility-level ownership is a Phase 1 product.
- **Reachability** is static. Foundry can also run code through macros in packs, `game.swse.*` globals typed in the console, and module APIs. The `unverified-*` grades exist for that reason; **nothing is called dead on the census alone**.
- **Receiver typing** for state writes is textual.
- **Function-name responsibility matching** finds definitions, not behaviors. Two `calculateDefense` functions may compute different things.
- **No live Foundry verification** was possible; nothing in this program is `live-foundry-verified`.
