# Feat Content Authority — Closeout

Status: content authority packaged for the repository; **production mutation remains unauthorized**.

Artifacts (audit-only):

- `docs/audits/feat-content-canonical-authority.md` — supplied authority, byte-identical to the owner-supplied file
- `data/audits/feat-content-canonical-authority.json` — supplied machine authority, byte-identical to the owner-supplied file
- `tools/verify-feat-content-authority.mjs` — deterministic validator (read-only; nonzero exit on any invariant failure)

## Final counts

| Item | Value |
| --- | --- |
| Sourcebooks reviewed | 14 (plus official Web source pass) |
| Full feat publications | 355 (352 in books + 3 Official Web) |
| Canonical feat identities | 353 |
| Unique normalized display names | 352 (`staggering-attack` is the only duplicate) |
| Confirmed full reprints | 2 |
| Current repo baseline records | 390 |
| Canonical identities represented in repo | 351 |
| Canonical identities missing from repo | 2 |
| Implementation derivatives (Weapon Proficiency scopes, not canonical) | 6 |
| Noncanonical / wrong-domain / legacy repo records | 33 |
| Core Rulebook identities | 64 |
| Rebellion Era publications | 60 |
| Galaxy at War publications | 42 |
| Official Web publications | 3 |

## Two missing canonical identities

| Feat | Source | Canonical ID |
| --- | --- | --- |
| Recall | The Force Unleashed Campaign Guide p.35 | `c352f81dde5c9dff` (Phase 1A; the supplied JSON carries `canonicalId: null` for this record) |
| Staggering Attack | Scum and Villainy p.24 | `c9c4130a55761330` |

These are future additions. Neither record is created here.

## Confirmed full reprints

1. **Tech Specialist** — primary: Saga Edition Web Enhancement 1: The Tech Specialist p.3; full reprint: Starships of the Galaxy p.21.
2. **Echani Training** — primary: Knights of the Old Republic Campaign Guide p.33; full reprint with an added Special clause: Galaxy at War p.26.

## Identity cases the validator pins

- Weapon Proficiency is one canonical identity (`ecc2471ac96ec2d4`); the six scoped implementation records are not counted as canonical identities or publications.
- Staggering Attack: Scum and Villainy p.24 (`c9c4130a55761330`) and Galaxy at War p.26 (`192923f60db38831`) are distinct identities.
- Recall (feat, TFU p.35) is not collapsed with the separate Rebellion Era talent of the same name.

## Retained source conflicts (recorded, not resolved)

| Source | Feat | Status |
| --- | --- | --- |
| Scavenger's Guide to Droids | Pinpoint Accuracy | `SOURCE_INTERNAL_CONFLICT` |
| Knights of the Old Republic Campaign Guide | Power Blast | `SOURCE_INTERNAL_CONFLICT` |
| Knights of the Old Republic Campaign Guide | Tumble Defense | `SOURCE_INTERNAL_CONFLICT_AND_PREREQUISITE_LINE_ERROR` |
| Knights of the Old Republic Campaign Guide | Withdrawal Strike | `SOURCE_INTERNAL_CONFLICT` |
| The Force Unleashed Campaign Guide | Informer | `SOURCE_INTERNAL_CONFLICT` |
| The Force Unleashed Campaign Guide | Rapport | `SOURCE_INTERNAL_CONFLICT` |
| The Force Unleashed Campaign Guide | Strafe | `SOURCE_INTERNAL_CONFLICT_AND_SUMMARY_ERROR` |
| Galaxy of Intrigue | Expert Briber | `DESCRIPTION_ERROR_SOURCE_INTERNAL_CONFLICT` |
| Galaxy of Intrigue | Recurring Success | `DESCRIPTION_PARTIAL_SOURCE_EDITORIAL_ERROR` |
| Scum and Villainy | Deadly Sniper | `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED` |
| Scum and Villainy | Resurgence | `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED` |
| Scum and Villainy | Staggering Attack | `MISSING_CANONICAL_REPO_RECORD_SOURCE_WORDING_TENSION` |

## Known conditions in the supplied authority (reported, not repaired)

1. **Unknown Regions per-feat records are absent.** The authority declares 21 Unknown Regions publications (book 9 of 14) in its book order and counts, but neither the JSON `books` object nor the Markdown has an Unknown Regions section. The JSON embeds 334 of 355 publication records. The validator pins this exact gap, and cross-checks the 21 identities, IDs, and names through the merged Phase 1A manifest. A complete Unknown Regions section should be supplied before the PROVENANCE phase relies on per-feat Unknown Regions content.
2. **Top-level `status` is `IN_PROGRESS`** while `contentPhaseCloseout.status` is `COMPLETE_WITH_EXPLICIT_SOURCE_CONFLICTS_RETAINED`. Preserved as supplied.
3. **Recall `canonicalId` is `null`** in the supplied JSON; the validator accepts null or `c352f81dde5c9dff` and requires Phase 1A to carry `c352f81dde5c9dff`.
4. **Core official errata** supersedes first-printing text where recorded in the supplied authority. The validator does not re-verify errata text.

