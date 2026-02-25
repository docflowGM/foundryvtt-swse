# Vehicle Compendium Audit Prompt

## Canonical Categories (ONLY valid outputs)

**Planetary:**
- mount
- speeder
- tracked
- walker
- wheeled
- emplacement
- airspeeder

**Starships:**
- starfighter
- transport
- capitalShip
- spaceStation

## Task

1. Map each vehicle to ONE canonical category
2. Use description + lore + SWSE classification (NOT name heuristics alone)
3. Mark ambiguous entries as `REVIEW_REQUIRED`
4. Sanitize all output

## Output Format

**SECTION 1 — CSV Summary**
```
Name,Category,Domain,Size,Type,Confidence,Notes
```

**SECTION 2 — Canonical Mapping JSON**
```json
{
  "Vehicle Name": "category",
  "Vehicle Name": "REVIEW_REQUIRED"
}
```

**SECTION 3 — Review Required**
List only REVIEW_REQUIRED vehicles with reasoning.

## Validation Rules
- Every vehicle has exactly one category
- Every value is from canonical list
- No invented labels
- JSON keys match exact vehicle names
- No duplicates
