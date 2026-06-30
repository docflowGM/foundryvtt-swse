# Scum and Villainy + Threats of the Galaxy + Unknown Regions Feat Implementation Fit

Phase 7D is intentionally a parity and classification pass, not an implementation pass. The goal is to make the next global feat implementation backlog safer.

## Implementation homes

### Combat/action hooks

Many feats in these books are attack options, movement riders, grapple reactions, mounted-charge actions, or once-per-turn riders. These should be routed through combat option/action metadata rather than static bonuses.

Examples:

- Close Combat Escape
- Collateral Damage
- Deceptive Drop
- Duck and Cover
- Knife Trick
- Lightning Draw
- Momentum Strike
- Mounted Defense
- Targeted Area
- Trample

### Social and intrigue hooks

Several feats modify social or deception play. These should usually live in skill-use/action metadata and GM-confirmed chat cards.

Examples:

- Friends in Low Places
- Hideous Visage
- Impersonate
- Intimidator
- Maniacal Charge

### Tech and gear hooks

Gear-facing feats should use explicit equipment, store, or modification workflows. Do not apply them as generic actor bonuses.

Examples:

- Hasty Modification
- Signature Device
- Superior Tech
- Hold Together

### Exploration, survival, and species-context hooks

Unknown Regions feats often depend on environment, species, wilderness, or remote-region context. These need explicit context flags or GM adjudication.

Examples:

- Nikto Survival
- Wilderness First Aid
- Elder's Knowledge
- Hyperblazer

## Static-sheet warning

The safest default for this phase is:

```text
staticSheetPolicy: exclude or roll_context_only
```

Only a feat with an always-on numeric benefit should become a derived actor modifier. Most feats in Phase 7D are not always-on numeric effects.

## Relation to expanded bucket taxonomy

Phase 7C.5 created the skeleton for expanded feat buckets and subbuckets. The Phase 7D manifest provides implementation-fit data that can feed the future taxonomy migration, but it does not modify existing feat bucket metadata yet.
