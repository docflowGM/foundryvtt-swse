# SWSE Galactic Profiles v3 — Claude Implementation Handoff

**Status:** Implementation specification and staging-only data. Do not interpret a structural/schema pass, a static authoring check, or this handoff as V2 runtime certification.

**Repository:** `docflowGM/foundryvtt-swse`
**Branch used for staging:** `feature/chargen-splash-prewarm`
**Pre-staging implementation baseline:** `c8c1c4b121575e5848b8e06d940f734e19048bcb`
**Scope:** Existing **33** v3 profiles and newly staged **8** Level-1 **custom heroic droids**; all **41** need regression coverage. Do not change or rewrite the 33 preserved source files as a side effect of introducing droids.

## 1. Governing design contract

```text
Galactic Profile v3 JSON (player's intended predefined choices)
  -> one versioned V3 Registry + browse catalog
  -> ONE GalacticProfileCompiler (droid extension, not a competing engine)
  -> canonical ProgressionSession draft
  -> player resolves only real unresolved/illegal selections
  -> existing ProgressionFinalizer readiness, V2 validators and dryRun
  -> ONE complete MutationPlan (including equipment, wallet, installed ledger)
  -> ActorEngine.applyMutationPlan transactionally at explicit final confirmation
  -> finished actor / verifiable rollback outcome
```

The profile JSON is **intent**, never directly writable actor system fields or permission to acquire an item. Canonical V2 class/feat/talent/skill/Force/droid/item/finance authorities resolve and validate that intent. Do not add a second finalizer, parallel droid builder, compatibility shim, duplicate purchase calculator or fallback that grants missing content. The final actor and preview must use the **same compiled plan**.

**Do not implement gameplay changes until the proposed phases are reviewed and approved.** When implementation is authorized, work with current Git HEAD (not just the provenance pin) and commit in verified phases.

## 2. Production/source inventory

### Already committed (33 profiles, unchanged)
```text
data/galactic-profiles/v3/SWSE_Galactic_Profiles_v3.json
data/galactic-profiles/v3/SWSE_Galactic_Profiles_Catalog_v3.json
data/galactic-profiles/v3/SWSE_Galactic_Profiles_v3.schema.json
data/galactic-profiles/v3/SWSE_Galactic_Profiles_Source_Archive.json
data/galactic-profiles/v3/SWSE_Galactic_Profiles_Migration_Report.json
data/galactic-profiles/v3/SWSE_Galactic_Profiles_README.md
docs/audits/SWSE_Galactic_Profile_Rolling_Audit.md
```
Those 33 records include heroic characters, nonheroics and beasts. Their unresolved feat aliases, published talent identity collisions, Jedi Force Training, skill and species publication issues must remain **open until checked**, never silently "corrected" by compilers.

### Newly staged (8 custom heroic droids)
```text
data/galactic-profiles/v3/droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json
data/galactic-profiles/v3/droids/SWSE_Eight_Droid_Galactic_Profiles_Catalog_v3.json
data/galactic-profiles/v3/droids/SWSE_Eight_Droid_Galactic_Profiles_v3.schema.json
data/galactic-profiles/v3/droids/README.md
```
Full authoring JSON contains selected pre-modifier and final abilities, per-degree behavioral restrictions, class grant expectations, feat/talent/skill selections, detailed `droidSystems` identities, local hardware ledgers, external item candidate refs, 3d4 starting-credit dice and net balances. The **catalog is a browse projection**, not a grant source. All eight are flagged `publishableAsReadyToPlay=false`.

## 3. Verified current code seams at the staging baseline

