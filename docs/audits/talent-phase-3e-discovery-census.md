# Phase 3E-2b — Source-first discovery census

Read-only. Generator: `node tools/census-talent-source-discovery.mjs` · data: `data/audits/talent-phase-3e-discovery-census.json`. These are **leads**; nothing is repaired and no production data is touched.

The method is independent of the Phase 1D/2/3A claims (which is what is being tested): names come from published NPC stat blocks, from canonical prerequisite text, and from the raw TXT vocabulary.

## 1. Stat-block census

360 distinct talent names appear in published stat blocks. 264 match a canonical talent exactly; 13 are known non-talents (feats, powers, class features); 36 are OCR variants of a known name; 26 are garbled beyond recognition; **21 residual**, every one classified:

| Name | Kind | Where | Note |
|---|---|---|---|
| Armored | OCR_LINE_ARTIFACT | Rebellion Era Campaign Guide:15218 | wrap of "Armored Defense" |
| Attract Student | LEAD | Knights of the Old Republic Campaign Guide:21681 | KOTOR stat block (TXT 21681); no talent definition found (Attract Minion is a different, canonical Core talent). |
| Bate Ais Coe Fre Harm Way | OCR_LINE_ARTIFACT | Scum and Villainy:8890 | garbled Scum and Villainy stat block (Out of Harm's Way) |
| Crippling Strike Devastating Attack | OCR_LINE_ARTIFACT | Jedi Academy Training Manual:10875 | two talents merged by a lost comma |
| Devastating | OCR_LINE_ARTIFACT | Knights of the Old Republic Campaign Guide:20368 | wrap of "Devastating Attack (…)" |
| Elusive Target Force Perception | OCR_LINE_ARTIFACT | Jedi Academy Training Manual:10745 | two talents merged by a lost comma |
| Empower | OCR_LINE_ARTIFACT | Jedi Academy Training Manual:9453 | wrap of "Empower Weapon" |
| Feats Armor Proficiency | OCR_LINE_ARTIFACT | Threats of the Galaxy:780 | section heading merged into the talent list |
| Force Valor | LEAD | Knights of the Old Republic Campaign Guide:13933 | KOTOR stat blocks list it under Special Actions/Talents; the only definition found is the Force power "valor" (KOTOR TXT 4829), not a talent. |
| Gauge Force | OCR_LINE_ARTIFACT | Force Unleashed Campaign Guide:19387 | wrap of "Gauge Force Potential" |
| Greater | OCR_LINE_ARTIFACT | Force Unleashed Campaign Guide:21972, Legacy Era Campaign Guide:18569, Threats of the Galaxy:4812 | list wrap: "Greater Weapon Focus/Specialization (…)" split across a line |
| Hunter's Target Improved Armored Defense | OCR_LINE_ARTIFACT | Core Rulebook:26206 | two talents merged by a lost comma |
| Master Shaper | SOURCE_STATBLOCK_DISCREPANCY_LIKELY | Legacy Era Campaign Guide:20840 | LECG stat block (TXT 20841); the printed Shaper tree lists Biotech Mastery, Expedient Mending, Expert Shaper, Master Mender, Skilled Implanter (TXT 4135-4170): no "Master Shaper" talent. Probably a printed stat-block naming error. |
| Multiattack | OCR_LINE_ARTIFACT | Core Rulebook:26206 | wrap of "Multiattack Proficiency (…)" |
| Pace | OCR_LINE_ARTIFACT | Scum and Villainy:11055 | garbled Scum and Villainy stat block |
| Ser Wars | OCR_LINE_ARTIFACT | Scum and Villainy:8775 | garbled Scum and Villainy stat block |
| Shocking Revelation | LEAD | Legacy Era Campaign Guide:11637 | LECG stat block lists it under Special Actions and Talents (TXT 11633/11637); no definition found. |
| Single Weapon | OCR_LINE_ARTIFACT | Knights of the Old Republic Campaign Guide:15000 | wrap of "Single Weapon Flourish" |
| Social Engineering | LEAD | Legacy Era Campaign Guide:19380 | LECG stat block (TXT 19381); no definition found (the phrase appears only as prose elsewhere). |
| Squad Fighter | LEAD | Legacy Era Campaign Guide:19830 | LECG stat block lists it under Special Actions and Talents (TXT 19826/19830) next to the canonical Squad Superiority; no definition found. |
| Wanted Alive | LEAD | Core Rulebook:25470 | Core Rulebook stat block lists the talent; no definition heading exists anywhere in the Core TXT. |

**Leads worth a lookup (7):** Attract Student; Force Valor; Shocking Revelation; Social Engineering; Squad Fighter; Wanted Alive; Command Decision. None is defined anywhere in the 14 TXT files; each is either a talent the claims layer never captured, a talent defined on a page the TXT lost, or a printed stat-block inconsistency. They need the PDF.

## 2. Prerequisite closure

47 prerequisite fragments on canonical talents do not resolve to a known name (by kind: ALTERNATIVE_LIST 1, GENERIC_DESCRIPTOR 35, OCR_DEFECT_IN_CANONICAL_TEXT 4, SPLIT_OR_TREE_REFERENCE 6, UNRESOLVED_NAME_LEAD 1).

- **Canonical text defects (silent OCR errors the earlier signature gate could not see):** `Battie Analysis` (→ Battle Analysis; Cover Fire); `Enpower Weapon` (→ Empower Weapon; Primitive Block); `Hunter's Target. P` (→ Hunter's Target (stray ". P"); Relentless); `Shift Defense Il` (→ Shift Defense II; Shift Defense I).
- **Unresolved name:** `Command Decision` — Unknown Regions prints it as a prerequisite of Turn the Tide; no committed TXT defines a talent, feat or power of that name.
- The rest are generic descriptors ("Weapon Focus with the chosen weapon"), fragments of compound names and tree references, not missing talents.

## 3. Rare-token scan of canonical text

70 words in canonical text occur at most once in all 14 sourcebooks. Most are legitimate rare words; the lost-space/typo candidates are: `ateam` (Bounty Hunter|Hunter's Mark), `nonproficiency` (Brawler|Disarm and Engage), `forcesensitive` (Sith|Drain Force), `nonenergy` (Malkite Poisoner|Malkite Techniques), `nonsurprised` (Disgrace|Ambush), `nonthreatening` (Disgrace|Two-Faced), `nonprestige` (Master of Intrigue|Done It All), `posess` (Seyugi Dervish|Seyugi Cyclone), `aswift` (Corporate Power|Wrong Decision), `theirspeed` (Corporate Power|Wrong Decision), `forceusers` (Jedi Refugee|Difficult to Sense).

## What this means for completeness

- No stat-block or prerequisite evidence points at a talent missing from a *defined* tree beyond the already-handled seven. The residual leads above are names **used but never defined** in the TXT; they are the honest open items for the corpus-vs-publication question.
- Separately, the closure exposed a small set of canonical **text** defects (a different correction unit from completeness).

Every residual is classified.
