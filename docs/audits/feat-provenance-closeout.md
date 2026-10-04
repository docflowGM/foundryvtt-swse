# Feat Provenance Closeout

Status: provenance source review complete and certified; stale audit layers back-propagated. **Production feat mutation remains unauthorized.** Next phase: TAGS.

## Artifacts

- `data/audits/feat-provenance-canonical-authority.json` — owner-certified provenance authority, byte-identical to the supplied file.
- `tools/verify-feat-provenance-authority.mjs` — deterministic, read-only validator; cross-checks the content authority, Phase 0, Phase 1A, and Phase 1B.
- Relationship to `data/audits/feat-content-canonical-authority.json` (merged earlier): the provenance authority is a strict superset (same content, plus provenance certification, the Unknown Regions records, and closeout sections). The validator proves every overlapping content/identity field is identical, so the two cannot diverge; the content file is retained as the owner-supplied content-phase snapshot rather than rewritten.
- The supplied markdown rendering of the provenance authority was **not provided**; only the JSON is stored. (Pending upload; no markdown was generated in its place.)

## Final corpus totals

| Item | Value |
| --- | --- |
| Sourcebooks provenance-certified | 14 of 14 |
| Official Web provenance | certified (3 publications) |
| Full feat publications | 355 (352 in books + 3 Official Web) |
| Canonical feat identities | 353 |
| Unique normalized display names | 352 |
| Confirmed full reprints | 2 |
| Represented in repo | 351 |
| Missing from repo | 2 |
| Baseline production records | 390 (351 canonical + 6 implementation derivatives + 33 noncanonical) |

## Source completion

| # | Source | Publications | Provenance status |
| ---: | --- | ---: | --- |
| 1 | Starships of the Galaxy | 4 | `CERTIFIED` |
| 2 | Threats of the Galaxy | 4 | `CERTIFIED` |
| 3 | Jedi Academy Training Manual | 5 | `CERTIFIED` |
| 4 | Scavenger's Guide to Droids | 17 | `CERTIFIED` |
| 5 | Legacy Era Campaign Guide | 19 | `CERTIFIED` |
| 6 | Knights of the Old Republic Campaign Guide | 21 | `CERTIFIED` |
| 7 | The Force Unleashed Campaign Guide | 21 | `CERTIFIED` |
| 8 | Clone Wars Campaign Guide | 21 | `CERTIFIED` |
| 9 | Unknown Regions | 21 | `CERTIFIED` |
| 10 | Galaxy of Intrigue | 26 | `CERTIFIED` |
| 11 | Scum and Villainy | 27 | `CERTIFIED` |
| 12 | Galaxy at War | 42 | `CERTIFIED` |
| 13 | Rebellion Era Campaign Guide | 60 | `CERTIFIED` |
| 14 | Saga Edition Core Rulebook | 64 | `CERTIFIED` |
| — | Official Web (Web Enhancements / FAQ) | 3 | `CERTIFIED` |

## Official Web provenance

| Feat | canonicalId | Primary | Locator | Rule status |
| --- | --- | --- | --- | --- |
| Tech Specialist | `42e2404790756700` | Saga Edition Web Enhancement 1: The Tech Specialist | page 3 of 7 (p.3, 2007-06-21) | OFFICIAL |
| Dreadful Countenance | `2e5ada2de01fff4d` | Behind the Threat: The Sith, Part 2 - The Becoming | web article; archived rendering page 4 of 4 (no printed page) | OFFICIAL_WEB_ARTICLE |
| Rapid Assault | `4be60753991eec43` | Saga Edition FAQ - Official Optional Rules | E2 (no printed page) | OFFICIAL_OPTIONAL_RULE |

Rapid Assault stays distinguishable from mandatory/core rules; the original forum post is not the surviving primary artifact, so the FAQ E2 locator and caveat are preserved. The repo currently attributes all three to generic "Web Enhancements p.1" (Tech Specialist to Core p.88); those are current-repo attributions only. Phase 0 and Phase 1A already carry the certified primaries (identity keys with `p3`, the web-article locator, and `e2`), so no audit artifact needed a primary-source change for these three. Normalizing the repo records is later production work.

## Confirmed reprints

1. **Tech Specialist** (`42e2404790756700`) — primary Saga Edition Web Enhancement 1 p.3; FULL_REPRINT in Starships of the Galaxy p.21; same identity.
2. **Echani Training** (`f362e5a4ad0a98bd`) — primary Knights of the Old Republic Campaign Guide p.33; FULL_REPRINT_WITH_ADDITIONAL_SPECIAL_CLAUSE in Galaxy at War p.26; same identity. No audit artifact treats the Galaxy at War entry as a separate identity (Phase 1A holds one Echani Training record).

## Two missing canonical identities

