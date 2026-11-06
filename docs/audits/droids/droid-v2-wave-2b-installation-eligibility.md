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
