# Feat Tags — Skill-Tag Completeness Audit (report-only)

Authority: `data/audits/feat-tags-pass2-semantic-authority.json` (`PASS2_OWNER_ADJUDICATION_BATCH_1_APPLIED`; Pass 2 working authority, owner adjudication Batch 1).

Advisory scan. No tag assignment was added, removed, or changed. Prerequisite text is never scanned. Lexicon matches are lexical and can be false positives (for example a verb sense of "pilot" or "climb").

Per-feat rules text is available from the content/provenance authority only where embedded; other feats are scanned against the Pass 1 canonicalMechanicSummary alone (PASS1_SUMMARY_ONLY).

- Assignments scanned: 353
- Rules-text basis: 331; summary-only basis: 22
- Findings: 5; owner-closed false positives: 5; **open, needing owner review: 0**

| Feat | Source | Basis | Possible missing tags | Current tags | Status |
| --- | --- | --- | --- | --- | --- |
| Vehicular Surge (`5e471161ad85b040`) | Rebellion Era Campaign Guide | RULES_TEXT_AVAILABLE | `pilot` | `vehicle`, `survivability`, `swift_action`, `action_economy`, `resources` | PASS2_FALSE_POSITIVE |
| Mounted Defense (`acb7efcc70769b9f`) | Threats of the Galaxy | RULES_TEXT_AVAILABLE | `pilot` | `mount`, `ride`, `rider`, `beast`, `vehicle`, `defense`, `evasion`, `once-per-encounter` | PASS2_FALSE_POSITIVE |
| Mission Specialist (`b7f51561e60fefe6`) | Galaxy at War | RULES_TEXT_AVAILABLE | `use_the_force` | `skills`, `ally_support`, `support`, `teamwork` | PASS2_FALSE_POSITIVE |
| Momentum Strike (`cf278001c780f3f9`) | Threats of the Galaxy | RULES_TEXT_AVAILABLE | `pilot` | `mount`, `ride`, `rider`, `beast`, `vehicle`, `melee`, `damage_bonus`, `movement`, `mobility` | PASS2_FALSE_POSITIVE |
| Logic Upgrade: Skill Swap (`d48614f7ae500a5b`) | Scavenger's Guide to Droids | RULES_TEXT_AVAILABLE | `use_the_force` | `skill_substitution`, `skills` | PASS2_FALSE_POSITIVE |

Open rows: possible skill interaction not represented — owner review required. No row is an automatic correction. PASS2_FALSE_POSITIVE rows keep their evidence and record the owner ruling in the JSON.