| Feat | Source | canonicalId |
| --- | --- | --- |
| Recall | The Force Unleashed Campaign Guide p.35 | `c352f81dde5c9dff` |
| Staggering Attack | Scum and Villainy p.24 | `c9c4130a55761330` |

The provenance authority's per-feat Recall record carries `canonicalId: null`; its closeout and Phase 1A carry `c352f81dde5c9dff`. The validator accepts null or that ID on the feat record and requires it in the closeout and Phase 1A.

## Same-name and cross-domain guards (machine-readable, validator-pinned)

- **Recall** (feat `c352f81dde5c9dff`, TFU p.35) vs the Rebellion Era Recall talent — `SAME_NAME_DIFFERENT_DOMAIN`; name-only matching is invalid.
- **Autofire Assault** (feat `c973e43c85382068`, Legacy Era Campaign Guide p.34) vs the Galaxy at War p.22 talent — `SAME_NAME_DIFFERENT_DOMAIN`.
- **Staggering Attack** — Scum and Villainy p.24 (`c9c4130a55761330`) and Galaxy at War p.26 (`192923f60db38831`): `SAME_NAME_DISTINCT_FEAT_IDENTITIES`; both coexist.
- **Weapon Proficiency** (`ecc2471ac96ec2d4`) is one repeatable grouped-choice canonical identity; the six scoped repository records are implementation derivatives and add nothing to the census. They are not deleted or migrated here.

## Clone Wars authority correction

The stale TXT-derived printed page map (pp.20-29) was superseded by direct primary-source recheck: feat definitions on printed pp.28, 29, 31, 32; p.30 is the feat summary table (not a definition page); PDF page = printed page + 1. All 21 canonical IDs are existing repo IDs and are unchanged; only page, locator, and identityKey were repaired.

| Feat | canonicalId | Old page | Certified page | Old identityKey | New identityKey |
| --- | --- | ---: | ---: | --- | --- |
| Anointed Hunter | `4dc36deda6faf597` | 20 | 28 | `feat::clone-wars-campaign-guide::p20::anointed-hunter` | `feat::clone-wars-campaign-guide::p28::anointed-hunter` |
| Artillery Shot | `fb64065b4a779cd8` | 20 | 28 | `feat::clone-wars-campaign-guide::p20::artillery-shot` | `feat::clone-wars-campaign-guide::p28::artillery-shot` |
| Coordinated Barrage | `c51d23038e2862e6` | 21 | 28 | `feat::clone-wars-campaign-guide::p21::coordinated-barrage` | `feat::clone-wars-campaign-guide::p28::coordinated-barrage` |
| Droidcraft | `ae4dece84c32c3ac` | 21 | 28 | `feat::clone-wars-campaign-guide::p21::droidcraft` | `feat::clone-wars-campaign-guide::p28::droidcraft` |
| Droid Hunter | `5d17898fc9652370` | 21 | 29 | `feat::clone-wars-campaign-guide::p21::droid-hunter` | `feat::clone-wars-campaign-guide::p29::droid-hunter` |
| Experienced Medic | `5e1e84d933295217` | 22 | 29 | `feat::clone-wars-campaign-guide::p22::experienced-medic` | `feat::clone-wars-campaign-guide::p29::experienced-medic` |
| Expert Droid Repair | `029c3935e9bed6eb` | 22 | 29 | `feat::clone-wars-campaign-guide::p22::expert-droid-repair` | `feat::clone-wars-campaign-guide::p29::expert-droid-repair` |
| Flash and Clear | `a16af4c63582b44a` | 23 | 29 | `feat::clone-wars-campaign-guide::p23::flash-and-clear` | `feat::clone-wars-campaign-guide::p29::flash-and-clear` |
| Flood of Fire | `6335692284f98ec6` | 23 | 29 | `feat::clone-wars-campaign-guide::p23::flood-of-fire` | `feat::clone-wars-campaign-guide::p29::flood-of-fire` |
| Grand Army of the Republic Training | `72146d8a36d77736` | 24 | 31 | `feat::clone-wars-campaign-guide::p24::grand-army-of-the-republic-training` | `feat::clone-wars-campaign-guide::p31::grand-army-of-the-republic-training` |
| Gunnery Specialist | `70962165bed8e5ed` | 24 | 31 | `feat::clone-wars-campaign-guide::p24::gunnery-specialist` | `feat::clone-wars-campaign-guide::p31::gunnery-specialist` |
| Jedi Familiarity | `fc56de4d0d15c95c` | 25 | 31 | `feat::clone-wars-campaign-guide::p25::jedi-familiarity` | `feat::clone-wars-campaign-guide::p31::jedi-familiarity` |
| Leader of Droids | `59e495de34a23def` | 25 | 31 | `feat::clone-wars-campaign-guide::p25::leader-of-droids` | `feat::clone-wars-campaign-guide::p31::leader-of-droids` |
| Overwhelming Attack | `7df64382f1a0a892` | 26 | 31 | `feat::clone-wars-campaign-guide::p26::overwhelming-attack` | `feat::clone-wars-campaign-guide::p31::overwhelming-attack` |
| Pall of the Dark Side | `8d164553709dd068` | 26 | 31 | `feat::clone-wars-campaign-guide::p26::pall-of-the-dark-side` | `feat::clone-wars-campaign-guide::p31::pall-of-the-dark-side` |
| Separatist Military Training | `477b62d36e012719` | 27 | 31 | `feat::clone-wars-campaign-guide::p27::separatist-military-training` | `feat::clone-wars-campaign-guide::p31::separatist-military-training` |
| Spray Shot | `0066c394e5d636fb` | 27 | 31 | `feat::clone-wars-campaign-guide::p27::spray-shot` | `feat::clone-wars-campaign-guide::p31::spray-shot` |
| Trench Warrior | `7d8366d0481d76e2` | 28 | 31 | `feat::clone-wars-campaign-guide::p28::trench-warrior` | `feat::clone-wars-campaign-guide::p31::trench-warrior` |
| Unstoppable Force | `0a6c87a410bee1f2` | 28 | 31 | `feat::clone-wars-campaign-guide::p28::unstoppable-force` | `feat::clone-wars-campaign-guide::p31::unstoppable-force` |
| Unwavering Resolve | `53f600d68f3afdc3` | 28 | 32 | `feat::clone-wars-campaign-guide::p28::unwavering-resolve` | `feat::clone-wars-campaign-guide::p32::unwavering-resolve` |
| Wary Defender | `d6e528de87b25b95` | 29 | 32 | `feat::clone-wars-campaign-guide::p29::wary-defender` | `feat::clone-wars-campaign-guide::p32::wary-defender` |

