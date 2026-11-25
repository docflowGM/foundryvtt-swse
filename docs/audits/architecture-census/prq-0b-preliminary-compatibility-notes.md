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
