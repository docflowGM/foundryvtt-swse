# Phase 4H-B — Global Weapon Semantic + Selector QA

**Status:** `WEAPON_PHASE_4H_B_GLOBAL_SEMANTIC_SELECTOR_QA_PASSED` (authority-only; no production mutation)

- Certified feat/talent-used vocabulary: **183** tags
- Distinct weapon semantic tags used (all semantic-bearing fields, 4A–4G): **80**
- Unknown weapon semantic tags: **0** · forbidden pseudo-tag leaks: **0** · structural-selector leaks: **0** (1891 tag-field entries checked)
- Exact ability links verified against canonical feat/talent names: **65**, malformed: **0**
- Hybrid/profile-scoped records: **13** (no conditional tag promoted to a final tag)
- Payload-bearing records: **4**, accidental flattening: **0**, exemptions carried: **1**

| Phase | Category | Records | Distinct tags | Exact ability links |
| --- | --- | ---: | ---: | ---: |
| 4A | Simple Weapon | 49 | 57 | 0 |
| 4B | Lightsaber | 16 | 24 | 16 |
| 4C | Pistol | 30 | 35 | 17 |
| 4D | Rifle | 38 | 36 | 13 |
| 4E | Advanced Melee Weapon | 22 | 29 | 6 |
| 4F | Heavy Weapon | 17 | 26 | 0 |
| 4G | Exotic Weapon | 32 | 41 | 13 |

## Open planner question (payload flattening exemption)

- **weapon-concealed-dart-launcher** (stun, nonlethal, poison): Round 2 ruling puts the default sedative payload (stun, nonlethal) and the optional contact-poison payload (poison) on the base launcher. Payload-specific semantics would normally be payload-scoped (cf. Wrist Rocket Launcher). Not changed without a planner ruling.

## Forbidden pseudo-tags (never legal weapon semantics)

`accuracy`, `area_damage`, `condition_track`, `explosives`, `grenade`, `rifle`, `thrown`, `full_round_action`, `ion`, `sonic`
