# SWSE Species — Phase 1-A: Core Rulebook Canonical Provenance

**Phase:** 1-A — source identity and printed page only  
**Published source:** *Star Wars Roleplaying Game: Saga Edition Core Rulebook*, revised Core Rulebook, 2007.  
**Primary authority:** User-supplied 294-page scanned book; searched corroborating `Core Rulebook_djvu.txt`. Relevant book pages rendered/visually inspected, including the complete main Chapter II species sequence and the *Other Species* section.  
**PDF mapping:** For the specified racial sections, physical PDF page = printed page + 1.  
**JSON storage:** Chat-local Phase 1-A manifest only; **no JSON published to GitHub**.  
**Production edits:** None.

## Acceptance: 21 of 21 official Core species source claims located

| Source scope | Racial profiles | Printed pages |
|---|---:|---|
| Chapter II: Species | **17** | **23–33** |
| Chapter XVI: Allies and Opponents — *Other Species* | **4** | **284–285** |
| **Total distinct Core source profiles** | **21** | |

All 21 printed racial profiles have an existing stable Foundry species ID. The table records where the printed rule or its adjacent racial description appears. The **legacy audit status** is retained solely as a reminder of earlier Phase 2/3 concerns; it is **not** this phase's provenance verdict.

| Species | Printed page(s) | PDF page(s) | Existing Foundry ID | Prior audit status |
|---|---|---|---|---|
| Human | 23 | 24 | `species-human` | `NO_CHANGE` |
| Bothan | 23–24 | 24–25 | `species-bothan` | `REVIEW_REQUIRED` |
| Cerean | 24–25 | 25–26 | `species-cerean` | `REVIEW_REQUIRED` |
| Duros | 25 | 26 | `species-duros` | `NO_CHANGE` |
| Ewok | 25–26 | 26–27 | `species-ewok` | `REVIEW_REQUIRED` |
| Gamorrean | 26 | 27 | `species-gamorrean` | `CHANGE_REQUIRED` |
| Gungan | 26–27 | 27–28 | `species-gungan` | `CHANGE_REQUIRED` |
| Ithorian | 27–28 | 28–29 | `species-ithorian` | `CHANGE_REQUIRED` |
| Kel Dor | 28–29 | 29–30 | `species-kel-dor` | `REVIEW_REQUIRED` |
| Mon Calamari | 28–29 | 29–30 | `species-mon-calamari` | `REVIEW_REQUIRED` |
| Quarren | 29–30 | 30–31 | `species-quarren` | `REVIEW_REQUIRED` |
| Rodian | 29–30 | 30–31 | `species-rodian` | `REVIEW_REQUIRED` |
| Sullustan | 30–31 | 31–32 | `species-sullustan` | `REVIEW_REQUIRED` |
| Trandoshan | 31 | 32 | `species-trandoshan` | `REVIEW_REQUIRED` |
| Twi'lek | 31–32 | 32–33 | `species-twi-lek` | `CHANGE_REQUIRED` |
| Wookiee | 32–33 | 33–34 | `species-wookiee` | `CHANGE_REQUIRED` |
| Zabrak | 33 | 34 | `species-zabrak` | `REVIEW_REQUIRED` |
| Aqualish | 284 | 285 | `species-aqualish` | `CHANGE_REQUIRED` |
| Hutt | 284–285 | 285–286 | `species-hutt` | `CHANGE_REQUIRED` |
| Neimoidian | 285 | 286 | `species-neimoidian` | `REVIEW_REQUIRED` |
| Yuuzhan Vong | 285 | 286 | `species-yuuzhan-vong` | `REVIEW_REQUIRED` |

## Verified scope and reprint boundary

**Standard Chapter II group:** Human, Bothan, Cerean, Duros, Ewok, Gamorrean, Gungan, Ithorian, Kel Dor, Mon Calamari, Quarren, Rodian, Sullustan, Trandoshan, Twi'lek, Wookiee, Zabrak. These are the 17 standard species treated in the main chapter, including rules that continue across a page break.

**Other Species group (printed pp.284–285):** Aqualish and Hutt start on printed p.284; Hutt continues on p.285; Neimoidian and Yuuzhan Vong each have their own printed racial-traits block on p.285. These blocks were originally omitted when the audit covered only the main species chapter, then recovered in the earlier sweep. They are official Core source claims and are **not** homebrew removal candidates.

**Neimoidian publication variance:** Core p.285 grants +2 INT, +2 WIS, −2 STR, Basic/Neimoidian/Pak Pak, trained Deception conditional Skill Focus and Deception reroll. *Galaxy of Intrigue* p.18 has a different ability/language/conditional feat profile. Preserve the Core claim as its own version and **do not combine the two**.

**Yuuzhan Vong publication variance:** Core p.285 provides +2 STR/−2 WIS, Technophobic restrictions, amphibstaff weapon familiarity and Force-related restrictions. Later sourcebooks represent some abilities differently. Preserve Core text separately until explicit edition/variant reconciliation. (Original printed Core spells the weapon **amphistaff**.)

## Status boundaries

- **Phase 1-A provenance:** `PRIMARY_PRINTED_SOURCE_VERIFIED` for each of the 21 identities, with printed pages and stable IDs. No unknown or unmatched Core printed species remain in this scoped set.
- **Phase 2 (attributes):** `PENDING` for all 21 in this new workflow. Do not interpret an earlier `NO_CHANGE` decision as fresh runtime validation. Recheck size, speed, ability adjustments, languages and alternate profiles book-by-book.
- **Phase 3 (species features):** `PENDING` for all 21. Existing historic `CHANGE_REQUIRED` and `REVIEW_REQUIRED` findings are preserved; bonus feats, natural weapons, traits and sidecars are not certified by this source-location pass.
- **Phase 4 (runtime):** `NOT_TESTED`. This pass does not authorize new compendium entries, refactoring, or actor mutation.
- **Phase 0 separation:** The 17 **fan-attributed** removal flags are held in the separate [Phase 0 Markdown manifest](species-phase-0-removal-markers.md) and chat-local JSON; none of these 21 official Core identities belongs to that group.

## QA and commit acceptance

- 21 unique Foundry IDs and 21 Core printed-source claims, 17 main chapter + 4 *Other Species*.
- Main species pages visually confirmed, plus printed p.284/PDF p.285 and printed p.285/PDF p.286.
- No additional species fabricated from an NPC name or lore mention.
- Historical rolling audit remains unchanged (121 distinct source-audited identities; 302 recorded findings).
- **No JSON files added, updated, or uploaded to GitHub** in this Phase 1-A checkpoint. New JSON is a chat-local artifact only.
- **Next:** Phase 1-B will source-audit the next eligible title under the agreed book order. Phase 2 begins only after the Phase 1 provenance run is ready.
