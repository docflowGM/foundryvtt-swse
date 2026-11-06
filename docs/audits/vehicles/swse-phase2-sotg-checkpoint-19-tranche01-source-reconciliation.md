# Starships of the Galaxy — CP19 Tranche 01 (15 ships)

**Status:** 15/15 source disputes/legacy evidence cases individually reviewed from rendered original printed PDF pages. All findings preserved as an audit-only overlay. **No 100-ship backlog certificate has been issued yet.**

- Original Starships of the Galaxy scanned PDF: SHA-256 `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- Isolated audit branch: `audit/sotg-strict-certification-cp17`.
- Inherited CP16 ledger remains exact source-of-truth; CP17 queue remains unchanged.
- Scope: first **15 positions** in the CP17 ordered queue, of which **12** had existing documented `P0_SOURCE_CONFLICT` entries, **3** are `P1_LEGACY_MISSING_FIELDS`. This is the first of seven planned 15-entry tranches (final tranche 10).
- Direct PDF inspection: 19 printed pages: **59, 61, 63, 65, 72, 99, 100–101, 104–105, 110, 116–117, 139, 141–143, 152–153**.
- Approval contract: `SOTG-CP18-D01`. A source fidelity review, a strict historical source-mount certificate, and runtime weapon authority remain different gates.

## Tranche 01 source observations

| # | Ship | Printed pages | Primary outstanding finding / disposition |
|---:|---|---|---|
| 1 | Advanced V-19 Torrent | 59 | Header Initiative **+12**, skills Initiative **+8**. A sample advanced-template ship, not a mutation of ordinary V-19. Both retained. |
| 2 | Recusant-class Light Destroyer | 72 | Point-defense light laser batteries **+16** (Ranged) vs **+14** (weapon table); double-light batteries **+14** vs **+12**. Four raw numbers retained with matching families. |
| 3 | Pellaeon-class Star Destroyer | 99 | Printed Ref **16** and flat-footed **47**. No unsupported correction to 14 or another inferred value. |
| 4 | Immobilizer 418 | 100–101 | Gravity-well weapon row: **4×4 squares**; separately printed projector rules: **3×3 squares**. Area for canonical attack remains unresolved. |
| 5 | Junker TYE-wing | 104 | Header Initiative **+2**, skill Initiative **+8**. Junker transformation and ship example not counted as two ships. |
| 6 | BTL-58 K-wing | 105 | Initiative header **+10** / skills **+6**; "shieldbuster torpedoes" in attack/table vs "6 plasma torpedoes" under payload. Alternate ordnance remains OR, not simultaneous. |
| 7 | Marauder Corvette | 110 | Ranged "tractor beam battery +8" vs detailed "Tractor beam (3 gunners)". No inference that three gunners means three separate mounts. |
| 8 | Mon Calamari Star Defender | 116–117 | Printed "Colossal (station) space station" clashes with moving warship prose/speed; payload **6,000 medium** missiles vs **heavy** missile batteries. No silent conversion. |
| 9 | Eclipse | 139 | Superlaser header **+7** vs weapon table **+15**, both literal. Ship-alignment and target-size penalty stay separate rules. |
| 10 | Theta-class Shuttle | 141 | Senses Perception **+5** vs skills Perception **+6**. No inferred skill correction. |
| 11 | TIE Bomber | 142–143 | Initiative header **+7** vs skill **+4**. Prose expressly states two forward-mounted lasers; alternate missile/torpedo/bomb/mine loadouts are configuration alternatives. |
| 12 | T-65XJ3 X-wing | 152–153 | Capabilities prose: three tubes with **four heavy proton torpedoes** each. Statblock: **12 proton torpedoes**, no "heavy" qualifier. Numbers agree; subtype not normalized. |
| 13 | ARC-170 | 61 | Three attack families and pilot/gunner roles verified. No printed physical cannon/launcher count or arcs from attack row; historical group sourcePage and batteryCount keys absent. |
| 14 | Alliance A-wing | 63 | Laser, missiles, electronic jammer must remain separate; early A-wings did not have missile launchers. Hardware/arc and group-page fields historically incomplete; no fictional third weapon mount for jammer. |
| 15 | Baudo-class Star Yacht | 65 | Prose calls out a **single laser cannon**, attack row uses plural "light laser cannons". Retain one count claim and plural label as distinct source observations. Row-level historical provenance incomplete. |

### Evidence state findings

The three legacy-missing records (ARC-170, A-wing, Baudo) account for **7 CP16 attack-group rows missing their own `sourcePage` keys** (three + three + one). An eighth missing-source-page row, Delta-7 Aethersprite, is outside this tranche and remains queued for a later pass. The existence of a ship-level statblock page does not mean the historical individual group row stored a page locator. No sourcePage keys were added to CP16.

A dedicated machine-readable audit overlay provides the stable sourceEntryKey, exact CP17 queue position, CP16 ledger index, printed page(s), distinct conflicting text or numeric claims, preserved prior source-conflict field groups, provisional disposition and certification gates for every ship. The overlay is **not** a new SSOT for full ship stats; the CP16 ledger remains authoritative.

## Outcome and next action

**Reviewed:** 15/15. **Prior conflict-bearing:** 12/12. **Legacy missing-field cases:** 3/3. **Newly certified:** zero. The 12 reviewed conflicts remain source-conflict claims pending an errata/owner-specific decision or a design that can faithfully retain alternative printed claims without choosing an executable default. The three historical schema gaps retain explicit missing-key provenance. The owner-approved source-fidelity tier allows confirmed source silence, but individual lossless schema/certification tests must pass before granting any new tier.

No global adjudication was proposed: existing `P2C-D03` and `SOTG-CP18-D01` already require conflicts to remain unresolved unless published errata or a separate owner decision resolves them. An executable ambiguous attack/area must fail closed; a GM-scoped action can be governed by the separate existing runtime contract, not by changing source claims.

**Next:** CP19 tranche 02 covers positions 16–30 of the original 100-ship queue (15 ships). Continue publication-specific evidence review and candidate source-fidelity gap assessments, without inventing physical mounts or firing arcs.

## Validation

```bash
python3 tools/audits/vehicles/check_sotg_phase2b_cp17_baseline.py --repo .
python3 tools/audits/vehicles/check_sotg_phase2c_cp18_evidence_policy.py --repo .
python3 tools/audits/vehicles/check_sotg_phase2b_cp19_tranche01.py --repo . \
  --source-pdf "/path/to/SAGA EDITION - Starships of the Galaxy.pdf"
```

CI runs the CP19 validator without the externally mounted original PDF, which is not committed to GitHub. This validator checks ledger/queue blob SHA continuity, all 15 identities, reviews, claim sentinels, the 19 original PDF page locators, 7 missing row-level page keys and unchanged four historical strict certificates. It is a structural evidence/continuity test, not automated optical proof of the scanned pages. Direct visual PDF source review was performed separately for this tranche.

**Known inherited limitation:** the older CP16 historical test requires an unavailable CP15 comparison ledger on this branch, so it is explicitly reported as unexecuted. Its absence is not papered over and does not license CI to claim CP16 historical review replay succeeded.
