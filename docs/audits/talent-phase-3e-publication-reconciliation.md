# Phase 3E-3 — Publication-to-production reconciliation

Read-only. Generator: `node tools/reconcile-talent-publication-corpus.mjs` · data: `data/audits/talent-phase-3e-publication-reconciliation.json`.

**Invariant:** every certified published claim maps to exactly one canonical production record, and every canonical production record is explained by exactly one certified identity.

Denominator: 1182 certified claims + 7 3E addendum claims = 1189 claims → 1187 identities ↔ 1187 canonical production records. 50 homebrew talents are outside the denominator; 19 same-name cross-tree groups are resolved by tree identity, never by name.

| Finding | Count | Blocking |
|---|---|---|
| CLAIM_WITHOUT_RECORD | 0 | yes |
| RECORD_WITHOUT_CLAIM | 0 | yes |
| DUPLICATE_MAPPING | 0 | yes |
| DUPLICATE_RECORD_IN_TREE | 0 | yes |
| WRONG_TREE | 0 | yes |
| NAME_MISMATCH | 0 | yes |
| UNRESOLVED_SAME_NAME_AMBIGUITY | 0 | yes |
| CLAIM_COUNT_MISMATCH | 0 | yes |
| HOMEBREW_IN_DENOMINATOR | 0 | yes |
| TEXT_DRIFT | 0 | yes |
| WRONG_SOURCE_PAGE | 0 | yes |
| STALE_TREE_ID_SLUG | 0 | yes |
| TREE_DISPLAY_NAME_DRIFT | 0 | yes |

Text invariant: 4741 text fields (prerequisites, benefit, description, summary) equal the certified canonical text or an approved correction (49 currently at an approved correction).

Source/page agreement: 1187 of 1187 identities carry a production source/page that matches a certified publication.

No blocking findings.

No source/page findings.
