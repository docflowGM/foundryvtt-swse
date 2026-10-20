# TI4-A — Static-Analysis Coverage and Limitations

The analyzer is a **lexical** tool. It is useful because it is reproducible and cheap; it is not a proof that no other mutation exists. This document states what it covers, what it cannot see, how each limitation shows up in the output, and what each limitation means for any future enforcement.

## 1. Coverage

| Aspect | Covered |
|---|---|
| Scanned files | `scripts/**/*.{js,mjs}` and root `index.js` (2,227–2,244 files per head). Not scanned: `tests/`, `tools/`, `data/`, `templates/` (.hbs), compendium packs, other modules |
| Comments | excluded (line and block) |
| String contents | kept (so payload keys and flag names are visible) |
| Writes recognized | object-payload keys; bracket assignment with a literal key; property assignment through a `.` chain (including `+=`, `-=`, `++`, `--`, `??=`, `\|\|=`, `&&=`); `setFlag`/`unsetFlag` with the family's flag key; settings `set*` with the family's setting key |
| Delegated calls recognized | the config's mutating authority API calls (e.g. `ActorEngine.spendForcePoints(`) |
| Read-only forms recognized | property reads, `getFlag`, `getProperty`, `hasProperty`, `get/has/getArray/getSetting`, comparisons |
| Wrappers/updates | `ActorEngine.updateActor/updateOwnedItems/applyMutationPlan` payloads are caught by the payload/assignment forms (the wrapper name itself is not what is matched) |

## 2. Known limitations and false negatives

Each row is a pattern the analyzer **cannot** classify, with what it does instead and the consequence.

| ID | Pattern | Analyzer behavior | Consequence |
|---|---|---|---|
| L1 | **Constants as keys:** `actor.setFlag(this.SCOPE, this.FLAG_KEY, v)` | not recognized (the key is not a literal) | **Real example:** `ActionEconomyPersistence` writes `actionEconomy` through `this.FLAG_KEY` (`action-economy-persistence.js:152`, verified by reading), so the inventory shows **0 direct `actionEconomy` writers** even though the authority writes the flag. Absence of a record is not absence of a writer. |
| L2 | **Aliases:** `const p = 'system.credits'; update({[p]: v})` | literal reported as `unresolved-use` | the write itself is not attributed; the literal is surfaced for review |
| L3 | **Computed/concatenated paths:** `'system.' + key`, template literals with `${}` | not resolved; a template that *contains* a protected fragment is `unresolved-use` | false negatives for fully dynamic paths |
| L4 | **Nested object form:** `update({ system: { credits: v } })` | not recognized | false negative; no flat-key literal exists to match |
| L5 | **Destructuring / aliased objects:** `const { system } = actor; system.credits = v` | the `.credits` assignment is seen only if it has a `.`-chain; a bare alias binding is treated as local | partial false negatives |
| L6 | **Bare identifiers** named like a protected field (`const installedSystems = …`, parameters) | treated as local bindings, **not** field writes | prevents ~30 false positives measured at TI4-A (see baseline doc §4); a write through a destructured binding is invisible |
| L7 | **Dynamic dispatch**, `Reflect`, `eval`, `Function`, bracket writes with non-literal keys | invisible | out of reach of lexical analysis |
| L8 | **Payload-key lookalikes** (type maps, validators, schema descriptions) | reported as `payload-key` writers | **known false positives:** `sheets/v2/character-sheet/form.js:117` and `character-like-sheet.js:639` (`'system.forcePoints.value': 'number'` coercion maps). Not suppressed; dispositioned in the baseline doc. |
| L9 | **Payload never applied:** a payload object that is built and never passed to an update | still reported | possible false positive; plan builders are reported as writers although the plan is applied elsewhere (disposition in baseline doc) |
| L10 | **Protected names not covered by a pattern.** Examples: `system.activated`, `system.charges.current`, shield `currentSR` (written by `InventoryEngine.setActivated`, Phase 0 P02), `system.equipped`, HP/condition-track fields, `ownedActors`, `buildHistory`, `stateMode` | not reported | equipment activation and non-weapon equip writes (Phase 0 P02/P03) are **outside the `equipmentState` family as configured** (posture/occupancy/journal only); the family would need extending before a ratchet claims to cover them |
| L11 | **Template/HBS, macros, other modules, packs, `tools/`** | out of scope | direct writes from macros or other modules are invisible |
| L12 | **Unrelated scopes**: `setFlag` on User/Item/Combat/ChatMessage documents with a protected key | recognized by key, regardless of the receiver's document type | possible false positives (receiver type is unknown) |
| L13 | **Regex-literal / template heuristics** | a lexing failure can mis-mask a region | degrades toward extra `unresolved-use`, not silence, but a mis-masked comment boundary could hide or reveal a region; mitigated by the comment/regex tests |
| L14 | **Authority behavior** | a delegated call is reported at the call site only | callee correctness (idempotence, rollback) is **not assessed** — that is what the compliance matrix and gap register cover |
| L15 | **Classification is by file**, not by call path | a documented-exception *file* exempts all its records for that family | an exception can over-cover; each exception carries its reason and is still emitted |
| L16 | **Flag scope not checked:** `'swse'` vs `'foundryvtt-swse'` | both match by key | consistent with the two namespaces coexisting (Phase 0 X4) |

