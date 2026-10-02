# Phase 12 — Production closeout (canonical talent semantic tags)

Phase 12 production execution is complete on PR #994 (three independent commits, not merged): the 309 Phase 12-1 orphan talents and the 876 Phase 12-2 existing-tag talents now carry the owner-certified arrays, verified exactly against the QA5 consolidated authority. The two ontology deferrals are intentionally untouched.

## Frozen design baseline and commits

- Design baseline: `packs/talents.db` blob `6fe0b15020d4c723cb04d506ae8f7c5f4868b33c` (1,187 canonical talents, 311-talent orphan census, 876 non-orphans, 184-tag vocabulary). Branch started from `origin/main` `02a239e47ff3ade20d0a16ca07dd75d46ffa0250`.
- Commit 1 — `6b44d3f6692ca2b0dd6c2bb5a345c340cbb77ddf` — Phase 12-1 QA3 production apply (309 talents).
- Commit 2 — `29fce9a1324aaa4cfeddaf6b5cbe1e47013640e0` — Phase 12-1 global-QA reconciliation (11 talents).
- Commit 3 — the commit that introduces this document — Phase 12-2 global semantic tag application (876 talents). Its SHA is the PR head; the three effects stay independently reviewable.

## Corpus result

| | |
|---|---:|
| Canonical talents | 1,187 |
| Certified against QA5 | **1,185** (309 Phase 12-1 + 876 Phase 12-2) |
| Exact `system.tags` matches to QA5 `finalTags` (by canonical id) | **1,185 / 1,185** |
| Missing / extra / duplicate certified ids | 0 / 0 / 0 |
| Ontology deferrals | 2 |
| Approved vocabulary | 184 tags (no new tag authorized; none created) |
| Global-QA revisions | 24 = 11 (Phase 12-1) + 13 (Phase 12-2) |

Authorities (committed in `data/audits/`): `talent-phase-12-1-semantic-tag-authority.json` (QA3 + the 11-record reconciliation), `talent-phase-12-2-existing-tag-authority.json` (12-2 GLOBAL_QA, owner-authorized; only execution metadata added), `talent-phase-12-global-semantic-authority-qa5.json` and `docs/audits/talent-phase-12-global-consistency-sweep-report-qa5.md` (QA5, committed byte-for-byte). The superseded 12-2 COMPLETE file was not used.

## Phase 12-2 dry run and apply

- Authority: exactly 876 assignments, 876 unique canonical ids and audit keys, every id resolves to exactly one production talent (name/page are guards, never a fallback), no deferred id, every `finalTags` non-empty, duplicate-free and inside the 184-tag vocabulary. The 12-2 GLOBAL_QA file and QA5 agree on `finalTags` for all 876 (the tool fails closed on any disagreement).
- Production tags before the apply equalled the authority's `existingTags` for all 876 (no drift); 0 records were already at their final array.
- Mutated: **876 talents**, `system.tags` only: +4,684 / −2,932 tag elements; tag instances 7,576 → 9,328.
- Dispositions derived from `existingTags → finalTags`: **143 ADD, 2 DELETE, 731 ADD_AND_DELETE, 0 KEEP**. The supplied label counts (144 / 2 / 730) differ because the 13 records revised by the global QA sweep kept their pre-revision add/delete/disposition labels (CW2-105 is the one whose disposition changes: ADD → ADD_AND_DELETE, since `reaction` is removed). `finalTags` is authoritative and equals QA5 for all 13, so the derived diffs were applied and the stale labels are recorded in the manifest (`suppliedLabelDiscrepancies`), not applied.
- Four tag strings are no longer used by any talent as a direct result of the authority's deletions: `skill-mastery`, `balance`, `natural_weapon`, `entangle`. The strings in use fell from 184 to 180; all remain inside the approved 184.

## Gates (all PASS)

- Full-corpus QA5 contract on the 1,187 records: identity; 1,185 / 1,185 exact; both deferrals untouched; non-empty duplicate-free arrays within vocabulary; `reroll`→`reliability`; `reaction`/`swift_action`/`move_action`/`standard_action`→`action_economy`; `force_point_spend`→`resource_spend`; `condition_removal`→`recovery`; `use_the_force`/`force_power_synergy`→`force`; `ally_support`→`support`.
- Family convergence (strict tag-set equality): Charm Beast, Notorious, Force Treatment, Multiattack Proficiency (advanced melee weapons), Multiattack Proficiency (rifles), Shift Defense I–III, Devastating Attack / Greater Devastating Attack.
- Mutation boundary (independent comparison against the previous commit's pack): 876 records changed, **0 non-target, 0 non-tag field changes**, ids/names/order identical; the 309 Phase 12-1 talents and 2 deferrals byte-identical; homebrew pack unchanged.
- Repository: state-aware CI gate `POST_12_2_STATE` (19 checks: 12-2 exact + 12-1 / 11-2C … 3E-4 still intact, registry, membership, homebrew, reconciler: 0 blocking findings); rolling suite 290 passed / 0 failed (5 documented exclusions); `node --check`, `validate-partials.mjs`, `validate-data.js`, `system.json` parse.
- Tests: `tests/talent-phase-12-1-semantic-tags.test.mjs` (12), `tests/talent-phase-12-2-semantic-tags.test.mjs` (9; includes the full-corpus and family checks, expectations derived from the authority files).

## Deferred ontology records (not implementation failures)

| Talent | Canonical id | Concept gap |
|---|---|---|
| UR-022 Quick Study | `fd37b68c6fb620f6` | `TEMPORARY_TALENT_ACCESS` |
| GOI-002 Done It All | `d376f165f1a47281` | `TEMPORARY_TALENT_ACCESS` |

They intentionally await ontology-owner adjudication of a temporary-talent-access/mimicry concept. No tag was assigned, no `temporary_talent_access` tag was created, and neither record was modified; they are the only two untagged canonical talents.

## Finding for follow-up: runtime consumers of `system.tags`

Tag arrays changed on 876 talents, so code that reads tags can classify talents differently. Probes (real runtime functions): tree identity/credit **0** changes (it never reads tags); droid gate, resolver, item classification and combat-feature classification **0**; **Force-talent counting** (`tags.includes('force')`, read in `prerequisite-checker.js` and `prerequisite-evaluator.js`) changes for **136** talents and the Mystic Mastery regex for **67**. Across the corpus the `force` tag moved from 421 to 289 talents (134 lost, 2 gained): the authority removes `force` from talents whose mechanics do not use the Force (for example Enforcement, Corporate Power, Gunslinger, Melee Duelist, Lightsaber Forms entries). No consumer was altered and no test regressed. Whether any "N Force talents" prerequisite should be re-based on a different signal than the tag is a separate consumer-side decision.

## Confirmation

Only intended talent tags were mutated: `system.tags` on 309 (Phase 12-1) + 876 (Phase 12-2) canonical talents. No other talent field, no other pack and no consumer code changed. Support artifacts added or edited are the apply tooling, authority/manifest/report files, tests, state plumbing for the CI gate and earlier verifiers, and documentation.
