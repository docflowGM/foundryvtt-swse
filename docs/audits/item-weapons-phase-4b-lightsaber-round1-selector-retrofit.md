# Phase 4B — Lightsaber Round 1 Rule-Selector Retrofit

**Status:** `WEAPON_TAG_PHASE_4B_LIGHTSABER_ROUND_1_SELECTOR_RETROFIT_PLANNER_AUTHORITY`

This retrofit adds a rules-selector layer to the first 8 Lightsabers without changing their certified semantic-tag rulings.

## Invariant

`ruleSelectors` are **not** semantic tags and must never be copied into `system.tags`.

Semantic `finalTags` remain restricted to the certified feat/talent tag vocabulary. The selector layer exists so exact weapon names, weapon families, feats, talents, classes, and the suggestion engine can match one another without inventing semantic vocabulary.

## Round 1 selectors

### 1. Crossguard Lightsaber

- Identity: `lightsaber-chassis-crossguard`
- Exact selector: `weapon:lightsaber-chassis-crossguard`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:crossguard-lightsaber`
- Explicit ability links:
  - talent: **Block** — `POSITIVE_WEAPON_MODIFIER`
  - talent: **Deflect** — `NEGATIVE_WEAPON_MODIFIER`

### 2. Dueling Lightsaber

- Identity: `lightsaber-chassis-dueling`
- Exact selector: `weapon:lightsaber-chassis-dueling`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:dueling-lightsaber`
- Explicit ability links: none currently source-certified.

### 3. Guard Shoto

- Identity: `lightsaber-chassis-guard-shoto`
- Exact selector: `weapon:lightsaber-chassis-guard-shoto`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:shoto`, `weapon-family:guard-shoto`
- Explicit ability links:
  - talent: **Shoto Focus** — `EXPLICIT_WEAPON_FAMILY_MATCH`
  - talent: **Shoto Master** — `EXPLICIT_WEAPON_FAMILY_MATCH`
  - talent: **Block** — `POSITIVE_WEAPON_MODIFIER`
  - talent: **Deflect** — `POSITIVE_WEAPON_MODIFIER`

### 4. Lightfoil

- Identity: `weapon-lightfoil`
- Exact selector: `weapon:weapon-lightfoil`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:lightfoil`
- Explicit ability links: none currently source-certified.

### 5. Lightfoil, Archaic

- Identity: `lightsaber-chassis-archaic-lightfoil`
- Exact selector: `weapon:lightsaber-chassis-archaic-lightfoil`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:lightfoil`, `weapon-family:archaic-lightfoil`
- Explicit ability links: none currently source-certified.

### 6. Lightfoil, Modern

- Identity: `lightsaber-chassis-modern-lightfoil`
- Exact selector: `weapon:lightsaber-chassis-modern-lightfoil`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:lightfoil`, `weapon-family:modern-lightfoil`
- Explicit ability links: none currently source-certified.

### 7. Lightsaber

- Identity: `weapon-lightsaber`
- Exact selector: `weapon:weapon-lightsaber`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:standard-lightsaber`
- Explicit ability links: none currently source-certified.

### 8. Lightsaber Pike

- Identity: `lightsaber-chassis-pike`
- Exact selector: `weapon:lightsaber-chassis-pike`
- Group selector: `weapon-group:lightsaber`
- Proficiency selector: `weapon-proficiency:lightsabers`
- Families: `weapon-family:lightsaber-polearm`, `weapon-family:long-haft-compatible`
- Explicit ability links:
  - feat: **Long Haft Strike** — `UNLOCKS_DOUBLE_WEAPON_MODE` (equipment cross-reference: Long Haft Form)
  - talent: **Block** — `NEGATIVE_WEAPON_MODIFIER`
  - talent: **Deflect** — `NEGATIVE_WEAPON_MODIFIER`

## Critical examples

- **Guard Shoto** now carries `weapon-family:shoto`, so both **Shoto Focus** and **Shoto Master** can discover it directly.
- **Lightsaber Pike** links to the canonical feat **Long Haft Strike**. The equipment chapter's wording **Long Haft Form** is retained only as a cross-reference alias, not treated as a separate feat identity.
- Crossguard/Pike Block and Deflect relationships preserve direction: positive and negative interactions are explicit rather than being flattened into recommendation tags.

## Claude implementation contract

Merge these `ruleSelectors` into the corresponding eight Phase 4B Lightsaber records. Do not change their Round 1 semantic `finalTags`, tradeoffs, comparisons, or unrepresented mechanics. Do not write selector strings into `system.tags`.