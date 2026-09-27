# PHASE 2 - Clone Wars Campaign Guide Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 2

## Scope

Tree-by-tree certification of all Clone Wars talent publications: **95** origin talents in **18** introduced trees plus **23** additions to **14** pre-existing trees, for **118** source identities.

TXT/DJVU was the indexing/transcription layer. Relevant PDF pages were rendered and visually checked for printed-page attribution, tree boundaries, OCR ambiguity, and sidebar contamination. No production talent records are modified.

## Machine authority

- `data/audits/talent-phase-2-clone-wars-campaign-guide-content.json`
- `data/audits/talent-phase-2-clone-wars-discrepancy-manifest.json`

## Census

| Measure | Count |
|---|---:|
| Origin trees | **18** |
| Origin talents | **95** |
| Expansion tree targets | **14** |
| Expansion talents | **23** |
| Total certified identities | **118** |
| Repo records mapped | **112** |
| Missing repo records | **6** |

Missing records are all Droid Commander:

- Droid Commander -> Automated Strike
- Droid Commander -> Droid Mettle
- Droid Commander -> Inspire Competence
- Droid Commander -> Maintain Focus
- Droid Commander -> Overclocked Troops
- Droid Commander -> Reinforced Commands

## Name variants

- Republic Commando -> `Ambush` is stored as `Ambush (Republic Commando)`.
- Control -> `The Will To Resist` is stored as `The Will to Resist`.

## Major defects

### Trooper - Comrades in Arms
Source: +1 circumstance to melee/ranged attacks while within 3 squares of an ally. Repo text concatenates mechanics from other Trooper talents.

### Light Side - Focused Attack
Source: spend a Force Point to reroll an attack against Dark Side Score 1+ and keep the better roll. Repo concatenates Attuned, Focused Attack, Surge of Light, and explicit fan/homebrew aging material.

### Korunnai Adept - Akk Dog Master
Source grants the akk dog follower and Force-power retargeting. Repo instead contains other Korunnai mechanics, an unrelated Vibroshield prerequisite, and fan/homebrew content.

### Akk Dog Trainer's Actions
Source defines Attack in Concert, Fall Upon Prey, and Paired Maul. Repo stores only a one-sentence summary. Akk-dog sidebar species text was excluded from canonical talent text.

### Focused Force Talisman
Source returns **that spent selected power**; repo changes this to **all expended uses**.

### Higher Yield
Printed prerequisite: `Trained in the Demolitions skill`; repo says `Trained in Mechanics`.

## Extra repo clauses absent from this source

Examples: Protection, Bayonet Master, Rapid Reload, Force Treatment, Tech Savant, and Akk Dog Attack Training. Later books may independently establish some appended wording; Clone Wars does not own it.

## Prerequisite mismatches

- Republic Commando -> Higher Yield: source `Trained in the Demolitions skill`; repo `Trained in Mechanics`
- Korunnai Adept -> Akk Dog Master: source `(none)`; repo `Exotic Weapon Proficiency (Vibroshield)`

## Phase 1D reconciliation

No additional missing Clone Wars structural identity was found. The Phase 1D population remains **95 origin + 23 expansion = 118**.

## Stop gate

- [x] 18 origin trees / 95 origin talents certified.
- [x] 23 expansion talents certified.
- [x] All 118 have printed pages, canonical text, prerequisite data, and non-RAW quick summaries.
- [x] Six missing Droid Commander records identified.
- [x] OCR/sidebar contamination excluded.
- [x] Same-name/name variants protected.
- [x] Homebrew/concatenated contamination isolated.
- [x] No production or runtime changes.
- [x] No unresolved identity reviews.

# Verdict

**Clone Wars Campaign Guide Phase 2 content certification is complete.**

Next: **Rebellion Era Campaign Guide**, same branch.