## Known corrections to back-propagate

- **The Force Unleashed Campaign Guide has 21 canonical feats**, with Natural Leader a full feat on p.34 despite its omission from the printed table. No frozen audit contradicts this: Phase 0 subphase `0E` already holds 21 TFU records, and Phase 1A matches the authority pages for all 21.
- **Clone Wars feat page map is stale** in the frozen audits. All 21 Clone Wars feats differ between the authority and Phase 0/Phase 1A. No other source differs on page. Exact locations and the smallest deterministic correction are below.
- **Core errata** — recorded in the supplied authority; no frozen-audit conflict was tested.

### Clone Wars page discrepancies (21)

Authority page is the directly verified printed page. Phase 0: `data/audits/feat-phase-0-canonical-census.json`, subphase `0G`, `canonicalFeatRecords[].canonicalPage`. Phase 1A: `data/audits/feat-phase-1a-canonical-identity-manifest.json`, `records[].primaryPublication.page`, `.locatorKey`, and `.identityKey`.

| Feat | canonicalId | Old page | Authority page | Phase 0 line | Phase 1A page line | Phase 1A locatorKey line | Phase 1A identityKey line |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Anointed Hunter | `4dc36deda6faf597` | 20 | 28 | 7015 | 4919 | 4921 | 4912 |
| Artillery Shot | `fb64065b4a779cd8` | 20 | 28 | 7026 | 4953 | 4955 | 4946 |
| Coordinated Barrage | `c51d23038e2862e6` | 21 | 28 | 7037 | 4987 | 4989 | 4980 |
| Droidcraft | `ae4dece84c32c3ac` | 21 | 28 | 7048 | 5021 | 5023 | 5014 |
| Droid Hunter | `5d17898fc9652370` | 21 | 29 | 7059 | 5055 | 5057 | 5048 |
| Experienced Medic | `5e1e84d933295217` | 22 | 29 | 7070 | 5089 | 5091 | 5082 |
| Expert Droid Repair | `029c3935e9bed6eb` | 22 | 29 | 7081 | 5123 | 5125 | 5116 |
| Flash and Clear | `a16af4c63582b44a` | 23 | 29 | 7092 | 5157 | 5159 | 5150 |
| Flood of Fire | `6335692284f98ec6` | 23 | 29 | 7103 | 5191 | 5193 | 5184 |
| Grand Army of the Republic Training | `72146d8a36d77736` | 24 | 31 | 7114 | 5225 | 5227 | 5218 |
| Gunnery Specialist | `70962165bed8e5ed` | 24 | 31 | 7125 | 5259 | 5261 | 5252 |
| Jedi Familiarity | `fc56de4d0d15c95c` | 25 | 31 | 7136 | 5293 | 5295 | 5286 |
| Leader of Droids | `59e495de34a23def` | 25 | 31 | 7147 | 5327 | 5329 | 5320 |
| Overwhelming Attack | `7df64382f1a0a892` | 26 | 31 | 7158 | 5361 | 5363 | 5354 |
| Pall of the Dark Side | `8d164553709dd068` | 26 | 31 | 7169 | 5395 | 5397 | 5388 |
| Separatist Military Training | `477b62d36e012719` | 27 | 31 | 7180 | 5429 | 5431 | 5422 |
| Spray Shot | `0066c394e5d636fb` | 27 | 31 | 7191 | 5463 | 5465 | 5456 |
| Trench Warrior | `7d8366d0481d76e2` | 28 | 31 | 7202 | 5497 | 5499 | 5490 |
| Unstoppable Force | `0a6c87a410bee1f2` | 28 | 31 | 7213 | 5531 | 5533 | 5524 |
| Unwavering Resolve | `53f600d68f3afdc3` | 28 | 32 | 7224 | 5565 | 5567 | 5558 |
| Wary Defender | `d6e528de87b25b95` | 29 | 32 | 7235 | 5599 | 5601 | 5592 |

**Smallest deterministic correction (proposed, not applied):** for each of the 21 feats, set the Phase 0 `canonicalPage` and the Phase 1A `primaryPublication.page` to the authority page, set `locatorKey` to `p<authority page>`, and replace the page segment of `identityKey` (`feat::clone-wars-campaign-guide::p<old>::<name>` becomes `...::p<authority page>::<name>`). The 21 `canonicalId` values do not change, because they are existing repo IDs. Downstream: the Phase 1B authority (PR #997) copies Phase 1A `identityKey` values for the 351 existing canonical records, so it must be regenerated after any Phase 1A correction. Neither frozen audit was modified here.

## Scope and authorization

- This closeout changes audit artifacts only. No file under `packs/`, `data/feat-catalog.json`, runtime code, taxonomy, prerequisites, automation, class bonus-feat bindings, or migration was touched.
- **Production mutation remains unauthorized.** The next recommended phase is PROVENANCE.
