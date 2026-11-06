# Droid V2 — Verified Gate A Integration Freeze (2026-11-05)

**Status:** FROZEN CODE CHECKPOINT, NOT production-ready; **no Gate C included**. Vehicle Claude is the sole combined-integration lead. Do not merge this branch, the Droid PR, or either domain directly to `main`.

## Exact refs and ancestry

| Purpose | Branch / PR | Exact SHA |
|---|---|---|
| **Integration input — verified, frozen code** | `freeze/droid-v2-gate-a-2026-11-05` | **`1f46371555210c3b3c7e7492e98d4af51468c9ae`** |
| Original Droid implementation / draft PR | `feature/droid-v2-component-quote-gate-a` / [#1106](https://github.com/docflowGM/foundryvtt-swse/pull/1106) | **`1f46371555210c3b3c7e7492e98d4af51468c9ae`** when frozen |
| Droid implementation base | `audit/droid-publication-census-2026-10-29` | `ebc440f475b2fefd26f9368d99d01592e2abac23` |
| Vehicle implementation inspected (not frozen here) | `audit/universal-vehicles-phase1` / [#1092](https://github.com/docflowGM/foundryvtt-swse/pull/1092) | `e844aba1bbbb9b2a66f860bf579cf476d43c40f7` at review time |
| This handoff document | `handoff/droid-v2-integration-2026-11-05` | Documentation-only descendant of the verified Droid code SHA; **not** the integration merge input. |

**Freeze policy:** integrate by exact pinned code SHA, not a moving branch name. The frozen code branch must not be advanced. The handoff documentation is deliberately in a separate branch so its commit does not invalidate exact-head CI for the integration input. The future integration target is `integration/v2-vehicles-droids-2026-11`, owned exclusively by Vehicle Claude; do not create or merge into it from this checkpoint.

## Source and bounded implementation

- Frozen **122 unique Core + Scavenger's Guide to Droids component identities**: **99 source-review PASS, 23 source-review HOLD**. Original ledger identities/dispositions are unchanged. Five locomotion cost-composition HOLDs permit only the specific first, unrestricted initial-construction **numeric** subset. Numeric permission never grants installation.
- One pure V2 quote authority handles all nine Core/official-errata size factors; separates accessory mass from locomotion mass; rejects unknown source, unknown size, missing weight/price, unselected variants and illegal/negative prices. The builder, its preview, follower and Garage use shared source-reviewed quotation and typed prerequisites.
- Source prerequisites cover `sizeRestriction`, `requiredLocomotion`, `requiredSystems` and a **unique appendage instance** for `requiresAppendage`. A matching appendage type alone is insufficient. Real chassis/possession/physical-host installation authorization is **not** implemented.
- Source-correct Gyroscopic Stabilizers mass, stationary speed `0`, installed-SR-based shield expansion. Follower draft preserves zero speed and does not treat an unquotable appendage as a free grant.
- Four Hardened Systems tiers use printed **size-based replacement** mechanics, not additive totals. Runtime hydrated `hp.max`/`defense.damageThreshold` modifiers contribute only the difference over ordinary size bonuses; all **16 tier × size** cases match certified printed-source fixtures. Different tiers are nonstacking.
- **135** SGD-HOST-002 numeric fixtures executed (**126 accessories + 9 locomotion**); two physical-host exceptions, Micro Shield and Silence-Bubble Generator, remain source-unresolved and have **not** been claimed as runtime installation tests.
- **84 catalog definitions; 47 direct fields** inventoried: **19 source/quote/prerequisite**, **3 source-to-runtime modifier**, **9 presentation only**, **16 still requiring independent mechanical-consumer proof**; nested payloads are not thereby certified. `tools/audit-droid-source-field-ownership.mjs --certify` intentionally remains a future hard gate.
- **No migration of existing player droids**, no parallel price engines, no new installed ledgers, no Store financial implementation. Existing `system.installedSystems` is authoritative for postcreation installed state; `system.droidSystems` is draft/stock data, **not** a second ownership ledger.

**Gate C finding:** no stacked Gate C branch, tested Gate C implementation, or combined Gate A+C SHA was verified in the current repository branch/PR inspection. **This is a Gate A-only checkpoint.** Do not advertise `system.installedSystems` physical-host acceptance or Gate C as complete. Gate C, Store and native Foundry validation belong to separate authorized follow-on work.

## Exact-head verification (frozen SHA `1f46371555210c3b3c7e7492e98d4af51468c9ae`)

| Gate | Actual result | Evidence |
|---|---|---|
| Droid V2 Gate A targeted GitHub CI | **PASS**, exact SHA | [Run 42085596801](https://github.com/docflowGM/foundryvtt-swse/actions/runs/42085596801) |
| Full supported Rolling System Validation | **PASS: 434 passed / 0 failed / 5 documented exclusions**, exact SHA | [Run 42085596987](https://github.com/docflowGM/foundryvtt-swse/actions/runs/42085596987) |
| `phase-5c-canonical-production-negative.test.mjs` | **PASS** in rolling run; test **not modified or weakened** | Same rolling run |
| Droid source-review, quote, prerequisite and Garage checks | **PASS** in targeted and rolling checks; no live host-transaction claim | Targeted run |
| Foundry VTT v13 live actor/sheet/host transaction testing | **NOT RUN**; no Foundry runtime assertion | Deliberate exclusion, not a passing test |
| Gate C-specific physical installation suite | **NOT APPLICABLE**; no Gate C implementation | Must not claim a pass |

**Five existing runner exclusions** (unchanged): `force-power-final-integration.test.mjs`, `phase3-force-power-corrections.test.mjs`, `phase4-force-modifier-automation.test.mjs`, `phase5-force-healing-mitigation.test.mjs`, `phase6-force-direct-damage.test.mjs`. These are documented in `tools/run-rolling-tests.mjs`; no additional exclusion was introduced.

### Exact Phase 5C failure and repair

The prior 433 PASS / 1 FAIL run failed `phase-5c-canonical-production-negative.test.mjs` because the classification snapshot was stale against actual Droid-branch tracked data. **141 missing files** were verified from the branch Git tree: **128 Droid audit records**, already covered by the existing historical audit rule, plus **13 partial `data/canonical/droids/source-books/*.json` source ledgers**, which required a new explicitly Droid-only, non-feat/weapon classification rule. Rebuilt the generated `data/audits/phase-5c-authority-classification.json` **and** `docs/audits/phase-5c-authority-classification.md` from **432 actual in-scope files**. The negative test and feat/weapon production checks were left intact and now pass.

## Changed code and ownership boundaries

**PR #1106 changes 30 tracked files** (13 `scripts/` files, 9 `tests/` files, 8 workflow/authority/report/template files). The main modified executable files are:

- Rules and governance: `scripts/domain/droids/droid-component-quote-authority.js`, `droid-component-source-review.js`, `droid-component-prerequisites.js`, `droid-builder-quote-consumer.js`; `scripts/data/generated-droid-component-source-status.js` and `scripts/data/droid-part-schema.js`.
- Existing source/adapters: `scripts/data/droid-systems.js`, `scripts/domain/droids/droid-part-schema.js`, `scripts/engine/progression/droids/droid-trait-rules.js`.
- Actual consumers: `scripts/apps/progression-framework/steps/droid-builder-step.js`, `droid-builder-view-model.js`, `follower-steps/follower-droid-builder-step.js`; `scripts/engine/customization/droid-customization-engine.js` and `templates/apps/progression-framework/steps/droid-builder-work-surface.hbs`.
- Audit/CI: `tools/build-droid-component-source-status.mjs`, `tools/audit-droid-source-field-ownership.mjs`, `tools/lib/canonical-authority-classification.mjs`; the Phase 5C JSON/Markdown files; `.github/workflows/droid-v2-gate-a.yml`; the relevant regression tests and `docs/audits/droids/droid-v2-gate-a-implementation-checkpoint.md`.

**Existing shared interfaces — do not speculatively refactor:**

| Shared dependency | Droid usage / merge check |
|---|---|
| `scripts/governance/actor-engine/actor-engine.js` | Garage's authorized mutation path depends on ActorEngine. **Vehicle PR changes this file**, but Droid PR does not. Re-run Garage debit/rollback and actor-mutation tests against combined ActorEngine. |
| `scripts/engine/store/transaction-engine.js` | Existing Garage transaction authority; **not modified** by Droid Gate A. Ensure Vehicle Store actions cannot bypass Droid source/host checks if future Droid commerce is implemented. |
| `scripts/apps/store/store-checkout.js` and related Store | **Vehicle changes Store checkout**, Droid PR deliberately does not; no Droid V2 Store quote/checkout parity is claimed. Keep vehicle and droid eligibility domain-specific. |
| Actor/Character model; `system.installedSystems` vs `system.droidSystems` | Chassis draft, follower and postcreation state must not be merged into a new duplicate ledger. The existing installed-component resolver is **unchanged**; Gate C must give it valid host/instance ownership. |
| `scripts/domain/droids/droid-installed-component-resolver.js`, `scripts/engine/equipment/anatomy-resolver.js` and appendage projection | Existing read/anatomy contracts, unchanged by this checkpoint. Revalidate deduplication, unique appendage hosts and installed-vs-possessed decisions in combined runtime. |
| `scripts/engine/effects/modifiers/ModifierEngine.js` | Unchanged; consumes `hydrateDroidPart()`. Recheck Hardened Systems 16 size/tier deltas and no double application when combined. |
| Chargen / follower / Garage / V2 presentation | Droid code changed these consumers directly; previews do not calculate mechanical prices independently. Node checks green; Foundry v13 UI/runtime checks remain unperformed. |

## Three direct overlaps with Vehicle PR #1092

1. `tools/lib/canonical-authority-classification.mjs` — **preserve both** the Droid partial source-book rule and Vehicle canonical source/rule classification, plus existing armor/equipment roles. Neither branch's version may overwrite the other.
2. `data/audits/phase-5c-authority-classification.json` — generated snapshot; **regenerate on the merged tree** instead of taking ours/theirs.
3. `docs/audits/phase-5c-authority-classification.md` — generated report; **regenerate together with JSON**.

On the **Vehicle-led combined branch only**, after resolving source rule union, run `node tools/build-phase-5c-authority-classification.mjs`, `node tests/phase-5c-canonical-production-negative.test.mjs`, the targeted Droid and Vehicle suites, and `node tools/run-rolling-tests.mjs`. Validate ActorEngine, Store, installed-component, modifier, follower and Garage interactions under native Foundry V13 before production authorization. Do not create a universal vehicle/droid physical-installation engine.

## Deferred, deliberately excluded

- **23 source HOLDs** remain HOLD (five only have restricted initial-build numeric safe subsets). No new source promotion.
- Two source-undetermined physical hosts (Micro Shield handheld/possessed, Silence-Bubble Generator); legal availability/purchaser and actual attachment identity/slots.
- Full Gate C, integrated `system.installedSystems` commit/remove authorization, postcreation real host enforcement, equipment ownership and action/encumbrance behavior.
- **16 unproven top-level mechanical consumer fields** (including armor properties, running speed, behavioral inhibitors, attack/weapon capabilities, installation DC, and more); nested properties need independent proof.
- Canonical Translator Unit four priced tiers vs legacy three wrong aliases, other unresolved variants; **26** V2 migration acceptance scenarios are not certified against all four live consumers.
- Store debit/asset atomicity and rollback for Droid component commerce, live Foundry V13 tests, full source-to-application mechanical certification.
- All historical actor migration, cross-domain speculative shared-engine refactors and any merge to Vehicle, the common integration branch or `main`.

**Next owner action:** Vehicle Claude merges the **exact frozen Droid code SHA** into its separately verified integration sequence, resolves three classification artifacts by regenerating from merged authority, independently tests both domains and reports the combined baseline SHA. Only then create a fresh Droid V2 feature branch from that verified combined commit and target `integration/v2-vehicles-droids-2026-11`. Leave original draft PRs open for review history until integrated work is verified.
