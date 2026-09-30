# Phase 3E-2a — Core Gunslinger source census (pp. 216–217)

Read-only, source-first. Generator: `node tools/census-talent-core-gunslinger.mjs` · data: `data/audits/talent-phase-3e-core-gunslinger-census.json`.
Status: **CERTIFIED_7_PUBLISHED_7_PRODUCTION**. Read-only census: this tool touches no production data.

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
| Ranged Disarm | 20640 | **no** | **no** | `d7870d0940a3ce0b` (Saga Edition Core Rulebook / 217) | AUTHORITY_GAP_PRODUCTION_PRESENT |
| Trigger Work | 20645 | **no** | **no** | `86c10d63bba2d9c8` (Saga Edition Core Rulebook / 217) | AUTHORITY_GAP_PRODUCTION_PRESENT |

Layer counts — source TXT **7**, Phase 1D origin roster **5**, canonical corpus origin identities **5** (aggregate with expansions 15), production tree members **17**.

## Findings

- **Exact matches (5):** Debilitating Shot; Deceptive Shot; Improved Quick Draw; Knockdown Shot; Multiattack Proficiency (pistols).
- **Authority gaps, production already correct (2):** Ranged Disarm; Trigger Work — published on p.217, absent from Phase 1D/2/3A, present in production since Phase 3D.
- **Identity / tree mismatches:** none.
- **Unexplained production extras in the tree:** none (the ten other members are certified expansion publications).
- **Production metadata:** source and page are present on every member (repaired by Phase 3E-4).

## PDF verification (owner-reported, rendered Core Rulebook)

- Page mapping: PDF page 217 = printed page 216; PDF page 218 = printed page 217.
- Roster: exactly 7 talents: printed p.216 holds Debilitating Shot, Deceptive Shot, Improved Quick Draw, Knockdown Shot and Multiattack Proficiency (pistols) (its text continues onto p.217); printed p.217 holds Ranged Disarm and Trigger Work.
- **Ranged Disarm** (p.217, PDF_VERIFIED, prerequisite **none**): "You can disarm an opponent using a ranged attack. If your ranged disarm attack fails, your opponent doesn't get to make a free attack against you (see Disarm, page 152)."
- **Trigger Work** (p.217, PDF_VERIFIED, prerequisite **none**): "You take no penalty on your attack roll when using the Rapid Shot feat." (Rapid Shot is printed, not inferred).
- Neighbour boundary: Nothing is printed between Trigger Work and the Trusty Sidearm heading: sequence is Multiattack Proficiency continuation, Ranged Disarm, Trigger Work, Trusty Sidearm (no eighth talent, prerequisite paragraph, sidebar or continuation).

## Certification: **7 published → 7 production → 0 missing → 0 unexplained extras → 0 tree mismatches**

Both p.217 talents are `PDF_VERIFIED`. Their production `source`/`page` (Core Rulebook, p.217) is present (Phase 3E-4 repair).
