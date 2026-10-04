# Feat Tags — Skill-Tag Completeness Audit (report-only)

Authority: `data/audits/feat-tags-semantic-authority.json` (`PASS1_COMPLETE_ALL_353_QC2_STANDARD`; PASS1_COMPLETE / INPUT_TO_PASS2).

Advisory scan. No tag assignment was added, removed, or changed. Prerequisite text is never scanned. Lexicon matches are lexical and can be false positives (for example a verb sense of "pilot" or "climb").

Per-feat rules text is available from the content/provenance authority only where embedded; other feats are scanned against the Pass 1 canonicalMechanicSummary alone (PASS1_SUMMARY_ONLY).

- Assignments scanned: 353
- Rules-text basis: 331; summary-only basis: 22
- Findings needing owner review: **7**

| Feat | Source | Basis | Possible missing tags | Current tags |
| --- | --- | --- | --- | --- |
| Vehicular Surge (`5e471161ad85b040`) | Rebellion Era Campaign Guide | RULES_TEXT_AVAILABLE | `pilot` | `vehicle`, `survivability`, `swift_action`, `action_economy`, `resources` |
| Gunnery Specialist (`70962165bed8e5ed`) | Clone Wars Campaign Guide | RULES_TEXT_AVAILABLE | `pilot` | `vehicle`, `ranged`, `weapon_training`, `reroll`, `reliability`, `once-per-encounter` |
| Slammer (`9c9e98a70538855c`) | Scavenger's Guide to Droids | RULES_TEXT_AVAILABLE | `treat_injury` | `unarmed`, `melee`, `damage`, `damage_bonus`, `damage_threshold`, `standard_action`, `action_economy`, `control` |
| Mounted Defense (`acb7efcc70769b9f`) | Threats of the Galaxy | RULES_TEXT_AVAILABLE | `pilot` | `mount`, `ride`, `rider`, `beast`, `vehicle`, `defense`, `evasion`, `once-per-encounter` |
| Mission Specialist (`b7f51561e60fefe6`) | Galaxy at War | RULES_TEXT_AVAILABLE | `use_the_force` | `skills`, `ally_support`, `support`, `teamwork` |
| Momentum Strike (`cf278001c780f3f9`) | Threats of the Galaxy | RULES_TEXT_AVAILABLE | `pilot` | `mount`, `ride`, `rider`, `beast`, `vehicle`, `melee`, `damage_bonus`, `movement`, `mobility` |
| Logic Upgrade: Skill Swap (`d48614f7ae500a5b`) | Scavenger's Guide to Droids | RULES_TEXT_AVAILABLE | `use_the_force` | `skill_substitution`, `skills` |

Every row: possible skill interaction not represented — owner review required. No row is an automatic correction.
