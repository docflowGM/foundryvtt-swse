# Phase 3E-2a — Core Gunslinger source census (pp. 216–217)

Read-only, source-first. Generator: `node tools/census-talent-core-gunslinger.mjs` · data: `data/audits/talent-phase-3e-core-gunslinger-census.json`.
Status: **CENSUS_COMPLETE_PDF_CONFIRMATION_REQUESTED**. Nothing was repaired; no production data was touched.

## Source evidence (Core Rulebook TXT)

- Tree heading `GUNSLINGER TALENT TREE` at TXT line 20556. The tree is **alphabetical**: Debilitating Shot, Deceptive Shot, Improved Quick Draw, Knockdown Shot, Multiattack Proficiency (pistols), **Ranged Disarm, Trigger Work** — seven talents.
- Five entries sit before the class game-statistics table (TXT 20559–20578); the remaining two sit after the table, across the page/column break (TXT 20640, 20645): `You can take this talent multiple times; each time you take this talent, / reduce the penalty on your attack rolls by an additional 2. / langed Disarm: You can disarm an opponent using a ranged attack, If / r aged disarm attack fails, your opponent doesn't get to make a free / gainst you (see Disarm, page 152). / Work; You take no penalty on your attack roll when using the / ot feat.`
- Corroboration independent of the tree text: Core index lines 28138 ("Ranged Disarm 217") and 28238 ("Trigger Work 217"); Core body line 14492 ("…the Ranged Disarm talent (see page 217…"); Trigger Work in printed Core stat blocks (TXT 25679, 25710) and two Threats of the Galaxy stat blocks; Galaxy of Intrigue line 2180 gives *Damaging Disarm* the prerequisite **Ranged Disarm**.

## Comparison: source vs Phase 1D roster vs canonical corpus vs production

| Talent | TXT line | Phase 1D roster | Canonical identity | Production (source / page) | Status |
|---|---|---|---|---|---|
| Debilitating Shot | 20559 | yes | yes (p.216) | `52f51a77fd60f56f` (Saga Edition Core Rulebook / 216) | EXACT_MATCH |
| Deceptive Shot | 20563 | yes | yes (p.216) | `b1afecfea833a2a5` (Saga Edition Core Rulebook / 216) | EXACT_MATCH |
| Improved Quick Draw | 20569 | yes | yes (p.216) | `a1e013f8cfc15a86` (Saga Edition Core Rulebook / 216) | EXACT_MATCH |
| Knockdown Shot | 20573 | yes | yes (p.216) | `92a32b96dacae82d` (Saga Edition Core Rulebook / 216) | EXACT_MATCH |
| Multiattack Proficiency (pistols) | 20578 | yes | yes (p.216) | `b812c197daea93fd` (Saga Edition Core Rulebook / 216) | EXACT_MATCH |
| Ranged Disarm | 20640 | **no** | **no** | `d7870d0940a3ce0b` (**—** / **—**) | AUTHORITY_GAP_PRODUCTION_PRESENT |
| Trigger Work | 20645 | **no** | **no** | `86c10d63bba2d9c8` (**—** / **—**) | AUTHORITY_GAP_PRODUCTION_PRESENT |

Layer counts — source TXT **7**, Phase 1D origin roster **5**, canonical corpus origin identities **5** (aggregate with expansions 15), production tree members **17**.

## Findings

- **Exact matches (5):** Debilitating Shot; Deceptive Shot; Improved Quick Draw; Knockdown Shot; Multiattack Proficiency (pistols).
- **Authority gaps, production already correct (2):** Ranged Disarm; Trigger Work — published on p.217, absent from Phase 1D/2/3A, present in production since Phase 3D.
- **Identity / tree mismatches:** none.
- **Unexplained production extras in the tree:** none (the ten other members are certified expansion publications).
- **Production metadata defect (small, separate):** Ranged Disarm; Trigger Work carry no `source`/`page` in production.

## What the TXT cannot settle — PDF confirmation requested

1. Core p.216-217: confirm the Gunslinger talent tree lists exactly seven talents (Debilitating Shot, Deceptive Shot, Improved Quick Draw, Knockdown Shot, Multiattack Proficiency (pistols), Ranged Disarm, Trigger Work) and that Ranged Disarm / Trigger Work are printed on p.217.
2. Core p.217: exact printed wording of Ranged Disarm (the TXT lost its first letter and several words).
3. Core p.217: exact printed wording of Trigger Work (the TXT truncated the name and the end of the benefit; "Rapid Shot" is inferred, not read).
4. Core p.216-217: does either Ranged Disarm or Trigger Work print a Prerequisite line? The TXT shows none.
5. Core p.217: confirm nothing else is printed between Trigger Work and the Trusty Sidearm class-feature heading (neighbour boundary).

Until the PDF answers are in, the two records stay `TXT_AMBIGUOUS_PDF_REQUIRED` for exact wording and page; their existence and tree membership are `TXT_CONFIRMED` by four independent TXT anchors. No canonical text is manufactured from partial OCR.
