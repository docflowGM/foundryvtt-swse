# Threats of the Galaxy — Droid source hydration (local rolling checkpoint)

**Book 3/14. Local source-review phase complete for selected first-page fields; NOT mechanical certification.** No commits, pushes, Foundry imports or production data edits.

## Rolling counters

| Measure | Threats | Overall project |
|---|---:|---:|
| Publication source records drafted | **29/29 (100%)** | **115/234 (49.1%)** |
| Selected first-page PDF review | **29/29 (100%)** | **115/234 (49.1%)** |
| Mechanically certified | **0/29** | **0/234** |
| Mechanically complete books | -- | **0/14** |

**Source-backed selected-field comparisons:** 314 on 27 rendered printed pages (pp134–160). Cumulative PDF comparisons: **1,653** (SGD 811; Clone 528; Threats 314).

## What is actually verified

- Immutable source identities **THREATS-DROID-001..029**, exact census page citations and PDF offsets, actor authority, degree/size/CL as printed.
- Selected printed first-page numeric fields: HP, threshold, Reflex/Fortitude/Will, selected flat-footed defenses and SD-6 printed DR 3. Specific checks appear as JSON pointers in `threats-field-evidence.json`.
- **Replica Droid** (p152) and **Guri** (p153) remain distinct source records; Replica Droid Species Traits (p153) are referenced, not applied twice.
- **Printed hero eligibility:** 11 allowed, 13 prohibited, 5 not explicitly assigned. Missing permission cannot become implicit allow; NPC eligibility does not itself certify a legal stock PC build.
- Special rules remain source-only: VX light concussion missile launcher, Pistoeka buzz droid deployment, TO-D sonic stunner, B3/B3-A group firing, SD-6 controlled bursts, Sith sword.
- SD-6 DR 3 is correctly typed as `defenses.damageReduction`, **not** `durability.damageReduction`.

## Source/reconciliation blocks

- PDF is image-only. The supplied TXT is a searchable, potentially misordered OCR layer. It is **not** sufficient for exact attack-group, model name, hero permission or installed-system provenance.
- All **29** still need complete statblock, traits, source narrative, encounter page, ability score, feat and talent identity checks. Only the specifically recorded JSON Pointer fields count as PDF reviewed.
- No individual feat or talent is executable; no weapon mount or factory component instance has been certified. Source mechanics are suggestions for reconciliation, not activation rights.
- No starting droid chargen route is authorized. Replica species mechanics remain delegated to the appropriate droid-species/runtime authority.
- Full upstream schema validation and live Foundry V13 runtime tests have **not** run. Local semantic checks alone cannot upgrade certification.

## Identity-by-identity book ledger

| ID | Model/individual | Page | Visual checks | Hero eligibility | Mechanical certification |
|---|---|---:|---:|---|---|
| THREATS-DROID-001 | VX Series Artillery Droid | 134 | 11 | prohibited | **pending** |
| THREATS-DROID-002 | ASN-121 Assassin Droid | 135 | 11 | prohibited | **pending** |
| THREATS-DROID-003 | R3 Series Astromech Droid | 136 | 11 | allowed | **pending** |
| THREATS-DROID-004 | R4 Series Astromech Droid | 137 | 11 | allowed | **pending** |
| THREATS-DROID-005 | R5 Series Astromech Droid | 138 | 11 | allowed | **pending** |
| THREATS-DROID-006 | R7 Series Astromech Droid | 138 | 11 | allowed | **pending** |
| THREATS-DROID-007 | R2-R Series Reconnaissance Astromech Droid | 139 | 10 | not stated/assigned | **pending** |
| THREATS-DROID-008 | B3 Series Ultra Battle Droid | 140 | 11 | prohibited | **pending** |
| THREATS-DROID-009 | B3-A Series Ultra Battle Droid | 141 | 11 | prohibited | **pending** |
| THREATS-DROID-010 | IG Series Battle Droid | 141 | 10 | not stated/assigned | **pending** |
| THREATS-DROID-011 | Pistoeka Buzz Droid | 142 | 11 | prohibited | **pending** |
| THREATS-DROID-012 | EVS Construction Droid | 143 | 11 | prohibited | **pending** |
| THREATS-DROID-013 | GRZ-6B Demolitions Droid | 144 | 11 | prohibited | **pending** |
| THREATS-DROID-014 | 3PX Espionage Droid | 145 | 11 | prohibited | **pending** |
| THREATS-DROID-015 | TO-D Interrogation Droid | 146 | 10 | prohibited | **pending** |
| THREATS-DROID-016 | GH-7 Medical Droid | 147 | 11 | allowed | **pending** |
| THREATS-DROID-017 | EG-6 Series Power Droid | 148 | 11 | allowed | **pending** |
| THREATS-DROID-018 | DRK-1 Probe Droid | 149 | 11 | allowed | **pending** |
| THREATS-DROID-019 | M-3PO Series Military Protocol Droid | 150 | 11 | allowed | **pending** |
| THREATS-DROID-020 | TC Series Protocol Droid | 151 | 11 | allowed | **pending** |
| THREATS-DROID-021 | Replica Droid | 152 | 11 | allowed | **pending** |
| THREATS-DROID-022 | Guri | 153 | 10 | not stated/assigned | **pending** |
| THREATS-DROID-023 | WSB-15 Sabotage Droid | 154 | 11 | prohibited | **pending** |
| THREATS-DROID-024 | 501-Z Police/Security Droid | 155 | 11 | prohibited | **pending** |
| THREATS-DROID-025 | Mark VII Inquisitor Series Seeker Droid | 156 | 11 | prohibited | **pending** |
| THREATS-DROID-026 | Imperial Mark IV Series Sentry Droid | 157 | 11 | prohibited | **pending** |
| THREATS-DROID-027 | SD-6 Hulk Infantry Droid | 158 | 11 | not stated/assigned | **pending** |
| THREATS-DROID-028 | Sith Elite Warbot | 159 | 10 | not stated/assigned | **pending** |
| THREATS-DROID-029 | PK Worker Droid | 160 | 11 | allowed | **pending** |

## Next work before any certification

1. Finish narrative/encounter and every printed mechanical line for each of the 29 publication entries.
2. Reconcile published feats and talents against canonical SSOT IDs and exact printed prerequisites; preserve raw and source provenance until certified.
3. Resolve all source systems and possessions into installed component instances; attach weapons to verified mounts and keep attack expressions source-only.
4. Reconcile source-specific edge rules and the replica species/individual split with existing V2 engine authority; no duplicated effects.
5. Execute full upstream JSON Schema 2020-12 checks, negative tests and Foundry V13 runtime verification prior to independent certification.

**GitHub policy:** Local rolling files only until owner explicitly authorizes upload.