| Location | Existing behavior / required integration |
|---|---|
| `scripts/engine/progression/template/template-registry.js` | Loads `data/character-templates.json` and `data/nonheroic-templates.json` in v2 format. Replace Galactic Profile input with a versioned v3 loader for both staged packages; survey other callers before retiring the old registry. Do not let two independent template authorities remain active. |
| `scripts/engine/progression/template/template-adapter.js` | Existing v2 adapter creates a session and populates draft selections, with legacy shape/fallback handling. A new v3 compiler must resolve canonical refs and legal entitlements instead of simply recasting v3 as v2. |
| **New:** `scripts/engine/progression/profile/galactic-profile-compiler.js` | Recommended single shared compiler: resolve authored choices through V2, construct normalized draft, report blocking/nonblocking requirements and provenance. No actor writes. Droid specifics are extension logic within this same path. |
| `scripts/apps/progression-framework/steps/galactic-profile-step.js` | Has three-stage `profile-class`, `profile-archetype`, `profile-review`; currently seeds the first available class/profile implicitly and `ProfileReviewStep.onStepExit()` calls `_applyTemplateToSession`. Make actual user choice explicit and add idempotent **Apply Profile**; do not apply on exit/render. |
| `scripts/apps/progression-framework/steps/intro-step.js` | Actor splash can enter profile picker. Droid `data-role="droid-select-standard"` currently calls `TemplateInitializer.initializeForChargen` and sets `creationMode="standard-model"`. Droid Galactic Profile must instead use the same three-stage picker and stay `creationMode="custom"`. Preserve a genuine separate standard-model route only where intended. |
| `scripts/apps/progression-framework/shell/progression-session.js` | Owns `draftSelections` and validates through `commitSelection`; tracks steps, checkpoints and persistence hooks. Preserve `profileId`, `revision`, source package, player overrides, resolved references and blocking choices; do not create an independent shadow draft. |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | Already exposes `dryRun()`, final validation, subtype adapter plan contribution and ActorEngine transactional application. Use it; do not create a second finalizer. Compare preview and confirmation plans and report rollback outcome accurately. |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` around lines 2674–2689 | `_resolveFinalStartingCredits` currently consults actor-backed `chargenStore` state that may already spend starting credits before final confirmation. Galactic Profiles require a **draft-only equipment purchase ledger** included once in final plan. Map all relevant store consumers; no premature actor writes, no duplicate spending. |
| `scripts/engine/progression/droids/droid-trait-rules.js` | Universal droid traits, degrees, sizes, behavioral/ability modifiers, custom defaults. V2 authority; do not use profile final stats as an independent second source. |
| `scripts/domain/droids/droid-build-quote.js` | `quoteDroidBuild` normalizes trusted component **identities**, re-quotes from canonical definitions, derives real free grants; statuses `OK`, `INCOMPLETE`, `BLOCKED`. Input `costCredits`, source flags and wallet numbers are **not** pricing authority. |
| `scripts/domain/droids/droid-component-quote-authority.js` and `droid-component-source-review.js` | Published-source, size/variant/prerequisite gate and quote authority. Never waive `BLOCKED` or `NEEDS_SOURCE_ADJUDICATION`. |
| `scripts/apps/progression-framework/steps/droid-builder-step.js` | Already manages draft droid selections and 1,000-credit custom construction budget; presets must feed the same canonical contract. |
| `scripts/domain/droids/droid-initial-installation-service.js` | `applyInitialInstallationToPlan()` does initial-build host validation and ledger projection into the mutation plan. Reuse through the existing subtype adapter; do not call twice or bypass stock-statblock guard. |
| `scripts/apps/progression-framework/adapters/default-subtypes.js` | Existing chargen subtype installation integration; verify the exact current invocation before changing it. |

### Architecture risks to audit before coding
- **Auto-default selections** are not user consent. Profile class or archetype selection is not complete until explicitly chosen.
- **Exit-time profile application** currently replaces a session; switching profiles/backtracking can discard overrides unless transitions are transaction-like and deterministic.
- `TemplateAdapter` uses some direct draft assignments; the v3 compiler must not introduce unvalidated persistent state.
- `ProgressionFinalizer.dryRun()` may have advisory warnings from generic progression paths. Profile publication/application must **fail closed** for unresolved canonical identifiers, illegal entitlements and hardware/install hosts.
- `actor.flags.swse.chargenStore` and direct wallet/item mutations before final confirmation break atomicity. Review all producers/consumers rather than layering a second finance model.
- Current gear source candidates include at least one unresolved by-name reference (e.g. "Energy Cell"). No silent substitution or loss.
- Hardware line costs are locally reconstructed estimates and can disagree with real V2 source/quote/variant gate. Correct the **data selection**, not the authority.
- The 33 original organic/nonheroic/beast records have different class/participant rule tracks; never force all profiles into heroic-droid rules.

## 4. Locked custom-droid requirements

1. Exactly eight Level-1 custom heroic droids; two each in Scout (DEX/INT), Soldier (DEX/STR), Noble (INT/CHA), Scoundrel (CHA/DEX); no Jedi or Force powers.
2. Five-score standard array `15/14/13/12/10` recorded as `preDegreeAndSizeScores`; `scores` is intended *final* cross-check. `con=null`. Compute degree+size once, compare to final, derive remaining stats through V2.
3. Droid degree carries nonviolence and obedience inhibitor flags; verify against authoritative degree package.
4. Free baseline heuristic processor, two physical hands, and the **size-default** locomotion only when chosen; replacing default locomotion is charged.
5. Custom construction `budgetCredits=1000`, local `spentCredits=1000`, `remainingCredits=0`; no overflow and no construction-credit carry-forward. Recompute with `quoteDroidBuild` for **each exact system snapshot**; assert `status=OK`, `totalCredits=1000`, all grants/host/prerequisites/source holds resolved.
6. Weapons and portable gear external, distinct from integrated hardware. Verify class weapon proficiency, ammunition/power source, installed appendage manipulation/draw permissions and safe item identity.
7. Separate preselected `3d4` class-starting-credit result, equipment purchases and one `wallet.mode=finalNetBalance`. Neither recharge money nor charge the same item twice.
8. Obtain class automatic feats from canonical V2 grants; no duplicative general feat. Scout Shake It Off Constitution prerequisite fails for droids; Noble Linguist only when final INT qualifies. One Level-1 general feat and one class talent; talent-tree and feat prereqs enforced by V2.
9. `talentWiki` optional rule grants one extra **general talent selection** only when enabled; do not invent a default pick.
10. Installed ledger seeded **once** via `applyInitialInstallationToPlan` in the same plan. Never apply installed-system bonuses twice, especially in stock-statblock mode.

## 5. Recommended implementation phases (obtain approval before beginning)

### Phase 0 — Scope and authority audit (no runtime changes)
- Re-read current branch HEAD. Map current profile entry points, every `TemplateRegistry` consumer, class/feat/talent/skills registries, droid subsystem/adapter, equipment/store mutations, persistence snapshots and current tests.
- Validate 33 + 8 source preservation. Audit the v3 schema and exact fields against real `ProgressionSession` schemas; identify any substantive changes required to compiler contract.
- Produce defect matrix with *verified*, *suspected* and *requires Foundry* states. Define what `profile` selection and `Apply Profile` mean relative to final actor confirmation.

### Phase 1 — Shared v3 registry and profile compiler
- Implement one versioned loader for the two authoring packages and one lightweight catalog, with stable `profileId`/revision selection, duplicate ID rejection and fail-closed invalid records.
- Implement one `GalacticProfileCompiler` taking (profile, actor snapshot, rules/settings), resolving canonical references and legal entitlements into normalized session draft with no actor writes.
- Compile *to a disposable draft first*; only replace active session when compilation succeeds, preserving necessary identity and user-overridden fields. Report explicit missing fields/failed choices for the relevant normal step.
- Keep existing 33 profiles and their nonheroic/beast tracks intact.

### Phase 2 — Droid hardware and transactional equipment economy
- Resolve droid degree/size, modifiers, class grants, feat/talent/skill slots, identifiers and restrictions. Quote each exact droid build with V2 authority, not local cost flags.
- Project canonical installed-system ledger through existing plan hook, not via a separate actor update.
- Resolve external equipment, ammunition, legal availability and preselected class starting credits. Make all purchases **draft-only** until final ActorEngine transaction. Remove any profile-path dependency on actor-backed prerelease store purchases.

### Phase 3 — Explicit picker and review experience
- Both organic and custom-droid splash paths -> class -> archetype -> review, no silent defaults. Explicit **Apply Profile** populates the canonical session only; no actor write.
- Review lists only **genuinely unresolved** choices. User can jump to appropriate normal progression step, correct picks, backtrack/switch profile with deterministic override policy, resume after closing, and return to review without duplicate grants.
- Final confirmation uses a complete, validated plan; preview and final have parity.

### Phase 4 — Automated and live certification
- Unit/source-schema regression for eight droids and 33 prior records; exact ID resolution; deterministic entitlement/starting-grant ledger; 1,000-credit re-quote; item/money/installation ledger; zero duplicated feat/talent/items/bonuses.
- Session navigation/mutation tests: class/profile selection requires click; no apply on step exit; apply same profile twice; choose another profile; back/forward; close/resume; override invalidation; draft readonly; rejection/rollback including indeterminate rollback state.
- Production smoke in Foundry v13 (actual docs, item compendiums, ActorEngine, UI) with 41 profiles; publish as ready-to-play **only individually** after passing relevant gates.
- Record source/published rules and commit IDs for certified fixes. Retire obsolete readers only when all consumers have been cut over.

## 6. Required regression tests for Claude to add / extend

| Category | Expected assertions |
|---|---|
| Schema/catalog | 8 valid unique droid IDs, exactly four classes, 2 focus variants per class, no CON, droid required, catalog matches full records, 41 combined records without duplicates |
| References | Every class, feat, talent, skill, gear and hardware ID resolves to an exact intended V2 identity; unresolved/ambiguous => blocking diagnostics, never fuzzy autofill |
| Build legality | Standard-array permutation; degree and size mods applied **once**; starting class feats/talent slots; no Shake It Off; conditional Linguist; Force powers forbidden |
| Droid quotation | Re-quote exact `droidSystems`, `OK` and total 1000, correct free grant identities, no price/variant/source/prerequisite/host HOLD |
| Materials | Wallet final-net accounting, dice budget, purchases, ammunition, class grant duplication, no exterior-vs-installed gear confusion |
| Ledger | Stable IDs, exactly once seeded, correct manipulators/draw permissions, no double modifiers; abort before mutation on missing hardware host |
| State/navigation | Explicit apply, no automatic first choice, deterministic profile switching/override invalidation, close/resume idempotence |
| Finalization | `dryRun()` vs final plan equality for immutable choices, plan-only preview, **zero live actor writes before confirm**, once-only ActorEngine transaction, rollback correctly reported |
| Backwards scope | 33 original profiles' preserved identities, fields and intended rule tracks unchanged, except specifically reviewed/legal corrections |
| Live Foundry | Actor stats, inventories and installed ledger match plan; repeat on real Foundry v13; test case evidence recorded |

## 7. Definition of done and prohibitions

- No new actors, actor item grants, credits, flags or installed records **until** the player's final confirmation (except deliberately authorized draft persistence that does not modify character mechanics; audit that persistence boundary).
- No source ID coercion that quietly picks a different feat/talent/item, no class skills invented, no ignored quote BLOCKED results, no renormalization of full provenance or published text without review.
- Do not mark every staged profile certified because JSON is schema-valid or an offline test passed.
- Favor complete V2 **single source of truth** over compatibility shims. Changes can be broad if every consumer is mapped, updated and regression-tested.
- Do not merge or enable runtime deployment as part of this staging task; report commits and test proof before implementation review.

## 8. Rules/source locators and outstanding certification

Rules: *Star Wars Saga Edition Core Rulebook*, Creating a Droid Hero pp. 186–187, Heroic Classes and Equipment, official errata; *Scavenger's Guide to Droids*, Creating Droid Heroes pp. 10–11, keeping custom hero, stock chassis and standard model rules distinct. Repo code and sourcebooks are respective implementation and rules authorities.

All eight remain `staticRAWAndSourceChecksPassedPendingV2`, `publishableAsReadyToPlay=false`; the 33 remain their own pending V2 certification status. **This data push implements no runtime logic.**