Derived values that followed from the corrected pages (Phase 0 `0G`): page distribution now {28: 4, 29: 5, 31: 10, 32: 2}; exact repo source-and-page matches 20 → 0 and page mismatches 1 → 21 (the current repo records carry the stale pages); `repoStatus` EXACT_MATCH → PAGE_MISMATCH for 20 records; Unstoppable Force canonical page 28 → 31. None of these is an identity or reconciliation total.

## Files corrected by back-propagation

- `data/audits/feat-phase-0-canonical-census.json` and `docs/audits/feat-phase-0-canonical-census.md` — hand-persisted authority with no builder; edited in place, with a `CLONE_WARS_PAGE_MAP_CORRECTION` ledger entry in `authorityCorrections`. The Phase 0 version string is unchanged.
- `tools/build-feat-phase-1a-identity-manifest.mjs` — adds the owner-certified Clone Wars page map as an assertion, and an `authorityCorrections` ledger; regenerated `data/audits/feat-phase-1a-canonical-identity-manifest.json` and `docs/audits/feat-phase-1a-canonical-identity-manifest.md`. Only the 21 Clone Wars records and the new ledger changed; all 353 canonical IDs are identical and in the same order.
- `data/audits/feat-phase-1b-repository-reconciliation.json` and `.md` — regenerated by the unchanged Phase 1B builder: 21 identityKeys changed, and reference-path lists gained the newly tracked audit authority files. Counts are unchanged.
- `tools/verify-feat-content-authority.mjs` — now asserts 0 Clone Wars discrepancies (was an exact-21 retained discrepancy) and derives derivative IDs from Phase 0 instead of hard-coding them (a hard-coded ID in a non-builder tool file would otherwise be an unclassified Phase 1B reference path).
- `docs/audits/feat-content-authority-closeout.md` — marks the Unknown Regions gap and the Clone Wars discrepancies as resolved.

## Validation

- `node tools/verify-feat-provenance-authority.mjs` — OK; fails (44 failures) against the stale pre-correction Phase 1A, and on a mutated closeout field.
- `node tools/verify-feat-content-authority.mjs` — OK with 0 Clone Wars discrepancies.
- `node tools/build-feat-phase-1a-identity-manifest.mjs` and `node tools/build-feat-phase-1b-reconciliation-authority.mjs` — OK; totals unchanged (353 / 352 / 355 / 351 / 2 / 390 = 351 + 6 + 33; interim projection 359).
- `node tools/audit-feat-inventory.mjs --strict` and `node tools/verify-feats-pack-source.mjs` — pass; 390 catalog records.

## Scope

No production feat record, pack, description, prerequisite, tag, automation, class bonus-feat binding, or progression behavior was changed. **Production feat mutation remains unauthorized.** Next phase: TAGS.
