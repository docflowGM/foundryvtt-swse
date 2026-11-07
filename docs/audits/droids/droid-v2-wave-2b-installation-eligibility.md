# Droid V2 - Wave 2B / Gate C-2: installed-component evidence, quote vs installation eligibility, host quotation (2026-11-06)

**Branch:** `feature/v2-unified-wave-2b-host-eligibility`, stacked on `feature/v2-unified-wave-2-guards` (PR #1113 head `502810b`, exact-head CI green: Rolling 618/0/5 excluded, Droid targeted success). **Offline only; no Foundry V13 runtime test.**

## Defects found (all pre-existing, all confirmed by reproduction)

1. **Opaque ledger keys read as part ids.** `resolveDroidPartQuote` supplied prerequisite checking with `Object.keys(system.installedSystems)`. Since Gate C-1 a key may be `hand--inst-...`. The quote layer now reads identities from the authoritative records via the shared installed-component resolver.
2. **Draft / mirror / stock evidence satisfied post-creation requirements.** Prerequisites read `droidSystems` (a draft/stock/display blob) as installed evidence for any actor.
3. **Requirement ids and installed ids were in different vocabularies.** Typed `requiredSystems: ['remote']` vs the ledger's canonical `remote-processor` (alias `remote`): a ledger-installed remote processor could never satisfy it. Both sides are now compared in one vocabulary (caller-supplied `normalizeId`, pure default).
4. **`compatible` meant "has a price".** `droidPartEntry` set `compatible = !quoteBlocked`, and the backup-processor branch of `getAvailableSystems` then forced `compatible = true`, masking independent failures. Reproduced on the Wave 2A baseline: with a backup slot, `military-processor` (source HOLD) and `remote-processor` (quote blocked) were displayed compatible.
5. **Caller-supplied host prices were trusted** (`appendageBaseCost` / `appendageBaseWeight` passed straight into the quote on the actor path).

## Contract

- **Evidence (post-creation, `ledgerEvidence: true`).** `collectInstalledComponentEvidence(actor)` returns `confirmedIds` (components the installation ledger records), `presentIds` (any source) and `confirmedAppendages` (ledger physical instances). Only confirmed evidence SATISFIES a requirement; `droidSystems` display mirrors, stock-import blobs, creation-time selections and embedded Items do not. Present evidence still BLOCKS a conflict (nonstacking Hardened Systems tiers), the safe direction. Builders (chargen/follower) keep DRAFT mode unchanged: the draft is the thing being built. The chassis's primary locomotion remains a `droidSystems` fact. Embedded-Item evidence is treated as present, not confirmed, for positive requirements; this is an evidence-handling choice, not a rule, and is listed for review below.
- **Eligibility (`droid-installation-eligibility.js`, pure).** `ELIGIBLE` only when source review PASS, typed prerequisites MET, exact numeric quote, no pending host ruling and no established restriction; otherwise `BLOCKED` with coded reasons, or `UNKNOWN` when facts are missing. The quote authority gained `resolveSourceReviewedDroidQuoteStaged` (which gate decided); `resolveSourceReviewedDroidQuote` returns byte-identical results. `getAvailableSystems` / preview use eligibility; the backup slot now lifts exactly the "primary processor already installed" restriction.
- **Host quotation.** `deriveHostAppendageBase`: for a component with a TYPED `requiresAppendage`, base cost and mass are the canonical quote of the verified ledger host at this droid's size. Not taken from the caller, the mirror, or a ledger entry's stored `cost`; a host that is not on THIS actor's ledger, whose kind mismatches, or whose kind the definition does not allow yields no base. A component without a typed host requirement is never host-priced (no guessing from prose or price functions). Apply re-derives host and eligibility against current actor state (Wave 1 normalization plus this layer).
- **Pending host rulings stay blocked.** Telescopic Appendage (DROID-RD-002), Micro Shield and Silence-Bubble Generator (SGD-HOST-002) are `BLOCKED / HOST_RULING_PENDING` even when a numeric price exists. DROID-RD-001 and -003 are untouched.

## Measured change in displayed installation eligibility (672 catalog comparisons, 6 droid shapes, vs Wave 2A)

| Droid shape | Change |
|---|---|
| bare / primary processor / large bare | none |
| primary processor + backup slot | `military-processor` true->false, `remote-processor` true->false (masked failures removed) |
| ledger-installed remote processor | `synchronized-fire-circuits` false->true (its typed `requiredSystems: ['remote']` is now satisfiable; vocabulary fix) |
| draft-only remote processor (no ledger) | `synchronized-fire-circuits` true->false (a draft selection no longer satisfies a post-creation requirement) |

Display and preview agree for every catalog entry on three shapes (334 comparisons).

## Files

`scripts/domain/droids/droid-installation-eligibility.js` (new), `droid-component-quote-authority.js` (staged variant), `droid-component-prerequisites.js` (ledger evidence mode, canonicalization), `scripts/data/droid-part-schema.js` (evidence collector, host derivation, detailed quote), `scripts/engine/customization/droid-customization-engine.js` (eligibility, restriction handling), `tests/droid-wave2b-installation-eligibility.test.mjs` (new, 11 groups), `.github/workflows/droid-v2-gate-a.yml`.

## Evidence

11 test groups on the real catalog / quote authority / engine (opaque keys, confirmed-vs-present evidence, nonstacking, draft-mode unchanged, host derivation including stale / foreign / mismatched / disallowed hosts and forged prices, eligibility gates, pending-host blocks, engine end-to-end Telescopic refusal with a verified host, backup-slot masking regression, whole-catalog display-vs-preview agreement). Five mutations were injected (compatible = has-a-price; draft evidence accepted; host price read from a stored ledger cost; pending host ruling ignored; tier conflict ignoring present evidence) and each is caught. All four strict authority guards pass. Rolling-suite and CI results are recorded on the PR.

## Remaining / for review

- **Gate C-3:** chargen and follower seeding of ledger instances; Garage UI instance picker; verified dead parallel logic removal.
- `selectedInstalledShieldRating`, `speed`, `variant` and `baseLocomotionCost` are still caller-supplied on the actor path (same trust class as host prices; they need ledger-derived equivalents).
- Embedded-Item evidence is "present, not confirmed". If integrated-equipment Items should satisfy prerequisites, say so; today they do not.
- A disabled ledger part still counts as confirmed hardware for requirements (existing behavior preserved).
- No new rules decision was required; DROID-RD-001..003 remain pending.

## Review corrections (independent review of PR #1114, head `592d1d4`)

### Verification record
Exact-head GitHub CI on `592d1d4`: Rolling System Validation success (independently reported as 619 passed / 0 failed / 5 documented exclusions) and Droid V2 Gate A success. My own local full run for that head was interrupted (364 passes, 0 failures, no summary line) and is not claimed.

### Corrections
1. **Physical-host evidence.** `listConfirmedHostInstances` / `findConfirmedHostInstance` (droid-part-schema.js) are now the single definition of a host: a well-formed ledger instance, not `installed: false`, with a confirmed location token, not fitted to another host, whose part is a PHYSICAL appendage in the catalog, and only while the ledger and the `droidSystems` mirror agree about the physical appendages. Quote evidence (`confirmedAppendages`), host pricing (`deriveHostAppendageBase`) and the customization engine (`resolveHostForPart`) all use it.
2. **Actor quote trust boundary.** `resolveDroidPartQuoteDetailed` is the post-creation path and no longer accepts authority claims.

| Input | Authoritative source on the actor path | Caller value |
|---|---|---|
| size | the actor's own chassis size | ignored |
| operationPhase | fixed `POST_CREATION_INSTALL` (the INITIAL_BUILD locomotion subset belongs to the draft builders, which use `resolveDroidBuilderQuote`) | ignored |
| locomotionSlotOrdinal, restrictedLocomotion | not applicable post-creation (null) | ignored |
| appendage base cost / mass | canonical quote of the verified ledger host (typed `requiresAppendage` only) | ignored |
| baseLocomotionCost | canonical post-creation quote of the actor's current locomotion; locomotion prices are source-HOLD post-creation, so locomotion enhancements stay blocked | ignored |
| selectedInstalledShieldRating | the single rated shield generator in CONFIRMED installed hardware; none / draft / several => null | ignored |
| speed | purchase selection, validated by the quote authority (finite, non-negative) and by source review | accepted as a selection |
| variant | purchase selection, must match an exact printed variant or the quote is refused | accepted as a selection |

   No speed, rating, host or variant is fabricated; unsupported post-creation cases stay blocked.
3. **Backup-processor evidence.** `hasBackupProcessorSlot` consulted `droidSystems.processorSlots.backup` / `backupProcessor` (display/stock fields). It now requires a CONFIRMED ledger record. A draft-only or mirror-only backup processor can no longer authorize a second primary processor in a post-creation transaction; the draft builders' initial-build handling is unaffected (they do not use this engine).

### Tests added (groups 12-15 of `droid-wave2b-installation-eligibility`)
Host negatives (installed:false, no location, identified non-appendage, fitted-to-other, unknown part, ledger/mirror disagreement both ways, removed host; engine agrees); forged operationPhase / ordinal / restricted flag / size / base costs / appendage bases change nothing and locomotion HOLDs stay held; shield rating derived from confirmed hardware only; mirror / blob backup records refused at display, preview and apply with zero mutation. Eight mutations were injected (one per correction) and each is caught. No published-source ruling was needed; DROID-RD-001..003 and every source HOLD are untouched.
