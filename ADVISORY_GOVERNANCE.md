# Advisory Governance v1.1

This document formalizes the validation and enforcement rules for the SWSE Advisory Schema.

## Architecture Overview

The advisory validation system operates at two layers:

### Layer 1: Structural Validation (JSON Schema)
- Enforces schema structure via `schemas/advisory.schema.json`
- Uses AJV for tool-level validation
- Validates:
  - Exact key sets (no additional properties)
  - Required fields per advisory type
  - Array presence and minimum item counts
  - Type enforcement (string, array, object)

### Layer 2: Semantic Validation (Custom Validator - Tier XI)
- Enforces placeholder injection correctness
- Implemented in `scripts/engine/progression/engine/validators/advisory-validator.js`
- Validates:
  - Placeholder presence (required placeholders present)
  - Placeholder exactness (each required placeholder appears exactly once)
  - Segment authorization (no unauthorized placeholders in segments)

## Version Lock

Current schema version: **1.1**

The `advisory_schema_version` field must be set to exactly `"1.1"`. Any mismatch causes validation failure.

## Governance Principles

1. **Version-Locked**: Schema version is immutable. No silent upgrades.
2. **Key-Exact**: Keys are deterministic. No additional properties allowed.
3. **Deterministic**: Same input → same validation result, always.
4. **Zero Tolerance for Drift**: Every field required, no optional extras.
5. **Structural > Stylistic**: Structure enforced. Content validation delegated to application layer.
6. **No Silent Fallback**: Validation fails hard. No auto-fix, no warnings.

## Advisory Types & Placeholders

Each advisory type has mandatory placeholder injection rules:

### Standard Scaffold (conflict, drift, prestige_planning, strength_reinforcement, specialization_warning, momentum)

All intensity tiers (very_low, low, medium, high, very_high) require:

```
Observation: {TYPE_observation}
Impact:      {TYPE_impact}
Guidance:    {TYPE_guidance}
Optional Encouragement: {TYPE_encouragement}
```

Example for `conflict`:
```json
{
  "conflict": {
    "very_low": {
      "Observation": "You are in a {conflict_observation}.",
      "Impact": "This creates {conflict_impact}.",
      "Guidance": "{conflict_guidance}",
      "Optional Encouragement": "{conflict_encouragement}"
    }
  }
}
```

### Hybrid Scaffold (hybrid_identity)

All intensity tiers require:

```
Observation: [{TYPE_observation}, {TYPE_observation}]  (array, 2+ items)
Impact:      [{TYPE_impact}, {TYPE_impact}]            (array, 2+ items)
Guidance:    {TYPE_guidance}                           (string)
Optional Encouragement: {TYPE_encouragement}           (string)
```

### Trajectory Scaffold (long_term_trajectory)

All intensity tiers require:

```
Observation: {TYPE_observation}                    (string)
Impact:      [{TYPE_impact}, {TYPE_impact}]        (array, 2+ items)
Guidance:    {TYPE_guidance}                       (string)
Optional Encouragement: {TYPE_encouragement}       (string)
```

## Placeholder Token Reference

```
conflict → {conflict_observation}, {conflict_impact}, {conflict_guidance}, {conflict_encouragement}
drift → {drift_observation}, {drift_impact}, {drift_guidance}, {drift_encouragement}
prestige_planning → {prestige_observation}, {prestige_impact}, {prestige_guidance}, {prestige_encouragement}
strength_reinforcement → {strength_observation}, {strength_impact}, {strength_guidance}, {strength_encouragement}
hybrid_identity → {hybrid_observation}, {hybrid_impact}, {hybrid_guidance}, {hybrid_encouragement}
specialization_warning → {specialization_observation}, {specialization_impact}, {specialization_guidance}, {specialization_encouragement}
momentum → {momentum_observation}, {momentum_impact}, {momentum_guidance}, {momentum_encouragement}
long_term_trajectory → {trajectory_observation}, {trajectory_impact}, {trajectory_guidance}, {trajectory_encouragement}
```

## Validation Enforcement Points

### Pre-Commit Hook
Runs validator on staged `_advisory.json` files:
```bash
node scripts/validate/validate-advisory.js "data/dialogue/mentors/**/_advisory.json"
```

### CI Pipeline
Runs full validation on all advisory files before merge.

### Manual Validation
```bash
node scripts/validate/validate-advisory.js "data/dialogue/mentors/**/_advisory.json"
```

## Error Messages

All validation errors are deterministic and include:
- File path
- Advisory type
- Intensity tier
- Segment name
- Expected vs. actual state

Example:
```
✗ data/dialogue/mentors/axiom/_advisory.json
    Advisory type 'conflict', tier 'very_low', segment 'Observation': Placeholder {conflict_observation} must appear exactly once, found 0 occurrences
```

## Migration Path

Existing advisories must be updated to conform to v1.1:
1. Add `advisory_schema_version: "1.1"`
2. Add all required placeholder tokens
3. Run validator
4. Fix any violations
5. Commit

## What's NOT Validated

The following are NOT validated by this system (delegated to application layer):
- Placeholder variable existence (that's a renderer concern)
- Semantic coherence (does the advice make sense?)
- Tone consistency
- Character consistency

The validator enforces **infrastructure**, not **content**.

## Deployment

1. Schema file: `schemas/advisory.schema.json`
2. Validator: `scripts/engine/progression/engine/validators/advisory-validator.js`
3. CLI tool: `scripts/validate/validate-advisory.js`
4. This document: `ADVISORY_GOVERNANCE.md`

## No Auto-Fix

The validator does NOT auto-fix violations. Auto-fix = silent mutation = governance violation.

All corrections must be:
1. Made manually
2. Reviewed in code review
3. Explicitly committed

## Next Steps

- [ ] Integrate validator into pre-commit hooks
- [ ] Integrate validator into CI pipeline
- [ ] Block merges on validation failure
- [ ] Update existing advisory files to v1.1
- [ ] Document renderer spec (placeholder variable contract)
