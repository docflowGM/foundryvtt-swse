# Phase 12 final — owner ontology adjudication

**Post-QA5 owner ruling.** It supersedes, for production, the two QA5 deferrals and the 184-tag active vocabulary. The QA5, Phase 12-1 and Phase 12-2 authority files remain historical evidence of the state when they were produced (184-tag vocabulary, 1,185 certified, 2 deferred) and are not rewritten. Machine authority: `data/audits/talent-phase-12-final-ontology-adjudication.json`; applicator `tools/apply-talent-phase-12-final-ontology.mjs`.

## New tag

Human concept **Temporary-Talent**; stored tag exactly `temporary-talent`. Meaning: a talent that temporarily grants, copies, borrows, emulates, or provides temporary access to another talent the character does not permanently possess. Forbidden aliases (validated absent): `temporary_talent_access`, `temporary-talent-access`, `temporary_talent`, `Temporary-Talent`. The `TEMPORARY_TALENT_ACCESS` ontology gap is closed.

## The two former deferrals (certified)

| Talent | Canonical id | Final `system.tags` | Basis |
|---|---|---|---|
| UR-022 Quick Study (Unknown Regions p. 23) | `fd37b68c6fb620f6` | `["temporary-talent","once-per-encounter"]` | uses an enemy's non-Force talent on the next turn without meeting its prerequisites; "once per encounter" is stated verbatim |
| GOI-002 Done It All (Galaxy of Intrigue p. 20) | `d376f165f1a47281` | `["temporary-talent","force_point_spend","resource_spend","action_economy"]` | gains one of two chosen unpossessed talents by spending a Force Point as a free action; follows the certified convention for Force-Point/free-action talents; `force_point_spend` requires `resource_spend` |

No second new tag; tags were not inferred from names, prerequisites or tree identity.

## Vocabulary

| | |
|---|---:|
| Previous approved vocabulary | 184 |
| Retired (zero production uses, verified at the pre-change head) | 4 — `skill-mastery`, `balance`, `natural_weapon`, `entangle` |
| Added | 1 — `temporary-talent` |
| Final approved vocabulary | **181** |
| Approved tags used by at least one canonical talent | **181** |
| Unused approved tags / unknown production tags | **0 / 0** |

`skill_mastery` (underscore) is a different, active tag used by 17 talents; only the hyphenated `skill-mastery` is retired, and a regression test pins both. `temporary-talent` is used by exactly 2 talents (no other talent was tagged to raise utilization). The active vocabulary SSOT is the authority's `finalVocabulary`, cross-checked against the certified 184 strings of Phase 11-2C − retired + new; verifiers derive from it instead of a second list. `node tools/apply-talent-phase-12-final-ontology.mjs --census` prints every approved tag with its count; the least-used tags are `spellcasting`, `lightsaber_polearm`, `intrigue` (1 each), then `temporary-talent`, `telepath`, `meditation`, `force_training`, `force_power`, `force_control` (2 each). Rare is not dead.

### Retirement boundary (classification of remaining textual occurrences)

- Historical/audit evidence (left untouched): Phase 11-2A/2B/2C and 12-1/12-2 manifests and reports, QA5, archetype Phase 11-2 adjudication files, `tools/manual_phase*_curation.py`, `tests/talent-phase-11-2c-bespoke-cleanup.test.mjs` (frozen 11-2C expectations).
- Different vocabularies (not the talent-semantic vocabulary; untouched): talent **tree** tags in `packs/talent_trees.db` (e.g. Superior Skills `skill-mastery`), the isolated homebrew pack `packs/talents-homebrew.db` (two talents carry `balance`), species/feat tag profiles (`natural_weapon`), the mentor survey option `balance`, the Extra Skill Use registry skill `balance`, and the `applicationScope` string `unarmed_or_natural_weapon_damage_roll` inside a canonical record.
- Active talent-semantic authority: updated (the final authority, applicator, tests, CI gate).

## Production mutation and certification

`packs/talents.db`: exactly 2 records changed, `system.tags` only (0 non-tag changes, 0 non-target changes; the other 1,185 records byte-identical; homebrew pack unchanged). Corpus: 1,187 canonical, **1,187 certified**, 0 deferred, 0 untagged, 0 empty arrays, 0 duplicate tags; the 1,185 earlier records still equal QA5 `finalTags` (1,185 / 1,185) and every QA5 integrity rule and family-convergence check still passes. Force-talent identity (commit 4) is unaffected: `temporary-talent` changes neither the structural classifier nor tree identity for any talent (probe over all 1,187).

State plumbing: `POST_12_FINAL_STATE` in the pack-state detector and CI gate; the 12-1 / 12-2 / 11-2x / 3x verifiers run their historical checks in later-state mode (deferral and 184-vocabulary expectations are replaced by the final ones, not weakened).
