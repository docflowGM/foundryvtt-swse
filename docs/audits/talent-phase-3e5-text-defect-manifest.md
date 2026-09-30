# Phase 3E-5a — Canonical text-defect manifest

Read-only. Generator: `node tools/build-talent-phase-3e5-defect-manifest.mjs` · data: `data/audits/talent-phase-3e5-text-defect-manifest.json`.

Finite list. Scans nominate; only entries here can ever be applied, and only once verification.status is PDF_VERIFIED with the printed text recorded.

**17 defect entries across 16 records** (CERTAIN 13, LIKELY 2, NEEDS_PRINT 2); 2 need an owner transcription; 6 scan candidates are preserved as printed.

| ID | Record | Book p. | Field(s) | Production has | Proposed | Conf. |
|---|---|---|---|---|---|---|
| TD-01 | Cover Fire | Saga Edition Core Rulebook p.52 | prerequisites | `Battie Analysis` | `Battle Analysis` | CERTAIN |
| TD-02 | Primitive Block | Knights of the Old Republic Campaign Guide p.38 | prerequisites | `Enpower Weapon` | `Empower Weapon` | CERTAIN |
| TD-03 | Relentless | Saga Edition Core Rulebook p.208 | prerequisites | `Hunter's Target. P` | `Hunter's Target.` | LIKELY |
| TD-04 | Shift Defense I | Saga Edition Core Rulebook p.222 | prerequisites | `Shift Defense 1, Shift Defense Il` | *(remove)* | LIKELY |
| TD-05 | Hunter's Mark | Saga Edition Core Rulebook p.208 | benefit, description, summary | `you 4 target -1 step along the condition track if the ateam hits` | **owner transcription** | NEEDS_PRINT |
| TD-06 | Wrong Decision | Knights of the Old Republic Campaign Guide p.43 | benefit, description | `aswift` | `a swift` | CERTAIN |
| TD-07 | Wrong Decision | Knights of the Old Republic Campaign Guide p.43 | benefit, description | `theirspeed` | `their speed` | CERTAIN |
| TD-08 | Drain Force | Knights of the Old Republic Campaign Guide p.40 | benefit, description, summary | `Forcesensitive` | `Force-sensitive` | CERTAIN |
| TD-09 | Difficult to Sense | Legacy Era Campaign Guide p.41 | benefit, description | `Forceusers` | `Force-users` | CERTAIN |
| TD-10 | Bring Them Back | Force Unleashed Campaign Guide p.54 | benefit, description, summary | `haIf` | `half` | CERTAIN |
| TD-11 | Hotwired Processor | Force Unleashed Campaign Guide p.47 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-12 | Influential Friends | Force Unleashed Campaign Guide p.25 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-13 | Power Boost | Scavenger's Guide to Droids p.28 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-14 | Power Surge | Force Unleashed Campaign Guide p.48 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-15 | Share Talent | Jedi Academy Training Manual p.20 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-16 | Vital Encouragement | Jedi Academy Training Manual p.17 | benefit, description | `haIf` | `half` | CERTAIN |
| TD-17 | Sidestep | Scum and Villainy p.17 | benefit | `move into a diagonal space to 1 until the end of your turn` | **owner transcription** | NEEDS_PRINT |

## Evidence

- **TD-01 Cover Fire** (OCR_DEFECT_IN_NAME_REFERENCE): the prerequisite is the Clone Wars talent "Battle Analysis" (CWCG TXT 14172/15054/18359)
- **TD-02 Primitive Block** (OCR_DEFECT_IN_NAME_REFERENCE): the prerequisite is the Core talent "Empower Weapon" (Core TXT 20357, index 27973)
- **TD-03 Relentless** (STRAY_OCR_FRAGMENT): Core TXT 19703 prints "Prerequisites: Hunter's Mark, Hunter's Target. P" with the stray "P" from the next text run; the talent list ends at Hunter's Target
- **TD-04 Shift Defense I** (MISATTACHED_PREREQUISITE): Core TXT 21224 prints Shift Defense I with no prerequisite; the string belongs to Shift Defense III (Core TXT 21240 "Prerequisites: Shift Defense 1, Shift Defense Il"), whose own record already reads "Shift Defense I; Shift Defense II". Not merely OCR: the prerequisite of tier I is wrong (and self-referential).
- **TD-05 Hunter's Mark** (MULTI_TOKEN_OCR_DAMAGE): Core TXT 19643-19645 is garbled in three places ("ranged attack" missing its article, "you 4 target", "ateam"); the exact printed sentence cannot be reconstructed from the TXT
- **TD-06 Wrong Decision** (OCR_LOST_SPACE): "As aswift action" (KOTOR TXT 4037); the same book prints "a swift action" elsewhere (TXT 4022)
- **TD-07 Wrong Decision** (OCR_LOST_SPACE): KOTOR TXT 4039 reads "theirspeed" (lost space)
- **TD-08 Drain Force** (OCR_LOST_HYPHEN): the books print "Force-sensitive" (e.g. KOTOR TXT 15343)
- **TD-09 Difficult to Sense** (OCR_LOST_HYPHEN): Legacy Era Campaign Guide TXT 3598/3602 prints "Force-users"
- **TD-10 Bring Them Back** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-11 Hotwired Processor** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-12 Influential Friends** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-13 Power Boost** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-14 Power Surge** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-15 Share Talent** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-16 Vital Encouragement** (OCR_CONFUSABLE_LETTER): capital "I" read for lowercase "l"; every other record prints "one-half"
- **TD-17 Sidestep** (SUSPECT_SENTENCE): flagged by the stray-digit scan ("to 1 until"): possibly damaged; no TXT comparison made. Owner to confirm the printed sentence; if it is correct as shown, close as NO_CHANGE.

## Preserved as printed (no change unless the PDF disagrees)

- **NC-01 Seyugi Cyclone** `posess`: printed typo: Jedi Academy Training Manual TXT 7645 prints "posess" exactly as canonical; canonical text = published text. Owner decision: PRESERVE_PRINTED_TYPO (recommended) or CORRECT.
- **NC-02 Malkite Techniques** `nonenergy`: printed form (Threats TXT 1118)
- **NC-03 Disarm and Engage** `nonproficiency`: printed form (Galaxy of Intrigue TXT 1980)
- **NC-04 Done It All** `nonprestige`: printed form (Galaxy of Intrigue TXT 1636)
- **NC-05 Ambush** `nonsurprised`: no TXT comparison available; the SWSE "non" prefix is unhyphenated elsewhere. Change only if the PDF shows a hyphen or space.
- **NC-06 Two-Faced** `nonthreatening`: option label "Nonthreatening:" (printed label form); change only if the PDF disagrees

## Scan limits

Heuristic scans cannot prove absence of damage; they bound the nominated universe, they do not certify the corpus text. A full-text PDF comparison is out of 3E scope.
