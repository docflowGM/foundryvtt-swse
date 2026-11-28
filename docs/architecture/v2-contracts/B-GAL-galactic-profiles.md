# B-GAL — "Galactic profiles" census domain: procedural GM content generation and the Location registry

**Contract level:** B with embedded C. **Audited commit:** `f734b4d`. **Census domain:** `galactic-profiles` (159 runtime modules, 28.9k SLOC; 150 test-only, 2 unreachable-importers-only, 7 reachable).
Sidecar: `data/audits/architecture-census/contracts/domains/galactic-profiles.json`. Level A IDs: [`A-global-invariants.md`](A-global-invariants.md).

## 1. Purpose and boundaries

**Naming correction (CR-GAL-01).** The census groups `scripts/generation/**` under "galactic-profiles", and `docs/audits/architecture-census/phase-0-census-report.md:115` calls it "the entire Galactic Profiles generator". The evidence says otherwise:

- Galactic Profiles v3 (predefined character/droid builds) is specified in `data/galactic-profiles/v3/README.md` and `docs/audits/SWSE_Galactic_Profiles_v3_Claude_Implementation_Handoff.md`. Its runtime is `scripts/engine/progression/profile/galactic-profile-*.js` (census domain **progression**). It is reached from `scripts/apps/progression-framework/steps/galactic-profile-step.js` (registry: `reachable-dynamic`). None of those documents mention `scripts/generation/`.
- `scripts/generation/**` is the **GM Datapad procedural generator** (Random Location/Planet/POI, Faction, NPC concept, Job/Objective/Reward drafts). Phases 8D-1…8D-3C are documented in `docs/audits/gm-datapad-ecosystem-redesign.md` §§122–204.

This contract therefore covers: (a) `scripts/generation/**` (generator library); (b) `scripts/locations/**` (`LocationRegistryService`, Location Library seeds); (c) the GM shell bridge adapters in `scripts/ui/shell/gm/{Faction,Location}*BridgeService.js`; (d) `scripts/apps/galactic-records-browser.js` and `scripts/core/galactic-records-category-registry.js` (mis-grouped by name). The Galactic Profile v3 compiler/apply path belongs to B-PRG (progression) and is not assessed here.

**Must not own:** actor mutation (A-02), faction/contact canonical records (`scripts/allies/faction-registry-service.js`, census domain npc-followers), Jobs or Intel canonical records (holonet / future `JobEngine`), credit movement (A-10), SWSE mechanics. Generated drafts carry no mechanical fields (test-enforced).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-GAL-01 | Pure, RNG-injectable draft generators (location/planet/POI, faction, NPC concept, job, reward) | `scripts/generation/**` | OBSERVED · UNIMPLEMENTED (no runtime caller) | test-verified (`tests/gm-generation-phase8d1-foundation.test.mjs` passed offline) | `scripts/generation/jobs/job-bundle.js:360`, `docs/audits/gm-datapad-ecosystem-redesign.md:4948` |
| R-GAL-02 | Drafts never create or upsert canonical records | generator library + source guard test | OBSERVED · APPROVED (redesign §126, §199) | test-verified (`tests/gm-generation-phase8d1-foundation.test.mjs:775`) | `tests/gm-generation-phase8d1-foundation.test.mjs:791` |
| R-GAL-03 | Canonical Location registry (world setting) | `scripts/locations/location-registry-service.js` · `LocationRegistryService` (26 consumers) | OBSERVED | behavior-code-verified | `scripts/locations/location-registry-service.js:427`, `:472`, `:593` |
| R-GAL-04 | Location identity (id-only; collision-safe slug minting) | `LocationRegistryService.upsertLocation` / `_uniqueLocationSlug` | OBSERVED | behavior-code-verified | `scripts/locations/location-registry-service.js:604`, `:647` |
| R-GAL-05 | Per-actor Atlas state (pins, notes, revealed facts, lead discoveries) | `LocationRegistryService.setActorAtlasState` etc. | OBSERVED · CONFLICT (A-02, F-GAL-003) | behavior-code-verified | `scripts/locations/location-registry-service.js:805`, `:826`, `:840`, `:880`, `:917` |
| R-GAL-06 | Location Library seed catalog | `scripts/locations/location-library-seeds.js` (5,227 SLOC) | OBSERVED | source-inspected | registry consumers 8 |
| R-GAL-07 | Scene creation/activation from a Location | `scripts/ui/shell/gm/LocationSceneBridgeService.js` | OBSERVED (world documents, GM-gated create) | behavior-code-verified | `scripts/ui/shell/gm/LocationSceneBridgeService.js:82`, `:103` |
| R-GAL-08 | Faction/Location → Job/Intel draft adapters | `FactionJobBridgeService`, `LocationJobBridgeService`, `FactionIntelBridgeService`, `LocationIntelBridgeService` | OBSERVED (read + draft only, no writes) | source-inspected | `scripts/ui/shell/gm/FactionJobBridgeService.js:169`, `scripts/ui/shell/gm/LocationJobBridgeService.js:8` |
| R-GAL-09 | Compound draft commit orchestration (`CampaignMutationCoordinator`, `JobEngine`) | none | UNIMPLEMENTED · PROPOSED (design only) | source-inspected (docs) | `docs/audits/gm-datapad-ecosystem-redesign.md:9174`, `:9551` |

