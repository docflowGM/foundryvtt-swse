# Phase 4 — Weapon Semantic / Selector / Recommendation Authority: CERTIFIED AND FROZEN — FINAL AMENDED STATE

**Status:** `PHASE_4_WEAPON_SEMANTIC_SELECTOR_RECOMMENDATION_AUTHORITY_CERTIFIED_AND_FROZEN_FINAL_AMENDED_STATE` (authority-only; production mutation: none)

| Invariant | Result |
| --- | --- |
| Phase 3B canonical identities | **203** |
| Phase 4 identities represented | **203** (204 category records) |
| Repo-present / repo-missing | **151 / 52** |
| Semantic vocabulary violations | **0** (80 tags within the 183-tag certified union) |
| Forbidden pseudo-tag leaks | **0** |
| Malformed exact ability joins | **0** (65 verified) |
| Unresolved machine-readable alternate-route omissions | **0** (21 alternate-route identities) |
| Accidental payload / hybrid flattening | **0 / 0** |
| Production mutation | **none** |

## Final amendments (4H-E)

- **4H-E1** — Kissai + simple weapons alternate route on both lanvarok varieties.
- **4H-E2** — Concealed Dart Launcher: poison payload-conditional; stun/nonlethal unconditional.
- **4H-E3** — DH-23 description page 62 -> 61.

## Verified rulings

- **SIANG_LANCE_PROFILE_SCOPED** — exotic_weapon conditional to the ranged lance profile; base tags unchanged
- **WRIST_ROCKET_PAYLOAD_SCOPED** — no static payload semantics on the base launcher
- **MASSASSI_LANVAROK_FROZEN_PHASE3B** — advanced-melee ruling preserved; source conflict visible
- **XERROL_PHASE3B_EXOTIC** — Phase 3B Exotic classification controls; no rifle tag
- **TEHKLA_NAGAI_ROUTE_SCOPED** — Nagai simple route added; native Exotic tag/tags unchanged; census 9 -> 11 incl. 4H-E1
- **AMPHISTAFF_YUUZHAN_VONG_ROUTE** — Yuuzhan Vong + simple-weapons alternate route added; native Exotic classification and tags unchanged (4H-E3)
- **SITH_LANVAROK_STRUCTURAL_SECOND_WEAPON** — no explicit ability join to the noncanonical Two-Weapon Fighting (4H-F1); second-weapon/hands-free behavior is structural
- **VIBRO_SAW_DR_BYPASS_STRUCTURAL** — DAMAGE_REDUCTION_BYPASS stays an ontology gap
- **KISSAI_LANVAROK_FAMILY_ROUTE** — Kissai + simple weapons covers both lanvarok varieties; Massassi advanced-melee ruling and native classifications unchanged (4H-E1)
- **CONCEALED_DART_DEFAULT_PAYLOAD_SPLIT** — stun/nonlethal unconditional; poison payload-conditional (4H-E2)
- **DH23_PAGE_61** — description p.61 / stat table p.61 in Phase 3B and the Pistol authority (4H-E3)

## Carried open items (do not block the semantic freeze)

- **SIMPLE_WEAPON_DERIVED_SELECTORS** — `DERIVED_FROM_PHASE_3B`: 4A Simple records carry derived group/proficiency selectors and no families.
- **SITH_SWORD_LIGHTSABER_CLASSIFICATION_SELECTOR** — `PHASE_3B_STRUCTURED_ONLY`: Phase 3B structured rule (lightsaber classification for Block/Deflect/Redirect Shot) has no planner selector because 4A Simple predates the selector layer; Phase 5A must consume the Phase 3B rule.
