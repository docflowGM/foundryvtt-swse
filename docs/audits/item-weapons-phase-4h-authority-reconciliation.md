# Phase 4H-A — Weapon Authority Reconciliation

**Status:** `WEAPON_PHASE_4H_A_AUTHORITY_RECONCILED` (authority-only; no production mutation)

## Census

- Phase 4 category records: **204**
- Unique canonical identities: **203** (Phase 3B: 203)
- Repo-present / repo-missing: **151 / 52**
- Missing identities: **0** · unexpected identities: **0** · repo-mapping mismatches vs Phase 3B: **0**
- Intentional cross-category duplicate: **Interchangeable Weapon System** (4D + 4F)

| Phase | Category | Records | Phase 3B group(s) |
| --- | --- | ---: | --- |
| 4A | Simple Weapon | 49 | Simple Weapon |
| 4B | Lightsaber | 16 | Lightsaber |
| 4C | Pistol | 30 | Pistol |
| 4D | Rifle | 38 | Rifle + Rifle (Special) |
| 4E | Advanced Melee Weapon | 22 | Advanced Melee Weapon |
| 4F | Heavy Weapon | 17 | Heavy Weapon + Heavy Weapon (Ammunition) (+ adjunct weapon-interchangeable-weapon-system) |
| 4G | Exotic Weapon | 32 | Exotic Weapon |

## Corrections applied in 4H-A (selector / provenance only; no semantic tag changed)

- **4H-A2** (Massassi Lanvarok, Ryyk Blade, Siang Lance, Squib Tensor Rifle, Verpine Shatter Gun): Added machine-readable speciesOverrides / abilityOverrides selectors for alternate proficiency routes previously described only in prose. No semantic tag changed.
- **4H-A3** (Sith Lanvarok): Exact ability name corrected to canonical 'Two-Weapon Fighting'. Interaction unchanged.
- **4H-A4** (Tehk'la Blade): Added Nagai alternate proficiency route (source-confirmed, Legacy Era Campaign Guide) and speciesOverrides selector. Alternate-case count 9 -> 10. No semantic tag changed.
- **4H-A6** (Sith Lanvarok): Recorded Kissai 'the lanvarok' simple-weapon familiarity as an unadjudicated source gap. No route added.

## Carried authority discrepancies

- **DH23_DESCRIPTION_PAGE** — `UNVERIFIED_PRIMARY_SOURCE_PDF_REQUIRED`: Neither authority was changed. Phase 3B (controlling canonical authority) is carried provisionally. Needs a visual PDF check; provenance metadata only, no semantic effect. Clone Wars Campaign Guide OCR text places the DH-23 description box in the same text block as the weapons table (stat table p.61), which weakly favours p.61, but OCR order is not page authority and the PDF is not available in this environment.
- **MASSASSI_LANVAROK_SPECIES_CONFLICT** — `FROZEN_PHASE3B_RULING_CONTROLS`: KOTOR Massassi species text: Massassi treat the lanvarok as a simple weapon. Massassi lanvarok weapon entry: Massassi treat it as an advanced melee weapon. Phase 3B froze the weapon-entry advanced-melee reading; both are preserved, not merged.
- **XERROL_NIGHTSTINGER_GROUP** — `PHASE3B_EXOTIC_CLASSIFICATION_CONTROLS`: Phase 1 prose called it a Rifle; frozen Phase 3B places it in the Exotic proficiency census. No rifle semantic tag.
- **TEHKLA_NAGAI_ROUTE** — `CORRECTED_IN_PHASE_4H_A4`: Nagai treat tehk'la blades as simple weapons instead of exotic weapons (Legacy Era Campaign Guide). Added structurally; Exotic alternate-case count 9 -> 10. Native Exotic classification and every semantic tag unchanged.
- **VIBRO_SAW_DR_BYPASS** — `ONTOLOGY_GAP_STRUCTURAL`: DAMAGE_REDUCTION_BYPASS stays structured mechanics; damage_reduction means possessing DR and must not be used.
- **SITH_LANVAROK_KISSAI_FAMILIARITY** — `OPEN_PLANNER_QUESTION`: KOTOR Kissai species: Kissai treat "the lanvarok" as a simple weapon instead of an exotic weapon. The source does not say which lanvarok variety. No alternate route added until the planner rules.

## Inputs

- data/audits/item-weapons-phase-3b-canonical-authority.json: `45f0ba3b9cbba8a277981bb19631c1d639b7e488b3e748b9bef40db0ef63acb0`
- data/audits/item-weapons-phase-4a-simple-semantic-rolling.json: `4cf3b12777a113de82b21dbe2ff8a388d6e39c5e0a220d1afbb0e32703c0acdd`
- data/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.json: `0c2574d28129519fbc16433ff03469243d87eda38edc04ea09ce4984d0f8e226`
- data/audits/item-weapons-phase-4c-pistol-semantic-rolling.json: `42d9fdfd534c28e0524e78d9f9db7c89f537f89da6252d7c7b2860171cdb69fa`
- data/audits/item-weapons-phase-4d-rifle-semantic-rolling.json: `099091431b40fda931725da28fd809caef699a24de4ecdaa5753d8bc0a5d7a57`
- data/audits/item-weapons-phase-4e-advanced-melee-semantic-rolling.json: `88cc4fe20a3a86594e961676160682cbe3e902154ef9f0becdc368a2258feb58`
- data/audits/item-weapons-phase-4f-heavy-semantic-rolling.json: `ab8c32d509533f5f8380119c4fc0f6e88c90a5f46a04aac92553a85fc5763977`
- data/audits/item-weapons-phase-4g-exotic-semantic-rolling.json: `6294cb0f51598f7ef01ab46c2aa062f8a693b43d2979eccb60b920e026fd3b3c`