## 3. Authorities

- **Canonical data:** Location records → world setting via `LocationRegistryService` (OBSERVED). Faction/Contact → `FactionRegistryService` (npc-followers; identity hardened, redesign §204). Generator catalogs (`scripts/generation/data/*.js`) are draft content, not canonical records (APPROVED, redesign §126).
- **Rules:** none. Generators carry no mechanical fields (`hasForbiddenMechanicalFields`, `scripts/generation/npc-concept.js:509`, `scripts/generation/faction-doctrine-draft.js:140`). Encounter-balance math and species-specific naming are explicitly deferred (redesign §130).
- **Calculation:** `reward-estimator.js` / `reward-package.js` compute GM-facing payout estimates (design-spec heuristics, not printed SWSE rules). They move no credits. OBSERVED.
- **Mutation/persistence:** Location registry → `game.settings.set` world setting (`scripts/locations/location-registry-service.js:215`); Atlas actor state → direct `actor.setFlag` (CONFLICT); Scenes → `Scene.create`/`scene.update` (world docs, legitimate).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `registerLocationRegistrySettings` | `scripts/locations/location-registry-service.js:425` | `scripts/core/settings.js:504` | registers world setting `config:false` |
| `LocationRegistryService.upsertLocation` | `scripts/locations/location-registry-service.js:593` | 26 (module) | id-only identity; rejects invalid parent before save |
| `LocationRegistryService.saveRegistry` | `scripts/locations/location-registry-service.js:472` | internal | whole-array write + `swseLocationRegistryUpdated` hook |
| `LocationRegistryService.patchActorLocationState` | `scripts/locations/location-registry-service.js:809` | `scripts/ui/shell/AtlasSurfaceController.js:77` | direct actor flag write |
| `LocationRegistryService.resolveAtlasLeadDiscovery` | `scripts/locations/location-registry-service.js:897` | `scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js:586` | GM resolves a player's lead (writes that actor's flag) |
| `LocationSceneBridgeService.createSceneFromLocation` | `scripts/ui/shell/gm/LocationSceneBridgeService.js:80` | 1 | GM-only Scene factory |
| `FactionJobBridgeService.buildDraftFromFaction` | `scripts/ui/shell/gm/FactionJobBridgeService.js:170` | 6 (module) | pure draft builder |
| generator entry points (e.g. `createProceduralJobDraft`) | `scripts/generation/jobs/job-bundle.js` | tests only | pure; injected `rng` |

## 5. Dependencies

- **Allowed:** generation → `scripts/locations/location-library-seeds.js`, `scripts/utils/stable-id.js`, read-only registry lookups; bridges → `FactionRegistryService`/`LocationRegistryService` reads.
- **Prohibited:** generation → any canonical create/upsert (`upsertFaction`, `upsertLocation`, `createJobPosting`, `Actor.create`, `promoteFactionContactToActor`, `actorizePayload`) — APPROVED and test-enforced; generation → TransactionEngine/credits; generation → UI.
- **Observed violations:** none in `scripts/generation/**`. The only inbound edges are from `scripts/locations/**`, the GM bridges and tests. Nothing outside `scripts/generation` imports it.

## 6. Integration points and lifecycle

- `scripts/core/settings.js:504` registers the Location registry setting at init. This statically loads `location-registry-service.js`, which imports the 5,227-SLOC `location-library-seeds.js` (F-GAL-006).
- Hook emitted: `swseLocationRegistryUpdated` (`scripts/locations/location-registry-service.js:475`).
- Players reach Atlas state through `scripts/ui/shell/AtlasSurfaceController.js:77-142`. GM surfaces reach the registry and bridges through `scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js`.
- Generator library: **no lifecycle**. No UI, hook, macro or pack calls it (OBSERVED). The UI and commit phases are 8D-2+ UI and 8D-4 Generate → Review → Commit, both not built.

## 7. Failure behavior and domain invariants

