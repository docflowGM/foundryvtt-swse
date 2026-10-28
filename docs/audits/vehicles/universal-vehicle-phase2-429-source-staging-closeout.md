# Universal vehicle Phase 2 — remaining seven-book source staging closeout

**Coverage:** 143 / 143 remaining publication-specific vehicle identities staged. **Total project Phase 2 coverage:** 429 / 429 across 14 books. **Scope:** Draft v0.5 source-structure staging, NOT strict mechanical certification or Foundry V2 vehicle runtime migration.

| Book | Inherited ships | New entries | Approved supplement | Total |
| --- | ---: | ---: | ---: | ---: |
| Galaxy of Intrigue | 6 | 2 | 0 | 8 |
| Jedi Academy Training Manual | 1 | 0 | 0 | 1 |
| Legacy Era Campaign Guide | 39 | 10 | 0 | 49 |
| Rebellion Era Campaign Guide | 35 | 18 | 0 | 53 |
| Threats of the Galaxy | 1 | 4 | 0 | 5 |
| Unknown Regions | 12 | 13 | 1 | 26 |
| Scavenger's Guide to Droids | 0 | 1 | 0 | 1 |
| **Total** | **94** | **48** | **1** | **143** |

## Data provenance

Every book has a `swse-universal-phase2[h-n]-*-staged.json` file in `data/audits/vehicles/`, linked to its frozen `swse-universal-phase1[h-n]-*.json` ledger and original source-PDF SHA. Existing spacecraft reuse `data/canonical/vehicles/ships.json`, including older PDF-reviewed per-book source ledgers. For newly enumerated vehicles, repository-local `reference/sourcebooks/<book>_djvu.txt` supplied **provisional searchable transcription** at the existing PDF-verified source identity and page. OCR/TXT-derived mechanics are not independently PDF-certified merely because they satisfy the schema. The original uploaded PDFs remain the final wording, numeric and topology authority.

The book-level data is intentionally non-production and marks each record `partial-source-probe`. It retains source print values for CL, HP, Reflex and other fields where found, plus source-attack evidence, with unknown values omitted or explicitly marked. It does **not** invent weapon hardware counts, firing arcs, atomized batteries, operator runtime bindings, stock option exclusivity, or special-rule consumers. An attack-group entry derived from searchable text is a **candidate**, pending visual PDF certification. Existing previously reviewed ship attack groups retain their older provenance authority.

## Verified repairs and remaining debt

- Rebellion Era printed p60, p62, p135 and p153 were inspected directly to repair Bantha-II, Air-2 Swoop, TIE Crawler and Canderous-class tank extraction: the Air-2 has 50 HP and Speed 16 squares (rather than the adjacent statblock's movement); Canderous has 250 HP; the unarmed skiff is not given hypothetical aftermarket guns.
- Galaxy of Intrigue Ferret and Prowler historical ship source fields were recovered from their distinct source statblocks rather than cross-mapped from adjacent paragraphs.
- Chu'unthor is a one-book source identity with a Colossal (station) capital-ship print line. Its published tractor beam row does not establish physical arc or independent runtime mounts.
- Legacy Era includes three station identities and separately indexed source variants. Rebellion includes 18 newly found vehicles and does not multiply encounter instances. Unknown Regions retains one approved supplemental baseline as an approved supplement (not a newly discovered hull). The DP-2 remains one hybrid vehicle-droid identity.
- Source text can interleave two-column statblocks or corrupt CL, hp, price and operator details. Therefore all 48 new vehicle printouts need a dedicated original-PDF certification pass before mechanical promotion, and unusual or cross-book duplicated values need source-adjudication evidence. A staged record's presence is not a claim that all its fields are verified.
- The code expressly avoids changing compiled compendiums, packs, generated Actors or Foundry runtime systems. Special mechanics, optional configurations, fire effects, condition-track rules, mount topology and weapon controls remain a tracked certification backlog.

## Checks and next phase

`tests/vehicle-universal-phase2h-through-2n-complete.test.mjs` checks 143 exact identities against the Phase 1 ledgers, recursively validates the existing draft v0.5 schema, checks historical ship attack-group retention and source exceptions, and asserts **429** distinct staged publication records across all 14 books.

**Next phase:** Field-level PDF certification of 48 new vehicle entries, weapon/mount/arc adjudication, and typed source-specific mechanical consumers. Only after those gates should production and Foundry V2 actors be migrated. The 429 / 429 number is **source coverage**, not 429 / 429 executable or gameplay-certified vehicles.