## 2b. Known-unobserved inventory (machine-readable; independent review correction 1, R3)

Limitations that are *general* (L1–L16) cannot be enumerated per file. Limitations that hide a **specific, audit-verified writer** are recorded as data so that no later ratchet or certification can describe the affected family as completely inventoried. They live in `KNOWN_UNOBSERVED` (`tools/lib/ti4-authority-config.mjs`) and are copied into every artifact with a **self-verification**: each entry lists `evidence` (file + line pattern); the analyzer searches the scanned tree and records `presentInTree` and the matching lines, so a stale or fixed entry shows as not present instead of lingering.

| ID | Family | Kind | What is invisible | Present at lineage A / B / main |
|---|---|---|---|---|
| KU-AE-1 | actionEconomy | constant-key flag write | `ActionEconomyPersistence` `setFlag`/`unsetFlag` through `this.SCOPE`/`this.FLAG_KEY` (`action-economy-persistence.js:152,180`) | yes / yes / yes |
| KU-EQ-1 | equipmentState | unrecognized field | weapon/shield activation fields `system.activated`, `system.active` (and the emit-light/blade-color flags) written by `InventoryEngine`; the coordinator's `IGNITE_PATHS` | yes / yes / yes |
| KU-EQ-2 | equipmentState | unrecognized field | `system.equipped` writes (non-weapon equip/unequip) in `InventoryEngine` | yes / yes / yes |
| KU-EQ-3 | equipmentState | unrecognized field | shield activation resources `system.currentSR`, `system.charges.current` (absolute, from an in-memory read) | yes / yes / yes |
| KU-FP-1 | forcePoints | adapter indirection | Force Points written via `SchemaAdapters.setForcePointsUpdate`; callers `consular-talent-actions.js:206,213`, `force-engine.js:33,53` | yes / yes / yes |

**Per-family coverage** is emitted in the artifact (`coverage.families.<family>`): `inventoryComplete` is **always `false`** (a lexical inventory is a lower bound), and `ratchetCoverage` is `KNOWN_GAPS` when at least one known-unobserved entry is present, otherwise `LOWER_BOUND`. At every baseline head: `actionEconomy`, `equipmentState` and `forcePoints` are `KNOWN_GAPS`; the other six families are `LOWER_BOUND`.

**Certification limits that follow** (binding on any later checkpoint): (1) **no family may be certified or ratcheted as completely inventoried**; (2) `actionEconomy` and `equipmentState` — and the Force Point direct-writer list — are explicitly known incomplete; (3) a ratchet may only claim "no new *recognized-form* writer relative to the baseline"; (4) an artifact that claims `inventoryComplete: true`, or whose `ratchetCoverage` disagrees with its known-unobserved entries, is **malformed** (`--check-artifact` exit 1) — the same CI semantics as every other malformed artifact; a reported gap is never a CI failure.

Choice of approach: the inventory (not new recognizers) was used because adding `system.activated`/`system.equipped` as protected paths would add many records from item-sheet and UI code and silently change the baseline's meaning; resolving class constants would start the data-flow work the directive excludes. Both can be revisited by a reviewed config change.

## 3. Mitigations built into the tool

- Anything not classified as a read, a recognized write, or a delegated call **is reported as `unresolved-use`** rather than dropped (tests: aliases, unknown callee, path embedded in a sentence).
- Documented exceptions are emitted, with reasons, and never suppress the finding.
- `limitations` is embedded in every artifact (`ti4a-authority-inventory/1.limitations`) so a consumer of the JSON cannot miss it.
- Known verified blind spots are recorded in the self-verifying known-unobserved inventory with explicit per-family certification limits (§2b).
- Mutation-tested: eight injected analyzer defects (comments unmasked, reads counted as writes, CLI failing on unclassified writers, unresolved uses dropped, nondeterministic ids) each make a test fail.

## 4. What this means for a future ratchet (not authorized here)

1. A ratchet built on this inventory can only claim "no **new** writer of a recognized form appears relative to the recorded baseline". It cannot claim a protected field has no other writer.
2. L1 and L10 mean the baseline is incomplete for `actionEconomy` and `equipmentState` until their families are extended (constant-key resolution; activation fields).
3. L8/L9 mean a reviewer must classify each baseline entry once (this checkpoint proposes dispositions); after that, only *new* entries need review.
4. Runtime enforcement of any kind would be a different mechanism and is explicitly out of scope; the Phase 0 audit found the existing runtime governance (`MutationInterceptor`) enforces nothing.