- D-GAL-1 (APPROVED, redesign §126): generation is pure and deterministic under an injected RNG; drafts carry draft ids, never fake canonical ids. Test-verified. Note: three sites fall back to `Math.random` when no RNG is supplied (`scripts/generation/jobs/job-reward-suggestion.js:27`, `scripts/generation/jobs/cargo-concept.js:183`, `scripts/generation/jobs/job-bundle.js:360`). The fallback is acceptable by design.
- D-GAL-2 (APPROVED, redesign §200, design only): a future compound commit is `plan()` (pure) then `commit()` through per-domain authorities. The coordinator never becomes a mutation authority.
- D-GAL-3 (OBSERVED): an invalid parent rejects the entire Location save (`scripts/locations/location-registry-service.js:615-621`).
- A-02 (F-GAL-003), A-10 (U-GAL-02), A-11 (no rules adjudicated here), A-16 (no caches observed) apply.

## 8. Level C subsystem contracts

- **C-GAL-1 Generator library ↔ canonical authorities.** Interface: drafts with `draftId` and `provenance`. Commit happens only via a future `CampaignMutationCoordinator` → `FactionRegistryService` / `LocationRegistryService` / `JobEngine` / `ActorEngine`. Status: APPROVED (boundary) · UNIMPLEMENTED (coordinator).
- **C-GAL-2 Location registry ↔ actor Atlas state.** World setting holds canonical Location facts. Actor flag `ATLAS_ACTOR_FLAG` holds per-actor discovery and notes. Status: OBSERVED. A PROPOSED rule routes the actor flag through ActorEngine or a documented exception.

## 9. Tests and certification

There are 19 domain tests. Run offline at HEAD: `tests/gm-generation-phase8d1-foundation.test.mjs` (pass, including the source-level no-canonical-mutation proof) and `tests/gm-generation-phase8d3c-jobs-production.test.mjs` (41/41 pass). Location tests: `tests/gm-locations-*.test.mjs`, `tests/gm-locations-scene-creation-safety.test.mjs`. The generator has no live surface. Foundry acceptance: redesign §129 "not run — no live client available" (`docs/audits/gm-datapad-ecosystem-redesign.md:4945`). Location/Atlas surfaces are FOUNDRY_ACCEPTANCE_REQUIRED.

## 10. Reconciliation with existing contracts

Agreements: the generator honors the redesign's no-canonical-mutation boundary (§126, §199). Location identity follows the same id-only discipline adopted for Factions in §204.

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-GAL-01 | `docs/audits/architecture-census/phase-0-census-report.md:115`; census domain name | `scripts/generation/**` is "the entire Galactic Profiles generator" | It is the GM Datapad procedural generator. Galactic Profiles v3 runtime lives in `scripts/engine/progression/profile/**` and is live |
| CR-GAL-02 | `docs/repo-structure.md:164` | all actor mutations through ActorEngine or annotated | 5 un-annotated `actor.setFlag` sites in `location-registry-service.js` |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-GAL-001 | medium | confirmed | 150 test-only generator modules: intended-but-unimplemented runtime integration, not dead code |
| F-GAL-002 | low | confirmed | Census/phase-0 mislabels the generator as "Galactic Profiles" |
| F-GAL-003 | low | confirmed | Atlas actor-state flags written directly (5 sites, no exception comment) |
| F-GAL-004 | info | confirmed | Scene create/update in LocationSceneBridgeService is a legitimate world-document exception |
| F-GAL-005 | low | confirmed | `galactic-records-browser.js` and its category registry are reached only through an orphan dialog (dead chain) |
| F-GAL-006 | low | suspected | 5.2k-SLOC JS seed catalog loaded at init through settings registration |
| F-GAL-007 | low | suspected | Location registry is a whole-array read-modify-write of one world setting |
| F-GAL-008 | low | confirmed | Duplicate symbol `rerollPlanetName` with different signatures |
| F-GAL-009 | low | confirmed | Documentation: 9,854-line rolling redesign log is the only generator contract |

Multi-domain mechanical leads: none in this domain (census).

## 12. Unimplemented, deferred and acceptance-required

- U-GAL-01 UNIMPLEMENTED: Generator UI (8D-2+ UI phase) and Generate → Review → Commit (`CampaignMutationCoordinator`, `JobEngine`; redesign §§199–201, "not started", `docs/audits/gm-datapad-ecosystem-redesign.md:9551`).
- U-GAL-02 UNIMPLEMENTED: applying generated rewards. Any future credit award must go through TransactionEngine (A-10). Item rewards need a Store-index pricing adapter, which redesign §130 says does not exist.
- U-GAL-03 UNIMPLEMENTED (deferred by redesign §130): NPC Opposition Catalog, species-specific name generation, encounter-balance math, rank/privilege mechanics. None are to be invented. Any that touch SWSE mechanics need an owner ruling (A-11). No new register entries are raised by this audit.
- FOUNDRY_ACCEPTANCE_REQUIRED: GM Locations/Atlas surfaces, Scene factory, library import.
