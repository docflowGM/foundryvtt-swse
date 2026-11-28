# PRQ.0B — preliminary prerequisite compatibility notes (read-only, text-level)

Heuristic scan of production prerequisite *text* in `packs/feats.db` and `packs/talents.db` (comma/and/or split; scope text in parentheses removed; matched case-insensitively against production names). It identifies candidates only; **no record was changed and none of these is a certified finding** until checked against certified sources (PRQ.0C).

| Observation | Count | Why it matters (defect class in the PRQ supplement §5) |
|---|---|---|
| Feat prerequisite clauses naming another **feat** | 129 | Only 1 structured `feat` condition exists in production, so feat-to-feat identity must come from the certified authority/identity manifest, not names (class 4, 6, 8, 9). |
| Feat prerequisite clauses naming a **talent**-named entity (`Sneak Attack`, ×2: Opportunistic Trickery, Hobbling Strike) | 2 | Cross-domain reference; "Sneak Attack" is also a class feature name — must not be resolved by name (class 1, 2). |
| Talent prerequisite clauses naming a **feat** (e.g. Dual Weapon Flourish II → Dual Weapon Mastery I, Weapon Finesse; Victorious Force Mastery → Force Training) | 64 | Cross-domain feat references from talents; the 311 structured talent conditions are all `talent` type, so these 64 have no structured feat link (class 2, 18). |
| Talent prerequisite clauses naming a **talent** | 525 | Structured coverage is 311 UUID references; remaining ~214 clauses are text-only or belong to records with other structure (class 6, 18). |
| Feat records whose text mentions species/droid terms | 34 | Species/droid conditions must be species/droid requirements, not feats (class 3, 14). Only 4 feats have structured `species` conditions. |
| Talent records mentioning species/droid terms | 8 | Same. |
| Talent same-name groups | 21 | UUID identity is mandatory; the certified Phase 3G rulings (e.g. Outlaw vs Provocateur *Seize the Moment*) apply (class 5). |
| Feat same-name groups | 1 | Known certified collision; resolve via the manifest (class 4). |

Not yet examined (need source evidence, PRQ.0B proper): Boolean (AND/OR) structure, class-level/BAB semantics, Force power/technique/secret clauses, droid systems, Dark Side Score, scoped-choice clauses, and text/structure conflicts. See `prq-0a-corpus-census.md` for the structured-coverage counts and `docs/architecture/v2-contracts/PRQ-canonical-prerequisite-registry.md` for the contract.

## Update: text-reference resolution (generated; see `prq-0a-corpus-census.md` → `textReferenceResolution`)
`node tools/prq-corpus-census.mjs --write docs/audits/architecture-census/prq-0a-corpus-census.md` now also resolves each prerequisite *clause name* against production names (scope text in parentheses removed). Current numbers:
- **Feats:** 134 clauses name a production record; 129 resolve to exactly one feat and 2 to a talent-named entity (Sneak Attack). 3 are ambiguous because the base name is shared by scoped/derivative records (`Attack Combo (Melee)` / `(Ranged)` → base `Attack Combo`; `Armor Proficiency (Light)`). These are scoped-choice identities, so the compiler needs feat UUID + choice, never the name.
- **Talents:** 592 clauses name a record: 497 resolve to exactly one talent, 64 to a feat, **30 are ambiguous talent names** (same-name groups, e.g. `Seize the Moment`, `Charm Beast`, `Notorious`, `Blend In`, `Greater Weapon Focus`), 1 ambiguous feat (`Armor Proficiency`). 270 of the matched clauses already have a UUID in `prerequisitesStructured`.
- Name overlap between the feat and talent namespaces: 0 (no clause matches both), so the cross-domain risk is the 64 talent→feat and 2 feat→talent references, which need explicit domain typing.
- About 600 clauses match no record by name (class, skill, ability, BAB, species, Force and other non-feat/talent requirements): these are the non-identity requirement types the structured grammar still has to express (see PRQ.0A condition-type counts).
These remain heuristic counts; certification needs the source comparison (PRQ.0C).

## PRQ.0C start: production text vs the content authorities (generated; full tables in `prq-0c-authority-vs-production.md`)
Compared production `system.prerequisites` with `scripts/data/authority/{feat,talent}-prerequisite-authority.js` (name-keyed):
- **Feats:** 351 of 353 records have an authority entry; 319 are textually equal, 32 differ, **15 substantively** (e.g. `Staggering Attack`: production "Base Attack Bonus +1" vs authority "Sneak Attack or Rapid Shot or Rapid Strike"; droid-condition phrasing; AND/OR grouping). 2 records share a name key and 2 authority entries have no production record.
- **Talents:** 990 of 1,187 records have an entry (197 do not); 812 equal, 178 differ (97 substantive across both domains in the table), 42 records share a name key with another record (a name-keyed table cannot distinguish them), 57 authority entries have no production record.
- These are review candidates, **not** corrections: deciding which side matches the published page requires the sourcebooks (PRQ.0C). No pack or authority data was changed.
