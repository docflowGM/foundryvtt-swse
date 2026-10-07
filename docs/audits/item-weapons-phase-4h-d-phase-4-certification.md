# Phase 4 — Weapon Semantic / Selector / Recommendation Authority: CERTIFIED AND FROZEN

**Status:** `PHASE_4_WEAPON_SEMANTIC_SELECTOR_RECOMMENDATION_AUTHORITY_CERTIFIED_AND_FROZEN` (authority-only; production mutation: none)

| Invariant | Result |
| --- | --- |
| Phase 3B canonical identities | **203** |
| Phase 4 identities represented | **203** (204 category records) |
| Repo-present / repo-missing | **151 / 52** |
| Semantic vocabulary violations | **0** (80 tags within the 183-tag certified union) |
| Forbidden pseudo-tag leaks | **0** |
| Malformed exact ability joins | **0** (66 verified) |
| Unresolved machine-readable alternate-route omissions | **0** (19 alternate-route identities) |
| Accidental payload / hybrid flattening | **0 / 0** |
| Production mutation | **none** |

## Verified rulings

- **SIANG_LANCE_PROFILE_SCOPED** — exotic_weapon conditional to the ranged lance profile; base tags unchanged
- **WRIST_ROCKET_PAYLOAD_SCOPED** — no static payload semantics on the base launcher
- **MASSASSI_LANVAROK_FROZEN_PHASE3B** — advanced-melee ruling preserved; source conflict visible
- **XERROL_PHASE3B_EXOTIC** — Phase 3B Exotic classification controls; no rifle tag
- **TEHKLA_NAGAI_ROUTE_SCOPED** — Nagai simple route added; native Exotic tag/tags unchanged; census 9 -> 10
- **SITH_LANVAROK_EXACT_ABILITY_NAME** — canonical ability casing
- **VIBRO_SAW_DR_BYPASS_STRUCTURAL** — DAMAGE_REDUCTION_BYPASS stays an ontology gap

## Carried open items (do not block the semantic freeze)

- **DH23_DESCRIPTION_PAGE** — `UNVERIFIED_PRIMARY_SOURCE_PDF_REQUIRED`
- **PAYLOAD_FLATTENING_weapon-concealed-dart-launcher** — `OPEN_PLANNER_QUESTION`
- **SIMPLE_WEAPON_DERIVED_SELECTORS** — `DERIVED_FROM_PHASE_3B`: 4A Simple records carry derived group/proficiency selectors and no families.
- **SITH_LANVAROK_KISSAI_FAMILIARITY** — `OPEN_PLANNER_QUESTION`
- **SITH_SWORD_LIGHTSABER_CLASSIFICATION_SELECTOR** — `PHASE_3B_STRUCTURED_ONLY`: Phase 3B structured rule (lightsaber classification for Block/Deflect/Redirect Shot) has no planner selector because 4A Simple predates the selector layer; Phase 5A must consume the Phase 3B rule.
