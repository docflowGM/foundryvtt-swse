# Mentor survey design sources — consolidation index (issue #1166)

These are the **historical source documents** that `docs/design/mentor-survey-v2/00-AUTHORITY-INDEX.md` binds into the V2 specs.
They were previously only on unmerged design branches. They are imported here **byte-for-byte** (original paths) so the
`sourceRef` provenance in the runtime content records resolves from `main`. **They are not implementation authority**: where
they conflict with `docs/design/mentor-survey-v2/*`, the V2 specs win (authority index §3 supersession rules).

**No survey answer is wired to a tag by this import.** `SWSE_Mentor_Surveys_Master_Answer_Tag_Mapping_2026-11-15.md` is an
inventory and proposal only; connecting answers to ontology tags needs a separate owner-approved change.

| Imported file(s) | Source branch @ commit | Status |
| --- | --- | --- |
| `docs/design/l1-adaptive-mentor-survey/…Rolling_Design_v0.19…`, Q1 Jedi approved v0.3, Q1 canonical class audit, Q1 Noble/Scoundrel/Scout/Soldier review drafts v0.1, Q2 97-parent bank v0.4 + combined 97x5 v0.4, Q3 answer bank v0.3 + question bank v0.2, Q4 answer bank v0.2, Q5 bank v0.1, dialogue working draft v0.3, dialogue reuse audit, response display contract, fresh-chat handoff | `docs/l1-adaptive-mentor-survey-q1-q5-20261113` @ `ff7f605a340c82b1389845d1b1a61ebc8e30c3a5` | latest checkpoint of each L1 artifact; drafts that are not owner-approved remain `draft_text` |
| `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md` | `design/multiclass-mentor-survey-q1-q6-v011` @ `eb531a6b0fc5482edd62eedfea4dfebd312946ee` | multiclass rolling design v0.11 (Q1–Q6, Q6 Pass A/B) |
| `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` (v0.26), `…Prestige_Survey_Q2_Character_Synthesis.md` (v0.8), `…Prestige_Q3_All_32_Classes_Consolidated_v01.md`, `…Prestige_Q4_Rolling_Editorial.md`, `…Prestige_Q5_Rolling_Editorial.md`, `…Prestige_Q6_Fresh_Chat_Handoff_2026-11-15.md` | `design/prestige-q2-character-synthesis-v08` @ `228a7dc01e75d926728b7f015cac4ec66bdd15b7` | prestige design; the v0.26 rolling file is byte-identical on `design/prestige-q1-crossbook-audit-v026` @ `0f56de3a4d33c8a5c635d47e3c612e501797a0a4` (that branch is fully covered) |
| `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` | `docs/mentor-survey-rolling-design-v0-9-20261113` @ `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79` | shared cross-survey design v0.9; **§9 and §13 are the only owner-confirmed cross-survey contracts** |
| `docs/design/SWSE_Mentor_Surveys_Master_Answer_Tag_Mapping_2026-11-15.md` | `docs/survey-answer-tag-master-20261115` @ `08561be4a334beb94fc09d6a8780cce6be4dc917` | **inventory/proposal only; not wired** |
| `docs/audits/prestige-cross-class-talent-tree-access-source-audit-2026-11-15.md` | `audit/prestige-cross-class-tree-access-20261115` @ `76962662be0962a7b5424e57f7a6207e31b9287b` | printed-source audit of prestige cross-class talent-tree access |

## Deliberately NOT imported (superseded; still reachable on their branches, which are not deleted)
- `docs/l1-adaptive-mentor-survey-design` @ `17fd6820b3e8792f0578fd830efcdd6095b3725a`: L1 v0.10, superseded by v0.19 (authority index §2–3).
- From `docs/l1-adaptive-mentor-survey-q1-q5-20261113`: rolling design checkpoints v0.11–v0.18 (superseded by v0.19), Q1 Jedi review v0.1 / working v0.2 (superseded by approved v0.3), dialogue working draft v0.2, Q2 parent banks of 25 / 50 / 75 and Q2 career batches 01–04 (all contained in the 97-record v0.4 sets), Q3 question bank v0.1, Q4 answer bank v0.1.
