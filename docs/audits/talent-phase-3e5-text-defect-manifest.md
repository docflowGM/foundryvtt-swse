# Phase 3E-5a — Canonical text-defect manifest

Read-only. Generator: `node tools/build-talent-phase-3e5-defect-manifest.mjs` · data: `data/audits/talent-phase-3e5-text-defect-manifest.json`.

Finite list. Scans nominate; only PDF_VERIFIED entries here can ever be applied, and only through a manifest -> dry-run -> apply -> verify unit.

**28 PDF-verified entries on 23 records** (REPLACE_TOKEN 23, REPLACE_FIELDS 5 overall); no nomination is outstanding; 6 scan candidates are PDF-confirmed as printed (no change).

## PDF-verified corrections (eligible for the 3E-5 dry-run)

| ID | Record | Action | Field(s) | Class |
|---|---|---|---|---|
| TD-01 | Cover Fire (Saga Edition Core Rulebook p.52) | REPLACE_TOKEN | prerequisites | OCR_DEFECT_IN_NAME_REFERENCE |
| TD-02 | Primitive Block (Knights of the Old Republic Campaign Guide p.38) | REPLACE_TOKEN | prerequisites | OCR_DEFECT_IN_NAME_REFERENCE |
| TD-03 | Relentless (Saga Edition Core Rulebook p.208) | REPLACE_TOKEN | prerequisites | STRAY_OCR_FRAGMENT |
| TD-04 | Shift Defense I (Saga Edition Core Rulebook p.222) | REPLACE_TOKEN | prerequisites | MISATTACHED_PREREQUISITE |
| TD-05 | Hunter's Mark (Saga Edition Core Rulebook p.208) | REPLACE_FIELDS | benefit, description, summary | MULTI_TOKEN_OCR_DAMAGE |
| TD-06 | Wrong Decision (Knights of the Old Republic Campaign Guide p.43) | REPLACE_FIELDS | benefit, description | ADJACENT_SECTION_OCR_BLEED |
| TD-08 | Drain Force (Knights of the Old Republic Campaign Guide p.40) | REPLACE_TOKEN | benefit, description, summary | OCR_LOST_HYPHEN |
| TD-18 | Drain Force (Knights of the Old Republic Campaign Guide p.40) | REPLACE_TOKEN | benefit, description, summary | OCR_LETTER_DROP |
| TD-09 | Difficult to Sense (Legacy Era Campaign Guide p.41) | REPLACE_TOKEN | benefit, description | OCR_LOST_HYPHEN |
| TD-10 | Bring Them Back (Force Unleashed Campaign Guide p.54) | REPLACE_TOKEN | benefit, description, summary | OCR_CONFUSABLE_LETTER |
| TD-11 | Hotwired Processor (Force Unleashed Campaign Guide p.47) | REPLACE_TOKEN | benefit, description | OCR_CONFUSABLE_LETTER |
| TD-12 | Influential Friends (Force Unleashed Campaign Guide p.25) | REPLACE_TOKEN | benefit, description | OCR_CONFUSABLE_LETTER |
| TD-13 | Power Boost (Scavenger's Guide to Droids p.28) | REPLACE_TOKEN | benefit, description | OCR_CONFUSABLE_LETTER |
| TD-14 | Power Surge (Force Unleashed Campaign Guide p.48) | REPLACE_TOKEN | benefit, description | OCR_CONFUSABLE_LETTER |
| TD-15 | Share Talent (Jedi Academy Training Manual p.20) | REPLACE_FIELDS | benefit, description | MULTI_TOKEN_OCR_DAMAGE |
| TD-16 | Vital Encouragement (Jedi Academy Training Manual p.17) | REPLACE_FIELDS | benefit, description | ADJACENT_SECTION_OCR_BLEED |
| TD-19 | Seyugi Cyclone (Jedi Academy Training Manual p.83) | REPLACE_TOKEN | benefit, description, summary | OCR_LETTER_DROP |
| TD-20 | Ruthless Negotiator (Saga Edition Core Rulebook p.208) | REPLACE_FIELDS | benefit, description, summary | MULTI_TOKEN_OCR_DAMAGE |
| TD-21 | Turret Self-Destruct (Force Unleashed Campaign Guide p.57) | REPLACE_TOKEN | benefit, description | OCR_PUNCTUATION |
| TD-22 | Psychic Defenses (Jedi Academy Training Manual p.18) | REPLACE_TOKEN | benefit, description, summary | NUMERIC_OCR_DAMAGE |
| TD-23 | Influence Savant (Jedi Academy Training Manual p.15) | REPLACE_TOKEN | benefit, description, summary | STRAY_OCR_FRAGMENT |
| TD-24 | Scomp Link Slicer (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-24b | Scomp Link Slicer (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-24c | Scomp Link Slicer (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-25 | Supervising Droid (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-25b | Supervising Droid (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-25c | Supervising Droid (Scavenger's Guide to Droids p.27) | REPLACE_TOKEN | benefit, description | BULLET_GLYPH_OCR |
| TD-26 | Squad Brutality (Legacy Era Campaign Guide p.31) | REPLACE_TOKEN | benefit, description | STRAY_OCR_FRAGMENT |

- **TD-01 Cover Fire:** the prerequisite is the Clone Wars talent "Battle Analysis" (CWCG TXT 14172/15054/18359) — PDF ruling: confirmed.
- **TD-02 Primitive Block:** the prerequisite is the Core talent "Empower Weapon" (Core TXT 20357) — PDF ruling: confirmed.
- **TD-03 Relentless:** Core TXT 19703 carries a stray "P" — PDF ruling: printed prerequisite is "Hunter's Mark, Hunter's Target."; the P is stray OCR.
- **TD-04 Shift Defense I:** Core TXT 21224 prints no prerequisite for tier I; the string belongs to Shift Defense III (TXT 21240) — PDF ruling: no prerequisite is printed at all; remove it entirely.
- **TD-05 Hunter's Mark:** three defects: missing "a", "you 4 target" -> "you move the target", "ateam" -> "attack"; the derived summary carried the same damage plus parenthetical-removal spacing — PDF transcription, Core p.208.
- **TD-06 Wrong Decision:** KOTOR p.43: the "Executive Leadership" block is the next heading (a corporate-agent class feature), not part of Wrong Decision. Supersedes the former token fixes TD-06/TD-07 (aswift, theirspeed), which were inside the bled block. — PDF ruling, KOTOR p.43: the talent ends before "Executive Leadership".
- **TD-08 Drain Force:** the books print "Force-sensitive" — PDF ruling: confirmed (KOTOR p.40).
- **TD-18 Drain Force:** missed by the token scan; "sap ... strength and convert it to personal power" — PDF ruling, KOTOR p.40: "convert it to personal power".
- **TD-09 Difficult to Sense:** LECG TXT 3598/3602 prints "Force-users" — PDF ruling: confirmed.
- **TD-10 Bring Them Back:** capital "I" read for lowercase "l"; printed "one-half" — PDF ruling: "one-half" confirmed.
- **TD-11 Hotwired Processor:** capital "I" read for lowercase "l"; printed "one-half" — PDF ruling: "one-half" confirmed.
- **TD-12 Influential Friends:** capital "I" read for lowercase "l"; printed "one-half" — PDF ruling: "one-half" confirmed.
- **TD-13 Power Boost:** capital "I" read for lowercase "l"; printed "one-half" — PDF ruling: "one-half" confirmed.
- **TD-14 Power Surge:** capital "I" read for lowercase "l"; printed "one-half" — PDF ruling: "one-half" confirmed.
- **TD-15 Share Talent:** JATM p.20: "Lightsa-ber", "Duel-ist", comma where a period belongs, illustration caption "A Twi'Ler Jeo! INsTRUCTOR.", "one-haIf", paragraphs flattened. The prerequisite already matches print apart from its terminal period and is left unchanged. — PDF transcription, JATM p.20.
- **TD-16 Vital Encouragement:** JATM p.17: "New Sense Talents The following talents belong to the Sense talent tree..." is the next section; "one-haIf" also repaired — PDF transcription, JATM p.17.
- **TD-19 Seyugi Cyclone:** the TXT "posess" is itself OCR damage (promoted from the former NC-01) — PDF ruling, JATM p.83: "...even if you do not possess the Whirlwind Attack feat.".
- **TD-20 Ruthless Negotiator:** production: "haggling over te price @ bounty ... reroll Persuasion check"; the derived summary carried the same damage — PDF transcription, Core p.208 (prerequisite "Notorious." already matches).
- **TD-21 Turret Self-Destruct:** "!f" for "If" with the space lost — PDF ruling, FUCG p.57: "...dealing its normal damage. If you are adjacent to the turret...".
- **TD-22 Psychic Defenses:** the damage die "1d6" was read as "146" (the TXT has the same damage, JATM TXT 1556) — PDF ruling, JATM p.18: "Force damage equal to 1d6 x your Wisdom modifier (minimum x1)".
- **TD-23 Influence Savant:** stray opening quote before "one" — PDF ruling, JATM p.15: no opening quote.
- **TD-24 Scomp Link Slicer:** printed round bullet read as the letter "e" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-24b Scomp Link Slicer:** printed round bullet read as "¢" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-24c Scomp Link Slicer:** printed round bullet read as "©" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-25 Supervising Droid:** printed round bullet read as "©" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-25b Supervising Droid:** printed round bullet read as the letter "e" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-25c Supervising Droid:** printed round bullet read as the letter "e" — PDF ruling, Scavenger's Guide p.26/27: ordinary printed bullet.
- **TD-26 Squad Brutality:** trailing stray comma after the final period — PDF ruling, Legacy p.31: the sentence ends at "taking the better result.".

## Outstanding nominations (PDF_REQUIRED — never applied unverified)

| ID | Record | Field(s) | Production has | Proposed | Conf. |
|---|---|---|---|---|---|


## PDF-confirmed as printed (no change)

- **TD-17 Sidestep** `to 1 until`: PDF ruling: exactly as printed (Scum and Villainy p.17); prerequisite Long Stride
- **NC-02 Malkite Techniques** `nonenergy`: PDF ruling: printed exactly
- **NC-03 Disarm and Engage** `nonproficiency`: PDF ruling: printed exactly
- **NC-04 Done It All** `nonprestige`: PDF ruling: printed exactly
- **NC-05 Ambush** `nonsurprised`: PDF ruling: printed exactly
- **NC-06 Two-Faced** `Nonthreatening`: PDF ruling: printed option label "Nonthreatening:"

## Scan limits

Heuristic scans cannot prove absence of damage. The first PDF pass showed a token scan misses whole-block defects (section bleed, caption contamination); a full-text PDF comparison of all 1,187 records is outside 3E and is the one thing that would certify text completeness.
