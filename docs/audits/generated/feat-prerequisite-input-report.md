# Feat Prerequisite Input Report

Generated: 2026-08-07T00:38:41.974Z

This audits prerequisite **inputs** (catalog text, FEAT_PREREQUISITE_AUTHORITY text, choice metadata) against the real `normalizeFeatPrerequisites` from `scripts/engine/progression/prerequisites/prerequisite-normalizer.js`, loaded and executed for real under Node via `tests/helpers/foundry-shim`. It does not evaluate legality — see docs/audits/feat-integrity-current-state.md for why `prerequisite-checker.js`, not this normalizer, is the live legality path.

## Totals

- Catalog feats audited: 390
- Clean: 270
- Warnings: 120
- Hard errors: 0

## Hard errors

_None._

## Warnings (sample of first 40)

### Unwavering Focus
- **species_prerequisite_misclassified_as_feat** (warning): "Zabrak" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Forceful Strike
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Increased Resistance
- **species_prerequisite_misclassified_as_feat** (warning): "Gamorrean" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Primitive Warrior
- **species_prerequisite_misclassified_as_feat** (warning): "Gamorrean" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Low Profile
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Pitiless Warrior
- **species_prerequisite_misclassified_as_feat** (warning): "Trandoshan" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Scion of Dorin
- **species_prerequisite_misclassified_as_feat** (warning): "Kel Dor" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Saber Throw
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Pincer
- **catalog_authority_text_disagreement** (warning): catalog="Droid, Claw or Hand Appendage, Base Attack Bonus +1, Pin, Crush" authority="Droid with Claw or Hand Appendage, Base Attack Bonus +1, Pin, Crush"
### Stealthy
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Forceful Throw
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Confident Success
- **species_prerequisite_misclassified_as_feat** (warning): "Bothan" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Wilderness First Aid
- **catalog_authority_text_disagreement** (warning): catalog="Trained in Survival." authority="Trained in Survival"
### Forceful Will
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Reactive Awareness
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Staggering Attack
- **catalog_authority_text_disagreement** (warning): catalog="Base Attack Bonus +1" authority="Sneak Attack or Rapid Shot or Rapid Strike"
### Strong Bellow
- **species_prerequisite_misclassified_as_feat** (warning): "Ithorian" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Wrruushi Training
- **species_prerequisite_misclassified_as_feat** (warning): "Wookiee" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Tool Frenzy
- **catalog_authority_text_disagreement** (warning): catalog="Droid, Small size or larger, 2+ Tool Appendages" authority="Small or larger Droid with 2+ Tool Appendages"
### Quick Comeback
- **species_prerequisite_misclassified_as_feat** (warning): "Gamorrean" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Ample Foraging
- **species_prerequisite_misclassified_as_feat** (warning): "Ewok" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Sharp Senses
- **species_prerequisite_misclassified_as_feat** (warning): "Mon Calamari" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Weapon Proficiency (Simple Weapons)
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Wroshyr Rage
- **species_prerequisite_misclassified_as_feat** (warning): "Wookiee" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Triple Crit Specialist
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Cleave
- **catalog_authority_text_disagreement** (warning): catalog="Strength 13, Power Attack Feat" authority="Strength 13, Power Attack"
- **feat_reference_has_spurious_suffix** (warning): Prerequisite text references "Power Attack Feat" but the real catalog feat name is "power attack" — the trailing "Feat" word breaks exact-name matching.
### Binary Mind
- **species_prerequisite_misclassified_as_feat** (warning): "Cerean" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Justice Seeker
- **species_prerequisite_misclassified_as_feat** (warning): "Kel Dor" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Forceful Saber Throw
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Reactive Stealth
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Heavy Weapon Proficiency
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Veteran Spacer
- **species_prerequisite_misclassified_as_feat** (warning): "Duros" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Ion Shielding
- **catalog_authority_text_disagreement** (warning): catalog="(Droid and Strength 13) or (Cyborg Hybrid and Constitution 13)" authority="Droid with Strength 13 or Cyborg Hybrid with Constitution 13"
### Forceful Grip
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Keen Scent
- **species_prerequisite_misclassified_as_feat** (warning): "Ewok" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Resurgent Vitality
- **species_prerequisite_misclassified_as_feat** (warning): "Wookiee" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Anointed Hunter
- **species_prerequisite_misclassified_as_feat** (warning): "Nelvaanian" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".
### Headstrong
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
### Improved Grapple
- **missing_authority_entry** (warning): No FEAT_PREREQUISITE_AUTHORITY entry for this feat name/slug.
- **special_clause_misclassified_as_feat** (warning): "Grapple" does not match any catalog feat, species, or talent name. Likely a freeform/special prerequisite clause (e.g. "Cannot be a Droid", GM approval) that the normalizer's fallback string parser typed as type:"feat" instead of a special/unresolved type.
### Perfect Intuition
- **species_prerequisite_misclassified_as_feat** (warning): "Cerean" is a real species (packs/species.db) but the normalizer's fallback string parser typed this clause as type:"feat".

_... and 80 more warning-level feats; see the JSON report for the full list._

